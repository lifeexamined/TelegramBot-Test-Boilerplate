# Telegram Bot with Google Sheets Integration

This is a Telegram bot written in JavaScript (also uses NodeJS) that responds to messages and saves them to Google Sheets.

## Telegram Bot Setup

1. Open Telegram and search for the BotFather (the official bot for creating Telegram bots).

2. Start a chat with **BotFather** and use the /newbot command.

3. Follow the instructions to name your bot and create a username.

4. Once the bot is created, BotFather will provide you with a Bot Token. Save this token securely; you’ll need it later.



## Google Sheets Setup

1. Go to Google Sheets and create a new spreadsheet.

2. Name the spreadsheet (e.g., "Telegram Bot Data").

3. In the first row, add headers like UserID, Message, and Timestamp.

4. Save the spreadsheet.



## Google API Setup

1. Go to the **Google Cloud Console**.

2. Create a new project (e.g., "Telegram Bot Project").

3. Enable the Google Sheets API and Google Drive API for your project.

4. Create credentials for the API:
   Go to APIs & Services > Credentials.

5. Click Create Credentials and select Service Account.

6. Name the service account (e.g., "Telegram Bot Service Account").

7. After creating the service account, go to the Keys tab and create a new key. Choose JSON format and download the key file.

8. Share your Google Sheet with the service account:

   Open your Google Sheet, click Share, and add the service account email (found in the JSON key file) with Editor permissions.



## NodeJS Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/your-repo-name.git

   ```

2. Install dependencies:
   npm install

3. Set up environment variables in a .env file:
   TELEGRAM_BOT_TOKEN=your-telegram-bot-token
   SPREADSHEET_ID=your-spreadsheet-id

4. Run the bot:
   node index.js
