## Why

El sistema ya gestiona productos, pero no existe un catálogo maestro de
categorías ni de proveedores (CU04). Sin estos maestros, los productos no
pueden clasificarse ni vincularse a un origen de reposición, y el dashboard
y el módulo de reposición (CU10) no tienen sobre qué agrupar.

## What Changes

- Nuevo CRUD de **Categorías** (ADMIN): alta, listado, edición y baja.
- Nuevo CRUD de **Proveedores** (ADMIN): alta, listado, edición y baja.
- Regla de negocio: no se puede eliminar una categoría o proveedor que tenga
  productos activos asociados (respuesta `409` con mensaje claro).
- Frontend: pantallas de listado + alta/edición para ambos recursos.
- No se modifican ni categorías ni proveedores existentes (no existen aún).

## Capabilities

### New Capabilities
- `categorias`: CRUD de categorías (nombre único), con protección por rol
  ADMIN y regla de integridad referencial al eliminar.
- `proveedores`: CRUD de proveedores (nombre, contacto opcional), con
  protección por rol ADMIN y regla de integridad referencial al eliminar.

### Modified Capabilities
<!-- Ninguna: auth/user-management no cambian a nivel de especificación -->

## Impact

- **Backend** (`/backend/src`): módulos nuevos `categories` y `suppliers`
  (controller, service, DTOs, guard `@Roles('ADMIN')`, tests unit/e2e).
- **Prisma**: tablas nuevas `Category` y `Supplier` en el schema + migración;
  el modelo `Product` ya referencia o referenciará estas entidades.
- **Frontend** (`/frontend/src`): features nuevas para listado y
  alta/edición de categorías y proveedores (rutas, API client, UI).
- **Tests**: escenarios mínimos por recurso (201, 409, 400, 200, 204, 409
  con asociados, 403, 404).

## Non-goals

- Vinculación masiva de productos a categorías/proveedores.
- Importación/exportación de catálogos.
- Cambios sobre las categorías o proveedores ya referenciados por el módulo
  de reposición (CU10) más allá del CRUD básico.
- Baja lógica para categorías/proveedores (la baja es física salvo la regla
  de integridad con productos activos).
