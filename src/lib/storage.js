// In-memory cache with TTL
const cache = {};
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export function getCached(key) {
    const entry = cache[key];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
        delete cache[key];
        return null;
    }
    return entry.data;
}

export function setCache(key, data) {
    cache[key] = { data, timestamp: Date.now() };
}

export function invalidateCache(key) {
    delete cache[key];
}

export function invalidateAllCache() {
    Object.keys(cache).forEach(k => delete cache[k]);
}

// LocalStorage helpers
export function loadFromStorage(plotName) {
    try {
        const raw = localStorage.getItem(`tenants_${plotName}`);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function saveToStorage(plotName, tenants) {
    try {
        localStorage.setItem(`tenants_${plotName}`, JSON.stringify(tenants));
    } catch (err) {
        console.error('Storage save error:', err);
    }
}

export function loadAllFromStorage() {
    const plots = ['home', 'baba', 'shop', 'others'];
    const all = [];
    plots.forEach(plot => {
        const tenants = loadFromStorage(plot);
        all.push(...tenants);
    });
    return all;
}

export function saveAllToStorage(allTenants) {
    const plots = ['home', 'baba', 'shop', 'others'];
    plots.forEach(plot => {
        const plotTenants = allTenants.filter(t => t.plotName === plot);
        saveToStorage(plot, plotTenants);
    });
}

export function loadTheme() {
    return localStorage.getItem('theme') || 'dark';
}

export function saveTheme(theme) {
    localStorage.setItem('theme', theme);
}

export function loadCurrentPlot() {
    return localStorage.getItem('currentPlot') || 'home';
}

export function saveCurrentPlot(plot) {
    localStorage.setItem('currentPlot', plot);
}
