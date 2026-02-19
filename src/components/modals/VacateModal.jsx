import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { calculateDue, formatIndianNumber } from '../../lib/calculations';
import { X, LogOut } from 'lucide-react';

export default function VacateModal({ tenant, onClose }) {
    const { vacateTenant, theme } = useApp();
    const isDark = theme === 'dark';
    const today = new Date().toISOString().split('T')[0];

    const due = calculateDue(tenant);
    const [form, setForm] = useState({
        vacatedDate: today,
        vacationNotes: '',
        finalPaymentAmount: '',
        finalPaymentType: 'Rent',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        const finalPayment = form.finalPaymentAmount
            ? { amount: Number(form.finalPaymentAmount), type: form.finalPaymentType, notes: 'Final settlement' }
            : null;
        vacateTenant(tenant.id, form.vacatedDate, form.vacationNotes, finalPayment);
        setLoading(false);
        onClose();
    };

    const modalBg = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';
    const inputBg = isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900';
    const labelClass = isDark ? 'text-slate-300' : 'text-slate-600';

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 modal-backdrop bg-black/50">
            <div className={`w-full max-w-md rounded-2xl border shadow-2xl ${modalBg} animate-slide-in`}>
                <div className="flex items-center justify-between p-5 border-b border-inherit">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-xl">
                            <LogOut size={18} className="text-amber-400" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-sm">Vacate Tenant</h2>
                            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{tenant.tenantName} · Room {tenant.roomNumber}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Final settlement */}
                    <div className={`rounded-xl p-3 ${due > 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-green-500/10 border border-green-500/20'}`}>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Outstanding Due</p>
                        <p className={`text-xl font-bold ${due > 0 ? 'text-red-400' : 'text-green-400'}`}>₹{formatIndianNumber(due)}</p>
                        {due <= 0 && <p className="text-xs text-green-400 mt-0.5">All clear! No pending dues.</p>}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className={`block text-xs font-medium mb-1.5 ${labelClass}`}>Vacate Date</label>
                            <input
                                type="date"
                                value={form.vacatedDate}
                                onChange={e => setForm(f => ({ ...f, vacatedDate: e.target.value }))}
                                required
                                className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 ${inputBg}`}
                            />
                        </div>

                        <div>
                            <label className={`block text-xs font-medium mb-1.5 ${labelClass}`}>Notes (optional)</label>
                            <textarea
                                value={form.vacationNotes}
                                onChange={e => setForm(f => ({ ...f, vacationNotes: e.target.value }))}
                                placeholder="Reason for vacating, condition of room, etc."
                                rows={2}
                                className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 resize-none ${inputBg}`}
                            />
                        </div>

                        {/* Final payment */}
                        <div className={`rounded-xl border p-3 space-y-3 ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
                            <p className={`text-xs font-medium ${labelClass}`}>Final Payment (optional)</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <input
                                        type="number"
                                        value={form.finalPaymentAmount}
                                        onChange={e => setForm(f => ({ ...f, finalPaymentAmount: e.target.value }))}
                                        placeholder="Amount"
                                        min="0"
                                        className={`w-full px-3 py-2 rounded-xl border text-sm focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 ${inputBg}`}
                                    />
                                </div>
                                <div>
                                    <select
                                        value={form.finalPaymentType}
                                        onChange={e => setForm(f => ({ ...f, finalPaymentType: e.target.value }))}
                                        className={`w-full px-3 py-2 rounded-xl border text-sm focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 ${inputBg}`}
                                    >
                                        <option>Rent</option>
                                        <option>Bill</option>
                                        <option>Advance</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                            </div>
                            {due > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, finalPaymentAmount: String(due) }))}
                                    className="text-xs text-amber-400 hover:text-amber-300"
                                >
                                    Fill full due: ₹{formatIndianNumber(due)}
                                </button>
                            )}
                        </div>

                        <div className="flex gap-3 pt-1">
                            <button type="button" onClick={onClose} className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'}`}>
                                Cancel
                            </button>
                            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50">
                                {loading ? 'Processing...' : 'Confirm Vacate'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
