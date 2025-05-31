import dotenv from 'dotenv';
import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import bodyParser from 'body-parser';
import { connectDB } from './uremoai_complete/lib/db.js';
import TelegramMessage from './uremoai_complete/models/telegramMessage.js';
import Brain from './uremoai_complete/models/brain.js';

dotenv.config();

const app = express();
app.use(bodyParser.json());

const token = process.env.TELEGRAM_BOT_TOKEN;
const openrouterApiKey = process.env.OPENROUTER_API_KEY;
const SERVER_URL = process.env.SERVER_URL;

if (!token || !openrouterApiKey || !SERVER_URL) {
  console.error("❌ Missing environment variables. Check .env file.");
  process.exit(1);
}

await connectDB();

const bot = new TelegramBot(token, { webHook: { port: process.env.PORT || 3000 } });
bot.setWebHook(`${SERVER_URL}/webhook`);

console.log("🌐 Express API server and Telegram webhook initialized");

// Handle Telegram Webhook
app.post('/webhook', async (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Message handler
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith('/')) return;

  try {
    const message = new TelegramMessage({
      chatId,
      text,
      date: new Date()
    });

    await message.save();
    console.log("✅ Message saved:", text);

    if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
      const user = msg.from.username || msg.from.first_name;
      await Brain.create({
        topic: 'Group Chat',
        content: `${user}: ${text}`,
        source: 'Telegram - ' + msg.chat.title
      });
      console.log(`🧠 Learned from group chat: ${text}`);
    }

    const aiReply = await getAIReply(text);
    if (aiReply) {
      bot.sendMessage(chatId, `💬 ${aiReply}`);
    } else {
      bot.sendMessage(chatId, "⚠️ AI failed to respond.");
    }
  } catch (err) {
    console.error("❌ Error:", err);
    bot.sendMessage(chatId, "⚠️ Internal error. Try again.");
  }
});

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
