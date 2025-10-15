/**
 * Roman's Rater 4.21 - PDF Parsing Module
 * Extracts structured data from CWIS Quote PDFs
 * Tasks: T036-T046
 */

/**
 * Parse PDF and extract policy, vehicles, drivers, and pricing data
 * @param {ArrayBuffer} arrayBuffer - PDF file content
 * @returns {Promise<Object>} Parsed data structure
 */
async function parsePDF(arrayBuffer) {
    try {
        // Load PDF document
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        console.log(`PDF loaded: ${pdf.numPages} pages`);

        // Extract text from all pages
        const allText = [];
        const pagesOcrNeeded = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();

            // Concatenate text items
            const pageText = textContent.items.map(item => item.str).join(' ');
            allText.push(pageText);

            // Detect if page needs OCR (< 10% success rate)
            if (pageText.trim().length < 100) {
                pagesOcrNeeded.push(pageNum);
            }
        }

        const fullText = allText.join('\n');

        // Parse structured data
        const policy = extractPolicyHeader(fullText);
        const vehicles = extractVehicleSchedule(fullText);
        const drivers = extractDriverSchedule(fullText);
        const pdf_money = extractALPricing(fullText);

        return {
            policy,
            vehicles,
            drivers,
            pdf_money,
            pages_ocr_needed: pagesOcrNeeded
        };

    } catch (error) {
        console.error('PDF parsing error:', error);
        throw new Error(`Failed to parse PDF: ${error.message}`);
    }
}

/**
 * Extract policy header information
 * @param {string} text - Full PDF text
 * @returns {Object} Policy data
 */
function extractPolicyHeader(text) {
    const policy = {
        insured_name: null,
        address: {
            street: null,
            city: null,
            state: null,
            zip: null
        },
        effective_date: null,
        expiration_date: null,
        al_selection: {
            limit: null,
            radius_bucket: null
        }
    };

    // Extract insured name
    const insuredMatch = text.match(/Insured Name[:\s]+([^\n]+)/i);
    if (insuredMatch) {
        policy.insured_name = insuredMatch[1].trim();
    }

    // Extract address
    const addressMatch = text.match(/(?:Mailing )?Address[:\s]+([^\n]+)/i);
    if (addressMatch) {
        policy.address.street = addressMatch[1].trim();
    }

    // Extract city, state, zip (often on same line)
    const cityStateMatch = text.match(/City[:\s]+([^\s]+)[\s]+State[:\s]+([A-Z]{2})[\s]+Zip[:\s]+([\d-]+)/i);
    if (cityStateMatch) {
        policy.address.city = cityStateMatch[1].trim();
        policy.address.state = normalizeStateCode(cityStateMatch[2].trim());
        policy.address.zip = cityStateMatch[3].trim();
    }

    // Extract policy term dates
    const termMatch = text.match(/Policy Term[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})\s+to\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (termMatch) {
        policy.effective_date = normalizeDate(termMatch[1]);
        policy.expiration_date = normalizeDate(termMatch[2]);
    }

    // Extract limit (if present in header)
    const limitMatch = text.match(/(?:Limit|Coverage)[:\s]+(?:CSL\s+)?\$?([\d,]+)(?:M|Million)?/i);
    if (limitMatch) {
        const amount = parseInt(limitMatch[1].replace(/,/g, ''));
        if (amount === 1 || amount === 1000000) {
            policy.al_selection.limit = 'CSL_1M';
        } else if (amount === 2 || amount === 2000000) {
            policy.al_selection.limit = 'CSL_2M';
        }
    }

    // Extract radius (if present)
    const radiusMatch = text.match(/Radius[:\s]+([\d-+]+)\s*(?:miles?)?/i);
    if (radiusMatch) {
        const radius = radiusMatch[1].trim();
        policy.al_selection.radius_bucket = normalizeRadius(radius);
    }

    return policy;
}

