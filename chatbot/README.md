# Chatbot RAG (CU09 — asistente conversacional)

Servicio Python que responde preguntas sobre `docs-negocio.md` (políticas de stock,
roles, glosario del rubro y cómo usar el sistema) usando RAG sobre ChromaDB, con memoria
de conversación por `conversation_id` acotada por `CHAT_HISTORY_WINDOW`. El backend
NestJS (`backend/src/chatbot/`) le pega a este servicio vía `CHATBOT_URL`.

## Archivos

- `ingest.py` — indexa un `.md` en ChromaDB (`chroma_db/`). Por default indexa
  `docs-negocio.md`.
- `chat.py` — lógica de RAG + persistencia de conversaciones en JSON (`conversaciones/`).
  Se puede usar por consola (modo interactivo o `--question` para una sola pregunta) o
  importado como librería.
- `api.py` — envuelve `chat.py` en un servicio FastAPI (`POST /chat`).
- `docs-negocio.md` — documento de negocio que se indexa. Editalo y volvé a correr
  `ingest.py` para reindexar.

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Variables de entorno (ver `.env.example` en la raíz del repo): `LLM_PROVIDER`
(`ollama`/`groq`), `LLM_MODEL`, `GROQ_API_KEY`, `CHATBOT_URL`, `CHAT_HISTORY_WINDOW`.
Copiá o enlazá un `.env` en `/chatbot` con esas variables (o corré los comandos desde la
raíz del repo si ya tenés un `.env` ahí).

## Uso

```bash
# 1) Indexar el documento de negocio en ChromaDB
python ingest.py

# 2) Levantar el servicio HTTP que consume el backend NestJS
uvicorn api:app --port 8001

# Alternativa: chat por consola sin pasar por HTTP
python chat.py                              # modo interactivo
python chat.py --question "¿qué es el stock mínimo?"   # pregunta única
python chat.py --question "..." --conversation-id <uuid>   # continuar una conversación
```

`CHATBOT_URL` en `.env.example` apunta a `http://localhost:8001`, así que el puerto de
`uvicorn` debe coincidir (o actualizar `CHATBOT_URL` si se cambia).
