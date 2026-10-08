import crypto from 'crypto';
import { google, sheets_v4 } from 'googleapis';
import { config } from '../config/config.js';
import { Course, Purchase, AdminUser, SettingItem, PurchaseStatus } from '../types/index.js';
import { systemLogger } from './logger.js';

// Default courses: Empty by default. Courses must be manually added via Admin Panel.
const DEFAULT_COURSES: Course[] = [];

const DEFAULT_SETTINGS: SettingItem[] = [
  { key: 'UPI_ID', value: '7014180967@fam' },
  { key: 'PAYEE_NAME', value: 'Harsh' },
  { key: 'SUPPORT_USERNAME', value: '@kanumeena18' },
  { key: 'SUPPORT_EMAIL', value: 'coursebazar01@gmail.com' },
  { key: 'STORE_NAME', value: 'Course Bazar' },
  { key: 'CURRENCY', value: 'INR' },
  { key: 'PAYMENT_EXPIRY_HOURS', value: '24' },
  { key: 'WELCOME_MESSAGE', value: 'Find your course, make the payment using UPI, and receive your course.' }
];

const DEFAULT_ADMINS: AdminUser[] = [
  { telegramId: config.adminTelegramId || '123456789', name: 'Store Owner', role: 'Owner', status: 'Active' }
];

const DEFAULT_PURCHASES: Purchase[] = [];

