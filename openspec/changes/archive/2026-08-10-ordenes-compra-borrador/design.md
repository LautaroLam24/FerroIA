## Context

Ver `proposal.md` - Why/What Changes. Piezas existentes relevantes:

- `backend/src/semantic/restock.service.ts` ya calcula la sugerencia de
  reposición por código y la agrupa por proveedor
  (`{ supplierId, supplierName, items: [{ productId, code, name,
  currentStock, stockMin, suggestedQuantity }] }`), expuesta hoy en
  `POST /api/restock/suggest`. Esta orden de compra NO recalcula nada: solo
  persiste una propuesta ya calculada.
- `backend/src/chatbot/chatbot.service.ts` hoy hace un `fetch` simple (sin
  auth) de Nest hacia el servicio Python (`POST {CHATBOT_URL}/chat`),
  pasando `question`, `conversation_id`, `user_id`.
- `chatbot/chat.py` hoy es un pipe RAG plano
  (`retriever | prompt | llm | StrOutputParser`), sin function calling: este
  change introduce tool-calling por primera vez en el proyecto.
- Patrón de módulo NestJS establecido (`stock`, `semantic`): `@Controller` +
  `@Roles()` a nivel de clase o método + DTOs con `class-validator` +
  service con Prisma directo, sin lógica de negocio en el controller.
- Migraciones Prisma en este entorno (Windows sin TTY) se generan con
  `prisma migrate diff --script` y se aplican con `prisma migrate deploy`
  (ver `ESTADO.md` - Decisiones vigentes).

## Goals / Non-Goals

**Goals:**
- Persistir una propuesta de compra (manual o del asistente) como recurso
  de primera clase, con una máquina de estados mínima (`BORRADOR` es el
  único estado desde el que se puede transicionar).
- Garantizar, a nivel de endpoint y de tool, que ninguna vía de creación
  del asistente pueda saltarse la confirmación humana o tocar stock.
- Reusar el cálculo de reposición de CU10 tal cual — la orden de compra no
  reimplementa ni ajusta esos números.

**Non-Goals:**
- Diseñar un flujo de agente general (multi-tool, planning). Se agrega
  exactamente una tool nueva al asistente, con un contrato de entrada/salida
  fijo.
- Costeo, PDF, envío al proveedor o recepción de mercadería (non-goals ya
  declarados en la propuesta).
- Cambiar el cálculo de `restock.service.ts` o su endpoint existente.

## Decisions

### 1. Dos endpoints de creación, no un campo `origen` en el body
`POST /api/purchase-orders` (creación manual, humano) y
`POST /api/purchase-orders/assistant` (creación por la tool del asistente)
son dos rutas separadas con el mismo DTO de entrada y el mismo guard de
roles (`@Roles(ADMIN, OPERARIO)`), pero el `service` fija `origen` según la
ruta invocada — el cliente NUNCA puede pasar `origen` en el body
(`ValidationPipe` con `forbidNonWhitelisted` ya lo rechaza si se intenta).

**Alternativa descartada**: aceptar `origen` como campo del body. Se
descarta porque dejaría que cualquier caller manual se etiquete a sí mismo
como `ASISTENTE` (o viceversa), y porque la trazabilidad de "esto lo generó
el LLM" es justamente lo que el equipo docente pidió poder auditar (obs. 3).
Con dos rutas, el origen es un hecho de infraestructura, no un dato
confiable en el input.

Ninguna de las dos rutas admite `estado` en el body: `estado` siempre nace
en `BORRADOR` en el `service`, sin importar la ruta. Confirmar/cancelar
viven exclusivamente en los `PATCH` con `@Roles(ADMIN)`, que la tool del
asistente ni siquiera conoce (no están expuestos como tools).

### 2. La tool del asistente se autentica reusando el JWT del usuario humano
`ChatbotService.ask()` (Nest) ya recibe el JWT de la request original en el
`JwtAuthGuard`. Este change lo reenvía a `POST {CHATBOT_URL}/chat` (nuevo
campo, p. ej. `auth_token`) para que, si el LLM decide invocar la tool
`crear_borrador_orden`, el código Python que ejecuta la tool llame a
`POST {NEST_API_URL}/api/purchase-orders/assistant` con
`Authorization: Bearer <ese mismo JWT>`.

**Por qué**: la tool queda sujeta exactamente al mismo `JwtAuthGuard` +
`RolesGuard` que cualquier otro endpoint — no hay usuario "de servicio" con
privilegios propios, ni bypass de roles. Si el usuario de la conversación no
tiene sesión válida o su rol no alcanza, la tool falla igual que fallaría un
`POST` manual con esas credenciales. Esto es lo que sostiene la regla de oro
a nivel de autorización, no solo a nivel de qué endpoints existen.

**Alternativa descartada**: una API key de servicio fija para
Python -> Nest, con `createdBy` pasado explícitamente en el body. Se
descarta porque introduce una identidad con privilegios propios fuera del
modelo JWT/roles existente, y porque nada impediría (a nivel de guard) que
esa key eventualmente se reutilice para otras rutas — más superficie para
que una futura tool "se cuele" en un endpoint sensible.

