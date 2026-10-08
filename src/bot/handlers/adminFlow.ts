import { Context } from 'telegraf';
import { googleSheetsService } from '../../services/googleSheets.js';
import { messages } from '../messages/templates.js';
import { keyboards } from '../keyboards/inline.js';

export async function handleAdminApprove(ctx: Context, userId: string, courseId: string) {
  if (!ctx.from) return;
  const adminId = String(ctx.from.id);

  // 1. Authorization check
  const isAuthorized = await googleSheetsService.isAdmin(adminId);
  if (!isAuthorized) {
    ctx.answerCbQuery('⛔ You are not authorized to perform admin actions.', { show_alert: true }).catch(() => {});
    return;
  }

  try {
    // 2. Fetch purchase
    const purchase = await googleSheetsService.getPurchaseByUserAndCourse(userId, courseId);
    if (!purchase) {
      ctx.answerCbQuery('❌ Purchase record not found.', { show_alert: true }).catch(() => {});
      return;
    }

    // 3. Prevent duplicate approval
    if (purchase.status === 'PAID') {
      ctx.answerCbQuery('⚠️ This purchase has ALREADY been approved!', { show_alert: true }).catch(() => {});
      return;
    }

    // 4. Update status in database (Instant write-through)
    await googleSheetsService.updatePurchaseStatus(userId, courseId, 'PAID', adminId);

    // 5. Fetch course details to get Drive link and ZIP password
    const course = await googleSheetsService.getCourseById(courseId);
    if (!course) {
      ctx.answerCbQuery('⚠️ Course details missing in database.', { show_alert: true }).catch(() => {});
      return;
    }

    // Answer callback query safely
    ctx.answerCbQuery('✅ Payment Approved! Access sent to customer.').catch(() => {});

    // 6. Update Admin Message UI in background
    const adminTag = ctx.from.username ? `@${ctx.from.username}` : `Admin (ID: ${adminId})`;
    try {
      if ('caption' in (ctx.callbackQuery?.message || {})) {
        await ctx.editMessageCaption(
          `${(ctx.callbackQuery?.message as any).caption}\n\n━━━━━━━━━━━━━━━━━━━━\n✅ <b>APPROVED</b> by ${adminTag} at ${new Date().toLocaleTimeString()}`,
          { parse_mode: 'HTML' }
        );
      } else if ('text' in (ctx.callbackQuery?.message || {})) {
        await ctx.editMessageText(
          `${(ctx.callbackQuery?.message as any).text}\n\n━━━━━━━━━━━━━━━━━━━━\n✅ <b>APPROVED</b> by ${adminTag} at ${new Date().toLocaleTimeString()}`,
          { parse_mode: 'HTML' }
        );
      }
    } catch (e) {
      // Ignored if message was unchanged
    }

    // 7. Deliver course to customer
    try {
      await ctx.telegram.sendMessage(
        userId,
        messages.paymentApprovedCustomerDelivery(course),
        {
          parse_mode: 'HTML',
          ...keyboards.courseDelivery(course.driveLink)
        }
      );
      console.log(`✅ [Delivery] Sent course ${course.courseName} to customer ${userId}`);
    } catch (sendErr: any) {
      console.warn(`⚠️ [Delivery] Could not deliver directly to customer ${userId}: ${sendErr.message}`);
    }
  } catch (error: any) {
    console.error('❌ [Admin Approve Error]:', error.message || error);
    ctx.answerCbQuery('❌ Error processing approval. Please check logs.').catch(() => {});
  }
}

export async function handleAdminReject(ctx: Context, userId: string, courseId: string) {
  if (!ctx.from) return;
  const adminId = String(ctx.from.id);

  const isAuthorized = await googleSheetsService.isAdmin(adminId);
  if (!isAuthorized) {
    ctx.answerCbQuery('⛔ You are not authorized to perform admin actions.', { show_alert: true }).catch(() => {});
    return;
  }

  try {
    const purchase = await googleSheetsService.getPurchaseByUserAndCourse(userId, courseId);
    if (!purchase) {
      ctx.answerCbQuery('❌ Purchase record not found.', { show_alert: true }).catch(() => {});
      return;
    }

    // Update status in Google Sheets
    await googleSheetsService.updatePurchaseStatus(userId, courseId, 'REJECTED', adminId);

    const course = await googleSheetsService.getCourseById(courseId);
    const courseName = course ? course.courseName : 'Course';

    ctx.answerCbQuery('❌ Payment Rejected. Customer notified.').catch(() => {});

    // Update Admin Message UI
    const adminTag = ctx.from.username ? `@${ctx.from.username}` : `Admin (ID: ${adminId})`;
    try {
      if ('caption' in (ctx.callbackQuery?.message || {})) {
        await ctx.editMessageCaption(
          `${(ctx.callbackQuery?.message as any).caption}\n\n━━━━━━━━━━━━━━━━━━━━\n❌ <b>REJECTED</b> by ${adminTag} at ${new Date().toLocaleTimeString()}`,
          { parse_mode: 'HTML' }
        );
      } else if ('text' in (ctx.callbackQuery?.message || {})) {
        await ctx.editMessageText(
          `${(ctx.callbackQuery?.message as any).text}\n\n━━━━━━━━━━━━━━━━━━━━\n❌ <b>REJECTED</b> by ${adminTag} at ${new Date().toLocaleTimeString()}`,
          { parse_mode: 'HTML' }
        );
      }
    } catch (e) {
      // Ignored if unchanged
    }

    // Notify customer politely
    try {
      const supportUsername = await googleSheetsService.getSetting('SUPPORT_USERNAME', '@coursebazar_support');
      await ctx.telegram.sendMessage(
        userId,
        messages.paymentRejectedCustomer(courseName, supportUsername),
        { parse_mode: 'HTML' }
      );
    } catch (notifyErr: any) {
      console.warn(`⚠️ [Rejection Notify] Customer notification notice: ${notifyErr.message}`);
    }
  } catch (error: any) {
    console.error('❌ [Admin Reject Error]:', error.message || error);
    ctx.answerCbQuery('❌ Error processing rejection.').catch(() => {});
  }
}

