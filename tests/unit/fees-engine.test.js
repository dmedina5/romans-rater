/**
 * Unit Tests for Fees and Taxes Engine (fees-engine.js)
 * Tasks: T135-T147
 */

describe('Fees and Taxes Engine (fees-engine.js)', function() {

    // T135-T147: Test calculateFeesAndTaxes() main function
    describe('calculateFeesAndTaxes()', function() {

        const mockTaxRules = {
            state: 'AL',
            slt_rate: 0.0485,      // 4.85%
            stamp_rate: 0.002,     // 0.2%
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

        // T136: Build taxable base including only taxable fees
        it('should build taxable base including only taxable fees', function() {
            const input = {
                alSubtotal: 10000,  // $100.00 in cents
                state: 'AL',
                policyType: 'new',
                brokerFee: 5000,     // $50.00
                isAdmitted: false
            };

            const result = calculateFeesAndTaxes(input, mockTaxRules);

            // Taxable base = alSubtotal + policyFee + uwFee (broker not taxable)
            // = 10000 + 250 + 150 = 10400
            expect(result.taxableBase).to.equal(10650);  // AL subtotal + policy fee + UW fee
        });

        // T137: Compute SLT as percentage of taxable base
        it('should compute SLT as percentage of taxable base', function() {
            const input = {
                alSubtotal: 10000,
                state: 'AL',
                policyType: 'new',
                isAdmitted: false
            };

            const result = calculateFeesAndTaxes(input, mockTaxRules);

            // SLT should be 4.85% of taxable base
            expect(result.slt).to.be.above(0);
            expect(result.slt).to.be.closeTo(10650 * 0.0485, 10);
        });

        // T138: Compute stamp as percentage of taxable base
        it('should compute stamp as percentage of taxable base', function() {
            const input = {
                alSubtotal: 10000,
                state: 'AL',
                policyType: 'new',
                isAdmitted: false
            };

            const result = calculateFeesAndTaxes(input, mockTaxRules);

            // Stamp should be 0.2% of taxable base
            expect(result.stamp).to.be.above(0);
            expect(result.stamp).to.be.closeTo(10650 * 0.002, 5);
        });

        // T139: Apply fire fee as flat or percentage
        it('should apply fire fee as flat value', function() {
            const input = {
                alSubtotal: 10000,
                state: 'AL',
                policyType: 'new',
                isAdmitted: false
            };

            const result = calculateFeesAndTaxes(input, mockTaxRules);
            expect(result.fire).to.equal(50);  // Flat $50
        });

        it('should apply fire fee as percentage', function() {
            const percentageRules = {
                ...mockTaxRules,
                fire: { type: 'percentage', value: 0.01 }  // 1%
            };

            const input = {
                alSubtotal: 10000,
                state: 'AL',
                policyType: 'new',
                isAdmitted: false
            };

            const result = calculateFeesAndTaxes(input, percentageRules);
            expect(result.fire).to.be.closeTo(10650 * 0.01, 5);
        });

        // T140: Zero SLT and stamp for admitted policies
        it('should zero SLT and stamp for admitted policies', function() {
            const input = {
                alSubtotal: 10000,
                state: 'AL',
                policyType: 'new',
                isAdmitted: true  // Admitted
            };

            const result = calculateFeesAndTaxes(input, mockTaxRules);
            expect(result.slt).to.equal(0);
            expect(result.stamp).to.equal(0);
        });

        // T141: Apply UW fee based on policy type (new vs renewal)
        it('should apply new business UW fee for new policies', function() {
            const input = {
                alSubtotal: 10000,
                state: 'AL',
                policyType: 'new',
                isAdmitted: false
            };

            const result = calculateFeesAndTaxes(input, mockTaxRules);
            expect(result.uwFee).to.equal(150);
        });

        it('should apply renewal UW fee for renewal policies', function() {
            const input = {
                alSubtotal: 10000,
                state: 'AL',
                policyType: 'renewal',
                isAdmitted: false
            };

            const result = calculateFeesAndTaxes(input, mockTaxRules);
            expect(result.uwFee).to.equal(100);
        });

        // T142: Apply NJ-specific policy fee
        it('should apply NJ-specific policy fee', function() {
            const njRules = {
                ...mockTaxRules,
                state: 'NJ'
            };

            const input = {
                alSubtotal: 10000,
                state: 'NJ',
                policyType: 'new',
                isAdmitted: false
            };

            const result = calculateFeesAndTaxes(input, njRules);
            expect(result.policyFee).to.equal(275);  // NJ special fee
        });

        // T143: Allow broker fee override
        it('should use broker fee override if provided', function() {
            const input = {
                alSubtotal: 10000,
                state: 'AL',
                policyType: 'new',
                brokerFee: 7500,  // Override to $75.00
                isAdmitted: false
            };

            const result = calculateFeesAndTaxes(input, mockTaxRules);
            expect(result.brokerFee).to.equal(7500);
        });

        it('should default broker fee to 0 if not provided', function() {
            const input = {
                alSubtotal: 10000,
                state: 'AL',
                policyType: 'new',
                isAdmitted: false
            };

            const result = calculateFeesAndTaxes(input, mockTaxRules);
            expect(result.brokerFee).to.equal(0);
        });

        // T144: Round all fees to 2 decimals
        it('should round all fees to cents (whole numbers)', function() {
            const input = {
                alSubtotal: 10333,  // Odd number to force rounding
                state: 'AL',
                policyType: 'new',
                isAdmitted: false
            };

            const result = calculateFeesAndTaxes(input, mockTaxRules);

            // All values should be integers (cents)
            expect(result.slt % 1).to.equal(0);
            expect(result.stamp % 1).to.equal(0);
            expect(result.fire % 1).to.equal(0);
            expect(result.total % 1).to.equal(0);
        });

        // T145: Calculate total premium
        it('should calculate total premium correctly', function() {
            const input = {
                alSubtotal: 10000,
                state: 'AL',
                policyType: 'new',
                brokerFee: 5000,
                isAdmitted: false
            };

            const result = calculateFeesAndTaxes(input, mockTaxRules);

            // Total = AL + policy + UW + broker + SLT + stamp + fire + other
            const expectedTotal =
                result.alSubtotal +
                result.policyFee +
                result.uwFee +
                result.brokerFee +
                result.slt +
                result.stamp +
                result.fire +
                result.other;

            expect(result.total).to.equal(expectedTotal);
        });

        // T146: Build fee breakdown object
        it('should build complete fee breakdown object', function() {
            const input = {
                alSubtotal: 10000,
                state: 'AL',
                policyType: 'new',
                isAdmitted: false
            };

            const result = calculateFeesAndTaxes(input, mockTaxRules);

            expect(result).to.have.property('alSubtotal');
            expect(result).to.have.property('policyFee');
            expect(result).to.have.property('uwFee');
            expect(result).to.have.property('brokerFee');
            expect(result).to.have.property('taxableBase');
            expect(result).to.have.property('slt');
            expect(result).to.have.property('stamp');
            expect(result).to.have.property('fire');
            expect(result).to.have.property('other');
            expect(result).to.have.property('total');
            expect(result).to.have.property('breakdown');
        });

        // T147: Handle missing tax rules gracefully
        it('should handle missing tax rules gracefully', function() {
            const input = {
                alSubtotal: 10000,
                state: 'XX',
                policyType: 'new',
                isAdmitted: false
            };

            const result = calculateFeesAndTaxes(input, null);

            // Should return default values
            expect(result.slt).to.equal(0);
            expect(result.stamp).to.equal(0);
            expect(result.fire).to.equal(0);
            expect(result.errors).to.have.lengthOf.at.least(1);
        });
    });

    // Additional helper function tests
    describe('Helper Functions', function() {

        it('calculateTaxableBase() should sum only taxable components', function() {
            const components = {
                alSubtotal: 10000,
                policyFee: 250,
                uwFee: 150,
                brokerFee: 5000
            };

            const taxable = {
                policy: true,
                uw: true,
                broker: false
            };

            const base = calculateTaxableBase(components, taxable);
            expect(base).to.equal(10400);  // AL + policy + UW (not broker)
        });

        it('applyPercentageFee() should calculate percentage correctly', function() {
            const result = applyPercentageFee(10000, 0.05);
            expect(result).to.equal(500);  // 5% of 10000
        });

        it('applyFlatFee() should return flat value', function() {
            const result = applyFlatFee(50);
            expect(result).to.equal(50);
        });

        it('roundToCents() should round to nearest cent', function() {
            expect(roundToCents(123.456)).to.equal(123);
            expect(roundToCents(123.567)).to.equal(124);
            expect(roundToCents(123.5)).to.equal(124);  // Banker's rounding
        });
    });

    // Edge cases
    describe('Edge Cases', function() {

        it('should handle zero AL subtotal', function() {
            const input = {
                alSubtotal: 0,
                state: 'AL',
                policyType: 'new',
                isAdmitted: false
            };

            const mockRules = {
                state: 'AL',
                slt_rate: 0.05,
                stamp_rate: 0.002,
                fire: { type: 'flat', value: 50 },
                other: { type: 'flat', value: 0 },
                taxable: { policy: true, uw: true, broker: false },
                uwPolicyFees: { policyFeeStd: 250, uwFeeNew: 150, uwFeeRen: 100 }
            };

            const result = calculateFeesAndTaxes(input, mockRules);
            expect(result.total).to.be.above(0);  // Still has fees
        });

        it('should handle negative broker fee override', function() {
            const input = {
                alSubtotal: 10000,
                state: 'AL',
                policyType: 'new',
                brokerFee: -1000,
                isAdmitted: false
            };

            const mockRules = {
                state: 'AL',
                slt_rate: 0.05,
                stamp_rate: 0.002,
                fire: { type: 'flat', value: 50 },
                other: { type: 'flat', value: 0 },
                taxable: { policy: true, uw: true, broker: false },
                uwPolicyFees: { policyFeeStd: 250, uwFeeNew: 150, uwFeeRen: 100 }
            };

            const result = calculateFeesAndTaxes(input, mockRules);
            expect(result.brokerFee).to.equal(0);  // Should clamp to 0
        });

        it('should handle invalid policy type', function() {
            const input = {
                alSubtotal: 10000,
                state: 'AL',
                policyType: 'invalid',
                isAdmitted: false
            };

            const mockRules = {
                state: 'AL',
                slt_rate: 0.05,
                stamp_rate: 0.002,
                fire: { type: 'flat', value: 50 },
                other: { type: 'flat', value: 0 },
                taxable: { policy: true, uw: true, broker: false },
                uwPolicyFees: { policyFeeStd: 250, uwFeeNew: 150, uwFeeRen: 100 }
            };

            const result = calculateFeesAndTaxes(input, mockRules);
            expect(result.uwFee).to.equal(150);  // Default to new
        });
    });
});
