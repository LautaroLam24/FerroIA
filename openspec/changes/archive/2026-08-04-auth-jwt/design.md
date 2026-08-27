## Context

Ver proposal.md - Why. No existe módulo `auth` ni ningún guard global todavía;
todas las rutas bajo `/api/**` están hoy sin protección. Este design fija
cómo se implementa la protección global sin romper el patrón
controller → service → Prisma del resto de módulos (`.instructions.md §1`).

## Goals / Non-Goals

**Goals:**
- Definir cómo se aplica el guard de autenticación globalmente sin que cada
  módulo futuro tenga que recordar protegerse manualmente.
- Definir el mecanismo para marcar rutas públicas explícitas (hoy solo
  `/health` y `/api/auth/login`).
- Definir la estrategia de autorización por rol reutilizable por cualquier
  endpoint futuro.

**Non-Goals:**
- Diseño de la UI de login (se resuelve en tasks, es standard).
- Estrategia de refresh tokens (explícitamente fuera de alcance, ver
  proposal.md - Non-goals).

## Decisions

### JWT stateless con Passport (`@nestjs/passport` + `passport-jwt`)
Se usa la estrategia estándar de Nest (`PassportStrategy(Strategy)`) en vez de
verificar el token a mano en un middleware. Alternativa considerada: guard
custom que decodifica el JWT sin Passport — descartada porque Passport ya
integra el manejo de expiración/firma inválida y es el patrón que
`@nestjs/jwt` documenta, reduce código propio en un área sensible (seguridad).

### Guard global + decorator `@Public()`
`JwtAuthGuard` se registra como `APP_GUARD` global (protege todo por
default). Las rutas que deben quedar abiertas (`/health`,
`POST /api/auth/login`) se marcan con un decorator `@Public()` que setea
metadata leída por el guard vía `Reflector`. Alternativa considerada: aplicar
el guard ruta por ruta con `@UseGuards()` — descartada porque es fácil
olvidarlo al agregar un módulo nuevo (products, stock, etc. vienen después) y
la regla `.instructions.md §4` pide que la autenticación sea la norma, no la
excepción.

### RolesGuard separado del JwtAuthGuard
`RolesGuard` es un segundo guard (no global, se aplica con `@Roles(...)` +
`UseGuards(RolesGuard)` o también global leyendo metadata vacía como "sin
restricción de rol"). Se mantiene separado de `JwtAuthGuard` porque
autenticación (¿quién sos?) y autorización (¿qué podés hacer?) son
responsabilidades distintas y varios endpoints futuros necesitan la primera
sin la segunda (ambos roles pueden acceder, p. ej. búsqueda y dashboard según
`.instructions.md §4`).

### Password hashing con bcrypt (rounds=10 vía env, mínimo 10)
Estándar de la industria para password hashing en Node, ya exigido por
`.instructions.md §4`. No se evalúan alternativas (argon2, etc.) porque la
norma del proyecto ya fija bcrypt.

### Rate limiting con `@nestjs/throttler` solo en `/api/auth/login`
Se aplica un `ThrottlerGuard` scoped al controller de auth (decorator
`@Throttle()`) en vez de global, para no limitar el resto de la API con el
mismo umbral pensado para fuerza bruta de login.

### Seed de usuario ADMIN vía script de Prisma (`prisma/seed.ts`)
Reutiliza el mecanismo estándar de Prisma (`prisma db seed`) ya configurado
en el backend, en vez de un endpoint de bootstrap — evita exponer un endpoint
que crea usuarios sin autenticación en producción.

## Risks / Trade-offs

- **Guard global mal configurado bloquea todo el health check u otras rutas
  necesarias** → mitigado con el decorator `@Public()` explícito y un test
  e2e que verifica que `/health` responde sin token.
- **JWT sin revocación (stateless) implica que un logout no invalida el
  token del lado servidor** → aceptado como trade-off explícito (ver
  proposal.md - Non-goals: no hay refresh tokens ni blacklist en este
  change); el logout es responsabilidad del cliente (descartar el token).
  Documentado para que `gestion-usuarios` no asuma revocación server-side.
- **Rate limiting en memoria (default de `@nestjs/throttler`) no persiste
  entre instancias si el backend escala horizontalmente** → aceptable para
  el alcance del TP (instancia única); no se diseña storage distribuido.
