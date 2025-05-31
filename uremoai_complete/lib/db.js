import mongoose from 'mongoose';

export async function connectDB() {
  try {
    await mongoose.connect('mongodb+srv://sajalnew00:wJrpIoNXqNFLO7pp@cluster0.nppytky.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ DB Error:", err.message);
  }
}
