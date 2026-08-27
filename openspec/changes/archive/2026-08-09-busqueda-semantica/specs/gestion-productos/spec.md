## MODIFIED Requirements

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
- **WHEN** un `ADMIN` envía `POST /api/products` con un `code` que ya
  pertenece a otro producto (activo o dado de baja)
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
