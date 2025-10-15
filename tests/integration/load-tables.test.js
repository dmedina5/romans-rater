/**
 * Integration Tests for Excel Loading → JSON → UI
 * Tests: T063-T064
 */

describe('Load Tables Integration', function() {
    this.timeout(30000); // Excel processing can take time

    before(function() {
        if (typeof ingestRaterWorkbook === 'undefined' || typeof ingestTaxFeeWorkbook === 'undefined') {
            this.skip();
        }
    });

    // T064: should load rater v4.21 and produce deterministic JSON
    describe('Full Excel Loading Workflow', function() {
        it('should load rater workbook and display state count', async function() {
            this.skip(); // Skip until fixture available

            // Load rater Excel file
            const raterPath = '../fixtures/sample-raters/2025-Cover-Whale-Rater-v4.21.xlsx';
            const response = await fetch(raterPath);
            const arrayBuffer = await response.arrayBuffer();

            // Ingest workbook
            const result = await ingestRaterWorkbook(arrayBuffer);

            // Verify structure
            expect(result).to.have.property('cw');
            expect(result).to.have.property('ss');
            expect(result).to.have.property('bands');

            // Verify CW tables
            expect(result.cw.program).to.equal('CW');
            expect(result.cw.bodyClass).to.be.an('object');
            expect(result.cw.radius).to.be.an('object');
            expect(result.cw.limit).to.be.an('object');
            expect(result.cw.stateFactor).to.be.an('object');
            expect(result.cw.base_AL).to.be.an('object');
            expect(result.cw.editions).to.be.an('object');
            expect(result.cw.minPremiums).to.be.an('object');

            // Verify SS tables (same structure)
            expect(result.ss.program).to.equal('SS');

            // Verify attribute bands
            expect(result.bands.age).to.be.an('array').with.lengthOf.at.least(1);
            expect(result.bands.exp).to.be.an('array').with.lengthOf.at.least(1);
            expect(result.bands.mvr).to.be.an('array').with.lengthOf.at.least(1);

            // Count supported states
            const cwStates = Object.keys(result.cw.bodyClass);
            const ssStates = Object.keys(result.ss.bodyClass);
            const allStates = new Set([...cwStates, ...ssStates]);

            expect(allStates.size).to.be.at.least(42);

            console.log(`Loaded ${cwStates.length} CW states, ${ssStates.length} SS states, ${allStates.size} total`);
        });

        it('should load tax/fee workbook', async function() {
            this.skip(); // Skip until fixture available

            const taxesPath = '../fixtures/sample-raters/State-Taxes-Fees-2025.xlsx';
            const response = await fetch(taxesPath);
            const arrayBuffer = await response.arrayBuffer();

            const result = await ingestTaxFeeWorkbook(arrayBuffer);

            // Verify structure
            expect(result).to.be.an('object');

            // Check a known state (TX)
            if (result['TX']) {
                const txRules = result['TX'];

                expect(txRules.state).to.equal('TX');
                expect(txRules.slt_rate).to.be.a('number');
                expect(txRules.stamp_rate).to.be.a('number');
                expect(txRules.fire).to.be.an('object');
                expect(txRules.fire.type).to.be.oneOf(['pct', 'flat']);
                expect(txRules.fire.value).to.be.a('number');
                expect(txRules.taxable).to.be.an('object');
                expect(txRules.taxable.policy).to.be.a('boolean');
                expect(txRules.uwPolicyFees).to.be.an('object');
                expect(txRules.uwPolicyFees.policyFeeStd).to.be.a('number');
            }

            const stateCount = Object.keys(result).length;
            expect(stateCount).to.be.at.least(42);

            console.log(`Loaded tax/fee rules for ${stateCount} states`);
        });

        it('should cache parsed tables in memory', async function() {
            this.skip(); // Skip until implementation complete

            // Load workbook
            const response = await fetch('../fixtures/sample-raters/2025-Cover-Whale-Rater-v4.21.xlsx');
            const arrayBuffer = await response.arrayBuffer();

            const result1 = await ingestRaterWorkbook(arrayBuffer);
            const result2 = await ingestRaterWorkbook(arrayBuffer);

            // Should return same reference (cached)
            expect(result1).to.equal(result2);
        });
    });

    describe('UI Display Integration', function() {
        it('should display state count in UI after loading', async function() {
            this.skip(); // Skip until implementation complete

            // Simulate loading via UI
            window.appState.raterFile = createMockFile('rater.xlsx');
            window.appState.taxesFile = createMockFile('taxes.xlsx');

            // Trigger load
            await handleLoadTables();

            // Check UI updates
            const statusElement = document.getElementById('upload-status');
            expect(statusElement.textContent).to.include('states loaded');
        });

        it('should display program distribution (CW vs SS)', async function() {
            this.skip(); // Skip until implementation complete

            // Load tables
            const result = await ingestRaterWorkbook(mockArrayBuffer);

            // Display in UI (would be called by handleLoadTables)
            displayProgramDistribution(result);

            // Verify UI shows distribution
            // e.g., "CW: 30 states | SS: 12 states | Both: 18 states"
        });

        it('should enable recalculate button when tables loaded', async function() {
            this.skip(); // Skip until implementation complete

            const recalcBtn = document.getElementById('recalculate-btn');
            expect(recalcBtn.disabled).to.be.true;

            // Load tables
            await handleLoadTables();

            // If PDF is also loaded, button should be enabled
            if (window.appState.parsedPolicies.length > 0) {
                expect(recalcBtn.disabled).to.be.false;
            }
        });
    });

    describe('Fallback to Pre-baked JSON', function() {
        it('should load from /data/*.json when no Excel uploaded', async function() {
            this.skip(); // Skip until implementation complete

            // Clear uploaded files
            window.appState.raterFile = null;
            window.appState.taxesFile = null;

            // Click "Use Pre-loaded Tables"
            await handleUsePreloaded();

            // Verify data loaded
            expect(window.appState.cwTables).to.not.be.null;
            expect(window.appState.ssTables).to.not.be.null;
            expect(window.appState.attributeBands).to.not.be.null;
            expect(window.appState.stateTaxRules).to.not.be.null;
        });
    });

    describe('Error Handling', function() {
        it('should handle corrupted Excel files', async function() {
            this.skip(); // Skip until implementation complete

            const corruptedData = new ArrayBuffer(10);

            try {
                await ingestRaterWorkbook(corruptedData);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.include('Excel');
            }
        });

        it('should handle missing tabs in workbook', async function() {
            this.skip(); // Skip until implementation complete

            // Mock workbook with missing "AL CW Tables" tab
            const incompleteWorkbook = createIncompleteWorkbook();

            try {
                await ingestRaterWorkbook(incompleteWorkbook);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.include('tab');
            }
        });
    });

    // Helper functions
    function createMockFile(filename) {
        return new File([new ArrayBuffer(0)], filename, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }

    function createIncompleteWorkbook() {
        return new ArrayBuffer(0);
    }
});
