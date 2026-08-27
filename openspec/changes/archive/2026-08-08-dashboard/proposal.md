## Why

El sistema ya registra productos (CU03), movimientos de stock (CU06/CU07) y alertas de stock mínimo en el listado de catálogo, pero no hay una vista única que consolide la salud del inventario. El operario/administrador necesita entrar y ver de un vistazo qué productos están bajo el mínimo, cuánto vale el inventario y qué movimientos se hicieron recientemente, sin recorrer pantallas por separado (CU08).

## What Changes

- Nuevo módulo `dashboard` (backend NestJS), accesible a `ADMIN` y `OPERARIO`:
  - `GET /api/dashboard`: devuelve en UNA sola respuesta:
    - `alerts`: lista de productos activos con `stock <= stockMin`, ordenada por prioridad (menor stock primero) e incluyendo datos del producto (id, code, name, category, stock, stockMin).
    - `totalInventoryValue`: valorización total del inventario = suma de `price * stock` sobre productos activos (sin `deletedAt`).
    - `recentMovements`: últimos 10 movimientos de stock ordenados por `date` desc, con producto y usuario resolvidos (no N+1).
  - Las tres secciones se calculan con queries agregadas eficientes (una consulta por sección, sin bucles de `findUnique`).
- Frontend: pantalla de dashboard con las tres secciones (alertas, valorización, movimientos recientes), como home post-login para ambos roles.
- Sin migración de schema: todo se resuelve con las tablas existentes (`Product`, `StockMovement`, `Category`, `Supplier`, `User`).

## Capabilities

### New Capabilities
- `dashboard`: consolidación de métricas de inventario en un solo endpoint — alertas de stock bajo mínimo, valorización total del inventario activo y últimos movimientos recientes.

### Modified Capabilities
(ninguna)

## Impact

- **Backend**: nuevo `backend/src/dashboard/` (module, controller, service). Sin DTOs de entrada (GET sin body) ni migración Prisma.
- **Frontend**: nuevo `frontend/src/features/dashboard/` (DashboardPage como home post-login), cliente API en `frontend/src/api/dashboard.ts`, ajuste de la navegación/ruteo existente para que el dashboard sea el home.
- **Specs**: nueva `openspec/specs/dashboard/spec.md`.
- **Non-goals**: gráficos históricos de tendencia de stock/ventas, exportación (CSV/PDF), comparativas entre períodos, KPIs adicionales (top ventas, ticket promedio), y consulta de detalle de producto desde el dashboard.
