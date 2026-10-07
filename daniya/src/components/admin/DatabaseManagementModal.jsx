import React, { useEffect, useMemo, useState } from 'react';
import {
  Database,
  X,
  Save,
  Trash2,
  Loader2,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  Eye,
  Phone,
  Ticket,
  MessageSquareText,
  ShieldCheck,
  UserRound,
  ImageIcon,
  ChevronRight,
  Plus
} from 'lucide-react';
import api from '../../services/api';
import AdminReceiptViewerModal from './AdminReceiptViewerModal';
import { formatParticipantPhoneNumbers } from '../../utils/adminTable';

function sanitizePhone(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 10);
}

function buildParticipantDraft(record, index) {
  const source = Array.isArray(record?.participants) ? record.participants[index] || {} : {};
  return {
    id: source.participantId || source.id || `p${index + 1}`,
    participantId: source.participantId || source.id || `p${index + 1}`,
    name: source.name || record?.userName || 'Participant',
    gender: source.gender || source.sex || 'Prefer not to say',
    phoneNumber: source.phoneNumber || source.phone || '',
    dob: source.dob || '',
    age: source.age || '',
    idProofType: source.idProofType || 'Aadhaar Card (with DOB)'
  };
}

function buildDraftFromRecord(record) {
  const participants = Array.isArray(record?.participants) && record.participants.length > 0
    ? record.participants.map((participant, index) => buildParticipantDraft(record, index))
    : [{
        id: 'p1',
        participantId: 'p1',
        name: record?.userName || 'Primary Booker',
        gender: 'Prefer not to say',
        phoneNumber: '',
        dob: '',
        age: '',
        idProofType: 'Aadhaar Card (with DOB)'
      }];

  const primaryContact = participants[0] || {};
  return {
    primaryContactName: record?.userName || primaryContact.name || 'Primary Booker',
    phoneNumber: record?.participants?.[0]?.phoneNumber || record?.participants?.[0]?.phone || '',
    totalPasses: Number(record?.count || record?.participantCount || participants.length || 1),
    paymentStatus: record?.paymentStatus || 'PENDING',
    verificationStatus: record?.verificationStatus || 'PENDING',
    transactionId: record?.transactionId || record?.upiTransactionId || '',
    notes: record?.auditNotes || '',
    participants,
    ticketIds: Array.isArray(record?.ticketIds) ? record.ticketIds : []
  };
}

