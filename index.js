require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { google } = require("googleapis");
const fs = require("fs");

// Load environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME;

// Initialize Telegram Bot
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Load Google Sheets credentials
const credentials = require("./credentials.json");
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

// Google Sheets configuration
// const SPREADSHEET_ID = "1xlcclQVHW8suj8QANt94JV2FrSStTQLRZKt5Y9CYXtc"; // Replace with your Google Sheet ID
// const SHEET_NAME = "Sheet1"; // Replace with your sheet name

// Listen for messages
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  // Respond to the message
  bot.sendMessage(chatId, `You said: ${text}`);

  // Save the message to Google Sheets
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:B`, // Adjust the range as needed
      valueInputOption: "RAW",
      resource: {
        values: [[new Date().toISOString(), text]], // Save timestamp and message
      },
    });
    console.log("Message saved to Google Sheets");
  } catch (error) {
    console.error("Error saving to Google Sheets:", error);
  }
});

console.log("Bot is running...");
