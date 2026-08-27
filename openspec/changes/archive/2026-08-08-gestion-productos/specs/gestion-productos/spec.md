## Purpose

Permitir que un usuario con rol `ADMIN` administre el catálogo de productos del
inventario: alta, edición y baja lógica, con validación de código único, precio no
negativo y existencia de categoría/proveedor asociados, preservando siempre el
histórico de movimientos de stock del producto.

## ADDED Requirements

### Requirement: Alta de producto
El sistema SHALL exponer `POST /api/products`, restringido a `ADMIN`, que recibe
`name`, `code`, `price`, `stock`, `stockMin`, `categoryId` y `supplierId`. `code`
SHALL ser único en el sistema. `price` SHALL ser mayor o igual a `0`. `categoryId`
y `supplierId` SHALL corresponder a una categoría y un proveedor existentes. En
éxito SHALL crear el producto y responder `201` con el producto creado.

#### Scenario: Alta exitosa
- **WHEN** un `ADMIN` envía `POST /api/products` con `name`, `code`, `price`,
  `stock`, `stockMin`, `categoryId` y `supplierId` válidos, y la categoría y el
  proveedor referenciados existen
- **THEN** el sistema responde `201` con
  `{ "data": { "id", "name", "code", "price", "stock", "stockMin", "categoryId", "supplierId", "createdAt" } }`

#### Scenario: Código duplicado
- **WHEN** un `ADMIN` envía `POST /api/products` con un `code` que ya pertenece a
  otro producto (activo o dado de baja)
- **THEN** el sistema responde `409` con `{ "error": "Ya existe un producto con ese código" }`
  y no crea ningún producto

#### Scenario: Categoría inexistente
- **WHEN** un `ADMIN` envía `POST /api/products` con un `categoryId` que no
  corresponde a ninguna categoría existente
- **THEN** el sistema responde `400` con `{ "error": "La categoría indicada no existe" }`
  y no crea ningún producto

#### Scenario: Proveedor inexistente
- **WHEN** un `ADMIN` envía `POST /api/products` con un `supplierId` que no
  corresponde a ningún proveedor existente
- **THEN** el sistema responde `400` con `{ "error": "El proveedor indicado no existe" }`
  y no crea ningún producto

#### Scenario: Precio negativo
- **WHEN** un `ADMIN` envía `POST /api/products` con `price` menor a `0`
- **THEN** el sistema responde `400` con `{ "error": "...", "details": [...] }` y no
  crea ningún producto

#### Scenario: Campos desconocidos
- **WHEN** un `ADMIN` envía `POST /api/products` con campos no esperados por el DTO
- **THEN** el sistema responde `400` (whitelist estricta) y no crea ningún producto

#### Scenario: Sin token
- **WHEN** se envía `POST /api/products` sin header `Authorization`
- **THEN** el sistema responde `401` con `{ "error": "No autenticado" }`

#### Scenario: Rol insuficiente
- **WHEN** un usuario autenticado con rol `OPERARIO` envía `POST /api/products`
- **THEN** el sistema responde `403` con `{ "error": "No autorizado" }`

### Requirement: Edición de producto
El sistema SHALL exponer `PATCH /api/products/:id`, restringido a `ADMIN`, que
permite modificar `name`, `code`, `price`, `stock`, `stockMin`, `categoryId` y/o
`supplierId` de un producto activo. Las mismas reglas de validación del alta
(código único, precio >= 0, categoría y proveedor existentes) SHALL aplicar. En
éxito SHALL responder `200` con el producto actualizado.

#### Scenario: Edición exitosa
- **WHEN** un `ADMIN` envía `PATCH /api/products/:id` con un `id` de producto
  activo existente y campos válidos
- **THEN** el sistema responde `200` con `{ "data": { ...producto actualizado } }`

#### Scenario: Producto inexistente o dado de baja
- **WHEN** un `ADMIN` envía `PATCH /api/products/:id` con un `id` que no
  corresponde a ningún producto activo (inexistente o ya dado de baja)
- **THEN** el sistema responde `404` con `{ "error": "Producto no encontrado" }`

#### Scenario: Código duplicado en edición
- **WHEN** un `ADMIN` envía `PATCH /api/products/:id` con un `code` que ya
  pertenece a otro producto distinto del editado
- **THEN** el sistema responde `409` con `{ "error": "Ya existe un producto con ese código" }`
  y no modifica el producto

#### Scenario: Categoría o proveedor inexistente en edición
- **WHEN** un `ADMIN` envía `PATCH /api/products/:id` con un `categoryId` o
  `supplierId` que no corresponde a ninguna categoría o proveedor existente
