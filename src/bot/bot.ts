import { Telegraf, Context } from 'telegraf';
import { config } from '../config/config.js';
import {
  handleStart,
  handleHelp,
  handleSupport,
  handleCourses,
  handleSearchPrompt,
  handleMyOrders,
  handleAdmin
} from './handlers/commands.js';
import {
  handleUserText,
  handleCourseSelect,
  handleBuyNow,
  handleIHavePaid,
  handlePhotoUpload,
  handleGetCourse,
  sessionManager
} from './handlers/userFlow.js';
import {
  handleAdminApprove,
  handleAdminReject,
  handlePendingPaymentsList,
  handleAdminCoursesStats,
  handleAdminAllPurchases
} from './handlers/adminFlow.js';
import { googleSheetsService } from '../services/googleSheets.js';
import { keyboards } from './keyboards/inline.js';

// Global Process Protections against unhandled crashes
process.on('unhandledRejection', (reason: any) => {
  console.warn('⚠️ [Safe Catch] Unhandled Promise Rejection:', reason?.message || reason);
});
process.on('uncaughtException', (err: any) => {
  console.warn('⚠️ [Safe Catch] Uncaught Exception:', err?.message || err);
});

export function createBot(token = config.botToken): Telegraf<Context> | null {
  if (!token || !token.includes(':')) {
    console.warn('⚠️ No valid Telegram BOT_TOKEN provided in .env.');
    return null;
  }

  const bot = new Telegraf<Context>(token);

  // 1. Production Performance & Error Boundary Middleware
  bot.use(async (ctx, next) => {
    const startTime = Date.now();
    const userId = ctx.from?.id;
    const username = ctx.from?.username ? `@${ctx.from.username}` : `ID:${userId}`;
    const updateType = ctx.updateType;

    try {
      await next();
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.log(`⏱️ [Bot Perf Warning] ${username} -> ${updateType} took ${duration}ms`);
      }
    } catch (err: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ [Bot Error] ${username} -> ${updateType} failed after ${duration}ms:`, err.message || err);
      try {
        await ctx.reply('⚠️ Something went wrong processing your request. Please try again or type /start.');
      } catch (replyErr) {
        // User may have blocked the bot or chat expired
      }
    }
  });

  // Global Error Handler
  bot.catch((err: any, ctx: Context) => {
    console.error(`❌ [Telegraf Error Handler] Update ${ctx.updateType}:`, err.message || err);
  });

  // 2. Commands (Non-blocking, auto-reset state)
  bot.command('start', handleStart);
  bot.command('help', handleHelp);
  bot.command('support', handleSupport);
  bot.command('courses', handleCourses);
  bot.command('search', handleSearchPrompt);
  bot.command('myorders', handleMyOrders);
  bot.command('admin', handleAdmin);

  // 3. Navigation Actions
  bot.action('back_to_menu', async (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    await handleStart(ctx);
  });

  bot.action('browse_courses', async (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    await handleCourses(ctx);
  });

  bot.action('search_course', async (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    await handleSearchPrompt(ctx);
  });

  bot.action('my_purchases', async (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    await handleMyOrders(ctx);
  });

  bot.action('help_info', async (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    await handleHelp(ctx);
  });

  bot.action('support_info', async (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    await handleSupport(ctx);
  });

  // Pagination callback
  bot.action(/^page_(\d+)$/, async (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    const pageNum = parseInt(ctx.match[1], 10) || 1;
    try {
      const courses = await googleSheetsService.getCourses(true);
      await ctx.editMessageReplyMarkup(keyboards.courseList(courses, pageNum).reply_markup);
    } catch (e) {
      // Message content unchanged
    }
  });

  // Course Details
  bot.action(/^course_([a-zA-Z0-9_-]+)$/, async (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    const courseId = ctx.match[1];
    await handleCourseSelect(ctx, courseId);
  });

  // Buy Now Flow
  bot.action(/^buy_([a-zA-Z0-9_-]+)$/, async (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    const courseId = ctx.match[1];
    await handleBuyNow(ctx, courseId);
  });

  // Customer clicked "I HAVE PAID"
  bot.action(/^paid_([a-zA-Z0-9_-]+)$/, async (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    const courseId = ctx.match[1];
    await handleIHavePaid(ctx, courseId);
  });

  // Customer requests course link & password from My Purchases
  bot.action(/^get_course_([a-zA-Z0-9_-]+)$/, async (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    const courseId = ctx.match[1];
    await handleGetCourse(ctx, courseId);
  });

  // Admin Approval Action: admin_approve_{userId}_{courseId}
  bot.action(/^admin_approve_([a-zA-Z0-9_-]+)_([a-zA-Z0-9_-]+)$/, async (ctx) => {
    const userId = ctx.match[1];
    const courseId = ctx.match[2];
    await handleAdminApprove(ctx, userId, courseId);
  });

  // Admin Rejection Action: admin_reject_{userId}_{courseId}
  bot.action(/^admin_reject_([a-zA-Z0-9_-]+)_([a-zA-Z0-9_-]+)$/, async (ctx) => {
    const userId = ctx.match[1];
    const courseId = ctx.match[2];
    await handleAdminReject(ctx, userId, courseId);
  });

  // Admin Panel Navigation
  bot.action('admin_menu', async (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    await handleAdmin(ctx);
  });

  bot.action('admin_pending_payments', async (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    await handlePendingPaymentsList(ctx);
  });

  bot.action('admin_courses_stats', async (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    await handleAdminCoursesStats(ctx);
  });

  bot.action('admin_all_purchases', async (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    await handleAdminAllPurchases(ctx);
  });

  bot.action('admin_refresh_stats', async (ctx) => {
    ctx.answerCbQuery('Stats refreshed!').catch(() => {});
    await handleAdmin(ctx);
  });

  // 4. Message Listeners
  bot.on('photo', handlePhotoUpload);
  bot.on('text', handleUserText);

  return bot;
}

// Bot instance manager with auto-recovery and single-instance locking
let runningBotInstance: Telegraf<Context> | null = null;
let isBotRunning = false;
let expiryCheckInterval: NodeJS.Timeout | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;

export async function startTelegramBot(token = config.botToken): Promise<{ success: boolean; message: string }> {
  if (isBotRunning && runningBotInstance) {
    return { success: true, message: 'Bot is already running and active.' };
  }

  if (!token || !token.includes(':')) {
    return {
      success: false,
      message: 'Cannot start bot: BOT_TOKEN is missing or invalid in .env or settings.'
    };
  }

  try {
    const bot = createBot(token);
    if (!bot) {
      return { success: false, message: 'Failed to create bot instance.' };
    }

    runningBotInstance = bot;

    // Launch with resilient parameters
    await bot.launch({
      dropPendingUpdates: false,
      allowedUpdates: ['message', 'callback_query']
    });

    isBotRunning = true;
    console.log('🚀 [Bot] Course Bazar Telegram bot launched and actively listening for updates!');

    // Clean up any existing interval before creating a new one
    if (expiryCheckInterval) {
      clearInterval(expiryCheckInterval);
    }

    // Single managed interval for payment expiry check
    expiryCheckInterval = setInterval(async () => {
      try {
        const expired = await googleSheetsService.checkExpiredPurchases();
        if (expired > 0) {
          console.log(`⌛ [Bot Expiry] Marked ${expired} pending sessions as EXPIRED.`);
        }
      } catch (e: any) {
        console.warn('⚠️ [Bot Expiry Check notice]:', e.message || e);
      }
    }, 30 * 60 * 1000); // Check every 30 minutes
    if (expiryCheckInterval.unref) expiryCheckInterval.unref();

    return { success: true, message: 'Bot started successfully!' };
  } catch (error: any) {
    console.error('❌ [Bot Launch Error]:', error.message || error);
    isBotRunning = false;
    runningBotInstance = null;

    // Handle 409 Conflict (e.g. another instance running elsewhere)
    if (error.message?.includes('409') || error.message?.includes('Conflict')) {
      return {
        success: false,
        message: 'Conflict: Another bot instance is already polling with this BOT_TOKEN. Make sure only one process is active.'
      };
    }

    // Schedule safe retry after 5 seconds
    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        console.log('🔄 [Bot Auto-Recovery] Attempting to reconnect bot...');
        startTelegramBot(token).catch(() => {});
      }, 5000);
    }

    return { success: false, message: error.message || 'Failed to start bot' };
  }
}

export function stopTelegramBot(): { success: boolean; message: string } {
  if (!isBotRunning || !runningBotInstance) {
    return { success: true, message: 'Bot is not currently running.' };
  }

  try {
    if (expiryCheckInterval) {
      clearInterval(expiryCheckInterval);
      expiryCheckInterval = null;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    runningBotInstance.stop('USER_STOP');
    runningBotInstance = null;
    isBotRunning = false;
    console.log('🛑 [Bot] Telegram bot stopped cleanly.');
    return { success: true, message: 'Bot stopped successfully.' };
  } catch (error: any) {
    isBotRunning = false;
    runningBotInstance = null;
    return { success: false, message: error.message || 'Error stopping bot' };
  }
}

export function getBotStatus() {
  return {
    isRunning: isBotRunning,
    tokenConfigured: config.isBotConfigured,
    maskedToken: config.botToken ? `${config.botToken.substring(0, 7)}...${config.botToken.slice(-4)}` : 'Not set',
    adminId: config.adminTelegramId || 'Not set',
    upiId: config.upiId,
    payeeName: config.payeeName
  };
}
