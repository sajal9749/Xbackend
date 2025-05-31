import mongoose from 'mongoose';

const brainSchema = new mongoose.Schema({
  topic: String,
  content: String,
  source: String,
  date: { type: Date, default: Date.now }
});

export default mongoose.model('Brain', brainSchema);
