require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { google } = require("googleapis");
const fs = require("fs");

// Load environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH;
const SHEET_NAME = process.env.SHEET_NAME;

// Initialize Telegram Bot
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Initialize Google Sheets API
const auth = new google.auth.GoogleAuth({
  keyFile: CREDENTIALS_PATH,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

// Store user-specific selected dates
const userSelectedDate = {};

// Function to check if a chat ID is authorized
async function isAuthorizedChatId(chatId) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_NAME + "!H:H", // Column H for chat IDs
    });
    const chatIds = response.data.values.flat();
    return chatIds.includes(chatId.toString());
  } catch (error) {
    console.error("Error checking authorized chat ID:", error);
    return false;
  }
}

// Function to send a message to a Telegram chat
function sendMessage(chatId, message, replyMarkup) {
  bot.sendMessage(chatId, message, {
    parse_mode: "HTML",
    reply_markup: replyMarkup ? JSON.stringify(replyMarkup) : undefined,
  });
}

// Function to send a calendar for a specific month and year
async function sendCalendar(chatId, year, month) {
  try {
    if (month < 0) {
      month = 11;
      year -= 1;
    } else if (month > 11) {
      month = 0;
      year += 1;
    }

    const events = await loadEventsFromSheet();
    const calButtons = getCalendarButtons(year, month, events);
    sendMessage(
      chatId,
      `Here is the calendar for ${getMonthName(month)} ${year}:`,
      { inline_keyboard: calButtons }
    );
  } catch (error) {
    sendMessage(chatId, `Error sending calendar: ${error.message}`);
  }
}

// Function to handle callback queries from inline keyboard buttons
async function handleCallbackQuery(chatId, data) {
  try {
    const parts = data.split("_");

    if (parts[0] === "prev") {
      sendCalendar(chatId, parseInt(parts[1]), parseInt(parts[2]) - 1);
    } else if (parts[0] === "next") {
      sendCalendar(chatId, parseInt(parts[1]), parseInt(parts[2]) + 1);
    } else if (parts[0] === "today") {
      const today = new Date();
      sendEventsForDate(chatId, today);
    } else if (parts[0] === "date") {
      const date = new Date(parts[3], parts[2] - 1, parts[1]);
      userSelectedDate[chatId] = date; // Save the selected date
      sendEventsForDate(chatId, date);
    } else if (parts[0] === "delete") {
      handleDeleteEvent(chatId, parts[1] + "_" + parts[2] + "_" + parts[3]);
    }
  } catch (error) {
    sendMessage(chatId, `Error handling callback query: ${error.message}`);
  }
}

// Function to handle text input from the user (e.g., adding an event)
async function handleTextInput(chatId, text) {
  try {
    const selectedDate = userSelectedDate[chatId];

    if (!selectedDate) {
      sendMessage(chatId, "Please select a date first.");
      return;
    }

    if (!text.includes(",")) {
      sendMessage(chatId, "Invalid format. Please use: Event Name, HH:MM");
      return;
    }

    await saveEventToSheet(chatId, text, selectedDate);
  } catch (error) {
    sendMessage(chatId, `Error handling text input: ${error.message}`);
  }
}

// Function to save an event to the spreadsheet
async function saveEventToSheet(chatId, eventDetails, date) {
  try {
    const formattedDate = `${date.getDate()}_${
      date.getMonth() + 1
    }_${date.getFullYear()}`;
    const [eventName, eventTime] = eventDetails.split(/,\s*/);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Events!A:C",
      valueInputOption: "RAW",
      resource: {
        values: [[formattedDate, eventName, eventTime]],
      },
    });

    sendMessage(
      chatId,
      `✅ Event saved for ${formattedDate}: ${eventName} at ${eventTime}`
    );
  } catch (error) {
    sendMessage(chatId, `Error saving event: ${error.message}`);
  }
}

// Function to load events from the spreadsheet
async function loadEventsFromSheet() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Events!A:C",
    });
    const data = response.data.values || [];
    const events = {};

    data.slice(1).forEach((row) => {
      const [date, eventName, eventTime] = row;
      if (!events[date]) events[date] = [];
      events[date].push({ eventName, eventTime });
    });

    return events;
  } catch (error) {
    console.error("Error loading events from sheet:", error);
    return {};
  }
}

// Function to send events for a specific date
async function sendEventsForDate(chatId, date) {
  try {
    const formattedDate = `${date.getDate()}_${
      date.getMonth() + 1
    }_${date.getFullYear()}`;
    const events = await loadEventsFromSheet();
    const eventList = events[formattedDate]
      ? events[formattedDate]
          .map((event) => `• <b>${event.eventName}</b> at ${event.eventTime}`)
          .join("\n")
      : "No events scheduled.";

    sendMessage(chatId, `📅 <b>Events for ${formattedDate}:</b>\n${eventList}`);
    sendMessage(
      chatId,
      "Would you like to add an event? Reply with Event Name, HH:MM"
    );
  } catch (error) {
    sendMessage(chatId, `Error sending events for date: ${error.message}`);
  }
}

// Function to generate calendar buttons
function getCalendarButtons(year, month, events) {
  const buttons = [];
  buttons.push([
    { text: "⬅️", callback_data: `prev_${year}_${month}` },
    { text: `${getMonthName(month)} ${year}`, callback_data: "ignore" },
    { text: "➡️", callback_data: `next_${year}_${month}` },
  ]);
  buttons.push([{ text: "Today", callback_data: `today_${year}_${month}` }]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let week = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${day}_${month + 1}_${year}`;
    const hasEvent = events[dateKey] && events[dateKey].length > 0;
    const buttonText = hasEvent ? `📅 ${day}` : day.toString();
    week.push({ text: buttonText, callback_data: `date_${dateKey}` });
    if (week.length === 7 || day === daysInMonth) {
      buttons.push(week);
      week = [];
    }
  }
  return buttons;
}

// Function to get the name of a month by its index
function getMonthName(month) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[month];
}

// Listen for messages
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!(await isAuthorizedChatId(chatId))) {
    return; // Ignore unauthorized chat IDs
  }

  if (text === "/start") {
    sendMessage(
      chatId,
      "Welcome! Use /calendar to see the current month's calendar."
    );
  } else if (text === "/calendar") {
    sendCalendar(chatId, new Date().getFullYear(), new Date().getMonth());
  } else if (text === "/today") {
    sendCalendar(chatId, new Date().getFullYear(), new Date().getMonth());
  } else if (text === "/time") {
    const currentTime = new Date();
    const todayDate = `${currentTime.getDate()}_${
      currentTime.getMonth() + 1
    }_${currentTime.getFullYear()}`;
    const formattedTime = currentTime.toLocaleTimeString();
    sendMessage(chatId, `Current time is: ${formattedTime} ${todayDate}`);
  } else if (text) {
    handleTextInput(chatId, text);
  }
});

// Listen for callback queries
bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  handleCallbackQuery(chatId, data);
});

console.log("Bot is running...");
