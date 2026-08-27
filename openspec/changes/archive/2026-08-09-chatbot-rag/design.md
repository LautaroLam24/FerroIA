## Context

Hoy `/chatbot` solo tiene un `README.md` con el código de referencia de la demo
`rag-chat` (variante con memoria) pegado como texto — no hay `.py` reales. El
`chat.py` de referencia ya resuelve: persistencia de conversación en JSON por
`conversation_id` (UUID), prompt con `{context}` + `{history}` + `{question}`,
recorte de historial a los últimos 10 mensajes, y un modo `--question` de
pregunta única pensado para integrarse a un endpoint. `.env.example` ya
declara `CHATBOT_URL`, `LLM_PROVIDER`, `LLM_MODEL`, `GROQ_API_KEY`. El backend
NestJS no tiene hoy ningún cliente HTTP saliente (no hay `axios` ni
`@nestjs/axios` instalados); Node 24 (`@types/node ^24`) trae `fetch` global.
Ver `proposal.md` - Why/What Changes para el alcance completo.

## Goals / Non-Goals

**Goals:**
- Reusar el código de la demo (`ingest.py`, `chat.py`) tal como está, con el
  mínimo de adaptación necesaria para exponerlo como servicio HTTP.
- Mantener el módulo Python autocontenido: el backend NestJS solo lo consume
  por HTTP, nunca importa código Python ni comparte proceso.
- Cumplir la observación docente de memoria acotada configurable por entorno
  (§10 `.instructions.md`).

**Non-Goals** (adicionales a los del proposal):
- No se agrega persistencia de conversaciones en PostgreSQL/Prisma en este
  change; la propiedad de una conversación por usuario no queda enforced a
  nivel de datos (ver Riesgos).
- No se dockeriza el servicio Python en este change (se corre manualmente con
  `uvicorn`, igual que la DB hoy se levanta con `docker run` manual).

## Decisions

### 1. Envolver `chat.py` con FastAPI reusando sus funciones, sin invocarlo por CLI
`chatbot/api.py` importa `chat.py` como módulo (`cargar_conversacion`,
`crear_conversacion`, `responder`, `formatear_historial`, `formatear_contexto`,
`get_llm`) en vez de invocar el script por subprocess. Se extrae del bloque
`if __name__ == "__main__":` de `chat.py` una función `build_chain()` que
arma `vectorstore` + `retriever` + `llm` + `chain` una sola vez al levantar
`api.py` (no en cada request). El bloque CLI de `chat.py` se mantiene intacto
para seguir pudiendo debuggear por consola.
- **Alternativa descartada**: invocar `chat.py --question ... --conversation-id
  ...` como subproceso desde FastAPI. Más simple de escribir pero agrega
  latencia de arranque de proceso Python + carga del modelo de embeddings en
  cada request; se descarta por costo/latencia.

### 2. Cliente HTTP del proxy Nest: `fetch` global, sin nueva dependencia
`ChatbotService` usa el `fetch` global de Node (disponible en Node 24) con
`AbortSignal.timeout(CHATBOT_TIMEOUT_MS)` para el timeout, igual patrón que ya
usa `frontend/src/api/http.ts`. No se agrega `axios` ni `@nestjs/axios`.
- **Alternativa descartada**: `@nestjs/axios`. Es el patrón "oficial" de Nest
  para llamadas salientes, pero agrega una dependencia nueva solo para un
  único endpoint de proxy; se prefiere consistencia con el `fetch` ya usado
  en el frontend y menor superficie de dependencias.

### 3. Mapeo de errores del servicio Python al contrato `{ error }`
`ChatbotService`:
- Error de red / timeout / servicio caído → `BadGatewayException` (`502`)
  con mensaje genérico ("El asistente no está disponible en este momento"),
  sin exponer el error crudo del `fetch` ni la URL interna.
- `api.py` responde `404` cuando `conversation_id` no existe → `ChatbotService`
  lo traduce a `400` (`"conversation_id inválido"`), siguiendo la convención
  del proyecto de que una referencia inválida en el body es `400`, no `404`
  (ver `ESTADO.md` - Decisiones).
- Cualquier otro status no-2xx del servicio Python → `502` genérico (no se
  intenta mapear cada código de FastAPI 1:1).

