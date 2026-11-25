import NativeModal from './NativeModal.jsx';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'blue',
  loading = false,
}) {
  const confirmClasses =
    tone === 'red'
      ? 'bg-rose-600 hover:bg-rose-700 focus-visible:outline-rose-600'
      : tone === 'amber'
        ? 'bg-amber-600 hover:bg-amber-700 focus-visible:outline-amber-600'
        : 'bg-blue-600 hover:bg-blue-700 focus-visible:outline-blue-600';

  return (
    <NativeModal open={open} onClose={onClose} title={title} maxWidthClass="max-w-md">
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{message}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          autoFocus
          onClick={onClose}
          disabled={loading}
          className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`min-h-[40px] rounded-lg px-4 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 ${confirmClasses}`}
        >
          {loading ? 'Processing...' : confirmLabel}
        </button>
      </div>
    </NativeModal>
  );
}
