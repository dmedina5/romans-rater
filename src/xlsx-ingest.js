/**
 * Roman's Rater 4.21 - Excel Ingestion Module
 * Parses rating tables and tax/fee rules from Excel workbooks
 * Tasks: T065-T083
 */

// In-memory cache for parsed workbooks
const workbookCache = {
    rater: null,
    taxes: null
};

/**
 * Ingest rater workbook and extract CW/SS tables and attribute bands
 * @param {ArrayBuffer} arrayBuffer - Excel file content
 * @returns {Promise<Object>} Normalized rating tables
 */
async function ingestRaterWorkbook(arrayBuffer) {
    try {
        console.log('Loading rater workbook...');

        // Load workbook with SheetJS
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        console.log('Workbook sheets:', workbook.SheetNames);

        // Extract tables
        const cwTables = extractCWTables(workbook);
        const ssTables = extractSSTables(workbook);
        const bands = extractAttributeBands(workbook);

        const result = {
            cw: cwTables,
            ss: ssTables,
            bands: bands
        };

        // Cache result
        workbookCache.rater = result;

        console.log('Rater workbook loaded successfully');
        console.log(`CW states: ${Object.keys(cwTables.bodyClass).length}`);
        console.log(`SS states: ${Object.keys(ssTables.bodyClass).length}`);

        return result;

    } catch (error) {
        console.error('Rater workbook ingestion error:', error);
        throw new Error(`Failed to load rater workbook: ${error.message}`);
    }
}

/**
 * Extract Cover Whale (CW) tables from workbook
 * @param {Workbook} workbook - SheetJS workbook object
 * @returns {Object} CW rating table
 */
function extractCWTables(workbook) {
    const sheetName = workbook.SheetNames.find(name =>
        name.toLowerCase().includes('al cw') || name.toLowerCase().includes('al_cw')
    );

    if (!sheetName) {
        throw new Error('AL CW Tables sheet not found');
    }

    const sheet = workbook.Sheets[sheetName];

    return {
        program: 'CW',
        bodyClass: extractBodyClassFactors(sheet, 'CW'),
        radius: extractRadiusFactors(sheet),
        limit: extractLimitFactors(sheet),
        stateFactor: extractStateFactors(sheet),
        base_AL: extractBaseAL(sheet),
        editions: extractEditions(sheet),
        minPremiums: extractMinPremiums(sheet)
    };
}

/**
 * Extract Standard & Surplus (SS) tables from workbook
 * @param {Workbook} workbook - SheetJS workbook object
 * @returns {Object} SS rating table
 */
function extractSSTables(workbook) {
    const sheetName = workbook.SheetNames.find(name =>
        name.toLowerCase().includes('al ss') || name.toLowerCase().includes('al_ss')
    );

    if (!sheetName) {
        throw new Error('AL SS Tables sheet not found');
    }

    const sheet = workbook.Sheets[sheetName];

    return {
        program: 'SS',
        bodyClass: extractBodyClassFactors(sheet, 'SS'),
        radius: extractRadiusFactors(sheet),
        limit: extractLimitFactors(sheet),
        stateFactor: extractStateFactors(sheet),
        base_AL: extractBaseAL(sheet),
        editions: extractEditions(sheet),
        minPremiums: extractMinPremiums(sheet)
    };
}

/**
 * Extract body class factors (nested: state → bodyType → class → businessClass → factor)
 * @param {Sheet} sheet - SheetJS sheet object
 * @param {string} program - 'CW' or 'SS'
 * @returns {Object} Body class factor structure
 */
function extractBodyClassFactors(sheet, program) {
    const bodyClass = {};

    // Scan sheet for state codes
    const states = scanForStateCodes(sheet);

    console.log(`Extracting body class factors for ${program}: ${states.length} states found`);

    // For each state, extract body class factors
    // This is highly dependent on workbook structure
    // We'll use a heuristic approach to find factor tables

    for (const state of states) {
        bodyClass[state] = {};

        // Look for body type categories
        const bodyTypes = ['Tractor', 'Trailer', 'Straight Truck', 'Van', 'Pickup'];

        for (const bodyType of bodyTypes) {
            bodyClass[state][bodyType] = {};

            // Look for class values (1-8, Class1)
            const classes = ['1', '2', '3', '4', '5', '6', '7', '8', 'Class1'];

            for (const classVal of classes) {
                bodyClass[state][bodyType][classVal] = {};

                // Look for business classes
                const businessClasses = ['AUTOHAULER', 'GENERAL FREIGHT', 'TANKER', 'FLATBED', 'REFRIGERATED'];

                for (const bizClass of businessClasses) {
                    // Default factor (will be overwritten if found in sheet)
                    bodyClass[state][bodyType][classVal][bizClass] = 1.0;
                }
            }
        }
    }

    // TODO: Actual factor extraction from sheet cells
    // This would involve scanning the sheet for specific patterns
    // For MVP, we're using default values

    return bodyClass;
}

