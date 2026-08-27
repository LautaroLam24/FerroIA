## Purpose

Autenticar usuarios por email y password, emitir y validar JWT, y autorizar
el acceso a rutas según el rol (`ADMIN`/`OPERARIO`) del usuario autenticado.

## ADDED Requirements

### Requirement: Iniciar sesión con email y password
El sistema SHALL exponer `POST /api/auth/login` que recibe `email` y
`password`, valida las credenciales contra el usuario almacenado (hash
`bcrypt`) y, si son correctas, SHALL devolver un JWT firmado cuyo payload
incluye `sub` (id de usuario), `email` y `role`, con expiración configurada
por env (`JWT_EXPIRES_IN`).

#### Scenario: Login exitoso
- **WHEN** un usuario existente envía `POST /api/auth/login` con `email` y
  `password` correctos
- **THEN** el sistema responde `200` con `{ "data": { "accessToken": "...", "user": { "id", "email", "role" } } }`

#### Scenario: Credenciales inválidas
- **WHEN** el `email` no existe o el `password` no coincide con el hash
  almacenado
- **THEN** el sistema responde `401` con `{ "error": "Credenciales inválidas" }`
  sin indicar cuál de los dos campos falló

#### Scenario: Body inválido
- **WHEN** el request a `POST /api/auth/login` no incluye `email` o
  `password`, o incluye campos no esperados por el DTO
- **THEN** el sistema responde `400` con `{ "error": "..." , "details": [...] }`

#### Scenario: Rate limit del endpoint de login
- **WHEN** un mismo origen supera el límite de intentos configurado contra
  `POST /api/auth/login` en la ventana de tiempo definida
- **THEN** el sistema responde `429` y no procesa el intento adicional

### Requirement: Proteger rutas con JWT
El sistema SHALL exigir un JWT válido en el header `Authorization: Bearer
<token>` para acceder a cualquier ruta bajo `/api/**` que no esté marcada
explícitamente como pública. Un token ausente, malformado o expirado SHALL
resultar en `401`.

#### Scenario: Acceso sin token a ruta protegida
- **WHEN** se solicita una ruta protegida sin header `Authorization`
- **THEN** el sistema responde `401` con `{ "error": "No autenticado" }`

#### Scenario: Token expirado
- **WHEN** se solicita una ruta protegida con un JWT cuya fecha de
  expiración (`exp`) ya pasó
- **THEN** el sistema responde `401` con `{ "error": "Token expirado" }`

### Requirement: Autorizar por rol
El sistema SHALL permitir declarar en cada endpoint los roles habilitados
mediante el decorator `@Roles(...)`. Un usuario autenticado cuyo rol no esté
entre los habilitados para el endpoint SHALL recibir `403`; un usuario cuyo
rol sí esté habilitado SHALL poder acceder normalmente.

#### Scenario: Rol insuficiente
- **WHEN** un usuario autenticado con rol `OPERARIO` solicita un endpoint
  restringido a `ADMIN`
- **THEN** el sistema responde `403` con `{ "error": "No autorizado" }`

#### Scenario: Rol habilitado
- **WHEN** un usuario autenticado con rol `ADMIN` solicita un endpoint
  restringido a `ADMIN`
- **THEN** el sistema procesa la request normalmente

### Requirement: Cerrar sesión
El sistema SHALL exponer `POST /api/auth/logout` para un usuario autenticado,
que invalida la sesión del lado cliente (el cliente descarta el token).

#### Scenario: Logout exitoso
- **WHEN** un usuario autenticado envía `POST /api/auth/logout` con un JWT
  válido
- **THEN** el sistema responde `200` con `{ "data": { "message": "Sesión cerrada" } }`
