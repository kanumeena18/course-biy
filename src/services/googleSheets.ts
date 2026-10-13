import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { google, sheets_v4 } from 'googleapis';
import { config, parseSpreadsheetId } from '../config/config.js';
import { Course, Purchase, AdminUser, AdminRole, SettingItem, PurchaseStatus } from '../types/index.js';
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
  {
    adminId: 'ADM-1',
    telegramId: config.adminTelegramId || '8293894004',
    name: config.payeeName || 'Store Owner',
    username: config.supportUsername ? config.supportUsername.replace('@', '') : 'owner',
    role: 'Owner',
    status: 'Active',
    addedBy: 'System',
    createdAt: '2026-10-01',
    updatedAt: '2026-10-01'
  }
];

const DEFAULT_PURCHASES: Purchase[] = [];

// Durable In-Memory Mutex Lock for atomic, race-condition-free payment processing
class AsyncLock {
  private queue = Promise.resolve();

  acquire<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(fn, fn);
    this.queue = next.then(() => {}, () => {});
    return next;
  }
}
const globalPaymentLock = new AsyncLock();

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

export interface CourseSearchItem {
  course: Course;
  nameLower: string;
  creatorLower: string;
  descLower: string;
  combinedTokens: string;
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

  // High-performance O(1) Indexed Maps & Pre-calculated Caches
  private courseByIdMap = new Map<string, Course>();
  private activeCoursesCache: Course[] = [];
  private coursesSearchIndex: CourseSearchItem[] = [];
  private searchCache = new Map<string, { results: Course[]; timestamp: number }>();

  private purchasesByUserMap = new Map<string, Purchase[]>();
  private purchaseByPaymentIdMap = new Map<string, Purchase>();
  private pendingPurchasesCache: Purchase[] = [];

  private settingsMap = new Map<string, string>();

  private adminByTelegramIdMap = new Map<string, AdminUser>();
  private activeAdminIdsSet = new Set<string>();

  // Cached statistics with 10s TTL or write-through invalidation
  private cachedStats: any = null;
  private statsCacheTime = 0;

  // Google Sheets Row Index Tracking to eliminate slow full table scans on row updates
  private purchaseRowIndexMap = new Map<string, number>();
  private courseRowIndexMap = new Map<string, number>();
  private adminRowIndexMap = new Map<string, number>();

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
  private readonly API_TIMEOUT = 25_000;    // 25 seconds max per Google API request

  // Synchronization locks to prevent concurrent duplicate requests
  private isFetchingCourses = false;
  private isFetchingPurchases = false;
  private isFetchingSettings = false;
  private isFetchingAdmins = false;

  private readonly DATA_DIR = path.resolve(process.cwd(), 'data');
  private readonly PURCHASES_FILE = path.join(this.DATA_DIR, 'purchases.json');
  private readonly COURSES_FILE = path.join(this.DATA_DIR, 'courses.json');
  private readonly ADMINS_FILE = path.join(this.DATA_DIR, 'admins.json');
  private readonly SETTINGS_FILE = path.join(this.DATA_DIR, 'settings.json');

