/**
 * Roman's Rater 4.21 - Main Application Bootstrap
 * Initializes UI, configures vendor libraries, and manages application state
 */

// Application State
const appState = {
    // Uploaded files
    pdfFiles: [],
    raterFile: null,
    taxesFile: null,

    // Parsed data
    parsedPolicies: [],
    currentPolicyIndex: 0,

    // Loaded tables
    cwTables: null,
    ssTables: null,
    attributeBands: null,
    stateTaxRules: null,

    // Calculation results
    alSubtotal: null,
    feesAndTaxes: null,
    factorTrace: null,
    reconciliation: null,

    // Settings
    settings: {
        driverAggregation: 'mean',
        admittedStatus: true,
        brokerFeeOverride: null,
        enableOCR: true,
        highContrast: false,
        persistSettings: false
    },

    // Debug mode
    debug: false
};

// Initialize PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdf.js/pdf.worker.min.js';
}

/**
 * Initialize application on DOM ready
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Roman\'s Rater 4.21 - Initializing...');

    // Load persisted settings
    loadSettings();

    // Initialize UI
    initializeUI();

    // Set up error handler
    setupErrorHandler();

    // Log vendor library versions
    logVendorVersions();

    console.log('Roman\'s Rater 4.21 - Ready');
});

/**
 * Load settings from localStorage if persistence enabled
 */
function loadSettings() {
    try {
        const saved = localStorage.getItem('romans-rater-settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            appState.settings = { ...appState.settings, ...parsed };
            console.log('Settings loaded from localStorage');
        }
    } catch (error) {
        console.warn('Failed to load settings:', error);
    }
}

/**
 * Save settings to localStorage if persistence enabled
 */
function saveSettings() {
    if (!appState.settings.persistSettings) {
        return;
    }

    try {
        localStorage.setItem('romans-rater-settings', JSON.stringify(appState.settings));
        console.log('Settings saved to localStorage');
    } catch (error) {
        console.warn('Failed to save settings:', error);
    }
}

/**
 * Initialize UI event handlers and state
 */
function initializeUI() {
    // Import UI module functions
    // These will be defined in ui.js
    if (typeof window.initializeTabNavigation === 'function') {
        window.initializeTabNavigation();
    }

    if (typeof window.initializeFileUpload === 'function') {
        window.initializeFileUpload();
    }

    if (typeof window.initializeModals === 'function') {
        window.initializeModals();
    }

    // Apply high contrast mode if enabled
    if (appState.settings.highContrast) {
        document.body.classList.add('high-contrast');
    }
}

/**
 * Global error handler for uncaught exceptions
 */
function setupErrorHandler() {
    window.addEventListener('error', (event) => {
        console.error('Uncaught error:', event.error);

        // Display user-friendly error message
        const errorMsg = document.createElement('div');
        errorMsg.className = 'status-message status-error';
        errorMsg.setAttribute('role', 'alert');
        errorMsg.textContent = `Error: ${event.error?.message || 'An unexpected error occurred'}`;

        // Find active panel and display error there
        const activePanel = document.querySelector('.panel.active');
        if (activePanel) {
            activePanel.insertBefore(errorMsg, activePanel.firstChild);

            // Remove after 10 seconds
            setTimeout(() => errorMsg.remove(), 10000);
        }
    });

    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);

        // Display user-friendly error message
        const errorMsg = document.createElement('div');
        errorMsg.className = 'status-message status-error';
        errorMsg.setAttribute('role', 'alert');
        errorMsg.textContent = `Error: ${event.reason?.message || 'An unexpected error occurred'}`;

        const activePanel = document.querySelector('.panel.active');
        if (activePanel) {
            activePanel.insertBefore(errorMsg, activePanel.firstChild);
            setTimeout(() => errorMsg.remove(), 10000);
        }
    });
}

/**
 * Log vendor library versions for debugging
 */
function logVendorVersions() {
    const versions = {
        'PDF.js': typeof pdfjsLib !== 'undefined' ? pdfjsLib.version : 'Not loaded',
        'Tesseract.js': typeof Tesseract !== 'undefined' ? 'Loaded' : 'Not loaded',
        'SheetJS': typeof XLSX !== 'undefined' ? XLSX.version : 'Not loaded',
        'dayjs': typeof dayjs !== 'undefined' ? dayjs.version : 'Not loaded',
        'PapaParse': typeof Papa !== 'undefined' ? Papa.version : 'Not loaded',
        'jsPDF': typeof jsPDF !== 'undefined' ? 'Loaded' : 'Not loaded'
    };

    console.table(versions);
}

/**
 * Performance monitoring utility
 */
const perfMonitor = {
    timings: {},

    start(label) {
        this.timings[label] = performance.now();
    },

    end(label) {
        if (this.timings[label]) {
            const duration = performance.now() - this.timings[label];
            console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
            delete this.timings[label];
            return duration;
        }
        return null;
    },

    log() {
        console.table(this.timings);
    }
};

// Export appState and utilities for use in other modules
window.appState = appState;
window.saveSettings = saveSettings;
window.perfMonitor = perfMonitor;
