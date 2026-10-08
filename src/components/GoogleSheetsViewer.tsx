import React, { useState } from 'react';
import { Sheet, Plus, CheckCircle, XCircle, Clock, Key, Shield, User, ExternalLink, RefreshCw, Search, Eye, EyeOff, AlertCircle, Trash2, X, AlertTriangle, Download, FileSpreadsheet } from 'lucide-react';
import { Course, Purchase, AdminUser, SettingItem } from '../types/index.js';

interface GoogleSheetsViewerProps {
  courses: Course[];
  purchases: Purchase[];
  settings: SettingItem[];
  admins: AdminUser[];
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
  const [exportToast, setExportToast] = useState<string | null>(null);

  const togglePassword = (courseId: string) => {
    setShowPasswords(prev => ({ ...prev, [courseId]: !prev[courseId] }));
  };

  const handleExportCSV = (exportAll = false) => {
    const targetCourses = (exportAll || !searchQuery.trim()) ? courses : filteredCourses;

    if (targetCourses.length === 0) {
      setExportToast('No courses found to export.');
      setTimeout(() => setExportToast(null), 3000);
      return;
    }

    try {
      const headers = [
        'Course ID',
        'Course Name',
        'Creator Name',
        'Original Price',
        'Selling Price',
        'File Size',
        'Language',
        'Google Drive Link',
        'Zip Password',
        'Thumbnail URL',
        'Description',
        'Status',
        'Upload Date'
      ];

      const escapeCell = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val);
        return `"${str.replace(/"/g, '""')}"`;
      };

      const rows = targetCourses.map(c => [
        escapeCell(c.courseId),
        escapeCell(c.courseName),
        escapeCell(c.creatorName),
        escapeCell(c.originalPrice),
        escapeCell(c.price),
        escapeCell(c.courseSize),
        escapeCell(c.language),
        escapeCell(c.driveLink),
        escapeCell(c.zipPassword),
        escapeCell(c.thumbnailUrl || ''),
        escapeCell(c.description || ''),
        escapeCell(c.status),
        escapeCell(c.createdAt)
      ]);

