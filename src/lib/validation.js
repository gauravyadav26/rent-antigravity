/**
 * Tenant data validation and sanitization.
 */

const REQUIRED_STRING_FIELDS = ['tenantName', 'roomNumber', 'startDate', 'plotName'];
const REQUIRED_NUMBER_FIELDS = ['monthlyRent'];
const VALID_PLOTS = ['home', 'baba', 'shop', 'others'];
const VALID_STATUSES = ['active', 'vacated'];

/**
 * Validate tenant data. Returns { valid, errors }.
 */
export function validateTenant(data) {
    const errors = [];

    if (!data || typeof data !== 'object') {
        return { valid: false, errors: ['Tenant data must be an object'] };
    }

    // Required strings
    for (const field of REQUIRED_STRING_FIELDS) {
        if (!data[field] || typeof data[field] !== 'string' || !data[field].trim()) {
            errors.push(`Missing or empty required field: ${field}`);
        }
    }

    // Required numbers
    for (const field of REQUIRED_NUMBER_FIELDS) {
        const val = Number(data[field]);
        if (isNaN(val) || val <= 0) {
            errors.push(`${field} must be a positive number`);
        }
    }

    // Plot name
    if (data.plotName && !VALID_PLOTS.includes(data.plotName)) {
        errors.push(`Invalid plotName: "${data.plotName}". Must be one of: ${VALID_PLOTS.join(', ')}`);
    }

    // Status
    if (data.status && !VALID_STATUSES.includes(data.status)) {
        errors.push(`Invalid status: "${data.status}". Must be "active" or "vacated"`);
    }

    // Electricity rate
    if (data.electricityRate !== undefined && data.electricityRate !== null) {
        const rate = Number(data.electricityRate);
        if (isNaN(rate) || rate < 0) {
            errors.push('electricityRate must be a non-negative number');
        }
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Sanitize tenant data — coerce types, fill defaults, ensure arrays exist.
 * Used when loading from Firebase or importing to handle potentially malformed data.
 */
export function sanitizeTenant(data) {
    if (!data || typeof data !== 'object') return null;

    return {
        ...data,
        id: String(data.id || ''),
        tenantName: String(data.tenantName || 'Unknown'),
        roomNumber: String(data.roomNumber || ''),
        startDate: data.startDate || new Date().toISOString().split('T')[0],
        plotName: VALID_PLOTS.includes(data.plotName) ? data.plotName : 'others',
        status: VALID_STATUSES.includes(data.status) ? data.status : 'active',
        monthlyRent: Math.max(0, Number(data.monthlyRent) || 0),
        electricityRate: Math.max(0, Number(data.electricityRate) || 10),
        advancePaid: Math.max(0, Number(data.advancePaid) || 0),
        openingBalance: Number(data.openingBalance) || 0,
        paymentHistory: Array.isArray(data.paymentHistory) ? data.paymentHistory : [],
        electricityReadings: Array.isArray(data.electricityReadings) ? data.electricityReadings : [],
        rentHistory: Array.isArray(data.rentHistory)
            ? data.rentHistory
            : [{ date: data.startDate || new Date().toISOString().split('T')[0], amount: Number(data.monthlyRent) || 0 }],
        vacatedDate: data.vacatedDate || null,
        vacationNotes: data.vacationNotes || '',
    };
}

/**
 * Validate an array of tenants. Returns { valid, errors, validCount, invalidCount }.
 */
export function validateTenantArray(tenants) {
    if (!Array.isArray(tenants)) {
        return { valid: false, errors: ['Expected an array of tenants'], validCount: 0, invalidCount: 0 };
    }

    const allErrors = [];
    let invalidCount = 0;

    tenants.forEach((t, i) => {
        const result = validateTenant(t);
        if (!result.valid) {
            invalidCount++;
            result.errors.forEach(err => allErrors.push(`Tenant #${i + 1} (${t.tenantName || 'unnamed'}): ${err}`));
        }
    });

    return {
        valid: invalidCount === 0,
        errors: allErrors,
        validCount: tenants.length - invalidCount,
        invalidCount,
    };
}
