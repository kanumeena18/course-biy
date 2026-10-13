import { googleSheetsService, Purchase } from '../services/googleSheets.js';
import { messages } from '../bot/messages/templates.js';
import { keyboards } from '../bot/keyboards/inline.js';

export interface PaymentActionResult {
  success: boolean;
  alreadyProcessed?: boolean;
  error?: string;
  purchase?: Purchase;
  delivery?: { driveLink?: string; zipPassword?: string; courseName?: string };
}

/**
 * Shared utility function for approving or rejecting payments.
 * Used by both the Web Admin Dashboard (via API) and the Telegram callback handler.
 * Enforces atomic first-valid-action-wins rules, Google Sheets updates, and course delivery.
 */
export async function processPaymentAction(params: {
  userId: string;
  courseId: string;
  paymentId?: string;
  action: 'APPROVE' | 'REJECT';
  adminId: string;
  adminName?: string;
  rejectionReason?: string;
  telegram?: any; // Telegraf telegram instance or context for sending messages
}): Promise<PaymentActionResult> {
  const { userId, courseId, paymentId, action, adminId, adminName, rejectionReason, telegram } = params;

  const resolvedAdminId = String(adminId || '').trim();
  const resolvedAdminName = adminName || `Admin (${resolvedAdminId})`;

  try {
    // 1. Execute atomic decision in Google Sheets service
    const result = await googleSheetsService.processPaymentDecision({
      userId: String(userId).trim(),
      courseId: String(courseId).trim(),
      paymentId: paymentId ? String(paymentId).trim() : undefined,
      action,
      adminId: resolvedAdminId,
      adminName: resolvedAdminName,
      rejectionReason: rejectionReason || (action === 'APPROVE' ? undefined : 'Payment screenshot could not be verified')
    });

    if (result.alreadyProcessed || !result.success) {
      return {
        success: result.success,
        alreadyProcessed: result.alreadyProcessed,
        error: result.error,
        purchase: result.purchase
      };
    }

    const purchase = result.purchase;
    const decisionTime = new Date().toLocaleTimeString();

    // 2. If approved, deliver course access to customer via Telegram if telegram instance provided
    if (action === 'APPROVE' && purchase) {
      const course = await googleSheetsService.getCourseById(courseId);
      if (course && telegram) {
        try {
          await telegram.sendMessage(
            userId,
            messages.paymentApprovedCustomerDelivery(course),
            {
              parse_mode: 'HTML',
              ...keyboards.courseDelivery(course.driveLink)
            }
          );
          console.log(`✅ [SharedPayment] Sent course ${course.courseName} to customer ${userId}`);
        } catch (sendErr: any) {
          console.warn(`⚠️ [SharedPayment] Could not deliver directly to customer ${userId}: ${sendErr.message}`);
        }
      }
    }

    // 3. If rejected, notify customer via Telegram if telegram instance provided
    if (action === 'REJECT' && purchase && telegram) {
      try {
        await telegram.sendMessage(
          userId,
          messages.paymentRejectedCustomer(purchase.courseName, rejectionReason || 'Payment verification failed'),
          { parse_mode: 'HTML' }
        );
      } catch (rejErr: any) {
        console.warn(`⚠️ [SharedPayment] Could not send rejection notice to customer ${userId}: ${rejErr.message}`);
      }
    }

    // 4. Update other admin notifications in Telegram if telegram instance provided
    if (purchase && purchase.adminNotificationMessageIds && telegram) {
      const otherNotifs = purchase.adminNotificationMessageIds.filter(n => String(n.chatId) !== resolvedAdminId);
      if (otherNotifs.length > 0) {
        const actionTitle = action === 'APPROVE' ? '✅ <b>APPROVED</b>' : '❌ <b>REJECTED</b>';
        const notifText =
          `🔒 <b>PAYMENT PROCESSED</b>\n\n` +
          `🎓 <b>Course:</b> ${purchase.courseName}\n` +
          `👤 <b>Customer ID:</b> <code>${purchase.telegramUserId}</code>\n` +
          `💰 <b>Amount:</b> ₹${purchase.amount}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `${actionTitle} by ${resolvedAdminName} at ${decisionTime}`;

        Promise.allSettled(
          otherNotifs.map(async (notif) => {
            try {
              await telegram.editMessageCaption(notif.chatId, notif.messageId, undefined, notifText, { parse_mode: 'HTML' });
            } catch {
              try {
                await telegram.editMessageText(notif.chatId, notif.messageId, undefined, notifText, { parse_mode: 'HTML' });
              } catch {}
            }
          })
        ).catch(() => {});
      }
    }

    return {
      success: true,
      purchase,
      delivery: result.delivery
    };
  } catch (error: any) {
    console.error(`❌ [SharedPayment] Error processing ${action} for user ${userId}, course ${courseId}:`, error.message || error);
    return {
      success: false,
      error: error.message || 'Internal payment processing error'
    };
  }
}