/**
 * Extract vehicle schedule
 * @param {string} text - Full PDF text
 * @returns {Array} Array of vehicle objects
 */
function extractVehicleSchedule(text) {
    const vehicles = [];

    // Find vehicle schedule section
    const vehicleSection = text.match(/VEHICLE SCHEDULE([\s\S]*?)(?:DRIVER SCHEDULE|PREMIUM|$)/i);
    if (!vehicleSection) {
        return vehicles;
    }

    const sectionText = vehicleSection[1];

    // Split into lines and find table rows
    const lines = sectionText.split('\n').filter(line => line.trim().length > 0);

    // Find header row to identify column positions
    let headerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/VIN.*Year.*Make.*Model/i)) {
            headerIndex = i;
            break;
        }
    }

    if (headerIndex === -1) {
        return vehicles;
    }

    // Parse data rows (after header)
    for (let i = headerIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines or section breaks
        if (!line || line.match(/^[-=]+$/)) {
            continue;
        }

        // Heuristic parsing: VIN is 17 characters, followed by year (4 digits)
        const vinMatch = line.match(/([A-HJ-NPR-Z0-9]{17})/);
        if (!vinMatch) {
            continue;
        }

        const vehicle = {
            vin: vinMatch[1],
            year: null,
            make_model: null,
            class: null,
            body_type: null,
            business_class: null,
            garage: {
                street: null,
                city: null,
                state: null,
                zip: null
            }
        };

        // Extract year (4 digits after VIN)
        const yearMatch = line.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
            vehicle.year = parseInt(yearMatch[0]);
        }

        // Extract class (usually "Class 8" or just "8")
        const classMatch = line.match(/(?:Class\s+)?(\d|Class1)/i);
        if (classMatch) {
            vehicle.class = normalizeVehicleClass(classMatch[0]);
        }

        // Extract body type
        const bodyTypes = ['Tractor', 'Trailer', 'Straight Truck', 'Van', 'Pickup'];
        for (const type of bodyTypes) {
            if (line.includes(type)) {
                vehicle.body_type = type;
                break;
            }
        }

        // Extract business class
        const businessClasses = ['AUTOHAULER', 'GENERAL FREIGHT', 'TANKER', 'FLATBED', 'REFRIGERATED'];
        for (const bizClass of businessClasses) {
            if (line.toUpperCase().includes(bizClass)) {
                vehicle.business_class = bizClass;
                break;
            }
        }

        // Extract make/model (text between year and class)
        const makeModelMatch = line.match(/(?:19|20)\d{2}\s+([A-Za-z\s]+?)(?:\s+(?:Class\s+)?\d|$)/);
        if (makeModelMatch) {
            vehicle.make_model = makeModelMatch[1].trim();
        }

        vehicles.push(vehicle);
    }

    return vehicles;
}

/**
 * Extract driver schedule
 * @param {string} text - Full PDF text
 * @returns {Array} Array of driver objects
 */
