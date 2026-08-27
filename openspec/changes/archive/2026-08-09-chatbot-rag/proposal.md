## Why

CU09 (asistente conversacional) es parte del módulo de IA obligatorio del TP y
todavía no tiene implementación: hoy `/chatbot` solo contiene un `README.md`
con el código de referencia de la demo de clase (`rag-chat`, variante con
memoria). El sistema necesita un asistente que responda preguntas sobre
políticas de stock, roles y uso del sistema usando RAG sobre un documento de
negocio propio, expuesto a través del backend NestJS y accesible desde el
frontend con continuidad de conversación.

## What Changes

- Copiar `ingest.py`, `chat.py` y `requirements.txt` desde el código de
  referencia embebido en `chatbot/README.md` a archivos reales en `/chatbot`.
- Adaptar `ingest.py` para indexar `chatbot/docs-negocio.md` (documento de
  negocio a redactar por el usuario: políticas de stock, roles, glosario del
  rubro ferretería/pinturería, cómo usar el sistema) en ChromaDB.
- Envolver `chat.py` en un servicio FastAPI (`chatbot/api.py` o similar):
  `POST /chat` con body `{ conversation_id?, question }` que responde
  `{ conversation_id, answer }`, reutilizando la persistencia JSON de
  conversaciones por UUID y el prompt con `{history}` ya presentes en la demo.
- Nuevo módulo NestJS `chatbot` (`backend/src/chatbot/`): `POST /api/chatbot`
  autenticado (`@Roles(ADMIN, OPERARIO)`) que hace proxy al servicio FastAPI
  usando `CHATBOT_URL` (ya declarada en `.env.example`), asocia el
  `conversation_id` devuelto al usuario autenticado y traduce fallas del
  servicio Python a `502` con un mensaje de error claro.
- Nuevo widget de chat persistente en el frontend: visible para ambos roles,
  conserva el `conversation_id` mientras dura la sesión del usuario para
  mantener el hilo de la conversación.

## Capabilities

### New Capabilities

- `chatbot`: asistente conversacional RAG (CU09) — servicio Python
  FastAPI + ChromaDB para responder preguntas sobre el documento de negocio
  con memoria de conversación por `conversation_id`, expuesto vía proxy
  autenticado en NestJS (`POST /api/chatbot`) y consumido desde un widget de
  chat persistente en el frontend.

### Modified Capabilities

(ninguna — no cambia el comportamiento de specs existentes)

## Impact

- **Nuevo código:** `chatbot/ingest.py`, `chatbot/chat.py` (envuelto en
  FastAPI), `chatbot/docs-negocio.md`, `chatbot/requirements.txt`;
  `backend/src/chatbot/` (controller, service, module, DTO); frontend: widget
  de chat + `frontend/src/api/chatbot.ts`.
- **Config:** reutiliza `CHATBOT_URL`, `LLM_PROVIDER`, `LLM_MODEL`,
  `GROQ_API_KEY` ya presentes en `.env.example`.
- **Dependencias backend:** requiere un cliente HTTP para el proxy (a definir
  en design.md — `@nestjs/axios`/`axios` no están instalados hoy).
- **Sin cambios de schema Prisma** (no se persiste nada del chat en
  PostgreSQL en este change; la persistencia de conversaciones queda en JSON
  del lado del servicio Python, como en la demo).
- **Fuera de alcance (Non-goals):** streaming de tokens en la respuesta; RAG
  sobre datos vivos de la base (catálogo/stock en tiempo real vía MCP
  postgres — posible mejora futura); sincronización de ChromaDB ante ABM de
  productos y function calling para borradores de orden de compra (eso es
  CU10, ya delimitado como módulo `semantic`/`purchase-orders` aparte).
