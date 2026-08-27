# movimientos-stock Specification

## Purpose

Registrar de forma transaccional las entradas y ventas de stock de productos, manteniendo
`Product.stock` siempre consistente con el historial inmutable de `StockMovement`, incluso
bajo ventas concurrentes sobre el último stock disponible.

## Requirements

### Requirement: Registro de entrada de stock
El sistema SHALL exponer `POST /api/stock/entries`, accesible a `ADMIN` y `OPERARIO`, que
recibe `productId`, `quantity` (entero mayor a `0`), `reason` y opcionalmente `date`. En la
misma transacción SHALL crear un `StockMovement` de tipo `ENTRADA` e incrementar
`Product.stock` en `quantity`. `productId` SHALL corresponder a un producto activo
(`deletedAt` nulo). En éxito SHALL responder `201` con el movimiento creado.

#### Scenario: Entrada exitosa
- **WHEN** un usuario autenticado (`ADMIN` u `OPERARIO`) envía `POST /api/stock/entries`
  con `productId` de un producto activo, `quantity` positiva y `reason`
- **THEN** el sistema responde `201` con el `StockMovement` creado (tipo `ENTRADA`) y el
  `stock` del producto queda incrementado exactamente en `quantity`

#### Scenario: Cantidad inválida
- **WHEN** se envía `POST /api/stock/entries` con `quantity` menor o igual a `0`
- **THEN** el sistema responde `400` con `{ "error": "...", "details": [...] }` y no crea
  ningún movimiento ni modifica el stock

#### Scenario: Producto inexistente
- **WHEN** se envía `POST /api/stock/entries` con un `productId` que no corresponde a
  ningún producto
- **THEN** el sistema responde `404` con `{ "error": "Producto no encontrado" }` y no crea
  ningún movimiento

#### Scenario: Producto dado de baja
- **WHEN** se envía `POST /api/stock/entries` con un `productId` de un producto con
  `deletedAt` no nulo
- **THEN** el sistema responde `409` con `{ "error": "El producto está dado de baja" }` y
  no crea ningún movimiento ni modifica el stock

#### Scenario: Sin token
- **WHEN** se envía `POST /api/stock/entries` sin header `Authorization`
- **THEN** el sistema responde `401` con `{ "error": "No autenticado" }`

### Requirement: Registro de venta de stock
El sistema SHALL exponer `POST /api/stock/sales`, accesible a `ADMIN` y `OPERARIO`, que
recibe `productId`, `quantity` (entero mayor a `0`) y opcionalmente `reason`/`date`. DENTRO
de la misma transacción SHALL validar que el producto esté activo y que su `stock` sea
mayor o igual a `quantity` mediante una escritura condicional que evite condiciones de
carrera entre ventas concurrentes; si la condición no se cumple, SHALL abortar sin
persistir ningún cambio y responder `409`. En éxito SHALL crear un `StockMovement` de tipo
`VENTA`, decrementar `Product.stock` en `quantity` en la misma transacción, y responder
`201` con el movimiento creado.

#### Scenario: Venta exitosa
- **WHEN** un usuario autenticado (`ADMIN` u `OPERARIO`) envía `POST /api/stock/sales` con
  `productId` de un producto activo cuyo `stock` es mayor o igual a `quantity`
- **THEN** el sistema responde `201` con el `StockMovement` creado (tipo `VENTA`) y el
  `stock` del producto queda decrementado exactamente en `quantity`

#### Scenario: Cantidad mayor al stock disponible
- **WHEN** se envía `POST /api/stock/sales` con `quantity` mayor al `stock` actual del
  producto
- **THEN** el sistema responde `409` con `{ "error": "Stock insuficiente" }`, no crea
  ningún movimiento, y el `stock` del producto queda sin modificar

#### Scenario: Dos ventas concurrentes agotan el último stock
- **WHEN** dos solicitudes `POST /api/stock/sales` llegan en paralelo para el mismo
  producto con `stock` actual `1`, cada una pidiendo `quantity: 1`
- **THEN** exactamente una responde `201` (crea el `StockMovement` y deja el `stock` en
  `0`) y la otra responde `409` con `{ "error": "Stock insuficiente" }` sin crear
  movimiento; el `stock` final del producto SHALL ser `0`, nunca negativo, y SHALL existir
  exactamente un `StockMovement` de tipo `VENTA` para ese producto en esa ventana

#### Scenario: Cantidad inválida
- **WHEN** se envía `POST /api/stock/sales` con `quantity` menor o igual a `0`
- **THEN** el sistema responde `400` con `{ "error": "...", "details": [...] }` y no crea
  ningún movimiento ni modifica el stock

#### Scenario: Producto inexistente
- **WHEN** se envía `POST /api/stock/sales` con un `productId` que no corresponde a
  ningún producto
- **THEN** el sistema responde `404` con `{ "error": "Producto no encontrado" }` y no crea
  ningún movimiento

#### Scenario: Producto dado de baja
- **WHEN** se envía `POST /api/stock/sales` con un `productId` de un producto con
  `deletedAt` no nulo
- **THEN** el sistema responde `409` con `{ "error": "El producto está dado de baja" }` y
  no crea ningún movimiento ni modifica el stock

#### Scenario: Sin token
- **WHEN** se envía `POST /api/stock/sales` sin header `Authorization`
- **THEN** el sistema responde `401` con `{ "error": "No autenticado" }`

### Requirement: Listado de movimientos de stock
El sistema SHALL exponer `GET /api/stock/movements`, accesible a `ADMIN` y `OPERARIO`, que
devuelve los movimientos de stock ordenados por `date` descendente. SHALL aceptar filtros
opcionales y combinables `productId` (movimientos de un producto específico), `from` y
`to` (rango de fechas inclusive sobre `date`). Sin filtros SHALL devolver el historial
completo.

#### Scenario: Listado sin filtros
- **WHEN** un usuario autenticado (`ADMIN` u `OPERARIO`) envía `GET /api/stock/movements`
- **THEN** el sistema responde `200` con `{ "data": [...] }` incluyendo todos los
  movimientos existentes, ordenados por fecha descendente

#### Scenario: Filtro por producto
- **WHEN** se envía `GET /api/stock/movements?productId=<id>`
- **THEN** el sistema responde `200` y `data` contiene únicamente movimientos de ese
  producto

#### Scenario: Filtro por rango de fechas
- **WHEN** se envía `GET /api/stock/movements?from=<fecha>&to=<fecha>`
- **THEN** el sistema responde `200` y `data` contiene únicamente movimientos cuya `date`
  está dentro del rango, inclusive

#### Scenario: Sin token
- **WHEN** se envía `GET /api/stock/movements` sin header `Authorization`
- **THEN** el sistema responde `401` con `{ "error": "No autenticado" }`

### Requirement: Inmutabilidad de los movimientos de stock
El sistema SHALL NOT exponer ninguna operación de modificación o borrado sobre
`StockMovement`: no existe `PUT`, `PATCH` ni `DELETE` para movimientos de stock bajo
ninguna circunstancia.

#### Scenario: No existe endpoint de modificación ni borrado
- **WHEN** se envía `PUT`, `PATCH` o `DELETE` a `/api/stock/movements/:id` con cualquier
  `:id`
- **THEN** el sistema responde `404` (la ruta no existe) y ningún `StockMovement` se
  modifica ni se elimina
