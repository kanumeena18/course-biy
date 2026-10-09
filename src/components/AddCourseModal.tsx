import React, { useState, useEffect } from 'react';
import { X, Plus, Sparkles, Check, Sheet, Image as ImageIcon, ExternalLink, RefreshCw, AlertCircle, Trash2 } from 'lucide-react';
import { Course } from '../types/index.js';

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

      const res = await fetch(endpoint, {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040515]/80 backdrop-blur-xs">
      <div className="bg-[#111426] border border-[#252A3D] rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#252A3D] flex items-center justify-between bg-[#0B0D1F]">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-[#1A1D32] text-[#875CE9] border border-[#30354D]">
              {isEditing ? <Sparkles className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </span>
            <div>
              <h3 className="font-bold text-[#FFFFFF] text-sm sm:text-base">
                {isEditing ? `Edit Course (${courseToEdit?.courseId})` : 'Add New Course Row'}
              </h3>
              <p className="text-xs text-[#9CA3AF]">
                {isEditing ? 'Update course details and Image Thumbnail Path.' : 'Inserts a new course row into your Google Sheets database.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9CA3AF] hover:text-[#F8FAFC] rounded-xl hover:bg-[#1A1D32] transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-[#111426] border border-[#EF4444]/40 text-[#EF4444] text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">Course Name *</label>
              <input
                type="text"
                required
                value={formData.courseName}
                onChange={e => setFormData({ ...formData, courseName: e.target.value })}
                placeholder="e.g. Master Video Editing"
                className="w-full bg-[#0B0D1F] border border-[#252A3D] rounded-xl px-3 py-2 text-xs text-[#D1D5DB] placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">Creator Name *</label>
              <input
                type="text"
                required
                value={formData.creatorName}
                onChange={e => setFormData({ ...formData, creatorName: e.target.value })}
                placeholder="e.g. Kabir Khan"
                className="w-full bg-[#0B0D1F] border border-[#252A3D] rounded-xl px-3 py-2 text-xs text-[#D1D5DB] placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">Price (₹) *</label>
              <input
                type="number"
                required
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                className="w-full bg-[#0B0D1F] border border-[#252A3D] rounded-xl px-3 py-2 text-xs text-[#D1D5DB] focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">Original Price (₹)</label>
              <input
                type="number"
                value={formData.originalPrice}
                onChange={e => setFormData({ ...formData, originalPrice: Number(e.target.value) })}
                className="w-full bg-[#0B0D1F] border border-[#252A3D] rounded-xl px-3 py-2 text-xs text-[#D1D5DB] focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">Size *</label>
              <input
                type="text"
                value={formData.courseSize}
                onChange={e => setFormData({ ...formData, courseSize: e.target.value })}
                placeholder="e.g. 3.2 GB"
                className="w-full bg-[#0B0D1F] border border-[#252A3D] rounded-xl px-3 py-2 text-xs text-[#D1D5DB] placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]"
              />
            </div>
          </div>

          {/* REQUIRED FIELD: Image Thumbnail Path with Live Preview */}
          <div className="p-4 rounded-2xl bg-[#0B0D1F] border border-[#252A3D] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-[#FFFFFF]">
                  Image Thumbnail Path
                </label>
                <p className="text-[11px] text-[#9CA3AF]">
                  Enter an image URL (https://...) or local path (assets/...) for Telegram course results.
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1A1D32] text-[#875CE9] border border-[#30354D]">
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
              className="w-full bg-[#111426] border border-[#252A3D] rounded-xl px-3 py-2 text-xs text-[#D1D5DB] placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]"
            />

            {/* Quick Presets Picker */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-[#9CA3AF]">Quick Samples:</span>
              {PRESET_THUMBNAILS.map(preset => (
                <button
                  type="button"
                  key={preset.name}
                  onClick={() => {
                    setFormData({ ...formData, thumbnailUrl: preset.url });
                    setImagePreviewError(false);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-[#1A1D32] hover:bg-[#252A3D] text-[10px] font-semibold text-[#E5E7EB] hover:text-[#FFFFFF] border border-[#30354D] transition"
                >
                  {preset.name}
                </button>
              ))}
            </div>

            {/* Live Thumbnail Preview Box */}
            <div className="mt-2 p-3 bg-[#040515] border border-[#252A3D] rounded-xl">
              <div className="text-[11px] font-bold text-[#D1D5DB] mb-2 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#6366F1]" />
                  <span>Admin Panel Thumbnail Preview:</span>
                </span>
                {formData.thumbnailUrl ? (
                  <span className="text-[10px] text-[#22C55E] font-semibold">Ready for Telegram</span>
                ) : (
                  <span className="text-[10px] text-[#6B7280] italic">No image set (Text-only display)</span>
                )}
              </div>

              {formData.thumbnailUrl ? (
                <div className="flex items-center space-x-3.5">
                  <div className="w-24 h-16 rounded-lg overflow-hidden border border-[#252A3D] bg-[#0B0D1F] shrink-0 flex items-center justify-center relative">
                    {!imagePreviewError ? (
                      <img
                        src={formData.thumbnailUrl}
                        alt="Course thumbnail preview"
                        className="w-full h-full object-cover"
                        onError={() => setImagePreviewError(true)}
                      />
                    ) : (
                      <div className="text-center p-1 text-[#6B7280]">
                        <AlertCircle className="w-5 h-5 mx-auto text-[#F59E0B]" />
                        <span className="text-[9px] leading-tight block">Local / Unrendered</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-[#9CA3AF] space-y-0.5">
                    <div className="font-semibold text-[#FFFFFF] truncate max-w-[280px]">
                      {formData.courseName || 'Course Title'}
                    </div>
                    <div className="text-[11px] text-[#9CA3AF]">
                      When searched on Telegram, this image will accompany the course card!
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-2.5 px-3 rounded-lg bg-[#0B0D1F] text-[#6B7280] text-xs flex items-center space-x-2 border border-dashed border-[#252A3D]">
                  <ImageIcon className="w-4 h-4 text-[#6B7280]" />
                  <span>No thumbnail configured. The bot will send clean text card without photo.</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">Language</label>
              <input
                type="text"
                value={formData.language}
                onChange={e => setFormData({ ...formData, language: e.target.value })}
                placeholder="e.g. Hindi, English"
                className="w-full bg-[#0B0D1F] border border-[#252A3D] rounded-xl px-3 py-2 text-xs text-[#D1D5DB] placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">Visibility Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                className="w-full bg-[#0B0D1F] border border-[#252A3D] rounded-xl px-3 py-2 text-xs text-[#D1D5DB] focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]"
              >
                <option value="Active">Active (Visible to customers)</option>
                <option value="Inactive">Inactive (Hidden from customers)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">Google Drive Download Link *</label>
            <input
              type="url"
              required
              value={formData.driveLink}
              onChange={e => setFormData({ ...formData, driveLink: e.target.value })}
              placeholder="https://drive.google.com/drive/folders/..."
              className="w-full bg-[#0B0D1F] border border-[#252A3D] rounded-xl px-3 py-2 text-xs text-[#D1D5DB] placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">Secret ZIP Extraction Password *</label>
            <input
              type="text"
              required
              value={formData.zipPassword}
              onChange={e => setFormData({ ...formData, zipPassword: e.target.value })}
              placeholder="e.g. PASS_2026_XYZ"
              className="w-full bg-[#0B0D1F] border border-[#30354D] rounded-xl px-3 py-2 text-xs text-[#F59E0B] font-mono font-bold focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]"
            />
            <p className="text-[11px] text-[#9CA3AF] mt-1">
              🔒 Delivered only after you approve payment in bank app. Never exposed before payment.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#F8FAFC] mb-1">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-[#0B0D1F] border border-[#252A3D] rounded-xl px-3 py-2 text-xs text-[#D1D5DB] placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]"
            />
          </div>

          <div className="pt-3 flex items-center justify-between border-t border-[#252A3D]">
            {isEditing && courseToEdit && onDeleteCourse ? (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={isSubmitting || isDeleting}
                  onClick={handleDelete}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5 ${
                    confirmDelete
                      ? 'bg-[#EF4444] text-white animate-pulse'
                      : 'bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] border border-[#EF4444]/30'
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
                    className="text-[11px] text-[#9CA3AF] hover:text-[#F8FAFC] underline"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ) : <div />}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#1A1D32] border border-[#30354D] text-[#E5E7EB] hover:bg-[#252A3D] hover:text-[#FFFFFF] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isDeleting}
                className="px-5 py-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-xl text-xs font-bold transition shadow-md shadow-[#6366F1]/20 flex items-center space-x-1.5"
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
