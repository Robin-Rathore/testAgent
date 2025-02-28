import express from "express";
import cors from "cors";
import { runPortfolioAssistant } from "./agent.js";
import { createClient } from "redis";
import { getChatHistory, storeChat } from "./redismanagement.js";

const app = express();
const corsOptions = {
    origin: "*",  // Allow all domains (change for security)
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"]
};
app.use(cors(corsOptions));
app.use(express.json());

const client = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379"
});

// Handle errors
client.on("error", (err) => {
    console.error("Redis Error:", err);
});

// Connect to Redis
const connectRedis = async () => {
    try {
        await client.connect();
        console.log("✅ Connected to Redis successfully!");
    } catch (error) {
        console.error("❌ Redis Connection Failed:", error);
    }
};
connectRedis();

export default client;

// 🌟 AI Chat Route
app.post("/agent", async (req, res) => {
    try {
        const { message, sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: "Session ID is required" });
        }

        // Fetch last 5 messages from Redis for context
        let history = await getChatHistory(sessionId, 5);
        if (!history) history = [];

        // Format chat history with explicit AI instructions
        let formattedHistory = history
            .map(chat => `User: ${chat.user}\nAI: ${chat.ai}`)
            .join("\n");

        let inputWithHistory = `# Previous messages (for context only):\n${formattedHistory}\n\n` +
                               `# New User Message:\nUser: ${message}\nAI:`;

        // 🔥 Send message with explicit context to AI
        const aiResponse = await runPortfolioAssistant(inputWithHistory);

        // Extract AI response text
        const responseText = aiResponse?.[0]?.kwargs?.content || "No response received";

        // 📌 Store user message & AI reply in Redis
        await storeChat(sessionId, message, responseText);

        res.json({ response: aiResponse });

    } catch (error) {
        console.error("🔥 Error handling chat:", error);
        res.status(500).json({ error: error.message });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
