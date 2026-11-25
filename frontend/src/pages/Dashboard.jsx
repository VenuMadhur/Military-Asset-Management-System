import {
  Activity,
  Archive,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardCheck,
  Flame,
  Info,
  PackageCheck,
  ShoppingCart,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import NetMoveModal from '../components/NetMoveModal.jsx';
import StatCard from '../components/StatCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api, { extractErrorMessage } from '../services/api.js';

const CATEGORY_COLORS = ['#2563eb', '#059669', '#d97706', '#64748b'];

export default function Dashboard() {
  const { user, policy } = useAuth();
  const canFilterBase =
    user?.role === 'ADMIN' ||
    (user?.role === 'LOGISTICS_OFFICER' && policy?.logisticsGlobalScope);

  const [bases, setBases] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [filters, setFilters] = useState({
    baseId: '',
    category: '',
    equipmentTypeId: '',
    startDate: '',
    endDate: '',
  });

  const [summary, setSummary] = useState(null);
  const [movements, setMovements] = useState(null);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [netModalOpen, setNetModalOpen] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/bases?limit=100'), api.get('/equipment?limit=100')])
      .then(([basesRes, eqRes]) => {
        setBases(basesRes.data?.data || []);
        setEquipmentTypes(eqRes.data?.data || []);
      })
      .catch(() => {});
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '')
      );
      const [sumRes, movRes, repRes] = await Promise.all([
        api.get('/dashboard/summary', { params }),
        api.get('/dashboard/movements', { params }),
        api.get('/dashboard/reports', { params }),
      ]);
      setSummary(sumRes.data?.data || null);
      setMovements(movRes.data?.data || null);
      setReports(repRes.data?.data || null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load dashboard metrics'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'category' ? { equipmentTypeId: '' } : {}),
    }));
  };

  const filteredEquipmentOptions = filters.category
    ? equipmentTypes.filter((eq) => eq.category === filters.category)
    : equipmentTypes;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Operational Inventory Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Real-time ledger balances, asset movements, and base readiness metrics.
          </p>
        </div>
      </div>

      {/* Filters */}
      <search className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {canFilterBase && (
            <div>
              <label htmlFor="dash-base" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Base
              </label>
              <select
                id="dash-base"
                value={filters.baseId}
                onChange={(e) => handleFilterChange('baseId', e.target.value)}
                className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">All Bases</option>
                {bases.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="dash-cat" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Category
            </label>
            <select
              id="dash-cat"
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">All Categories</option>
              <option value="VEHICLE">Vehicle</option>
              <option value="WEAPON">Weapon</option>
              <option value="AMMUNITION">Ammunition</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="dash-eq" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Equipment Type
            </label>
            <select
              id="dash-eq"
              value={filters.equipmentTypeId}
              onChange={(e) => handleFilterChange('equipmentTypeId', e.target.value)}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">All Equipment</option>
              {filteredEquipmentOptions.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="dash-start" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Start Date
            </label>
            <input
              id="dash-start"
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <div>
            <label htmlFor="dash-end" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              End Date
            </label>
            <input
              id="dash-end"
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
        </div>
      </search>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <section aria-label="Inventory summary metrics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Opening Balance"
            value={loading ? '...' : summary?.openingBalance ?? 0}
            subtext="Stock prior to reporting window"
            icon={Archive}
            tone="slate"
          />
          <StatCard
            label="Purchases"
            value={loading ? '...' : summary?.purchases ?? 0}
            subtext="Acquired during period"
            icon={ShoppingCart}
            tone="green"
          />
          <StatCard
            label="Transfers In"
            value={loading ? '...' : summary?.transfersIn ?? 0}
            subtext="Completed incoming transfers"
            icon={ArrowDownLeft}
            tone="blue"
          />
          <StatCard
            label="Transfers Out"
            value={loading ? '...' : summary?.transfersOut ?? 0}
            subtext="Completed outgoing transfers"
            icon={ArrowUpRight}
            tone="amber"
          />
          <StatCard
            label="Net Movement"
            value={loading ? '...' : summary?.netMovement ?? 0}
            subtext="Purchases + In - Out"
            icon={Activity}
            tone="blue"
            onClick={() => setNetModalOpen(true)}
            clickableHint="View Breakdown"
          />
          <StatCard
            label="Assigned Assets"
            value={loading ? '...' : summary?.assigned ?? 0}
            subtext={`${summary?.counts?.activeAssignments ?? 0} active assignments`}
            icon={ClipboardCheck}
            tone="amber"
          />
          <StatCard
            label="Expenditures"
            value={loading ? '...' : summary?.expended ?? 0}
            subtext="Consumed during period"
            icon={Flame}
            tone="red"
          />
          <StatCard
            label="Closing Balance"
            value={loading ? '...' : summary?.closingBalance ?? 0}
            subtext={`Available: ${(summary?.availableQuantity ?? 0).toLocaleString('en-US')} (Reserved: ${summary?.reservedQuantity ?? 0})`}
            icon={PackageCheck}
            tone="green"
          />
        </div>
      </section>

      {/* Formula Explanation */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
        <div>
          <p className="font-semibold">Inventory Calculation Methodology</p>
          <p className="mt-0.5">
            <code>Closing Balance = Opening Balance + Net Movement - Assigned - Expended</code>, where{' '}
            <code>Net Movement = Purchases + Transfers In - Transfers Out</code>. Only{' '}
            <strong>COMPLETED</strong> transfers alter ledger balances; <strong>APPROVED</strong> and{' '}
            <strong>IN_TRANSIT</strong> outgoing transfers reserve available stock until receipt confirmation.
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Stock Movement Trends
          </h2>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            Daily purchases, completed transfers, assignments, and expenditures
          </p>
          <div className="h-72">
            {movements?.trends?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={movements.trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.4} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="purchases" name="Purchases" stroke="#059669" strokeWidth={2} />
                  <Line type="monotone" dataKey="transfersIn" name="Transfers In" stroke="#2563eb" strokeWidth={2} />
                  <Line type="monotone" dataKey="transfersOut" name="Transfers Out" stroke="#d97706" strokeWidth={2} />
                  <Line type="monotone" dataKey="expended" name="Expended" stroke="#e11d48" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                No movement trend data for the selected filter window.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Inventory by Category
          </h2>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            Closing balance distribution across equipment categories
          </p>
          <div className="h-72">
            {reports?.byCategory?.some((c) => c.closingBalance > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reports.byCategory.filter((c) => c.closingBalance > 0)}
                    dataKey="closingBalance"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {reports.byCategory
                      .filter((c) => c.closingBalance > 0)
                      .map((entry, idx) => (
                        <Cell key={entry.category} fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} />
                      ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                No category balance data available.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Base-wise Inventory Comparison
          </h2>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            Closing balance vs. available quantity across authorized installations
          </p>
          <div className="h-72">
            {reports?.byBase?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reports.byBase}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.4} />
                  <XAxis dataKey="baseName" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="closingBalance" name="Closing Balance" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="availableQuantity" name="Available Stock" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="assigned" name="Assigned" fill="#d97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                No base comparison data available.
              </div>
            )}
          </div>
        </div>
      </div>

      <NetMoveModal
        open={netModalOpen}
        onClose={() => setNetModalOpen(false)}
        breakdown={movements?.breakdown || summary}
      />
    </div>
  );
}
