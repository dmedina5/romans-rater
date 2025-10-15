/**
 * Roman's Rater 4.21 - AL Base Premium Calculation Engine
 * Calculates Auto Liability base premium using factor chain methodology
 * Tasks: T112-T121
 */

/**
 * Calculate AL base premium for a policy
 * @param {Object} policyData - Parsed policy data (policy, vehicles, drivers)
 * @param {Object} ratingTable - Selected program table (CW or SS)
 * @param {Object} attributeBands - Age/Experience/MVR band definitions
 * @param {Object} options - Calculation options (aggregation method, etc.)
 * @returns {Object} Calculation result with subtotal and factor trace
 */
function calculateALPremium(policyData, ratingTable, attributeBands, options = {}) {
    const result = {
        subtotal: 0,
        perUnit: [],
        factorTrace: {},
        errors: [],
        warnings: []
    };

    try {
        // Validate inputs
        if (!policyData || !policyData.policy) {
            result.errors.push('Invalid policy data');
            return result;
        }

        if (!ratingTable) {
            result.errors.push('Rating table is required');
            return result;
        }

        const { policy, vehicles = [], drivers = [] } = policyData;
        const { state, limit, radius } = policy;

        // Validate required fields
        if (!state) {
            result.errors.push('Policy state is required');
            return result;
        }

        if (!vehicles || vehicles.length === 0) {
            result.errors.push('At least one vehicle is required');
            return result;
        }

        // Get base AL premium for state
        const base_AL = lookupBaseAL(state, ratingTable);
        if (!base_AL) {
            result.errors.push(`Base AL premium not found for state ${state}`);
            return result;
        }

        // Get limit factor
        const limitFactor = lookupLimitFactor(limit, ratingTable.limit);

        // Get radius factor
        const radiusFactor = lookupRadiusFactor(state, radius, ratingTable.radius);

        // Get state factor
        const stateFactor = lookupStateFactor(state, ratingTable.stateFactor);

        // Calculate driver composite factors
        const driversWithFactors = calculateDriverFactors(drivers, attributeBands);

        // Aggregate driver factors
        const aggregationMethod = options.aggregation || 'mean';
        const driverFactor = aggregateDriverFactors(driversWithFactors, aggregationMethod);

        // Calculate per-unit premiums
        const perUnitPremiums = [];

        for (const vehicle of vehicles) {
            const { vin, bodyType, class: vehicleClass, businessClass } = vehicle;

            // Get body class factor for this vehicle
            const bodyClassFactor = lookupBodyClassFactor(
                state,
                bodyType,
                vehicleClass,
                businessClass,
                ratingTable.bodyClass
            );

            // Calculate unit premium using factor chain
            const unitPremium = Math.round(
                base_AL *
                bodyClassFactor *
                radiusFactor *
                limitFactor *
                stateFactor *
                driverFactor
            );

            perUnitPremiums.push({
                vin: vin || 'Unknown',
                bodyType,
                vehicleClass,
                businessClass,
                bodyClassFactor,
                premium: unitPremium
            });
        }

        // Apply minimum premiums if configured
        const minPremiums = ratingTable.minPremiums ? ratingTable.minPremiums[state] : null;
        const afterMinimum = applyMinimumPremium(perUnitPremiums, minPremiums);

        // Build factor trace for auditability
        const factorTrace = buildFactorTrace({
            base_AL,
            bodyClassFactor: perUnitPremiums.length > 0 ? perUnitPremiums[0].bodyClassFactor : 1.0,
            radiusFactor,
            limitFactor,
            stateFactor,
            driverFactor,
            numVehicles: vehicles.length,
            subtotal: afterMinimum.subtotal,
            minimumApplied: afterMinimum.minimumApplied,
            aggregationMethod,
            driversWithFactors
        });

        result.subtotal = afterMinimum.subtotal;
        result.perUnit = afterMinimum.perUnit;
        result.factorTrace = factorTrace;

        if (afterMinimum.minimumApplied) {
            result.warnings.push(`Minimum premium applied: ${afterMinimum.minimumApplied}`);
        }

        return result;

    } catch (error) {
        console.error('AL premium calculation error:', error);
        result.errors.push(`Calculation error: ${error.message}`);
        return result;
    }
}

