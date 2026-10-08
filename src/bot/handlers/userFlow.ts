import { Context } from 'telegraf';
import fs from 'fs';
import { googleSheetsService } from '../../services/googleSheets.js';
import { messages } from '../messages/templates.js';
import { keyboards } from '../keyboards/inline.js';
import { config } from '../../config/config.js';
import { handleSearchPrompt } from './commands.js';
import { Course } from '../../types/index.js';

export interface UserSession {
  step: 'IDLE' | 'SEARCHING_COURSE' | 'AWAITING_PAYMENT_SCREENSHOT';
  selectedCourseId?: string;
  pendingAmount?: number;
  updatedAt: number;
}

// Memory-safe Session Manager with TTL and automatic garbage collection
class SessionManager {
  private sessions = new Map<number, UserSession>();
  private readonly SESSION_TTL = 20 * 60 * 1000; // 20 minutes expiry

  constructor() {
    // Run cleanup every 10 minutes to prevent memory leak
    const interval = setInterval(() => this.cleanupStaleSessions(), 10 * 60 * 1000);
    if (interval.unref) interval.unref();
  }

  public getSession(userId: number): UserSession {
    const session = this.sessions.get(userId);
    const now = Date.now();

    if (!session) {
      return { step: 'IDLE', updatedAt: now };
    }

    // Auto-expire stale session
    if (now - session.updatedAt > this.SESSION_TTL) {
      this.sessions.delete(userId);
      return { step: 'IDLE', updatedAt: now };
    }

    return session;
  }

  public setStep(userId: number, step: UserSession['step'], extra?: { courseId?: string; amount?: number }) {
    const current = this.getSession(userId);
    this.sessions.set(userId, {
      ...current,
      step,
      ...(extra?.courseId !== undefined ? { selectedCourseId: extra.courseId } : {}),
      ...(extra?.amount !== undefined ? { pendingAmount: extra.amount } : {}),
      updatedAt: Date.now()
    });
  }

  public reset(userId: number) {
    this.sessions.delete(userId);
  }

  private cleanupStaleSessions() {
    const now = Date.now();
    for (const [userId, session] of this.sessions.entries()) {
      if (now - session.updatedAt > this.SESSION_TTL) {
        this.sessions.delete(userId);
      }
    }
  }
}

export const sessionManager = new SessionManager();

export async function handleUserText(ctx: Context) {
  if (!ctx.from || !('text' in (ctx.message || {}))) return;
  const userId = ctx.from.id;
  const rawText = (ctx.message as { text: string }).text.trim();

  // If user sent a command starting with '/', allow command routing
  if (rawText.startsWith('/')) {
    sessionManager.reset(userId);
    return;
  }

  const session = sessionManager.getSession(userId);

  // User was prompted to search a course
  if (session.step === 'SEARCHING_COURSE') {
    sessionManager.setStep(userId, 'IDLE');
    try {
      const startTime = Date.now();
      const results = await googleSheetsService.searchCourses(rawText);
      const duration = Date.now() - startTime;
      console.log(`🔎 [Search] Query "${rawText}" by User ${userId} -> ${results.length} found in ${duration}ms`);

      if (results.length === 0) {
        await ctx.reply(
          `❌ <b>No course found for "${rawText}".</b>\n\nTry searching with another keyword or browse all available courses below:`,
          {
            parse_mode: 'HTML',
            ...keyboards.courseList(await googleSheetsService.getCourses(true), 1)
          }
        );
        return;
      }

      // If single course match, present directly with thumbnail photo!
      if (results.length === 1) {
        await sendCourseCard(ctx, results[0]);
        return;
      }

      await ctx.reply(
        `🔎 <b>RESULTS FOR:</b> "${rawText}"\n\nFound <b>${results.length}</b> course(s):`,
        {
          parse_mode: 'HTML',
          ...keyboards.searchResults(results)
        }
      );
    } catch (err: any) {
      console.error('❌ [Search Error]:', err.message || err);
      await ctx.reply('⚠️ Search temporarily unavailable. Please try again.');
    }
    return;
  }

  // User is awaiting payment screenshot
  if (session.step === 'AWAITING_PAYMENT_SCREENSHOT') {
    await ctx.reply(
      '⚠️ <b>Screenshot Required:</b>\n' +
      'Please upload an image file of your payment screenshot directly as a photo in this chat.\n\n' +
      'If you wish to cancel or browse other courses, click below:',
      {
        parse_mode: 'HTML',
        ...keyboards.mainMenu()
      }
    );
    return;
  }

  // Default friendly fallback for general text
  await ctx.reply(
    `🎓 Welcome to Course Bazar! Please choose an option below to browse courses or check your purchases:`,
    keyboards.mainMenu()
  );
}

