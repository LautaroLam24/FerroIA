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
| CU01 | Iniciar y cerrar sesión | `auth-jwt` | Claude Code | ✅ Hecho |
| CU02 | Gestionar usuarios y sus roles | `auth-jwt` (roles) + `gestion-usuarios` (ABM) | CC / OC | ✅ Hecho |
| CU03 | Gestionar productos | `gestion-productos` | Claude Code | ✅ Hecho |
| CU04 | Catálogo maestro (categorías y proveedores) | `categorias-proveedores` | OpenCode | ✅ Hecho |
| CU05 | Buscar y filtrar productos | `busqueda-filtros` | OpenCode | ✅ Hecho |
| CU06 | Registrar entrada de stock | `movimientos-stock` | Claude Code | ✅ Hecho |
| CU07 | Registrar venta (salida de stock) | `movimientos-stock` | Claude Code | ✅ Hecho |
| CU08 | Dashboard de control | `dashboard` | OpenCode | ✅ Hecho |
| CU09 | **Asistente inteligente (chatbot LangChain + RAG con memoria)** | `chatbot-rag` | Claude Code | ✅ Hecho |
| CU10 | **Búsqueda semántica y asistencia de reposición** | `busqueda-semantica` | Claude Code | ✅ Hecho |
| — | **Sincronización índice vectorial (obs. docente)** | incluida en `busqueda-semantica` (no es un change aparte: listener `product.created/updated/deleted` + `npm run reindex:semantic`) | Claude Code | ✅ Hecho |
| — | **Órdenes de compra en borrador (obs. docente, function calling)** | `ordenes-compra-borrador` | Claude Code | ✅ Hecho |

Pantallas transversales de UI (no mapean a un único CU, ver bitácora):
`design-system`, `layout-navegacion`, `pantallas-crud`, `stock-y-dashboard`,
`chat-y-semantica`, `pulido-accesibilidad`.

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

### `gestion-usuarios` — 2026-08-04
- **Prompt de propuesta:**
  > Quiero el change "gestion-usuarios" que cubre CU02 (ABM de usuarios),
  > sobre la base de auth-jwt ya archivado. Alcance: módulo `users` en
  > NestJS restringido a ADMIN — alta (email único, name, password inicial,
  > role, password hasheada con bcrypt >= 10 rounds), listado de usuarios
  > activos (nunca exponer `passwordHash`) y baja lógica (`deletedAt`, mismo
  > patrón que productos). El login debe dejar de autenticar usuarios dados
  > de baja (401 Credenciales inválidas). Frontend: pantalla de
  > administración de usuarios visible solo para ADMIN.
  > Non-goals: edición de perfil propio o cambio de contraseña,
  > recuperación de contraseña, cambio de rol de un usuario existente,
  > refresh tokens, baja física.
- **Ajustes humanos a la spec:** sin ajustes registrados.
- **Prompt de implementación y desvíos:** `/opsx:apply gestion-usuarios`
  implementó las 6 secciones de `tasks.md` (migración `User.deletedAt`,
  módulo `users`, ajuste de `auth.service.validateUser`, tests, pantalla de
  administración). Sin desvíos registrados: ni ESTADO.md ni los artefactos
  del change documentan correcciones del loop más allá de lo ya declarado en
  `tasks.md`.
- **Resultado:** archivado en
  `openspec/changes/archive/2026-08-04-gestion-usuarios/`, spec sincronizada
  en `openspec/specs/user-management/spec.md`. CU02 (ABM) completo, sobre
  los roles ya provistos por `auth-jwt`.

### `gestion-productos` — 2026-08-08
- **Prompt de propuesta:**
  > Quiero el change "gestion-productos" que cubre CU03, pieza base para
  > poder operar stock (CU06/CU07), mostrar alertas de stock bajo (CU08) e
  > indexar en el buscador semántico (CU10). Alcance: módulo `products` en
  > NestJS restringido a ADMIN — alta (`name`, `code` único, `price` >= 0,
  > `stock` inicial, `stockMin`, `categoryId`/`supplierId` existentes),
  > listado de activos con indicador derivado de stock bajo, edición y baja
  > lógica (`deletedAt`, sin borrar movimientos de stock). Requiere
  > migración Prisma que agrega `code String @unique` a `Product`. Los
  > movimientos de stock deben rechazar con `409` cualquier operación sobre
  > un producto dado de baja (contrato que especifica este change aunque el
  > endpoint lo implemente CU06/CU07). Emitir eventos de dominio
  > `product.created/updated/deleted` (sin listener todavía, groundwork
  > para CU10). Frontend: `ProductsPage` con tabla, alta/edición en
  > formulario, baja con confirmación y marca visual de stock bajo mínimo.
  > Non-goals: búsqueda avanzada/filtros (va en `busqueda-filtros`),
  > imágenes de producto, el endpoint de movimientos de stock en sí, el
  > listener de reindexado ChromaDB.
