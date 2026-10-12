import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Image as ImageIcon, CheckCircle, XCircle, AlertCircle, RefreshCw, QrCode, Lock, Download, ExternalLink, ShieldCheck, UserCheck, Smartphone, BellRing, Shield, User } from 'lucide-react';
import { Course, Purchase, AdminUser } from '../types/index.js';
import { authFetch } from '../services/apiClient.js';

interface Message {
  id: string;
  sender: 'bot' | 'user' | 'admin';
  text: string;
  photoUrl?: string;
  timestamp: string;
  buttons?: Array<{ label: string; action: string; url?: string }>;
  isAlert?: boolean;
}

interface TelegramSimulatorProps {
  courses: Course[];
  purchases: Purchase[];
  admins?: AdminUser[];
  onRefreshData: () => void;
  configData: {
    upiId: string;
    payeeName: string;
    supportUsername: string;
    currency: string;
    storeName: string;
  };
}

export const TelegramSimulator: React.FC<TelegramSimulatorProps> = ({
  courses,
  purchases,
  admins = [],
  onRefreshData,
  configData
}) => {
  const [activeScreen, setActiveScreen] = useState<'customer' | 'admin'>('customer');
  const [inputText, setInputText] = useState('');
  const [simStep, setSimStep] = useState<'idle' | 'searching' | 'awaiting_screenshot'>('idle');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [actingAdminId, setActingAdminId] = useState<string>('');

  // Memoized O(1) Lookup Maps and Search Index for high efficiency
  const coursesById = useMemo(() => {
    const map = new Map<string, Course>();
    for (const c of courses) {
      if (c.courseId) {
        map.set(c.courseId.toLowerCase(), c);
      }
    }
    return map;
  }, [courses]);

  const adminsById = useMemo(() => {
    const map = new Map<string, AdminUser>();
    for (const a of admins) {
      if (a.telegramId) {
        map.set(a.telegramId, a);
      }
    }
    return map;
  }, [admins]);

  const activeCourses = useMemo(() => {
    return courses.filter(c => (c.status || '').toLowerCase() === 'active');
  }, [courses]);

  // Unique active courses deduplicated by courseId
  const uniqueActiveCourses = useMemo(() => {
    const seen = new Set<string>();
    const res: Course[] = [];
    for (const c of activeCourses) {
      const id = (c.courseId || '').trim().toLowerCase();
      if (id && !seen.has(id)) {
        seen.add(id);
        res.push(c);
      }
    }
    return res;
  }, [activeCourses]);

  // Pre-tokenized search index for active courses for ultra-fast matching
  const searchIndex = useMemo(() => {
    return activeCourses.map(c => ({
      course: c,
      searchContent: `${(c.courseName || '').toLowerCase()} ${(c.creatorName || '').toLowerCase()} ${(c.description || '').toLowerCase()}`
    }));
  }, [activeCourses]);

  // Customer Chat Messages
  const [customerMessages, setCustomerMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'bot',
      text: `🎓 <b>Welcome to Course Bazar!</b>\n\n📚 Discover quality courses at affordable prices.\n\n🔎 Search for a course by name to get started.\n\n💳 Simple & secure payment\n⚡ Fast access after verification`,
      timestamp: '10:00 AM',
      buttons: [
        { label: '🔍 Search Course', action: 'search' },
        { label: '📚 Send All Course', action: 'send_all_courses' },
        { label: '🛒 My Purchases', action: 'my_purchases' },
        { label: '🌐 Browse Courses', action: 'browse' },
        { label: '❓ Help to Buy', action: 'help' },
        { label: '📞 Support', action: 'support' }
      ]
    }
  ]);

  // Admin Notification Messages
  const [adminMessages, setAdminMessages] = useState<Message[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const adminChatEndRef = useRef<HTMLDivElement>(null);

  // Formatter matching Telegram Bot's redesigned course card layout
  const formatCourseCard = (course: Course) => {
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
      lines.push(`💰 <b>Original Price:</b> ${configData.currency}${course.originalPrice}`);
    }
    lines.push(`🔥 <b>Our Price:</b> ${configData.currency}${course.price}`);

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
    lines.push(`📩 <b>Contact:</b> <a href="mailto:coursebazar01@gmail.com" class="text-blue-600 underline font-medium">coursebazar01@gmail.com</a>`);

    return lines.join('\n');
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [customerMessages]);

  useEffect(() => {
    adminChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [adminMessages]);

  // Sync latest pending purchases into Admin view
  useEffect(() => {
    const pending = purchases.filter(p => p.status === 'PAYMENT_SUBMITTED');
    const existingIds = new Set(adminMessages.map(m => m.id));

    const newMsgs: Message[] = [];
    pending.forEach(p => {
      const msgId = `admin_${p.telegramUserId}_${p.courseId}`;
      if (!existingIds.has(msgId)) {
        newMsgs.push({
          id: msgId,
          sender: 'bot',
          isAlert: true,
          photoUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
          text: `🔔 <b>NEW PAYMENT SUBMITTED</b>\n\n👤 <b>Customer:</b> @${p.telegramUsername || 'student_demo'} (${p.customerName})\n🆔 <b>Telegram ID:</b> <code>${p.telegramUserId}</code>\n🎓 <b>Course:</b> ${p.courseName} (ID: ${p.courseId})\n💰 <b>Amount:</b> ${configData.currency}${p.amount}\n⏳ <b>Status:</b> PAYMENT_SUBMITTED\n\n⚠️ <i>Check your bank/UPI app before approving!</i>`,
          timestamp: new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          buttons: [
            { label: '✅ APPROVE PAYMENT', action: `admin_approve_${p.paymentId || `${p.telegramUserId}_${p.courseId}`}` },
            { label: '❌ REJECT PAYMENT', action: `admin_reject_${p.paymentId || `${p.telegramUserId}_${p.courseId}`}` }
          ]
        });
      }
    });

    if (newMsgs.length > 0) {
      setAdminMessages(prev => [...prev, ...newMsgs]);
    }
  }, [purchases, configData]);

  const addCustomerMessage = (msg: Omit<Message, 'id' | 'timestamp'>) => {
    const newMsg: Message = {
      ...msg,
      id: `msg_${Date.now()}_${Math.random()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setCustomerMessages(prev => [...prev, newMsg]);
  };

  const handleButtonClick = async (action: string) => {
    if (action === 'start') {
      addCustomerMessage({ sender: 'user', text: '/start' });
      addCustomerMessage({
        sender: 'bot',
        text: `🎓 <b>Welcome to Course Bazar!</b>\n\n📚 Discover quality courses at affordable prices.\n\n🔎 Search for a course by name to get started.\n\n💳 Simple & secure payment\n⚡ Fast access after verification`,
        buttons: [
          { label: '🔍 Search Course', action: 'search' },
          { label: '📚 Send All Course', action: 'send_all_courses' },
          { label: '🛒 My Purchases', action: 'my_purchases' },
          { label: '🌐 Browse Courses', action: 'browse' },
          { label: '❓ Help to Buy', action: 'help' },
          { label: '📞 Support', action: 'support' }
        ]
      });
      return;
    }

    if (action === 'search') {
      addCustomerMessage({ sender: 'user', text: '🔎 Search Course' });
      setSimStep('searching');
      addCustomerMessage({
        sender: 'bot',
        text: `🔎 <b>SEARCH COURSE</b>\n\nPlease enter the course name you are looking for in the chat box below:\n<i>(Try searching: "Storytelling", "YouTube", or "Editing")</i>`
      });
      return;
    }

    if (action === 'browse') {
      addCustomerMessage({ sender: 'user', text: '📚 Browse Courses' });
      if (activeCourses.length === 0) {
        addCustomerMessage({
          sender: 'bot',
          text: `📚 No courses are available right now. Please check back later.`,
          buttons: [{ label: '🔙 Back to Menu', action: 'start' }]
        });
        return;
      }
      addCustomerMessage({
        sender: 'bot',
        text: `📚 <b>AVAILABLE COURSES (${activeCourses.length})</b>\n\nClick any course to inspect curriculum, size, and price:`,
        buttons: [
          ...activeCourses.map(c => ({
            label: `🎓 ${c.courseName} - ${configData.currency}${c.price}`,
            action: `view_course_${c.courseId}`
          })),
          { label: '📚 Send All Course', action: 'send_all_courses' },
          { label: '🔙 Back to Menu', action: 'start' }
        ]
      });
      return;
    }

    if (action === 'send_all_courses') {
      addCustomerMessage({ sender: 'user', text: '📚 Send All Course' });

      if (uniqueActiveCourses.length === 0) {
        addCustomerMessage({
          sender: 'bot',
          text: `📚 No courses are available right now. Please check back later.`,
          buttons: [{ label: '🔙 Back to Menu', action: 'start' }]
        });
        return;
      }

      // Progress message
      addCustomerMessage({
        sender: 'bot',
        text: `📚 <b>Sending all available courses (${uniqueActiveCourses.length} courses)...</b>\n\n<i>Please wait a moment while the courses load.</i>`
      });

      // Send every course card individually using identical layout and action buttons
      uniqueActiveCourses.forEach(course => {
        addCustomerMessage({
          sender: 'bot',
          photoUrl: course.thumbnailUrl,
          text: formatCourseCard(course),
          buttons: [
            { label: '🛒 BUY NOW', action: `buy_${course.courseId}` },
            { label: '🔙 Back to Courses', action: 'browse' }
          ]
        });
      });

      // Completion confirmation
      addCustomerMessage({
        sender: 'bot',
        text: `✅ <b>All ${uniqueActiveCourses.length} courses sent!</b>\n\nClick <b>🛒 BUY NOW</b> on any course card above to purchase.`,
        buttons: [
          { label: '🌐 Browse Courses', action: 'browse' },
          { label: '🔙 Back to Menu', action: 'start' }
        ]
      });
      return;
    }

    if (action.startsWith('view_course_')) {
      const courseId = action.replace('view_course_', '');
      const course = coursesById.get(courseId.toLowerCase());
      if (!course) return;

      setSelectedCourse(course);
      addCustomerMessage({ sender: 'user', text: `🎓 ${course.courseName}` });

      addCustomerMessage({
        sender: 'bot',
        photoUrl: course.thumbnailUrl,
        text: formatCourseCard(course),
        buttons: [
          { label: '🛒 BUY NOW', action: `buy_${course.courseId}` },
          { label: '🔙 Back to Courses', action: 'browse' }
        ]
      });
      return;
    }

    if (action.startsWith('buy_')) {
      const courseId = action.replace('buy_', '');
      const course = coursesById.get(courseId.toLowerCase());
      if (!course) return;

      setSelectedCourse(course);
      addCustomerMessage({ sender: 'user', text: '🛒 BUY NOW' });

      addCustomerMessage({
        sender: 'bot',
        photoUrl: '/assets/qr-code.png',
        text: `💳 <b>PAYMENT DETAILS</b>\n\n🎓 <b>Course:</b>\n${course.courseName}\n\n💰 <b>Amount:</b>\n${configData.currency}${course.price}\n\n📱 <b>UPI ID:</b> <code>${configData.upiId}</code>\n👤 <b>Payee Name:</b> ${configData.payeeName}\n\nPlease scan the QR code above and pay exactly <b>${configData.currency}${course.price}</b>.\n\nAfter completing the payment in your UPI app, click below:`,
        buttons: [
          { label: '✅ I HAVE PAID', action: `paid_${course.courseId}` },
          { label: '❌ Cancel', action: `view_course_${course.courseId}` }
        ]
      });
      return;
    }

    if (action.startsWith('paid_')) {
      const courseId = action.replace('paid_', '');
      const course = coursesById.get(courseId.toLowerCase());
      setSelectedCourse(course || null);

      addCustomerMessage({ sender: 'user', text: '✅ I HAVE PAID' });
      setSimStep('awaiting_screenshot');

      addCustomerMessage({
        sender: 'bot',
        text: `📸 <b>UPLOAD PAYMENT SCREENSHOT</b>\n\nFor Course: <b>${course?.courseName || 'Selected Course'}</b>\n\nPlease upload or send a screenshot of your payment receipt now.`
      });
      return;
    }

    if (action === 'help') {
      addCustomerMessage({ sender: 'user', text: '❓ Help' });
      addCustomerMessage({
        sender: 'bot',
        text: `❓ <b>HELP & HOW TO BUY</b>\n\n1️⃣ Search or browse for your course.\n\n2️⃣ Open the course details.\n\n3️⃣ Click Buy Now.\n\n4️⃣ Pay manually using our personal UPI QR code.\n\n5️⃣ Click ✅ I HAVE PAID.\n\n6️⃣ Upload your payment screenshot.\n\n7️⃣ Wait for manual admin verification.\n\n8️⃣ After approval, you will receive the Google Drive link and ZIP password!\n\n💬 Need assistance?\n\n📩 Email: <a href="mailto:coursebazar01@gmail.com" class="text-blue-600 underline font-medium">coursebazar01@gmail.com</a>\n👤 Telegram: <a href="https://t.me/kanumeena18" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline font-medium">@kanumeena18</a>`,
        buttons: [{ label: '🔙 Back to Menu', action: 'start' }]
      });
      return;
    }

    if (action === 'support') {
      addCustomerMessage({ sender: 'user', text: '💬 Support' });
      addCustomerMessage({
        sender: 'bot',
        text: `💬 <b>CUSTOMER SUPPORT</b>\n\nHave questions about a course or payment?\n\n📩 Email: <a href="mailto:coursebazar01@gmail.com" class="text-blue-600 underline font-medium">coursebazar01@gmail.com</a>\n👤 Telegram: <a href="https://t.me/kanumeena18" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline font-medium">@kanumeena18</a>\n\nWe’ll get back to you as soon as possible!`,
        buttons: [{ label: '🔙 Back to Menu', action: 'start' }]
      });
      return;
    }

    if (action === 'my_purchases') {
      addCustomerMessage({ sender: 'user', text: '🛒 My Purchases' });
      const userPurchases = purchases.filter(p => p.telegramUserId === '987654321');
      if (userPurchases.length === 0) {
        addCustomerMessage({
          sender: 'bot',
          text: `🛒 <b>MY PURCHASES</b>\n\nYou haven't purchased any courses yet.\n\nClick <b>📚 Browse Courses</b> to find a course!`,
          buttons: [
            { label: '📚 Browse Courses', action: 'browse' },
            { label: '🔙 Back to Menu', action: 'start' }
          ]
        });
        return;
      }

      let text = `🛒 <b>MY PURCHASES</b>\n\n`;
      const buttons: Array<{ label: string; action: string; url?: string }> = [];

      userPurchases.forEach((p, idx) => {
        let statusIcon = '⏳';
        let statusLabel = 'Payment Verification Pending';
        if (p.status === 'PAID') {
          statusIcon = '✅';
          statusLabel = 'PAID & APPROVED';
          buttons.push({
            label: `📥 GET COURSE: ${p.courseName}`,
            action: `get_course_${p.courseId}`
          });
        } else if (p.status === 'REJECTED') {
          statusIcon = '❌';
          statusLabel = 'REJECTED (Contact support)';
        }

        text += `${idx + 1}. 🎓 <b>${p.courseName}</b>\n   💰 Amount: ${configData.currency}${p.amount}\n   Status: ${statusIcon} <b>${statusLabel}</b>\n\n`;
      });

      buttons.push({ label: '🔙 Main Menu', action: 'start' });

      addCustomerMessage({
        sender: 'bot',
        text,
        buttons
      });
      return;
    }

    if (action.startsWith('get_course_')) {
      const courseId = action.replace('get_course_', '');
      const userPurchase = purchases.find(p => p.telegramUserId === '987654321' && p.courseId.toLowerCase() === courseId.toLowerCase());
      const course = coursesById.get(courseId.toLowerCase());

      // SECURITY CHECK: Verify user ID matches and status is strictly PAID!
      if (!userPurchase || userPurchase.status !== 'PAID') {
        addCustomerMessage({
          sender: 'bot',
          text: `⛔ <b>Access Denied:</b> Course materials and ZIP password are only delivered after payment is approved by admin.`
        });
        return;
      }

      addCustomerMessage({ sender: 'user', text: `📥 GET COURSE: ${course?.courseName}` });
      addCustomerMessage({
        sender: 'bot',
        text: `✅ <b>PAYMENT VERIFIED</b>\n\nThank you for your payment!\n\n🎓 <b>Course:</b> ${course?.courseName}\n\n📥 <b>COURSE DOWNLOAD:</b>\nClick the button below to download the ZIP from Google Drive.\n\n🔐 <b>ZIP PASSWORD:</b>\n<code>${course?.zipPassword}</code>\n\n📌 <i>Use the password above to extract the ZIP archive. Keep this password safe!</i>`,
        buttons: [
          { label: '📥 Download Course from Google Drive', action: 'open_drive', url: course?.driveLink },
          { label: '🛒 View All My Purchases', action: 'my_purchases' }
        ]
      });
      return;
    }

    // Admin approval
    if (action.startsWith('admin_approve_')) {
      const payload = action.replace('admin_approve_', '');
      let paymentId: string | undefined = undefined;
      let userId: string | undefined = undefined;
      let courseId: string | undefined = undefined;

      if (payload.startsWith('PAY-') || !payload.includes('_')) {
        paymentId = payload;
      } else {
        const parts = payload.split('_');
        userId = parts[0];
        courseId = parts.slice(1).join('_');
      }

      const activeAdmin = (actingAdminId && adminsById.get(actingAdminId)) || admins[0];
      const adminId = activeAdmin?.telegramId || '8293894004';
      const adminName = activeAdmin?.name ? `${activeAdmin.name} (@${activeAdmin.username || 'admin'})` : '@StoreOwner';

      try {
        const res = await authFetch('/api/admin-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, courseId, paymentId, action: 'APPROVE', adminId, adminName })
        });
        const data = await res.json();

        if (data.alreadyProcessed) {
          setAdminMessages(prev =>
            prev.map(m => {
              if (m.buttons?.some(b => b.action.includes(action))) {
                return {
                  ...m,
                  buttons: undefined,
                  text: `${m.text}\n\n━━━━━━━━━━━━━━━━━━━━\n🔒 <b>ALREADY PROCESSED</b>: ${data.error || 'Handled by another admin.'}`
                };
              }
              return m;
            })
          );
          onRefreshData();
          return;
        }

        if (data.success) {
          onRefreshData();

          // Update admin message
          setAdminMessages(prev =>
            prev.map(m => {
              if (m.buttons?.some(b => b.action.includes(action))) {
                return {
                  ...m,
                  buttons: undefined,
                  text: `${m.text}\n\n━━━━━━━━━━━━━━━━━━━━\n✅ <b>APPROVED</b> by ${adminName} at ${new Date().toLocaleTimeString()}`
                };
              }
              return m;
            })
          );

          // Deliver to customer
          const deliveredCourseId = data.purchase?.courseId || courseId;
          const course = deliveredCourseId ? coursesById.get(deliveredCourseId.toLowerCase()) : undefined;
          addCustomerMessage({
            sender: 'bot',
            text: `✅ <b>PAYMENT VERIFIED</b>\n\nThank you for your payment!\n\n🎓 <b>Course:</b> ${course?.courseName || data.purchase?.courseName || 'Your Course'}\n\n📥 <b>COURSE DOWNLOAD:</b>\nClick the button below to open Google Drive.\n\n🔐 <b>ZIP PASSWORD:</b>\n<code>${course?.zipPassword || data.delivery?.zipPassword || 'Password123'}</code>\n\n📌 <i>Download the ZIP file and use the password above to extract it. Keep this message safe for future access.</i>`,
            buttons: [
              { label: '📥 Download Course from Google Drive', action: 'open_drive', url: course?.driveLink || data.delivery?.driveLink },
              { label: '🛒 View All My Purchases', action: 'my_purchases' }
            ]
          });
        }
      } catch (e) {
        console.error(e);
      }
      return;
    }

    // Admin rejection
    if (action.startsWith('admin_reject_')) {
      const payload = action.replace('admin_reject_', '');
      let paymentId: string | undefined = undefined;
      let userId: string | undefined = undefined;
      let courseId: string | undefined = undefined;

      if (payload.startsWith('PAY-') || !payload.includes('_')) {
        paymentId = payload;
      } else {
        const parts = payload.split('_');
        userId = parts[0];
        courseId = parts.slice(1).join('_');
      }

      const activeAdmin = (actingAdminId && adminsById.get(actingAdminId)) || admins[0];
      const adminId = activeAdmin?.telegramId || '8293894004';
      const adminName = activeAdmin?.name ? `${activeAdmin.name} (@${activeAdmin.username || 'admin'})` : '@StoreOwner';

      try {
        const res = await authFetch('/api/admin-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, courseId, paymentId, action: 'REJECT', adminId, adminName })
        });
        const data = await res.json();

        if (data.alreadyProcessed) {
          setAdminMessages(prev =>
            prev.map(m => {
              if (m.buttons?.some(b => b.action.includes(action))) {
                return {
                  ...m,
                  buttons: undefined,
                  text: `${m.text}\n\n━━━━━━━━━━━━━━━━━━━━\n🔒 <b>ALREADY PROCESSED</b>: ${data.error || 'Handled by another admin.'}`
                };
              }
              return m;
            })
          );
          onRefreshData();
          return;
        }

        if (data.success) {
          onRefreshData();

          // Update admin message
          setAdminMessages(prev =>
            prev.map(m => {
              if (m.buttons?.some(b => b.action.includes(action))) {
                return {
                  ...m,
                  buttons: undefined,
                  text: `${m.text}\n\n━━━━━━━━━━━━━━━━━━━━\n❌ <b>REJECTED</b> by ${adminName} at ${new Date().toLocaleTimeString()}`
                };
              }
              return m;
            })
          );

          addCustomerMessage({
            sender: 'bot',
            text: `❌ <b>PAYMENT REJECTION NOTICE</b>\n\nYour recent payment could not be verified in our bank account.\n\n<b>Possible Reasons:</b>\n• UPI transaction reference is not visible on the screenshot\n• Amount was not credited to our UPI ID\n• Screenshot is blurry or incomplete\n\nIf you have already paid, please contact support: <b>${configData.supportUsername}</b> with your bank UTR / reference number.`
          });
        }
      } catch (e) {
        console.error(e);
      }
      return;
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText.trim();
    setInputText('');

    if (simStep === 'searching') {
      addCustomerMessage({ sender: 'user', text });
      setSimStep('idle');

      const queryTokens = text.toLowerCase().split(/\s+/).filter(Boolean);
      const matches = queryTokens.length === 0 ? [] : searchIndex
        .filter(item => queryTokens.every(tok => item.searchContent.includes(tok)))
        .map(item => item.course);

      if (matches.length === 0) {
        addCustomerMessage({
          sender: 'bot',
          text: `❌ <b>No course found for "${text}".</b>\n\nTry searching with a different course name or browse all available courses below:`,
          buttons: [
            { label: '📚 Browse All Courses', action: 'browse' },
            { label: '🔎 Search Again', action: 'search' }
          ]
        });
      } else if (matches.length === 1) {
        const course = matches[0];
        setSelectedCourse(course);
        addCustomerMessage({
          sender: 'bot',
          photoUrl: course.thumbnailUrl,
          text: formatCourseCard(course),
          buttons: [
            { label: '🛒 BUY NOW', action: `buy_${course.courseId}` },
            { label: '🔙 Back to Menu', action: 'start' }
          ]
        });
      } else {
        addCustomerMessage({
          sender: 'bot',
          text: `🔎 <b>RESULTS FOR:</b> "${text}"\n\nFound <b>${matches.length}</b> course(s):`,
          buttons: [
            ...matches.map(c => ({
              label: `🎓 ${c.courseName} - ${configData.currency}${c.price}`,
              action: `view_course_${c.courseId}`
            })),
            { label: '🔎 Search Again', action: 'search' },
            { label: '🔙 Back to Menu', action: 'start' }
          ]
        });
      }
      return;
    }

    if (simStep === 'awaiting_screenshot') {
      addCustomerMessage({ sender: 'user', text });
      addCustomerMessage({
        sender: 'bot',
        text: `⚠️ <b>Screenshot Required:</b> Please upload an image file of your UPI payment screenshot instead of sending text.\n\nClick the <b>📸 Upload Proof</b> button below to submit your payment proof.`
      });
      return;
    }

    // Default command matching
    if (text === '/start') {
      handleButtonClick('start');
    } else if (text === '/courses') {
      handleButtonClick('browse');
    } else if (text === '/search') {
      handleButtonClick('search');
    } else if (text === '/myorders') {
      handleButtonClick('my_purchases');
    } else if (text === '/help') {
      handleButtonClick('help');
    } else if (text === '/support') {
      handleButtonClick('support');
    } else if (text === '/allcourses' || text === '/sendall') {
      handleButtonClick('send_all_courses');
    } else {
      addCustomerMessage({ sender: 'user', text });
      addCustomerMessage({
        sender: 'bot',
        text: `🎓 Welcome! Please use the buttons below to navigate Course Bazar:`,
        buttons: [
          { label: '🔍 Search Course', action: 'search' },
          { label: '📚 Send All Course', action: 'send_all_courses' },
          { label: '🛒 My Purchases', action: 'my_purchases' },
          { label: '🌐 Browse Courses', action: 'browse' },
          { label: '❓ Help to Buy', action: 'help' },
          { label: '📞 Support', action: 'support' }
        ]
      });
    }
  };

  const handleSimulateScreenshotUpload = async () => {
    if (!selectedCourse) {
      alert('Please select a course and click Buy Now first!');
      return;
    }

    // Customer sends photo
    addCustomerMessage({
      sender: 'user',
      text: '📸 [Uploaded Payment Screenshot]',
      photoUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80'
    });

    setSimStep('idle');

    // Bot acknowledges to customer
    addCustomerMessage({
      sender: 'bot',
      text: `⏳ <b>PAYMENT SUBMITTED</b>\n\nYour payment screenshot has been submitted!\n\nOur admin will manually verify the payment in our bank account.\n\nYou will receive the course download link and ZIP password after approval.`,
      buttons: [{ label: '🛒 View My Purchases', action: 'my_purchases' }]
    });

    // Save to server/Sheets API
    try {
      const res = await authFetch('/api/simulate-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: '987654321',
          username: 'student_rahul',
          customerName: 'Rahul Verma',
          courseId: selectedCourse.courseId,
          screenshotUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80'
        })
      });
      const data = await res.json();
      if (data.success) {
        onRefreshData();

        // Admin alert message
        const adminMsg: Message = {
          id: `admin_alert_${Date.now()}`,
          sender: 'bot',
          isAlert: true,
          photoUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
          text: `🔔 <b>NEW PAYMENT SUBMITTED</b>\n\n👤 <b>Customer:</b> @student_rahul (Rahul Verma)\n🆔 <b>Telegram ID:</b> <code>987654321</code>\n🎓 <b>Course:</b> ${selectedCourse.courseName} (ID: ${selectedCourse.courseId})\n💰 <b>Amount:</b> ${configData.currency}${selectedCourse.price}\n⏳ <b>Status:</b> PAYMENT_SUBMITTED\n\n⚠️ <i>Check your bank/UPI app before approving!</i>`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          buttons: [
            { label: '✅ APPROVE PAYMENT', action: `admin_approve_${data.purchase?.paymentId || `987654321_${selectedCourse.courseId}`}` },
            { label: '❌ REJECT PAYMENT', action: `admin_reject_${data.purchase?.paymentId || `987654321_${selectedCourse.courseId}`}` }
          ]
        };

        setAdminMessages(prev => [...prev, adminMsg]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-5">
      {/* View Switcher Bar with Claymorphic Style */}
      <div className="clay-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
              Interactive Bot Simulator
            </h2>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs">
              Live Testing Console
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Test the entire customer checkout journey and toggle to the Admin channel to review payment screenshots.
          </p>
        </div>

        {/* Screen toggle with Sunken Track & Raised Active Tab */}
        <div className="flex clay-inset p-1.5 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setActiveScreen('customer')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
              activeScreen === 'customer'
                ? 'clay-pill-active'
                : 'clay-pill-inactive'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
            <span>Customer Bot</span>
          </button>
          <button
            onClick={() => setActiveScreen('admin')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 relative ${
              activeScreen === 'admin'
                ? 'clay-pill-active'
                : 'clay-pill-inactive'
            }`}
          >
            <BellRing className="w-3.5 h-3.5 text-indigo-600" />
            <span>Admin Channel</span>
            {adminMessages.some(m => m.buttons?.length) && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse ml-1" />
            )}
          </button>
        </div>
      </div>

      {/* Simulator Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Smartphone Screen with Soft Pillowy Clay Frame */}
        <div className="lg:col-span-7 xl:col-span-8 flex justify-center">
          <div 
            className="w-full max-w-md bg-white rounded-[32px] overflow-hidden flex flex-col h-[650px] border border-slate-200/80"
            style={{
              boxShadow: '0 25px 50px -12px rgba(35, 45, 65, 0.12), inset 0 2px 2px rgba(255, 255, 255, 1), inset 0 -2px 3px rgba(100, 116, 139, 0.05)'
            }}
          >
            {/* Telegram App Bar with Clay Surface */}
            <div className="bg-[#FFFFFF] border-b border-slate-100 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-10 h-10 rounded-2xl text-white font-bold flex items-center justify-center text-sm shadow-sm"
                  style={{
                    background: activeScreen === 'customer' 
                      ? 'linear-gradient(180deg, #6054F7 0%, #4D3FE8 100%)'
                      : 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.4)'
                  }}
                >
                  {activeScreen === 'customer' ? '🎓' : '👑'}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                    <span>{activeScreen === 'customer' ? '@CourseBazarBot' : 'Admin Alert Channel'}</span>
                    <span className="text-[10px] text-indigo-600 font-extrabold">✓</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {activeScreen === 'customer' ? 'official course bot' : 'Confidential Admin Alerts'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  if (activeScreen === 'customer') {
                    handleButtonClick('start');
                  } else {
                    onRefreshData();
                  }
                }}
                className="p-2 text-slate-500 hover:text-slate-800 clay-btn-secondary"
                title="Restart chat"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Multi-Admin Switcher in Admin Channel */}
            {activeScreen === 'admin' && admins.length > 0 && (
              <div className="bg-[#F8FAFD] text-slate-800 px-4 py-2 border-b border-slate-100 flex items-center justify-between text-[11px]">
                <div className="flex items-center space-x-2">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-slate-500 font-medium">Simulating Admin:</span>
                </div>
                <select
                  value={actingAdminId || (admins.find(a => a.status === 'Active')?.telegramId || admins[0]?.telegramId)}
                  onChange={(e) => setActingAdminId(e.target.value)}
                  className="clay-input text-slate-800 text-[11px] font-semibold px-2.5 py-1"
                >
                  {admins.map(a => (
                    <option key={a.telegramId} value={a.telegramId}>
                      {a.name} ({a.role}) · {a.status}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Chat Messages Body with Soft Porcelain Background */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#F4F6F9]">
              {(activeScreen === 'customer' ? customerMessages : adminMessages).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-xs text-slate-300">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No payment alerts in queue</p>
                  <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                    When customers upload a screenshot, it will appear here instantly with tactile Approve / Reject buttons.
                  </p>
                </div>
              ) : (
                (activeScreen === 'customer' ? customerMessages : adminMessages).map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'text-white rounded-br-xs'
                          : msg.isAlert
                          ? 'bg-amber-50/95 text-slate-900 border border-amber-200/90 rounded-bl-xs shadow-sm'
                          : 'bg-white text-slate-900 border border-slate-200/70 rounded-bl-xs'
                      }`}
                      style={
                        msg.sender === 'user'
                          ? {
                              background: 'linear-gradient(180deg, #6054F7 0%, #4D3FE8 100%)',
                              boxShadow: '0 6px 16px -2px rgba(77, 63, 232, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.35)'
                            }
                          : {
                              boxShadow: '0 4px 14px -2px rgba(35, 45, 65, 0.05), inset 0 1px 1.5px rgba(255, 255, 255, 1)'
                            }
                      }
                    >
                      {/* Photo Attachment with Styled Fallback */}
                      {msg.photoUrl && (
                        <div className="mb-2.5 rounded-xl overflow-hidden border border-slate-200/70 bg-slate-100 shadow-2xs">
                          <img
                            src={msg.photoUrl}
                            alt="Preview attachment"
                            referrerPolicy="no-referrer"
                            className="w-full max-h-48 object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      {/* Text content */}
                      <div
                        className="whitespace-pre-wrap font-sans"
                        dangerouslySetInnerHTML={{ __html: msg.text }}
                      />

                      <div className="mt-1.5 text-[9px] text-right opacity-60 font-medium">
                        {msg.timestamp}
                      </div>
                    </div>

                    {/* Inline Telegram Buttons with Tactile Clay Style */}
                    {msg.buttons && msg.buttons.length > 0 && (
                      <div className={`mt-2 w-full max-w-[85%] ${msg.buttons.length === 6 ? 'grid grid-cols-2 gap-2' : 'space-y-1.5'}`}>
                        {msg.buttons.map((btn, bIdx) =>
                          btn.url ? (
                            <a
                              key={bIdx}
                              href={btn.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-2.5 px-3 clay-btn-success text-xs font-bold text-center flex items-center justify-center space-x-1.5"
                            >
                              <span className="truncate">{btn.label}</span>
                              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            </a>
                          ) : (
                            <button
                              key={bIdx}
                              onClick={() => handleButtonClick(btn.action)}
                              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold text-center transition flex items-center justify-center space-x-1.5 ${
                                btn.action.startsWith('admin_approve')
                                  ? 'clay-btn-success'
                                  : btn.action.startsWith('admin_reject')
                                  ? 'clay-btn-danger'
                                  : btn.action.startsWith('buy_')
                                  ? 'clay-btn-primary'
                                  : 'clay-btn-secondary'
                              }`}
                            >
                              <span className="truncate">{btn.label}</span>
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Bottom Actions for Customer Mode */}
            {activeScreen === 'customer' && (
              <div className="p-3.5 bg-white border-t border-slate-100 space-y-2.5">
                {simStep === 'awaiting_screenshot' && (
                  <div className="p-3 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center space-x-2">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="text-xs text-indigo-900 font-bold">Screenshot required</span>
                    </div>
                    <button
                      onClick={handleSimulateScreenshotUpload}
                      className="px-3.5 py-1.5 clay-btn-primary text-xs font-bold"
                    >
                      <ImageIcon className="w-3 h-3 mr-1" />
                      <span>Upload Proof</span>
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendText} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder={
                      simStep === 'searching'
                        ? 'Type course name (e.g. YouTube)...'
                        : simStep === 'awaiting_screenshot'
                        ? 'Click "Upload Proof" button above...'
                        : 'Type message or command (/start)...'
                    }
                    className="flex-1 clay-input px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 font-medium"
                  />
                  <button
                    type="submit"
                    className="p-2.5 clay-btn-primary"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Action Controls & Security Rules Card */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-5">
          {/* Quick Scenario Runner */}
          <div className="clay-card p-5 sm:p-6 space-y-3.5">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-2">
              <span className="text-indigo-600">⚡</span>
              <span>1-Click Test Scenarios</span>
            </h3>

            <div className="space-y-2">
              <button
                onClick={() => handleButtonClick('start')}
                className="w-full text-left px-3.5 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100/90 text-xs font-bold text-slate-700 transition flex items-center justify-between border border-slate-200/60 shadow-2xs"
              >
                <span>1. Open Bot (/start)</span>
                <span className="text-slate-400 text-[10px] font-medium">Welcome Menu</span>
              </button>

              <button
                onClick={() => handleButtonClick('browse')}
                className="w-full text-left px-3.5 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100/90 text-xs font-bold text-slate-700 transition flex items-center justify-between border border-slate-200/60 shadow-2xs"
              >
                <span>2. Browse All Courses</span>
                <span className="text-slate-400 text-[10px] font-medium">{courses.length} courses</span>
              </button>

              <button
                disabled={courses.length === 0}
                onClick={() => {
                  const c = courses[0];
                  if (c) handleButtonClick(`view_course_${c.courseId}`);
                }}
                className="w-full text-left px-3.5 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100/90 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold text-slate-700 transition flex items-center justify-between border border-slate-200/60 shadow-2xs"
              >
                <span>3. View Course Details</span>
                <span className="text-slate-400 text-[10px] font-medium">{courses.length > 0 ? 'Private ZIP safe' : 'Add course first'}</span>
              </button>

              <button
                disabled={courses.length === 0}
                onClick={() => {
                  const c = courses[0];
                  if (c) handleButtonClick(`buy_${c.courseId}`);
                }}
                className="w-full text-left px-3.5 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100/90 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold text-slate-700 transition flex items-center justify-between border border-slate-200/60 shadow-2xs"
              >
                <span>4. View UPI QR Code</span>
                <span className="text-slate-400 text-[10px] font-medium">{courses.length > 0 ? 'No Order ID / UTR' : 'Add course first'}</span>
              </button>

              <button
                onClick={handleSimulateScreenshotUpload}
                className="w-full text-left px-3.5 py-2.5 rounded-2xl bg-indigo-50/70 hover:bg-indigo-100/80 text-xs font-bold text-indigo-900 transition flex items-center justify-between border border-indigo-200/80 shadow-2xs"
              >
                <span>5. Upload Payment Screenshot</span>
                <span className="text-indigo-600 text-[10px] font-bold">Submits to Admin</span>
              </button>

              <button
                onClick={() => setActiveScreen('admin')}
                className="w-full text-left px-3.5 py-2.5 rounded-2xl bg-purple-50/70 hover:bg-purple-100/80 text-xs font-bold text-purple-900 transition flex items-center justify-between border border-purple-200/80 shadow-2xs"
              >
                <span>6. Check Admin Channel</span>
                <span className="text-purple-600 text-[10px] font-bold">Approve / Reject</span>
              </button>
            </div>
          </div>

          {/* Security Rules Card */}
          <div className="clay-card p-5 sm:p-6 space-y-3">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Manual Verification Rules</span>
            </h4>

            <ul className="text-xs text-slate-500 space-y-2.5 leading-relaxed font-medium">
              <li className="flex items-start space-x-2">
                <span className="text-emerald-600 font-bold">•</span>
                <span><strong className="text-slate-800">No Order ID / UTR:</strong> Verified strictly by Telegram User ID and Course Name.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-600 font-bold">•</span>
                <span><strong className="text-slate-800">Bank Check:</strong> Admin confirms money in UPI app before clicking Approve.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-emerald-600 font-bold">•</span>
                <span><strong className="text-slate-800">Drive Link & ZIP Password:</strong> Released ONLY when status is updated to <code className="text-indigo-600 font-semibold">PAID</code>.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
