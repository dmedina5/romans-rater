/**
 * Roman's Rater 4.21 - UI Management
 * Handles DOM manipulation, event handlers, and panel navigation
 */

/**
 * Initialize tab navigation with keyboard support
 */
window.initializeTabNavigation = function() {
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.panel');

    tabs.forEach((tab, index) => {
        // Click handler
        tab.addEventListener('click', () => {
            activateTab(index);
        });

        // Keyboard navigation
        tab.addEventListener('keydown', (e) => {
            let newIndex = index;

            if (e.key === 'ArrowRight') {
                newIndex = (index + 1) % tabs.length;
                e.preventDefault();
            } else if (e.key === 'ArrowLeft') {
                newIndex = (index - 1 + tabs.length) % tabs.length;
                e.preventDefault();
            } else if (e.key === 'Home') {
                newIndex = 0;
                e.preventDefault();
            } else if (e.key === 'End') {
                newIndex = tabs.length - 1;
                e.preventDefault();
            }

            if (newIndex !== index) {
                tabs[newIndex].focus();
                activateTab(newIndex);
            }
        });
    });

    function activateTab(index) {
        // Deactivate all tabs and panels
        tabs.forEach(t => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
            t.setAttribute('tabindex', '-1');
        });

        panels.forEach(p => {
            p.classList.remove('active');
            p.hidden = true;
        });

        // Activate selected tab and panel
        tabs[index].classList.add('active');
        tabs[index].setAttribute('aria-selected', 'true');
        tabs[index].setAttribute('tabindex', '0');

        panels[index].classList.add('active');
        panels[index].hidden = false;
    }
};

/**
 * Initialize file upload handlers
 */
window.initializeFileUpload = function() {
    // PDF upload
    const pdfInput = document.getElementById('pdf-upload');
    if (pdfInput) {
        pdfInput.addEventListener('change', handlePDFUpload);
    }

    // Rater Excel upload
    const raterInput = document.getElementById('rater-upload');
    if (raterInput) {
        raterInput.addEventListener('change', handleRaterUpload);
    }

    // Taxes Excel upload
    const taxesInput = document.getElementById('taxes-upload');
    if (taxesInput) {
        taxesInput.addEventListener('change', handleTaxesUpload);
    }

    // Use Pre-loaded Tables button
    const preloadedBtn = document.getElementById('use-preloaded-btn');
    if (preloadedBtn) {
        preloadedBtn.addEventListener('click', handleUsePreloaded);
    }

    // Parse PDF button
    const parsePdfBtn = document.getElementById('parse-pdf-btn');
    if (parsePdfBtn) {
        parsePdfBtn.addEventListener('click', handleParsePDF);
    }

    // Load Tables button
    const loadTablesBtn = document.getElementById('load-tables-btn');
    if (loadTablesBtn) {
        loadTablesBtn.addEventListener('click', handleLoadTables);
    }

    // Recalculate button
    const recalcBtn = document.getElementById('recalculate-btn');
    if (recalcBtn) {
        recalcBtn.addEventListener('click', handleRecalculate);
    }

    // Export buttons
    const exportJsonBtn = document.getElementById('export-json-btn');
    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', () => handleExport('json'));
    }

    const exportCsvBtn = document.getElementById('export-csv-btn');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => handleExport('csv'));
    }

    const exportPdfBtn = document.getElementById('export-pdf-btn');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => handleExport('pdf'));
    }

    // Fees & Taxes panel controls
    const admittedToggle = document.getElementById('admitted-toggle');
    if (admittedToggle) {
        admittedToggle.addEventListener('change', () => {
            if (window.appState.alSubtotal) {
                calculateAndDisplayFees();
            }
        });
    }

    const brokerFeeInput = document.getElementById('broker-fee-input');
    if (brokerFeeInput) {
        brokerFeeInput.addEventListener('input', debounce(() => {
            if (window.appState.alSubtotal) {
                calculateAndDisplayFees();
            }
        }, 500));
    }
};

/**
 * Initialize modal dialogs
 */
window.initializeModals = function() {
    // About modal
    const aboutBtn = document.getElementById('about-btn');
    const aboutModal = document.getElementById('about-modal');
    const aboutCloseBtn = document.getElementById('about-close-btn');

    if (aboutBtn && aboutModal) {
        aboutBtn.addEventListener('click', () => aboutModal.showModal());
    }

    if (aboutCloseBtn && aboutModal) {
        aboutCloseBtn.addEventListener('click', () => aboutModal.close());
    }

    // Settings modal (to be implemented)
    // OCR modal (to be implemented)
};

/**
 * Handle PDF file upload
 */
