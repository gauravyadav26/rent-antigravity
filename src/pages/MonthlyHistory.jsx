import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatIndianNumber, getRentForMonth, getTotalElectricityBills } from '../lib/calculations';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export default function MonthlyHistory() {
    const { tenants, theme } = useApp();
    const isDark = theme === 'dark';

    const [page, setPage] = useState(0);
    const MONTHS_PER_PAGE = 12;

    // Generate months from earliest tenant start to now
    const months = useMemo(() => {
        const now = new Date();
        let earliest = new Date();
        tenants.forEach(t => {
            const d = new Date(t.startDate);
            if (d < earliest) earliest = d;
        });
        const result = [];
        const cur = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 1);
        while (cur <= end) {
            result.push(new Date(cur));
            cur.setMonth(cur.getMonth() + 1);
        }
        return result.reverse(); // newest first
    }, [tenants]);

    const totalPages = Math.ceil(months.length / MONTHS_PER_PAGE);
    const pageMonths = months.slice(page * MONTHS_PER_PAGE, (page + 1) * MONTHS_PER_PAGE);

    const getMonthData = (date) => {
        let rentDue = 0, payments = 0, electricityBills = 0;
        tenants.forEach(t => {
            const startDate = new Date(t.startDate);
            const endDate = t.status === 'vacated' && t.vacatedDate ? new Date(t.vacatedDate) : new Date();
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            if (startDate <= monthEnd && endDate >= monthStart) {
                rentDue += getRentForMonth(t, date.getFullYear(), date.getMonth());
            }

            (t.paymentHistory || []).forEach(p => {
                const d = new Date(p.date);
                if (d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth()) {
                    payments += p.amount || 0;
                }
            });

            // Electricity bills for readings in this month
            const readings = [...(t.electricityReadings || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
            for (let i = 1; i < readings.length; i++) {
                const d = new Date(readings[i].date);
                if (d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth()) {
                    const units = readings[i].reading - readings[i - 1].reading;
                    if (units > 0) electricityBills += units * (t.electricityRate || 10);
                }
            }
        });
        return { rentDue, payments, electricityBills, net: rentDue + electricityBills - payments };
    };

    const cardBg = isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-slate-200';
    const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
    const tableHead = isDark ? 'bg-slate-700/40 text-slate-400' : 'bg-slate-50 text-slate-500';

    return (
        <div className="space-y-4 animate-slide-in">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-violet-400" />
                    <h1 className="text-lg font-bold">Monthly History</h1>
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => setPage(p => Math.min(p + 1, totalPages - 1))} disabled={page >= totalPages - 1}
                            className={`p-2 rounded-xl transition-colors disabled:opacity-30 ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
                            <ChevronLeft size={16} />
                        </button>
                        <span className={`text-xs ${textMuted}`}>{page + 1}/{totalPages}</span>
                        <button onClick={() => setPage(p => Math.max(p - 1, 0))} disabled={page <= 0}
                            className={`p-2 rounded-xl transition-colors disabled:opacity-30 ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>

            {tenants.length === 0 ? (
                <div className={`text-center py-16 rounded-2xl border ${isDark ? 'border-slate-700/50 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                    <Calendar size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No tenant data available</p>
                </div>
            ) : (
                <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className={tableHead}>
                                    <th className="text-left px-4 py-3 font-medium">Month</th>
                                    <th className="text-right px-4 py-3 font-medium">Rent Due</th>
                                    <th className="text-right px-4 py-3 font-medium">Elec. Bills</th>
                                    <th className="text-right px-4 py-3 font-medium">Payments</th>
                                    <th className="text-right px-4 py-3 font-medium">Net Due</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
                                {pageMonths.map((date, i) => {
                                    const { rentDue, payments, electricityBills, net } = getMonthData(date);
                                    const label = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                                    const isCurrentMonth = date.getMonth() === new Date().getMonth() && date.getFullYear() === new Date().getFullYear();
                                    return (
                                        <tr key={i} className={`${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'} ${isCurrentMonth ? (isDark ? 'bg-blue-500/5' : 'bg-blue-50/50') : ''}`}>
                                            <td className="px-4 py-3 font-medium">
                                                {label}
                                                {isCurrentMonth && <span className="ml-2 text-xs text-blue-400 font-normal">(current)</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right">₹{formatIndianNumber(rentDue)}</td>
                                            <td className="px-4 py-3 text-right">₹{formatIndianNumber(electricityBills)}</td>
                                            <td className="px-4 py-3 text-right text-green-400">₹{formatIndianNumber(payments)}</td>
                                            <td className={`px-4 py-3 text-right font-semibold ${net > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                ₹{formatIndianNumber(net)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
