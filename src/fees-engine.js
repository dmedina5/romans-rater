/**
 * Roman's Rater 4.21 - Fees and Taxes Engine
 * Calculates state-specific taxes (SLT, stamp, fire, other) and fees (policy, UW, broker)
 * Tasks: T148-T159
 */

/**
 * Calculate fees and taxes for a policy
 * @param {Object} input - Input parameters
 * @param {number} input.alSubtotal - AL base premium subtotal (in cents)
 * @param {string} input.state - State code
 * @param {string} input.policyType - 'new' or 'renewal'
 * @param {boolean} input.isAdmitted - Admitted status (true = admitted, false = non-admitted)
 * @param {number} [input.brokerFee] - Optional broker fee override (in cents)
 * @param {Object} taxRules - State tax rules from loaded data
 * @returns {Object} Fee breakdown with total
 */
function calculateFeesAndTaxes(input, taxRules) {
    const result = {
        alSubtotal: 0,
        policyFee: 0,
        uwFee: 0,
        brokerFee: 0,
        taxableBase: 0,
        slt: 0,
        stamp: 0,
        fire: 0,
        other: 0,
        total: 0,
        breakdown: [],
        errors: [],
        warnings: []
    };

    try {
        // Validate inputs
        if (!input || typeof input.alSubtotal !== 'number') {
            result.errors.push('Invalid AL subtotal');
            return result;
        }

        if (!taxRules) {
            result.errors.push('Tax rules not available for this state');
            // Return with just AL subtotal
            result.alSubtotal = input.alSubtotal;
            result.total = input.alSubtotal;
            return result;
        }

        // Store AL subtotal
        result.alSubtotal = Math.max(0, Math.round(input.alSubtotal));

        // Determine policy type (default to 'new')
        const policyType = (input.policyType || 'new').toLowerCase();
        const isRenewal = policyType === 'renewal';

        // Get state code
        const state = (input.state || '').trim().toUpperCase();

        // Apply UW and Policy Fees
        const uwPolicyFees = taxRules.uwPolicyFees || {
            policyFeeStd: 250,
            policyFeeNJ: 275,
            uwFeeNew: 150,
            uwFeeRen: 100
        };

        // Policy fee (NJ special case)
        if (state === 'NJ') {
            result.policyFee = uwPolicyFees.policyFeeNJ || 275;
        } else {
            result.policyFee = uwPolicyFees.policyFeeStd || 250;
        }

        // UW fee (based on policy type)
        if (isRenewal) {
            result.uwFee = uwPolicyFees.uwFeeRen || 100;
        } else {
            result.uwFee = uwPolicyFees.uwFeeNew || 150;
        }

        // Broker fee (use override or default to 0)
        if (typeof input.brokerFee === 'number') {
            result.brokerFee = Math.max(0, Math.round(input.brokerFee));
        } else {
            result.brokerFee = 0;
        }

        // Build taxable base
        const taxable = taxRules.taxable || {
            policy: true,
            uw: true,
            broker: false
        };

        result.taxableBase = calculateTaxableBase({
            alSubtotal: result.alSubtotal,
            policyFee: result.policyFee,
            uwFee: result.uwFee,
            brokerFee: result.brokerFee
        }, taxable);

        // Determine if admitted (default to false for non-admitted)
        const isAdmitted = input.isAdmitted === true;

        // Apply SLT (Surplus Lines Tax) - only for non-admitted
        if (!isAdmitted && taxRules.slt_rate) {
            result.slt = roundToCents(result.taxableBase * taxRules.slt_rate);
        } else {
            result.slt = 0;
        }

        // Apply Stamp fee - only for non-admitted
        if (!isAdmitted && taxRules.stamp_rate) {
            result.stamp = roundToCents(result.taxableBase * taxRules.stamp_rate);
        } else {
            result.stamp = 0;
        }

        // Apply Fire fee
        if (taxRules.fire) {
            if (taxRules.fire.type === 'percentage') {
                result.fire = roundToCents(result.taxableBase * taxRules.fire.value);
            } else {
                // Flat fee
                result.fire = Math.round(taxRules.fire.value || 0);
            }
        } else {
            result.fire = 0;
        }

        // Apply Other fee
        if (taxRules.other) {
            if (taxRules.other.type === 'percentage') {
                result.other = roundToCents(result.taxableBase * taxRules.other.value);
            } else {
                // Flat fee
                result.other = Math.round(taxRules.other.value || 0);
            }
        } else {
            result.other = 0;
        }

        // Calculate total
        result.total =
            result.alSubtotal +
            result.policyFee +
            result.uwFee +
            result.brokerFee +
            result.slt +
            result.stamp +
            result.fire +
            result.other;

        // Build breakdown array for display
        result.breakdown = [
            { name: 'AL Base Premium', amount: result.alSubtotal, taxable: true },
            { name: 'Policy Fee', amount: result.policyFee, taxable: taxable.policy },
            { name: 'UW Fee', amount: result.uwFee, taxable: taxable.uw },
            { name: 'Broker Fee', amount: result.brokerFee, taxable: taxable.broker },
            { name: 'Surplus Lines Tax (SLT)', amount: result.slt, taxable: false },
            { name: 'Stamp Fee', amount: result.stamp, taxable: false },
            { name: 'Fire Marshal Fee', amount: result.fire, taxable: false },
            { name: 'Other Fees', amount: result.other, taxable: false }
        ];

        // Add warnings if applicable
        if (isAdmitted) {
            result.warnings.push('Admitted policy: SLT and Stamp fees set to $0');
        }

        return result;

    } catch (error) {
        console.error('Fee calculation error:', error);
        result.errors.push(`Calculation error: ${error.message}`);
        return result;
    }
}

