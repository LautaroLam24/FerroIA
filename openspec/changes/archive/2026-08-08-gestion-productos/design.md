## Context

Ver `proposal.md` - Why. El schema Prisma ya tiene `Product`, `Category`, `Supplier`
y `StockMovement` (con `Product.categoryId`/`supplierId` como FK obligatorias y
`Product.deletedAt` para baja lógica), pero `Product` **no tiene** campo `code`
todavía — hace falta agregarlo con `prisma migrate dev`. Los módulos `categories` y
`suppliers` (`backend/src/categories/`, `backend/src/suppliers/`) ya existen y
siguen el patrón controller → service → Prisma con `@Roles(Role.ADMIN)` a nivel de
controller; `products` sigue el mismo patrón. No existe todavía módulo de eventos de
dominio (`backend/src/events/`) ni el paquete `@nestjs/event-emitter`.

## Goals / Non-Goals

**Goals:**
- Definir cómo se valida la existencia de categoría/proveedor sin duplicar lógica
  entre alta y edición.
- Definir el mecanismo de emisión de eventos de dominio (`ProductCreated` /
  `ProductUpdated` / `ProductDeleted`) que consumirá el futuro listener de
  reindexado ChromaDB (CU10), sin implementar ese listener acá.
- Definir el shape de la migración Prisma que agrega `Product.code`.

**Non-Goals:**
- No se implementa el listener que sincroniza ChromaDB (eso es CU10).
- No se implementa el endpoint de movimientos de stock (CU06/CU07); solo se deja
  especificado en `spec.md` el contrato de rechazo `409` que ese endpoint deberá
  cumplir.
- No se implementa búsqueda/filtros avanzados (change `busqueda-filtros`).

## Decisions

### 1. `code` como columna `String @unique` en `Product`
Se agrega vía migración Prisma (`npx prisma migrate dev --name add_product_code`).
Alternativa considerada: generar el código automáticamente en el backend — se
descarta porque el alcance pide que el `ADMIN` lo ingrese (código de ferretería
provisto por el usuario, no autogenerado).

### 2. Validación de categoría/proveedor: 400, no 404
Cuando `categoryId` o `supplierId` no existen, el sistema responde `400` (no
`404`). Razón: el recurso que el cliente está pidiendo crear/editar es el
`Product`; el `id` en la URL (`PATCH /api/products/:id`) es el único que, si no
existe, corresponde a `404` según la convención ya usada en `users` y
`categories`. Las referencias dentro del body a otras entidades que no existen se
tratan como **validación del payload** (igual que "email con formato inválido"),
consistente con `.instructions.md §5` ("validar tipos, campos obligatorios,
rangos"). Alternativa considerada: `404` por entidad referenciada — se descarta
por ambigüedad (¿404 de qué recurso, si la URL apunta a `/products`?) y porque
rompería la convención de que `404` en este sistema significa "el recurso de la
URL no existe".

### 3. Verificación de categoría/proveedor: consulta directa, no `$transaction`
El alta/edición de producto no requiere `prisma.$transaction` (a diferencia de
movimientos de stock): son dos `findUnique` (categoría, proveedor) + un
`create`/`update` con `code` único protegido por la constraint de DB (catch de
`P2002`, mismo patrón que `categories.service.ts`). No hay condición de carrera
de negocio que proteger (no se descuenta stock acá).

### 4. Eventos de dominio con `@nestjs/event-emitter`
Se agrega la dependencia `@nestjs/event-emitter` (estándar de Nest, mínima
huella) y un `EventsModule` global en `backend/src/events/` que solo expone
`EventEmitterModule.forRoot()`. `ProductsService` emite `product.created`,
`product.updated` y `product.deleted` con el `id` del producto tras cada
operación exitosa. **No se registra ningún listener en este change** — es
groundwork intencional para que CU10 (reindexado ChromaDB) solo tenga que
suscribirse, cumpliendo la observación docente de `.instructions.md §10` de usar
"eventos/hooks de NestJS" sin adelantar la integración con Chroma. Alternativa
considerada: no emitir nada todavía y que CU10 agregue los eventos cuando le
toque — se descarta porque acoplaría el listener de CU10 a modificar
`ProductsService`, violando la separación módulo-por-dominio de
`.instructions.md §1`.

### 5. Indicador de stock bajo mínimo: campo calculado, no columna
`GET /api/products` agrega un campo derivado (p. ej. `lowStock: boolean`,
calculado como `stock <= stockMin`) en el mapeo del service, no persistido en DB.
Evita inconsistencia si `stock` cambia por un movimiento y nadie recalcula la
columna.

## Risks / Trade-offs

- [Emitir eventos sin listener] → si el proceso de emisión falla silenciosamente
  no hay forma de notarlo hasta CU10. Mitigación: el emit es *fire-and-forget*
  dentro del mismo request pero no debe poder revertir la operación principal; se
  cubre con un test que verifica que el ABM responde igual con o sin listeners
  registrados.
- [Migración agrega columna `code` `@unique` sin default] → si ya hubiera
  productos en la tabla, la migración fallaría. Mitigación: en este punto del TP
  la tabla `products` está vacía (módulo nunca implementado), así que no hace
  falta backfill; se documenta igual por si se corre en un ambiente con datos.
- [400 vs 404 para categoría/proveedor inexistente] → decisión discutible, un
  cliente podría esperar `404`. Mitigación: quedó explícita en `spec.md` y acá,
  documentada para que frontend y tests la sigan sin ambigüedad.

## Migration Plan

1. Modificar `schema.prisma`: agregar `code String @unique` a `Product`.
2. `npx prisma migrate dev --name add_product_code` (DB local `ferreteria-db` ya
   levantada).
3. Instalar `@nestjs/event-emitter`, crear `EventsModule`, importarlo en
   `AppModule`.
4. Crear `ProductsModule` (controller, service, DTOs) e importarlo en
   `AppModule`.
5. Sin rollback especial: si la migración debe revertirse, `prisma migrate
   reset` en desarrollo (no hay datos productivos todavía).
