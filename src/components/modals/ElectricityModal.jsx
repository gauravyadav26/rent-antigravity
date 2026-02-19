import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../Toast';
import { getLastReading, formatDate } from '../../lib/calculations';
import { X, Zap, RefreshCw } from 'lucide-react';

export default function ElectricityModal({ tenant, onClose, initialData = null }) {
    const { addElectricityReading, editElectricityReading, theme } = useApp();
    const toast = useToast();
    const isDark = theme === 'dark';
    const today = new Date().toISOString().split('T')[0];
    const isEdit = !!initialData;

    const lastReading = getLastReading(tenant);

    const [form, setForm] = useState({
        date: initialData?.date || today,
        reading: initialData?.reading ? String(initialData.reading) : '',
        meterChange: initialData?.meterChange || false,
        lastMeterReading: initialData?.lastMeterReading ? String(initialData.lastMeterReading) : ''
    });

    const [loading, setLoading] = useState(false);

    // Calculate units and bill for preview
    let units = null;
    if (form.meterChange && form.lastMeterReading && lastReading) {
        units = Math.max(0, Number(form.lastMeterReading) - lastReading.reading);
    } else if (!form.meterChange && form.reading && lastReading) {
        units = Math.max(0, Number(form.reading) - lastReading.reading);
    }

    const bill = units !== null ? units * (tenant.electricityRate || 10) : null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.reading) return;

        // Validation for normal reading
        if (!form.meterChange && !isEdit && lastReading && Number(form.reading) < lastReading.reading) {
            if (!confirm('New reading is less than previous. Continue?')) return;
        }

        // Validation for meter change
        if (form.meterChange && lastReading && Number(form.lastMeterReading) < lastReading.reading) {
            alert('Old meter final reading cannot be less than previous reading.');
            return;
        }

        setLoading(true);

        const data = {
            date: form.date,
            reading: Number(form.reading),
            meterChange: form.meterChange
        };

        if (form.meterChange) {
            data.lastMeterReading = Number(form.lastMeterReading);
        }

        if (isEdit) {
            editElectricityReading(tenant.id, initialData.id, data);
        } else {
            addElectricityReading(tenant.id, data);
        }

        setLoading(false);
        toast(isEdit ? 'Reading updated' : 'Electricity reading recorded', 'success');
        onClose();
    };

    const modalBg = isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';
    const inputBg = isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900';
    const labelClass = isDark ? 'text-slate-300' : 'text-slate-600';
    const infoBg = isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-slate-50 border-slate-200';

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 modal-backdrop bg-black/50">
            <div className={`w-full max-w-md rounded-2xl border shadow-2xl ${modalBg} animate-slide-in`}>
                <div className="flex items-center justify-between p-5 border-b border-inherit">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-xl">
                            <Zap size={18} className="text-amber-400" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-sm">{isEdit ? 'Edit Reading' : 'Add Electricity Reading'}</h2>
                            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{tenant.tenantName} · Room {tenant.roomNumber}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Previous reading info */}
                    {lastReading && (
                        <div className={`rounded-xl border p-3 ${infoBg}`}>
                            <div className="flex justify-between text-xs">
                                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Previous Reading</span>
                                <span className="font-semibold">{lastReading.reading} units</span>
                            </div>
                            <div className="flex justify-between text-xs mt-1">
                                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Date</span>
                                <span>{formatDate(lastReading.date)}</span>
                            </div>
                            <div className="flex justify-between text-xs mt-1">
                                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Rate</span>
                                <span>₹{tenant.electricityRate}/unit</span>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <input
                                type="checkbox"
                                id="meterChange"
                                checked={form.meterChange}
                                onChange={e => setForm(f => ({ ...f, meterChange: e.target.checked }))}
                                className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                            />
                            <label htmlFor="meterChange" className={`text-xs font-medium ${labelClass} flex items-center gap-1`}>
                                <RefreshCw size={12} /> Meter Changed?
                            </label>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <label className={`block text-xs font-medium mb-1.5 ${labelClass}`}>Date</label>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                    required
                                    className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 ${inputBg}`}
                                />
                            </div>

                            {form.meterChange && (
                                <div className="space-y-3 p-3 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5">
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${labelClass}`}>Old Meter Final Reading</label>
                                        <input
                                            type="number"
                                            value={form.lastMeterReading}
                                            onChange={e => setForm(f => ({ ...f, lastMeterReading: e.target.value }))}
                                            placeholder="e.g. 1500"
                                            required={form.meterChange}
                                            className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 ${inputBg}`}
                                        />
                                        <p className="text-[10px] text-amber-500 mt-1">Bill will be calculated up to this reading.</p>
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 ${labelClass}`}>New Meter Start Reading</label>
                                        <input
                                            type="number"
                                            value={form.reading}
                                            onChange={e => setForm(f => ({ ...f, reading: e.target.value }))}
                                            placeholder="e.g. 0"
                                            required
                                            className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 ${inputBg}`}
                                        />
                                        <p className="text-[10px] text-amber-500 mt-1">This will be the starting point for future bills.</p>
                                    </div>
                                </div>
                            )}

                            {!form.meterChange && (
                                <div>
                                    <label className={`block text-xs font-medium mb-1.5 ${labelClass}`}>Current Reading</label>
                                    <input
                                        type="number"
                                        value={form.reading}
                                        onChange={e => setForm(f => ({ ...f, reading: e.target.value }))}
                                        placeholder="e.g. 1250"
                                        required
                                        className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 ${inputBg}`}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Calculated bill preview */}
                        {bill !== null && (
                            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 animate-slide-in">
                                <div className="flex justify-between text-xs">
                                    <span className="text-amber-300">Units Consumed</span>
                                    <span className="font-semibold text-amber-300">{units} units</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold mt-1">
                                    <span className="text-amber-400">Bill Amount</span>
                                    <span className="text-amber-400">₹{bill.toLocaleString('en-IN')}</span>
                                </div>
                                {form.meterChange && (
                                    <p className="text-[10px] text-amber-400/80 mt-1 pt-1 border-t border-amber-500/20">
                                        * Bill calculated on Old Meter usage ({form.lastMeterReading} - {lastReading?.reading || 0})
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3 pt-1">
                            <button type="button" onClick={onClose} className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'}`}>
                                Cancel
                            </button>
                            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50">
                                {loading ? 'Saving...' : 'Add Reading'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
