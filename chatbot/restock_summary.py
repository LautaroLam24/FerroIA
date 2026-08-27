# restock_summary.py
# Redaccion en lenguaje natural de una sugerencia de reposicion YA CALCULADA
# por Nest/Prisma (por codigo, agrupada por proveedor). El LLM nunca decide
# que ni cuanto reponer: solo convierte a texto los numeros que recibe en el
# body, sin RAG ni tools.

from typing import Optional

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from chat import get_llm

PROMPT_TEMPLATE = """Sos un asistente que redacta un resumen breve en español para un
encargado de ferretería/pinturería, a partir de datos YA CALCULADOS de
reposición de stock. No inventes productos, proveedores ni cantidades: usá
EXCLUSIVAMENTE los datos provistos abajo.

Cantidad total de productos a reponer: {total_products}

Datos por proveedor:
{groups_text}

Resumen (2 a 4 oraciones, mencioná la cantidad de proveedores y productos):"""


def _format_groups(groups: list[dict]) -> str:
    lines = []
    for group in groups:
        supplier = group.get("supplierName") or "Proveedor sin nombre"
        items = group.get("items", [])
        items_text = ", ".join(
            f"{item['name']} (código {item['code']}): {item['suggestedQuantity']} unidades"
            for item in items
        )
        lines.append(f"- {supplier}: {items_text}")
    return "\n".join(lines)


def summarize(groups: list[dict], total_products: int) -> Optional[str]:
    """Devuelve el resumen redactado por el LLM, o None si no hay nada que
    reponer (el caller decide el mensaje informativo en ese caso)."""
    if not groups:
        return None

    llm = get_llm()
    prompt = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)
    chain = prompt | llm | StrOutputParser()
    return chain.invoke(
        {
            "total_products": total_products,
            "groups_text": _format_groups(groups),
        }
    )
