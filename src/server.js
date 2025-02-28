import express from "express";
import cors from "cors";
import { runPortfolioAssistant } from "./agent.js";

const app = express();
const corsOptions = {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"]
};
app.use(cors(corsOptions));
app.use(express.json());

// In-memory storage
const memoryStorage = {};

// Store chat in memory
async function storeChat(sessionId, userMessage, aiResponse) {
    if (!memoryStorage[sessionId]) {
        memoryStorage[sessionId] = [];
    }
    
    memoryStorage[sessionId].unshift({
        user: userMessage,
        ai: aiResponse,
        timestamp: Date.now()
    });
    
    // Keep only last 50 messages
    if (memoryStorage[sessionId].length > 50) {
        memoryStorage[sessionId] = memoryStorage[sessionId].slice(0, 50);
    }
    
    return true;
}

// Get chat history from memory
async function getChatHistory(sessionId, limit = 10) {
    return (memoryStorage[sessionId] || []).slice(0, limit);
}

// 🌟 AI Chat Route
app.post("/agent", async (req, res) => {
    try {
        const { message, sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: "Session ID is required" });
        }

        // Get chat history
        let history = await getChatHistory(sessionId, 5);
        
        // Format chat history with explicit AI instructions
        let formattedHistory = history
            .map(chat => `User: ${chat.user}\nAI: ${chat.ai}`)
            .join("\n");

        let inputWithHistory = formattedHistory ? 
            `# Previous messages (for context only):\n${formattedHistory}\n\n# New User Message:\nUser: ${message}\nAI:` :
            `# New User Message:\nUser: ${message}\nAI:`;

        // 🔥 Send message with explicit context to AI
        const aiResponse = await runPortfolioAssistant(inputWithHistory);

        // Extract AI response text
        const responseText = aiResponse?.[0]?.kwargs?.content || "No response received";

        // 📌 Store user message & AI reply
        await storeChat(sessionId, message, responseText);

        res.json({ response: aiResponse });

    } catch (error) {
        console.error("🔥 Error handling chat:", error);
        res.status(500).json({ error: error.message });
    }
});

// Add a route to clear chat history
app.post("/clear-chat", async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({ error: "Session ID is required" });
        }
        
        // Clear chat history for the session
        memoryStorage[sessionId] = [];
        
        res.json({ success: true, message: "Chat history cleared" });
    } catch (error) {
        console.error("Error clearing chat:", error);
        res.status(500).json({ error: error.message });
    }
});

// Health check route
app.get("/health", (req, res) => {
    res.json({ 
        status: "ok", 
        storage: "in-memory",
        memoryUsage: Object.keys(memoryStorage).length
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`💾 Using in-memory storage`);
});

export default { storeChat, getChatHistory };