- **Ajustes humanos a la spec:** sin ajustes registrados.
- **Prompt de implementación y desvíos:** `/opsx:apply gestion-productos`
  implementó las 7 secciones de `tasks.md`. Desvío real detectado durante el
  loop: `design.md` y la tarea 1.2 de `tasks.md` asumían `npx prisma migrate
  dev --name add_product_code` en modo interactivo, pero el entorno Windows
  de esta sesión no tiene TTY y ese comando no corre interactivo — se
  resolvió generando el SQL con `prisma migrate diff --from-url
  <DATABASE_URL> --to-schema-datamodel prisma/schema.prisma --script`,
  escribiéndolo a mano en `prisma/migrations/<timestamp>_.../migration.sql`
  y aplicándolo con `prisma migrate deploy`. Este workaround quedó
  documentado en ESTADO.md como el flujo estándar de migraciones del
  proyecto y se reusó luego en `busqueda-semantica` y
  `ordenes-compra-borrador`.
- **Resultado:** archivado en
  `openspec/changes/archive/2026-08-08-gestion-productos/`, spec
  sincronizada en `openspec/specs/gestion-productos/spec.md`. CU03
  completo; eventos de dominio (`@nestjs/event-emitter`) emitidos sin
  listener, consumidos después por `busqueda-semantica`.

### `categorias-proveedores` — 2026-08-08
- **Prompt de propuesta:**
  > Quiero el change "categorias-proveedores" que cubre CU04 (catálogo
  > maestro). Alcance: CRUD de Categorías y CRUD de Proveedores, ambos
  > ADMIN — alta, listado, edición y baja, con la regla de que no se puede
  > eliminar una categoría o proveedor con productos activos asociados
  > (`409`). Frontend: pantallas de listado + alta/edición para ambos
  > recursos.
  > Non-goals: vinculación masiva de productos, importación/exportación de
  > catálogos, baja lógica (la baja es física salvo la regla de
  > integridad).
- **Ajustes humanos a la spec:** sin ajustes registrados.
- **Prompt de implementación y desvíos:** `/opsx:apply
  categorias-proveedores` implementó las 6 secciones de `tasks.md`,
  apoyándose en las skills `prisma-migrate` (migración que agrega
  `Supplier.contact`) y `add-crud-nest` (scaffolding de ambos módulos
  siguiendo el patrón de `UsersModule`). Sin desvíos registrados.
- **Resultado:** archivado en
  `openspec/changes/archive/2026-08-08-categorias-proveedores/`, specs
  sincronizadas en `openspec/specs/categorias/spec.md` y
  `openspec/specs/proveedores/spec.md`. CU04 completo.

### `busqueda-filtros` — 2026-08-08
- **Prompt de propuesta:**
  > Quiero el change "busqueda-filtros" que cubre CU05. Alcance: `GET
  > /api/products` pasa a aceptar filtros combinables (`name` contiene,
  > `code` exacto, `categoryId`, `supplierId`, `lowStock`) más paginación
  > (`page`/`pageSize`, respuesta `{ data, meta }`), y se abre a ADMIN
  > **y** OPERARIO (antes solo ADMIN). Siempre excluye productos dados de
  > baja en cualquier combinación de filtros; parámetros inválidos
  > responden `400`. Frontend: barra de búsqueda + filtros combinables con
  > paginación sobre la tabla de productos.
  > Non-goals: ordenamiento configurable, búsqueda difusa/semántica (CU10),
  > filtros por rango de precio o fechas.
- **Ajustes humanos a la spec:** sin ajustes registrados.
- **Prompt de implementación y desvíos:** `/opsx:apply busqueda-filtros`
  implementó las 6 secciones de `tasks.md` (modifica el requirement de
  listado de `gestion-productos`, no crea capability nueva). Sin desvíos
  registrados.
