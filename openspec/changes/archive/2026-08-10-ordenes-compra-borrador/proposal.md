## Why

El equipo docente pidió (`.instructions.md` §10, obs. 3) que el asistente
tenga autonomía acotada: poder generar **borradores** de orden de compra vía
function calling, sin violar la regla de oro del proyecto (el LLM nunca
decide reposición ni modifica stock). Hoy CU10 calcula la sugerencia de
reposición por código (`POST /api/restock/suggest`) pero no existe ningún
modelo `OrdenCompra` ni forma de persistir esa sugerencia como algo accionable
por un humano. Este change cierra el último caso de uso pendiente del TP
(CU10 — parte de function calling) dejado explícitamente fuera de
`busqueda-semantica`.

## What Changes

- Nuevo modelo Prisma `OrdenCompra` (+ `OrdenCompraItem`): proveedor, items
  (producto + cantidad sugerida), estado (`BORRADOR` | `CONFIRMADA` |
  `CANCELADA`), origen (`MANUAL` | `ASISTENTE`), `createdBy`, `createdAt).
  Migración Prisma siguiendo el flujo `migrate diff` (sin TTY en este
  entorno).
- Nuevo módulo NestJS `purchase-orders` (controller + service + DTOs):
  - `POST /api/purchase-orders` (ADMIN, OPERARIO): crea BORRADOR con origen
    MANUAL.
  - `GET /api/purchase-orders` y `GET /api/purchase-orders/:id` (ADMIN,
    OPERARIO): listar/ver.
  - `PATCH /api/purchase-orders/:id/confirmar` (SOLO ADMIN): transición
    humana explícita BORRADOR -> CONFIRMADA. Solo cambia estado, NUNCA
    ingresa stock (el ingreso real sigue siendo CU06 vía
    `movimientos-stock`).
  - `PATCH /api/purchase-orders/:id/cancelar` (SOLO ADMIN): BORRADOR ->
    CANCELADA.
  - Transición inválida (orden que no está en BORRADOR): `409`.
- Tool de function calling `crear_borrador_orden` para el asistente (CU09):
  recibe el resultado ya calculado de reposición (CU10, agrupado por
  proveedor) y crea una `OrdenCompra` en `BORRADOR` con origen `ASISTENTE`
  mediante una llamada autenticada al backend NestJS (reusando el JWT del
  usuario de la conversación, mismo rol que un `POST` manual). La tool valida
  contra el schema, devuelve el id del borrador, y el asistente responde "te
  dejé un borrador de orden para revisar" — nunca "confirmé la compra". La
  tool solo puede invocar la creación de BORRADOR; no tiene acceso a
  confirmar/cancelar ni a ningún endpoint de stock.
- Frontend: pantalla de órdenes de compra con badge de estado, indicador
  visual de origen ASISTENTE, y botones Confirmar/Cancelar visibles solo para
  ADMIN.

## Capabilities

### New Capabilities
- `purchase-orders`: ABM acotado de órdenes de compra (creación manual y por
  asistente en estado BORRADOR, listado, confirmación/cancelación exclusiva
  de ADMIN, sin efecto sobre stock) y la tool de function calling que el
  asistente usa para proponer un borrador a partir del cálculo de reposición
  de CU10.

### Modified Capabilities
(ninguna — no cambia el comportamiento de `busqueda-semantica` ni de
`movimientos-stock`; `purchase-orders` solo lee el resultado ya calculado por
`restock/suggest` y no toca sus requisitos)

## Impact

- **Prisma**: nuevo `schema.prisma` con `OrdenCompra`, `OrdenCompraItem`,
  enums `OrdenCompraEstado`/`OrdenCompraOrigen`; nueva migración.
- **Backend** (`backend/src/purchase-orders/`): controller, service, DTOs,
  module; registrar en `app.module.ts`.
- **Chatbot** (`chatbot/`): nueva tool de function calling en `chat.py` (hoy
  la chain es un pipe RAG simple sin tools — se introduce tool-calling por
  primera vez) + cliente HTTP autenticado hacia el backend NestJS; nuevo
  endpoint interno o extensión de `api.py` para exponer la tool al flujo de
  `/chat`.
- **Backend `chatbot` module**: debe reenviar el JWT del usuario (o un medio
  equivalente de autenticación) hacia el servicio Python para que la tool
  pueda llamar a `POST /api/purchase-orders` respetando roles.
- **Frontend** (`frontend/src/`): nueva pantalla/página de órdenes de compra,
  cliente API, componentes de badge de estado y de origen.
- **Non-goals**: envío real de la orden al proveedor, PDF de la orden,
  precios/costos de compra, recepción de mercadería (eso sigue siendo CU06).
