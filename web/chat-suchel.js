/*
 * <chat-suchel> — Chat de atencion al cliente para la tienda Suchel Proquimia.
 * Web Component autonomo (Shadow DOM). Reutiliza los MISMOS datos que el bot
 * de Telegram: productos.json, faq.json y enlaces.json.
 *
 * Uso en la tienda (Angular o cualquier web):
 *   <script src="chat-suchel.js" defer></script>
 *   <chat-suchel data-src="https://.../ruta-a-los-json/"></chat-suchel>
 *
 * data-src = carpeta (con / al final) donde estan los 3 .json. Por defecto "./".
 * data-telegram y data-whatsapp se pueden sobreescribir por atributo.
 */
(function () {
  "use strict";

  const BRAND = {
    petroleo: "#13495F",
    medio: "#5A88A0",
    ambar: "#FFC107",
    fondo: "#F4F7F9",
    texto: "#1c2b33",
    claro: "#ffffff",
  };

  // Formatea el texto estilo Telegram (*negrita*, _cursiva_, saltos \n) a HTML seguro.
  function formatear(txt) {
    const esc = txt
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return esc
      .replace(/\*(.+?)\*/g, "<strong>$1</strong>")
      .replace(/_(.+?)_/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");
  }

  class ChatSuchel extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.abierto = false;
      this.datos = { categorias: [], productos: [] };
      this.faq = { faq: [] };
      this.enlaces = { enlaces: [] };
    }

    connectedCallback() {
      this.base = (this.getAttribute("data-src") || "./").replace(/\/?$/, "/");
      this.telegram =
        this.getAttribute("data-telegram") || "https://t.me/SuchelProquimiaBot";
      this.whatsapp =
        this.getAttribute("data-whatsapp") ||
        "https://whatsapp.com/channel/0029VbBO6nH6rsQwnnnleb2w";
      this.tienda =
        this.getAttribute("data-tienda") || "https://tienda.suchelproquimia.com/";
      this.render();
      this.cargarDatos();
    }

    async cargarDatos() {
      try {
        const [p, f, e] = await Promise.all([
          fetch(this.base + "productos.json").then((r) => r.json()),
          fetch(this.base + "faq.json").then((r) => r.json()),
          fetch(this.base + "enlaces.json").then((r) => r.json()),
        ]);
        this.datos = p;
        this.faq = f;
        this.enlaces = e;
      } catch (err) {
        console.error("chat-suchel: no se pudieron cargar los datos", err);
        this.errorDatos = true;
      }
    }

    productosDe(catId) {
      return (this.datos.productos || []).filter((x) => x.categoria === catId);
    }

    // ------------------------------------------------------------------ UI
    render() {
      const s = document.createElement("style");
      s.textContent = `
        :host { all: initial; }
        * { box-sizing: border-box; font-family: 'Poppins', system-ui, sans-serif; }
        .launcher {
          position: fixed; right: 20px; bottom: 20px; z-index: 99999;
          width: 60px; height: 60px; border-radius: 50%; border: none;
          background: ${BRAND.petroleo}; color: #fff; cursor: pointer;
          box-shadow: 0 6px 20px rgba(0,0,0,.25); font-size: 26px;
          display: flex; align-items: center; justify-content: center;
          transition: transform .15s ease;
        }
        .launcher:hover { transform: scale(1.06); }
        .panel {
          position: fixed; right: 20px; bottom: 92px; z-index: 99999;
          width: 360px; max-width: calc(100vw - 40px);
          height: 540px; max-height: calc(100vh - 120px);
          background: ${BRAND.fondo}; border-radius: 16px; overflow: hidden;
          box-shadow: 0 12px 40px rgba(0,0,0,.30);
          display: none; flex-direction: column;
        }
        .panel.open { display: flex; }
        .head {
          background: ${BRAND.petroleo}; color: #fff; padding: 14px 16px;
          display: flex; align-items: center; gap: 10px;
        }
        .head .avatar {
          width: 38px; height: 38px; border-radius: 50%; background: ${BRAND.medio};
          display: flex; align-items: center; justify-content: center; font-size: 20px;
        }
        .head .t { font-weight: 600; font-size: 15px; line-height: 1.1; }
        .head .st { font-size: 11px; opacity: .85; }
        .head .close {
          margin-left: auto; background: transparent; border: none; color: #fff;
          font-size: 22px; cursor: pointer; line-height: 1;
        }
        .body { flex: 1; overflow-y: auto; padding: 14px; }
        .msg {
          background: ${BRAND.claro}; color: ${BRAND.texto}; padding: 11px 13px;
          border-radius: 12px; border-top-left-radius: 3px; font-size: 14px;
          line-height: 1.45; box-shadow: 0 1px 3px rgba(0,0,0,.06); margin-bottom: 12px;
        }
        .msg strong { color: ${BRAND.petroleo}; }
        .opts { display: flex; flex-direction: column; gap: 8px; }
        .opt {
          text-align: left; background: ${BRAND.claro}; color: ${BRAND.petroleo};
          border: 1px solid #dbe4ea; border-radius: 10px; padding: 11px 13px;
          font-size: 14px; cursor: pointer; text-decoration: none; display: block;
          transition: background .12s, border-color .12s;
        }
        .opt:hover { background: #eef3f6; border-color: ${BRAND.medio}; }
        .opt.primary { background: ${BRAND.petroleo}; color: #fff; border-color: ${BRAND.petroleo}; }
        .opt.primary:hover { filter: brightness(1.15); }
        .opt.amber { background: ${BRAND.ambar}; color: #3a2f00; border-color: ${BRAND.ambar}; font-weight: 600; }
        .back { color: ${BRAND.medio}; }
        .foot {
          padding: 8px 14px; font-size: 11px; color: #7d8f9a; text-align: center;
          border-top: 1px solid #e3eaef; background: ${BRAND.fondo};
        }
      `;

      const launcher = document.createElement("button");
      launcher.className = "launcher";
      launcher.setAttribute("aria-label", "Abrir chat");
      launcher.textContent = "💬";
      launcher.addEventListener("click", () => this.toggle());

      const panel = document.createElement("div");
      panel.className = "panel";
      panel.innerHTML = `
        <div class="head">
          <div class="avatar">🧪</div>
          <div>
            <div class="t">Suchel Proquimia</div>
            <div class="st">Asistente virtual · en linea</div>
          </div>
          <button class="close" aria-label="Cerrar">×</button>
        </div>
        <div class="body"></div>
        <div class="foot">Atendido por el asistente de Suchel Proquimia</div>
      `;
      panel.querySelector(".close").addEventListener("click", () => this.toggle());

      this.shadowRoot.append(s, launcher, panel);
      this.panel = panel;
      this.bodyEl = panel.querySelector(".body");
    }

    toggle() {
      this.abierto = !this.abierto;
      this.panel.classList.toggle("open", this.abierto);
      if (this.abierto) this.pantallaInicio();
    }

    // ---------------------------------------------------------------- helpers
    setBody(msgHtml, opciones) {
      const cont = document.createElement("div");
      if (msgHtml) {
        const m = document.createElement("div");
        m.className = "msg";
        m.innerHTML = msgHtml;
        cont.appendChild(m);
      }
      const wrap = document.createElement("div");
      wrap.className = "opts";
      (opciones || []).forEach((o) => {
        let el;
        if (o.url) {
          el = document.createElement("a");
          el.href = o.url;
          el.target = "_blank";
          el.rel = "noopener";
        } else {
          el = document.createElement("button");
          el.addEventListener("click", o.accion);
        }
        el.className = "opt" + (o.clase ? " " + o.clase : "");
        el.textContent = o.texto;
        wrap.appendChild(el);
      });
      cont.appendChild(wrap);
      this.bodyEl.innerHTML = "";
      this.bodyEl.appendChild(cont);
      this.bodyEl.scrollTop = 0;
    }

    // ---------------------------------------------------------------- pantallas
    pantallaInicio() {
      if (this.errorDatos) {
        this.setBody(
          "No pude cargar el catalogo en este momento. Puedes escribirnos por Telegram o WhatsApp.",
          [
            { texto: "💬 Telegram", url: this.telegram, clase: "primary" },
            { texto: "📱 WhatsApp", url: this.whatsapp },
          ]
        );
        return;
      }
      this.setBody(
        "👋 ¡Hola! Bienvenido a <strong>Suchel Proquimia</strong>.<br><br>¿En que puedo ayudarte?",
        [
          { texto: "🛒 Catalogo de productos", accion: () => this.pantallaCategorias() },
          { texto: "❓ Preguntas frecuentes", accion: () => this.pantallaFaq() },
          { texto: "🔗 Enlaces y redes", accion: () => this.pantallaEnlaces() },
          { texto: "🏪 Ir a la tienda online", url: this.tienda },
          { texto: "💬 Atencion al cliente", accion: () => this.pantallaSoporte(), clase: "amber" },
        ]
      );
    }

    pantallaCategorias() {
      const cats = (this.datos.categorias || []).filter(
        (c) => this.productosDe(c.id).length
      );
      const ops = cats.map((c) => ({
        texto: c.nombre,
        accion: () => this.pantallaProductos(c.id),
      }));
      ops.push({ texto: "⬅️ Volver", accion: () => this.pantallaInicio(), clase: "back" });
      this.setBody("🛒 <strong>Catalogo</strong><br>Elige una categoria:", ops);
    }

    pantallaProductos(catId) {
      const cat = (this.datos.categorias || []).find((c) => c.id === catId);
      const ops = this.productosDe(catId).map((p) => ({
        texto: p.nombre,
        accion: () => this.pantallaFicha(p, catId),
      }));
      ops.push({ texto: "⬅️ Volver", accion: () => this.pantallaCategorias(), clase: "back" });
      this.setBody(
        (cat ? cat.nombre : "Productos") + "<br>Elige un producto:",
        ops
      );
    }

    pantallaFicha(p, catId) {
      this.setBody(formatear(p.ficha), [
        { texto: "🏪 Comprar en la tienda", url: this.tienda, clase: "primary" },
        { texto: "⬅️ Volver", accion: () => this.pantallaProductos(catId), clase: "back" },
        { texto: "🏠 Menu principal", accion: () => this.pantallaInicio(), clase: "back" },
      ]);
    }

    pantallaFaq() {
      const ops = (this.faq.faq || []).map((f) => ({
        texto: f.pregunta,
        accion: () => this.pantallaRespuesta(f),
      }));
      ops.push({ texto: "⬅️ Volver", accion: () => this.pantallaInicio(), clase: "back" });
      this.setBody("❓ <strong>Preguntas frecuentes</strong>", ops);
    }

    pantallaRespuesta(f) {
      this.setBody(
        "<strong>" + formatear(f.pregunta) + "</strong><br><br>" + formatear(f.respuesta),
        [
          { texto: "⬅️ Otras preguntas", accion: () => this.pantallaFaq(), clase: "back" },
          { texto: "🏠 Menu principal", accion: () => this.pantallaInicio(), clase: "back" },
        ]
      );
    }

    pantallaEnlaces() {
      const ops = (this.enlaces.enlaces || []).map((e) => ({
        texto: e.texto,
        url: e.url,
      }));
      ops.push({ texto: "⬅️ Volver", accion: () => this.pantallaInicio(), clase: "back" });
      this.setBody(
        "🔗 <strong>Enlaces y redes</strong><br>Siguenos y mira el catalogo completo:",
        ops
      );
    }

    pantallaSoporte() {
      this.setBody(
        "💬 <strong>Atencion al cliente</strong><br><br>Chatea con nosotros por el canal que prefieras:",
        [
          { texto: "💬 Escribir por Telegram", url: this.telegram, clase: "primary" },
          { texto: "📱 Canal de WhatsApp", url: this.whatsapp },
          { texto: "⬅️ Volver", accion: () => this.pantallaInicio(), clase: "back" },
        ]
      );
    }
  }

  if (!customElements.get("chat-suchel")) {
    customElements.define("chat-suchel", ChatSuchel);
  }
})();
