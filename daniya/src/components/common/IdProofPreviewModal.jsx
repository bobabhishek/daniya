import React from 'react';
import { X, ShieldCheck, Download, Eye, AlertCircle, FileText, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { formatToIndianDate } from '../../utils/indianDateUtils';

export default function IdProofPreviewModal({
  isOpen,
  onClose,
  participantName,
  documentType = 'Aadhaar Card',
  dob,
  age,
  idProofUrl,
  idProofName
}) {
  if (!isOpen || !idProofUrl) return null;

  const fileName = (idProofName || '').toLowerCase();
  const isImage = idProofUrl.startsWith('data:image/') || /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(fileName);
  const isPdf = idProofUrl.startsWith('data:application/pdf') || fileName.endsWith('.pdf');
  const isDocxOrPpt = /\.(docx|doc|pptx|ppt|txt)$/i.test(fileName);

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl border border-amber-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-900 via-[#700910] to-stone-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-amber-500/30">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-stone-950">
                Age Verification Proof
              </span>
              <span className="text-xs text-amber-200 font-medium">
                {documentType}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold font-festive text-[#FFFDF9]">
              {participantName ? `${participantName}'s ID Document` : 'Uploaded ID Document'}
            </h3>
            {dob && (
              <p className="text-xs text-amber-200/90 mt-0.5">
                Stated DOB: <span className="font-bold text-white font-mono">{formatToIndianDate(dob)}</span> (DD/MM/YYYY) {age ? `• ${age} yrs` : ''}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-stone-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Close Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verification Alert Banner */}
        <div className="bg-amber-50 px-5 py-3 border-b border-amber-200 flex items-center gap-2.5 text-xs text-amber-900">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Official Entry Verification:</strong> Ensure Date of Birth ({dob ? formatToIndianDate(dob) : 'DOB'}) and name are clearly legible on this document.
          </span>
        </div>

        {/* Image / Document Viewport */}
        <div className="p-4 sm:p-6 bg-stone-100 flex items-center justify-center min-h-[300px] max-h-[65vh] overflow-auto">
          {isPdf ? (
            /* PDF In-App Interactive Viewer */
            <div className="w-full h-[60vh] rounded-2xl overflow-hidden border border-stone-300 shadow-inner bg-white flex flex-col">
              <div className="px-4 py-2 bg-stone-200 border-b border-stone-300 flex items-center justify-between text-xs text-stone-700 font-bold">
                <span className="flex items-center gap-1.5 truncate">
                  <FileText className="w-4 h-4 text-red-600 shrink-0" />
                  <span className="truncate">{idProofName || 'Age_Proof_Document.pdf'}</span>
                </span>
                <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-black">
                  IN-APP PDF VIEWER
                </span>
              </div>
              <iframe
                src={idProofUrl}
                title={`PDF Viewer for ${participantName || 'ID Document'}`}
                className="w-full flex-1 border-0 rounded-b-2xl bg-white"
              />
            </div>
          ) : isImage ? (
            /* Direct Image Viewer */
            <div className="relative group max-w-full">
              <img
                src={idProofUrl}
                alt={`Age proof document for ${participantName || 'participant'}`}
                className="max-h-[55vh] max-w-full object-contain rounded-xl border border-stone-300 shadow-md mx-auto bg-white"
              />
            </div>
          ) : (
            /* Office / Other Document Viewer Card */
            <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 shadow-md p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center">
                <FileText className="w-8 h-8 text-amber-700" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  {fileName.endsWith('.docx') || fileName.endsWith('.doc') ? 'Word Document' : fileName.endsWith('.pptx') || fileName.endsWith('.ppt') ? 'Presentation File' : 'Attached Document'}
                </span>
                <h4 className="text-base font-bold text-stone-900 mt-2 truncate">
                  {idProofName || 'Document'}
                </h4>
                <p className="text-xs text-stone-500 mt-1">
                  Attached as Age Proof for <strong className="text-stone-800">{participantName || 'Attendee'}</strong>
                </p>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 text-left space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-400">Target DOB:</span>
                  <span className="font-bold text-stone-800">{dob ? formatToIndianDate(dob) : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Verification:</span>
                  <span className="font-bold text-emerald-700">Ready for Gate 3 Scanning</span>
                </div>
              </div>

              <p className="text-[11px] text-stone-400">
                This document is safely stored and registered for admission pass verification.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-stone-500 font-mono text-[11px] truncate max-w-xs">
            File: {idProofName || 'id_proof.jpg'}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={idProofUrl}
              download={idProofName || 'id_proof.jpg'}
              className="px-3.5 py-1.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
