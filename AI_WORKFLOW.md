# Workflow dual: OpenCode + Claude Code

Playbook operativo para el humano. La IA no consume este archivo como reglas.

## 1) Matriz de decisión

- Usá **Claude Code** cuando:
  - Vas a ejecutar un change completo de OpenSpec (`/opsx-apply`): implementación
    agéntica multi-archivo con verificación.
  - Necesitás refactors grandes o trabajo que toca backend + frontend a la vez.
  - Querés que use skills + subagentes + MCP en un mismo flujo largo.
- Usá **OpenCode** cuando:
  - Estás en fase de exploración/propuesta (`/opsx-explore`, `/opsx-propose`).
  - Querés iterar rápido sobre un archivo o una función puntual.
  - Preferís su TUI para revisar diffs chicos.
- Cualquiera de los dos sirve para ambos; esta matriz es preferencia, no regla.

### Ruteo por change (economía de tokens: OpenCode = sencillo, Claude Code = complejo)

| Claude Code                                                                       | OpenCode                                                                 |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Fase 0 bootstrap · auth-jwt · gestion-productos · movimientos-stock · chatbot-rag | gestion-usuarios · categorias-proveedores · busqueda-filtros · dashboard |

Regla de escape: 2-3 intentos fallidos de run-verify sobre lo mismo en OpenCode → handoff a Claude Code (plantilla §2). auth-jwt va temprano en Claude Code porque fija los patrones que OpenCode replica barato después.

## 2) Protocolo de handoff entre herramientas

Al cambiar de herramienta: la nueva sesión arranca leyendo `ESTADO.md`; además pasá este contexto mínimo:

```text
Objetivo: <resultado esperado>
Change OpenSpec: <nombre> (estado: proposal aprobada / tasks 3-7 pendientes)
Archivos: <qué puede tocar y qué no>
Restricciones: seguir /.instructions.md
Verificación: npx tsc --noEmit && npm run lint && npm run test
```

## 3) Rutina por feature (SDD)

1. **Proponer**: `/opsx-propose` con el prompt de la feature.
2. **Revisar como humano**: leer proposal.md, design.md, specs y tasks. Ajustar
   escenarios ANTES de implementar. Este paso no se delega.
3. **Implementar**: `/opsx-apply <change>`. Cambios chicos y verificables.
4. **Verificar**: skill `run-verify` + probar a mano los escenarios WHEN/THEN.
5. **Auditar** (features sensibles: auth, stock): `@security`.
6. **Archivar**: `/opsx-archive <change>` → specs principales actualizadas.
7. **Tablero**: skill `sync-tablero` → la tarjeta del change refleja la transición.
8. **Estado**: skill `update-estado` → ESTADO.md queda listo para la próxima sesión.
9. **Bitácora**: anotar en README los prompts clave y decisiones del change.

## 4) Checklist de PR / cierre de change

- [ ] Todos los escenarios de la spec pasan (manual o test automatizado).
- [ ] Verificación completa OK (tsc + lint + tests).
- [ ] Sin reglas normativas duplicadas fuera de `/.instructions.md`.
- [ ] Change archivado y specs sincronizadas.
- [ ] Bitácora del README actualizada (prompts, iteraciones, correcciones).

## 5) Límites conocidos

- OpenCode y Claude Code no comparten memoria nativa → documentos + Engram.
- Los skills están duplicados en `.opencode/skills/` y `.claude/skills/`:
  si editás uno, espejá el cambio (son el mismo contenido).
