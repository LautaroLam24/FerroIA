# TP Integrador — Sistema de Gestión de Inventario (Ferretería/Pinturería)

**Curso:** Software Architecture y AI Agents — UNLa 2026
**Alumno:** Lautaro Lamaita — lautarolamaita@gmail.com — GitHub: LautaroLam24

> Este README es la bitácora y justificación del proceso de AI Engineering
> (criterio 3 de la consigna). Se actualiza al cierre de cada change.

## 1. Arquitectura del sistema

_(Completar con diagrama: NestJS + Prisma + PostgreSQL / React + Vite / servicio RAG Python.)_

## 2. Instalación (base de datos)

1. Copiar `.env.example` a `backend/.env` (y ajustar `JWT_SECRET`, `GROQ_API_KEY`,
   etc. según corresponda; ver también `chatbot/.env` para las variables del
   servicio de IA).
2. Levantar Postgres con Docker Compose:

   ```bash
   docker compose up -d
   ```

   Esto levanta Postgres 16 en `localhost:5432` con las mismas credenciales de
   `DATABASE_URL` en `.env.example` (user/pass `postgres`, db `ferreteria`) y
   volumen persistente (`ferreteria_db_data`). Esperar a que el servicio quede
   `healthy`:

   ```bash
   docker compose ps
   ```

3. Aplicar las migraciones existentes y cargar el seed inicial (usuario `ADMIN`):

   ```bash
   cd backend
   npx prisma migrate deploy
   npx prisma db seed
   ```

## 3. Los 10 casos de uso

| CU | Nombre | Change OpenSpec | Herramienta | Estado |
|----|--------|-----------------|-------------|--------|
| CU01 | Iniciar y cerrar sesión | `auth-jwt` | Claude Code | ⬜ |
| CU02 | Gestionar usuarios y sus roles | `auth-jwt` + `gestion-usuarios` | CC / OC | ⬜ |
| CU03 | Gestionar productos | `gestion-productos` | Claude Code | ⬜ |
| CU04 | Catálogo maestro (categorías y proveedores) | `categorias-proveedores` | OpenCode | ⬜ |
| CU05 | Buscar y filtrar productos | `busqueda-filtros` | OpenCode | ⬜ |
| CU06 | Registrar entrada de stock | `movimientos-stock` | Claude Code | ⬜ |
| CU07 | Registrar venta (salida de stock) | `movimientos-stock` | Claude Code | ⬜ |
| CU08 | Dashboard de control | `dashboard` | OpenCode | ⬜ |
| CU09 | **Asistente inteligente (chatbot LangChain + RAG con memoria)** | `chatbot-rag` | Claude Code | ⬜ |
| CU10 | **Búsqueda semántica y asistencia de reposición** | `busqueda-semantica` | Claude Code | ⬜ |
| — | **Sincronización índice vectorial (obs. docente)** | `sync-vectorial` | Claude Code | ⬜ |
| — | **Órdenes de compra en borrador (obs. docente, function calling)** | `ordenes-compra-borrador` | Claude Code | ⬜ |

## 4. AI Engineering — estructura de governance

Jerarquía en `/.opencode/HIERARCHY.md`. Piezas: `.instructions.md` (normativo),
`AGENTS.md`/`CLAUDE.md` (contexto), skills, subagentes read-only, MCP servers,
y SDD con OpenSpec (`openspec/`). Herramientas: OpenCode + Claude Code
(matriz de uso y handoff en `AI_WORKFLOW.md`).

## 5. Bitácora por change (prompts clave, iteraciones, correcciones)

### `auth-jwt` — 2026-08-04
- **Prompt de propuesta:**
  > Quiero el change "auth-jwt" que cubre CU01 (iniciar y cerrar sesión) y la
  > parte de roles/permisos de CU02.
  > Alcance: módulo auth en NestJS con login por email+password que devuelve
  > JWT (payload: sub, email, role; expiración por env), endpoint de logout,
  > JwtAuthGuard global, RolesGuard + decorator @Roles, y seed inicial con un
  > usuario ADMIN. Passwords con bcrypt (rounds >= 10). Rate limit en
  > /api/auth/login. Frontend: pantalla de login, guardado del token,
  > interceptor que agrega el Bearer y redirección a login ante 401; ocultar
  > secciones de admin si el rol es OPERARIO.
  > Escenarios que las specs deben cubrir como mínimo: login OK (200 +
  > token), credenciales inválidas (401), body inválido (400), acceso sin
  > token a ruta protegida (401), OPERARIO accediendo a endpoint de ADMIN
  > (403), token expirado (401), logout.
  > Non-goals: ABM de usuarios (va en el change gestion-usuarios), refresh
  > tokens.
  > Restricciones: .instructions.md §4, §5, §6 y §7.
- **Ajustes humanos a la spec:** ninguno — los 4 artefactos (proposal, specs,
  design, tasks) generados por `/opsx:propose` se aprobaron tal cual antes de
  aplicar.
