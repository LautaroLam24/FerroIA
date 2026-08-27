---
name: write-tests
description: Escribe tests unit (services con Prisma mockeado) y e2e (supertest) siguiendo los patrones del proyecto
compatibility: opencode, claude-code
---

Reglas globales obligatorias: `/.instructions.md`.

## Unit tests de services (`backend/src/<recurso>/<recurso>.service.spec.ts`)

- Mockear `PrismaService` (jest mock por método usado). Sin DB real en unit.
- Probar: caso feliz, recurso inexistente (404/NotFoundException),
  conflictos de negocio (409: stock insuficiente, email duplicado),
  y que la baja lógica setea `deletedAt` sin borrar.
- Para `stock`: verificar que venta y entrada usan `$transaction` y que ante
  stock insuficiente NO se persiste nada.

## E2E (`backend/test/<recurso>.e2e-spec.ts`)

- `supertest` contra la app Nest completa; DB de test limpiada en `beforeEach`
  (truncate vía Prisma).
- Por endpoint de escritura: 201/200 feliz, 400 (campos faltantes, tipos inválidos,
  body vacío), 401 sin token, 403 con rol incorrecto (¡probar CU03 siempre!), 404 id inexistente.
- Nombres de tests descriptivos en español. Datos creados dentro de cada test, nunca compartidos.
- Asserts sobre el contrato: `body.data` / `body.error` según `/.instructions.md` §6.