- **Resultado:** archivado en
  `openspec/changes/archive/2026-08-08-busqueda-filtros/`, delta MODIFIED
  sincronizado en `openspec/specs/gestion-productos/spec.md`. CU05
  completo.

### `movimientos-stock` — 2026-08-08
- **Prompt de propuesta:**
  > Quiero el change "movimientos-stock" que cubre CU06 (entrada de stock)
  > y CU07 (venta). Alcance: módulo `stock` en NestJS, accesible a ADMIN y
  > OPERARIO — `POST /api/stock/entries` (incrementa stock dentro de
  > `$transaction`), `POST /api/stock/sales` (decrementa stock validando
  > disponibilidad DENTRO de la transacción con un update condicional, para
  > que dos ventas concurrentes sobre el último stock no lo dejen negativo:
  > la que pierde la carrera recibe `409` sin persistir nada) y `GET
  > /api/stock/movements` con filtros por producto y rango de fechas. Ambos
  > endpoints de escritura rechazan con `409` movimientos sobre productos
  > dados de baja (contrato ya especificado por `gestion-productos`). Los
  > movimientos son inmutables (sin PUT/PATCH/DELETE). Sin migración de
  > schema. Frontend: formularios de entrada/venta y listado de movimientos
  > con filtros.
  > Non-goals: devoluciones, ajustes de inventario sin movimiento asociado,
  > facturación.
- **Ajustes humanos a la spec:** sin ajustes registrados.
- **Prompt de implementación y desvíos:** `/opsx:apply movimientos-stock`
  implementó las 5 secciones de `tasks.md`, incluido el test e2e de
  concurrencia (2.3: dos `POST /api/stock/sales` en paralelo sobre un
  producto con `stock: 1`, verificando exactamente un `201`/un `409`, stock
  final `0` y un único `StockMovement`). Sin desvíos registrados: el
  mecanismo de `updateMany` condicional + `$transaction` interactiva quedó
  implementado tal como lo especificó `design.md` (sin `SELECT ... FOR
  UPDATE` ni columna de versión), y no hay evidencia en ESTADO.md de una
  corrección del loop distinta a lo ya declarado ahí.
- **Resultado:** archivado en
  `openspec/changes/archive/2026-08-08-movimientos-stock/`, spec
  sincronizada en `openspec/specs/movimientos-stock/spec.md`. CU06/CU07
  completos; el patrón de concurrencia (`updateMany` condicional dentro de
  `$transaction` interactiva, bajo `READ COMMITTED`) quedó documentado en
  ESTADO.md como patrón a reusar para cualquier decremento con invariante
  de negocio.

### `dashboard` — 2026-08-08
- **Prompt de propuesta:**
  > Quiero el change "dashboard" que cubre CU08. Alcance: módulo
  > `dashboard` en NestJS, accesible a ADMIN y OPERARIO — `GET
  > /api/dashboard` devuelve en una sola respuesta alertas de stock bajo
  > mínimo (ordenadas por prioridad), valorización total del inventario
  > activo (`price * stock` sumado) y los últimos 10 movimientos de stock,
  > todo con queries agregadas sin N+1. Frontend: pantalla de dashboard
  > como home post-login para ambos roles. Sin migración de schema.
  > Non-goals: gráficos históricos, exportación, comparativas entre
  > períodos, KPIs adicionales, detalle de producto desde el dashboard.
- **Ajustes humanos a la spec:** sin ajustes registrados.
- **Prompt de implementación y desvíos:** `/opsx:apply dashboard` implementó
  las 4 secciones de `tasks.md`, con las tres queries del resumen corriendo
  en paralelo (`Promise.all`) tal como especificó `design.md` (D1/D4). Sin
  desvíos registrados.
- **Resultado:** archivado en
  `openspec/changes/archive/2026-08-08-dashboard/`, spec sincronizada en
  `openspec/specs/dashboard/spec.md`. CU08 completo.

