## MODIFIED Requirements

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
