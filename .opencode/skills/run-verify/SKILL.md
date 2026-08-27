---
name: run-verify
description: Verificación completa post-cambio (typecheck + lint + tests). Ejecutar antes de marcar cualquier tarea como completa
compatibility: opencode, claude-code
---

Reglas globales obligatorias: `/.instructions.md` §8.

## Secuencia (en `backend/` y, si hubo cambios de UI, en `frontend/`)

1. `npx tsc --noEmit` — sin errores de tipos
2. `npm run lint` — sin errores
3. `npm run test` — todos verdes (en backend, también `npm run test:e2e` si hay e2e del área tocada)

Si algo falla:
- Detené la ejecución. Explicá archivo y línea. Proponé corrección concreta.
- No marques la tarea (ni la task del change de OpenSpec) como completa hasta que pase todo.
- Si la corrección cambia comportamiento especificado, actualizá primero la spec del change.
