## 1. Setup

- [x] 1.1 Instalar dependencias en backend: `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt`, `@nestjs/throttler` (+ `@types/passport-jwt`, `@types/bcrypt` como dev deps)
- [x] 1.2 Agregar `JWT_SECRET`, `JWT_EXPIRES_IN` a `.env`, `.env.example` y validación de config (`ConfigModule`/schema si ya existe)

## 2. Modelo de datos y seed

- [x] 2.1 Confirmar que `User` en `schema.prisma` tiene `email` (unique), `passwordHash`, `role` (`ADMIN`|`OPERARIO`); migrar si falta algo
- [x] 2.2 Escribir `prisma/seed.ts` (o extenderlo) para crear un usuario `ADMIN` inicial con password hasheada por `bcrypt` si no existe

## 3. Módulo auth — core

- [x] 3.1 Crear `backend/src/auth/` con `AuthModule`, `AuthController`, `AuthService`
- [x] 3.2 Crear `LoginDto` con `class-validator` (`email`, `password` requeridos)
- [x] 3.3 Implementar `AuthService.validateUser` (busca por email, compara hash con `bcrypt.compare`) y `AuthService.login` (firma JWT con payload `{ sub, email, role }` y `JWT_EXPIRES_IN`)
- [x] 3.4 Implementar `POST /api/auth/login` en `AuthController` devolviendo `{ data: { accessToken, user } }` según contrato `.instructions.md §6`
- [x] 3.5 Implementar `POST /api/auth/logout` (responde `{ data: { message } }`; no requiere estado server-side, ver design.md - Risks)

## 4. Guards y autorización

- [x] 4.1 Crear `JwtStrategy` (`passport-jwt`) que valida firma/expiración y adjunta `{ userId, email, role }` a `request.user`
- [x] 4.2 Crear decorator `@Public()` (metadata) y decorator `@Roles(...roles)`
- [x] 4.3 Crear `JwtAuthGuard` que respeta `@Public()` y registrarlo como `APP_GUARD` global en `AppModule`
- [x] 4.4 Crear `RolesGuard` que lee `@Roles()` vía `Reflector` y devuelve `403` si el rol del usuario no está habilitado
- [x] 4.5 Marcar `/health` y `POST /api/auth/login` con `@Public()`

## 5. Rate limiting

- [x] 5.1 Configurar `ThrottlerModule` y aplicar `@Throttle()` + `ThrottlerGuard` scoped al endpoint `POST /api/auth/login`

## 6. Tests backend

- [x] 6.1 Unit tests de `AuthService` (Prisma mockeado): login OK, credenciales inválidas, hash de password
- [x] 6.2 E2E: login OK devuelve 200 + token
- [x] 6.3 E2E: login con credenciales inválidas devuelve 401
- [x] 6.4 E2E: login con body inválido devuelve 400
- [x] 6.5 E2E: acceso sin token a ruta protegida devuelve 401
- [x] 6.6 E2E: token expirado devuelve 401 (usar `JWT_EXPIRES_IN` corto o token firmado a mano en el test)
- [x] 6.7 E2E: usuario `OPERARIO` contra endpoint restringido a `ADMIN` devuelve 403 (endpoint de prueba ad-hoc registrado solo en el e2e, ver `test/fixtures/admin-only.controller.ts`)
- [x] 6.8 E2E: logout devuelve 200

## 7. Frontend

- [x] 7.1 Crear pantalla `Login` (formulario email/password, manejo de error 401/400)
- [x] 7.2 Guardar `accessToken` y datos de usuario tras login (storage + estado de sesión/contexto)
- [x] 7.3 Interceptor en el cliente HTTP (`src/api/`) que agrega `Authorization: Bearer <token>` a cada request
- [x] 7.4 Interceptor/manejo de respuesta `401`: limpiar sesión y redirigir a `/login`
- [x] 7.5 Ocultar/deshabilitar secciones de administración en la UI cuando `role === 'OPERARIO'`
- [x] 7.6 Acción de logout en la UI (llama a `POST /api/auth/logout` y limpia el estado local)

## 8. Verificación final

- [x] 8.1 Ejecutar `npx tsc --noEmit && npm run lint && npm run test` en backend y frontend; corregir hasta que pasen todos (`.instructions.md §8`)