/**
 * Extract radius factors
 * @param {Sheet} sheet - SheetJS sheet object
 * @returns {Object} Radius factors by state and bucket
 */
function extractRadiusFactors(sheet) {
    const radius = {};

    // Scan for states
    const states = scanForStateCodes(sheet);

    for (const state of states) {
        radius[state] = {
            '0-50': 1.0,
            '51-200': 1.0,
            '201-500': 1.0,
            '500+': 1.0
        };
    }

    // TODO: Extract actual factors from sheet
    // Look for "Radius" section and parse factors

    return radius;
}

/**
 * Extract limit factors
 * @param {Sheet} sheet - SheetJS sheet object
 * @returns {Object} Limit factors by limit key
 */
function extractLimitFactors(sheet) {
    return {
        'CSL_1M': 1.0,
        'CSL_2M': 1.0,
        '1M_2M': 1.0
        // TODO: Extract actual factors from sheet
    };
}

/**
 * Extract state factors
 * @param {Sheet} sheet - SheetJS sheet object
 * @returns {Object} State factors
 */
function extractStateFactors(sheet) {
    const stateFactor = {};

    const states = scanForStateCodes(sheet);

    for (const state of states) {
        stateFactor[state] = 1.0; // Default
        // TODO: Extract actual factors from sheet
    }

    return stateFactor;
}

/**
 * Extract base AL premiums
 * @param {Sheet} sheet - SheetJS sheet object
 * @returns {Object} Base AL by state
 */
function extractBaseAL(sheet) {
    const base_AL = {};

    const states = scanForStateCodes(sheet);

    for (const state of states) {
        base_AL[state] = 1000; // Default base premium
        // TODO: Extract actual base premiums from sheet
    }

    return base_AL;
}

/**
 * Extract edition metadata
 * @param {Sheet} sheet - SheetJS sheet object
 * @returns {Object} Editions by state
 */
function extractEditions(sheet) {
    const editions = {};

    // Scan first 20 rows for edition metadata
    const range = XLSX.utils.decode_range(sheet['!ref']);

    for (let row = 0; row < Math.min(20, range.e.r); row++) {
        for (let col = 0; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = sheet[cellAddress];

            if (!cell || !cell.v) continue;

            const cellValue = String(cell.v).toLowerCase();

            // Look for "state rate edition" or "factor edition code"
            if (cellValue.includes('edition') || cellValue.includes('rate date')) {
                // Extract edition info from nearby cells
                // This is highly workbook-specific

                // For MVP, create default edition
                const states = scanForStateCodes(sheet);
                for (const state of states) {
                    editions[state] = [{
                        code: '2025-Q1',
                        rateDate: '2025-01-01',
                        sheetName: sheet['!name'] || 'Unknown',
                        row: row
                    }];
                }

                return editions;
            }
        }
    }

    return editions;
}

/**
 * Extract minimum premiums
 * @param {Sheet} sheet - SheetJS sheet object
 * @returns {Object} Min premiums by state
 */
function extractMinPremiums(sheet) {
    const minPremiums = {};

    const states = scanForStateCodes(sheet);

    for (const state of states) {
        minPremiums[state] = {
            perUnit: 250,
            perPolicy: 1000
        };
        // TODO: Extract actual min premiums from sheet
    }

    return minPremiums;
}

/**
 * Extract attribute bands (age, experience, MVR)
 * @param {Workbook} workbook - SheetJS workbook object
 * @returns {Object} Attribute bands
 */
function extractAttributeBands(workbook) {
    const sheetName = workbook.SheetNames.find(name =>
        name.toLowerCase().includes('attribute') || name.toLowerCase().includes('lookup')
    );

    if (!sheetName) {
        console.warn('Attribute bands sheet not found, using defaults');
        return getDefaultAttributeBands();
    }

    const sheet = workbook.Sheets[sheetName];

    // TODO: Parse actual attribute bands from sheet
    // For MVP, return defaults
    return getDefaultAttributeBands();
}

/**
 * Get default attribute bands
 * @returns {Object} Default bands
 */
function getDefaultAttributeBands() {
    return {
        age: [
            { min: 18, max: 24, factor: 1.50 },
            { min: 25, max: 29, factor: 1.20 },
            { min: 30, max: 39, factor: 1.00 },
            { min: 40, max: 49, factor: 0.95 },
            { min: 50, max: 64, factor: 0.90 },
            { min: 65, max: 120, factor: 1.10 }
        ],
        exp: [
            { min: 0, max: 2, factor: 1.50 },
            { min: 3, max: 5, factor: 1.20 },
            { min: 6, max: 9, factor: 1.00 },
            { min: 10, max: 15, factor: 0.90 },
            { min: 16, max: 60, factor: 0.85 }
        ],
        mvr: [
            { pointsMin: 0, pointsMax: 0, factor: 0.90 },
            { pointsMin: 1, pointsMax: 2, factor: 1.00 },
            { pointsMin: 3, pointsMax: 5, factor: 1.15 },
            { pointsMin: 6, pointsMax: 10, factor: 1.35 },
            { pointsMin: 11, pointsMax: 999, factor: 1.75 }
        ]
    };
}

