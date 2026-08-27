## Why

El change `auth-jwt` (archivado) dejó la autenticación y autorización por rol en
su lugar, pero no hay forma de que el ADMIN administre los usuarios del sistema:
los usuarios solo existen vía seed. Sin CU02 (ABM de usuarios) el sistema no
puede incorporar operarios nuevos ni inhabilitar a quienes ya no deben acceder.
Este change implementa la gestión de usuarios para completar el ciclo de vida de
la cuenta: alta, listado y baja, exclusivo de `ADMIN`.

## What Changes

- **Backend — nuevo módulo `users`** bajo `/api/users`, todos los endpoints
  restringidos a `ADMIN` (`@Roles(Role.ADMIN)`):
  - `POST /api/users` — alta con `email` único, `name`, `password` inicial y
    `role`. Password hasheada con `bcrypt` (rounds >= 10). Devuelve `201` con el
    usuario **sin** `passwordHash`.
  - `GET /api/users` — listado de usuarios activos (sin `passwordHash`).
  - `DELETE /api/users/:id` — baja (lógica, `deletedAt`). Devuelve `204`.
- **Schema Prisma**: se agrega `User.deletedAt DateTime?` (baja lógica, mismo
  patrón que productos — evita romper la FK con `StockMovement`).
- **Modificación sobre auth**: el login NO autentica usuarios dados de baja
  (`deletedAt != null`) → `401 Credenciales inválidas`.
- **Frontend**: pantalla de administración de usuarios (listado, alta, baja)
  visible únicamente para `ADMIN` (reutiliza `RequireRole`). Agrega funciones al
  cliente HTTP centralizado (`src/api/`).
- **Nunca se devuelve `passwordHash`** en ninguna respuesta de la API (contrato
  de proyección explícita, ver design).

## Capabilities

### New Capabilities
- `user-management`: alta, listado y baja de usuarios del sistema, exclusivo de
  rol `ADMIN`, con email único, password hasheada y nunca expuesta, y baja
  lógica.

### Modified Capabilities
- `auth`: el login debe rechazar (`401`) a los usuarios dados de baja, para que
  la baja de `user-management` tenga efecto real sobre el acceso al sistema.

## Impact

- **Backend**: nuevo módulo `backend/src/users/` (controller, service, DTOs con
  `class-validator`); migración Prisma que agrega `User.deletedAt`; ajuste en
  `backend/src/auth/auth.service.ts` (login filtra `deletedAt: null`); tests
  unit y e2e nuevos.
- **Frontend**: nueva feature `frontend/src/features/users/` (pantalla de
  gestión) + API client (`users`), integrada bajo `RequireRole role="ADMIN"`.
- **No afecta**: `products`, `stock`, `dashboard`, `chatbot`, `semantic` (sus
  guards ya cubren roles). `Categories`/`Suppliers` no cambian.

## Non-goals

- Edición de perfil propio o cambio de contraseña desde la UI (CU02 no lo pide).
- Recuperación/restablecimiento de contraseña olvidada.
- Cambio de rol de un usuario existente (alta trae rol; no hay edición).
- Refresh tokens / revocación server-side del JWT (ya declarado fuera de
  alcance en `auth-jwt`; la baja solo impide futuros logins).
- Baja física de usuarios: siempre lógica (`deletedAt`).