/**
 * Calculate taxable base by summing only taxable components
 * @param {Object} components - Fee components
 * @param {Object} taxable - Taxability flags
 * @returns {number} Taxable base (in cents)
 */
function calculateTaxableBase(components, taxable) {
    let base = 0;

    // Always include AL subtotal
    base += components.alSubtotal || 0;

    // Add policy fee if taxable
    if (taxable.policy) {
        base += components.policyFee || 0;
    }

    // Add UW fee if taxable
    if (taxable.uw) {
        base += components.uwFee || 0;
    }

    // Add broker fee if taxable
    if (taxable.broker) {
        base += components.brokerFee || 0;
    }

    return Math.round(base);
}

/**
 * Apply percentage fee to a base amount
 * @param {number} base - Base amount (in cents)
 * @param {number} rate - Percentage rate (e.g., 0.05 for 5%)
 * @returns {number} Fee amount (in cents)
 */
function applyPercentageFee(base, rate) {
    return roundToCents(base * rate);
}

/**
 * Apply flat fee
 * @param {number} amount - Flat fee amount (in cents)
 * @returns {number} Fee amount (in cents)
 */
function applyFlatFee(amount) {
    return Math.round(amount || 0);
}

/**
 * Round to nearest cent (whole number) using banker's rounding
 * @param {number} value - Value to round
 * @returns {number} Rounded value
 */
function roundToCents(value) {
    // Banker's rounding: 0.5 rounds to nearest even
    const rounded = Math.round(value);

    // Check if we're exactly at 0.5
    const decimal = value - Math.floor(value);
    if (Math.abs(decimal - 0.5) < 0.0001) {
        // If floor is even, round down; if odd, round up
        const floor = Math.floor(value);
        return floor % 2 === 0 ? floor : Math.ceil(value);
    }

    return rounded;
}

/**
 * Get UW fee based on policy type
 * @param {string} policyType - 'new' or 'renewal'
 * @param {Object} uwPolicyFees - Fee configuration
 * @returns {number} UW fee (in cents)
 */
function getUWFee(policyType, uwPolicyFees) {
    const type = (policyType || 'new').toLowerCase();

    if (type === 'renewal') {
        return uwPolicyFees.uwFeeRen || 100;
    }

    return uwPolicyFees.uwFeeNew || 150;
}

/**
 * Get policy fee (with NJ special case)
 * @param {string} state - State code
 * @param {Object} uwPolicyFees - Fee configuration
 * @returns {number} Policy fee (in cents)
 */
function getPolicyFee(state, uwPolicyFees) {
    const stateCode = (state || '').trim().toUpperCase();

    if (stateCode === 'NJ') {
        return uwPolicyFees.policyFeeNJ || 275;
    }

    return uwPolicyFees.policyFeeStd || 250;
}

/**
 * Build fee summary for display
 * @param {Object} result - Fee calculation result
 * @returns {Object} Summary object
 */
function buildFeeSummary(result) {
    return {
        subtotal: result.alSubtotal,
        fees: result.policyFee + result.uwFee + result.brokerFee,
        taxes: result.slt + result.stamp + result.fire + result.other,
        total: result.total,
        taxableBase: result.taxableBase,
        breakdown: result.breakdown
    };
}

/**
 * Validate fee calculation result
 * @param {Object} result - Fee calculation result
 * @returns {Object} Validation result
 */
function validateFeeCalculation(result) {
    const validation = {
        valid: true,
        errors: [],
        warnings: []
    };

    // Check for negative values
    if (result.alSubtotal < 0) {
        validation.errors.push('AL subtotal cannot be negative');
        validation.valid = false;
    }

    if (result.total < result.alSubtotal) {
        validation.warnings.push('Total is less than AL subtotal - check for negative fees');
    }

    // Check for NaN
    const values = [
        result.alSubtotal,
        result.policyFee,
        result.uwFee,
        result.brokerFee,
        result.taxableBase,
        result.slt,
        result.stamp,
        result.fire,
        result.other,
        result.total
    ];

    for (const value of values) {
        if (isNaN(value) || !isFinite(value)) {
            validation.errors.push('Invalid numeric value in calculation');
            validation.valid = false;
            break;
        }
    }

    return validation;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateFeesAndTaxes,
        calculateTaxableBase,
        applyPercentageFee,
        applyFlatFee,
        roundToCents,
        getUWFee,
        getPolicyFee,
        buildFeeSummary,
        validateFeeCalculation
    };
}
