## Purpose

Permitir registrar, a mano o vía el asistente, una propuesta de compra a un
proveedor como borrador revisable, sin que esa propuesta pueda convertirse en
una compra real ni afectar el stock hasta que un `ADMIN` la confirme
explícitamente.

## ADDED Requirements

### Requirement: Creación manual de un borrador de orden de compra
El sistema SHALL exponer `POST /api/purchase-orders`, accesible a `ADMIN` y
`OPERARIO`, que recibe un proveedor y una lista de items (producto +
cantidad sugerida, cantidad SHALL ser mayor a `0`) y crea una `OrdenCompra`
en estado `BORRADOR` con origen `MANUAL`. El proveedor y cada producto SHALL
existir; una referencia inválida en el body es `400` (no `404`, que se
reserva al `:id` de la URL). La lista de items NO SHALL estar vacía.

#### Scenario: Creación manual exitosa
- **WHEN** un `ADMIN` u `OPERARIO` envía `POST /api/purchase-orders` con un
  `proveedorId` existente y al menos un item con `productoId` existente y
  `cantidadSugerida` mayor a `0`
- **THEN** el sistema responde `201` con la orden creada en `data`, con
  `estado: "BORRADOR"` y `origen: "MANUAL"`

#### Scenario: Proveedor o producto inexistente en el body
- **WHEN** se envía `POST /api/purchase-orders` con un `proveedorId` o un
  `productoId` que no existe
- **THEN** el sistema responde `400` con `{ "error": "..." }` y no crea
  ninguna orden

#### Scenario: Items vacíos o cantidad inválida
- **WHEN** se envía `POST /api/purchase-orders` sin items, o con un item con
  `cantidadSugerida` menor o igual a `0`
- **THEN** el sistema responde `400` con `{ "error": "...", "details": [...] }`
  y no crea ninguna orden

#### Scenario: Sin token
- **WHEN** se envía `POST /api/purchase-orders` sin header `Authorization`
- **THEN** el sistema responde `401` con `{ "error": "No autenticado" }`

### Requirement: Listado y detalle de órdenes de compra
El sistema SHALL exponer `GET /api/purchase-orders` (listado) y
`GET /api/purchase-orders/:id` (detalle), ambos accesibles a `ADMIN` y
`OPERARIO`. Cada orden devuelta SHALL incluir su proveedor, items (con
producto y cantidad sugerida), `estado`, `origen`, `createdBy` y
`createdAt`.

#### Scenario: Listado accesible para ambos roles
- **WHEN** un usuario autenticado con rol `ADMIN` o `OPERARIO` envía
  `GET /api/purchase-orders`
- **THEN** el sistema responde `200` con `{ "data": [...] }` incluyendo las
  órdenes existentes, cada una con su `estado` y `origen`

#### Scenario: Detalle de una orden existente
- **WHEN** se envía `GET /api/purchase-orders/:id` con un `id` de una orden
  existente
- **THEN** el sistema responde `200` con esa orden en `data`, incluyendo sus
  items y proveedor

#### Scenario: Detalle de una orden inexistente
- **WHEN** se envía `GET /api/purchase-orders/:id` con un `id` que no
  corresponde a ninguna orden
- **THEN** el sistema responde `404` con `{ "error": "..." }`

#### Scenario: Sin token
- **WHEN** se envía `GET /api/purchase-orders` o `GET /api/purchase-orders/:id`
  sin header `Authorization`
- **THEN** el sistema responde `401` con `{ "error": "No autenticado" }`

### Requirement: Confirmación de una orden es exclusiva de ADMIN y no afecta stock
El sistema SHALL exponer `PATCH /api/purchase-orders/:id/confirmar`,
accesible SOLO a `ADMIN`, que transiciona una orden de `BORRADOR` a
`CONFIRMADA`. Esta transición SHALL ser puramente un cambio de estado: NUNCA
SHALL modificar `Product.stock` ni crear ningún `StockMovement`. El ingreso
real de mercadería y su impacto en stock sigue siendo responsabilidad
exclusiva de CU06 (`movimientos-stock`), como una operación humana separada
y posterior. Solo SHALL poder confirmarse una orden que esté en `BORRADOR`.

#### Scenario: Confirmación exitosa sin afectar stock
- **WHEN** un `ADMIN` envía `PATCH /api/purchase-orders/:id/confirmar` sobre
  una orden en estado `BORRADOR`
- **THEN** el sistema responde `200` con la orden en `data` con
  `estado: "CONFIRMADA"`, y ningún `Product.stock` involucrado en los items
  de la orden cambia, y no se crea ningún `StockMovement` como efecto de esta
  llamada

#### Scenario: OPERARIO intenta confirmar
- **WHEN** un usuario con rol `OPERARIO` envía
  `PATCH /api/purchase-orders/:id/confirmar`
- **THEN** el sistema responde `403` con `{ "error": "..." }` y el estado de
  la orden no cambia

