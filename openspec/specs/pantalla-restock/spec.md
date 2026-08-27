# pantalla-restock Specification

## Purpose

Define la presentación frontend de CU10: el buscador semántico de productos
(input destacado, estado de carga, resultados en tarjetas/tabla) y el panel
de sugerencia de reposición agrupado por proveedor, incluyendo el puente
hacia el asistente para pedir el borrador de una orden de compra.

## Requirements

### Requirement: Input de búsqueda semántica destacado
El buscador semántico (dentro de Productos) SHALL mostrarse con un `Input`
y `FormField` del design-system claramente destacados del resto del
formulario de filtros, con un placeholder que oriente al usuario a describir
lo que busca en lenguaje natural (no un código o nombre exacto).

#### Scenario: Buscador visible y diferenciado
- **WHEN** el usuario abre la pantalla de Productos
- **THEN** el buscador semántico se muestra en una sección propia,
  visualmente distinguible del listado y de los filtros exactos, con un
  placeholder de ejemplo en lenguaje natural

### Requirement: Estado de carga del buscador semántico
Mientras la búsqueda semántica está en curso, el botón de búsqueda SHALL
reflejar el estado de carga (`Button` con `loading`/texto "Buscando…") y
SHALL estar deshabilitado hasta que la respuesta llegue o falle.

#### Scenario: Búsqueda en curso
- **WHEN** el usuario envía una búsqueda semántica y la respuesta todavía no
  llegó
- **THEN** el botón de búsqueda muestra su estado de carga y queda
  deshabilitado hasta que la búsqueda resuelva

### Requirement: Resultados de búsqueda semántica en tarjetas o tabla
Los resultados de la búsqueda semántica SHALL mostrarse con el componente
`Table` del design-system (columnas: nombre, código, precio, stock con
`Badge` de stock bajo si corresponde, categoría, proveedor), y SHALL mostrar
un estado vacío claro cuando no hay resultados.

#### Scenario: Resultados encontrados
- **WHEN** la búsqueda semántica devuelve productos
- **THEN** se muestran en una `Table` con nombre, código, precio, stock
  (con `Badge` si está bajo mínimo), categoría y proveedor

#### Scenario: Sin resultados
- **WHEN** la búsqueda semántica devuelve una lista vacía
- **THEN** se muestra un mensaje de estado vacío claro en lugar de una
  tabla sin filas

#### Scenario: Servicio de búsqueda caído (502)
- **WHEN** la búsqueda semántica falla porque el servicio de IA no está
  disponible (HTTP 502)
- **THEN** se muestra un aviso amable indicando que la búsqueda semántica no
  está disponible en este momento, con el mismo tono que el resto de la app

### Requirement: Panel de reposición agrupado por proveedor
`RestockPage` SHALL mostrar la sugerencia de reposición agrupada por
proveedor usando `Card`/`Table` del design-system (una sección por
proveedor, con su `Table` de productos: código, nombre, stock actual, stock
mínimo, cantidad sugerida), con estados de carga y vacío consistentes con el
resto de la app.

#### Scenario: Reposición con productos agrupados
- **WHEN** la sugerencia de reposición devuelve uno o más grupos por
  proveedor
- **THEN** cada proveedor se muestra en su propia `Card` con una `Table` de
  sus productos a reponer

#### Scenario: Sin productos por reponer
- **WHEN** la sugerencia de reposición no tiene productos bajo el mínimo
- **THEN** se muestra un estado vacío claro, sin secciones de proveedor
  vacías

#### Scenario: Cálculo en curso
- **WHEN** el usuario recalcula la sugerencia y la respuesta todavía no
  llegó
- **THEN** se muestra un estado de carga consistente con el resto de la app
  (`Spinner`/`Button` loading) en lugar del panel anterior parpadeando

#### Scenario: Servicio de reposición caído (502)
- **WHEN** el cálculo de reposición falla porque el servicio de IA no está
  disponible (HTTP 502)
- **THEN** se muestra un aviso amable equivalente al del buscador semántico
  y al del chat

### Requirement: Puente hacia el asistente para pedir el borrador de orden
Cada grupo de proveedor en `RestockPage` SHALL tener un botón "Pedir
borrador al asistente" que abre el `ChatWidget` y precarga un mensaje
referido a ese proveedor y sus productos a reponer, reusando el cliente
`sendChatMessage` existente (sin nuevos endpoints ni cambios en el pipeline
del chatbot) para que el usuario dispare la tool de creación de borrador ya
implementada.

#### Scenario: Pedir borrador desde un grupo de proveedor
- **WHEN** el usuario hace clic en "Pedir borrador al asistente" dentro de
  un grupo de proveedor
- **THEN** el `ChatWidget` se abre (si estaba cerrado) con un mensaje
  precargado que identifica al proveedor y los productos sugeridos de ese
  grupo, listo para que el usuario lo envíe

### Requirement: Enlace hacia las órdenes de compra existentes
Cuando el usuario ya generó un borrador de orden de compra a través del
asistente, `RestockPage` SHALL ofrecer un enlace de navegación hacia
`PurchaseOrdersPage` para que pueda revisar y confirmar/cancelar ese
borrador, sin duplicar esa funcionalidad dentro de `RestockPage`.

#### Scenario: Ir a Órdenes de compra desde Reposición
- **WHEN** el usuario hace clic en el enlace hacia Órdenes de compra dentro
  de `RestockPage`
- **THEN** la aplicación navega a `PurchaseOrdersPage`, donde puede ver y
  gestionar el borrador generado por el asistente

### Requirement: No alteración de lógica de negocio ni contrato de API
Este change SHALL limitarse a la capa visual de la búsqueda semántica y de
`RestockPage`: no SHALL modificar el cliente HTTP (`frontend/src/api`), los
contratos de `GET /products/semantic` ni `POST /restock/suggest`, el cálculo
de reposición, ni el function calling de `crear_borrador_orden`.

#### Scenario: Verificación técnica sigue en verde
- **WHEN** se ejecutan `tsc --noEmit`, el linter y la suite de tests del
  frontend después de aplicar este change
- **THEN** las tres verificaciones terminan sin errores, sin cambios de
  comportamiento en `frontend/src/api`, en el backend ni en `chatbot/**`
