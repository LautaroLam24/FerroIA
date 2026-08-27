## Why

Las pantallas de Stock (CU06/CU07) y el Dashboard (CU08) son funcionales pero se renderizan con estilos ad-hoc (clases `users`, `users-table`, `user-form`) en lugar del design-system: los formularios de entrada y venta no usan `FormField`/`Button`, el 409 "Stock insuficiente" aparece como mensaje global en lugar de como error del formulario, y el Dashboard no muestra estados de carga (skeleton) ni destaca visualmente las alertas de stock bajo. Falta darles la misma experiencia visual que el resto de las pantallas del sistema.

## What Changes

- Formularios de **entrada** y **venta** de stock reconstruidos sobre el design-system: `Card`, `FormField`, `Select`, `Input`, `Button` con estado loading.
- El **409 "Stock insuficiente"** de la venta se muestra como error del formulario, asociado y visible, no como mensaje global.
- **Listado de movimientos** con `Table` del design-system, incluyendo filtros y estados de carga/vacío.
- **Dashboard como home post-login** con cards de métricas (valorización total y alertas de stock mínimo), tabla de últimos movimientos con `Table`, estados de carga (skeleton) y vacío, y números importantes grandes y legibles.
- **Alertas de stock bajo** destacadas visualmente con `Badge`/color de estado.
- No se modifica lógica de negocio, hooks de datos ni cliente HTTP (`frontend/src/api`); no se toca el backend.

## Capabilities

### New Capabilities
- `pantalla-stock`: Presentación frontend de CU06/CU07 — formularios de entrada y venta de stock sobre el design-system con el 409 "Stock insuficiente" como error de formulario, y listado de movimientos con `Table`, filtros y estados de carga/vacío.
- `pantalla-dashboard`: Presentación frontend de CU08 — dashboard como home post-login con cards de métricas (valorización total y alertas de stock mínimo), tabla de últimos movimientos, skeleton de carga, estado vacío y alertas de stock bajo destacadas con `Badge`.

### Modified Capabilities
<!-- Ninguna: el backend (movimientos-stock, dashboard) no cambia; solo la capa de presentación. -->

## Impact

- Frontend: `frontend/src/features/stock/` (`StockPage`, `StockEntryForm`, `StockSaleForm`, `MovementsPage`), `frontend/src/features/dashboard/DashboardPage.tsx`.
- Cliente HTTP `frontend/src/api/stock.ts` y `frontend/src/api/dashboard.ts` se consumen tal cual, sin cambios.
- Navegación: el dashboard ya es la vista inicial post-login en `App.tsx`; se mantiene.
- Backend: sin cambios.
- Cobertura: CU06 (entrada de stock), CU07 (venta de stock), CU08 (dashboard).
- Non-goals: gráficos históricos, exportación, cambios de API o de lógica de negocio.
