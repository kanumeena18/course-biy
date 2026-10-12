import React, { useState, useEffect } from 'react';
import { X, Plus, Sparkles, Check, Sheet, Image as ImageIcon, ExternalLink, RefreshCw, AlertCircle, Trash2 } from 'lucide-react';
import { Course } from '../types/index.js';
import { authFetch } from '../services/apiClient.js';

interface AddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCourseAdded: () => void;
  courseToEdit?: Course | null;
  onDeleteCourse?: (courseId: string) => Promise<boolean | void> | void;
}

const PRESET_THUMBNAILS = [
  {
    name: 'Storytelling',
    url: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&auto=format&fit=crop&q=80'
  },
  {
    name: 'YouTube Workshop',
    url: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&auto=format&fit=crop&q=80'
  },
  {
    name: 'Video Editing',
    url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80'
  },
  {
    name: 'Creator Studio',
    url: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&auto=format&fit=crop&q=80'
  }
];

export const AddCourseModal: React.FC<AddCourseModalProps> = ({
  isOpen,
  onClose,
  onCourseAdded,
  courseToEdit,
  onDeleteCourse
}) => {
  const [formData, setFormData] = useState({
    courseName: '',
    creatorName: '',
    price: 99,
    originalPrice: 499,
    courseSize: '2.5 GB',
    language: 'Hindi',
    driveLink: 'https://drive.google.com/drive/folders/my-course-link',
    zipPassword: 'COURSE_PASS_2026',
    description: 'Complete hands-on masterclass with practical assignments.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
    status: 'Active' as 'Active' | 'Inactive'
  });

  const [imagePreviewError, setImagePreviewError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setConfirmDelete(false);
    if (courseToEdit) {
      setFormData({
        courseName: courseToEdit.courseName,
        creatorName: courseToEdit.creatorName,
        price: courseToEdit.price,
        originalPrice: courseToEdit.originalPrice,
        courseSize: courseToEdit.courseSize,
        language: courseToEdit.language,
        driveLink: courseToEdit.driveLink,
        zipPassword: courseToEdit.zipPassword,
        description: courseToEdit.description,
        thumbnailUrl: courseToEdit.thumbnailUrl || '',
        status: courseToEdit.status
      });
    } else {
      setFormData({
        courseName: '',
        creatorName: '',
        price: 99,
        originalPrice: 499,
        courseSize: '2.5 GB',
        language: 'Hindi',
        driveLink: 'https://drive.google.com/drive/folders/my-course-link',
        zipPassword: 'COURSE_PASS_2026',
        description: 'Complete hands-on masterclass with practical assignments.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
        status: 'Active'
      });
    }
    setImagePreviewError(false);
    setError('');
  }, [courseToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const endpoint = courseToEdit
        ? `/api/courses/${courseToEdit.courseId}`
        : '/api/courses';
      const method = courseToEdit ? 'PUT' : 'POST';

      const res = await authFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        onCourseAdded();
        onClose();
      } else {
        setError(data.error || 'Failed to save course');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!courseToEdit || !onDeleteCourse) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsDeleting(true);
    try {
      await onDeleteCourse(courseToEdit.courseId);
      onCourseAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete course');
    } finally {
      setIsDeleting(false);
    }
  };

  const isEditing = Boolean(courseToEdit);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs">
      <div className="clay-card max-w-xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-3">
            <div 
              className="p-3 rounded-2xl text-white shadow-sm"
              style={{
                background: 'linear-gradient(180deg, #6054F7 0%, #4D3FE8 100%)',
                boxShadow: '0 6px 16px -2px rgba(77, 63, 232, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.4)'
              }}
            >
              {isEditing ? <Sparkles className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">
                {isEditing ? `Edit Course (${courseToEdit?.courseId})` : 'Add New Course Row'}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {isEditing ? 'Update course details and Image Thumbnail Path.' : 'Inserts a new course row into your Google Sheets database.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="clay-btn-secondary p-1.5"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-800 text-xs font-bold shadow-2xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Course Name *</label>
              <input
                type="text"
                required
                value={formData.courseName}
                onChange={e => setFormData({ ...formData, courseName: e.target.value })}
                placeholder="e.g. Master Video Editing"
                className="w-full clay-input px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Creator Name *</label>
              <input
                type="text"
                required
                value={formData.creatorName}
                onChange={e => setFormData({ ...formData, creatorName: e.target.value })}
                placeholder="e.g. Kabir Khan"
                className="w-full clay-input px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Price (₹) *</label>
              <input
                type="number"
                required
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                className="w-full clay-input px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Original Price (₹)</label>
              <input
                type="number"
                value={formData.originalPrice}
                onChange={e => setFormData({ ...formData, originalPrice: Number(e.target.value) })}
                className="w-full clay-input px-3.5 py-2.5 text-xs text-slate-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Size *</label>
              <input
                type="text"
                value={formData.courseSize}
                onChange={e => setFormData({ ...formData, courseSize: e.target.value })}
                placeholder="e.g. 3.2 GB"
                className="w-full clay-input px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-medium"
              />
            </div>
          </div>

          {/* REQUIRED FIELD: Image Thumbnail Path with Live Preview */}
          <div className="clay-card-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-extrabold text-slate-900 tracking-tight">
                  Image Thumbnail Path
                </label>
                <p className="text-[11px] text-slate-400 font-medium">
                  Enter an image URL (https://...) or local path (assets/...) for Telegram course results.
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
                Telegram Photo
              </span>
            </div>

            <input
              type="text"
              value={formData.thumbnailUrl}
              onChange={e => {
                setFormData({ ...formData, thumbnailUrl: e.target.value });
                setImagePreviewError(false);
              }}
              placeholder="https://images.unsplash.com/... or assets/qr-code.png"
              className="w-full clay-input px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 font-medium"
            />

            {/* Quick Presets Picker */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-400">Quick Samples:</span>
              {PRESET_THUMBNAILS.map(preset => (
                <button
                  type="button"
                  key={preset.name}
                  onClick={() => {
                    setFormData({ ...formData, thumbnailUrl: preset.url });
                    setImagePreviewError(false);
                  }}
                  className="clay-btn-secondary px-2.5 py-1 text-[10px] font-bold text-slate-700"
                >
                  {preset.name}
                </button>
              ))}
            </div>

            {/* Live Thumbnail Preview Box */}
            <div className="mt-2 clay-inset p-3.5">
              <div className="text-[11px] font-bold text-slate-700 mb-2 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Admin Panel Thumbnail Preview:</span>
                </span>
                {formData.thumbnailUrl ? (
                  <span className="text-[10px] text-emerald-700 font-bold">Ready for Telegram</span>
                ) : (
                  <span className="text-[10px] text-slate-400 italic font-normal">No image set (Text-only display)</span>
                )}
              </div>

              {formData.thumbnailUrl ? (
                <div className="flex items-center space-x-3.5">
                  <div className="w-24 h-16 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0 flex items-center justify-center relative shadow-xs">
                    {!imagePreviewError ? (
                      <img
                        src={formData.thumbnailUrl}
                        alt="Course thumbnail preview"
                        className="w-full h-full object-cover"
                        onError={() => setImagePreviewError(true)}
                      />
                    ) : (
                      <div className="text-center p-1 text-slate-400">
                        <AlertCircle className="w-5 h-5 mx-auto text-amber-500" />
                        <span className="text-[9px] leading-tight block font-bold">Local / Fallback</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <div className="font-bold text-slate-900 truncate max-w-[280px]">
                      {formData.courseName || 'Course Title'}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      When searched on Telegram, this image will accompany the course card!
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-2.5 px-3 rounded-xl bg-white text-slate-400 text-xs flex items-center space-x-2 border border-dashed border-slate-200">
                  <ImageIcon className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">No thumbnail configured. The bot will send clean text card without photo.</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Language</label>
              <input
                type="text"
                value={formData.language}
                onChange={e => setFormData({ ...formData, language: e.target.value })}
                placeholder="e.g. Hindi, English"
                className="w-full clay-input px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Visibility Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                className="w-full clay-input px-3.5 py-2.5 text-xs text-slate-900 font-bold"
              >
                <option value="Active">Active (Visible to customers)</option>
                <option value="Inactive">Inactive (Hidden from customers)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Google Drive Download Link *</label>
            <input
              type="url"
              required
              value={formData.driveLink}
              onChange={e => setFormData({ ...formData, driveLink: e.target.value })}
              placeholder="https://drive.google.com/drive/folders/..."
              className="w-full clay-input px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-mono font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Secret ZIP Extraction Password *</label>
            <input
              type="text"
              required
              value={formData.zipPassword}
              onChange={e => setFormData({ ...formData, zipPassword: e.target.value })}
              placeholder="e.g. PASS_2026_XYZ"
              className="w-full clay-input px-3.5 py-2.5 text-xs text-indigo-700 font-mono font-bold"
            />
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              🔒 Delivered only after you approve payment in bank app. Never exposed before payment.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full clay-input px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-medium"
            />
          </div>

          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            {isEditing && courseToEdit && onDeleteCourse ? (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={isSubmitting || isDeleting}
                  onClick={handleDelete}
                  className={`clay-btn-danger px-3.5 py-2 text-xs font-bold space-x-1.5 ${
                    confirmDelete ? 'ring-2 ring-rose-400 animate-pulse' : ''
                  }`}
                  title="Delete course permanently"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Deleting...' : confirmDelete ? 'Confirm Delete Course?' : 'Delete Course'}</span>
                </button>
                {confirmDelete && (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-[11px] text-slate-400 hover:text-slate-800 font-bold underline"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ) : <div />}

            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={onClose}
                className="clay-btn-secondary px-4 py-2 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isDeleting}
                className="clay-btn-primary px-5 py-2 text-xs font-bold space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving...' : (isEditing ? 'Update Course' : 'Save to Google Sheet')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
