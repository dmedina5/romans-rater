/**
 * Roman's Rater 4.21 - OCR Module
 * Handles optical character recognition for image-based PDF pages
 * Tasks: T047-T050
 */

/**
 * Perform OCR on a PDF page
 * @param {PDFPageProxy} pdfPage - PDF.js page object
 * @param {number} pageNumber - Page number for logging
 * @returns {Promise<Object>} OCR result with text and confidence
 */
async function ocrPage(pdfPage, pageNumber) {
    console.log(`Starting OCR for page ${pageNumber}...`);

    try {
        // Render page to canvas at high DPI (300 DPI equivalent)
        const scale = 3.0;
        const viewport = pdfPage.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Apply preprocessing filters for better OCR accuracy
        context.filter = 'contrast(150%) grayscale(100%)';

        // Render PDF page to canvas
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };

        await pdfPage.render(renderContext).promise;

        console.log(`Page ${pageNumber} rendered to canvas (${canvas.width}x${canvas.height})`);

        // Perform OCR using Tesseract.js
        const result = await Tesseract.recognize(
            canvas,
            'eng', // English language model
            {
                tessedit_pageseg_mode: 6, // PSM mode 6: Assume uniform block of text
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,/$:- ()',
                logger: (info) => {
                    if (info.status === 'recognizing text') {
                        console.log(`OCR progress: ${Math.round(info.progress * 100)}%`);
                    }
                }
            }
        );

        const confidence = result.data.confidence || 0;
        const needsReview = confidence < 85;

        console.log(`OCR complete for page ${pageNumber}. Confidence: ${confidence.toFixed(1)}%`);

        return {
            text: result.data.text || '',
            confidence: confidence,
            needsReview: needsReview,
            pageNumber: pageNumber
        };

    } catch (error) {
        console.error(`OCR error on page ${pageNumber}:`, error);
        return {
            text: '',
            confidence: 0,
            needsReview: true,
            pageNumber: pageNumber,
            error: error.message
        };
    }
}

/**
 * Batch OCR multiple pages
 * @param {PDFDocumentProxy} pdf - PDF.js document object
 * @param {number[]} pageNumbers - Array of page numbers to process
 * @returns {Promise<Object[]>} Array of OCR results
 */
async function ocrPages(pdf, pageNumbers) {
    const results = [];

    for (const pageNum of pageNumbers) {
        try {
            const page = await pdf.getPage(pageNum);
            const result = await ocrPage(page, pageNum);
            results.push(result);
        } catch (error) {
            console.error(`Failed to OCR page ${pageNum}:`, error);
            results.push({
                text: '',
                confidence: 0,
                needsReview: true,
                pageNumber: pageNum,
                error: error.message
            });
        }
    }

    return results;
}

/**
 * Check if Tesseract is available and initialized
 * @returns {boolean} True if Tesseract is available
 */
function isOcrAvailable() {
    return typeof Tesseract !== 'undefined';
}

/**
 * Preprocess image for better OCR results
 * @param {HTMLCanvasElement} canvas - Canvas with image
 * @returns {HTMLCanvasElement} Preprocessed canvas
 */
function preprocessCanvas(canvas) {
    const context = canvas.getContext('2d');

    // Get image data
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Apply preprocessing filters
    for (let i = 0; i < data.length; i += 4) {
        // Convert to grayscale
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;

        // Apply contrast enhancement
        const contrast = 1.5;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        const adjusted = factor * (avg - 128) + 128;

        // Apply thresholding (binarization)
        const threshold = 128;
        const binary = adjusted > threshold ? 255 : 0;

        data[i] = binary;     // R
        data[i + 1] = binary; // G
        data[i + 2] = binary; // B
        // Alpha channel unchanged
    }

    // Put processed image data back
    context.putImageData(imageData, 0, 0);

    return canvas;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ocrPage,
        ocrPages,
        isOcrAvailable,
        preprocessCanvas
    };
}
