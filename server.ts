import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { config } from './src/config/config.js';
import { googleSheetsService } from './src/services/googleSheets.js';
import { startTelegramBot, stopTelegramBot, getBotStatus, syncTelegramAdminDecision } from './src/bot/bot.js';
import { systemLogger } from './src/services/logger.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const hasQrAssetCached = fs.existsSync(config.qrImagePath);

app.use(express.json());

// Lightweight Performance Monitoring Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 500) {
      console.log(`⏱️ [Slow Route Warning] ${req.method} ${req.originalUrl} took ${duration}ms`);
    }
  });
  next();
});

// API Routes
app.get('/api/logs', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const logs = systemLogger.getRecentLogs(limit);
    res.json({ success: true, count: logs.length, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, logs: [] });
  }
});

app.delete('/api/logs', (req, res) => {
  systemLogger.clear();
  res.json({ success: true, message: 'Logs cleared successfully' });
});

app.delete('/api/logs/:id', (req, res) => {
  const { id } = req.params;
  systemLogger.deleteLog(id);
  res.json({ success: true, message: `Log ${id} deleted successfully` });
});

app.get('/api/status', (req, res) => {
  const botStatus = getBotStatus();
  const sheetsStatus = googleSheetsService.getStatus();
  res.json({
    bot: botStatus,
    sheets: sheetsStatus,
    config: {
      storeName: config.storeName,
      currency: config.currency,
      upiId: config.upiId,
      payeeName: config.payeeName,
      supportUsername: config.supportUsername,
      paymentExpiryHours: config.paymentExpiryHours,
      hasQrAsset: hasQrAssetCached
    }
  });
});

app.get('/api/courses', async (req, res) => {
  try {
    const activeOnly = req.query.all !== 'true';
    const courses = await googleSheetsService.getCourses(activeOnly);
    res.json({
      success: true,
      courses,
      connected: googleSheetsService.getStatus().connected,
      error: googleSheetsService.getStatus().lastSyncError
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, courses: [] });
  }
});

