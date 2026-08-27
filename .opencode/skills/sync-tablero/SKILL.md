---
name: sync-tablero
description: Sincroniza el tablero (Trello/Jira vía MCP) con el ciclo de vida de los changes de OpenSpec. Ejecutar en cada transición de estado de un change.
compatibility: opencode, claude-code
---

## Modelo del tablero

Tablero "TP Ferretería" con listas que espejan el ciclo SDD:

`Backlog` → `Spec en revisión` → `En implementación` → `Verificación` → `Hecho`

Una **tarjeta por change** (título = nombre del change, ej. `movimientos-stock`).
Descripción: CUs que cubre + link relativo a `openspec/changes/<change>/proposal.md`.

## Cuándo mover qué (mapa de transiciones)

| Evento en el repo | Acción en el tablero |
|---|---|
| `/opsx-propose` terminó de generar artefactos | Crear tarjeta en `Spec en revisión` (o moverla desde `Backlog` si ya existe) |
| El humano aprobó la spec y arranca `/opsx-apply` | Mover a `En implementación` + crear checklist en la tarjeta copiando los ítems de `tasks.md` |
| Una task de `tasks.md` se marca done (y run-verify pasó) | Tildar el ítem correspondiente del checklist |
| Todas las tasks done + verificación completa en verde | Mover a `Verificación` |
| `@security` sin hallazgos medios/altos y escenarios verificados | (queda en Verificación hasta el archive) |
| `/opsx-archive` ejecutado | Mover a `Hecho` + comentario: fecha, CUs cubiertos, resumen de 2 líneas |

## Reglas

- El agente NUNCA borra tarjetas ni listas; solo crea, mueve, tilda y comenta.
- No inventar estado: la fuente de verdad es el repo (`tasks.md`, `openspec status`).
  El tablero es un ESPEJO; si difiere del repo, se corrige el tablero.
- Si el MCP del tablero no está disponible, no bloquear el trabajo: anotar en
  `ESTADO.md` → "Deuda: sincronizar tablero (change X, evento Y)" y seguir.
- Al crear el tablero por primera vez: crear las 5 listas y una tarjeta en
  `Backlog` por cada change planificado del README (tabla de casos de uso).
- Movimientos masivos o borrado de datos: pedir confirmación al humano antes.
