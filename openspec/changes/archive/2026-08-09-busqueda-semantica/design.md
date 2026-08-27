## Context

`gestion-productos` ya emite `product.created`/`product.updated`/`product.deleted`
vía `EventEmitter2` (`backend/src/products/products.service.ts`) sin listener.
`chatbot` (CU09) ya corre un servicio Python FastAPI (`chatbot/api.py`) con
ChromaDB persistido en disco y embeddings `sentence-transformers/all-MiniLM-L6-v2`
cargados una sola vez al levantar el proceso (`chat.py: build_chain()`), y el
backend NestJS ya sabe llamarlo por HTTP con `fetch` + `AbortSignal.timeout`
mapeando fallos a `502` (`backend/src/chatbot/chatbot.service.ts`). `Product`
no tiene campo `description` hoy (ver `backend/prisma/schema.prisma`). Ver
`proposal.md` para el detalle de motivación y alcance; ver `specs/` para el
contrato completo.

## Goals / Non-Goals

**Goals:**
- Reusar la infraestructura Python ya desplegada para CU09 (mismo proceso,
  mismo modelo de embeddings) en vez de levantar un segundo servicio.
- Mantener la fuente de verdad de qué productos existen/están activos en
  Postgres, no en ChromaDB — Chroma solo resuelve "qué es semánticamente
  similar", nunca decide si un producto es visible.
- Cálculo de reposición 100% determinístico en Nest/Prisma; el LLM solo
  convierte esos números ya calculados a texto.

**Non-Goals (a nivel de diseño, además de los del proposal):**
- No implementar cola de reintentos persistente para la sincronización del
  índice (fuera de alcance de un TP; el comando de reindexado completo cubre
  la recuperación ante desincronización).
- No optimizar el store vectorial para volumen productivo (el catálogo de un
  TP es chico; Chroma embebido en disco alcanza).

## Decisions

### D1 — Extender el servicio Python existente, no crear uno nuevo
`chatbot/api.py` gana un router `products` con una colección Chroma separada
(`products_catalog`, mismo `persist_directory` que la RAG de negocio pero
`collection_name` distinto para no mezclar documentos). Se reutiliza
`CHATBOT_URL`/`CHATBOT_TIMEOUT_MS` — no hace falta una URL/puerto nuevos.
**Alternativa descartada:** microservicio Python aparte — duplicaría la carga
del modelo de embeddings (costo de memoria/arranque) y el manejo de errores
502 ya resuelto, sin beneficio real a esta escala.

### D2 — Documentos indexados por `id` (UUID), no por `code`
El documento Chroma de cada producto usa `id` (inmutable) como identificador
del documento y guarda `code`, `name`, `description`, `category`, `supplier`
como metadata/contenido. `code` es editable (mismas reglas de unicidad que
hoy), así que indexar por `code` obligaría a borrar+recrear el documento en
cada cambio de código. Indexar por `id` evita ese caso especial: un
`product.updated` siempre hace upsert sobre el mismo id de documento.

### D3 — Defensa en profundidad: el índice nunca es la fuente de verdad de qué mostrar
`GET /api/products/semantic` no devuelve directamente lo que dice Chroma.
Flujo: (1) Nest pide al servicio Python los `id` ordenados por score con
`similarity_search_with_relevance_scores` + `score_threshold` (filtra baja
relevancia → `data: []` cuando no hay nada relevante); (2) Nest resuelve esos
`id` contra Postgres con `Product.findMany({ where: { id: { in }, deletedAt: null } })`
usando el mismo `productSelect`/`lowStock` que `GET /api/products`, y
reordena el resultado según el orden de score recibido. Así, aunque el
listener de sincronización tenga lag o falle, un producto dado de baja
**nunca** puede aparecer en la respuesta — el filtro `deletedAt: null` de
Postgres es la última palabra, no el índice.

### D4 — Listener de eventos no bloqueante y sin propagar fallos
`@OnEvent('product.created')`/`updated`/`deleted` en un listener del nuevo
módulo `semantic` hacen `try/catch` alrededor de la llamada HTTP al servicio
Python y solo loguean el error (`Logger.warn`) sin relanzarlo. Como
`ProductsService` ya emite con `eventEmitter.emit()` (fire-and-forget, sin
`await`), un fallo del listener no afecta la respuesta HTTP del alta/edición;
el `try/catch` evita además un unhandled promise rejection si el handler es
`async`.

