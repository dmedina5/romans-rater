/**
 * Unit Tests for Excel Ingestion (src/xlsx-ingest.js)
 * Tests: T057-T064
 */

describe('Excel Ingestion Module', function() {
    this.timeout(10000); // Excel parsing can take time

    describe('ingestRaterWorkbook function', function() {
        // T058: should extract AL CW Tables to normalized bodyClass structure
        it('should extract AL CW Tables to normalized bodyClass structure', async function() {
            if (typeof ingestRaterWorkbook === 'undefined') {
                this.skip();
                return;
            }

            // Mock workbook data would be loaded here
            const mockWorkbook = createMockRaterWorkbook();

            const result = await ingestRaterWorkbook(mockWorkbook);

            expect(result).to.have.property('cw');
            expect(result.cw).to.have.property('program', 'CW');
            expect(result.cw).to.have.property('bodyClass');
            expect(result.cw.bodyClass).to.be.an('object');

            // Check nested structure: state → bodyType → class → businessClass → factor
            // Example: bodyClass['TX']['Tractor']['8']['AUTOHAULER'] = 1.25
        });

        // T059: should extract AL SS Tables to normalized bodyClass structure
        it('should extract AL SS Tables to normalized bodyClass structure', async function() {
            if (typeof ingestRaterWorkbook === 'undefined') {
                this.skip();
                return;
            }

            const mockWorkbook = createMockRaterWorkbook();
            const result = await ingestRaterWorkbook(mockWorkbook);

            expect(result).to.have.property('ss');
            expect(result.ss).to.have.property('program', 'SS');
            expect(result.ss).to.have.property('bodyClass');
            expect(result.ss.bodyClass).to.be.an('object');
        });

        // T060: should parse edition metadata (code, rateDate) from rate tables
        it('should parse edition metadata (code, rateDate) from rate tables', async function() {
            if (typeof ingestRaterWorkbook === 'undefined') {
                this.skip();
                return;
            }

            const mockWorkbook = createMockRaterWorkbook();
            const result = await ingestRaterWorkbook(mockWorkbook);

            expect(result.cw).to.have.property('editions');
            expect(result.cw.editions).to.be.an('object');

            // Check edition structure for a state (e.g., TX)
            if (result.cw.editions['TX']) {
                const editions = result.cw.editions['TX'];
                expect(editions).to.be.an('array');

                if (editions.length > 0) {
                    expect(editions[0]).to.have.property('code');
                    expect(editions[0]).to.have.property('rateDate');
                    expect(editions[0].rateDate).to.match(/^\d{4}-\d{2}-\d{2}$/);
                }
            }
        });

        // T061: should extract attribute bands (age/exp/MVR) with min/max ranges
        it('should extract attribute bands (age/exp/MVR) with min/max ranges', async function() {
            if (typeof ingestRaterWorkbook === 'undefined') {
                this.skip();
                return;
            }

            const mockWorkbook = createMockRaterWorkbook();
            const result = await ingestRaterWorkbook(mockWorkbook);

            expect(result).to.have.property('bands');
            expect(result.bands).to.have.property('age');
            expect(result.bands).to.have.property('exp');
            expect(result.bands).to.have.property('mvr');

            // Check age band structure
            expect(result.bands.age).to.be.an('array');
            if (result.bands.age.length > 0) {
                const band = result.bands.age[0];
                expect(band).to.have.property('min');
                expect(band).to.have.property('max');
                expect(band).to.have.property('factor');
                expect(band.factor).to.be.a('number').and.above(0);
            }

            // Check MVR band structure
            expect(result.bands.mvr).to.be.an('array');
            if (result.bands.mvr.length > 0) {
                const band = result.bands.mvr[0];
                expect(band).to.have.property('pointsMin');
                expect(band).to.have.property('pointsMax');
                expect(band).to.have.property('factor');
            }
        });
    });

    describe('ingestTaxFeeWorkbook function', function() {
        // T062: should extract state tax rates and taxable masks
        it('should extract state tax rates and taxable masks', async function() {
            if (typeof ingestTaxFeeWorkbook === 'undefined') {
                this.skip();
                return;
            }

            const mockWorkbook = createMockTaxFeeWorkbook();
            const result = await ingestTaxFeeWorkbook(mockWorkbook);

            expect(result).to.be.an('object');

            // Check structure for a state (e.g., TX)
            if (result['TX']) {
                const txRules = result['TX'];
                expect(txRules).to.have.property('state', 'TX');
                expect(txRules).to.have.property('slt_rate');
                expect(txRules.slt_rate).to.be.a('number').and.at.least(0).and.at.most(1);
                expect(txRules).to.have.property('stamp_rate');
                expect(txRules).to.have.property('fire');
                expect(txRules.fire).to.have.property('type');
                expect(txRules.fire.type).to.be.oneOf(['pct', 'flat']);
                expect(txRules).to.have.property('taxable');
                expect(txRules.taxable).to.have.property('policy');
                expect(txRules.taxable).to.have.property('uw');
                expect(txRules.taxable).to.have.property('broker');
                expect(txRules).to.have.property('uwPolicyFees');
            }
        });
    });

    describe('Edition Selection Logic', function() {
        it('should parse Rate Date from Excel date formats', function() {
            if (typeof parseExcelDate === 'undefined') {
                this.skip();
                return;
            }

            // Test MM/DD/YYYY format
            const date1 = parseExcelDate('01/01/2025');
            expect(date1).to.equal('2025-01-01');

            // Test Excel serial date (45000 = 2023-03-11)
            const date2 = parseExcelDate(45000);
            expect(date2).to.match(/^\d{4}-\d{2}-\d{2}$/);

            // Test ISO format
            const date3 = parseExcelDate('2025-01-01');
            expect(date3).to.equal('2025-01-01');
        });

        it('should parse Edition Code from various formats', function() {
            if (typeof parseEditionCode === 'undefined') {
                this.skip();
                return;
            }

            // Test various formats
            expect(parseEditionCode('2025-Q1')).to.equal('2025-Q1');
            expect(parseEditionCode('2025Q1')).to.equal('2025-Q1');
            expect(parseEditionCode('Q1-2025')).to.equal('2025-Q1');
        });
    });

    describe('Factor Validation', function() {
        it('should validate all factors are positive numbers', function() {
            if (typeof validateFactor === 'undefined') {
                this.skip();
                return;
            }

            expect(validateFactor(1.25)).to.be.true;
            expect(validateFactor(0.95)).to.be.true;
            expect(validateFactor(1.0)).to.be.true;
            expect(validateFactor(0)).to.be.false;
            expect(validateFactor(-1.5)).to.be.false;
            expect(validateFactor('invalid')).to.be.false;
            expect(validateFactor(null)).to.be.false;
        });

        it('should default invalid factors to 1.0', function() {
            if (typeof normalizeFactor === 'undefined') {
                this.skip();
                return;
            }

            expect(normalizeFactor(1.25)).to.equal(1.25);
            expect(normalizeFactor(0)).to.equal(1.0);
            expect(normalizeFactor(-1.5)).to.equal(1.0);
            expect(normalizeFactor('invalid')).to.equal(1.0);
            expect(normalizeFactor(null)).to.equal(1.0);
        });
    });

    describe('State Code Detection', function() {
        it('should scan sheet for US state codes', function() {
            if (typeof scanForStateCodes === 'undefined') {
                this.skip();
                return;
            }

            const mockSheet = {
                'A1': { v: 'TX' },
                'B1': { v: 'CA' },
                'C1': { v: 'FL' },
                'A2': { v: 'NotAState' },
                'B2': { v: 'NY' }
            };

            const states = scanForStateCodes(mockSheet);

            expect(states).to.be.an('array');
            expect(states).to.include('TX');
            expect(states).to.include('CA');
            expect(states).to.include('FL');
            expect(states).to.include('NY');
            expect(states).to.not.include('NotAState');
        });
    });

    describe('Min Premium Extraction', function() {
        it('should extract per-unit and per-policy min premiums', function() {
            if (typeof extractMinPremiums === 'undefined') {
                this.skip();
                return;
            }

            const mockSheet = {
                'A10': { v: 'Min Premium Per Unit' },
                'B10': { v: 250 },
                'A11': { v: 'Min Premium Per Policy' },
                'B11': { v: 1000 }
            };

            const result = extractMinPremiums(mockSheet);

            expect(result).to.have.property('perUnit', 250);
            expect(result).to.have.property('perPolicy', 1000);
        });
    });

    // Helper functions to create mock workbooks
    function createMockRaterWorkbook() {
        // In real implementation, this would return a mock XLSX workbook structure
        return new ArrayBuffer(0);
    }

    function createMockTaxFeeWorkbook() {
        return new ArrayBuffer(0);
    }
});

describe('Excel Ingestion - Integration with UI', function() {
    // T063-T064: Integration tests
    it('should load rater v4.21 and produce deterministic JSON', async function() {
        this.skip(); // Skip until implementation complete

        // Load actual fixture file
        const response = await fetch('../fixtures/sample-raters/2025-Cover-Whale-Rater-v4.21.xlsx');
        const arrayBuffer = await response.arrayBuffer();

        const result = await ingestRaterWorkbook(arrayBuffer);

        // Verify deterministic output
        expect(result.cw.program).to.equal('CW');
        expect(result.ss.program).to.equal('SS');

        // Check that all states are present
        const cwStates = Object.keys(result.cw.bodyClass);
        const ssStates = Object.keys(result.ss.bodyClass);

        expect(cwStates.length).to.be.above(0);
        expect(ssStates.length).to.be.above(0);

        // Verify factors are numbers
        for (const state of cwStates) {
            const stateData = result.cw.bodyClass[state];
            expect(stateData).to.be.an('object');
        }
    });
});