- **THEN** el sistema responde `400` con `{ "error": "..." }` y no modifica el producto

#### Scenario: Precio negativo en edición
- **WHEN** un `ADMIN` envía `PATCH /api/products/:id` con `price` menor a `0`
- **THEN** el sistema responde `400` con `{ "error": "...", "details": [...] }` y no
  modifica el producto

#### Scenario: Sin token
- **WHEN** se envía `PATCH /api/products/:id` sin header `Authorization`
- **THEN** el sistema responde `401` con `{ "error": "No autenticado" }`

#### Scenario: Rol insuficiente
- **WHEN** un usuario autenticado con rol `OPERARIO` envía `PATCH /api/products/:id`
- **THEN** el sistema responde `403` con `{ "error": "No autorizado" }`

### Requirement: Listado de productos
El sistema SHALL exponer `GET /api/products`, restringido a `ADMIN`, que devuelve
los productos activos (`deletedAt: null`), cada uno con un indicador de stock bajo
mínimo (`stock <= stockMin`) calculado por el backend.

#### Scenario: Listado exitoso con indicador de stock bajo
- **WHEN** un `ADMIN` envía `GET /api/products` y existen productos activos, con
  al menos uno cuyo `stock` es menor o igual a su `stockMin`
- **THEN** el sistema responde `200` con `{ "data": [...] }` y cada producto de la
  lista incluye un campo que indica si su stock está en o por debajo del mínimo

#### Scenario: Productos dados de baja excluidos del listado
- **WHEN** un `ADMIN` envía `GET /api/products` y existen productos con
  `deletedAt` no nulo
- **THEN** el sistema responde `200` y esos productos no aparecen en `data`

#### Scenario: Sin token
- **WHEN** se envía `GET /api/products` sin header `Authorization`
- **THEN** el sistema responde `401` con `{ "error": "No autenticado" }`

#### Scenario: Rol insuficiente
- **WHEN** un usuario autenticado con rol `OPERARIO` envía `GET /api/products`
- **THEN** el sistema responde `403` con `{ "error": "No autorizado" }`

### Requirement: Baja lógica de producto
El sistema SHALL exponer `DELETE /api/products/:id`, restringido a `ADMIN`, que
da de baja lógica al producto (`deletedAt` con fecha actual) y responde `204` sin
cuerpo. El producto y sus movimientos de stock (`StockMovement`) NUNCA se borran
físicamente. Un `:id` inexistente o de un producto ya dado de baja SHALL responder
`404`.

#### Scenario: Baja exitosa
- **WHEN** un `ADMIN` envía `DELETE /api/products/:id` con un `id` de un producto
  activo existente que tiene movimientos de stock asociados
- **THEN** el sistema responde `204` sin cuerpo, el producto queda con `deletedAt`
  no nulo, deja de aparecer en `GET /api/products`, y sus registros de
  `StockMovement` permanecen intactos y siguen existiendo en la base sin
  modificación alguna

#### Scenario: Producto inexistente
- **WHEN** un `ADMIN` envía `DELETE /api/products/:id` con un `id` que no
  corresponde a ningún producto activo
- **THEN** el sistema responde `404` con `{ "error": "Producto no encontrado" }`

#### Scenario: Baja de producto ya dado de baja
- **WHEN** un `ADMIN` envía `DELETE /api/products/:id` sobre un producto que ya
  tiene `deletedAt` no nulo
- **THEN** el sistema responde `404` con `{ "error": "Producto no encontrado" }`

#### Scenario: Sin token
- **WHEN** se envía `DELETE /api/products/:id` sin header `Authorization`
- **THEN** el sistema responde `401` con `{ "error": "No autenticado" }`

#### Scenario: Rol insuficiente
- **WHEN** un usuario autenticado con rol `OPERARIO` envía `DELETE /api/products/:id`
- **THEN** el sistema responde `403` con `{ "error": "No autorizado" }`

### Requirement: Restricción de movimientos sobre producto dado de baja
Ningún registro de movimiento de stock (entrada o venta) SHALL poder crearse
referenciando un producto con `deletedAt` no nulo, independientemente del
endpoint que lo origine (a implementar en el change de stock, CU06/CU07). Esta
restricción SHALL responder `409` y no persistir ningún cambio.

#### Scenario: Movimiento sobre producto dado de baja
- **WHEN** se intenta registrar un movimiento de stock (entrada o venta)
  referenciando un `productId` cuyo producto tiene `deletedAt` no nulo
- **THEN** el sistema responde `409` con `{ "error": "El producto está dado de baja" }`
  y no persiste ningún movimiento ni modifica el stock
