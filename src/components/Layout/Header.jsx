import { Menu, Sun, Moon, Wifi, WifiOff, RefreshCw, Check, AlertCircle, LogOut, Download } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

const pageTitles = {
    '/dashboard': 'Dashboard',
    '/tenants': 'Tenants',
    '/add-tenant': 'Add Tenant',
    '/payment-history': 'Payment History',
    '/monthly-history': 'Monthly History',
    '/data-management': 'Data Management',
};

export default function Header({ onMenuClick }) {
    const { theme, setTheme, isOnline, syncStatus, syncWithFirebase, logout } = useApp();
    const location = useLocation();
    const navigate = useNavigate();
    const isDark = theme === 'dark';
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    const title = Object.entries(pageTitles).find(([path]) =>
        location.pathname.startsWith(path)
    )?.[1] || 'Rent Management';

    const bg = isDark ? 'bg-slate-900/80 border-slate-700/50' : 'bg-white/80 border-slate-200';

    const syncIcon = {
        idle: <RefreshCw size={15} />,
        syncing: <RefreshCw size={15} className="animate-spin" />,
        synced: <Check size={15} className="text-green-400" />,
        error: <AlertCircle size={15} className="text-red-400" />,
        local: <AlertCircle size={15} className="text-amber-400" />,
    }[syncStatus] ?? <RefreshCw size={15} />;

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <header className={`sticky top-0 z-30 border-b backdrop-blur-md ${bg} px-4 py-3 flex items-center justify-between gap-3`}>
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuClick}
                    className={`lg:hidden p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
                >
                    <Menu size={20} />
                </button>
                <h1 className="text-base font-semibold">{title}</h1>
            </div>

            <div className="flex items-center gap-2">
                {/* Online status */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
          ${isOnline
                        ? (isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600')
                        : (isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600')
                    }`}>
                    {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
                    <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
                </div>

                {/* Install App button */}
                {deferredPrompt && (
                    <button
                        onClick={handleInstall}
                        title="Install App"
                        className={`p-2 rounded-xl transition-colors
            ${isDark ? 'hover:bg-indigo-900/20 text-indigo-400' : 'hover:bg-indigo-50 text-indigo-600'}`}
                    >
                        <Download size={18} />
                    </button>
                )}

                {/* Sync button */}
                <button
                    onClick={syncWithFirebase}
                    disabled={!isOnline || syncStatus === 'syncing'}
                    title="Sync with Firebase"
                    className={`p-2 rounded-xl transition-colors disabled:opacity-40
            ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
                >
                    {syncIcon}
                </button>

                {/* Theme toggle */}
                <button
                    onClick={() => setTheme(isDark ? 'light' : 'dark')}
                    className={`p-2 rounded-xl transition-colors
            ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
                >
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                {/* Logout button */}
                <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className={`p-2 rounded-xl transition-colors
            ${isDark ? 'hover:bg-red-900/20 text-red-400' : 'hover:bg-red-50 text-red-600'}`}
                >
                    <LogOut size={18} />
                </button>
            </div>
        </header>
    );
}
