/**
 * Roman's Rater 4.21 - Export Module
 * Exports audit data to JSON, CSV, and PDF formats
 * Tasks: T201-T222
 */

/**
 * Export audit data to JSON format
 * @param {Object} auditData - Complete audit data
 * @returns {string} JSON string
 */
function exportToJSON(auditData) {
    try {
        const exportData = formatAuditDataForExport(auditData);

        // Add export metadata
        exportData.exportTimestamp = new Date().toISOString();
        exportData.exportVersion = '4.21.0';
        exportData.exportFormat = 'JSON';

        // Stringify with pretty printing
        return JSON.stringify(exportData, null, 2);

    } catch (error) {
        console.error('JSON export error:', error);
        return JSON.stringify({ error: error.message }, null, 2);
    }
}

/**
 * Export audit data to CSV format
 * @param {Object} auditData - Complete audit data
 * @returns {string} CSV string
 */
function exportToCSV(auditData) {
    try {
        const rows = buildCSVRows(auditData);

        // Convert rows to CSV string using PapaParse
        const csv = Papa.unparse(rows, {
            quotes: true,
            quoteChar: '"',
            escapeChar: '"',
            delimiter: ',',
            header: false,
            newline: '\n'
        });

        return csv;

    } catch (error) {
        console.error('CSV export error:', error);
        return `Error,${error.message}`;
    }
}

/**
 * Export audit data to PDF format
 * @param {Object} auditData - Complete audit data
 * @returns {Blob} PDF blob
 */
function exportToPDF(auditData) {
    try {
        // Create new jsPDF document
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        let yPosition = 20;
        const pageWidth = doc.internal.pageSize.width;
        const margin = 20;
        const contentWidth = pageWidth - (2 * margin);

        // Title
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text("Roman's Rater 4.21 - Audit Report", margin, yPosition);

        yPosition += 10;

        // Timestamp
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);

        yPosition += 15;

        // Policy Information Section
        if (auditData && auditData.policy) {
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('Policy Information', margin, yPosition);

            yPosition += 8;

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');

            const policyInfo = [
                ['Insured', auditData.policy.insured_name || 'N/A'],
                ['State', auditData.policy.state || 'N/A'],
                ['Effective Date', auditData.policy.effective_date || 'N/A'],
                ['Expiration Date', auditData.policy.expiration_date || 'N/A']
            ];

            doc.autoTable({
                startY: yPosition,
                head: [['Field', 'Value']],
                body: policyInfo,
                margin: { left: margin, right: margin },
                theme: 'grid',
                headStyles: { fillColor: [126, 54, 159] },  // Brand color
                styles: { fontSize: 9 }
            });

            yPosition = doc.lastAutoTable.finalY + 10;
        }

        // Calculation Results Section
        if (auditData && auditData.factorTrace) {
            // Check if new page needed
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 20;
            }

            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('AL Base Premium Calculation', margin, yPosition);

            yPosition += 8;

            const formatMoney = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

            const calcResults = [
                ['Program', auditData.factorTrace.program || 'N/A'],
                ['Base AL', formatMoney(auditData.factorTrace.base_AL)],
                ['Body Class Factor', (auditData.factorTrace.bodyClassFactor || 1.0).toFixed(3)],
                ['Radius Factor', (auditData.factorTrace.radiusFactor || 1.0).toFixed(3)],
                ['Limit Factor', (auditData.factorTrace.limitFactor || 1.0).toFixed(3)],
                ['State Factor', (auditData.factorTrace.stateFactor || 1.0).toFixed(3)],
                ['Driver Factor', auditData.factorTrace.driverFactor?.aggregated?.toFixed(3) || '1.000'],
                ['AL Subtotal', formatMoney(auditData.alSubtotal)]
            ];

            doc.autoTable({
                startY: yPosition,
                head: [['Factor', 'Value']],
                body: calcResults,
                margin: { left: margin, right: margin },
                theme: 'grid',
                headStyles: { fillColor: [126, 54, 159] },
                styles: { fontSize: 9 }
            });

            yPosition = doc.lastAutoTable.finalY + 10;
        }

        // Fees and Taxes Section
        if (auditData && auditData.feesAndTaxes) {
            // Check if new page needed
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 20;
            }

            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('Fees and Taxes', margin, yPosition);

            yPosition += 8;

            const formatMoney = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

            const feesData = [
                ['Policy Fee', formatMoney(auditData.feesAndTaxes.policyFee)],
                ['UW Fee', formatMoney(auditData.feesAndTaxes.uwFee)],
                ['Broker Fee', formatMoney(auditData.feesAndTaxes.brokerFee)],
                ['SLT', formatMoney(auditData.feesAndTaxes.slt)],
                ['Stamp Fee', formatMoney(auditData.feesAndTaxes.stamp)],
                ['Fire Marshal Fee', formatMoney(auditData.feesAndTaxes.fire)],
                ['Other Fees', formatMoney(auditData.feesAndTaxes.other)],
                ['Total Premium', formatMoney(auditData.feesAndTaxes.total)]
            ];

            doc.autoTable({
                startY: yPosition,
                head: [['Component', 'Amount']],
                body: feesData,
                margin: { left: margin, right: margin },
                theme: 'grid',
                headStyles: { fillColor: [126, 54, 159] },
                styles: { fontSize: 9 }
            });

            yPosition = doc.lastAutoTable.finalY + 10;
        }

        // Reconciliation Section
        if (auditData && auditData.reconciliation) {
            // Check if new page needed
            if (yPosition > 230) {
                doc.addPage();
                yPosition = 20;
            }

            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('Reconciliation', margin, yPosition);

            yPosition += 8;

            const formatMoney = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

            const statusBadge = auditData.reconciliation.status === 'PASS' ? '✓ PASS' :
                               auditData.reconciliation.status === 'WARN' ? '⚠ WARNING' :
                               auditData.reconciliation.status === 'FAIL' ? '✗ FAIL' :
                               auditData.reconciliation.status;

            const reconData = [
                ['Status', statusBadge],
                ['Computed Total', formatMoney(auditData.reconciliation.computed?.total)],
                ['PDF Total', formatMoney(auditData.reconciliation.pdf?.total)],
                ['Delta', formatMoney(auditData.reconciliation.delta?.total)],
                ['Tolerance', `±${formatMoney(auditData.reconciliation.tolerance)}`],
                ['Percent Diff', `${(auditData.reconciliation.percentDiff || 0).toFixed(2)}%`]
            ];

            doc.autoTable({
                startY: yPosition,
                head: [['Field', 'Value']],
                body: reconData,
                margin: { left: margin, right: margin },
                theme: 'grid',
                headStyles: { fillColor: [126, 54, 159] },
                styles: { fontSize: 9 }
            });

            yPosition = doc.lastAutoTable.finalY + 10;
        }

        // Footer with page numbers
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont(undefined, 'normal');
            doc.text(
                `Page ${i} of ${pageCount}`,
                pageWidth / 2,
                doc.internal.pageSize.height - 10,
                { align: 'center' }
            );
        }

        // Generate blob
        return doc.output('blob');

    } catch (error) {
        console.error('PDF export error:', error);
        // Return minimal error PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.text(`Export error: ${error.message}`, 20, 20);
        return doc.output('blob');
    }
}

