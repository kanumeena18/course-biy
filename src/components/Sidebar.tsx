import React from 'react';
import { Bot, Sheet, BookOpen, Play, Square, CheckCircle2, AlertCircle, Database, ShieldCheck, TrendingUp, Sparkles, X } from 'lucide-react';

interface SidebarProps {
  activeTab: 'simulator' | 'sheets' | 'guide';
  setActiveTab: (tab: 'simulator' | 'sheets' | 'guide') => void;
  botStatus: {
    isRunning: boolean;
    tokenConfigured: boolean;
    maskedToken: string;
    adminId: string;
    upiId?: string;
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
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200'
    },
    {
      id: 'sheets' as const,
      label: 'Google Sheets (DB)',
      description: '4 Live Database Tabs',
      icon: Sheet,
      badge: `${stats.totalCourses} Courses`,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      id: 'guide' as const,
      label: 'Setup Guide',
      description: 'Windows & Cloud Docs',
      icon: BookOpen,
      badge: 'Beginner',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200/90 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo Area */}
        <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
              <span className="text-xl">🎓</span>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-slate-900 text-base tracking-tight">Course Bazar</span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm bg-blue-50 text-blue-700 border border-blue-200">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400">Admin Control Center</p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
                    ? 'bg-blue-50/80 text-blue-700 font-semibold border border-blue-200/80 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold leading-tight">{item.label}</div>
                    <div className="text-[11px] text-slate-400 font-normal leading-tight mt-0.5">
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
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                  <span>Verified Sales</span>
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {stats.paidCount} Paid
                </span>
              </div>
              <div>
                <div className="text-xl font-extrabold text-slate-900 tracking-tight">
                  ₹{stats.totalRevenue.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Verified in bank app • No gateway cut
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Footer: System Status & Real Bot Launcher */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
          {/* Status Indicators */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between px-1">
              <span className="text-slate-500 flex items-center space-x-1.5">
                <Database className="w-3.5 h-3.5 text-slate-400" />
                <span>Google Sheets:</span>
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  sheetsStatus.connected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {sheetsStatus.connected ? 'Cloud Synced' : 'Built-in Cache'}
              </span>
            </div>

            <div className="flex items-center justify-between px-1">
              <span className="text-slate-500 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Telegram Bot:</span>
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  botStatus.isRunning
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {botStatus.isRunning ? 'Active Live' : 'Simulator Mode'}
              </span>
            </div>
          </div>

          {/* Toggle Live Bot Button */}
          <button
            onClick={onToggleBot}
            disabled={isToggling}
            className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 border shadow-xs ${
              botStatus.isRunning
                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
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