#### Scenario: Confirmar una orden que no está en BORRADOR
- **WHEN** un `ADMIN` envía `PATCH /api/purchase-orders/:id/confirmar` sobre
  una orden en estado `CONFIRMADA` o `CANCELADA`
- **THEN** el sistema responde `409` con un mensaje claro indicando que la
  orden no está en `BORRADOR`, y el estado no cambia

#### Scenario: Confirmar una orden inexistente
- **WHEN** se envía `PATCH /api/purchase-orders/:id/confirmar` con un `id`
  que no corresponde a ninguna orden
- **THEN** el sistema responde `404` con `{ "error": "..." }`

#### Scenario: Sin token
- **WHEN** se envía `PATCH /api/purchase-orders/:id/confirmar` sin header
  `Authorization`
- **THEN** el sistema responde `401` con `{ "error": "No autenticado" }`

### Requirement: Cancelación de una orden es exclusiva de ADMIN
El sistema SHALL exponer `PATCH /api/purchase-orders/:id/cancelar`,
accesible SOLO a `ADMIN`, que transiciona una orden de `BORRADOR` a
`CANCELADA`. Solo SHALL poder cancelarse una orden que esté en `BORRADOR`.

#### Scenario: Cancelación exitosa
- **WHEN** un `ADMIN` envía `PATCH /api/purchase-orders/:id/cancelar` sobre
  una orden en estado `BORRADOR`
- **THEN** el sistema responde `200` con la orden en `data` con
  `estado: "CANCELADA"`

#### Scenario: OPERARIO intenta cancelar
- **WHEN** un usuario con rol `OPERARIO` envía
  `PATCH /api/purchase-orders/:id/cancelar`
- **THEN** el sistema responde `403` con `{ "error": "..." }` y el estado de
  la orden no cambia

#### Scenario: Cancelar una orden que no está en BORRADOR
- **WHEN** un `ADMIN` envía `PATCH /api/purchase-orders/:id/cancelar` sobre
  una orden en estado `CONFIRMADA` o `CANCELADA`
- **THEN** el sistema responde `409` con un mensaje claro indicando que la
  orden no está en `BORRADOR`, y el estado no cambia

#### Scenario: Sin token
- **WHEN** se envía `PATCH /api/purchase-orders/:id/cancelar` sin header
  `Authorization`
- **THEN** el sistema responde `401` con `{ "error": "No autenticado" }`

### Requirement: El asistente solo puede crear borradores, nunca confirmar ni tocar stock
El sistema SHALL exponer al asistente conversacional (CU09) una tool de
function calling que, a partir de una sugerencia de reposición ya calculada
por código (CU10, agrupada por proveedor), cree una `OrdenCompra` en estado
`BORRADOR` con origen `ASISTENTE`, usando la misma vía de autorización
(`ADMIN` u `OPERARIO`) que la creación manual. La tool SHALL validar los
datos contra el mismo contrato que `POST /api/purchase-orders` y SHALL
devolver el `id` del borrador creado. La tool NUNCA SHALL tener la capacidad
de confirmar ni cancelar una orden, ni de crear o modificar ningún
`StockMovement` — ninguna instrucción del usuario dentro de la conversación
SHALL poder hacer que la tool ejecute esas acciones, porque el asistente no
tiene ninguna función expuesta para hacerlo. Tras crear el borrador, la
respuesta del asistente al usuario SHALL indicar que se dejó un borrador
para revisar, y NUNCA SHALL indicar que la compra fue confirmada o
realizada.

#### Scenario: El asistente invoca la tool y aparece un borrador con origen ASISTENTE
- **WHEN** durante una conversación el asistente decide invocar la tool de
  creación de borrador con un proveedor y productos/cantidades derivados de
  una sugerencia de reposición ya calculada
- **THEN** aparece una nueva `OrdenCompra` con `estado: "BORRADOR"` y
  `origen: "ASISTENTE"`, visible tanto en `GET /api/purchase-orders` como en
  `GET /api/purchase-orders/:id`, y la respuesta del asistente al usuario
  comunica que dejó un borrador para revisar (no que confirmó una compra)

#### Scenario: La tool no puede confirmar ni modificar stock aunque se le pida
- **WHEN** un usuario le pide al asistente, dentro de la conversación, que
  "confirme la compra" o "ingrese el stock" de un borrador
- **THEN** el asistente no ejecuta ninguna acción de confirmación ni de
  modificación de stock (no existe tool disponible para eso), como máximo
  puede crear o dejar un nuevo `BORRADOR`, y le informa al usuario que la
  confirmación es una acción humana que debe hacer un `ADMIN` desde el
  sistema

#### Scenario: La tool recibe datos inválidos
- **WHEN** el resultado de la sugerencia de reposición pasado a la tool
  incluye un proveedor o producto que ya no existe, o una cantidad menor o
  igual a `0`
- **THEN** la tool rechaza la operación (mismo criterio de validación que
  `POST /api/purchase-orders`) y no se crea ninguna `OrdenCompra`
