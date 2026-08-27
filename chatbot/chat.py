# chat.py
# Chat RAG por consola con persistencia de conversaciones en JSON.
# Soporta modo interactivo, modo pregunta-unica (CLI) y uso como libreria desde api.py.
#
# Flujo por cada pregunta:
#   Pregunta -> Embedding -> Busqueda en ChromaDB (top-k) -> Contexto + Historial + Prompt -> LLM -> Respuesta

import os
import json
import uuid
import warnings
from dotenv import load_dotenv

load_dotenv()

warnings.filterwarnings("ignore", module="urllib3")

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_ollama import ChatOllama
from langchain_groq import ChatGroq
from langchain_core.messages import ToolMessage
from langchain_core.prompts import ChatPromptTemplate

import purchase_orders_tool

CHROMA_DIR = "./chroma_db"
CONVERSATIONS_DIR = "./conversaciones"

# Cantidad de mensajes (pregunta+respuesta intercalados) que se envian al LLM
# como historial. Configurable por entorno para no desbordar la ventana de
# contexto del modelo (obligacion docente: memoria acotada, nunca historial
# completo sin limite). Default 10 = mismo comportamiento que el [-10:] original.
HISTORY_WINDOW = int(os.getenv("CHAT_HISTORY_WINDOW", "10"))

# El prompt incluye {history} para mantener el hilo de la conversacion
PROMPT_TEMPLATE = """Eres un asistente que responde preguntas usando exclusivamente el contexto proporcionado.
Si la pregunta no puede responderse con el contexto, respondé explícitamente que no contás
con esa información. No inventes datos que no estén en el contexto.

Si el contexto incluye datos de reposición con proveedorId/productoId y tenés
disponible la herramienta "crear_borrador_orden", podés usarla para dejar un
BORRADOR de orden de compra si el usuario lo pide, usando EXACTAMENTE esos
ids (nunca inventes uno). Esa herramienta solo crea un borrador: jamás
confirma una compra ni modifica el stock, y vos tampoco tenés ninguna otra
herramienta para hacerlo. Si el usuario te pide "confirmar" la compra o
"ingresar" el stock, explicale que eso lo tiene que hacer un ADMIN desde el
sistema — vos como mucho podés dejar (o volver a dejar) un borrador para que
lo revise. Después de crear un borrador, decile al usuario que le dejaste un
borrador para revisar; nunca digas que confirmaste o realizaste una compra.

Contexto:
{context}

Historial de la conversacion:
{history}

Pregunta: {question}

Respuesta util y precisa basada en el contexto:"""

# Palabras que sugieren que la pregunta puede implicar generar una orden de
# reposicion. Es solo un filtro para no llamar a /restock/suggest en cada
# mensaje: si no matchea, el asistente simplemente no tiene la tool
# disponible para esa respuesta (no puede inventar ids sin datos reales).
RESTOCK_KEYWORDS = (
    "reposic",
    "reponer",
    "repone",
    "orden de compra",
    "pedido",
    "comprar",
    "compra a",
    "abastec",
    "stock bajo",
    "falta stock",
    "borrador",
)


def _menciona_reposicion(question: str) -> bool:
    lowered = question.lower()
    return any(keyword in lowered for keyword in RESTOCK_KEYWORDS)


def _formatear_sugerencia_reposicion(suggestion: dict) -> str:
    """Convierte la respuesta de POST /api/restock/suggest en texto plano
    con los ids reales, para que el LLM los pueda copiar en la tool."""
    groups = suggestion.get("groups") or []
    if not groups:
        return ""

    lines = ["Sugerencia de reposición disponible (ids reales, no inventar otros):"]
    for group in groups:
        supplier_id = group.get("supplierId")
        supplier_name = group.get("supplierName")
        lines.append(f'- Proveedor "{supplier_name}" (proveedorId: {supplier_id}):')
        for item in group.get("items", []):
            lines.append(
                f"  - {item.get('name')} (código {item.get('code')}, "
                f"productoId: {item.get('productId')}): "
                f"cantidad sugerida {item.get('suggestedQuantity')}"
            )
    return "\n".join(lines)


# ---- Funciones de persistencia (JSON) ----

