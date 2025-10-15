/**
 * Roman's Rater 4.21 - Program Mapping Module
 * Resolves CW vs SS program based on state coverage and PDF hints
 * Tasks: T103-T111
 */

/**
 * Resolve which program (CW or SS) to use for a given state
 * @param {string} state - State code (e.g., 'AL')
 * @param {Object} cwTable - Cover Whale rating table
 * @param {Object} ssTable - Standard & Surplus rating table
 * @returns {Object} Program resolution result
 */
function resolveProgram(state, cwTable, ssTable) {
    const result = {
        program: null,
        confidence: 'none',
        reason: '',
        errors: [],
        warnings: []
    };

    // Validate state code
    if (!state || typeof state !== 'string' || state.trim().length === 0) {
        result.errors.push('State code is required');
        return result;
    }

    const normalizedState = state.trim().toUpperCase();

    // Validate table structures
    const cwValid = cwTable && cwTable.bodyClass && typeof cwTable.bodyClass === 'object';
    const ssValid = ssTable && ssTable.bodyClass && typeof ssTable.bodyClass === 'object';

    if (!cwValid && !ssValid) {
        result.errors.push('No valid rating tables available');
        return result;
    }

    // Check coverage
    const cwCovers = cwValid && normalizedState in cwTable.bodyClass;
    const ssCovers = ssValid && normalizedState in ssTable.bodyClass;

    if (cwCovers && ssCovers) {
        // Both programs cover this state - prefer CW
        result.program = 'CW';
        result.confidence = 'medium';
        result.reason = `State ${normalizedState} is covered by both CW and SS programs. Using CW (default preference).`;
        result.warnings.push('State covered by both programs - using CW by default');
        return result;
    }

    if (cwCovers) {
        result.program = 'CW';
        result.confidence = 'high';
        result.reason = `State ${normalizedState} is covered by CW program only.`;
        return result;
    }

    if (ssCovers) {
        result.program = 'SS';
        result.confidence = 'high';
        result.reason = `State ${normalizedState} is covered by SS program only.`;
        return result;
    }

    // State not covered by either program
    result.program = null;
    result.confidence = 'none';
    result.reason = `State ${normalizedState} is not covered by any program.`;
    result.errors.push(`State ${normalizedState} not covered by CW or SS tables`);
    return result;
}

/**
 * Get the rating table for a specific program
 * @param {string} program - 'CW' or 'SS'
 * @param {Object} cwTable - Cover Whale rating table
 * @param {Object} ssTable - Standard & Surplus rating table
 * @returns {Object|null} Selected rating table
 */
function getProgramTable(program, cwTable, ssTable) {
    if (!program || typeof program !== 'string') {
        return null;
    }

    const normalizedProgram = program.trim().toUpperCase();

    if (normalizedProgram === 'CW') {
        return cwTable || null;
    }

    if (normalizedProgram === 'SS') {
        return ssTable || null;
    }

    return null;
}

/**
 * Build program coverage summary for display
 * @param {Object} cwTable - Cover Whale rating table
 * @param {Object} ssTable - Standard & Surplus rating table
 * @returns {Object} Summary statistics
 */
function buildProgramSummary(cwTable, ssTable) {
    const cwStates = new Set();
    const ssStates = new Set();

    // Extract CW states
    if (cwTable && cwTable.bodyClass) {
        Object.keys(cwTable.bodyClass).forEach(state => cwStates.add(state));
    }

    // Extract SS states
    if (ssTable && ssTable.bodyClass) {
        Object.keys(ssTable.bodyClass).forEach(state => ssStates.add(state));
    }

    // Calculate overlap
    const cwOnlyStates = new Set([...cwStates].filter(s => !ssStates.has(s)));
    const ssOnlyStates = new Set([...ssStates].filter(s => !cwStates.has(s)));
    const bothStates = new Set([...cwStates].filter(s => ssStates.has(s)));

    return {
        cwOnly: cwOnlyStates.size,
        ssOnly: ssOnlyStates.size,
        both: bothStates.size,
        cwStates: Array.from(cwStates).sort(),
        ssStates: Array.from(ssStates).sort(),
        cwOnlyList: Array.from(cwOnlyStates).sort(),
        ssOnlyList: Array.from(ssOnlyStates).sort(),
        bothList: Array.from(bothStates).sort()
    };
}

/**
 * Validate that policy state is covered by at least one program
 * @param {string} state - State code
 * @param {Object} cwTable - Cover Whale rating table
 * @param {Object} ssTable - Standard & Surplus rating table
 * @returns {Object} Validation result
 */
function validateProgramCoverage(state, cwTable, ssTable) {
    const validation = {
        valid: false,
        errors: [],
        warnings: []
    };

    const resolution = resolveProgram(state, cwTable, ssTable);

    if (resolution.program === null) {
        validation.valid = false;
        validation.errors.push(`State ${state} is not covered by any rating program`);
        return validation;
    }

    validation.valid = true;

    if (resolution.confidence === 'medium') {
        validation.warnings.push(resolution.reason);
    }

    return validation;
}

