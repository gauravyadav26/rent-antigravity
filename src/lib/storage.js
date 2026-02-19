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

/**
 * Save all tenants to localStorage, grouped by plot.
 * Returns { success, quotaWarning, usagePercent }.
 */
export function saveAllToStorage(allTenants) {
    const plots = ['home', 'baba', 'shop', 'others'];
    try {
        plots.forEach(plot => {
            const plotTenants = allTenants.filter(t => t.plotName === plot);
            saveToStorage(plot, plotTenants);
        });
        const usage = getStorageUsage();
        return { success: true, quotaWarning: usage.percent >= 80, usagePercent: usage.percent };
    } catch (err) {
        if (err.name === 'QuotaExceededError' || err.code === 22) {
            return { success: false, quotaWarning: true, usagePercent: 100, error: 'Storage full' };
        }
        return { success: false, quotaWarning: false, usagePercent: 0, error: err.message };
    }
}

// --- Data Version ---
const VERSION_KEY = 'dataVersion';

export function loadDataVersion() {
    const v = localStorage.getItem(VERSION_KEY);
    return v ? parseInt(v, 10) : 1; // Default to v1 for legacy data
}

export function saveDataVersion(version) {
    localStorage.setItem(VERSION_KEY, String(version));
}

// --- Storage Size Monitoring ---
const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024; // ~5MB typical limit

/**
 * Estimate current localStorage usage.
 * Returns { bytes, percent, formatted }.
 */
export function getStorageUsage() {
    let total = 0;
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            // Each character is 2 bytes in UTF-16
            total += (key.length + value.length) * 2;
        }
    } catch {
        // Ignore errors during estimation
    }
    const percent = Math.round((total / STORAGE_LIMIT_BYTES) * 100);
    const mb = (total / (1024 * 1024)).toFixed(2);
    return { bytes: total, percent, formatted: `${mb} MB` };
}

// --- Theme & Plot ---
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
