## Why

El sistema no tiene forma de identificar usuarios ni de proteger endpoints: hoy
cualquier request llega sin autenticar. Sin login y sin distinción de roles
(ADMIN/OPERARIO) no se puede empezar a construir el resto de los CUs (gestión
de productos, stock, dashboard), porque todos dependen de saber quién hace la
petición y con qué permiso. Este change resuelve la base de autenticación y
autorización para destrabar el resto del roadmap.

## What Changes

- Nuevo módulo `auth` en NestJS: `POST /api/auth/login` (email + password →
  JWT) y `POST /api/auth/logout`.
- JWT firmado con `JWT_SECRET` (env), payload `{ sub, email, role }`,
  expiración configurable por env.
- `JwtAuthGuard` aplicado globalmente (protege todas las rutas salvo las
  marcadas `@Public()`), `RolesGuard` + decorator `@Roles(...)` para
  autorización por rol.
- Passwords hasheadas con `bcrypt` (salt rounds >= 10); nunca se loggean ni se
  devuelven hashes.
- Rate limiting en `POST /api/auth/login`.
- Seed inicial con un usuario `ADMIN` (para poder loguearse la primera vez).
- Frontend: pantalla de login, almacenamiento del token, interceptor HTTP que
  agrega `Authorization: Bearer <token>` y redirige a `/login` ante `401`;
  ocultamiento de secciones de administración cuando el rol es `OPERARIO`.

## Capabilities

### New Capabilities
- `auth`: login, logout, emisión/validación de JWT, guards globales de
  autenticación y autorización por rol (ADMIN/OPERARIO).

### Modified Capabilities
(ninguna — no existen specs previas en el repo)

## Impact

- **Backend**: nuevo módulo `backend/src/auth/` (controller, service, DTOs,
  `JwtAuthGuard`, `RolesGuard`, decorators `@Roles()`/`@Public()`,
  estrategia JWT de Passport); `ValidationPipe` global ya existente se
  reutiliza para los DTOs de login. Seed de Prisma extendido con el usuario
  ADMIN inicial. Nuevas env vars: `JWT_SECRET`, `JWT_EXPIRES_IN`.
- **Frontend**: nueva pantalla `Login`, contexto/estado de sesión, interceptor
  en el cliente HTTP centralizado (`src/api/`) para adjuntar el Bearer y
  manejar `401`, guard de rutas/ocultamiento de UI de admin para `OPERARIO`.
- **Dependencias nuevas**: `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`,
  `bcrypt`, `@nestjs/throttler` (rate limiting) en el backend.
- **No afecta**: `products`, `stock`, `categories/suppliers`, `dashboard`,
  `chatbot` (se integran contra estos guards en changes posteriores).

## Non-goals

- ABM de usuarios (alta, edición, baja, listado, cambio de rol) — va en el
  change `gestion-usuarios`.
- Refresh tokens / renovación de sesión sin re-login.
- Recuperación de contraseña / verificación de email.
