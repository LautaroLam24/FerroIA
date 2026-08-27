# gestion-productos Specification

## Purpose

Permitir que un usuario con rol `ADMIN` administre el catálogo de productos del
inventario: alta, edición y baja lógica, con validación de código único, precio no
negativo y existencia de categoría/proveedor asociados, preservando siempre el
histórico de movimientos de stock del producto.

## Requirements

### Requirement: Alta de producto
El sistema SHALL exponer `POST /api/products`, restringido a `ADMIN`, que recibe
`name`, `code`, `price`, `stock`, `stockMin`, `categoryId`, `supplierId` y
opcionalmente `description`. `code` SHALL ser único en el sistema. `price`
SHALL ser mayor o igual a `0`. `categoryId` y `supplierId` SHALL corresponder
a una categoría y un proveedor existentes. En éxito SHALL crear el producto y
responder `201` con el producto creado, incluyendo `description` (`null` si
no fue enviada).

#### Scenario: Alta exitosa
- **WHEN** un `ADMIN` envía `POST /api/products` con `name`, `code`, `price`,
  `stock`, `stockMin`, `categoryId` y `supplierId` válidos, y la categoría y el
  proveedor referenciados existen
- **THEN** el sistema responde `201` con
  `{ "data": { "id", "name", "code", "price", "stock", "stockMin", "categoryId", "supplierId", "description", "createdAt" } }`

#### Scenario: Alta con descripción
- **WHEN** un `ADMIN` envía `POST /api/products` con los campos obligatorios
  válidos y además `description` con un texto libre
- **THEN** el sistema responde `201` y el producto creado incluye
  `"description"` con exactamente el texto enviado

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
permite modificar `name`, `code`, `price`, `stock`, `stockMin`, `categoryId`,
`supplierId` y/o `description` de un producto activo. Las mismas reglas de
validación del alta (código único, precio >= 0, categoría y proveedor
existentes) SHALL aplicar. En éxito SHALL responder `200` con el producto
actualizado, incluyendo `description`.

#### Scenario: Edición exitosa
- **WHEN** un `ADMIN` envía `PATCH /api/products/:id` con un `id` de producto
  activo existente y campos válidos
- **THEN** el sistema responde `200` con `{ "data": { ...producto actualizado } }`

#### Scenario: Edición de la descripción
- **WHEN** un `ADMIN` envía `PATCH /api/products/:id` con un `id` de producto
  activo existente y un nuevo valor de `description`
- **THEN** el sistema responde `200` y el producto actualizado refleja el
  nuevo valor de `description`

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
El sistema SHALL exponer `GET /api/products`, accesible para `ADMIN` y
`OPERARIO`, que devuelve los productos activos (`deletedAt: null`) aplicando
filtros combinables por query params y paginación. Los filtros soportados SHALL
ser `name` (coincidencia parcial, case-insensitive, contra el nombre del
producto), `code` (coincidencia exacta), `categoryId`, `supplierId` y
`lowStock=true` (productos con `stock <= stockMin`). Todos los filtros SHALL ser
combinables entre sí y opcionales; sin filtros, SHALL devolver el catálogo
completo de activos. La paginación SHALL aceptar `page` (mayor o igual a 1,
default 1) y `pageSize` (entre 1 y 100, default 10). La respuesta SHALL ser
`200` con `{ "data": [...], "meta": { "total", "page", "pageSize" } }`, donde
`total` es la cantidad de productos que cumplen los filtros (sin considerar la
paginación) y `data` la página correspondiente. Cada producto de `data` SHALL
incluir un indicador de stock bajo mínimo (`stock <= stockMin`) calculado por el
backend. Los productos con `deletedAt` no nulo SHALL quedar excluidos en toda
combinación de filtros. Parámetros de filtro o paginación inválidos SHALL
responder `400` con `{ "error": "..." }`.

#### Scenario: Filtro por nombre (contiene, case-insensitive)
- **WHEN** un `ADMIN` o `OPERARIO` envía `GET /api/products?name=pintura`
- **THEN** el sistema responde `200` y `data` contiene únicamente productos
  activos cuyo nombre incluye "pintura" en cualquier capitalización