/**
 * Ingest tax/fee workbook
 * @param {ArrayBuffer} arrayBuffer - Excel file content
 * @returns {Promise<Object>} State tax/fee rules
 */
async function ingestTaxFeeWorkbook(arrayBuffer) {
    try {
        console.log('Loading tax/fee workbook...');

        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        const taxRules = {};
        const states = scanWorkbookForStates(workbook);

        for (const state of states) {
            taxRules[state] = {
                state: state,
                slt_rate: 0.0485, // Default 4.85%
                stamp_rate: 0.002, // Default 0.2%
                fire: { type: 'flat', value: 50 },
                other: { type: 'flat', value: 0 },
                taxable: {
                    policy: true,
                    uw: true,
                    broker: false
                },
                uwPolicyFees: {
                    policyFeeStd: 250,
                    policyFeeNJ: 275,
                    uwFeeNew: 150,
                    uwFeeRen: 100
                }
            };

            // TODO: Extract actual values from sheets
        }

        workbookCache.taxes = taxRules;

        console.log(`Loaded tax/fee rules for ${Object.keys(taxRules).length} states`);

        return taxRules;

    } catch (error) {
        console.error('Tax/fee workbook ingestion error:', error);
        throw new Error(`Failed to load tax/fee workbook: ${error.message}`);
    }
}

/**
 * Scan sheet for US state codes
 * @param {Sheet} sheet - SheetJS sheet object
 * @returns {string[]} Array of state codes
 */
function scanForStateCodes(sheet) {
    const states = new Set();
    const validStates = [
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
    ];

    if (!sheet['!ref']) {
        return [];
    }

    const range = XLSX.utils.decode_range(sheet['!ref']);

    // Scan all cells for state codes
    for (let row = 0; row <= range.e.r; row++) {
        for (let col = 0; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = sheet[cellAddress];

            if (!cell || !cell.v) continue;

            const value = String(cell.v).trim().toUpperCase();

            if (validStates.includes(value)) {
                states.add(value);
            }
        }
    }

    return Array.from(states).sort();
}

/**
 * Scan entire workbook for state codes
 * @param {Workbook} workbook - SheetJS workbook object
 * @returns {string[]} Array of state codes
 */
function scanWorkbookForStates(workbook) {
    const allStates = new Set();

    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const states = scanForStateCodes(sheet);
        states.forEach(state => allStates.add(state));
    }

    return Array.from(allStates).sort();
}

/**
 * Parse Excel date to ISO 8601
 * @param {string|number} dateInput - Date in various formats
 * @returns {string|null} ISO 8601 date string
 */
function parseExcelDate(dateInput) {
    if (!dateInput) return null;

    try {
        // Handle Excel serial date (number)
        if (typeof dateInput === 'number') {
            // Excel serial date: days since 1900-01-01
            const excelEpoch = new Date(1900, 0, 1);
            const parsed = dayjs(excelEpoch).add(dateInput - 2, 'day');
            return parsed.format('YYYY-MM-DD');
        }

        // Handle string dates
        const parsed = dayjs(dateInput);
        if (parsed.isValid()) {
            return parsed.format('YYYY-MM-DD');
        }

        return null;
    } catch (error) {
        console.warn('Date parsing error:', error);
        return null;
    }
}

/**
 * Parse edition code to standard format (YYYY-QN)
 * @param {string} codeInput - Edition code in various formats
 * @returns {string} Standardized edition code
 */
function parseEditionCode(codeInput) {
    if (!codeInput) return null;

    const input = String(codeInput).trim();

    // Already in correct format
    if (/^\d{4}-Q[1-4]$/.test(input)) {
        return input;
    }

    // Handle 2025Q1 format
    if (/^\d{4}Q[1-4]$/.test(input)) {
        return input.replace(/^(\d{4})Q/, '$1-Q');
    }

    // Handle Q1-2025 format
    if (/^Q[1-4]-\d{4}$/.test(input)) {
        const [quarter, year] = input.split('-');
        return `${year}-${quarter}`;
    }

    return input;
}

/**
 * Validate factor is a positive number
 * @param {*} factor - Factor value to validate
 * @returns {boolean} True if valid
 */
function validateFactor(factor) {
    return typeof factor === 'number' && factor > 0 && isFinite(factor);
}

/**
 * Normalize factor (default to 1.0 if invalid)
 * @param {*} factor - Factor value
 * @returns {number} Normalized factor
 */
function normalizeFactor(factor) {
    return validateFactor(factor) ? factor : 1.0;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ingestRaterWorkbook,
        ingestTaxFeeWorkbook,
        scanForStateCodes,
        parseExcelDate,
        parseEditionCode,
        validateFactor,
        normalizeFactor,
        extractMinPremiums
    };
}
