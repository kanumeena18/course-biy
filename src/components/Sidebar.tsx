import React from 'react';
import { Bot, Sheet, Play, Square, CheckCircle2, AlertCircle, Database, ShieldCheck, TrendingUp, Sparkles, X, Users, BookOpen, QrCode } from 'lucide-react';

interface SidebarProps {
  activeTab: 'simulator' | 'sheets' | 'admins' | 'guide';
  setActiveTab: (tab: 'simulator' | 'sheets' | 'admins' | 'guide') => void;
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
    adminCount?: number;
  };
  onToggleBot: () => void;
  isToggling: boolean;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenQrModal?: () => void;
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
  onCloseMobile,
  onOpenQrModal
}) => {
  const navItems = [
    {
      id: 'simulator' as const,
      label: 'Bot Simulator',
      description: 'Customer & Admin Chat',
      icon: Bot,
      badge: stats.pendingCount > 0 ? `${stats.pendingCount} Pending` : undefined,
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200'
    },
    {
      id: 'sheets' as const,
      label: 'Google Sheets (DB)',
      description: '4 Live Database Tabs',
      icon: Sheet,
      badge: `${stats.totalCourses} Courses`,
      badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200'
    },
    {
      id: 'admins' as const,
      label: 'Manage Admins',
      description: 'Team & Permission Roles',
      icon: Users,
      badge: stats.adminCount !== undefined ? `${stats.adminCount} Admins` : undefined,
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200'
    },
    {
      id: 'guide' as const,
      label: 'Setup Guide',
      description: 'BotFather & Cloud Config',
      icon: BookOpen,
      badge: 'Help',
      badgeColor: 'bg-purple-50 text-purple-800 border-purple-200'
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container with Claymorphic Elevation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#FFFFFF] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
        style={{
          boxShadow: '4px 0 24px -4px rgba(35, 45, 65, 0.05), inset -1px 0 0 0 rgba(226, 232, 240, 0.8)'
        }}
      >
        {/* Brand / Logo Area */}
        <div className="h-20 px-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div 
              className="h-11 w-11 rounded-2xl flex items-center justify-center text-white"
              style={{
                background: 'linear-gradient(180deg, #6054F7 0%, #4D3FE8 100%)',
                boxShadow: '0 8px 16px -2px rgba(77, 63, 232, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.4), inset 0 -2px 3px rgba(0, 0, 0, 0.2)'
              }}
            >
              <span className="text-xl">🎓</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-slate-900 text-base tracking-tight">Course Bazar</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400 mt-0.5">Minimalist Admin Center</p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-4 py-5 space-y-2 overflow-y-auto">
          <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Navigation
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
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-left transition-all duration-200 group ${
                  isActive
                    ? 'bg-white text-indigo-950 font-bold border border-indigo-100 shadow-[0_8px_20px_-4px_rgba(77,63,232,0.14),inset_0_1px_1px_rgba(255,255,255,1)] translate-x-1'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent font-medium'
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <div
                    className={`p-2.5 rounded-xl transition-all ${
                      isActive
                        ? 'text-white'
                        : 'bg-slate-100/80 text-slate-500 group-hover:bg-slate-200/80 group-hover:text-slate-800'
                    }`}
                    style={isActive ? {
                      background: 'linear-gradient(180deg, #6054F7 0%, #4D3FE8 100%)',
                      boxShadow: '0 4px 10px -1px rgba(77, 63, 232, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.4)'
                    } : {}}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight text-slate-900">{item.label}</div>
                    <div className="text-[11px] text-slate-400 font-normal leading-tight mt-0.5">
                      {item.description}
                    </div>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick Store KPI Card with Clay Depth */}
          <div className="pt-4">
            <div 
              className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-2.5"
              style={{
                boxShadow: '0 10px 24px -6px rgba(35, 45, 65, 0.05), inset 0 1px 1px rgba(255, 255, 255, 1)'
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Verified Sales</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                  {stats.paidCount} Paid
                </span>
              </div>
              <div>
                <div className="text-xl font-extrabold text-slate-900 tracking-tight font-mono tabular-nums">
                  ₹{stats.totalRevenue.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Direct UPI verification · 0% gateway fee
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Footer: System Status & Real Bot Launcher */}
        <div className="p-4 border-t border-slate-100 bg-[#FFFFFF] space-y-3">
          {/* Status Indicators in Clay Inset Container */}
          <div className="p-2.5 rounded-2xl bg-[#F8FAFD] border border-slate-200/70 space-y-2 text-xs">
            <div className="flex items-center justify-between px-1">
              <span className="text-slate-500 flex items-center space-x-1.5 text-[11px]">
                <Database className="w-3.5 h-3.5 text-slate-400" />
                <span>Google Sheets:</span>
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${
                  sheetsStatus.connected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {sheetsStatus.connected ? 'Cloud Synced' : 'Built-in Mode'}
              </span>
            </div>

            <div className="flex items-center justify-between px-1">
              <span className="text-slate-500 flex items-center space-x-1.5 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Telegram Bot:</span>
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${
                  botStatus.isRunning
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : botStatus.isUnauthorized
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
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

            {onOpenQrModal && (
              <button
                type="button"
                onClick={onOpenQrModal}
                className="w-full flex items-center justify-between px-1 py-1 rounded-xl hover:bg-slate-200/50 transition cursor-pointer text-left"
              >
                <span className="text-slate-500 flex items-center space-x-1.5 text-[11px]">
                  <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Payment QR:</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 transition">
                  View / Edit
                </span>
              </button>
            )}
          </div>

          {/* Toggle Live Bot Button with Tactile Clay Style */}
          <button
            onClick={onToggleBot}
            disabled={isToggling}
            className={`w-full py-2.5 px-3 rounded-2xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
              botStatus.isRunning
                ? 'clay-btn-danger'
                : 'clay-btn-primary'
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
