import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
    calculateDue, formatIndianNumber, formatDate,
    getTotalAccruedRent, getTotalElectricityBills, getTotalPayments,
    getBillForReading, getRentForMonth, isVacated
} from '../lib/calculations';
import { ArrowLeft, Edit2, Trash2, CreditCard, Zap, LogOut, TrendingUp } from 'lucide-react';
import PaymentModal from '../components/modals/PaymentModal';
import ElectricityModal from '../components/modals/ElectricityModal';
import VacateModal from '../components/modals/VacateModal';

export default function TenantDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { allTenants, deletePayment, editPayment, deleteElectricityReading, theme } = useApp();
    const isDark = theme === 'dark';

    const [paymentModal, setPaymentModal] = useState(false);
    const [electricityModal, setElectricityModal] = useState(false);
    const [vacateModal, setVacateModal] = useState(false);
    const [editingPayment, setEditingPayment] = useState(null);
    const [editingReading, setEditingReading] = useState(null);

    const tenant = allTenants.find(t => String(t.id) === id);
    if (!tenant) return (
        <div className="text-center py-20">
            <p className="text-slate-400">Tenant not found.</p>
            <button onClick={() => navigate('/tenants')} className="mt-3 text-blue-400 text-sm">← Back to tenants</button>
        </div>
    );

    const due = calculateDue(tenant);
    const accrued = getTotalAccruedRent(tenant);
    const bills = getTotalElectricityBills(tenant);
    const payments = getTotalPayments(tenant);

    const cardBg = isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-slate-200';
    const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
    const divider = isDark ? 'border-slate-700/50' : 'border-slate-100';
    const btnBase = isDark ? 'bg-slate-700/60 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600';
    const tableHead = isDark ? 'bg-slate-700/40 text-slate-400' : 'bg-slate-50 text-slate-500';

    const sortedReadings = [...(tenant.electricityReadings || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    const sortedPayments = [...(tenant.paymentHistory || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    const sortedRentHistory = [...(tenant.rentHistory || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
        <div className="max-w-2xl mx-auto space-y-5 animate-slide-in">
            {/* Back */}
            <button onClick={() => navigate('/tenants')} className={`flex items-center gap-2 text-sm ${textMuted} hover:text-blue-400 transition-colors`}>
                <ArrowLeft size={16} /> Back to Tenants
            </button>

            {/* Header card */}
            <div className={`rounded-2xl border p-5 ${cardBg}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl font-bold">{tenant.tenantName}</h1>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isVacated(tenant) ? 'badge-vacated' : 'badge-active'}`}>
                                {isVacated(tenant) ? 'Vacated' : 'Active'}
                            </span>
                        </div>
                        <p className={`text-sm mt-0.5 ${textMuted}`}>Room {tenant.roomNumber} · Since {formatDate(tenant.startDate)}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={() => navigate(`/edit-tenant/${tenant.id}`)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${btnBase}`}>
                            <Edit2 size={13} /> Edit
                        </button>
                        {!isVacated(tenant) && (
                            <>
                                <button onClick={() => setElectricityModal(true)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${btnBase}`}>
                                    <Zap size={13} /> Reading
                                </button>
                                <button onClick={() => setPaymentModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors">
                                    <CreditCard size={13} /> Payment
                                </button>
                                <button onClick={() => setVacateModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors">
                                    <LogOut size={13} /> Vacate
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Due breakdown */}
                <div className={`mt-4 pt-4 border-t ${divider}`}>
                    <p className={`text-xs font-medium mb-3 ${textMuted}`}>Due Calculation</p>
                    <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                            <span className={textMuted}>Opening Balance</span>
                            <span>₹{formatIndianNumber(tenant.startingDue || 0)}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className={textMuted}>Accrued Rent</span>
                            <span>₹{formatIndianNumber(accrued)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className={textMuted}>Electricity Bills</span>
                            <span>₹{formatIndianNumber(bills)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className={textMuted}>Total Payments</span>
                            <span className="text-green-400">-₹{formatIndianNumber(payments)}</span>
                        </div>
                        <div className={`flex justify-between font-bold text-base pt-2 border-t ${divider}`}>
                            <span>Total Due</span>
                            <span className={due > 0 ? 'text-red-400' : 'text-green-400'}>₹{formatIndianNumber(due)}</span>
                        </div>
                    </div>
                </div>

                {/* Basic info grid */}
                <div className={`mt-4 pt-4 border-t ${divider} grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs`}>
                    <div><p className={textMuted}>Monthly Rent</p><p className="font-semibold">₹{formatIndianNumber(tenant.monthlyRent)}</p></div>
                    <div><p className={textMuted}>Advance</p><p className="font-semibold">₹{formatIndianNumber(tenant.advancePaid)}</p></div>
                    <div><p className={textMuted}>Elec. Rate</p><p className="font-semibold">₹{tenant.electricityRate}/unit</p></div>
                    <div><p className={textMuted}>Readings</p><p className="font-semibold">{(tenant.electricityReadings || []).length}</p></div>
                </div>
            </div>

            {/* Rent History */}
            {sortedRentHistory.length > 0 && (
                <div className={`rounded-2xl border ${cardBg}`}>
                    <div className="flex items-center gap-2 p-4 border-b border-inherit">
                        <TrendingUp size={16} className="text-violet-400" />
                        <h2 className="text-sm font-semibold">Rent History</h2>
                    </div>
                    <div className="divide-y divide-inherit">
                        {sortedRentHistory.map((entry, i) => (
                            <div key={i} className="flex justify-between items-center px-4 py-3 text-sm">
                                <span className={textMuted}>{formatDate(entry.date)}</span>
                                <span className="font-semibold">₹{formatIndianNumber(entry.amount)}/mo</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Electricity Readings */}
            <div className={`rounded-2xl border ${cardBg}`}>
                <div className="flex items-center justify-between p-4 border-b border-inherit">
                    <div className="flex items-center gap-2">
                        <Zap size={16} className="text-amber-400" />
                        <h2 className="text-sm font-semibold">Electricity Readings</h2>
                    </div>
                    <span className={`text-xs ${textMuted}`}>{sortedReadings.length} entries</span>
                </div>
                {sortedReadings.length === 0 ? (
                    <p className={`text-center py-8 text-sm ${textMuted}`}>No readings yet</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className={tableHead}>
                                    <th className="text-left px-4 py-2.5 font-medium">Date</th>
                                    <th className="text-right px-4 py-2.5 font-medium">Reading</th>
                                    <th className="text-right px-4 py-2.5 font-medium">Units</th>
                                    <th className="text-right px-4 py-2.5 font-medium">Bill</th>
                                    <th className="px-4 py-2.5"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-inherit">
                                {sortedReadings.map((r, i) => {
                                    const allSorted = [...(tenant.electricityReadings || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
                                    const idx = allSorted.findIndex(x => x.id === r.id || (x.date === r.date && x.reading === r.reading));
                                    const bill = getBillForReading(tenant.electricityReadings, idx, tenant.electricityRate);

                                    let units = '-';
                                    if (idx > 0) {
                                        if (r.meterChange) {
                                            units = (r.lastMeterReading || 0) - allSorted[idx - 1].reading;
                                        } else {
                                            units = allSorted[idx].reading - allSorted[idx - 1].reading;
                                        }
                                    }

                                    return (
                                        <tr key={r.id || i} className={isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}>
                                            <td className="px-4 py-2.5">
                                                {formatDate(r.date)}
                                                {r.meterChange && <span className="ml-2 text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20">Meter Change</span>}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono">
                                                {r.meterChange ? (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[10px] text-slate-400">Old: {r.lastMeterReading}</span>
                                                        <span className="font-bold text-amber-500">New: {r.reading}</span>
                                                    </div>
                                                ) : (
                                                    r.reading
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-right">{units !== '-' ? units : '-'}</td>
                                            <td className="px-4 py-2.5 text-right font-semibold">{bill > 0 ? `₹${formatIndianNumber(bill)}` : '-'}</td>
                                            <td className="px-4 py-2.5 text-right flex justify-end gap-2">
                                                <button onClick={() => { setEditingReading(r); setElectricityModal(true); }}
                                                    className="text-amber-400 hover:text-amber-300 transition-colors">
                                                    <Edit2 size={12} />
                                                </button>
                                                <button onClick={() => { if (confirm('Delete this reading?')) deleteElectricityReading(tenant.id, r.id); }}
                                                    className="text-red-400 hover:text-red-300 transition-colors">
                                                    <Trash2 size={12} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Payment History */}
            <div className={`rounded-2xl border ${cardBg}`}>
                <div className="flex items-center justify-between p-4 border-b border-inherit">
                    <div className="flex items-center gap-2">
                        <CreditCard size={16} className="text-blue-400" />
                        <h2 className="text-sm font-semibold">Payment History</h2>
                    </div>
                    <span className={`text-xs ${textMuted}`}>{sortedPayments.length} payments</span>
                </div>
                {sortedPayments.length === 0 ? (
                    <p className={`text-center py-8 text-sm ${textMuted}`}>No payments yet</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className={tableHead}>
                                    <th className="text-left px-4 py-2.5 font-medium">Date</th>
                                    <th className="text-right px-4 py-2.5 font-medium">Amount</th>
                                    <th className="text-left px-4 py-2.5 font-medium">Notes</th>
                                    <th className="px-4 py-2.5"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-inherit">
                                {sortedPayments.map((p, i) => (
                                    <tr key={p.id || i} className={isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}>
                                        <td className="px-4 py-2.5">{formatDate(p.date)}</td>
                                        <td className="px-4 py-2.5 text-right font-semibold text-green-400">₹{formatIndianNumber(p.amount)}</td>
                                        <td className="px-4 py-2.5 text-slate-400 max-w-24 truncate">{p.notes || '-'}</td>
                                        <td className="px-4 py-2.5 text-right flex justify-end gap-2">
                                            <button onClick={() => { setEditingPayment(p); setPaymentModal(true); }}
                                                className="text-blue-400 hover:text-blue-300 transition-colors">
                                                <Edit2 size={12} />
                                            </button>
                                            <button onClick={() => { if (confirm('Delete this payment?')) deletePayment(tenant.id, p.id); }}
                                                className="text-red-400 hover:text-red-300 transition-colors">
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

            {/* Modals */}
            {paymentModal && <PaymentModal tenant={tenant} initialData={editingPayment} onClose={() => { setPaymentModal(false); setEditingPayment(null); }} />}
            {electricityModal && <ElectricityModal tenant={tenant} initialData={editingReading} onClose={() => { setElectricityModal(false); setEditingReading(null); }} />}
            {vacateModal && <VacateModal tenant={tenant} onClose={() => setVacateModal(false)} />}
        </div>
    );
}
