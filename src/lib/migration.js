/**
 * Data migration strategy.
 * Each version bump adds a migration function that transforms data from the previous version.
 */

import { generateId } from './calculations';

export const CURRENT_DATA_VERSION = 2;

/**
 * Run all necessary migrations from `fromVersion` to CURRENT_DATA_VERSION.
 * Returns { tenants, version, migrated }.
 */
export function migrateData(tenants, fromVersion = 1) {
    let current = tenants;
    let version = fromVersion || 1;
    let migrated = false;

    const migrations = {
        // v1 → v2: Ensure all tenants have rentHistory, all payments/readings have string IDs
        1: (data) => data.map(t => {
            let changed = false;

            // Ensure rentHistory exists
            const rentHistory = t.rentHistory && t.rentHistory.length > 0
                ? t.rentHistory
                : [{ date: t.startDate || '2024-01-01', amount: t.monthlyRent || 0 }];

            // Ensure payment IDs are unique strings
            const paymentIds = new Set();
            const paymentHistory = (t.paymentHistory || []).map(p => {
                if (!p.id || paymentIds.has(String(p.id))) {
                    changed = true;
                    const newId = generateId();
                    paymentIds.add(newId);
                    return { ...p, id: newId };
                }
                paymentIds.add(String(p.id));
                return { ...p, id: String(p.id) };
            });

            // Ensure reading IDs are unique strings
            const readingIds = new Set();
            const electricityReadings = (t.electricityReadings || []).map(r => {
                if (!r.id || readingIds.has(String(r.id))) {
                    changed = true;
                    const newId = generateId();
                    readingIds.add(newId);
                    return { ...r, id: newId };
                }
                readingIds.add(String(r.id));
                return { ...r, id: String(r.id) };
            });

            // Ensure status field
            const status = t.status || (t.isActive === false ? 'vacated' : 'active');

            return {
                ...t,
                id: String(t.id),
                status,
                rentHistory,
                paymentHistory,
                electricityReadings,
                vacatedDate: t.vacatedDate || t.endDate || null,
            };
        }),
        // Future: 2 → 3 migration would go here
    };

    while (version < CURRENT_DATA_VERSION) {
        const migrationFn = migrations[version];
        if (migrationFn) {
            current = migrationFn(current);
            migrated = true;
        }
        version++;
    }

    return { tenants: current, version: CURRENT_DATA_VERSION, migrated };
}
