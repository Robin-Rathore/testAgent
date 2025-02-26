import express from 'express';
import cors from 'cors';
import { runPortfolioAssistant } from './agent.js';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/agent', async (req, res) => {
  try {
    const { message } = req.body;
    const response = await runPortfolioAssistant(message);
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});