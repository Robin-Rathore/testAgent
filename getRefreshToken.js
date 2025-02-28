import open from "open";
import express from "express";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 3000;

// Load your Google OAuth credentials from .env
const CLIENT_ID = '';
const CLIENT_SECRET = '';
const REDIRECT_URI = '';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Step 1: Generate Google OAuth URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline", // Needed to get a refresh token
  scope: ["https://www.googleapis.com/auth/calendar"],
  prompt: "consent", // Ensures refresh token is returned
});

// Step 2: Open the URL in browser for manual login
console.log("Authorize this app by visiting this URL:\n", authUrl);
open(authUrl);

// Step 3: Handle OAuth callback
app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  const { tokens } = await oauth2Client.getToken(code);

  console.log("Your Refresh Token:", tokens.refresh_token);
  console.log("Save this refresh token in your .env file!");

  res.send("Success! Check your terminal for the refresh token.");
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