### 4. Asociación `conversation_id` ↔ usuario: trazabilidad, no aislamiento forzado
`ChatbotController` toma `req.user.sub` (id del usuario autenticado, ya
disponible por `JwtAuthGuard`) y lo envía en el body al servicio Python como
`user_id`. `api.py` lo persiste en el JSON de la conversación (campo
`user_id`) solo para trazabilidad/depuración. En este change **no** se
valida que el `conversation_id` recibido pertenezca al usuario autenticado:
no hay tabla en Postgres que mapee conversación → usuario, y agregarla
implicaría una migración Prisma fuera del alcance declarado en el proposal.
- **Mitigación del riesgo de acceso cruzado**: `conversation_id` es un UUID
  v4 (no adivinable/enumerable) y el endpoint requiere JWT válido, por lo que
  el riesgo práctico es bajo para el alcance de un TP. Ver Riesgos.

### 5. Memoria acotada configurable por entorno
`chat.py`/`api.py` reemplazan el `[-10:]` hardcodeado por
`CHAT_HISTORY_WINDOW` (entero, default `10`) leído por entorno, cumpliendo la
obligación de §10 `.instructions.md` de que el límite sea configurable. Se
mantiene la estrategia de ventana de últimos N intercambios (no se agrega
summarization en este change: N configurable ya satisface la regla, que pide
"ventana... y/o summarization").

### 6. `ingest.py` apunta a `docs-negocio.md` por default, sigue aceptando argumento
Se mantiene la firma `python ingest.py [archivo.md]`, pero si no se pasa
argumento usa `docs-negocio.md` (a redactar por el usuario en `/chatbot`) como
default. Así `ingest.py` sigue siendo genérico para reindexar otros `.md` a
futuro (p. ej. catálogo, para CU10) sin duplicar el script.

### 7. Widget de chat: estado en memoria del componente, sin `sessionStorage`
El widget se monta una sola vez en `App.tsx` (fuera del switch de `view`,
igual que `header`/`nav`), así el `conversation_id` sobrevive a la
navegación entre pestañas mientras la SPA sigue montada. No se persiste en
`sessionStorage`/`localStorage`: "durante la sesión" se interpreta como
mientras la aplicación sigue abierta en la pestaña, no a través de recargas
de página (F5). Al hacer logout el widget se desmonta (queda dentro del
render condicionado a `user`), lo que limpia el `conversation_id` de la
sesión anterior.
- **Alternativa considerada**: `sessionStorage` para sobrevivir a un F5.
  Se descarta por simplicidad ya que ningún otro estado de la app (filtros,
  vista activa) sobrevive a un F5 hoy; mantiene el widget consistente con el
  resto del frontend.

## Risks / Trade-offs

- **[Riesgo] Sin aislamiento de conversaciones por usuario a nivel de datos**
  → Mitigado por UUID v4 no adivinable + requerir JWT. Si se necesita
  aislamiento estricto, requiere una migración futura (tabla
  `ChatConversation` en Postgres) fuera de este change.
- **[Riesgo] Alucinación si el LLM ignora el prompt "solo contexto"** → El
  prompt ya instruye "responde exclusivamente usando el contexto
  proporcionado"; se valida con el escenario de spec "pregunta fuera del
  alcance". No hay guardrail adicional (p. ej. filtro de similitud mínima) en
  este change.
- **[Riesgo] Proveedor LLM sin definir (Groq vs Gemini, ver deuda en
  `ESTADO.md`)** → Se reusa `get_llm()` tal como está (soporta `ollama`/`groq`
  vía `LLM_PROVIDER`); Gemini no está soportado por el código de la demo.
  Este change no agrega soporte Gemini; queda como mejora futura si el
  equipo decide migrar de proveedor.
- **[Trade-off] Dos procesos para levantar el chatbot en dev** (NestJS +
  `uvicorn`) → Documentar el comando de arranque en `chatbot/README.md` y en
  `AGENTS.md`/`ESTADO.md`; no se agrega `docker-compose` en este change
  (consistente con que la DB tampoco lo tiene todavía).

## Open Questions

- Puerto y comando exacto de arranque de `uvicorn` (`chatbot/api.py`) para
  documentar en `chatbot/README.md`: se asume `uvicorn api:app --port 8001`
  para matchear `CHATBOT_URL=http://localhost:8001` de `.env.example`; ajustar
  si el usuario prefiere otro puerto al implementar.