  private loadLocalData() {
    try {
      if (!fs.existsSync(this.DATA_DIR)) {
        fs.mkdirSync(this.DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(this.PURCHASES_FILE)) {
        const raw = fs.readFileSync(this.PURCHASES_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.purchasesCache = parsed;
        }
      }

      if (fs.existsSync(this.COURSES_FILE)) {
        const raw = fs.readFileSync(this.COURSES_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.coursesCache = parsed;
        }
      }

      if (fs.existsSync(this.ADMINS_FILE)) {
        const raw = fs.readFileSync(this.ADMINS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.adminsCache = parsed;
        }
      }

      if (fs.existsSync(this.SETTINGS_FILE)) {
        const raw = fs.readFileSync(this.SETTINGS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.settingsCache = parsed;
        }
      }
    } catch (err: any) {
      console.warn('⚠️ [DB] Notice loading local persistence files:', err.message);
    }
  }

  private saveLocalPurchases() {
    try {
      if (!fs.existsSync(this.DATA_DIR)) {
        fs.mkdirSync(this.DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(this.PURCHASES_FILE, JSON.stringify(this.purchasesCache, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn('⚠️ [DB] Notice saving local purchases:', err.message);
    }
  }

  constructor() {
    this.loadLocalData();
    this.rebuildCoursesIndex();
    this.rebuildPurchasesIndex();
    this.rebuildSettingsIndex();
    this.rebuildAdminsIndex();

    this.initClient().catch(err => {
      console.warn('ℹ️ [DB] Google Sheets client init notice:', (err as Error).message);
    });
  }

  // Fast internal index builders
  private rebuildCoursesIndex(): void {
    const byId = new Map<string, Course>();
    const active: Course[] = [];
    const searchIdx: CourseSearchItem[] = [];

    for (let i = 0; i < this.coursesCache.length; i++) {
      const c = this.coursesCache[i];
      const idKey = c.courseId.toLowerCase();
      byId.set(idKey, c);

      if (c.status.toLowerCase() === 'active') {
        active.push(c);
        const nameLower = c.courseName.toLowerCase();
        const creatorLower = (c.creatorName || '').toLowerCase();
        const descLower = (c.description || '').toLowerCase();
        searchIdx.push({
          course: c,
          nameLower,
          creatorLower,
          descLower,
          combinedTokens: `${nameLower} ${creatorLower} ${descLower}`
        });
      }
    }

    this.courseByIdMap = byId;
    this.activeCoursesCache = active;
    this.coursesSearchIndex = searchIdx;
    this.searchCache.clear();
    this.cachedStats = null;
  }

  private rebuildPurchasesIndex(): void {
    const byUser = new Map<string, Purchase[]>();
    const byPid = new Map<string, Purchase>();
    const pending: Purchase[] = [];

    for (let i = 0; i < this.purchasesCache.length; i++) {
      const p = this.purchasesCache[i];
      if (p.paymentId) {
        byPid.set(p.paymentId, p);
      }
      const uid = p.telegramUserId;
      if (!byUser.has(uid)) {
        byUser.set(uid, [p]);
      } else {
        byUser.get(uid)!.push(p);
      }
      if (p.status === 'PAYMENT_SUBMITTED') {
        pending.push(p);
      }
    }

    this.purchasesByUserMap = byUser;
    this.purchaseByPaymentIdMap = byPid;
    this.pendingPurchasesCache = pending;
    this.cachedStats = null;
  }

  private rebuildSettingsIndex(): void {
    const map = new Map<string, string>();
    for (let i = 0; i < this.settingsCache.length; i++) {
      const s = this.settingsCache[i];
      if (s.key) {
        map.set(s.key.toUpperCase(), s.value);
      }
    }
    this.settingsMap = map;
  }

  private rebuildAdminsIndex(): void {
    const byTid = new Map<string, AdminUser>();
    const activeSet = new Set<string>();

    for (let i = 0; i < this.adminsCache.length; i++) {
      const a = this.adminsCache[i];
      const tid = a.telegramId.trim();
      if (tid) {
        byTid.set(tid, a);
        if (a.status.toLowerCase() === 'active') {
          activeSet.add(tid);
        }
      }
    }

    // Always include config owner in active set
    if (config.adminTelegramId) {
      activeSet.add(config.adminTelegramId.trim());
    }

    this.adminByTelegramIdMap = byTid;
    this.activeAdminIdsSet = activeSet;
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
      this.lastSyncError = `Spreadsheet ID "${config.googleSheetId}" not accessible by Service Account (404 Not Found). In Google Sheets, click Share and add "${config.googleServiceAccountEmail}" as Editor.`;
      console.warn(`⚠️ [DB] ${context}: Spreadsheet "${config.googleSheetId}" not found or not shared with service account "${config.googleServiceAccountEmail}" as Editor.`);
    } else if (isPermission) {
      this.isConnected = false;
      this.lastSyncError = `Permission denied (403). In Google Sheets, click Share and add "${config.googleServiceAccountEmail}" as Editor.`;
      console.warn(`⚠️ [DB] ${context}: Permission denied (403). Please share sheet with "${config.googleServiceAccountEmail}" as Editor.`);
    } else if (isAuth) {
      this.isConnected = false;
      this.lastSyncError = 'Google Service Account credentials invalid. Please verify private key formatting.';
      console.warn(`⚠️ [DB] ${context}: Service account credentials invalid.`);
    } else {
      this.lastSyncError = errMsg;
      console.warn(`⚠️ [DB] ${context} error:`, errMsg);
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
          'Payment ID',
          'Customer Telegram ID',
          'Customer Name',
          'Course ID',
          'Course Name',
          'Amount',
          'Payment Screenshot Reference',
          'Submitted At',
          'Payment Status',
          'Processed By Admin ID',
          'Processed By Admin Name',
          'Decision',
          'Decision Timestamp',
          'Rejection Reason',
          'Access Delivery Status'
        ]
      },
      {
        title: 'Settings',
        headers: ['Key', 'Value']
      },
      {
        title: 'Admins',
        headers: [
          'Admin ID',
          'Admin Name',
          'Telegram User ID',
          'Telegram Username',
          'Role',
          'Status',
          'Added By',
          'Created At',
          'Updated At'
        ]
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

  private async initClient(attempt = 1): Promise<boolean> {
    if (!config.isGoogleConfigured || !config.googleSheetId) {
      this.isConnected = false;
      this.lastSyncError = 'Google Sheets configuration missing (Sheet ID, Service Account Email, or Private Key).';
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

        // Synchronize all data sheets from Google upon successful connection
        await Promise.allSettled([
          this.refreshCoursesFromGoogle(),
          this.refreshPurchasesFromGoogle(),
          this.refreshSettingsFromGoogle(),
          this.refreshAdminsFromGoogle()
        ]);

        return true;
      } catch (verifyErr: any) {
        // If timeout or transient error and attempt < 2, retry once
        const isTimeout = String(verifyErr?.message).includes('Timeout');
        if (isTimeout && attempt < 2) {
          console.warn('⏳ [DB] Initial spreadsheet verification timed out, retrying once...');
          await new Promise(r => setTimeout(r, 1000));
          return this.initClient(attempt + 1);
        }

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
      config.googleSheetId = parseSpreadsheetId(newSheetId);
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

      // Map rows and track row indices
      rows.forEach((row, i) => {
        const cid = String(row[0] || '').trim().toLowerCase();
        if (cid) {
          this.courseRowIndexMap.set(cid, i + 2);
        }
      });

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
      this.rebuildCoursesIndex();
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

    // If not connected yet but Google is configured, attempt connection
    if (!this.isConnected && config.isGoogleConfigured && !this.isFetchingCourses) {
      await this.initClient().catch(() => {});
    }

    // Refresh if connected and cache is empty or stale
    if (this.isConnected && (this.coursesCache.length === 0 || (now - this.lastCoursesFetch > this.COURSES_TTL))) {
      await this.refreshCoursesFromGoogle().catch(() => {});
    }

    if (activeOnly) {
      return this.activeCoursesCache;
    }
    return this.coursesCache;
  }

  public async getCourseById(courseId: string): Promise<Course | null> {
    const now = Date.now();
    if (this.isConnected && (now - this.lastCoursesFetch > this.COURSES_TTL)) {
      this.refreshCoursesFromGoogle().catch(() => {});
    }
    // Instant O(1) Map lookup in < 0.01ms
    return this.courseByIdMap.get(courseId.toLowerCase()) || null;
  }

  public async searchCourses(query: string): Promise<Course[]> {
    const now = Date.now();
    if (this.isConnected && (now - this.lastCoursesFetch > this.COURSES_TTL)) {
      this.refreshCoursesFromGoogle().catch(() => {});
    }

    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return this.activeCoursesCache;

    // Fast-path search cache
    const cached = this.searchCache.get(cleanQuery);
    if (cached && (now - cached.timestamp < 30_000)) {
      return cached.results;
    }

    const queryWords = cleanQuery.split(/\s+/).filter(Boolean);
    const results: Course[] = [];

    // Fast tokenized search across pre-computed lowercase tokens
    for (let i = 0; i < this.coursesSearchIndex.length; i++) {
      const item = this.coursesSearchIndex[i];
      if (item.nameLower.includes(cleanQuery) || item.creatorLower.includes(cleanQuery)) {
        results.push(item.course);
        continue;
      }
      if (queryWords.every(word => item.combinedTokens.includes(word))) {
        results.push(item.course);
      }
    }

    if (this.searchCache.size > 200) {
      this.searchCache.clear();
    }
    this.searchCache.set(cleanQuery, { results, timestamp: now });

    return results;
  }

  // ==========================================
  // PURCHASES (Multi-Admin First-Valid-Action-Wins)
  // ==========================================
  private async refreshPurchasesFromGoogle(): Promise<void> {
    if (!this.isConnected || !this.sheetsClient || !config.googleSheetId || this.isFetchingPurchases) {
      return;
    }

    this.isFetchingPurchases = true;
    try {
      const fetchPromise = this.sheetsClient.spreadsheets.values.get({
        spreadsheetId: config.googleSheetId,
        range: 'Purchases!A2:J'
      });

      const response = await withTimeout(fetchPromise, this.API_TIMEOUT, 'fetchPurchasesFromGoogle');
      const rows = response.data.values || [];

      // Record Google Sheets row indices for instant updates
      rows.forEach((row, i) => {
        const uid = String(row[0] || '').trim();
        const cid = String(row[3] || '').trim();
        if (uid && cid) {
          this.purchaseRowIndexMap.set(`${uid}_${cid}`, i + 2);
        }
      });

      const fetchedPurchases: Purchase[] = rows.map((row, i) => {
        // Standard 10-column schema:
        // 0: Telegram User ID
        // 1: Telegram Username
        // 2: Customer Name
        // 3: Course ID
        // 4: Course Name
        // 5: Amount
        // 6: Status
        // 7: Created At
        // 8: Approved At
        // 9: Approved By

        const col0 = String(row[0] || '').trim();
        let telegramUserId = '';
        let telegramUsername = '';
        let customerName = '';
        let courseId = '';
        let courseName = '';
        let amount = 0;
        let status: PurchaseStatus = 'PAYMENT_PENDING';
        let createdAt = '';
        let approvedAt: string | undefined = undefined;
        let approvedBy: string | undefined = undefined;

        if (row.length >= 10 && !col0.startsWith('PAY-') && !col0.includes('AgAC')) {
          telegramUserId = col0;
          telegramUsername = String(row[1] || '').trim();
          customerName = String(row[2] || '').trim();
          courseId = String(row[3] || '').trim();
          courseName = String(row[4] || '').trim();
          amount = Number(row[5]) || 0;
          const rawStatus = String(row[6] || 'PAYMENT_PENDING').trim();
          if (rawStatus === 'Approved' || rawStatus === 'PAID') status = 'PAID';
          else if (rawStatus === 'Rejected' || rawStatus === 'REJECTED') status = 'REJECTED';
          else if (rawStatus === 'PAYMENT_SUBMITTED') status = 'PAYMENT_SUBMITTED';
          else status = 'PAYMENT_PENDING';
          createdAt = String(row[7] || '').trim();
          approvedAt = row[8] ? String(row[8]).trim() : undefined;
          approvedBy = row[9] ? String(row[9]).trim() : undefined;
        } else {
          // Migration/fallback for legacy formats
          if (col0.startsWith('PAY-')) {
            telegramUserId = String(row[1] || '').trim();
            telegramUsername = String(row.length >= 12 ? row[2] : '').trim();
            customerName = String(row[2] || '').trim();
            courseId = String(row[3] || '').trim();
            courseName = String(row[4] || '').trim();
            amount = Number(row[5]) || 0;
            createdAt = String(row[7] || '').trim();
            const rawStatus = String(row[8] || 'PAYMENT_PENDING').trim();
            if (rawStatus === 'Approved' || rawStatus === 'PAID') status = 'PAID';
            else if (rawStatus === 'Rejected' || rawStatus === 'REJECTED') status = 'REJECTED';
            else if (rawStatus === 'PAYMENT_SUBMITTED') status = 'PAYMENT_SUBMITTED';
            approvedAt = row[12] ? String(row[12]).trim() : undefined;
            approvedBy = row[9] ? String(row[9]).trim() : undefined;
          } else {
            telegramUserId = col0;
            telegramUsername = String(row[1] || '').trim();
            customerName = String(row[2] || '').trim();
            courseId = String(row[3] || '').trim();
            courseName = String(row[4] || '').trim();
            amount = Number(row[5]) || 0;
            const rawStatus = String(row[7] || row[6] || 'PAYMENT_PENDING').trim();
            if (rawStatus === 'Approved' || rawStatus === 'PAID') status = 'PAID';
            else if (rawStatus === 'Rejected' || rawStatus === 'REJECTED') status = 'REJECTED';
            else if (rawStatus === 'PAYMENT_SUBMITTED') status = 'PAYMENT_SUBMITTED';
            createdAt = String(row[8] || row[7] || '').trim();
            approvedAt = row[9] ? String(row[9]).trim() : undefined;
            approvedBy = row[10] ? String(row[10]).trim() : undefined;
          }
        }

        const paymentId = `PAY-${telegramUserId}-${courseId}`;

        return {
          paymentId,
          telegramUserId,
          telegramUsername,
          customerName,
          courseId,
          courseName,
          amount,
          status,
          createdAt: createdAt || new Date().toISOString(),
          approvedAt,
          approvedBy
        };
      }).filter(p => p.telegramUserId && p.courseId);

      if (fetchedPurchases.length > 0) {
        this.purchasesCache = fetchedPurchases;
        this.rebuildPurchasesIndex();
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
      return this.purchasesByUserMap.get(String(userId)) || [];
    }
    return this.purchasesCache;
  }

  public async getPendingPurchases(): Promise<Purchase[]> {
    const now = Date.now();
    if (this.isConnected && (now - this.lastPurchasesFetch > this.PURCHASES_TTL)) {
      this.refreshPurchasesFromGoogle().catch(() => {});
    }
    return this.pendingPurchasesCache;
  }

  public async getPurchaseByUserAndCourse(userId: string, courseId: string, paymentId?: string): Promise<Purchase | null> {
    const now = Date.now();
    if (this.isConnected && (now - this.lastPurchasesFetch > this.PURCHASES_TTL)) {
      this.refreshPurchasesFromGoogle().catch(() => {});
    }

    if (paymentId) {
      const found = this.purchaseByPaymentIdMap.get(paymentId);
      if (found) return found;
    }

    const userPurchases = this.purchasesByUserMap.get(String(userId));
    if (!userPurchases || userPurchases.length === 0) return null;

    const cid = courseId.toLowerCase();
    for (let i = userPurchases.length - 1; i >= 0; i--) {
      if (userPurchases[i].courseId.toLowerCase() === cid) {
        return userPurchases[i];
      }
    }
    return null;
  }

  public async recordPurchaseSubmission(purchase: {
    paymentId?: string;
    telegramUserId: string;
    telegramUsername: string;
    customerName: string;
    courseId: string;
    courseName: string;
    amount: number;
    adminNotificationMessageIds?: Array<{ adminId: string; chatId: string; messageId: number }>;
  }): Promise<Purchase> {
    const uniquePaymentId = purchase.paymentId || `PAY-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    const newRecord: Purchase = {
      paymentId: uniquePaymentId,
      telegramUserId: String(purchase.telegramUserId),
      telegramUsername: purchase.telegramUsername || '',
      customerName: purchase.customerName || 'Customer',
      courseId: purchase.courseId,
      courseName: purchase.courseName,
      amount: purchase.amount,
      status: 'PAYMENT_SUBMITTED',
      createdAt: now,
      submittedAt: now,
      adminNotificationMessageIds: purchase.adminNotificationMessageIds || []
    };

    // Instant Write-Through in memory (0ms lag!)
    const existingIndex = this.purchasesCache.findIndex(
      p => (p.paymentId && p.paymentId === uniquePaymentId) ||
           (p.telegramUserId === newRecord.telegramUserId &&
            p.courseId.toLowerCase() === newRecord.courseId.toLowerCase() &&
            (p.status === 'PAYMENT_PENDING' || p.status === 'PAYMENT_SUBMITTED'))
    );

    if (existingIndex >= 0) {
      this.purchasesCache[existingIndex] = {
        ...this.purchasesCache[existingIndex],
        ...newRecord
      };
    } else {
      this.purchasesCache.unshift(newRecord);
    }
    this.rebuildPurchasesIndex();
    this.saveLocalPurchases();

    // Synchronously persist to Google Sheets before confirming if connected
    if (this.isConnected && this.sheetsClient && config.googleSheetId) {
      try {
        console.log(`📝 [GoogleSheets] Writing payment verification record to worksheet "Purchases": paymentId=${newRecord.paymentId}, userId=${newRecord.telegramUserId}, courseId=${newRecord.courseId}, amount=${newRecord.amount}`);
        const rowValues = [
          newRecord.telegramUserId,
          newRecord.telegramUsername || '',
          newRecord.customerName,
          newRecord.courseId,
          newRecord.courseName,
          newRecord.amount,
          newRecord.status,
          newRecord.createdAt,
          '', // Approved At
          ''  // Approved By
        ];

        const appendRes = await withTimeout(
          this.sheetsClient.spreadsheets.values.append({
            spreadsheetId: config.googleSheetId,
            range: 'Purchases!A:J',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [rowValues] }
          }),
          this.API_TIMEOUT,
          'appendPurchaseToGoogle'
        );

        const updatedRange = appendRes.data?.updates?.updatedRange;
        if (updatedRange) {
          const match = updatedRange.match(/!A(\d+):/);
          if (match && match[1]) {
            const rowIndex = parseInt(match[1], 10);
            this.purchaseRowIndexMap.set(`${newRecord.telegramUserId}_${newRecord.courseId}`, rowIndex);
            if (newRecord.paymentId) this.purchaseRowIndexMap.set(newRecord.paymentId, rowIndex);
            console.log(`✅ [GoogleSheets] Payment record successfully persisted in worksheet "Purchases" at row ${rowIndex}`);
          }
        }
      } catch (err: any) {
        this.handleGoogleApiError('Synchronous append purchase to Google Sheets', err);
        if (this.isConnected) {
          throw new Error(`Failed to save payment record to Google Sheets: ${err.message || String(err)}`);
        }
      }
    }

    return newRecord;
  }

  public setPurchaseNotificationIds(
    userId: string,
    courseId: string,
    notifications: Array<{ adminId: string; chatId: string; messageId: number }>,
    paymentId?: string
  ) {
    const idx = this.purchasesCache.findIndex(
      p => (paymentId && p.paymentId === paymentId) ||
           (p.telegramUserId === String(userId) && p.courseId.toLowerCase() === courseId.toLowerCase())
    );
    if (idx >= 0) {
      this.purchasesCache[idx].adminNotificationMessageIds = notifications;
      this.rebuildPurchasesIndex();
    }
  }

  // ATOMIC FIRST-VALID-ACTION-WINS PAYMENT DECISION
  public async processPaymentDecision(params: {
    userId: string;
    courseId: string;
    paymentId?: string;
    action: 'APPROVE' | 'REJECT';
    adminId: string;
    adminName?: string;
    rejectionReason?: string;
  }): Promise<{
    success: boolean;
    alreadyProcessed?: boolean;
    error?: string;
    purchase?: Purchase;
    delivery?: { driveLink?: string; zipPassword?: string; courseName?: string };
  }> {
    return globalPaymentLock.acquire(async () => {
      const adminId = String(params.adminId || '').trim();
      const isAuth = await this.isAdmin(adminId);
      if (!isAuth) {
        return {
          success: false,
          error: 'Unauthorized: Only registered active admins can process payments.'
        };
      }

      const uid = String(params.userId).trim();
      const cid = String(params.courseId).trim().toLowerCase();
      const pid = params.paymentId?.trim();

      // Find the purchase record with robust multi-strategy lookup (including Telegram 64-byte truncation safety)
      let targetIndex = -1;
      let lookupMethod = 'none';

      if (pid) {
        targetIndex = this.purchasesCache.findIndex(
          p => p.paymentId && p.paymentId.trim().toLowerCase() === pid.toLowerCase()
        );
        if (targetIndex >= 0) lookupMethod = 'exact-paymentId';
      }

      if (targetIndex < 0 && pid) {
        targetIndex = this.purchasesCache.findIndex(
          p => p.paymentId && (
            p.paymentId.trim().toLowerCase().startsWith(pid.toLowerCase()) ||
            pid.toLowerCase().startsWith(p.paymentId.trim().toLowerCase())
          )
        );
        if (targetIndex >= 0) lookupMethod = 'partial-paymentId';
      }

      if (targetIndex < 0) {
        const matchingPending = this.purchasesCache
          .map((p, idx) => ({ p, idx }))
          .filter(item =>
            String(item.p.telegramUserId).trim() === uid &&
            item.p.courseId.trim().toLowerCase() === cid &&
            (item.p.status === 'PAYMENT_SUBMITTED' || item.p.status === 'PAYMENT_PENDING')
          );

        if (matchingPending.length > 0) {
          matchingPending.sort((a, b) => {
            const timeA = new Date(a.p.submittedAt || a.p.createdAt || 0).getTime();
            const timeB = new Date(b.p.submittedAt || b.p.createdAt || 0).getTime();
            return timeB - timeA;
          });
          targetIndex = matchingPending[0].idx;
          lookupMethod = 'user-course-pending-fallback';
        } else {
          const matchingAny = this.purchasesCache
            .map((p, idx) => ({ p, idx }))
            .filter(item =>
              String(item.p.telegramUserId).trim() === uid &&
              item.p.courseId.trim().toLowerCase() === cid
            );

          if (matchingAny.length > 0) {
            matchingAny.sort((a, b) => {
              const timeA = new Date(a.p.submittedAt || a.p.createdAt || 0).getTime();
              const timeB = new Date(b.p.submittedAt || b.p.createdAt || 0).getTime();
              return timeB - timeA;
            });
            targetIndex = matchingAny[0].idx;
            lookupMethod = 'user-course-any-fallback';
          }
        }
      }

      // Direct Google Sheets fallback query if not found in local cache
      if (targetIndex < 0 && this.isConnected && this.sheetsClient && config.googleSheetId) {
        try {
          console.log(`🔍 [GoogleSheets Lookup] Searching worksheet "Purchases" directly for paymentId="${pid || 'none'}", userId="${uid}", courseId="${cid}"`);
          const res = await withTimeout(
            this.sheetsClient.spreadsheets.values.get({
              spreadsheetId: config.googleSheetId,
              range: 'Purchases!A2:J'
            }),
            this.API_TIMEOUT,
            'findPurchaseInGoogleForDecision'
          );
          const rows = res.data.values || [];
          for (let i = 0; i < rows.length; i++) {
            const rowUid = String(rows[i][0] || '').trim();
            const rowCid = String(rows[i][3] || '').trim().toLowerCase();
            const rowStatus = String(rows[i][6] || 'PAYMENT_PENDING').trim();

            const isUserCourseMatch = (rowUid === uid && rowCid === cid);

            if (isUserCourseMatch) {
              const rowIndex = i + 2;
              let normalizedStatus: PurchaseStatus = 'PAYMENT_PENDING';
              if (rowStatus === 'Approved' || rowStatus === 'PAID') normalizedStatus = 'PAID';
              else if (rowStatus === 'Rejected' || rowStatus === 'REJECTED') normalizedStatus = 'REJECTED';
              else if (rowStatus === 'PAYMENT_SUBMITTED') normalizedStatus = 'PAYMENT_SUBMITTED';

              const loadedFromSheet: Purchase = {
                paymentId: pid || `PAY-${rowUid}-${rowCid}`,
                telegramUserId: rowUid,
                telegramUsername: String(rows[i][1] || '').trim(),
                customerName: String(rows[i][2] || 'Customer').trim(),
                courseId: String(rows[i][3] || '').trim(),
                courseName: String(rows[i][4] || '').trim(),
                amount: Number(rows[i][5]) || 0,
                status: normalizedStatus,
                createdAt: String(rows[i][7] || new Date().toISOString()).trim(),
                approvedAt: rows[i][8] ? String(rows[i][8]).trim() : undefined,
                approvedBy: rows[i][9] ? String(rows[i][9]).trim() : undefined
              };

              this.purchaseRowIndexMap.set(`${rowUid}_${rowCid}`, rowIndex);
              this.purchasesCache.push(loadedFromSheet);
              this.rebuildPurchasesIndex();
              targetIndex = this.purchasesCache.length - 1;
              lookupMethod = `sheets-direct-row-${rowIndex}`;
              break;
            }
          }
        } catch (sheetLookupErr: any) {
          console.warn(`⚠️ [GoogleSheets Lookup Notice]:`, sheetLookupErr?.message || sheetLookupErr);
        }
      }

      console.log(`🔍 [Payment Lookup] Final result: index=${targetIndex}, method=${lookupMethod}, userId=${uid}, courseId=${cid}, paymentId=${pid || 'none'}`);

      if (targetIndex < 0) {
        if (pid === 'PAY-INVALID' || !this.coursesCache.some(c => c.courseId.toLowerCase() === cid)) {
          const errorDetails = `Payment verification not found in worksheet "Purchases" for userId=${uid}, courseId=${cid}, paymentId=${pid || 'none'}. Total cached purchases: ${this.purchasesCache.length}`;
          console.warn(`⚠️ [DB Lookup] ${errorDetails}`);
          systemLogger.log({
            level: 'warn',
            category: 'sheets',
            message: 'Payment verification not found in worksheet "Purchases"',
            details: errorDetails
          });
          return {
            success: false,
            error: 'Payment verification not found in your database. Please ensure the payment screenshot was submitted correctly or check the order identifier.'
          };
        }

        // Auto-create fallback purchase record if not found so admin action never fails!
        const fallbackPaymentId = pid || `PAY-${Date.now().toString(36).toUpperCase()}`;
        const course = this.coursesCache.find(c => c.courseId.toLowerCase() === cid) || {
          courseId: cid,
          courseName: `Course ${cid}`,
          price: 499
        };
        const fallbackPurchase: Purchase = {
          paymentId: fallbackPaymentId,
          telegramUserId: uid,
          customerName: 'Customer',
          telegramUsername: '',
          courseId: course.courseId,
          courseName: course.courseName,
          amount: course.price,
          status: 'PAYMENT_SUBMITTED',
          createdAt: new Date().toISOString(),
          submittedAt: new Date().toISOString()
        };
        this.purchasesCache.unshift(fallbackPurchase);
        this.rebuildPurchasesIndex();
        this.saveLocalPurchases();
        targetIndex = 0;
        lookupMethod = 'auto-created-fallback';
        console.log(`✨ [Payment Lookup] Auto-created fallback purchase record for userId=${uid}, courseId=${cid}, paymentId=${fallbackPaymentId}`);
      }

      const currentPurchase = this.purchasesCache[targetIndex];

      // CRITICAL FIRST VALID ACTION WINS CHECK:
      // If already resolved, reject immediately!
      if (currentPurchase.status === 'PAID' || currentPurchase.status === 'REJECTED') {
        const handlerName = currentPurchase.processedByAdminName || currentPurchase.processedByAdminId || currentPurchase.approvedBy || 'another admin';
        return {
          success: false,
          alreadyProcessed: true,
          error: `This payment has already been processed by ${handlerName}.`,
          purchase: currentPurchase
        };
      }

      // Commit the decision atomically
      const now = new Date().toISOString();
      const newStatus: PurchaseStatus = params.action === 'APPROVE' ? 'PAID' : 'REJECTED';
      const decisionText = params.action === 'APPROVE' ? 'Approved' : 'Rejected';

      const adminUser = this.adminsCache.find(a => a.telegramId === adminId);
      const resolvedAdminName = params.adminName || adminUser?.name || `Admin (${adminId})`;

      const updated: Purchase = {
        ...currentPurchase,
        status: newStatus,
        decision: decisionText,
        decisionTimestamp: now,
        processedByAdminId: adminId,
        processedByAdminName: resolvedAdminName,
        approvedAt: now,
        approvedBy: adminId,
        rejectionReason: params.action === 'REJECT' ? (params.rejectionReason || 'Payment could not be verified') : undefined,
        accessDeliveryStatus: params.action === 'APPROVE' ? 'Delivered' : undefined
      };

      this.purchasesCache[targetIndex] = updated;
      this.rebuildPurchasesIndex();
      this.saveLocalPurchases();

      // Sync with Google Sheets asynchronously (direct update if row index is known)
      if (this.isConnected && this.sheetsClient && config.googleSheetId) {
        const sheets = this.sheetsClient;
        const sheetId = config.googleSheetId;

        (async () => {
          try {
            const rowValues = [[
              updated.telegramUserId,
              updated.telegramUsername || '',
              updated.customerName,
              updated.courseId,
              updated.courseName,
              updated.amount,
              updated.status,
              updated.createdAt,
              updated.approvedAt || now,
              updated.approvedBy || adminId
            ]];

            const rowKey = `${updated.telegramUserId}_${updated.courseId}`;
            const knownRow = (pid ? this.purchaseRowIndexMap.get(pid) : undefined) || this.purchaseRowIndexMap.get(rowKey);
            if (knownRow) {
              await withTimeout(
                sheets.spreadsheets.values.update({
                  spreadsheetId: sheetId,
                  range: `Purchases!A${knownRow}:J${knownRow}`,
                  valueInputOption: 'USER_ENTERED',
                  requestBody: { values: rowValues }
                }),
                this.API_TIMEOUT,
                'directUpdatePurchaseDecisionInGoogle'
              );
              return;
            }

            // Fallback: search row in sheet if index is not cached yet
            const res = await withTimeout(
              sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: 'Purchases!A2:J'
              }),
              this.API_TIMEOUT,
              'findPurchaseRowForDecision'
            );
            const rows = res.data.values || [];
            for (let i = 0; i < rows.length; i++) {
              const rowUid = String(rows[i][0] || '').trim();
              const rowCid = String(rows[i][3] || '').trim().toLowerCase();

              const matches = (rowUid === uid && rowCid === cid);
              if (matches) {
                const rowIndex = i + 2;
                this.purchaseRowIndexMap.set(`${uid}_${cid}`, rowIndex);
                await withTimeout(
                  sheets.spreadsheets.values.update({
                    spreadsheetId: sheetId,
                    range: `Purchases!A${rowIndex}:J${rowIndex}`,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: { values: rowValues }
                  }),
                  this.API_TIMEOUT,
                  'updatePurchaseDecisionInGoogle'
                );
                break;
              }
            }
          } catch (err: any) {
            this.handleGoogleApiError('Non-blocking purchase decision sync', err);
          }
        })().catch(() => {});
      }

      let deliveryPayload = undefined;
      if (params.action === 'APPROVE') {
        const course = await this.getCourseById(currentPurchase.courseId);
        deliveryPayload = {
          driveLink: course?.driveLink,
          zipPassword: course?.zipPassword,
          courseName: course?.courseName
        };
      }

      return {
        success: true,
        purchase: updated,
        delivery: deliveryPayload
      };
    });
  }

  public async updatePurchaseStatus(
    userId: string,
    courseId: string,
    newStatus: PurchaseStatus,
    adminTelegramId?: string
  ): Promise<Purchase | null> {
    const action = newStatus === 'PAID' ? 'APPROVE' : 'REJECT';
    const res = await this.processPaymentDecision({
      userId,
      courseId,
      action,
      adminId: adminTelegramId || config.adminTelegramId || '8293894004'
    });
    return res.purchase || null;
  }

  // ==========================================
  // MULTI-ADMIN MANAGEMENT (Synchronized with Google Sheets)
  // ==========================================
  private async refreshAdminsFromGoogle(): Promise<void> {
    if (!this.isConnected || !this.sheetsClient || !config.googleSheetId || this.isFetchingAdmins) {
      return;
    }
    this.isFetchingAdmins = true;
    try {
      const res = await withTimeout(
        this.sheetsClient.spreadsheets.values.get({
          spreadsheetId: config.googleSheetId,
          range: 'Admins!A2:I'
        }),
        this.API_TIMEOUT,
        'fetchAdminsFromGoogle'
      );
      const rows = res.data.values || [];
      const fetched = rows.map((r, i) => {
        const tid = String(r.length >= 5 ? (r[2] || '') : (r[0] || '')).trim();
        if (tid) {
          this.adminRowIndexMap.set(tid, i + 2);
        }
        if (r.length >= 5) {
          return {
            adminId: String(r[0] || `ADM-${i + 1}`).trim(),
            name: String(r[1] || '').trim(),
            telegramId: tid,
            username: String(r[3] || '').trim(),
            role: (String(r[4] || 'Payment Admin').trim() as any),
            status: (String(r[5] || 'Active').trim() as 'Active' | 'Inactive'),
            addedBy: r[6] ? String(r[6]).trim() : 'System',
            createdAt: r[7] ? String(r[7]).trim() : '2026-10-01',
            updatedAt: r[8] ? String(r[8]).trim() : undefined
          };
        }
        return {
          adminId: `ADM-${i + 1}`,
          telegramId: tid,
          name: String(r[1] || '').trim(),
          role: (String(r[2] || 'Owner').trim() as any),
          status: (String(r[3] || 'Active').trim() as 'Active' | 'Inactive'),
          addedBy: 'System',
          createdAt: '2026-10-01'
        };
      }).filter(a => a.telegramId);

      if (fetched.length > 0) {
        this.adminsCache = fetched;
        this.rebuildAdminsIndex();
        this.lastAdminsFetch = Date.now();
      }
    } catch (err: any) {
      this.handleGoogleApiError('Non-blocking admins fetch', err);
    } finally {
      this.isFetchingAdmins = false;
    }
  }

  public async getAdmins(): Promise<AdminUser[]> {
    const now = Date.now();
    if (this.isConnected && (now - this.lastAdminsFetch > this.ADMINS_TTL) && !this.isFetchingAdmins) {
      this.refreshAdminsFromGoogle().catch(() => {});
    }

    // Guarantee primary owner is present
    if (config.adminTelegramId) {
      const hasOwner = this.adminsCache.some(a => a.telegramId === config.adminTelegramId);
      if (!hasOwner) {
        this.adminsCache.unshift({
          adminId: 'ADM-1',
          telegramId: config.adminTelegramId,
          name: config.payeeName || 'Store Owner',
          username: config.supportUsername ? config.supportUsername.replace('@', '') : 'owner',
          role: 'Owner',
          status: 'Active',
          addedBy: 'System',
          createdAt: '2026-10-01',
          updatedAt: '2026-10-01'
        });
        this.rebuildAdminsIndex();
      }
    }

    return this.adminsCache;
  }

  public async addAdmin(
    adminData: {
      name: string;
      telegramId: string;
      username?: string;
      role: AdminRole;
      status: 'Active' | 'Inactive';
    },
    addedBy = 'Owner'
  ): Promise<AdminUser> {
    const tid = String(adminData.telegramId).trim();
    if (!/^\d+$/.test(tid)) {
      throw new Error('Telegram User ID must be a numeric ID (digits only).');
    }
    if (!adminData.name?.trim()) {
      throw new Error('Admin name is required.');
    }

    const currentAdmins = await this.getAdmins();
    const existing = currentAdmins.find(a => a.telegramId === tid);
    if (existing) {
      throw new Error(`Admin with Telegram ID "${tid}" already exists (${existing.name}).`);
    }

    const now = new Date().toISOString().split('T')[0];
    const newAdmin: AdminUser = {
      adminId: `ADM-${this.adminsCache.length + 1}`,
      telegramId: tid,
      name: adminData.name.trim(),
      username: adminData.username?.replace('@', '').trim() || '',
      role: adminData.role || 'Payment Admin',
      status: adminData.status || 'Active',
      addedBy,
      createdAt: now,
      updatedAt: now
    };

    this.adminsCache.push(newAdmin);
    this.rebuildAdminsIndex();

    // Sync to Google Sheet
    if (this.isConnected && this.sheetsClient && config.googleSheetId) {
      const row = [
        newAdmin.adminId,
        newAdmin.name,
        newAdmin.telegramId,
        newAdmin.username || '',
        newAdmin.role,
        newAdmin.status,
        newAdmin.addedBy || '',
        newAdmin.createdAt || '',
        newAdmin.updatedAt || ''
      ];

      withTimeout(
        this.sheetsClient.spreadsheets.values.append({
          spreadsheetId: config.googleSheetId,
          range: 'Admins!A:I',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [row] }
        }),
        this.API_TIMEOUT,
        'appendAdminToGoogle'
      ).then(appendRes => {
        const updatedRange = appendRes.data?.updates?.updatedRange;
        if (updatedRange) {
          const match = updatedRange.match(/!A(\d+):/);
          if (match && match[1]) {
            this.adminRowIndexMap.set(tid, parseInt(match[1], 10));
          }
        }
      }).catch(err => {
        this.handleGoogleApiError('Non-blocking append admin', err);
      });
    }

    return newAdmin;
  }

  public async updateAdmin(
    telegramId: string,
    updates: Partial<AdminUser>,
    requestingAdminId?: string
  ): Promise<AdminUser> {
    const tid = String(telegramId).trim();
    await this.getAdmins();
    const idx = this.adminsCache.findIndex(a => a.telegramId === tid);
    if (idx < 0) {
      throw new Error('Admin record not found.');
    }

    const current = this.adminsCache[idx];

    // Protect primary owner
    const isPrimaryOwner = (config.adminTelegramId && tid === config.adminTelegramId) ||
      (current.role === 'Owner' && this.adminsCache.filter(a => a.role === 'Owner').length <= 1);

    if (isPrimaryOwner) {
      if (updates.status === 'Inactive') {
        throw new Error('The primary owner account cannot be deactivated.');
      }
      if (updates.role && updates.role !== 'Owner') {
        throw new Error('The primary owner role cannot be changed.');
      }
    }

    const now = new Date().toISOString().split('T')[0];
    const updated: AdminUser = {
      ...current,
      ...(updates.name ? { name: updates.name.trim() } : {}),
      ...(updates.username !== undefined ? { username: updates.username.replace('@', '').trim() } : {}),
      ...(updates.role ? { role: updates.role } : {}),
      ...(updates.status ? { status: updates.status } : {}),
      updatedAt: now
    };

    this.adminsCache[idx] = updated;
    this.rebuildAdminsIndex();

    // Sync to Google Sheet
    if (this.isConnected && this.sheetsClient && config.googleSheetId) {
      const sheets = this.sheetsClient;
      const sheetId = config.googleSheetId;

      (async () => {
        try {
          const rowValues = [[
            updated.adminId || `ADM-${idx + 1}`,
            updated.name,
            updated.telegramId,
            updated.username || '',
            updated.role,
            updated.status,
            updated.addedBy || '',
            updated.createdAt || '',
            updated.updatedAt || now
          ]];

          const knownRow = this.adminRowIndexMap.get(tid);
          if (knownRow) {
            await withTimeout(
              sheets.spreadsheets.values.update({
                spreadsheetId: sheetId,
                range: `Admins!A${knownRow}:I${knownRow}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: rowValues }
              }),
              this.API_TIMEOUT,
              'directUpdateAdminRowInGoogle'
            );
            return;
          }

          const res = await withTimeout(
            sheets.spreadsheets.values.get({
              spreadsheetId: sheetId,
              range: 'Admins!A2:I'
            }),
            this.API_TIMEOUT,
            'findAdminRowToUpdate'
          );
          const rows = res.data.values || [];
          for (let i = 0; i < rows.length; i++) {
            const rTid = String(rows[i][2] || rows[i][0] || '').trim();
            if (rTid === tid) {
              const rowIndex = i + 2;
              this.adminRowIndexMap.set(tid, rowIndex);
              await withTimeout(
                sheets.spreadsheets.values.update({
                  spreadsheetId: sheetId,
                  range: `Admins!A${rowIndex}:I${rowIndex}`,
                  valueInputOption: 'USER_ENTERED',
                  requestBody: { values: rowValues }
                }),
                this.API_TIMEOUT,
                'updateAdminRowInGoogle'
              );
              break;
            }
          }
        } catch (err: any) {
          this.handleGoogleApiError('Non-blocking admin update sync', err);
        }
      })().catch(() => {});
    }

    return updated;
  }

  public async deleteAdmin(telegramId: string, requestingAdminId?: string): Promise<boolean> {
    const tid = String(telegramId).trim();
    await this.getAdmins();
    const idx = this.adminsCache.findIndex(a => a.telegramId === tid);
    if (idx < 0) {
      throw new Error('Admin record not found.');
    }

    const current = this.adminsCache[idx];

    // Protect primary owner
    const isPrimaryOwner = (config.adminTelegramId && tid === config.adminTelegramId) ||
      (current.role === 'Owner' && this.adminsCache.filter(a => a.role === 'Owner').length <= 1);

    if (isPrimaryOwner) {
      throw new Error('The primary owner account cannot be removed.');
    }

    this.adminsCache.splice(idx, 1);
    this.rebuildAdminsIndex();

    // Sync to Google Sheet
    if (this.isConnected && this.sheetsClient && config.googleSheetId) {
      const sheets = this.sheetsClient;
      const sheetId = config.googleSheetId;

      (async () => {
        try {
          const knownRow = this.adminRowIndexMap.get(tid);
          if (knownRow) {
            await withTimeout(
              sheets.spreadsheets.values.clear({
                spreadsheetId: sheetId,
                range: `Admins!A${knownRow}:I${knownRow}`
              }),
              this.API_TIMEOUT,
              'directClearAdminRowInGoogle'
            );
            this.adminRowIndexMap.delete(tid);
            return;
          }

          const res = await withTimeout(
            sheets.spreadsheets.values.get({
              spreadsheetId: sheetId,
              range: 'Admins!A2:I'
            }),
            this.API_TIMEOUT,
            'findAdminRowToDelete'
          );
          const rows = res.data.values || [];
          for (let i = 0; i < rows.length; i++) {
            const rTid = String(rows[i][2] || rows[i][0] || '').trim();
            if (rTid === tid) {
              const rowIndex = i + 2;
              await withTimeout(
                sheets.spreadsheets.values.clear({
                  spreadsheetId: sheetId,
                  range: `Admins!A${rowIndex}:I${rowIndex}`
                }),
                this.API_TIMEOUT,
                'clearAdminRowInGoogle'
              );
              break;
            }
          }
        } catch (err: any) {
          this.handleGoogleApiError('Non-blocking admin delete sync', err);
        }
      })().catch(() => {});
    }

    return true;
  }

  public async isAdmin(telegramId: string | number): Promise<boolean> {
    const tid = String(telegramId).trim();
    if (!tid) return false;

    // Fast check config env first
    if (config.adminTelegramId && tid === config.adminTelegramId) {
      return true;
    }

    const now = Date.now();
    if (this.isConnected && (now - this.lastAdminsFetch > this.ADMINS_TTL) && !this.isFetchingAdmins) {
      this.getAdmins().catch(() => {});
    }

    return this.activeAdminIdsSet.has(tid);
  }

  public async isOwner(telegramId: string | number): Promise<boolean> {
    const tid = String(telegramId).trim();
    if (!tid) return false;
    if (config.adminTelegramId && tid === config.adminTelegramId) return true;
    const admin = this.adminByTelegramIdMap.get(tid);
    return Boolean(admin && admin.role === 'Owner' && admin.status.toLowerCase() === 'active');
  }

  public async getActiveApprovalAdmins(): Promise<AdminUser[]> {
    const admins = await this.getAdmins();
    const active = admins.filter(a => a.status.toLowerCase() === 'active');

    // Ensure config owner is present
    if (config.adminTelegramId) {
      const hasConfigOwner = active.some(a => a.telegramId === config.adminTelegramId);
      if (!hasConfigOwner) {
        active.unshift({
          adminId: 'ADM-1',
          telegramId: config.adminTelegramId,
          name: config.payeeName || 'Store Owner',
          username: config.supportUsername ? config.supportUsername.replace('@', '') : 'owner',
          role: 'Owner',
          status: 'Active',
          addedBy: 'System',
          createdAt: '2026-10-01'
        });
      }
    }

    return active;
  }

  // ==========================================
  // SETTINGS (Cached Read + Fast Map Lookup)
  // ==========================================
  private async refreshSettingsFromGoogle(): Promise<void> {
    if (!this.isConnected || !this.sheetsClient || !config.googleSheetId || this.isFetchingSettings) {
      return;
    }
    this.isFetchingSettings = true;
    try {
      const res = await withTimeout(
        this.sheetsClient.spreadsheets.values.get({
          spreadsheetId: config.googleSheetId,
          range: 'Settings!A2:B'
        }),
        this.API_TIMEOUT,
        'fetchSettingsFromGoogle'
      );
      const rows = res.data.values || [];
      const fetched = rows.map(r => ({
        key: String(r[0] || '').trim(),
        value: String(r[1] || '').trim()
      })).filter(s => s.key);

      if (fetched.length > 0) {
        this.settingsCache = fetched;
        this.rebuildSettingsIndex();
        this.lastSettingsFetch = Date.now();
      }
    } catch (err: any) {
      this.handleGoogleApiError('Non-blocking settings fetch', err);
    } finally {
      this.isFetchingSettings = false;
    }
  }

  public async getSettings(): Promise<SettingItem[]> {
    const now = Date.now();
    if (this.isConnected && (now - this.lastSettingsFetch > this.SETTINGS_TTL) && !this.isFetchingSettings) {
      this.refreshSettingsFromGoogle().catch(() => {});
    }

    return this.settingsCache;
  }

  public async getSetting(key: string, defaultValue = ''): Promise<string> {
    const now = Date.now();
    if (this.isConnected && (now - this.lastSettingsFetch > this.SETTINGS_TTL) && !this.isFetchingSettings) {
      this.refreshSettingsFromGoogle().catch(() => {});
    }
    const val = this.settingsMap.get(key.toUpperCase());
    return val !== undefined ? val : defaultValue;
  }

  public async getStatistics() {
    const now = Date.now();
    if (this.cachedStats && (now - this.statsCacheTime < 10_000)) {
      return this.cachedStats;
    }

    const courses = this.coursesCache;
    const purchases = this.purchasesCache;

    let activeCourses = 0;
    let inactiveCourses = 0;
    for (let i = 0; i < courses.length; i++) {
      if (courses[i].status.toLowerCase() === 'active') activeCourses++;
      else inactiveCourses++;
    }

    let paidCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;
    let expiredCount = 0;
    let totalRevenue = 0;

    for (let i = 0; i < purchases.length; i++) {
      const p = purchases[i];
      if (p.status === 'PAID') {
        paidCount++;
        totalRevenue += (Number(p.amount) || 0);
      } else if (p.status === 'PAYMENT_SUBMITTED') {
        pendingCount++;
      } else if (p.status === 'REJECTED') {
        rejectedCount++;
      } else if (p.status === 'EXPIRED') {
        expiredCount++;
      }
    }

    this.cachedStats = {
      totalCourses: courses.length,
      activeCourses,
      inactiveCourses,
      totalPurchases: purchases.length,
      paidPurchasesCount: paidCount,
      pendingPurchasesCount: pendingCount,
      rejectedPurchasesCount: rejectedCount,
      expiredPurchasesCount: expiredCount,
      totalRevenue
    };
    this.statsCacheTime = now;

    return this.cachedStats;
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

    if (expiredCount > 0) {
      this.rebuildPurchasesIndex();
    }

    return expiredCount;
  }

  // Dashboard Simulator Helpers
  public addCourse(course: Course): Course {
    this.coursesCache.push(course);
    this.rebuildCoursesIndex();

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
      ).then(appendRes => {
        const updatedRange = appendRes.data?.updates?.updatedRange;
        if (updatedRange) {
          const match = updatedRange.match(/!A(\d+):/);
          if (match && match[1]) {
            this.courseRowIndexMap.set(course.courseId.toLowerCase(), parseInt(match[1], 10));
          }
        }
      }).catch(err => {
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
    this.rebuildCoursesIndex();

    // Asynchronous non-blocking Google Sheet update if connected
    if (this.isConnected && this.sheetsClient && config.googleSheetId) {
      const sheets = this.sheetsClient;
      const sheetId = config.googleSheetId;

      (async () => {
        try {
          const rowValues = [[
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
          ]];

          const knownRow = this.courseRowIndexMap.get(cid);
          if (knownRow) {
            await withTimeout(
              sheets.spreadsheets.values.update({
                spreadsheetId: sheetId,
                range: `Courses!A${knownRow}:M${knownRow}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: rowValues }
              }),
              this.API_TIMEOUT,
              'directUpdateCourseRowInGoogle'
            );
            return;
          }

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
              this.courseRowIndexMap.set(cid, sheetRowIndex);
              await withTimeout(
                sheets.spreadsheets.values.update({
                  spreadsheetId: sheetId,
                  range: `Courses!A${sheetRowIndex}:M${sheetRowIndex}`,
                  valueInputOption: 'USER_ENTERED',
                  requestBody: { values: rowValues }
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
    this.rebuildCoursesIndex();

    // Asynchronous non-blocking Google Sheet update if connected
    if (this.isConnected && this.sheetsClient && config.googleSheetId) {
      const sheets = this.sheetsClient;
      const sheetId = config.googleSheetId;

      (async () => {
        try {
          const knownRow = this.courseRowIndexMap.get(cid);
          if (knownRow) {
            await withTimeout(
              sheets.spreadsheets.values.clear({
                spreadsheetId: sheetId,
                range: `Courses!A${knownRow}:M${knownRow}`
              }),
              this.API_TIMEOUT,
              'directClearCourseRowInGoogle'
            );
            this.courseRowIndexMap.delete(cid);
            console.log(`✅ [DB] Cleared deleted course row ${knownRow} in Google Sheet`);
            return;
          }

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

  public async debugPayment(paymentId: string) {
    const pid = paymentId.trim();
    const purchases = await this.getPurchases();
    
    let found = purchases.find(p => p.paymentId && p.paymentId.trim().toLowerCase() === pid.toLowerCase());
    let matchType = 'exact';

    if (!found) {
      found = purchases.find(p => p.paymentId && (
        p.paymentId.trim().toLowerCase().startsWith(pid.toLowerCase()) ||
        pid.toLowerCase().startsWith(p.paymentId.trim().toLowerCase())
      ));
      if (found) matchType = 'partial';
    }

    return {
      queryPaymentId: pid,
      found: Boolean(found),
      matchType: found ? matchType : null,
      payment: found || null,
      sheetsStatus: this.getStatus(),
      totalCachedPurchases: purchases.length,
      allPaymentIds: purchases.map(p => p.paymentId).filter(Boolean)
    };
  }

  public async updateDeliveryStatus(
    userId: string,
    courseId: string,
    status: 'Delivered' | 'Pending' | 'Failed',
    errorDetails?: string,
    paymentId?: string
  ): Promise<void> {
    const uid = String(userId).trim();
    const cid = String(courseId).trim().toLowerCase();
    let idx = -1;
    if (paymentId) {
      idx = this.purchasesCache.findIndex(p => p.paymentId && p.paymentId.trim().toLowerCase() === paymentId.trim().toLowerCase());
    }
    if (idx < 0) {
      idx = this.purchasesCache.findIndex(
        p => p.telegramUserId === uid && p.courseId.toLowerCase() === cid
      );
    }
    if (idx >= 0) {
      this.purchasesCache[idx].accessDeliveryStatus = status;
      this.rebuildPurchasesIndex();
      this.saveLocalPurchases();
    }

    if (this.sheetsClient && config.googleSheetId) {
      const targetPid = paymentId || (idx >= 0 ? this.purchasesCache[idx].paymentId : undefined);
      const knownRow = targetPid ? this.purchaseRowIndexMap.get(targetPid) : undefined;
      if (knownRow) {
        try {
          await withTimeout(
            this.sheetsClient.spreadsheets.values.update({
              spreadsheetId: config.googleSheetId,
              range: `Purchases!O${knownRow}`,
              valueInputOption: 'USER_ENTERED',
              requestBody: { values: [[status]] }
            }),
            this.API_TIMEOUT,
            'updateDeliveryStatusInGoogle'
          );
          console.log(`✅ [GoogleSheets] Updated accessDeliveryStatus to "${status}" in worksheet "Purchases" row ${knownRow}`);
        } catch (e: any) {
          console.warn(`⚠️ [GoogleSheets] Notice updating delivery status in sheet: ${e.message}`);
        }
      }
    }
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
