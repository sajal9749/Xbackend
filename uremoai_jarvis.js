import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import express from 'express';
import { connectDB } from './uremoai_complete/lib/db.js';
import TelegramMessage from './uremoai_complete/models/telegramMessage.js';
import Brain from './uremoai_complete/models/brain.js';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const openrouterApiKey = process.env.OPENROUTER_API_KEY;
const PORT = process.env.PORT || 3000;

if (!token || !openrouterApiKey) {
  console.error("❌ Missing environment variables. Check your .env file.");
  process.exit(1);
}

// 🧠 DB connection
await connectDB();

// 🤖 Telegram Bot
const bot = new TelegramBot(token, { polling: true });
console.log("🤖 Bot is now polling for messages...");

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (!text || text.startsWith('/')) return; // Ignore commands

  try {
    // Save chat
    const message = new TelegramMessage({
      chatId,
      text,
      date: new Date()
    });
    await message.save();
    console.log("✅ Message saved:", text);

    // Learn from groups
    if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
      const user = msg.from.username || msg.from.first_name;
      await Brain.create({
        topic: 'Group Chat',
        content: `${user}: ${text}`,
        source: 'Telegram - ' + msg.chat.title
      });
      console.log(`🧠 Learned from group chat: ${text}`);
    }

    // AI reply
    const aiReply = await getAIReply(text);
    bot.sendMessage(chatId, aiReply ? `💬 ${aiReply}` : "⚠️ AI failed to respond.");
  } catch (err) {
    console.error("❌ Error:", err);
    bot.sendMessage(chatId, "⚠️ Internal error. Try again.");
  }
});

// 🌐 Express Server for Web API
const app = express();
app.use(express.json());

// POST endpoint for frontend
app.post('/chat', async (req, res) => {
  const { userMessage } = req.body;
  if (!userMessage) {
    return res.status(400).json({ error: "Missing userMessage" });
  }

  try {
    const reply = await getAIReply(userMessage);
    res.json({ reply: reply || "⚠️ AI could not generate a reply." });
  } catch (error) {
    console.error("❌ Express AI Error:", error.message);
    res.status(500).json({ error: "Internal AI error." });
  }
});

// Start web server
app.listen(PORT, () => {
  console.log(`🌐 Express API server running at http://localhost:${PORT}`);
});

// 🔮 AI Brain
async function getAIReply(userText) {
  try {
    const res = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: "mistralai/mistral-7b-instruct",
        messages: [
          { role: "system", content: "You are UremoAI, an expert assistant for finance, banking, and online methods." },
          { role: "user", content: userText }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${openrouterApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return res.data.choices[0].message.content.trim();
  } catch (error) {
    console.error("❌ AI API Error:", error.message);
    return null;
  }
}

