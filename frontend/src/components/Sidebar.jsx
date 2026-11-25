import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  Building2,
  ClipboardCheck,
  FileText,
  Flame,
  LayoutDashboard,
  Package,
  Settings,
  Shield,
  ShoppingCart,
  Users,
  X,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV_ITEMS = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER'],
  },
  {
    to: '/inventory',
    label: 'Inventory',
    icon: Boxes,
    roles: ['ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER'],
  },
  {
    to: '/purchases',
    label: 'Purchases',
    icon: ShoppingCart,
    roles: ['ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER'],
  },
  {
    to: '/transfers',
    label: 'Transfers',
    icon: ArrowLeftRight,
    roles: ['ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER'],
  },
  {
    to: '/assignments',
    label: 'Assignments',
    icon: ClipboardCheck,
    roles: ['ADMIN', 'BASE_COMMANDER'],
  },
  {
    to: '/expenditures',
    label: 'Expenditures',
    icon: Flame,
    roles: ['ADMIN', 'BASE_COMMANDER'],
  },
  {
    to: '/reports',
    label: 'Reports',
    icon: BarChart3,
    roles: ['ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER'],
  },
  {
    to: '/audit-logs',
    label: 'Audit Logs',
    icon: FileText,
    roles: ['ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER'],
  },
  {
    to: '/users',
    label: 'User Management',
    icon: Users,
    roles: ['ADMIN'],
  },
  {
    to: '/bases',
    label: 'Base Management',
    icon: Building2,
    roles: ['ADMIN'],
  },
  {
    to: '/equipment',
    label: 'Equipment Catalog',
    icon: Package,
    roles: ['ADMIN'],
  },
  {
    to: '/settings',
    label: 'Profile & Settings',
    icon: Settings,
    roles: ['ADMIN', 'BASE_COMMANDER', 'LOGISTICS_OFFICER'],
  },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const { user } = useAuth();
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  const navContent = (
    <div className="flex h-full flex-col bg-navy-900 text-slate-200">
      <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <Shield className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-wider text-white">MAMS</p>
            <p className="text-[11px] text-slate-400">Asset & Logistics</p>
          </div>
        </div>
        {mobileOpen && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <nav aria-label="Primary navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex min-h-[42px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-navy-800 hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-400">
        <p className="font-medium text-slate-300">{user?.base?.name || 'Global Command'}</p>
        <p className="mt-0.5 truncate">{user?.role?.replace(/_/g, ' ')}</p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-slate-800 lg:block">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="relative z-50 w-64 max-w-[80vw] shadow-2xl">{navContent}</aside>
        </div>
      )}
    </>
  );
}
