/**
 * Check if a tenant is vacated.
 * Handles old Firebase data that may have vacatedDate set but status not updated.
 */
export function isVacated(tenant) {
    return tenant.status === 'vacated' || !!tenant.vacatedDate;
}

/**
 * Get the rent amount for a specific month/year, respecting rent history.
 * rentHistory is sorted ascending by date.
 * @param {Object} tenant
 * @param {number} year
 * @param {number} month - 0-indexed
 * @returns {number}
 */
export function getRentForMonth(tenant, year, month) {
    const history = tenant.rentHistory || [];
    const targetDate = new Date(year, month, 1);

    // Find the most recent rent change that is <= the target month
    let rent = tenant.monthlyRent || 0;
    if (history.length > 0) {
        // Sort ascending
        const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
        // Start with the first entry
        rent = sorted[0].amount;
        for (const entry of sorted) {
            const entryDate = new Date(entry.date);
            // Use this rent if it was effective on or before the first day of target month
            if (entryDate <= targetDate) {
                rent = entry.amount;
            }
        }
    }
    return rent;
}

/**
 * Get rent amount effective on a specific date.
 */
export function getRentAtDate(tenant, date) {
    const history = tenant.rentHistory || [];
    let rent = tenant.monthlyRent || 0;

    if (history.length > 0) {
        const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
        rent = sorted[0].amount;
        for (const entry of sorted) {
            if (new Date(entry.date) <= date) {
                rent = entry.amount;
            }
        }
    }
    return rent;
}

/**
 * Calculate total accrued rent from start date based on monthly billing cycles.
 * 1st month is full rent (no proration).
 * Cycles run from StartDate -> StartDate + 1 month.
 */
export function getTotalAccruedRent(tenant) {
    if (!tenant.startDate) return 0;

    const startDate = new Date(tenant.startDate);
    const cutoffDate = tenant.status === 'vacated' && tenant.vacatedDate
        ? new Date(tenant.vacatedDate)
        : new Date();

    let total = 0;
    let monthsAdded = 0;

    while (true) {
        // Calculate start of this billing period
        const cycleStart = new Date(startDate);
        cycleStart.setMonth(startDate.getMonth() + monthsAdded);

        // Adjust for day mismatch (e.g. Jan 31 -> Feb 28)
        if (cycleStart.getDate() !== startDate.getDate()) {
            cycleStart.setDate(0);
        }

        // Stop if this cycle starts AFTER the cutoff date
        // e.g. Started Jan 15. Cutoff Jan 10. Loop breaks immediately (0 rent).
        // e.g. Started Jan 15. Cutoff Jan 15. Loop runs once (1 month rent).
        if (cycleStart > cutoffDate) break;

        // Get rent effective at the start of this cycle
        total += getRentAtDate(tenant, cycleStart);
        monthsAdded++;
    }

    return Math.round(total);
}

/**
 * Calculate total electricity bills from all readings.
 */
export function getTotalElectricityBills(tenant) {
    const readings = tenant.electricityReadings || [];
    if (readings.length < 2) return 0;
    const sorted = [...readings].sort((a, b) => new Date(a.date) - new Date(b.date));
    let total = 0;
    for (let i = 1; i < sorted.length; i++) {
        const current = sorted[i];
        const previous = sorted[i - 1];
        let units = 0;

        if (current.meterChange) {
            // Bill for the old meter: Final Reading - Previous Reading
            units = (current.lastMeterReading || 0) - previous.reading;
            // Note: The new meter starts at current.reading, so the NEXT reading will subtract current.reading
        } else {
            // Normal calculation
            units = current.reading - previous.reading;
        }

        if (units > 0) {
            total += units * (tenant.electricityRate || 10);
        }
    }
    return total;
}

/**
 * Get electricity bill for a specific reading (index i in sorted readings).
 */
export function getBillForReading(readings, index, rate) {
    const sorted = [...readings].sort((a, b) => new Date(a.date) - new Date(b.date));
    if (index === 0 || index >= sorted.length) return 0;

    const current = sorted[index];
    const previous = sorted[index - 1];
    let units = 0;

    if (current.meterChange) {
        units = (current.lastMeterReading || 0) - previous.reading;
    } else {
        units = current.reading - previous.reading;
    }

    return units > 0 ? units * (rate || 10) : 0;
}

/**
 * Calculate total payments made.
 */
export function getTotalPayments(tenant) {
    const payments = tenant.paymentHistory || [];
    return payments.reduce((sum, p) => sum + (p.amount || 0), 0);
}

/**
 * Calculate current due amount.
 * Due = Opening Balance + Accrued Rent + Electricity Bills - Payments
 */
export function calculateDue(tenant) {
    const opening = tenant.startingDue || 0;
    // Advance paid is ignored in due calculation as per request
    const accrued = getTotalAccruedRent(tenant);
    const bills = getTotalElectricityBills(tenant);
    const payments = getTotalPayments(tenant);
    return opening + accrued + bills - payments;
}

/**
 * Get last electricity reading.
 */
export function getLastReading(tenant) {
    const readings = tenant.electricityReadings || [];
    if (readings.length === 0) return null;
    const sorted = [...readings].sort((a, b) => new Date(a.date) - new Date(b.date));
    return sorted[sorted.length - 1];
}

/**
 * Get last payment.
 */
export function getLastPayment(tenant) {
    const payments = tenant.paymentHistory || [];
    if (payments.length === 0) return null;
    const sorted = [...payments].sort((a, b) => new Date(b.date) - new Date(a.date));
    return sorted[0];
}

/**
 * Format number in Indian number system.
 */
export function formatIndianNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    const n = Math.round(Math.abs(num));
    const sign = num < 0 ? '-' : '';
    const str = n.toString();
    if (str.length <= 3) return sign + str;
    const last3 = str.slice(-3);
    const rest = str.slice(0, -3);
    const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
    return sign + formatted;
}

/**
 * Format date to readable string.
 */
export function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Get monthly revenue data for charts (last N months).
 */
export function getMonthlyRevenueData(allTenants, months = 6) {
    const data = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        let rent = 0;
        let bills = 0;
        let payments = 0;

        allTenants.forEach(tenant => {
            const startDate = new Date(tenant.startDate);
            if (startDate <= new Date(d.getFullYear(), d.getMonth() + 1, 0)) {
                rent += getRentForMonth(tenant, d.getFullYear(), d.getMonth());
            }
            // Payments in this month
            (tenant.paymentHistory || []).forEach(p => {
                const pd = new Date(p.date);
                if (pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth()) {
                    payments += p.amount || 0;
                }
            });
        });

        data.push({ month: label, rent, payments });
    }
    return data;
}

/**
 * Debounce utility.
 */
export function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Generate unique ID.
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