// Helper to wrap any promise in a strict timeout
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout of ${timeoutMs}ms exceeded during ${operationName}`));
    }, timeoutMs);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export class GoogleSheetsService {
  private sheetsClient: sheets_v4.Sheets | null = null;
  private isConnected = false;
  private lastSyncError: string | null = null;

  // In-memory cache & fallback store (Ultra-fast local reads)
  private coursesCache: Course[] = [...DEFAULT_COURSES];
  private purchasesCache: Purchase[] = [...DEFAULT_PURCHASES];
  private settingsCache: SettingItem[] = [...DEFAULT_SETTINGS];
  private adminsCache: AdminUser[] = [...DEFAULT_ADMINS];

  // Cache timestamps for stale-while-revalidate
  private lastCoursesFetch = 0;
  private lastPurchasesFetch = 0;
  private lastSettingsFetch = 0;
  private lastAdminsFetch = 0;

  // Cache TTLs in milliseconds
  private readonly COURSES_TTL = 45_000;    // 45 seconds
  private readonly PURCHASES_TTL = 15_000;  // 15 seconds
  private readonly SETTINGS_TTL = 180_000;  // 3 minutes
  private readonly ADMINS_TTL = 180_000;    // 3 minutes
  private readonly API_TIMEOUT = 5_000;     // 5 seconds max per Google API request

  // Synchronization locks to prevent concurrent duplicate requests
  private isFetchingCourses = false;
  private isFetchingPurchases = false;
  private isFetchingSettings = false;
  private isFetchingAdmins = false;

  constructor() {
    this.initClient().catch(err => {
      console.warn('ℹ️ [DB] Google Sheets client init notice:', (err as Error).message);
    });
  }

  public async initializeSheets(): Promise<boolean> {
    return this.initClient();
  }

  private handleGoogleApiError(context: string, err: any): void {
    const errMsg = err?.message || String(err);
    const isNotFound =
      err?.code === 404 ||
      errMsg.includes('404') ||
      errMsg.toLowerCase().includes('not found') ||
      errMsg.toLowerCase().includes('requested entity was not found');
    const isPermission =
      err?.code === 403 ||
      errMsg.includes('403') ||
      errMsg.toLowerCase().includes('permission');
    const isAuth =
      errMsg.includes('DECODER') ||
      errMsg.includes('unsupported') ||
      errMsg.toLowerCase().includes('jwt') ||
      errMsg.toLowerCase().includes('private key');

    if (isNotFound) {
      this.isConnected = false;
      this.lastSyncError = `Spreadsheet ID "${config.googleSheetId}" not found or not shared (404). In Google Sheets, click Share and add "${config.googleServiceAccountEmail}" as Editor. Operating in built-in store mode.`;
      console.warn(`ℹ️ [DB] ${context}: Spreadsheet not found or not shared (404). Switched to high-speed built-in store mode.`);
    } else if (isPermission) {
      this.isConnected = false;
      this.lastSyncError = `Permission denied (403). Share Google Sheet with "${config.googleServiceAccountEmail}" as Editor. Operating in built-in store mode.`;
      console.warn(`ℹ️ [DB] ${context}: Permission denied (403). Switched to built-in store mode.`);
    } else if (isAuth) {
      this.isConnected = false;
      this.lastSyncError = 'Google Service Account credentials invalid. Operating in built-in store mode.';
      console.warn(`ℹ️ [DB] ${context}: Service account invalid. Switched to built-in store mode.`);
    } else {
      this.lastSyncError = errMsg;
      console.warn(`⚠️ [DB] ${context} notice:`, errMsg);
    }

    systemLogger.log({
      level: 'error',
      category: 'sheets',
      message: this.lastSyncError || errMsg,
      details: `Context: ${context}. Details: ${errMsg}`
    });
  }

  private async ensureRequiredSheets(existingSheets: sheets_v4.Schema$Sheet[]): Promise<void> {
    if (!this.sheetsClient || !config.googleSheetId) return;

    const existingTitles = new Set(
      existingSheets.map((s) => s.properties?.title).filter(Boolean) as string[]
    );

    const requiredSheets: { title: string; headers: string[] }[] = [
      {
        title: 'Courses',
        headers: [
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
        ]
      },
      {
        title: 'Purchases',
        headers: [
          'Telegram User ID',
          'Telegram Username',
          'Customer Name',
          'Course ID',
          'Course Name',
          'Amount',
          'Payment Screenshot File ID',
          'Status',
          'Created At',
          'Approved At',
          'Approved By'
        ]
      },
      {
        title: 'Settings',
        headers: ['Key', 'Value']
      },
      {
        title: 'Admins',
        headers: ['Telegram ID', 'Name', 'Role', 'Status']
      }
    ];

    const missingSheets = requiredSheets.filter((r) => !existingTitles.has(r.title));
    if (missingSheets.length > 0) {
      try {
        console.log(`ℹ️ [DB] Auto-creating missing worksheet tabs: ${missingSheets.map((m) => m.title).join(', ')}`);
        await withTimeout(
          this.sheetsClient.spreadsheets.batchUpdate({
            spreadsheetId: config.googleSheetId,
            requestBody: {
              requests: missingSheets.map((m) => ({
                addSheet: {
                  properties: { title: m.title }
                }
              }))
            }
          }),
          this.API_TIMEOUT,
          'autoCreateMissingSheets'
        );

        // Add headers to newly created sheets
        for (const sheet of missingSheets) {
          const endCol = String.fromCharCode(64 + sheet.headers.length);
          await withTimeout(
            this.sheetsClient.spreadsheets.values.update({
              spreadsheetId: config.googleSheetId,
              range: `${sheet.title}!A1:${endCol}1`,
              valueInputOption: 'USER_ENTERED',
              requestBody: {
                values: [sheet.headers]
              }
            }),
            this.API_TIMEOUT,
            `writeHeadersFor_${sheet.title}`
          );
        }
        console.log('✅ [DB] Successfully initialized all required sheets & header rows in Google Spreadsheet.');
      } catch (sheetErr: any) {
        console.warn('⚠️ [DB] Notice while auto-creating sheets:', sheetErr?.message || sheetErr);
      }
    }
  }

  private async initClient(): Promise<boolean> {
    if (!config.isGoogleConfigured || !config.googleSheetId) {
      console.log('ℹ️ [DB] Running with high-speed built-in store mode (Google Sheet ID not configured).');
      this.isConnected = false;
      return false;
    }

    try {
      // Validate private key first using Node crypto
      try {
        crypto.createPrivateKey(config.googlePrivateKey);
      } catch (keyErr: any) {
        this.lastSyncError = 'Google Service Account private key could not be decoded. Ensure it is a valid RSA private key.';
        console.warn('⚠️ [DB]', this.lastSyncError);
        this.isConnected = false;
        return false;
      }

      const auth = new google.auth.JWT({
        email: config.googleServiceAccountEmail,
        key: config.googlePrivateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.sheetsClient = google.sheets({ version: 'v4', auth });

      // Actively verify spreadsheet existence and permissions before marking connected
      try {
        const testRes = await withTimeout(
          this.sheetsClient.spreadsheets.get({
            spreadsheetId: config.googleSheetId
          }),
          this.API_TIMEOUT,
          'verifySpreadsheetAccess'
        );

        // Ensure all required sheets (Courses, Purchases, Settings, Admins) exist
        await this.ensureRequiredSheets(testRes.data.sheets || []);

        this.isConnected = true;
        this.lastSyncError = null;
        console.log(`✅ [DB] Google Sheets API v4 connected to spreadsheet: "${testRes.data.properties?.title || config.googleSheetId}"`);

        // Warm up cache in background non-blocking only if connected successfully
        setTimeout(() => {
          this.refreshCoursesFromGoogle().catch(() => {});
          this.refreshPurchasesFromGoogle().catch(() => {});
        }, 500);

        return true;
      } catch (verifyErr: any) {
        this.handleGoogleApiError('Initial spreadsheet verification', verifyErr);
        this.isConnected = false;
        return false;
      }
    } catch (error: any) {
      this.handleGoogleApiError('Google Sheets client initialization', error);
      this.isConnected = false;
      return false;
    }
  }

  public async reconnect(newSheetId?: string): Promise<{ success: boolean; message: string; status: any }> {
    if (newSheetId && newSheetId.trim()) {
      config.googleSheetId = newSheetId.trim();
    }
    const success = await this.initClient();
    return {
      success,
      message: success
        ? 'Successfully connected to Google Sheets!'
        : (this.lastSyncError || 'Failed to connect to Google Sheets. Verify permissions and Sheet ID.'),
      status: this.getStatus()
    };
  }

  public getStatus() {
    return {
      connected: this.isConnected,
      hasCredentials: config.isGoogleConfigured,
      sheetId: config.googleSheetId || 'Not configured',
      serviceAccount: config.googleServiceAccountEmail || 'Not configured',
      adminTelegramId: config.adminTelegramId || 'Not configured',
      cachedCoursesCount: this.coursesCache.length,
      cachedPurchasesCount: this.purchasesCache.length,
      lastSyncError: this.lastSyncError
    };
  }

  // ==========================================
  // COURSES (Ultra Fast Cached Read + Background Revalidate)
  // ==========================================
  private async refreshCoursesFromGoogle(): Promise<void> {
    if (!this.isConnected || !this.sheetsClient || !config.googleSheetId || this.isFetchingCourses) {
      return;
    }

    this.isFetchingCourses = true;
    try {
      const fetchPromise = this.sheetsClient.spreadsheets.values.get({
        spreadsheetId: config.googleSheetId,
        range: 'Courses!A2:M'
      });

      const response = await withTimeout(fetchPromise, this.API_TIMEOUT, 'fetchCoursesFromGoogle');
      const rows = response.data.values || [];

      const fetchedCourses: Course[] = rows.map((row) => ({
        courseId: String(row[0] || '').trim(),
        courseName: String(row[1] || '').trim(),
        creatorName: String(row[2] || '').trim(),
        price: Number(row[3]) || 0,
        originalPrice: Number(row[4]) || 0,
        courseSize: String(row[5] || '').trim(),
        language: String(row[6] || '').trim(),
        driveLink: String(row[7] || '').trim(),
        zipPassword: String(row[8] || '').trim(),
        description: String(row[9] || '').trim(),
        thumbnailUrl: row[10] ? String(row[10]).trim() : undefined,
        status: (String(row[11] || 'Active').trim() as 'Active' | 'Inactive'),
        createdAt: String(row[12] || new Date().toISOString().split('T')[0]).trim()
      })).filter(c => c.courseId && c.courseName);

      this.coursesCache = fetchedCourses;
      this.lastCoursesFetch = Date.now();
      this.lastSyncError = null;
    } catch (err: any) {
      this.handleGoogleApiError('Non-blocking course refresh', err);
      this.lastCoursesFetch = Date.now() + 300_000;
    } finally {
      this.isFetchingCourses = false;
    }
  }

  public async getCourses(activeOnly = true): Promise<Course[]> {
    const now = Date.now();
    // If cache is stale and not already refreshing, trigger background revalidation
    if (this.isConnected && (now - this.lastCoursesFetch > this.COURSES_TTL)) {
      this.refreshCoursesFromGoogle().catch(() => {});
    }

    // Return instant memory cache in < 1ms
    if (activeOnly) {
      return this.coursesCache.filter(c => c.status.toLowerCase() === 'active');
    }
    return this.coursesCache;
  }

  public async getCourseById(courseId: string): Promise<Course | null> {
    const courses = await this.getCourses(false);
    return courses.find(c => c.courseId.toLowerCase() === courseId.toLowerCase()) || null;
  }

  public async searchCourses(query: string): Promise<Course[]> {
    const courses = await this.getCourses(true);
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return courses;

    const queryWords = cleanQuery.split(/\s+/).filter(Boolean);

    return courses.filter(c => {
      const name = c.courseName.toLowerCase();
      const creator = c.creatorName.toLowerCase();
      const desc = c.description.toLowerCase();

      // Direct exact or substring match
      if (name.includes(cleanQuery) || creator.includes(cleanQuery)) {
        return true;
      }

      // Word tokens matching
      return queryWords.every(word => name.includes(word) || creator.includes(word) || desc.includes(word));
    });
  }

  // ==========================================
  // PURCHASES (NO Order ID, NO UTR, NO Transaction ID!)
  // ==========================================
  private async refreshPurchasesFromGoogle(): Promise<void> {
    if (!this.isConnected || !this.sheetsClient || !config.googleSheetId || this.isFetchingPurchases) {
      return;
    }

    this.isFetchingPurchases = true;
    try {
      const fetchPromise = this.sheetsClient.spreadsheets.values.get({
        spreadsheetId: config.googleSheetId,
        range: 'Purchases!A2:K'
      });

      const response = await withTimeout(fetchPromise, this.API_TIMEOUT, 'fetchPurchasesFromGoogle');
      const rows = response.data.values || [];

      const fetchedPurchases: Purchase[] = rows.map((row) => ({
        telegramUserId: String(row[0] || '').trim(),
        telegramUsername: String(row[1] || '').trim(),
        customerName: String(row[2] || '').trim(),
        courseId: String(row[3] || '').trim(),
        courseName: String(row[4] || '').trim(),
        amount: Number(row[5]) || 0,
        paymentScreenshotFileId: String(row[6] || '').trim(),
        status: (String(row[7] || 'PAYMENT_PENDING').trim() as PurchaseStatus),
        createdAt: String(row[8] || '').trim(),
        approvedAt: row[9] ? String(row[9]).trim() : undefined,
        approvedBy: row[10] ? String(row[10]).trim() : undefined
      })).filter(p => p.telegramUserId && p.courseId);

      if (fetchedPurchases.length > 0) {
        this.purchasesCache = fetchedPurchases;
        this.lastPurchasesFetch = Date.now();
        this.lastSyncError = null;
      }
    } catch (err: any) {
      this.handleGoogleApiError('Non-blocking purchases refresh', err);
      this.lastPurchasesFetch = Date.now() + 300_000;
    } finally {
      this.isFetchingPurchases = false;
    }
  }

  public async getPurchases(userId?: string): Promise<Purchase[]> {
    const now = Date.now();
    if (this.isConnected && (now - this.lastPurchasesFetch > this.PURCHASES_TTL)) {
      this.refreshPurchasesFromGoogle().catch(() => {});
    }

    if (userId) {
      return this.purchasesCache.filter(p => p.telegramUserId === String(userId));
    }
    return this.purchasesCache;
  }

  public async getPendingPurchases(): Promise<Purchase[]> {
    const all = await this.getPurchases();
    return all.filter(p => p.status === 'PAYMENT_SUBMITTED');
  }

  public async getPurchaseByUserAndCourse(userId: string, courseId: string): Promise<Purchase | null> {
    const purchases = await this.getPurchases(userId);
    const matching = purchases.filter(p => p.courseId.toLowerCase() === courseId.toLowerCase());
    if (matching.length === 0) return null;
    return matching[matching.length - 1];
  }

  public async recordPurchaseSubmission(purchase: {
    telegramUserId: string;
    telegramUsername: string;
    customerName: string;
    courseId: string;
    courseName: string;
    amount: number;
    paymentScreenshotFileId: string;
  }): Promise<Purchase> {
    const newRecord: Purchase = {
      telegramUserId: String(purchase.telegramUserId),
      telegramUsername: purchase.telegramUsername || '',
      customerName: purchase.customerName || '',
      courseId: purchase.courseId,
      courseName: purchase.courseName,
      amount: purchase.amount,
      paymentScreenshotFileId: purchase.paymentScreenshotFileId,
      status: 'PAYMENT_SUBMITTED',
      createdAt: new Date().toISOString()
    };

    // Instant Write-Through in memory (0ms lag!)
    const existingIndex = this.purchasesCache.findIndex(
      p => p.telegramUserId === newRecord.telegramUserId &&
           p.courseId === newRecord.courseId &&
           (p.status === 'PAYMENT_PENDING' || p.status === 'PAYMENT_SUBMITTED')
    );

    if (existingIndex >= 0) {
      this.purchasesCache[existingIndex] = {
        ...this.purchasesCache[existingIndex],
        ...newRecord
      };
    } else {
      this.purchasesCache.unshift(newRecord);
    }

    // Non-blocking write to Google Sheet with timeout
    if (this.isConnected && this.sheetsClient && config.googleSheetId) {
      const rowValues = [
        newRecord.telegramUserId,
        newRecord.telegramUsername,
        newRecord.customerName,
        newRecord.courseId,
        newRecord.courseName,
        newRecord.amount,
        newRecord.paymentScreenshotFileId,
        newRecord.status,
        newRecord.createdAt,
        newRecord.approvedAt || '',
        newRecord.approvedBy || ''
      ];

      withTimeout(
        this.sheetsClient.spreadsheets.values.append({
          spreadsheetId: config.googleSheetId,
          range: 'Purchases!A:K',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [rowValues] }
        }),
        this.API_TIMEOUT,
        'appendPurchaseToGoogle'
      ).catch(err => {
        this.handleGoogleApiError('Non-blocking append purchase', err);
      });
    }

    return newRecord;
  }

  public async updatePurchaseStatus(
    userId: string,
    courseId: string,
    newStatus: PurchaseStatus,
    adminTelegramId?: string
  ): Promise<Purchase | null> {
    const uid = String(userId);
    const cid = String(courseId).toLowerCase();

    const targetIndex = this.purchasesCache.findIndex(
      p => p.telegramUserId === uid && p.courseId.toLowerCase() === cid
    );

    if (targetIndex < 0) return null;

    const now = new Date().toISOString();
    const updated = {
      ...this.purchasesCache[targetIndex],
      status: newStatus,
      ...(newStatus === 'PAID' ? { approvedAt: now, approvedBy: adminTelegramId } : {}),
      ...(newStatus === 'REJECTED' ? { approvedAt: now, approvedBy: adminTelegramId } : {})
    };

    // Instant Write-Through in memory
    this.purchasesCache[targetIndex] = updated;

    // Asynchronous non-blocking Google Sheet update
    if (this.isConnected && this.sheetsClient && config.googleSheetId) {
      const sheets = this.sheetsClient;
      const sheetId = config.googleSheetId;

      (async () => {
        try {
          const response = await withTimeout(
            sheets.spreadsheets.values.get({
              spreadsheetId: sheetId,
              range: 'Purchases!A2:K'
            }),
            this.API_TIMEOUT,
            'findRowForStatusUpdate'
          );

          const rows = response.data.values || [];
          for (let i = 0; i < rows.length; i++) {
            const rowUser = String(rows[i][0] || '').trim();
            const rowCourse = String(rows[i][3] || '').trim().toLowerCase();

            if (rowUser === uid && rowCourse === cid) {
              const sheetRowIndex = i + 2;
              await withTimeout(
                sheets.spreadsheets.values.update({
                  spreadsheetId: sheetId,
                  range: `Purchases!H${sheetRowIndex}:K${sheetRowIndex}`,
                  valueInputOption: 'USER_ENTERED',
                  requestBody: {
                    values: [[
                      newStatus,
                      rows[i][8] || now,
                      updated.approvedAt || '',
                      updated.approvedBy || ''
                    ]]
                  }
                }),
                this.API_TIMEOUT,
                'updateRowStatusInGoogle'
              );
              break;
            }
          }
        } catch (err: any) {
          this.handleGoogleApiError('Non-blocking purchase status sync', err);
        }
      })().catch(() => {});
    }

    return updated;
  }

  // ==========================================
  // ADMINS & SETTINGS (Cached)
  // ==========================================
  public async getAdmins(): Promise<AdminUser[]> {
    const now = Date.now();
    if (this.isConnected && (now - this.lastAdminsFetch > this.ADMINS_TTL) && !this.isFetchingAdmins) {
      this.isFetchingAdmins = true;
      withTimeout(
        this.sheetsClient!.spreadsheets.values.get({
          spreadsheetId: config.googleSheetId,
          range: 'Admins!A2:D'
        }),
        this.API_TIMEOUT,
        'fetchAdminsFromGoogle'
      ).then(res => {
        const rows = res.data.values || [];
        const fetched = rows.map(r => ({
          telegramId: String(r[0] || '').trim(),
          name: String(r[1] || '').trim(),
          role: (String(r[2] || 'Admin').trim() as 'Owner' | 'Admin' | 'Moderator'),
          status: (String(r[3] || 'Active').trim() as 'Active' | 'Inactive')
        })).filter(a => a.telegramId);

        if (fetched.length > 0) {
          this.adminsCache = fetched;
          this.lastAdminsFetch = Date.now();
        }
      }).catch(err => {
        this.handleGoogleApiError('Non-blocking admins fetch', err);
      }).finally(() => {
        this.isFetchingAdmins = false;
      });
    }

    return this.adminsCache;
  }

  public async isAdmin(telegramId: string | number): Promise<boolean> {
    const tid = String(telegramId).trim();
    if (!tid) return false;

    // Fast check config env first
    if (config.adminTelegramId && tid === config.adminTelegramId) {
      return true;
    }

    const admins = await this.getAdmins();
    return admins.some(a => a.telegramId === tid && a.status.toLowerCase() === 'active');
  }

  public async getSettings(): Promise<SettingItem[]> {
    const now = Date.now();
    if (this.isConnected && (now - this.lastSettingsFetch > this.SETTINGS_TTL) && !this.isFetchingSettings) {
      this.isFetchingSettings = true;
      withTimeout(
        this.sheetsClient!.spreadsheets.values.get({
          spreadsheetId: config.googleSheetId,
          range: 'Settings!A2:B'
        }),
        this.API_TIMEOUT,
        'fetchSettingsFromGoogle'
      ).then(res => {
        const rows = res.data.values || [];
        const fetched = rows.map(r => ({
          key: String(r[0] || '').trim(),
          value: String(r[1] || '').trim()
        })).filter(s => s.key);

        if (fetched.length > 0) {
          this.settingsCache = fetched;
          this.lastSettingsFetch = Date.now();
        }
      }).catch(err => {
        this.handleGoogleApiError('Non-blocking settings fetch', err);
      }).finally(() => {
        this.isFetchingSettings = false;
      });
    }

    return this.settingsCache;
  }

  public async getSetting(key: string, defaultValue = ''): Promise<string> {
    const settings = await this.getSettings();
    const found = settings.find(s => s.key.toUpperCase() === key.toUpperCase());
    return found ? found.value : defaultValue;
  }

  public async getStatistics() {
    const courses = await this.getCourses(false);
    const purchases = await this.getPurchases();

    const activeCourses = courses.filter(c => c.status.toLowerCase() === 'active').length;
    const inactiveCourses = courses.filter(c => c.status.toLowerCase() === 'inactive').length;

    const paidPurchases = purchases.filter(p => p.status === 'PAID');
    const pendingPurchases = purchases.filter(p => p.status === 'PAYMENT_SUBMITTED');
    const rejectedPurchases = purchases.filter(p => p.status === 'REJECTED');
    const expiredPurchases = purchases.filter(p => p.status === 'EXPIRED');

    const totalRevenue = paidPurchases.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    return {
      totalCourses: courses.length,
      activeCourses,
      inactiveCourses,
      totalPurchases: purchases.length,
      paidPurchasesCount: paidPurchases.length,
      pendingPurchasesCount: pendingPurchases.length,
      rejectedPurchasesCount: rejectedPurchases.length,
      expiredPurchasesCount: expiredPurchases.length,
      totalRevenue
    };
  }

  public async checkExpiredPurchases(expiryHours = config.paymentExpiryHours) {
    const now = Date.now();
    const expiryMs = expiryHours * 60 * 60 * 1000;
    let expiredCount = 0;

    for (let i = 0; i < this.purchasesCache.length; i++) {
      const p = this.purchasesCache[i];
      if (p.status === 'PAYMENT_PENDING') {
        const createdTime = new Date(p.createdAt).getTime();
        if (now - createdTime > expiryMs) {
          p.status = 'EXPIRED';
          expiredCount++;
        }
      }
    }

    return expiredCount;
  }

  // Dashboard Simulator Helpers
  public addCourse(course: Course): Course {
    this.coursesCache.push(course);

    // Also persist to Google Sheets if connected
    if (this.isConnected && this.sheetsClient && config.googleSheetId) {
      const rowValues = [
        course.courseId,
        course.courseName,
        course.creatorName,
        course.price,
        course.originalPrice,
        course.courseSize,
        course.language,
        course.driveLink,
        course.zipPassword,
        course.description,
        course.thumbnailUrl || '',
        course.status,
        course.createdAt
      ];

      withTimeout(
        this.sheetsClient.spreadsheets.values.append({
          spreadsheetId: config.googleSheetId,
          range: 'Courses!A:M',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [rowValues] }
        }),
        this.API_TIMEOUT,
        'appendCourseToGoogle'
      ).catch(err => {
        this.handleGoogleApiError('Non-blocking append course', err);
      });
    }

    return course;
  }

  public async updateCourse(courseId: string, updates: Partial<Course>): Promise<Course | null> {
    const cid = courseId.toLowerCase();
    const idx = this.coursesCache.findIndex(c => c.courseId.toLowerCase() === cid);
    if (idx < 0) return null;

    const updated = {
      ...this.coursesCache[idx],
      ...updates
    };
    this.coursesCache[idx] = updated;

    // Asynchronous non-blocking Google Sheet update if connected
    if (this.isConnected && this.sheetsClient && config.googleSheetId) {
      const sheets = this.sheetsClient;
      const sheetId = config.googleSheetId;

      (async () => {
        try {
          const response = await withTimeout(
            sheets.spreadsheets.values.get({
              spreadsheetId: sheetId,
              range: 'Courses!A2:M'
            }),
            this.API_TIMEOUT,
            'findCourseRowForUpdate'
          );

          const rows = response.data.values || [];
          for (let i = 0; i < rows.length; i++) {
            const rowCourseId = String(rows[i][0] || '').trim().toLowerCase();
            if (rowCourseId === cid) {
              const sheetRowIndex = i + 2;
              await withTimeout(
                sheets.spreadsheets.values.update({
                  spreadsheetId: sheetId,
                  range: `Courses!A${sheetRowIndex}:M${sheetRowIndex}`,
                  valueInputOption: 'USER_ENTERED',
                  requestBody: {
                    values: [[
                      updated.courseId,
                      updated.courseName,
                      updated.creatorName,
                      updated.price,
                      updated.originalPrice,
                      updated.courseSize,
                      updated.language,
                      updated.driveLink,
                      updated.zipPassword,
                      updated.description,
                      updated.thumbnailUrl || '',
                      updated.status,
                      updated.createdAt
                    ]]
                  }
                }),
                this.API_TIMEOUT,
                'updateCourseRowInGoogle'
              );
              break;
            }
          }
        } catch (err: any) {
          this.handleGoogleApiError('Non-blocking course update', err);
        }
      })().catch(() => {});
    }

    return updated;
  }

  public async deleteCourse(courseId: string): Promise<boolean> {
    const cid = courseId.toLowerCase();
    const idx = this.coursesCache.findIndex(c => c.courseId.toLowerCase() === cid);
    if (idx < 0) return false;

    // Remove from in-memory cache immediately
    this.coursesCache.splice(idx, 1);

    // Asynchronous non-blocking Google Sheet update if connected
    if (this.isConnected && this.sheetsClient && config.googleSheetId) {
      const sheets = this.sheetsClient;
      const sheetId = config.googleSheetId;

      (async () => {
        try {
          const response = await withTimeout(
            sheets.spreadsheets.values.get({
              spreadsheetId: sheetId,
              range: 'Courses!A2:M'
            }),
            this.API_TIMEOUT,
            'findCourseRowForDelete'
          );

          const rows = response.data.values || [];
          for (let i = 0; i < rows.length; i++) {
            const rowCourseId = String(rows[i][0] || '').trim().toLowerCase();
            if (rowCourseId === cid) {
              const sheetRowIndex = i + 2;
              await withTimeout(
                sheets.spreadsheets.values.clear({
                  spreadsheetId: sheetId,
                  range: `Courses!A${sheetRowIndex}:M${sheetRowIndex}`
                }),
                this.API_TIMEOUT,
                'clearCourseRowInGoogle'
              );
              console.log(`✅ [DB] Cleared deleted course row ${sheetRowIndex} in Google Sheet`);
              break;
            }
          }
        } catch (err: any) {
          this.handleGoogleApiError('Non-blocking course delete', err);
        }
      })().catch(() => {});
    }

    return true;
  }

  public getRawData() {
    return {
      courses: this.coursesCache,
      purchases: this.purchasesCache,
      settings: this.settingsCache,
      admins: this.adminsCache
    };
  }
}

// Export singleton instance
export const googleSheetsService = new GoogleSheetsService();
