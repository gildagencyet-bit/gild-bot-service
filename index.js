const TelegramBot = require('node-telegram-bot-api');
const admin = require('firebase-admin');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, {polling: true});

const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT || './firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

console.log("GILD Bot is starting...");

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Welcome to GILD Agency! / ሰላም፣ ወደ GILD ኤጀንሲ እንኳን መጡ!");
});