app.get('/api/courses/export-csv', async (req, res) => {
  try {
    const courses = await googleSheetsService.getCourses(false);
    const headers = [
      'Course ID',
      'Course Name',
      'Creator Name',
      'Original Price',
      'Selling Price',
      'File Size',
      'Language',
      'Google Drive Link',
      'Zip Password',
      'Thumbnail URL',
      'Description',
      'Status',
      'Upload Date'
    ];

    const escapeCell = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = courses.map((c: any) => [
      escapeCell(c.courseId),
      escapeCell(c.courseName),
      escapeCell(c.creatorName),
      escapeCell(c.originalPrice),
      escapeCell(c.price),
      escapeCell(c.courseSize),
      escapeCell(c.language),
      escapeCell(c.driveLink),
      escapeCell(c.zipPassword),
      escapeCell(c.thumbnailUrl || ''),
      escapeCell(c.description || ''),
      escapeCell(c.status),
      escapeCell(c.createdAt)
    ]);

    const csvString = '\uFEFF' + [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(r => r.join(','))
    ].join('\r\n');

    const dateStamp = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="courses_backup_${dateStamp}.csv"`);
    res.status(200).send(csvString);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/courses', async (req, res) => {
  try {
    const courseData = req.body;
    if (!courseData.courseName || !courseData.price || !courseData.driveLink || !courseData.zipPassword) {
      return res.status(400).json({ success: false, error: 'Missing required course fields' });
    }
    const newCourse = googleSheetsService.addCourse({
      courseId: courseData.courseId || `C${String(Date.now()).slice(-4)}`,
      courseName: courseData.courseName,
      creatorName: courseData.creatorName || 'Instructor',
      price: Number(courseData.price) || 99,
      originalPrice: Number(courseData.originalPrice) || (Number(courseData.price) * 3),
      courseSize: courseData.courseSize || '1.5 GB',
      language: courseData.language || 'Hindi',
      driveLink: courseData.driveLink,
      zipPassword: courseData.zipPassword,
      description: courseData.description || 'Digital masterclass',
      thumbnailUrl: courseData.thumbnailUrl,
      status: courseData.status || 'Active',
      createdAt: new Date().toISOString().split('T')[0]
    });
    res.json({ success: true, course: newCourse });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/courses/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const updates = req.body;
    const updated = await googleSheetsService.updateCourse(courseId, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    res.json({ success: true, course: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/courses/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const deleted = await googleSheetsService.deleteCourse(courseId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/purchases', async (req, res) => {
  try {
    const userId = req.query.userId as string | undefined;
    const purchases = await googleSheetsService.getPurchases(userId);
    res.json({ success: true, purchases });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const stats = await googleSheetsService.getStatistics();
    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/raw-sheets', async (req, res) => {
  try {
    const raw = googleSheetsService.getRawData();
    res.json({ success: true, data: raw });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/debug-payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const diagnostic = await googleSheetsService.debugPayment(paymentId);
    res.json({ success: true, diagnostic });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/simulate-purchase', async (req, res) => {
  try {
    const { userId, username, customerName, courseId, screenshotUrl } = req.body;
    const course = await googleSheetsService.getCourseById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    const purchase = await googleSheetsService.recordPurchaseSubmission({
      telegramUserId: String(userId || '987654321'),
      telegramUsername: username || 'student_demo',
      customerName: customerName || 'Rahul Verma',
      courseId: course.courseId,
      courseName: course.courseName,
      amount: course.price,
      paymentScreenshotFileId: screenshotUrl || 'simulated_screenshot_telegram_file_id'
    });

    res.json({ success: true, purchase });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/admins', async (req, res) => {
  try {
    const admins = await googleSheetsService.getAdmins();
    res.json({ success: true, admins });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admins', async (req, res) => {
  try {
    const { name, telegramId, username, role, status, addedBy } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: 'Admin name is required.' });
    }
    const tid = String(telegramId || '').trim();
    if (!tid || !/^\d+$/.test(tid)) {
      return res.status(400).json({ success: false, error: 'Telegram User ID must be a numeric ID (digits only).' });
    }

    const newAdmin = await googleSheetsService.addAdmin({
      name: String(name).trim(),
      telegramId: tid,
      username: username ? String(username).replace('@', '').trim() : '',
      role: role || 'Payment Admin',
      status: status || 'Active'
    }, addedBy || 'Owner');

    systemLogger.log({
      level: 'info',
      category: 'api',
      message: `Admin ${newAdmin.name} (${newAdmin.telegramId}) added by ${newAdmin.addedBy}`,
      details: JSON.stringify(newAdmin)
    });

    res.json({ success: true, admin: newAdmin, message: 'Admin registered successfully' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put('/api/admins/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { name, username, role, status, requestingAdminId } = req.body;
    const updated = await googleSheetsService.updateAdmin(
      telegramId,
      { name, username, role, status },
      requestingAdminId
    );

    systemLogger.log({
      level: 'info',
      category: 'api',
      message: `Admin ${telegramId} updated`,
      details: JSON.stringify(updated)
    });

    res.json({ success: true, admin: updated, message: 'Admin details updated successfully' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/admins/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { requestingAdminId } = req.query;
    await googleSheetsService.deleteAdmin(telegramId, requestingAdminId as string | undefined);

    systemLogger.log({
      level: 'info',
      category: 'api',
      message: `Admin ${telegramId} removed`,
      details: `Deleted by ${requestingAdminId || 'Dashboard'}`
    });

    res.json({ success: true, message: 'Admin deleted successfully' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/admin-action', async (req, res) => {
  try {
    const { userId, courseId, action, adminId, adminName, paymentId, rejectionReason } = req.body;
    if (!userId || !courseId || !action) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const resolvedAdminId = String(adminId || config.adminTelegramId || '8293894004');
    const result = await googleSheetsService.processPaymentDecision({
      userId: String(userId),
      courseId: String(courseId),
      paymentId: paymentId ? String(paymentId) : undefined,
      action: action === 'APPROVE' ? 'APPROVE' : 'REJECT',
      adminId: resolvedAdminId,
      adminName: adminName || undefined,
      rejectionReason: rejectionReason || undefined
    });

    if (result.alreadyProcessed) {
      return res.status(409).json({
        success: false,
        alreadyProcessed: true,
        error: result.error,
        purchase: result.purchase
      });
    }

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error || 'Failed to process payment' });
    }

    // Non-blocking sync to active Telegram bot sessions and customer
    if (result.purchase) {
      syncTelegramAdminDecision(
        result.purchase,
        action === 'APPROVE' ? 'Approved' : 'Rejected',
        adminName || `Admin (${resolvedAdminId})`
      ).catch(() => {});
    }

    res.json({ success: true, purchase: result.purchase, delivery: result.delivery });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sheets-reconnect', async (req, res) => {
  try {
    const { sheetId } = req.body || {};
    const result = await googleSheetsService.reconnect(sheetId);
    if (result.success) {
      systemLogger.log({
        level: 'info',
        category: 'sheets',
        message: 'Google Sheets reconnected successfully to ' + (sheetId || config.googleSheetId),
        details: result.message
      });
    }
    res.json(result);
  } catch (err: any) {
    systemLogger.log({
      level: 'error',
      category: 'sheets',
      message: 'Google Sheets reconnection request failed: ' + err.message,
      details: err.stack || err.message
    });
    res.status(500).json({
      success: false,
      message: err.message,
      status: googleSheetsService.getStatus()
    });
  }
});

app.post('/api/bot-toggle', async (req, res) => {
  try {
    const { action } = req.body;
    if (action === 'START') {
      const result = await startTelegramBot();
      res.json(result);
    } else {
      const result = stopTelegramBot();
      res.json(result);
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Auto-start bot if BOT_TOKEN is already present in environment
if (config.isBotConfigured) {
  startTelegramBot().catch((e) => {
    console.warn('Could not auto-start bot on boot:', e.message);
  });
}

// Graceful cleanup on process termination to prevent 409 getUpdates conflicts
const handleShutdown = () => {
  console.log('🛑 [Shutdown] Releasing Telegram Bot polling session...');
  stopTelegramBot();
};
process.once('SIGINT', handleShutdown);
process.once('SIGTERM', handleShutdown);

async function startServer() {
  console.log('🔄 Initializing Google Sheets connection...');
  try {
    const isConnected = await googleSheetsService.initializeSheets();
    if (isConnected) {
      console.log('✅ Google Sheets connection initialized and synchronized.');
    } else {
      const status = googleSheetsService.getStatus();
      if (status.lastSyncError) {
        console.warn('ℹ️ Google Sheets initial status:', status.lastSyncError);
      }
    }
  } catch (err: any) {
    console.warn('⚠️ Google Sheets initialization notice:', err.message);
  }

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Course Bazar Hub & Web Server running on port ${PORT}`);
  });
}

startServer().catch(console.error);
