import { ArrowDownLeft, ArrowUpRight, ShoppingCart, Sigma } from 'lucide-react';
import NativeModal from './NativeModal.jsx';

export default function NetMoveModal({ open, onClose, breakdown }) {
  const purchases = breakdown?.purchases ?? 0;
  const transfersIn = breakdown?.transfersIn ?? 0;
  const transfersOut = breakdown?.transfersOut ?? 0;
  const netMovement = breakdown?.netMovement ?? purchases + transfersIn - transfersOut;

  return (
    <NativeModal
      open={open}
      onClose={onClose}
      title="Net Movement Breakdown"
      maxWidthClass="max-w-md"
      closedBy="any"
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Net Movement measures stock added or removed through acquisitions and completed inter-base transfers during the selected period.
        </p>

        <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-slate-50 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5 text-sm font-medium text-slate-700 dark:text-slate-200">
              <ShoppingCart className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              <span>Purchases (+)</span>
            </div>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              +{purchases.toLocaleString('en-US')}
            </span>
          </div>

          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5 text-sm font-medium text-slate-700 dark:text-slate-200">
              <ArrowDownLeft className="h-4 w-4 text-blue-600" aria-hidden="true" />
              <span>Transfers In (+)</span>
            </div>
            <span className="font-semibold text-blue-700 dark:text-blue-400">
              +{transfersIn.toLocaleString('en-US')}
            </span>
          </div>

          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5 text-sm font-medium text-slate-700 dark:text-slate-200">
              <ArrowUpRight className="h-4 w-4 text-rose-600" aria-hidden="true" />
              <span>Transfers Out (-)</span>
            </div>
            <span className="font-semibold text-rose-700 dark:text-rose-400">
              -{transfersOut.toLocaleString('en-US')}
            </span>
          </div>

          <div className="flex items-center justify-between bg-slate-100 px-4 py-3.5 dark:bg-slate-800/80">
            <div className="flex items-center gap-2.5 text-sm font-bold text-slate-900 dark:text-white">
              <Sigma className="h-4 w-4 text-slate-700 dark:text-slate-300" aria-hidden="true" />
              <span>Total Net Movement</span>
            </div>
            <span
              className={`text-base font-bold ${
                netMovement >= 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {netMovement >= 0 ? `+${netMovement.toLocaleString('en-US')}` : netMovement.toLocaleString('en-US')}
            </span>
          </div>
        </div>

        <div className="rounded-lg bg-blue-50 px-3.5 py-2.5 text-xs text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
          Formula: <code>Net Movement = Purchases + Transfers In - Transfers Out</code>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </NativeModal>
  );
}