function extractDriverSchedule(text) {
    const drivers = [];

    // Find driver schedule section
    const driverSection = text.match(/DRIVER SCHEDULE([\s\S]*?)(?:PREMIUM|PRICING|$)/i);
    if (!driverSection) {
        return drivers;
    }

    const sectionText = driverSection[1];
    const lines = sectionText.split('\n').filter(line => line.trim().length > 0);

    // Find header row
    let headerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/Name.*License.*DOB.*Experience/i)) {
            headerIndex = i;
            break;
        }
    }

    if (headerIndex === -1) {
        return drivers;
    }

    // Parse data rows
    for (let i = headerIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();

        if (!line || line.match(/^[-=]+$/)) {
            continue;
        }

        const driver = {
            first: null,
            last: null,
            license_state: null,
            license_no: null,
            dob: null,
            years_exp: 0,
            accidents: 0,
            violations: 0,
            suspensions: 0,
            major_violations: 0,
            excluded: false
        };

        // Extract name (first words on line)
        const nameMatch = line.match(/^([A-Za-z]+)\s+([A-Za-z]+)/);
        if (nameMatch) {
            driver.first = nameMatch[1];
            driver.last = nameMatch[2];
        }

        // Extract license state (2-letter code)
        const stateMatch = line.match(/\b([A-Z]{2})\b/);
        if (stateMatch) {
            driver.license_state = normalizeStateCode(stateMatch[1]);
        }

        // Extract DOB (MM/DD/YYYY format)
        const dobMatch = line.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
        if (dobMatch) {
            driver.dob = normalizeDate(dobMatch[1]);
        }

        // Extract years of experience
        const expMatch = line.match(/(?:Experience|Exp)[:\s]+(\d+)/i) || line.match(/\b(\d+)\s*(?:years?|yrs?)\b/i);
        if (expMatch) {
            driver.years_exp = parseInt(expMatch[1]);
        }

        // Extract accidents count
        const accidentsMatch = line.match(/(?:Accidents?)[:\s]+(\d+)/i);
        if (accidentsMatch) {
            driver.accidents = parseInt(accidentsMatch[1]);
        }

        // Extract violations count
        const violationsMatch = line.match(/(?:Violations?)[:\s]+(\d+)/i);
        if (violationsMatch) {
            driver.violations = parseInt(violationsMatch[1]);
        }

        // Check if excluded
        if (line.match(/excluded/i) && !line.match(/not\s+excluded/i)) {
            driver.excluded = true;
        }

        drivers.push(driver);
    }

    return drivers;
}

/**
 * Extract AL pricing information from PDF
 * @param {string} text - Full PDF text
 * @returns {Object} Pricing data in cents
 */
function extractALPricing(text) {
    const pricing = {
        subtotal_cents: null,
        fees: {
            policy: null,
            uw: null,
            broker: null
        },
        slt_rate: null,
        stamp_rate: null,
        printed_total_cents: null
    };

    // Find pricing section
    const pricingSection = text.match(/(?:Commercial Automobile Liability|AL).*?Price(?:[\s\S]*?)Total Premium[:\s]+\$?([\d,]+\.?\d*)/i);

    // Extract AL Base Premium / Subtotal
    const subtotalMatch = text.match(/(?:AL Base Premium|Base Premium|Subtotal)[:\s]+\$?([\d,]+\.?\d*)/i);
    if (subtotalMatch) {
        pricing.subtotal_cents = normalizeMoney(subtotalMatch[1]);
    }

    // Extract fees
    const policyFeeMatch = text.match(/Policy Fee[:\s]+\$?([\d,]+\.?\d*)/i);
    if (policyFeeMatch) {
        pricing.fees.policy = normalizeMoney(policyFeeMatch[1]);
    }

    const uwFeeMatch = text.match(/(?:Underwriting Fee|UW Fee)[:\s]+\$?([\d,]+\.?\d*)/i);
    if (uwFeeMatch) {
        pricing.fees.uw = normalizeMoney(uwFeeMatch[1]);
    }

    const brokerFeeMatch = text.match(/Broker Fee[:\s]+\$?([\d,]+\.?\d*)/i);
    if (brokerFeeMatch) {
        pricing.fees.broker = normalizeMoney(brokerFeeMatch[1]);
    }

    // Extract tax rates
    const sltMatch = text.match(/Surplus Lines Tax[:\s]+\(?([\d.]+)%?\)?/i);
    if (sltMatch) {
        pricing.slt_rate = parseFloat(sltMatch[1]) / 100;
    }

    const stampMatch = text.match(/Stamping Fee[:\s]+\(?([\d.]+)%?\)?/i);
    if (stampMatch) {
        pricing.stamp_rate = parseFloat(stampMatch[1]) / 100;
    }

    // Extract total
    const totalMatch = text.match(/Total Premium[:\s]+\$?([\d,]+\.?\d*)/i);
    if (totalMatch) {
        pricing.printed_total_cents = normalizeMoney(totalMatch[1]);
    }

    return pricing;
}

