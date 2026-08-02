# Bot de Telegram — Suchel Proquimia

Bot de **atención al cliente**: da la bienvenida, muestra el catálogo y las fichas
técnicas de los productos, dirige a la tienda online, responde preguntas
frecuentes y recibe consultas de clientes.

## ¿Qué hace?

Menú con botones:

- 🛒 **Catálogo de productos** → categorías → producto → ficha técnica
- ❓ **Preguntas frecuentes** → respuestas listas
- 🏪 **Ir a la tienda online** → abre `https://tienda.suchelproquimia.com/`
- 💬 **Atención al cliente** → el cliente escribe y su mensaje te llega a ti

---

## 1. Crear el bot en Telegram (1 minuto)

1. Abre Telegram y busca **@BotFather**.
2. Envía `/newbot`.
3. Ponle un **nombre** (ej. *Suchel Proquimia*) y un **usuario** que termine en `bot`
   (ej. `suchelproquimia_bot`).
4. BotFather te da un **token** tipo `123456789:ABC-DEF...`. Guárdalo.

Opcional (recomendado): con `/setcommands` puedes registrar el comando `start`.

---

## 2. Editar productos y preguntas (sin programar)

- **`productos.json`** → agrega/edita productos. Copia un bloque existente y cambia
  `nombre`, `resumen` y `ficha`. Usa `\n` para saltos de línea. El campo `categoria`
  debe coincidir con un `id` de la lista `categorias` (piscina, limpieza, otros).
  Las categorías sin productos no se muestran.
- **`faq.json`** → agrega/edita preguntas frecuentes.

> Ahora mismo están cargados los **5 productos de piscina** (Procloro Tabs, Alganet,
> Deflocar, pH Minus L, pH Plus L). Para el resto del catálogo solo hay que pegar las
> fichas en `productos.json`.

---

## 3. Probar en tu PC (opcional)

```bash
pip install -r requirements.txt
# Windows PowerShell:
$env:BOT_TOKEN="tu_token_aqui"
python bot.py
```

Luego escríbele `/start` a tu bot en Telegram.

---

## 4. Desplegar 24/7 (recomendado: Railway)

El bot usa *polling*, así que corre en cualquier servidor sin configurar dominios.

### Opción A — Railway (más simple)

1. Sube esta carpeta a un repositorio de GitHub (ver abajo).
2. Entra a **railway.app** → *New Project* → *Deploy from GitHub repo* → elige el repo.
3. En **Variables**, agrega:
   - `BOT_TOKEN` = el token de BotFather
   - `TIENDA_URL` = `https://tienda.suchelproquimia.com/`
   - `ADMIN_CHAT_ID` = tu ID de Telegram (opcional, para recibir las consultas)
   - `CONTACTO_TEXTO` = texto de contacto (opcional)
4. Railway detecta el `Procfile` y arranca el proceso `worker`. ¡Listo!

Para saber tu `ADMIN_CHAT_ID`: escríbele a **@userinfobot** en Telegram; te da tu ID.

### Opción B — Render

- *New* → *Background Worker* → conecta el repo.
- Build command: `pip install -r requirements.txt`
- Start command: `python bot.py`
- Agrega las mismas variables de entorno.

### Opción C — VPS propio

```bash
pip install -r requirements.txt
export BOT_TOKEN="tu_token"
nohup python bot.py &   # o mejor, un servicio systemd
```

---

## Subir a GitHub

Desde esta carpeta:

```bash
git init
git add .
git commit -m "Bot de Telegram Suchel Proquimia"
gh repo create bot-telegram-suchel --private --source=. --push
```

El `.gitignore` ya evita subir el archivo `.env` con el token.

---

## Estructura

```
bot-telegram-suchel/
├── bot.py            # lógica del bot
├── productos.json    # catálogo (editable)
├── faq.json          # preguntas frecuentes (editable)
├── requirements.txt  # dependencia (python-telegram-bot)
├── Procfile          # arranque para Railway/Render
├── runtime.txt       # versión de Python para el hosting
├── .env.example      # plantilla de variables
└── .gitignore
```
