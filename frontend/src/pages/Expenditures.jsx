import { zodResolver } from '@hookform/resolvers/zod';
import { Flame } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Pagination from '../components/Pagination.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api, { extractErrorMessage } from '../services/api.js';

const expenditureSchema = z.object({
  baseId: z.string().optional(),
  equipmentTypeId: z.string().uuid('Select equipment type'),
  quantity: z.coerce.number().int().positive('Must be greater than 0'),
  expenditureDate: z.string().min(1, 'Expenditure date is required'),
  reason: z.string().trim().min(2, 'Operational reason is required').max(200),
  referenceNumber: z.string().trim().min(2, 'Reference number is required').max(80),
  remarks: z.string().trim().max(500).optional(),
});

export default function Expenditures() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [bases, setBases] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [expenditures, setExpenditures] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [page, setPage] = useState(1);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(expenditureSchema),
    mode: 'onBlur',
    defaultValues: {
      baseId: user?.baseId || '',
      expenditureDate: new Date().toISOString().slice(0, 10),
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

  const loadExpenditures = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/expenditures', { params: { page, limit: 10 } });
      setExpenditures(res.data?.data || []);
      setPagination(res.data?.pagination || null);
    } catch (err) {
      setFeedback({ type: 'error', text: extractErrorMessage(err, 'Failed to load expenditures') });
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadExpenditures();
  }, [loadExpenditures]);

  const onSubmit = async (values) => {
    setFeedback({ type: '', text: '' });
    try {
      const payload = {
        ...values,
        expenditureDate: new Date(values.expenditureDate).toISOString(),
      };
      if (!isAdmin) delete payload.baseId;

      await api.post('/expenditures', payload);
      setFeedback({ type: 'success', text: 'Expenditure recorded and stock deducted.' });
      reset({
        baseId: user?.baseId || '',
        equipmentTypeId: '',
        quantity: '',
        expenditureDate: new Date().toISOString().slice(0, 10),
        reason: '',
        referenceNumber: '',
        remarks: '',
      });
      loadExpenditures();
    } catch (err) {
      setFeedback({ type: 'error', text: extractErrorMessage(err, 'Failed to record expenditure') });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Asset Expenditures
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Record consumed ammunition, supplies, or decommissioned assets with full audit traceability.
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

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2">
          <Flame className="h-5 w-5 text-rose-600" aria-hidden="true" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Record Expenditure
          </h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {isAdmin && (
            <div>
              <label htmlFor="exp-base" className="mb-1 block text-xs font-medium">
                Base *
              </label>
              <select
                id="exp-base"
                required
                {...register('baseId')}
                className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">Select base...</option>
                {bases.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="exp-eq" className="mb-1 block text-xs font-medium">
              Equipment Type *
            </label>
            <select
              id="exp-eq"
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
            <label htmlFor="exp-qty" className="mb-1 block text-xs font-medium">
              Quantity *
            </label>
            <input
              id="exp-qty"
              type="number"
              min={1}
              {...register('quantity')}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
            {errors.quantity && <p className="mt-1 text-xs text-rose-600">{errors.quantity.message}</p>}
          </div>

          <div>
            <label htmlFor="exp-date" className="mb-1 block text-xs font-medium">
              Expenditure Date *
            </label>
            <input
              id="exp-date"
              type="date"
              {...register('expenditureDate')}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
            {errors.expenditureDate && <p className="mt-1 text-xs text-rose-600">{errors.expenditureDate.message}</p>}
          </div>

          <div>
            <label htmlFor="exp-ref" className="mb-1 block text-xs font-medium">
              Reference Number *
            </label>
            <input
              id="exp-ref"
              type="text"
              placeholder="e.g. EXP-2026-044"
              {...register('referenceNumber')}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
            {errors.referenceNumber && <p className="mt-1 text-xs text-rose-600">{errors.referenceNumber.message}</p>}
          </div>

          <div>
            <label htmlFor="exp-reason" className="mb-1 block text-xs font-medium">
              Reason *
            </label>
            <input
              id="exp-reason"
              type="text"
              placeholder="Training exercise / routine depletion"
              {...register('reason')}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
            {errors.reason && <p className="mt-1 text-xs text-rose-600">{errors.reason.message}</p>}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="exp-rem" className="mb-1 block text-xs font-medium">
              Remarks
            </label>
            <input
              id="exp-rem"
              type="text"
              placeholder="Additional verification details"
              {...register('remarks')}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[40px] w-full rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Recording...' : 'Record Expenditure'}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Expenditure History
          </h2>
        </div>
        <div tabIndex={0} role="region" aria-label="Expenditures table" className="table-wrapper">
          <table className="text-left text-sm">
            <thead className="bg-slate-100 text-xs font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Ref #</th>
                <th className="px-4 py-3">Base</th>
                <th className="px-4 py-3">Equipment</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">Loading expenditures...</td>
                </tr>
              ) : expenditures.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">No expenditures recorded.</td>
                </tr>
              ) : (
                expenditures.map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="whitespace-nowrap px-4 py-3">{new Date(ex.expenditureDate).toLocaleDateString()}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold">{ex.referenceNumber}</td>
                    <td className="whitespace-nowrap px-4 py-3">{ex.base?.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium">{ex.equipmentType?.name}</td>
                    <td className="whitespace-nowrap px-4 py-3"><StatusBadge value={ex.equipmentType?.category} /></td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-rose-700 dark:text-rose-400">
                      -{ex.quantity} {ex.equipmentType?.unit}
                    </td>
                    <td className="px-4 py-3">{ex.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination pagination={pagination} onPageChange={setPage} />
      </section>
    </div>
  );
}
