import { useApp } from '../context/AppContext';
import { calculateDue, formatIndianNumber, getTotalAccruedRent, getTotalElectricityBills, getTotalPayments, getMonthlyRevenueData, isVacated } from '../lib/calculations';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users, TrendingUp, AlertCircle, IndianRupee, Zap, BarChart3 } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color, isDark }) {
    return (
        <div className={`rounded-2xl p-4 border card-hover ${isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-slate-200'}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className={`text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
                    <p className="text-xl font-bold">{value}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${color}`}>
                    <Icon size={18} className="text-white" />
                </div>
            </div>
        </div>
    );
}

function PlotStats({ plotTenants, label, isDark }) {
    const activeTenants = plotTenants.filter(t => !isVacated(t));
    const totalDue = activeTenants.reduce((s, t) => s + calculateDue(t), 0);
    const monthlyRent = activeTenants.reduce((s, t) => s + (t.monthlyRent || 0), 0);
    const monthlyBills = activeTenants.reduce((s, t) => {
        const readings = (t.electricityReadings || []).sort((a, b) => new Date(a.date) - new Date(b.date));
        if (readings.length < 2) return s;
        const last = readings[readings.length - 1];
        const prev = readings[readings.length - 2];
        return s + (last.reading - prev.reading) * (t.electricityRate || 10);
    }, 0);

    const now = new Date();
    const thisMonthPayments = plotTenants.reduce((s, t) =>
        s + (t.paymentHistory || []).filter(p => {
            const d = new Date(p.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).reduce((ps, p) => ps + p.amount, 0), 0);

    const cardBg = isDark ? 'bg-slate-700/40 border-slate-600/40' : 'bg-slate-50 border-slate-200';

    return (
        <div className={`rounded-2xl border p-4 ${cardBg}`}>
            <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{label}</h3>
            <div className="grid grid-cols-2 gap-3">
                {[
                    { label: 'Active Tenants', value: activeTenants.length },
                    { label: 'Total Due', value: `₹${formatIndianNumber(totalDue)}` },
                    { label: 'Monthly Rent', value: `₹${formatIndianNumber(monthlyRent)}` },
                    { label: 'This Month Paid', value: `₹${formatIndianNumber(thisMonthPayments)}` },
                ].map(({ label, value }) => (
                    <div key={label}>
                        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
                        <p className="text-sm font-semibold">{value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

const CustomTooltip = ({ active, payload, label, isDark }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className={`rounded-xl p-3 border shadow-xl text-xs ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}>
            <p className="font-semibold mb-1">{label}</p>
            {payload.map(p => (
                <p key={p.name} style={{ color: p.color }}>
                    {p.name}: ₹{formatIndianNumber(p.value)}
                </p>
            ))}
        </div>
    );
};

export default function Dashboard() {
    const { tenants, allTenants, theme, currentPlot } = useApp();
    const isDark = theme === 'dark';

    const activeTenants = tenants.filter(t => !isVacated(t));
    const totalDue = activeTenants.reduce((s, t) => s + calculateDue(t), 0);
    const monthlyRent = activeTenants.reduce((s, t) => s + (t.monthlyRent || 0), 0);

    const now = new Date();
    const thisMonthPayments = tenants.reduce((s, t) =>
        s + (t.paymentHistory || []).filter(p => {
            const d = new Date(p.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).reduce((ps, p) => ps + p.amount, 0), 0);

    const monthlyBills = activeTenants.reduce((s, t) => {
        const readings = (t.electricityReadings || []).sort((a, b) => new Date(a.date) - new Date(b.date));
        if (readings.length < 2) return s;
        const last = readings[readings.length - 1];
        const prev = readings[readings.length - 2];
        return s + (last.reading - prev.reading) * (t.electricityRate || 10);
    }, 0);

    const chartData = getMonthlyRevenueData(allTenants, 6);

    const plots = ['home', 'baba', 'shop', 'others'];
    const plotLabels = { home: 'Home', baba: 'Baba', shop: 'Shop', others: 'Others' };

    const gridBg = isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-slate-200';
    const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

    return (
        <div className="space-y-6 animate-slide-in">
            {/* Current plot stats */}
            <div>
                <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${textMuted}`}>
                    {plotLabels[currentPlot]} — Current Plot
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    <StatCard icon={Users} label="Active Tenants" value={activeTenants.length} color="bg-blue-500" isDark={isDark} />
                    <StatCard icon={AlertCircle} label="Total Due" value={`₹${formatIndianNumber(totalDue)}`} color={totalDue > 0 ? 'bg-red-500' : 'bg-green-500'} isDark={isDark} />
                    <StatCard icon={IndianRupee} label="This Month Paid" value={`₹${formatIndianNumber(thisMonthPayments)}`} color="bg-green-500" isDark={isDark} />
                    <StatCard icon={TrendingUp} label="Monthly Rent" value={`₹${formatIndianNumber(monthlyRent)}`} color="bg-violet-500" isDark={isDark} />
                    <StatCard icon={Zap} label="Monthly Bills" value={`₹${formatIndianNumber(monthlyBills)}`} color="bg-amber-500" isDark={isDark} />
                </div>
            </div>

            {/* Revenue chart */}
            <div className={`rounded-2xl border p-5 ${gridBg}`}>
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 size={18} className="text-blue-400" />
                    <h2 className="text-sm font-semibold">Revenue Trend — All Properties (Last 6 Months)</h2>
                </div>
                <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} />
                            <YAxis tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b' }} tickFormatter={v => `₹${formatIndianNumber(v)}`} width={70} />
                            <Tooltip content={<CustomTooltip isDark={isDark} />} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Line type="monotone" dataKey="rent" name="Rent Due" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            <Line type="monotone" dataKey="payments" name="Payments" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* All plots combined */}
            <div>
                <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${textMuted}`}>All Properties Overview</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {plots.map(plot => (
                        <PlotStats
                            key={plot}
                            plotTenants={allTenants.filter(t => t.plotName === plot)}
                            label={plotLabels[plot]}
                            isDark={isDark}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
