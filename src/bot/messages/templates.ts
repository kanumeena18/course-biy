import { Course, Purchase } from '../../types/index.js';
import { config } from '../../config/config.js';

export const messages = {
  welcome: (welcomeText = 'Find your course, make the payment using UPI, and receive your course.') => {
    return (
      `🎓 <b>Welcome to Course Bazar!</b>\n\n` +
      `✨ ${welcomeText}\n\n` +
      `📚 Discover quality courses at affordable prices.\n` +
      `💳 Simple & secure UPI payment\n` +
      `⚡ Fast access after verification`
    );
  },

  help: () => {
    return (
      `❓ <b>HELP & HOW TO BUY</b>\n\n` +
      `1️⃣ Search or browse for your course.\n\n` +
      `2️⃣ Open the course details.\n\n` +
      `3️⃣ Click Buy Now.\n\n` +
      `4️⃣ Pay manually using our personal UPI QR code.\n\n` +
      `5️⃣ Click ✅ I HAVE PAID.\n\n` +
      `6️⃣ Upload your payment screenshot.\n\n` +
      `7️⃣ Wait for manual admin verification.\n\n` +
      `8️⃣ After approval, you will receive the Google Drive link and ZIP password!\n\n` +
      `💬 Need assistance?\n\n` +
      `📩 Email: <a href="mailto:coursebazar01@gmail.com">coursebazar01@gmail.com</a>\n` +
      `👤 Telegram: <a href="https://t.me/kanumeena18">@kanumeena18</a>`
    );
  },

  support: () => {
    return (
      `💬 <b>CUSTOMER SUPPORT</b>\n\n` +
      `Have questions about a course or payment?\n\n` +
      `📩 Email: <a href="mailto:coursebazar01@gmail.com">coursebazar01@gmail.com</a>\n` +
      `👤 Telegram: <a href="https://t.me/kanumeena18">@kanumeena18</a>\n\n` +
      `We’ll get back to you as soon as possible!`
    );
  },

  courseCard: (course: Course, contactInfo = config.supportUsername) => {
    const lines: string[] = [];

    // Header: 🎬 Course title / short title
    lines.push(`🎬 <b>${course.courseName}</b>\n`);

    // Course Information block
    lines.push(`🎓 <b>Course:</b> ${course.courseName}`);
    if (course.creatorName && course.creatorName.trim()) {
      lines.push(`👤 <b>Creator:</b> ${course.creatorName.trim()}`);
    }
    if (course.courseSize) {
      lines.push(`💾 <b>Course Size:</b> ${course.courseSize}`);
    }
    if (course.language) {
      lines.push(`👤 <b>Language:</b> ${course.language}`);
    }

    lines.push(''); // spacing

    // Pricing block
    if (course.originalPrice && course.originalPrice > 0) {
      lines.push(`💰 <b>Original Price:</b> ₹${course.originalPrice}`);
    }
    lines.push(`🔥 <b>Our Price:</b> ₹${course.price}`);

    // Description block (show if provided)
    if (course.description && course.description.trim()) {
      lines.push('');
      lines.push(`📚 <i>${course.description.trim()}</i>`);
    }

    // Google Drive Link block (if available)
    if (course.driveLink && course.driveLink.trim()) {
      lines.push('');
      lines.push(`🔗 <b>Get the Course:</b>\n${course.driveLink.trim()}`);
    }

    // Vertical spacing equivalent to two Enter/line breaks after Course Link, then Contact Email
    lines.push('');
    lines.push('');
    lines.push(`📩 <b>Contact:</b> <a href="mailto:coursebazar01@gmail.com">coursebazar01@gmail.com</a>`);

    return lines.join('\n');
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
