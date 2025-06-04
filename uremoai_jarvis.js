import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./uremoai_complete/lib/db.js";
import TelegramMessage from "./uremoai_complete/models/telegramMessage.js";
import Brain from "./uremoai_complete/models/brain.js";

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const openrouterApiKey = process.env.OPENROUTER_API_KEY;
const SERVER_URL = process.env.SERVER_URL;
const PORT = process.env.PORT || 10000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // fixed variable name

if (!token || !openrouterApiKey || !SERVER_URL) {
  console.error(
    "❌ Missing environment variables. Check your .env or Render settings."
  );
  process.exit(1);
}

await connectDB();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ✅ Telegram Webhook (Fixed)
app.post("/webhook", async (req, res) => {
  const msg = req.body.message;

  if (!msg || !msg.text) {
    return res.status(200).send("No message to handle");
  }

  const chatId = msg.chat.id;
  const text = msg.text;

  console.log("📩 Incoming Telegram message:", text);

  try {
    await TelegramMessage.create({ chatId, text, date: new Date() });

    if (msg.chat.type === "group" || msg.chat.type === "supergroup") {
      const user = msg.from.username || msg.from.first_name;
      await Brain.create({
        topic: "Group Chat",
        content: `${user}: ${text}`, // fixed template string
        source: "Telegram - " + msg.chat.title,
      });
    }

    const aiReply = await getAIReply(text);
    await sendTelegram(chatId, aiReply || "⚠ AI failed to respond.");

    res.sendStatus(200); // ✅ Always 200 OK
  } catch (err) {
    console.error("❌ Webhook handler error:", err.message);
    await sendTelegram(chatId, "⚠ Internal error occurred.");
    res.sendStatus(200);
  }
});

// ✅ Frontend Message API
app.post("/message", async (req, res) => {
  const { message, userId } = req.body;

  try {
    await TelegramMessage.create({
      chatId: userId || "frontend-user",
      text: message,
      date: new Date(),
    });

    const reply = await getAIReply(message);
    res.json({ reply });
  } catch (error) {
    console.error("❌ Error in /message:", error);
    res.status(500).json({ error: "Failed to handle message" });
  }
});

// ✅ Admin Panel
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html")); // fixed __dirname usage
});

// ✅ Admin Chat Training
app.post("/admin/chat", async (req, res) => {
  const { prompt } = req.body;

  try {
    const reply = await getAIReply(prompt);
    await Brain.create({
      topic: "Owner Training",
      content: `Admin asked: ${prompt}\nAI answered: ${reply}`, // fixed template string
      source: "Admin Panel",
    });

    res.json({ reply });
  } catch (err) {
    console.error("❌ Admin Chat Error:", err.message);
    res.json({ reply: "⚠ Something went wrong." });
  }
});

// ✅ Root
app.get("/", (req, res) => res.send("🤖 UremoAI bot is live"));

// ✅ Start Server
app.listen(PORT, async () => {
  console.log(
    `🌐 Express API server and Telegram webhook initialized on port ${PORT}` // fixed template string
  );
  await setWebhook();
});

// ✅ Webhook Setup
async function setWebhook() {
  try {
    const url = `https://api.telegram.org/bot${token}/setWebhook?url=${SERVER_URL}/webhook`; // fixed template string
    const res = await axios.get(url);
    console.log("✅ Webhook set:", res.data);
  } catch (err) {
    console.error("❌ Failed to set webhook:", err.message);
  }
}

// ✅ Send Telegram Message
async function sendTelegram(chatId, text) {
  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      // fixed template string
      chat_id: chatId,
      text,
    });
  } catch (err) {
    console.error("❌ Failed to send Telegram message:", err.message);
  }
}

// ✅ AI Reply Handler (OpenRouter)
async function getAIReply(prompt) {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are JarvisX, a smart assistant trained by its creator for deal support and financial help. You learn from corrections and feedback.",
          },
          { role: "user", content: prompt },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${openrouterApiKey}`, // fixed template string
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (err) {
    console.error("❌ AI API Error:", err.message);
    return "⚠ I couldn't think of a response.";
  }
}
