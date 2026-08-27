## 1. Backend: DTO de query y validación

- [x] 1.1 Crear `backend/src/products/dto/query-products.dto.ts` con `name?`, `code?`, `categoryId?`, `supplierId?`, `lowStock?` (`@IsIn(['true', 'false'])`), `page?` (`@Type(() => Number)`, `@IsInt()`, `@Min(1)`), `pageSize?` (`@Type(() => Number)`, `@IsInt()`, `@Min(1)`, `@Max(100)`); usar `@IsOptional()` en todos
- [x] 1.2 Asegurar que el `ValidationPipe` que procesa el DTO de query tenga `whitelist: true` y `forbidNonWhitelisted: true` (params desconocidos → 400)

## 2. Backend: servicio con filtros y paginación

- [x] 2.1 En `products.service.ts`, agregar `findAll(query: QueryProductsDto)` que construya el `Prisma.ProductWhereInput` con `deletedAt: null` siempre + filtros combinables (`name` contains case-insensitive, `code`/`categoryId`/`supplierId` igualdad, `lowStock` como `stock: { lte: Prisma.ProductScalarFieldEnum.stockMin }`)
- [x] 2.2 Calcular `total` con `prisma.product.count({ where })` (sin paginar) y `data` con `findMany({ where, orderBy: { name: 'asc' }, skip, take, select: productSelect })` usando defaults `page = 1`, `pageSize = 10`; conservar el cálculo de `lowStock` por producto
- [x] 2.3 Retornar un tipo paginado (items + total) desde el service

## 3. Backend: controller con roles y meta

- [x] 3.1 En `products.controller.ts`, `@Get()` pasa a `@Roles(Role.ADMIN, Role.OPERARIO)` (a nivel de método) recibiendo `@Query()` con `QueryProductsDto`, y responde `{ data, meta: { total, page, pageSize } }`

## 4. Backend: tests

- [x] 4.1 Unit (`products.service.spec.ts`): cada filtro por separado, dos filtros combinados, `lowStock=true`, exclusión de `deletedAt` con filtros, `total` sin paginar
- [x] 4.2 E2E (`test/products.e2e-spec.ts`): escenarios mínimos — cada filtro, dos combinados, búsqueda sin resultados (`200` con `data: []`, `meta.total: 0`), paginación con `meta` correcta, `lowStock=yes` → 400, `page=0` / `pageSize=101` → 400, sin token → 401, y `GET` con rol `OPERARIO` → 200

## 5. Frontend: cliente de API y UI

- [x] 5.1 En `frontend/src/api/products.ts`, cambiar `listProducts(query?)` para aceptar filtros + paginación y devolver `{ data: ApiProduct[]; meta: { total, page, pageSize } }`; agregar tipos `ProductQuery` y `ProductListResult`
- [x] 5.2 En `ProductsPage.tsx`, agregar barra de búsqueda por nombre + filtros combinables (categoría, proveedor, low stock) y controles de paginación (página actual, prev/next, total); re-consultar al cambiar cualquier filtro o página
- [x] 5.3 Actualizar `ProductsPage.test.tsx` para cubrir la búsqueda y filtros en el frontend

## 6. Verificación

- [x] 6.1 Ejecutar verificación completa: `npx tsc --noEmit && npm run lint && npm run test` en backend y frontend (ver skill `run-verify`)
