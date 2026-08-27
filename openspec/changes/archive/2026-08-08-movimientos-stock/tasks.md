## 1. Módulo `stock` — backend

- [x] 1.1 Crear `backend/src/stock/dto/create-entry.dto.ts` (`productId` UUID, `quantity` entero >= 1, `reason` string, `date` opcional ISO)
- [x] 1.2 Crear `backend/src/stock/dto/create-sale.dto.ts` (`productId` UUID, `quantity` entero >= 1, `reason` opcional, `date` opcional ISO)
- [x] 1.3 Crear `backend/src/stock/dto/list-movements-query.dto.ts` (`productId` opcional UUID, `from`/`to` opcionales ISO date)
- [x] 1.4 Crear `backend/src/stock/stock.service.ts` con el método privado compartido `applyMovement` (transacción interactiva, `updateMany` condicional + diagnóstico post-fallo descritos en design.md), usado por `createEntry` (delta positivo, sin cota de stock) y `createSale` (delta negativo, `stock: { gte: quantity }`)
- [x] 1.5 Implementar `findAll` en `stock.service.ts`: filtros combinables `productId`/`from`/`to`, orden por `date` descendente
- [x] 1.6 Crear `backend/src/stock/stock.controller.ts` con `@Roles(Role.ADMIN, Role.OPERARIO)`: `POST /entries`, `POST /sales`, `GET /movements` bajo el prefijo `stock`
- [x] 1.7 Crear `backend/src/stock/stock.module.ts` e importarlo en `AppModule`

## 2. Tests backend — transacción y concurrencia

- [x] 2.1 Unit tests de `StockService` (Prisma mockeado): entrada OK (stock incrementado), venta OK (stock decrementado), venta con `count: 0` y producto inexistente → 404, venta con `count: 0` y producto dado de baja → 409, venta con `count: 0` y producto activo con stock insuficiente → 409 "Stock insuficiente", entrada sobre producto dado de baja → 409, entrada sobre producto inexistente → 404
- [x] 2.2 E2E tests de `stock`: 201 entrada + stock actualizado, 201 venta + stock decrementado, 409 venta con cantidad > stock (stock intacto), 400 cantidad <= 0 (entrada y venta), 404 producto inexistente, 409 producto dado de baja, 401 sin token, listado sin filtros y con filtros `productId`/`from`/`to`
- [x] 2.3 E2E test de concurrencia: seedear un producto con `stock: 1`, disparar dos `POST /api/stock/sales` en paralelo con `Promise.all` pidiendo `quantity: 1` cada una; verificar que exactamente una responde `201` y la otra `409`, que el `stock` final del producto es `0`, y que existe exactamente un `StockMovement` de tipo `VENTA` para ese producto

## 3. Frontend

- [x] 3.1 Agregar cliente API en `frontend/src/api/stock.ts` (createEntry, createSale, listMovements con filtros) siguiendo el patrón de `products`
- [x] 3.2 Crear `frontend/src/features/stock/StockEntryForm.tsx`: formulario de entrada (producto, cantidad, motivo, fecha opcional)
- [x] 3.3 Crear `frontend/src/features/stock/StockSaleForm.tsx`: formulario de venta (producto, cantidad), mostrando el error "Stock insuficiente" del backend tal cual
- [x] 3.4 Crear `frontend/src/features/stock/MovementsPage.tsx`: listado de movimientos con filtro por producto y rango de fechas
- [x] 3.5 Envolver la vista de stock con `RequireRole` aceptando `ADMIN` y `OPERARIO`, y agregarla a la navegación de `App.tsx`

## 4. Tests frontend

- [x] 4.1 Test de `StockSaleForm`: muestra el mensaje de error "Stock insuficiente" cuando la API responde 409
- [x] 4.2 Test de `MovementsPage`: aplica el filtro por producto al listar

## 5. Verificación final

- [x] 5.1 Ejecutar `npx tsc --noEmit && npm run lint && npm run test` (incluye `test:e2e` en backend, con el test de concurrencia de 2.3) en `backend` y en `frontend`, y confirmar que todo pasa antes de cerrar el change
