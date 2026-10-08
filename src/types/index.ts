export type CourseStatus = 'Active' | 'Inactive';

export interface Course {
  courseId: string;
  courseName: string;
  creatorName: string;
  price: number;
  originalPrice: number;
  courseSize: string;
  language: string;
  driveLink: string;
  zipPassword: string;
  description: string;
  thumbnailUrl?: string;
  status: CourseStatus;
  createdAt: string;
}

export type PurchaseStatus = 
  | 'PAYMENT_PENDING'
  | 'PAYMENT_SUBMITTED'
  | 'PAID'
  | 'REJECTED'
  | 'EXPIRED';

export interface Purchase {
  telegramUserId: string;
  telegramUsername: string;
  customerName: string;
  courseId: string;
  courseName: string;
  amount: number;
  paymentScreenshotFileId: string;
  status: PurchaseStatus;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface AdminUser {
  telegramId: string;
  name: string;
  role: 'Owner' | 'Admin' | 'Moderator';
  status: 'Active' | 'Inactive';
}

export interface SettingItem {
  key: string;
  value: string;
}

export interface UserSessionState {
  step?: 'IDLE' | 'SEARCHING_COURSE' | 'AWAITING_PAYMENT_SCREENSHOT';
  selectedCourseId?: string;
  pendingAmount?: number;
}
