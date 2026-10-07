import React, { useEffect, useMemo, useState } from 'react';
import { Database, Save, Trash2, X, Plus, ShieldAlert } from 'lucide-react';
import api from '../../services/api';

function parseFieldValue(rawValue) {
  if (typeof rawValue !== 'string') return rawValue;
  const trimmed = rawValue.trim();
  if (trimmed === '') return '';
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  const asNumber = Number(trimmed);
  if (!Number.isNaN(asNumber) && trimmed !== '') {
    return asNumber;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

export default function DatabaseManagementModal({ isOpen, onClose, onRefreshDashboard }) {
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('registrations');
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [documentData, setDocumentData] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusText, setStatusText] = useState('');

  const selectedDocument = useMemo(
    () => documents.find((doc) => doc.id === selectedDocumentId) || null,
    [documents, selectedDocumentId]
  );

  const selectedDocumentIsProtected =
    selectedCollection === 'counters' && selectedDocumentId === 'registration_sequence';

  const refreshCollections = async () => {
    try {
      const collectionList = await api.getDatabaseCollections();
      setCollections(Array.isArray(collectionList) ? collectionList : []);
      if (Array.isArray(collectionList) && collectionList.length > 0 && !collectionList.includes(selectedCollection)) {
        setSelectedCollection(collectionList[0]);
      }
    } catch (error) {
      console.error('Failed to load Firestore collections:', error);
      setCollections([]);
      setStatusText(error?.message || 'Unable to load collections.');
    }
  };

  const refreshDocuments = async (collectionName = selectedCollection) => {
    try {
      setLoading(true);
      const docs = await api.getDatabaseCollection(collectionName);
      setDocuments(Array.isArray(docs) ? docs : []);
      if (!selectedDocumentId) {
        const first = Array.isArray(docs) && docs.length > 0 ? docs[0].id : '';
        setSelectedDocumentId(first);
        setDocumentData(first ? docs[0].data || {} : {});
      }
    } catch (error) {
      console.error('Failed to load collection documents:', error);
      setDocuments([]);
      setStatusText(error?.message || 'Unable to load collection documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setStatusText('');
    refreshCollections();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    refreshDocuments(selectedCollection);
  }, [selectedCollection, isOpen]);

  const handleDocumentSelect = (doc) => {
    setSelectedDocumentId(doc.id);
    setDocumentData(doc.data || {});
  };

  const updateFieldValue = (key, nextValue) => {
    setDocumentData((current) => ({
      ...current,
      [key]: parseFieldValue(nextValue)
    }));
  };

  const addField = () => {
    const fieldName = window.prompt('Enter a new field name:', 'new_field');
    if (!fieldName) return;
    const trimmed = fieldName.trim();
    if (!trimmed) return;
    setDocumentData((current) => ({
      ...current,
      [trimmed]: ''
    }));
  };

  const removeField = (fieldName) => {
    setDocumentData((current) => {
      const next = { ...current };
      delete next[fieldName];
      return next;
    });
  };

  const handleCreateDocument = async () => {
    const nextId = window.prompt(`Create a new document in ${selectedCollection}:`, 'new_document');
    if (!nextId || !nextId.trim()) return;

    try {
      setSaving(true);
      const created = await api.createDatabaseDocument(selectedCollection, nextId.trim(), {});
      setSelectedDocumentId(created.id || nextId.trim());
      setDocumentData(created.data || {});
      await refreshDocuments(selectedCollection);
      setStatusText(`Created ${created.id || nextId.trim()} in ${selectedCollection}.`);
    } catch (error) {
      setStatusText(error?.message || 'Unable to create the document.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!selectedDocumentId) {
      setStatusText('Select a document before saving.');
      return;
    }

    const protectedConfirm =
      selectedDocumentIsProtected &&
      !window.confirm('This is the protected registration_sequence counter. Editing it affects future IDs. Continue?');

    if (protectedConfirm) return;

    try {
      setSaving(true);
      const result = await api.updateDatabaseDocument(
        selectedCollection,
        selectedDocumentId,
        documentData,
        { confirmCounterOverride: selectedDocumentIsProtected }
      );
      setDocumentData(result.data || documentData);
      await refreshDocuments(selectedCollection);
      setStatusText(`Saved ${selectedDocumentId}.`);
      if (onRefreshDashboard) {
        await onRefreshDashboard();
      }
    } catch (error) {
      setStatusText(error?.message || 'Unable to save the document.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDocumentId) return;
    if (selectedDocumentIsProtected) {
      setStatusText('The registration_sequence counter is protected and cannot be deleted.');
      return;
    }

    const shouldDelete = window.confirm(`Delete document ${selectedDocumentId} from ${selectedCollection}?`);
    if (!shouldDelete) return;

    try {
      setSaving(true);
      await api.deleteDatabaseDocument(selectedCollection, selectedDocumentId);
      setSelectedDocumentId('');
      setDocumentData({});
      await refreshDocuments(selectedCollection);
      setStatusText(`Deleted ${selectedDocumentId}.`);
      if (onRefreshDashboard) {
        await onRefreshDashboard();
      }
    } catch (error) {
      setStatusText(error?.message || 'Unable to delete the document.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-amber-100 bg-gradient-to-r from-amber-50 to-emerald-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-100 p-2 text-amber-700">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-stone-900">Admin Firestore Database Editor</h3>
              <p className="text-xs text-stone-500">Protected source-of-truth management</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-200 bg-white p-2 text-stone-500 transition hover:text-stone-900"
            aria-label="Close database editor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid h-[calc(90vh-86px)] grid-cols-1 lg:grid-cols-[260px_1fr]">
          <aside className="border-r border-stone-200 bg-stone-50 p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">Collections</p>
              <button
                type="button"
                onClick={handleCreateDocument}
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"
              >
                <Plus className="h-3.5 w-3.5" />
                New Doc
              </button>
            </div>

            <div className="space-y-2">
              {collections.map((collection) => (
                <button
                  key={collection}
                  type="button"
                  onClick={() => setSelectedCollection(collection)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                    selectedCollection === collection
                      ? 'border-amber-400 bg-amber-50 text-amber-900 shadow-sm'
                      : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                  }`}
                >
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
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || loading || !selectedDocumentId}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving || loading || !selectedDocumentId || selectedDocumentIsProtected}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>

            <div className="grid min-h-0 grid-cols-1 xl:grid-cols-[260px_1fr]">
              <div className="border-b border-stone-200 bg-stone-50 p-3 xl:border-b-0 xl:border-r">
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">Document List</p>
                <div className="space-y-2 overflow-y-auto pr-1">
                  {loading ? (
                    <div className="text-sm text-stone-500">Loading...</div>
                  ) : documents.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-stone-300 bg-white p-3 text-sm text-stone-500">
                      No documents found.
                    </div>
                  ) : (
                    documents.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => handleDocumentSelect(doc)}
                        className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                          selectedDocumentId === doc.id
                            ? 'border-amber-400 bg-amber-50 text-amber-900'
                            : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-semibold">{doc.id}</span>
                          {selectedCollection === 'counters' && doc.id === 'registration_sequence' && (
                            <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto p-4">
                {selectedDocumentIsProtected && (
                  <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                    Protected field: the registration_sequence counter is locked unless you confirm the override.
                  </div>
                )}

                {!selectedDocumentId ? (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-500">
                    Select or create a document to edit.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                      <div className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">Document ID</div>
                      <div className="font-mono text-sm font-bold text-stone-800">{selectedDocumentId}</div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">Fields</p>
                      <button
                        type="button"
                        onClick={addField}
                        className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-1 text-[10px] font-bold text-stone-700"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Field
                      </button>
                    </div>

                    {Object.entries(documentData || {}).length === 0 ? (
                      <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-500">
                        No fields yet in this document.
                      </div>
                    ) : (
                      Object.entries(documentData || {}).map(([fieldName, fieldValue]) => (
                        <div key={fieldName} className="rounded-xl border border-stone-200 bg-white p-3">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="font-mono text-xs font-bold text-stone-700">{fieldName}</span>
                            <button
                              type="button"
                              onClick={() => removeField(fieldName)}
                              className="text-[10px] font-bold text-red-700 hover:text-red-900"
                            >
                              Remove
                            </button>
                          </div>
                          <textarea
                            value={typeof fieldValue === 'string' ? fieldValue : JSON.stringify(fieldValue, null, 2)}
                            onChange={(event) => updateFieldValue(fieldName, event.target.value)}
                            rows={Math.max(3, String(fieldValue || '').split('\n').length + 1)}
                            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                          />
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {statusText && (
              <div className="border-t border-stone-200 bg-stone-50 px-4 py-3 text-xs font-medium text-stone-700">
                {statusText}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
