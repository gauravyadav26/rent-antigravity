import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    loadFromStorage, saveToStorage, loadAllFromStorage, saveAllToStorage,
    loadTheme, saveTheme, loadCurrentPlot, saveCurrentPlot
} from '../lib/storage';
import { loadFromFirebase, saveAllToFirebase, deleteTenantFromFirebase, loadAllFromFirebase, auth, logout } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { generateId } from '../lib/calculations';

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

    // Auth Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Load tenants from localStorage on mount, auto-sync from Firebase if empty
    useEffect(() => {
        if (authLoading) return; // Wait for auth to settle

        let stored = loadAllFromStorage();

        // Fix missing IDs in legacy data (one-time migration)
        let dataChanged = false;
        stored = stored.map(t => {
            let changed = false;
            const paymentIds = new Set();
            const paymentHistory = (t.paymentHistory || []).map(p => {
                if (!p.id || paymentIds.has(String(p.id))) {
                    changed = true;
                    const newId = generateId();
                    paymentIds.add(newId);
                    return { ...p, id: newId };
                }
                paymentIds.add(String(p.id));
                return p;
            });

            const readingIds = new Set();
            const electricityReadings = (t.electricityReadings || []).map(r => {
                if (!r.id || readingIds.has(String(r.id))) {
                    changed = true;
                    const newId = generateId();
                    readingIds.add(newId);
                    return { ...r, id: newId };
                }
                readingIds.add(String(r.id));
                return r;
            });

            if (changed) {
                dataChanged = true;
                return { ...t, paymentHistory, electricityReadings };
            }
            return t;
        });

        if (dataChanged) {
            saveAllToStorage(stored);
        }

        if (stored.length > 0) {
            setAllTenants(stored);
        }

        // Sync if online, not local mode, and (IMPORTANT) user is logged in
        if (!LOCAL_ONLY_MODE && navigator.onLine && user) {
            // First time / fresh install — pull from Firebase
            setSyncStatus('syncing');
            loadAllFromFirebase().then(firebaseTenants => {
                if (firebaseTenants && firebaseTenants.length > 0) {
                    // Normalize data: ensure status exists
                    const normalized = firebaseTenants.map(t => ({
                        ...t,
                        status: t.status || (t.vacatedDate ? 'vacated' : 'active')
                    }));
                    setAllTenants(normalized);
                    saveAllToStorage(normalized);
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
        saveAllToStorage(tenants);
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
        const updated = [...allTenants, newTenant];
        persistTenants(updated);
        // Background sync (disabled in LOCAL_ONLY_MODE)
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
        if (!LOCAL_ONLY_MODE && isOnline && user) syncTenantToFirebase(updated.filter(t => t.plotName === currentPlot));
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

    // --- Firebase Sync ---
    const syncTenantToFirebase = async (plotTenants) => {
        if (LOCAL_ONLY_MODE) return;
        try {
            await saveAllToFirebase(plotTenants);
        } catch { }
    };

    const syncWithFirebase = useCallback(async () => {
        if (LOCAL_ONLY_MODE) {
            setSyncStatus('local');
            setTimeout(() => setSyncStatus('idle'), 2000);
            return;
        }
        if (!user) return; // Cannot sync if not logged in

        setSyncStatus('syncing');
        try {
            const firebaseTenants = await loadAllFromFirebase();
            if (firebaseTenants && firebaseTenants.length > 0) {
                // Merge: Firebase is source of truth for existing, local wins for new
                const localIds = new Set(allTenants.map(t => t.id));
                const fbIds = new Set(firebaseTenants.map(t => t.id));
                const merged = [
                    ...firebaseTenants,
                    ...allTenants.filter(t => !fbIds.has(t.id))
                ];
                persistTenants(merged);
                // Push local-only tenants to Firebase
                const localOnly = allTenants.filter(t => !fbIds.has(t.id));
                if (localOnly.length > 0) await saveAllToFirebase(localOnly);
            } else {
                // Firebase is empty, push all local data
                await saveAllToFirebase(allTenants);
            }
            setSyncStatus('synced');
            setTimeout(() => setSyncStatus('idle'), 3000);
        } catch {
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 3000);
        }
    }, [allTenants, persistTenants, user]);

    // --- Import/Export ---
    const exportData = useCallback(() => {
        const data = {
            version: 1,
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

            if (!Array.isArray(rawTenants)) throw new Error('Invalid format: Expected an array of tenants');

            // Transform legacy data to new schema
            const tenants = rawTenants.map(t => ({
                ...t,
                id: String(t.id), // Ensure ID is string
                status: t.status || (t.isActive === false ? 'vacated' : 'active'),
                vacatedDate: t.vacatedDate || t.endDate || null,
                // Ensure required arrays exist
                paymentHistory: (t.paymentHistory || []).map(p => ({ ...p, id: p.id ? String(p.id) : generateId() })),
                electricityReadings: (t.electricityReadings || []).map(r => ({ ...r, id: r.id ? String(r.id) : generateId() })),
                rentHistory: t.rentHistory || []
            }));

            // Merge with existing tenants (upsert based on ID)
            const existingIds = new Set(tenants.map(t => t.id));
            const merged = [
                ...allTenants.filter(t => !existingIds.has(t.id)),
                ...tenants
            ];

            persistTenants(merged);

            // In local-only mode, this does nothing (dummy export).
            // In connected mode, it syncs to Firebase.
            if (!LOCAL_ONLY_MODE && isOnline && user) saveAllToFirebase(merged);

            return { success: true, count: tenants.length };
        } catch (err) {
            console.error('Import error:', err);
            return { success: false, error: err.message };
        }
    }, [allTenants, isOnline, persistTenants, user]);

    const value = {
        user, authLoading, logout, // Auth exposed
        theme, setTheme,
        currentPlot, setCurrentPlot,
        allTenants, tenants,
        syncStatus, isOnline,
        addTenant, editTenant, deleteTenant, vacateTenant,
        recordPayment, editPayment, deletePayment,
        addElectricityReading, editElectricityReading, deleteElectricityReading,
        syncWithFirebase,
        exportData, importData,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
}
