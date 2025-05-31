// index.js
import express from 'express';
import cors from 'cors';

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.send('✅ Backend is running successfully!');
});

// Chat endpoint used by frontend
app.post('/message', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, error: "Message is required" });
  }

  // Placeholder logic for now (you can plug in Gemini/OpenAI later)
  const reply = `🤖 JarvisX says: You said "${message}"`;

  res.json({ success: true, reply });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
