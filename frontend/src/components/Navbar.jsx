import { Building2, LogOut, Menu, UserCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from './StatusBadge.jsx';

export default function Navbar({ onOpenMobileMenu }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    navigate('/login', { replace: true, state: null });
    await logout();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 lg:hidden dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="hidden items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 sm:inline-flex dark:bg-slate-800 dark:text-slate-200">
          <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <span>
            Scope:{' '}
            <strong className="font-semibold">
              {user?.role === 'BASE_COMMANDER'
                ? user?.base?.name || 'Assigned Base'
                : 'Global Operations'}
            </strong>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2.5 text-right">
          <UserCircle2 className="hidden h-6 w-6 text-slate-400 sm:block" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold leading-tight text-slate-900 dark:text-white">
              {user?.fullName || user?.username}
            </p>
            <div className="mt-0.5 flex items-center justify-end gap-1.5">
              <StatusBadge value={user?.role} />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}
