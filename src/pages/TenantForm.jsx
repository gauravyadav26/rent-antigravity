import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { formatIndianNumber } from '../lib/calculations';
import { ArrowLeft, ArrowRight, Check, User, DollarSign, Zap } from 'lucide-react';

const STEPS = [
    { id: 1, label: 'Basic Info', icon: User },
    { id: 2, label: 'Financial', icon: DollarSign },
    { id: 3, label: 'Electricity', icon: Zap },
];

const defaultForm = {
    roomNumber: '',
    tenantName: '',
    startDate: new Date().toISOString().split('T')[0],
    monthlyRent: '',
    advancePaid: '0',
    startingDue: '0',
    electricityRate: '10',
    initialReading: '',
    rentEffectiveDate: new Date().toISOString().split('T')[0],
};

export default function TenantForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { tenants, allTenants, addTenant, editTenant, theme } = useApp();
    const isDark = theme === 'dark';
    const isEdit = Boolean(id);
    const toast = useToast();

    const [step, setStep] = useState(1);
    const [form, setForm] = useState(defaultForm);
    const [rentChanged, setRentChanged] = useState(false);
    const [originalRent, setOriginalRent] = useState(null);

    // Pre-fill form in edit mode
    useEffect(() => {
        if (isEdit) {
            const tenant = allTenants.find(t => String(t.id) === id);
            if (tenant) {
                setForm({
                    roomNumber: tenant.roomNumber || '',
                    tenantName: tenant.tenantName || '',
                    startDate: tenant.startDate || '',
                    monthlyRent: String(tenant.monthlyRent || ''),
                    advancePaid: String(tenant.advancePaid || '0'),
                    startingDue: String(tenant.startingDue || '0'),
                    electricityRate: String(tenant.electricityRate || '10'),
                    initialReading: '',
                    rentEffectiveDate: new Date().toISOString().split('T')[0],
                });
                setOriginalRent(tenant.monthlyRent);
            }
        }
    }, [id, allTenants, isEdit]);

    const handleChange = (field, value) => {
        setForm(f => ({ ...f, [field]: value }));
        if (field === 'monthlyRent' && isEdit && originalRent !== null) {
            setRentChanged(Number(value) !== originalRent);
        }
    };

    const handleSubmit = () => {
        const data = {
            roomNumber: form.roomNumber.trim(),
            tenantName: form.tenantName.trim(),
            startDate: form.startDate,
            monthlyRent: Number(form.monthlyRent),
            advancePaid: Number(form.advancePaid),
            startingDue: Number(form.startingDue),
            electricityRate: Number(form.electricityRate),
        };

        if (isEdit) {
            editTenant(id, data, rentChanged, form.rentEffectiveDate);
        } else {
            const readings = form.initialReading
                ? [{ id: Date.now(), date: form.startDate, reading: Number(form.initialReading) }]
                : [];
            addTenant({ ...data, electricityReadings: readings });
        }
        toast(isEdit ? 'Tenant updated' : `${data.tenantName} added`, 'success');
        navigate('/tenants');
    };

    const canNext = () => {
        if (step === 1) return form.roomNumber && form.tenantName && form.startDate && form.monthlyRent;
        if (step === 2) return true;
        return true;
    };

    const cardBg = isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-slate-200';
    const inputBg = isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400';
    const labelClass = isDark ? 'text-slate-300' : 'text-slate-600';
    const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

    const inputClass = `w-full px-3 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors ${inputBg}`;

    return (
        <div className="max-w-lg mx-auto animate-slide-in">
            {/* Back button */}
            <button onClick={() => navigate(-1)} className={`flex items-center gap-2 text-sm mb-5 ${textMuted} hover:text-blue-400 transition-colors`}>
                <ArrowLeft size={16} /> Back
            </button>

            <h1 className="text-xl font-bold mb-6">{isEdit ? 'Edit Tenant' : 'Add New Tenant'}</h1>

            {/* Step indicators */}
            <div className="flex items-center gap-2 mb-6">
                {STEPS.map((s, i) => {
                    const Icon = s.icon;
                    const isActive = step === s.id;
                    const isDone = step > s.id;
                    return (
                        <div key={s.id} className="flex items-center gap-2 flex-1">
                            <div className={`flex items-center gap-2 flex-1 ${i > 0 ? 'justify-end' : ''}`}>
                                {i > 0 && <div className={`h-px flex-1 ${isDone ? 'bg-blue-500' : (isDark ? 'bg-slate-700' : 'bg-slate-200')}`} />}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${isDone ? 'bg-blue-500 text-white' : isActive ? 'bg-blue-600 text-white ring-4 ring-blue-500/20' : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400')}`}>
                                    {isDone ? <Check size={14} /> : <Icon size={14} />}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Step label */}
            <p className={`text-xs font-medium mb-4 ${textMuted}`}>Step {step} of 3 — {STEPS[step - 1].label}</p>

            {/* Form card */}
            <div className={`rounded-2xl border p-5 space-y-4 ${cardBg}`}>
                {/* Step 1: Basic Info */}
                {step === 1 && (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={`block text-xs font-medium mb-1.5 ${labelClass}`}>Room Number *</label>
                                <input type="text" value={form.roomNumber} onChange={e => handleChange('roomNumber', e.target.value)}
                                    placeholder="e.g. 101" required className={inputClass} />
                            </div>
                            <div>
                                <label className={`block text-xs font-medium mb-1.5 ${labelClass}`}>Start Date *</label>
                                <input type="date" value={form.startDate} onChange={e => handleChange('startDate', e.target.value)}
                                    required className={inputClass} />
                            </div>
                        </div>
                        <div>
                            <label className={`block text-xs font-medium mb-1.5 ${labelClass}`}>Tenant Name *</label>
                            <input type="text" value={form.tenantName} onChange={e => handleChange('tenantName', e.target.value)}
                                placeholder="Full name" required className={inputClass} />
                        </div>
                        <div>
                            <label className={`block text-xs font-medium mb-1.5 ${labelClass}`}>Monthly Rent (₹) *</label>
                            <input type="number" value={form.monthlyRent} onChange={e => handleChange('monthlyRent', e.target.value)}
                                placeholder="e.g. 5000" min="0" required className={inputClass} />
                        </div>
                        {/* Rent change section for edit mode */}
                        {isEdit && rentChanged && (
                            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 animate-slide-in">
                                <p className="text-xs font-medium text-amber-400 mb-2">Rent change detected — set effective date:</p>
                                <input type="date" value={form.rentEffectiveDate}
                                    onChange={e => handleChange('rentEffectiveDate', e.target.value)}
                                    className={inputClass} />
                                <p className={`text-xs mt-1.5 ${textMuted}`}>Old rent (₹{formatIndianNumber(originalRent)}) will be used for months before this date.</p>
                            </div>
                        )}
                    </>
                )}

                {/* Step 2: Financial */}
                {step === 2 && (
                    <>
                        <div>
                            <label className={`block text-xs font-medium mb-1.5 ${labelClass}`}>Advance Paid (₹)</label>
                            <input type="number" value={form.advancePaid} onChange={e => handleChange('advancePaid', e.target.value)}
                                placeholder="0" min="0" className={inputClass} />
                            <p className={`text-xs mt-1 ${textMuted}`}>Security deposit or advance amount paid by tenant.</p>
                        </div>
                        <div>
                            <label className={`block text-xs font-medium mb-1.5 ${labelClass}`}>Opening Balance / Starting Due (₹)</label>
                            <input type="number" value={form.startingDue} onChange={e => handleChange('startingDue', e.target.value)}
                                placeholder="0" className={inputClass} />
                            <p className={`text-xs mt-1 ${textMuted}`}>Any existing due amount before this system started tracking.</p>
                        </div>
                    </>
                )}

                {/* Step 3: Electricity */}
                {step === 3 && (
                    <>
                        <div>
                            <label className={`block text-xs font-medium mb-1.5 ${labelClass}`}>Rate per Unit (₹)</label>
                            <input type="number" value={form.electricityRate} onChange={e => handleChange('electricityRate', e.target.value)}
                                placeholder="10" min="0" step="0.5" className={inputClass} />
                        </div>
                        {!isEdit && (
                            <div>
                                <label className={`block text-xs font-medium mb-1.5 ${labelClass}`}>Initial Meter Reading</label>
                                <input type="number" value={form.initialReading} onChange={e => handleChange('initialReading', e.target.value)}
                                    placeholder="e.g. 1000" min="0" className={inputClass} />
                                <p className={`text-xs mt-1 ${textMuted}`}>Starting meter reading when tenant moved in.</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Navigation */}
            <div className="flex gap-3 mt-5">
                {step > 1 && (
                    <button onClick={() => setStep(s => s - 1)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <ArrowLeft size={15} /> Back
                    </button>
                )}
                <div className="flex-1" />
                {step < 3 ? (
                    <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40">
                        Next <ArrowRight size={15} />
                    </button>
                ) : (
                    <button onClick={handleSubmit}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-lg shadow-blue-500/20">
                        <Check size={15} /> {isEdit ? 'Save Changes' : 'Add Tenant'}
                    </button>
                )}
            </div>
        </div>
    );
}
