import { zodResolver } from '@hookform/resolvers/zod';
import { ClipboardCheck, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Pagination from '../components/Pagination.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api, { extractErrorMessage } from '../services/api.js';

const assignmentSchema = z.object({
  baseId: z.string().optional(),
  equipmentTypeId: z.string().uuid('Select equipment type'),
  quantity: z.coerce.number().int().positive('Must be greater than 0'),
  assignedTo: z.string().trim().min(2, 'Assignee unit/personnel required').max(120),
  assignmentDate: z.string().min(1, 'Date is required'),
  remarks: z.string().trim().max(500).optional(),
});

export default function Assignments() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [bases, setBases] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [page, setPage] = useState(1);
  const [returnTarget, setReturnTarget] = useState(null);
  const [returning, setReturning] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(assignmentSchema),
    mode: 'onBlur',
    defaultValues: {
      baseId: user?.baseId || '',
      assignmentDate: new Date().toISOString().slice(0, 10),
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

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/assignments', { params: { page, limit: 10 } });
      setAssignments(res.data?.data || []);
      setPagination(res.data?.pagination || null);
    } catch (err) {
      setFeedback({ type: 'error', text: extractErrorMessage(err, 'Failed to load assignments') });
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const onSubmit = async (values) => {
    setFeedback({ type: '', text: '' });
    try {
      const payload = {
        ...values,
        assignmentDate: new Date(values.assignmentDate).toISOString(),
      };
      if (!isAdmin) delete payload.baseId;

      await api.post('/assignments', payload);
      setFeedback({ type: 'success', text: 'Asset assigned and available stock updated.' });
      reset({
        baseId: user?.baseId || '',
        equipmentTypeId: '',
        quantity: '',
        assignedTo: '',
        assignmentDate: new Date().toISOString().slice(0, 10),
        remarks: '',
      });
      loadAssignments();
    } catch (err) {
      setFeedback({ type: 'error', text: extractErrorMessage(err, 'Failed to create assignment') });
    }
  };

  const handleReturnConfirm = async () => {
    if (!returnTarget) return;
    setReturning(true);
    setFeedback({ type: '', text: '' });
    try {
      await api.put(`/assignments/${returnTarget.id}`, { status: 'RETURNED' });
      setFeedback({ type: 'success', text: 'Assigned assets returned to available stock.' });
      setReturnTarget(null);
      loadAssignments();
    } catch (err) {
      setFeedback({ type: 'error', text: extractErrorMessage(err, 'Return failed') });
      setReturnTarget(null);
    } finally {
      setReturning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Asset Assignments
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Issue equipment to personnel or units and track returns back into base inventory.
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
          <ClipboardCheck className="h-5 w-5 text-blue-600" aria-hidden="true" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Create Asset Assignment
          </h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {isAdmin && (
            <div>
              <label htmlFor="asg-base" className="mb-1 block text-xs font-medium">
                Base *
              </label>
              <select
                id="asg-base"
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
            <label htmlFor="asg-eq" className="mb-1 block text-xs font-medium">
              Equipment Type *
            </label>
            <select
              id="asg-eq"
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
            <label htmlFor="asg-qty" className="mb-1 block text-xs font-medium">
              Quantity *
            </label>
            <input
              id="asg-qty"
              type="number"
              min={1}
              {...register('quantity')}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
            {errors.quantity && <p className="mt-1 text-xs text-rose-600">{errors.quantity.message}</p>}
          </div>

          <div>
            <label htmlFor="asg-to" className="mb-1 block text-xs font-medium">
              Assigned To (Unit / Personnel) *
            </label>
            <input
              id="asg-to"
              type="text"
              placeholder="e.g. Alpha Security Platoon"
              {...register('assignedTo')}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
            {errors.assignedTo && <p className="mt-1 text-xs text-rose-600">{errors.assignedTo.message}</p>}
          </div>

          <div>
            <label htmlFor="asg-date" className="mb-1 block text-xs font-medium">
              Assignment Date *
            </label>
            <input
              id="asg-date"
              type="date"
              {...register('assignmentDate')}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
            {errors.assignmentDate && <p className="mt-1 text-xs text-rose-600">{errors.assignmentDate.message}</p>}
          </div>

          <div>
            <label htmlFor="asg-rem" className="mb-1 block text-xs font-medium">
              Remarks
            </label>
            <input
              id="asg-rem"
              type="text"
              placeholder="Optional custody notes"
              {...register('remarks')}
              className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[40px] rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Assigning...' : 'Assign Assets'}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Assignment History
          </h2>
        </div>
        <div tabIndex={0} role="region" aria-label="Assignments table" className="table-wrapper">
          <table className="text-left text-sm">
            <thead className="bg-slate-100 text-xs font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Base</th>
                <th className="px-4 py-3">Equipment</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Assigned To</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">Loading assignments...</td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">No assignments recorded.</td>
                </tr>
              ) : (
                assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="whitespace-nowrap px-4 py-3">{new Date(a.assignmentDate).toLocaleDateString()}</td>
                    <td className="whitespace-nowrap px-4 py-3">{a.base?.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium">{a.equipmentType?.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums">{a.quantity} {a.equipmentType?.unit}</td>
                    <td className="px-4 py-3">{a.assignedTo}</td>
                    <td className="whitespace-nowrap px-4 py-3"><StatusBadge value={a.status} /></td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {a.status === 'ACTIVE' ? (
                        <button
                          type="button"
                          onClick={() => setReturnTarget(a)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                          Mark Returned
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Returned</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination pagination={pagination} onPageChange={setPage} />
      </section>

      <ConfirmDialog
        open={Boolean(returnTarget)}
        onClose={() => setReturnTarget(null)}
        onConfirm={handleReturnConfirm}
        loading={returning}
        title="Confirm Asset Return"
        confirmLabel="Confirm Return"
        message={
          returnTarget
            ? `Return ${returnTarget.quantity} ${returnTarget.equipmentType?.unit} of ${returnTarget.equipmentType?.name} from ${returnTarget.assignedTo} back into ${returnTarget.base?.name} available stock?`
            : ''
        }
      />
    </div>
  );
}
