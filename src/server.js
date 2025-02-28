import express from "express";
import cors from "cors";
import { runPortfolioAssistant } from "./agent.js";
import { createClient } from "redis";
import { getChatHistory, storeChat } from "./redismanagement.js";
import { UpstashRedisClient } from "./upstashRedis.js";

const app = express();
const corsOptions = {
    origin: "*",  // Allow all domains (change for security)
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"]
};
app.use(cors(corsOptions));
app.use(express.json());

// Setup Redis client with better error handling
let client;
try {
    // For Upstash REST API
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_TOKEN) {
        client = new UpstashRedisClient(
            process.env.UPSTASH_REDIS_REST_URL,
            process.env.UPSTASH_REDIS_TOKEN
        );
        console.log("Using Upstash REST API for Redis");
    }
    // For local development
    else if (!process.env.REDIS_URL) {
        client = createClient();
        console.log("Using local Redis instance");
    } 
    // For standard Redis URL
    else {
        client = createClient({ url: process.env.REDIS_URL });
        console.log("Using Redis URL from environment");
    }
} catch (error) {
    console.error("Error initializing Redis client:", error);
    client = null;
}

// Implement in-memory storage as fallback
const memoryStorage = {};

// Connect to Redis if client exists
const connectRedis = async () => {
    if (!client) {
        console.log("⚠️ No Redis client available. Using in-memory storage.");
        return;
    }

    try {
        client.on("error", (err) => {
            console.error("Redis Error:", err);
        });
        
        await client.connect();
        console.log("✅ Connected to Redis successfully!");
    } catch (error) {
        console.error("❌ Redis Connection Failed:", error);
        client = null; // Set to null to use fallback
        console.log("⚠️ Switching to in-memory storage.");
    }
};

// In-memory implementation of Redis functions
async function memoryStoreChat(sessionId, userMessage, aiResponse) {
    if (!memoryStorage[sessionId]) {
        memoryStorage[sessionId] = [];
    }
    memoryStorage[sessionId].unshift({
        user: userMessage,
        ai: aiResponse,
        timestamp: Date.now()
    });
    return true;
}

async function memoryGetChatHistory(sessionId, limit = 10) {
    return (memoryStorage[sessionId] || []).slice(0, limit);
}

// Connect to Redis
connectRedis();

// 🌟 AI Chat Route
app.post("/agent", async (req, res) => {
    try {
        const { message, sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: "Session ID is required" });
        }

        // Use Redis or fallback to memory storage
        let history;
        if (client && client.isReady) {
            history = await getChatHistory(sessionId, 5);
        } else {
            history = await memoryGetChatHistory(sessionId, 5);
        }
        
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

        // 📌 Store user message & AI reply
        if (client && client.isReady) {
            await storeChat(sessionId, message, responseText);
        } else {
            await memoryStoreChat(sessionId, message, responseText);
        }

        res.json({ response: aiResponse });

    } catch (error) {
        console.error("🔥 Error handling chat:", error);
        res.status(500).json({ error: error.message });
    }
});

// Health check route
app.get("/health", (req, res) => {
    res.json({ 
        status: "ok", 
        redis: client && client.isReady ? "connected" : "disconnected",
        storage: client && client.isReady ? "redis" : "in-memory"
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

export default client;