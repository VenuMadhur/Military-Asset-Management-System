import { Monitor, Moon, ShieldCheck, Sun } from 'lucide-react';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

export default function Settings() {
  const { user, policy } = useAuth();
  const { theme, setTheme } = useTheme();

  const options = [
    { id: 'system', label: 'System Default', desc: 'Follow operating system appearance', icon: Monitor },
    { id: 'light', label: 'Light Mode', desc: 'High-contrast slate and white surfaces', icon: Sun },
    { id: 'dark', label: 'Dark Mode', desc: 'Low-glare navy and slate surfaces', icon: Moon },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Profile & Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Review your authenticated identity, base assignment, and display preferences.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-600" aria-hidden="true" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Account Security Profile
          </h2>
        </div>

        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-slate-500">Username</dt>
            <dd className="mt-1 font-mono font-semibold text-slate-900 dark:text-white">
              {user?.username}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Full Name</dt>
            <dd className="mt-1 font-medium text-slate-900 dark:text-white">
              {user?.fullName || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Role</dt>
            <dd className="mt-1">
              <StatusBadge value={user?.role} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Assigned Base</dt>
            <dd className="mt-1 font-medium text-slate-900 dark:text-white">
              {user?.base ? `${user.base.name} (${user.base.location})` : 'Global (All Installations)'}
            </dd>
          </div>
          {user?.role === 'LOGISTICS_OFFICER' && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-slate-500">Logistics Policy Scope</dt>
              <dd className="mt-1 text-slate-700 dark:text-slate-300">
                {policy?.logisticsGlobalScope
                  ? 'Global inter-base logistics operations enabled'
                  : 'Restricted to assigned home base'}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Interface Color Scheme
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Choose between following your system appearance or pinning Light/Dark mode.
        </p>

        <fieldset className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <legend className="visually-hidden">Color scheme preference</legend>
          {options.map(({ id, label, desc, icon: Icon }) => (
            <label
              key={id}
              className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-4 transition ${
                theme === id
                  ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600 dark:bg-blue-950/40'
                  : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <input
                  type="radio"
                  name="color-scheme-pref"
                  value={id}
                  checked={theme === id}
                  onChange={() => setTheme(id)}
                  className="h-4 w-4 accent-blue-600"
                />
              </div>
              <span className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{label}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{desc}</span>
            </label>
          ))}
        </fieldset>
      </section>
    </div>
  );
}
