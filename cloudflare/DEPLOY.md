# Desplegar el bot en Cloudflare Workers (gratis, 24/7, sin tarjeta)

El bot corre como un **Worker**: Cloudflare ejecuta `worker.js` cada vez que Telegram
envia un mensaje (modo webhook). No hay servidor que se duerma ni que pagar.

## Pasos (desde el navegador, ~5 min)

1. **Crea cuenta** en https://dash.cloudflare.com (solo email, sin tarjeta).

2. En el menu izquierdo: **Workers & Pages** → **Create application** → **Create Worker**.

3. Ponle un nombre, por ejemplo `suchel-bot`, y dale **Deploy** (crea uno de ejemplo).

4. Pulsa **Edit code**. Borra todo y pega el contenido de `worker.js`.
   Puedes copiarlo desde:
   https://raw.githubusercontent.com/richarddriggspro-arch/bot-telegram-suchel/master/cloudflare/worker.js
   Luego **Deploy**.

5. Entra a **Settings** → **Variables and Secrets** y agrega:
   - `BOT_TOKEN`  → tipo **Secret** → el token de BotFather
   - `TIENDA_URL` → tipo Text → `https://tienda.suchelproquimia.com/` (opcional)
   - `ADMIN_CHAT_ID` → tipo Text → tu ID de Telegram (opcional, para recibir consultas)

   Vuelve a **Deploy** para que tome las variables.

6. Copia la URL del Worker (arriba), del tipo:
   `https://suchel-bot.TUSUBDOMINIO.workers.dev`

7. Pasale esa URL a Claude. El se encarga de **conectar el webhook** de Telegram
   (apunta a `.../<BOT_TOKEN>`) y de apagar el bot que corria en la PC.

¡Listo! El bot queda funcionando para todo el mundo, gratis y 24/7.

## Como actualizar despues

- **Productos / FAQ / enlaces:** se editan en los `.json` del repo (como siempre);
  el Worker los lee de GitHub Pages, asi que se actualizan solos (cache ~5 min).
- **Logica del bot:** si cambia `worker.js`, hay que volver a pegarlo en el editor
  de Cloudflare y darle Deploy (o usar el CLI `wrangler`).
