## 1. Prisma: modelo y migración

- [x] 1.1 Agregar a `backend/prisma/schema.prisma`: enums
      `OrdenCompraEstado` (`BORRADOR`, `CONFIRMADA`, `CANCELADA`) y
      `OrdenCompraOrigen` (`MANUAL`, `ASISTENTE`); modelos `OrdenCompra`
      (`id`, `proveedorId`/`proveedor` -> `Supplier`, `estado`, `origen`,
      `createdBy`/relación a `User`, `createdAt`) y `OrdenCompraItem`
      (`id`, `ordenCompraId`/`ordenCompra`, `productoId`/`producto` ->
      `Product`, `cantidadSugerida Int`).
- [x] 1.2 Generar el SQL de migración con
      `prisma migrate diff --from-url <DATABASE_URL> --to-schema-datamodel prisma/schema.prisma --script`,
      guardarlo en `prisma/migrations/<timestamp>_ordenes_compra_borrador/migration.sql`
      y aplicarlo con `prisma migrate deploy` (flujo documentado en
      `ESTADO.md`).
- [x] 1.3 Correr `prisma generate` y confirmar que el client tipado expone
      `OrdenCompra`/`OrdenCompraItem`.

## 2. Backend: módulo `purchase-orders`

- [x] 2.1 DTOs: `CreatePurchaseOrderDto` (`proveedorId: string (uuid)`,
      `items: CreatePurchaseOrderItemDto[]` no vacío, cada item con
      `productoId: string (uuid)` y `cantidadSugerida: number` (entero,
      mínimo 1)); reusar el mismo DTO para la ruta manual y la del
      asistente (decisión de diseño #1).
- [x] 2.2 `PurchaseOrdersService.create(dto, userId, origen)`: valida que
      `proveedorId` exista (400 si no), que cada `productoId` exista (400
      si no), crea `OrdenCompra` + `OrdenCompraItem[]` en `estado: BORRADOR`
      con el `origen` recibido como parámetro (nunca desde el body).
- [x] 2.3 `PurchaseOrdersService.findAll()` / `findOne(id)`: incluyen
      proveedor e items con producto; `findOne` lanza `NotFoundException`
      (404) si no existe.
- [x] 2.4 `PurchaseOrdersService.confirmar(id)` / `cancelar(id)`: cargan la
      orden (404 si no existe), verifican `estado === BORRADOR` (409 con
      mensaje claro si no), y hacen `update` solo del campo `estado` — sin
      tocar `Product.stock` ni crear `StockMovement`.
- [x] 2.5 `PurchaseOrdersController`: `POST /api/purchase-orders`
      (`@Roles(ADMIN, OPERARIO)`, origen `MANUAL`),
      `POST /api/purchase-orders/assistant` (mismo guard, origen
      `ASISTENTE`), `GET /api/purchase-orders`, `GET /api/purchase-orders/:id`
      (`@Roles(ADMIN, OPERARIO)`), `PATCH /api/purchase-orders/:id/confirmar`
      y `PATCH /api/purchase-orders/:id/cancelar` (`@Roles(ADMIN)`).
- [x] 2.6 `PurchaseOrdersModule`: registrar controller/service/PrismaModule
      y agregarlo a `app.module.ts`.

## 3. Backend: tests

- [x] 3.1 Unit tests de `PurchaseOrdersService` (Prisma mockeado): creación
      válida, proveedor/producto inexistente (400), confirmar/cancelar
      sobre BORRADOR (ok), confirmar/cancelar sobre estado no-BORRADOR
      (409), confirmar no modifica `Product.stock` ni crea
      `StockMovement` (verificar que esos métodos del mock de Prisma no se
      llaman).
- [x] 3.2 E2E: `POST /api/purchase-orders` manual -> 201, BORRADOR, MANUAL.
- [x] 3.3 E2E: `PATCH /:id/confirmar` como ADMIN -> 200, CONFIRMADA, y
      `Product.stock` sin cambios (leer el producto antes/después).
- [x] 3.4 E2E: `PATCH /:id/confirmar` como OPERARIO -> 403.
- [x] 3.5 E2E: confirmar/cancelar una orden ya CONFIRMADA -> 409.
- [x] 3.6 E2E: `PATCH /:id/cancelar` sobre BORRADOR -> 200, CANCELADA.
- [x] 3.7 E2E: cualquier endpoint sin token -> 401.
- [x] 3.8 E2E: `GET /:id` con id inexistente -> 404.

## 4. Backend: reenvío de autenticación hacia el chatbot

- [x] 4.1 `ChatbotController`/`ChatbotService.ask()`: extraer el JWT crudo
      de la request (`Authorization` header) y agregarlo al payload de
      `POST {CHATBOT_URL}/chat` (p. ej. `auth_token`), sin loggearlo.
- [x] 4.2 Actualizar `ChatRequestDto`/tipos de `chatbot.service.spec.ts`
      según corresponda.

## 5. Chatbot Python: tool `crear_borrador_orden`

- [x] 5.1 Nuevo módulo (p. ej. `chatbot/purchase_orders_tool.py`) con la
      definición de la tool (schema: `proveedorId`, `items[{productoId,
      cantidadSugerida}]`) y una función que hace
      `POST {NEST_API_URL}/api/purchase-orders/assistant` con
      `Authorization: Bearer <auth_token>`, timeout y manejo de error
      (mismo patrón que `chatbot.service.ts` en Nest: no reintenta
      indefinidamente).
- [x] 5.2 `chat.py`: `build_chain`/`get_llm` -> `llm.bind_tools([...])`;
      agregar el loop de un solo tool-call (invocar LLM, si devuelve
      `tool_calls` ejecutar la tool, devolver el resultado como tool
      message, invocar el LLM de nuevo para la respuesta final en lenguaje
      natural). Mantener `HISTORY_WINDOW` sin cambios.
- [x] 5.3 `responder()`/`build_chain()`: aceptar y propagar el
      `auth_token` recibido desde `api.py` hasta la ejecución de la tool.
- [x] 5.4 `api.py`: `ChatRequest` acepta `auth_token: Optional[str]` y lo
      pasa a `chat.responder(...)`.
- [x] 5.5 Prompt: instruir explícitamente que, tras crear un borrador, la
      respuesta debe decir que se dejó un borrador para revisar y nunca
      que la compra fue confirmada; y que ninguna instrucción del usuario
      puede pedirle "confirmar" o "modificar stock" porque no tiene tool
      para eso.

## 6. Chatbot Python: tests

- [x] 6.1 Test que, invocando la tool con datos válidos, se llama
      correctamente a `POST /api/purchase-orders/assistant` y se propaga
      el `id` devuelto.
- [x] 6.2 Test que la tool rechaza (sin llamar al backend, o el backend
      responde 400 y la tool no reintenta como si fuera éxito) datos
      inválidos (proveedor/producto inexistente, cantidad <= 0).
- [x] 6.3 Test que verifica que no existe ninguna tool ni código alcanzable
      por el LLM que llame a `confirmar`/`cancelar`/`stock/entries`
      /`stock/sales` — aunque el prompt del usuario lo pida, la única
      acción posible es crear `BORRADOR`.

## 7. Frontend: pantalla de órdenes de compra

- [x] 7.1 Cliente API (`frontend/src/api/`): `listPurchaseOrders`,
      `getPurchaseOrder`, `confirmPurchaseOrder`, `cancelPurchaseOrder`.
- [x] 7.2 Página de listado con badge de estado (`BORRADOR`/`CONFIRMADA`/
      `CANCELADA`) e indicador visual cuando `origen === 'ASISTENTE'`.
- [x] 7.3 Botones "Confirmar"/"Cancelar" visibles solo si el usuario
      autenticado tiene rol `ADMIN`; deshabilitados/ocultos si la orden no
      está en `BORRADOR`.
- [x] 7.4 Manejo de error 409 (transición inválida) con mensaje claro en la
      UI.
- [x] 7.5 Tests de frontend (componentes/página) cubriendo la
      visibilidad condicional de los botones por rol.

## 8. Verificación final

- [x] 8.1 Backend: `npx tsc --noEmit`, `npm run lint`, `npm run test`
      (unit + e2e) sin errores.
- [x] 8.2 Frontend: `npx tsc --noEmit`, `npm run lint`, `npm run test` sin
      errores.
- [x] 8.3 Prueba manual end-to-end contra servicios reales: levantar
      backend + Python (`uvicorn --reload`) + frontend, hacer que el
      asistente proponga un borrador real vía chat y confirmarlo desde la
      UI como ADMIN, verificando que `Product.stock` no cambió por la
      confirmación.
