/*
 * Bot de Telegram — Suchel Proquimia (version Cloudflare Worker / webhook).
 *
 * Mismo comportamiento que bot.py pero sin servidor: Cloudflare ejecuta este
 * codigo cada vez que Telegram envia un mensaje (webhook). Gratis y 24/7.
 *
 * Reutiliza los MISMOS datos publicados en GitHub Pages:
 *   productos.json, faq.json, enlaces.json
 *
 * Variables de entorno (se configuran en el panel de Cloudflare):
 *   BOT_TOKEN      -> token de BotFather (secreto, OBLIGATORIO)
 *   TIENDA_URL     -> URL de la tienda (opcional)
 *   WHATSAPP_URL   -> canal de WhatsApp (opcional)
 *   ADMIN_CHAT_ID  -> chat donde llegan las consultas (opcional)
 *   DATA_BASE      -> carpeta de los .json (opcional; por defecto GitHub Pages)
 *
 * El webhook apunta a:  https://<tu-worker>.workers.dev/<BOT_TOKEN>
 * (asi solo Telegram, que conoce el token, puede activarlo).
 */

const DEFAULT_BASE = "https://richarddriggspro-arch.github.io/bot-telegram-suchel/";
const DEFAULT_TIENDA = "https://tienda.suchelproquimia.com/";
const DEFAULT_WHATSAPP = "https://whatsapp.com/channel/0029VbBO6nH6rsQwnnnleb2w";

const BIENVENIDA =
  "👋 ¡Hola! Bienvenido a *Suchel Proquimia*.\n\n" +
  "Soy el asistente virtual. Puedo ayudarte con:\n" +
  "• Informacion y fichas tecnicas de nuestros productos\n" +
  "• Como comprar en la tienda online\n" +
  "• Preguntas frecuentes\n" +
  "• Atencion al cliente\n\n" +
  "¿En que puedo ayudarte hoy? 👇";