**Riesgo aceptado**: el JWT del usuario viaja por la red interna
Nest -> Python -> Nest. Se acota igual que `CHATBOT_URL` ya lo hace hoy
(red interna, no expuesta): no se introduce un canal nuevo, se extiende el
mismo.

### 3. Tool-calling en `chat.py` con `bind_tools`, sin reescribir la chain a un agente
Se agrega una tool (`crear_borrador_orden`, definida con el schema que
espera el DTO del backend) vía el mecanismo de tool-calling nativo de
`langchain_groq`/`langchain_ollama` (`llm.bind_tools([...])`). El flujo:
1. Si la pregunta del usuario puede implicar una acción sobre reposición
   (p. ej. "hacé un pedido para reponer X"), el LLM recibe el resultado ya
   calculado de `POST /api/restock/suggest` como contexto/tool-result
   disponible (no lo recalcula) y decide si invoca `crear_borrador_orden`.
2. Si el LLM emite un `tool_call`, el código Python ejecuta la llamada HTTP
   autenticada (decisión 2) y devuelve el resultado (id del borrador o
   error) al LLM como tool result.
3. El LLM redacta la respuesta final en lenguaje natural a partir de ese
   resultado — nunca inventa un id ni afirma una confirmación que no
   ocurrió.

**Por qué no un `AgentExecutor` completo**: hay una sola tool con un
contrato de entrada fijo y no hace falta planning multi-paso; un
`AgentExecutor` agrega superficie (reintentos, loops) sin necesidad real y
complica auditar que la tool no pueda invocarse dos veces con efectos no
previstos. `bind_tools` + un loop manual de un solo tool-call es suficiente
y más fácil de auditar línea por línea contra la regla de oro.

### 4. Nomenclatura en español para el modelo y sus DTOs
`OrdenCompra`/`OrdenCompraItem`, enums `OrdenCompraEstado`
(`BORRADOR`/`CONFIRMADA`/`CANCELADA`) y `OrdenCompraOrigen`
(`MANUAL`/`ASISTENTE`), y campos de DTO como `proveedorId`,
`productoId`, `cantidadSugerida`. El resto del código (`Product`,
`Supplier`, `StockMovement`, DTOs de `stock`) usa nombres en inglés; esta
excepción sigue el mismo criterio ya usado en `StockMovementType`
(`ENTRADA`/`VENTA`): el vocabulario de negocio explícito del enunciado
docente (`OrdenCompra`, `BORRADOR`, `CONFIRMADA`, `ASISTENTE`, etc.) se
preserva tal cual en vez de traducirse, porque es el vocabulario que
aparece literalmente en `.instructions.md` §10 y en los casos de uso.

### 5. Prisma: relación `OrdenCompra` 1-N `OrdenCompraItem`
`OrdenCompraItem` es una tabla propia (no un JSON embebido) para poder
validar cada `productoId` contra `Product` por FK y mantener consistencia
referencial, siguiendo el mismo patrón que `StockMovement` (tabla propia con
FK a `Product`). Borrado de una orden: no se contempla (non-goal); las
órdenes solo cambian de estado, nunca se eliminan.

## Risks / Trade-offs

- **[Riesgo]** El JWT reenviado a Python podría loguearse por error (p. ej.
  en un log de request/response del proxy FastAPI).
  **Mitigación**: no loguear el body de `/chat` en Python; mismo cuidado que
  ya deberían tener `question`/`answer` con datos de negocio.
- **[Riesgo]** Si `RESTOCK_URL`/backend no responde al llamado de la tool,
  el asistente podría quedar "colgado" esperando el tool result.
  **Mitigación**: mismo `timeout` + manejo de error que ya usa
  `ChatbotService.ask()` (patrón `AbortSignal.timeout` /
  `BadGatewayException`); si la tool falla, el LLM informa que no pudo crear
  el borrador, no reintenta indefinidamente.
- **[Trade-off]** Dos endpoints de creación (manual vs. assistant) en vez de
  uno con flag interno duplica un poco de controller/DTO. Se acepta a
  cambio de que el origen nunca dependa de un valor de input confiable.

## Migration Plan

1. Migración Prisma (`OrdenCompra`, `OrdenCompraItem` + enums) vía el flujo
   `migrate diff --script` documentado en `ESTADO.md`, aplicada con
   `migrate deploy` contra la DB de dev (`ferreteria-db`).
2. Backend: módulo `purchase-orders` nuevo, registrado en `app.module.ts`;
   no toca módulos existentes salvo `chatbot.service.ts` (agrega el
   `auth_token` al payload de `/chat`) y `chatbot.controller.ts` si hace
   falta pasar el JWT crudo en vez de solo `userId`.
3. Chatbot Python: nueva tool en `chat.py`, nuevo cliente HTTP hacia Nest,
   `api.py` pasa el `auth_token` recibido hacia la construcción/invocación
   de la chain.
4. Frontend: nueva página + cliente API, sin tocar páginas existentes.
5. Sin rollback especial: es una capability nueva aditiva (no modifica
   comportamiento de `busqueda-semantica` ni `movimientos-stock`); revertir
   es revertir el change completo.
