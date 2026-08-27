## Purpose

Permitir encontrar productos del catálogo por similitud de significado (no solo
coincidencia literal de texto) y ofrecer una sugerencia de reposición calculada
por código a partir del histórico de movimientos, agrupada por proveedor, con
el LLM limitado a redactar el resumen de un cálculo ya hecho por el sistema.

## ADDED Requirements

### Requirement: Indexación automática ante alta o edición de producto
Cuando se crea o edita un producto activo (`POST /api/products`,
`PATCH /api/products/:id`), el sistema SHALL indexar (o reindexar) de forma
asíncrona un documento del producto compuesto por `name`, `description` (si
existe), categoría y proveedor, con su embedding correspondiente, de modo que
quede disponible para búsqueda semántica. Un fallo de indexación NO SHALL
afectar la respuesta del alta/edición del producto (el ABM de productos sigue
respondiendo `201`/`200` normalmente aunque la indexación falle o esté
demorada).

#### Scenario: Producto recién creado queda indexado
- **WHEN** un `ADMIN` da de alta un producto con `POST /api/products`
- **THEN** dentro de un tiempo razonable ese producto aparece entre los
  resultados de `GET /api/products/semantic` para una consulta relacionada con
  su nombre, descripción, categoría o proveedor

#### Scenario: Producto editado actualiza su documento indexado
- **WHEN** un `ADMIN` edita el `name`, la descripción, la categoría o el
  proveedor de un producto con `PATCH /api/products/:id`
- **THEN** las búsquedas semánticas posteriores reflejan los datos
  actualizados del producto, no los anteriores a la edición

### Requirement: Remoción del índice ante baja lógica de producto
Cuando un producto se da de baja lógicamente (`DELETE /api/products/:id`), el
sistema SHALL quitar su documento del índice semántico. Un producto dado de
baja NUNCA SHALL aparecer en resultados de `GET /api/products/semantic`.

#### Scenario: Producto dado de baja no aparece en resultados semánticos
- **WHEN** un producto fue indexado previamente y luego un `ADMIN` lo da de
  baja con `DELETE /api/products/:id`
- **THEN** una búsqueda semántica que antes lo recuperaba deja de incluirlo
  en `data`, incluso si la consulta coincide fuertemente con su nombre o
  descripción

### Requirement: Reindexado completo del catálogo
El sistema SHALL proveer un comando de reindexado completo, ejecutable fuera
del flujo HTTP normal, que recorre todos los productos activos (`deletedAt`
nulo) y reconstruye el índice semántico desde cero. El comando SHALL excluir
los productos dados de baja del índice resultante.

#### Scenario: Carga inicial del índice
- **WHEN** se ejecuta el comando de reindexado completo sobre una base con
  productos activos y productos dados de baja
- **THEN** al finalizar, el índice contiene un documento por cada producto
  activo y ninguno de los productos dados de baja

### Requirement: Búsqueda semántica de productos
El sistema SHALL exponer `GET /api/products/semantic?q=...`, accesible a
`ADMIN` y `OPERARIO`, que recibe una consulta en lenguaje natural (`q`,
obligatoria y no vacía) y responde con productos del sistema —no texto
generado por el LLM— ordenados por score de similitud descendente, en el
mismo formato de producto que devuelve `GET /api/products` (incluyendo el
indicador de stock bajo). Solo SHALL incluir productos activos
(`deletedAt` nulo). Si ningún resultado supera un umbral mínimo de
relevancia, SHALL responder `200` con `data` vacío y un mensaje explicativo.

#### Scenario: Búsqueda por descripción funcional recupera el producto correcto
- **WHEN** un `ADMIN` u `OPERARIO` envía
  `GET /api/products/semantic?q=pintura blanca lavable para interior` y el
  catálogo indexado incluye un producto de nombre "Látex Interior Blanco 20L"
  cuya descripción/categoría corresponde a pintura lavable de interior
- **THEN** el sistema responde `200` y ese producto aparece en `data`, aunque
  ninguna palabra de la consulta coincida literalmente con su `name`

#### Scenario: Consulta sin resultados relevantes
- **WHEN** se envía `GET /api/products/semantic?q=<consulta sin relación con
  ningún producto indexado>`