### `chatbot-rag` — 2026-08-09
- **Prompt de propuesta:**
  > Quiero el change "chatbot-rag" que cubre CU09, parte del módulo de IA
  > obligatorio. Hoy `/chatbot` solo tiene el código de referencia de la
  > demo de clase pegado en el README. Alcance: copiar
  > `ingest.py`/`chat.py`/`requirements.txt` a archivos reales, adaptar
  > `ingest.py` para indexar `chatbot/docs-negocio.md` (políticas de stock,
  > roles, glosario, uso del sistema) en ChromaDB, envolver `chat.py` en un
  > servicio FastAPI (`POST /chat`) reutilizando la persistencia JSON de
  > conversaciones por `conversation_id` y el prompt con `{history}` ya
  > existentes. Nuevo módulo NestJS `chatbot`: `POST /api/chatbot`
  > autenticado (ADMIN/OPERARIO) que hace proxy al servicio Python, asocia
  > el `conversation_id` al usuario autenticado y traduce fallas a `502`.
  > Nuevo widget de chat persistente en el frontend para ambos roles, con
  > el `conversation_id` vivo mientras dura la sesión.
  > Non-goals: streaming de tokens, RAG sobre datos vivos de la base,
  > sincronización de ChromaDB ante ABM de productos y function calling
  > para órdenes de compra (eso queda para CU10/`ordenes-compra-borrador`).
- **Ajustes humanos a la spec:** sin ajustes registrados.
- **Prompt de implementación y desvíos:** `/opsx:apply chatbot-rag`
  implementó las 4 secciones de `tasks.md` (servicio Python, proxy NestJS,
  widget de chat, documentación). `design.md` ya dejó resuelto su único
  "Open Question" (puerto `8001` de `uvicorn`, para matchear `CHATBOT_URL`
  de `.env.example`) antes de implementar. Sin desvíos registrados del loop
  original de `/opsx:apply`.
  **Corrección posterior (no forma parte del loop original):** en la sesión
  de correcciones pre-entrega del 2026-08-26 se detectó y corrigió (a)
  mojibake de consola Windows (`cp1252`) en el modo CLI de `chat.py`,
  resuelto con `sys.stdout.reconfigure(encoding="utf-8")`; (b) el modelo
  Groq default de `get_llm()` (`llama3-70b-8192`) había sido dado de baja —
  el reemplazo "oficial" (`llama-3.3-70b-versatile`) resultó estar en tier
  Enterprise de Groq (sin acceso con key gratuita, confirmado contra la API
  real), así que el default final quedó en `openai/gpt-oss-120b` (decisión
  del usuario, ver ESTADO.md - Deuda).
- **Resultado:** archivado en
  `openspec/changes/archive/2026-08-09-chatbot-rag/`, spec sincronizada en
  `openspec/specs/chatbot/spec.md`. CU09 completo; base reutilizada después
  por `busqueda-semantica` (mismo proceso Python/embeddings) y por
  `ordenes-compra-borrador` (primer tool-calling del proyecto).

### `busqueda-semantica` — 2026-08-09
- **Prompt de propuesta:**
  > Quiero el change "busqueda-semantica" que cubre CU10, parte del módulo
  > de IA obligatorio. El catálogo solo se puede buscar por coincidencia
  > literal (CU05), lo que falla cuando el operario describe lo que busca
  > con palabras que no aparecen en el nombre del producto. Tampoco hay
  > ayuda para decidir qué reponer. `gestion-productos` ya emite
  > `product.created/updated/deleted` sin listener, a la espera de este
  > change. Alcance: servicio Python de indexación semántica reutilizando
  > el proceso de `/chatbot` (FastAPI + ChromaDB, `sentence-transformers`),
  > listener NestJS sobre los eventos de producto que indexa/reindexa/
  > borra, comando de reindexado completo, `GET
  > /api/products/semantic?q=...` (ADMIN/OPERARIO) que devuelve productos
  > del sistema (no texto generado por el LLM) y `POST
  > /api/restock/suggest` (ADMIN/OPERARIO) que calcula en NestJS/Prisma
  > —por código, desde el histórico de `StockMovement`— los productos bajo
  > `stockMin` y la cantidad sugerida agrupados por proveedor, donde el LLM
  > solo redacta el resumen en lenguaje natural sobre el cálculo ya hecho
  > (nunca modifica stock ni crea movimientos). Frontend: buscador
  > semántico en `ProductsPage` y panel de sugerencia de reposición.
  > Non-goals (explícitos): compra automática, generación de órdenes de
  > compra formales, precios de proveedor — eso queda para un
  > `purchase-orders` aparte.
