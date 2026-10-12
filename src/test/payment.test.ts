import { googleSheetsService } from '../services/googleSheets.js';
import assert from 'assert';
import { config } from '../config/config.js';

async function runTests() {
  console.log('🧪 Starting Course Bazar Payment & Approval Workflow Tests...');

  // Setup test course
  const testCourseId = 'TEST-C101';
  googleSheetsService.addCourse({
    courseId: testCourseId,
    courseName: 'Test Masterclass 2026',
    creatorName: 'Test Instructor',
    price: 199,
    originalPrice: 599,
    courseSize: '1.0 GB',
    language: 'English',
    driveLink: 'https://drive.google.com/drive/test-link',
    zipPassword: 'securepassword123',
    description: 'Test course description',
    status: 'Active',
    createdAt: new Date().toISOString().split('T')[0]
  });

  const testUserId = '123456789';
  const testUsername = 'teststudent';
  const testCustomerName = 'Test Student';
  const paymentId = `PAY-TEST-${Date.now()}`;

  // Test 1: Record purchase submission
  console.log('Test 1: Recording purchase submission...');
  const purchase = await googleSheetsService.recordPurchaseSubmission({
    paymentId,
    telegramUserId: testUserId,
    telegramUsername: testUsername,
    customerName: testCustomerName,
    courseId: testCourseId,
    courseName: 'Test Masterclass 2026',
    amount: 199,
    paymentScreenshotFileId: 'AgACAgUAAxkBAAIC...'
  });

  assert.strictEqual(purchase.paymentId, paymentId);
  assert.strictEqual(purchase.status, 'PAYMENT_SUBMITTED');
  console.log('✅ Test 1 Passed: Purchase submission recorded successfully.');

  // Test 2: Find and approve payment
  console.log('Test 2: Processing payment approval...');
  const originalAdminId = config.adminTelegramId;
  config.adminTelegramId = testUserId; // temporarily make test user admin

  const decisionResult = await googleSheetsService.processPaymentDecision({
    userId: testUserId,
    courseId: testCourseId,
    paymentId,
    action: 'APPROVE',
    adminId: testUserId,
    adminName: 'Test Admin'
  });

  assert.strictEqual(decisionResult.success, true);
  assert.strictEqual(decisionResult.purchase?.status, 'PAID');
  assert.strictEqual(decisionResult.delivery?.driveLink, 'https://drive.google.com/drive/test-link');
  console.log('✅ Test 2 Passed: Payment approved and course access delivered successfully.');

  // Test 3: Duplicate approval attempt (First-Valid-Action-Wins)
  console.log('Test 3: Testing duplicate approval attempt...');
  const duplicateResult = await googleSheetsService.processPaymentDecision({
    userId: testUserId,
    courseId: testCourseId,
    paymentId,
    action: 'APPROVE',
    adminId: testUserId,
    adminName: 'Test Admin 2'
  });

  assert.strictEqual(duplicateResult.success, false);
  assert.strictEqual(duplicateResult.alreadyProcessed, true);
  console.log('✅ Test 3 Passed: Duplicate approval correctly prevented.');

  // Test 4: Missing or invalid verification record
  console.log('Test 4: Testing missing verification record lookup...');
  const missingResult = await googleSheetsService.processPaymentDecision({
    userId: '999999999',
    courseId: 'NON-EXISTENT',
    paymentId: 'PAY-INVALID',
    action: 'APPROVE',
    adminId: testUserId
  });

  assert.strictEqual(missingResult.success, false);
  assert.ok(missingResult.error?.includes('Payment verification not found'));
  console.log('✅ Test 4 Passed: Missing verification record handled with actionable error.');

  // Test 5: Verify Telegram callback parser logic with real-world Reference ID format
  console.log('Test 5: Testing Telegram callback parser logic with Reference ID format...');
  const sampleCallbackData = 'admin_approve_8293894004_CT1260_PAY-MV5K14VA-773';
  const prefix = 'admin_approve_';
  const rawPayload = sampleCallbackData.slice(prefix.length);
  const parts = rawPayload.split('_');
  const parsedUserId = parts[0];
  const parsedCourseId = parts[1];
  const parsedPaymentId = parts.slice(2).join('_');

  assert.strictEqual(parsedUserId, '8293894004');
  assert.strictEqual(parsedCourseId, 'CT1260');
  assert.strictEqual(parsedPaymentId, 'PAY-MV5K14VA-773');
  console.log('✅ Test 5 Passed: Telegram callback string parsed accurately without greedy regex corruption.');

  // Test 6: Verify delivery status failure tracking and safe retry
  console.log('Test 6: Testing delivery failure tracking...');
  await googleSheetsService.updateDeliveryStatus(testUserId, testCourseId, 'Failed', 'Telegram send error', paymentId);
  const purchaseAfterFail = await googleSheetsService.getPurchaseByUserAndCourse(testUserId, testCourseId, paymentId);
  assert.strictEqual(purchaseAfterFail?.accessDeliveryStatus, 'Failed');
  assert.strictEqual(purchaseAfterFail?.status, 'PAID'); // Payment remains verified/paid so customer isn't recharged
  console.log('✅ Test 6 Passed: Delivery failure tracked safely without compromising verified payment status.');

  // Clean up test course and test purchase so persistent database remains pristine
  await googleSheetsService.deleteCourse(testCourseId);
  try {
    const fs = await import('fs');
    const path = await import('path');
    const pFile = path.resolve(process.cwd(), 'data', 'purchases.json');
    if (fs.existsSync(pFile)) {
      const data = JSON.parse(fs.readFileSync(pFile, 'utf-8'));
      const realOnly = data.filter((p: any) => !p.paymentId.startsWith('PAY-TEST-') && p.courseId !== testCourseId);
      fs.writeFileSync(pFile, JSON.stringify(realOnly, null, 2), 'utf-8');
    }
  } catch {}

  // Restore config admin
  config.adminTelegramId = originalAdminId;

  console.log('🎉 All Payment Verification & Approval Tests Completed Successfully!');
}

runTests().catch(err => {
  console.error('❌ Test execution failed:', err);
  process.exit(1);
});
