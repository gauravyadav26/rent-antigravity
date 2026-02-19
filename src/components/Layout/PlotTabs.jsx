import { useApp } from '../../context/AppContext';
import { isVacated } from '../../lib/calculations';

const plots = [
    { id: 'home', label: 'Home' },
    { id: 'baba', label: 'Baba' },
    { id: 'shop', label: 'Shop' },
    { id: 'others', label: 'Others' },
    { id: 'all', label: 'All Plots' },
];

export default function PlotTabs() {
    const { currentPlot, setCurrentPlot, theme, allTenants } = useApp();
    const isDark = theme === 'dark';

    const bg = isDark ? 'bg-slate-900/50 border-slate-700/50' : 'bg-white/50 border-slate-200';

    return (
        <div className={`border-b ${bg} px-4 flex gap-1 overflow-x-auto`} style={{ scrollbarWidth: 'none' }}>
            {plots.map(({ id, label }) => {
                const count = id === 'all'
                    ? allTenants.filter(t => !isVacated(t)).length
                    : allTenants.filter(t => t.plotName === id && !isVacated(t)).length;
                const isActive = currentPlot === id;
                return (
                    <button
                        key={id}
                        onClick={() => setCurrentPlot(id)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap
              ${isActive
                                ? 'border-blue-500 text-blue-500'
                                : `border-transparent ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`
                            }`}
                    >
                        {label}
                        {count > 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold
                ${isActive
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500')
                                }`}>
                                {count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
