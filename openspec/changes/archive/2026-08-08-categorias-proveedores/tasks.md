## 1. Migración de Prisma

- [x] 1.1 Verificar con `postgres`/Prisma Studio que las tablas `categories` y `suppliers` existen y están vacías
- [x] 1.2 Usar la skill `prisma-migrate` para agregar `contact String?` al modelo `Supplier` y generar la migración (regenerar cliente Prisma)

## 2. Backend — Módulo de categorías

- [x] 2.1 Usar la skill `add-crud-nest` para crear el módulo `categories` (module, controller, service, DTOs con class-validator, guards `@Roles(ADMIN)`) siguiendo el patrón de `UsersModule`
- [x] 2.2 Implementar endpoints: `POST /api/categories`, `GET /api/categories`, `PATCH /api/categories/:id`, `DELETE /api/categories/:id`
- [x] 2.3 Implementar unicidad de nombre con `409` (pre-check + catch `P2002`) en create y update
- [x] 2.4 Implementar regla de integridad en delete: `409` si hay productos activos asociados (`deletedAt: null`); `404` si no existe; `204` en baja OK
- [x] 2.5 Incluir `productCount` (productos activos) en el listado y registrar el módulo en `AppModule`

## 3. Backend — Módulo de proveedores

- [x] 3.1 Usar la skill `add-crud-nest` para crear el módulo `suppliers` (module, controller, service, DTOs con class-validator, guards `@Roles(ADMIN)`) siguiendo el patrón de `UsersModule`
- [x] 3.2 Implementar endpoints: `POST /api/suppliers`, `GET /api/suppliers`, `PATCH /api/suppliers/:id`, `DELETE /api/suppliers/:id`
- [x] 3.3 Implementar unicidad de nombre con `409` (pre-check + catch `P2002`) en create y update
- [x] 3.4 Implementar regla de integridad en delete: `409` si hay productos activos asociados; `404` si no existe; `204` en baja OK
- [x] 3.5 Incluir `productCount` en el listado y registrar el módulo en `AppModule`

## 4. Backend — Tests

- [x] 4.1 Escribir tests unit de `CategoriesService` y `SuppliersService` (Prisma mockeado) cubriendo: alta, nombre duplicado (409), listado con productCount, edición, 404, baja OK (204), baja con productos asociados (409)
- [x] 4.2 Escribir tests e2e (supertest) por recurso cubriendo: 201, 400, 403 para OPERARIO, 404, 409 duplicado, 409 con asociados, 200 listado, 200 edición, 204 baja

## 5. Frontend

- [x] 5.1 Crear feature `categories`: pantalla de listado (tabla con nombre y productCount) y formulario de alta/edición conectados al API client
- [x] 5.2 Crear feature `suppliers`: pantalla de listado (tabla con nombre, contacto y productCount) y formulario de alta/edición conectados al API client
- [x] 5.3 Agregar rutas en el router protegidas por rol ADMIN y enlaces de navegación

## 6. Verificación final

- [x] 6.1 Ejecutar la verificación completa con la skill `run-verify` (tsc + lint + tests en backend y frontend)
