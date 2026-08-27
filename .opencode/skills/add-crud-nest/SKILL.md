---
name: add-crud-nest
description: Agrega un módulo CRUD completo en NestJS + Prisma siguiendo los patrones del proyecto (module, controller, service, DTOs, guards, tests)
compatibility: opencode, claude-code
---

Reglas globales obligatorias: `/.instructions.md`. No implementar sin change de OpenSpec aprobado.

## Paso a paso para un nuevo recurso

1. **Prisma** — Si el modelo no existe, usar la skill `prisma-migrate` primero.
2. **Módulo** — `backend/src/<recurso>/`: `<recurso>.module.ts`, `<recurso>.controller.ts`,
   `<recurso>.service.ts`, `dto/create-<recurso>.dto.ts`, `dto/update-<recurso>.dto.ts`.
3. **DTOs** — `class-validator`: campos obligatorios, tipos, rangos. Update = `PartialType(Create...)`.
4. **Controller** — rutas bajo `/api/<recursos>`: GET, GET/:id, POST, PATCH/:id, DELETE/:id.
   `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles()` según el CU correspondiente.
   Respuestas `{ data }` con códigos de `/.instructions.md` §6.
5. **Service** — lógica de negocio + Prisma. Baja lógica donde aplique (`deletedAt`),
   filtrando `deletedAt: null` en listados. 404 si no existe, 409 en conflictos de negocio.
6. **App** — registrar el módulo en `app.module.ts`.
7. **Tests** — skill `write-tests`: unit del service + e2e de casos 200/201/400/401/403/404.
8. **Verificar** — skill `run-verify`. No marcar completo si algo falla.

No dupliques reglas transversales acá; aplicar siempre `/.instructions.md`.