/**
 * Lookup base AL premium for state
 * @param {string} state - State code
 * @param {Object} ratingTable - Rating table
 * @returns {number} Base AL premium
 */
function lookupBaseAL(state, ratingTable) {
    if (!ratingTable || !ratingTable.base_AL) {
        return null;
    }

    const normalizedState = state.trim().toUpperCase();
    return ratingTable.base_AL[normalizedState] || null;
}

/**
 * Lookup body class factor (nested: state → bodyType → class → businessClass)
 * @param {string} state - State code
 * @param {string} bodyType - Body type (e.g., 'Tractor', 'Trailer')
 * @param {string} vehicleClass - Class (e.g., '8', 'Class1')
 * @param {string} businessClass - Business class (e.g., 'GENERAL FREIGHT')
 * @param {Object} bodyClassTable - Body class factor table
 * @returns {number} Body class factor (default 1.0)
 */
function lookupBodyClassFactor(state, bodyType, vehicleClass, businessClass, bodyClassTable) {
    if (!bodyClassTable || typeof bodyClassTable !== 'object') {
        return 1.0;
    }

    try {
        const normalizedState = state.trim().toUpperCase();
        const normalizedBodyType = bodyType.trim();
        const normalizedClass = String(vehicleClass).trim();
        const normalizedBusinessClass = businessClass.trim().toUpperCase();

        // Navigate nested structure
        if (normalizedState in bodyClassTable) {
            const stateTable = bodyClassTable[normalizedState];

            // Try exact bodyType match
            let bodyTypeTable = stateTable[normalizedBodyType];

            // If not found, try case-insensitive match
            if (!bodyTypeTable) {
                const bodyTypeKey = Object.keys(stateTable).find(
                    key => key.toLowerCase() === normalizedBodyType.toLowerCase()
                );
                bodyTypeTable = bodyTypeKey ? stateTable[bodyTypeKey] : null;
            }

            if (bodyTypeTable && normalizedClass in bodyTypeTable) {
                const classTable = bodyTypeTable[normalizedClass];

                if (normalizedBusinessClass in classTable) {
                    const factor = classTable[normalizedBusinessClass];
                    return typeof factor === 'number' && factor > 0 ? factor : 1.0;
                }
            }
        }
    } catch (error) {
        console.warn('Body class factor lookup error:', error);
    }

    return 1.0;  // Default neutral factor
}

/**
 * Lookup radius factor for state and bucket
 * @param {string} state - State code
 * @param {string} radiusBucket - Radius bucket (e.g., '0-50', '51-200')
 * @param {Object} radiusTable - Radius factor table
 * @returns {number} Radius factor (default 1.0)
 */
function lookupRadiusFactor(state, radiusBucket, radiusTable) {
    if (!radiusTable || typeof radiusTable !== 'object') {
        return 1.0;
    }

    try {
        const normalizedState = state.trim().toUpperCase();
        const normalizedBucket = radiusBucket ? radiusBucket.trim() : null;

        if (!normalizedBucket) {
            return 1.0;
        }

        if (normalizedState in radiusTable) {
            const stateTable = radiusTable[normalizedState];
            if (normalizedBucket in stateTable) {
                const factor = stateTable[normalizedBucket];
                return typeof factor === 'number' && factor > 0 ? factor : 1.0;
            }
        }
    } catch (error) {
        console.warn('Radius factor lookup error:', error);
    }

    return 1.0;
}

/**
 * Lookup limit factor by limit key
 * @param {string} limitKey - Limit key (e.g., 'CSL_1M', 'CSL_2M')
 * @param {Object} limitTable - Limit factor table
 * @returns {number} Limit factor (default 1.0)
 */
