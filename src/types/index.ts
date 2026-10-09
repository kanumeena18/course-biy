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
  paymentId?: string;
  telegramUserId: string;
  telegramUsername: string;
  customerName: string;
  courseId: string;
  courseName: string;
  amount: number;
  paymentScreenshotFileId: string;
  status: PurchaseStatus;
  createdAt: string;
  submittedAt?: string;
  processedByAdminId?: string;
  processedByAdminName?: string;
  decision?: 'Approved' | 'Rejected';
  decisionTimestamp?: string;
  rejectionReason?: string;
  accessDeliveryStatus?: 'Delivered' | 'Pending' | 'Failed';
  approvedAt?: string;
  approvedBy?: string;
  adminNotificationMessageIds?: Array<{ adminId: string; chatId: string; messageId: number }>;
}

export type AdminRole = 'Owner' | 'Payment Admin' | 'Admin' | 'Moderator';

export interface AdminUser {
  adminId?: string;
  telegramId: string;
  name: string;
  username?: string;
  role: AdminRole;
  status: 'Active' | 'Inactive';
  addedBy?: string;
  createdAt?: string;
  updatedAt?: string;
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
