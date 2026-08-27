# test_purchase_orders_tool.py
# Tests de la tool crear_borrador_orden (CU10, autonomia acotada).
# No requieren Chroma ni un LLM real: mockean requests.post para verificar
# que la tool solo llama a POST /api/purchase-orders/assistant, nunca a un
# endpoint de confirmar/cancelar/stock.

import inspect
from unittest.mock import MagicMock, patch

import chat
import purchase_orders_tool as pot

FORBIDDEN_URL_FRAGMENTS = (
    "/confirmar",
    "/cancelar",
    "/stock/entries",
    "/stock/sales",
    "/movimientos",
)


class FakeResponse:
    def __init__(self, status_code, payload=None):
        self.status_code = status_code
        self._payload = payload or {}

    def json(self):
        return self._payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise Exception(f"HTTP {self.status_code}")


def test_crear_borrador_orden_llama_al_endpoint_assistant_y_propaga_el_id():
    with patch("purchase_orders_tool.requests.post") as mock_post:
        mock_post.return_value = FakeResponse(
            201, {"data": {"id": "order-123", "estado": "BORRADOR"}}
        )

        resultado = pot.crear_borrador_orden(
            proveedor_id="supplier-1",
            items=[{"productoId": "product-1", "cantidadSugerida": 5}],
            auth_token="jwt-valido",
        )

        assert resultado == {"ok": True, "orderId": "order-123"}
        mock_post.assert_called_once()
        called_url = mock_post.call_args.args[0]
        called_kwargs = mock_post.call_args.kwargs
        assert called_url == f"{pot.NEST_API_URL}/purchase-orders/assistant"
        assert called_kwargs["headers"]["Authorization"] == "Bearer jwt-valido"
        assert called_kwargs["json"] == {
            "proveedorId": "supplier-1",
            "items": [{"productoId": "product-1", "cantidadSugerida": 5}],
        }


def test_crear_borrador_orden_sin_auth_token_no_llama_al_backend():
    with patch("purchase_orders_tool.requests.post") as mock_post:
        resultado = pot.crear_borrador_orden(
            proveedor_id="supplier-1",
            items=[{"productoId": "product-1", "cantidadSugerida": 5}],
            auth_token=None,
        )

        assert resultado["ok"] is False
        mock_post.assert_not_called()


def test_crear_borrador_orden_rechaza_datos_invalidos_sin_fingir_exito():
    with patch("purchase_orders_tool.requests.post") as mock_post:
        mock_post.return_value = FakeResponse(
            400, {"error": "El proveedor indicado no existe"}
        )

        resultado = pot.crear_borrador_orden(
            proveedor_id="supplier-inexistente",
            items=[{"productoId": "product-1", "cantidadSugerida": 5}],
            auth_token="jwt-valido",
        )

        assert resultado == {
            "ok": False,
            "error": "El proveedor indicado no existe",
        }


def test_crear_borrador_orden_backend_caido_no_lanza_excepcion():
    import requests as requests_module

    with patch("purchase_orders_tool.requests.post") as mock_post:
        mock_post.side_effect = requests_module.exceptions.ConnectionError()

        resultado = pot.crear_borrador_orden(
            proveedor_id="supplier-1",
            items=[{"productoId": "product-1", "cantidadSugerida": 5}],
            auth_token="jwt-valido",
        )

        assert resultado["ok"] is False


def test_get_restock_suggestion_sin_token_devuelve_none_sin_llamar_al_backend():
    with patch("purchase_orders_tool.requests.post") as mock_post:
        assert pot.get_restock_suggestion(None) is None
        mock_post.assert_not_called()


def test_get_restock_suggestion_llama_al_endpoint_de_reposicion():
    with patch("purchase_orders_tool.requests.post") as mock_post:
        mock_post.return_value = FakeResponse(
            200, {"data": {"groups": [], "totalProducts": 0}}
        )

        suggestion = pot.get_restock_suggestion("jwt-valido")

        assert suggestion == {"groups": [], "totalProducts": 0}
        called_url = mock_post.call_args.args[0]
        assert called_url == f"{pot.NEST_API_URL}/restock/suggest"


def test_el_modulo_de_la_tool_no_referencia_ningun_endpoint_prohibido():
    """La tool solo puede crear BORRADORES. Esta prueba verifica, sobre el
    codigo fuente real (no solo sobre lo que se ejecuta en un test puntual),
    que no existe ninguna URL de confirmar/cancelar/stock alcanzable desde
    este modulo — ni aunque el LLM lo pida en la conversacion."""
    source = inspect.getsource(pot)
    for fragment in FORBIDDEN_URL_FRAGMENTS:
        assert fragment not in source, (
            f"purchase_orders_tool.py no debe referenciar '{fragment}': "
            "la tool del asistente no puede confirmar ordenes ni tocar stock"
        )


def test_el_schema_de_tools_expuesto_al_llm_solo_incluye_crear_borrador_orden():
    """chat.py solo debe bindear la tool crear_borrador_orden al LLM. Si en
    el futuro se agrega otra tool de purchase-orders, esta prueba obliga a
    revisar explicitamente que no sea confirmar/cancelar."""
    source = inspect.getsource(chat)
    assert "bind_tools" in source
    # El unico schema de tool referenciado en chat.py debe ser el de
    # crear_borrador_orden.
    assert "CREATE_DRAFT_TOOL_SCHEMA" in source
    for fragment in FORBIDDEN_URL_FRAGMENTS:
        assert fragment not in source


def test_ejecutar_tool_calls_ignora_llamadas_a_tools_desconocidas():
    """Si el LLM alucinara un tool_call con un nombre distinto (p. ej. uno
    que sugiera confirmar), _ejecutar_tool_calls no debe ejecutar nada: solo
    reconoce el nombre exacto de la tool de creacion de borradores."""
    with patch("purchase_orders_tool.requests.post") as mock_post:
        tool_calls = [
            {
                "id": "call-1",
                "name": "confirmar_orden_de_compra",
                "args": {"id": "order-1"},
            }
        ]

        mensajes = chat._ejecutar_tool_calls(tool_calls, auth_token="jwt-valido")

        assert mensajes == []
        mock_post.assert_not_called()


def test_menciona_reposicion_detecta_pedidos_de_orden_de_compra():
    assert chat._menciona_reposicion("necesito hacer un pedido de reposición")
    assert chat._menciona_reposicion("dejame un borrador de orden de compra")
    assert not chat._menciona_reposicion("¿cuál es el stock mínimo de un producto?")


def test_formatear_sugerencia_reposicion_incluye_ids_reales():
    suggestion = {
        "groups": [
            {
                "supplierId": "supplier-1",
                "supplierName": "Ferretería del Sur",
                "items": [
                    {
                        "productId": "product-1",
                        "code": "COD-1",
                        "name": "Martillo",
                        "suggestedQuantity": 5,
                    }
                ],
            }
        ]
    }

    texto = chat._formatear_sugerencia_reposicion(suggestion)

    assert "supplier-1" in texto
    assert "product-1" in texto
    assert "5" in texto


def test_formatear_sugerencia_reposicion_vacia_devuelve_texto_vacio():
    assert chat._formatear_sugerencia_reposicion({"groups": []}) == ""
