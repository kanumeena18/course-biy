import React from 'react';
import { Bot, Sheet, Play, Square, CheckCircle2, AlertCircle, Database, ShieldCheck, TrendingUp, Sparkles, X } from 'lucide-react';

interface SidebarProps {
  activeTab: 'simulator' | 'sheets';
  setActiveTab: (tab: 'simulator' | 'sheets') => void;
  botStatus: {
    isRunning: boolean;
    tokenConfigured: boolean;
    maskedToken: string;
    adminId: string;
    upiId?: string;
    botUsername?: string | null;
    lastError?: string | null;
    isUnauthorized?: boolean;
  };
  sheetsStatus: {
    connected: boolean;
    hasCredentials: boolean;
  };
  stats: {
    pendingCount: number;
    totalCourses: number;
    totalRevenue: number;
    paidCount: number;
  };
  onToggleBot: () => void;
  isToggling: boolean;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  botStatus,
  sheetsStatus,
  stats,
  onToggleBot,
  isToggling,
  isOpenMobile,
  onCloseMobile
}) => {
  const navItems = [
    {
      id: 'simulator' as const,
      label: 'Bot Simulator',
      description: 'Customer & Admin Chat',
      icon: Bot,
      badge: stats.pendingCount > 0 ? `${stats.pendingCount} Pending` : undefined,
      badgeColor: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30'
    },
    {
      id: 'sheets' as const,
      label: 'Google Sheets (DB)',
      description: '4 Live Database Tabs',
      icon: Sheet,
      badge: `${stats.totalCourses} Courses`,
      badgeColor: 'bg-[#6366F1]/15 text-[#875CE9] border-[#6366F1]/30'
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-[#040515]/80 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0B0D1F] border-r border-[#252A3D] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo Area */}
        <div className="h-16 px-6 border-b border-[#252A3D] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#6366F1] to-[#875CE9] flex items-center justify-center text-white shadow-md shadow-[#6366F1]/25">
              <span className="text-xl">🎓</span>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-[#F8FAFC] text-base tracking-tight">Course Bazar</span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm bg-[#1A1D32] text-[#875CE9] border border-[#30354D]">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#9CA3AF]">Admin Control Center</p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#F8FAFC] hover:bg-[#1A1D32]"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
            Main Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left transition-all group ${
                  isActive
                    ? 'bg-[#111426] text-[#F8FAFC] font-semibold border border-[#6366F1]/50 shadow-xs'
                    : 'text-[#9CA3AF] hover:text-[#F8FAFC] hover:bg-[#111426]/60 border border-transparent font-medium'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-[#6366F1] text-white shadow-xs'
                        : 'bg-[#1A1D32] text-[#9CA3AF] group-hover:bg-[#252A3D] group-hover:text-[#F8FAFC]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold leading-tight text-[#F8FAFC]">{item.label}</div>
                    <div className="text-[11px] text-[#9CA3AF] font-normal leading-tight mt-0.5">
                      {item.description}
                    </div>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick Store KPI Card */}
          <div className="pt-4">
            <div className="p-3.5 rounded-2xl bg-[#111426] border border-[#252A3D] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF] flex items-center space-x-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#6366F1]" />
                  <span>Verified Sales</span>
                </span>
                <span className="text-[11px] font-bold text-[#22C55E] bg-[#22C55E]/15 px-2 py-0.5 rounded-full border border-[#22C55E]/30">
                  {stats.paidCount} Paid
                </span>
              </div>
              <div>
                <div className="text-xl font-extrabold text-[#FFFFFF] tracking-tight">
                  ₹{stats.totalRevenue.toLocaleString()}
                </div>
                <div className="text-[11px] text-[#9CA3AF] mt-0.5">
                  Verified in bank app · No gateway cut
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Footer: System Status & Real Bot Launcher */}
        <div className="p-4 border-t border-[#252A3D] bg-[#0B0D1F] space-y-3">
          {/* Status Indicators */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between px-1">
              <span className="text-[#9CA3AF] flex items-center space-x-1.5">
                <Database className="w-3.5 h-3.5 text-[#6B7280]" />
                <span>Google Sheets:</span>
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  sheetsStatus.connected
                    ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'
                    : 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30'
                }`}
              >
                {sheetsStatus.connected ? 'Cloud Synced' : 'Built-in Cache'}
              </span>
            </div>

            <div className="flex items-center justify-between px-1">
              <span className="text-[#9CA3AF] flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#6B7280]" />
                <span>Telegram Bot:</span>
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  botStatus.isRunning
                    ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'
                    : botStatus.isUnauthorized
                    ? 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30'
                    : 'bg-[#1A1D32] text-[#9CA3AF] border-[#30354D]'
                }`}
                title={botStatus.lastError || (botStatus.isRunning ? 'Bot is running' : 'Simulator Mode Active')}
              >
                {botStatus.isRunning
                  ? 'Active Live'
                  : botStatus.isUnauthorized
                  ? 'Simulator Active'
                  : 'Simulator Mode'}
              </span>
            </div>
          </div>

          {/* Toggle Live Bot Button */}
          <button
            onClick={onToggleBot}
            disabled={isToggling}
            className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 border shadow-xs ${
              botStatus.isRunning
                ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40 hover:bg-[#EF4444]/25'
                : 'bg-[#6366F1] text-white border-transparent hover:bg-[#4F46E5] shadow-md shadow-[#6366F1]/20'
            }`}
          >
            {botStatus.isRunning ? (
              <>
                <Square className="w-3.5 h-3.5" />
                <span>Stop Live Telegram Bot</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Launch Live Telegram Bot</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
