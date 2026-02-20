import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../Toast';
import { formatIndianNumber } from '../../lib/calculations';
import { X, TrendingUp } from 'lucide-react';

export default function RentHistoryModal({ tenant, initialData, entryIndex, onClose }) {
    const { editRentHistory, theme } = useApp();
    const toast = useToast();
    const isDark = theme === 'dark';

    const [form, setForm] = useState({
        date: initialData?.date || '',
        amount: initialData?.amount ? String(initialData.amount) : '',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.amount || Number(form.amount) <= 0 || !form.date) return;
        setLoading(true);

        editRentHistory(tenant.id, entryIndex, {
            date: form.date,
            amount: Number(form.amount),
        });

        setLoading(false);
        toast('Rent history updated', 'success');
        onClose();
    };

    const modalBg = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';
    const inputBg = isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900';
    const labelClass = isDark ? 'text-slate-300' : 'text-slate-600';

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 modal-backdrop bg-black/50">
            <div className={`w-full max-w-md rounded-2xl border shadow-2xl ${modalBg} animate-slide-in`}>
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-inherit">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-500/10 rounded-xl">
                            <TrendingUp size={18} className="text-violet-400" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-sm">Edit Rent Entry</h2>
                            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{tenant.tenantName} · Room {tenant.roomNumber}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className={`block text-xs font-medium mb-1.5 ${labelClass}`}>Effective Date</label>
                        <input
                            type="date"
                            value={form.date}
                            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                            required
                            className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 ${inputBg}`}
                        />
                    </div>

                    <div>
                        <label className={`block text-xs font-medium mb-1.5 ${labelClass}`}>Rent Amount (₹)</label>
                        <input
                            type="number"
                            value={form.amount}
                            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                            placeholder="Enter rent amount"
                            min="1"
                            required
                            className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 ${inputBg}`}
                        />
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'}`}>
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50">
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