- **Ajustes humanos a la spec:** sin ajustes registrados.
- **Prompt de implementación y desvíos:** `/opsx:apply busqueda-semantica`
  implementó las 9 secciones de `tasks.md` (migración `Product.description`,
  router Python de indexación/búsqueda, listener NestJS no bloqueante,
  endpoints de búsqueda y reposición, frontend, tests). Desvío registrado
  en el propio `tasks.md` (tarea 8.4): el caso e2e "sin productos bajo
  mínimo" de `POST /api/restock/suggest` se movió a nivel unit (8.2) en
  lugar de e2e, porque el endpoint no filtra por datos propios del test y
  la DB de dev es compartida entre suites — asumir una respuesta global
  vacía en e2e habría caído en la misma trampa de assertions no acotadas
  que ya documenta ESTADO.md para otras suites (ver Decisiones —
  `maxWorkers: 1`). Reusó, ya como flujo conocido, el workaround de
  migración `prisma migrate diff --script` + `migrate deploy` establecido
  durante `gestion-productos`.
- **Resultado:** la tarea `9.1` de `tasks.md` deja los números exactos —
  backend: tsc OK, lint OK, unit 96 OK, e2e 135 OK; frontend: tsc OK, lint
  OK, test 12 OK. Archivado en
  `openspec/changes/archive/2026-08-09-busqueda-semantica/`, spec
  sincronizada en `openspec/specs/busqueda-semantica/spec.md` (con el
  delta MODIFIED sobre `gestion-productos` por el campo `description`).
  CU10 (parte de búsqueda y reposición) completo.

### `design-system` — 2026-08-10
- **Prompt de propuesta:**
  > Quiero el change "design-system": fundación de UI reusable antes de
  > seguir construyendo pantallas — hoy es blanco y negro, sin paleta ni
  > tipografía, layout sin centrar, y cada pantalla resuelve sus propios
  > estilos ad-hoc. Alcance: tokens de diseño (paleta, tipografía,
  > espaciado, radios, sombras) coherentes con el rubro
  > ferretería/pinturería y justificados en `design.md` antes de aplicarse,
  > un `AppShell` (sidebar colapsable, header con usuario+logout, contenedor
  > centrado, responsive) y una librería de componentes base tipados y
  > accesibles (`Button`, `Input`, `Select`, `FormField`, `Card`, `Table`,
  > `Badge`, `Modal`, `Toast`, `Spinner`/skeleton), más una pantalla
  > showcase para revisión visual. No modifica ninguna pantalla de feature
  > existente más allá de envolverla en el `AppShell`; no toca `src/api` ni
  > backend.
  > Non-goals: rediseñar el contenido interno de pantallas existentes,
  > animaciones complejas, modo oscuro, introducir router.
- **Ajustes humanos a la spec:** sin ajustes registrados.
- **Prompt de implementación y desvíos:** `/opsx:apply design-system`
  implementó las 7 secciones de `tasks.md` (Tailwind v4 + tokens vía
  `@theme`, componentes base, `AppShell`, showcase, integración en
  `App.tsx`). Sin desvíos registrados.
- **Resultado:** archivado en
  `openspec/changes/archive/2026-08-10-design-system/`, spec sincronizada
  en `openspec/specs/design-system/spec.md`. No cubre un CU puntual: es la
  fundación transversal de UI que reusan `layout-navegacion`,
  `pantallas-crud`, `stock-y-dashboard`, `chat-y-semantica` y
  `pulido-accesibilidad`.

### `layout-navegacion` — 2026-08-10
- **Prompt de propuesta:**
  > Quiero el change "layout-navegacion": formalizar la navegación por
  > estado sobre el `AppShell` ya provisto por `design-system`. Alcance:
  > fuente única de verdad de ítems de navegación (Dashboard, Productos,
  > Categorías, Proveedores, Usuarios, Stock, Reposición, Órdenes de
  > compra) con orden fijo y metadato de rol, función pura
  > `visibleNavItems(role)`, resaltado de la ruta activa, ocultamiento de
  > ítems solo-ADMIN para OPERARIO, header con usuario/rol + logout y "UI
  > showcase" fuera del menú de la app (queda como vista de desarrollo).
  > Sin introducir react-router; reusa el estado de sesión existente sin
  > modificarlo.
  > Non-goals: rediseñar pantallas de feature, introducir rutas URL,
  > cambiar reglas de acceso de negocio del backend, modificar la lógica
  > de sesión.
- **Ajustes humanos a la spec:** sin ajustes registrados.
- **Prompt de implementación y desvíos:** `/opsx:apply layout-navegacion`
  implementó las 4 secciones de `tasks.md` (`navigation.ts`,
  `visibleNavItems(role)` puro, wiring en `App.tsx`, tests). Sin desvíos
  registrados.