/**
 * Detect program from PDF metadata (carrier name hints)
 * @param {Object} policyData - Parsed policy data
 * @returns {Object} Detection result
 */
function detectProgramFromPDF(policyData) {
    const result = {
        program: null,
        confidence: 'low',
        source: 'pdf_hint',
        reason: ''
    };

    if (!policyData || !policyData.policy) {
        return result;
    }

    const carrierName = policyData.policy.carrierName || '';
    const carrierLower = carrierName.toLowerCase();

    // Check for Cover Whale indicators
    if (carrierLower.includes('cover whale') || carrierLower.includes('coverwhale')) {
        result.program = 'CW';
        result.confidence = 'high';
        result.reason = 'Carrier name contains "Cover Whale"';
        return result;
    }

    // Check for Standard & Surplus indicators
    if (carrierLower.includes('standard') && carrierLower.includes('surplus')) {
        result.program = 'SS';
        result.confidence = 'high';
        result.reason = 'Carrier name contains "Standard & Surplus"';
        return result;
    }

    if (carrierLower.includes('standard & surplus') || carrierLower.includes('s&s')) {
        result.program = 'SS';
        result.confidence = 'high';
        result.reason = 'Carrier name indicates Standard & Surplus';
        return result;
    }

    // No clear indicator found
    result.program = null;
    result.confidence = 'low';
    result.reason = 'No program indicator found in carrier name';
    return result;
}

/**
 * Hybrid detection: combine PDF hints with state coverage
 * @param {Object} policyData - Parsed policy data
 * @param {Object} cwTable - Cover Whale rating table
 * @param {Object} ssTable - Standard & Surplus rating table
 * @returns {Object} Detection result
 */
function detectProgramHybrid(policyData, cwTable, ssTable) {
    const result = {
        program: null,
        confidence: 'none',
        source: null,
        reason: '',
        warnings: []
    };

    if (!policyData || !policyData.policy) {
        result.warnings.push('No policy data provided');
        return result;
    }

    const state = policyData.policy.state;

    // First, check PDF hints
    const pdfHint = detectProgramFromPDF(policyData);

    // Then, check state coverage
    const stateCoverage = resolveProgram(state, cwTable, ssTable);

    // If PDF hint is high confidence, validate against state coverage
    if (pdfHint.confidence === 'high' && pdfHint.program) {
        const hintTable = getProgramTable(pdfHint.program, cwTable, ssTable);

        if (hintTable && hintTable.bodyClass && state in hintTable.bodyClass) {
            // PDF hint matches state coverage
            result.program = pdfHint.program;
            result.confidence = 'high';
            result.source = 'pdf_hint';
            result.reason = `${pdfHint.reason} and state ${state} is covered by ${pdfHint.program}`;
            return result;
        } else {
            // PDF hint doesn't match state coverage - warn and use state coverage
            result.warnings.push(`PDF hint (${pdfHint.program}) mismatch: state ${state} not covered by ${pdfHint.program}. Using state coverage instead.`);
        }
    }

    // Fallback to state coverage
    if (stateCoverage.program) {
        result.program = stateCoverage.program;
        result.confidence = stateCoverage.confidence;
        result.source = 'state_coverage';
        result.reason = stateCoverage.reason;
        result.warnings.push(...stateCoverage.warnings);
        return result;
    }

    // No valid program found
    result.program = null;
    result.confidence = 'none';
    result.source = null;
    result.reason = 'Unable to determine program from PDF or state coverage';
    result.warnings.push('No valid program detected');
    return result;
}

/**
 * Get list of states covered by a specific program
 * @param {string} program - 'CW' or 'SS'
 * @param {Object} cwTable - Cover Whale rating table
 * @param {Object} ssTable - Standard & Surplus rating table
 * @returns {string[]} Array of state codes
 */
function getStatesForProgram(program, cwTable, ssTable) {
    const table = getProgramTable(program, cwTable, ssTable);

    if (!table || !table.bodyClass) {
        return [];
    }

    return Object.keys(table.bodyClass).sort();
}

/**
 * Check if a state is covered by a specific program
 * @param {string} state - State code
 * @param {string} program - 'CW' or 'SS'
 * @param {Object} cwTable - Cover Whale rating table
 * @param {Object} ssTable - Standard & Surplus rating table
 * @returns {boolean} True if state is covered
 */
function isStateCoveredByProgram(state, program, cwTable, ssTable) {
    if (!state || !program) {
        return false;
    }

    const normalizedState = state.trim().toUpperCase();
    const table = getProgramTable(program, cwTable, ssTable);

    if (!table || !table.bodyClass) {
        return false;
    }

    return normalizedState in table.bodyClass;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        resolveProgram,
        getProgramTable,
        buildProgramSummary,
        validateProgramCoverage,
        detectProgramFromPDF,
        detectProgramHybrid,
        getStatesForProgram,
        isStateCoveredByProgram
    };
}
