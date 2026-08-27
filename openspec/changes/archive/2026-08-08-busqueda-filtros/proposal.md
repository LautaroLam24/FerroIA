## Why

El listado actual de productos (`GET /api/products`) devuelve todos los activos sin
forma de filtrar ni paginar. Con un catálogo creciente, el OPERARIO y el ADMIN no
pueden encontrar un producto por nombre, código, categoría o proveedor, ni detectar
rápidamente los productos bajo stock mínimo. CU05 exige búsqueda y filtros
combinables sobre el catálogo.

## What Changes

- `GET /api/products` (CU05) pasa a aceptar query params combinables: `name`
  (contiene, case-insensitive), `code` (exacto), `categoryId`, `supplierId` y
  `lowStock=true` (`stock <= stockMin`).
- Se agrega paginación `page` / `pageSize` con respuesta `{ data, meta }` donde
  `meta = { total, page, pageSize }`.
- El endpoint pasa a ser accesible para `ADMIN` **y** `OPERARIO` (antes solo
  `ADMIN`). Es un cambio de requisito, no breaking de contrato.
- Siempre excluye productos con `deletedAt` no nulo (baja lógica), en cualquier
  combinación de filtros.
- Parámetros inválidos (página no numérica, `pageSize` fuera de rango, etc.)
  responden `400`.
- Frontend: barra de búsqueda por nombre + filtros combinables (categoría,
  proveedor, low stock) sobre la tabla de productos, con paginación.
- Búsqueda sin resultados responde `200` con `data: []` y `meta.total = 0`.

## Capabilities

### New Capabilities
<!-- Ninguna: la capacidad ya existe y su requisito de listado se modifica -->

### Modified Capabilities
- `gestion-productos`: el requisito "Listado de productos" deja de ser un listado
  plano solo-ADMIN y pasa a soportar filtros combinables, paginación con `meta`,
  acceso `ADMIN`/`OPERARIO` y exclusión permanente de `deletedAt` en toda
  combinación de filtros.

## Impact

- Backend: `backend/src/products/` (controller, service, DTO de query,
  pruebas unit/e2e). El DTO de query valida y tipa los filtros y la paginación.
- Frontend: `frontend/src/features/products/` (barra de búsqueda, selector de
  filtros, tabla paginada) y `frontend/src/api/`.
- Auth: se amplía la autorización de `GET /api/products` a los roles
  `ADMIN`/`OPERARIO` (guards existentes).
- No afecta stock, dashboard, chatbot ni órdenes de compra.

## Non-goals

- Ordenamiento configurable por columnas (se mantiene el orden actual).
- Búsqueda difusa / semántica (esa es CU10, módulo de IA).
- Filtros por rango de precio o fechas.
- Exposición de filtros en otros endpoints.
