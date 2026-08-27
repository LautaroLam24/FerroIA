## Purpose

Asistente conversacional (CU09) que responde preguntas sobre políticas de stock, roles y
uso del sistema usando RAG sobre un documento de negocio propio, manteniendo el hilo de la
conversación por `conversation_id` con memoria acotada.

## ADDED Requirements

### Requirement: Iniciar o continuar una conversación con el asistente
El sistema SHALL exponer `POST /api/chatbot`, accesible a `ADMIN` y `OPERARIO`, que recibe
`{ question: string, conversation_id?: string }`. Si no se envía `conversation_id`, SHALL
crear una conversación nueva. En éxito SHALL responder `200` con
`{ "data": { "conversation_id": string, "answer": string } }`.

#### Scenario: Primera pregunta crea una conversación nueva
- **WHEN** un usuario autenticado (`ADMIN` u `OPERARIO`) envía `POST /api/chatbot` con
  `{ question: "¿cómo registro una entrada de stock?" }` sin `conversation_id`
- **THEN** el sistema responde `200` con `{ "data": { "conversation_id": <UUID nuevo>,
  "answer": <respuesta basada en el contexto recuperado> } }`

#### Scenario: Pregunta faltante o vacía
- **WHEN** se envía `POST /api/chatbot` sin `question` o con `question` vacío/en blanco
- **THEN** el sistema responde `400` con `{ "error": "...", "details": [...] }` y no
  consulta al servicio de IA

#### Scenario: conversation_id inexistente
- **WHEN** se envía `POST /api/chatbot` con un `conversation_id` que no corresponde a
  ninguna conversación persistida
- **THEN** el sistema responde `400` con `{ "error": "conversation_id inválido" }` (una
  referencia inválida en el body es `400`, no `404`, según la convención del proyecto)

#### Scenario: Sin token
- **WHEN** se envía `POST /api/chatbot` sin header `Authorization`
- **THEN** el sistema responde `401` con `{ "error": "No autenticado" }`

### Requirement: Continuidad de la conversación usando el historial
El sistema SHALL usar el historial de mensajes asociado a `conversation_id` como parte del
contexto enviado al LLM, de forma que una pregunta de seguimiento que depende del turno
anterior obtenga una respuesta coherente con ese turno, sin que el usuario deba repetir
contexto ya dado.

#### Scenario: Pregunta de seguimiento usa el historial previo
- **WHEN** se envía primero `POST /api/chatbot` con una pregunta cuya respuesta involucra un
  rol específico (p. ej. "¿quién puede autorizar una baja de producto?") y se obtiene un
  `conversation_id`, y luego se envía un segundo `POST /api/chatbot` con ese mismo
  `conversation_id` y la pregunta de seguimiento "¿y eso quién puede hacerlo?" (sin repetir
  el tema)
- **THEN** el sistema responde `200` con el mismo `conversation_id` y una `answer` coherente
  con el turno anterior (menciona el rol correcto sin que la segunda pregunta lo repita);
  esto SHALL verificarse inspeccionando que el registro persistido de la conversación
  contiene ambos intercambios (pregunta 1, respuesta 1, pregunta 2, respuesta 2) en orden

### Requirement: Memoria de conversación acotada
El sistema SHALL limitar la cantidad de historial de una conversación que se envía al LLM
en cada turno mediante una estrategia de acotamiento (ventana de los últimos N intercambios
y/o resumen de los más antiguos), configurable por entorno. El sistema SHALL NOT enviar el
historial completo de una conversación sin límite al LLM.

#### Scenario: Historial extenso se acota antes de llegar al LLM
- **WHEN** una conversación acumula más intercambios que la ventana configurada y se envía
  una nueva pregunta con ese `conversation_id`
- **THEN** el contexto de historial enviado al LLM incluye únicamente los últimos N
  intercambios configurados (o un resumen de los anteriores más los últimos N), nunca la
  conversación completa sin acotar

### Requirement: Respuesta cuando la pregunta está fuera del contexto disponible
El sistema SHALL responder indicando que no dispone de esa información cuando la pregunta
del usuario no puede responderse con el contexto recuperado del documento de negocio
indexado, en lugar de inventar una respuesta.

#### Scenario: Pregunta fuera del alcance del documento de negocio
- **WHEN** se envía `POST /api/chatbot` con una pregunta sin relación con las políticas de
  stock, roles, glosario o uso del sistema documentados (p. ej. "¿qué tiempo hace mañana?")
- **THEN** el sistema responde `200` con `{ "data": { "conversation_id", "answer" } }` donde
  `answer` indica explícitamente que no cuenta con esa información en el contexto
  disponible, sin inventar datos no presentes en el documento indexado

### Requirement: Manejo de caída del servicio de IA
El sistema SHALL responder `502` con un mensaje de error claro y sin detalles internos
(stack traces, URLs, mensajes crudos del cliente HTTP) cuando el servicio de IA (Python) no
responde, responde con timeout, o responde con un error.

#### Scenario: Servicio de IA no disponible
- **WHEN** el servicio de IA no está accesible (conexión rechazada o timeout) y un usuario
  autenticado envía `POST /api/chatbot`
- **THEN** el sistema responde `502` con `{ "error": "..." }` indicando que el asistente no
  está disponible, sin exponer detalles internos de la conexión fallida, y no persiste
  ningún dato de la conversación
