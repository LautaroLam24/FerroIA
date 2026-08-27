## Purpose

Permitir que un usuario con rol `ADMIN` administre las cuentas del sistema:
dar de alta usuarios (email único, password inicial y rol), listar los usuarios
activos y dar de baja cuentas que ya no deben acceder. La gestión de usuarios es
exclusiva de `ADMIN` y nunca expone hashes de contraseña.

## ADDED Requirements

### Requirement: Alta de usuario
El sistema SHALL exponer `POST /api/users`, restringido a `ADMIN`, que recibe
`email`, `name`, `password` y `role` (`ADMIN` | `OPERARIO`). Si el `email` ya
está registrado, SHALL responder `409`; si algún campo es inválido, SHALL
responder `400`. En éxito SHALL crear el usuario con su password hasheada
(bcrypt) y responder `201` con el usuario creado **sin** `passwordHash`.

#### Scenario: Alta exitosa
- **WHEN** un `ADMIN` envía `POST /api/users` con `email`, `name`, `password`
  y `role` válidos
- **THEN** el sistema responde `201` con `{ "data": { "id", "email", "name", "role", "createdAt" } }`
  y el campo `passwordHash` está ausente de la respuesta

#### Scenario: Email duplicado
- **WHEN** un `ADMIN` envía `POST /api/users` con un `email` que ya existe en
  el sistema
- **THEN** el sistema responde `409` con `{ "error": "El email ya está registrado" }`
  y no crea ningún usuario

#### Scenario: Email inválido
- **WHEN** un `ADMIN` envía `POST /api/users` con un `email` que no tiene un
  formato válido
- **THEN** el sistema responde `400` con `{ "error": "...", "details": [...] }`

#### Scenario: Password débil
- **WHEN** un `ADMIN` envía `POST /api/users` con una `password` que no cumple
  la política mínima (longitud y composición)
- **THEN** el sistema responde `400` con `{ "error": "...", "details": [...] }`

#### Scenario: Rol inválido
- **WHEN** un `ADMIN` envía `POST /api/users` con un `role` distinto de
  `ADMIN` u `OPERARIO`
- **THEN** el sistema responde `400` con `{ "error": "...", "details": [...] }`

#### Scenario: Campos desconocidos
- **WHEN** un `ADMIN` envía `POST /api/users` con campos no esperados por el DTO
- **THEN** el sistema responde `400` (whitelist estricta) y no crea ningún usuario

#### Scenario: Sin token
- **WHEN** se envía `POST /api/users` sin header `Authorization`
- **THEN** el sistema responde `401` con `{ "error": "No autenticado" }`

#### Scenario: Rol insuficiente
- **WHEN** un usuario autenticado con rol `OPERARIO` envía `POST /api/users`
- **THEN** el sistema responde `403` con `{ "error": "No autorizado" }`

### Requirement: Listado de usuarios
El sistema SHALL exponer `GET /api/users`, restringido a `ADMIN`, que devuelve
los usuarios activos (no dados de baja) ordenados por `createdAt` descendente,
cada uno **sin** `passwordHash`.

#### Scenario: Listado exitoso
- **WHEN** un `ADMIN` envía `GET /api/users` con al menos un usuario activo en
  el sistema
- **THEN** el sistema responde `200` con `{ "data": [ { "id", "email", "name", "role", "createdAt" }, ... ] }`
  y ningún elemento de la lista incluye `passwordHash`

#### Scenario: Usuarios dados de baja excluidos del listado
- **WHEN** un `ADMIN` envía `GET /api/users` y existen usuarios con
  `deletedAt` no nulo
- **THEN** el sistema responde `200` y los usuarios dados de baja no aparecen
  en `data`

#### Scenario: Sin token
- **WHEN** se envía `GET /api/users` sin header `Authorization`
- **THEN** el sistema responde `401` con `{ "error": "No autenticado" }`

#### Scenario: Rol insuficiente
- **WHEN** un usuario autenticado con rol `OPERARIO` envía `GET /api/users`
- **THEN** el sistema responde `403` con `{ "error": "No autorizado" }`

### Requirement: Baja de usuario
El sistema SHALL exponer `DELETE /api/users/:id`, restringido a `ADMIN`, que
da de baja lógica al usuario (`deletedAt` con fecha actual) y responde `204` sin
cuerpo. Un `:id` inexistente o de un usuario ya dado de baja SHALL responder
`404`.

#### Scenario: Baja exitosa
- **WHEN** un `ADMIN` envía `DELETE /api/users/:id` con un `id` de un usuario
  activo existente
- **THEN** el sistema responde `204` sin cuerpo y el usuario queda con
  `deletedAt` no nulo (deja de aparecer en el listado y no puede volver a
  iniciar sesión)

#### Scenario: Usuario inexistente
- **WHEN** un `ADMIN` envía `DELETE /api/users/:id` con un `id` que no
  corresponde a ningún usuario activo
- **THEN** el sistema responde `404` con `{ "error": "Usuario no encontrado" }`

#### Scenario: Baja de usuario ya dado de baja
- **WHEN** un `ADMIN` envía `DELETE /api/users/:id` sobre un usuario que ya
  tiene `deletedAt` no nulo
- **THEN** el sistema responde `404` con `{ "error": "Usuario no encontrado" }`

#### Scenario: Sin token
- **WHEN** se envía `DELETE /api/users/:id` sin header `Authorization`
- **THEN** el sistema responde `401` con `{ "error": "No autenticado" }`

#### Scenario: Rol insuficiente
- **WHEN** un usuario autenticado con rol `OPERARIO` envía `DELETE /api/users/:id`
- **THEN** el sistema responde `403` con `{ "error": "No autorizado" }`
