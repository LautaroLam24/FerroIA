# Sistema de Gestión de Inventario — Ferretería/Pinturería (TP Integrador UNLa 2026)

> Reglas normativas obligatorias: ver `/.instructions.md`.
> Jerarquía de instrucciones IA: ver `/.opencode/HIERARCHY.md`.
> Operación OpenCode + Claude Code: ver `/AI_WORKFLOW.md`.
> Metodología SDD: los changes viven en `/openspec/` (ver `AI_README.md`).

## Protocolo de sesión

Leé `/ESTADO.md` al inicio (snapshot del proyecto, evita releer todo) y actualizalo
con la skill `update-estado` al cerrar cada tarea.

## Qué es este sistema

Gestión de inventario para un comercio de ferretería/pinturería: catálogo de
productos por categorías y proveedores, control de stock por movimientos
(entradas y ventas), alertas de stock mínimo, dashboard de métricas y un
chatbot RAG integrado. Autenticación JWT con roles ADMIN / OPERARIO.
Los 10 casos de uso (CU01–CU10) están definidos en el PDF de definición del TP
(reformulado: CU09 asistente conversacional y CU10 búsqueda semántica +
reposición son el módulo de IA obligatorio) y mapeados a changes de OpenSpec.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | NestJS + TypeScript, `/backend` |
| DB | PostgreSQL + Prisma |
| Frontend | React + Vite + TypeScript, `/frontend` |
| Auth | JWT + roles (ADMIN / OPERARIO) |
| IA | Python + LangChain + ChromaDB + sentence-transformers; LLM: Groq/Gemini free tier (Ollama alternativo), `/chatbot` |

## Comandos

| Comando | Dónde | Acción |
|---------|-------|--------|
| `npm run start:dev` | backend | API en :3000 con hot-reload |
| `npx prisma migrate dev` | backend | Aplica migraciones |
| `npx prisma studio` | backend | Explorar la DB |
| `npm run test` / `test:e2e` | backend | Tests unit / e2e |
| `npm run dev` | frontend | Vite dev server en :5173 |
| `npx tsc --noEmit && npm run lint && npm run test` | ambos | Verificación obligatoria |
| `python chat.py --question "..."` | chatbot | Modo pregunta única (CLI) |
| `uvicorn api:app --port 8001` | chatbot | Servicio HTTP (`POST /chat`) que consume el backend NestJS vía `CHATBOT_URL` |

## Estructura

```
backend/src/
├── main.ts / app.module.ts
├── auth/        # CU01 + roles de CU02: login, JWT, guards
├── users/       # CU02: ABM usuarios (ADMIN)
├── products/    # CU03, CU05: ABM + búsqueda/filtros, baja lógica
├── categories/  # CU04
├── suppliers/   # CU04
├── stock/       # CU06, CU07: movimientos transaccionales
├── dashboard/   # CU08: alertas, valorización, movimientos recientes
├── chatbot/     # CU09: proxy al servicio RAG Python
├── semantic/    # CU10: búsqueda semántica + sugerencia de reposición
├── purchase-orders/ # órdenes de compra en BORRADOR (function calling del asistente)
├── events/      # eventos de dominio (ProductCreated/Updated/Deleted) -> reindexado Chroma
└── prisma/      # PrismaService + schema + migrations
frontend/src/
├── api/         # cliente HTTP centralizado
├── features/    # una carpeta por CU (auth, products, stock, dashboard...)
└── components/  # UI compartida
chatbot/         # ingest.py + chat.py (RAG con historial JSON por conversación)
openspec/        # specs (fuente de verdad) + changes (features en curso/archivadas)
```

## Convenciones clave (detalle normativo en `/.instructions.md`)

- Respuestas `{ data }` / `{ error }`; códigos 200/201/204/400/401/403/404/409.
- Baja lógica de productos (`deletedAt`); movimientos de stock inmutables.
- Ventas/entradas SIEMPRE en `prisma.$transaction` con validación de stock adentro.
- DTOs + class-validator en toda escritura; Guards + `@Roles()` en autorización.
- Nada se implementa sin su change de OpenSpec aprobado.

## Custom agents (`.opencode/agents/` y `.claude/agents/`)

| `@` | Función | Permisos |
|-----|---------|----------|
| `@security` | Audita JWT, roles, validación, CORS, secretos | solo lectura |
| `@test-writer` | Genera tests unit/e2e siguiendo patrones del repo | sin bash |
| `@api-explorer` | Documenta endpoints con ejemplos curl | solo lectura |

## MCP servers (`opencode.json` / `.mcp.json`)

| Servidor | Uso |
|----------|-----|
| `postgres` | Inspeccionar schema y datos reales al diseñar queries/migraciones |
| `sequential-thinking` | Desglosar problemas de diseño (transacciones, concurrencia) |
| `engram` | Memoria persistente de decisiones entre sesiones |
| `trello` (externo) | Tablero del TP: mover tarjetas al completar changes |

Nota: este archivo es de contexto. Para reglas vinculantes, usar `/.instructions.md`.
