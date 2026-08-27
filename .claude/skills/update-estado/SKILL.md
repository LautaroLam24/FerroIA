---
name: update-estado
description: Actualiza ESTADO.md al terminar una tarea o change, comprimiendo el contexto para la próxima sesión. Ejecutar SIEMPRE antes de cerrar una sesión de trabajo.
compatibility: opencode, claude-code
---

## Objetivo

`ESTADO.md` existe para que una sesión nueva entienda el proyecto SIN releerlo entero.
No es historial: es el estado presente comprimido.

## Procedimiento

1. Leer `ESTADO.md` actual.
2. Actualizar el **Snapshot** (fase, change activo, archivados, última verificación).
3. Agregar a **Hecho** una línea por logro concreto de esta sesión
   ("CU09 venta transaccional implementada y testeada", no párrafos).
4. Reescribir **En curso / próximo paso** con la acción concreta siguiente
   (que alguien pueda ejecutar sin preguntar nada).
5. Registrar en **Decisiones vigentes** solo decisiones que condicionan trabajo
   futuro. Si una decisión ya no aplica, borrarla (no marcar "obsoleta").
6. **Comprimir**: si "Hecho" supera ~15 líneas, colapsar lo viejo en una línea
   por change archivado ("auth-jwt archivado: CU01+CU03 completos"). El detalle
   ya vive en `openspec/changes/archive/` y en el README.
7. Tope duro: ~120 líneas. Si se pasa, comprimir más. Borrar > agregar.
8. Si el MCP `engram` está disponible, registrar también ahí las decisiones nuevas.

## Qué NO va acá

- Prompts usados, iteraciones, correcciones → README.md §5 (bitácora para humanos).
- Especificaciones de comportamiento → `openspec/specs/`.
- Reglas técnicas → `.instructions.md`.
