import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftRight, CheckCircle2, Send, Truck, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Pagination from '../components/Pagination.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api, { extractErrorMessage } from '../services/api.js';

const transferSchema = z
  .object({
    sourceBaseId: z.string().uuid('Select source base'),
    destinationBaseId: z.string().uuid('Select destination base'),
    equipmentTypeId: z.string().uuid('Select equipment type'),
    quantity: z.coerce.number().int('Must be whole number').positive('Must be > 0'),
    referenceNumber: z.string().trim().min(2, 'Reference number is required').max(80),
    remarks: z.string().trim().max(500).optional(),
  })
  .refine((d) => d.sourceBaseId !== d.destinationBaseId, {
    message: 'Source and destination bases must differ',
    path: ['destinationBaseId'],
  });

export default function Transfers() {
  const { user } = useAuth();
  const canInitiate = ['ADMIN', 'LOGISTICS_OFFICER'].includes(user?.role);

  const [bases, setBases] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [pendingAction, setPendingAction] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(transferSchema),
    mode: 'onBlur',
  });

  useEffect(() => {
    Promise.all([api.get('/bases?limit=100'), api.get('/equipment?isActive=true&limit=100')])
      .then(([bRes, eRes]) => {
        setBases(bRes.data?.data || []);
        setEquipment(eRes.data?.data || []);
      })
      .catch(() => {});
  }, []);

  const loadTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/transfers', { params });
      setTransfers(res.data?.data || []);
      setPagination(res.data?.pagination || null);
    } catch (err) {
      setFeedback({ type: 'error', text: extractErrorMessage(err, 'Failed to load transfers') });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

  const onSubmit = async (values) => {
    setFeedback({ type: '', text: '' });
    try {
      await api.post('/transfers', values);
      setFeedback({ type: 'success', text: 'Transfer request initiated with status PENDING.' });
      reset();
      loadTransfers();
    } catch (err) {
      setFeedback({ type: 'error', text: extractErrorMessage(err, 'Failed to initiate transfer') });
    }
  };

  const executeTransferAction = async () => {
    if (!pendingAction) return;
    setActionBusy(true);
    setFeedback({ type: '', text: '' });
    try {
      const res = await api.put(`/transfers/${pendingAction.transfer.id}/${pendingAction.action}`, {});
      setFeedback({ type: 'success', text: res.data?.message || 'Transfer updated successfully' });
      setPendingAction(null);
      loadTransfers();
    } catch (err) {
      setFeedback({ type: 'error', text: extractErrorMessage(err, 'Transfer action failed') });
      setPendingAction(null);
    } finally {
      setActionBusy(false);
    }
  };

  const getAllowedActions = (t) => {
    const actions = [];
    const isAdmin = user?.role === 'ADMIN';
    const isLogistics = user?.role === 'LOGISTICS_OFFICER';
    const isSourceCmd = user?.role === 'BASE_COMMANDER' && user?.baseId === t.sourceBaseId;
    const isDestCmd = user?.role === 'BASE_COMMANDER' && user?.baseId === t.destinationBaseId;

    if (t.status === 'PENDING') {
      if (isAdmin || isLogistics || isSourceCmd) {
        actions.push({ action: 'approve', label: 'Approve', tone: 'blue', icon: CheckCircle2 });
        actions.push({ action: 'reject', label: 'Reject', tone: 'red', icon: XCircle });
      }
      if (isAdmin || isLogistics) {
        actions.push({ action: 'cancel', label: 'Cancel', tone: 'amber', icon: XCircle });
      }
    } else if (t.status === 'APPROVED') {
      if (isAdmin || isLogistics || isSourceCmd) {
        actions.push({ action: 'dispatch', label: 'Dispatch', tone: 'blue', icon: Truck });
      }
      if (isAdmin || isLogistics) {
        actions.push({ action: 'cancel', label: 'Cancel', tone: 'amber', icon: XCircle });
      }
    } else if (t.status === 'IN_TRANSIT') {
      if (isAdmin || isLogistics || isDestCmd) {
        actions.push({ action: 'complete', label: 'Complete Receipt', tone: 'blue', icon: CheckCircle2 });
      }
    }
    return actions;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Inter-Base Transfers
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Manage equipment transfers with stock reservations, approvals, dispatch, and atomic ledger completion.
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

      {canInitiate && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Initiate Transfer Request
            </h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="trf-src" className="mb-1 block text-xs font-medium">
                Source Base *
              </label>
              <select
                id="trf-src"
                {...register('sourceBaseId')}
                className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">Select source...</option>
                {bases.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              {errors.sourceBaseId && <p className="mt-1 text-xs text-rose-600">{errors.sourceBaseId.message}</p>}
            </div>

            <div>
              <label htmlFor="trf-dest" className="mb-1 block text-xs font-medium">
                Destination Base *
              </label>
              <select
                id="trf-dest"
                {...register('destinationBaseId')}
                className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">Select destination...</option>
                {bases.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              {errors.destinationBaseId && (
                <p className="mt-1 text-xs text-rose-600">{errors.destinationBaseId.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="trf-eq" className="mb-1 block text-xs font-medium">
                Equipment Type *
              </label>
              <select
                id="trf-eq"
                {...register('equipmentTypeId')}
                className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">Select equipment...</option>
                {equipment.map((eq) => (
                  <option key={eq.id} value={eq.id}>{eq.name} ({eq.unit})</option>
                ))}
              </select>
              {errors.equipmentTypeId && (
                <p className="mt-1 text-xs text-rose-600">{errors.equipmentTypeId.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="trf-qty" className="mb-1 block text-xs font-medium">
                Quantity *
              </label>
              <input
                id="trf-qty"
                type="number"
                min={1}
                {...register('quantity')}
                className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
              {errors.quantity && <p className="mt-1 text-xs text-rose-600">{errors.quantity.message}</p>}
            </div>

            <div>
              <label htmlFor="trf-ref" className="mb-1 block text-xs font-medium">
                Reference Number *
              </label>
              <input
                id="trf-ref"
                type="text"
                placeholder="e.g. TRF-2026-102"
                {...register('referenceNumber')}
                className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
              {errors.referenceNumber && (
                <p className="mt-1 text-xs text-rose-600">{errors.referenceNumber.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="trf-rem" className="mb-1 block text-xs font-medium">
                Remarks
              </label>
              <input
                id="trf-rem"
                type="text"
                placeholder="Movement instructions"
                {...register('remarks')}
                className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                {isSubmitting ? 'Submitting...' : 'Submit Transfer Request'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* History */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Transfer History & Workflow Queue
          </h2>
          <select
            aria-label="Filter transfers by status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="IN_TRANSIT">IN_TRANSIT</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <div tabIndex={0} role="region" aria-label="Transfers table" className="table-wrapper">
          <table className="text-left text-sm">
            <thead className="bg-slate-100 text-xs font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">Ref #</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Equipment</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Loading transfers...
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No transfer records found.
                  </td>
                </tr>
              ) : (
                transfers.map((t) => {
                  const actions = getAllowedActions(t);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold">
                        {t.referenceNumber}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="font-medium">{t.sourceBase?.name}</span>{' '}
                        <span className="text-slate-400">-&gt;</span>{' '}
                        <span className="font-medium">{t.destinationBase?.name}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">{t.equipmentType?.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums">
                        {t.quantity} {t.equipmentType?.unit}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge value={t.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {actions.length === 0 ? (
                            <span className="text-xs text-slate-400">—</span>
                          ) : (
                            actions.map(({ action, label, tone }) => (
                              <button
                                key={action}
                                type="button"
                                onClick={() => setPendingAction({ transfer: t, action, label, tone })}
                                className={`rounded-md px-2.5 py-1 text-xs font-semibold text-white transition ${
                                  tone === 'red'
                                    ? 'bg-rose-600 hover:bg-rose-700'
                                    : tone === 'amber'
                                      ? 'bg-amber-600 hover:bg-amber-700'
                                      : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                              >
                                {label}
                              </button>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination pagination={pagination} onPageChange={setPage} />
      </section>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        onClose={() => setPendingAction(null)}
        onConfirm={executeTransferAction}
        loading={actionBusy}
        tone={pendingAction?.tone || 'blue'}
        title={`Confirm Transfer ${pendingAction?.label || ''}`}
        confirmLabel={pendingAction?.label || 'Confirm'}
        message={
          pendingAction
            ? `Are you sure you want to ${pendingAction.label.toLowerCase()} transfer ${pendingAction.transfer.referenceNumber} (${pendingAction.transfer.quantity} ${pendingAction.transfer.equipmentType?.unit} from ${pendingAction.transfer.sourceBase?.name} to ${pendingAction.transfer.destinationBase?.name})?`
            : ''
        }
      />
    </div>
  );
}
