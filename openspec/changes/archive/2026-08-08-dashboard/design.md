## Context

CU08 (dashboard) es el siguiente change de la ruta OpenCode. El backend ya tiene módulos
`products` (CU03/CU05, incluye `lowStock` por field reference `stock <= stockMin`), `stock`
(CU06/CU07, historial `StockMovement` con `product` y `user`), y `categories`/`suppliers`
resueltos por `include` en `productSelect`. La autenticación es JWT con `JwtAuthGuard` +
`RolesGuard` globales (`@Roles(ADMIN, OPERARIO)`), y el contrato de respuestas es
`{ data }` / `{ error }` con `HttpExceptionFilter` global. El frontend usa un nav de
vistas por estado en `App.tsx` (sin router) y un cliente HTTP centralizado en
`frontend/src/api/`. Ver `proposal.md` — Why para la motivación.

Datos reales (inspeccionados con el MCP postgres): tablas `products`, `stock_movements`,
`users`; `price` es `numeric(10,2)`, `stock`/`stockMin` son `int`. Índices existentes:
solo PKs y `products_code_key`. `stock_movements` tiene `date` pero sin índice (dataset de
ferretería pequeño, no lo requiere todavía).

## Goals / Non-Goals

**Goals:**
- Un solo `GET /api/dashboard` que responda `{ data: { alerts, totalInventoryValue, recentMovements } }` en una sola round-trip.
- Máximo 3 queries a la DB (una por sección), todas agregadas/planas, sin N+1 ni bucles de `findUnique`.
- Accesible a `ADMIN` y `OPERARIO`; sin cambios de schema ni migraciones.
- Frontend: pantalla dashboard como home post-login, con las tres secciones.

**Non-Goals:**
- No agregar índices nuevos (dataset pequeño; se documenta como riesgo y optimización futura).
- No gráficos históricos, exportación, ni KPIs adicionales (ver proposal — Non-goals).
- No modificar los specs/behavior de `movimientos-stock` ni `gestion-productos`.

## Decisions

### D1. Una query por sección, sin N+1
- **Alertas**: `prisma.product.findMany({ where: { deletedAt: null, stock: { lte: prisma.product.fields.stockMin } }, orderBy: { stock: 'asc' }, select: productSelect })`. Reutiliza el field reference `prisma.product.fields.stockMin` ya validado en `busqueda-filtros` y el `productSelect` existente (resuelve `category`/`supplier` en la misma query). Orden por `stock` ascendente = mayor urgencia primero.
- **Valorización**: `prisma.$queryRaw` con `SELECT COALESCE(SUM(price * stock), 0)::float8 FROM products WHERE "deletedAt" IS NULL`. Prisma `aggregate` no puede multiplicar columnas (`_sum` suma una columna a la vez, no `price * stock`), así que el SUM de producto de columnas requiere raw SQL. Un único aggregate en la DB, no trae filas al servicio.
- **Movimientos recientes**: `prisma.stockMovement.findMany({ take: 10, orderBy: { date: 'desc' }, select: { id, type, quantity, reason, date, product: { select: { id, name, code } }, user: { select: { id, name, email } } } })`. `take: 10` + `orderBy date desc` como límite en la DB; `product` y `user` resueltos por `select` anidado (join en Prisma, no N+1).
- **Por qué no traer todos los productos y sumar en JS**: es un full-scan al servicio, caro en memoria y con más código; el aggregate en la DB es O(1) en filas devueltas.

### D2. `totalInventoryValue` como `number`
- El SUM raw devuelve `Decimal`/`float8`; el service lo convierte a `Number(...)` y el controller lo devuelve dentro de `{ data }`. Consistente con el contrato del resto de la API (los `price` de productos se serializan como Decimal→string en JSON, pero la valorización es un agregado numérico calculado, no una entidad persistida).

### D3. Controller plano sin DTOs
- `GET /api/dashboard` no recibe body ni query params → sin DTOs ni class-validator (a diferencia de escrituras). `@Roles(Role.ADMIN, Role.OPERARIO)` a nivel de método sobre el controller, igual que `stock.controller.ts` lo hace a nivel de clase.

### D4. `DashboardService.getSummary()` agrega las tres queries en paralelo
- `Promise.all([...])` para las tres consultas independientes (son lecturas puras, sin dependencia entre sí) y componer el objeto `{ alerts, totalInventoryValue, recentMovements }` en una sola respuesta.

## Risks / Trade-offs

- [Las tres queries se ejecutan en paralelo contra la misma conexión Prisma] → Inofensivo: `$queryRaw` y `findMany` son lecturas; `Promise.all` no abre transacciones. Si se quisiera consistencia absoluta entre secciones se usaría una `$transaction` de solo lectura (no necesario aquí; la API es de snapshot informativo).
- [Sin índice en `stock_movements.date` ni en `stock` de `products`] → Dataset de ferretería pequeño; `ORDER BY date DESC LIMIT 10` y el filtro `stock <= stockMin` siguen siendo baratos. Si el volumen crece, agregar índices parciales `(stock) WHERE "deletedAt" IS NULL` y `(date desc)` como optimización futura (fuera de alcance).
- [`$queryRaw` con SQL crudo pierde type-safety de Prisma] → Mitigación: SQL mínimo y aislado en el service (no interpolación de input de usuario — no hay params), tipado explícito del resultado y conversión `Number()` acotada.
