import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar.js';
import { Header } from './components/Header.js';
import { KPICards } from './components/KPICards.js';
import { TelegramSimulator } from './components/TelegramSimulator.js';
import { GoogleSheetsViewer } from './components/GoogleSheetsViewer.js';
import { BeginnerGuide } from './components/BeginnerGuide.js';
import { AddCourseModal } from './components/AddCourseModal.js';
import { Course, Purchase, AdminUser, SettingItem } from './types/index.js';

export function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'sheets' | 'guide'>('simulator');
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isTogglingBot, setIsTogglingBot] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [statusData, setStatusData] = useState({
    bot: {
      isRunning: false,
      tokenConfigured: false,
      maskedToken: 'Not configured',
      adminId: ''
    },
    sheets: {
      connected: false,
      hasCredentials: false
    },
    config: {
      storeName: 'Course Bazar',
      currency: '₹',
      upiId: 'coursebazar@upi',
      payeeName: 'Course Bazar',
      supportUsername: '@coursebazar_support',
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
        alert(data.message || 'Could not toggle bot. Please check your BOT_TOKEN in .env');
      }
      await loadAllData();
    } catch (err: any) {
      alert(`Error toggling bot: ${err.message}`);
    } finally {
      setIsTogglingBot(false);
    }
  };

  const handleAdminAction = async (userId: string, courseId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const res = await fetch('/api/admin-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, courseId, action })
      });
      const data = await res.json();
      if (data.success) {
        await loadAllData();
      }
    } catch (err) {
      console.error('Error performing admin action:', err);
    }
  };

  const handleDeleteCourse = async (courseId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        await loadAllData();
        return true;
      } else {
        alert(data.error || 'Failed to delete course');
        return false;
      }
    } catch (err: any) {
      alert(`Error deleting course: ${err.message}`);
      return false;
    }
  };

  // KPI Calculations
  const pendingCount = purchases.filter(p => p.status === 'PAYMENT_SUBMITTED').length;
  const paidPurchases = purchases.filter(p => p.status === 'PAID');
  const totalRevenue = paidPurchases.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex antialiased">
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
          paidCount: paidPurchases.length
        }}
        onToggleBot={handleToggleBot}
        isToggling={isTogglingBot}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0 min-h-screen">
        {/* Top Navbar Header */}
        <Header
          activeTab={activeTab}
          onOpenAddCourse={() => {
            setEditingCourse(null);
            setIsAddCourseOpen(true);
          }}
          onRefreshData={loadAllData}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          config={{
            upiId: statusData.config.upiId,
            payeeName: statusData.config.payeeName,
            currency: statusData.config.currency,
            supportUsername: statusData.config.supportUsername
          }}
        />

        {/* Dashboard Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Top KPI Metric Cards */}
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
              onRefreshData={loadAllData}
              configData={{
                upiId: statusData.config.upiId,
                payeeName: statusData.config.payeeName,
                supportUsername: statusData.config.supportUsername,
                currency: statusData.config.currency,
                storeName: statusData.config.storeName
              }}
            />
          )}

          {activeTab === 'sheets' && (
            <GoogleSheetsViewer
              courses={courses}
              purchases={purchases}
              settings={settings}
              admins={admins}
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

          {activeTab === 'guide' && <BeginnerGuide />}
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
    </div>
  );
}

export default App;
