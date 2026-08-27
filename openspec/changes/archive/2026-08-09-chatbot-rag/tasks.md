## 1. Servicio Python (chatbot RAG)

- [x] 1.1 Copiar `ingest.py`, `chat.py` y `requirements.txt` desde el código embebido en `chatbot/README.md` a archivos reales en `/chatbot`
- [x] 1.2 Crear `chatbot/docs-negocio.md` con la estructura base (secciones: políticas de stock, roles, glosario del rubro, cómo usar el sistema) — el contenido final de cada sección lo completa el usuario
- [x] 1.3 Adaptar `ingest.py`: si no se pasa argumento, usar `docs-negocio.md` como archivo por default (mantener el argumento posicional para reindexar otros `.md` a futuro)
- [x] 1.4 Refactorizar `chat.py`: extraer del bloque `if __name__ == "__main__":` una función `build_chain()` (vectorstore + retriever + llm + chain) reusable desde `api.py`, sin romper el modo CLI existente
- [x] 1.5 Adaptar `chat.py`: reemplazar el recorte de historial hardcodeado (`[-10:]`) por `CHAT_HISTORY_WINDOW` leído de entorno (default `10`)
- [x] 1.6 Adaptar `chat.py`/persistencia: guardar `user_id` (recibido desde Nest) en el JSON de la conversación para trazabilidad
- [x] 1.7 Crear `chatbot/api.py` (FastAPI) con `POST /chat`: modelo pydantic de request (`question`, `conversation_id?`, `user_id?`) y response (`conversation_id`, `answer`); arma la chain una sola vez al levantar el servicio vía `build_chain()`
- [x] 1.8 En `api.py`, responder `404` cuando `conversation_id` viene informado pero no existe una conversación persistida con ese id
- [x] 1.9 Actualizar `chatbot/requirements.txt`: agregar `fastapi` y `uvicorn`
- [x] 1.10 Reescribir `chatbot/README.md` con instrucciones reales de uso (`pip install -r requirements.txt`, `python ingest.py`, `uvicorn api:app --port 8001`) en vez del código embebido, que ya pasó a ser archivos reales

## 2. Backend NestJS: módulo `chatbot` (proxy)

- [x] 2.1 Crear `ChatRequestDto` (`question: string` no vacío, `conversation_id?: string`) con `class-validator`
- [x] 2.2 Crear `ChatbotService`: `fetch` a `${CHATBOT_URL}/chat` con `AbortSignal.timeout(CHATBOT_TIMEOUT_MS)`, incluyendo `user_id` del usuario autenticado en el body
- [x] 2.3 En `ChatbotService`, mapear errores: fallo de red/timeout → `BadGatewayException` (`502`, mensaje genérico sin detalles internos); respuesta `404` del servicio Python (conversation_id inexistente) → `BadRequestException` (`400`, `"conversation_id inválido"`); cualquier otro status no-2xx → `502` genérico
- [x] 2.4 Crear `ChatbotController`: `POST /api/chatbot`, `@Roles(ADMIN, OPERARIO)`, responde `{ data: { conversation_id, answer } }`
- [x] 2.5 Crear `ChatbotModule` y registrarlo en `AppModule`
- [x] 2.6 Agregar `CHATBOT_TIMEOUT_MS` (default sugerido `15000`) y `CHAT_HISTORY_WINDOW` a `.env.example`
- [x] 2.7 Tests unit de `ChatbotService` (fetch mockeado): éxito, timeout/error de red → `502`, `conversation_id` inexistente → `400`
- [x] 2.8 Tests e2e de `POST /api/chatbot` cubriendo los escenarios de `specs/chatbot/spec.md`: primera pregunta sin `conversation_id` → `200` con `conversation_id` nuevo; segunda pregunta con el mismo `conversation_id` y una pregunta de seguimiento tipo "¿y eso quién puede hacerlo?" → `200` con respuesta coherente con el turno anterior; pregunta fuera de contexto → `200` indicando que no tiene esa información; servicio Python caído (mock/stub apagado) → `502`; sin token → `401`

## 3. Frontend: widget de chat persistente

- [x] 3.1 Crear `frontend/src/api/chatbot.ts`: `sendChatMessage({ conversation_id?, question })` usando `http.post('/chatbot', ...)`
- [x] 3.2 Crear `frontend/src/features/chatbot/ChatWidget.tsx`: burbuja/panel flotante con input, lista de mensajes de la conversación actual y estado de carga
- [x] 3.3 Mantener `conversation_id` en el estado del `ChatWidget` (no en `sessionStorage`) para conservar el hilo mientras la app sigue montada durante la sesión
- [x] 3.4 Montar `<ChatWidget />` en `App.tsx` fuera del switch de `view` (visible para `ADMIN` y `OPERARIO` tras login, se desmonta al hacer logout)
- [x] 3.5 Manejar en el widget el error `502` de `ApiError` mostrando que el asistente no está disponible, sin romper el resto de la UI

## 4. Documentación y verificación

- [x] 4.1 Actualizar la tabla de comandos de `AGENTS.md` con el arranque del servicio FastAPI (`uvicorn api:app --port 8001`) junto al `python chat.py --question` existente
- [x] 4.2 Ejecutar verificación completa: `npx tsc --noEmit && npm run lint && npm run test` en `backend` y en `frontend`
