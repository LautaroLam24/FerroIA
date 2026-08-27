# products_index.py
# Indice semantico del catalogo de productos (CU10), separado de la RAG de
# negocio (CU09): misma base vectorial en disco (chroma_db/), coleccion
# distinta ("products_catalog") para no mezclar documentos.
#
# Cada documento = nombre + descripcion + categoria + proveedor de UN
# producto, indexado por su `id` (UUID, inmutable) en vez de por `code`
# (editable) para que una edicion de codigo no requiera borrar+recrear el
# documento.
#
# Nest/Prisma siguen siendo la fuente de verdad de que productos existen y
# estan activos: este modulo solo resuelve similitud semantica.

import os
from typing import Optional

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings

CHROMA_DIR = "./chroma_db"
COLLECTION_NAME = "products_catalog"

SCORE_THRESHOLD = float(os.getenv("SEMANTIC_SCORE_THRESHOLD", "0.2"))
TOP_K = int(os.getenv("SEMANTIC_TOP_K", "10"))

_embeddings = None
_vectorstore = None


def _get_embeddings():
    global _embeddings
    if _embeddings is None:
        _embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
    return _embeddings


def get_vectorstore():
    """Vectorstore del catalogo de productos, construido una sola vez (mismo
    criterio que build_chain() en chat.py: no recargar el modelo de
    embeddings en cada request)."""
    global _vectorstore
    if _vectorstore is None:
        _vectorstore = Chroma(
            collection_name=COLLECTION_NAME,
            embedding_function=_get_embeddings(),
            persist_directory=CHROMA_DIR,
        )
    return _vectorstore


def _document_text(
    name: str, description: Optional[str], category: str, supplier: str
) -> str:
    partes = [name]
    if description:
        partes.append(description)
    partes.append(f"Categoria: {category}")
    partes.append(f"Proveedor: {supplier}")
    return "\n".join(partes)


def index_product(
    product_id: str,
    code: str,
    name: str,
    description: Optional[str],
    category: str,
    supplier: str,
) -> None:
    """Alta o actualizacion (upsert) del documento de un producto activo."""
    vectorstore = get_vectorstore()
    document = Document(
        page_content=_document_text(name, description, category, supplier),
        metadata={"id": product_id, "code": code},
    )
    vectorstore.add_documents(documents=[document], ids=[product_id])


def remove_product(product_id: str) -> None:
    """Baja logica del producto en Postgres: quita su documento del indice
    para que nunca vuelva a aparecer en busquedas semanticas."""
    get_vectorstore().delete(ids=[product_id])


def reindex_bulk(products: list[dict]) -> int:
    """Reemplaza el contenido completo de la coleccion con la lista de
    productos activos recibida (ya filtrada por Nest/Prisma). Uso: carga
    inicial y recuperacion ante desincronizacion."""
    vectorstore = get_vectorstore()
    vectorstore.reset_collection()

    if not products:
        return 0

    documents = [
        Document(
            page_content=_document_text(
                p["name"], p.get("description"), p["category"], p["supplier"]
            ),
            metadata={"id": p["id"], "code": p["code"]},
        )
        for p in products
    ]
    ids = [p["id"] for p in products]
    vectorstore.add_documents(documents=documents, ids=ids)
    return len(products)


def search(query: str, k: Optional[int] = None) -> list[dict]:
    """Busqueda semantica: [{id, score}] ordenado por relevancia
    descendente, descartando resultados por debajo de SCORE_THRESHOLD."""
    vectorstore = get_vectorstore()
    results = vectorstore.similarity_search_with_relevance_scores(
        query, k=k or TOP_K, score_threshold=SCORE_THRESHOLD
    )
    return [{"id": doc.metadata["id"], "score": score} for doc, score in results]
