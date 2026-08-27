## Why

El `ChatWidget` de CU09 y las pantallas de CU10 (`SemanticSearch` dentro de
Productos y `RestockPage`) fueron las últimas piezas de frontend que quedaron
con markup plano (`div`/`table` sueltos, sin `Card`/`Table`/`Badge`/`Spinner`
del design-system), según el mapeo de deuda de `ESTADO.md` tras archivar
`stock-y-dashboard`. Hoy el chat no distingue visualmente burbujas de
usuario/asistente, no muestra un estado de "escribiendo…" real (solo un texto
suelto "Pensando…") y el error 502 del servicio de IA se ve como un `<p
role="alert">` genérico, igual que cualquier otro error de validación. La
pantalla de reposición (`RestockPage`) usa `table`/`button` planos en vez de
`Table`/`Button`/`Card`, y no tiene forma de pasar de "hay que reponerle a
este proveedor" a "pedile al asistente el borrador de la orden", pese a que
esa tool (`crear_borrador_orden`) ya existe desde `ordenes-compra-borrador`.

## What Changes

- Reconstruir `ChatWidget` (CU09) sobre el design-system: panel flotante con
  `Card`/tokens de sombra y radio, burbujas de usuario/asistente
  visualmente diferenciadas (alineación, color de fondo), estado
  "escribiendo…" con `Spinner` mientras se espera la respuesta, error 502
  mostrado como aviso amable y persistente (no un alert que se confunde con
  error de formulario), y auto-scroll al último mensaje del historial.
- Reconstruir `SemanticSearch` (dentro de `ProductsPage`, CU10) sobre el
  design-system: input de búsqueda destacado con `FormField`/`Input`, estado
  de carga visible con `Spinner`/`Button` loading, resultados en `Table` (ya
  usa `Table`; se ajusta jerarquía visual y estado vacío) y manejo del 502
  con el mismo tono amable que el chat.
- Reconstruir `RestockPage` (CU10) sobre el design-system: panel de
  sugerencia de reposición agrupado por proveedor usando `Card`/`Table` en
  vez de markup plano, estado de carga/vacío consistente con el resto de la
  app, y un botón por grupo de proveedor "Pedir borrador al asistente" que
  abre el `ChatWidget` con un mensaje pre-armado (reutilizando
  `sendChatMessage`, sin nuevos endpoints) para que el usuario dispare la
  tool `crear_borrador_orden` ya existente; además, un enlace desde el
  resultado de esa conversación hacia `PurchaseOrdersPage` (ya implementada)
  para que el usuario pueda ir a confirmar/cancelar el borrador.
- Coordinación mínima de UI entre `RestockPage` y `ChatWidget` (nuevo
  contexto de React local al frontend) para poder abrir el panel del chat y
  precargar un mensaje desde otra pantalla, sin tocar `src/api` ni el
  pipeline del chatbot.

## Capabilities

### New Capabilities
- `pantalla-chat`: presentación frontend del `ChatWidget` (CU09) — panel
  flotante, burbujas diferenciadas, estado "escribiendo…", manejo visible
  del error 502, scroll al último mensaje.
- `pantalla-restock`: presentación frontend de la búsqueda semántica (CU10,
  dentro de Productos) y del panel de sugerencia de reposición agrupada por
  proveedor, incluyendo el puente hacia el asistente para pedir el borrador
  de orden de compra.

### Modified Capabilities
(ninguna: no cambia el comportamiento de las specs de backend `chatbot`,
`busqueda-semantica` ni `purchase-orders`, solo su presentación)

## Impact

- Frontend: `frontend/src/features/chatbot/ChatWidget.tsx`,
  `frontend/src/features/products/SemanticSearch.tsx`,
  `frontend/src/features/restock/RestockPage.tsx`, `frontend/src/App.tsx`
  (wiring de navegación/coordinación de UI), estilos nuevos apoyados en
  `frontend/src/tokens.css` y `components/ui/*` existentes.
- No afecta: `backend/src/**`, `chatbot/**`, `frontend/src/api/**` (se
  reusan `sendChatMessage`, `searchProductsSemantic`, `suggestRestock` tal
  cual existen), contratos de API, ni la lógica de function calling de
  `crear_borrador_orden`.
- Tests: se agregan/ajustan tests de React Testing Library para los tres
  componentes tocados (estados de error 502, "escribiendo…", scroll,
  botón de borrador).

## Non-goals

- Streaming de tokens en las respuestas del chat (la respuesta sigue
  llegando completa al finalizar el request).
- Cambios en la lógica del pipeline de IA (`chatbot/**`), en el cálculo de
  reposición, en el function calling de `crear_borrador_orden`, o en
  `src/api` (contratos, endpoints o clientes HTTP).
- Nueva pantalla o ruta para crear/editar órdenes de compra manualmente:
  ya existe `PurchaseOrdersPage`, solo se enlaza.
