import express from 'express';
import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import bodyParser from 'body-parser';
import { connectDB } from './uremoai_complete/lib/db.js';
import TelegramMessage from './uremoai_complete/models/telegramMessage.js';
import Brain from './uremoai_complete/models/brain.js';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const openrouterApiKey = process.env.OPENROUTER_API_KEY;
const SERVER_URL = process.env.SERVER_URL;
const PORT = process.env.PORT || 10000;

if (!token || !openrouterApiKey || !SERVER_URL) {
  console.error("❌ Missing environment variables. Check your .env or Render settings.");
  process.exit(1);
}

await connectDB();

const app = express();
app.use(bodyParser.json());

// ✅ Set up webhook handler
app.post('/webhook', async (req, res) => {
  const msg = req.body.message;
  if (!msg || !msg.text || msg.text.startsWith('/')) return res.sendStatus(200);

  const chatId = msg.chat.id;
  const text = msg.text;

  try {
    await TelegramMessage.create({
      chatId,
      text,
      date: new Date()
    });

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
      await sendTelegram(chatId, `💬 ${aiReply}`);
    } else {
      await sendTelegram(chatId, `⚠️ AI failed to respond.`);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error:", err);
    await sendTelegram(chatId, "⚠️ Internal error. Try again.");
    res.sendStatus(500);
  }
});

app.get('/', (req, res) => res.send('🤖 UremoAI bot is live'));

// ✅ Start Express server
app.listen(PORT, async () => {
  console.log(`🌐 Express API server and Telegram webhook initialized on port ${PORT}`);
  await setWebhook();
});

// ✅ Set Webhook
async function setWebhook() {
  try {
    const url = `https://api.telegram.org/bot${token}/setWebhook?url=${SERVER_URL}/webhook`;
    const res = await axios.get(url);
    console.log("✅ Webhook set:", res.data);
  } catch (err) {
    console.error("❌ Failed to set webhook:", err.message);
  }
}

// ✅ AI Handler
async function getAIReply(prompt) {
  const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
    model: "openai/gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }]
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data.choices[0].message.content;
}

module.exports = { getAIReply };
//telegram message handler
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text;

  try {
    const aiReply = await getAIReply(userMessage);
    bot.sendMessage(chatId, aiReply);
  } catch (error) {
    console.error('AI Error:', error);
    bot.sendMessage(chatId, 'Sorry, something went wrong!');
  }
});