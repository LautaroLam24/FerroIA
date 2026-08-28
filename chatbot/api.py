# api.py
# Envuelve chat.py en un servicio FastAPI para que el backend NestJS (modulo
# `chatbot`) pueda consumir el asistente RAG por HTTP.
#
# POST /chat { question, conversation_id?, user_id? } -> { conversation_id, answer }

import os
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel

import chat
import products_index
import restock_summary

# Este servicio no tiene su propio control de acceso por usuario (esa lógica
# vive en Nest, vía JwtAuthGuard/RolesGuard). Sin este chequeo, cualquiera que
# alcance el puerto 8001 en la red podría llamar /chat u otros endpoints
# directamente, sin pasar por Nest. Si la env var no está seteada, TODAS las
# requests se rechazan (fail-closed) en vez de aceptar cualquier cosa.
INTERNAL_TOKEN = os.getenv("CHATBOT_INTERNAL_TOKEN")


def verify_internal_token(x_internal_token: Optional[str] = Header(default=None)) -> None:
    if not INTERNAL_TOKEN or x_internal_token != INTERNAL_TOKEN:
        raise HTTPException(status_code=401, detail="No autorizado")


app = FastAPI(
    title="Chatbot RAG - Ferreteria/Pinturería",
    dependencies=[Depends(verify_internal_token)],
)

# La chain (retriever + prompt + llm) se arma una sola vez al levantar el
# servicio, no en cada request (evita recargar el modelo de embeddings).
_chain = None


@app.on_event("startup")
def load_chain():
    global _chain
    _chain = chat.build_chain()


class ChatRequest(BaseModel):
    question: str
    conversation_id: Optional[str] = None
    user_id: Optional[str] = None
    # JWT del usuario autenticado, reenviado por Nest. Permite que la tool
    # crear_borrador_orden llame al backend con la misma autorización
    # (roles) que tendría un POST manual - nunca una identidad de servicio.
    auth_token: Optional[str] = None


class ChatResponse(BaseModel):
    conversation_id: str
    answer: str


@app.post("/chat", response_model=ChatResponse)
def post_chat(body: ChatRequest):
    if body.conversation_id:
        conversation = chat.cargar_conversacion(body.conversation_id)
        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversación no encontrada")
        owner = conversation.get("user_id")
        if owner and owner != body.user_id:
            # No confirmar que la conversación existe: mismo 404 que "no
            # encontrada" para no filtrar ids ajenos (evita IDOR).
            raise HTTPException(status_code=404, detail="Conversación no encontrada")
        if body.user_id and not owner:
            conversation["user_id"] = body.user_id
    else:
        conversation = chat.crear_conversacion(user_id=body.user_id)

    answer = chat.responder(_chain, conversation, body.question, body.auth_token)

    return ChatResponse(conversation_id=conversation["conversation_id"], answer=answer)


# ---- Indice semantico de productos (CU10) ----
# Nest llama a estos endpoints ante cada alta/edicion/baja de producto
# (sincronizacion del indice) y ante una busqueda semantica. Nest sigue
# siendo la fuente de verdad de que productos existen y estan activos.


class ProductIndexRequest(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str] = None
    category: str
    supplier: str


class ProductBulkRequest(BaseModel):
    products: list[ProductIndexRequest]


class IndexStatusResponse(BaseModel):
    indexed: int


class SemanticSearchResult(BaseModel):
    id: str
    score: float


class SemanticSearchResponse(BaseModel):
    results: list[SemanticSearchResult]


@app.post("/products/index", response_model=IndexStatusResponse)
def post_product_index(body: ProductIndexRequest):
    products_index.index_product(
        product_id=body.id,
        code=body.code,
        name=body.name,
        description=body.description,
        category=body.category,
        supplier=body.supplier,
    )
    return IndexStatusResponse(indexed=1)


@app.delete("/products/index/{product_id}", response_model=IndexStatusResponse)
def delete_product_index(product_id: str):
    products_index.remove_product(product_id)
    return IndexStatusResponse(indexed=0)


@app.post("/products/index/bulk", response_model=IndexStatusResponse)
def post_products_index_bulk(body: ProductBulkRequest):
    count = products_index.reindex_bulk([p.model_dump() for p in body.products])
    return IndexStatusResponse(indexed=count)


@app.get("/products/search", response_model=SemanticSearchResponse)
def get_products_search(q: str, k: Optional[int] = None):
    if not q or not q.strip():
        raise HTTPException(status_code=400, detail="El parámetro 'q' es obligatorio")
    results = products_index.search(q, k=k)
    return SemanticSearchResponse(
        results=[SemanticSearchResult(**r) for r in results]
    )


# ---- Resumen de reposicion (CU10) ----
# El calculo (que productos, cuanta cantidad, agrupado por proveedor) llega
# ya hecho desde Nest/Prisma; este endpoint solo redacta el texto.


class RestockItem(BaseModel):
    code: str
    name: str
    suggestedQuantity: int


class RestockGroup(BaseModel):
    supplierId: str
    supplierName: str
    items: list[RestockItem]


class RestockSummaryRequest(BaseModel):
    groups: list[RestockGroup]
    totalProducts: int


class RestockSummaryResponse(BaseModel):
    summary: str


@app.post("/restock/summary", response_model=RestockSummaryResponse)
def post_restock_summary(body: RestockSummaryRequest):
    summary = restock_summary.summarize(
        groups=[g.model_dump() for g in body.groups],
        total_products=body.totalProducts,
    )
    if summary is None:
        summary = "No hay productos bajo el stock mínimo en este momento; no se requiere reposición."
    return RestockSummaryResponse(summary=summary)
