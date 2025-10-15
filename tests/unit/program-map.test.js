/**
 * Unit Tests for Program Mapping Logic (program-map.js)
 * Tasks: T088-T094
 */

describe('Program Mapping (program-map.js)', function() {

    // T088: Test resolveProgram() with CW state coverage
    describe('resolveProgram()', function() {

        it('should return "CW" for Alabama (covered by CW only)', function() {
            const mockCW = { bodyClass: { AL: {} } };
            const mockSS = { bodyClass: {} };
            const result = resolveProgram('AL', mockCW, mockSS);
            expect(result.program).to.equal('CW');
            expect(result.confidence).to.equal('high');
        });

        it('should return "SS" for states covered by SS only', function() {
            const mockCW = { bodyClass: {} };
            const mockSS = { bodyClass: { AK: {} } };
            const result = resolveProgram('AK', mockCW, mockSS);
            expect(result.program).to.equal('SS');
            expect(result.confidence).to.equal('high');
        });

        it('should return "CW" for states covered by both CW and SS (CW preferred)', function() {
            const mockCW = { bodyClass: { TX: {} } };
            const mockSS = { bodyClass: { TX: {} } };
            const result = resolveProgram('TX', mockCW, mockSS);
            expect(result.program).to.equal('CW');
            expect(result.confidence).to.equal('medium');
            expect(result.reason).to.include('both');
        });

        it('should return null program for uncovered states', function() {
            const mockCW = { bodyClass: {} };
            const mockSS = { bodyClass: {} };
            const result = resolveProgram('XX', mockCW, mockSS);
            expect(result.program).to.be.null;
            expect(result.confidence).to.equal('none');
        });

        it('should handle missing CW tables', function() {
            const mockSS = { bodyClass: { AL: {} } };
            const result = resolveProgram('AL', null, mockSS);
            expect(result.program).to.equal('SS');
        });

        it('should handle missing SS tables', function() {
            const mockCW = { bodyClass: { AL: {} } };
            const result = resolveProgram('AL', mockCW, null);
            expect(result.program).to.equal('CW');
        });

        it('should normalize state code to uppercase', function() {
            const mockCW = { bodyClass: { NY: {} } };
            const mockSS = { bodyClass: {} };
            const result = resolveProgram('ny', mockCW, mockSS);
            expect(result.program).to.equal('CW');
        });
    });

    // T089: Test getProgramTable() selector
    describe('getProgramTable()', function() {

        it('should return CW table when program is "CW"', function() {
            const mockCW = { program: 'CW', bodyClass: {} };
            const mockSS = { program: 'SS', bodyClass: {} };
            const result = getProgramTable('CW', mockCW, mockSS);
            expect(result.program).to.equal('CW');
        });

        it('should return SS table when program is "SS"', function() {
            const mockCW = { program: 'CW', bodyClass: {} };
            const mockSS = { program: 'SS', bodyClass: {} };
            const result = getProgramTable('SS', mockCW, mockSS);
            expect(result.program).to.equal('SS');
        });

        it('should return null for invalid program', function() {
            const mockCW = { program: 'CW' };
            const mockSS = { program: 'SS' };
            const result = getProgramTable('INVALID', mockCW, mockSS);
            expect(result).to.be.null;
        });

        it('should handle null tables gracefully', function() {
            const result = getProgramTable('CW', null, null);
            expect(result).to.be.null;
        });
    });

    // T090: Test buildProgramSummary() for stats display
    describe('buildProgramSummary()', function() {

        it('should count CW-only states', function() {
            const mockCW = { bodyClass: { AL: {}, GA: {}, FL: {} } };
            const mockSS = { bodyClass: {} };
            const summary = buildProgramSummary(mockCW, mockSS);
            expect(summary.cwOnly).to.equal(3);
            expect(summary.ssOnly).to.equal(0);
            expect(summary.both).to.equal(0);
        });

        it('should count SS-only states', function() {
            const mockCW = { bodyClass: {} };
            const mockSS = { bodyClass: { AK: {}, HI: {} } };
            const summary = buildProgramSummary(mockCW, mockSS);
            expect(summary.cwOnly).to.equal(0);
            expect(summary.ssOnly).to.equal(2);
            expect(summary.both).to.equal(0);
        });

        it('should count states covered by both programs', function() {
            const mockCW = { bodyClass: { TX: {}, CA: {} } };
            const mockSS = { bodyClass: { TX: {}, CA: {}, NY: {} } };
            const summary = buildProgramSummary(mockCW, mockSS);
            expect(summary.cwOnly).to.equal(0);
            expect(summary.ssOnly).to.equal(1);
            expect(summary.both).to.equal(2);
        });

        it('should list all states by program', function() {
            const mockCW = { bodyClass: { AL: {}, TX: {} } };
            const mockSS = { bodyClass: { AK: {}, TX: {} } };
            const summary = buildProgramSummary(mockCW, mockSS);
            expect(summary.cwStates).to.include('AL');
            expect(summary.cwStates).to.include('TX');
            expect(summary.ssStates).to.include('AK');
            expect(summary.ssStates).to.include('TX');
        });

        it('should handle empty tables', function() {
            const mockCW = { bodyClass: {} };
            const mockSS = { bodyClass: {} };
            const summary = buildProgramSummary(mockCW, mockSS);
            expect(summary.cwOnly).to.equal(0);
            expect(summary.ssOnly).to.equal(0);
            expect(summary.both).to.equal(0);
        });
    });

    // T091: Test validateProgramCoverage() for missing states
    describe('validateProgramCoverage()', function() {

        it('should validate policy state is covered by a program', function() {
            const mockCW = { bodyClass: { AL: {} } };
            const mockSS = { bodyClass: {} };
            const validation = validateProgramCoverage('AL', mockCW, mockSS);
            expect(validation.valid).to.be.true;
            expect(validation.errors).to.be.empty;
        });

        it('should return error for uncovered state', function() {
            const mockCW = { bodyClass: {} };
            const mockSS = { bodyClass: {} };
            const validation = validateProgramCoverage('XX', mockCW, mockSS);
            expect(validation.valid).to.be.false;
            expect(validation.errors).to.have.lengthOf(1);
            expect(validation.errors[0]).to.include('not covered');
        });

        it('should warn when state is covered by both programs', function() {
            const mockCW = { bodyClass: { TX: {} } };
            const mockSS = { bodyClass: { TX: {} } };
            const validation = validateProgramCoverage('TX', mockCW, mockSS);
            expect(validation.valid).to.be.true;
            expect(validation.warnings).to.have.lengthOf(1);
            expect(validation.warnings[0]).to.include('both');
        });
    });

    // T092: Test program detection with PDF hints (carrier name parsing)
    describe('detectProgramFromPDF()', function() {

        it('should detect CW program from "Cover Whale" carrier name', function() {
            const policyData = {
                policy: { carrierName: 'Cover Whale Insurance Solutions' }
            };
            const result = detectProgramFromPDF(policyData);
            expect(result.program).to.equal('CW');
            expect(result.confidence).to.equal('high');
        });

        it('should detect SS program from "Standard & Surplus" carrier name', function() {
            const policyData = {
                policy: { carrierName: 'Standard & Surplus Lines Insurance Company' }
            };
            const result = detectProgramFromPDF(policyData);
            expect(result.program).to.equal('SS');
            expect(result.confidence).to.equal('high');
        });

        it('should return null for ambiguous carrier names', function() {
            const policyData = {
                policy: { carrierName: 'Generic Insurance Company' }
            };
            const result = detectProgramFromPDF(policyData);
            expect(result.program).to.be.null;
            expect(result.confidence).to.equal('low');
        });

        it('should handle missing carrier name', function() {
            const policyData = { policy: {} };
            const result = detectProgramFromPDF(policyData);
            expect(result.program).to.be.null;
        });
    });

    // T093: Test hybrid detection (PDF hints + state coverage)
    describe('detectProgramHybrid()', function() {

        it('should prefer PDF hint when state has both programs', function() {
            const policyData = {
                policy: {
                    carrierName: 'Cover Whale Insurance',
                    state: 'TX'
                }
            };
            const mockCW = { bodyClass: { TX: {} } };
            const mockSS = { bodyClass: { TX: {} } };

            const result = detectProgramHybrid(policyData, mockCW, mockSS);
            expect(result.program).to.equal('CW');
            expect(result.confidence).to.equal('high');
            expect(result.source).to.equal('pdf_hint');
        });

        it('should fallback to state coverage when PDF hint is ambiguous', function() {
            const policyData = {
                policy: {
                    carrierName: 'Generic Insurance',
                    state: 'AL'
                }
            };
            const mockCW = { bodyClass: { AL: {} } };
            const mockSS = { bodyClass: {} };

            const result = detectProgramHybrid(policyData, mockCW, mockSS);
            expect(result.program).to.equal('CW');
            expect(result.confidence).to.equal('high');
            expect(result.source).to.equal('state_coverage');
        });

        it('should validate PDF hint matches state coverage', function() {
            const policyData = {
                policy: {
                    carrierName: 'Cover Whale Insurance',
                    state: 'AL'
                }
            };
            const mockCW = { bodyClass: {} };  // CW doesn't cover AL
            const mockSS = { bodyClass: { AL: {} } };  // Only SS covers AL

            const result = detectProgramHybrid(policyData, mockCW, mockSS);
            expect(result.program).to.equal('SS');  // Use state coverage over PDF hint
            expect(result.warnings).to.have.lengthOf(1);
            expect(result.warnings[0]).to.include('mismatch');
        });
    });

    // T094: Test edge cases and error handling
    describe('Edge Cases and Error Handling', function() {

        it('should handle null or undefined state codes', function() {
            const mockCW = { bodyClass: { AL: {} } };
            const mockSS = { bodyClass: {} };
            const result = resolveProgram(null, mockCW, mockSS);
            expect(result.program).to.be.null;
            expect(result.errors).to.have.lengthOf(1);
        });

        it('should handle malformed table structures', function() {
            const mockCW = null;
            const mockSS = { notBodyClass: {} };  // Wrong structure
            const result = resolveProgram('AL', mockCW, mockSS);
            expect(result.program).to.be.null;
        });

        it('should handle case-insensitive state codes', function() {
            const mockCW = { bodyClass: { AL: {} } };
            const result = resolveProgram('al', mockCW, {});
            expect(result.program).to.equal('CW');
        });

        it('should trim whitespace from state codes', function() {
            const mockCW = { bodyClass: { AL: {} } };
            const result = resolveProgram('  AL  ', mockCW, {});
            expect(result.program).to.equal('CW');
        });
    });
});