- **Resultado:** archivado en
  `openspec/changes/archive/2026-08-10-layout-navegacion/`, spec
  sincronizada en `openspec/specs/navegacion-app/spec.md`. Cubre CU01-CU10
  en su faceta de navegación entre pantallas ya implementadas, sin cambiar
  lógica de ningún CU.

### `ordenes-compra-borrador` — 2026-08-10
- **Prompt de propuesta:**
  > Quiero el change "ordenes-compra-borrador" (obs. docente §10, obs. 3):
  > function calling acotado para que el asistente pueda generar borradores
  > de orden de compra, sin violar la regla de oro (el LLM nunca decide
  > reposición ni modifica stock). Alcance: modelo Prisma `OrdenCompra` +
  > `OrdenCompraItem` (proveedor, items, estado
  > BORRADOR/CONFIRMADA/CANCELADA, origen MANUAL/ASISTENTE); módulo NestJS
  > `purchase-orders` con `POST /api/purchase-orders` (manual) y `PATCH
  > /:id/confirmar`/`/:id/cancelar` exclusivos de ADMIN, que solo cambian
  > estado y nunca ingresan stock; una tool `crear_borrador_orden` para el
  > asistente que recibe el resultado ya calculado de `POST
  > /api/restock/suggest` y crea la orden en BORRADOR con origen ASISTENTE
  > vía una llamada autenticada al backend, reusando el JWT del usuario de
  > la conversación (no una identidad de servicio). La tool solo puede
  > invocar la creación de BORRADOR, nunca confirmar/cancelar/tocar stock.
  > Frontend: pantalla de órdenes de compra con badge de estado, indicador
  > de origen ASISTENTE y botones Confirmar/Cancelar solo para ADMIN.
  > Non-goals: envío real al proveedor, PDF, precios/costos de compra,
  > recepción de mercadería.
- **Ajustes humanos a la spec:** sin ajustes registrados.
- **Prompt de implementación y desvíos:** `/opsx:apply
  ordenes-compra-borrador` implementó las 8 secciones de `tasks.md`:
  migración Prisma (vía el flujo `migrate diff --script` + `migrate deploy`
  ya establecido), módulo `purchase-orders` con dos endpoints de creación
  separados (manual/asistente, `origen` nunca viene del body), reenvío del
  JWT crudo desde `ChatbotController`/`ChatbotService` hacia el servicio
  Python, primera tool de function calling del proyecto en `chat.py`
  (`llm.bind_tools`, loop de un solo tool-call), y verificación manual
  end-to-end contra servicios reales (tarea 8.3). Sin desvíos registrados
  del loop original de `/opsx:apply`.
  **Corrección posterior (no forma parte del loop original):** en la
  reverificación del 2026-08-26/27 contra `openai/gpt-oss-120b` (el modelo
  Groq que terminó siendo el default tras la deuda de `chatbot-rag`), la
  tool `crear_borrador_orden` se disparó correctamente y creó el borrador,
  pero el segundo `llm.invoke()` de `responder()` en `chat.py` (el que
  redacta la respuesta final tras el `ToolMessage`) no tenía las tools
  bindeadas; `gpt-oss-120b` igual intentaba invocar la tool de nuevo porque
  el prompt la sigue mencionando en texto, y Groq rechazaba con `400`
  ("Tool choice is none, but model called a tool"). Fix: bindear la tool
  también en esa segunda llamada, sin re-ejecutarla si vuelve a aparecer un
  `tool_call`. Reverificado end-to-end: borrador creado (`8e7f2101-...`),
  respuesta correcta, y el asistente rechazó explícitamente confirmar la
  compra o ingresar stock cuando se le pidió (exclusivo de ADMIN).
  `pytest test_purchase_orders_tool.py` 12/12 OK tras el fix.
- **Resultado:** archivado en
  `openspec/changes/archive/2026-08-10-ordenes-compra-borrador/`, spec
  sincronizada en `openspec/specs/purchase-orders/spec.md`. Cierra la
  observación docente 3 y CU10 (parte de function calling).

