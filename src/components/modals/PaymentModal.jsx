import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../Toast';
import { calculateDue, formatIndianNumber, formatDate } from '../../lib/calculations';
import { X, CreditCard } from 'lucide-react';

export default function PaymentModal({ tenant, onClose, initialData = null }) {
    const { recordPayment, editPayment, theme } = useApp();
    const toast = useToast();
    const isDark = theme === 'dark';
    const today = new Date().toISOString().split('T')[0];
    const isEdit = !!initialData;

    const [form, setForm] = useState({
        date: initialData?.date || today,
        amount: initialData?.amount ? String(initialData.amount) : '',
        type: initialData?.type || 'Rent', // Default to Rent, hidden
        notes: initialData?.notes || '',
    });
    const [loading, setLoading] = useState(false);

    const due = calculateDue(tenant);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.amount || Number(form.amount) <= 0) return;
        setLoading(true);

        const data = { ...form, amount: Number(form.amount) };
        if (isEdit) {
            editPayment(tenant.id, initialData.id, data);
        } else {
            recordPayment(tenant.id, data);
        }

        setLoading(false);
        toast(isEdit ? 'Payment updated' : `Payment of ₹${form.amount} recorded`, 'success');
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
                        <div className="p-2 bg-blue-500/10 rounded-xl">
                            <CreditCard size={18} className="text-blue-400" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-sm">{isEdit ? 'Edit Payment' : 'Record Payment'}</h2>
                            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{tenant.tenantName} · Room {tenant.roomNumber}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                        <X size={18} />
                    </button>
                </div>

                {/* Current due (only show for new payments) */}
                {!isEdit && (
                    <div className={`mx-5 mt-4 p-3 rounded-xl ${due > 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-green-500/10 border border-green-500/20'}`}>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Current Due</p>
                        <p className={`text-xl font-bold ${due > 0 ? 'text-red-400' : 'text-green-400'}`}>₹{formatIndianNumber(due)}</p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Date only, Type removed */}
                    <div>
                        <label className={`block text-xs font-medium mb-1.5 ${labelClass}`}>Date</label>
                        <input
                            type="date"
                            value={form.date}
                            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                            required
                            className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 ${inputBg}`}
                        />
                    </div>

                    <div>
                        <label className={`block text-xs font-medium mb-1.5 ${labelClass}`}>Amount (₹)</label>
                        <input
                            type="number"
                            value={form.amount}
                            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                            placeholder="Enter amount"
                            min="1"
                            required
                            className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 ${inputBg}`}
                        />
                        {!isEdit && due > 0 && (
                            <button
                                type="button"
                                onClick={() => setForm(f => ({ ...f, amount: String(due) }))}
                                className="mt-1 text-xs text-blue-400 hover:text-blue-300"
                            >
                                Fill full due: ₹{formatIndianNumber(due)}
                            </button>
                        )}
                    </div>

                    <div>
                        <label className={`block text-xs font-medium mb-1.5 ${labelClass}`}>Notes (optional)</label>
                        <input
                            type="text"
                            value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            placeholder="e.g. January rent"
                            className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 ${inputBg}`}
                        />
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'}`}>
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50">
                            {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Record Payment')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
