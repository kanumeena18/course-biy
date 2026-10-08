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

  // Handle double backslash newlines and carriage returns
  cleaned = cleaned.replace(/\\n/g, '\n').replace(/\\r/g, '').trim();

  // Strip wrapping quotes again in case they were escaped inside
  while (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  return cleaned;
};

const resolveQrPath = (customPath?: string): string => {
  if (customPath && fs.existsSync(customPath)) {
    return customPath;
  }
  const defaultAsset = path.resolve(process.cwd(), 'assets', 'qr-code.png');
  return defaultAsset;
};

export const config: AppConfig = {
  botToken: process.env.BOT_TOKEN?.trim() || '',
  googleSheetId: process.env.GOOGLE_SHEET_ID?.trim() || '',
  googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || '',
  googlePrivateKey: formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY),
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
