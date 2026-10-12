import { Context } from 'telegraf';
import { googleSheetsService } from '../../services/googleSheets.js';
import { messages } from '../messages/templates.js';
import { keyboards } from '../keyboards/inline.js';

export async function handleAdminApprove(ctx: Context, userId: string, courseId: string, paymentId?: string) {
  if (!ctx.from) return;
  const adminId = String(ctx.from.id);
  const adminTag = ctx.from.username ? `@${ctx.from.username}` : (ctx.from.first_name || `Admin (${adminId})`);

  try {
    // 1. First-Valid-Action-Wins Atomic Decision
    const result = await googleSheetsService.processPaymentDecision({
      userId,
      courseId,
      paymentId,
      action: 'APPROVE',
      adminId,
      adminName: adminTag
    });

    if (result.alreadyProcessed) {
      ctx.answerCbQuery(
        result.error || '⚠️ This payment has already been processed by another admin.',
        { show_alert: true }
      ).catch(() => {});

      // Remove buttons and show processed state on this admin's message immediately
      try {
        const processedNote = `\n\n━━━━━━━━━━━━━━━━━━━━\n🔒 <b>ALREADY PROCESSED</b>: This payment was already handled.`;
        if ('caption' in (ctx.callbackQuery?.message || {})) {
          await ctx.editMessageCaption((ctx.callbackQuery?.message as any).caption + processedNote, { parse_mode: 'HTML' });
        } else if ('text' in (ctx.callbackQuery?.message || {})) {
          await ctx.editMessageText((ctx.callbackQuery?.message as any).text + processedNote, { parse_mode: 'HTML' });
        }
      } catch (e) {}
      return;
    }

    if (!result.success) {
      ctx.answerCbQuery(result.error || '❌ Error processing payment approval.', { show_alert: true }).catch(() => {});
      return;
    }

    // Answer winning admin's callback query
    ctx.answerCbQuery('✅ Payment Approved! Access sent to customer.').catch(() => {});

    // 2. Update winning admin's message (Remove buttons!)
    const decisionTime = new Date().toLocaleTimeString();
    try {
      const winningNote = `\n\n━━━━━━━━━━━━━━━━━━━━\n✅ <b>APPROVED</b> by ${adminTag} at ${decisionTime}`;
      if ('caption' in (ctx.callbackQuery?.message || {})) {
        await ctx.editMessageCaption((ctx.callbackQuery?.message as any).caption + winningNote, { parse_mode: 'HTML' });
      } else if ('text' in (ctx.callbackQuery?.message || {})) {
        await ctx.editMessageText((ctx.callbackQuery?.message as any).text + winningNote, { parse_mode: 'HTML' });
      }
    } catch (e) {}

    // 3. Deliver course access to customer IMMEDIATELY without waiting for admin loops!
    const course = await googleSheetsService.getCourseById(courseId);
    if (course) {
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
    }

    // 4. Update all other admins' pending notifications CONCURRENTLY in background
    const notifs = result.purchase?.adminNotificationMessageIds || [];
    const otherNotifs = notifs.filter(n => String(n.chatId) !== adminId);
    if (otherNotifs.length > 0) {
      const notifText =
        `🔒 <b>PAYMENT PROCESSED</b>\n\n` +
        `🎓 <b>Course:</b> ${result.purchase?.courseName}\n` +
        `👤 <b>Customer ID:</b> <code>${result.purchase?.telegramUserId}</code>\n` +
        `💰 <b>Amount:</b> ₹${result.purchase?.amount}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `✅ <b>APPROVED</b> by ${adminTag} at ${decisionTime}`;

      Promise.allSettled(
        otherNotifs.map(async (notif) => {
          try {
            await ctx.telegram.editMessageCaption(notif.chatId, notif.messageId, undefined, notifText, { parse_mode: 'HTML' });
          } catch {
            try {
              await ctx.telegram.editMessageText(notif.chatId, notif.messageId, undefined, notifText, { parse_mode: 'HTML' });
            } catch {}
          }
        })
      ).catch(() => {});
    }
  } catch (error: any) {
    console.error('❌ [Admin Approve Error]:', error.message || error);
    ctx.answerCbQuery('❌ Error processing approval. Please check logs.').catch(() => {});
  }
}

export async function handleAdminReject(ctx: Context, userId: string, courseId: string, paymentId?: string, reason?: string) {
  if (!ctx.from) return;
  const adminId = String(ctx.from.id);
  const adminTag = ctx.from.username ? `@${ctx.from.username}` : (ctx.from.first_name || `Admin (${adminId})`);

  try {
    const result = await googleSheetsService.processPaymentDecision({
      userId,
      courseId,
      paymentId,
      action: 'REJECT',
      adminId,
      adminName: adminTag,
      rejectionReason: reason || 'Payment screenshot could not be verified'
    });

    if (result.alreadyProcessed) {
      ctx.answerCbQuery(
        result.error || '⚠️ This payment has already been processed by another admin.',
        { show_alert: true }
      ).catch(() => {});

      try {
        const processedNote = `\n\n━━━━━━━━━━━━━━━━━━━━\n🔒 <b>ALREADY PROCESSED</b>: This payment was already handled.`;
        if ('caption' in (ctx.callbackQuery?.message || {})) {
          await ctx.editMessageCaption((ctx.callbackQuery?.message as any).caption + processedNote, { parse_mode: 'HTML' });
        } else if ('text' in (ctx.callbackQuery?.message || {})) {
          await ctx.editMessageText((ctx.callbackQuery?.message as any).text + processedNote, { parse_mode: 'HTML' });
        }
      } catch (e) {}
      return;
    }

    if (!result.success) {
      ctx.answerCbQuery(result.error || '❌ Error processing rejection.', { show_alert: true }).catch(() => {});
      return;
    }

    ctx.answerCbQuery('❌ Payment Rejected. Customer notified.').catch(() => {});

    // Update winning admin's message
    const decisionTime = new Date().toLocaleTimeString();
    try {
      const winningNote = `\n\n━━━━━━━━━━━━━━━━━━━━\n❌ <b>REJECTED</b> by ${adminTag} at ${decisionTime}`;
      if ('caption' in (ctx.callbackQuery?.message || {})) {
        await ctx.editMessageCaption((ctx.callbackQuery?.message as any).caption + winningNote, { parse_mode: 'HTML' });
      } else if ('text' in (ctx.callbackQuery?.message || {})) {
        await ctx.editMessageText((ctx.callbackQuery?.message as any).text + winningNote, { parse_mode: 'HTML' });
      }
    } catch (e) {}

    // Notify customer politely right away
    try {
      const course = await googleSheetsService.getCourseById(courseId);
      const courseName = course ? course.courseName : (result.purchase?.courseName || 'Course');
      const supportUsername = await googleSheetsService.getSetting('SUPPORT_USERNAME', '@kanumeena18');
      await ctx.telegram.sendMessage(
        userId,
        messages.paymentRejectedCustomer(courseName, supportUsername),
        { parse_mode: 'HTML' }
      );
    } catch (notifyErr: any) {
      console.warn(`⚠️ [Rejection Notify] Customer notification notice: ${notifyErr.message}`);
    }

    // Update all other admins' pending notifications CONCURRENTLY in background
    const notifs = result.purchase?.adminNotificationMessageIds || [];
    const otherNotifs = notifs.filter(n => String(n.chatId) !== adminId);
    if (otherNotifs.length > 0) {
      const notifText =
        `🔒 <b>PAYMENT PROCESSED</b>\n\n` +
        `🎓 <b>Course:</b> ${result.purchase?.courseName}\n` +
        `👤 <b>Customer ID:</b> <code>${result.purchase?.telegramUserId}</code>\n` +
        `💰 <b>Amount:</b> ₹${result.purchase?.amount}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `❌ <b>REJECTED</b> by ${adminTag} at ${decisionTime}`;

      Promise.allSettled(
        otherNotifs.map(async (notif) => {
          try {
            await ctx.telegram.editMessageCaption(notif.chatId, notif.messageId, undefined, notifText, { parse_mode: 'HTML' });
          } catch {
            try {
              await ctx.telegram.editMessageText(notif.chatId, notif.messageId, undefined, notifText, { parse_mode: 'HTML' });
            } catch {}
          }
        })
      ).catch(() => {});
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
