# Jerarquía de instrucciones IA

Este proyecto usa OpenCode y Claude Code. Para evitar conflictos, esta es la jerarquía oficial.

## Orden de autoridad

1. `/.instructions.md` (normativo)
2. `/AGENTS.md` y `/CLAUDE.md` (contexto del proyecto; CLAUDE.md es stub de AGENTS.md)
3. `/openspec/specs/**` (specs principales: QUÉ hace el sistema, fuente de verdad funcional)
4. `/.opencode/skills/**` y `/.claude/skills/**` (procedimientos por tarea)
5. `/.opencode/agents/*` y `/.claude/agents/*` (especialización por subagente)
6. `/ESTADO.md` (snapshot del estado del proyecto; se lee primero en cada sesión,
   pero no define reglas: si contradice a un nivel superior, está desactualizado y se corrige)
7. `/AI_README.md` y `/AI_WORKFLOW.md` (onboarding y proceso; para humanos)

## Regla de resolución de conflictos

- Si dos documentos se contradicen, gana el nivel superior.
- Las specs de OpenSpec definen comportamiento funcional; `.instructions.md` define
  cómo se implementa. Si una spec pidiera algo que viola una norma técnica, se
  corrige la spec antes de implementar.
- Skills y agentes referencian reglas globales en vez de duplicarlas.

## Aplicación práctica

- OpenCode: `opencode.json` + `.opencode/{skills,agents,commands}`.
- Claude Code: `CLAUDE.md` + `.claude/{skills,agents}` + `.mcp.json`.
- Ambos comparten `.instructions.md`, `AGENTS.md` y `openspec/`; NO comparten
  memoria de sesión. La consistencia se logra por estos documentos y por Engram (MCP).
