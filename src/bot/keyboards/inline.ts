import { Markup } from 'telegraf';
import { Course, Purchase } from '../../types/index.js';
import { config } from '../../config/config.js';

export const keyboards = {
  mainMenu: () => {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('🔎 Search Course', 'search_course'),
        Markup.button.callback('📚 Browse Courses', 'browse_courses')
      ],
      [
        Markup.button.callback('🛒 My Purchases', 'my_purchases'),
        Markup.button.callback('❓ Help', 'help_info')
      ],
      [
        Markup.button.callback('💬 Support', 'support_info')
      ]
    ]);
  },

  courseList: (courses: Course[], page = 1, pageSize = 5) => {
    const totalPages = Math.ceil(courses.length / pageSize) || 1;
    const startIdx = (page - 1) * pageSize;
    const currentItems = courses.slice(startIdx, startIdx + pageSize);

    const buttons = currentItems.map(c => [
      Markup.button.callback(`🎓 ${c.courseName} - ${config.currency}${c.price}`, `course_${c.courseId}`)
    ]);

    const navRow = [];
    if (page > 1) {
      navRow.push(Markup.button.callback('⬅️ Prev', `page_${page - 1}`));
    }
    if (page < totalPages) {
      navRow.push(Markup.button.callback('➡️ Next', `page_${page + 1}`));
    }

    if (navRow.length > 0) {
      buttons.push(navRow);
    }

    buttons.push([Markup.button.callback('🔙 Back to Main Menu', 'back_to_menu')]);

    return Markup.inlineKeyboard(buttons);
  },

  searchResults: (courses: Course[]) => {
    const buttons = courses.map(c => [
      Markup.button.callback(`🎓 ${c.courseName} - ${config.currency}${c.price}`, `course_${c.courseId}`)
    ]);

    buttons.push([
      Markup.button.callback('🔎 Search Again', 'search_course'),
      Markup.button.callback('🔙 Back to Menu', 'back_to_menu')
    ]);

    return Markup.inlineKeyboard(buttons);
  },

  courseDetails: (courseId: string) => {
    return Markup.inlineKeyboard([
      [Markup.button.callback('🛒 BUY NOW', `buy_${courseId}`)],
      [Markup.button.callback('🔙 Back to Courses', 'browse_courses')]
    ]);
  },

  paymentStep: (courseId: string) => {
    return Markup.inlineKeyboard([
      [Markup.button.callback('✅ I HAVE PAID', `paid_${courseId}`)],
      [Markup.button.callback('❌ Cancel', `course_${courseId}`)]
    ]);
  },

  adminApproval: (userId: string, courseId: string) => {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ APPROVE PAYMENT', `admin_approve_${userId}_${courseId}`),
        Markup.button.callback('❌ REJECT PAYMENT', `admin_reject_${userId}_${courseId}`)
      ]
    ]);
  },

  myPurchases: (purchases: Purchase[]) => {
    const paidPurchases = purchases.filter(p => p.status === 'PAID');
    const buttons = paidPurchases.map(p => [
      Markup.button.callback(`📥 GET COURSE: ${p.courseName}`, `get_course_${p.courseId}`)
    ]);

    buttons.push([
      Markup.button.callback('📚 Browse Courses', 'browse_courses'),
      Markup.button.callback('🔙 Main Menu', 'back_to_menu')
    ]);

    return Markup.inlineKeyboard(buttons);
  },

  courseDelivery: (driveLink: string) => {
    return Markup.inlineKeyboard([
      [Markup.button.url('📥 Download Course from Google Drive', driveLink)],
      [Markup.button.callback('🛒 View All My Purchases', 'my_purchases')]
    ]);
  },

  adminDashboard: () => {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('⏳ Pending Payments', 'admin_pending_payments'),
        Markup.button.callback('📚 Courses Stats', 'admin_courses_stats')
      ],
      [
        Markup.button.callback('🛒 All Purchases', 'admin_all_purchases'),
        Markup.button.callback('📊 Refresh Stats', 'admin_refresh_stats')
      ],
      [
        Markup.button.callback('🔙 Exit to Main Menu', 'back_to_menu')
      ]
    ]);
  },

  backToAdmin: () => {
    return Markup.inlineKeyboard([
      [Markup.button.callback('🔙 Back to Admin Panel', 'admin_menu')]
    ]);
  }
};
