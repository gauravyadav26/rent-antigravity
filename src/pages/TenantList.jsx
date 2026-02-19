import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { calculateDue, formatIndianNumber, formatDate, getLastReading, getLastPayment, debounce, isVacated as checkVacated } from '../lib/calculations';
import { Search, Plus, Edit2, Zap, CreditCard, LogOut, Trash2, Eye, ChevronDown, ChevronUp, Users } from 'lucide-react';
import PaymentModal from '../components/modals/PaymentModal';
import ElectricityModal from '../components/modals/ElectricityModal';
import VacateModal from '../components/modals/VacateModal';

function TenantCard({ tenant, isDark, onEdit, onPayment, onElectricity, onVacate, onDelete, onView }) {
    const [expanded, setExpanded] = useState(false);
    const due = calculateDue(tenant);
    const lastReading = getLastReading(tenant);
    const lastPayment = getLastPayment(tenant);
    const isVacated = checkVacated(tenant);

    const cardBg = isDark ? 'bg-slate-800/70 border-slate-700/50' : 'bg-white border-slate-200';
    const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
    const divider = isDark ? 'border-slate-700/50' : 'border-slate-100';
    const btnBase = isDark ? 'bg-slate-700/60 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600';

    return (
        <div className={`rounded-2xl border overflow-hidden card-hover ${cardBg} ${isVacated ? 'opacity-75' : ''}`}>
            {/* Header */}
            <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm truncate">{tenant.tenantName}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isVacated ? 'badge-vacated' : 'badge-active'}`}>
                                {isVacated ? 'Vacated' : 'Active'}
                            </span>
                        </div>
                        <p className={`text-xs mt-0.5 ${textMuted}`}>Room {tenant.roomNumber} · Since {formatDate(tenant.startDate)}</p>
                    </div>
                    <div className="text-right shrink-0">
                        <p className={`text-xs ${textMuted}`}>Due</p>
                        <p className={`text-base font-bold ${due > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            ₹{formatIndianNumber(due)}
                        </p>
                    </div>
                </div>

                {/* Quick stats */}
                <div className={`grid grid-cols-3 gap-2 mt-3 pt-3 border-t ${divider}`}>
                    <div>
                        <p className={`text-xs ${textMuted}`}>Rent</p>
                        <p className="text-sm font-semibold">₹{formatIndianNumber(tenant.monthlyRent)}</p>
                    </div>
                    <div>
                        <p className={`text-xs ${textMuted}`}>Last Paid</p>
                        <p className="text-sm font-semibold">{lastPayment ? `₹${formatIndianNumber(lastPayment.amount)}` : '-'}</p>
                    </div>
                    <div>
                        <p className={`text-xs ${textMuted}`}>Meter</p>
                        <p className="text-sm font-semibold">{lastReading ? lastReading.reading : '-'}</p>
                    </div>
                </div>
            </div>

            {/* Expanded details */}
            {expanded && (
                <div className={`px-4 pb-3 border-t ${divider} pt-3 space-y-2 animate-slide-in`}>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className={textMuted}>Advance: </span><span className="font-medium">₹{formatIndianNumber(tenant.advancePaid)}</span></div>
                        <div><span className={textMuted}>Opening: </span><span className="font-medium">₹{formatIndianNumber(tenant.startingDue)}</span></div>
                        <div><span className={textMuted}>Rate: </span><span className="font-medium">₹{tenant.electricityRate}/unit</span></div>
                        <div><span className={textMuted}>Readings: </span><span className="font-medium">{(tenant.electricityReadings || []).length}</span></div>
                        {isVacated && <div className="col-span-2"><span className={textMuted}>Vacated: </span><span className="font-medium">{formatDate(tenant.vacatedDate)}</span></div>}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className={`px-4 pb-4 flex flex-wrap gap-1.5`}>
                <button onClick={() => onView(tenant)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${btnBase}`}>
                    <Eye size={12} /> View
                </button>
                <button onClick={() => onEdit(tenant)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${btnBase}`}>
                    <Edit2 size={12} /> Edit
                </button>
                {!isVacated && (
                    <>
                        <button onClick={() => onElectricity(tenant)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${btnBase}`}>
                            <Zap size={12} /> Reading
                        </button>
                        <button onClick={() => onPayment(tenant)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors bg-blue-500/10 hover:bg-blue-500/20 text-blue-400`}>
                            <CreditCard size={12} /> Pay
                        </button>
                        <button onClick={() => onVacate(tenant)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors bg-amber-500/10 hover:bg-amber-500/20 text-amber-400`}>
                            <LogOut size={12} /> Vacate
                        </button>
                    </>
                )}
                <button onClick={() => onDelete(tenant)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors bg-red-500/10 hover:bg-red-500/20 text-red-400`}>
                    <Trash2 size={12} />
                </button>
                <button onClick={() => setExpanded(e => !e)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${btnBase} ml-auto`}>
                    {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
            </div>
        </div>
    );
}

