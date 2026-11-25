import { ArrowUpRight } from 'lucide-react';

const TONE_MAP = {
  blue: 'border-l-4 border-l-blue-600 text-blue-700 dark:text-blue-400',
  green: 'border-l-4 border-l-emerald-600 text-emerald-700 dark:text-emerald-400',
  amber: 'border-l-4 border-l-amber-500 text-amber-700 dark:text-amber-400',
  red: 'border-l-4 border-l-rose-600 text-rose-700 dark:text-rose-400',
  slate: 'border-l-4 border-l-slate-600 text-slate-700 dark:text-slate-300',
};

export default function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  tone = 'slate',
  onClick,
  clickableHint,
}) {
  const accentClass = TONE_MAP[tone] || TONE_MAP.slate;
  const formattedValue =
    typeof value === 'number' ? value.toLocaleString('en-US') : (value ?? '0');

  const content = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {formattedValue}
        </p>
        {subtext && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtext}</p>
        )}
        {onClick && clickableHint && (
          <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
            <span>{clickableHint}</span>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </p>
        )}
      </div>
      {Icon && (
        <div className="rounded-lg bg-slate-100 p-2.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
    </div>
  );

  const baseCardClass = `w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition dark:border-slate-800 dark:bg-slate-900 ${accentClass}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseCardClass} cursor-pointer hover:border-blue-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600`}
      >
        {content}
      </button>
    );
  }

  return <div className={baseCardClass}>{content}</div>;
}