- **THEN** el sistema responde `200` con `{ "data": [], "message": "..." }`
  indicando de forma clara que no se encontraron productos relevantes, sin
  inventar resultados

#### Scenario: Producto dado de baja excluido
- **WHEN** se envía una consulta que semánticamente coincide con un producto
  cuyo `deletedAt` no es nulo
- **THEN** el sistema responde `200` y ese producto no aparece en `data`

#### Scenario: Consulta faltante o vacía
- **WHEN** se envía `GET /api/products/semantic` sin `q` o con `q` vacío/en
  blanco
- **THEN** el sistema responde `400` con `{ "error": "...", "details": [...] }`

#### Scenario: Accesible para ADMIN y OPERARIO
- **WHEN** un usuario autenticado con rol `ADMIN` o `OPERARIO` envía
  `GET /api/products/semantic?q=<consulta válida>`
- **THEN** el sistema responde `200` con `{ "data": [...] }`

#### Scenario: Sin token
- **WHEN** se envía `GET /api/products/semantic?q=<consulta>` sin header
  `Authorization`
- **THEN** el sistema responde `401` con `{ "error": "No autenticado" }`

#### Scenario: Servicio de embeddings no disponible
- **WHEN** el servicio de indexación/búsqueda semántica no responde o
  responde con error, y un usuario autenticado envía
  `GET /api/products/semantic?q=<consulta>`
- **THEN** el sistema responde `502` con `{ "error": "..." }` sin exponer
  detalles internos de la conexión fallida

### Requirement: Sugerencia de reposición agrupada por proveedor
El sistema SHALL exponer `POST /api/restock/suggest`, accesible a `ADMIN` y
`OPERARIO`, que identifica —por código, con cálculo hecho en el backend a
partir de `Product.stock`, `Product.stockMin` y el histórico de
`StockMovement` (consumo promedio del período)— los productos activos con
`stock <= stockMin`, calcula una cantidad sugerida de reposición para cada
uno y agrupa el resultado por proveedor. El LLM SHALL usarse únicamente para
redactar un resumen en lenguaje natural de ese cálculo ya realizado; el
resumen SHALL ser consistente con los datos numéricos devueltos y NUNCA SHALL
ser la fuente de las cantidades o de qué productos incluir. La operación es
puramente informativa: NUNCA SHALL modificar `Product.stock` ni crear
`StockMovement` ni ninguna orden de compra.

#### Scenario: Sugerencia con productos bajo mínimo
- **WHEN** un `ADMIN` u `OPERARIO` envía `POST /api/restock/suggest` y
  existen productos activos de más de un proveedor con `stock <= stockMin`
- **THEN** el sistema responde `200` con los productos agrupados por
  proveedor, cada uno con una cantidad sugerida mayor a `0` calculada por
  código a partir de su historial de movimientos, y un resumen en texto
  redactado por el LLM que refleja esos mismos datos; `Product.stock` no
  cambia como resultado de esta llamada

#### Scenario: Producto bajo mínimo sin historial de ventas
- **WHEN** un producto activo tiene `stock <= stockMin` pero no tiene ningún
  `StockMovement` de tipo `VENTA` en el período considerado
- **THEN** el sistema igual lo incluye en la sugerencia, con una cantidad
  calculada para llevar el stock al menos hasta `stockMin`

#### Scenario: Sin productos bajo mínimo
- **WHEN** un `ADMIN` u `OPERARIO` envía `POST /api/restock/suggest` y ningún
  producto activo tiene `stock <= stockMin`
- **THEN** el sistema responde `200` con una respuesta vacía e informativa
  (sin grupos de proveedor) y un resumen que indica que no hay productos que
  requieran reposición

#### Scenario: Sin token
- **WHEN** se envía `POST /api/restock/suggest` sin header `Authorization`
- **THEN** el sistema responde `401` con `{ "error": "No autenticado" }`

#### Scenario: Redacción del LLM no disponible
- **WHEN** el cálculo de reposición se completa correctamente pero el
  servicio de LLM encargado de redactar el resumen no responde o falla
- **THEN** el sistema responde `200` con los datos calculados (grupos por
  proveedor y cantidades) y un resumen de respaldo generado sin LLM,
  indicando que el resumen narrativo no está disponible; la sugerencia
  NUNCA SHALL perderse por una falla del LLM
