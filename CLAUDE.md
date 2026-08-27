# CLAUDE.md

Contexto completo del proyecto: leé **`/AGENTS.md`**.
Reglas normativas obligatorias (prevalecen ante cualquier conflicto): **`/.instructions.md`**.
Jerarquía de documentos IA: `/.opencode/HIERARCHY.md`.

## Protocolo de sesión (economía de contexto)

1. **Primero leé `/ESTADO.md`**: es el snapshot del proyecto. No explores el repo
   entero si ESTADO.md + el archivo a tocar alcanzan.
2. Al terminar cada tarea significativa (y siempre antes de cerrar la sesión),
   ejecutá la skill `update-estado`.

## Notas específicas para Claude Code

- Skills en `.claude/skills/` (espejo de `.opencode/skills/`). Usalas cuando la
  tarea encaje con su descripción.
- Subagentes en `.claude/agents/`: `security`, `test-writer`, `api-explorer`.
- MCP en `.mcp.json` (postgres, sequential-thinking, engram, trello).
- Workflow SDD: las features se trabajan como changes de OpenSpec
  (`/opsx-propose` → revisión humana → `/opsx-apply` → verificación → `/opsx-archive`).
  No implementes features sin change aprobado.
- Antes de dar por terminada cualquier tarea: `npx tsc --noEmit && npm run lint && npm run test`.