export async function sendCourseCard(ctx: Context, course: Course, prefixText = '') {
  const cardText = prefixText + messages.courseCard(course);
  const kb = keyboards.courseDetails(course.courseId);

  // Check if Image Thumbnail Path or URL is provided
  const thumb = course.thumbnailUrl?.trim();
  if (thumb) {
    // 1. If it's a web URL (http:// or https://)
    if (/^https?:\/\//i.test(thumb)) {
      try {
        await ctx.replyWithPhoto(thumb, {
          caption: cardText,
          parse_mode: 'HTML',
          ...kb
        });
        return;
      } catch (err: any) {
        console.warn(`⚠️ [Thumbnail send notice for ${course.courseId}]: ${err.message}. Falling back to clean text card.`);
      }
    }
    // 2. If it's a local file path
    else if (fs.existsSync(thumb)) {
      try {
        await ctx.replyWithPhoto({ source: thumb }, {
          caption: cardText,
          parse_mode: 'HTML',
          ...kb
        });
        return;
      } catch (err: any) {
        console.warn(`⚠️ [Local thumbnail send notice for ${course.courseId}]: ${err.message}. Falling back to clean text card.`);
      }
    }
  }

  // 3. Fallback: clean text card without image
  await ctx.reply(cardText, {
    parse_mode: 'HTML',
    ...kb
  });
}

export async function handleCourseSelect(ctx: Context, courseId: string) {
  try {
    const course = await googleSheetsService.getCourseById(courseId);
    if (!course) {
      await ctx.reply('❌ Course not found or has been removed.', keyboards.mainMenu());
      return;
    }

    if (course.status.toLowerCase() !== 'active') {
      await ctx.reply('⚠️ This course is currently unavailable.', keyboards.mainMenu());
      return;
    }

    await sendCourseCard(ctx, course);
  } catch (error: any) {
    console.error('❌ [CourseSelect Error]:', error.message || error);
    await ctx.reply('⚠️ Could not open course details.');
  }
}

export async function handleBuyNow(ctx: Context, courseId: string) {
  if (!ctx.from) return;
  const userId = ctx.from.id;

  try {
    const course = await googleSheetsService.getCourseById(courseId);
    if (!course || course.status.toLowerCase() !== 'active') {
      await ctx.reply('⚠️ This course is no longer active.', keyboards.mainMenu());
      return;
    }

    const upiId = await googleSheetsService.getSetting('UPI_ID', config.upiId);
    const payeeName = await googleSheetsService.getSetting('PAYEE_NAME', config.payeeName);

    sessionManager.setStep(userId, 'IDLE', {
      courseId: course.courseId,
      amount: course.price
    });

    const paymentText = messages.paymentCard(course, upiId, payeeName);

    // Check QR image existence
    if (config.qrImagePath && fs.existsSync(config.qrImagePath)) {
      try {
        await ctx.replyWithPhoto({ source: config.qrImagePath }, {
          caption: paymentText,
          parse_mode: 'HTML',
          ...keyboards.paymentStep(course.courseId)
        });
        return;
      } catch (err) {
        console.warn('⚠️ QR image send fallback to text card:', (err as Error).message);
      }
    }

    // Text card fallback
    await ctx.reply(paymentText, {
      parse_mode: 'HTML',
      ...keyboards.paymentStep(course.courseId)
    });
  } catch (error: any) {
    console.error('❌ [BuyNow Error]:', error.message || error);
    await ctx.reply('⚠️ Error generating payment screen.');
  }
}

export async function handleIHavePaid(ctx: Context, courseId: string) {
  if (!ctx.from) return;
  const userId = ctx.from.id;

  try {
    const course = await googleSheetsService.getCourseById(courseId);
    const courseName = course ? course.courseName : 'your selected course';

    sessionManager.setStep(userId, 'AWAITING_PAYMENT_SCREENSHOT', {
      courseId,
      amount: course?.price
    });

    await ctx.reply(messages.askScreenshot(courseName), { parse_mode: 'HTML' });
  } catch (err: any) {
    console.error('❌ [IHavePaid Error]:', err.message || err);
    await ctx.reply('⚠️ Please upload your payment screenshot.');
  }
}