export default function TenantList() {
    const { tenants, deleteTenant, theme } = useApp();
    const navigate = useNavigate();
    const isDark = theme === 'dark';

    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('active');
    const [paymentTenant, setPaymentTenant] = useState(null);
    const [electricityTenant, setElectricityTenant] = useState(null);
    const [vacateTenant, setVacateTenant] = useState(null);

    const filtered = useMemo(() => {
        let list = tenants;
        if (filter !== 'all') {
            list = list.filter(t => {
                const vacated = checkVacated(t);
                if (filter === 'vacated') return vacated;
                if (filter === 'active') return !vacated;
                return true;
            });
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(t =>
                (t.tenantName || '').toLowerCase().includes(q) ||
                (t.roomNumber || '').toString().toLowerCase().includes(q)
            );
        }
        return list.sort((a, b) => (a.roomNumber || '').toString().localeCompare((b.roomNumber || '').toString(), undefined, { numeric: true }));
    }, [tenants, filter, search]);

    const handleDelete = useCallback((tenant) => {
        if (confirm(`Delete ${tenant.tenantName}? This cannot be undone.`)) {
            deleteTenant(tenant.id);
        }
    }, [deleteTenant]);

    const inputBg = isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400';
    const filterBtnBase = isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800';
    const filterBtnActive = isDark ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-50 text-blue-600';

    const filterOptions = [
        { id: 'active', label: 'Active' },
        { id: 'vacated', label: 'Vacated' },
        { id: 'all', label: 'All' },
    ];

    return (
        <div className="space-y-4 animate-slide-in">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input
                        type="text"
                        placeholder="Search by name or room..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm transition-colors focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 ${inputBg}`}
                    />
                </div>
                <div className={`flex rounded-xl border overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
                    {filterOptions.map(({ id, label }) => (
                        <button
                            key={id}
                            onClick={() => setFilter(id)}
                            className={`px-4 py-2.5 text-sm font-medium transition-colors ${filter === id ? filterBtnActive : filterBtnBase}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => navigate('/add-tenant')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-500/20"
                >
                    <Plus size={16} /> Add Tenant
                </button>
            </div>

            {/* Count */}
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {filtered.length} tenant{filtered.length !== 1 ? 's' : ''} shown
            </p>

            {/* Grid */}
            {filtered.length === 0 ? (
                <div className={`text-center py-16 rounded-2xl border ${isDark ? 'border-slate-700/50 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                    <Users size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No tenants found</p>
                    <p className="text-xs mt-1">Try adjusting your search or filter</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map(tenant => (
                        <TenantCard
                            key={tenant.id}
                            tenant={tenant}
                            isDark={isDark}
                            onEdit={t => navigate(`/edit-tenant/${t.id}`)}
                            onView={t => navigate(`/tenants/${t.id}`)}
                            onPayment={t => setPaymentTenant(t)}
                            onElectricity={t => setElectricityTenant(t)}
                            onVacate={t => setVacateTenant(t)}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            {/* Modals */}
            {paymentTenant && (
                <PaymentModal tenant={paymentTenant} onClose={() => setPaymentTenant(null)} />
            )}
            {electricityTenant && (
                <ElectricityModal tenant={electricityTenant} onClose={() => setElectricityTenant(null)} />
            )}
            {vacateTenant && (
                <VacateModal tenant={vacateTenant} onClose={() => setVacateTenant(null)} />
            )}
        </div>
    );
}