function AdvancedDatabaseEditor({ isOpen, onClose, onRefreshDashboard }) {
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('registrations');
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [documentData, setDocumentData] = useState({});
  const [rawLoading, setRawLoading] = useState(false);
  const [rawSaving, setRawSaving] = useState(false);
  const [rawStatus, setRawStatus] = useState('');

  const selectedDocumentIsProtected = selectedCollection === 'counters' && selectedDocumentId === 'registration_sequence';

  useEffect(() => {
    if (!isOpen) return;

    const refreshCollections = async () => {
      try {
        const collectionList = await api.getDatabaseCollections();
        setCollections(Array.isArray(collectionList) ? collectionList : []);
        if (Array.isArray(collectionList) && collectionList.length > 0 && !collectionList.includes(selectedCollection)) {
          setSelectedCollection(collectionList[0]);
        }
      } catch (error) {
        setRawStatus(error?.message || 'Unable to load collections.');
      }
    };

    refreshCollections();
  }, [isOpen, selectedCollection]);

  useEffect(() => {
    if (!isOpen) return;

    const refreshDocuments = async () => {
      setRawLoading(true);
      try {
        const docs = await api.getDatabaseCollection(selectedCollection);
        setDocuments(Array.isArray(docs) ? docs : []);
        if (!selectedDocumentId && Array.isArray(docs) && docs.length > 0) {
          setSelectedDocumentId(docs[0].id);
          setDocumentData(docs[0].data || {});
        }
      } catch (error) {
        setRawStatus(error?.message || 'Unable to load documents.');
      } finally {
        setRawLoading(false);
      }
    };

    refreshDocuments();
  }, [selectedCollection, isOpen]);

  const parseFieldValue = (rawValue) => {
    if (typeof rawValue !== 'string') return rawValue;
    const trimmed = rawValue.trim();
    if (trimmed === '') return '';
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;
    const asNumber = Number(trimmed);
    if (!Number.isNaN(asNumber) && trimmed !== '') return asNumber;
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  };

  const updateFieldValue = (key, nextValue) => {
    setDocumentData((current) => ({ ...current, [key]: parseFieldValue(nextValue) }));
  };

  const handleRawSave = async () => {
    if (!selectedDocumentId) {
      setRawStatus('Select a document before saving.');
      return;
    }

    const protectedConfirm = selectedDocumentIsProtected && !window.confirm('This is the protected registration_sequence counter. Editing it affects future IDs. Continue?');
    if (protectedConfirm) return;

    try {
      setRawSaving(true);
      const result = await api.updateDatabaseDocument(selectedCollection, selectedDocumentId, documentData, { confirmCounterOverride: selectedDocumentIsProtected });
      setDocumentData(result.data || documentData);
      setRawStatus(`Saved ${selectedDocumentId}.`);
      if (onRefreshDashboard) await onRefreshDashboard();
    } catch (error) {
      setRawStatus(error?.message || 'Unable to save the document.');
    } finally {
      setRawSaving(false);
    }
  };

  const handleRawDelete = async () => {
    if (!selectedDocumentId) return;
    if (selectedDocumentIsProtected) {
      setRawStatus('The registration_sequence counter is protected and cannot be deleted.');
      return;
    }

    const shouldDelete = window.confirm(`Delete document ${selectedDocumentId} from ${selectedCollection}?`);
    if (!shouldDelete) return;

    try {
      setRawSaving(true);
      await api.deleteDatabaseDocument(selectedCollection, selectedDocumentId);
      setSelectedDocumentId('');
      setDocumentData({});
      setRawStatus(`Deleted ${selectedDocumentId}.`);
    } catch (error) {
      setRawStatus(error?.message || 'Unable to delete the document.');
    } finally {
      setRawSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[101] flex items-center justify-center bg-stone-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-amber-100 bg-gradient-to-r from-amber-50 to-emerald-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-100 p-2 text-amber-700"><Database className="h-5 w-5" /></div>
            <div>
              <h3 className="text-lg font-extrabold text-stone-900">Advanced: Raw DB Editor</h3>
              <p className="text-xs text-stone-500">Developer fallback only</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-stone-200 bg-white p-2 text-stone-500 transition hover:text-stone-900" aria-label="Close advanced editor">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid h-[calc(90vh-86px)] grid-cols-1 lg:grid-cols-[260px_1fr]">
          <aside className="border-r border-stone-200 bg-stone-50 p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">Collections</p>
            </div>
            <div className="space-y-2">
              {collections.map((collection) => (
                <button key={collection} type="button" onClick={() => setSelectedCollection(collection)} className={`w-full rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${selectedCollection === collection ? 'border-amber-400 bg-amber-50 text-amber-900 shadow-sm' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'}`}>
                  {collection}
                </button>
              ))}
            </div>
          </aside>

          <section className="flex min-h-0 flex-col overflow-hidden bg-white">
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">Documents</p>
                <span className="text-sm font-semibold text-stone-700">{selectedCollection}</span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleRawSave} disabled={rawSaving || rawLoading || !selectedDocumentId} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
                  <Save className="h-3.5 w-3.5" />
                  {rawSaving ? 'Saving...' : 'Save'}
                </button>
                <button type="button" onClick={handleRawDelete} disabled={rawSaving || rawLoading || !selectedDocumentId || selectedDocumentIsProtected} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-60">
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>

            <div className="grid min-h-0 grid-cols-1 xl:grid-cols-[260px_1fr]">
              <div className="border-b border-stone-200 bg-stone-50 p-3 xl:border-b-0 xl:border-r">
                <div className="space-y-2 overflow-y-auto pr-1">
                  {documents.map((doc) => (
                    <button key={doc.id} type="button" onClick={() => { setSelectedDocumentId(doc.id); setDocumentData(doc.data || {}); }} className={`w-full rounded-xl border px-3 py-2 text-left transition ${selectedDocumentId === doc.id ? 'border-amber-400 bg-amber-50 text-amber-900' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'}`}>
                      <span className="truncate font-semibold">{doc.id}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto p-4">
                {!selectedDocumentId ? (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-500">Select a document to edit.</div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(documentData || {}).map(([fieldName, fieldValue]) => (
                      <div key={fieldName} className="rounded-xl border border-stone-200 bg-white p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="font-mono text-xs font-bold text-stone-700">{fieldName}</span>
                        </div>
                        <textarea value={typeof fieldValue === 'string' ? fieldValue : JSON.stringify(fieldValue, null, 2)} onChange={(event) => updateFieldValue(fieldName, event.target.value)} rows={Math.max(3, String(fieldValue || '').split('\n').length + 1)} className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {rawStatus && <div className="border-t border-stone-200 bg-stone-50 px-4 py-3 text-xs font-medium text-stone-700">{rawStatus}</div>}
          </section>
        </div>
      </div>
    </div>
  );
}

export default function DatabaseManagementModal({ isOpen, onClose, onRefreshDashboard, initialRecordId = null }) {
  const [records, setRecords] = useState([]);
  const [selectedRegistrationId, setSelectedRegistrationId] = useState(initialRecordId || '');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showReceiptZoom, setShowReceiptZoom] = useState(false);

  const primaryContactName = useMemo(() => {
    if (!selectedRecord) return 'Primary Booker';
    return selectedRecord.userName || selectedRecord.participants?.[0]?.name || 'Primary Booker';
  }, [selectedRecord]);

  const receiptUrl = useMemo(() => {
    if (!selectedRecord) return null;
    return selectedRecord.receiptPath ? `${api.getAdminReceiptUrl(selectedRecord.registrationId)}` : null;
  }, [selectedRecord]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialRecordId || selectedRegistrationId) {
      return;
    }

    let active = true;

    const loadList = async () => {
      setLoading(true);
      try {
        const list = await api.getAdminRegistrations();
        if (!active) return;
        setRecords(Array.isArray(list) ? list : []);
        if (Array.isArray(list) && list.length > 0) {
          setSelectedRegistrationId(list[0].registrationId);
        }
      } catch (error) {
        console.error('Failed to load admin registrations for audit drawer:', error);
        setStatusText(error?.message || 'Unable to load registrations.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadList();
    return () => { active = false; };
  }, [isOpen, initialRecordId, selectedRegistrationId]);

  useEffect(() => {
    if (!isOpen) return;
    if (!selectedRegistrationId) return;

    let active = true;
    const loadSelectedRecord = async () => {
      setLoading(true);
      try {
        const record = await api.getAdminRegistration(selectedRegistrationId);
        if (!active) return;
        setSelectedRecord(record);
        setDraft(buildDraftFromRecord(record));
        setStatusText('');
      } catch (error) {
        console.error('Failed to load selected registration:', error);
        setStatusText(error?.message || 'Unable to load the selected registration.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadSelectedRecord();
    return () => { active = false; };
  }, [isOpen, selectedRegistrationId]);

  useEffect(() => {
    if (initialRecordId && initialRecordId !== selectedRegistrationId) {
      setSelectedRegistrationId(initialRecordId);
    }
  }, [initialRecordId, selectedRegistrationId]);

  const updateDraft = (key, value) => {
    setDraft((current) => ({ ...(current || buildDraftFromRecord(selectedRecord)), [key]: value }));
  };

  const updateParticipantDraft = (index, key, value) => {
    setDraft((current) => {
      if (!current) return current;
      const nextParticipants = [...current.participants];
      nextParticipants[index] = { ...nextParticipants[index], [key]: value };
      return { ...current, participants: nextParticipants };
    });
  };

  const handleSave = async () => {
    if (!selectedRegistrationId || !selectedRecord) {
      setStatusText('Select a registration before saving.');
      return;
    }

    try {
      setSaving(true);
      setStatusText('Saving attendee record...');

      const participantPayload = (draft?.participants || []).map((participant, index) => ({
        participantId: participant.participantId || participant.id || `p${index + 1}`,
        id: participant.id || participant.participantId || `p${index + 1}`,
        name: participant.name?.trim() || selectedRecord.participants?.[index]?.name || `Participant ${index + 1}`,
        gender: participant.gender || selectedRecord.participants?.[index]?.gender || 'Prefer not to say',
        phoneNumber: sanitizePhone(participant.phoneNumber || selectedRecord.participants?.[index]?.phoneNumber || draft.phoneNumber || ''),
        phone: sanitizePhone(participant.phoneNumber || selectedRecord.participants?.[index]?.phoneNumber || draft.phoneNumber || ''),
        dob: participant.dob || selectedRecord.participants?.[index]?.dob || '',
        age: participant.age || selectedRecord.participants?.[index]?.age || '',
        idProofType: participant.idProofType || selectedRecord.participants?.[index]?.idProofType || 'Aadhaar Card (with DOB)'
      }));

      const nextRegistrationData = {
        ...selectedRecord,
        userName: draft.primaryContactName || primaryContactName,
        participants: participantPayload,
        participantCount: participantPayload.length,
        count: participantPayload.length,
        transactionId: draft.transactionId || selectedRecord.transactionId || '',
        auditNotes: draft.notes || '',
        paymentStatus: draft.paymentStatus || 'PENDING',
        verificationStatus: draft.verificationStatus || 'PENDING',
        updatedAt: new Date().toISOString(),
        ticketIds: draft.ticketIds || selectedRecord.ticketIds || []
      };

      await api.updateDatabaseDocument('registrations', selectedRegistrationId, nextRegistrationData, { confirmCounterOverride: false });
      await api.updateAdminRegistration(selectedRegistrationId, participantPayload);

      const refreshed = await api.getAdminRegistration(selectedRegistrationId);
      setSelectedRecord(refreshed);
      setDraft(buildDraftFromRecord(refreshed));
      setStatusText('Registration saved and synced to the dashboard export.');

      if (onRefreshDashboard) {
        await onRefreshDashboard();
      }
    } catch (error) {
      console.error('Failed to save registration:', error);
      setStatusText(error?.message || 'Unable to save the attendee record.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRegistrationId) return;

    const shouldDelete = window.confirm(`Delete registration ${selectedRegistrationId}? This will remove the master record and it will disappear from the dashboard export.`);
    if (!shouldDelete) return;

    try {
      setSaving(true);
      setStatusText('Deleting registration...');
      await api.deleteDatabaseDocument('registrations', selectedRegistrationId);
      setRecords((current) => current.filter((record) => record.registrationId !== selectedRegistrationId));
      setSelectedRegistrationId(records.find((record) => record.registrationId !== selectedRegistrationId)?.registrationId || '');
      setSelectedRecord(null);
      setDraft(null);
      if (onRefreshDashboard) {
        await onRefreshDashboard();
      }
      if (onClose) {
        onClose();
      }
      setStatusText('Registration deleted.');
    } catch (error) {
      console.error('Failed to delete registration:', error);
      setStatusText(error?.message || 'Unable to delete the registration.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  if (showAdvanced) {
    return <AdvancedDatabaseEditor isOpen={showAdvanced} onClose={() => setShowAdvanced(false)} onRefreshDashboard={onRefreshDashboard} />;
  }

  const activeStatusLabel = draft?.paymentStatus === 'PAID' ? 'Approved' : draft?.paymentStatus === 'FAILED' ? 'Rejected' : 'Pending Audit';
  const primaryPhone = draft?.phoneNumber || selectedRecord?.participants?.[0]?.phoneNumber || selectedRecord?.participants?.[0]?.phone || '';

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/70 p-3 sm:p-6 backdrop-blur-sm">
        <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-[28px] border border-amber-200 bg-[#fffdf9] shadow-[0_30px_80px_rgba(120,53,15,0.25)]">
          <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-gradient-to-r from-[#fff7ed] via-[#fffbeb] to-[#f0fdf4] px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-800">Registration</span>
                  <span className="truncate font-mono text-sm font-bold text-stone-900">{selectedRegistrationId || selectedRecord?.registrationId || 'Loading...'}</span>
                </div>
                <p className="mt-1 text-xs text-stone-500">{selectedRecord?.createdAt || selectedRecord?.dateTime || 'Created recently'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(true)}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-600 transition hover:border-stone-300 hover:text-stone-900"
              >
                <Database className="h-3.5 w-3.5" />
                Advanced
              </button>
              <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 transition hover:text-stone-900" aria-label="Close attendee audit drawer">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[calc(90vh-90px)] overflow-y-auto p-4 sm:p-5">
            {loading || !selectedRecord || !draft ? (
              <div className="flex min-h-[350px] items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white text-stone-500">
                <div className="flex items-center gap-3 text-sm font-medium">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                  Loading registration dossier...
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <span className="font-bold uppercase tracking-[0.18em]">Status</span>
                    <select
                      value={draft.paymentStatus}
                      onChange={(event) => updateDraft('paymentStatus', event.target.value)}
                      className="rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-2 text-xs font-bold text-stone-700 outline-none ring-0 transition focus:border-amber-400"
                    >
                      <option value="PAID">Approved</option>
                      <option value="PENDING">Pending Audit</option>
                      <option value="FAILED">Rejected / Mismatch</option>
                    </select>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={onClose} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 transition hover:border-stone-300 hover:bg-stone-50">
                      Cancel
                    </button>
                    <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white shadow-sm transition hover:brightness-105 disabled:opacity-60">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      {saving ? 'Saving...' : 'Save & Mark Verified'}
                    </button>
                    <button type="button" onClick={handleDelete} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60">
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Registration
                    </button>
                  </div>
                </div>

                {statusText && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" />
                    {statusText}
                  </div>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-3xl border border-amber-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">Payment verification</p>
                        <h3 className="mt-1 text-lg font-extrabold text-stone-900">Proof & amount review</h3>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${draft.paymentStatus === 'PAID' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : draft.paymentStatus === 'FAILED' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                        {activeStatusLabel}
                      </span>
                    </div>

                    <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-3">
                      {receiptUrl ? (
                        <>
                          <button type="button" onClick={() => setShowReceiptZoom(true)} className="group relative w-full overflow-hidden rounded-2xl border border-amber-200 bg-white text-left shadow-sm transition hover:border-amber-300">
                            <img src={receiptUrl} alt="Payment receipt preview" className="h-48 w-full object-cover transition duration-200 group-hover:scale-[1.02]" />
                            <div className="flex items-center justify-between bg-gradient-to-r from-stone-900/80 to-stone-800/60 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                              <span>Receipt preview</span>
                              <Eye className="h-3.5 w-3.5" />
                            </div>
                          </button>
                          <p className="mt-2 text-[11px] text-stone-500">Click to zoom / lightbox for UTR verification.</p>
                        </>
                      ) : (
                        <div className="flex min-h-[140px] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white px-4 text-center">
                          <ImageIcon className="mb-3 h-8 w-8 text-stone-400" />
                          <p className="text-sm font-bold text-stone-700">No receipt uploaded</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">Expected</p>
                          <p className="mt-1 font-mono text-lg font-extrabold text-stone-900">₹{selectedRecord.expectedAmount ?? selectedRecord.amount ?? 0}</p>
                        </div>
                        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">Claimed</p>
                          <p className="mt-1 font-mono text-lg font-extrabold text-stone-900">₹{selectedRecord.enteredAmount ?? selectedRecord.amount ?? 0}</p>
                        </div>
                      </div>

                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">UTR / UPI reference</span>
                        <input
                          value={draft.transactionId}
                          onChange={(event) => updateDraft('transactionId', event.target.value)}
                          className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-amber-400 focus:bg-white"
                          placeholder="e.g. 429182749102"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">Audit notes</span>
                        <textarea
                          value={draft.notes}
                          onChange={(event) => updateDraft('notes', event.target.value)}
                          rows={3}
                          className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-amber-400 focus:bg-white"
                          placeholder="Verified manually via HDFC / GPay business account"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-amber-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">Editable attendee info</p>
                        <h3 className="mt-1 text-lg font-extrabold text-stone-900">Booker & pass details</h3>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block sm:col-span-2">
                          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">Primary contact</span>
                          <input
                            value={draft.primaryContactName}
                            onChange={(event) => updateDraft('primaryContactName', event.target.value)}
                            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-amber-400 focus:bg-white"
                          />
                        </label>

                        <label className="block sm:col-span-1">
                          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">Phone number</span>
                          <div className="flex items-center gap-2">
                            <input
                              value={primaryPhone}
                              onChange={(event) => {
                                const next = sanitizePhone(event.target.value);
                                updateDraft('phoneNumber', next);
                                setDraft((current) => {
                                  if (!current) return current;
                                  const nextParticipants = [...current.participants];
                                  if (nextParticipants[0]) {
                                    nextParticipants[0] = { ...nextParticipants[0], phoneNumber: next, phone: next };
                                  }
                                  return { ...current, participants: nextParticipants, phoneNumber: next };
                                });
                              }}
                              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-amber-400 focus:bg-white"
                            />
                            {primaryPhone && (
                              <a
                                href={`https://wa.me/91${primaryPhone.replace(/^\+?91/, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
                                title="Open WhatsApp"
                              >
                                <Phone className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </label>

                        <label className="block sm:col-span-1">
                          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">Total passes</span>
                          <input
                            type="number"
                            min="1"
                            value={draft.totalPasses}
                            onChange={(event) => updateDraft('totalPasses', Number(event.target.value) || 1)}
                            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-amber-400 focus:bg-white"
                          />
                        </label>
                      </div>

                      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">Participants</span>
                          <button type="button" onClick={() => setDraft((current) => ({ ...current, participants: [...current.participants, { id: `p${current.participants.length + 1}`, participantId: `p${current.participants.length + 1}`, name: `Participant ${current.participants.length + 1}`, gender: 'Prefer not to say', phoneNumber: '', dob: '', age: '', idProofType: 'Aadhaar Card (with DOB)' }] }))} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-2 py-1 text-[10px] font-bold text-amber-700">
                            <Plus className="h-3 w-3" />
                            Add attendee
                          </button>
                        </div>

                        <div className="space-y-2">
                          {draft.participants.map((participant, index) => (
                            <div key={participant.id || `participant-${index}`} className="rounded-xl border border-stone-200 bg-white p-2.5">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">{index + 1}</span>
                                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">{participant.gender || 'Prefer not to say'}</span>
                              </div>

                              <div className="grid gap-2 sm:grid-cols-[1.5fr_0.8fr]">
                                <input
                                  value={participant.name}
                                  onChange={(event) => updateParticipantDraft(index, 'name', event.target.value)}
                                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-2 text-sm text-stone-900 outline-none focus:border-amber-400"
                                  placeholder="Participant name"
                                />
                                <select
                                  value={participant.gender}
                                  onChange={(event) => updateParticipantDraft(index, 'gender', event.target.value)}
                                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-2 text-sm text-stone-900 outline-none focus:border-amber-400"
                                >
                                  <option value="Male">Male</option>
                                  <option value="Female">Female</option>
                                  <option value="Prefer not to say">Prefer not to say</option>
                                </select>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">Assigned ticket IDs</span>
                          <Ticket className="h-3.5 w-3.5 text-amber-600" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(draft.ticketIds.length > 0 ? draft.ticketIds : selectedRecord.ticketIds || []).map((ticketId) => (
                            <span key={ticketId} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800">
                              {ticketId}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showReceiptZoom && receiptUrl && (
        <AdminReceiptViewerModal
          isOpen={showReceiptZoom}
          record={selectedRecord}
          onClose={() => setShowReceiptZoom(false)}
        />
      )}
    </>
  );
}
