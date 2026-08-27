## Why

El sistema tiene productos (CU03) pero ninguna forma de registrar entradas de mercadería
(CU06) ni ventas (CU07): el stock de `Product` nunca cambia desde que se creó. Sin esto no
hay control real de inventario, y el indicador de "stock bajo mínimo" del catálogo nunca
refleja la realidad. Es además la parte más sensible del sistema: dos ventas concurrentes
sobre el último stock disponible no pueden dejar el stock en negativo.

## What Changes

- Nuevo módulo `stock` (backend NestJS), accesible a `ADMIN` y `OPERARIO`:
  - `POST /api/stock/entries`: registra una entrada (`StockMovement` tipo `ENTRADA`) e
    incrementa `Product.stock` en la misma transacción. Requiere `productId`, `quantity`
    (> 0), `reason` (motivo) y admite `date` opcional.
  - `POST /api/stock/sales`: registra una venta (`StockMovement` tipo `VENTA`) y decrementa
    `Product.stock` en la misma transacción, validando disponibilidad DENTRO de
    `prisma.$transaction` con un update condicional (`stock >= quantity`) para que dos
    ventas concurrentes sobre el último stock no puedan dejarlo negativo: la que pierde la
    carrera recibe `409 "Stock insuficiente"` sin persistir ningún cambio.
  - `GET /api/stock/movements`: listado de movimientos, filtrable por `productId` y rango
    de fechas (`from`/`to`), sin límite de rol adicional (ambos roles pueden consultar).
  - Ambos endpoints de escritura rechazan con `409` cualquier movimiento sobre un producto
    con `deletedAt` no nulo — el contrato ya quedó especificado en el requirement
    "Restricción de movimientos sobre producto dado de baja" de `gestion-productos`; este
    change lo implementa.
  - Los movimientos son inmutables: no hay `PUT`/`PATCH`/`DELETE` sobre `StockMovement`.
- No hay cambios de schema: `StockMovement` (`type`, `quantity`, `reason`, `date`,
  `productId`, `userId`) y `Product.stock` ya existen en Prisma desde el bootstrap inicial.
- Frontend: formulario de entrada, formulario de venta, y listado de movimientos con
  filtro por producto y rango de fechas, bajo `RequireRole` que acepte ambos roles.

## Capabilities

### New Capabilities
- `movimientos-stock`: registro transaccional de entradas y ventas de stock, con control
  de concurrencia sobre disponibilidad, y consulta del historial de movimientos.

### Modified Capabilities
(ninguna — `gestion-productos` no cambia sus requirements; este change implementa el
contrato de rechazo `409` que esa spec ya declaró para movimientos sobre productos dados
de baja)

## Impact

- **Backend**: nuevo `backend/src/stock/` (module, controller, service, DTOs
  `create-entry.dto.ts` / `create-sale.dto.ts` / query DTO para el listado). Sin
  migración Prisma nueva.
- **Frontend**: nuevo `frontend/src/features/stock/` (formularios de entrada/venta,
  listado de movimientos con filtros), cliente API en `frontend/src/api/stock.ts`.
- **Specs**: nueva `openspec/specs/movimientos-stock/spec.md`.
- **Non-goals**: devoluciones, ajustes de inventario (correcciones manuales de stock sin
  movimiento asociado), facturación.