function handlePDFUpload(event) {
    const files = Array.from(event.target.files);
    window.appState.pdfFiles = files;

    // Display file list
    const fileList = document.getElementById('pdf-list');
    fileList.innerHTML = '';

    files.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span class="filename">${file.name}</span>
            <span class="filesize">${formatFileSize(file.size)}</span>
        `;
        fileList.appendChild(fileItem);
    });

    // Enable Parse PDF button
    const parsePdfBtn = document.getElementById('parse-pdf-btn');
    if (parsePdfBtn) {
        parsePdfBtn.disabled = files.length === 0;
    }

    showStatus('upload-status', `${files.length} PDF(s) selected`, 'success');
}

/**
 * Handle Rater Excel upload
 */
function handleRaterUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    window.appState.raterFile = file;

    const fileDisplay = document.getElementById('rater-file');
    fileDisplay.innerHTML = `
        <div class="file-item">
            <span class="filename">${file.name}</span>
            <span class="filesize">${formatFileSize(file.size)}</span>
        </div>
    `;

    updateLoadTablesButton();
    showStatus('upload-status', 'Rater file selected', 'success');
}

/**
 * Handle Taxes Excel upload
 */
function handleTaxesUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    window.appState.taxesFile = file;

    const fileDisplay = document.getElementById('taxes-file');
    fileDisplay.innerHTML = `
        <div class="file-item">
            <span class="filename">${file.name}</span>
            <span class="filesize">${formatFileSize(file.size)}</span>
        </div>
    `;

    updateLoadTablesButton();
    showStatus('upload-status', 'Taxes file selected', 'success');
}

/**
 * Update Load Tables button state
 */
function updateLoadTablesButton() {
    const loadTablesBtn = document.getElementById('load-tables-btn');
    if (loadTablesBtn) {
        const hasRater = window.appState.raterFile !== null;
        const hasTaxes = window.appState.taxesFile !== null;
        loadTablesBtn.disabled = !(hasRater && hasTaxes);
    }
}

/**
 * Handle Use Pre-loaded Tables button
 */
async function handleUsePreloaded() {
    showStatus('upload-status', 'Loading pre-loaded tables...', 'info');

    try {
        // Load pre-baked JSON files
        const [cwTables, ssTables, bands, taxes] = await Promise.all([
            fetch('/data/al_cw_tables.json').then(r => r.json()),
            fetch('/data/al_ss_tables.json').then(r => r.json()),
            fetch('/data/attribute_bands.json').then(r => r.json()),
            fetch('/data/state_taxes_fees_2025.json').then(r => r.json())
        ]);

        window.appState.cwTables = cwTables;
        window.appState.ssTables = ssTables;
        window.appState.attributeBands = bands;
        window.appState.stateTaxRules = taxes;

        showStatus('upload-status', 'Pre-loaded tables loaded successfully', 'success');

        // Enable recalculate if PDF is parsed
        const recalcBtn = document.getElementById('recalculate-btn');
        if (recalcBtn && window.appState.parsedPolicies.length > 0) {
            recalcBtn.disabled = false;
        }
    } catch (error) {
        console.error('Failed to load pre-loaded tables:', error);
        showStatus('upload-status', 'Failed to load pre-loaded tables', 'error');
    }
}

/**
 * Handle Parse PDF button
 */
async function handleParsePDF() {
    if (window.appState.pdfFiles.length === 0) {
        showStatus('upload-status', 'No PDF files selected', 'error');
        return;
    }

    showStatus('upload-status', 'Parsing PDF(s)...', 'info');

    if (window.perfMonitor) {
        window.perfMonitor.start('PDF Parsing');
    }

    try {
        const parsedPolicies = [];

        for (const file of window.appState.pdfFiles) {
            const arrayBuffer = await file.arrayBuffer();
            const parsed = await parsePDF(arrayBuffer);

            // Store policy metadata
            parsed.filename = file.name;
            parsedPolicies.push(parsed);

            console.log(`Parsed ${file.name}:`, parsed);
        }

        // Store parsed data
        window.appState.parsedPolicies = parsedPolicies;
        window.appState.currentPolicyIndex = 0;

        if (window.perfMonitor) {
            window.perfMonitor.end('PDF Parsing');
        }

        // Check if any pages need OCR
        const ocrNeeded = parsedPolicies.some(p => p.pages_ocr_needed.length > 0);

        if (ocrNeeded && window.appState.settings.enableOCR) {
            showOCRPrompt(parsedPolicies);
        }

        // Display parsed data
        if (parsedPolicies.length > 0) {
            const firstPolicy = parsedPolicies[0];
            displayParsedData(firstPolicy.policy, firstPolicy.vehicles, firstPolicy.drivers);

            // If multiple PDFs, show selector
            if (parsedPolicies.length > 1) {
                displayPolicySelector(parsedPolicies);
            }

            showStatus('upload-status', `Successfully parsed ${parsedPolicies.length} PDF(s)`, 'success');

            // Switch to Parsed Data tab
            const parsedTab = document.getElementById('parsed-tab');
            if (parsedTab) {
                parsedTab.click();
            }

            // Pre-populate rating panel dropdowns with PDF data
            populateRatingPanelFromPDF(firstPolicy);

            // Enable recalculate if tables are loaded
            const recalcBtn = document.getElementById('recalculate-btn');
            if (recalcBtn && window.appState.cwTables && window.appState.ssTables) {
                recalcBtn.disabled = false;
            }
        }

    } catch (error) {
        console.error('PDF parsing error:', error);
        showStatus('upload-status', `Failed to parse PDF: ${error.message}`, 'error');
    }
}

/**
 * Handle Load Tables button
 */
async function handleLoadTables() {
    if (!window.appState.raterFile || !window.appState.taxesFile) {
        showStatus('upload-status', 'Please upload both rater and taxes files', 'error');
        return;
    }

    showStatus('upload-status', 'Loading rating tables...', 'info');

    if (window.perfMonitor) {
        window.perfMonitor.start('Excel Loading');
    }

    try {
        // Load rater workbook
        const raterBuffer = await window.appState.raterFile.arrayBuffer();
        const raterData = await ingestRaterWorkbook(raterBuffer);

        window.appState.cwTables = raterData.cw;
        window.appState.ssTables = raterData.ss;
        window.appState.attributeBands = raterData.bands;

        // Load taxes workbook
        const taxesBuffer = await window.appState.taxesFile.arrayBuffer();
        const taxesData = await ingestTaxFeeWorkbook(taxesBuffer);

        window.appState.stateTaxRules = taxesData;

        if (window.perfMonitor) {
            window.perfMonitor.end('Excel Loading');
        }

        // Calculate state counts
        const cwStates = Object.keys(raterData.cw.bodyClass);
        const ssStates = Object.keys(raterData.ss.bodyClass);
        const allStates = new Set([...cwStates, ...ssStates]);
        const cwOnly = cwStates.filter(s => !ssStates.includes(s));
        const ssOnly = ssStates.filter(s => !cwStates.includes(s));
        const both = cwStates.filter(s => ssStates.includes(s));

        showStatus('upload-status',
            `Loaded ${allStates.size} states: CW ${cwStates.length} | SS ${ssStates.length} | Both ${both.length}`,
            'success'
        );

        // Display program distribution
        displayProgramDistribution({
            total: allStates.size,
            cw: cwStates.length,
            ss: ssStates.length,
            both: both.length,
            cwOnly: cwOnly.length,
            ssOnly: ssOnly.length
        });

        // Enable recalculate if PDF is parsed
        const recalcBtn = document.getElementById('recalculate-btn');
        if (recalcBtn && window.appState.parsedPolicies.length > 0) {
            recalcBtn.disabled = false;
        }

        console.log('Rating tables loaded successfully');
        console.log('CW states:', cwStates);
        console.log('SS states:', ssStates);

    } catch (error) {
        console.error('Table loading error:', error);
        showStatus('upload-status', `Failed to load tables: ${error.message}`, 'error');
    }
}

/**
 * Handle Recalculate button
 */
async function handleRecalculate() {
    // Validate prerequisites
    if (!window.appState.parsedPolicies || window.appState.parsedPolicies.length === 0) {
        showStatus('rating-status', 'No parsed policy data available', 'error');
        return;
    }

    if (!window.appState.cwTables || !window.appState.ssTables) {
        showStatus('rating-status', 'Rating tables not loaded', 'error');
        return;
    }

    showStatus('rating-status', 'Calculating AL base premium...', 'info');

    if (window.perfMonitor) {
        window.perfMonitor.start('Premium Calculation');
    }

    try {
        // Get current policy
        const currentIndex = window.appState.currentPolicyIndex || 0;
        const policyData = window.appState.parsedPolicies[currentIndex];

        if (!policyData || !policyData.policy) {
            throw new Error('Invalid policy data');
        }

        // Get user selections from rating panel
        const limitSelect = document.getElementById('limit-select');
        const radiusSelect = document.getElementById('radius-select');
        const aggregationSelect = document.getElementById('aggregation-select');

        const limit = limitSelect?.value || policyData.policy.limit;
        const radius = radiusSelect?.value || policyData.policy.radius;
        const aggregation = aggregationSelect?.value || 'mean';

        // Update policy data with user selections
        policyData.policy.limit = limit;
        policyData.policy.radius = radius;

        // Detect which program to use (CW vs SS)
        const programResolution = detectProgramHybrid(
            policyData,
            window.appState.cwTables,
            window.appState.ssTables
        );

        if (!programResolution.program) {
            throw new Error(`Unable to determine rating program: ${programResolution.reason}`);
        }

        console.log('Program resolution:', programResolution);

        // Get the appropriate rating table
        const ratingTable = getProgramTable(
            programResolution.program,
            window.appState.cwTables,
            window.appState.ssTables
        );

        if (!ratingTable) {
            throw new Error(`Rating table not found for program ${programResolution.program}`);
        }

        // Normalize policy data for calculation
        const normalizedPolicy = {
            policy: {
                state: policyData.policy.state || policyData.policy.address?.state,
                limit: limit,
                radius: radius,
                carrierName: policyData.policy.carrierName
            },
            vehicles: policyData.vehicles.map(v => ({
                vin: v.vin,
                bodyType: v.body_type || v.bodyType,
                class: v.class || v.vehicleClass,
                businessClass: v.business_class || v.businessClass
            })),
            drivers: policyData.drivers.map(d => {
                // Calculate age from DOB if needed
                let age = d.age;
                if (!age && d.dob) {
                    const dobDate = dayjs(d.dob);
                    if (dobDate.isValid()) {
                        age = dayjs().diff(dobDate, 'year');
                    }
                }

                return {
                    name: `${d.first || ''} ${d.last || ''}`.trim(),
                    age: age || 30,  // Default age if missing
                    experience: d.years_exp || d.experience || 0,
                    mvrPoints: calculateMVRPoints(d)
                };
            })
        };

        // Calculate AL base premium
        const calcOptions = {
            aggregation: aggregation
        };

        const result = calculateALPremium(
            normalizedPolicy,
            ratingTable,
            window.appState.attributeBands,
            calcOptions
        );

        if (result.errors && result.errors.length > 0) {
            throw new Error(result.errors.join('; '));
        }

        // Store result in app state
        window.appState.alSubtotal = result.subtotal;
        window.appState.factorTrace = result.factorTrace;

        // Automatically calculate fees and taxes
        calculateAndDisplayFees();

        // Add program info to factor trace
        result.factorTrace.program = programResolution.program;
        result.factorTrace.programConfidence = programResolution.confidence;
        result.factorTrace.programSource = programResolution.source;

        if (window.perfMonitor) {
            window.perfMonitor.end('Premium Calculation');
        }

        // Display results
        displayCalculationResults(result.subtotal, result.factorTrace, result.perUnit);

        showStatus('rating-status',
            `AL Base Premium calculated: $${(result.subtotal / 100).toFixed(2)} (${programResolution.program})`,
            'success'
        );

        // Show warnings if any
        if (result.warnings && result.warnings.length > 0) {
            console.warn('Calculation warnings:', result.warnings);
            result.warnings.forEach(w => {
                showStatus('rating-status', `Warning: ${w}`, 'warning');
            });
        }

        // Switch to Results tab
        const resultsTab = document.getElementById('results-tab');
        if (resultsTab) {
            resultsTab.click();
        }

        // Enable export buttons
        document.getElementById('export-json-btn')?.removeAttribute('disabled');
        document.getElementById('export-csv-btn')?.removeAttribute('disabled');
        document.getElementById('export-pdf-btn')?.removeAttribute('disabled');

    } catch (error) {
        console.error('Premium calculation error:', error);
        showStatus('rating-status', `Calculation failed: ${error.message}`, 'error');
    }
}

/**
 * Calculate MVR points from driver violations
 */
function calculateMVRPoints(driver) {
    let points = 0;

    // Count violations
    if (typeof driver.violations === 'number') {
        points += driver.violations * 2;  // Assume 2 points per violation
    }

    // Count accidents
    if (typeof driver.accidents === 'number') {
        points += driver.accidents * 3;  // Assume 3 points per accident
    }

    // Use mvrPoints if already calculated
    if (typeof driver.mvrPoints === 'number') {
        return driver.mvrPoints;
    }

    return Math.max(0, points);
}

/**
 * Calculate and display fees and taxes
 */
function calculateAndDisplayFees() {
    // Get current policy data
    const currentIndex = window.appState.currentPolicyIndex || 0;
    const policyData = window.appState.parsedPolicies[currentIndex];

    if (!policyData || !window.appState.alSubtotal) {
        console.warn('Cannot calculate fees: missing policy data or AL subtotal');
        return;
    }

    // Get user inputs from Fees & Taxes panel
    const admittedToggle = document.getElementById('admitted-toggle');
    const brokerFeeInput = document.getElementById('broker-fee-input');

    const isAdmitted = admittedToggle?.checked || false;
    const brokerFeeOverride = brokerFeeInput?.value ?
        Math.round(parseFloat(brokerFeeInput.value) * 100) : // Convert dollars to cents
        null;

    // Get state from policy
    const state = policyData.policy.state || policyData.policy.address?.state;

    // Get tax rules for state
    const taxRules = window.appState.stateTaxRules?.[state];

    if (!taxRules) {
        console.warn(`No tax rules found for state ${state}`);
        showStatus('rating-status', `No tax rules available for ${state}`, 'warning');
    }

    // Determine policy type (check if renewal in PDF)
    const policyType = policyData.policy.policyType || 'new';

    // Build input for fee calculation
    const feeInput = {
        alSubtotal: window.appState.alSubtotal,
        state: state,
        policyType: policyType,
        isAdmitted: isAdmitted,
        brokerFee: brokerFeeOverride
    };

    // Calculate fees and taxes
    const feeResult = calculateFeesAndTaxes(feeInput, taxRules);

    // Store in app state
    window.appState.feesAndTaxes = feeResult;

    // Display fees
    displayFeesAndTaxes(feeResult);

    // Perform reconciliation if PDF has totals
    if (policyData.pdf_money && policyData.pdf_money.total) {
        performReconciliation(feeResult, policyData.pdf_money);
    }
}

/**
 * Perform reconciliation between computed and PDF totals
 */
function performReconciliation(computed, pdfMoney) {
    // Build computed object for reconciliation
    const computedValues = {
        alSubtotal: computed.alSubtotal,
        policyFee: computed.policyFee,
        uwFee: computed.uwFee,
        brokerFee: computed.brokerFee,
        slt: computed.slt,
        stamp: computed.stamp,
        fire: computed.fire,
        other: computed.other,
        total: computed.total
    };

    // Build PDF extracted object (convert from dollars to cents if needed)
    const pdfValues = {
        alSubtotal: pdfMoney.alSubtotal || pdfMoney.al_subtotal || null,
        policyFee: pdfMoney.policyFee || pdfMoney.policy_fee || null,
        uwFee: pdfMoney.uwFee || pdfMoney.uw_fee || null,
        brokerFee: pdfMoney.brokerFee || pdfMoney.broker_fee || null,
        slt: pdfMoney.slt || null,
        stamp: pdfMoney.stamp || null,
        fire: pdfMoney.fire || null,
        other: pdfMoney.other || null,
        total: pdfMoney.total
    };

    // Perform reconciliation with $5.00 tolerance
    const reconciliation = reconcileTotals(computedValues, pdfValues, { tolerance: 500 });

    // Store in app state
    window.appState.reconciliation = reconciliation;

    // Display reconciliation
    displayReconciliation(reconciliation);

    console.log('Reconciliation complete:', reconciliation);
}

/**
 * Display fees and taxes in Fees & Taxes panel
 */
function displayFeesAndTaxes(feeResult) {
    const feesDisplay = document.getElementById('fees-display');
    if (!feesDisplay) return;

    // Convert cents to dollars for display
    const formatMoney = (cents) => `$${(cents / 100).toFixed(2)}`;

    const html = `
        <div class="data-display">
            <h3>Fee and Tax Breakdown</h3>

            <table class="data-table">
                <thead>
                    <tr>
                        <th>Component</th>
                        <th>Amount</th>
                        <th>Taxable</th>
                    </tr>
                </thead>
                <tbody>
                    ${feeResult.breakdown.map(item => `
                        <tr>
                            <td>${item.name}</td>
                            <td>${formatMoney(item.amount)}</td>
                            <td>${item.taxable ? '✓' : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div style="margin-top: 20px; padding: 15px; background-color: var(--bg-secondary); border-radius: 4px;">
                <p><strong>Taxable Base:</strong> ${formatMoney(feeResult.taxableBase)}</p>
                <p><strong>Total Taxes:</strong> ${formatMoney(feeResult.slt + feeResult.stamp + feeResult.fire + feeResult.other)}</p>
                <p class="result-highlight"><strong>Grand Total:</strong> ${formatMoney(feeResult.total)}</p>
            </div>

            ${feeResult.warnings.length > 0 ? `
                <div style="margin-top: 10px; color: var(--warning-color);">
                    <strong>Warnings:</strong>
                    <ul>
                        ${feeResult.warnings.map(w => `<li>${w}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}

            ${feeResult.errors.length > 0 ? `
                <div style="margin-top: 10px; color: var(--error-color);">
                    <strong>Errors:</strong>
                    <ul>
                        ${feeResult.errors.map(e => `<li>${e}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `;

    feesDisplay.innerHTML = html;
}

/**
 * Handle Export button
 */
async function handleExport(format) {
    showStatus('export-status', `Generating ${format.toUpperCase()} export...`, 'info');

    try {
        // Gather all audit data
        const currentIndex = window.appState.currentPolicyIndex || 0;
        const policyData = window.appState.parsedPolicies[currentIndex];

        if (!policyData) {
            throw new Error('No policy data available');
        }

        const auditData = {
            policy: policyData.policy,
            vehicles: policyData.vehicles,
            drivers: policyData.drivers,
            alSubtotal: window.appState.alSubtotal,
            factorTrace: window.appState.factorTrace,
            feesAndTaxes: window.appState.feesAndTaxes,
            reconciliation: window.appState.reconciliation
        };

        // Generate filename
        const filename = generateExportFilename(format, policyData.policy);

        // Export based on format
        if (format === 'json') {
            const json = exportToJSON(auditData);
            downloadFile(json, filename, 'application/json');
            showStatus('export-status', `JSON exported successfully: ${filename}`, 'success');

        } else if (format === 'csv') {
            const csv = exportToCSV(auditData);
            downloadFile(csv, filename, 'text/csv');
            showStatus('export-status', `CSV exported successfully: ${filename}`, 'success');

        } else if (format === 'pdf') {
            const pdfBlob = exportToPDF(auditData);
            downloadFile(pdfBlob, filename);
            showStatus('export-status', `PDF exported successfully: ${filename}`, 'success');

        } else {
            throw new Error(`Unknown format: ${format}`);
        }

        console.log(`Exported ${format.toUpperCase()} successfully`);

    } catch (error) {
        console.error('Export error:', error);
        showStatus('export-status', `Export failed: ${error.message}`, 'error');
    }
}

/**
 * Display parsed policy data in Parsed Data panel
 */
window.displayParsedData = function(policy, vehicles, drivers) {
    const parsedContent = document.getElementById('parsed-content');
    if (!parsedContent) return;

    parsedContent.innerHTML = `
        <h3>Policy Information</h3>
        <div class="data-display">
            <p><strong>Insured:</strong> ${policy.insured_name || '[MISSING]'}</p>
            <p><strong>Address:</strong> ${policy.address?.street || ''}, ${policy.address?.city || ''}, ${policy.address?.state || ''} ${policy.address?.zip || ''}</p>
            <p><strong>Effective Date:</strong> ${policy.effective_date || '[MISSING]'}</p>
            <p><strong>Expiration Date:</strong> ${policy.expiration_date || '[MISSING]'}</p>
        </div>

        <h3>Vehicles (${vehicles.length})</h3>
        <table class="data-table">
            <thead>
                <tr>
                    <th>VIN</th>
                    <th>Year</th>
                    <th>Make/Model</th>
                    <th>Class</th>
                    <th>Body Type</th>
                    <th>Business Class</th>
                </tr>
            </thead>
            <tbody>
                ${vehicles.map(v => `
                    <tr>
                        <td>${v.vin || '[MISSING]'}</td>
                        <td>${v.year || ''}</td>
                        <td>${v.make_model || ''}</td>
                        <td>${v.class || ''}</td>
                        <td>${v.body_type || ''}</td>
                        <td>${v.business_class || ''}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <h3>Drivers (${drivers.length})</h3>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>License State</th>
                    <th>DOB</th>
                    <th>Experience (yrs)</th>
                    <th>Accidents</th>
                    <th>Violations</th>
                    <th>Excluded</th>
                </tr>
            </thead>
            <tbody>
                ${drivers.map(d => `
                    <tr>
                        <td>${d.first || ''} ${d.last || ''}</td>
                        <td>${d.license_state || ''}</td>
                        <td>${d.dob || ''}</td>
                        <td>${d.years_exp || 0}</td>
                        <td>${d.accidents || 0}</td>
                        <td>${d.violations || 0}</td>
                        <td>${d.excluded ? 'Yes' : 'No'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
};

/**
 * Display calculation results in Results panel
 */
window.displayCalculationResults = function(subtotal, factorTrace, perUnit = []) {
    const resultsContent = document.getElementById('results-content');
    if (!resultsContent) return;

    // Format subtotal (convert from cents to dollars)
    const subtotalDollars = typeof subtotal === 'number' ? (subtotal / 100).toFixed(2) : '0.00';

    // Build per-unit table if provided
    let perUnitHtml = '';
    if (perUnit && perUnit.length > 0) {
        perUnitHtml = `
            <h3>Per-Unit Premiums</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>VIN</th>
                        <th>Body Type</th>
                        <th>Class</th>
                        <th>Business Class</th>
                        <th>Body Factor</th>
                        <th>Premium</th>
                    </tr>
                </thead>
                <tbody>
                    ${perUnit.map(unit => `
                        <tr>
                            <td>${unit.vin || 'Unknown'}</td>
                            <td>${unit.bodyType || '-'}</td>
                            <td>${unit.vehicleClass || '-'}</td>
                            <td>${unit.businessClass || '-'}</td>
                            <td>${unit.bodyClassFactor ? unit.bodyClassFactor.toFixed(3) : '1.000'}</td>
                            <td>$${((unit.premium || 0) / 100).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    // Build driver factors table
    let driverFactorsHtml = '';
    if (factorTrace.driverFactor && factorTrace.driverFactor.drivers && factorTrace.driverFactor.drivers.length > 0) {
        driverFactorsHtml = `
            <h3>Driver Factors</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Driver</th>
                        <th>Age Factor</th>
                        <th>Experience Factor</th>
                        <th>MVR Factor</th>
                        <th>Composite</th>
                    </tr>
                </thead>
                <tbody>
                    ${factorTrace.driverFactor.drivers.map(driver => `
                        <tr>
                            <td>${driver.name || 'Unknown'}</td>
                            <td>${driver.ageFactor ? driver.ageFactor.toFixed(3) : '1.000'}</td>
                            <td>${driver.expFactor ? driver.expFactor.toFixed(3) : '1.000'}</td>
                            <td>${driver.mvrFactor ? driver.mvrFactor.toFixed(3) : '1.000'}</td>
                            <td><strong>${driver.compositeFactor ? driver.compositeFactor.toFixed(3) : '1.000'}</strong></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <p><strong>Aggregation Method:</strong> ${factorTrace.driverFactor.method || 'mean'}</p>
            <p><strong>Final Driver Factor:</strong> ${factorTrace.driverFactor.aggregated ? factorTrace.driverFactor.aggregated.toFixed(3) : '1.000'}</p>
        `;
    }

    resultsContent.innerHTML = `
        <div class="data-display">
            <h3>AL Base Premium Calculation</h3>
            <p><strong>Program:</strong> ${factorTrace.program || 'Unknown'} (${factorTrace.programSource || 'unknown'})</p>
            <p><strong>Confidence:</strong> ${factorTrace.programConfidence || 'unknown'}</p>
            <p class="result-highlight"><strong>Subtotal:</strong> $${subtotalDollars}</p>
        </div>

        <div class="factor-trace">
            <h3>Factor Breakdown</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Factor</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Base AL Premium</td>
                        <td>${factorTrace.base_AL ? `$${factorTrace.base_AL.toFixed(2)}` : '-'}</td>
                    </tr>
                    <tr>
                        <td>Body Class Factor</td>
                        <td>${factorTrace.bodyClassFactor ? factorTrace.bodyClassFactor.toFixed(3) : '1.000'}</td>
                    </tr>
                    <tr>
                        <td>Radius Factor</td>
                        <td>${factorTrace.radiusFactor ? factorTrace.radiusFactor.toFixed(3) : '1.000'}</td>
                    </tr>
                    <tr>
                        <td>Limit Factor</td>
                        <td>${factorTrace.limitFactor ? factorTrace.limitFactor.toFixed(3) : '1.000'}</td>
                    </tr>
                    <tr>
                        <td>State Factor</td>
                        <td>${factorTrace.stateFactor ? factorTrace.stateFactor.toFixed(3) : '1.000'}</td>
                    </tr>
                    <tr>
                        <td>Driver Factor (Aggregated)</td>
                        <td>${factorTrace.driverFactor && factorTrace.driverFactor.aggregated ? factorTrace.driverFactor.aggregated.toFixed(3) : '1.000'}</td>
                    </tr>
                    <tr>
                        <td>Number of Vehicles</td>
                        <td>${factorTrace.numVehicles || 0}</td>
                    </tr>
                </tbody>
            </table>

            <div class="calculation-formula" style="margin-top: 20px; padding: 15px; background-color: var(--bg-secondary); border-radius: 4px; font-family: monospace;">
                <strong>Calculation:</strong><br>
                ${factorTrace.calculation || 'Not available'}
            </div>

            ${factorTrace.minimumApplied ? `
                <p style="margin-top: 10px; color: var(--warning-color);">
                    ⚠️ <strong>Minimum premium applied:</strong> ${factorTrace.minimumApplied}
                </p>
            ` : ''}

            ${factorTrace.notes && factorTrace.notes.length > 0 ? `
                <div style="margin-top: 10px;">
                    <strong>Notes:</strong>
                    <ul>
                        ${factorTrace.notes.map(note => `<li>${note}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>

        ${perUnitHtml}

        ${driverFactorsHtml}

        <details style="margin-top: 20px;">
            <summary style="cursor: pointer; font-weight: bold;">View Full Factor Trace (JSON)</summary>
            <pre style="margin-top: 10px; padding: 10px; background-color: var(--bg-secondary); border-radius: 4px; overflow-x: auto; font-size: 0.85rem;">${JSON.stringify(factorTrace, null, 2)}</pre>
        </details>
    `;
};

/**
 * Display reconciliation results in Reconciliation panel
 */
window.displayReconciliation = function(reconciliation) {
    const reconciliationSection = document.getElementById('reconciliation-section');
    const reconciliationContent = document.getElementById('reconciliation-content');

    if (!reconciliationSection || !reconciliationContent) return;

    reconciliationSection.hidden = false;

    // Format money (cents to dollars)
    const formatMoney = (cents) => {
        if (cents === null || cents === undefined) return 'N/A';
        return `$${(cents / 100).toFixed(2)}`;
    };

    // Determine status class
    const statusClass = reconciliation.status === 'PASS' ? 'status-success' :
                       reconciliation.status === 'WARN' ? 'status-warning' :
                       reconciliation.status === 'FAIL' ? 'status-error' :
                       'status-info';

    // Build status badge
    let statusBadge = reconciliation.status;
    if (reconciliation.status === 'PASS') {
        statusBadge = '✓ PASS';
    } else if (reconciliation.status === 'WARN') {
        statusBadge = '⚠ WARNING';
    } else if (reconciliation.status === 'FAIL') {
        statusBadge = '✗ FAIL';
    }

    reconciliationContent.innerHTML = `
        <div class="data-display">
            <h3>Reconciliation Results</h3>
            <p class="${statusClass}" style="font-size: 1.2rem; padding: 10px; border-radius: 4px;">
                <strong>Status:</strong> ${statusBadge}
            </p>

            <div style="margin-top: 20px;">
                <p><strong>Computed Total:</strong> ${formatMoney(reconciliation.computed.total)}</p>
                <p><strong>PDF Total:</strong> ${formatMoney(reconciliation.pdf.total)}</p>
                <p><strong>Delta:</strong> ${formatMoney(reconciliation.delta.total)}
                   ${reconciliation.delta.total > 0 ? '(computed higher)' : reconciliation.delta.total < 0 ? '(computed lower)' : '(exact match)'}
                </p>
                <p><strong>Tolerance:</strong> ±${formatMoney(reconciliation.tolerance)}</p>
                <p><strong>Percentage Difference:</strong> ${reconciliation.percentDiff.toFixed(2)}%</p>
            </div>
        </div>

        ${reconciliation.breakdown.length > 0 ? `
        <h4 style="margin-top: 20px;">Component Breakdown</h4>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Component</th>
                    <th>Computed</th>
                    <th>PDF Extracted</th>
                    <th>Delta</th>
                    <th>Match</th>
                </tr>
            </thead>
            <tbody>
                ${reconciliation.breakdown.map(c => `
                    <tr>
                        <td>${c.name}</td>
                        <td>${formatMoney(c.computed)}</td>
                        <td>${formatMoney(c.pdf)}</td>
                        <td style="color: ${c.delta === 0 ? 'green' : c.delta && Math.abs(c.delta) > reconciliation.tolerance ? 'red' : 'orange'}">
                            ${formatMoney(c.delta)}
                        </td>
                        <td style="text-align: center;">${c.match ? '✓' : c.delta !== null ? '⚠' : '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}

        ${reconciliation.discrepancies.length > 0 ? `
        <div style="margin-top: 20px; padding: 15px; background-color: var(--warning-bg); border-radius: 4px;">
            <h4>Discrepancies Detected (${reconciliation.discrepancies.length})</h4>
            <ul>
                ${reconciliation.discrepancies.map(d => `
                    <li>
                        <strong>${d.name}:</strong>
                        Computed ${formatMoney(d.computed)},
                        PDF ${formatMoney(d.pdf)},
                        Delta ${formatMoney(d.delta)}
                        (${d.percentDiff.toFixed(1)}%)
                    </li>
                `).join('')}
            </ul>
        </div>
        ` : ''}

        ${reconciliation.warnings.length > 0 ? `
        <div style="margin-top: 10px; color: var(--warning-color);">
            <strong>Warnings:</strong>
            <ul>
                ${reconciliation.warnings.map(w => `<li>${w}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        ${reconciliation.errors.length > 0 ? `
        <div style="margin-top: 10px; color: var(--error-color);">
            <strong>Errors:</strong>
            <ul>
                ${reconciliation.errors.map(e => `<li>${e}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
    `;
};

/**
 * Show status message
 */
function showStatus(elementId, message, type = 'info') {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.textContent = message;
    element.className = `status-message status-${type}`;
    element.setAttribute('role', type === 'error' ? 'alert' : 'status');
}

/**
 * Debounce utility for input handlers
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Show OCR prompt modal for pages needing text recognition
 */
function showOCRPrompt(parsedPolicies) {
    const ocrModal = document.getElementById('ocr-modal');
    const ocrPagesList = document.getElementById('ocr-pages-list');

    if (!ocrModal || !ocrPagesList) return;

    // Build list of pages needing OCR
    let html = '<ul>';
    parsedPolicies.forEach((policy, policyIndex) => {
        if (policy.pages_ocr_needed.length > 0) {
            html += `<li><strong>${policy.filename}</strong>: Pages ${policy.pages_ocr_needed.join(', ')}</li>`;
        }
    });
    html += '</ul>';

    ocrPagesList.innerHTML = html;

    // Set up button handlers
    const ocrEnableBtn = document.getElementById('ocr-enable-btn');
    const ocrSkipBtn = document.getElementById('ocr-skip-btn');

    ocrEnableBtn.onclick = async () => {
        ocrModal.close();
        await performOCR(parsedPolicies);
    };

    ocrSkipBtn.onclick = () => {
        ocrModal.close();
    };

    ocrModal.showModal();
}

/**
 * Perform OCR on pages that need it
 */
async function performOCR(parsedPolicies) {
    showStatus('upload-status', 'Performing OCR on image-based pages...', 'info');

    try {
        for (const policy of parsedPolicies) {
            if (policy.pages_ocr_needed.length > 0) {
                // Re-load PDF
                const pdfFile = window.appState.pdfFiles.find(f => f.name === policy.filename);
                if (!pdfFile) continue;

                const arrayBuffer = await pdfFile.arrayBuffer();
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;

                // Perform OCR on needed pages
                const ocrResults = await ocrPages(pdf, policy.pages_ocr_needed);

                // Append OCR text to policy data
                policy.ocrResults = ocrResults;

                console.log(`OCR completed for ${policy.filename}:`, ocrResults);
            }
        }

        showStatus('upload-status', 'OCR completed', 'success');

        // Re-display parsed data with OCR results
        if (parsedPolicies.length > 0) {
            const firstPolicy = parsedPolicies[0];
            displayParsedData(firstPolicy.policy, firstPolicy.vehicles, firstPolicy.drivers);
        }

    } catch (error) {
        console.error('OCR error:', error);
        showStatus('upload-status', `OCR failed: ${error.message}`, 'error');
    }
}

/**
 * Display policy selector for multiple PDFs
 */
function displayPolicySelector(parsedPolicies) {
    const parsedContent = document.getElementById('parsed-content');
    if (!parsedContent) return;

    const selectorHtml = `
        <div class="form-group">
            <label for="policy-selector">Select Policy to View:</label>
            <select id="policy-selector">
                ${parsedPolicies.map((policy, index) => `
                    <option value="${index}">${policy.filename} - ${policy.policy.insured_name || 'Unknown'}</option>
                `).join('')}
            </select>
        </div>
    `;

    // Prepend selector to parsed content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = selectorHtml;
    parsedContent.insertBefore(tempDiv.firstElementChild, parsedContent.firstChild);

    // Add change handler
    const selector = document.getElementById('policy-selector');
    if (selector) {
        selector.addEventListener('change', (e) => {
            const index = parseInt(e.target.value);
            window.appState.currentPolicyIndex = index;
            const policy = parsedPolicies[index];
            displayParsedData(policy.policy, policy.vehicles, policy.drivers);
        });
    }
}

/**
 * Populate rating panel dropdowns from parsed PDF data
 */
function populateRatingPanelFromPDF(policyData) {
    if (!policyData || !policyData.policy) return;

    const { policy } = policyData;

    // Pre-select limit if found in PDF
    const limitSelect = document.getElementById('limit-select');
    if (limitSelect && policy.limit) {
        const limitValue = policy.limit;
        // Try to match to dropdown options
        const option = Array.from(limitSelect.options).find(opt => opt.value === limitValue);
        if (option) {
            limitSelect.value = limitValue;
        }
    }

    // Pre-select radius if found in PDF
    const radiusSelect = document.getElementById('radius-select');
    if (radiusSelect && policy.radius) {
        const radiusValue = policy.radius;
        // Try to match to dropdown options
        const option = Array.from(radiusSelect.options).find(opt => opt.value === radiusValue);
        if (option) {
            radiusSelect.value = radiusValue;
        }
    }
}

/**
 * Display program distribution (CW vs SS states)
 */
function displayProgramDistribution(stats) {
    // Create or update distribution display
    let distDisplay = document.getElementById('program-distribution');

    if (!distDisplay) {
        distDisplay = document.createElement('div');
        distDisplay.id = 'program-distribution';
        distDisplay.className = 'data-display';
        distDisplay.style.marginTop = '20px';

        const uploadSection = document.querySelector('.upload-section');
        if (uploadSection) {
            uploadSection.appendChild(distDisplay);
        }
    }

    distDisplay.innerHTML = `
        <h3>Program Distribution</h3>
        <p><strong>Total States Supported:</strong> ${stats.total}</p>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 10px;">
            <div style="text-align: center; padding: 10px; background-color: var(--bg-secondary); border-radius: 4px;">
                <div style="font-size: 2rem; font-weight: bold; color: var(--primary-color);">${stats.cw}</div>
                <div>Cover Whale (CW)</div>
            </div>
            <div style="text-align: center; padding: 10px; background-color: var(--bg-secondary); border-radius: 4px;">
                <div style="font-size: 2rem; font-weight: bold; color: var(--primary-color);">${stats.ss}</div>
                <div>Standard & Surplus (SS)</div>
            </div>
            <div style="text-align: center; padding: 10px; background-color: var(--bg-secondary); border-radius: 4px;">
                <div style="font-size: 2rem; font-weight: bold; color: var(--primary-color);">${stats.both}</div>
                <div>Both Programs</div>
            </div>
        </div>
        <p style="margin-top: 10px; font-size: 0.9rem; color: var(--text-light);">
            CW-only: ${stats.cwOnly} | SS-only: ${stats.ssOnly} | Overlapping: ${stats.both}
        </p>
    `;
}
