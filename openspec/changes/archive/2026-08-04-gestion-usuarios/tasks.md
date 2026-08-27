## 1. Schema y migración

- [x] 1.1 Agregar `deletedAt DateTime?` a `model User` en `backend/prisma/schema.prisma`
- [x] 1.2 Generar migración con `npx prisma migrate dev --name add_user_deleted_at` y regenerar el cliente

## 2. Backend: módulo `users`

- [x] 2.1 Crear `backend/src/users/users.module.ts` (importa `PrismaModule`) y registrarlo en `AppModule`
- [x] 2.2 Crear `CreateUserDto` (`email` @IsEmail, `name` @IsNotEmpty, `role` @IsIn([ADMIN, OPERARIO]), `password` @MinLength(8) + @Matches letra+numero)
- [x] 2.3 Crear `UsersService.create` (validar email duplicado → 409, hashear con bcrypt `BCRYPT_ROUNDS`, `create` con `select` sin `passwordHash`)
- [x] 2.4 Crear `UsersService.findAll` (listado activos `deletedAt: null`, orden `createdAt desc`, `select` sin `passwordHash`)
- [x] 2.5 Crear `UsersService.remove` (baja lógica: `findFirst` con `deletedAt: null` → 404 si no existe, `update` set `deletedAt`)
- [x] 2.6 Crear `UsersController` con `POST /api/users`, `GET /api/users`, `DELETE /api/users/:id` todos con `@Roles(Role.ADMIN)`

## 3. Backend: login rechaza usuarios dados de baja

- [x] 3.1 Ajustar `auth.service.validateUser` para ignorar usuarios con `deletedAt != null` (mismo `401`)

## 4. Tests backend

- [x] 4.1 Unit tests de `UsersService` (Prisma mockeado): alta OK, email duplicado → 409, listado sin passwordHash, baja → 204, baja inexistente → 404
- [x] 4.2 E2E `test/users.e2e-spec.ts`: 201, 409, 400 (email inválido / password débil / rol inválido / campos desconocidos), 200, 204, 404, y 401/403 en todos los endpoints
- [x] 4.3 E2E auth: login de usuario dado de baja → 401 sin emitir JWT

## 5. Frontend: pantalla de administración de usuarios

- [x] 5.1 Crear `frontend/src/api/users.ts` con `listUsers`, `createUser`, `deleteUser` (reutiliza `http`)
- [x] 5.2 Crear `frontend/src/features/users/UsersPage.tsx`: listado (name, email, role, createdAt), formulario de alta y baja con confirmación
- [x] 5.3 Mostrar errores del backend (409 email duplicado, 400 validación) en la UI
- [x] 5.4 Integrar la pantalla en `App.tsx` envuelta en `RequireRole role="ADMIN"`

## 6. Verificación completa

- [x] 6.1 Ejecutar verificación §8 en backend y frontend (`npx tsc --noEmit`, `npm run lint`, `npm run test`) y corregir todo hallazgo antes de marcar completa
