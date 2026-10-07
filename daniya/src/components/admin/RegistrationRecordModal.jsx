import React, { useState } from 'react';
import { X, User, ShieldCheck, Ticket, Eye, FileCheck, Calendar, PencilLine, Save, RotateCcw, Phone } from 'lucide-react';
import IdProofPreviewModal from '../common/IdProofPreviewModal';
import { formatToIndianDate } from '../../utils/indianDateUtils';
import api from '../../services/api';

const normalizePhoneNumber = (value = '') => (value || '').replace(/\D/g, '').slice(0, 10);

export default function RegistrationRecordModal({ record, onClose, onOpenTickets, onViewReceipt, onRecordUpdated }) {
  const [inspectingDoc, setInspectingDoc] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftParticipants, setDraftParticipants] = useState(
    (record?.participants || []).map((p, idx) => ({
      ...p,
      participantId: p.participantId || p.id || `p${idx + 1}`,
      id: p.id || p.participantId || `p${idx + 1}`,
      phoneNumber: p.phoneNumber || ''
    }))
  );
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!record) return null;

  const expected = record.expectedAmount ?? record.amount;
  const entered = record.enteredAmount ?? record.amount;
  const ocr = record.ocrAmount ?? record.amount;

  const startEditing = () => {
    setDraftParticipants((record.participants || []).map((p, idx) => ({
      ...p,
      participantId: p.participantId || p.id || `p${idx + 1}`,
      id: p.id || p.participantId || `p${idx + 1}`,
      phoneNumber: p.phoneNumber || ''
    })));
    setSaveError('');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setSaveError('');
  };

  const handleParticipantFieldChange = (participantId, field, value) => {
    setDraftParticipants(prev => prev.map(p => {
      if ((p.participantId || p.id) === participantId) {
        return { ...p, [field]: field === 'phoneNumber' ? normalizePhoneNumber(value) : value };
      }
      return p;
    }));
  };

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      setSaveError('');

      const payload = draftParticipants.map((p, idx) => ({
        participantId: p.participantId || p.id || `p${idx + 1}`,
        id: p.id || p.participantId || `p${idx + 1}`,
        name: (p.name || '').trim(),
        dob: p.dob,
        phoneNumber: normalizePhoneNumber(p.phoneNumber || ''),
        age: p.age,
        idProofType: p.idProofType || 'Aadhaar Card (with DOB)'
      }));

      const updated = await api.updateAdminRegistration(record.registrationId, payload);
      if (onRecordUpdated) onRecordUpdated(updated);
      setIsEditing(false);
    } catch (error) {
      setSaveError(error.message || 'Could not save the registration changes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-amber-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 p-6 text-white flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-stone-900">
                  Master Audit Record
                </span>
                <span className="text-xs font-mono text-amber-200">{record.registrationId}</span>
              </div>
              <h3 className="text-xl font-bold font-festive">
                Registration Dossier
              </h3>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            
            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-stone-50 p-4 rounded-2xl border border-stone-200">
              <div>
                <span className="block text-[10px] uppercase font-bold text-stone-400">Date &amp; Time</span>
                <span className="font-bold text-stone-800">{record.dateTime || record.uploadedAt}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-stone-400">Verification</span>
                <span className="font-bold text-emerald-700">{record.verificationStatus || (record.paymentStatus === 'PAID' ? 'VERIFIED' : 'PENDING')}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-stone-400">Payment Status</span>
                <span className="font-semibold text-stone-700 truncate block">{record.paymentStatus}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-stone-400">Transaction Ref</span>
                <span className="font-mono text-stone-700 truncate block">{record.upiTransactionId || record.transactionId || 'None'}</span>
              </div>
            </div>

            {/* Payment Proof Verification Audit Section */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Three-Way Payment Verification Audit</span>
                </span>
                {onViewReceipt && (record.verificationStatus === 'VERIFIED' || record.paymentStatus === 'PAID' || record.receiptPath) && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onViewReceipt(record);
                    }}
                    className="px-3 py-1 bg-royal-crimson hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-amber-200" />
                    <span>View Receipt Image</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                  <span className="text-[10px] text-stone-400 block font-bold uppercase">1. Expected</span>
                  <span className="font-mono font-extrabold text-stone-900 text-sm">₹{expected}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                  <span className="text-[10px] text-stone-400 block font-bold uppercase">2. User Entered</span>
                  <span className="font-mono font-extrabold text-stone-900 text-sm">₹{entered}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                  <span className="text-[10px] text-stone-400 block font-bold uppercase">3. Receipt Detected</span>
                  <span className="font-mono font-extrabold text-emerald-700 text-sm">₹{ocr}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between text-[11px] text-stone-600 pt-1 border-t border-amber-200/60">
                <span>Verified Storage: <strong>receipts/{record.registrationId}/payment_receipt.jpg</strong></span>
                {record.ocrConfidence !== undefined && (
                  <span>Match Confidence: <strong>{(record.ocrConfidence * 100).toFixed(0)}%</strong></span>
                )}
              </div>
            </div>

            {/* Breakdown Table with Age Proof Auditing */}
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-400">
                  PARTICIPANTS &amp; AUDIT PROOF ({record.participants?.length || record.count})
                </h4>
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={startEditing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-extrabold transition-colors"
                  >
                    <PencilLine className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 text-[11px] font-extrabold transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveChanges}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold transition-colors disabled:opacity-60"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSaving ? 'Saving...' : 'Save'}</span>
                    </button>
                  </div>
                )}
              </div>

              {saveError && (
                <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 font-semibold">
                  {saveError}
                </div>
              )}

              <div className="space-y-3">
                {(isEditing ? draftParticipants : record.participants || []).map((p, idx) => (
                  <div 
                    key={p.id || idx}
                    className="p-4 rounded-2xl border border-amber-200/90 bg-white hover:bg-amber-50/30 transition-colors text-sm shadow-2xs"
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="w-7 h-7 rounded-lg bg-stone-100 text-stone-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700">Edit Participant</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            Name
                            <input
                              type="text"
                              value={p.name || ''}
                              onChange={(e) => handleParticipantFieldChange(p.participantId || p.id || `p${idx + 1}`, 'name', e.target.value)}
                              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none"
                            />
                          </label>
                          <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            DOB (DD/MM/YYYY)
                            <input
                              type="text"
                              value={p.dob || ''}
                              onChange={(e) => handleParticipantFieldChange(p.participantId || p.id || `p${idx + 1}`, 'dob', e.target.value)}
                              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none"
                            />
                          </label>
                        </div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
                          Phone Number
                          <div className="relative mt-1">
                            <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                              type="tel"
                              value={p.phoneNumber || p.phone || ''}
                              onChange={(e) => handleParticipantFieldChange(p.participantId || p.id || `p${idx + 1}`, 'phoneNumber', e.target.value)}
                              className="w-full rounded-xl border border-stone-200 bg-stone-50 pl-10 pr-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none"
                            />
                          </div>
                        </label>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="w-7 h-7 rounded-lg bg-stone-100 text-stone-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div>
                            <p className="font-bold text-stone-900 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-stone-400" />
                              <span>{p.name}</span>
                            </p>
                            <p className="text-xs text-stone-500 mt-0.5">
                              Age: <strong>{p.age} yrs</strong> {p.dob ? `• DOB: ${formatToIndianDate(p.dob)} (DD/MM/YYYY)` : ''}
                              {(p.phoneNumber || p.phone) ? ` • Phone: +91 ${p.phoneNumber || p.phone}` : ''} • <span className="font-mono text-stone-400">ID: {p.ticketId}</span>
                            </p>
                            
                            {/* ID Proof Audit Badge */}
                            <div className="mt-2 flex items-center gap-2">
                              {p.idProofUrl ? (
                                <button
                                  type="button"
                                  onClick={() => setInspectingDoc({
                                    url: p.idProofUrl,
                                    name: p.idProofName,
                                    type: p.idProofType,
                                    participantName: p.name,
                                    dob: p.dob,
                                    age: p.age
                                  })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold transition-colors"
                                >
                                  <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Audit {p.idProofType || 'Aadhaar Card'}</span>
                                  <Eye className="w-3 h-3 text-emerald-600 ml-0.5" />
                                </button>
                              ) : (
                                <span className="text-[11px] text-stone-400 italic">
                                  ID Proof: Not provided
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            p.category === 'STUDENT' || p.age <= 20
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-red-50 text-royal-crimson border border-red-200'
                          }`}>
                            {p.category || (p.age <= 20 ? 'STUDENT' : 'ADULT')}
                          </span>
                          <span className="font-extrabold text-stone-900 text-base">
                            ₹{p.price || (p.age <= 20 ? 199 : 299)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Audit Totals Summary */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-sm space-y-1.5">
              <div className="flex justify-between text-stone-700">
                <span>Total Group Size:</span>
                <span className="font-bold text-stone-900">{record.count} Attendees</span>
              </div>
              <div className="flex justify-between text-stone-700">
                <span>Students (≤ 20 yrs):</span>
                <span className="font-bold text-emerald-700">{record.under20Count} × ₹199</span>
              </div>
              <div className="flex justify-between text-stone-700">
                <span>Adults (&gt; 20 yrs):</span>
                <span className="font-bold text-royal-crimson">{record.above20Count} × ₹299</span>
              </div>
              <div className="pt-2 border-t border-amber-200 flex justify-between font-extrabold text-stone-900 text-base">
                <span>TOTAL REVENUE COLLECTED:</span>
                <span className="text-xl text-royal-crimson">₹{record.amount}</span>
              </div>
            </div>

          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenTickets(record);
                }}
                className="px-4 py-2 text-xs font-bold text-royal-crimson bg-red-50 hover:bg-red-100 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>View Linked Passes ({record.participants?.length || record.count})</span>
              </button>

              {onViewReceipt && (record.verificationStatus === 'VERIFIED' || record.paymentStatus === 'PAID' || record.receiptPath) && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onViewReceipt(record);
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <FileCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>View Verified Receipt</span>
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 rounded-xl transition-colors"
            >
              Close Dossier
            </button>
          </div>

        </div>
      </div>

      {/* ID Proof Inspection Modal */}
      {inspectingDoc && (
        <IdProofPreviewModal
          isOpen={Boolean(inspectingDoc)}
          onClose={() => setInspectingDoc(null)}
          participantName={inspectingDoc.participantName}
          documentType={inspectingDoc.type}
          dob={inspectingDoc.dob}
          age={inspectingDoc.age}
          idProofUrl={inspectingDoc.url}
          idProofName={inspectingDoc.name}
        />
      )}
    </>
  );
}
