import React, { useState, useRef, useEffect } from 'react';
import { X, QrCode, Upload, CheckCircle2, AlertCircle, RefreshCw, Smartphone, ShieldCheck, Download } from 'lucide-react';

interface PaymentQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  upiId: string;
  payeeName: string;
  storeName: string;
  currency: string;
  onQrUpdated?: () => void;
}

export const PaymentQrModal: React.FC<PaymentQrModalProps> = ({
  isOpen,
  onClose,
  upiId,
  payeeName,
  storeName,
  currency,
  onQrUpdated
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [qrTimestamp, setQrTimestamp] = useState<number>(Date.now());
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQrTimestamp(Date.now());
      setStatusMessage(null);
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setStatusMessage({ type: 'error', text: 'Please select an image file (PNG, JPG, or WEBP).' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setStatusMessage({ type: 'error', text: 'Image file is too large (max 10MB).' });
      return;
    }

    setSelectedFile(file);
    setStatusMessage(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSaveQr = async () => {
    if (!previewUrl) return;

    setIsUploading(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/payment-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl: previewUrl })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to upload QR code image');
      }

      const newTime = Date.now();
      setQrTimestamp(newTime);
      setSelectedFile(null);
      setPreviewUrl(null);
      setStatusMessage({
        type: 'success',
        text: 'Default Payment QR updated successfully! The new QR is now live across the bot and website.'
      });

      if (onQrUpdated) {
        onQrUpdated();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error uploading QR image.' });
    } finally {
      setIsUploading(false);
    }
  };

  const activeQrSrc = `/assets/qr-code.png?v=${qrTimestamp}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[92vh]"
        style={{
          boxShadow: '0 25px 50px -12px rgba(35, 45, 65, 0.25), inset 0 1px 1px 0 rgba(255, 255, 255, 0.9)'
        }}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50/80 to-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shadow-2xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                Default Payment QR Code
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Displayed to customers on Telegram Bot & Checkout
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Status Alert if any */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-2xl border flex items-start space-x-2.5 text-xs font-semibold ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">{statusMessage.text}</div>
            </div>
          )}

          {/* Current Active QR Preview Card */}
          <div className="clay-card p-5 flex flex-col sm:flex-row items-center gap-5">
            <div className="relative shrink-0">
              <div className="w-36 h-36 rounded-2xl bg-white border border-slate-200/80 p-2 shadow-inner flex items-center justify-center overflow-hidden">
                <img
                  src={previewUrl || activeQrSrc}
                  alt="Default Payment QR Code"
                  className="w-full h-full object-contain rounded-lg"
                  onError={(e) => {
                    // Fallback visual if image load fails
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              {previewUrl && (
                <span className="absolute -top-2 -right-2 px-2 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded-full shadow-md animate-pulse">
                  Preview
                </span>
              )}
            </div>

            <div className="flex-1 space-y-2 text-center sm:text-left">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active Payment QR</span>
              </div>
              <div className="text-xs text-slate-600 space-y-1">
                <div>
                  <span className="text-slate-400 font-medium">Store:</span>{' '}
                  <strong className="text-slate-900 font-bold">{storeName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">UPI ID:</span>{' '}
                  <code className="text-indigo-600 font-bold font-mono text-[11px] bg-indigo-50/80 px-1.5 py-0.5 rounded-md border border-indigo-100">
                    {upiId}
                  </code>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Payee Name:</span>{' '}
                  <strong className="text-slate-800 font-semibold">{payeeName}</strong>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                Used in Telegram Bot Buy Now &amp; Checkout flow.
              </div>
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              Replace with Your QR Code Image
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 rounded-2xl border-2 border-dashed transition text-center cursor-pointer ${
                isDragOver
                  ? 'border-indigo-500 bg-indigo-50/50'
                  : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
              <div className="flex flex-col items-center space-y-2">
                <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 shadow-2xs">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-slate-800">
                  {selectedFile ? selectedFile.name : 'Click to browse or drag & drop QR image'}
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Supports PNG, JPG, or WEBP (Standard Square Payment QR Recommended)
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {selectedFile && previewUrl && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-center justify-between">
              <div className="text-xs font-semibold text-indigo-900">
                New QR ready to apply ({Math.round(selectedFile.size / 1024)} KB)
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-white transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={handleSaveQr}
                  className="clay-btn-primary px-4 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Apply &amp; Set as Default QR</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Tip Note */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-slate-600 text-[11px] leading-relaxed flex items-start space-x-2.5">
            <Smartphone className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <strong>Instant Real-time Sync:</strong> When saved, this image permanently replaces{' '}
              <code className="text-slate-800 font-mono">assets/qr-code.png</code>. The Telegram Bot cache is automatically purged so every future customer order instantly receives this new QR code!
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 shadow-2xs hover:bg-slate-50 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
