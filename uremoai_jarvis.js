// 📁 File: uremoai_jarvis.js

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
import BrainCorrection from "./uremoai_complete/models/brainCorrection.js"; // ✅ Added

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const openrouterApiKey = process.env.OPENROUTER_API_KEY;
const SERVER_URL = process.env.SERVER_URL;
const PORT = process.env.PORT || 10000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// ✅ Homepage
app.get("/", (req, res) => res.send("🤖 UremoAI bot is live"));

// ✅ Serve admin training panel
app.get("/admin-train", (req, res) => {
  res.sendFile(path.join(__dirname, "admin-train.html"));
});

// ✅ Admin Correction Saver (NEW)
app.post("/admin/train", async (req, res) => {
  const { prompt, correctedReply, tags = [] } = req.body;

  try {
    const entry = await BrainCorrection.create({
      prompt,
      correctedReply,
      tags,
    });
    res.json({
      success: true,
      message: "✅ Trained successfully",
      data: entry,
    });
  } catch (err) {
    console.error("❌ Error in saving correction:", err.message);
    res.status(500).json({ error: "Failed to save correction" });
  }
});

// ✅ Handle Admin Chat + Feedback Training
app.post("/admin-train", async (req, res) => {
  const { prompt, feedback } = req.body;

  try {
    const reply = await getAIReply(prompt);

    // Save training as Brain memory
    await Brain.create({
      topic: "Admin Correction",
      content: `Prompt: ${prompt}\nCorrection: ${feedback || reply}`,
      source: "Admin Trainer",
    });

    res.json({ reply });
  } catch (err) {
    console.error("❌ Admin Train Error:", err);
    res.status(500).json({ error: "AI error" });
  }
});

// ✅ Telegram Webhook
app.post("/webhook", async (req, res) => {
  const msg = req.body.message;
  if (!msg || !msg.text || msg.text.startsWith("/")) return res.sendStatus(200);

  const chatId = msg.chat.id;
  const text = msg.text;

  try {
    await TelegramMessage.create({ chatId, text, date: new Date() });
    const aiReply = await getAIReply(text);
    await sendTelegram(
      chatId,
      aiReply ? `💬 ${aiReply}` : "⚠ AI failed to respond."
    );
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Telegram Error:", err);
    await sendTelegram(chatId, "⚠ Error occurred");
    res.sendStatus(500);
  }
});

// ✅ AI Handler (UPDATED)
async function getAIReply(prompt) {
  // 1. Check trained corrections first
  const corrections = await BrainCorrection.find();
  for (let c of corrections) {
    if (prompt.toLowerCase().includes(c.prompt.toLowerCase())) {
      console.log("🧠 Used Trained Memory");
      return c.correctedReply;
    }
  }

  // 2. Fallback to AI API
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are JarvisX, a smart assistant for deal-making and microjob assistance.",
          },
          { role: "user", content: prompt },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${openrouterApiKey}`,
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

// ✅ Send Telegram Message
async function sendTelegram(chatId, text) {
  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text,
    });
  } catch (err) {
    console.error("❌ Telegram send error:", err.message);
  }
}

// ✅ Set Webhook and Start Server
app.listen(PORT, async () => {
  console.log(`🌐 Server running on http://localhost:${PORT}`);
  try {
    const res = await axios.get(
      `https://api.telegram.org/bot${token}/setWebhook?url=${SERVER_URL}/webhook`
    );
    console.log("✅ Webhook set:", res.data);
  } catch (err) {
    console.error("❌ Webhook setup error:", err.message);
  }
});
