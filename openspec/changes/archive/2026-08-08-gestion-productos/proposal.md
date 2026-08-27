## Why

El sistema no tiene todavía gestión de productos (CU03): no existe forma de dar de alta,
editar o dar de baja productos, ni de asociarlos a una categoría/proveedor existente. Sin
esto no hay catálogo sobre el que operar stock (CU06/CU07), mostrar alertas de stock bajo
(CU08) ni indexar en el buscador semántico (CU10). Es la pieza base que desbloquea el resto
del inventario.

## What Changes

- Nuevo módulo `products` (backend NestJS): ABM completo restringido a `ADMIN`.
  - `POST /api/products`: alta con `name`, `code` (único), `price` (>= 0), `stock` inicial,
    `stockMin`, `categoryId` y `supplierId` (deben existir y no estar dados de baja).
  - `GET /api/products`: listado de productos activos (`deletedAt: null`), incluye datos de
    categoría/proveedor y campo derivado de stock bajo mínimo.
  - `PATCH /api/products/:id`: edición de campos (mismas validaciones que el alta).
  - `DELETE /api/products/:id`: baja lógica (`deletedAt`), `204` sin cuerpo. No borra el
    producto ni sus movimientos de stock.
- **BREAKING** (schema): se agrega `code String @unique` a `Product` vía migración Prisma
  (`prisma migrate dev`). El schema actual no tiene este campo.
- Los movimientos de stock (`StockMovement`, aún sin módulo propio) deben rechazar con `409`
  cualquier intento de registrar movimiento sobre un producto con `deletedAt` no nulo — esta
  regla se especifica acá aunque el endpoint de movimientos se implemente en el change de
  stock (CU06/CU07), para dejar el contrato claro desde el lado de productos.
- Frontend: página `ProductsPage` (`features/products`) con tabla de productos, alta/edición
  en formulario (o modal), baja con confirmación, y una marca visual (badge/color) en las
  filas donde `stock <= stockMin`. Selects de categoría/proveedor alimentados desde
  `GET /api/categories` y `GET /api/suppliers` (ya existentes). Protegida con
  `RequireRole ADMIN`.
- Evento de dominio `ProductCreated` / `ProductUpdated` / `ProductDeleted` (ver
  `backend/src/events/`) emitido en cada operación exitosa, para que el listener de
  reindexado de ChromaDB (CU10, fuera de este change) lo consuma. Este change solo emite el
  evento; el listener que reindexa se implementa junto con CU10.

## Capabilities

### New Capabilities
- `gestion-productos`: ABM de productos con baja lógica, validación de categoría/proveedor
  existentes, y reglas de negocio sobre precio/stock y visibilidad tras la baja.

### Modified Capabilities
(ninguna — `categorias` y `proveedores` no cambian sus requisitos; productos los referencia
pero no los modifica)

## Impact

- **Backend**: nuevo `backend/src/products/` (module, controller, service, DTOs
  `create-product.dto.ts` / `update-product.dto.ts`), migración Prisma que agrega
  `Product.code` (`@unique`), emisión de eventos de dominio en `backend/src/events/`
  (o el mecanismo que ya exista ahí).
- **Frontend**: nuevo `frontend/src/features/products/` (listado, formulario alta/edición,
  baja con confirmación, indicador de stock bajo), cliente API en `frontend/src/api/`.
- **Specs**: nueva `openspec/specs/gestion-productos/spec.md`.
- **Non-goals**: búsqueda avanzada/filtros de productos (change `busqueda-filtros`),
  imágenes de producto, el endpoint de movimientos de stock en sí (change de CU06/CU07 —
  acá solo se especifica que debe rechazar movimientos sobre productos dados de baja),
  el listener real de reindexado ChromaDB (CU10).
