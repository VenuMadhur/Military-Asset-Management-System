import { ArrowUpDown, Search, SlidersHorizontal } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import NativeModal from '../components/NativeModal.jsx';
import Pagination from '../components/Pagination.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api, { extractErrorMessage } from '../services/api.js';

export default function Inventory() {
  const { user, policy } = useAuth();
  const canFilterBase =
    user?.role === 'ADMIN' ||
    (user?.role === 'LOGISTICS_OFFICER' && policy?.logisticsGlobalScope);

  const [bases, setBases] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    baseId: '',
    category: '',
    search: '',
    startDate: '',
    endDate: '',
    sortBy: 'equipmentName',
    sortOrder: 'asc',
    page: 1,
    limit: 15,
  });

  // Admin inventory adjustment modal
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    baseId: '',
    equipmentTypeId: '',
    quantityDelta: '',
    reason: '',
  });
  const [adjustMsg, setAdjustMsg] = useState('');

  useEffect(() => {
    Promise.all([api.get('/bases?limit=100'), api.get('/equipment?limit=100')])
      .then(([bRes, eRes]) => {
        setBases(bRes.data?.data || []);
        setEquipmentTypes(eRes.data?.data || []);
      })
      .catch(() => {});
  }, []);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '' && v !== null)
      );
      const res = await api.get('/dashboard/inventory', { params });
      setRows(res.data?.data?.items || []);
      setTotals(res.data?.data?.totals || null);
      setPagination(res.data?.pagination || null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load inventory records'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const toggleSort = (field) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1,
    }));
  };

  const handleAdjustmentSubmit = async (e) => {
    e.preventDefault();
    setAdjustMsg('');
    try {
      await api.post('/dashboard/adjustments', {
        ...adjustForm,
        quantityDelta: Number(adjustForm.quantityDelta),
      });
      setAdjustOpen(false);
      setAdjustForm({ baseId: '', equipmentTypeId: '', quantityDelta: '', reason: '' });
      loadInventory();
    } catch (err) {
      setAdjustMsg(extractErrorMessage(err, 'Adjustment failed'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Base Inventory Ledger
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Audited stock balances computed from ledger transactions and active reservations.
          </p>
        </div>

        {user?.role === 'ADMIN' && (
          <button
            type="button"
            onClick={() => setAdjustOpen(true)}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Admin Stock Correction
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <search className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="inv-search" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Search Equipment
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                id="inv-search"
                type="search"
                placeholder="Equipment name..."
                value={filters.search}
                onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value, page: 1 }))}
                className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
          </div>

          {canFilterBase && (
            <div>
              <label htmlFor="inv-base" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Base
              </label>
              <select
                id="inv-base"
                value={filters.baseId}
                onChange={(e) => setFilters((p) => ({ ...p, baseId: e.target.value, page: 1 }))}
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
            <label htmlFor="inv-cat" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Category
            </label>
            <select
              id="inv-cat"
              value={filters.category}
              onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value, page: 1 }))}
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
            <label htmlFor="inv-start" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Start Date
            </label>
            <input
              id="inv-start"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value, page: 1 }))}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <div>
            <label htmlFor="inv-end" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              End Date
            </label>
            <input
              id="inv-end"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value, page: 1 }))}
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

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div tabIndex={0} role="region" aria-labelledby="inventory-table-caption" className="table-wrapper">
          <table className="text-left text-sm">
            <caption id="inventory-table-caption" className="visually-hidden">
              Base-wise military asset inventory balance table
            </caption>
            <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                {[
                  ['equipmentName', 'Equipment'],
                  ['category', 'Category'],
                  ['baseName', 'Base'],
                  ['openingBalance', 'Opening'],
                  ['purchases', 'Purchases'],
                  ['transfersIn', 'Trf In'],
                  ['transfersOut', 'Trf Out'],
                  ['assigned', 'Assigned'],
                  ['expended', 'Expended'],
                  ['closingBalance', 'Closing'],
                  ['availableQuantity', 'Available'],
                ].map(([key, label]) => (
                  <th key={key} className="whitespace-nowrap border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => toggleSort(key)}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    >
                      <span>{label}</span>
                      <ArrowUpDown className="h-3 w-3 opacity-60" aria-hidden="true" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-slate-500">
                    Loading inventory ledger...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-slate-500">
                    No inventory records match the selected filters.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={`${r.baseId}:${r.equipmentTypeId}`}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-900 dark:text-white">
                      {r.equipmentName}
                    </th>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge value={r.category} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300">
                      {r.baseName}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{r.openingBalance}</td>
                    <td className="px-4 py-3 tabular-nums text-emerald-700 dark:text-emerald-400">
                      +{r.purchases}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-blue-700 dark:text-blue-400">
                      +{r.transfersIn}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-amber-700 dark:text-amber-400">
                      -{r.transfersOut}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{r.assigned}</td>
                    <td className="px-4 py-3 tabular-nums text-rose-700 dark:text-rose-400">
                      {r.expended}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-slate-900 dark:text-white">
                      {r.closingBalance}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {r.availableQuantity}
                      {r.reservedQuantity > 0 && (
                        <span className="ml-1 text-xs font-normal text-amber-600">
                          ({r.reservedQuantity} res.)
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {totals && !loading && rows.length > 0 && (
              <tfoot className="bg-slate-50 font-semibold text-slate-900 dark:bg-slate-800/70 dark:text-white">
                <tr>
                  <td colSpan={3} className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
                    Filtered Totals
                  </td>
                  <td className="border-t border-slate-200 px-4 py-3 tabular-nums dark:border-slate-700">{totals.openingBalance}</td>
                  <td className="border-t border-slate-200 px-4 py-3 tabular-nums dark:border-slate-700">+{totals.purchases}</td>
                  <td className="border-t border-slate-200 px-4 py-3 tabular-nums dark:border-slate-700">+{totals.transfersIn}</td>
                  <td className="border-t border-slate-200 px-4 py-3 tabular-nums dark:border-slate-700">-{totals.transfersOut}</td>
                  <td className="border-t border-slate-200 px-4 py-3 tabular-nums dark:border-slate-700">{totals.assigned}</td>
                  <td className="border-t border-slate-200 px-4 py-3 tabular-nums dark:border-slate-700">{totals.expended}</td>
                  <td className="border-t border-slate-200 px-4 py-3 tabular-nums dark:border-slate-700">{totals.closingBalance}</td>
                  <td className="border-t border-slate-200 px-4 py-3 tabular-nums dark:border-slate-700">{totals.availableQuantity}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <Pagination
          pagination={pagination}
          onPageChange={(nextPage) => setFilters((p) => ({ ...p, page: nextPage }))}
        />
      </div>

      {/* Admin Stock Correction Modal */}
      <NativeModal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        title="Administrative Inventory Adjustment"
      >
        <form onSubmit={handleAdjustmentSubmit} className="space-y-4">
          {adjustMsg && (
            <div role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/60 dark:text-rose-200">
              {adjustMsg}
            </div>
          )}
          <div>
            <label htmlFor="adj-base" className="mb-1 block text-xs font-medium">
              Base
            </label>
            <select
              id="adj-base"
              required
              value={adjustForm.baseId}
              onChange={(e) => setAdjustForm((f) => ({ ...f, baseId: e.target.value }))}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">Select base...</option>
              {bases.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="adj-eq" className="mb-1 block text-xs font-medium">
              Equipment Type
            </label>
            <select
              id="adj-eq"
              required
              value={adjustForm.equipmentTypeId}
              onChange={(e) => setAdjustForm((f) => ({ ...f, equipmentTypeId: e.target.value }))}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">Select equipment...</option>
              {equipmentTypes.map((eq) => (
                <option key={eq.id} value={eq.id}>{eq.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="adj-delta" className="mb-1 block text-xs font-medium">
              Quantity Delta (positive or negative integer)
            </label>
            <input
              id="adj-delta"
              type="number"
              required
              value={adjustForm.quantityDelta}
              onChange={(e) => setAdjustForm((f) => ({ ...f, quantityDelta: e.target.value }))}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
          <div>
            <label htmlFor="adj-reason" className="mb-1 block text-xs font-medium">
              Audit Justification (min 5 characters)
            </label>
            <textarea
              id="adj-reason"
              required
              minLength={5}
              value={adjustForm.reason}
              onChange={(e) => setAdjustForm((f) => ({ ...f, reason: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAdjustOpen(false)}
              className="min-h-[40px] rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Apply Audited Adjustment
            </button>
          </div>
        </form>
      </NativeModal>
    </div>
  );
}
