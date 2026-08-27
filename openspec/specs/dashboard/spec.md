# dashboard Specification

## Purpose

Consolidar en una sola consulta las métricas de salud del inventario para `ADMIN` y
`OPERARIO`: alertas de stock bajo el mínimo, valorización total del inventario activo y
los últimos movimientos de stock con su producto y usuario.

## Requirements

### Requirement: Consulta del dashboard de inventario
El sistema SHALL exponer `GET /api/dashboard`, accesible a `ADMIN` y `OPERARIO`, que
responde `200` con `{ "data": { "alerts": [...], "totalInventoryValue": <number>, "recentMovements": [...] } }` en una sola respuesta.

#### Scenario: Respuesta completa con datos
- **WHEN** un usuario autenticado (`ADMIN` u `OPERARIO`) envía `GET /api/dashboard`
- **THEN** el sistema responde `200` con `data.alerts`, `data.totalInventoryValue` y `data.recentMovements` presentes, con los tres valores calculados en base al estado actual del inventario

#### Scenario: Sin token
- **WHEN** se envía `GET /api/dashboard` sin header `Authorization`
- **THEN** el sistema responde `401` con `{ "error": "No autenticado" }`

### Requirement: Alertas de stock mínimo
El sistema SHALL incluir en `data.alerts` únicamente los productos activos (`deletedAt` nulo) cuyo `stock` sea menor o igual a su `stockMin`, ordenados de menor a mayor `stock` (mayor urgencia primero). Cada alerta SHALL incluir los datos del producto (identificador, código, nombre, categoría, `stock` y `stockMin`). Si no hay productos en esa condición, `data.alerts` SHALL ser una lista vacía.

#### Scenario: Alertas de productos bajo el mínimo
- **WHEN** existen productos activos con `stock <= stockMin` y se consulta el dashboard
- **THEN** `data.alerts` contiene exactamente esos productos, ordenados por `stock` ascendente, cada uno con su código, nombre, categoría, `stock` y `stockMin`

#### Scenario: Sin productos bajo el mínimo
- **WHEN** ningún producto activo tiene `stock <= stockMin` y se consulta el dashboard
- **THEN** el sistema responde `200` con `data.alerts` como lista vacía

#### Scenario: Producto dado de baja bajo el mínimo no genera alerta
- **WHEN** un producto con `stock <= stockMin` tiene `deletedAt` no nulo y se consulta el dashboard
- **THEN** `data.alerts` no incluye ese producto

### Requirement: Valorización total del inventario
El sistema SHALL incluir en `data.totalInventoryValue` la suma de `price * stock` de todos los productos activos (`deletedAt` nulo). Cuando no haya productos activos, SHALL devolver `0`.

#### Scenario: Valorización incluye solo productos activos
- **WHEN** se consulta el dashboard existiendo productos activos con `price` y `stock` definidos, y al menos un producto con `deletedAt` no nulo
- **THEN** `data.totalInventoryValue` es la suma de `price * stock` de los productos activos únicamente, excluyendo los dados de baja

#### Scenario: Inventario vacío
- **WHEN** no existen productos activos y se consulta el dashboard
- **THEN** el sistema responde `200` con `data.totalInventoryValue` igual a `0`

### Requirement: Movimientos recientes del inventario
El sistema SHALL incluir en `data.recentMovements` los últimos 10 movimientos de stock ordenados por `date` descendente (más reciente primero). Cada movimiento SHALL incluir sus datos propios (tipo, cantidad, razón, fecha) junto con el producto asociado y el usuario que lo registró. Si no hay movimientos, `data.recentMovements` SHALL ser una lista vacía.

#### Scenario: Últimos diez movimientos con producto y usuario
- **WHEN** se consulta el dashboard existiendo más de 10 movimientos
- **THEN** `data.recentMovements` contiene exactamente los 10 más recientes ordenados por `date` descendente, cada uno con su producto y su usuario incluidos

#### Scenario: Sin movimientos registrados
- **WHEN** no existen movimientos de stock y se consulta el dashboard
- **THEN** el sistema responde `200` con `data.recentMovements` como lista vacía