/**
 * Normalize date to ISO 8601 format (YYYY-MM-DD)
 * @param {string|number} dateInput - Date in various formats
 * @returns {string|null} ISO 8601 date string or null
 */
function normalizeDate(dateInput) {
    if (!dateInput) {
        return null;
    }

    try {
        let parsed;

        // Handle Excel serial date (number)
        if (typeof dateInput === 'number') {
            // Excel serial date: days since 1900-01-01
            const excelEpoch = new Date(1900, 0, 1);
            parsed = dayjs(excelEpoch).add(dateInput - 2, 'day'); // -2 to account for Excel bug
        } else {
            // Parse string date
            parsed = dayjs(dateInput);
        }

        if (!parsed.isValid()) {
            return null;
        }

        return parsed.format('YYYY-MM-DD');
    } catch (error) {
        console.warn('Date normalization error:', error);
        return null;
    }
}

/**
 * Normalize money to integer cents
 * @param {string|number} moneyInput - Money in various formats
 * @returns {number} Amount in cents
 */
function normalizeMoney(moneyInput) {
    if (typeof moneyInput === 'number') {
        return Math.round(moneyInput * 100);
    }

    if (typeof moneyInput !== 'string') {
        return 0;
    }

    // Remove currency symbols, commas
    let cleaned = moneyInput.replace(/[$,]/g, '');

    // Handle negative (parentheses or minus)
    const isNegative = cleaned.includes('(') || cleaned.startsWith('-');
    cleaned = cleaned.replace(/[()]/g, '').replace('-', '');

    // Parse as float and convert to cents
    const dollars = parseFloat(cleaned) || 0;
    const cents = Math.round(dollars * 100);

    return isNegative ? -cents : cents;
}

/**
 * Normalize state code to uppercase 2-letter code
 * @param {string} stateInput - State name or code
 * @returns {string|null} 2-letter state code or null
 */
function normalizeStateCode(stateInput) {
    if (!stateInput) {
        return null;
    }

    const input = stateInput.trim().toUpperCase();

    // Already 2-letter code
    if (input.length === 2 && /^[A-Z]{2}$/.test(input)) {
        // Validate against known state codes
        const validStates = [
            'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
            'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
            'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
            'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
            'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
        ];

        return validStates.includes(input) ? input : null;
    }

    // Map full state names to codes
    const stateMap = {
        'TEXAS': 'TX',
        'CALIFORNIA': 'CA',
        'FLORIDA': 'FL',
        'NEW YORK': 'NY',
        'PENNSYLVANIA': 'PA',
        // Add more as needed
    };

    return stateMap[input] || null;
}

/**
 * Normalize vehicle class code
 * @param {string} classInput - Vehicle class in various formats
 * @returns {string} Standardized class code
 */
function normalizeVehicleClass(classInput) {
    if (!classInput) {
        return null;
    }

    const input = classInput.trim().toLowerCase();

    // Extract number from "Class 8" or "class8"
    const match = input.match(/(?:class\s*)?(\d)/i);
    if (match) {
        return match[1];
    }

    // Handle "Class1" special case
    if (input.includes('class1')) {
        return 'Class1';
    }

    return classInput.trim();
}

/**
 * Normalize radius to standard bucket
 * @param {string} radiusInput - Radius in various formats
 * @returns {string} Standardized radius bucket
 */
function normalizeRadius(radiusInput) {
    if (!radiusInput) {
        return null;
    }

    const radius = parseInt(radiusInput);

    if (radius <= 50) return '0-50';
    if (radius <= 200) return '51-200';
    if (radius <= 500) return '201-500';
    return '500+';
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parsePDF,
        extractPolicyHeader,
        extractVehicleSchedule,
        extractDriverSchedule,
        extractALPricing,
        normalizeDate,
        normalizeMoney,
        normalizeStateCode,
        normalizeVehicleClass,
        normalizeRadius
    };
}
