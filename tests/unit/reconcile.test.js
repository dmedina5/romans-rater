/**
 * Unit Tests for Reconciliation Engine (reconcile.js)
 * Tasks: T168-T177
 */

describe('Reconciliation Engine (reconcile.js)', function() {

    // T168-T177: Test reconcileTotals() main function
    describe('reconcileTotals()', function() {

        // T168: Compare computed vs PDF totals
        it('should compare computed vs PDF totals', function() {
            const computed = {
                alSubtotal: 10000,
                fees: 400,
                taxes: 600,
                total: 11000
            };

            const pdfExtracted = {
                alSubtotal: 10000,
                fees: 400,
                taxes: 600,
                total: 11000
            };

            const result = reconcileTotals(computed, pdfExtracted);

            expect(result.delta.total).to.equal(0);
            expect(result.status).to.equal('PASS');
        });

        // T169: Calculate deltas for each component
        it('should calculate deltas for each component', function() {
            const computed = {
                alSubtotal: 10000,
                policyFee: 250,
                uwFee: 150,
                brokerFee: 0,
                slt: 500,
                stamp: 20,
                fire: 50,
                other: 0,
                total: 10970
            };

            const pdfExtracted = {
                alSubtotal: 10050,
                policyFee: 250,
                uwFee: 150,
                brokerFee: 50,
                slt: 520,
                stamp: 20,
                fire: 50,
                other: 0,
                total: 11090
            };

            const result = reconcileTotals(computed, pdfExtracted);

            expect(result.delta.alSubtotal).to.equal(-50);  // Computed - PDF
            expect(result.delta.brokerFee).to.equal(-50);
            expect(result.delta.slt).to.equal(-20);
            expect(result.delta.total).to.equal(-120);
        });

        // T170: Apply tolerance threshold (±$5.00 default)
        it('should apply tolerance threshold', function() {
            const computed = { total: 10000 };
            const pdfExtracted = { total: 10003 };  // $0.03 difference

            const result = reconcileTotals(computed, pdfExtracted, { tolerance: 500 });  // $5.00 tolerance

            expect(result.status).to.equal('PASS');
            expect(Math.abs(result.delta.total)).to.be.below(500);
        });

        it('should fail when outside tolerance', function() {
            const computed = { total: 10000 };
            const pdfExtracted = { total: 10700 };  // $7.00 difference

            const result = reconcileTotals(computed, pdfExtracted, { tolerance: 500 });  // $5.00 tolerance

            expect(result.status).to.equal('FAIL');
            expect(Math.abs(result.delta.total)).to.be.above(500);
        });

        // T171: Return PASS/WARN/FAIL status
        it('should return PASS when within tolerance', function() {
            const computed = { total: 10000 };
            const pdfExtracted = { total: 10000 };

            const result = reconcileTotals(computed, pdfExtracted);
            expect(result.status).to.equal('PASS');
        });

        it('should return WARN for component discrepancies', function() {
            const computed = {
                alSubtotal: 10000,
                fees: 400,
                taxes: 600,
                total: 11000
            };

            const pdfExtracted = {
                alSubtotal: 10100,  // Different AL subtotal
                fees: 400,
                taxes: 500,         // Different taxes
                total: 11000        // But total matches
            };

            const result = reconcileTotals(computed, pdfExtracted);
            expect(result.status).to.equal('WARN');
            expect(result.componentMismatches).to.be.above(0);
        });

        it('should return FAIL when total outside tolerance', function() {
            const computed = { total: 10000 };
            const pdfExtracted = { total: 11000 };

            const result = reconcileTotals(computed, pdfExtracted, { tolerance: 500 });
            expect(result.status).to.equal('FAIL');
        });

        // T172: Build component breakdown
        it('should build component breakdown', function() {
            const computed = {
                alSubtotal: 10000,
                policyFee: 250,
                uwFee: 150
            };

            const pdfExtracted = {
                alSubtotal: 10100,
                policyFee: 250,
                uwFee: 150
            };

            const result = reconcileTotals(computed, pdfExtracted);

            expect(result.breakdown).to.be.an('array');
            expect(result.breakdown.length).to.be.above(0);

            const alBreakdown = result.breakdown.find(b => b.component === 'alSubtotal');
            expect(alBreakdown).to.exist;
            expect(alBreakdown.computed).to.equal(10000);
            expect(alBreakdown.pdf).to.equal(10100);
            expect(alBreakdown.delta).to.equal(-100);
        });

        // T173: Calculate percentage difference
        it('should calculate percentage difference', function() {
            const computed = { total: 10000 };
            const pdfExtracted = { total: 10500 };  // 5% difference

            const result = reconcileTotals(computed, pdfExtracted);

            expect(result.percentDiff).to.be.closeTo(5.0, 0.1);
        });

        // T174: Handle missing PDF values
        it('should handle missing PDF values', function() {
            const computed = {
                alSubtotal: 10000,
                fees: 400,
                total: 10400
            };

            const pdfExtracted = null;

            const result = reconcileTotals(computed, pdfExtracted);

            expect(result.status).to.equal('NO_PDF_DATA');
            expect(result.warnings).to.have.lengthOf.at.least(1);
        });

        it('should handle partial PDF values', function() {
            const computed = {
                alSubtotal: 10000,
                fees: 400,
                total: 10400
            };

            const pdfExtracted = {
                total: 10400
                // Missing component-level data
            };

            const result = reconcileTotals(computed, pdfExtracted);

            expect(result.status).to.be.oneOf(['PASS', 'WARN']);
        });

        // T175: Generate discrepancy report
        it('should generate discrepancy report', function() {
            const computed = {
                alSubtotal: 10000,
                policyFee: 250,
                uwFee: 150,
                total: 10400
            };

            const pdfExtracted = {
                alSubtotal: 10100,
                policyFee: 250,
                uwFee: 200,  // Discrepancy
                total: 10550
            };

            const result = reconcileTotals(computed, pdfExtracted);

            expect(result.discrepancies).to.be.an('array');
            expect(result.discrepancies.length).to.be.above(0);

            const uwDiscrepancy = result.discrepancies.find(d => d.component === 'uwFee');
            expect(uwDiscrepancy).to.exist;
            expect(uwDiscrepancy.delta).to.equal(-50);
        });

        // T176: Validate both inputs are numeric
        it('should validate inputs are numeric', function() {
            const computed = { total: 'invalid' };
            const pdfExtracted = { total: 10000 };

            const result = reconcileTotals(computed, pdfExtracted);

            expect(result.errors).to.have.lengthOf.at.least(1);
            expect(result.status).to.equal('ERROR');
        });

        // T177: Return reconciliation object
        it('should return complete reconciliation object', function() {
            const computed = {
                alSubtotal: 10000,
                fees: 400,
                taxes: 600,
                total: 11000
            };

            const pdfExtracted = {
                alSubtotal: 10000,
                fees: 400,
                taxes: 600,
                total: 11000
            };

            const result = reconcileTotals(computed, pdfExtracted);

            expect(result).to.have.property('status');
            expect(result).to.have.property('delta');
            expect(result).to.have.property('computed');
            expect(result).to.have.property('pdf');
            expect(result).to.have.property('breakdown');
            expect(result).to.have.property('tolerance');
            expect(result).to.have.property('percentDiff');
        });
    });

    // Helper function tests
    describe('Helper Functions', function() {

        it('calculateDelta() should compute difference correctly', function() {
            const delta = calculateDelta(10000, 10500);
            expect(delta).to.equal(-500);  // Computed - PDF
        });

        it('isWithinTolerance() should check tolerance', function() {
            expect(isWithinTolerance(100, 500)).to.be.true;
            expect(isWithinTolerance(600, 500)).to.be.false;
        });

        it('calculatePercentDiff() should compute percentage', function() {
            const pct = calculatePercentDiff(10000, 10500);
            expect(pct).to.be.closeTo(5.0, 0.01);
        });

        it('buildComponentBreakdown() should create breakdown array', function() {
            const computed = { alSubtotal: 10000, fees: 400 };
            const pdf = { alSubtotal: 10100, fees: 400 };

            const breakdown = buildComponentBreakdown(computed, pdf);

            expect(breakdown).to.be.an('array');
            expect(breakdown.length).to.equal(2);
        });
    });

    // Edge cases
    describe('Edge Cases', function() {

        it('should handle zero values', function() {
            const computed = { total: 0 };
            const pdfExtracted = { total: 0 };

            const result = reconcileTotals(computed, pdfExtracted);
            expect(result.status).to.equal('PASS');
        });

        it('should handle large discrepancies', function() {
            const computed = { total: 10000 };
            const pdfExtracted = { total: 50000 };

            const result = reconcileTotals(computed, pdfExtracted);
            expect(result.status).to.equal('FAIL');
            expect(result.percentDiff).to.be.above(100);
        });

        it('should handle negative values', function() {
            const computed = { total: -1000 };
            const pdfExtracted = { total: 1000 };

            const result = reconcileTotals(computed, pdfExtracted);
            expect(result.status).to.be.oneOf(['FAIL', 'ERROR']);
        });

        it('should handle NaN values', function() {
            const computed = { total: NaN };
            const pdfExtracted = { total: 10000 };

            const result = reconcileTotals(computed, pdfExtracted);
            expect(result.errors.length).to.be.above(0);
        });
    });
});
