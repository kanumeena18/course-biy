import { startTelegramBot } from './bot.js';
import { config } from '../config/config.js';
import { googleSheetsService } from '../services/googleSheets.js';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🎓 COURSE BAZAR - TELEGRAM BOT ENGINE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📌 Store Name: ${config.storeName}`);
console.log(`💳 UPI ID: ${config.upiId} (${config.payeeName})`);
console.log(`👑 Admin Telegram ID: ${config.adminTelegramId || 'NOT CONFIGURED'}`);
console.log(`📊 Google Sheets Configured: ${config.isGoogleConfigured ? 'YES' : 'NO (Using local memory database)'}`);
console.log(`🤖 Telegram Bot Token: ${config.isBotConfigured ? 'YES' : 'NO (Missing BOT_TOKEN in .env)'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function main() {
  if (!config.isBotConfigured) {
    console.error('❌ ERROR: BOT_TOKEN is missing or invalid in your .env file.');
    console.error('👉 Please follow the setup guide in README.md to obtain your Bot Token from @BotFather.');
    console.error('   Add BOT_TOKEN=123456789:ABC... to your .env file and restart.\n');
    process.exit(1);
  }

  const result = await startTelegramBot();
  if (result.success) {
    console.log('✅ Bot started! Open Telegram and type /start to test.');
  } else {
    console.error('❌ Failed to start bot:', result.message);
  }

  // Graceful shutdown on Ctrl+C or kill
  process.once('SIGINT', () => {
    console.log('\n🛑 Received SIGINT. Shutting down Course Bazar bot cleanly...');
    process.exit(0);
  });
  process.once('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM. Shutting down cleanly...');
    process.exit(0);
  });
}

main().catch(console.error);
