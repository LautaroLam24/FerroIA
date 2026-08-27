## 1. Backend — módulo dashboard

- [x] 1.1 Crear `backend/src/dashboard/dashboard.module.ts` (importa `PrismaModule`) y registrarlo en `app.module.ts`
- [x] 1.2 Crear `backend/src/dashboard/dashboard.service.ts` con `getSummary()` que devuelve `{ alerts, totalInventoryValue, recentMovements }`:
  - `alerts`: `findMany` con `where: { deletedAt: null, stock: { lte: prisma.product.fields.stockMin } }`, `orderBy: { stock: 'asc' }`, reutilizando `productSelect` (incluye category/supplier)
  - `totalInventoryValue`: `prisma.$queryRaw` con `SELECT COALESCE(SUM("price" * stock), 0)::float8 FROM "products" WHERE "deletedAt" IS NULL` y conversión a `Number`
  - `recentMovements`: `findMany` con `take: 10`, `orderBy: { date: 'desc' }`, `select` anidado con `product` y `user`
  - Las tres queries con `Promise.all` (ver design D1/D4)
- [x] 1.3 Crear `backend/src/dashboard/dashboard.controller.ts` con `GET dashboard` y `@Roles(Role.ADMIN, Role.OPERARIO)` a nivel de método, devolviendo `{ data: await service.getSummary() }`

## 2. Backend — tests

- [x] 2.1 Unit test `dashboard.service.spec.ts` (Prisma mockeado): respuesta completa con las tres secciones, sin alertas (lista vacía), valorización excluye `deletedAt` y devuelve `0` sin productos, movimientos con producto y usuario resueltos
- [x] 2.2 E2E `backend/test/dashboard.e2e-spec.ts`: respuesta completa con datos (`200` y las tres claves), sin alertas (lista vacía), valorización excluye productos dados de baja, sin token (`401`), y acceso `OPERARIO` permitido

## 3. Frontend — API client y pantalla dashboard

- [x] 3.1 Crear `frontend/src/api/dashboard.ts` con tipos (`DashboardData`, `DashboardAlert`, `RecentMovement`) y `fetchDashboard(): Promise<DashboardData>` usando `http.get`
- [x] 3.2 Crear `frontend/src/features/dashboard/DashboardPage.tsx` con las tres secciones: alertas (tabla con producto/categoría/stock/stockMin), valorización (monto total), movimientos recientes (tabla con tipo, cantidad, producto, usuario, fecha); estado loading/error consistente con las demás páginas
- [x] 3.3 En `frontend/src/App.tsx`: agregar vista `dashboard` como home post-login (default del estado `view`), agregar botón "Dashboard" al nav y renderizar `DashboardPage` dentro de `RequireRole` para `ADMIN` y `OPERARIO`

## 4. Verificación

- [x] 4.1 Ejecutar verificación completa en backend (`npx tsc --noEmit && npm run lint && npm run test && npm run test:e2e`)
- [x] 4.2 Ejecutar verificación completa en frontend (`npx tsc --noEmit && npm run lint && npm run test`)
- [x] 4.3 Sincronizar spec: mover `specs/dashboard/spec.md` a `openspec/specs/dashboard/spec.md` y archivar el change