function lookupLimitFactor(limitKey, limitTable) {
    if (!limitTable || typeof limitTable !== 'object') {
        return 1.0;
    }

    try {
        if (!limitKey) {
            return 1.0;
        }

        const normalizedKey = limitKey.trim();

        if (normalizedKey in limitTable) {
            const factor = limitTable[normalizedKey];
            return typeof factor === 'number' && factor > 0 ? factor : 1.0;
        }
    } catch (error) {
        console.warn('Limit factor lookup error:', error);
    }

    return 1.0;
}

/**
 * Lookup state factor
 * @param {string} state - State code
 * @param {Object} stateFactorTable - State factor table
 * @returns {number} State factor (default 1.0)
 */
function lookupStateFactor(state, stateFactorTable) {
    if (!stateFactorTable || typeof stateFactorTable !== 'object') {
        return 1.0;
    }

    try {
        const normalizedState = state.trim().toUpperCase();

        if (normalizedState in stateFactorTable) {
            const factor = stateFactorTable[normalizedState];
            return typeof factor === 'number' && factor > 0 ? factor : 1.0;
        }
    } catch (error) {
        console.warn('State factor lookup error:', error);
    }

    return 1.0;
}

/**
 * Calculate driver attribute factors (age, experience, MVR)
 * @param {Array} drivers - Array of driver objects
 * @param {Object} bands - Attribute band definitions
 * @returns {Array} Drivers with calculated factors
 */
function calculateDriverFactors(drivers, bands) {
    if (!drivers || drivers.length === 0) {
        return [];
    }

    if (!bands) {
        console.warn('No attribute bands provided, using neutral factors');
        return drivers.map(d => ({
            ...d,
            ageFactor: 1.0,
            expFactor: 1.0,
            mvrFactor: 1.0,
            compositeFactor: 1.0
        }));
    }

    return drivers.map(driver => {
        const ageFactor = getAttributeFactor('age', driver.age, bands);
        const expFactor = getAttributeFactor('exp', driver.experience, bands);
        const mvrFactor = getAttributeFactor('mvr', driver.mvrPoints, bands);

        // Composite factor = product of individual factors
        const compositeFactor = ageFactor * expFactor * mvrFactor;

        return {
            ...driver,
            ageFactor,
            expFactor,
            mvrFactor,
            compositeFactor
        };
    });
}

/**
 * Get attribute factor for a value based on band definitions
 * @param {string} attribute - 'age', 'exp', or 'mvr'
 * @param {number} value - Attribute value
 * @param {Object} bands - Band definitions
 * @returns {number} Factor (default 1.0)
 */
function getAttributeFactor(attribute, value, bands) {
    if (!bands || !bands[attribute] || !Array.isArray(bands[attribute])) {
        return 1.0;
    }

    if (typeof value !== 'number' || value < 0 || !isFinite(value)) {
        return 1.0;
    }

    const bandArray = bands[attribute];

    for (const band of bandArray) {
        if (attribute === 'mvr') {
            // MVR uses pointsMin/pointsMax
            if (value >= band.pointsMin && value <= band.pointsMax) {
                const factor = band.factor;
                return typeof factor === 'number' && factor > 0 ? factor : 1.0;
            }
        } else {
            // Age and experience use min/max
            if (value >= band.min && value <= band.max) {
                const factor = band.factor;
                return typeof factor === 'number' && factor > 0 ? factor : 1.0;
            }
        }
    }

    // Value doesn't fall into any band - return neutral factor
    return 1.0;
}

/**
 * Aggregate multiple driver factors using specified method
 * @param {Array} driversWithFactors - Drivers with calculated composite factors
 * @param {string} method - 'mean', 'worst', or 'weighted'
 * @returns {number} Aggregated driver factor
 */
