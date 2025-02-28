// redismanagement.js
import client from "./server.js";

// Store chat messages
export async function storeChat(sessionId, userMessage, aiResponse) {
  if (!client || !client.isReady) {
    console.log("Redis client not available for storing chat");
    return false;
  }

  try {
    const timestamp = Date.now();
    const chatEntry = {
      user: userMessage,
      ai: aiResponse,
      timestamp
    };
    
    // Convert to JSON string
    const chatEntryString = JSON.stringify(chatEntry);
    
    // Use Redis list to store chat history
    await client.lPush(`chat:${sessionId}`, chatEntryString);
    
    // Optional: Set expiry for chat sessions
    await client.expire(`chat:${sessionId}`, 60 * 60 * 24 * 7); // 7 days
    
    return true;
  } catch (error) {
    console.error("Error storing chat:", error);
    return false;
  }
}

// Get chat history
export async function getChatHistory(sessionId, limit = 10) {
  if (!client || !client.isReady) {
    console.log("Redis client not available for getting chat history");
    return [];
  }

  try {
    // Retrieve latest messages
    const chatHistory = await client.lRange(`chat:${sessionId}`, 0, limit - 1);
    
    // Parse JSON strings back to objects
    return chatHistory.map(entry => JSON.parse(entry));
  } catch (error) {
    console.error("Error retrieving chat history:", error);
    return [];
  }
}