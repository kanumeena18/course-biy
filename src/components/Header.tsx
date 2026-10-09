import React from 'react';
import { Menu, Plus, RefreshCw, ExternalLink, QrCode, Shield, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  activeTab: 'simulator' | 'sheets';
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
      default:
        return { title: 'Admin Hub', subtitle: 'Course Bazar Administration' };
    }
  };

  const { title, subtitle } = getPageTitle();

  return (
    <header className="h-16 bg-[#0B0D1F]/95 border-b border-[#252A3D] sticky top-0 z-30 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-[#9CA3AF] hover:text-[#F8FAFC] hover:bg-[#1A1D32] transition"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-sm sm:text-base font-bold text-[#F8FAFC] leading-tight">
            {title}
          </h1>
          <p className="text-[11px] text-[#9CA3AF] hidden sm:block leading-tight">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right: Quick Indicators & Primary Action */}
      <div className="flex items-center space-x-2.5">
        {/* UPI Info Pill */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#111426] border border-[#252A3D] text-xs">
          <QrCode className="w-3.5 h-3.5 text-[#6366F1]" />
          <span className="text-[#9CA3AF]">UPI:</span>
          <code className="text-[#F8FAFC] font-bold font-mono text-[11px]">{config.upiId}</code>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefreshData}
          className="p-2 rounded-xl text-[#9CA3AF] hover:text-[#F8FAFC] hover:bg-[#1A1D32] border border-transparent hover:border-[#252A3D] transition"
          title="Refresh database data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Add Course Primary Button */}
        <button
          onClick={onOpenAddCourse}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold transition shadow-md shadow-[#6366F1]/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Course</span>
        </button>
      </div>
    </header>
  );
};