      // Prepend UTF-8 BOM so Excel & Sheets open unicode characters correctly
      const csvString = '\uFEFF' + [
        headers.map(h => `"${h}"`).join(','),
        ...rows.map(r => r.join(','))
      ].join('\r\n');

      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const now = new Date();
      const dateStamp = now.toISOString().split('T')[0];
      const filename = `courses_backup_${dateStamp}.csv`;

      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const count = targetCourses.length;
      setExportToast(`Exported ${count} ${count === 1 ? 'course' : 'courses'} to "${filename}" successfully.`);
      setTimeout(() => setExportToast(null), 4000);
    } catch (err: any) {
      console.error('Failed to export courses CSV:', err);
      setExportToast(`Error exporting CSV: ${err.message || 'Unknown error'}`);
      setTimeout(() => setExportToast(null), 4000);
    }
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
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{deleteToast}</span>
          </div>
          <button
            onClick={() => setDeleteToast(null)}
            className="text-emerald-600 hover:text-emerald-900 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {exportToast && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>{exportToast}</span>
          </div>
          <button
            onClick={() => setExportToast(null)}
            className="text-blue-600 hover:text-blue-900 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Table Card Container */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {/* Controls Toolbar: Tab switcher + Search + Actions */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-slate-50/50">
          {/* Segmented Sheet Tabs */}
          <div className="flex bg-slate-200/70 p-1 rounded-xl w-fit">
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
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{tab}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-slate-300/60 text-slate-600'
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
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeTab.toLowerCase()}...`}
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-44 sm:w-52"
                />
              </div>
            )}

            {activeTab === 'Courses' && (
              <>
                {searchQuery.trim() && filteredCourses.length !== courses.length ? (
                  <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-xl p-0.5 shadow-xs">
                    <button
                      type="button"
                      onClick={() => handleExportCSV(false)}
                      className="flex items-center space-x-1 px-2.5 py-1 text-slate-700 hover:text-blue-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition"
                      title={`Export current ${filteredCourses.length} filtered courses to CSV`}
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>Export Filtered ({filteredCourses.length})</span>
                    </button>
                    <div className="w-[1px] h-4 bg-slate-200" />
                    <button
                      type="button"
                      onClick={() => handleExportCSV(true)}
                      className="px-2 py-1 text-slate-600 hover:text-slate-900 text-xs font-semibold rounded-lg hover:bg-slate-50 transition"
                      title={`Export all ${courses.length} courses for full backup`}
                    >
                      <span>All ({courses.length})</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleExportCSV(false)}
                    disabled={courses.length === 0}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition shadow-xs hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Export current course list as CSV file for backup"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>Export CSV</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onOpenAddCourse}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Row</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onRefresh}
              className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition"
              title="Refresh sheet data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 1. COURSES TAB */}
        {activeTab === 'Courses' && (
          <div className="overflow-x-auto">
            <div className="p-2.5 px-4 bg-slate-50/70 border-b border-slate-100 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>
                  Google Sheets Course Records: <strong>{courses.length} courses</strong> available
                  {searchQuery && ` (filtered: ${filteredCourses.length})`}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-slate-500">
                <button
                  type="button"
                  onClick={() => handleExportCSV(false)}
                  disabled={courses.length === 0}
                  className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-medium hover:underline disabled:opacity-50"
                  title="Download CSV backup file of current course list"
                >
                  <Download className="w-3 h-3" />
                  <span>Download Backup (.csv)</span>
                </button>
              </div>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
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
                    <td colSpan={12} className="py-12 text-center text-slate-500">
                      {courses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <p className="text-sm font-semibold text-slate-700">No courses in store yet</p>
                          <p className="text-xs text-slate-400 max-w-sm">
                            Click <span className="font-semibold text-blue-600">"+ Add Row"</span> above to add your first course with Google Drive link and ZIP password.
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
                            <div className="w-12 h-9 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0 flex items-center justify-center shadow-2xs">
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
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                        {c.courseId}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {c.courseName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {c.creatorName}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-emerald-700">₹{c.price}</span>
                        <span className="text-slate-400 text-[10px] line-through ml-1.5">₹{c.originalPrice}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {c.courseSize}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {c.language}
                      </td>
                      <td className="py-3.5 px-4">
                        <a
                          href={c.driveLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1 font-mono text-[11px]"
                          title={c.driveLink}
                        >
                          <span className="truncate max-w-[130px]">{c.driveLink}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5">
                          <code className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[11px] font-semibold">
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
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => onEditCourse(c)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-lg text-xs font-semibold transition"
                            title="Edit course details & Image Thumbnail Path"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setCourseToDelete(c)}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 rounded-lg text-xs font-semibold transition flex items-center space-x-1"
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
            <div className="p-3 bg-blue-50/60 border-b border-blue-100/80 text-[11px] text-blue-800 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span>Strict verification rule: Verified by Telegram User ID + Course ID. <strong>NO Order ID / NO UTR</strong> needed.</span>
              </span>
              <span className="font-semibold text-slate-500">{filteredPurchases.length} total entries</span>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
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
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                        {p.telegramUserId}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        @{p.telegramUsername || 'anonymous'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {p.customerName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800">
                        <div className="font-medium">{p.courseName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {p.courseId}</div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700">
                        ₹{p.amount}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] text-blue-600 hover:underline font-medium cursor-pointer" title={p.paymentScreenshotFileId}>
                          📸 View Screenshot
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            p.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : p.status === 'PAYMENT_SUBMITTED'
                              ? 'bg-amber-100 text-amber-800 border-amber-300 font-semibold animate-pulse'
                              : p.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {p.approvedBy ? `Admin: ${p.approvedBy}` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {p.status === 'PAYMENT_SUBMITTED' ? (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => onAdminAction(p.telegramUserId, p.courseId, 'APPROVE')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                              title="Verify payment and send Google Drive link & ZIP password"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => onAdminAction(p.telegramUserId, p.courseId, 'REJECT')}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition"
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
                <tr className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-semibold w-1/3">Setting Key</th>
                  <th className="py-3.5 px-4 font-semibold w-2/3">Setting Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {settings.map(s => (
                  <tr key={s.key} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
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
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-semibold">Telegram Numeric ID</th>
                  <th className="py-3.5 px-4 font-semibold">Admin Name</th>
                  <th className="py-3.5 px-4 font-semibold">Role</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {admins.map(a => (
                  <tr key={a.telegramId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                      {a.telegramId}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {a.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                        {a.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200/90 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/70">
              <div className="flex items-center space-x-2.5">
                <span className="p-2 rounded-xl bg-rose-100 text-rose-600 border border-rose-200">
                  <Trash2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Delete Course</h3>
                  <p className="text-xs text-rose-600 font-medium">Remove from catalog & Google Sheets</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCourseToDelete(null)}
                disabled={isDeleting}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to delete this course? It will be permanently removed from your active catalog and will no longer appear in Telegram searches.
              </p>

              {/* Course Card Summary */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-3">
                {courseToDelete.thumbnailUrl ? (
                  <div className="w-14 h-12 rounded-lg overflow-hidden border border-slate-200 bg-white flex-shrink-0 flex items-center justify-center">
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
                  <div className="w-14 h-12 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400 text-[10px] flex-shrink-0 italic">
                    No Image
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      {courseToDelete.courseId}
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {courseToDelete.courseName}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-2">
                    <span>By {courseToDelete.creatorName}</span>
                    <span>•</span>
                    <span className="font-extrabold text-emerald-700">₹{courseToDelete.price}</span>
                    <span>•</span>
                    <span className="font-mono text-[10px] text-slate-400">{courseToDelete.courseSize}</span>
                  </div>
                </div>
              </div>

              {/* Warning note */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  Existing approved customer purchase records in history will not be lost.
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setCourseToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
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