- **Prompt de implementación y desvíos:** `/opsx:apply auth-jwt` implementó
  las 30 tareas de `tasks.md`. El loop de verificación (`tsc` + `lint` +
  `test`/`test:e2e`) encontró y corrigió varias cosas no anticipadas en la
  spec original:
  - Faltaba un exception filter global: sin él, los errores 401/403/400 no
    cumplían el contrato `{error}`/`{error, details}` de `.instructions.md
    §6` (Nest devuelve `{statusCode, message, error}` por default). Se agregó
    `HttpExceptionFilter` (`backend/src/common/filters/`).
  - Error de tipos en `JwtModuleOptions.signOptions.expiresIn`
    (`JWT_EXPIRES_IN` es `string` pero el tipo esperado es `number |
    StringValue` de `jsonwebtoken`) — resuelto con un cast tipado en
    `auth.module.ts`.
  - Lint (`@typescript-eslint/no-unsafe-member-access`) sobre
    `response.body` en los tests e2e (tipado `any` de supertest) — se
    agregaron interfaces `LoginResponseBody`/`ErrorResponseBody` para tipar
    las respuestas.
  - El límite de rate limiting inicial (5 req/min en `/api/auth/login`)
    rompía los propios tests e2e al hacer varios logins en la misma suite —
    se subió a 10 req/min.
  - No existía todavía ningún endpoint real restringido a `ADMIN` para
    probar el `RolesGuard` con 403 — se agregó un controller de prueba
    ad-hoc (`backend/test/fixtures/admin-only.controller.ts`), registrado
    solo en el e2e, no en `AppModule`.
  - Warning de oxlint (`react/only-export-components`, rompe Fast Refresh)
    en el frontend — se separó el hook `useSession` del archivo de contexto
    (`SessionContext.tsx` → + `useSession.ts`).
  - Post-archive, ya en uso manual: el seed nunca se había ejecutado contra
    la base de datos de desarrollo (`users` vacía → login 401 real). Se
    diagnosticó con el MCP de `postgres` (tabla vacía, migraciones OK) y se
    resolvió corriendo `npx prisma db seed`.
- **Resultado:** tests verdes (6 unit + 9 e2e en backend, 3 unit en
  frontend), los 7 escenarios mínimos pedidos cubiertos, spec sincronizada en
  `openspec/specs/auth/spec.md`, archivado en
  `openspec/changes/archive/2026-08-04-auth-jwt/`.

### Auditoría de seguridad pre-entrega — 2026-08-28
- **Prompt:** `@security` (subagente `security`, solo lectura) auditó todo
  `backend/src/` + `chatbot/` con foco en JWT, roles (401 vs 403 por recurso),
  validación de entrada, CORS, rate limiting, manejo de secretos y fuga de
  `passwordHash`/stack traces. Reportó hallazgos agrupados por severidad; los
  de riesgo medio/alto se corrigieron en la misma sesión.
- **Hallazgos altos corregidos:**
  - IDOR en conversaciones del chatbot: `chatbot/api.py` no verificaba que el
    usuario autenticado fuera el dueño de la conversación antes de continuar
    un `conversation_id` ajeno. Fix: chequeo de ownership (404 sin filtrar
    existencia) + `@IsUUID('4')` en `ChatRequestDto`.
  - El microservicio Python (`chatbot/api.py`) no autenticaba ninguna ruta
    propia, confiaba solo en el perímetro de red. Fix: header compartido
    `X-Internal-Token` (`CHATBOT_INTERNAL_TOKEN`) entre Nest y Python,
    fail-closed si no está configurado.
  - `CORS_ORIGIN` sin fail-fast podía derivar en `Access-Control-Allow-Origin: *`
    silencioso si faltaba la env var. Fix: mismo patrón fail-fast que
    `JWT_SECRET`.
- **Hallazgos medios corregidos:** `JWT_EXPIRES_IN` fail-fast (tokens sin
  `exp` si faltaba), rate limiting agregado a `POST /users`, `/chatbot` y
  `/purchase-orders[/assistant]` (antes solo cubría `/auth/login`),
  `SEED_ADMIN_PASSWORD` como placeholder real en `.env.example`,
  `HttpExceptionFilter` pasado a catch-all (evita fuga de stack traces en
  errores no controlados), algoritmo `HS256` explícito en `JwtStrategy`, y
  `PATCH /api/products/:id` dejó de aceptar `stock` (pisaba el valor sin pasar
  por la transacción de `StockMovement`, podía perder una venta concurrente en
  silencio) — el modal de edición de `ProductsPage` ahora muestra el campo
  Stock deshabilitado con la aclaración de que se ajusta desde Stock.
- **Resultado:** `run-verify` verde en backend (tsc/lint/unit 118/unit
  e2e 154) y frontend (tsc/lint/test 70) tras cada fix; verificación en vivo
  del token interno (401 sin header, 200 con header correcto) y del rechazo
  de `stock` en el PATCH. Hallazgos bajos quedaron documentados sin acción
  (no bloqueantes para la entrega).

## 6. Servidores MCP utilizados

| Servidor | Tipo | Rol |
|----------|------|-----|
| postgres | local | Inspección de schema/datos para queries y migraciones |
| sequential-thinking | local | Diseño de transacciones/concurrencia |
| engram | local | Memoria persistente de decisiones |
| trello | **externo** | Tablero del TP sincronizado con changes |

## 7. Chatbot integrado

RAG con LangChain + ChromaDB y memoria de conversación (historial JSON por
`conversation_id`), expuesto como servicio consumido por el backend. Detalle en `/chatbot`.
