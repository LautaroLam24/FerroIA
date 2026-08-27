## Purpose

Define la presentación frontend de CU09: el `ChatWidget` como panel flotante
sobre el design-system, con burbujas de usuario/asistente diferenciadas,
estado "escribiendo…", manejo visible y amable del error 502 del servicio
de IA, y scroll automático al último mensaje del historial.

## ADDED Requirements

### Requirement: Panel flotante del asistente sobre el design-system
El `ChatWidget` SHALL renderizarse como un panel flotante (botón de apertura
fijo + panel expandible) que reusa los tokens de color, radio y sombra del
design-system (`components/ui/*`, `tokens.css`), sin introducir estilos ad
hoc que rompan la consistencia visual del resto de la app.

#### Scenario: Estado cerrado
- **WHEN** el usuario autenticado no abrió el chat
- **THEN** se muestra solo el botón flotante de apertura, con el mismo
  lenguaje visual (radios, sombra, color primario) que el resto de los
  controles del design-system

#### Scenario: Estado abierto
- **WHEN** el usuario hace clic en el botón flotante
- **THEN** se expande un panel con encabezado, historial de mensajes, input
  y botón de envío, todo dentro de una superficie con `shadow`/`radius` del
  design-system

### Requirement: Burbujas de usuario y asistente diferenciadas
Cada mensaje del historial SHALL mostrarse como una burbuja con alineación y
color de fondo distintos según el rol (`user` alineado a la derecha con un
color; `assistant` alineado a la izquierda con otro), de forma que un
usuario pueda distinguir quién escribió cada mensaje sin leer el texto.

#### Scenario: Mensaje de usuario
- **WHEN** el usuario envía una pregunta
- **THEN** su mensaje aparece como burbuja alineada a la derecha con el
  estilo de mensaje de usuario, visualmente distinta de la del asistente

#### Scenario: Mensaje del asistente
- **WHEN** el asistente responde
- **THEN** la respuesta aparece como burbuja alineada a la izquierda con el
  estilo de mensaje del asistente

### Requirement: Estado "escribiendo…" mientras se espera respuesta
Mientras la respuesta del asistente está en curso, el panel SHALL mostrar un
indicador visual de "escribiendo…" (con `Spinner` del design-system) en el
lugar donde aparecerá la próxima burbuja del asistente, y SHALL deshabilitar
el envío de un nuevo mensaje hasta que la respuesta llegue o falle.

#### Scenario: Esperando respuesta
- **WHEN** el usuario envía un mensaje y la respuesta del asistente todavía
  no llegó
- **THEN** se muestra un indicador de "escribiendo…" con `Spinner`, y el
  input/botón de envío quedan deshabilitados

#### Scenario: Respuesta recibida
- **WHEN** la respuesta del asistente llega
- **THEN** el indicador de "escribiendo…" desaparece, se agrega la burbuja
  del asistente y el input vuelve a estar habilitado

### Requirement: Manejo visible y amable del error 502
Si el envío de un mensaje falla porque el servicio de IA no está disponible
(HTTP 502), el panel SHALL mostrar un aviso persistente y con tono amable
(no técnico) dentro del propio panel del chat, distinguible de un error de
validación de formulario, sin descartar el historial de mensajes ya
enviado.

#### Scenario: Servicio de IA caído (502)
- **WHEN** el usuario envía un mensaje y la respuesta del backend es 502
- **THEN** el panel muestra un aviso amable indicando que el asistente no
  está disponible y sugiriendo reintentar más tarde, el historial previo
  permanece visible y el usuario puede volver a intentar enviar un mensaje

#### Scenario: Otro error de la API
- **WHEN** el envío de un mensaje falla con un error de la API distinto de
  502
- **THEN** el panel muestra el mensaje de error correspondiente sin perder
  el historial ni bloquear el chat de forma permanente

### Requirement: Scroll automático al último mensaje
Cada vez que se agrega un mensaje al historial (del usuario, del asistente,
o el indicador de "escribiendo…"), el panel SHALL desplazar automáticamente
la vista del historial hasta el mensaje más reciente, sin requerir que el
usuario haga scroll manual.

#### Scenario: Nuevo mensaje agregado
- **WHEN** se agrega un mensaje nuevo al historial mientras el panel está
  abierto
- **THEN** el área de mensajes se desplaza automáticamente para mostrar ese
  mensaje al final de la vista visible

### Requirement: No alteración de lógica de negocio ni contrato de API
Este change SHALL limitarse a la capa visual del `ChatWidget`: no SHALL
modificar el cliente HTTP (`frontend/src/api`), el contrato de
`POST /chatbot`, ni el pipeline del chatbot en `chatbot/**`.

#### Scenario: Verificación técnica sigue en verde
- **WHEN** se ejecutan `tsc --noEmit`, el linter y la suite de tests del
  frontend después de aplicar este change
- **THEN** las tres verificaciones terminan sin errores, sin cambios de
  comportamiento en `frontend/src/api` ni en `chatbot/**`