export async function handlePhotoUpload(ctx: Context) {
  if (!ctx.from || !('photo' in (ctx.message || {}))) return;
  const userId = ctx.from.id;
  const session = sessionManager.getSession(userId);

  if (!session || !session.selectedCourseId) {
    await ctx.reply(
      '⚠️ No active course payment session found. Please select a course first and click <b>🛒 BUY NOW</b>.',
      { parse_mode: 'HTML', ...keyboards.mainMenu() }
    );
    return;
  }

  const course = await googleSheetsService.getCourseById(session.selectedCourseId);
  if (!course) {
    await ctx.reply('❌ Course not found.', keyboards.mainMenu());
    sessionManager.reset(userId);
    return;
  }

  // Pick highest resolution photo
  const photos = (ctx.message as { photo: Array<{ file_id: string }> }).photo;
  const bestPhoto = photos[photos.length - 1];
  const fileId = bestPhoto.file_id;

  const username = ctx.from.username || '';
  const customerName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'Customer';

  try {
    // 1. Record purchase immediately (Instant in-memory write-through)
    await googleSheetsService.recordPurchaseSubmission({
      telegramUserId: String(userId),
      telegramUsername: username,
      customerName,
      courseId: course.courseId,
      courseName: course.courseName,
      amount: course.price,
      paymentScreenshotFileId: fileId
    });

    // 2. Reset user session immediately
    sessionManager.reset(userId);

    // 3. Confirm to customer immediately
    await ctx.reply(messages.paymentSubmitted(), {
      parse_mode: 'HTML',
      ...keyboards.mainMenu()
    });

    // 4. Send admin notification in non-blocking background task
    notifyAdminNewPayment(ctx, {
      userId: String(userId),
      username,
      customerName,
      courseId: course.courseId,
      courseName: course.courseName,
      amount: course.price,
      fileId
    }).catch(adminErr => {
      console.warn('⚠️ Admin notification warning:', adminErr.message || adminErr);
    });
  } catch (error: any) {
    console.error('❌ [PhotoUpload Error]:', error.message || error);
    await ctx.reply('⚠️ An error occurred while saving your submission. Please try again.');
  }
}

async function notifyAdminNewPayment(
  ctx: Context,
  data: {
    userId: string;
    username: string;
    customerName: string;
    courseId: string;
    courseName: string;
    amount: number;
    fileId: string;
  }
) {
  const adminId = config.adminTelegramId;
  if (!adminId) {
    console.log('ℹ️ [Admin Alert] ADMIN_TELEGRAM_ID not configured in .env. Skipping Telegram message to admin.');
    return;
  }

  const adminText = messages.adminPaymentNotification({
    telegramUserId: data.userId,
    telegramUsername: data.username,
    customerName: data.customerName,
    courseId: data.courseId,
    courseName: data.courseName,
    amount: data.amount
  });

  try {
    await ctx.telegram.sendPhoto(adminId, data.fileId, {
      caption: adminText,
      parse_mode: 'HTML',
      ...keyboards.adminApproval(data.userId, data.courseId)
    });
    console.log(`✅ [Admin Alert] Payment notification sent to admin ${adminId}`);
  } catch (err: any) {
    console.warn(`⚠️ [Admin Alert] Photo send to admin ${adminId} failed (${err.message}). Trying text message fallback...`);
    try {
      await ctx.telegram.sendMessage(adminId, adminText, {
        parse_mode: 'HTML',
        ...keyboards.adminApproval(data.userId, data.courseId)
      });
    } catch (textErr: any) {
      console.warn(`⚠️ [Admin Alert] Text send to admin also failed: ${textErr.message}. Make sure Admin ${adminId} has clicked /start on the bot.`);
    }
  }
}

export async function handleGetCourse(ctx: Context, courseId: string) {
  if (!ctx.from) return;
  const userId = String(ctx.from.id);

  try {
    // SECURITY CHECK: Verify Telegram User ID matches purchase AND Status = PAID
    const purchase = await googleSheetsService.getPurchaseByUserAndCourse(userId, courseId);

    if (!purchase) {
      await ctx.reply('❌ No purchase record found for this course.', keyboards.mainMenu());
      return;
    }

    if (purchase.status !== 'PAID') {
      let statusNote = 'Payment verification pending.';
      if (purchase.status === 'REJECTED') statusNote = 'Payment was rejected.';
      if (purchase.status === 'EXPIRED') statusNote = 'Payment session expired.';

      await ctx.reply(
        `⛔ <b>Access Restricted</b>\n\nStatus: <b>${statusNote}</b>\nCourse materials and ZIP passwords are only delivered once payment is verified and approved by admin.`,
        { parse_mode: 'HTML', ...keyboards.mainMenu() }
      );
      return;
    }

    const course = await googleSheetsService.getCourseById(courseId);
    if (!course) {
      await ctx.reply('❌ Course data could not be found.', keyboards.mainMenu());
      return;
    }

    // Deliver course with Google Drive link and ZIP password!
    await ctx.reply(messages.paymentApprovedCustomerDelivery(course), {
      parse_mode: 'HTML',
      ...keyboards.courseDelivery(course.driveLink)
    });
  } catch (error: any) {
    console.error('❌ [GetCourse Error]:', error.message || error);
    await ctx.reply('⚠️ Error fetching course details.');
  }
}
