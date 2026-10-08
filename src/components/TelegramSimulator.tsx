import React, { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon, CheckCircle, XCircle, AlertCircle, RefreshCw, QrCode, Lock, Download, ExternalLink, ShieldCheck, UserCheck, Smartphone, BellRing } from 'lucide-react';
import { Course, Purchase } from '../types/index.js';

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
  onRefreshData,
  configData
}) => {
  const [activeScreen, setActiveScreen] = useState<'customer' | 'admin'>('customer');
  const [inputText, setInputText] = useState('');
  const [simStep, setSimStep] = useState<'idle' | 'searching' | 'awaiting_screenshot'>('idle');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Customer Chat Messages
  const [customerMessages, setCustomerMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'bot',
      text: `🎓 <b>Welcome to Course Bazar!</b>\n\n📚 Discover quality courses at affordable prices.\n\n🔎 Search for a course by name to get started.\n\n💳 Simple & secure payment\n⚡ Fast access after verification`,
      timestamp: '10:00 AM',
      buttons: [
        { label: '🔎 Search Course', action: 'search' },
        { label: '📚 Browse Courses', action: 'browse' },
        { label: '🛒 My Purchases', action: 'my_purchases' },
        { label: '❓ Help', action: 'help' },
        { label: '💬 Support', action: 'support' }
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
            { label: '✅ APPROVE PAYMENT', action: `admin_approve_${p.telegramUserId}_${p.courseId}` },
            { label: '❌ REJECT PAYMENT', action: `admin_reject_${p.telegramUserId}_${p.courseId}` }
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
          { label: '🔎 Search Course', action: 'search' },
          { label: '📚 Browse Courses', action: 'browse' },
          { label: '🛒 My Purchases', action: 'my_purchases' },
          { label: '❓ Help', action: 'help' },
          { label: '💬 Support', action: 'support' }
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
      const activeCourses = courses.filter(c => c.status.toLowerCase() === 'active');
      addCustomerMessage({
        sender: 'bot',
        text: `📚 <b>AVAILABLE COURSES (${activeCourses.length})</b>\n\nClick any course to inspect curriculum, size, and price:`,
        buttons: [
          ...activeCourses.map(c => ({
            label: `🎓 ${c.courseName} - ${configData.currency}${c.price}`,
            action: `view_course_${c.courseId}`
          })),
          { label: '🔙 Back to Menu', action: 'start' }
        ]
      });
      return;
    }

    if (action.startsWith('view_course_')) {
      const courseId = action.replace('view_course_', '');
      const course = courses.find(c => c.courseId.toLowerCase() === courseId.toLowerCase());
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
      const course = courses.find(c => c.courseId.toLowerCase() === courseId.toLowerCase());
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
      const course = courses.find(c => c.courseId.toLowerCase() === courseId.toLowerCase());
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
        text: `❓ <b>HELP & HOW TO BUY</b>\n\n1️⃣ Search or browse for your course.\n2️⃣ Open the course details.\n3️⃣ Click <b>Buy Now</b>.\n4️⃣ Pay manually using our personal UPI QR code.\n5️⃣ Click <b>✅ I HAVE PAID</b>.\n6️⃣ Upload your payment screenshot.\n7️⃣ Wait for manual admin verification in our bank app.\n8️⃣ After approval, you will receive the Google Drive link and ZIP password!\n\n💬 Support: ${configData.supportUsername}`,
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
      const userPurchase = purchases.find(p => p.telegramUserId === '987654321' && p.courseId === courseId);
      const course = courses.find(c => c.courseId === courseId);

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
      const parts = action.replace('admin_approve_', '').split('_');
      const userId = parts[0];
      const courseId = parts[1];

      try {
        const res = await fetch('/api/admin-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, courseId, action: 'APPROVE', adminId: '123456789' })
        });
        const data = await res.json();
        if (data.success) {
          onRefreshData();

          // Update admin message
          setAdminMessages(prev =>
            prev.map(m => {
              if (m.buttons?.some(b => b.action.includes(action))) {
                return {
                  ...m,
                  buttons: undefined,
                  text: `${m.text}\n\n━━━━━━━━━━━━━━━━━━━━\n✅ <b>APPROVED</b> by @Admin at ${new Date().toLocaleTimeString()}`
                };
              }
              return m;
            })
          );

          // Deliver to customer
          const course = courses.find(c => c.courseId === courseId);
          addCustomerMessage({
            sender: 'bot',
            text: `✅ <b>PAYMENT VERIFIED</b>\n\nThank you for your payment!\n\n🎓 <b>Course:</b> ${course?.courseName}\n\n📥 <b>COURSE DOWNLOAD:</b>\nClick the button below to open Google Drive.\n\n🔐 <b>ZIP PASSWORD:</b>\n<code>${course?.zipPassword}</code>\n\n📌 <i>Download the ZIP file and use the password above to extract it. Keep this message safe for future access.</i>`,
            buttons: [
              { label: '📥 Download Course from Google Drive', action: 'open_drive', url: course?.driveLink },
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
      const parts = action.replace('admin_reject_', '').split('_');
      const userId = parts[0];
      const courseId = parts[1];

      try {
        const res = await fetch('/api/admin-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, courseId, action: 'REJECT', adminId: '123456789' })
        });
        const data = await res.json();
        if (data.success) {
          onRefreshData();

          // Update admin message
          setAdminMessages(prev =>
            prev.map(m => {
              if (m.buttons?.some(b => b.action.includes(action))) {
                return {
                  ...m,
                  buttons: undefined,
                  text: `${m.text}\n\n━━━━━━━━━━━━━━━━━━━━\n❌ <b>REJECTED</b> by @Admin at ${new Date().toLocaleTimeString()}`
                };
              }
              return m;
            })
          );

          // Deliver rejection notice to customer
          const course = courses.find(c => c.courseId === courseId);
          addCustomerMessage({
            sender: 'bot',
            text: `❌ <b>PAYMENT NOT VERIFIED</b>\n\nYour payment submission for <b>${course?.courseName}</b> could not be verified in our bank account.\n\nIf you believe there was an error or money was deducted, please contact our support team:\n💬 Support: ${configData.supportUsername}`
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

      const matches = courses.filter(c => {
        if (c.status.toLowerCase() !== 'active') return false;
        const q = text.toLowerCase();
        return (
          c.courseName.toLowerCase().includes(q) ||
          c.creatorName.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
        );
      });

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
    } else {
      addCustomerMessage({ sender: 'user', text });
      addCustomerMessage({
        sender: 'bot',
        text: `🎓 Welcome! Please use the buttons below to navigate Course Bazar:`,
        buttons: [
          { label: '🔎 Search Course', action: 'search' },
          { label: '📚 Browse Courses', action: 'browse' },
          { label: '🛒 My Purchases', action: 'my_purchases' }
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
      const res = await fetch('/api/simulate-purchase', {
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
            { label: '✅ APPROVE PAYMENT', action: `admin_approve_987654321_${selectedCourse.courseId}` },
            { label: '❌ REJECT PAYMENT', action: `admin_reject_987654321_${selectedCourse.courseId}` }
          ]
        };

        setAdminMessages(prev => [...prev, adminMsg]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      {/* View Switcher Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <span>Interactive Simulator</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Live Testing Console
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Test the entire shopping flow and toggle to the Admin channel to review payment screenshots.
          </p>
        </div>

        {/* Screen toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveScreen('customer')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
              activeScreen === 'customer'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-600" />
            <span>Customer Bot</span>
          </button>
          <button
            onClick={() => setActiveScreen('admin')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 relative ${
              activeScreen === 'admin'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BellRing className="w-3.5 h-3.5 text-indigo-600" />
            <span>Admin Alert Channel</span>
            {adminMessages.some(m => m.buttons?.length) && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse ml-1" />
            )}
          </button>
        </div>
      </div>

      {/* Simulator Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Smartphone Screen */}
        <div className="lg:col-span-7 xl:col-span-8 flex justify-center">
          <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl shadow-md overflow-hidden flex flex-col h-[640px]">
            {/* Telegram App Bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {activeScreen === 'customer' ? '🎓' : '👑'}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center space-x-1">
                    <span>{activeScreen === 'customer' ? '@CourseBazarBot' : 'Admin Alert Channel'}</span>
                    <span className="text-[10px] text-blue-600">✓</span>
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
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition"
                title="Restart chat"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-100/70">
              {(activeScreen === 'customer' ? customerMessages : adminMessages).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                  <ShieldCheck className="w-10 h-10 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">No payment alerts in queue</p>
                  <p className="text-[11px] text-slate-400 max-w-xs">
                    When customers upload a screenshot, it will appear here instantly with Approve / Reject buttons.
                  </p>
                </div>
              ) : (
                (activeScreen === 'customer' ? customerMessages : adminMessages).map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
                        msg.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-br-xs'
                          : msg.isAlert
                          ? 'bg-amber-50/90 text-slate-800 border border-amber-200 rounded-bl-xs'
                          : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                      }`}
                    >
                      {/* Photo Attachment */}
                      {msg.photoUrl && (
                        <div className="mb-2 rounded-xl overflow-hidden border border-slate-200">
                          <img
                            src={msg.photoUrl}
                            alt="Preview attachment"
                            className="w-full max-h-44 object-cover"
                          />
                        </div>
                      )}

                      {/* Text content */}
                      <div
                        className="whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: msg.text }}
                      />

                      <div className="mt-1 text-[9px] text-right opacity-60">
                        {msg.timestamp}
                      </div>
                    </div>

                    {/* Inline Telegram Buttons */}
                    {msg.buttons && msg.buttons.length > 0 && (
                      <div className="mt-1.5 space-y-1 w-full max-w-[85%]">
                        {msg.buttons.map((btn, bIdx) =>
                          btn.url ? (
                            <a
                              key={bIdx}
                              href={btn.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold text-center flex items-center justify-center space-x-1.5 transition shadow-xs"
                            >
                              <span>{btn.label}</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <button
                              key={bIdx}
                              onClick={() => handleButtonClick(btn.action)}
                              className={`w-full py-2 px-3 rounded-xl text-xs font-semibold text-center transition flex items-center justify-center space-x-1.5 shadow-xs ${
                                btn.action.startsWith('admin_approve')
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  : btn.action.startsWith('admin_reject')
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                  : btn.action.startsWith('buy_')
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                              }`}
                            >
                              <span>{btn.label}</span>
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
              <div className="p-3 bg-white border-t border-slate-200 space-y-2">
                {simStep === 'awaiting_screenshot' && (
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-xs text-blue-900 font-semibold">Payment screenshot required</span>
                    </div>
                    <button
                      onClick={handleSimulateScreenshotUpload}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-xs"
                    >
                      <ImageIcon className="w-3 h-3" />
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
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Action Controls & Security Rules Card */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          {/* Quick Scenario Runner */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-1.5">
              <span>⚡</span>
              <span>1-Click Test Scenarios</span>
            </h3>

            <div className="space-y-1.5">
              <button
                onClick={() => handleButtonClick('start')}
                className="w-full text-left px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition flex items-center justify-between border border-slate-200/60"
              >
                <span>1. Open Bot (/start)</span>
                <span className="text-slate-400 text-[10px] font-normal">Welcome Menu</span>
              </button>

              <button
                onClick={() => handleButtonClick('browse')}
                className="w-full text-left px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition flex items-center justify-between border border-slate-200/60"
              >
                <span>2. Browse All Courses</span>
                <span className="text-slate-400 text-[10px] font-normal">{courses.length} courses</span>
              </button>

              <button
                onClick={() => {
                  const c = courses[0];
                  if (c) handleButtonClick(`view_course_${c.courseId}`);
                }}
                className="w-full text-left px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition flex items-center justify-between border border-slate-200/60"
              >
                <span>3. View Course Details</span>
                <span className="text-slate-400 text-[10px] font-normal">Private ZIP safe</span>
              </button>

              <button
                onClick={() => {
                  const c = courses[0];
                  if (c) handleButtonClick(`buy_${c.courseId}`);
                }}
                className="w-full text-left px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition flex items-center justify-between border border-slate-200/60"
              >
                <span>4. View UPI QR Code</span>
                <span className="text-slate-400 text-[10px] font-normal">No Order ID / UTR</span>
              </button>

              <button
                onClick={handleSimulateScreenshotUpload}
                className="w-full text-left px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-xs font-semibold text-blue-800 transition flex items-center justify-between border border-blue-200"
              >
                <span>5. Upload Payment Screenshot</span>
                <span className="text-blue-600 text-[10px] font-normal">Submits to Admin</span>
              </button>

              <button
                onClick={() => setActiveScreen('admin')}
                className="w-full text-left px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-xs font-semibold text-indigo-800 transition flex items-center justify-between border border-indigo-200"
              >
                <span>6. Check Admin Alert Channel</span>
                <span className="text-indigo-600 text-[10px] font-normal">Approve / Reject</span>
              </button>
            </div>
          </div>

          {/* Security Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Manual Verification Rules</span>
            </h4>

            <ul className="text-xs text-slate-500 space-y-2 leading-relaxed">
              <li className="flex items-start space-x-1.5">
                <span className="text-emerald-600 font-bold">•</span>
                <span><strong>No Order ID / UTR:</strong> Verified strictly by Telegram User ID and Course Name.</span>
              </li>
              <li className="flex items-start space-x-1.5">
                <span className="text-emerald-600 font-bold">•</span>
                <span><strong>Bank Check:</strong> Admin confirms money in UPI app before clicking Approve.</span>
              </li>
              <li className="flex items-start space-x-1.5">
                <span className="text-emerald-600 font-bold">•</span>
                <span><strong>Drive Link & ZIP Password:</strong> Released ONLY when status is updated to <code>PAID</code>.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