/**
 * Format audit data for export
 * @param {Object} auditData - Raw audit data
 * @returns {Object} Formatted data
 */
function formatAuditDataForExport(auditData) {
    if (!auditData || typeof auditData !== 'object') {
        return {
            error: 'No audit data available',
            timestamp: new Date().toISOString()
        };
    }

    return {
        policy: auditData.policy || {},
        vehicles: auditData.vehicles || [],
        drivers: auditData.drivers || [],
        calculation: {
            program: auditData.factorTrace?.program,
            alSubtotal: auditData.alSubtotal,
            factorTrace: auditData.factorTrace || {}
        },
        feesAndTaxes: auditData.feesAndTaxes || {},
        reconciliation: auditData.reconciliation || {}
    };
}

/**
 * Build CSV rows from audit data
 * @param {Object} auditData - Audit data
 * @returns {Array} Array of row arrays
 */
function buildCSVRows(auditData) {
    const rows = [];

    // Header row
    rows.push(['Section', 'Field', 'Value']);

    // Policy section
    if (auditData && auditData.policy) {
        rows.push(['Policy', 'Insured Name', auditData.policy.insured_name || '']);
        rows.push(['Policy', 'State', auditData.policy.state || '']);
        rows.push(['Policy', 'Effective Date', auditData.policy.effective_date || '']);
        rows.push(['Policy', 'Expiration Date', auditData.policy.expiration_date || '']);
    }

    // Calculation section
    if (auditData && auditData.factorTrace) {
        rows.push(['Calculation', 'Program', auditData.factorTrace.program || '']);
        rows.push(['Calculation', 'Base AL', ((auditData.factorTrace.base_AL || 0) / 100).toFixed(2)]);
        rows.push(['Calculation', 'Body Class Factor', (auditData.factorTrace.bodyClassFactor || 1.0).toFixed(3)]);
        rows.push(['Calculation', 'Radius Factor', (auditData.factorTrace.radiusFactor || 1.0).toFixed(3)]);
        rows.push(['Calculation', 'Limit Factor', (auditData.factorTrace.limitFactor || 1.0).toFixed(3)]);
        rows.push(['Calculation', 'State Factor', (auditData.factorTrace.stateFactor || 1.0).toFixed(3)]);
        rows.push(['Calculation', 'Driver Factor', auditData.factorTrace.driverFactor?.aggregated?.toFixed(3) || '1.000']);
        rows.push(['Calculation', 'AL Subtotal', ((auditData.alSubtotal || 0) / 100).toFixed(2)]);
    }

    // Fees section
    if (auditData && auditData.feesAndTaxes) {
        rows.push(['Fees', 'Policy Fee', ((auditData.feesAndTaxes.policyFee || 0) / 100).toFixed(2)]);
        rows.push(['Fees', 'UW Fee', ((auditData.feesAndTaxes.uwFee || 0) / 100).toFixed(2)]);
        rows.push(['Fees', 'Broker Fee', ((auditData.feesAndTaxes.brokerFee || 0) / 100).toFixed(2)]);
        rows.push(['Fees', 'SLT', ((auditData.feesAndTaxes.slt || 0) / 100).toFixed(2)]);
        rows.push(['Fees', 'Stamp', ((auditData.feesAndTaxes.stamp || 0) / 100).toFixed(2)]);
        rows.push(['Fees', 'Fire', ((auditData.feesAndTaxes.fire || 0) / 100).toFixed(2)]);
        rows.push(['Fees', 'Other', ((auditData.feesAndTaxes.other || 0) / 100).toFixed(2)]);
        rows.push(['Fees', 'Total', ((auditData.feesAndTaxes.total || 0) / 100).toFixed(2)]);
    }

    // Reconciliation section
    if (auditData && auditData.reconciliation) {
        rows.push(['Reconciliation', 'Status', auditData.reconciliation.status || '']);
        rows.push(['Reconciliation', 'Computed Total', ((auditData.reconciliation.computed?.total || 0) / 100).toFixed(2)]);
        rows.push(['Reconciliation', 'PDF Total', ((auditData.reconciliation.pdf?.total || 0) / 100).toFixed(2)]);
        rows.push(['Reconciliation', 'Delta', ((auditData.reconciliation.delta?.total || 0) / 100).toFixed(2)]);
        rows.push(['Reconciliation', 'Percent Diff', `${(auditData.reconciliation.percentDiff || 0).toFixed(2)}%`]);
    }

    return rows;
}

