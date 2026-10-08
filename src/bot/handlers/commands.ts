import { Context } from 'telegraf';
import { messages } from '../messages/templates.js';
import { keyboards } from '../keyboards/inline.js';
import { googleSheetsService } from '../../services/googleSheets.js';
import { sessionManager } from './userFlow.js';

export async function handleStart(ctx: Context) {
  if (ctx.from) {
    sessionManager.reset(ctx.from.id);
  }
  try {
    const welcomeSetting = await googleSheetsService.getSetting(
      'WELCOME_MESSAGE',
      'Find your course, make the payment using UPI, and receive your course.'
    );
    const text = messages.welcome(welcomeSetting);
    await ctx.reply(text, {
      parse_mode: 'HTML',
      ...keyboards.mainMenu()
    });
  } catch (error: any) {
    console.error('❌ [Command /start Error]:', error.message || error);
    try {
      await ctx.reply('Welcome to Course Bazar! Please use the buttons below to browse our courses.', keyboards.mainMenu());
    } catch (e) {}
  }
}

export async function handleHelp(ctx: Context) {
  if (ctx.from) {
    sessionManager.reset(ctx.from.id);
  }
  try {
    await ctx.reply(messages.help(), {
      parse_mode: 'HTML',
      ...keyboards.mainMenu()
    });
  } catch (error: any) {
    console.error('❌ [Command /help Error]:', error.message || error);
    try {
      await ctx.reply('Need assistance? Please contact customer support.', keyboards.mainMenu());
    } catch (e) {}
  }
}

export async function handleSupport(ctx: Context) {
  if (ctx.from) {
    sessionManager.reset(ctx.from.id);
  }
  try {
    await ctx.reply(messages.support(), {
      parse_mode: 'HTML',
      ...keyboards.mainMenu()
    });
  } catch (error: any) {
    console.error('❌ [Command /support Error]:', error.message || error);
  }
}

export async function handleCourses(ctx: Context) {
  if (ctx.from) {
    sessionManager.reset(ctx.from.id);
  }
  try {
    const activeCourses = await googleSheetsService.getCourses(true);
    if (activeCourses.length === 0) {
      await ctx.reply('📚 No courses are currently available. Please check back soon!', keyboards.mainMenu());
      return;
    }
    await ctx.reply(
      `📚 <b>AVAILABLE COURSES (${activeCourses.length})</b>\n\nClick any course below to view syllabus, size, and pricing:`,
      {
        parse_mode: 'HTML',
        ...keyboards.courseList(activeCourses, 1)
      }
    );
  } catch (error: any) {
    console.error('❌ [Command /courses Error]:', error.message || error);
    try {
      await ctx.reply('⚠️ Unable to fetch courses right now. Please try again in a moment.');
    } catch (e) {}
  }
}

export async function handleSearchPrompt(ctx: Context) {
  if (ctx.from) {
    sessionManager.setStep(ctx.from.id, 'SEARCHING_COURSE');
  }
  try {
    await ctx.reply(
      '🔎 <b>SEARCH COURSE</b>\n\nPlease enter the name or keyword of the course you are looking for:\n<i>(Example: Storytelling, YouTube, Editing)</i>',
      { parse_mode: 'HTML' }
    );
  } catch (error: any) {
    console.error('❌ [Command /search Error]:', error.message || error);
  }
}

export async function handleMyOrders(ctx: Context) {
  if (!ctx.from) return;
  sessionManager.reset(ctx.from.id);

  try {
    const userPurchases = await googleSheetsService.getPurchases(String(ctx.from.id));
    const text = messages.myPurchasesList(userPurchases);
    await ctx.reply(text, {
      parse_mode: 'HTML',
      ...keyboards.myPurchases(userPurchases)
    });
  } catch (error: any) {
    console.error('❌ [Command /myorders Error]:', error.message || error);
    try {
      await ctx.reply('⚠️ Unable to retrieve your purchases at the moment.');
    } catch (e) {}
  }
}

export async function handleAdmin(ctx: Context) {
  if (!ctx.from) return;
  sessionManager.reset(ctx.from.id);

  try {
    const isAdminUser = await googleSheetsService.isAdmin(ctx.from.id);
    if (!isAdminUser) {
      await ctx.reply('⛔ <b>Access Denied:</b> This command is restricted to Course Bazar administrators only.', {
        parse_mode: 'HTML'
      });
      return;
    }

    const stats = await googleSheetsService.getStatistics();
    await ctx.reply(messages.adminDashboard(stats), {
      parse_mode: 'HTML',
      ...keyboards.adminDashboard()
    });
  } catch (error: any) {
    console.error('❌ [Command /admin Error]:', error.message || error);
    try {
      await ctx.reply('⚠️ Failed to load admin dashboard.');
    } catch (e) {}
  }
}
