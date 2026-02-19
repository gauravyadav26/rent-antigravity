import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { isVacated } from '../lib/calculations';
import { Database, Download, Upload, RefreshCw, Check, AlertCircle, Wifi, WifiOff } from 'lucide-react';

export default function DataManagement() {
    const { exportData, importData, syncWithFirebase, syncStatus, isOnline, allTenants, theme } = useApp();
    const isDark = theme === 'dark';
    const fileRef = useRef(null);

    const [importStatus, setImportStatus] = useState(null); // null | {success, message}

    const handleImport = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const result = importData(ev.target.result);
            setImportStatus(result.success
                ? { success: true, message: `Successfully imported ${result.count} tenants.` }
                : { success: false, message: `Import failed: ${result.error}` }
            );
            setTimeout(() => setImportStatus(null), 5000);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const cardBg = isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-slate-200';
    const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
    const divider = isDark ? 'border-slate-700/50' : 'border-slate-100';

    const totalTenants = allTenants.length;
    const activeTenants = allTenants.filter(t => !isVacated(t)).length;
    const totalPayments = allTenants.reduce((s, t) => s + (t.paymentHistory || []).length, 0);

    const syncLabel = {
        idle: 'Sync with Firebase',
        syncing: 'Syncing...',
        synced: 'Synced!',
        error: 'Sync Failed',
    }[syncStatus];

    const syncIcon = {
        idle: <RefreshCw size={16} />,
        syncing: <RefreshCw size={16} className="animate-spin" />,
        synced: <Check size={16} />,
        error: <AlertCircle size={16} />,
    }[syncStatus];

    return (
        <div className="max-w-lg mx-auto space-y-4 animate-slide-in">
            <div className="flex items-center gap-2">
                <Database size={18} className="text-violet-400" />
                <h1 className="text-lg font-bold">Data Management</h1>
            </div>

            {/* Stats */}
            <div className={`rounded-2xl border p-5 ${cardBg}`}>
                <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${textMuted}`}>Current Data</h2>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-2xl font-bold">{totalTenants}</p>
                        <p className={`text-xs ${textMuted}`}>Total Tenants</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-green-400">{activeTenants}</p>
                        <p className={`text-xs ${textMuted}`}>Active</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-blue-400">{totalPayments}</p>
                        <p className={`text-xs ${textMuted}`}>Payments</p>
                    </div>
                </div>
            </div>

            {/* Firebase Sync */}
            <div className={`rounded-2xl border p-5 ${cardBg}`}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold">Firebase Sync</h2>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium
            ${isOnline
                            ? (isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600')
                            : (isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600')
                        }`}>
                        {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                        {isOnline ? 'Online' : 'Offline'}
                    </div>
                </div>
                <p className={`text-xs mb-4 ${textMuted}`}>
                    Sync your local data with Firebase Firestore. This will merge local and cloud data, with Firebase as the source of truth for existing records.
                </p>
                <button
                    onClick={syncWithFirebase}
                    disabled={!isOnline || syncStatus === 'syncing'}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40
            ${syncStatus === 'synced' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                            syncStatus === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                'bg-violet-600 hover:bg-violet-700 text-white'
                        }`}
                >
                    {syncIcon}
                    {syncLabel}
                </button>
            </div>

            {/* Export */}
            <div className={`rounded-2xl border p-5 ${cardBg}`}>
                <h2 className="text-sm font-semibold mb-2">Export Data</h2>
                <p className={`text-xs mb-4 ${textMuted}`}>
                    Download all tenant data as a JSON file. Use this as a backup or to migrate data.
                </p>
                <button
                    onClick={exportData}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                    <Download size={16} />
                    Export JSON Backup
                </button>
            </div>

            {/* Import */}
            <div className={`rounded-2xl border p-5 ${cardBg}`}>
                <h2 className="text-sm font-semibold mb-2">Import Data</h2>
                <p className={`text-xs mb-4 ${textMuted}`}>
                    Restore data from a previously exported JSON file. This will <strong>replace</strong> all current data.
                </p>

                {importStatus && (
                    <div className={`mb-3 p-3 rounded-xl text-xs font-medium animate-slide-in
            ${importStatus.success
                            ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                            : 'bg-red-500/10 border border-red-500/20 text-red-400'
                        }`}>
                        {importStatus.message}
                    </div>
                )}

                <input type="file" accept=".json" ref={fileRef} onChange={handleImport} className="hidden" />
                <button
                    onClick={() => fileRef.current?.click()}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-colors
            ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                >
                    <Upload size={16} />
                    Import JSON File
                </button>
            </div>

            {/* Danger zone */}
            <div className={`rounded-2xl border border-red-500/20 p-5 ${isDark ? 'bg-red-500/5' : 'bg-red-50/50'}`}>
                <h2 className="text-sm font-semibold text-red-400 mb-2">Danger Zone</h2>
                <p className={`text-xs mb-4 ${textMuted}`}>
                    Clear all local data. This cannot be undone. Make sure to export a backup first.
                </p>
                <button
                    onClick={() => {
                        if (confirm('Are you sure? This will delete ALL local data permanently.')) {
                            ['home', 'baba', 'shop', 'others'].forEach(p => localStorage.removeItem(`tenants_${p}`));
                            window.location.reload();
                        }
                    }}
                    className="w-full py-2.5 rounded-xl text-sm font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                >
                    Clear All Local Data
                </button>
            </div>
        </div>
    );
}
