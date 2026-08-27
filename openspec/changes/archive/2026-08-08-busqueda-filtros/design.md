## Context

Ver proposal.md — Why. El estado actual relevante:

- `GET /api/products` en `backend/src/products/products.controller.ts` responde
  `{ data: [...] }` sin filtros ni paginación, ordenado por `name asc`, excluyendo
  `deletedAt != null`, con el indicador `lowStock` calculado en el service
  (`products.service.ts` `findAll`).
- El controller aplica `@Roles(Role.ADMIN)` a nivel de clase; el
  `RolesGuard` usa `getAllAndOverride`, por lo que un `@Roles` a nivel de método
  sobreescribe el de clase (permite abrir `GET` a `ADMIN` + `OPERARIO` sin tocar
  el resto).
- Contrato normativo `{ data }` / `{ error }` y códigos 200/400/401/403/409.
- Frontend: `ProductsPage.tsx` consume `listProducts()` (sin argumentos, devuelve
  `ApiProduct[]`) y pinta una tabla con la clase `lowStock`.

## Goals / Non-Goals

**Goals:**
- Filtros combinables por query params en el backend, con validación estricta
  (whitelist: 400 ante params desconocidos o valores inválidos).
- Paginación `page`/`pageSize` con `meta { total, page, pageSize }`, donde
  `total` cuenta los activos que cumplen los filtros sin paginar.
- Acceso a `GET` para `ADMIN` y `OPERARIO`; `POST`/`PATCH`/`DELETE` siguen
  restringidos a `ADMIN`.
- Barra de búsqueda + filtros + paginación en el frontend sobre la tabla actual.

**Non-Goals:**
- Ordenamiento configurable, búsqueda difusa/semántica (CU10), filtros de precio
  o fechas. La baja lógica y el cálculo de `lowStock` ya existen y no cambian.

## Decisions

### 1. Query DTO tipado con class-validator (`QueryProductsDto`)
Un DTO dedicado (`dto/query-products.dto.ts`) con `@IsOptional()` en cada filtro:
- `name?: string` (`contains`, `mode: 'insensitive'`).
- `code?: string` (exacto).
- `categoryId?: string`, `supplierId?: string` (UUIDs).
- `lowStock?: string` validado con `@IsIn(['true', 'false'])` (si no está, 400;
  p.ej. `lowStock=yes`). Se convierte a booleano en el service.
- `page?: number` con `@Type(() => Number)`, `@IsInt()`, `@Min(1)` (default 1).
- `pageSize?: number` con `@Type(() => Number)`, `@IsInt()`, `@Min(1)`,
  `@Max(100)` (default 10).

El controller recibe el DTO como `@Query()`; el `ValidationPipe` con
`whitelist: true` + `forbidNonWhitelisted: true` garantiza que params
desconocidos o mal tipados respondan `400` automáticamente, sin lógica manual.
Se reutiliza el pipe global (si ya está configurado) o se configura el módulo.

### 2. Composición del `where` de Prisma en el service
`findAll(query)` construye un `Prisma.ProductWhereInput`:
- Siempre `deletedAt: null` (baja lógica, incondicional).
- `name`: `{ contains: query.name, mode: 'insensitive' }`.
- `code`, `categoryId`, `supplierId`: igualdad directa.
- `lowStock === 'true'`: `{ stock: { lte: Prisma.ProductScalarFieldEnum.stockMin } }`
  (referencia de campo a campo, sin traer todos los productos a JS).

Alternativa descartada: filtrar `lowStock` en JS tras el fetch — obliga a traer
todo el catálogo y rompe el `total` de paginación.

### 3. Dos queries: `count` + `findMany`
`prisma.product.count({ where })` para `total`, y `findMany({ where, orderBy:
{ name: 'asc' }, skip: (page-1)*pageSize, take: pageSize, select: productSelect })`.
El `lowStock` por producto se sigue calculando en el service como hoy
(`stock <= stockMin`). Dos queries separadas son suficientes para este volumen;
no se justifica `$transaction` (lectura pura, sin consistencia escritura).

### 4. Cambio de contrato del `GET` y del cliente de API
- Controller: `@Get()` pasa a `@Roles(Role.ADMIN, Role.OPERARIO)` (a nivel de
  método, sobreescribe el de clase) y devuelve
  `{ data, meta }` con `meta = { total, page, pageSize }`.
- `findAll()` ahora retorna `{ items: [...], total }` o un tipo `PagedResult`;
  el controller arma `meta`.
- Frontend: `listProducts(query?: ProductQuery): Promise<{ data: ApiProduct[];
  meta: { total: number; page: number; pageSize: number } }>` (nuevo tipo
  `ProductListResult`). `ProductsPage` mantiene estado de filtros + página y
  re-consulta al cambiar cualquiera de ellos; agrega controles de paginación.

### 5. Tests
- Unit (service, `products.service.spec.ts`): cada filtro por separado,
  combinación de dos, `lowStock`, exclusión de `deletedAt`, `total` sin paginar.
- E2E (`test/products.e2e-spec.ts`): escenarios mínimos del change — cada filtro,
  dos combinados, sin resultados (`200`, `data: []`, `meta.total: 0`), paginación
  con `meta` correcta, `lowStock=yes` → 400, `page=0`/`pageSize=101` → 400, sin
  token → 401, y `GET` con rol `OPERARIO` → 200.

## Risks / Trade-offs

- [`name` con `contains` + `insensitive` requiere índice funcional para
  performance en catálogos grandes] → Mitigación: volúmenes TP pequeños; si
  crece, agregar extensión `pg_trgm` e índice GIN (fuera de alcance).
- [`getAllAndOverride` del RolesGuard depende de metadata de método] → Asegurar
  el `@Roles` explícito en `@Get()` y cubrirlo con test e2e de rol `OPERARIO`.
- [Cambio de forma de respuesta de `GET /api/products` (agrega `meta`)] → No
  breaking para consumidores existentes porque `data` conserva su forma; el
  cliente de API del frontend se actualiza en el mismo change.