def crear_conversacion(user_id=None):
    """Crea una conversacion nueva con un UUID unico."""
    conv = {
        "conversation_id": str(uuid.uuid4()),
        "user_id": user_id,
        "messages": [],
    }
    guardar_conversacion(conv)
    return conv


def cargar_conversacion(conversation_id):
    """Carga una conversacion existente desde su archivo JSON."""
    path = os.path.join(CONVERSATIONS_DIR, f"{conversation_id}.json")
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def guardar_conversacion(conv):
    """Guarda la conversacion a disco como JSON."""
    os.makedirs(CONVERSATIONS_DIR, exist_ok=True)
    path = os.path.join(CONVERSATIONS_DIR, f"{conv['conversation_id']}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(conv, f, indent=2, ensure_ascii=False)


def formatear_historial(messages):
    """Convierte la lista de mensajes en texto para el prompt."""
    lines = []
    for msg in messages:
        role = "Usuario" if msg["role"] == "user" else "Asistente"
        lines.append(f"{role}: {msg['content']}")
    return "\n".join(lines)


def formatear_contexto(docs):
    return "\n\n".join(d.page_content for d in docs)


# ---- Funcion para crear el LLM segun configuracion ----

def get_llm():
    provider = os.getenv("LLM_PROVIDER", "ollama").lower()

    if provider == "groq":
        return ChatGroq(
            # llama-3.3-70b-versatile es el reemplazo oficial (no deprecado)
            # de llama3-70b-8192, pero Groq lo pasó a tier Enterprise
            # (requiere plan pago) — no disponible con keys de tier gratuito.
            # openai/gpt-oss-120b es el modelo de uso general disponible en
            # el tier gratuito al momento de este change.
            model=os.getenv("LLM_MODEL", "openai/gpt-oss-120b"),
            temperature=0,
            api_key=os.getenv("GROQ_API_KEY"),
        )

    return ChatOllama(
        model=os.getenv("LLM_MODEL", "llama3.2"),
        temperature=0,
    )


# ---- Construccion de la chain (retriever + prompt + llm) ----
# Extraida del modo CLI para poder reusarla desde api.py sin reconstruirla en cada
# request (carga el modelo de embeddings y el vectorstore una sola vez).

def build_chain(top_k=4):
    """Arma vectorstore + retriever + llm + chain. Lanza FileNotFoundError si
    todavia no se corrio 'python ingest.py' (no existe CHROMA_DIR)."""
    if not os.path.exists(CHROMA_DIR):
        raise FileNotFoundError(
            f"No se encontro la base vectorial en {CHROMA_DIR}. "
            "Ejecuta 'python ingest.py' primero."
        )

    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )
    vectorstore = Chroma(
        embedding_function=embeddings,
        persist_directory=CHROMA_DIR,
    )
    retriever = vectorstore.as_retriever(search_kwargs={"k": top_k})

    llm = get_llm()

    prompt = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)

    return {"retriever": retriever, "llm": llm, "prompt": prompt}


def _ejecutar_tool_calls(tool_calls, auth_token):
    """Ejecuta cada tool_call que pidio el LLM. La unica tool disponible es
    crear_borrador_orden: no hay ninguna otra funcion alcanzable desde aca
    que confirme ordenes o toque stock."""
    tool_messages = []
    for call in tool_calls:
        if call["name"] != purchase_orders_tool.CREAR_BORRADOR_ORDEN_TOOL_NAME:
            continue
        args = call.get("args", {})
        resultado = purchase_orders_tool.crear_borrador_orden(
            proveedor_id=args.get("proveedorId"),
            items=args.get("items", []),
            auth_token=auth_token,
        )
        tool_messages.append(
            ToolMessage(
                content=json.dumps(resultado, ensure_ascii=False),
                tool_call_id=call["id"],
            )
        )
    return tool_messages


