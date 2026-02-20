import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    loadFromStorage, saveToStorage, loadAllFromStorage, saveAllToStorage,
    loadTheme, saveTheme, loadCurrentPlot, saveCurrentPlot,
    loadDataVersion, saveDataVersion
} from '../lib/storage';
import { loadFromFirebase, saveAllToFirebase, deleteTenantFromFirebase, loadAllFromFirebase, auth, logout } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { generateId } from '../lib/calculations';
import { validateTenant, sanitizeTenant } from '../lib/validation';
import { migrateData, CURRENT_DATA_VERSION } from '../lib/migration';

// Set to false to enable sync with real Firebase
const LOCAL_ONLY_MODE = false;

const AppContext = createContext(null);

export function AppProvider({ children }) {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    const [theme, setThemeState] = useState(loadTheme);
    const [currentPlot, setCurrentPlotState] = useState(loadCurrentPlot);
    const [allTenants, setAllTenants] = useState([]);
    const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | synced | error
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const syncLockRef = useRef(false);
    const storageWarningShownRef = useRef(false);

    // Auth Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Load tenants from localStorage on mount, run migrations, auto-sync from Firebase
    useEffect(() => {
        if (authLoading) return; // Wait for auth to settle

        let stored = loadAllFromStorage();
        const storedVersion = loadDataVersion();

        // Run data migrations if needed
        if (storedVersion < CURRENT_DATA_VERSION && stored.length > 0) {
            const { tenants: migrated, version } = migrateData(stored, storedVersion);
            stored = migrated;
            saveAllToStorage(stored);
            saveDataVersion(version);
            console.log(`Data migrated from v${storedVersion} to v${version}`);
        } else if (stored.length > 0) {
            saveDataVersion(CURRENT_DATA_VERSION);
        }

        if (stored.length > 0) {
            setAllTenants(stored);
        }

        // Sync if online, not local mode, and user is logged in
        if (!LOCAL_ONLY_MODE && navigator.onLine && user) {
            setSyncStatus('syncing');
            loadAllFromFirebase().then(firebaseTenants => {
                if (firebaseTenants && firebaseTenants.length > 0) {
                    // Sanitize Firebase data to handle malformed records
                    const sanitized = firebaseTenants.map(t => sanitizeTenant(t)).filter(Boolean);
                    setAllTenants(sanitized);
                    saveAllToStorage(sanitized);
                }
                setSyncStatus('synced');
                setTimeout(() => setSyncStatus('idle'), 3000);
            }).catch(() => {
                setSyncStatus('error');
                setTimeout(() => setSyncStatus('idle'), 3000);
            });
        }
    }, [authLoading, user]);


    // Online/offline detection
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Apply theme to document
    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    const setTheme = useCallback((t) => {
        setThemeState(t);
        saveTheme(t);
    }, []);

    const setCurrentPlot = useCallback((plot) => {
        setCurrentPlotState(plot);
        saveCurrentPlot(plot);
    }, []);

    // Persist to localStorage whenever allTenants changes
    const persistTenants = useCallback((tenants) => {
        setAllTenants(tenants);
        const result = saveAllToStorage(tenants);
        // Warn about storage quota (only once per session)
        if (result.quotaWarning && !storageWarningShownRef.current) {
            storageWarningShownRef.current = true;
            console.warn(`localStorage usage: ${result.usagePercent}%. Consider exporting a backup.`);
        }
        return result;
    }, []);

    // Tenants for current plot
    const tenants = currentPlot === 'all' ? allTenants : allTenants.filter(t => t.plotName === currentPlot);

    // --- CRUD Operations ---

    const addTenant = useCallback((tenantData) => {
        const newTenant = {
            id: generateId(),
            plotName: currentPlot,
            status: 'active',
            electricityReadings: [],
            paymentHistory: [],
            rentHistory: [{ date: tenantData.startDate, amount: tenantData.monthlyRent }],
            vacatedDate: null,
            vacationNotes: '',
            ...tenantData,
        };
        // Validate before persisting
        const { valid, errors } = validateTenant(newTenant);
        if (!valid) {
            console.error('Tenant validation failed:', errors);
            return { error: true, errors };
        }
        const updated = [...allTenants, newTenant];
        persistTenants(updated);
        if (!LOCAL_ONLY_MODE && isOnline && user) syncTenantToFirebase(currentPlot === 'all' ? updated : updated.filter(t => t.plotName === currentPlot));
        return newTenant;
    }, [allTenants, currentPlot, isOnline, persistTenants, user]);

    const editTenant = useCallback((tenantId, updates, rentChanged = false, rentEffectiveDate = null) => {
        const updated = allTenants.map(t => {
            if (String(t.id) !== String(tenantId)) return t;
            let rentHistory = t.rentHistory || [{ date: t.startDate, amount: t.monthlyRent }];
            if (rentChanged && updates.monthlyRent !== t.monthlyRent) {
                const effectiveDate = rentEffectiveDate || new Date().toISOString().split('T')[0];
                rentHistory = [...rentHistory, { date: effectiveDate, amount: updates.monthlyRent }];
            }
            return { ...t, ...updates, rentHistory };
        });
        persistTenants(updated);
        if (!LOCAL_ONLY_MODE && isOnline && user) syncTenantToFirebase(currentPlot === 'all' ? updated : updated.filter(t => t.plotName === currentPlot));
    }, [allTenants, currentPlot, isOnline, persistTenants, user]);

    const deleteTenant = useCallback(async (tenantId) => {
        const updated = allTenants.filter(t => String(t.id) !== String(tenantId));
        persistTenants(updated);
        if (!LOCAL_ONLY_MODE && isOnline && user) {
            try { await deleteTenantFromFirebase(tenantId); } catch { }
        }
    }, [allTenants, isOnline, persistTenants, user]);

    const vacateTenant = useCallback((tenantId, vacatedDate, vacationNotes, finalPayment) => {
        const updated = allTenants.map(t => {
            if (String(t.id) !== String(tenantId)) return t;
            let paymentHistory = [...(t.paymentHistory || [])];
            if (finalPayment && finalPayment.amount > 0) {
                paymentHistory = [...paymentHistory, {
                    id: generateId(),
                    date: vacatedDate,
                    amount: finalPayment.amount,
                    type: finalPayment.type || 'Rent',
                    notes: finalPayment.notes || 'Final settlement',
                }];
            }
            return { ...t, status: 'vacated', vacatedDate, vacationNotes, paymentHistory };
        });
        persistTenants(updated);
        if (!LOCAL_ONLY_MODE && isOnline && user) syncTenantToFirebase(currentPlot === 'all' ? updated : updated.filter(t => t.plotName === currentPlot));
    }, [allTenants, currentPlot, isOnline, persistTenants, user]);

    const recordPayment = useCallback((tenantId, payment) => {
        const updated = allTenants.map(t => {
            if (String(t.id) !== String(tenantId)) return t;
            const paymentHistory = [...(t.paymentHistory || []), {
                id: generateId(),
                date: payment.date,
                amount: Number(payment.amount),
                type: payment.type,
                notes: payment.notes || '',
            }];
            return { ...t, paymentHistory };
        });
        persistTenants(updated);
        if (!LOCAL_ONLY_MODE && isOnline && user) syncTenantToFirebase(currentPlot === 'all' ? updated : updated.filter(t => t.plotName === currentPlot));
    }, [allTenants, currentPlot, isOnline, persistTenants, user]);

    const editPayment = useCallback((tenantId, paymentId, updates) => {
        const updated = allTenants.map(t => {
            if (String(t.id) !== String(tenantId)) return t;
            const paymentHistory = (t.paymentHistory || []).map(p =>
                p.id === paymentId ? { ...p, ...updates } : p
            );
            return { ...t, paymentHistory };
        });
        persistTenants(updated);
        if (!LOCAL_ONLY_MODE && isOnline && user) syncTenantToFirebase(currentPlot === 'all' ? updated : updated.filter(t => t.plotName === currentPlot));
    }, [allTenants, currentPlot, isOnline, persistTenants, user]);

    const deletePayment = useCallback((tenantId, paymentId) => {
        const updated = allTenants.map(t => {
            if (String(t.id) !== String(tenantId)) return t;
            const paymentHistory = (t.paymentHistory || []).filter(p => p.id !== paymentId);
            return { ...t, paymentHistory };
        });
        persistTenants(updated);
        if (!LOCAL_ONLY_MODE && isOnline && user) syncTenantToFirebase(currentPlot === 'all' ? updated : updated.filter(t => t.plotName === currentPlot));
    }, [allTenants, currentPlot, isOnline, persistTenants, user]);

    const addElectricityReading = useCallback((tenantId, reading) => {
        const updated = allTenants.map(t => {
            if (String(t.id) !== String(tenantId)) return t;
            const electricityReadings = [...(t.electricityReadings || []), {
                id: generateId(),
                ...reading, // Spread all properties (date, reading, meterChange, lastMeterReading)
                reading: Number(reading.reading), // Ensure reading is number
            }];
            return { ...t, electricityReadings };
        });
        persistTenants(updated);
        if (!LOCAL_ONLY_MODE && isOnline && user) syncTenantToFirebase(currentPlot === 'all' ? updated : updated.filter(t => t.plotName === currentPlot));
    }, [allTenants, currentPlot, isOnline, persistTenants, user]);

    const editElectricityReading = useCallback((tenantId, readingId, updates) => {
        const updated = allTenants.map(t => {
            if (String(t.id) !== String(tenantId)) return t;
            const electricityReadings = (t.electricityReadings || []).map(r =>
                r.id === readingId ? { ...r, ...updates, reading: Number(updates.reading || r.reading) } : r
            );
            return { ...t, electricityReadings };
        });
        persistTenants(updated);
        if (!LOCAL_ONLY_MODE && isOnline && user) syncTenantToFirebase(currentPlot === 'all' ? updated : updated.filter(t => t.plotName === currentPlot));
    }, [allTenants, currentPlot, isOnline, persistTenants, user]);

    const deleteElectricityReading = useCallback((tenantId, readingId) => {
        const updated = allTenants.map(t => {
            if (String(t.id) !== String(tenantId)) return t;
            const electricityReadings = (t.electricityReadings || []).filter(r => r.id !== readingId);
            return { ...t, electricityReadings };
        });
        persistTenants(updated);
        if (!LOCAL_ONLY_MODE && isOnline && user) syncTenantToFirebase(currentPlot === 'all' ? updated : updated.filter(t => t.plotName === currentPlot));
    }, [allTenants, currentPlot, isOnline, persistTenants, user]);

    const editRentHistory = useCallback((tenantId, entryIndex, updates) => {
        const updated = allTenants.map(t => {
            if (String(t.id) !== String(tenantId)) return t;
            const sorted = [...(t.rentHistory || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
            if (entryIndex < 0 || entryIndex >= sorted.length) return t;
            sorted[entryIndex] = { ...sorted[entryIndex], ...updates, amount: Number(updates.amount || sorted[entryIndex].amount) };
            // Update monthlyRent to match the latest entry
            const latest = [...sorted].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            return { ...t, rentHistory: sorted, monthlyRent: latest.amount };
        });
        persistTenants(updated);
        if (!LOCAL_ONLY_MODE && isOnline && user) syncTenantToFirebase(currentPlot === 'all' ? updated : updated.filter(t => t.plotName === currentPlot));
    }, [allTenants, currentPlot, isOnline, persistTenants, user]);

    const deleteRentHistory = useCallback((tenantId, entryIndex) => {
        const updated = allTenants.map(t => {
            if (String(t.id) !== String(tenantId)) return t;
            const sorted = [...(t.rentHistory || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
            if (sorted.length <= 1 || entryIndex < 0 || entryIndex >= sorted.length) return t;
            sorted.splice(entryIndex, 1);
            const latest = [...sorted].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            return { ...t, rentHistory: sorted, monthlyRent: latest.amount };
        });
        persistTenants(updated);
        if (!LOCAL_ONLY_MODE && isOnline && user) syncTenantToFirebase(currentPlot === 'all' ? updated : updated.filter(t => t.plotName === currentPlot));
    }, [allTenants, currentPlot, isOnline, persistTenants, user]);

    // --- Firebase Sync ---
    const syncTenantToFirebase = async (plotTenants) => {
        if (LOCAL_ONLY_MODE) return;
        if (syncLockRef.current) return; // Skip if a sync is already in progress
        syncLockRef.current = true;
        try {
            await saveAllToFirebase(plotTenants);
        } catch {
            console.error('Background sync failed');
        } finally {
            syncLockRef.current = false;
        }
    };

    const syncWithFirebase = useCallback(async () => {
        if (LOCAL_ONLY_MODE) {
            setSyncStatus('local');
            setTimeout(() => setSyncStatus('idle'), 2000);
            return;
        }
        if (!user) return;
        // Prevent concurrent syncs
        if (syncLockRef.current) {
            console.log('Sync already in progress, skipping');
            return;
        }
        syncLockRef.current = true;
        setSyncStatus('syncing');
        try {
            const firebaseTenants = await loadAllFromFirebase();
            if (firebaseTenants && firebaseTenants.length > 0) {
                // Sanitize Firebase data and merge
                const sanitized = firebaseTenants.map(t => sanitizeTenant(t)).filter(Boolean);
                const fbIds = new Set(sanitized.map(t => t.id));
                const merged = [
                    ...sanitized,
                    ...allTenants.filter(t => !fbIds.has(t.id))
                ];
                persistTenants(merged);
                const localOnly = allTenants.filter(t => !fbIds.has(t.id));
                if (localOnly.length > 0) await saveAllToFirebase(localOnly);
            } else {
                await saveAllToFirebase(allTenants);
            }
            setSyncStatus('synced');
            setTimeout(() => setSyncStatus('idle'), 3000);
        } catch {
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 3000);
        } finally {
            syncLockRef.current = false;
        }
    }, [allTenants, persistTenants, user]);

    // --- Import/Export ---
    const exportData = useCallback(() => {
        const data = {
            version: CURRENT_DATA_VERSION,
            exportDate: new Date().toISOString(),
            tenants: allTenants,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rent-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [allTenants]);

    const importData = useCallback((jsonData) => {
        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            const rawTenants = data.tenants || data; // support both formats
            const importVersion = data.version || 1;

            if (!Array.isArray(rawTenants)) throw new Error('Invalid format: Expected an array of tenants');

            // Run migrations if imported data is from an older version
            let tenants;
            if (importVersion < CURRENT_DATA_VERSION) {
                const { tenants: migrated } = migrateData(rawTenants, importVersion);
                tenants = migrated;
            } else {
                tenants = rawTenants.map(t => sanitizeTenant(t)).filter(Boolean);
            }

            // Merge with existing tenants (upsert based on ID)
            const existingIds = new Set(tenants.map(t => t.id));
            const merged = [
                ...allTenants.filter(t => !existingIds.has(t.id)),
                ...tenants
            ];

            persistTenants(merged);
            saveDataVersion(CURRENT_DATA_VERSION);

            if (!LOCAL_ONLY_MODE && isOnline && user) saveAllToFirebase(merged);

            return { success: true, count: tenants.length };
        } catch (err) {
            console.error('Import error:', err);
            return { success: false, error: err.message };
        }
    }, [allTenants, isOnline, persistTenants, user]);

    const value = useMemo(() => ({
        user, authLoading, logout,
        theme, setTheme,
        currentPlot, setCurrentPlot,
        allTenants, tenants,
        syncStatus, isOnline,
        addTenant, editTenant, deleteTenant, vacateTenant,
        recordPayment, editPayment, deletePayment,
        addElectricityReading, editElectricityReading, deleteElectricityReading,
        editRentHistory, deleteRentHistory,
        syncWithFirebase,
        exportData, importData,
    }), [
        user, authLoading,
        theme, setTheme,
        currentPlot, setCurrentPlot,
        allTenants, tenants,
        syncStatus, isOnline,
        addTenant, editTenant, deleteTenant, vacateTenant,
        recordPayment, editPayment, deletePayment,
        addElectricityReading, editElectricityReading, deleteElectricityReading,
        editRentHistory, deleteRentHistory,
        syncWithFirebase,
        exportData, importData,
    ]);

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
}
