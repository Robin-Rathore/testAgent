import client from "./server.js"

const storeChat = async (sessionId, userMessage, botResponse) => {
    const chatHistory = await client.get(sessionId);
    let messages = chatHistory ? JSON.parse(chatHistory) : []

    messages.push({user: userMessage, bot: botResponse})

    await client.set(sessionId, JSON.stringify(messages))
}

const getChatHistory = async (sessionId) => {
    const chatHistory = await client.get(sessionId)
    return chatHistory ? JSON.parse(chatHistory) : []
}

export { storeChat, getChatHistory }  // Export the functions to be used elsewhere