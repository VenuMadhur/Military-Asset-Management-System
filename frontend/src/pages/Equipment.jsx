import { Package, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import NativeModal from '../components/NativeModal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import api, { extractErrorMessage } from '../services/api.js';

export default function Equipment() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '',
    category: 'VEHICLE',
    unit: 'UNITS',
    description: '',
    isActive: true,
  });

  const loadEquipment = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/equipment?limit=100');
      setItems(res.data?.data || []);
    } catch (err) {
      setFeedback({ type: 'error', text: extractErrorMessage(err, 'Failed to load equipment catalog') });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEquipment();
  }, [loadEquipment]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', category: 'VEHICLE', unit: 'UNITS', description: '', isActive: true });
    setModalOpen(true);
  };

  const openEdit = (eq) => {
    setEditing(eq);
    setForm({
      name: eq.name,
      category: eq.category,
      unit: eq.unit,
      description: eq.description || '',
      isActive: eq.isActive,
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', text: '' });
    try {
      if (editing) {
        await api.put(`/equipment/${editing.id}`, form);
        setFeedback({ type: 'success', text: `Updated "${form.name}".` });
      } else {
        await api.post('/equipment', form);
        setFeedback({ type: 'success', text: `Created "${form.name}".` });
      }
      setModalOpen(false);
      loadEquipment();
    } catch (err) {
      setFeedback({ type: 'error', text: extractErrorMessage(err, 'Failed to save equipment type') });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Package className="h-6 w-6 text-blue-600" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Equipment Catalog
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Manage standardized administrative equipment types, categories, and tracking units.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Equipment Type
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

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div tabIndex={0} role="region" aria-label="Equipment types table" className="table-wrapper">
          <table className="text-left text-sm">
            <thead className="bg-slate-100 text-xs font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading catalog...</td></tr>
              ) : (
                items.map((eq) => (
                  <tr key={eq.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-medium">{eq.name}</td>
                    <td className="px-4 py-3"><StatusBadge value={eq.category} /></td>
                    <td className="px-4 py-3 font-mono text-xs">{eq.unit}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{eq.description || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge value={eq.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openEdit(eq)}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NativeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Equipment Type' : 'Add Equipment Type'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="eq-name" className="mb-1 block text-xs font-medium">Equipment Name *</label>
            <input
              id="eq-name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="eq-cat" className="mb-1 block text-xs font-medium">Category *</label>
              <select
                id="eq-cat"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="VEHICLE">VEHICLE</option>
                <option value="WEAPON">WEAPON</option>
                <option value="AMMUNITION">AMMUNITION</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
            <div>
              <label htmlFor="eq-unit" className="mb-1 block text-xs font-medium">Unit *</label>
              <input
                id="eq-unit"
                required
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
          </div>
          <div>
            <label htmlFor="eq-desc" className="mb-1 block text-xs font-medium">Description</label>
            <textarea
              id="eq-desc"
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
            <span>Active in catalog</span>
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
              Save Equipment
            </button>
          </div>
        </form>
      </NativeModal>
    </div>
  );
}