def responder(chain, conversation, question, auth_token=None):
    """Ejecuta una pregunta sobre una conversacion y retorna la respuesta.
    Si el contexto incluye una sugerencia de reposicion (CU10) con ids
    reales, el LLM tiene disponible la tool crear_borrador_orden para dejar
    un BORRADOR de orden de compra; nunca puede confirmar ni tocar stock."""
    history = conversation["messages"][-HISTORY_WINDOW:]
    retriever = chain["retriever"]
    llm = chain["llm"]
    prompt = chain["prompt"]

    context = formatear_contexto(retriever.invoke(question))

    restock_context = ""
    if auth_token and _menciona_reposicion(question):
        suggestion = purchase_orders_tool.get_restock_suggestion(auth_token)
        if suggestion:
            restock_context = _formatear_sugerencia_reposicion(suggestion)

    full_context = f"{context}\n\n{restock_context}" if restock_context else context

    messages = prompt.format_messages(
        context=full_context,
        history=formatear_historial(history),
        question=question,
    )

    if restock_context:
        ai_message = llm.bind_tools(
            [purchase_orders_tool.CREATE_DRAFT_TOOL_SCHEMA]
        ).invoke(messages)
    else:
        ai_message = llm.invoke(messages)

    tool_calls = getattr(ai_message, "tool_calls", None)
    if tool_calls:
        tool_messages = _ejecutar_tool_calls(tool_calls, auth_token)
        # El prompt sigue mencionando la tool en texto en este segundo turno
        # (mismos `messages`), y algunos modelos (p. ej. gpt-oss-120b) intentan
        # invocarla de nuevo aunque el resultado ya llegó via ToolMessage. Sin
        # bindear la tool acá, Groq rechaza esa respuesta con 400 ("Tool choice
        # is none, but model called a tool"). Volver a bindearla evita el 400;
        # no se re-ejecuta ningún tool_call de esta segunda respuesta (el
        # borrador ya se creó una sola vez, arriba).
        llm_con_tools = llm.bind_tools(
            [purchase_orders_tool.CREATE_DRAFT_TOOL_SCHEMA]
        )
        final_message = llm_con_tools.invoke(messages + [ai_message] + tool_messages)
        response = (
            final_message.content
            or "Listo, te dejé un borrador de orden de compra para que lo revises."
        )
    else:
        response = ai_message.content

    conversation["messages"].append({"role": "user", "content": question})
    conversation["messages"].append({"role": "assistant", "content": response})
    guardar_conversacion(conversation)

    return response


# ---- CLI ----

if __name__ == "__main__":
    import sys

    # La codificación de stdout depende de la codepage de la consola de
    # Windows (a menudo cp1252, no UTF-8) cuando no es una consola nativa
    # reconocida por Python (p. ej. Git Bash) o cuando la salida está
    # redirigida. Los datos en sí (JSON persistido, respuesta HTTP) ya viajan
    # en UTF-8 correcto; esto solo evita que el print() de esta CLI muestre
    # mojibake en pantalla.
    if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
        sys.stdout.reconfigure(encoding="utf-8")

    import argparse
    parser = argparse.ArgumentParser(description="Chat RAG por consola")
    parser.add_argument("--question", help="Pregunta unica (modo API). Omítelo para modo interactivo.")
    parser.add_argument("--conversation-id", help="ID de conversacion existente para continuar.")
    parser.add_argument("--top-k", type=int, default=4, help="Chunks a recuperar (default: 4)")
    args = parser.parse_args()

    try:
        chain = build_chain(top_k=args.top_k)
    except FileNotFoundError as exc:
        print(str(exc))
        exit(1)

    # Cargar o crear conversacion
    if args.conversation_id:
        conversation = cargar_conversacion(args.conversation_id)
        if not conversation:
            print(f"No se encontro la conversacion '{args.conversation_id}'.")
            exit(1)
    else:
        conversation = crear_conversacion()
        print(f"Nueva conversacion iniciada. ID: {conversation['conversation_id']}")

    # Modo pregunta-unica (para endpoint)
    if args.question:
        respuesta = responder(chain, conversation, args.question)
        print(json.dumps({
            "conversation_id": conversation["conversation_id"],
            "answer": respuesta,
        }, ensure_ascii=False))
        exit(0)

    # Modo interactivo
    print("RAG Chat listo (escribi 'exit' para salir)\n")

    while True:
        question = input("Vos: ").strip()
        if question.lower() in ("exit", "quit", "salir", "chau"):
            break
        if not question:
            continue

        respuesta = responder(chain, conversation, question)

        print("IA: ", end="", flush=True)
        print(respuesta)
