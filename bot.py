"""
Bot de atencion al cliente — Suchel Proquimia
--------------------------------------------
Da la bienvenida, muestra catalogo y fichas tecnicas, dirige a la tienda
online, responde preguntas frecuentes y ofrece atencion al cliente.

Los productos y las FAQ se cargan desde productos.json y faq.json:
se pueden editar sin tocar este archivo.

Config por variables de entorno (ver .env.example):
  BOT_TOKEN        -> token de BotFather (obligatorio)
  TIENDA_URL       -> URL de la tienda online
  ADMIN_CHAT_ID    -> chat/grupo donde llegan las consultas de clientes (opcional)
  CONTACTO_TEXTO   -> texto de contacto alternativo (WhatsApp/telefono, opcional)
"""

import json
import logging
import os
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

from telegram import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Update,
)
from telegram.constants import ParseMode
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

# --------------------------------------------------------------------------- #
# Configuracion
# --------------------------------------------------------------------------- #
BASE_DIR = Path(__file__).resolve().parent

BOT_TOKEN = os.environ.get("BOT_TOKEN", "").strip()
TIENDA_URL = os.environ.get("TIENDA_URL", "https://tienda.suchelproquimia.com/").strip()
ADMIN_CHAT_ID = os.environ.get("ADMIN_CHAT_ID", "").strip()
CONTACTO_TEXTO = os.environ.get(
    "CONTACTO_TEXTO",
    "Escribenos aqui mismo tu consulta y un asesor te respondera lo antes posible.",
).strip()

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

# clave del user_data que marca "el usuario esta escribiendo a atencion al cliente"
MODO_SOPORTE = "esperando_consulta"


# --------------------------------------------------------------------------- #
# Carga de datos (productos y FAQ)
# --------------------------------------------------------------------------- #
def cargar_json(nombre: str) -> dict:
    ruta = BASE_DIR / nombre
    with open(ruta, "r", encoding="utf-8") as f:
        return json.load(f)


DATOS = cargar_json("productos.json")
FAQ = cargar_json("faq.json")
ENLACES = cargar_json("enlaces.json")

CATEGORIAS = DATOS.get("categorias", [])
PRODUCTOS = DATOS.get("productos", [])


def productos_de(categoria_id: str):
    return [p for p in PRODUCTOS if p.get("categoria") == categoria_id]


def buscar_producto(pid: str):
    return next((p for p in PRODUCTOS if p.get("id") == pid), None)


def buscar_faq(fid: str):
    return next((f for f in FAQ.get("faq", []) if f.get("id") == fid), None)


# --------------------------------------------------------------------------- #
# Teclados (menus con botones)
# --------------------------------------------------------------------------- #
def menu_principal() -> InlineKeyboardMarkup:
    filas = [
        [InlineKeyboardButton("🛒 Catalogo de productos", callback_data="cat_menu")],
        [InlineKeyboardButton("❓ Preguntas frecuentes", callback_data="faq_menu")],
        [InlineKeyboardButton("🔗 Enlaces y redes", callback_data="enlaces")],
        [InlineKeyboardButton("🏪 Ir a la tienda online", url=TIENDA_URL)],
        [InlineKeyboardButton("💬 Atencion al cliente", callback_data="soporte")],
    ]
    return InlineKeyboardMarkup(filas)


def menu_enlaces() -> InlineKeyboardMarkup:
    filas = [
        [InlineKeyboardButton(e["texto"], url=e["url"])]
        for e in ENLACES.get("enlaces", [])
    ]
    filas.append([InlineKeyboardButton("⬅️ Volver", callback_data="inicio")])
    return InlineKeyboardMarkup(filas)


def menu_categorias() -> InlineKeyboardMarkup:
    filas = []
    for c in CATEGORIAS:
        # solo mostramos categorias que tengan al menos un producto
        if productos_de(c["id"]):
            filas.append(
                [InlineKeyboardButton(c["nombre"], callback_data=f"cat:{c['id']}")]
            )
    filas.append([InlineKeyboardButton("⬅️ Volver", callback_data="inicio")])
    return InlineKeyboardMarkup(filas)


def menu_productos(categoria_id: str) -> InlineKeyboardMarkup:
    filas = [
        [InlineKeyboardButton(p["nombre"], callback_data=f"prod:{p['id']}")]
        for p in productos_de(categoria_id)
    ]
    filas.append([InlineKeyboardButton("⬅️ Volver", callback_data="cat_menu")])
    return InlineKeyboardMarkup(filas)


def menu_ficha(categoria_id: str) -> InlineKeyboardMarkup:
    filas = [
        [InlineKeyboardButton("🏪 Comprar en la tienda", url=TIENDA_URL)],
        [InlineKeyboardButton("⬅️ Volver", callback_data=f"cat:{categoria_id}")],
        [InlineKeyboardButton("🏠 Menu principal", callback_data="inicio")],
    ]
    return InlineKeyboardMarkup(filas)


def menu_faq() -> InlineKeyboardMarkup:
    filas = [
        [InlineKeyboardButton(f["pregunta"], callback_data=f"faq:{f['id']}")]
        for f in FAQ.get("faq", [])
    ]
    filas.append([InlineKeyboardButton("⬅️ Volver", callback_data="inicio")])
    return InlineKeyboardMarkup(filas)


def menu_volver_faq() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [InlineKeyboardButton("⬅️ Otras preguntas", callback_data="faq_menu")],
            [InlineKeyboardButton("🏠 Menu principal", callback_data="inicio")],
        ]
    )


