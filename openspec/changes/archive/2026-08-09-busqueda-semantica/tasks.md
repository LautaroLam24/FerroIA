## 1. Schema

- [x] 1.1 Agregar `Product.description String?` a `backend/prisma/schema.prisma`
- [x] 1.2 Generar la migración con `prisma migrate diff --from-url <DATABASE_URL> --to-schema-datamodel prisma/schema.prisma --script`, escribirla a mano en `prisma/migrations/<timestamp>_add_product_description/migration.sql` y aplicarla con `prisma migrate deploy` (workaround ya usado en `gestion-productos`, ver Decisiones de ESTADO.md)
- [x] 1.3 Agregar `description` opcional a `CreateProductDto`/`UpdateProductDto` y a `productSelect` en `products.service.ts`

## 2. Servicio Python — indexación y búsqueda semántica

- [x] 2.1 Crear `chatbot/products_index.py`: colección Chroma `products_catalog` (mismo `persist_directory`, `collection_name` distinto de la RAG de negocio), reusando `HuggingFaceEmbeddings("sentence-transformers/all-MiniLM-L6-v2")`
- [x] 2.2 Función de upsert por `id` (documento = `name + description + category + supplier`, metadata = `{id, code}`) y función de borrado por `id`
- [x] 2.3 Función de búsqueda con `similarity_search_with_relevance_scores(query, k, score_threshold)` que devuelve `[{id, score}]` ordenado, filtrando por `SEMANTIC_SCORE_THRESHOLD` (env, default `0.2`) y `SEMANTIC_TOP_K` (env, default `10`)
- [x] 2.4 Función de reindexado bulk: vacía la colección `products_catalog` y reinserta la lista completa recibida
- [x] 2.5 Router FastAPI en `chatbot/api.py`: `POST /products/index`, `DELETE /products/index/{id}`, `POST /products/index/bulk`, `GET /products/search?q=&k=`
- [x] 2.6 Endpoint `POST /restock/summary`: recibe `{ groups, totalProducts }` ya calculados y devuelve `{ summary }` redactado por el LLM (`get_llm()` de `chat.py`) con un prompt que solo usa esos datos (sin RAG, sin tools)

## 3. Módulo NestJS `semantic` — sincronización del índice

- [x] 3.1 Crear `backend/src/semantic/semantic.module.ts` con un cliente HTTP hacia el servicio Python (reusa `CHATBOT_URL`/`CHATBOT_TIMEOUT_MS`, mismo patrón `fetch` + `AbortSignal.timeout` que `ChatbotService`)
- [x] 3.2 `semantic-index.service.ts`: métodos `indexProduct(product)`, `removeFromIndex(id)`, `search(q)`, `reindexBulk(products)`
- [x] 3.3 `semantic-index.listener.ts`: `@OnEvent('product.created')`/`updated`/`deleted` que arman el payload (con `category.name`/`supplier.name` vía `include`) y llaman al servicio; `try/catch` que solo loguea (`Logger.warn`) sin relanzar, para no afectar la respuesta del ABM ni generar unhandled rejections
- [x] 3.4 Script `backend/src/semantic/scripts/reindex.ts` (`npm run reindex:semantic`): `NestFactory.createApplicationContext`, lee todos los productos activos vía Prisma y llama a `reindexBulk`

## 4. Búsqueda semántica — endpoint

- [x] 4.1 `GET /api/products/semantic` en un controller del módulo `semantic` (`@Roles(ADMIN, OPERARIO)`), DTO de query con `q` obligatorio no vacío
- [x] 4.2 Service: llama a `semantic-index.service.search(q)`, resuelve los `id` devueltos contra Prisma (`findMany({ where: { id: { in }, deletedAt: null } })`, mismo `productSelect`/`lowStock` que `ProductsService.findAll`) y reordena por el score recibido
- [x] 4.3 Mapear `data: []` cuando no hay resultados relevantes, con mensaje claro; mapear caída del servicio Python a `502` (mismo patrón que `chatbot.service.ts`)

## 5. Sugerencia de reposición — endpoint

- [x] 5.1 `POST /api/restock/suggest` en el módulo `semantic` (`@Roles(ADMIN, OPERARIO)`), sin body requerido
- [x] 5.2 Query de productos activos con `stock <= stockMin` (con `supplier`) + `stockMovement.groupBy` de `SUM(quantity)` tipo `VENTA` de los últimos `RESTOCK_PERIOD_DAYS` (env, default `30`) para esos `productId`, en una sola agregación (sin N+1)
- [x] 5.3 Cálculo de `suggestedQuantity` por producto según la fórmula de `design.md` (D6), usando `RESTOCK_LEAD_DAYS` (env, default `15`); agrupación en memoria por proveedor
- [x] 5.4 Llamado a `POST /restock/summary` del servicio Python con los grupos ya calculados; si falla, generar resumen de respaldo sin LLM y responder igual `200`
- [x] 5.5 Respuesta vacía informativa cuando no hay productos bajo mínimo (sin llamar al servicio Python)

## 6. Variables de entorno

- [x] 6.1 Agregar a `.env.example`: `SEMANTIC_SCORE_THRESHOLD`, `SEMANTIC_TOP_K`, `RESTOCK_PERIOD_DAYS`, `RESTOCK_LEAD_DAYS` (con los defaults de `design.md`)

## 7. Frontend

- [x] 7.1 `frontend/src/api/semantic.ts`: `searchProductsSemantic(q)` y `suggestRestock()`
- [x] 7.2 Buscador semántico en `ProductsPage` (input separado del filtro literal existente, muestra resultados en el mismo formato de tarjeta/fila que el listado normal)
- [x] 7.3 Panel de sugerencia de reposición: grupos por proveedor con cantidades sugeridas y el resumen en texto, estado vacío cuando no hay productos bajo mínimo

## 8. Tests

- [x] 8.1 Unit: `semantic-index.service` (mock `fetch`) y `semantic-index.listener` (verifica que un fallo del servicio Python no relanza)
- [x] 8.2 Unit: cálculo de `suggestedQuantity` (con y sin historial de ventas, agrupación por proveedor) — incluye el caso "sin productos bajo mínimo" con Prisma mockeado
- [x] 8.3 E2E: `GET /api/products/semantic` — resultado por similitud sin coincidencia literal (mock del servicio Python), sin resultados relevantes, producto dado de baja excluido, 401 sin token, 502 si el servicio cae
- [x] 8.4 E2E: `POST /api/restock/suggest` — con productos bajo mínimo agrupados por proveedor (con y sin historial de ventas), 401 sin token, fallback de resumen si el servicio Python falla. El caso "sin productos bajo mínimo" se cubrió a nivel unit (8.2) en vez de e2e: el endpoint no filtra por datos propios y la DB de dev es compartida entre suites, así que asumir una respuesta global vacía sería la misma trampa de assertions no acotadas que ya documenta ESTADO.md para otras suites
- [x] 8.5 E2E: alta/edición de producto con `description` y verificación de que dispara el evento (mock del servicio Python + espera activa a que el listener fire-and-forget complete)

## 9. Verificación

- [x] 9.1 Ejecutar `npx tsc --noEmit && npm run lint && npm run test` en `backend` y `frontend`; confirmar que todo pasa antes de dar el change por terminado — backend: tsc OK, lint OK, unit 96 OK, e2e 135 OK; frontend: tsc OK, lint OK, test 12 OK
