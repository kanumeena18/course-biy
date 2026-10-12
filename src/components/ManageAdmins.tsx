import React, { useState } from 'react';
import { 
  Users, Shield, UserPlus, Search, Edit3, Trash2, Power, 
  CheckCircle, AlertTriangle, AlertCircle, Copy, Check, Clock, 
  Calendar, RefreshCw, Sparkles, X, ShieldAlert, KeyRound, ExternalLink
} from 'lucide-react';
import { AdminUser, AdminRole } from '../types/index.js';
import { AddAdminModal } from './AddAdminModal.js';
import { authFetch } from '../services/apiClient.js';

interface ManageAdminsProps {
  admins: AdminUser[];
  onRefresh: () => void;
  primaryOwnerTelegramId?: string;
  onShowNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ManageAdmins: React.FC<ManageAdminsProps> = ({
  admins,
  onRefresh,
  primaryOwnerTelegramId,
  onShowNotification
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'Owner' | 'Payment Admin'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Inactive'>('ALL');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [adminToEdit, setAdminToEdit] = useState<AdminUser | null>(null);
  
  // Deletion state
  const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Status toggle confirmation state
  const [adminToToggleStatus, setAdminToToggleStatus] = useState<AdminUser | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isPrimaryOwner = (admin: AdminUser) => {
    return Boolean(
      (primaryOwnerTelegramId && admin.telegramId === primaryOwnerTelegramId) ||
      (admin.role === 'Owner' && admin.adminId === 'ADM-1')
    );
  };

  // Filter admins
  const filteredAdmins = admins.filter(a => {
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery = 
      !query ||
      a.name.toLowerCase().includes(query) ||
      a.telegramId.includes(query) ||
      (a.username && a.username.toLowerCase().includes(query)) ||
      a.role.toLowerCase().includes(query);

    const matchesRole = roleFilter === 'ALL' || a.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;

    return matchesQuery && matchesRole && matchesStatus;
  });

  // KPI counts
  const totalCount = admins.length;
  const activeCount = admins.filter(a => a.status === 'Active').length;
  const ownerCount = admins.filter(a => a.role === 'Owner').length;
  const paymentAdminCount = admins.filter(a => a.role === 'Payment Admin').length;

  // Handle Delete Confirmation
  const handleConfirmDelete = async () => {
    if (!adminToDelete) return;
    
    if (isPrimaryOwner(adminToDelete)) {
      onShowNotification?.('Cannot remove the primary Store Owner account.', 'error');
      setAdminToDelete(null);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await authFetch(`/api/admins/${adminToDelete.telegramId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        onShowNotification?.(`Admin "${adminToDelete.name}" deleted successfully.`, 'success');
        onRefresh();
      } else {
        onShowNotification?.(data.error || 'Failed to delete admin', 'error');
      }
    } catch (err: any) {
      onShowNotification?.(`Error: ${err.message}`, 'error');
    } finally {
      setIsDeleting(false);
      setAdminToDelete(null);
    }
  };

  // Handle Toggle Status (Activate / Deactivate)
  const handleConfirmToggleStatus = async () => {
    if (!adminToToggleStatus) return;

    if (isPrimaryOwner(adminToToggleStatus) && adminToToggleStatus.status === 'Active') {
      onShowNotification?.('Cannot deactivate the primary Store Owner account.', 'error');
      setAdminToToggleStatus(null);
      return;
    }

    setIsTogglingStatus(true);
    const newStatus = adminToToggleStatus.status === 'Active' ? 'Inactive' : 'Active';

    try {
      const res = await authFetch(`/api/admins/${adminToToggleStatus.telegramId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        onShowNotification?.(
          `Admin "${adminToToggleStatus.name}" marked as ${newStatus}.`,
          'success'
        );
        onRefresh();
      } else {
        onShowNotification?.(data.error || 'Failed to update admin status', 'error');
      }
    } catch (err: any) {
      onShowNotification?.(`Error: ${err.message}`, 'error');
    } finally {
      setIsTogglingStatus(false);
      setAdminToToggleStatus(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title Bar */}
      <div className="clay-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-3.5">
            <div 
              className="p-3 rounded-2xl text-white shrink-0"
              style={{
                background: 'linear-gradient(180deg, #6054F7 0%, #4D3FE8 100%)',
                boxShadow: '0 6px 16px -2px rgba(77, 63, 232, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.4)'
              }}
            >
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  👥 Manage Admins
                </h1>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                  {activeCount} Active
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                Synchronized with Google Sheets • Shared Payment Verification • Role-Based Permissions
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            <button
              onClick={onRefresh}
              className="clay-btn-secondary px-3 py-2 text-xs font-bold space-x-1.5"
              title="Refresh admin records from Google Sheets"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => {
                setAdminToEdit(null);
                setIsAddModalOpen(true);
              }}
              className="clay-btn-primary px-4 py-2.5 text-xs font-bold space-x-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Admin</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Metric Counters in Sunken Clay Containers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="clay-card-sm p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Admins</span>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5 font-mono">{totalCount}</div>
          </div>
          <div className="clay-card-sm p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Active Approvers</span>
            <div className="text-xl font-extrabold text-emerald-700 mt-0.5 font-mono">{activeCount}</div>
          </div>
          <div className="clay-card-sm p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Store Owners</span>
            <div className="text-xl font-extrabold text-purple-700 mt-0.5 font-mono">{ownerCount}</div>
          </div>
          <div className="clay-card-sm p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Payment Admins</span>
            <div className="text-xl font-extrabold text-indigo-700 mt-0.5 font-mono">{paymentAdminCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="clay-card p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or Telegram ID..."
            className="w-full pl-9 pr-3.5 py-2 clay-input text-xs text-slate-900 placeholder-slate-400 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters in Sunken Clay Tracks */}
        <div className="flex items-center space-x-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {/* Role Filter */}
          <div className="flex items-center space-x-1 clay-inset p-1 rounded-xl text-xs">
            <span className="text-[10px] font-bold text-slate-400 px-2 hidden sm:inline uppercase">Role:</span>
            {(['ALL', 'Owner', 'Payment Admin'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  roleFilter === role
                    ? 'clay-pill-active'
                    : 'clay-pill-inactive'
                }`}
              >
                {role === 'ALL' ? 'All Roles' : role}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1 clay-inset p-1 rounded-xl text-xs">
            <span className="text-[10px] font-bold text-slate-400 px-2 hidden sm:inline uppercase">Status:</span>
            {(['ALL', 'Active', 'Inactive'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === status
                    ? 'clay-pill-active'
                    : 'clay-pill-inactive'
                }`}
              >
                {status === 'ALL' ? 'All' : status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Admins Table */}
      <div className="clay-card overflow-hidden">
        <div className="p-3.5 sm:p-4 bg-slate-50/70 border-b border-slate-100 text-[11px] text-slate-500 font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            <span>Primary Identity: <b className="text-slate-700">Telegram Numeric User ID</b> (immune to username changes).</span>
          </div>
          <span className="font-bold text-slate-400">
            Showing {filteredAdmins.length} of {admins.length} admins
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/40 text-slate-400 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Admin Name</th>
                <th className="py-3.5 px-4">Telegram Numeric ID</th>
                <th className="py-3.5 px-4">Username</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Added By</th>
                <th className="py-3.5 px-4">Date Added</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80 text-slate-700">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Users className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="text-sm font-bold text-slate-700">No admin records match your filters</p>
                      <p className="text-xs text-slate-400">Try adjusting your search query or role filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => {
                  const isOwner = admin.role === 'Owner';
                  const isPrimary = isPrimaryOwner(admin);
                  const isActive = admin.status === 'Active';

                  return (
                    <tr key={admin.telegramId} className="hover:bg-slate-50/60 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div 
                            className={`w-9 h-9 rounded-2xl flex items-center justify-center font-extrabold text-xs shrink-0 shadow-2xs ${
                              isOwner 
                                ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                                : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                            }`}
                          >
                            {admin.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 flex items-center space-x-1.5">
                              <span>{admin.name}</span>
                              {isPrimary && (
                                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold shadow-2xs">
                                  Primary Owner
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              ID: {admin.adminId || 'ADM'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Telegram Numeric ID */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center space-x-1.5 clay-inset px-2.5 py-1 text-xs">
                          <span className="font-mono font-bold text-indigo-700">{admin.telegramId}</span>
                          <button
                            onClick={() => handleCopyId(admin.telegramId)}
                            className="p-0.5 text-slate-400 hover:text-slate-700 transition"
                            title="Copy Telegram ID"
                          >
                            {copiedId === admin.telegramId ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {admin.username ? (
                          <span className="text-indigo-600">@{admin.username}</span>
                        ) : (
                          <span className="text-slate-400 italic font-normal">None</span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-2xs ${
                            isOwner
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}
                        >
                          <span>{isOwner ? '👑' : '💳'}</span>
                          <span>{admin.role}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-2xs ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                          <span>{admin.status}</span>
                        </span>
                      </td>

                      {/* Added By */}
                      <td className="py-3.5 px-4 text-slate-600 text-[11px] font-medium">
                        {admin.addedBy || 'Owner'}
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {admin.createdAt || '2026-10-01'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Edit Button */}
                          <button
                            onClick={() => {
                              setAdminToEdit(admin);
                              setIsAddModalOpen(true);
                            }}
                            className="p-1.5 clay-btn-secondary"
                            title="Edit admin details & permissions"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                          </button>

                          {/* Toggle Active / Inactive */}
                          <button
                            disabled={isPrimary}
                            onClick={() => setAdminToToggleStatus(admin)}
                            className={`p-1.5 rounded-xl border transition ${
                              isPrimary
                                ? 'opacity-30 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                                : isActive
                                ? 'clay-btn-secondary text-amber-600'
                                : 'clay-btn-success text-white'
                            }`}
                            title={
                              isPrimary
                                ? 'Primary owner cannot be deactivated'
                                : isActive
                                ? 'Deactivate this admin'
                                : 'Activate this admin'
                            }
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            disabled={isPrimary}
                            onClick={() => setAdminToDelete(admin)}
                            className={`p-1.5 rounded-xl border transition ${
                              isPrimary
                                ? 'opacity-30 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                                : 'clay-btn-danger'
                            }`}
                            title={isPrimary ? 'Primary owner cannot be removed' : 'Delete admin from system & Google Sheets'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      {/* Multi-Admin Approval Architecture Guide Card */}
      <div className="clay-card p-5 sm:p-6">
        <h3 className="text-sm font-extrabold text-slate-900 mb-3.5 flex items-center space-x-2 tracking-tight">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>How Shared Multi-Admin Payment Verification Works</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="clay-card-sm p-4 space-y-2">
            <div className="font-extrabold text-slate-900 flex items-center space-x-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-[11px] border border-indigo-200">1</span>
              <span>Instant Broadcast</span>
            </div>
            <p className="leading-relaxed text-slate-500 font-medium">
              When a student uploads a payment screenshot, the Telegram bot broadcasts the proof to <b>every registered Active Admin</b> in real time.
            </p>
          </div>

          <div className="clay-card-sm p-4 space-y-2">
            <div className="font-extrabold text-slate-900 flex items-center space-x-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-[11px] border border-emerald-200">2</span>
              <span>First-Action-Wins Lock</span>
            </div>
            <p className="leading-relaxed text-slate-500 font-medium">
              An atomic in-memory mutex prevents duplicate approvals. The first admin to click Approve or Reject immediately claims the order.
            </p>
          </div>

          <div className="clay-card-sm p-4 space-y-2">
            <div className="font-extrabold text-slate-900 flex items-center space-x-2">
              <span className="w-6 h-6 rounded-lg bg-purple-50 text-purple-700 font-bold flex items-center justify-center text-[11px] border border-purple-200">3</span>
              <span>Auto-Sync & Delivery</span>
            </div>
            <p className="leading-relaxed text-slate-500 font-medium">
              The customer receives the Google Drive link and ZIP password only once. All other admins' buttons update to show who resolved the payment.
            </p>
          </div>
        </div>
      </div>

      {/* Add / Edit Admin Modal */}
      <AddAdminModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setAdminToEdit(null);
        }}
        onAdminSaved={() => {
          onRefresh();
          onShowNotification?.(
            adminToEdit ? 'Admin details updated successfully!' : 'New admin registered and synced to Google Sheets!',
            'success'
          );
        }}
        adminToEdit={adminToEdit}
        primaryOwnerTelegramId={primaryOwnerTelegramId}
      />

      {/* Delete Confirmation Modal */}
      {adminToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs">
          <div className="clay-card max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <span className="p-2 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                  <Trash2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Delete Admin</h3>
                  <p className="text-xs text-rose-600 font-medium">Remove admin privileges & Google Sheet record</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdminToDelete(null)}
                className="clay-btn-secondary p-1.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Are you sure you want to delete <b>{adminToDelete.name}</b> (Telegram ID: <code className="text-indigo-700 font-bold">{adminToDelete.telegramId}</code>)? They will no longer receive payment notifications or have verification access.
              </p>

              <div className="clay-inset p-3.5 flex items-center space-x-3">
                <div className="w-9 h-9 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shadow-2xs">
                  {adminToDelete.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">{adminToDelete.name}</div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Role: <span className="text-slate-800 font-bold">{adminToDelete.role}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end space-x-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setAdminToDelete(null)}
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
                <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Toggle (Deactivate / Activate) Confirmation Modal */}
      {adminToToggleStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs">
          <div className="clay-card max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <span className={`p-2 rounded-2xl border shadow-2xs ${
                  adminToToggleStatus.status === 'Active'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  <Power className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {adminToToggleStatus.status === 'Active' ? 'Deactivate Admin' : 'Activate Admin'}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {adminToToggleStatus.status === 'Active'
                      ? 'Pause payment notification broadcasts'
                      : 'Restore payment verification privileges'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdminToToggleStatus(null)}
                className="clay-btn-secondary p-1.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {adminToToggleStatus.status === 'Active' ? (
                  <>
                    Are you sure you want to deactivate <b>{adminToToggleStatus.name}</b>? While Inactive, this admin will <b>not</b> receive Telegram payment alerts and will be unable to approve or reject customer payments.
                  </>
                ) : (
                  <>
                    Activate <b>{adminToToggleStatus.name}</b>? They will immediately begin receiving new payment verification alerts and can approve or reject customer payments.
                  </>
                )}
              </p>
            </div>

            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end space-x-2.5">
              <button
                type="button"
                disabled={isTogglingStatus}
                onClick={() => setAdminToToggleStatus(null)}
                className="clay-btn-secondary px-4 py-2 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isTogglingStatus}
                onClick={handleConfirmToggleStatus}
                className={`px-4 py-2 text-xs font-bold space-x-1.5 ${
                  adminToToggleStatus.status === 'Active'
                    ? 'clay-btn-secondary text-amber-700'
                    : 'clay-btn-success'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>
                  {isTogglingStatus
                    ? 'Updating...'
                    : adminToToggleStatus.status === 'Active'
                    ? 'Deactivate'
                    : 'Activate'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
