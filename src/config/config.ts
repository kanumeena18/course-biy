import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env if present
dotenv.config();

export interface AppConfig {
  botToken: string;
  googleSheetId: string;
  googleServiceAccountEmail: string;
  googlePrivateKey: string;
  adminTelegramId: string;
  upiId: string;
  payeeName: string;
  supportUsername: string;
  qrImagePath: string;
  paymentExpiryHours: number;
  storeName: string;
  currency: string;
  port: number;
  isGoogleConfigured: boolean;
  isBotConfigured: boolean;
}

export const parseSpreadsheetId = (idOrUrl?: string): string => {
  if (!idOrUrl) return '';
  let cleaned = idOrUrl.trim();

  // Strip wrapping quotes
  while (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Extract ID if a full Google Sheets URL was provided
  const urlMatch = cleaned.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1].trim();
  }

  return cleaned;
};

export const parseServiceAccountEmail = (email?: string): string => {
  if (!email) return '';
  let cleaned = email.trim();
  while (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
};

export const formatPrivateKey = (key?: string): string => {
  if (!key) return '';
  let cleaned = key.trim();

  // Strip wrapping quotes (single or double)
  while (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Check if the key is base64 encoded without PEM headers
  if (!cleaned.includes('BEGIN PRIVATE KEY') && !cleaned.includes('BEGIN RSA PRIVATE KEY')) {
    try {
      const decoded = Buffer.from(cleaned, 'base64').toString('utf-8');
      if (decoded.includes('BEGIN PRIVATE KEY') || decoded.includes('BEGIN RSA PRIVATE KEY')) {
        cleaned = decoded.trim();
      }
    } catch {
      // not base64, proceed
    }
  }

  // Handle escaped newlines and carriage returns
  cleaned = cleaned.replace(/\\n/g, '\n').replace(/\\r/g, '').trim();

  // Strip wrapping quotes again in case they were escaped inside
  while (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Ensure standard RSA PEM boundaries have proper newlines
  if (cleaned.includes('-----BEGIN PRIVATE KEY-----') && !cleaned.includes('-----BEGIN PRIVATE KEY-----\n')) {
    cleaned = cleaned.replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n');
  }
  if (cleaned.includes('-----END PRIVATE KEY-----') && !cleaned.includes('\n-----END PRIVATE KEY-----')) {
    cleaned = cleaned.replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
  }

  return cleaned;
};

// Check for local service account JSON file or env JSON
const tryLoadServiceAccountJson = (): { email?: string; privateKey?: string; sheetId?: string } => {
  try {
    let jsonContent: string | null = null;

    if (process.env.GOOGLE_CREDENTIALS && process.env.GOOGLE_CREDENTIALS.trim().startsWith('{')) {
      jsonContent = process.env.GOOGLE_CREDENTIALS.trim();
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS.trim();
      if (fs.existsSync(credPath)) {
        jsonContent = fs.readFileSync(credPath, 'utf-8');
      } else if (credPath.startsWith('{')) {
        jsonContent = credPath;
      }
    } else {
      // Check common default file locations
      const possibleFiles = [
        path.resolve(process.cwd(), 'service-account.json'),
        path.resolve(process.cwd(), 'credentials.json'),
        path.resolve(process.cwd(), 'google-key.json')
      ];
      for (const file of possibleFiles) {
        if (fs.existsSync(file)) {
          jsonContent = fs.readFileSync(file, 'utf-8');
          break;
        }
      }
    }

    if (jsonContent) {
      const parsed = JSON.parse(jsonContent);
      return {
        email: parsed.client_email,
        privateKey: parsed.private_key,
        sheetId: parsed.spreadsheet_id || parsed.sheet_id
      };
    }
  } catch (err: any) {
    // Non-blocking notice
  }
  return {};
};

const serviceAccountFallback = tryLoadServiceAccountJson();

const resolveQrPath = (customPath?: string): string => {
  if (customPath && fs.existsSync(customPath)) {
    return customPath;
  }
  const defaultAsset = path.resolve(process.cwd(), 'assets', 'qr-code.png');
  return defaultAsset;
};

export const config: AppConfig = {
  botToken: process.env.BOT_TOKEN?.trim() || '',
  googleSheetId: parseSpreadsheetId(process.env.GOOGLE_SHEET_ID) || parseSpreadsheetId(serviceAccountFallback.sheetId) || '',
  googleServiceAccountEmail: parseServiceAccountEmail(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) || parseServiceAccountEmail(serviceAccountFallback.email) || '',
  googlePrivateKey: formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY) || formatPrivateKey(serviceAccountFallback.privateKey) || '',
  adminTelegramId: process.env.ADMIN_TELEGRAM_ID?.trim() || '',
  upiId: process.env.UPI_ID?.trim() || '7014180967@fam',
  payeeName: process.env.PAYEE_NAME?.trim() || 'Harsh',
  supportUsername: process.env.SUPPORT_USERNAME?.trim() || '@kanumeena18',
  qrImagePath: resolveQrPath(process.env.QR_IMAGE_PATH),
  paymentExpiryHours: Number(process.env.PAYMENT_EXPIRY_HOURS) || 24,
  storeName: process.env.STORE_NAME?.trim() || 'Course Bazar',
  currency: process.env.CURRENCY?.trim() || 'INR',
  port: Number(process.env.PORT) || 3000,
  get isGoogleConfigured() {
    return Boolean(this.googleSheetId && this.googleServiceAccountEmail && this.googlePrivateKey);
  },
  get isBotConfigured() {
    return Boolean(this.botToken && this.botToken.includes(':'));
  }
};
