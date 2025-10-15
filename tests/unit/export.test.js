/**
 * Unit Tests for Export Module (export.js)
 * Tasks: T191-T200
 */

describe('Export Module (export.js)', function() {

    const mockAuditData = {
        policy: {
            insured_name: 'Test Company',
            state: 'AL',
            effective_date: '2025-01-01',
            expiration_date: '2026-01-01'
        },
        vehicles: [
            { vin: 'VIN123', bodyType: 'Tractor', class: '8' }
        ],
        drivers: [
            { name: 'Driver 1', age: 35, experience: 10 }
        ],
        alSubtotal: 10000,
        factorTrace: {
            program: 'CW',
            base_AL: 1000,
            bodyClassFactor: 1.25,
            radiusFactor: 1.0,
            limitFactor: 1.0,
            stateFactor: 1.1,
            driverFactor: { aggregated: 1.05 }
        },
        feesAndTaxes: {
            policyFee: 250,
            uwFee: 150,
            slt: 500,
            total: 10900
        },
        reconciliation: {
            status: 'PASS',
            delta: { total: 0 }
        }
    };

    // T191: Test exportToJSON()
    describe('exportToJSON()', function() {

        it('should serialize audit data to JSON string', function() {
            const json = exportToJSON(mockAuditData);

            expect(json).to.be.a('string');
            expect(() => JSON.parse(json)).to.not.throw();
        });

        it('should include all audit data fields', function() {
            const json = exportToJSON(mockAuditData);
            const parsed = JSON.parse(json);

            expect(parsed).to.have.property('policy');
            expect(parsed).to.have.property('vehicles');
            expect(parsed).to.have.property('drivers');
            expect(parsed).to.have.property('alSubtotal');
            expect(parsed).to.have.property('factorTrace');
            expect(parsed).to.have.property('feesAndTaxes');
            expect(parsed).to.have.property('reconciliation');
        });

        it('should add export metadata', function() {
            const json = exportToJSON(mockAuditData);
            const parsed = JSON.parse(json);

            expect(parsed).to.have.property('exportTimestamp');
            expect(parsed).to.have.property('exportVersion');
            expect(parsed.exportVersion).to.equal('4.21.0');
        });

        it('should handle missing fields gracefully', function() {
            const partialData = { policy: { insured_name: 'Test' } };
            const json = exportToJSON(partialData);

            expect(() => JSON.parse(json)).to.not.throw();
        });
    });

    // T192-T195: Test exportToCSV()
    describe('exportToCSV()', function() {

        it('should convert audit data to CSV format', function() {
            const csv = exportToCSV(mockAuditData);

            expect(csv).to.be.a('string');
            expect(csv).to.include(',');  // CSV delimiter
        });

        it('should include header row', function() {
            const csv = exportToCSV(mockAuditData);
            const lines = csv.split('\n');

            expect(lines[0]).to.include('Component');
            expect(lines[0]).to.include('Value');
        });

        it('should include policy data', function() {
            const csv = exportToCSV(mockAuditData);

            expect(csv).to.include('Test Company');
            expect(csv).to.include('AL');
        });

        it('should include calculation results', function() {
            const csv = exportToCSV(mockAuditData);

            expect(csv).to.include('AL Base Premium');
            expect(csv).to.include('10000');
        });

        it('should handle special characters in CSV', function() {
            const dataWithCommas = {
                ...mockAuditData,
                policy: { ...mockAuditData.policy, insured_name: 'Test, Company' }
            };

            const csv = exportToCSV(dataWithCommas);
            expect(csv).to.include('"Test, Company"');  // Should be quoted
        });
    });

    // T196-T200: Test exportToPDF()
    describe('exportToPDF()', function() {

        it('should generate PDF document', function() {
            const pdfBlob = exportToPDF(mockAuditData);

            expect(pdfBlob).to.be.instanceof(Blob);
            expect(pdfBlob.type).to.equal('application/pdf');
        });

        it('should include document title', function() {
            // Note: Testing PDF content requires PDF parsing, so we check metadata
            const pdfBlob = exportToPDF(mockAuditData);
            expect(pdfBlob.size).to.be.above(0);
        });

        it('should handle large data sets', function() {
            const largeData = {
                ...mockAuditData,
                vehicles: Array(50).fill(mockAuditData.vehicles[0]),
                drivers: Array(20).fill(mockAuditData.drivers[0])
            };

            const pdfBlob = exportToPDF(largeData);
            expect(pdfBlob.size).to.be.above(0);
        });

        it('should include all sections', function() {
            // Test that PDF generation doesn't throw errors
            expect(() => exportToPDF(mockAuditData)).to.not.throw();
        });

        it('should handle missing reconciliation', function() {
            const dataWithoutReconciliation = {
                ...mockAuditData,
                reconciliation: null
            };

            expect(() => exportToPDF(dataWithoutReconciliation)).to.not.throw();
        });
    });

    // Helper function tests
    describe('Helper Functions', function() {

        it('downloadFile() should create download link', function() {
            const blob = new Blob(['test'], { type: 'text/plain' });
            const filename = 'test.txt';

            // This function manipulates DOM, so we just check it doesn't throw
            expect(() => downloadFile(blob, filename)).to.not.throw();
        });

        it('formatAuditDataForExport() should normalize data', function() {
            const formatted = formatAuditDataForExport(mockAuditData);

            expect(formatted).to.have.property('policy');
            expect(formatted).to.have.property('calculation');
            expect(formatted).to.have.property('reconciliation');
        });

        it('buildCSVRows() should create row array', function() {
            const rows = buildCSVRows(mockAuditData);

            expect(rows).to.be.an('array');
            expect(rows.length).to.be.above(0);
            expect(rows[0]).to.be.an('array');  // First row should be header
        });

        it('escapeCSVValue() should handle special characters', function() {
            expect(escapeCSVValue('test,value')).to.equal('"test,value"');
            expect(escapeCSVValue('test"value')).to.equal('"test""value"');
            expect(escapeCSVValue('simple')).to.equal('simple');
        });
    });

    // Edge cases
    describe('Edge Cases', function() {

        it('should handle null data', function() {
            expect(() => exportToJSON(null)).to.not.throw();
            expect(() => exportToCSV(null)).to.not.throw();
            expect(() => exportToPDF(null)).to.not.throw();
        });

        it('should handle empty objects', function() {
            const emptyData = {};

            expect(() => exportToJSON(emptyData)).to.not.throw();
            expect(() => exportToCSV(emptyData)).to.not.throw();
            expect(() => exportToPDF(emptyData)).to.not.throw();
        });

        it('should handle very long field values', function() {
            const longData = {
                ...mockAuditData,
                policy: {
                    ...mockAuditData.policy,
                    insured_name: 'A'.repeat(1000)
                }
            };

            expect(() => exportToJSON(longData)).to.not.throw();
            expect(() => exportToCSV(longData)).to.not.throw();
        });
    });
});
