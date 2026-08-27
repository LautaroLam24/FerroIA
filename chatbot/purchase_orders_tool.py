# purchase_orders_tool.py
# Tool de function calling para el asistente (CU10, autonomia acotada,
# .instructions.md #10 obs. 3). SOLO puede crear un BORRADOR de orden de
# compra con origen ASISTENTE, llamando a POST /api/purchase-orders/assistant
# en el backend Nest con el JWT del usuario de la conversacion (nunca una
# identidad propia). No existe ninguna funcion en este modulo que confirme,
# cancele o modifique stock: esa es la regla de oro y se sostiene a nivel de
# que endpoints son alcanzables desde aca, no solo de instrucciones al LLM.

import os
from typing import Optional

import requests

NEST_API_URL = os.getenv("NEST_API_URL", "http://localhost:3000/api")
TOOL_TIMEOUT_S = float(os.getenv("PURCHASE_ORDER_TOOL_TIMEOUT_S", "10"))

CREAR_BORRADOR_ORDEN_TOOL_NAME = "crear_borrador_orden"

# Schema de tool-calling (formato OpenAI-compatible, el que esperan
# ChatGroq/ChatOllama via bind_tools). Los parametros son EXACTAMENTE los que
# acepta el DTO del backend (CreatePurchaseOrderDto): el LLM debe copiar los
# ids que ya vio en los datos de reposicion, nunca inventarlos.
CREATE_DRAFT_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": CREAR_BORRADOR_ORDEN_TOOL_NAME,
        "description": (
            "Crea un BORRADOR de orden de compra para un proveedor a partir "
            "de una sugerencia de reposicion YA CALCULADA que te fue provista "
            "como contexto. Usa exclusivamente los valores de proveedorId y "
            "productoId que aparecen en esos datos: nunca inventes un id. "
            "Esta accion NUNCA confirma la orden ni modifica stock: solo deja "
            "un borrador para que un ADMIN lo revise y confirme manualmente."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "proveedorId": {
                    "type": "string",
                    "description": "id del proveedor, tal como aparece en los datos de reposicion",
                },
                "items": {
                    "type": "array",
                    "minItems": 1,
                    "items": {
                        "type": "object",
                        "properties": {
                            "productoId": {
                                "type": "string",
                                "description": "id del producto, tal como aparece en los datos de reposicion",
                            },
                            "cantidadSugerida": {
                                "type": "integer",
                                "minimum": 1,
                            },
                        },
                        "required": ["productoId", "cantidadSugerida"],
                    },
                },
            },
            "required": ["proveedorId", "items"],
        },
    },
}


def get_restock_suggestion(auth_token: Optional[str]) -> Optional[dict]:
    """Pide al backend Nest (CU10) la sugerencia de reposicion YA CALCULADA,
    agrupada por proveedor con ids reales. Devuelve None si no hay token o si
    el backend no responde: sin esto, el LLM no tiene ids reales para usar y
    no debe poder invocar la tool (evita que invente proveedorId/productoId)."""
    if not auth_token:
        return None
    try:
        response = requests.post(
            f"{NEST_API_URL}/restock/suggest",
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=TOOL_TIMEOUT_S,
        )
        response.raise_for_status()
    except requests.RequestException:
        return None
    try:
        return response.json().get("data")
    except ValueError:
        return None


def crear_borrador_orden(
    proveedor_id: str,
    items: list[dict],
    auth_token: Optional[str],
) -> dict:
    """Ejecuta la tool: crea una OrdenCompra en BORRADOR con origen ASISTENTE.
    Es la UNICA accion que esta tool puede realizar sobre ordenes de compra:
    no existe (ni aca ni en ningun otro lugar del modulo Python) una funcion
    que confirme, cancele o toque stock."""
    if not auth_token:
        return {
            "ok": False,
            "error": "No hay una sesión autenticada para crear el borrador",
        }

    try:
        response = requests.post(
            f"{NEST_API_URL}/purchase-orders/assistant",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"proveedorId": proveedor_id, "items": items},
            timeout=TOOL_TIMEOUT_S,
        )
    except requests.RequestException:
        return {
            "ok": False,
            "error": "No se pudo crear el borrador (backend no disponible)",
        }

    if response.status_code == 201:
        try:
            order_id = response.json().get("data", {}).get("id")
        except ValueError:
            order_id = None
        return {"ok": True, "orderId": order_id}

    try:
        detail = response.json().get("error", "Datos inválidos")
    except ValueError:
        detail = "Datos inválidos"
    return {"ok": False, "error": detail}
