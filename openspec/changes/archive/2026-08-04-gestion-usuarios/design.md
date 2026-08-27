## Context

See proposal.md - Why. Ya existe el módulo `auth` con `JwtAuthGuard` y
`RolesGuard` registrados como `APP_GUARD` globales, el decorator `@Roles(...)`
y el decorator `@Public()` (`.instructions.md §4`). El modelo `User` ya existe
en Prisma (`email` único, `name`, `passwordHash`, `role`, timestamps) pero no
hay módulo `users`: hoy los usuarios solo nacen vía seed. No existe aún
ninguna pantalla de administración en el frontend; sí existe el cliente HTTP
centralizado (`src/api/http.ts` con manejo de Bearer y 401) y el componente
`RequireRole` para ocultar UI según rol.

## Goals / Non-Goals

**Goals:**
- Mantener el patrón controller → service → Prisma y los guards globales ya
  existentes (no re-implementar autorización).
- Decidir el mecanismo de baja (lógico vs físico) considerando la FK
  `StockMovement.userId` y la inmutabilidad de movimientos (§2).
- Garantizar por diseño que `passwordHash` nunca sale del backend.

**Non-Goals:**
- Diseñar edición de usuario, cambio de rol, cambio de contraseña o
  recuperación (ver proposal.md - Non-goals).
- Revisar la arquitectura de sesión/JWT ya archivada en `auth-jwt`.

## Decisions

### Módulo `users` nuevo que reutiliza los guards globales de `auth`
`JwtAuthGuard` + `RolesGuard` ya son `APP_GUARD` globales: alcanza con
decorar cada handler del nuevo `UsersController` con `@Roles(Role.ADMIN)` para
obtener 401 sin token y 403 para `OPERARIO` (`.instructions.md §4`) sin agregar
guards por ruta. El módulo se registra en `AppModule`. Alternativa considerada:
guard manual por controller — descartada, duplicaría responsabilidad.

### Baja lógica con `User.deletedAt` (nueva columna nullable)
`StockMovement.userId` es una FK obligatoria y los movimientos son inmutables
(§2): borrar físicamente un usuario con movimientos fallaría (P2003) y perdería
historial. Se agrega `User.deletedAt DateTime?` y la baja setea la fecha actual.
Listados filtran `deletedAt: null`; el login también (ver decisión siguiente).
Alternativa considerada: borrado físico condicionado a "sin movimientos" —
descartada: mezcla dos semánticas, complejiza el service y contradice el patrón
de baja lógica del proyecto.

### Email único global se mantiene
`email` sigue siendo `@unique` a nivel DB: un email perteneciente a un usuario
dado de baja no puede reutilizarse (el alta devuelve `409`). Alternativa
considerada: índice único parcial (`deletedAt IS NULL`) para reutilizar emails —
descartada: CU02 no lo pide, agrega una migración de índice más compleja y el
`409` es el comportamiento más predecible para el TP.

### Login rechaza usuarios dados de baja
`auth.service.validateUser` busca el usuario con `findFirst({ where: { email,
deletedAt: null } })` (o `findUnique` + chequeo). Un usuario dado de baja
recibe `401 Credenciales inválidas` (mismo mensaje que credenciales malas, para
no revelar estado de la cuenta). Esto cumple el delta de la spec `auth`.

### `passwordHash` nunca sale del backend (proyección `select`)
Todos los queries del módulo `users` usan `select` explícito de Prisma
(`id, email, name, role, createdAt`) en lugar de traer el registro completo y
borrar el campo después. La proyección es la frontera de seguridad, no un paso
posterior que puede olvidarse. El login de `auth` ya devuelve solo
`id/email/name/role`.

### `CreateUserDto` con class-validator (whitelist estricta ya global)
`email`: `@IsEmail`. `name`: `@IsString` + `@IsNotEmpty` (schema lo exige).
`role`: `@IsIn(['ADMIN', 'OPERARIO'])`. `password`: `@MinLength(8)` +
`@Matches` para exigir al menos una letra y un número (política mínima → 400).
Los mensajes de error van en español y el contrato `{ error, details }` viene
del `ValidationPipe` global ya configurado (§5).

### Hashing con bcrypt reutilizando configuración de env
`UsersService` hashea la password con `bcrypt.hash` usando
`BCRYPT_ROUNDS` (default 10, mínimo 10, §4). El servicio de auth ya usa `bcrypt`
para comparar, así no se agrega dependencia nueva.

### Frontend: feature `users` envuelta en `RequireRole role="ADMIN"`
Pantalla de administración con listado (tabla: name, email, role, createdAt),
formulario de alta (name, email, password, role) y botón de baja con
confirmación. API nueva `src/api/users.ts` que reutiliza `http` (ya adjunta el
Bearer y traduce 401/403). `SessionContext` ya refresca la UI cuando un 401
invalida la sesión.

## Risks / Trade-offs

- **ADMIN puede darse de baja a sí mismo y quedarse sin acceso** → aceptado
  para el alcance del TP (no es un escenario pedido); la recuperación de
  acceso es manual (seed/re-dar de alta desde la DB). Documentado para no
  asumir protección automática.
- **Email de un usuario dado de baja queda "ocupado" para siempre** → trade-off
  de mantener el `@unique` global; se documenta porque es intencional.
- **Baja lógica y JWT stateless: un JWT ya emitido sigue válido hasta su
  expiración** → trade-off heredado de `auth-jwt` (sin revocación
  server-side); la baja solo impide futuros logins. Aceptado y ya declarado
  en proposal.md - Non-goals.

## Migration Plan

1. Agregar `deletedAt DateTime?` a `model User` en `backend/prisma/schema.prisma`.
2. `npx prisma migrate dev --name add_user_deleted_at` (no destructiva; rollback:
   revertir la migración y eliminar la columna).
3. Deploy: backend primero (migración), luego frontend (feature `users`).
   No hay data migration: la columna nace null (todos activos).