### `pantallas-crud` — 2026-08-10
- **Prompt de propuesta:**
  > Quiero el change "pantallas-crud": rediseñar las pantallas de
  > Productos (CU03), Categorías/Proveedores (CU04) y Usuarios (CU02) sobre
  > el design-system — hoy usan HTML crudo, `window.confirm` para bajas y
  > sin estados de carga/vacío explícitos. Alcance: listados con `Table`
  > (carga+vacío), alta/edición en `Modal` con `FormField` mostrando la
  > validación del backend por campo, `window.confirm` reemplazado por un
  > `Modal` de confirmación, `Badge` para rol de usuario y stock bajo
  > mínimo de productos. Conserva intactos filtros/búsqueda (incluida la
  > semántica) y paginación; no cambia contratos de API ni `src/api`.
- **Ajustes humanos a la spec:** sin ajustes registrados.
- **Prompt de implementación y desvíos:** `/opsx:apply pantallas-crud`
  implementó las 6 secciones de `tasks.md` (helpers
  `mapValidationErrors`/`fieldError`, `ConfirmDialog` compartido, y las 4
  pantallas reconstruidas). Sin desvíos registrados.
- **Resultado:** archivado en
  `openspec/changes/archive/2026-08-10-pantallas-crud/`, spec sincronizada
  en `openspec/specs/pantallas-crud/spec.md`. Cubre CU02-CU04 en su faceta
  de presentación.

### `stock-y-dashboard` — 2026-08-10
- **Prompt de propuesta:**
  > Quiero el change "stock-y-dashboard": reconstruir Stock (CU06/CU07) y
  > Dashboard (CU08) sobre el design-system — hoy usan clases ad-hoc
  > heredadas de usuarios, el `409` "Stock insuficiente" aparece como
  > mensaje global y el Dashboard no tiene skeleton ni destaca alertas.
  > Alcance: formularios de entrada/venta con `Card`/`FormField`/`Button`,
  > el `409` mostrado como error del campo cantidad, listado de movimientos
  > con `Table`, Dashboard con cards de métricas, skeleton de carga y
  > alertas destacadas con `Badge`. No cambia lógica de negocio, hooks de
  > datos, `src/api` ni backend.
- **Ajustes humanos a la spec:** sin ajustes registrados.
- **Prompt de implementación y desvíos:** `/opsx:apply stock-y-dashboard`
  implementó las 5 secciones de `tasks.md`. Sin desvíos registrados.
- **Resultado:** archivado en
  `openspec/changes/archive/2026-08-10-stock-y-dashboard/`, specs
  sincronizadas en `openspec/specs/pantalla-stock/spec.md` y
  `openspec/specs/pantalla-dashboard/spec.md`. Cubre CU06-CU08 en su
  faceta de presentación.

### `chat-y-semantica` — 2026-08-11
- **Prompt de propuesta:**
  > Quiero el change "chat-y-semantica": el `ChatWidget` (CU09) y las
  > pantallas de CU10 (`SemanticSearch` dentro de Productos y
  > `RestockPage`) quedaron con markup plano, sin distinguir burbujas de
  > usuario/asistente, sin estado de "escribiendo…" real y con el `502`
  > mostrado como alert genérico; `RestockPage` no tiene forma de pasar de
  > "hay que reponerle a este proveedor" a pedirle al asistente el
  > borrador (la tool `crear_borrador_orden` ya existe). Alcance:
  > reconstruir los tres componentes sobre el design-system (burbujas
  > diferenciadas, `Spinner` de "escribiendo…", aviso de `502` amable y
  > persistente, auto-scroll; buscador semántico con `FormField`/estado de
  > carga; panel de reposición con `Card`/`Table` y un botón "Pedir
  > borrador al asistente" por proveedor que abre el chat con un mensaje
  > pre-armado) y un contexto React local (`ChatLauncherContext`) para
  > coordinar chat↔reposición, sin tocar `src/api` ni el pipeline del
  > chatbot.
  > Non-goals: streaming, cambios en la lógica de IA/reposición/function
  > calling, nueva pantalla de órdenes de compra manual.
- **Ajustes humanos a la spec:** sin ajustes registrados.
- **Prompt de implementación y desvíos:** `/opsx:apply chat-y-semantica`
  implementó las 5 secciones de `tasks.md` (`ChatLauncherContext`,
  `ChatWidget`, `SemanticSearch`, `RestockPage`, verificación manual en
  navegador + tests). Sin desvíos registrados en los artefactos del change.
