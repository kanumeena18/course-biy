import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { Sidebar } from './components/Sidebar.js';
import { Header } from './components/Header.js';
import { KPICards } from './components/KPICards.js';
import { TelegramSimulator } from './components/TelegramSimulator.js';
import { GoogleSheetsViewer } from './components/GoogleSheetsViewer.js';
import { AddCourseModal } from './components/AddCourseModal.js';
import { ManageAdmins } from './components/ManageAdmins.js';
import { AddAdminModal } from './components/AddAdminModal.js';
import { PaymentQrModal } from './components/PaymentQrModal.js';
import { BeginnerGuide } from './components/BeginnerGuide.js';
import { Course, Purchase, AdminUser, SettingItem } from './types/index.js';

export function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'sheets' | 'admins' | 'guide'>('simulator');
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isTogglingBot, setIsTogglingBot] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'error' | 'success' | 'info';
    message: string;
  } | null>(null);

  const showNotification = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 6000);
  };

  const [statusData, setStatusData] = useState({
    bot: {
      isRunning: false,
      tokenConfigured: false,
      maskedToken: 'Not configured',
      adminId: '',
      botUsername: null as string | null,
      lastError: null as string | null,
      isUnauthorized: false
    },
    sheets: {
      connected: false,
      hasCredentials: false,
      sheetId: '',
      serviceAccount: '',
      lastSyncError: null as string | null
    },
    config: {
      storeName: 'Course Bazar',
      currency: 'INR',
      upiId: '7014180967@fam',
      payeeName: 'Harsh',
      supportUsername: '@kanumeena18',
      paymentExpiryHours: 24,
      hasQrAsset: true
    }
  });

  const [courses, setCourses] = useState<Course[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);

  const loadAllData = async () => {
    try {
      const [statusRes, rawSheetsRes] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/raw-sheets')
      ]);

      if (statusRes.ok) {
        const sData = await statusRes.json();
        setStatusData(sData);
      }

      if (rawSheetsRes.ok) {
        const rData = await rawSheetsRes.json();
        if (rData.success && rData.data) {
          setCourses(rData.data.courses || []);
          setPurchases(rData.data.purchases || []);
          setSettings(rData.data.settings || []);
          setAdmins(rData.data.admins || []);
        }
      }
    } catch (err) {
      console.warn('Error loading data from server API:', err);
    }
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleBot = async () => {
    setIsTogglingBot(true);
    try {
      const action = statusData.bot.isRunning ? 'STOP' : 'START';
      const res = await fetch('/api/bot-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (!data.success) {
        showNotification(
          data.message || 'Could not launch live bot. Please check your BOT_TOKEN from @BotFather in .env or settings.',
          'error'
        );
      } else {
        showNotification(data.message || `Bot successfully ${action === 'START' ? 'started' : 'stopped'}!`, 'success');
      }
      await loadAllData();
    } catch (err: any) {
      showNotification(`Error toggling bot: ${err.message}`, 'error');
    } finally {
      setIsTogglingBot(false);
    }
  };

  const handleAdminAction = async (userId: string, courseId: string, action: 'APPROVE' | 'REJECT', paymentId?: string) => {
    try {
      const res = await fetch('/api/admin-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, courseId, action, paymentId })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Payment ${action === 'APPROVE' ? 'Approved' : 'Rejected'} successfully!`, 'success');
        await loadAllData();
      } else {
        showNotification(data.error || 'Failed to process admin action', 'error');
      }
    } catch (err: any) {
      console.error('Error performing admin action:', err);
      showNotification(`Error: ${err.message}`, 'error');
    }
  };

  const handleDeleteCourse = async (courseId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Course deleted successfully from Google Sheets!', 'success');
        await loadAllData();
        return true;
      } else {
        showNotification(data.error || 'Failed to delete course', 'error');
        return false;
      }
    } catch (err: any) {
      showNotification(`Error deleting course: ${err.message}`, 'error');
      return false;
    }
  };

  // KPI Calculations
  const pendingCount = purchases.filter(p => p.status === 'PAYMENT_SUBMITTED').length;
  const paidPurchases = purchases.filter(p => p.status === 'PAID');
  const totalRevenue = paidPurchases.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-900 font-sans flex antialiased selection:bg-indigo-600 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        botStatus={{
          ...statusData.bot,
          upiId: statusData.config.upiId
        }}
        sheetsStatus={statusData.sheets}
        stats={{
          pendingCount,
          totalCourses: courses.length,
          totalRevenue,
          paidCount: paidPurchases.length,
          adminCount: admins.length
        }}
        onToggleBot={handleToggleBot}
        isToggling={isTogglingBot}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenQrModal={() => setIsQrModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0 min-h-screen bg-[#F5F7FA]">
        {/* Top Navbar Header */}
        <Header
          activeTab={activeTab}
          onOpenAddCourse={() => {
            setEditingCourse(null);
            setIsAddCourseOpen(true);
          }}
          onOpenAddAdmin={() => setIsAddAdminOpen(true)}
          onRefreshData={loadAllData}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenQrModal={() => setIsQrModalOpen(true)}
          config={{
            upiId: statusData.config.upiId,
            payeeName: statusData.config.payeeName,
            currency: statusData.config.currency,
            supportUsername: statusData.config.supportUsername
          }}
        />

        {/* Dashboard Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Notification Toast with Claymorphic Depth */}
          {notification && (
            <div
              className={`p-4 rounded-2xl border flex items-start justify-between shadow-md transition-all animate-in fade-in duration-200 ${
                notification.type === 'error'
                  ? 'bg-rose-50/90 border-rose-200 text-rose-900 shadow-rose-500/5'
                  : notification.type === 'success'
                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900 shadow-emerald-500/5'
                  : 'bg-indigo-50/90 border-indigo-200 text-indigo-900 shadow-indigo-500/5'
              }`}
              style={{
                boxShadow: '0 8px 20px -4px rgba(35, 45, 65, 0.08), inset 0 1px 1px 0 rgba(255, 255, 255, 0.9)'
              }}
            >
              <div className="flex items-start space-x-3">
                {notification.type === 'error' ? (
                  <div className="p-1.5 rounded-xl bg-rose-100 text-rose-700 shrink-0 mt-0.5 shadow-2xs">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                ) : notification.type === 'success' ? (
                  <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700 shrink-0 mt-0.5 shadow-2xs">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="p-1.5 rounded-xl bg-indigo-100 text-indigo-700 shrink-0 mt-0.5 shadow-2xs">
                    <Info className="w-4 h-4" />
                  </div>
                )}
                <div className="text-xs sm:text-sm font-semibold leading-relaxed pt-0.5">
                  {notification.message}
                </div>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-black/5 transition ml-2"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Top KPI Metric Cards (Shown on all dashboard tabs) */}
          <KPICards
            courses={courses}
            purchases={purchases}
            currency={statusData.config.currency}
            onFilterPending={() => {
              setActiveTab('sheets');
            }}
          />

          {/* Active View */}
          {activeTab === 'simulator' && (
            <TelegramSimulator
              courses={courses}
              purchases={purchases}
              admins={admins}
              onRefreshData={loadAllData}
              configData={{
                upiId: statusData.config.upiId,
                payeeName: statusData.config.payeeName,
                supportUsername: statusData.config.supportUsername,
                currency: statusData.config.currency,
                storeName: statusData.config.storeName
              }}
              onOpenQrModal={() => setIsQrModalOpen(true)}
            />
          )}

          {activeTab === 'sheets' && (
            <GoogleSheetsViewer
              courses={courses}
              purchases={purchases}
              settings={settings}
              admins={admins}
              sheetsStatus={statusData.sheets}
              onRefresh={loadAllData}
              onOpenAddCourse={() => {
                setEditingCourse(null);
                setIsAddCourseOpen(true);
              }}
              onEditCourse={(course) => {
                setEditingCourse(course);
                setIsAddCourseOpen(true);
              }}
              onDeleteCourse={handleDeleteCourse}
              onAdminAction={handleAdminAction}
              initialTab={pendingCount > 0 ? 'Purchases' : 'Courses'}
            />
          )}

          {activeTab === 'admins' && (
            <ManageAdmins
              admins={admins}
              onRefresh={loadAllData}
              primaryOwnerTelegramId={statusData.bot.adminId}
              onShowNotification={showNotification}
            />
          )}

          {activeTab === 'guide' && (
            <BeginnerGuide />
          )}
        </main>
      </div>

      {/* Add / Edit Course Modal */}
      <AddCourseModal
        isOpen={isAddCourseOpen}
        onClose={() => {
          setIsAddCourseOpen(false);
          setEditingCourse(null);
        }}
        onCourseAdded={loadAllData}
        courseToEdit={editingCourse}
        onDeleteCourse={handleDeleteCourse}
      />

      {/* Add New Admin Modal (Global) */}
      <AddAdminModal
        isOpen={isAddAdminOpen}
        onClose={() => setIsAddAdminOpen(false)}
        onAdminSaved={() => {
          loadAllData();
          showNotification('New admin successfully added and synchronized with Google Sheets!', 'success');
        }}
        primaryOwnerTelegramId={statusData.bot.adminId}
      />

      {/* Payment QR Code Modal (Global) */}
      <PaymentQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        upiId={statusData.config.upiId}
        payeeName={statusData.config.payeeName}
        storeName={statusData.config.storeName}
        currency={statusData.config.currency}
        onQrUpdated={() => {
          loadAllData();
          showNotification('Payment QR code updated successfully and active across bot & web!', 'success');
        }}
      />
    </div>
  );
}

export default App;
