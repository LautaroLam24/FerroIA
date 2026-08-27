# Configuración de IA del proyecto — Onboarding

Este proyecto se desarrolla delegando la programación operativa a agentes de IA
(OpenCode + Claude Code) bajo una estructura de governance explícita y metodología
**SDD (Spec-Driven Development)** con **OpenSpec**.

> Este documento es de onboarding. Las reglas normativas viven en `/.instructions.md`.

## 1. Fuente normativa y jerarquía

- Normas obligatorias: `/.instructions.md`
- Jerarquía de autoridad IA: `/.opencode/HIERARCHY.md`
- Workflow dual OpenCode + Claude Code: `/AI_WORKFLOW.md`

## 2. Contexto global

- `AGENTS.md`: lo que la IA sabe siempre (stack, comandos, estructura, convenciones).
  OpenCode lo inyecta por sesión; Claude Code lo lee vía `CLAUDE.md` (stub).

## 3. SDD con OpenSpec

Las features son **changes** en `openspec/changes/`:
proposal (qué/por qué) → design (cómo) → specs con escenarios WHEN/THEN (contrato)
→ tasks (checklist) → implementación → archive (deltas fusionados a `openspec/specs/`).

`openspec/specs/` es la fuente de verdad funcional del sistema en todo momento.
Comandos: `/opsx-explore`, `/opsx-propose`, `/opsx-apply`, `/opsx-sync`, `/opsx-archive`
(se generan con `openspec init` para cada herramienta).

## 4. Skills (`.opencode/skills/` y `.claude/skills/`)

| Skill | Para qué | Cuándo |
|-------|----------|--------|
| update-estado | Snapshot comprimido del proyecto entre sesiones (ESTADO.md) | fin de cada tarea/sesión |
| sync-tablero | Espeja el ciclo de los changes en Trello/Jira (MCP) | cada transición de estado de un change |
| add-crud-nest | Módulo NestJS completo (module/controller/service/DTOs/tests) | nuevo recurso |
| write-tests | Tests unit (service) y e2e (endpoints) según patrones del repo | pedir tests |
| run-verify | tsc + lint + tests, corta si algo falla | después de cada cambio |
| prisma-migrate | Cambios de schema con migración segura | tocar el modelo de datos |
| security-audit | Auditoría JWT/roles/validación/CORS/secretos | pre-entrega y features sensibles |

## 5. Agentes (`.opencode/agents/` y `.claude/agents/`)

`@security` (read-only), `@test-writer` (sin bash), `@api-explorer` (read-only).

## 6. MCP servers

| Servidor | Rol en el desarrollo |
|----------|----------------------|
| postgres | La IA inspecciona schema/datos reales para queries y migraciones |
| sequential-thinking | Razonamiento paso a paso (diseño de transacciones, concurrencia) |
| engram | Memoria persistente de decisiones entre sesiones y herramientas |
| trello (externo) | Estado del tablero del TP sincronizado con los changes |

Config: `opencode.json` (OpenCode) y `.mcp.json` (Claude Code).

## 7. Chatbot integrado

`/chatbot`: RAG con LangChain + ChromaDB. `ingest.py` indexa la documentación del
dominio; `chat.py` responde con contexto recuperado + **historial de conversación**
(persistido como JSON por `conversation_id`), expuesto en modo pregunta-única para
que el backend NestJS lo consuma y el frontend lo muestre como chat.
