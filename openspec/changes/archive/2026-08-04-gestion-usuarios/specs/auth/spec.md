## MODIFIED Requirements

### Requirement: Iniciar sesión con email y password
El sistema SHALL exponer `POST /api/auth/login` que recibe `email` y
`password`, valida las credenciales contra el usuario almacenado (hash
`bcrypt`) y, si son correctas, SHALL devolver un JWT firmado cuyo payload
incluye `sub` (id de usuario), `email` y `role`, con expiración configurada
por env (`JWT_EXPIRES_IN`). Un usuario dado de baja (`deletedAt` no nulo) SHALL
ser rechazado con `401` aunque sus credenciales sean correctas.

#### Scenario: Login exitoso
- **WHEN** un usuario existente y activo envía `POST /api/auth/login` con `email` y
  `password` correctos
- **THEN** el sistema responde `200` con `{ "data": { "accessToken": "...", "user": { "id", "email", "role" } } }`

#### Scenario: Credenciales inválidas
- **WHEN** el `email` no existe o el `password` no coincide con el hash
  almacenado
- **THEN** el sistema responde `401` con `{ "error": "Credenciales inválidas" }`
  sin indicar cuál de los dos campos falló

#### Scenario: Login de usuario dado de baja
- **WHEN** un usuario con `deletedAt` no nulo envía `POST /api/auth/login` con
  `email` y `password` correctos
- **THEN** el sistema responde `401` con `{ "error": "Credenciales inválidas" }`
  y no emite ningún JWT

#### Scenario: Body inválido
- **WHEN** el request a `POST /api/auth/login` no incluye `email` o
  `password`, o incluye campos no esperados por el DTO
- **THEN** el sistema responde `400` con `{ "error": "..." , "details": [...] }`

#### Scenario: Rate limit del endpoint de login
- **WHEN** un mismo origen supera el límite de intentos configurado contra
  `POST /api/auth/login` en la ventana de tiempo definida
- **THEN** el sistema responde `429` y no procesa el intento adicional
