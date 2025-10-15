/**
 * Roman's Rater 4.21 - Reconciliation Engine
 * Compares computed totals vs PDF-extracted totals with tolerance threshold
 * Tasks: T178-T190
 */

/**
 * Reconcile computed totals against PDF-extracted totals
 * @param {Object} computed - Computed fee breakdown
 * @param {Object} pdfExtracted - PDF-extracted values
 * @param {Object} options - Reconciliation options
 * @param {number} [options.tolerance=500] - Tolerance threshold in cents (default $5.00)
 * @returns {Object} Reconciliation result
 */
function reconcileTotals(computed, pdfExtracted, options = {}) {
    const result = {
        status: 'UNKNOWN',
        computed: {},
        pdf: {},
        delta: {},
        breakdown: [],
        discrepancies: [],
        tolerance: options.tolerance || 500,  // Default $5.00
        percentDiff: 0,
        componentMismatches: 0,
        errors: [],
        warnings: []
    };

    try {
        // Validate inputs
        if (!computed || typeof computed !== 'object') {
            result.errors.push('Invalid computed data');
            result.status = 'ERROR';
            return result;
        }

        // Handle missing PDF data
        if (!pdfExtracted || typeof pdfExtracted !== 'object') {
            result.status = 'NO_PDF_DATA';
            result.warnings.push('No PDF data available for comparison');
            result.computed = computed;
            return result;
        }

        // Store values
        result.computed = { ...computed };
        result.pdf = { ...pdfExtracted };

        // Define component mapping
        const components = [
            { key: 'alSubtotal', name: 'AL Base Premium' },
            { key: 'policyFee', name: 'Policy Fee' },
            { key: 'uwFee', name: 'UW Fee' },
            { key: 'brokerFee', name: 'Broker Fee' },
            { key: 'slt', name: 'SLT' },
            { key: 'stamp', name: 'Stamp Fee' },
            { key: 'fire', name: 'Fire Marshal Fee' },
            { key: 'other', name: 'Other Fees' },
            { key: 'total', name: 'Total Premium' }
        ];

        // Build component breakdown and calculate deltas
        for (const component of components) {
            const { key, name } = component;

            const computedValue = typeof computed[key] === 'number' ? computed[key] : null;
            const pdfValue = typeof pdfExtracted[key] === 'number' ? pdfExtracted[key] : null;

            // Skip if both are missing
            if (computedValue === null && pdfValue === null) {
                continue;
            }

            // Calculate delta
            let delta = null;
            if (computedValue !== null && pdfValue !== null) {
                delta = calculateDelta(computedValue, pdfValue);
            }

            // Add to breakdown
            result.breakdown.push({
                component: key,
                name: name,
                computed: computedValue,
                pdf: pdfValue,
                delta: delta,
                match: delta === 0
            });

            // Store delta
            result.delta[key] = delta;

            // Track discrepancies
            if (delta !== null && delta !== 0) {
                result.discrepancies.push({
                    component: key,
                    name: name,
                    computed: computedValue,
                    pdf: pdfValue,
                    delta: delta,
                    percentDiff: calculatePercentDiff(computedValue, pdfValue)
                });
                result.componentMismatches++;
            }
        }

        // Determine overall status
        const totalDelta = result.delta.total;

        if (totalDelta === null || totalDelta === undefined) {
            result.status = 'NO_TOTAL';
            result.warnings.push('Total not available for comparison');
            return result;
        }

        // Validate total is numeric
        if (isNaN(totalDelta) || !isFinite(totalDelta)) {
            result.errors.push('Invalid total value');
            result.status = 'ERROR';
            return result;
        }

        // Check if within tolerance
        const withinTolerance = isWithinTolerance(Math.abs(totalDelta), result.tolerance);

        if (withinTolerance) {
            if (result.componentMismatches === 0) {
                result.status = 'PASS';
            } else {
                // Total matches but components don't
                result.status = 'WARN';
                result.warnings.push('Total within tolerance but component discrepancies detected');
            }
        } else {
            result.status = 'FAIL';
        }

        // Calculate percentage difference
        if (computed.total && pdfExtracted.total) {
            result.percentDiff = calculatePercentDiff(computed.total, pdfExtracted.total);
        }

        return result;

    } catch (error) {
        console.error('Reconciliation error:', error);
        result.errors.push(`Reconciliation error: ${error.message}`);
        result.status = 'ERROR';
        return result;
    }
}

/**
 * Calculate delta (computed - PDF)
 * @param {number} computed - Computed value
 * @param {number} pdf - PDF value
 * @returns {number} Delta (positive = computed higher, negative = computed lower)
 */
function calculateDelta(computed, pdf) {
    return computed - pdf;
}

/**
 * Check if absolute delta is within tolerance
 * @param {number} absoluteDelta - Absolute delta value
 * @param {number} tolerance - Tolerance threshold
 * @returns {boolean} True if within tolerance
 */
function isWithinTolerance(absoluteDelta, tolerance) {
    return absoluteDelta <= tolerance;
}

/**
 * Calculate percentage difference
 * @param {number} computed - Computed value
 * @param {number} pdf - PDF value
 * @returns {number} Percentage difference (unsigned)
 */
