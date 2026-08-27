## Context

- El backend de CU06/CU07/CU08 está completo y no cambia: `POST /stock/entries`, `POST /stock/sales`, `GET /stock/movements` y `GET /api/dashboard`; el 409 `Stock insuficiente` llega de `stock.service.ts`.
- `StockPage` hoy renderiza `StockEntryForm` + `StockSaleForm` + `MovementsPage`, y `DashboardPage` la vista dashboard, todas con clases ad-hoc (`users`, `user-form`, `users-table`) en lugar del design-system.
- El design-system ya provee todo lo necesario: `Button` (variantes y loading), `Card`, `FormField` (label + error + `aria-describedby`), `Input`/`Select` (prop `invalid`), `Table` (columnas, rows, estado vacío), `Badge` (variantes warning/error/success), `Spinner`/`Skeleton` y `useToast`. `ProductsPage` es el patrón de referencia de uso del design-system (FormField + field errors + Table + Toast).
- `App.tsx` ya inicializa la vista en `'dashboard'` al iniciar sesión, así que "dashboard como home post-login" ya se cumple y solo se conserva.

## Goals / Non-Goals

**Goals:**
- Reconstruir los formularios de entrada/venta y el listado de movimientos sobre el design-system, sin cambiar la lógica de datos (se siguen usando `createStockEntry`, `createStockSale`, `listMovements`, `listProducts` tal cual).
- Mostrar el 409 `Stock insuficiente` como error del formulario asociado al campo cantidad.
- Reconstruir el Dashboard con cards de métricas (número grande y legible), tabla de últimos movimientos, estados skeleton y vacío, y alertas de stock bajo destacadas con `Badge`.

**Non-Goals:**
- Gráficos históricos, exportaciones o nuevas métricas.
- Cambiar contratos de API, backend, hooks de datos ni `frontend/src/api`.
- Modificar helpers compartidos del design-system (`formErrors.ts`, etc.) salvo que un test lo exija.
- Cambiar la lógica de navegación (el home post-login ya es el dashboard).

## Decisions

### 1. Patrón de formulario y manejo del 409 en `StockSaleForm`
Se sigue el patrón de `ProductsPage`: estado de envío (`submitting`), `FormField` con prop `error` para el campo cantidad y `Button loading`. Para el 409 `Stock insuficiente`, `resolveFormError`/`mapConflictField` no saben asociarlo a un campo (solo mapea nombre/código/email), así que en el `catch` del envío de la venta se detecta el `ApiError` con estado `409` y mensaje `"Stock insuficiente"` y se asigna a `fieldErrors.quantity`; el resto de los errores pasa por `resolveFormError`.
- *Alternativa descartada*: ampliar `CONFLICT_FIELD_KEYWORDS` en `formErrors.ts` con `quantity`/`stock`. Se evita tocar el helper compartido para no afectar otras pantallas; el manejo queda local a la feature.

### 2. Dashboard con cards y números grandes
Las dos métricas (valorización total y alertas) se renderizan en `Card`. El valor monetario se formatea con `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })` y se presenta en tipografía grande (p. ej. `text-3xl font-semibold`). La card de alertas muestra el conteo `alerts.length` grande y los productos bajo el mínimo.
- *Alternativa descartada*: una sola card combinada. Se separan para cumplir "3 secciones" y jerarquía visual.

### 3. Estados de carga y vacío
Se agrega un estado `loading` inicial `true` en `DashboardPage` y `MovementsPage`. Mientras carga, se renderiza `Skeleton` en lugar de cada card/columna de tabla. La `Table` ya provee su estado vacío (`emptyMessage`); se usa para "Sin alertas de stock" y "Sin movimientos registrados". Los errores de red se notifican con `useToast`.
- *Alternativa descartada*: mostrar `"-"` como hoy en el dashboard. El skeleton es el comportamiento pedido y el design-system ya lo incluye.

### 4. Alertas destacadas con Badge
En la tabla de alertas del dashboard y en el listado de movimientos cuando corresponde, el estado de stock bajo se representa con `Badge variant="warning"` ("Stock bajo") junto al stock, reutilizando el mismo enfoque que ya usa `ProductsPage` para productos bajo el mínimo. Los movimientos de la tabla de recientes no llevan ese Badge.

### 5. Listado de movimientos
`MovementsPage` conserva su lógica de filtros (`productId`, `from`, `to`, refresh) y se reestiliza con `FormField` + `Select`/`Input` y `Table` del design-system, manteniendo los mismos `name`/`id` para no romper selectores de tests.

## Risks / Trade-offs

- [Reestilizar filtros puede alterar foco/teclado respecto al HTML nativo] → Mitigación: `Select`/`Input` del design-system preservan semántica nativa; se mantienen ids.
- [Skeleton más lento de percibir que un valor fijo] → Mitigación: skeletons breves; se respeta el estado vacío real cuando la carga termina.
- [Pruebas existentes con selectores/clases viejas] → Mitigación: `MovementsPage.test.tsx` y `StockSaleForm.test.tsx` se adaptan a los nuevos componentes manteniendo las aserciones de comportamiento (venta exitosa, 409, filtros).
- [No tocar `formErrors.ts` deja el mapeo 409→campo duplicado en la feature] → Mitigación: manejo local acotado y comentado en `StockSaleForm`; se documenta en este diseño.

## Migration Plan

- Refactor visual de solo frontend: sin migración de datos ni de API. Se aplica en un commit y se verifica con `tsc --noEmit`, lint y tests del frontend. Rollback: revertir el commit frontend.

## Open Questions

- Ninguna.
