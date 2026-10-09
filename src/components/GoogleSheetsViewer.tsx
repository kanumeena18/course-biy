import React, { useState } from 'react';
import { Sheet, Plus, CheckCircle, XCircle, Clock, Key, Shield, User, ExternalLink, RefreshCw, Search, Eye, EyeOff, AlertCircle, Trash2, X, AlertTriangle, FileSpreadsheet, Copy, Database } from 'lucide-react';
import { Course, Purchase, AdminUser, SettingItem } from '../types/index.js';

interface GoogleSheetsViewerProps {
  courses: Course[];
  purchases: Purchase[];
  settings: SettingItem[];
  admins: AdminUser[];
  sheetsStatus?: {
    connected: boolean;
    hasCredentials: boolean;
    sheetId?: string;
    serviceAccount?: string;
    lastSyncError?: string | null;
  };
  onRefresh: () => void;
  onOpenAddCourse: () => void;
  onEditCourse: (course: Course) => void;
  onDeleteCourse: (courseId: string) => Promise<boolean | void> | void;
  onAdminAction: (userId: string, courseId: string, action: 'APPROVE' | 'REJECT') => void;
  initialTab?: 'Courses' | 'Purchases' | 'Settings' | 'Admins';
}

export const GoogleSheetsViewer: React.FC<GoogleSheetsViewerProps> = ({
  courses,
  purchases,
  settings,
  admins,
  sheetsStatus,
  onRefresh,
  onOpenAddCourse,
  onEditCourse,
  onDeleteCourse,
  onAdminAction,
  initialTab = 'Courses'
}) => {
  const [activeTab, setActiveTab] = useState<'Courses' | 'Purchases' | 'Settings' | 'Admins'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteToast, setDeleteToast] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [customSheetId, setCustomSheetId] = useState(sheetsStatus?.sheetId || '');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [reconnectMsg, setReconnectMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCopyEmail = () => {
    const email = sheetsStatus?.serviceAccount || 'course-bazar-sheets@course-bazar-bot.iam.gserviceaccount.com';
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const handleReconnect = async () => {
    setIsReconnecting(true);
    setReconnectMsg(null);
    try {
      const res = await fetch('/api/sheets-reconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetId: customSheetId.trim() || undefined })
      });
      const data = await res.json();
      if (data.success) {
        setReconnectMsg({ type: 'success', text: data.message || 'Connected to Google Sheets successfully!' });
      } else {
        setReconnectMsg({ type: 'error', text: data.message || 'Failed to connect. Check permissions and Sheet ID.' });
      }
      onRefresh();
    } catch (err: any) {
      setReconnectMsg({ type: 'error', text: err.message || 'Error connecting to Google Sheets' });
    } finally {
      setIsReconnecting(false);
    }
  };

  const togglePassword = (courseId: string) => {
    setShowPasswords(prev => ({ ...prev, [courseId]: !prev[courseId] }));
  };

  const handleConfirmDelete = async () => {
    if (!courseToDelete) return;
    setIsDeleting(true);
    try {
      const courseName = courseToDelete.courseName;
      await onDeleteCourse(courseToDelete.courseId);
      setCourseToDelete(null);
      setDeleteToast(`Course "${courseName}" deleted successfully.`);
      setTimeout(() => setDeleteToast(null), 4000);
    } catch (err: any) {
      alert(`Error deleting course: ${err.message || err}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered lists
  const filteredCourses = courses.filter(c =>
    c.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.creatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.courseId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPurchases = purchases.filter(p =>
    p.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.telegramUserId.includes(searchQuery) ||
    p.telegramUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Toast Notification Banner */}
      {deleteToast && (
        <div className="p-3.5 bg-[#111426] border border-[#22C55E]/40 text-[#22C55E] rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-[#22C55E] shrink-0" />
            <span>{deleteToast}</span>
          </div>
          <button
            onClick={() => setDeleteToast(null)}
            className="text-[#9CA3AF] hover:text-[#F8FAFC] p-1 rounded-lg transition"
            aria-label="Dismiss toast"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Google Sheets Connection Diagnostics Card */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        sheetsStatus?.connected
          ? 'bg-[#111426] border-[#252A3D] text-[#D1D5DB]'
          : 'bg-[#111426] border-[#252A3D] text-[#D1D5DB]'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className={`p-2 rounded-xl mt-0.5 shrink-0 border ${
              sheetsStatus?.connected
                ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'
                : 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30'
            }`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-[#F8FAFC]">
                  {sheetsStatus?.connected
                    ? 'Google Sheets Live Database Synced'
                    : 'Google Sheets: Built-in High-Speed Store Mode Active'}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  sheetsStatus?.connected
                    ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'
                    : 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30'
                }`}>
                  {sheetsStatus?.connected ? 'Connected' : 'Fallback Cache'}
                </span>
              </div>
              <p className="text-xs text-[#9CA3AF] mt-0.5 leading-relaxed">
                {sheetsStatus?.connected
                  ? 'Changes automatically sync in real-time to Google Sheets across Courses, Purchases, Settings, and Admins tabs.'
                  : (sheetsStatus?.lastSyncError || 'Spreadsheet not yet linked. The app is serving courses and purchases reliably from memory.')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
            {sheetsStatus?.sheetId && sheetsStatus.sheetId !== 'Not configured' && (
              <a
                href={`https://docs.google.com/spreadsheets/d/${sheetsStatus.sheetId}/edit`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#1A1D32] border border-[#30354D] text-[#E5E7EB] hover:bg-[#252A3D] hover:text-[#FFFFFF] transition"
              >
                <span>Open Sheet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={handleReconnect}
              disabled={isReconnecting}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white transition shadow-md shadow-[#6366F1]/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
              <span>{isReconnecting ? 'Testing...' : 'Test / Reconnect'}</span>
            </button>
          </div>
        </div>

        {/* If not connected, show quick 2-step resolution box */}
        {!sheetsStatus?.connected && (
          <div className="mt-4 pt-3.5 border-t border-[#252A3D] grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-[#0B0D1F] border border-[#252A3D] rounded-xl space-y-1.5">
              <span className="font-bold text-[#F8FAFC] flex items-center space-x-1.5">
                <span className="w-4 h-4 rounded-full bg-[#6366F1] text-white text-[10px] flex items-center justify-center font-bold">1</span>
                <span>Share Google Sheet with Service Account</span>
              </span>
              <p className="text-[11px] text-[#9CA3AF]">
                Click <strong className="text-[#F8FAFC]">Share</strong> in your Google Sheet and add this email as <strong className="text-[#F8FAFC]">Editor</strong>:
              </p>
              <div className="flex items-center space-x-2 bg-[#111426] border border-[#252A3D] p-1.5 rounded-lg">
                <span className="font-mono text-[11px] text-[#D1D5DB] truncate flex-1 select-all">
                  {sheetsStatus?.serviceAccount || 'course-bazar-sheets@course-bazar-bot.iam.gserviceaccount.com'}
                </span>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="px-2 py-1 text-[10px] font-bold bg-[#1A1D32] hover:bg-[#252A3D] text-[#E5E7EB] hover:text-white rounded transition flex items-center space-x-1 shrink-0 border border-[#30354D]"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedEmail ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="p-3 bg-[#0B0D1F] border border-[#252A3D] rounded-xl space-y-1.5">
              <span className="font-bold text-[#F8FAFC] flex items-center space-x-1.5">
                <span className="w-4 h-4 rounded-full bg-[#6366F1] text-white text-[10px] flex items-center justify-center font-bold">2</span>
                <span>Set Spreadsheet ID & Reconnect</span>
              </span>
              <p className="text-[11px] text-[#9CA3AF]">
                Copy the ID from your sheet's URL (between <code className="text-[#875CE9]">/d/</code> and <code className="text-[#875CE9]">/edit</code>):
              </p>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={customSheetId}
                  onChange={(e) => setCustomSheetId(e.target.value)}
                  placeholder="Paste Google Sheet ID..."
                  className="font-mono text-[11px] bg-[#111426] border border-[#252A3D] px-2.5 py-1.5 rounded-lg flex-1 text-[#D1D5DB] placeholder-[#6B7280] focus:outline-hidden focus:border-[#6366F1]"
                />
                <button
                  type="button"
                  onClick={handleReconnect}
                  disabled={isReconnecting || !customSheetId.trim()}
                  className="px-3 py-1.5 text-xs font-bold bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-lg transition disabled:opacity-50 shrink-0"
                >
                  {isReconnecting ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </div>
          </div>
        )}

        {reconnectMsg && (
          <div className={`mt-3 p-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 border ${
            reconnectMsg.type === 'success'
              ? 'bg-[#111426] border-[#22C55E]/40 text-[#22C55E]'
              : 'bg-[#111426] border-[#EF4444]/40 text-[#EF4444]'
          }`}>
            {reconnectMsg.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0 text-[#22C55E]" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-[#EF4444]" />
            )}
            <span>{reconnectMsg.text}</span>
          </div>
        )}
      </div>

      {/* Table Card Container */}
      <div className="bg-[#111426] border border-[#252A3D] rounded-2xl shadow-xs overflow-hidden">
        {/* Controls Toolbar: Tab switcher + Search + Actions */}
        <div className="p-4 sm:p-5 border-b border-[#252A3D] flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-[#0B0D1F]">
          {/* Segmented Sheet Tabs */}
          <div className="flex bg-[#040515] p-1 rounded-xl w-fit flex-wrap gap-1 border border-[#252A3D]">
            {(['Courses', 'Purchases', 'Settings', 'Admins'] as const).map(tab => {
              let count = 0;
              if (tab === 'Courses') count = courses.length;
              if (tab === 'Purchases') count = purchases.length;
              if (tab === 'Settings') count = settings.length;
              if (tab === 'Admins') count = admins.length;

              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setSearchQuery('');
                  }}
                  className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#6366F1] text-white shadow-xs'
                      : 'text-[#9CA3AF] hover:text-[#F8FAFC] hover:bg-[#1A1D32]'
                  }`}
                >
                  <span>{tab}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold transition-all ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-[#1A1D32] text-[#9CA3AF]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Toolbar: Search & Action buttons */}
          <div className="flex items-center flex-wrap gap-2">
            {(activeTab === 'Courses' || activeTab === 'Purchases') && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeTab.toLowerCase()}...`}
                  className="pl-8 pr-3 py-1.5 text-xs bg-[#040515] border border-[#252A3D] rounded-xl text-[#D1D5DB] placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] w-44 sm:w-52"
                />
              </div>
            )}

            {activeTab === 'Courses' && (
              <button
                type="button"
                onClick={onOpenAddCourse}
                className="flex items-center space-x-1 px-3 py-1.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-xl text-xs font-semibold transition shadow-md shadow-[#6366F1]/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Row</span>
              </button>
            )}

            <button
              type="button"
              onClick={onRefresh}
              className="p-1.5 bg-[#1A1D32] hover:bg-[#252A3D] text-[#9CA3AF] hover:text-[#F8FAFC] border border-[#30354D] rounded-xl transition"
              title="Refresh sheet data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 1. COURSES TAB */}
        {activeTab === 'Courses' && (
          <div className="overflow-x-auto">
            <div className="p-2.5 px-4 bg-[#0B0D1F] border-b border-[#252A3D] text-[11px] text-[#9CA3AF] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                <span>
                  Google Sheets Course Records: <strong className="text-[#F8FAFC]">{courses.length} courses</strong> available
                  {searchQuery && ` (filtered: ${filteredCourses.length})`}
                </span>
              </div>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0B0D1F] text-[#9CA3AF] font-semibold border-b border-[#252A3D] uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-semibold">Thumbnail</th>
                  <th className="py-3.5 px-4 font-semibold">Course ID</th>
                  <th className="py-3.5 px-4 font-semibold">Course Name</th>
                  <th className="py-3.5 px-4 font-semibold">Creator</th>
                  <th className="py-3.5 px-4 font-semibold">Price</th>
                  <th className="py-3.5 px-4 font-semibold">Size</th>
                  <th className="py-3.5 px-4 font-semibold">Language</th>
                  <th className="py-3.5 px-4 font-semibold">Google Drive Link</th>
                  <th className="py-3.5 px-4 font-semibold">Secret ZIP Password</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Created At</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252A3D] text-[#D1D5DB]">
                {filteredCourses.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-[#6B7280]">
                      {courses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <p className="text-sm font-semibold text-[#F8FAFC]">No courses in store yet</p>
                          <p className="text-xs text-[#9CA3AF] max-w-sm">
                            Click <span className="font-semibold text-[#6366F1]">"+ Add Row"</span> above to add your first course with Google Drive link and ZIP password.
                          </p>
                        </div>
                      ) : (
                        <span>No courses found matching "{searchQuery}"</span>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredCourses.map(c => (
                    <tr key={c.courseId} className="hover:bg-[#1A1D32]/50 transition-colors">
                      <td className="py-3.5 px-4">
                        {c.thumbnailUrl ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-12 h-9 rounded-lg overflow-hidden border border-[#252A3D] bg-[#0B0D1F] shrink-0 flex items-center justify-center shadow-2xs">
                              <img
                                src={c.thumbnailUrl}
                                alt={c.courseName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            </div>
                            <span className="text-[10px] text-[#6B7280] font-mono truncate max-w-[80px]" title={c.thumbnailUrl}>
                              {c.thumbnailUrl.startsWith('http') ? 'Web URL' : 'Local'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#6B7280] italic">No image</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#875CE9]">
                        {c.courseId}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#FFFFFF]">
                        {c.courseName}
                      </td>
                      <td className="py-3.5 px-4 text-[#9CA3AF]">
                        {c.creatorName}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-[#22C55E]">₹{c.price}</span>
                        <span className="text-[#6B7280] text-[10px] line-through ml-1.5">₹{c.originalPrice}</span>
                      </td>
                      <td className="py-3.5 px-4 text-[#9CA3AF] font-mono text-[11px]">
                        {c.courseSize}
                      </td>
                      <td className="py-3.5 px-4 text-[#9CA3AF]">
                        {c.language}
                      </td>
                      <td className="py-3.5 px-4">
                        <a
                          href={c.driveLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#875CE9] hover:text-[#6366F1] hover:underline flex items-center space-x-1 font-mono text-[11px]"
                          title={c.driveLink}
                        >
                          <span className="truncate max-w-[130px]">{c.driveLink}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5">
                          <code className="px-2 py-0.5 rounded-md bg-[#040515] text-[#F59E0B] border border-[#30354D] font-mono text-[11px] font-semibold">
                            {showPasswords[c.courseId] ? c.zipPassword : '••••••••••••'}
                          </code>
                          <button
                            onClick={() => togglePassword(c.courseId)}
                            className="p-1 text-[#9CA3AF] hover:text-[#F8FAFC] transition"
                            title={showPasswords[c.courseId] ? 'Hide password' : 'Show password'}
                          >
                            {showPasswords[c.courseId] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            c.status.toLowerCase() === 'active'
                              ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'
                              : 'bg-[#1A1D32] text-[#9CA3AF] border-[#30354D]'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#6B7280] font-mono text-[11px]">
                        {c.createdAt}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => onEditCourse(c)}
                            className="px-2.5 py-1 bg-[#1A1D32] hover:bg-[#252A3D] text-[#E5E7EB] hover:text-[#FFFFFF] border border-[#30354D] hover:border-[#6366F1]/50 rounded-lg text-xs font-semibold transition"
                            title="Edit course details & Image Thumbnail Path"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setCourseToDelete(c)}
                            className="px-2 py-1 bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] border border-[#EF4444]/30 rounded-lg text-xs font-semibold transition flex items-center space-x-1"
                            title="Delete course from store"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. PURCHASES TAB */}
        {activeTab === 'Purchases' && (
          <div className="overflow-x-auto">
            <div className="p-3 bg-[#0B0D1F] border-b border-[#252A3D] text-[11px] text-[#9CA3AF] flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-[#6366F1]" />
                <span>Strict verification rule: Verified by Telegram User ID + Course ID. <strong className="text-[#F8FAFC]">NO Order ID / NO UTR</strong> needed.</span>
              </span>
              <span className="font-semibold text-[#6B7280]">{filteredPurchases.length} total entries</span>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0B0D1F] text-[#9CA3AF] font-semibold border-b border-[#252A3D] uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-semibold">Telegram User ID</th>
                  <th className="py-3.5 px-4 font-semibold">Username</th>
                  <th className="py-3.5 px-4 font-semibold">Customer</th>
                  <th className="py-3.5 px-4 font-semibold">Course</th>
                  <th className="py-3.5 px-4 font-semibold">Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Payment Proof</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Submitted At</th>
                  <th className="py-3.5 px-4 font-semibold">Approved By</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252A3D] text-[#D1D5DB]">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-[#6B7280]">
                      No purchase records found
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((p, i) => (
                    <tr key={i} className="hover:bg-[#1A1D32]/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#875CE9]">
                        {p.telegramUserId}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#D1D5DB]">
                        @{p.telegramUsername || 'anonymous'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#FFFFFF]">
                        {p.customerName}
                      </td>
                      <td className="py-3.5 px-4 text-[#D1D5DB]">
                        <div className="font-medium text-[#FFFFFF]">{p.courseName}</div>
                        <div className="text-[10px] text-[#6B7280] font-mono">ID: {p.courseId}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#22C55E]">
                        ₹{p.amount}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] text-[#875CE9] hover:underline font-medium cursor-pointer" title={p.paymentScreenshotFileId}>
                          📸 View Screenshot
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            p.status === 'PAID'
                              ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'
                              : p.status === 'PAYMENT_SUBMITTED'
                              ? 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30 font-semibold animate-pulse'
                              : p.status === 'REJECTED'
                              ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                              : 'bg-[#1A1D32] text-[#9CA3AF] border-[#30354D]'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#6B7280] font-mono text-[11px]">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-[#6B7280] text-[11px]">
                        {p.approvedBy ? `Admin: ${p.approvedBy}` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {p.status === 'PAYMENT_SUBMITTED' ? (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => onAdminAction(p.telegramUserId, p.courseId, 'APPROVE')}
                              className="px-2.5 py-1 bg-[#22C55E] hover:bg-[#16A34A] text-white rounded-lg text-xs font-bold transition shadow-xs"
                              title="Verify payment and send Google Drive link & ZIP password"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => onAdminAction(p.telegramUserId, p.courseId, 'REJECT')}
                              className="px-2.5 py-1 bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] border border-[#EF4444]/30 rounded-lg text-xs font-bold transition"
                              title="Reject submission"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[#6B7280] text-[11px] italic">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. SETTINGS TAB */}
        {activeTab === 'Settings' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0B0D1F] text-[#9CA3AF] font-semibold border-b border-[#252A3D] uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-semibold w-1/3">Setting Key</th>
                  <th className="py-3.5 px-4 font-semibold w-2/3">Setting Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252A3D] text-[#D1D5DB]">
                {settings.map(s => (
                  <tr key={s.key} className="hover:bg-[#1A1D32]/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#875CE9]">
                      {s.key}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#D1D5DB]">
                      {s.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. ADMINS TAB */}
        {activeTab === 'Admins' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0B0D1F] text-[#9CA3AF] font-semibold border-b border-[#252A3D] uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-semibold">Telegram Numeric ID</th>
                  <th className="py-3.5 px-4 font-semibold">Admin Name</th>
                  <th className="py-3.5 px-4 font-semibold">Role</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252A3D] text-[#D1D5DB]">
                {admins.map(a => (
                  <tr key={a.telegramId} className="hover:bg-[#1A1D32]/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#875CE9]">
                      {a.telegramId}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#FFFFFF]">
                      {a.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-[#1A1D32] text-[#875CE9] border border-[#30354D] text-[10px] font-bold">
                        {a.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Course Confirmation Modal */}
      {courseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040515]/80 backdrop-blur-xs">
          <div className="bg-[#111426] border border-[#252A3D] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#252A3D] flex items-center justify-between bg-[#0B0D1F]">
              <div className="flex items-center space-x-2.5">
                <span className="p-2 rounded-xl bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                  <Trash2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-[#FFFFFF] text-sm sm:text-base">Delete Course</h3>
                  <p className="text-xs text-[#EF4444] font-medium">Remove from catalog & Google Sheets</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCourseToDelete(null)}
                disabled={isDeleting}
                className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#F8FAFC] hover:bg-[#1A1D32] transition"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Are you sure you want to delete this course? It will be permanently removed from your active catalog and will no longer appear in Telegram searches.
              </p>

              {/* Course Card Summary */}
              <div className="p-3 bg-[#0B0D1F] border border-[#252A3D] rounded-xl flex items-center space-x-3">
                {courseToDelete.thumbnailUrl ? (
                  <div className="w-14 h-12 rounded-lg overflow-hidden border border-[#252A3D] bg-[#040515] shrink-0 flex items-center justify-center">
                    <img
                      src={courseToDelete.thumbnailUrl}
                      alt={courseToDelete.courseName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-14 h-12 rounded-lg border border-[#252A3D] bg-[#040515] flex items-center justify-center text-[#6B7280] text-[10px] shrink-0 italic">
                    No Image
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-mono font-bold text-[#875CE9] bg-[#1A1D32] px-1.5 py-0.5 rounded border border-[#30354D]">
                      {courseToDelete.courseId}
                    </span>
                    <span className="text-xs font-bold text-[#FFFFFF] truncate">
                      {courseToDelete.courseName}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#9CA3AF] mt-1 flex items-center space-x-2">
                    <span>By {courseToDelete.creatorName}</span>
                    <span>•</span>
                    <span className="font-extrabold text-[#22C55E]">₹{courseToDelete.price}</span>
                    <span>•</span>
                    <span className="font-mono text-[10px] text-[#6B7280]">{courseToDelete.courseSize}</span>
                  </div>
                </div>
              </div>

              {/* Warning note */}
              <div className="p-3 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl text-[11px] text-[#F59E0B] flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                <span>
                  Existing approved customer purchase records in history will not be lost.
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-[#0B0D1F] border-t border-[#252A3D] flex items-center justify-end space-x-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setCourseToDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#1A1D32] border border-[#30354D] text-[#E5E7EB] hover:bg-[#252A3D] hover:text-[#FFFFFF] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Course'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
