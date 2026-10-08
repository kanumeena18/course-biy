import React from 'react';
import { Menu, Plus, RefreshCw, ExternalLink, QrCode, Shield, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  activeTab: 'simulator' | 'sheets' | 'guide';
  onOpenAddCourse: () => void;
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
  onRefreshData,
  onOpenMobileSidebar,
  config
}) => {
  const getPageTitle = () => {
    switch (activeTab) {
      case 'simulator':
        return {
          title: 'Telegram Bot Simulator',
          subtitle: 'Interactive customer checkout & admin verification console'
        };
      case 'sheets':
        return {
          title: 'Google Sheets Live Database',
          subtitle: 'Courses, Purchases, Settings, and Admins live table explorer'
        };
      case 'guide':
        return {
          title: 'Beginner Deployment Guide',
          subtitle: 'Step-by-step setup for Telegram BotFather, Google Cloud & Windows'
        };
      default:
        return { title: 'Admin Hub', subtitle: 'Course Bazar Administration' };
    }
  };

  const { title, subtitle } = getPageTitle();

  return (
    <header className="h-16 bg-white/95 border-b border-slate-200/90 sticky top-0 z-30 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
            {title}
          </h1>
          <p className="text-[11px] text-slate-500 hidden sm:block leading-tight">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right: Quick Indicators & Primary Action */}
      <div className="flex items-center space-x-2.5">
        {/* UPI Info Pill */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <QrCode className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-slate-500">UPI:</span>
          <code className="text-slate-800 font-bold font-mono text-[11px]">{config.upiId}</code>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefreshData}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition"
          title="Refresh database data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Add Course Primary Button */}
        <button
          onClick={onOpenAddCourse}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs hover:shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Course</span>
        </button>
      </div>
    </header>
  );
};
