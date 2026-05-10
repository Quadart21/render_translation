import 'dotenv/config';
import { createBot } from './bot.js';

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('Задайте BOT_TOKEN в .env (см. .env.example)');
  process.exit(1);
}

const bot = createBot(token);
bot.launch().then(() => {
  console.log('Бот запущен (long polling)');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
