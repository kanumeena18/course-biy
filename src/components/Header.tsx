import React from 'react';
import { Menu, Plus, RefreshCw, ExternalLink, QrCode, Shield, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  activeTab: 'simulator' | 'sheets' | 'admins' | 'guide';
  onOpenAddCourse: () => void;
  onOpenAddAdmin?: () => void;
  onRefreshData: () => void;
  onOpenMobileSidebar: () => void;
  config: {
    upiId: string;
    payeeName: string;
    currency: string;
    supportUsername: string;
  };
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenAddCourse,
  onOpenAddAdmin,
  onRefreshData,
  onOpenMobileSidebar,
  config
}) => {
  const getPageTitle = () => {
    switch (activeTab) {
      case 'simulator':
        return {
          title: 'Telegram Bot Simulator',
          subtitle: 'Interactive customer checkout & multi-admin verification console'
        };
      case 'sheets':
        return {
          title: 'Google Sheets Live Database',
          subtitle: 'Courses, Purchases, Settings, and Admins live table explorer'
        };
      case 'admins':
        return {
          title: 'Manage Admins',
          subtitle: 'Multi-admin team management, roles, and shared payment verification'
        };
      case 'guide':
        return {
          title: 'Setup & Beginner Guide',
          subtitle: 'Step-by-step BotFather, Google Cloud Service Account, and Sheets configuration'
        };
      default:
        return { title: 'Admin Hub', subtitle: 'Course Bazar Administration' };
    }
  };

  const { title, subtitle } = getPageTitle();

  return (
    <header 
      className="h-20 bg-white/90 border-b border-slate-200/70 sticky top-0 z-30 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between"
      style={{
        boxShadow: '0 4px 20px -2px rgba(35, 45, 65, 0.03)'
      }}
    >
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center space-x-3.5 sm:space-x-4">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2.5 rounded-2xl text-slate-500 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200/80 transition"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
            {title}
          </h1>
          <p className="text-xs text-slate-400 hidden sm:block leading-tight mt-0.5 font-medium">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right: Quick Indicators & Primary Action */}
      <div className="flex items-center space-x-3">
        {/* UPI Info Pill with Clay Inset */}
        <div className="hidden md:flex items-center space-x-2 px-3.5 py-2 rounded-2xl bg-[#F8FAFD] border border-slate-200/80 text-xs shadow-2xs">
          <QrCode className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-slate-400 font-medium">UPI:</span>
          <code className="text-slate-900 font-bold font-mono text-[11px]">{config.upiId}</code>
        </div>

        {/* Refresh Button with Tactile Clay Style */}
        <button
          onClick={onRefreshData}
          className="p-2.5 rounded-2xl text-slate-600 hover:text-slate-900 clay-btn-secondary"
          title="Refresh database data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Dynamic Action Button based on Active Tab */}
        {activeTab === 'admins' ? (
          <button
            onClick={onOpenAddAdmin || onOpenAddCourse}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold clay-btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Add Admin</span>
          </button>
        ) : (
          <button
            onClick={onOpenAddCourse}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold clay-btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Add Course</span>
          </button>
        )}
      </div>
    </header>
  );
};
