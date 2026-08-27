## Why

CU10 (búsqueda semántica de productos y sugerencia de reposición) es parte del
módulo de IA obligatorio del TP y todavía no tiene implementación: el catálogo
solo se puede consultar por coincidencia literal de texto (`gestion-productos`
CU05, `name`/`code` exactos o `contains`), lo que falla cuando el operario
describe lo que busca con palabras que no aparecen en el nombre del producto
(p. ej. "pintura blanca lavable para interior" no encuentra "Látex Interior
Blanco 20L"). Tampoco existe ninguna ayuda para decidir qué reponer: hoy hay
que revisar el listado con filtro `lowStock=true` producto por producto. El
groundwork ya existe: `gestion-productos` emite `product.created/updated/deleted`
sin listener (`EventsModule`) a la espera de este change.

## What Changes

- Nuevo servicio Python de indexación semántica (reutiliza el patrón de
  `/chatbot`: FastAPI + ChromaDB) que mantiene una colección con un documento
  por producto activo (`nombre + descripción + categoría + proveedor`) y sus
  embeddings de `sentence-transformers`.
- Listener NestJS sobre `product.created`/`product.updated` que indexa o
  reindexa el producto, y sobre `product.deleted` que lo quita del índice
  (baja lógica ⇒ fuera de resultados semánticos). Comando de reindexado
  completo (script/CLI) para la carga inicial y para recuperarse de
  desincronizaciones.
- Nuevo endpoint `GET /api/products/semantic?q=...` (`ADMIN` y `OPERARIO`):
  hace proxy de la query al servicio de embeddings, recibe códigos/ids
  ordenados por score y responde con los productos **del sistema** (no texto
  generado por el LLM) en el mismo formato que `GET /api/products`.
- Nuevo endpoint `POST /api/restock/suggest` (`ADMIN` y `OPERARIO`): calcula
  en NestJS/Prisma —por código, a partir del histórico de `StockMovement`
  (consumo promedio del período)— los productos bajo `stockMin` y la cantidad
  sugerida, agrupados por proveedor; el LLM (vía el mismo servicio Python)
  solo redacta el resumen en lenguaje natural del cálculo ya hecho. Es
  puramente informativo: nunca modifica `Product.stock` ni crea movimientos
  (eso sigue siendo CU06 exclusivamente).
- Frontend: buscador semántico en `ProductsPage` (input separado del filtro
  literal existente) y un panel de sugerencia de reposición.

## Capabilities

### New Capabilities

- `busqueda-semantica`: indexación automática del catálogo en ChromaDB
  sincronizada con el ciclo de vida de productos (CU03), búsqueda semántica
  de productos (`GET /api/products/semantic`) y sugerencia de reposición
  calculada por código y agrupada por proveedor (`POST /api/restock/suggest`),
  con redacción del resumen a cargo del LLM sobre datos ya calculados.

### Modified Capabilities

- `gestion-productos`: `POST /api/products` y `PATCH /api/products/:id`
  aceptan un nuevo campo opcional `description` (texto libre, usado como
  insumo del documento indexado para búsqueda semántica) y lo devuelven en
  el producto. Requiere migración Prisma (`Product.description String?`).
  El resto del contrato de `gestion-productos` no cambia; el listener de
  indexación es un consumidor nuevo de los eventos `product.created/updated/deleted`
  que ya emite ese módulo, no una modificación de su comportamiento.

## Impact

- **Nuevo código:** servicio Python de embeddings (`chatbot/` o un nuevo
  directorio hermano, a definir en design.md) con ChromaDB y
  `sentence-transformers`; `backend/src/semantic/` o similar (listener de
  eventos, proxy de búsqueda, cálculo de reposición); frontend: buscador
  semántico + panel de reposición.
- **Config:** nueva URL de servicio (análoga a `CHATBOT_URL`) y, si el
  resumen de reposición reutiliza el LLM de `chatbot`, las variables
  `LLM_PROVIDER`/`LLM_MODEL`/`GROQ_API_KEY` ya existentes.
- **Schema Prisma:** una migración agrega `Product.description String?`
  (opcional, no rompe altas/ediciones existentes sin ese campo). La
  reposición se calcula on-the-fly desde `StockMovement` existente; no se
  persiste ninguna sugerencia ni orden.
- **Non-goals (explícitos en el pedido del usuario):** compra automática,
  generación de órdenes de compra formales (`OrdenCompra`/`BORRADOR`) y
  precios de proveedor. La observación docente sobre function calling para
  borradores de orden de compra (§10 de `.instructions.md`) queda
  deliberadamente fuera de este change y se propondrá aparte cuando exista
  un `purchase-orders` a definir.
- **Restricción dura:** el LLM nunca decide qué ni cuánto reponer ni ejecuta
  la búsqueda por su cuenta; solo redacta texto sobre resultados/cálculos
  producidos por código determinístico.
