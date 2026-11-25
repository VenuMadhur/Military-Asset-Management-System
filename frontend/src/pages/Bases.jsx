import { Building2, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import NativeModal from '../components/NativeModal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import api, { extractErrorMessage } from '../services/api.js';

export default function Bases() {
  const [bases, setBases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', location: '', description: '', isActive: true });

  const loadBases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/bases?limit=100');
      setBases(res.data?.data || []);
    } catch (err) {
      setFeedback({ type: 'error', text: extractErrorMessage(err, 'Failed to load bases') });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBases();
  }, [loadBases]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', location: '', description: '', isActive: true });
    setModalOpen(true);
  };

  const openEdit = (base) => {
    setEditing(base);
    setForm({
      name: base.name,
      location: base.location,
      description: base.description || '',
      isActive: base.isActive,
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', text: '' });
    try {
      if (editing) {
        await api.put(`/bases/${editing.id}`, form);
        setFeedback({ type: 'success', text: `Updated base "${form.name}".` });
      } else {
        await api.post('/bases', form);
        setFeedback({ type: 'success', text: `Created base "${form.name}".` });
      }
      setModalOpen(false);
      loadBases();
    } catch (err) {
      setFeedback({ type: 'error', text: extractErrorMessage(err, 'Failed to save base') });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Building2 className="h-6 w-6 text-blue-600" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Base Management
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Configure military installations participating in inventory and transfer operations.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Base
        </button>
      </div>

      {feedback.text && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`rounded-lg border px-4 py-3 text-sm ${
            feedback.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading bases...</p>
        ) : (
          bases.map((b) => (
            <div
              key={b.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">{b.name}</h2>
                  <StatusBadge value={b.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </div>
                <p className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400">{b.location}</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {b.description || 'No description provided.'}
                </p>
              </div>
              <div className="mt-4 flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => openEdit(b)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Edit Base
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <NativeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Military Base' : 'Add Military Base'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="base-name" className="mb-1 block text-xs font-medium">Base Name *</label>
            <input
              id="base-name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
          <div>
            <label htmlFor="base-loc" className="mb-1 block text-xs font-medium">Location *</label>
            <input
              id="base-loc"
              required
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
          <div>
            <label htmlFor="base-desc" className="mb-1 block text-xs font-medium">Description</label>
            <textarea
              id="base-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="h-4 w-4 accent-blue-600"
            />
            <span>Active installation</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="min-h-[40px] rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Save Base
            </button>
          </div>
        </form>
      </NativeModal>
    </div>
  );
}
