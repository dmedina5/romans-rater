/**
 * Unit Tests for AL Rating Engine (al-engine.js)
 * Tasks: T095-T102
 */

describe('AL Rating Engine (al-engine.js)', function() {

    // T095: Test calculateALPremium() main orchestrator
    describe('calculateALPremium()', function() {

        const mockPolicy = {
            policy: { state: 'AL', limit: 'CSL_1M', radius: '0-50' },
            vehicles: [
                { vin: 'VIN123', bodyType: 'Tractor', class: '8', businessClass: 'GENERAL FREIGHT' }
            ],
            drivers: [
                { name: 'Driver 1', age: 35, experience: 10, mvrPoints: 2 }
            ]
        };

        const mockTable = {
            program: 'CW',
            bodyClass: {
                AL: {
                    Tractor: {
                        '8': {
                            'GENERAL FREIGHT': 1.25
                        }
                    }
                }
            },
            radius: { AL: { '0-50': 0.95 } },
            limit: { 'CSL_1M': 1.0 },
            stateFactor: { AL: 1.1 },
            base_AL: { AL: 1000 }
        };

        const mockBands = {
            age: [{ min: 30, max: 39, factor: 1.00 }],
            exp: [{ min: 10, max: 15, factor: 0.90 }],
            mvr: [{ pointsMin: 1, pointsMax: 2, factor: 1.00 }]
        };

        const mockOptions = {
            aggregation: 'mean'
        };

        it('should calculate AL premium successfully', function() {
            const result = calculateALPremium(mockPolicy, mockTable, mockBands, mockOptions);
            expect(result).to.have.property('subtotal');
            expect(result).to.have.property('factorTrace');
            expect(result).to.have.property('perUnit');
            expect(result.subtotal).to.be.a('number');
            expect(result.subtotal).to.be.above(0);
        });

        it('should include factor trace for auditability', function() {
            const result = calculateALPremium(mockPolicy, mockTable, mockBands, mockOptions);
            expect(result.factorTrace).to.have.property('base_AL');
            expect(result.factorTrace).to.have.property('bodyClassFactor');
            expect(result.factorTrace).to.have.property('radiusFactor');
            expect(result.factorTrace).to.have.property('limitFactor');
            expect(result.factorTrace).to.have.property('stateFactor');
            expect(result.factorTrace).to.have.property('driverFactor');
        });

        it('should calculate per-unit breakdown', function() {
            const result = calculateALPremium(mockPolicy, mockTable, mockBands, mockOptions);
            expect(result.perUnit).to.be.an('array');
            expect(result.perUnit).to.have.lengthOf(1);
            expect(result.perUnit[0]).to.have.property('vin');
            expect(result.perUnit[0]).to.have.property('premium');
        });

        it('should apply minimum premium if below threshold', function() {
            const mockTableWithMin = {
                ...mockTable,
                minPremiums: { AL: { perUnit: 500, perPolicy: 1000 } }
            };

            // Create scenario where calculated premium is below minimum
            const lowPremiumTable = {
                ...mockTableWithMin,
                base_AL: { AL: 100 }  // Very low base
            };

            const result = calculateALPremium(mockPolicy, lowPremiumTable, mockBands, mockOptions);
            expect(result.subtotal).to.be.at.least(1000);  // Should apply perPolicy minimum
        });

        it('should handle multiple vehicles', function() {
            const multiVehiclePolicy = {
                ...mockPolicy,
                vehicles: [
                    { vin: 'VIN123', bodyType: 'Tractor', class: '8', businessClass: 'GENERAL FREIGHT' },
                    { vin: 'VIN456', bodyType: 'Trailer', class: '4', businessClass: 'GENERAL FREIGHT' }
                ]
            };

            const result = calculateALPremium(multiVehiclePolicy, mockTable, mockBands, mockOptions);
            expect(result.perUnit).to.have.lengthOf(2);
            expect(result.subtotal).to.be.above(0);
        });
    });

    // T096: Test lookupBodyClassFactor() with nested path
    describe('lookupBodyClassFactor()', function() {

        const mockBodyClass = {
            AL: {
                Tractor: {
                    '8': {
                        'GENERAL FREIGHT': 1.25,
                        'TANKER': 1.50
                    }
                },
                Trailer: {
                    '4': {
                        'GENERAL FREIGHT': 0.80
                    }
                }
            }
        };

        it('should lookup factor for exact match', function() {
            const factor = lookupBodyClassFactor('AL', 'Tractor', '8', 'GENERAL FREIGHT', mockBodyClass);
            expect(factor).to.equal(1.25);
        });

        it('should return default 1.0 for missing businessClass', function() {
            const factor = lookupBodyClassFactor('AL', 'Tractor', '8', 'UNKNOWN', mockBodyClass);
            expect(factor).to.equal(1.0);
        });

        it('should return default for missing state', function() {
            const factor = lookupBodyClassFactor('XX', 'Tractor', '8', 'GENERAL FREIGHT', mockBodyClass);
            expect(factor).to.equal(1.0);
        });

        it('should handle case-insensitive bodyType', function() {
            const factor = lookupBodyClassFactor('AL', 'tractor', '8', 'GENERAL FREIGHT', mockBodyClass);
            expect(factor).to.equal(1.25);
        });

        it('should handle different business class', function() {
            const factor = lookupBodyClassFactor('AL', 'Tractor', '8', 'TANKER', mockBodyClass);
            expect(factor).to.equal(1.50);
        });
    });

    // T097: Test lookupRadiusFactor()
    describe('lookupRadiusFactor()', function() {

        const mockRadius = {
            AL: {
                '0-50': 0.95,
                '51-200': 1.00,
                '201-500': 1.10,
                '500+': 1.25
            }
        };

        it('should lookup radius factor for state and bucket', function() {
            const factor = lookupRadiusFactor('AL', '0-50', mockRadius);
            expect(factor).to.equal(0.95);
        });

        it('should handle different radius buckets', function() {
            expect(lookupRadiusFactor('AL', '51-200', mockRadius)).to.equal(1.00);
            expect(lookupRadiusFactor('AL', '201-500', mockRadius)).to.equal(1.10);
            expect(lookupRadiusFactor('AL', '500+', mockRadius)).to.equal(1.25);
        });

        it('should return default 1.0 for missing state', function() {
            const factor = lookupRadiusFactor('XX', '0-50', mockRadius);
            expect(factor).to.equal(1.0);
        });

        it('should return default for missing bucket', function() {
            const factor = lookupRadiusFactor('AL', 'INVALID', mockRadius);
            expect(factor).to.equal(1.0);
        });
    });

    // T098: Test lookupLimitFactor()
    describe('lookupLimitFactor()', function() {

        const mockLimit = {
            'CSL_1M': 1.0,
            'CSL_2M': 1.35,
            '1M_2M': 1.20
        };

        it('should lookup limit factor by key', function() {
            expect(lookupLimitFactor('CSL_1M', mockLimit)).to.equal(1.0);
            expect(lookupLimitFactor('CSL_2M', mockLimit)).to.equal(1.35);
            expect(lookupLimitFactor('1M_2M', mockLimit)).to.equal(1.20);
        });

        it('should return default 1.0 for missing limit', function() {
            const factor = lookupLimitFactor('UNKNOWN', mockLimit);
            expect(factor).to.equal(1.0);
        });

        it('should handle null or undefined limit table', function() {
            const factor = lookupLimitFactor('CSL_1M', null);
            expect(factor).to.equal(1.0);
        });
    });

    // T099: Test getAttributeFactor() for age/exp/MVR bands
    describe('getAttributeFactor()', function() {

        const mockBands = {
            age: [
                { min: 18, max: 24, factor: 1.50 },
                { min: 25, max: 29, factor: 1.20 },
                { min: 30, max: 39, factor: 1.00 },
                { min: 40, max: 49, factor: 0.95 }
            ],
            exp: [
                { min: 0, max: 2, factor: 1.50 },
                { min: 3, max: 5, factor: 1.20 },
                { min: 6, max: 9, factor: 1.00 },
                { min: 10, max: 15, factor: 0.90 }
            ],
            mvr: [
                { pointsMin: 0, pointsMax: 0, factor: 0.90 },
                { pointsMin: 1, pointsMax: 2, factor: 1.00 },
                { pointsMin: 3, pointsMax: 5, factor: 1.15 },
                { pointsMin: 6, pointsMax: 10, factor: 1.35 }
            ]
        };

        it('should get age factor for driver age 35', function() {
            const factor = getAttributeFactor('age', 35, mockBands);
            expect(factor).to.equal(1.00);
        });

        it('should get age factor for driver age 22', function() {
            const factor = getAttributeFactor('age', 22, mockBands);
            expect(factor).to.equal(1.50);
        });

        it('should get experience factor for 8 years', function() {
            const factor = getAttributeFactor('exp', 8, mockBands);
            expect(factor).to.equal(1.00);
        });

        it('should get MVR factor for 1 point', function() {
            const factor = getAttributeFactor('mvr', 1, mockBands);
            expect(factor).to.equal(1.00);
        });

        it('should return 1.0 if value is out of all bands', function() {
            const factor = getAttributeFactor('age', 150, mockBands);
            expect(factor).to.equal(1.0);
        });

        it('should handle boundary values correctly', function() {
            expect(getAttributeFactor('age', 24, mockBands)).to.equal(1.50);  // Upper bound
            expect(getAttributeFactor('age', 25, mockBands)).to.equal(1.20);  // Lower bound next bracket
        });
    });

    // T100: Test aggregateDriverFactors() with different methods
    describe('aggregateDriverFactors()', function() {

        const drivers = [
            { name: 'Driver 1', ageFactor: 1.00, expFactor: 0.90, mvrFactor: 1.00, compositeFactor: 0.90 },
            { name: 'Driver 2', ageFactor: 1.20, expFactor: 1.20, mvrFactor: 1.15, compositeFactor: 1.66 },
            { name: 'Driver 3', ageFactor: 0.95, expFactor: 0.85, mvrFactor: 0.90, compositeFactor: 0.73 }
        ];

        it('should aggregate using mean method', function() {
            const result = aggregateDriverFactors(drivers, 'mean');
            expect(result).to.be.closeTo((0.90 + 1.66 + 0.73) / 3, 0.01);
        });

        it('should aggregate using worst method', function() {
            const result = aggregateDriverFactors(drivers, 'worst');
            expect(result).to.equal(1.66);  // Highest composite factor
        });

        it('should aggregate using weighted method (primary 60%, others 40%)', function() {
            // Primary (Driver 1): 60% weight
            // Others (Driver 2, 3): 40% weight split equally (20% each)
            const expected = (0.90 * 0.60) + (1.66 * 0.20) + (0.73 * 0.20);
            const result = aggregateDriverFactors(drivers, 'weighted');
            expect(result).to.be.closeTo(expected, 0.01);
        });

        it('should default to mean if invalid method', function() {
            const result = aggregateDriverFactors(drivers, 'invalid');
            const expected = (0.90 + 1.66 + 0.73) / 3;
            expect(result).to.be.closeTo(expected, 0.01);
        });

        it('should handle single driver', function() {
            const singleDriver = [drivers[0]];
            const result = aggregateDriverFactors(singleDriver, 'mean');
            expect(result).to.equal(0.90);
        });

        it('should handle empty driver array', function() {
            const result = aggregateDriverFactors([], 'mean');
            expect(result).to.equal(1.0);  // Default neutral factor
        });
    });

    // T101: Test applyMinimumPremium()
    describe('applyMinimumPremium()', function() {

        const mockMinPremiums = {
            perUnit: 250,
            perPolicy: 1000
        };

        it('should apply per-unit minimum if below threshold', function() {
            const perUnit = [
                { vin: 'VIN123', premium: 200 },  // Below perUnit minimum
                { vin: 'VIN456', premium: 300 }   // Above perUnit minimum
            ];

            const result = applyMinimumPremium(perUnit, mockMinPremiums);
            expect(result.perUnit[0].premium).to.equal(250);  // Bumped to minimum
            expect(result.perUnit[1].premium).to.equal(300);  // Unchanged
            expect(result.subtotal).to.equal(550);
        });

        it('should apply per-policy minimum if total below threshold', function() {
            const perUnit = [
                { vin: 'VIN123', premium: 300 },
                { vin: 'VIN456', premium: 400 }
            ];
            // Total = 700, below perPolicy minimum of 1000

            const result = applyMinimumPremium(perUnit, mockMinPremiums);
            expect(result.subtotal).to.equal(1000);  // Bumped to policy minimum
            expect(result.minimumApplied).to.equal('policy');
        });

        it('should not apply minimum if all above thresholds', function() {
            const perUnit = [
                { vin: 'VIN123', premium: 600 },
                { vin: 'VIN456', premium: 500 }
            ];
            // Total = 1100, above perPolicy minimum

            const result = applyMinimumPremium(perUnit, mockMinPremiums);
            expect(result.subtotal).to.equal(1100);
            expect(result.minimumApplied).to.be.null;
        });

        it('should handle missing minimum config', function() {
            const perUnit = [{ vin: 'VIN123', premium: 100 }];
            const result = applyMinimumPremium(perUnit, null);
            expect(result.subtotal).to.equal(100);  // No minimum applied
        });
    });

    // T102: Test buildFactorTrace() for audit transparency
    describe('buildFactorTrace()', function() {

        it('should build complete factor trace object', function() {
            const trace = buildFactorTrace({
                base_AL: 1000,
                bodyClassFactor: 1.25,
                radiusFactor: 0.95,
                limitFactor: 1.0,
                stateFactor: 1.1,
                driverFactor: 1.05,
                numVehicles: 2,
                subtotal: 2887,
                minimumApplied: null
            });

            expect(trace).to.have.property('base_AL', 1000);
            expect(trace).to.have.property('bodyClassFactor', 1.25);
            expect(trace).to.have.property('radiusFactor', 0.95);
            expect(trace).to.have.property('limitFactor', 1.0);
            expect(trace).to.have.property('stateFactor', 1.1);
            expect(trace).to.have.property('driverFactor', 1.05);
            expect(trace).to.have.property('calculation');
            expect(trace.calculation).to.include('1000 * 1.25 * 0.95 * 1.0 * 1.1 * 1.05 * 2');
        });

        it('should format calculation formula as string', function() {
            const trace = buildFactorTrace({
                base_AL: 1000,
                bodyClassFactor: 1.25,
                radiusFactor: 1.0,
                limitFactor: 1.0,
                stateFactor: 1.0,
                driverFactor: 1.0,
                numVehicles: 1,
                subtotal: 1250
            });

            expect(trace.calculation).to.be.a('string');
            expect(trace.calculation).to.include('=');
        });

        it('should include minimum premium note if applied', function() {
            const trace = buildFactorTrace({
                base_AL: 500,
                bodyClassFactor: 1.0,
                radiusFactor: 1.0,
                limitFactor: 1.0,
                stateFactor: 1.0,
                driverFactor: 1.0,
                numVehicles: 1,
                subtotal: 1000,
                minimumApplied: 'policy'
            });

            expect(trace.minimumApplied).to.equal('policy');
            expect(trace.notes).to.include('minimum');
        });
    });

    // Edge cases and error handling
    describe('Edge Cases and Error Handling', function() {

        it('should handle missing vehicle data gracefully', function() {
            const invalidPolicy = {
                policy: { state: 'AL', limit: 'CSL_1M', radius: '0-50' },
                vehicles: [],
                drivers: []
            };

            const mockTable = { base_AL: { AL: 1000 }, bodyClass: {} };
            const mockBands = { age: [], exp: [], mvr: [] };

            const result = calculateALPremium(invalidPolicy, mockTable, mockBands, {});
            expect(result).to.have.property('error');
        });

        it('should handle null or undefined factors', function() {
            const factor = lookupBodyClassFactor('AL', 'Tractor', '8', 'FREIGHT', null);
            expect(factor).to.equal(1.0);
        });

        it('should validate numeric factors', function() {
            const invalidBands = {
                age: [{ min: 30, max: 39, factor: 'invalid' }]
            };
            const factor = getAttributeFactor('age', 35, invalidBands);
            expect(factor).to.equal(1.0);  // Default for invalid
        });

        it('should handle negative ages gracefully', function() {
            const mockBands = {
                age: [{ min: 18, max: 24, factor: 1.50 }]
            };
            const factor = getAttributeFactor('age', -5, mockBands);
            expect(factor).to.equal(1.0);
        });
    });
});
