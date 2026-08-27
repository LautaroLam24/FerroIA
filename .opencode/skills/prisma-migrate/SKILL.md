---
name: prisma-migrate
description: Modifica el schema de Prisma y genera la migración de forma segura, respetando baja lógica e inmutabilidad de movimientos
compatibility: opencode, claude-code
---

Reglas globales obligatorias: `/.instructions.md` §2.

## Procedimiento

1. Si el MCP `postgres` está disponible, inspeccionar el schema actual real antes de tocar nada.
2. Editar `backend/prisma/schema.prisma`:
   - IDs `String @id @default(uuid())`.
   - Productos: `deletedAt DateTime?` (baja lógica), `stock Int`, `stockMin Int`, relaciones a `Category` y `Supplier`.
   - `StockMovement`: `type` (ENTRADA|VENTA), `quantity`, `reason`, `date`, relación a `Product` y `User`. Inmutable.
   - `User`: `role` enum `ADMIN|OPERARIO`, `passwordHash` (nunca `password` plano).
3. `npx prisma migrate dev --name <nombre-descriptivo>` (nunca `db push` en este proyecto).
4. `npx prisma generate` y verificar que el backend compila (`npx tsc --noEmit`).
5. Si la migración es destructiva (drop de columna con datos), avisar al humano ANTES de aplicar.