// --------------------------------------------------------------------------- //
// Entrada del Worker
// --------------------------------------------------------------------------- //
export default {
  async fetch(request, env) {
    // Peticiones que no son el webhook -> pagina simple de estado.
    if (request.method !== "POST") {
      return new Response("Bot de Suchel Proquimia en linea ✅", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    // Seguridad: la ruta debe ser /<BOT_TOKEN>.
    const url = new URL(request.url);
    if (url.pathname !== "/" + env.BOT_TOKEN) {
      return new Response("forbidden", { status: 403 });
    }
    try {
      const update = await request.json();
      await manejarUpdate(update, env);
    } catch (e) {
      console.error("Error procesando update:", e);
    }
    return new Response("ok");
  },
};

// --------------------------------------------------------------------------- //
// Llamadas a la API de Telegram
// --------------------------------------------------------------------------- //
async function tg(env, metodo, payload) {
  const res = await fetch(
    `https://api.telegram.org/bot${env.BOT_TOKEN}/${metodo}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  return res.json();
}

// --------------------------------------------------------------------------- //
// Datos (mismos JSON que el chat web) con cache de borde
// --------------------------------------------------------------------------- //
async function cargarDatos(env) {
  const base = (env.DATA_BASE || DEFAULT_BASE).replace(/\/?$/, "/");
  const opts = { cf: { cacheTtl: 300, cacheEverything: true } };
  const [productos, faq, enlaces] = await Promise.all([
    fetch(base + "productos.json", opts).then((r) => r.json()),
    fetch(base + "faq.json", opts).then((r) => r.json()),
    fetch(base + "enlaces.json", opts).then((r) => r.json()),
  ]);
  return { productos, faq, enlaces };
}

const productosDe = (d, cat) =>
  (d.productos.productos || []).filter((p) => p.categoria === cat);
const buscarProducto = (d, id) =>
  (d.productos.productos || []).find((p) => p.id === id);
const buscarFaq = (d, id) => (d.faq.faq || []).find((f) => f.id === id);

// --------------------------------------------------------------------------- //
// Teclados
// --------------------------------------------------------------------------- //
function menuPrincipal(tienda) {
  return {
    inline_keyboard: [
      [{ text: "🛒 Catalogo de productos", callback_data: "cat_menu" }],
      [{ text: "❓ Preguntas frecuentes", callback_data: "faq_menu" }],
      [{ text: "🔗 Enlaces y redes", callback_data: "enlaces" }],
      [{ text: "🏪 Ir a la tienda online", url: tienda }],
      [{ text: "💬 Atencion al cliente", callback_data: "soporte" }],
    ],
  };
}

function menuCategorias(d) {
  const filas = (d.productos.categorias || [])
    .filter((c) => productosDe(d, c.id).length)
    .map((c) => [{ text: c.nombre, callback_data: "cat:" + c.id }]);
  filas.push([{ text: "⬅️ Volver", callback_data: "inicio" }]);
  return { inline_keyboard: filas };
}

function menuProductos(d, catId) {
  const filas = productosDe(d, catId).map((p) => [
    { text: p.nombre, callback_data: "prod:" + p.id },
  ]);
  filas.push([{ text: "⬅️ Volver", callback_data: "cat_menu" }]);
  return { inline_keyboard: filas };
}

function menuFicha(catId, tienda) {
  return {
    inline_keyboard: [
      [{ text: "🏪 Comprar en la tienda", url: tienda }],
      [{ text: "⬅️ Volver", callback_data: "cat:" + catId }],
      [{ text: "🏠 Menu principal", callback_data: "inicio" }],
    ],
  };
}

function menuFaq(d) {
  const filas = (d.faq.faq || []).map((f) => [
    { text: f.pregunta, callback_data: "faq:" + f.id },
  ]);
  filas.push([{ text: "⬅️ Volver", callback_data: "inicio" }]);
  return { inline_keyboard: filas };
}

function menuVolverFaq() {
  return {
    inline_keyboard: [
      [{ text: "⬅️ Otras preguntas", callback_data: "faq_menu" }],
      [{ text: "🏠 Menu principal", callback_data: "inicio" }],
    ],
  };
}

function menuEnlaces(d) {
  const filas = (d.enlaces.enlaces || []).map((e) => [
    { text: e.texto, url: e.url },
  ]);
  filas.push([{ text: "⬅️ Volver", callback_data: "inicio" }]);
  return { inline_keyboard: filas };
}

function menuSoporte(whatsapp) {
  return {
    inline_keyboard: [
      [{ text: "📱 Canal de WhatsApp", url: whatsapp }],
      [{ text: "🏠 Menu principal", callback_data: "inicio" }],
    ],
  };
}

// --------------------------------------------------------------------------- //
// Logica principal
// --------------------------------------------------------------------------- //
async function manejarUpdate(update, env) {
  const tienda = env.TIENDA_URL || DEFAULT_TIENDA;
  const whatsapp = env.WHATSAPP_URL || DEFAULT_WHATSAPP;

  // --- Botones (callback_query) ---
  if (update.callback_query) {
    const cq = update.callback_query;
    const chatId = cq.message.chat.id;
    const messageId = cq.message.message_id;
    const data = cq.data;
    await tg(env, "answerCallbackQuery", { callback_query_id: cq.id });

    const d = await cargarDatos(env);
    const editar = (text, reply_markup) =>
      tg(env, "editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text,
        reply_markup,
        parse_mode: "Markdown",
      });

    if (data === "inicio") {
      await editar(BIENVENIDA, menuPrincipal(tienda));
    } else if (data === "cat_menu") {
      await editar("🛒 *Catalogo*\n\nElige una categoria:", menuCategorias(d));
    } else if (data.startsWith("cat:")) {
      const cid = data.slice(4);
      const cat = (d.productos.categorias || []).find((c) => c.id === cid);
      await editar(
        (cat ? cat.nombre : "Productos") +
          "\n\nElige un producto para ver su ficha tecnica:",
        menuProductos(d, cid)
      );
    } else if (data.startsWith("prod:")) {
      const prod = buscarProducto(d, data.slice(5));
      if (prod) {
        await editar(prod.ficha, menuFicha(prod.categoria, tienda));
      } else {
        await editar("Producto no encontrado.", menuPrincipal(tienda));
      }
    } else if (data === "faq_menu") {
      await editar("❓ *Preguntas frecuentes*\n\nElige una pregunta:", menuFaq(d));
    } else if (data.startsWith("faq:")) {
      const item = buscarFaq(d, data.slice(4));
      if (item) {
        await editar(
          "*" + item.pregunta + "*\n\n" + item.respuesta,
          menuVolverFaq()
        );
      } else {
        await editar("Pregunta no encontrada.", menuFaq(d));
      }
    } else if (data === "enlaces") {
      await editar(
        "🔗 *Enlaces y redes*\n\nSiguenos y mira nuestro catalogo completo:",
        menuEnlaces(d)
      );
    } else if (data === "soporte") {
      await editar(
        "💬 *Atencion al cliente*\n\nEscribenos tu consulta aqui mismo y te " +
          "responderemos lo antes posible. Tambien puedes seguirnos por WhatsApp:",
        menuSoporte(whatsapp)
      );
    }
    return;
  }

  // --- Mensajes de texto ---
  if (update.message && update.message.text) {
    const msg = update.message;
    const chatId = msg.chat.id;
    const texto = msg.text.trim();

    // Utilidad para obtener el ID de este chat (sirve para configurar el grupo).
    if (texto.startsWith("/id")) {
      await tg(env, "sendMessage", {
        chat_id: chatId,
        text:
          "🆔 *ID de este chat*\n\n`" +
          msg.chat.id +
          "`\n\nTipo: " +
          msg.chat.type,
        parse_mode: "Markdown",
      });
      return;
    }

    if (texto.startsWith("/start") || texto.startsWith("/ayuda") || texto.startsWith("/help")) {
      await tg(env, "sendMessage", {
        chat_id: chatId,
        text: BIENVENIDA,
        reply_markup: menuPrincipal(tienda),
        parse_mode: "Markdown",
      });
      return;
    }

    // Texto libre = consulta de cliente. Se reenvia al admin si esta configurado.
    if (env.ADMIN_CHAT_ID) {
      const u = msg.from || {};
      let etiqueta = [u.first_name, u.last_name].filter(Boolean).join(" ");
      if (u.username) etiqueta += " (@" + u.username + ")";
      // Texto plano a proposito: el nombre/usuario/mensaje del cliente pueden
      // contener caracteres (_ * ` [) que romperian el formato Markdown y harian
      // que Telegram rechace el reenvio.
      await tg(env, "sendMessage", {
        chat_id: env.ADMIN_CHAT_ID,
        text:
          "📩 Nueva consulta de cliente\n\nDe: " +
          etiqueta +
          "\nID: " +
          u.id +
          "\n\n" +
          texto,
      });
    }
    await tg(env, "sendMessage", {
      chat_id: chatId,
      text:
        "✅ ¡Gracias! Tu consulta fue recibida. Un asesor te respondera pronto.\n\n" +
        "Mientras tanto, puedes seguir explorando 👇",
      reply_markup: menuPrincipal(tienda),
    });
  }
}
