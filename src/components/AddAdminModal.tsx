import React, { useState, useEffect } from 'react';
import { X, Shield, User, Hash, AtSign, Check, AlertCircle, Sparkles, HelpCircle } from 'lucide-react';
import { AdminUser, AdminRole } from '../types/index.js';
import { authFetch } from '../services/apiClient.js';

interface AddAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdminSaved: () => void;
  adminToEdit?: AdminUser | null;
  primaryOwnerTelegramId?: string;
  currentAdminName?: string;
}

export const AddAdminModal: React.FC<AddAdminModalProps> = ({
  isOpen,
  onClose,
  onAdminSaved,
  adminToEdit,
  primaryOwnerTelegramId,
  currentAdminName = 'Store Owner'
}) => {
  const [formData, setFormData] = useState({
    name: '',
    telegramId: '',
    username: '',
    role: 'Payment Admin' as AdminRole,
    status: 'Active' as 'Active' | 'Inactive'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [idError, setIdError] = useState('');

  const isEditing = Boolean(adminToEdit);
  const isPrimaryOwner = Boolean(
    adminToEdit && (
      (primaryOwnerTelegramId && adminToEdit.telegramId === primaryOwnerTelegramId) ||
      (adminToEdit.role === 'Owner' && adminToEdit.adminId === 'ADM-1')
    )
  );

  useEffect(() => {
    if (adminToEdit) {
      setFormData({
        name: adminToEdit.name,
        telegramId: adminToEdit.telegramId,
        username: adminToEdit.username || '',
        role: adminToEdit.role,
        status: adminToEdit.status
      });
    } else {
      setFormData({
        name: '',
        telegramId: '',
        username: '',
        role: 'Payment Admin',
        status: 'Active'
      });
    }
    setError('');
    setIdError('');
  }, [adminToEdit, isOpen]);

  if (!isOpen) return null;

  const validateTelegramId = (val: string) => {
    const cleaned = val.trim();
    if (!cleaned) {
      setIdError('Telegram Numeric ID is required');
      return false;
    }
    if (!/^\d+$/.test(cleaned)) {
      setIdError('Must contain digits only (e.g. 8293894004). Usernames are not allowed here.');
      return false;
    }
    setIdError('');
    return true;
  };

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); // keep numbers only
    setFormData(prev => ({ ...prev, telegramId: val }));
    validateTelegramId(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Admin Name is required.');
      return;
    }

    if (!validateTelegramId(formData.telegramId)) {
      setError('Please provide a valid numeric Telegram User ID.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && adminToEdit) {
        const res = await authFetch(`/api/admins/${adminToEdit.telegramId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            username: formData.username.replace('@', '').trim(),
            role: formData.role,
            status: formData.status
          })
        });

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to update admin details');
        }
      } else {
        const res = await authFetch('/api/admins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            telegramId: formData.telegramId.trim(),
            username: formData.username.replace('@', '').trim(),
            role: formData.role,
            status: formData.status,
            addedBy: currentAdminName
          })
        });

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to add admin');
        }
      }

      onAdminSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error saving admin record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs overflow-y-auto">
      <div className="clay-card max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-3.5">
            <div 
              className="p-3 rounded-2xl text-white shadow-sm"
              style={{
                background: 'linear-gradient(180deg, #6054F7 0%, #4D3FE8 100%)',
                boxShadow: '0 6px 16px -2px rgba(77, 63, 232, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.4)'
              }}
            >
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base tracking-tight">
                {isEditing ? 'Edit Admin Details' : 'Add New Admin'}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {isEditing ? 'Update permissions and status' : 'Register co-admin for shared payment approvals'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="clay-btn-secondary p-1.5"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50/90 border border-rose-200 rounded-2xl text-xs text-rose-800 font-bold flex items-start space-x-2.5 shadow-2xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Admin Name */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span>Admin Full Name <span className="text-rose-600">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">Displayed in approval logs</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Vikram Sharma"
                className="w-full pl-9 pr-3.5 py-2.5 clay-input text-xs text-slate-900 placeholder-slate-400 font-medium"
              />
            </div>
          </div>

          {/* Telegram Numeric User ID */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span>Telegram Numeric User ID <span className="text-rose-600">*</span></span>
              <span className="text-[10px] font-mono text-indigo-700 font-bold">Must be digits only</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Hash className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                disabled={isEditing}
                value={formData.telegramId}
                onChange={handleIdChange}
                placeholder="e.g. 8293894004"
                className={`w-full pl-9 pr-3.5 py-2.5 text-xs font-mono font-bold transition ${
                  isEditing
                    ? 'clay-inset text-slate-400 cursor-not-allowed opacity-60'
                    : idError
                    ? 'clay-input border-rose-300 text-slate-900 bg-rose-50/30'
                    : 'clay-input text-indigo-700'
                }`}
              />
            </div>
            {idError ? (
              <p className="text-[11px] text-rose-600 mt-1 font-bold">{idError}</p>
            ) : (
              <div className="text-[10px] text-slate-400 mt-1.5 flex items-center space-x-1.5 font-medium">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Ask your admin to message <code>@userinfobot</code> on Telegram to get their ID.</span>
              </div>
            )}
          </div>

          {/* Telegram Username (Optional) */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span>Telegram Username <span className="text-slate-400 font-normal">(Optional)</span></span>
              <span className="text-[10px] text-slate-400 font-normal">For display reference only</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <AtSign className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value.replace('@', '') })}
                placeholder="e.g. vikram_tg"
                className="w-full pl-9 pr-3.5 py-2.5 clay-input text-xs text-slate-900 placeholder-slate-400 font-medium"
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Admin Role & Permissions
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={isPrimaryOwner}
                onClick={() => setFormData({ ...formData, role: 'Owner' })}
                className={`p-3.5 rounded-2xl text-left transition flex flex-col justify-between ${
                  formData.role === 'Owner'
                    ? 'clay-pill-active border-indigo-200'
                    : 'clay-card-sm border-slate-200/60 hover:bg-slate-50'
                } ${isPrimaryOwner ? 'cursor-not-allowed opacity-80' : ''}`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-extrabold text-slate-900 flex items-center space-x-1">
                    <span>👑</span>
                    <span>Owner</span>
                  </span>
                  {formData.role === 'Owner' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <p className="text-[10px] text-slate-500 leading-tight font-medium">
                  Full control: add/remove admins, edit catalog, verify payments.
                </p>
              </button>

              <button
                type="button"
                disabled={isPrimaryOwner}
                onClick={() => setFormData({ ...formData, role: 'Payment Admin' })}
                className={`p-3.5 rounded-2xl text-left transition flex flex-col justify-between ${
                  formData.role === 'Payment Admin'
                    ? 'clay-pill-active border-indigo-200'
                    : 'clay-card-sm border-slate-200/60 hover:bg-slate-50'
                } ${isPrimaryOwner ? 'cursor-not-allowed opacity-80' : ''}`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-extrabold text-slate-900 flex items-center space-x-1">
                    <span>💳</span>
                    <span>Payment Admin</span>
                  </span>
                  {formData.role === 'Payment Admin' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <p className="text-[10px] text-slate-500 leading-tight font-medium">
                  Receives payment alerts, verifies UPI proofs, approves/rejects orders.
                </p>
              </button>
            </div>
            {isPrimaryOwner && (
              <p className="text-[10px] text-amber-700 font-bold mt-1.5">
                Primary Store Owner role is locked and cannot be changed.
              </p>
            )}
          </div>

          {/* Account Status */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Account Status
            </label>
            <div className="flex items-center space-x-3">
              <label
                className={`flex-1 flex items-center justify-between p-3 rounded-2xl cursor-pointer transition ${
                  formData.status === 'Active'
                    ? 'clay-pill-active border-emerald-200 bg-emerald-50/30'
                    : 'clay-card-sm text-slate-600'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${formData.status === 'Active' ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                  <span className="text-xs font-bold">Active</span>
                </div>
                <input
                  type="radio"
                  name="status"
                  value="Active"
                  checked={formData.status === 'Active'}
                  onChange={() => setFormData({ ...formData, status: 'Active' })}
                  className="hidden"
                />
              </label>

              <label
                className={`flex-1 flex items-center justify-between p-3 rounded-2xl transition ${
                  isPrimaryOwner
                    ? 'opacity-40 cursor-not-allowed clay-inset text-slate-400'
                    : formData.status === 'Inactive'
                    ? 'clay-pill-active border-rose-200 bg-rose-50/30 text-rose-800 cursor-pointer'
                    : 'clay-card-sm text-slate-600 cursor-pointer'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${formData.status === 'Inactive' ? 'bg-rose-600' : 'bg-slate-400'}`} />
                  <span className="text-xs font-bold">Inactive</span>
                </div>
                <input
                  type="radio"
                  name="status"
                  value="Inactive"
                  disabled={isPrimaryOwner}
                  checked={formData.status === 'Inactive'}
                  onChange={() => !isPrimaryOwner && setFormData({ ...formData, status: 'Inactive' })}
                  className="hidden"
                />
              </label>
            </div>
            {isPrimaryOwner && (
              <p className="text-[10px] text-amber-700 font-bold mt-1.5">
                Primary Store Owner cannot be deactivated.
              </p>
            )}
          </div>

          {/* Google Sheets Sync Note */}
          <div className="clay-inset p-3.5 text-[11px] text-slate-600 flex items-center justify-between font-medium">
            <span className="flex items-center space-x-2">
              <span className="text-base">📊</span>
              <span>Automatically saved and synchronized with Google Sheets <b>Admins</b> tab.</span>
            </span>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="clay-btn-secondary px-4 py-2 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="clay-btn-primary px-5 py-2 text-xs font-bold space-x-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Save Changes' : 'Register Admin'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
