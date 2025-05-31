import mongoose from 'mongoose';

export async function connectDB() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/uremoAI', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ DB Error:", err.message);
  }
}