function aggregateDriverFactors(driversWithFactors, method = 'mean') {
    if (!driversWithFactors || driversWithFactors.length === 0) {
        return 1.0;  // Neutral factor if no drivers
    }

    if (driversWithFactors.length === 1) {
        return driversWithFactors[0].compositeFactor;
    }

    const normalizedMethod = method.toLowerCase();

    if (normalizedMethod === 'mean') {
        // Average of all driver composite factors
        const sum = driversWithFactors.reduce((acc, d) => acc + d.compositeFactor, 0);
        return sum / driversWithFactors.length;
    }

    if (normalizedMethod === 'worst') {
        // Highest (worst) composite factor
        return Math.max(...driversWithFactors.map(d => d.compositeFactor));
    }

    if (normalizedMethod === 'weighted') {
        // Primary driver 60%, others 40% split equally
        const primaryFactor = driversWithFactors[0].compositeFactor;
        const primaryWeight = 0.60;

        if (driversWithFactors.length === 1) {
            return primaryFactor;
        }

        const otherFactors = driversWithFactors.slice(1);
        const otherWeight = 0.40 / otherFactors.length;

        const otherSum = otherFactors.reduce((acc, d) => acc + (d.compositeFactor * otherWeight), 0);

        return (primaryFactor * primaryWeight) + otherSum;
    }

    // Default to mean if invalid method
    const sum = driversWithFactors.reduce((acc, d) => acc + d.compositeFactor, 0);
    return sum / driversWithFactors.length;
}

/**
 * Apply minimum premium rules
 * @param {Array} perUnit - Per-unit premium array
 * @param {Object} minPremiums - Minimum premium config { perUnit, perPolicy }
 * @returns {Object} Result with adjusted premiums and subtotal
 */
function applyMinimumPremium(perUnit, minPremiums) {
    const result = {
        perUnit: [...perUnit],
        subtotal: 0,
        minimumApplied: null
    };

    if (!minPremiums) {
        // No minimum premium config - just sum up
        result.subtotal = perUnit.reduce((sum, unit) => sum + unit.premium, 0);
        return result;
    }

    const { perUnit: minPerUnit, perPolicy: minPerPolicy } = minPremiums;

    // Apply per-unit minimum
    if (minPerUnit && typeof minPerUnit === 'number' && minPerUnit > 0) {
        result.perUnit = result.perUnit.map(unit => {
            if (unit.premium < minPerUnit) {
                return { ...unit, premium: minPerUnit, minimumApplied: 'per-unit' };
            }
            return unit;
        });
    }

    // Calculate subtotal
    result.subtotal = result.perUnit.reduce((sum, unit) => sum + unit.premium, 0);

    // Apply per-policy minimum
    if (minPerPolicy && typeof minPerPolicy === 'number' && minPerPolicy > 0) {
        if (result.subtotal < minPerPolicy) {
            result.subtotal = minPerPolicy;
            result.minimumApplied = 'policy';
        }
    }

    // Track if per-unit minimums were applied
    if (!result.minimumApplied && result.perUnit.some(u => u.minimumApplied)) {
        result.minimumApplied = 'per-unit';
    }

    return result;
}

/**
 * Build factor trace object for audit transparency
 * @param {Object} params - Factor trace parameters
 * @returns {Object} Factor trace object
 */
function buildFactorTrace(params) {
    const {
        base_AL,
        bodyClassFactor,
        radiusFactor,
        limitFactor,
        stateFactor,
        driverFactor,
        numVehicles,
        subtotal,
        minimumApplied,
        aggregationMethod,
        driversWithFactors
    } = params;

    // Build calculation formula string
    const formula = `${base_AL} × ${bodyClassFactor} × ${radiusFactor} × ${limitFactor} × ${stateFactor} × ${driverFactor} × ${numVehicles} = ${subtotal}`;

    const trace = {
        base_AL,
        bodyClassFactor,
        radiusFactor,
        limitFactor,
        stateFactor,
        driverFactor: {
            aggregated: driverFactor,
            method: aggregationMethod,
            drivers: driversWithFactors || []
        },
        numVehicles,
        calculation: formula,
        subtotal,
        minimumApplied: minimumApplied || null,
        notes: []
    };

    if (minimumApplied) {
        trace.notes.push(`Minimum premium applied: ${minimumApplied}`);
    }

    return trace;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateALPremium,
        lookupBaseAL,
        lookupBodyClassFactor,
        lookupRadiusFactor,
        lookupLimitFactor,
        lookupStateFactor,
        calculateDriverFactors,
        getAttributeFactor,
        aggregateDriverFactors,
        applyMinimumPremium,
        buildFactorTrace
    };
}
