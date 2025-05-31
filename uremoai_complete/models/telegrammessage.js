import mongoose from 'mongoose';

const telegramMessageSchema = new mongoose.Schema({
  chatId: String,
  text: String,
  date: Date
});

export default mongoose.model('TelegramMessage', telegramMessageSchema);
