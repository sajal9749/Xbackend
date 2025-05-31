import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import TelegramMessage from './uremoai_complete/models/telegramMessage.js';
import Brain from './uremoai_complete/models/brain.js';
import { connectDB } from './uremoai_complete/lib/db.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

app.use(bodyParser.json());

const token = process.env.TELEGRAM_BOT_TOKEN;
const openrouterApiKey = process.env.OPENROUTER_API_KEY;

if (!token || !openrouterApiKey) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

await connectDB();

const bot = new TelegramBot(token);
bot.setWebHook(`https://${process.env.RENDER_EXTERNAL_HOSTNAME}/webhook`);

app.post('/webhook', async (req, res) => {
  const msg = req.body.message;

  if (!msg || !msg.text || msg.text.startsWith('/')) {
    return res.sendStatus(200);
  }

  const chatId = msg.chat.id;
  const text = msg.text;

  try {
    await new TelegramMessage({ chatId, text, date: new Date() }).save();
    if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
      const user = msg.from.username || msg.from.first_name;
      await Brain.create({
        topic: 'Group Chat',
        content: `${user}: ${text}`,
        source: 'Telegram - ' + msg.chat.title
      });
    }

    const aiReply = await getAIReply(text);
    if (aiReply) {
      await bot.sendMessage(chatId, `💬 ${aiReply}`);
    } else {
      await bot.sendMessage(chatId, "⚠️ AI failed to respond.");
    }
  } catch (err) {
    console.error("❌ Error:", err);
    await bot.sendMessage(chatId, "⚠️ Internal server error.");
  }

  res.sendStatus(200);
});

app.get('/', (req, res) => {
  res.send('🤖 UremoAI Bot server is running!');
});

app.listen(port, () => {
  console.log(`🌐 Express API server and Telegram webhook initialized`);
});
