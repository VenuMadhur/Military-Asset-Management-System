import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md rounded-xl border border-rose-200 bg-white p-8 text-center shadow-sm dark:border-rose-900 dark:bg-slate-900">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Access Denied (403)</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Your current security role or base scope does not authorize access to this resource.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex min-h-[40px] items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