export async function handlePendingPaymentsList(ctx: Context) {
  if (!ctx.from) return;
  const isAuthorized = await googleSheetsService.isAdmin(ctx.from.id);
  if (!isAuthorized) {
    await ctx.reply('⛔ Access denied.');
    return;
  }

  try {
    const pending = await googleSheetsService.getPendingPurchases();
    if (pending.length === 0) {
      await ctx.reply(
        '✅ <b>No Pending Payments!</b>\n\nAll customer submissions have been verified and processed.',
        { parse_mode: 'HTML', ...keyboards.backToAdmin() }
      );
      return;
    }

    await ctx.reply(`⏳ <b>PENDING PAYMENTS (${pending.length})</b>\n\nReviewing each submission below:`, {
      parse_mode: 'HTML'
    });

    for (const p of pending) {
      const text = messages.adminPaymentNotification({
        telegramUserId: p.telegramUserId,
        telegramUsername: p.telegramUsername,
        customerName: p.customerName,
        courseName: p.courseName,
        amount: p.amount,
        courseId: p.courseId
      });

      if (p.paymentScreenshotFileId) {
        try {
          await ctx.replyWithPhoto(p.paymentScreenshotFileId, {
            caption: text,
            parse_mode: 'HTML',
            ...keyboards.adminApproval(p.telegramUserId, p.courseId)
          });
          // Small pause to prevent Telegram flood limits
          await new Promise(r => setTimeout(r, 60));
          continue;
        } catch (imgErr) {
          // If photo send fails, text fallback continues below
        }
      }

      await ctx.reply(text, {
        parse_mode: 'HTML',
        ...keyboards.adminApproval(p.telegramUserId, p.courseId)
      });
      await new Promise(r => setTimeout(r, 60));
    }

    await ctx.reply('Click below to return to admin panel:', keyboards.backToAdmin());
  } catch (err: any) {
    console.error('❌ [Pending Payments Error]:', err.message || err);
    await ctx.reply('⚠️ Failed to load pending payments.');
  }
}

export async function handleAdminCoursesStats(ctx: Context) {
  if (!ctx.from) return;
  const isAuthorized = await googleSheetsService.isAdmin(ctx.from.id);
  if (!isAuthorized) return;

  try {
    const courses = await googleSheetsService.getCourses(false);
    let text = `📚 <b>COURSES IN GOOGLE SHEETS (${courses.length})</b>\n\n`;

    courses.forEach((c, idx) => {
      const statusIcon = c.status.toLowerCase() === 'active' ? '🟢 Active' : '🔴 Inactive';
      text += `${idx + 1}. <b>${c.courseName}</b> (${c.courseId})\n` +
              `   💰 ₹${c.price} | 💾 ${c.courseSize} | ${statusIcon}\n\n`;
    });

    text += `<i>💡 Tip: To add or edit courses, simply add a new row in your Google Sheet "Courses" tab. The bot detects it automatically!</i>`;

    await ctx.reply(text, {
      parse_mode: 'HTML',
      ...keyboards.backToAdmin()
    });
  } catch (e: any) {
    console.error('❌ [Courses Stats Error]:', e.message || e);
  }
}

export async function handleAdminAllPurchases(ctx: Context) {
  if (!ctx.from) return;
  const isAuthorized = await googleSheetsService.isAdmin(ctx.from.id);
  if (!isAuthorized) return;

  try {
    const purchases = await googleSheetsService.getPurchases();
    if (purchases.length === 0) {
      await ctx.reply('🛒 No purchases recorded yet.', keyboards.backToAdmin());
      return;
    }

    let text = `🛒 <b>RECENT PURCHASES (${purchases.length})</b>\n\n`;
    purchases.slice(-10).reverse().forEach((p, idx) => {
      let icon = '⏳';
      if (p.status === 'PAID') icon = '✅';
      if (p.status === 'REJECTED') icon = '❌';
      if (p.status === 'EXPIRED') icon = '⌛';

      text += `${idx + 1}. ${icon} <b>${p.courseName}</b> - ₹${p.amount}\n` +
              `   User: @${p.telegramUsername || 'Anon'} (ID: <code>${p.telegramUserId}</code>)\n` +
              `   Status: <b>${p.status}</b>\n\n`;
    });

    await ctx.reply(text, {
      parse_mode: 'HTML',
      ...keyboards.backToAdmin()
    });
  } catch (e: any) {
    console.error('❌ [All Purchases Error]:', e.message || e);
  }
}
