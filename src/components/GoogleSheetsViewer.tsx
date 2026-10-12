import React, { useState, useMemo } from 'react';
import { Sheet, Plus, CheckCircle, XCircle, Clock, Key, Shield, User, ExternalLink, RefreshCw, Search, Eye, EyeOff, AlertCircle, Trash2, X, AlertTriangle, FileSpreadsheet, Copy, Database, Edit3, Power, Users } from 'lucide-react';
import { Course, Purchase, AdminUser, SettingItem } from '../types/index.js';
import { AddAdminModal } from './AddAdminModal.js';

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

  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [adminToEdit, setAdminToEdit] = useState<AdminUser | null>(null);
  const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null);
  const [isDeletingAdmin, setIsDeletingAdmin] = useState(false);
  const [adminToToggle, setAdminToToggle] = useState<AdminUser | null>(null);
  const [isTogglingAdmin, setIsTogglingAdmin] = useState(false);

  // Memoized search tokens to avoid re-splitting and re-lowercasing on every item
  const searchTokens = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return q ? q.split(/\s+/).filter(Boolean) : [];
  }, [searchQuery]);

  // High-performance filtered courses: O(1) identity return when query is empty
  const filteredCourses = useMemo(() => {
    if (searchTokens.length === 0) return courses;
    return courses.filter(c => {
      const name = (c.courseName || '').toLowerCase();
      const creator = (c.creatorName || '').toLowerCase();
      const id = (c.courseId || '').toLowerCase();
      const desc = (c.description || '').toLowerCase();
      return searchTokens.every(tok => 
        name.includes(tok) || creator.includes(tok) || id.includes(tok) || desc.includes(tok)
      );
    });
  }, [courses, searchTokens]);

  // High-performance filtered purchases
  const filteredPurchases = useMemo(() => {
    if (searchTokens.length === 0) return purchases;
    return purchases.filter(p => {
      const course = (p.courseName || '').toLowerCase();
      const userId = (p.telegramUserId || '').toLowerCase();
      const username = (p.telegramUsername || '').toLowerCase();
      const status = (p.status || '').toLowerCase();
      const customer = (p.customerName || '').toLowerCase();
      return searchTokens.every(tok =>
        course.includes(tok) || userId.includes(tok) || username.includes(tok) || status.includes(tok) || customer.includes(tok)
      );
    });
  }, [purchases, searchTokens]);

  // Pre-calculate count of owners to avoid O(N) array filtering on every admin row
  const ownerCount = useMemo(() => admins.filter(x => x.role === 'Owner').length, [admins]);

  // High-performance filtered admins
  const filteredAdmins = useMemo(() => {
    if (searchTokens.length === 0) return admins;
    return admins.filter(a => {
      const name = (a.name || '').toLowerCase();
      const tid = (a.telegramId || '').toLowerCase();
      const username = (a.username || '').toLowerCase();
      const role = (a.role || '').toLowerCase();
      const status = (a.status || '').toLowerCase();
      return searchTokens.every(tok =>
        name.includes(tok) || tid.includes(tok) || username.includes(tok) || role.includes(tok) || status.includes(tok)
      );
    });
  }, [admins, searchTokens]);

  const isPrimaryOwnerAdmin = (admin: AdminUser): boolean => {
    return Boolean(
      (admin.role === 'Owner' && admin.adminId === 'ADM-1') ||
      (sheetsStatus?.sheetId && admin.role === 'Owner' && ownerCount <= 1)
    );
  };

  const handleConfirmDeleteAdmin = async () => {
    if (!adminToDelete) return;
    setIsDeletingAdmin(true);
    try {
      const res = await fetch(`/api/admins/${adminToDelete.telegramId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDeleteToast(`Admin "${adminToDelete.name}" deleted successfully.`);
        setTimeout(() => setDeleteToast(null), 4000);
        onRefresh();
      } else {
        alert(data.error || 'Failed to delete admin');
      }
    } catch (err: any) {
      alert(`Error deleting admin: ${err.message}`);
    } finally {
      setIsDeletingAdmin(false);
      setAdminToDelete(null);
    }
  };

  const handleConfirmToggleAdmin = async () => {
    if (!adminToToggle) return;
    setIsTogglingAdmin(true);
    const newStatus = adminToToggle.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await fetch(`/api/admins/${adminToToggle.telegramId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setDeleteToast(`Admin "${adminToToggle.name}" marked as ${newStatus}.`);
        setTimeout(() => setDeleteToast(null), 4000);
        onRefresh();
      } else {
        alert(data.error || 'Failed to update admin');
      }
    } catch (err: any) {
      alert(`Error updating admin: ${err.message}`);
    } finally {
      setIsTogglingAdmin(false);
      setAdminToToggle(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification Banner with Clay Style */}
      {deleteToast && (
        <div 
          className="p-4 bg-emerald-50/95 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center justify-between shadow-md animate-in fade-in duration-200"
          style={{
            boxShadow: '0 8px 20px -4px rgba(5, 150, 105, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.9)'
          }}
        >
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
              <CheckCircle className="w-4 h-4 shrink-0" />
            </div>
            <span>{deleteToast}</span>
          </div>
          <button
            onClick={() => setDeleteToast(null)}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl transition"
            aria-label="Dismiss toast"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Google Sheets Connection Diagnostics Card with Clay Elevation */}
      <div className="clay-card p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div 
              className="p-3 rounded-2xl shrink-0 text-white"
              style={{
                background: sheetsStatus?.connected 
                  ? 'linear-gradient(180deg, #10B981 0%, #059669 100%)' 
                  : 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)',
                boxShadow: '0 6px 14px -2px rgba(35, 45, 65, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.4)'
              }}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  {sheetsStatus?.connected
                    ? 'Google Sheets Live Database Synced'
                    : 'Google Sheets Connection Status'}
                </h3>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${
                  sheetsStatus?.connected
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {sheetsStatus?.connected ? 'Connected' : 'Permission Required'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                {sheetsStatus?.connected
                  ? 'Connected directly to your Google Sheet. Real-time synchronization active for Courses, Purchases, Settings, and Admins.'
                  : (sheetsStatus?.lastSyncError || 'Google Sheet not yet accessible by Service Account. Share the spreadsheet with your service account email as Editor.')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0 self-end md:self-center">
            {sheetsStatus?.sheetId && sheetsStatus.sheetId !== 'Not configured' && (
              <a
                href={`https://docs.google.com/spreadsheets/d/${sheetsStatus.sheetId}/edit`}
                target="_blank"
                rel="noreferrer"
                className="clay-btn-secondary px-3.5 py-2 text-xs font-bold space-x-1.5"
              >
                <span>Open Sheet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={handleReconnect}
              disabled={isReconnecting}
              className="clay-btn-primary px-4 py-2 text-xs font-bold space-x-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
              <span>{isReconnecting ? 'Testing...' : 'Test / Reconnect'}</span>
            </button>
          </div>
        </div>

        {/* If not connected, show quick 2-step resolution box */}
        {!sheetsStatus?.connected && (
          <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            <div className="p-3.5 bg-[#F8FAFD] border border-slate-200/80 rounded-2xl space-y-2 shadow-2xs">
              <span className="font-bold text-slate-900 flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] flex items-center justify-center font-bold">1</span>
                <span>Share Google Sheet with Service Account</span>
              </span>
              <p className="text-[11px] text-slate-500">
                Click <strong className="text-slate-800">Share</strong> in your Google Sheet and add this email as <strong className="text-slate-800">Editor</strong>:
              </p>
              <div className="flex items-center space-x-2 bg-white border border-slate-200 p-2 rounded-xl">
                <span className="font-mono text-[11px] text-slate-700 truncate flex-1 select-all">
                  {sheetsStatus?.serviceAccount || 'course-bazar-sheets@course-bazar-bot.iam.gserviceaccount.com'}
                </span>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="clay-btn-secondary px-2.5 py-1 text-[10px] font-bold space-x-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedEmail ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="p-3.5 bg-[#F8FAFD] border border-slate-200/80 rounded-2xl space-y-2 shadow-2xs">
              <span className="font-bold text-slate-900 flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] flex items-center justify-center font-bold">2</span>
                <span>Set Spreadsheet ID & Reconnect</span>
              </span>
              <p className="text-[11px] text-slate-500">
                Copy the ID from your sheet's URL (between <code className="text-indigo-600 font-bold font-mono">/d/</code> and <code className="text-indigo-600 font-bold font-mono">/edit</code>):
              </p>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={customSheetId}
                  onChange={(e) => setCustomSheetId(e.target.value)}
                  placeholder="Paste Google Sheet ID..."
                  className="clay-input font-mono text-[11px] px-3 py-1.5 flex-1 text-slate-800 placeholder-slate-400"
                />
                <button
                  type="button"
                  onClick={handleReconnect}
                  disabled={isReconnecting || !customSheetId.trim()}
                  className="clay-btn-primary px-3.5 py-1.5 text-xs font-bold disabled:opacity-50 shrink-0"
                >
                  {isReconnecting ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </div>
          </div>
        )}

        {reconnectMsg && (
          <div className={`mt-4 p-3 rounded-2xl text-xs font-bold flex items-center space-x-2.5 border shadow-2xs ${
            reconnectMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {reconnectMsg.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{reconnectMsg.text}</span>
          </div>
        )}
      </div>

      {/* Table Card Container with Clay Elevation */}
      <div className="clay-card overflow-hidden">
        {/* Controls Toolbar: Tab switcher + Search + Actions */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FFFFFF]">
          {/* Segmented Sheet Tabs in Sunken Clay Track */}
          <div className="flex clay-inset p-1.5 rounded-2xl w-fit flex-wrap gap-1">
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
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'clay-pill-active'
                      : 'clay-pill-inactive'
                  }`}
                >
                  <span>{tab}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-all shadow-2xs ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Toolbar: Search & Action buttons */}
          <div className="flex items-center flex-wrap gap-2.5">
            {(activeTab === 'Courses' || activeTab === 'Purchases' || activeTab === 'Admins') && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeTab.toLowerCase()}...`}
                  className="clay-input pl-9 pr-3.5 py-2 text-xs w-44 sm:w-56 font-medium"
                />
              </div>
            )}

            {activeTab === 'Courses' && (
              <button
                type="button"
                onClick={onOpenAddCourse}
                className="clay-btn-primary px-3.5 py-2 text-xs font-bold space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Row</span>
              </button>
            )}

            {activeTab === 'Admins' && (
              <button
                type="button"
                onClick={() => {
                  setAdminToEdit(null);
                  setIsAddAdminOpen(true);
                }}
                className="clay-btn-primary px-3.5 py-2 text-xs font-bold space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Admin</span>
              </button>
            )}

            <button
              type="button"
              onClick={onRefresh}
              className="clay-btn-secondary p-2"
              title="Refresh sheet data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 1. COURSES TAB */}
        {activeTab === 'Courses' && (
          <div className="overflow-x-auto">
            <div className="p-2.5 px-4 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  Google Sheets Course Records: <strong className="text-slate-800">{courses.length} courses</strong> available
                  {searchQuery && ` (filtered: ${filteredCourses.length})`}
                </span>
              </div>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
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
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCourses.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      {courses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <p className="text-sm font-semibold text-slate-800">No courses in store yet</p>
                          <p className="text-xs text-slate-500 max-w-sm">
                            Click <span className="font-semibold text-indigo-600">"+ Add Row"</span> above to add your first course with Google Drive link and ZIP password.
                          </p>
                        </div>
                      ) : (
                        <span>No courses found matching "{searchQuery}"</span>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredCourses.map(c => (
                    <tr key={c.courseId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        {c.thumbnailUrl ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-12 h-9 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 flex items-center justify-center shadow-2xs">
                              <img
                                src={c.thumbnailUrl}
                                alt={c.courseName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono truncate max-w-[80px]" title={c.thumbnailUrl}>
                              {c.thumbnailUrl.startsWith('http') ? 'Web URL' : 'Local'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No image</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                        {c.courseId}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {c.courseName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {c.creatorName}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-emerald-600">₹{c.price}</span>
                        <span className="text-slate-400 text-[10px] line-through ml-1.5">₹{c.originalPrice}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        {c.courseSize}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {c.language}
                      </td>
                      <td className="py-3.5 px-4">
                        <a
                          href={c.driveLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 hover:underline flex items-center space-x-1 font-mono text-[11px]"
                          title={c.driveLink}
                        >
                          <span className="truncate max-w-[130px]">{c.driveLink}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5">
                          <code className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-mono text-[11px] font-semibold">
                            {showPasswords[c.courseId] ? c.zipPassword : '••••••••••••'}
                          </code>
                          <button
                            onClick={() => togglePassword(c.courseId)}
                            className="p-1 text-slate-400 hover:text-slate-700 transition"
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
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {c.createdAt}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => onEditCourse(c)}
                            className="clay-btn-secondary px-3 py-1.5 text-xs font-bold"
                            title="Edit course details & Image Thumbnail Path"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setCourseToDelete(c)}
                            className="clay-btn-danger px-3 py-1.5 text-xs font-bold space-x-1"
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
            <div className="p-3 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                <span>Strict verification rule: Verified by Telegram User ID + Course ID. <strong className="text-slate-800">NO Order ID / NO UTR</strong> needed.</span>
              </span>
              <span className="font-semibold text-slate-500">{filteredPurchases.length} total entries</span>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
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
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      No purchase records found
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                        {p.telegramUserId}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        @{p.telegramUsername || 'anonymous'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {p.customerName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="font-medium text-slate-900">{p.courseName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {p.courseId}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600">
                        ₹{p.amount}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] text-indigo-600 hover:underline font-medium cursor-pointer" title={p.paymentScreenshotFileId}>
                          📸 View Screenshot
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            p.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : p.status === 'PAYMENT_SUBMITTED'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 font-semibold animate-pulse'
                              : p.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {p.approvedBy ? `Admin: ${p.approvedBy}` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {p.status === 'PAYMENT_SUBMITTED' ? (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => onAdminAction(p.telegramUserId, p.courseId, 'APPROVE')}
                              className="clay-btn-success px-3.5 py-1.5 text-xs font-bold"
                              title="Verify payment and send Google Drive link & ZIP password"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => onAdminAction(p.telegramUserId, p.courseId, 'REJECT')}
                              className="clay-btn-danger px-3.5 py-1.5 text-xs font-bold"
                              title="Reject submission"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Processed</span>
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
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-semibold w-1/3">Setting Key</th>
                  <th className="py-3.5 px-4 font-semibold w-2/3">Setting Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {settings.map(s => (
                  <tr key={s.key} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                      {s.key}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
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
            <div className="p-3 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                <span>Google Sheets <code>Admins</code> Worksheet: Authenticated via <b>Telegram Numeric User ID</b>.</span>
              </span>
              <span className="font-semibold text-slate-500">
                {filteredAdmins.length} admins ({filteredAdmins.filter(a => a.status === 'Active').length} active)
              </span>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-semibold">Admin ID</th>
                  <th className="py-3.5 px-4 font-semibold">Admin Name</th>
                  <th className="py-3.5 px-4 font-semibold">Telegram Numeric ID</th>
                  <th className="py-3.5 px-4 font-semibold">Username</th>
                  <th className="py-3.5 px-4 font-semibold">Role</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Added By</th>
                  <th className="py-3.5 px-4 font-semibold">Date Added</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No admin records found
                    </td>
                  </tr>
                ) : (
                  filteredAdmins.map(a => {
                    const isPrimary = isPrimaryOwnerAdmin(a);
                    const isActive = a.status === 'Active';
                    return (
                      <tr key={a.telegramId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                          {a.adminId || 'ADM'}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          <div className="flex items-center space-x-1.5">
                            <span>{a.name}</span>
                            {isPrimary && (
                              <span className="text-[9px] uppercase px-1 py-0.2 rounded-sm bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                                Owner
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                          {a.telegramId}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          {a.username ? `@${a.username}` : '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            a.role === 'Owner'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-sky-50 text-sky-700 border-sky-200'
                          }`}>
                            {a.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {a.addedBy || 'System'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                          {a.createdAt || '2026-10-01'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => {
                                setAdminToEdit(a);
                                setIsAddAdminOpen(true);
                              }}
                              className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg text-xs font-semibold transition shadow-xs"
                              title="Edit admin"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              disabled={isPrimary}
                              onClick={() => setAdminToToggle(a)}
                              className={`p-1.5 rounded-lg border transition ${
                                isPrimary
                                  ? 'opacity-30 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                                  : isActive
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              }`}
                              title={isPrimary ? 'Primary owner cannot be deactivated' : isActive ? 'Deactivate' : 'Activate'}
                            >
                              <Power className="w-3 h-3" />
                            </button>
                            <button
                              disabled={isPrimary}
                              onClick={() => setAdminToDelete(a)}
                              className={`p-1.5 rounded-lg border transition ${
                                isPrimary
                                  ? 'opacity-30 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                              }`}
                              title={isPrimary ? 'Primary owner cannot be removed' : 'Delete admin from Google Sheets'}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Admin Modal */}
      <AddAdminModal
        isOpen={isAddAdminOpen}
        onClose={() => {
          setIsAddAdminOpen(false);
          setAdminToEdit(null);
        }}
        onAdminSaved={() => {
          onRefresh();
          setDeleteToast(adminToEdit ? 'Admin details updated successfully!' : 'New admin registered to Google Sheets!');
          setTimeout(() => setDeleteToast(null), 4000);
        }}
        adminToEdit={adminToEdit}
      />

      {/* Delete Admin Confirmation Modal */}
      {adminToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs">
          <div 
            className="bg-white border border-slate-200/80 rounded-[28px] max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            style={{
              boxShadow: '0 25px 50px -12px rgba(35, 45, 65, 0.25), inset 0 1px 1px rgba(255, 255, 255, 1)'
            }}
          >
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">Delete Admin</h3>
                  <p className="text-xs text-rose-600 font-medium">Remove from Admins worksheet</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdminToDelete(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Are you sure you want to delete admin <b className="text-slate-900">{adminToDelete.name}</b> (Telegram ID: <code className="text-indigo-600 font-bold font-mono">{adminToDelete.telegramId}</code>)?
              </p>
            </div>
            <div className="p-4 sm:p-5 bg-[#F8FAFD] border-t border-slate-100 flex items-center justify-end space-x-2.5">
              <button
                type="button"
                disabled={isDeletingAdmin}
                onClick={() => setAdminToDelete(null)}
                className="clay-btn-secondary px-4 py-2 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingAdmin}
                onClick={handleConfirmDeleteAdmin}
                className="clay-btn-danger px-4 py-2 text-xs font-bold space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingAdmin ? 'Deleting...' : 'Delete Admin'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Status Confirmation Modal */}
      {adminToToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs">
          <div 
            className="bg-white border border-slate-200/80 rounded-[28px] max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            style={{
              boxShadow: '0 25px 50px -12px rgba(35, 45, 65, 0.25), inset 0 1px 1px rgba(255, 255, 255, 1)'
            }}
          >
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center space-x-3">
                <div className={`p-2.5 rounded-2xl border shadow-2xs ${
                  adminToToggle.status === 'Active'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  <Power className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">
                    {adminToToggle.status === 'Active' ? 'Deactivate Admin' : 'Activate Admin'}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {adminToToggle.status === 'Active' ? 'Suspend payment verification permissions' : 'Enable payment verification permissions'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdminToToggle(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {adminToToggle.status === 'Active'
                  ? `Deactivate ${adminToToggle.name}? They will no longer receive payment notifications or be allowed to approve/reject payments.`
                  : `Activate ${adminToToggle.name}? They will resume receiving payment notifications and can approve/reject payments.`}
              </p>
            </div>
            <div className="p-4 sm:p-5 bg-[#F8FAFD] border-t border-slate-100 flex items-center justify-end space-x-2.5">
              <button
                type="button"
                disabled={isTogglingAdmin}
                onClick={() => setAdminToToggle(null)}
                className="clay-btn-secondary px-4 py-2 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isTogglingAdmin}
                onClick={handleConfirmToggleAdmin}
                className={`px-4 py-2 text-xs font-bold space-x-1.5 ${
                  adminToToggle.status === 'Active' ? 'clay-btn-danger' : 'clay-btn-success'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{isTogglingAdmin ? 'Updating...' : adminToToggle.status === 'Active' ? 'Deactivate' : 'Activate'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Course Confirmation Modal */}
      {courseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs">
          <div 
            className="bg-white border border-slate-200/80 rounded-[28px] max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            style={{
              boxShadow: '0 25px 50px -12px rgba(35, 45, 65, 0.25), inset 0 1px 1px rgba(255, 255, 255, 1)'
            }}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">Delete Course</h3>
                  <p className="text-xs text-rose-600 font-medium">Remove from catalog & Google Sheets</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCourseToDelete(null)}
                disabled={isDeleting}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Are you sure you want to delete this course? It will be permanently removed from your active catalog and will no longer appear in Telegram searches.
              </p>

              {/* Course Card Summary in Clay Container */}
              <div className="p-3.5 bg-[#F8FAFD] border border-slate-200/80 rounded-2xl flex items-center space-x-3.5 shadow-2xs">
                {courseToDelete.thumbnailUrl ? (
                  <div className="w-14 h-12 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0 flex items-center justify-center shadow-2xs">
                    <img
                      src={courseToDelete.thumbnailUrl}
                      alt={courseToDelete.courseName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-14 h-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-400 text-[10px] shrink-0 font-medium">
                    No Image
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                      {courseToDelete.courseId}
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {courseToDelete.courseName}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-2 font-medium">
                    <span>By {courseToDelete.creatorName}</span>
                    <span>•</span>
                    <span className="font-extrabold text-emerald-700">₹{courseToDelete.price}</span>
                    <span>•</span>
                    <span className="font-mono text-[10px] text-slate-400">{courseToDelete.courseSize}</span>
                  </div>
                </div>
              </div>

              {/* Warning note */}
              <div className="p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-2xl text-[11px] text-amber-900 flex items-start space-x-2.5 font-medium shadow-2xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Existing approved customer purchase records in history will not be lost.
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 sm:p-5 bg-[#F8FAFD] border-t border-slate-100 flex items-center justify-end space-x-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setCourseToDelete(null)}
                className="clay-btn-secondary px-4 py-2 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="clay-btn-danger px-4 py-2 text-xs font-bold space-x-1.5"
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
