## 1. Schema y migración

- [x] 1.1 Agregar `code String @unique` a `Product` en `backend/prisma/schema.prisma`
- [x] 1.2 Ejecutar `npx prisma migrate dev --name add_product_code` y verificar que la migración aplica limpio contra la DB local `ferreteria-db`

## 2. Eventos de dominio (groundwork para CU10)

- [x] 2.1 Agregar dependencia `@nestjs/event-emitter` al backend
- [x] 2.2 Crear `backend/src/events/events.module.ts` con `EventEmitterModule.forRoot()` e importarlo en `AppModule`

## 3. Módulo `products` — backend

- [x] 3.1 Crear `backend/src/products/dto/create-product.dto.ts` (`name`, `code`, `price` >= 0, `stock` >= 0, `stockMin` >= 0, `categoryId`, `supplierId`, whitelist estricta)
- [x] 3.2 Crear `backend/src/products/dto/update-product.dto.ts` (mismos campos, todos opcionales)
- [x] 3.3 Crear `backend/src/products/products.service.ts`: `create` (valida categoría/proveedor existentes, catch `P2002` sobre `code` → 409, emite `product.created`), `findAll` (excluye `deletedAt`, agrega campo derivado `lowStock`), `update` (valida producto activo → 404, categoría/proveedor → 400, `code` duplicado → 409, emite `product.updated`), `remove` (baja lógica → 404 si inexistente/ya dado de baja, emite `product.deleted`)
- [x] 3.4 Crear `backend/src/products/products.controller.ts` con `@Roles(Role.ADMIN)` a nivel de controller: `POST /`, `GET /`, `PATCH /:id`, `DELETE /:id` (204)
- [x] 3.5 Crear `backend/src/products/products.module.ts` e importarlo en `AppModule`

## 4. Tests backend

- [x] 4.1 Unit tests de `ProductsService` (Prisma mockeado): alta OK, código duplicado, categoría inexistente, proveedor inexistente, precio negativo, edición OK, edición sobre producto inexistente/dado de baja, baja lógica OK, baja sobre producto inexistente/ya dado de baja
- [x] 4.2 E2E tests de `products`: 201 alta, 409 código duplicado, 400 categoría/proveedor inexistente, 400 precio negativo, 200 edición, 204 baja + verificar que no aparece en `GET /api/products` + verificar en DB que sus `StockMovement` (si se seedea alguno en el test) siguen intactos, 401 sin token, 403 con rol `OPERARIO`

## 5. Frontend

- [x] 5.1 Agregar cliente API en `frontend/src/api/` para `products` (list, create, update, remove) siguiendo el patrón de `users`/`categories`
- [x] 5.2 Crear `frontend/src/features/products/ProductsPage.tsx`: tabla de productos activos con columnas nombre/código/precio/stock/categoría/proveedor
- [x] 5.3 Agregar indicador visual (badge/color) en las filas donde `lowStock` es `true`
- [x] 5.4 Formulario de alta/edición con selects de categoría y proveedor poblados desde `GET /api/categories` y `GET /api/suppliers`
- [x] 5.5 Baja con confirmación (modal/dialog) antes de llamar `DELETE`
- [x] 5.6 Envolver la ruta de `ProductsPage` con `RequireRole ADMIN`

## 6. Tests frontend

- [x] 6.1 Test de `ProductsPage`: renderiza el indicador de stock bajo cuando `stock <= stockMin`

## 7. Verificación final

- [x] 7.1 Ejecutar `npx tsc --noEmit && npm run lint && npm run test` en `backend` y en `frontend`, y confirmar que todo pasa antes de cerrar el change
