import { FileText } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import Pagination from '../components/Pagination.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api, { extractErrorMessage } from '../services/api.js';

export default function AuditLogs() {
  const { user, policy } = useAuth();
  const canFilterBase =
    user?.role === 'ADMIN' ||
    (user?.role === 'LOGISTICS_OFFICER' && policy?.logisticsGlobalScope);

  const [bases, setBases] = useState([]);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    baseId: '',
    entityType: '',
    action: '',
    page: 1,
    limit: 20,
  });

  useEffect(() => {
    api
      .get('/bases?limit=100')
      .then((res) => setBases(res.data?.data || []))
      .catch(() => {});
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
      const res = await api.get('/audit-logs', { params });
      setLogs(res.data?.data || []);
      setPagination(res.data?.pagination || null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load audit logs'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <FileText className="h-6 w-6 text-blue-600" aria-hidden="true" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Audit Logs
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Immutable chronological record of authentication, inventory mutations, and administrative actions.
          </p>
        </div>
      </div>

      <search className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {canFilterBase && (
            <div>
              <label htmlFor="aud-base" className="mb-1 block text-xs font-medium">Base</label>
              <select
                id="aud-base"
                value={filters.baseId}
                onChange={(e) => setFilters((f) => ({ ...f, baseId: e.target.value, page: 1 }))}
                className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">All Bases</option>
                {bases.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="aud-entity" className="mb-1 block text-xs font-medium">Entity Type</label>
            <select
              id="aud-entity"
              value={filters.entityType}
              onChange={(e) => setFilters((f) => ({ ...f, entityType: e.target.value, page: 1 }))}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">All Entities</option>
              <option value="PURCHASE">PURCHASE</option>
              <option value="TRANSFER">TRANSFER</option>
              {user?.role !== 'LOGISTICS_OFFICER' && (
                <>
                  <option value="ASSIGNMENT">ASSIGNMENT</option>
                  <option value="EXPENDITURE">EXPENDITURE</option>
                  <option value="INVENTORY">INVENTORY</option>
                  <option value="USER">USER</option>
                  <option value="BASE">BASE</option>
                  <option value="EQUIPMENT">EQUIPMENT</option>
                  <option value="AUTH">AUTH</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label htmlFor="aud-action" className="mb-1 block text-xs font-medium">Action Filter</label>
            <input
              id="aud-action"
              type="search"
              placeholder="e.g. TRANSFER_COMPLETED"
              value={filters.action}
              onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value, page: 1 }))}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
        </div>
      </search>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div tabIndex={0} role="region" aria-label="Audit log entries" className="table-wrapper">
          <table className="text-left text-sm">
            <thead className="bg-slate-100 text-xs font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Base</th>
                <th className="px-4 py-3">Details & Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading audit trail...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No audit records match filters.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="align-top hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">{log.user?.username}</p>
                      <StatusBadge value={log.user?.role} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold">
                      {log.action}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">{log.entityType}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      {log.base?.name || 'Global'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <p className="text-slate-700 dark:text-slate-200">{log.details}</p>
                      {(log.previousValues || log.newValues) && (
                        <details className="mt-1">
                          <summary className="cursor-pointer font-medium text-blue-600 dark:text-blue-400">
                            View payload diff
                          </summary>
                          <div className="mt-1.5 grid grid-cols-1 gap-2 rounded bg-slate-100 p-2 font-mono text-[11px] dark:bg-slate-950 sm:grid-cols-2">
                            <div>
                              <span className="font-semibold text-slate-500">Previous:</span>
                              <pre className="mt-0.5 whitespace-pre-wrap break-all">
                                {log.previousValues ? JSON.stringify(log.previousValues, null, 2) : 'null'}
                              </pre>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-500">New:</span>
                              <pre className="mt-0.5 whitespace-pre-wrap break-all">
                                {log.newValues ? JSON.stringify(log.newValues, null, 2) : 'null'}
                              </pre>
                            </div>
                          </div>
                        </details>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          pagination={pagination}
          onPageChange={(nextPage) => setFilters((f) => ({ ...f, page: nextPage }))}
        />
      </div>
    </div>
  );
}
