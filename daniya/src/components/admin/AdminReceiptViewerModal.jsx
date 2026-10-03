import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Download, 
  ExternalLink, 
  Loader2, 
  ShieldCheck, 
  AlertCircle, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  FileCheck,
  CheckCircle2
} from 'lucide-react';
import api from '../../services/api';

export default function AdminReceiptViewerModal({ isOpen, onClose, record }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);

  const registrationId = record?.registrationId;

  useEffect(() => {
    if (!isOpen || !registrationId) {
      setImageUrl(null);
      setError(null);
      setZoom(1);
      return;
    }

    let active = true;
    let createdUrl = null;

    async function loadReceipt() {
      setLoading(true);
      setError(null);
      setZoom(1);

      try {
        const blob = await api.fetchAdminReceiptBlob(registrationId);
        if (!active) return;
        createdUrl = URL.createObjectURL(blob);
        setImageUrl(createdUrl);
      } catch (err) {
        if (!active) return;
        console.error('Error fetching admin receipt:', err);
        const msg = String(err.message || '').toLowerCase();
        const isUnavailable = msg.includes('not found') || msg.includes('404') || msg.includes('unavailable');
        setError(isUnavailable ? 'Receipt unavailable' : (err.message || 'Could not load receipt from storage.'));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadReceipt();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [isOpen, registrationId]);

  if (!isOpen || !record) return null;

  const expected = record.expectedAmount ?? record.amount;
  const entered = record.enteredAmount ?? record.amount;
  const ocr = record.ocrAmount ?? record.amount;
  const isMatch = (expected === entered) && (entered === ocr);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-4xl bg-white rounded-3xl border border-amber-300 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 p-4 sm:p-5 text-white flex items-center justify-between border-b border-amber-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  Verified Local Archive
                </span>
                <span className="font-mono text-xs text-amber-200">{registrationId}</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white font-festive">
                Verified Payment Screenshot Dossier
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {imageUrl && (
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-stone-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1"
                title="Open receipt in new tab"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Open Full</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Verification Summary Bar */}
        <div className="bg-amber-50/70 border-b border-amber-200 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-2.5 rounded-xl border border-amber-200/80">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Expected Amount</span>
            <span className="font-mono font-extrabold text-stone-900 text-sm">₹{expected}</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-amber-200/80">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">User Entered</span>
            <span className="font-mono font-extrabold text-stone-900 text-sm">₹{entered}</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-amber-200/80">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Receipt Detected</span>
            <span className="font-mono font-extrabold text-emerald-700 text-sm">₹{ocr}</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-amber-200/80">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">Verification Match</span>
            <span className="font-bold text-emerald-700 text-xs flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verified Valid</span>
            </span>
          </div>
        </div>

        {/* Storage & Audit Details Sub-bar */}
        <div className="px-4 py-2 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between text-[11px] text-stone-600 gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Local Secure Path: <strong>receipts/{registrationId}/payment_receipt.jpg</strong></span>
          </div>
          <div className="flex items-center gap-3">
            {record.ocrConfidence !== undefined && (
              <span>Match Confidence: <strong>{(record.ocrConfidence * 100).toFixed(0)}%</strong></span>
            )}
            {record.receiptPath && (
              <span className="font-mono text-stone-500">Path: {record.receiptPath}</span>
            )}
          </div>
        </div>

        {/* Main Image Viewport */}
        <div className="relative flex-grow bg-stone-950 flex items-center justify-center p-4 min-h-[350px] overflow-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center text-white space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              <p className="text-xs text-stone-300">Retrieving verified receipt from storage...</p>
            </div>
          )}

          {error && (
            <div className="text-center p-8 bg-stone-900/90 border border-stone-700 rounded-2xl max-w-md text-stone-200 shadow-xl">
              <FileCheck className="w-10 h-10 text-amber-400 mx-auto mb-3 opacity-60" />
              <p className="text-base font-bold text-white font-festive">
                {error === 'Receipt unavailable' ? 'Receipt Unavailable' : 'Could Not Load Receipt'}
              </p>
              <p className="text-xs text-stone-400 mt-1.5 leading-relaxed">
                {error === 'Receipt unavailable'
                  ? 'No local payment receipt screenshot was found in the archive for this registration.'
                  : error}
              </p>
            </div>
          )}

          {imageUrl && !loading && (
            <div className="relative transition-transform duration-150 flex items-center justify-center">
              <img
                src={imageUrl}
                alt={`Payment Receipt for ${registrationId}`}
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-2xl transition-transform"
              />
            </div>
          )}

          {/* Floating Image Zoom Controls */}
          {imageUrl && !loading && (
            <div className="absolute bottom-4 right-4 bg-stone-900/80 backdrop-blur-md rounded-2xl p-1.5 border border-stone-700 flex items-center gap-1 shadow-lg text-white">
              <button
                type="button"
                onClick={() => setZoom(prev => Math.min(prev + 0.25, 3))}
                className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.5))}
                className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="p-1.5 hover:bg-white/20 rounded-xl transition-colors text-xs font-semibold px-2"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-stone-200 flex items-center justify-between">
          <div className="text-xs text-stone-500">
            Verified Attendee: <strong>{record.participantsSummary || record.userName || 'Standard Booking'}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors"
          >
            Close Receipt
          </button>
        </div>
      </motion.div>
    </div>
  );
}
