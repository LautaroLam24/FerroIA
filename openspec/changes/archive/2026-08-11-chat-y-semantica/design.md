## Context

`ChatWidget`, `SemanticSearch` y `RestockPage` son las últimas piezas de
frontend con markup plano (ver `proposal.md - Why`). El design-system ya
expone `Card`, `Table`, `Badge`, `Spinner`, `Button`, `FormField`, `Input`,
`Modal`, `Toast` (`frontend/src/components/ui/*`) y tokens en
`frontend/src/tokens.css`. `App.tsx` monta `<ChatWidget />` una sola vez, a
nivel global, fuera del árbol de `view` (así el chat queda disponible en
cualquier pantalla); `RestockPage` se renderiza dentro de ese mismo árbol
pero es un componente hermano de `ChatWidget`, sin relación padre-hijo ni
acceso directo a su estado. `PurchaseOrdersPage` y la navegación por estado
(`AdminView` en `App.tsx`, sin router) ya existen y no cambian.

## Goals / Non-Goals

**Goals:**
- Los tres componentes quedan visualmente consistentes con el resto de la
  app (mismos tokens, mismos componentes de `components/ui`).
- El botón "Pedir borrador al asistente" en `RestockPage` logra que el
  `ChatWidget` se abra con un mensaje precargado, sin que `RestockPage`
  conozca detalles internos del chat (mensajes, conversationId, etc.).
- El error 502 se comunica igual (mismo tono, mismos tokens) en los tres
  puntos donde puede aparecer (chat, búsqueda semántica, reposición).

**Non-Goals:**
- No se diseña un sistema de notificaciones/eventos genérico reusable por
  otras features; la coordinación que se agrega es específica de
  chat↔restock.
- No se decide acá el copy exacto del mensaje precargado hacia el
  asistente (se define en tasks/implementación, siguiendo el tono del
  resto de los mensajes de error ya redactados en el proyecto).

## Decisions

### 1. Coordinación `RestockPage` → `ChatWidget`: Context de React, no lifting a `App.tsx` ni eventos DOM
Se agrega un `ChatLauncherContext` (nuevo archivo en
`frontend/src/features/chatbot/`) con un provider que envuelve
`<AppShell>` + `<ChatWidget />` en `App.tsx`. Expone `openChatWithMessage(text:
string)`. `ChatWidget` se suscribe al contexto para abrirse y precargar el
input; `RestockPage` solo llama `openChatWithMessage(...)` sin conocer el
estado interno del chat.

Alternativas consideradas:
- **Levantar el estado del chat a `App.tsx`**: rechazada — obligaría a
  `App.tsx` a conocer mensajes/conversationId/sending del chat, mezclando
  una responsabilidad de feature con el shell de navegación.
- **Evento DOM custom (`window.dispatchEvent`)**: rechazada — no tipado,
  más difícil de testear con React Testing Library, y sin ventaja real
  sobre Context para un caso de un solo consumidor.
- **Prop drilling vía `App.tsx`**: rechazada por el mismo motivo que
  levantar el estado; `App.tsx` no necesita saber que este puente existe.

Esto no toca `src/api`: `ChatLauncherContext` solo coordina UI (abrir panel
+ precargar texto); el envío sigue pasando por `sendChatMessage` dentro de
`ChatWidget`, igual que hoy.

### 2. Burbujas de chat: utilidades de Tailwind sobre los tokens existentes, sin componente nuevo en `components/ui`
Las burbujas se resuelven con clases utilitarias (alineación `ml-auto`/
`mr-auto`, fondo `bg-primary`/`bg-surface-alt`, texto acorde) directamente
en `ChatWidget.tsx`, igual que hoy se usan utilities de Tailwind en
`SemanticSearch.tsx`. No se crea un componente `ChatBubble` en
`components/ui/` porque es un patrón visual usado en un solo lugar (no hay
tercer consumidor que justifique la abstracción).

### 3. Aviso de 502 amable: reusar tokens `error-soft`/`error-soft-text` en una caja, no un componente `Alert` nuevo
Hoy los errores de validación usan `<p role="alert" className="text-sm
text-error">` (texto plano rojo, visto en `ProductsPage`, `SemanticSearch`,
etc.), pensado para errores de formulario puntuales. Para el aviso de
"servicio de IA no disponible" —que debe leerse distinto y más
persistente— se usa una caja con `bg-error-soft text-error-soft-text
rounded-md p-3` (los mismos tokens "soft" que ya usa `Badge` variant
`error`), reaplicada igual en `ChatWidget`, `SemanticSearch` y
`RestockPage` para que el usuario aprenda a reconocer ese estado en
cualquiera de los tres lugares. No se crea un componente `Alert` en
`components/ui/` en este change: son 3 usos con el mismo patrón de clases,
por debajo del umbral para justificar una nueva abstracción compartida
(si aparece un cuarto uso similar, ahí se extrae).

### 4. Scroll automático: `useRef` + `useEffect` sobre `messages.length`, sin librería
`ChatWidget` guarda un `ref` al final del contenedor de mensajes y hace
`scrollIntoView({ block: 'end' })` en un `useEffect` que corre cuando cambia
la cantidad de mensajes o el estado `sending` (para que el indicador de
"escribiendo…" también quede visible). No se agrega ninguna dependencia
nueva.

### 5. Botón "Pedir borrador al asistente": arma el mensaje en el cliente, no llama a un endpoint nuevo
El botón por grupo de proveedor arma un string a partir de los datos ya
presentes en `RestockSuggestion` (nombre de proveedor + código/nombre/
cantidad sugerida de cada item del grupo) y lo pasa a
`openChatWithMessage(...)`. El usuario revisa y confirma el envío desde el
propio `ChatWidget` (no se envía automáticamente al abrir), preservando que
sea una acción humana explícita antes de disparar la tool
`crear_borrador_orden` del lado del pipeline (que no cambia).

## Risks / Trade-offs

- [Mensaje precargado demasiado largo si el proveedor tiene muchos
  productos bajo el mínimo] → Se arma como lista compacta (código + nombre
  + cantidad, sin repetir texto de relleno); si en la práctica resulta
  excesivo, el usuario igual puede editarlo antes de enviarlo porque queda
  en el input del chat, no se envía solo.
- [Nuevo Context introduce un punto de acoplamiento entre features
  `chatbot` y `restock`] → Acoplamiento unidireccional y mínimo (una
  función `openChatWithMessage`); se ubica junto al `ChatWidget` (dueño del
  estado que coordina) y no dentro de `restock`, para que `chatbot` siga
  siendo la feature "dueña" del chat.
- [Reusar tokens `error-soft` para el aviso de 502 en 3 lugares distintos
  sin componente compartido] → Riesgo de que diverjan con el tiempo; se
  acepta acá por ser solo 3 usos (ver Decisión 3), documentado para que un
  cuarto uso futuro dispare la extracción a `components/ui/Alert.tsx`.

## Migration Plan

No aplica migración de datos ni de infraestructura: es un change
puramente de presentación en `frontend/src/features/{chatbot,products,
restock}` y `App.tsx`. Se puede desplegar y revertir como cualquier cambio
de frontend (sin coordinación con backend/chatbot, que no cambian).