- **Resultado:** archivado en
  `openspec/changes/archive/2026-08-11-chat-y-semantica/`, specs nuevas
  `openspec/specs/pantalla-chat/spec.md` y
  `openspec/specs/pantalla-restock/spec.md`. Cubre CU09/CU10 en su faceta
  de presentación y el puente hacia `ordenes-compra-borrador`.
  **Nota de auditoría de esta bitácora:** este change no figuraba en la
  lista de "Changes archivados" de `ESTADO.md` (que salta directo de
  `stock-y-dashboard` a `design-system`/`layout-navegacion`/
  `pantallas-crud` sin mencionarlo), pese a estar archivado con sus 4
  artefactos completos y a que el propio `pulido-accesibilidad` (mismo
  día) da por hecho que `ChatWidget`/`RestockPage` "resultaron ya estar
  migradas al design-system". Se documenta acá a partir de los artefactos
  reales de `openspec/changes/archive/2026-08-11-chat-y-semantica/`;
  pendiente sumarlo a la próxima corrida de `update-estado` para que la
  snapshot quede completa.

### `pulido-accesibilidad` — 2026-08-11
- **Prompt de propuesta:**
  > Quiero el change "pulido-accesibilidad": una pasada final de calidad
  > visual y accesibilidad sobre toda la app antes de la entrega, sin tocar
  > lógica de negocio — las pantallas se construyeron incrementalmente
  > (`design-system`, `layout-navegacion`, `pantallas-crud`,
  > `stock-y-dashboard` y las pantallas de IA) y nunca hubo una auditoría
  > de conjunto. Alcance: estados de carga/vacío/error consistentes en cada
  > pantalla, navegación por teclado completa y foco visible en todo
  > control interactivo, contraste AA (4.5:1 / 3:1) medido en los estados
  > reales (no solo en el showcase), responsive verificado por pantalla
  > (<768px) y toasts de éxito/error uniformes tras cada acción de
  > crear/editar/borrar.
  > Restricción: reusar exclusivamente componentes del design-system ya
  > existente, no tocar lógica de negocio.
- **Ajustes humanos a la spec:** sin ajustes registrados.
- **Prompt de implementación y desvíos:** `/opsx:apply
  pulido-accesibilidad` implementó las 6 secciones de `tasks.md`. La
  auditoría en sí (no un error de `tsc`/`lint`) encontró varios desvíos
  frente a lo asumido en `ESTADO.md` antes de este change:
  - `Login.tsx` (CU01) y `PurchaseOrdersPage.tsx` nunca habían sido
    migradas al design-system (HTML/CSS legado de `App.css`, sin foco
    visible ni estados de carga/vacío) — quedaron reescritas con
    `Card`/`FormField`/`Table`/`Badge`/`Button`, preservando los handlers
    exactos; se agregó Toast de éxito/error a Confirmar/Cancelar de
    órdenes, que antes no notificaba.
  - `ChatWidget` había perdido el `max-width`/`max-height` de viewport que
    tenía la CSS legada al migrarse a Tailwind (`w-80`/`h-128` fijos,
    podía quedar cortado en pantallas muy chicas) — corregido con
    `max-w-[calc(100vw-2rem)]`/`max-h-[calc(100vh-2rem)]`.
  - `StockPage` tenía una `className="stock-page"` huérfana (sin CSS
    detrás) que dejaba sus 3 bloques pegados sin espaciado — reemplazada
    por `flex flex-col gap-6`.
  - La nota previa de "`ChatWidget`/`RestockPage` pendientes de OpenCode"
    resultó desactualizada: ya estaban migradas (por `chat-y-semantica`,
    el día anterior).
  - Contraste AA calculado a mano sobre los 5 pares bg/texto de
    `tokens.css` (badges 6.78–14.49:1, botones/foco 5.18–7.3:1) sin
    agregar tooling nuevo — todos superan holgadamente AA, sin cambios de
    tokens necesarios.
- **Resultado:** spec nueva `openspec/specs/pulido-accesibilidad/spec.md`
  (5 requirements, 15 escenarios). `tsc --noEmit` sin errores, `lint` sin
  errores (3 warnings preexistentes de Fast Refresh, no bloqueantes),
  `test` 69/69 OK. Archivado en
  `openspec/changes/archive/2026-08-11-pulido-accesibilidad/`. Pendiente
  explícito (ver ESTADO.md - Deuda): recorrido manual en navegador real
  (teclado/foco/contraste/<768px) antes de la entrega — esta pasada quedó
  verificada por lectura de código, no en browser.

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
