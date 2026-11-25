import { UserPlus, Users as UsersIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import NativeModal from '../components/NativeModal.jsx';
import Pagination from '../components/Pagination.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import api, { extractErrorMessage } from '../services/api.js';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [bases, setBases] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'BASE_COMMANDER',
    baseId: '',
  });
  const [statusTarget, setStatusTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, bRes] = await Promise.all([
        api.get('/users', { params: { page, limit: 15 } }),
        api.get('/bases?limit=100'),
      ]);
      setUsers(uRes.data?.data || []);
      setPagination(uRes.data?.pagination || null);
      setBases(bRes.data?.data || []);
    } catch (err) {
      setFeedback({ type: 'error', text: extractErrorMessage(err, 'Failed to load users') });
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFeedback({ type: '', text: '' });
    try {
      await api.post('/users', {
        ...form,
        baseId: form.baseId || null,
      });
      setFeedback({ type: 'success', text: `User "${form.username}" created.` });
      setCreateOpen(false);
      setForm({ username: '', password: '', fullName: '', role: 'BASE_COMMANDER', baseId: '' });
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', text: extractErrorMessage(err, 'Failed to create user') });
    } finally {
      setBusy(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusTarget) return;
    setBusy(true);
    try {
      await api.patch(`/users/${statusTarget.id}/status`, { isActive: !statusTarget.isActive });
      setFeedback({
        type: 'success',
        text: `User ${statusTarget.username} ${statusTarget.isActive ? 'deactivated' : 'activated'}.`,
      });
      setStatusTarget(null);
      loadData();
    } catch (err) {
      setFeedback({ type: 'error', text: extractErrorMessage(err, 'Status update failed') });
      setStatusTarget(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <UsersIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              User Management
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Manage system accounts, role assignments, base scope, and active access status.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          New User
        </button>
      </div>

      {feedback.text && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`rounded-lg border px-4 py-3 text-sm ${
            feedback.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div tabIndex={0} role="region" aria-label="Users table" className="table-wrapper">
          <table className="text-left text-sm">
            <thead className="bg-slate-100 text-xs font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Assigned Base</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading users...</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{u.username}</td>
                    <td className="px-4 py-3">{u.fullName || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge value={u.role} /></td>
                    <td className="px-4 py-3">{u.base?.name || 'Global'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge value={u.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setStatusTarget(u)}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold text-white ${
                          u.isActive
                            ? 'bg-rose-600 hover:bg-rose-700'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>

      <NativeModal open={createOpen} onClose={() => setCreateOpen(false)} title="Create User Account">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label htmlFor="usr-name" className="mb-1 block text-xs font-medium">Username *</label>
            <input
              id="usr-name"
              required
              minLength={3}
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
          <div>
            <label htmlFor="usr-full" className="mb-1 block text-xs font-medium">Full Name</label>
            <input
              id="usr-full"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
          <div>
            <label htmlFor="usr-pw" className="mb-1 block text-xs font-medium">Initial Password (min 8 chars) *</label>
            <input
              id="usr-pw"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
          <div>
            <label htmlFor="usr-role" className="mb-1 block text-xs font-medium">Role *</label>
            <select
              id="usr-role"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="ADMIN">ADMIN</option>
              <option value="BASE_COMMANDER">BASE_COMMANDER</option>
              <option value="LOGISTICS_OFFICER">LOGISTICS_OFFICER</option>
            </select>
          </div>
          <div>
            <label htmlFor="usr-base" className="mb-1 block text-xs font-medium">
              Assigned Base {form.role === 'BASE_COMMANDER' ? '*' : '(Optional)'}
            </label>
            <select
              id="usr-base"
              required={form.role === 'BASE_COMMANDER'}
              value={form.baseId}
              onChange={(e) => setForm((f) => ({ ...f, baseId: e.target.value }))}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">None / Global</option>
              {bases.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="min-h-[40px] rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="min-h-[40px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {busy ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </NativeModal>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleToggleStatus}
        loading={busy}
        tone={statusTarget?.isActive ? 'red' : 'blue'}
        title={statusTarget?.isActive ? 'Deactivate User Account' : 'Activate User Account'}
        confirmLabel={statusTarget?.isActive ? 'Deactivate' : 'Activate'}
        message={
          statusTarget
            ? `Are you sure you want to ${statusTarget.isActive ? 'deactivate' : 'activate'} "${statusTarget.username}"? Deactivating immediately revokes active sessions.`
            : ''
        }
      />
    </div>
  );
}
