import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatIndianNumber, formatDate } from '../lib/calculations';
import { CreditCard, Trash2 } from 'lucide-react';

export default function PaymentHistory() {
    const { allTenants, tenants, deletePayment, theme, currentPlot } = useApp();
    const isDark = theme === 'dark';

    const now = new Date();
    const [selectedTenant, setSelectedTenant] = useState('all');
    const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    const [showAllMonths, setShowAllMonths] = useState(false);

    const allPayments = useMemo(() => {
        const list = [];
        tenants.forEach(t => {
            (t.paymentHistory || []).forEach(p => {
                list.push({ ...p, tenantName: t.tenantName, tenantId: t.id, roomNumber: t.roomNumber });
            });
        });
        return list.sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [tenants]);

    const filtered = useMemo(() => {
        let list = allPayments;
        if (selectedTenant !== 'all') list = list.filter(p => String(p.tenantId) === selectedTenant);
        if (!showAllMonths && selectedMonth) {
            list = list.filter(p => {
                const d = new Date(p.date);
                const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                return m === selectedMonth;
            });
        }
        return list;
    }, [allPayments, selectedTenant, selectedMonth, showAllMonths]);

    const totalFiltered = filtered.reduce((s, p) => s + p.amount, 0);

    const cardBg = isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-slate-200';
    const inputBg = isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900';
    const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
    const tableHead = isDark ? 'bg-slate-700/40 text-slate-400' : 'bg-slate-50 text-slate-500';

    return (
        <div className="space-y-4 animate-slide-in">
            <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-blue-400" />
                <h1 className="text-lg font-bold">Payment History</h1>
            </div>

            {/* Filters */}
            <div className={`rounded-2xl border p-4 ${cardBg}`}>
                <div className="flex flex-wrap gap-3">
                    <select
                        value={selectedTenant}
                        onChange={e => setSelectedTenant(e.target.value)}
                        className={`px-3 py-2 rounded-xl border text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 ${inputBg}`}
                    >
                        <option value="all">All Tenants</option>
                        {tenants.map(t => (
                            <option key={t.id} value={String(t.id)}>{t.tenantName} (Room {t.roomNumber})</option>
                        ))}
                    </select>

                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={e => { setSelectedMonth(e.target.value); setShowAllMonths(false); }}
                        disabled={showAllMonths}
                        className={`px-3 py-2 rounded-xl border text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:opacity-40 ${inputBg}`}
                    />

                    <button
                        onClick={() => setShowAllMonths(v => !v)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors
              ${showAllMonths
                                ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                                : (isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50')
                            }`}
                    >
                        All Months
                    </button>
                </div>

                {/* Summary */}
                <div className={`mt-3 pt-3 border-t ${isDark ? 'border-slate-700/50' : 'border-slate-100'} flex justify-between items-center`}>
                    <span className={`text-xs ${textMuted}`}>{filtered.length} payment{filtered.length !== 1 ? 's' : ''}</span>
                    <span className="text-sm font-bold text-green-400">Total: ₹{formatIndianNumber(totalFiltered)}</span>
                </div>
            </div>

            {/* Table */}
            <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
                {filtered.length === 0 ? (
                    <p className={`text-center py-12 text-sm ${textMuted}`}>No payments found for the selected filters.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className={tableHead}>
                                    <th className="text-left px-4 py-3 font-medium">Date</th>
                                    <th className="text-left px-4 py-3 font-medium">Tenant</th>
                                    <th className="text-left px-4 py-3 font-medium">Room</th>
                                    <th className="text-left px-4 py-3 font-medium">Type</th>
                                    <th className="text-right px-4 py-3 font-medium">Amount</th>
                                    <th className="text-left px-4 py-3 font-medium">Notes</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
                                {filtered.map((p, i) => (
                                    <tr key={p.id || i} className={isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}>
                                        <td className="px-4 py-3">{formatDate(p.date)}</td>
                                        <td className="px-4 py-3 font-medium">{p.tenantName}</td>
                                        <td className="px-4 py-3">{p.roomNumber}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                        ${p.type === 'Rent' ? 'bg-blue-500/10 text-blue-400' :
                                                    p.type === 'Bill' ? 'bg-amber-500/10 text-amber-400' :
                                                        'bg-slate-500/10 text-slate-400'}`}>
                                                {p.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-green-400">₹{formatIndianNumber(p.amount)}</td>
                                        <td className="px-4 py-3 text-slate-400 max-w-32 truncate">{p.notes || '-'}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => { if (confirm('Delete this payment?')) deletePayment(p.tenantId, p.id); }}
                                                className="text-red-400 hover:text-red-300 transition-colors"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
