import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, UserPlus, CreditCard,
    Calendar, Database, X, Home, Building2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/tenants', icon: Users, label: 'Tenants' },
    { to: '/add-tenant', icon: UserPlus, label: 'Add Tenant' },
    { to: '/payment-history', icon: CreditCard, label: 'Payment History' },
    { to: '/monthly-history', icon: Calendar, label: 'Monthly History' },
    { to: '/data-management', icon: Database, label: 'Data Management' },
];

export default function Sidebar({ isOpen, onClose }) {
    const { theme, currentPlot } = useApp();
    const isDark = theme === 'dark';

    const bg = isDark ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200';
    const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
    const activeClass = isDark
        ? 'bg-blue-600/20 text-blue-400 border-blue-500'
        : 'bg-blue-50 text-blue-600 border-blue-500';
    const inactiveClass = isDark
        ? 'text-slate-300 hover:bg-slate-800 hover:text-white border-transparent'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent';

    return (
        <aside className={`fixed top-0 left-0 h-full w-64 z-50 border-r flex flex-col transition-transform duration-300 ${bg}
      ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>

            {/* Logo */}
            <div className="p-5 border-b border-inherit flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg">
                        <Building2 size={18} className="text-white" />
                    </div>
                    <div>
                        <div className="font-bold text-sm gradient-text">RentMS</div>
                        <div className={`text-xs ${textMuted}`}>Property Manager</div>
                    </div>
                </div>
                <button onClick={onClose} className={`lg:hidden p-1.5 rounded-lg ${inactiveClass}`} aria-label="Close sidebar">
                    <X size={16} />
                </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        onClick={onClose}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150 ${isActive ? activeClass : inactiveClass}`
                        }
                    >
                        <Icon size={18} />
                        {label}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className={`p-4 border-t border-inherit ${textMuted} text-xs`}>
                <div className="flex items-center gap-2">
                    <Home size={12} />
                    <span className="capitalize">{currentPlot} Plot</span>
                </div>
                <div className="mt-1 opacity-60">Rent Management v2.0</div>
            </div>
        </aside>
    );
}
