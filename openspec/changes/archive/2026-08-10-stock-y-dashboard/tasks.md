## 1. Pantalla de Stock: formularios de entrada y venta

- [x] 1.1 Reconstruir `StockEntryForm` con `Card`, `FormField`+`Select` (producto), `FormField`+`Input` (cantidad, motivo) y `Button` con loading, manteniendo `createStockEntry`/`listProducts` sin cambios
- [x] 1.2 Reconstruir `StockSaleForm` con `Card`, `FormField`+`Select` (producto), `FormField`+`Input` (cantidad) y `Button` con loading, manteniendo `createStockSale`/`listProducts` sin cambios
- [x] 1.3 En `StockSaleForm`, en el `catch` del envío, detectar el `ApiError` 409 con mensaje "Stock insuficiente" y mostrarlo como error de `FormField` del campo cantidad (via prop `error`), conservando los datos ingresados; el resto de errores pasa por `resolveFormError`
- [x] 1.4 Notificar éxito con `useToast` al registrar entrada o venta y refrescar el listado de movimientos (`onSuccess`)

## 2. Pantalla de Stock: listado de movimientos

- [x] 2.1 Reconstruir `MovementsPage` con la `Table` del design-system (columnas fecha, tipo, producto, cantidad, motivo) y estado vacío ("No hay movimientos para mostrar"), conservando la lógica de filtros (`productId`, `from`, `to`) y sus ids
- [x] 2.2 Reestilizar los controles de filtro con `FormField`+`Select`/`Input` y `Button` del design-system, manteniendo la misma lógica de `refresh`
- [x] 2.3 Agregar estado de carga inicial (spinner/skeleton) en `MovementsPage` mientras cargan los datos, y notificar errores de carga con `useToast`

## 3. Dashboard como home post-login

- [x] 3.1 Reconstruir `DashboardPage` con cards de métricas: `Card` de valorización total con número formateado (es-AR, ARS) en tipografía grande y legible, y `Card` de alertas con el conteo de productos bajo el mínimo
- [x] 3.2 Renderizar las alertas de stock bajo en `Table` del design-system con `Badge variant="warning"` ("Stock bajo") junto al stock, y estado vacío ("Sin alertas de stock") cuando `alerts` está vacío
- [x] 3.3 Renderizar los últimos movimientos en `Table` del design-system (fecha, tipo, cantidad, producto, usuario) sin Badge de alerta, con estado vacío ("Sin movimientos registrados")
- [x] 3.4 Agregar estados de carga con `Skeleton` en las cards y tablas del dashboard mientras cargan los datos, y notificar errores de carga con `useToast`
- [x] 3.5 Verificar que `App.tsx` mantiene `'dashboard'` como vista inicial post-login (sin cambios de navegación)

## 4. Tests

- [x] 4.1 Adaptar `StockSaleForm.test.tsx` a los nuevos componentes manteniendo las aserciones existentes (409 "Stock insuficiente" visible, venta exitosa) y verificar que el 409 se asocia al campo cantidad
- [x] 4.2 Adaptar `MovementsPage.test.tsx` a los nuevos componentes manteniendo las aserciones de listado y filtros
- [x] 4.3 Agregar/ajustar test del dashboard si existe cobertura previa, cubriendo estados de carga y vacío de alertas y movimientos

## 5. Verificación final

- [x] 5.1 Ejecutar la verificación completa del frontend (`tsc --noEmit`, lint y tests) y confirmar que no se modificaron `frontend/src/api`, hooks de datos ni backend