### D5 — Comando de reindexado completo como script Nest, no en Python
El reindexado completo (`npm run reindex:semantic` en `/backend`) es un
script que arranca un `NestApplicationContext` mínimo, lee todos los
productos activos vía Prisma (misma fuente que usa el resto del sistema) y
llama a un endpoint bulk del servicio Python (`POST /products/index/bulk`)
que reemplaza el contenido completo de la colección `products_catalog`.
**Alternativa descartada:** que Python lea Postgres directamente — duplicaría
credenciales de DB y lógica de "qué es un producto activo" en dos lenguajes.

### D6 — Cálculo de reposición: agregación por producto, no N+1
`POST /api/restock/suggest` (módulo `semantic`, sección `restock`) hace:
1. Una query para productos activos con `stock <= stockMin` (con proveedor).
2. Una agregación (`prisma.stockMovement.groupBy`) de `SUM(quantity)` tipo
   `VENTA` en los últimos `RESTOCK_PERIOD_DAYS` (env, default `30`) para
   exactamente esos `productId`, en una sola query — mismo patrón anti-N+1
   usado en `dashboard` (D1 de ese change).
3. Por producto: `avgDailyConsumption = totalVendido / RESTOCK_PERIOD_DAYS`;
   `suggestedQuantity = max(ceil(avgDailyConsumption * RESTOCK_LEAD_DAYS), stockMin - stock, 1)`
   (env `RESTOCK_LEAD_DAYS`, default `15`). Sin historial de ventas,
   `avgDailyConsumption = 0` y la fórmula cae al mínimo para llegar a
   `stockMin` (cubre el escenario "sin historial de ventas" de la spec).
4. Agrupación en memoria por `supplierId`.
5. Envío del resultado estructurado (grupos + cantidades, no la pregunta del
   usuario ni acceso a la DB) al servicio Python (`POST /restock/summary`)
   para que el LLM redacte el resumen. Si esa llamada falla, se arma un
   resumen de respaldo sin LLM (interpolando los mismos números) y se
   responde igual `200` — la sugerencia nunca depende de que el LLM esté
   disponible.

### D7 — Migración Prisma: `Product.description String?`
Campo opcional para no romper productos existentes ni el DTO actual. Se
agrega a `CreateProductDto`/`UpdateProductDto` como opcional, se incluye en
`productSelect` y se documenta en `specs/gestion-productos` (delta MODIFIED,
ver `specs/gestion-productos/spec.md` de este change).

## Risks / Trade-offs

- [Índice desincronizado si el listener falla repetidamente] → Mitigado por
  D3 (Postgres siempre filtra baja lógica en la respuesta final) y por el
  comando de reindexado completo (D5) como recuperación manual.
- [El LLM podría redactar un resumen que no refleje fielmente los números] →
  Prompt restringido a "usá solo estos datos" sin RAG ni tools, y fallback
  determinístico (D6.5) si el LLM no está disponible. No hay verificación
  automática de fidelidad numérica del texto — riesgo residual aceptado para
  el alcance del TP.
- [Compartir el proceso Python de `chatbot` acopla la disponibilidad de
  búsqueda semántica a la del asistente conversacional] → Aceptable: ambos
  son parte del mismo "módulo de IA" del TP y ya comparten infraestructura;
  un caído del servicio Python ya se traduce a `502` en ambos casos con el
  mismo patrón.
- [Migración de `description` sobre una tabla con productos existentes] →
  Campo opcional (`String?`), no requiere backfill.

## Migration Plan

1. Migración Prisma: agregar `Product.description String?`.
2. Extender `chatbot/api.py` con el router `products` (index/bulk/search) y
   `restock/summary`, y `chatbot/requirements.txt` ya trae `chromadb` y
   `sentence-transformers` (reusados de CU09, sin dependencias nuevas).
3. Nuevo módulo NestJS `semantic`: listener de eventos, `GET /api/products/semantic`,
   `POST /api/restock/suggest`, cliente HTTP hacia el servicio Python.
4. Script `npm run reindex:semantic` y ejecución manual post-deploy para la
   carga inicial del índice sobre el catálogo ya existente.
5. Frontend: buscador semántico en `ProductsPage` + panel de reposición.
6. Rollback: todo el change es aditivo (nuevo campo opcional, nuevos
   endpoints, nuevo módulo); revertir es quitar el módulo `semantic`, el
   router Python y la migración (`description` puede quedar sin uso sin
   romper nada existente).
