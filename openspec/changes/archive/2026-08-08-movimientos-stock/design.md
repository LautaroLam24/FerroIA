## Context

Ver `proposal.md` - Why. `.instructions.md §3` (Transaccionalidad y concurrencia) es
innegociable: toda venta/entrada corre `SIEMPRE dentro de prisma.$transaction`, la venta
valida disponibilidad DENTRO de la transacción con una escritura condicional o lock
explícito, y está prohibido validar afuera y escribir después. `Product.stock` y
`StockMovement` (tipo `ENTRADA`/`VENTA`, `quantity`, `reason`, `date`, `productId`,
`userId`) ya existen en el schema Prisma desde el bootstrap — no hace falta migración.
`gestion-productos` ya especificó que un movimiento sobre un producto con `deletedAt` no
nulo debe responder `409`; este change implementa ese contrato.

## Goals / Non-Goals

**Goals:**
- Garantizar, con evidencia (no solo con la promesa de `$transaction`), que dos ventas
  concurrentes sobre el último stock nunca dejan `Product.stock` en negativo.
- Un único mecanismo de transacción compartido por entrada y venta, para no duplicar la
  lógica de concurrencia/diagnóstico de errores.

**Non-Goals:**
- Cambiar el nivel de aislamiento de Postgres/Prisma (se usa el default `READ COMMITTED`,
  suficiente para este patrón — ver Decisión 2).
- Endpoint de movimientos con paginación (el listado de este change no la requiere; se
  puede agregar después si el volumen lo justifica, sin romper el contrato actual).

## Decisions

### 1. Update condicional atómico en vez de `SELECT ... FOR UPDATE`
Para decrementar stock sin condición de carrera se evaluaron dos mecanismos:
- **(a) Transacción interactiva con `SELECT ... FOR UPDATE`**: requiere `$queryRaw` (Prisma
  Client no expone `FOR UPDATE` en su query builder) y dos roundtrips (SELECT + UPDATE).
- **(b) `updateMany` condicional**: `tx.product.updateMany({ where: { id, deletedAt: null,
  stock: { gte: quantity } }, data: { stock: { decrement: quantity } } })` y verificar
  `result.count === 1`. Se elige **(b)**: una sola operación, 100% Prisma Client (sin SQL
  crudo), y Postgres serializa las escrituras concurrentes a nivel de fila igual que (a)
  pero sin el roundtrip extra ni raw SQL.

Se descartó agregar una columna `version` para optimistic locking: es un cambio de schema
no justificado cuando el propio `UPDATE ... WHERE stock >= quantity` ya da la garantía
necesaria.

### 2. Por qué `READ COMMITTED` (el default) alcanza, sin `SERIALIZABLE`
Bajo `READ COMMITTED`, un `UPDATE` que se topa con una fila bloqueada por otra transacción
concurrente espera a que esa transacción haga commit/rollback y luego **re-evalúa su propio
`WHERE` contra el valor ya confirmado** de la fila antes de decidir si la actualiza. Por
eso, si la Venta A decrementa `stock` de `1` a `0` y hace commit, la Venta B (que estaba
esperando el lock) al despertar reevalúa `stock >= quantity` contra el `0` ya confirmado y
afecta `0` filas — no hay lectura obsoleta (stale read) posible. Esto da atomicidad sin
necesitar `SERIALIZABLE` (que exigiría manejar reintentos por `serialization failure`) ni
locks explícitos adicionales.

### 3. Un único WHERE condicional cubre existencia + baja lógica + stock suficiente
El mismo `where` compuesto (`id`, `deletedAt: null`, y `stock: { gte: quantity }` solo para
venta) resuelve en una sola operación atómica las tres condiciones de negocio
("¿existe?", "¿está activo?", "¿alcanza el stock?"). Si `count === 0`, el motivo es
ambiguo (podría ser cualquiera de las tres), así que se hace **un único** `findUnique` de
diagnóstico *después* del intento fallido — no antes — solo para elegir el mensaje/código
HTTP (`404` inexistente / `409` dado de baja / `409` stock insuficiente). Este diagnóstico
no reintroduce la condición de carrera: no se vuelve a escribir en base a su resultado, ya
sabemos que el intento de escritura falló atómicamente.

### 4. Transacción interactiva (no array) y servicio compartido
Se usa `prisma.$transaction(async (tx) => { ... })` (forma interactiva), no la forma
array, porque el flujo necesita ramificar según `result.count` antes de decidir el segundo
paso (crear el movimiento o diagnosticar el error). Un único método privado del service
(p. ej. `applyMovement`) parametrizado por `type` (`ENTRADA`/`VENTA`) y el signo del delta
de stock es usado tanto por `createEntry` como por `createSale`, evitando duplicar la
lógica de transacción/diagnóstico. Para `ENTRADA` el `where` no incluye la cota de stock
(sumar siempre es seguro), pero sí `deletedAt: null` — corre en la misma transacción por
consistencia con la regla general de §3, no porque incrementar tenga una condición de
carrera de negocio que proteger.

### 5. Validación de `quantity > 0` es de DTO, fuera de la transacción
No es una condición de carrera: es validación de forma pura (`@IsInt() @Min(1)` en el
DTO vía `class-validator`), igual que en `gestion-productos`. Corre en el `ValidationPipe`
global antes de llegar al service.

## Risks / Trade-offs

- [`updateMany` con `count === 0` es ambiguo] → mitigado con el `findUnique` de
  diagnóstico post-fallo (Decisión 3); agrega una query extra solo en el camino de error,
  no en el camino feliz.
- [Bajo carga muy alta, las transacciones que pierden la carrera de lock esperan en vez de
  fallar rápido] → aceptable para el volumen de un TP; si fuera un problema real se podría
  usar `NOWAIT`/`lock_timeout`, fuera de alcance de este change.
- [El test de concurrencia con `Promise.all` no controla cuál de las dos requests "gana"] →
  el test debe verificar el resultado agregado (una `201`, una `409`, stock final `0`,
  exactamente un `StockMovement`), no asumir un orden específico.

## Migration Plan

No hay migración de schema. Pasos de implementación:
1. Crear `backend/src/stock/` (module, controller, service, DTOs).
2. Implementar `applyMovement` con el `updateMany` condicional + diagnóstico descrito
   arriba.
3. Sin rollback especial: no se toca el schema ni datos existentes.