function calculatePercentDiff(computed, pdf) {
    if (!pdf || pdf === 0) {
        return computed === 0 ? 0 : 100;
    }

    return Math.abs((computed - pdf) / pdf) * 100;
}

/**
 * Build component breakdown array
 * @param {Object} computed - Computed values
 * @param {Object} pdf - PDF values
 * @returns {Array} Breakdown array
 */
function buildComponentBreakdown(computed, pdf) {
    const breakdown = [];

    const keys = new Set([...Object.keys(computed), ...Object.keys(pdf)]);

    for (const key of keys) {
        const computedValue = typeof computed[key] === 'number' ? computed[key] : null;
        const pdfValue = typeof pdf[key] === 'number' ? pdf[key] : null;

        if (computedValue !== null || pdfValue !== null) {
            const delta = computedValue !== null && pdfValue !== null ?
                calculateDelta(computedValue, pdfValue) : null;

            breakdown.push({
                component: key,
                computed: computedValue,
                pdf: pdfValue,
                delta: delta,
                match: delta === 0
            });
        }
    }

    return breakdown;
}

/**
 * Generate reconciliation summary for display
 * @param {Object} reconciliation - Reconciliation result
 * @returns {Object} Summary object
 */
function generateReconciliationSummary(reconciliation) {
    const summary = {
        status: reconciliation.status,
        totalDelta: reconciliation.delta.total || 0,
        totalDeltaDollars: ((reconciliation.delta.total || 0) / 100).toFixed(2),
        percentDiff: reconciliation.percentDiff.toFixed(2),
        withinTolerance: reconciliation.status === 'PASS' || reconciliation.status === 'WARN',
        toleranceDollars: (reconciliation.tolerance / 100).toFixed(2),
        componentMismatches: reconciliation.componentMismatches,
        hasDiscrepancies: reconciliation.discrepancies.length > 0
    };

    // Add status badge
    if (reconciliation.status === 'PASS') {
        summary.badge = '✓ PASS';
        summary.badgeClass = 'success';
    } else if (reconciliation.status === 'WARN') {
        summary.badge = '⚠ WARNING';
        summary.badgeClass = 'warning';
    } else if (reconciliation.status === 'FAIL') {
        summary.badge = '✗ FAIL';
        summary.badgeClass = 'error';
    } else {
        summary.badge = '? ' + reconciliation.status;
        summary.badgeClass = 'info';
    }

    return summary;
}

/**
 * Find largest discrepancy
 * @param {Array} discrepancies - Array of discrepancies
 * @returns {Object|null} Largest discrepancy by absolute delta
 */
function findLargestDiscrepancy(discrepancies) {
    if (!discrepancies || discrepancies.length === 0) {
        return null;
    }

    return discrepancies.reduce((largest, current) => {
        const currentAbs = Math.abs(current.delta);
        const largestAbs = Math.abs(largest.delta);
        return currentAbs > largestAbs ? current : largest;
    });
}

/**
 * Validate reconciliation inputs
 * @param {Object} computed - Computed values
 * @param {Object} pdf - PDF values
 * @returns {Object} Validation result
 */
function validateReconciliationInputs(computed, pdf) {
    const validation = {
        valid: true,
        errors: [],
        warnings: []
    };

    // Check computed object
    if (!computed || typeof computed !== 'object') {
        validation.errors.push('Invalid computed data');
        validation.valid = false;
    }

    // Check PDF object
    if (!pdf || typeof pdf !== 'object') {
        validation.warnings.push('No PDF data available');
    }

    // Check for numeric values
    if (computed && computed.total !== undefined) {
        if (typeof computed.total !== 'number' || isNaN(computed.total) || !isFinite(computed.total)) {
            validation.errors.push('Computed total is not a valid number');
            validation.valid = false;
        }
    }

    if (pdf && pdf.total !== undefined) {
        if (typeof pdf.total !== 'number' || isNaN(pdf.total) || !isFinite(pdf.total)) {
            validation.errors.push('PDF total is not a valid number');
            validation.valid = false;
        }
    }

    return validation;
}

/**
 * Format reconciliation for export
 * @param {Object} reconciliation - Reconciliation result
 * @returns {Object} Export-ready object
 */
function formatReconciliationForExport(reconciliation) {
    return {
        timestamp: new Date().toISOString(),
        status: reconciliation.status,
        summary: {
            totalDelta: reconciliation.delta.total,
            percentDiff: reconciliation.percentDiff,
            tolerance: reconciliation.tolerance,
            componentMismatches: reconciliation.componentMismatches
        },
        computed: reconciliation.computed,
        pdfExtracted: reconciliation.pdf,
        breakdown: reconciliation.breakdown,
        discrepancies: reconciliation.discrepancies,
        errors: reconciliation.errors,
        warnings: reconciliation.warnings
    };
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        reconcileTotals,
        calculateDelta,
        isWithinTolerance,
        calculatePercentDiff,
        buildComponentBreakdown,
        generateReconciliationSummary,
        findLargestDiscrepancy,
        validateReconciliationInputs,
        formatReconciliationForExport
    };
}
