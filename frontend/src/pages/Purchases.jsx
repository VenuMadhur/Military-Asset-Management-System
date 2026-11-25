import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, ShoppingCart } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Pagination from '../components/Pagination.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api, { extractErrorMessage } from '../services/api.js';

const purchaseSchema = z.object({
  baseId: z.string().uuid('Select a valid base'),
  equipmentTypeId: z.string().uuid('Select an equipment type'),
  quantity: z.coerce.number().int('Must be a whole number').positive('Must be greater than 0'),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  referenceNumber: z.string().trim().min(2, 'Reference number is required').max(80),
  supplier: z.string().trim().min(2, 'Supplier is required').max(120),
  remarks: z.string().trim().max(500).optional(),
});

export default function Purchases() {
  const { user } = useAuth();
  const canCreate = ['ADMIN', 'LOGISTICS_OFFICER'].includes(user?.role);

  const [bases, setBases] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [filters, setFilters] = useState({ search: '', baseId: '', page: 1, limit: 10 });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(purchaseSchema),
    mode: 'onBlur',
    defaultValues: {
      purchaseDate: new Date().toISOString().slice(0, 10),
    },
  });

  useEffect(() => {
    Promise.all([api.get('/bases?limit=100'), api.get('/equipment?isActive=true&limit=100')])
      .then(([bRes, eRes]) => {
        setBases(bRes.data?.data || []);
        setEquipment(eRes.data?.data || []);
      })
      .catch(() => {});
  }, []);

  const loadPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
      const res = await api.get('/purchases', { params });
      setPurchases(res.data?.data || []);
      setPagination(res.data?.pagination || null);
    } catch (err) {
      setFeedback({ type: 'error', text: extractErrorMessage(err, 'Failed to load purchases') });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const onSubmit = async (values) => {
    setFeedback({ type: '', text: '' });
    try {
      await api.post('/purchases', {
        ...values,
        purchaseDate: new Date(values.purchaseDate).toISOString(),
      });
      setFeedback({ type: 'success', text: 'Purchase recorded and stock balance updated.' });
      reset({
        baseId: '',
        equipmentTypeId: '',
        quantity: '',
        purchaseDate: new Date().toISOString().slice(0, 10),
        referenceNumber: '',
        supplier: '',
        remarks: '',
      });
      loadPurchases();
    } catch (err) {
      setFeedback({ type: 'error', text: extractErrorMessage(err, 'Failed to record purchase') });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Asset Purchases
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Record procurement deliveries and review base acquisition history.
        </p>
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

      {canCreate && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Record New Purchase
            </h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="po-base" className="mb-1 block text-xs font-medium">
                Receiving Base *
              </label>
              <select
                id="po-base"
                {...register('baseId')}
                className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">Select base...</option>
                {bases.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              {errors.baseId && <p className="mt-1 text-xs text-rose-600">{errors.baseId.message}</p>}
            </div>

            <div>
              <label htmlFor="po-eq" className="mb-1 block text-xs font-medium">
                Equipment Type *
              </label>
              <select
                id="po-eq"
                {...register('equipmentTypeId')}
                className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">Select equipment...</option>
                {equipment.map((eq) => (
                  <option key={eq.id} value={eq.id}>{eq.name} ({eq.unit})</option>
                ))}
              </select>
              {errors.equipmentTypeId && <p className="mt-1 text-xs text-rose-600">{errors.equipmentTypeId.message}</p>}
            </div>

            <div>
              <label htmlFor="po-qty" className="mb-1 block text-xs font-medium">
                Quantity *
              </label>
              <input
                id="po-qty"
                type="number"
                min={1}
                {...register('quantity')}
                className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
              {errors.quantity && <p className="mt-1 text-xs text-rose-600">{errors.quantity.message}</p>}
            </div>

            <div>
              <label htmlFor="po-date" className="mb-1 block text-xs font-medium">
                Purchase Date *
              </label>
              <input
                id="po-date"
                type="date"
                {...register('purchaseDate')}
                className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
              {errors.purchaseDate && <p className="mt-1 text-xs text-rose-600">{errors.purchaseDate.message}</p>}
            </div>

            <div>
              <label htmlFor="po-ref" className="mb-1 block text-xs font-medium">
                Reference Number *
              </label>
              <input
                id="po-ref"
                type="text"
                placeholder="e.g. PO-2026-104"
                {...register('referenceNumber')}
                className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
              {errors.referenceNumber && <p className="mt-1 text-xs text-rose-600">{errors.referenceNumber.message}</p>}
            </div>

            <div>
              <label htmlFor="po-supplier" className="mb-1 block text-xs font-medium">
                Supplier *
              </label>
              <input
                id="po-supplier"
                type="text"
                placeholder="Authorized vendor name"
                {...register('supplier')}
                className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
              {errors.supplier && <p className="mt-1 text-xs text-rose-600">{errors.supplier.message}</p>}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="po-remarks" className="mb-1 block text-xs font-medium">
                Remarks
              </label>
              <input
                id="po-remarks"
                type="text"
                placeholder="Optional procurement notes"
                {...register('remarks')}
                className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {isSubmitting ? 'Recording...' : 'Record Purchase'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* History */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Purchase History
          </h2>
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              placeholder="Search ref or supplier..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
              className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
        </div>

        <div tabIndex={0} role="region" aria-label="Purchase history table" className="table-wrapper">
          <table className="text-left text-sm">
            <thead className="bg-slate-100 text-xs font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Ref #</th>
                <th className="px-4 py-3">Base</th>
                <th className="px-4 py-3">Equipment</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Loading purchases...
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No purchase records found.
                  </td>
                </tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="whitespace-nowrap px-4 py-3">
                      {new Date(p.purchaseDate).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold">
                      {p.referenceNumber}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{p.base?.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium">{p.equipmentType?.name}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge value={p.equipmentType?.category} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-400">
                      +{p.quantity} {p.equipmentType?.unit}
                    </td>
                    <td className="px-4 py-3">{p.supplier}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {p.creator?.username}
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
      </section>
    </div>
  );
}