#### Scenario: Filtro por código exacto
- **WHEN** un `ADMIN` o `OPERARIO` envía `GET /api/products?code=PIN-100`
- **THEN** el sistema responde `200` y `data` contiene únicamente el producto
  activo con `code` exactamente igual a `PIN-100`

#### Scenario: Filtro por categoría
- **WHEN** un `ADMIN` o `OPERARIO` envía `GET /api/products?categoryId=<id>`
  y existen productos activos de esa categoría
- **THEN** el sistema responde `200` y `data` contiene únicamente los productos
  activos con ese `categoryId`

#### Scenario: Filtro por proveedor
- **WHEN** un `ADMIN` o `OPERARIO` envía `GET /api/products?supplierId=<id>`
  y existen productos activos de ese proveedor
- **THEN** el sistema responde `200` y `data` contiene únicamente los productos
  activos con ese `supplierId`

#### Scenario: Filtro de stock bajo mínimo
- **WHEN** un `ADMIN` o `OPERARIO` envía `GET /api/products?lowStock=true`
- **THEN** el sistema responde `200` y `data` contiene únicamente los productos
  activos con `stock <= stockMin`

#### Scenario: Filtros combinados
- **WHEN** un `ADMIN` o `OPERARIO` envía `GET /api/products` con dos o más
  filtros (por ejemplo `name=pintura&lowStock=true`)
- **THEN** el sistema responde `200` y `data` contiene únicamente los productos
  activos que cumplen todos los filtros simultáneamente

#### Scenario: Búsqueda sin resultados
- **WHEN** un `ADMIN` o `OPERARIO` envía `GET /api/products` con filtros que no
  coinciden con ningún producto activo
- **THEN** el sistema responde `200` con `{ "data": [], "meta": { "total": 0, "page": <página>, "pageSize": <tamaño> } }`

#### Scenario: Paginación con meta correcta
- **WHEN** un `ADMIN` o `OPERARIO` envía `GET /api/products?page=2&pageSize=5`
  y existen más de 5 productos activos que cumplen los filtros
- **THEN** el sistema responde `200` con `data` conteniendo a lo sumo 5
  productos correspondientes a la página 2 y `meta` con `total` igual a la
  cantidad total de activos que cumplen los filtros, `page: 2` y `pageSize: 5`

#### Scenario: Filtro `lowStock` distinto de `true` es inválido
- **WHEN** un `ADMIN` o `OPERARIO` envía `GET /api/products?lowStock=yes`
- **THEN** el sistema responde `400` con `{ "error": "..." }`

#### Scenario: Parámetros de paginación inválidos
- **WHEN** un `ADMIN` o `OPERARIO` envía `GET /api/products` con `page=0`,
  `pageSize=0`, `pageSize=101` o valores no numéricos en `page`/`pageSize`
- **THEN** el sistema responde `400` con `{ "error": "..." }`

#### Scenario: Productos dados de baja excluidos del listado
- **WHEN** un `ADMIN` o `OPERARIO` envía `GET /api/products` (con o sin filtros)
  y existen productos con `deletedAt` no nulo que coinciden con los filtros
- **THEN** el sistema responde `200` y esos productos no aparecen en `data` ni
  se cuentan en `meta.total`

#### Scenario: Listado accesible para ADMIN
- **WHEN** un usuario autenticado con rol `ADMIN` envía `GET /api/products`
- **THEN** el sistema responde `200` con `{ "data": [...], "meta": { ... } }`

#### Scenario: Listado accesible para OPERARIO
- **WHEN** un usuario autenticado con rol `OPERARIO` envía `GET /api/products`
- **THEN** el sistema responde `200` con `{ "data": [...], "meta": { ... } }`

#### Scenario: Sin token
- **WHEN** se envía `GET /api/products` sin header `Authorization`
- **THEN** el sistema responde `401` con `{ "error": "No autenticado" }`

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
