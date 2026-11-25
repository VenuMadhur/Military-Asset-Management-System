import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api, { extractErrorMessage } from '../services/api.js';

export default function Reports() {
  const { user, policy } = useAuth();
  const canFilterBase =
    user?.role === 'ADMIN' ||
    (user?.role === 'LOGISTICS_OFFICER' && policy?.logisticsGlobalScope);

  const [bases, setBases] = useState([]);
  const [filters, setFilters] = useState({ baseId: '', startDate: '', endDate: '' });
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/bases?limit=100')
      .then((res) => setBases(res.data?.data || []))
      .catch(() => {});
  }, []);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
      const res = await api.get('/dashboard/reports', { params });
      setReports(res.data?.data || null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load operational reports'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Operational Reports
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Consolidated category summaries, base comparisons, and recent operational activity.
        </p>
      </div>

      <search className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {canFilterBase && (
            <div>
              <label htmlFor="rep-base" className="mb-1 block text-xs font-medium">Base</label>
              <select
                id="rep-base"
                value={filters.baseId}
                onChange={(e) => setFilters((f) => ({ ...f, baseId: e.target.value }))}
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
            <label htmlFor="rep-start" className="mb-1 block text-xs font-medium">Start Date</label>
            <input
              id="rep-start"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
          <div>
            <label htmlFor="rep-end" className="mb-1 block text-xs font-medium">End Date</label>
            <input
              id="rep-end"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
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

      {loading ? (
        <p className="text-sm text-slate-500">Generating reports...</p>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
              Category Summary (Purchases vs. Expenditures vs. Closing Balance)
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reports?.byCategory || []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.35} />
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="purchases" name="Purchases" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expended" name="Expended" fill="#e11d48" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="closingBalance" name="Closing Balance" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <h2 className="text-sm font-semibold">Recent Purchases</h2>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {(reports?.recentPurchases || []).length === 0 ? (
                  <p className="p-4 text-sm text-slate-500">No recent purchases.</p>
                ) : (
                  reports.recentPurchases.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                      <div>
                        <p className="font-medium">{p.equipmentType?.name}</p>
                        <p className="text-xs text-slate-500">{p.base?.name} · {p.referenceNumber}</p>
                      </div>
                      <span className="font-semibold text-emerald-600">+{p.quantity}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <h2 className="text-sm font-semibold">Recent Transfers</h2>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {(reports?.recentTransfers || []).length === 0 ? (
                  <p className="p-4 text-sm text-slate-500">No recent transfers.</p>
                ) : (
                  reports.recentTransfers.map((t) => (
                    <div key={t.id} className="flex items-center justify-between px-5 py-3 text-sm">
                      <div>
                        <p className="font-medium">
                          {t.sourceBase?.name} -&gt; {t.destinationBase?.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t.equipmentType?.name} ({t.quantity}) · {t.referenceNumber}
                        </p>
                      </div>
                      <StatusBadge value={t.status} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