# --------------------------------------------------------------------------- #
# Textos
# --------------------------------------------------------------------------- #
BIENVENIDA = (
    "👋 ¡Hola! Bienvenido a *Suchel Proquimia*.\n\n"
    "Soy el asistente virtual. Puedo ayudarte con:\n"
    "• Informacion y fichas tecnicas de nuestros productos\n"
    "• Como comprar en la tienda online\n"
    "• Preguntas frecuentes\n"
    "• Atencion al cliente\n\n"
    "¿En que puedo ayudarte hoy? 👇"
)


# --------------------------------------------------------------------------- #
# Handlers
# --------------------------------------------------------------------------- #
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    context.user_data[MODO_SOPORTE] = False
    await update.message.reply_text(
        BIENVENIDA, reply_markup=menu_principal(), parse_mode=ParseMode.MARKDOWN
    )


async def ayuda(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Usa /start para abrir el menu principal en cualquier momento.",
        reply_markup=menu_principal(),
    )


async def router(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Maneja todos los botones (callback_data)."""
    query = update.callback_query
    await query.answer()
    data = query.data

    if data == "inicio":
        context.user_data[MODO_SOPORTE] = False
        await query.edit_message_text(
            BIENVENIDA, reply_markup=menu_principal(), parse_mode=ParseMode.MARKDOWN
        )

    elif data == "cat_menu":
        await query.edit_message_text(
            "🛒 *Catalogo*\n\nElige una categoria:",
            reply_markup=menu_categorias(),
            parse_mode=ParseMode.MARKDOWN,
        )

    elif data.startswith("cat:"):
        cid = data.split(":", 1)[1]
        cat = next((c for c in CATEGORIAS if c["id"] == cid), None)
        nombre = cat["nombre"] if cat else "Productos"
        await query.edit_message_text(
            f"{nombre}\n\nElige un producto para ver su ficha tecnica:",
            reply_markup=menu_productos(cid),
            parse_mode=ParseMode.MARKDOWN,
        )

    elif data.startswith("prod:"):
        pid = data.split(":", 1)[1]
        prod = buscar_producto(pid)
        if not prod:
            await query.edit_message_text(
                "Producto no encontrado.", reply_markup=menu_principal()
            )
            return
        await query.edit_message_text(
            prod["ficha"],
            reply_markup=menu_ficha(prod["categoria"]),
            parse_mode=ParseMode.MARKDOWN,
        )

    elif data == "faq_menu":
        await query.edit_message_text(
            "❓ *Preguntas frecuentes*\n\nElige una pregunta:",
            reply_markup=menu_faq(),
            parse_mode=ParseMode.MARKDOWN,
        )

    elif data.startswith("faq:"):
        fid = data.split(":", 1)[1]
        item = buscar_faq(fid)
        if not item:
            await query.edit_message_text(
                "Pregunta no encontrada.", reply_markup=menu_faq()
            )
            return
        await query.edit_message_text(
            f"*{item['pregunta']}*\n\n{item['respuesta']}",
            reply_markup=menu_volver_faq(),
            parse_mode=ParseMode.MARKDOWN,
        )

    elif data == "enlaces":
        await query.edit_message_text(
            "🔗 *Enlaces y redes*\n\nSiguenos y mira nuestro catalogo completo:",
            reply_markup=menu_enlaces(),
            parse_mode=ParseMode.MARKDOWN,
        )

    elif data == "soporte":
        context.user_data[MODO_SOPORTE] = True
        await query.edit_message_text(
            "💬 *Atencion al cliente*\n\n"
            f"{CONTACTO_TEXTO}\n\n"
            "_Escribe tu mensaje a continuacion._",
            reply_markup=InlineKeyboardMarkup(
                [[InlineKeyboardButton("🏠 Menu principal", callback_data="inicio")]]
            ),
            parse_mode=ParseMode.MARKDOWN,
        )


async def mensaje_texto(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Mensajes de texto libres. Si el usuario esta en modo soporte, se reenvia
    al administrador; si no, se le recuerda usar el menu."""
    if context.user_data.get(MODO_SOPORTE):
        context.user_data[MODO_SOPORTE] = False
        usuario = update.effective_user

        # Reenvia la consulta al administrador si esta configurado
        if ADMIN_CHAT_ID:
            etiqueta = usuario.full_name
            if usuario.username:
                etiqueta += f" (@{usuario.username})"
            aviso = (
                "📩 *Nueva consulta de cliente*\n\n"
                f"De: {etiqueta}\n"
                f"ID: `{usuario.id}`\n\n"
                f"{update.message.text}"
            )
            try:
                await context.bot.send_message(
                    chat_id=ADMIN_CHAT_ID, text=aviso, parse_mode=ParseMode.MARKDOWN
                )
            except Exception as e:  # noqa: BLE001
                logger.warning("No se pudo avisar al admin: %s", e)

        await update.message.reply_text(
            "✅ ¡Gracias! Tu consulta fue recibida. Un asesor te respondera pronto.\n\n"
            "Mientras tanto, puedes seguir explorando 👇",
            reply_markup=menu_principal(),
        )
    else:
        await update.message.reply_text(
            "Usa los botones del menu para navegar 👇",
            reply_markup=menu_principal(),
        )


# --------------------------------------------------------------------------- #
# Arranque
# --------------------------------------------------------------------------- #
def main() -> None:
    if not BOT_TOKEN:
        raise SystemExit(
            "Falta BOT_TOKEN. Define la variable de entorno con el token de BotFather."
        )

    app = Application.builder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("ayuda", ayuda))
    app.add_handler(CommandHandler("help", ayuda))
    app.add_handler(CallbackQueryHandler(router))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, mensaje_texto))

    logger.info("Bot iniciado. Esperando mensajes...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