/**
 * Escape CSV value
 * @param {*} value - Value to escape
 * @returns {string} Escaped value
 */
function escapeCSVValue(value) {
    const str = String(value);

    // Check if value needs quoting (contains comma, quote, or newline)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        // Escape quotes by doubling them
        return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
}

/**
 * Download file to user's computer
 * @param {Blob|string} content - File content
 * @param {string} filename - Filename
 * @param {string} mimeType - MIME type (optional, inferred from content if Blob)
 */
function downloadFile(content, filename, mimeType) {
    try {
        let blob;

        if (content instanceof Blob) {
            blob = content;
        } else {
            blob = new Blob([content], { type: mimeType || 'text/plain' });
        }

        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;

        // Trigger download
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Download error:', error);
        throw new Error(`Failed to download file: ${error.message}`);
    }
}

/**
 * Generate export filename
 * @param {string} format - Export format ('json', 'csv', 'pdf')
 * @param {Object} policyData - Policy data for naming
 * @returns {string} Filename
 */
function generateExportFilename(format, policyData) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const insuredName = policyData?.insured_name || 'policy';

    // Sanitize insured name for filename
    const sanitized = insuredName.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_').slice(0, 30);

    return `romans-rater-${sanitized}-${timestamp}.${format}`;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        exportToJSON,
        exportToCSV,
        exportToPDF,
        formatAuditDataForExport,
        buildCSVRows,
        escapeCSVValue,
        downloadFile,
        generateExportFilename
    };
}
