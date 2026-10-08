import { Course, Purchase } from '../../types/index.js';
import { config } from '../../config/config.js';

export const messages = {
  welcome: () => {
    return (
      `🎓 <b>COURSE BAZAR</b>\n\n` +
      `Welcome to Course Bazar!\n\n` +
      `Find your course, make the payment using UPI, and receive your course access after payment verification.\n\n` +
      `Select an option below to get started:`
    );
  },

  help: (supportUsername = config.supportUsername) => {
    return (
      `❓ <b>HELP & HOW TO BUY</b>\n\n` +
      `1️⃣ Search or browse for your course.\n` +
      `2️⃣ Open the course details.\n` +
      `3️⃣ Click <b>Buy Now</b>.\n` +
      `4️⃣ Pay manually using our personal UPI QR code.\n` +
      `5️⃣ Click <b>✅ I HAVE PAID</b>.\n` +
      `6️⃣ Upload your payment screenshot.\n` +
      `7️⃣ Wait for manual admin verification in our bank app.\n` +
      `8️⃣ After approval, you will receive the Google Drive link and ZIP password!\n\n` +
      `💬 <b>Need assistance?</b>\n` +
      `Contact support at: ${supportUsername}`
    );
  },

  support: (supportUsername = config.supportUsername) => {
    return (
      `💬 <b>CUSTOMER SUPPORT</b>\n\n` +
      `Have questions about a course or payment?\n\n` +
      `Reach out directly to our official support handle:\n` +
      `👉 <b>${supportUsername}</b>\n\n` +
      `We typically respond within a few hours!`
    );
  },

  courseCard: (course: Course) => {
    return (
      `🎓 <b>${course.courseName.toUpperCase()}</b>\n\n` +
      `👤 <b>Creator:</b> ${course.creatorName}\n` +
      `🌐 <b>Language:</b> ${course.language}\n` +
      `💾 <b>Course Size:</b> ${course.courseSize}\n` +
      `💰 <b>Price:</b> ${config.currency}${course.price}\n` +
      `🏷️ <b>Original Price:</b> <s>${config.currency}${course.originalPrice}</s>\n` +
      `🔐 <b>Password Protected ZIP</b>\n` +
      `📦 <b>Digital Course</b>\n\n` +
      `📝 <i>${course.description}</i>`
    );
  },

  paymentCard: (course: Course, upiId = config.upiId, payeeName = config.payeeName) => {
    return (
      `💳 <b>PAYMENT DETAILS</b>\n\n` +
      `🎓 <b>Course:</b>\n${course.courseName}\n\n` +
      `💰 <b>Amount:</b>\n${config.currency}${course.price}\n\n` +
      `📱 <b>UPI ID:</b> <code>${upiId}</code>\n` +
      `👤 <b>Payee Name:</b> ${payeeName}\n\n` +
      `Please scan the QR code above and pay exactly <b>${config.currency}${course.price}</b>.\n\n` +
      `After completing the payment, click <b>✅ I HAVE PAID</b> below to upload your screenshot.`
    );
  },

  askScreenshot: (courseName: string) => {
    return (
      `📸 <b>UPLOAD PAYMENT SCREENSHOT</b>\n\n` +
      `For Course: <b>${courseName}</b>\n\n` +
      `Please send/upload the screenshot of your completed UPI payment now.\n\n` +
      `<i>Send the image directly as a photo in this chat.</i>`
    );
  },

  paymentSubmitted: () => {
    return (
      `⏳ <b>PAYMENT SUBMITTED</b>\n\n` +
      `Your payment screenshot has been submitted!\n\n` +
      `Our admin will manually verify the payment in our bank account.\n\n` +
      `You will receive the course download link and ZIP password after approval.`
    );
  },

  adminPaymentNotification: (p: {
    telegramUsername: string;
    telegramUserId: string;
    customerName: string;
    courseName: string;
    amount: number;
    courseId: string;
  }) => {
    return (
      `🔔 <b>NEW PAYMENT SUBMITTED</b>\n\n` +
      `👤 <b>Customer:</b> @${p.telegramUsername || 'NoUsername'} (${p.customerName || 'Anonymous'})\n` +
      `🆔 <b>Telegram ID:</b> <code>${p.telegramUserId}</code>\n` +
      `🎓 <b>Course:</b> ${p.courseName} (ID: ${p.courseId})\n` +
      `💰 <b>Amount:</b> ${config.currency}${p.amount}\n` +
      `⏳ <b>Status:</b> PAYMENT_SUBMITTED\n\n` +
      `⚠️ <i>Check your bank/UPI app to confirm receipt before approving!</i>`
    );
  },

  paymentApprovedCustomerDelivery: (course: Course) => {
    return (
      `✅ <b>PAYMENT VERIFIED</b>\n\n` +
      `Thank you for your payment!\n\n` +
      `🎓 <b>Course:</b> ${course.courseName}\n\n` +
      `📥 <b>COURSE DOWNLOAD:</b>\n` +
      `Click the button below to access the files on Google Drive.\n\n` +
      `🔐 <b>ZIP PASSWORD:</b>\n` +
      `<code>${course.zipPassword}</code>\n\n` +
      `📌 <i>Download the ZIP file and use the password above to extract it.\n` +
      `Keep this message safe for future access.</i>`
    );
  },

  paymentRejectedCustomer: (courseName: string, supportUsername = config.supportUsername) => {
    return (
      `❌ <b>PAYMENT NOT VERIFIED</b>\n\n` +
      `Your payment submission for <b>${courseName}</b> could not be verified in our bank account.\n\n` +
      `If you believe there was an error or money was deducted from your account, please contact our support team:\n` +
      `💬 Support: ${supportUsername}`
    );
  },

  myPurchasesList: (purchases: Purchase[]) => {
    if (purchases.length === 0) {
      return (
        `🛒 <b>MY PURCHASES</b>\n\n` +
        `You haven't purchased any courses yet.\n\n` +
        `Click <b>📚 Browse Courses</b> to find a course you'd like to learn!`
      );
    }

    let text = `🛒 <b>MY PURCHASES</b>\n\n`;
    purchases.forEach((p, idx) => {
      let statusIcon = '⏳';
      let statusLabel = 'Payment Verification Pending';
      if (p.status === 'PAID') {
        statusIcon = '✅';
        statusLabel = 'PAID & APPROVED';
      } else if (p.status === 'REJECTED') {
        statusIcon = '❌';
        statusLabel = 'REJECTED';
      } else if (p.status === 'EXPIRED') {
        statusIcon = '⌛';
        statusLabel = 'EXPIRED';
      }

      text += `${idx + 1}. 🎓 <b>${p.courseName}</b>\n` +
              `   💰 Amount: ${config.currency}${p.amount}\n` +
              `   Status: ${statusIcon} <b>${statusLabel}</b>\n\n`;
    });

    return text;
  },

  adminDashboard: (stats: {
    totalCourses: number;
    activeCourses: number;
    inactiveCourses: number;
    totalPurchases: number;
    paidPurchasesCount: number;
    pendingPurchasesCount: number;
    rejectedPurchasesCount: number;
    totalRevenue: number;
  }) => {
    return (
      `🎓 <b>COURSE BAZAR ADMIN PANEL</b>\n\n` +
      `📚 <b>Total Courses:</b> ${stats.totalCourses} (${stats.activeCourses} Active, ${stats.inactiveCourses} Inactive)\n` +
      `🛒 <b>Total Purchases:</b> ${stats.totalPurchases}\n` +
      `⏳ <b>Pending Payments:</b> ${stats.pendingPurchasesCount}\n` +
      `✅ <b>Paid Purchases:</b> ${stats.paidPurchasesCount}\n` +
      `❌ <b>Rejected Purchases:</b> ${stats.rejectedPurchasesCount}\n` +
      `💰 <b>Total Revenue:</b> ${config.currency}${stats.totalRevenue.toLocaleString()}\n\n` +
      `<i>Choose an option below to manage the store:</i>`
    );
  }
};
