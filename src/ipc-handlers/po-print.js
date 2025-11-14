/**
 * IPC Handlers for Purchase Order Printing and PDF Operations
 *
 * Handles:
 * - Print preview
 * - Direct printing
 * - Save as PDF with file dialog
 * - PDF generation settings
 */

const { dialog, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const templateRenderer = require('../services/template-renderer');

/**
 * Print a purchase order
 * Opens a hidden window with the rendered HTML and triggers print dialog
 */
async function printOrder(event, orderNumber, settings = {}) {
  try {
    console.log('Print order:', orderNumber, settings);

    // Get the rendered HTML
    const renderer = new templateRenderer();
    const renderResult = await renderer.renderOrder(
      orderNumber,
      settings.template || 'classic-po',
      settings
    );

    if (!renderResult.success) {
      return {
        success: false,
        message: renderResult.message || 'Failed to render order'
      };
    }

    // Create a hidden window for printing
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // Load the HTML content
    await printWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(renderResult.html)}`
    );

    // Wait for content to load
    await new Promise(resolve => {
      printWindow.webContents.on('did-finish-load', resolve);
    });

    // Open print dialog
    const printed = await printWindow.webContents.print({
      silent: false,
      printBackground: true,
      margins: {
        marginType: 'printableArea'
      }
    });

    // Close the hidden window
    printWindow.close();

    return {
      success: true,
      printed
    };

  } catch (error) {
    console.error('Error printing order:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Save purchase order as PDF
 * Opens file dialog and saves the rendered HTML as PDF
 */
async function saveOrderAsPDF(event, orderNumber, settings = {}) {
  try {
    console.log('Save order as PDF:', orderNumber, settings);

    // Get the rendered HTML
    const renderer = new templateRenderer();
    const renderResult = await renderer.renderOrder(
      orderNumber,
      settings.template || 'classic-po',
      settings
    );

    if (!renderResult.success) {
      return {
        success: false,
        message: renderResult.message || 'Failed to render order'
      };
    }

    // Parse order number to get job details for filename
    const orderParts = orderNumber.split('/');
    const jobNo = orderParts[0] || 'order';
    const costCentrePart = orderParts[1] || 'unknown';
    const defaultFilename = `PO_${jobNo}_${costCentrePart.replace('.', '_')}.pdf`;

    // Show save dialog
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Save Purchase Order as PDF',
      defaultPath: defaultFilename,
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (canceled || !filePath) {
      return {
        success: false,
        message: 'Save cancelled',
        cancelled: true
      };
    }

    // Create a hidden window for PDF generation
    const pdfWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // Load the HTML content
    await pdfWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(renderResult.html)}`
    );

    // Wait for content to load
    await new Promise(resolve => {
      pdfWindow.webContents.on('did-finish-load', resolve);
    });

    // Generate PDF with settings
    const pdfData = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: settings.pageSize || 'A4',
      margins: {
        top: settings.marginTop || 0.5,
        bottom: settings.marginBottom || 0.5,
        left: settings.marginLeft || 0.5,
        right: settings.marginRight || 0.5
      },
      landscape: settings.landscape || false,
      preferCSSPageSize: true
    });

    // Close the hidden window
    pdfWindow.close();

    // Save the PDF file
    await fs.writeFile(filePath, pdfData);

    console.log('PDF saved successfully:', filePath);

    return {
      success: true,
      filePath,
      message: 'PDF saved successfully'
    };

  } catch (error) {
    console.error('Error saving PDF:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Generate PDF data without saving (for email attachments, etc.)
 */
async function generateOrderPDF(event, orderNumber, settings = {}) {
  try {
    console.log('Generate order PDF:', orderNumber);

    // Get the rendered HTML
    const renderer = new templateRenderer();
    const renderResult = await renderer.renderOrder(
      orderNumber,
      settings.template || 'classic-po',
      settings
    );

    if (!renderResult.success) {
      return {
        success: false,
        message: renderResult.message || 'Failed to render order'
      };
    }

    // Create a hidden window for PDF generation
    const pdfWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // Load the HTML content
    await pdfWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(renderResult.html)}`
    );

    // Wait for content to load
    await new Promise(resolve => {
      pdfWindow.webContents.on('did-finish-load', resolve);
    });

    // Generate PDF
    const pdfData = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: settings.pageSize || 'A4',
      margins: {
        top: settings.marginTop || 0.5,
        bottom: settings.marginBottom || 0.5,
        left: settings.marginLeft || 0.5,
        right: settings.marginRight || 0.5
      },
      landscape: settings.landscape || false,
      preferCSSPageSize: true
    });

    // Close the hidden window
    pdfWindow.close();

    // Convert buffer to base64 for transmission
    const base64PDF = pdfData.toString('base64');

    return {
      success: true,
      pdfData: base64PDF,
      message: 'PDF generated successfully'
    };

  } catch (error) {
    console.error('Error generating PDF:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Get PDF settings defaults
 */
function getPDFSettings(event) {
  return {
    success: true,
    settings: {
      pageSize: 'A4',
      marginTop: 0.5,
      marginBottom: 0.5,
      marginLeft: 0.5,
      marginRight: 0.5,
      landscape: false,
      printBackground: true,
      preferCSSPageSize: true
    }
  };
}

module.exports = {
  printOrder,
  saveOrderAsPDF,
  generateOrderPDF,
  getPDFSettings
};
