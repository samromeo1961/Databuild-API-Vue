# Purchase Order Output System - Technical Plan

## Overview

This document outlines the technical architecture and implementation plan for displaying, printing, saving to PDF, and emailing Purchase Orders in the DBx Connector Vue application.

## Architecture Overview

```
Order Data (SQL) → Template Engine → HTML Preview → Output
                                           ↓
                                    Print / PDF / Email
```

## Technical Stack Selection

### Template Format: HTML + CSS (Not RTF)

**Rationale:**
- RTF is difficult to work with in Node.js/Electron environment
- HTML/CSS provides superior layout control and modern styling
- Electron has native HTML-to-PDF conversion via Chromium
- Easier template editing for users (WYSIWYG possible)
- Better support for dynamic content and conditional rendering

**Template Engine: Handlebars.js**
- Simple variable substitution: `{{JobNo}}`, `{{OrderNumber}}`
- Conditional rendering: `{{#if showPrices}}...{{/if}}`
- Loops for line items: `{{#each items}}...{{/each}}`
- Helpers for formatting (currency, dates, calculations)

### PDF Generation: Electron BrowserWindow.printToPDF()

**Approach:**
- Use Electron's built-in Chromium print-to-PDF capability
- Create hidden BrowserWindow for background PDF generation
- Load rendered HTML template into window
- Call `printToPDF()` with options (page size, margins, orientation)
- No external dependencies needed

### Email: Nodemailer

**Library:** `nodemailer` (industry standard for Node.js email)
- SMTP support for corporate email servers
- Attachment support for PDF files
- HTML email bodies
- Batch sending capability
- Gmail, Outlook, custom SMTP support

## System Components

### 1. Template Management System

**Location:** `src/templates/purchase-orders/`

**Directory Structure:**
```
src/templates/purchase-orders/
├── default-po.hbs          # Default Purchase Order template
├── default-rfq.hbs         # Default Request for Quote template
├── custom/                 # User-created custom templates
│   ├── company-po.hbs
│   └── minimal-rfq.hbs
├── partials/               # Reusable template fragments
│   ├── header.hbs          # Company header/logo
│   ├── footer.hbs          # Footer with page numbers
│   ├── line-items.hbs      # Line item table
│   ├── notes.hbs           # Standard/Global notes
│   └── totals.hbs          # Price totals and GST
└── styles/
    ├── default.css         # Default styling
    └── print.css           # Print-specific styles
```

**Template Variables:**

**Job Fields:**
- `{{JobNo}}` - Job number
- `{{JobName}}` - Job description
- `{{Client}}` - Client name
- `{{Address}}` - Job site address
- `{{StartDate}}` - Project start date (formatted)
- `{{UDF1}}` through `{{UDF10}}` - User-defined fields

**Order Fields:**
- `{{OrderNumber}}` - Format: JobNo/CostCentre.BLoad
- `{{OrderDate}}` - Order date (formatted)
- `{{CostCentre}}` - Cost centre code
- `{{CostCentreName}}` - Cost centre name
- `{{OutputType}}` - PO, RFQ-Current, RFQ-All, RFQ-Area

**Supplier Fields:**
- `{{SupplierCode}}` - Supplier code
- `{{SupplierName}}` - Supplier name
- `{{SupplierContact}}` - Contact person
- `{{SupplierPhone}}` - Phone number
- `{{SupplierEmail}}` - Email address
- `{{SupplierAddress}}` - Full address (multiline)

**Line Items Array:** `{{#each items}}`
- `{{ItemCode}}` - Internal price code
- `{{SupplierReference}}` - Supplier's reference (if configured)
- `{{Description}}` - Item description
- `{{Workup}}` - Extended description/notes (XDescription)
- `{{Quantity}}` - Quantity (formatted)
- `{{Unit}}` - Unit of measure
- `{{UnitPrice}}` - Price per unit (if showing prices)
- `{{LineTotal}}` - Line total (Quantity × UnitPrice)

**Notes Arrays:**
- `{{#each standardNotes}}` - Standard notes attached to this order
- `{{#each globalNotes}}` - Global notes (appear on all orders)

**Totals:**
- `{{SubTotal}}` - Sum of all line items
- `{{GSTAmount}}` - GST amount (if applicable)
- `{{GrandTotal}}` - SubTotal + GST

**Settings/Flags:**
- `{{showPrices}}` - Boolean for price display
- `{{showLinePrices}}` - Boolean for individual line prices
- `{{showTotalOnly}}` - Boolean for total only mode
- `{{showSupplierPricesOnly}}` - Boolean for supplier price filter
- `{{gstMode}}` - 'none', 'perLine', 'total'
- `{{showOurCode}}` - Boolean for internal code display
- `{{showSupplierRef}}` - Boolean for supplier reference display

### 2. Template Rendering Engine

**Location:** `src/services/template-renderer.js`

**Responsibilities:**
1. Load template files from disk
2. Compile Handlebars templates
3. Gather order data from database
4. Apply price display settings
5. Calculate totals and GST
6. Replace UDF variables in notes
7. Format dates and currency
8. Render final HTML

**Key Functions:**

```javascript
class TemplateRenderer {
  constructor() {
    this.handlebars = require('handlebars');
    this.registerHelpers();
  }

  // Register custom Handlebars helpers
  registerHelpers() {
    // Currency formatting
    this.handlebars.registerHelper('currency', (value) => {
      return `$${parseFloat(value).toFixed(2)}`;
    });

    // Date formatting
    this.handlebars.registerHelper('formatDate', (date) => {
      return new Date(date).toLocaleDateString('en-AU');
    });

    // Conditional price display
    this.handlebars.registerHelper('showPrice', (item, settings) => {
      // Logic for price display based on settings
    });

    // GST calculation
    this.handlebars.registerHelper('calculateGST', (amount, rate = 0.10) => {
      return amount * rate;
    });
  }

  // Main render function
  async renderOrder(orderData, templateName, settings) {
    // 1. Load template
    const template = await this.loadTemplate(templateName);

    // 2. Gather complete order data
    const data = await this.gatherOrderData(orderData);

    // 3. Apply price settings
    const processedData = this.applyPriceSettings(data, settings);

    // 4. Calculate totals
    const finalData = this.calculateTotals(processedData, settings);

    // 5. Replace UDF variables in notes
    const withUDFs = this.replaceUDFVariables(finalData);

    // 6. Render HTML
    const html = template(withUDFs);

    return html;
  }

  // Gather all order data from database
  async gatherOrderData(orderNumber) {
    // Query Job, Bill, Orders, Supplier, StandardNotes, GlobalNotes
    // Join all related data
    // Return structured object
  }

  // Apply price display settings
  applyPriceSettings(data, settings) {
    switch(settings.priceDisplay) {
      case 'none':
        data.showPrices = false;
        break;
      case 'totalOnly':
        data.showPrices = true;
        data.showLinePrices = false;
        break;
      case 'all':
        data.showPrices = true;
        data.showLinePrices = true;
        break;
      case 'supplierOnly':
        // Filter items with supplier prices only
        data.items = data.items.filter(item => item.hasSupplierPrice);
        data.showPrices = true;
        data.showLinePrices = true;
        break;
    }
    return data;
  }

  // Calculate totals with GST
  calculateTotals(data, settings) {
    const subTotal = data.items.reduce((sum, item) => {
      return sum + (item.Quantity * item.UnitPrice);
    }, 0);

    data.SubTotal = subTotal;

    switch(settings.gstMode) {
      case 'none':
        data.GSTAmount = 0;
        data.GrandTotal = subTotal;
        break;
      case 'perLine':
      case 'total':
        data.GSTAmount = subTotal * 0.10; // 10% GST
        data.GrandTotal = subTotal + data.GSTAmount;
        break;
    }

    return data;
  }

  // Replace UDF variables like [job udf1] with actual values
  replaceUDFVariables(data) {
    const udfMap = {
      '[job udf1]': data.job.UDF1 || '',
      '[job udf2]': data.job.UDF2 || '',
      '[job udf3]': data.job.UDF3 || '',
      // ... up to UDF10
    };

    // Replace in all note texts
    data.standardNotes.forEach(note => {
      Object.keys(udfMap).forEach(key => {
        note.NoteText = note.NoteText.replace(new RegExp(key, 'g'), udfMap[key]);
      });
    });

    data.globalNotes.forEach(note => {
      Object.keys(udfMap).forEach(key => {
        note.NoteText = note.NoteText.replace(new RegExp(key, 'g'), udfMap[key]);
      });
    });

    return data;
  }
}
```

### 3. Preview System

**Location:** `frontend/src/components/PurchaseOrders/OrderPreviewModal.vue`

**Features:**
- Live preview of rendered order
- Settings panel for price display, GST mode, template selection
- Real-time updates when settings change
- Action buttons: Print, Save PDF, Email, Close

**Implementation:**

```vue
<template>
  <div class="modal-dialog modal-xl">
    <div class="modal-content">
      <!-- Header -->
      <div class="modal-header">
        <h5>Order Preview: {{ orderNumber }}</h5>
        <button @click="close" class="btn-close"></button>
      </div>

      <!-- Settings Panel -->
      <div class="settings-panel">
        <div class="row">
          <div class="col-md-3">
            <label>Template</label>
            <select v-model="settings.template" @change="refreshPreview">
              <option value="default-po">Default PO</option>
              <option value="default-rfq">Default RFQ</option>
              <option v-for="t in customTemplates" :value="t.name">
                {{ t.displayName }}
              </option>
            </select>
          </div>

          <div class="col-md-3">
            <label>Price Display</label>
            <select v-model="settings.priceDisplay" @change="refreshPreview">
              <option value="all">Show All Prices</option>
              <option value="totalOnly">Total Only</option>
              <option value="none">No Prices</option>
              <option value="supplierOnly">Supplier Prices Only</option>
            </select>
          </div>

          <div class="col-md-3">
            <label>GST Mode</label>
            <select v-model="settings.gstMode" @change="refreshPreview">
              <option value="none">No GST</option>
              <option value="perLine">GST Per Line</option>
              <option value="total">GST on Total (Default)</option>
            </select>
          </div>

          <div class="col-md-3">
            <label>Item Code Display</label>
            <select v-model="settings.codeDisplay" @change="refreshPreview">
              <option value="our">Our Code Only</option>
              <option value="supplier">Supplier Reference Only</option>
              <option value="both">Both Codes</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Preview Area -->
      <div class="modal-body preview-container">
        <div class="preview-frame" v-html="previewHTML"></div>
      </div>

      <!-- Actions -->
      <div class="modal-footer">
        <button @click="print" class="btn btn-secondary">
          <i class="bi bi-printer"></i> Print
        </button>
        <button @click="savePDF" class="btn btn-primary">
          <i class="bi bi-file-pdf"></i> Save as PDF
        </button>
        <button @click="showEmailDialog" class="btn btn-success">
          <i class="bi bi-envelope"></i> Email
        </button>
        <button @click="close" class="btn btn-outline-secondary">Close</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      orderNumber: '',
      settings: {
        template: 'default-po',
        priceDisplay: 'all',
        gstMode: 'total',
        codeDisplay: 'our'
      },
      previewHTML: '',
      customTemplates: []
    }
  },

  methods: {
    async refreshPreview() {
      // Call backend to render template with current settings
      const result = await this.api.purchaseOrders.renderPreview(
        this.orderNumber,
        this.settings
      );
      this.previewHTML = result.html;
    },

    async print() {
      // Call backend to trigger print dialog
      await this.api.purchaseOrders.print(this.orderNumber, this.settings);
    },

    async savePDF() {
      // Show save dialog, then generate PDF
      const result = await this.api.purchaseOrders.savePDF(
        this.orderNumber,
        this.settings
      );
      if (result.success) {
        this.$emit('pdf-saved', result.filePath);
      }
    },

    showEmailDialog() {
      // Show email composition modal
      this.$emit('show-email', {
        orderNumber: this.orderNumber,
        settings: this.settings
      });
    }
  }
}
</script>

<style scoped>
.preview-container {
  max-height: 600px;
  overflow-y: auto;
  background: #f5f5f5;
  padding: 20px;
}

.preview-frame {
  background: white;
  padding: 40px;
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
  min-height: 800px;
}

.settings-panel {
  padding: 15px;
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}
</style>
```

### 4. PDF Generation Service

**Location:** `src/services/pdf-generator.js`

**Implementation using Electron's built-in capabilities:**

```javascript
const { BrowserWindow } = require('electron');
const fs = require('fs').promises;
const path = require('path');

class PDFGenerator {
  constructor(templateRenderer) {
    this.renderer = templateRenderer;
  }

  async generatePDF(orderNumber, settings, outputPath = null) {
    try {
      // 1. Render HTML
      const html = await this.renderer.renderOrder(orderNumber, settings.template, settings);

      // 2. Create hidden BrowserWindow
      const window = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      // 3. Load HTML content
      await window.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
      );

      // 4. Wait for content to render
      await new Promise(resolve => setTimeout(resolve, 500));

      // 5. Generate PDF
      const pdfData = await window.webContents.printToPDF({
        pageSize: 'A4',
        margins: {
          top: 20,
          bottom: 20,
          left: 20,
          right: 20
        },
        printBackground: true,
        landscape: false
      });

      // 6. Close window
      window.close();

      // 7. Save to file if path provided
      if (outputPath) {
        await fs.writeFile(outputPath, pdfData);
        return { success: true, filePath: outputPath };
      } else {
        // Return buffer for email attachment
        return { success: true, buffer: pdfData };
      }

    } catch (error) {
      console.error('PDF generation error:', error);
      return { success: false, message: error.message };
    }
  }

  async print(orderNumber, settings) {
    try {
      // Similar to PDF generation, but use webContents.print() instead
      const html = await this.renderer.renderOrder(orderNumber, settings.template, settings);

      const window = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      await window.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
      );

      await new Promise(resolve => setTimeout(resolve, 500));

      // Show print dialog
      await window.webContents.print({
        silent: false, // Show print dialog
        printBackground: true
      });

      window.close();

      return { success: true };

    } catch (error) {
      console.error('Print error:', error);
      return { success: false, message: error.message };
    }
  }

  // Batch PDF generation for multiple orders
  async generateBatchPDF(orderNumbers, settings, outputDir) {
    const results = [];

    for (const orderNum of orderNumbers) {
      const filename = `PO_${orderNum.replace(/\//g, '_')}.pdf`;
      const outputPath = path.join(outputDir, filename);

      const result = await this.generatePDF(orderNum, settings, outputPath);
      results.push({ orderNumber: orderNum, ...result });
    }

    return results;
  }
}

module.exports = PDFGenerator;
```

### 5. Email Service

**Location:** `src/services/email-service.js`

**Dependencies:** `npm install nodemailer`

**Implementation:**

```javascript
const nodemailer = require('nodemailer');
const fs = require('fs').promises;

class EmailService {
  constructor(pdfGenerator) {
    this.pdfGenerator = pdfGenerator;
    this.transporter = null;
  }

  // Initialize SMTP connection
  async initialize(emailSettings) {
    this.transporter = nodemailer.createTransport({
      host: emailSettings.smtpHost,
      port: emailSettings.smtpPort,
      secure: emailSettings.smtpSecure, // true for 465, false for 587
      auth: {
        user: emailSettings.smtpUser,
        pass: emailSettings.smtpPass
      }
    });

    // Verify connection
    try {
      await this.transporter.verify();
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Send single order email
  async sendOrderEmail(orderNumber, recipientEmail, settings, emailTemplate) {
    try {
      // 1. Generate PDF
      const pdfResult = await this.pdfGenerator.generatePDF(
        orderNumber,
        settings,
        null // No file path, return buffer
      );

      if (!pdfResult.success) {
        return pdfResult;
      }

      // 2. Get order data for email template
      const orderData = await this.getOrderData(orderNumber);

      // 3. Compose email
      const subject = this.replaceVariables(
        emailTemplate.subject,
        orderData
      );

      const htmlBody = this.replaceVariables(
        emailTemplate.body,
        orderData
      );

      // 4. Send email
      const info = await this.transporter.sendMail({
        from: settings.fromEmail,
        to: recipientEmail,
        subject: subject,
        html: htmlBody,
        attachments: [
          {
            filename: `PO_${orderNumber.replace(/\//g, '_')}.pdf`,
            content: pdfResult.buffer,
            contentType: 'application/pdf'
          }
        ]
      });

      return {
        success: true,
        messageId: info.messageId,
        to: recipientEmail
      };

    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, message: error.message };
    }
  }

  // Batch send emails to multiple suppliers
  async sendBatchEmails(orders, settings, emailTemplate) {
    const results = [];

    for (const order of orders) {
      // Get supplier email from order
      const supplierEmail = order.supplierEmail;

      if (!supplierEmail) {
        results.push({
          orderNumber: order.orderNumber,
          success: false,
          message: 'No email address for supplier'
        });
        continue;
      }

      const result = await this.sendOrderEmail(
        order.orderNumber,
        supplierEmail,
        settings,
        emailTemplate
      );

      results.push({
        orderNumber: order.orderNumber,
        ...result
      });

      // Small delay to avoid overwhelming SMTP server
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  // Replace template variables in email subject/body
  replaceVariables(template, data) {
    let result = template;

    const replacements = {
      '{OrderNumber}': data.orderNumber,
      '{JobNo}': data.jobNo,
      '{JobName}': data.jobName,
      '{SupplierName}': data.supplierName,
      '{CostCentre}': data.costCentre,
      '{OrderDate}': data.orderDate,
      '{Total}': data.total
    };

    Object.keys(replacements).forEach(key => {
      result = result.replace(new RegExp(key, 'g'), replacements[key]);
    });

    return result;
  }

  async getOrderData(orderNumber) {
    // Query database for order details needed for email template
    // Return basic order info
  }
}

module.exports = EmailService;
```

### 6. Email Configuration UI

**Location:** `frontend/src/components/PurchaseOrders/EmailSettingsModal.vue`

**Features:**
- SMTP server configuration
- Email template editor (subject + body)
- Test email functionality
- Save/load email settings from electron-store

**Email Template Variables:**
- `{OrderNumber}` - Order number
- `{JobNo}` - Job number
- `{JobName}` - Job name
- `{SupplierName}` - Supplier name
- `{CostCentre}` - Cost centre name
- `{OrderDate}` - Order date
- `{Total}` - Order total (if showing prices)

**Default Email Template:**

**Subject:**
```
Purchase Order {OrderNumber} - {JobName}
```

**Body:**
```html
<p>Dear {SupplierName},</p>

<p>Please find attached Purchase Order <strong>{OrderNumber}</strong> for the following project:</p>

<ul>
  <li><strong>Job:</strong> {JobName}</li>
  <li><strong>Cost Centre:</strong> {CostCentre}</li>
  <li><strong>Date:</strong> {OrderDate}</li>
</ul>

<p>Please confirm receipt and provide delivery timeframes at your earliest convenience.</p>

<p>Best regards,<br>
DBx Connector Team</p>
```

### 7. IPC Handlers

**Location:** `src/ipc-handlers/purchase-order-output.js`

**Endpoints:**

```javascript
const TemplateRenderer = require('../services/template-renderer');
const PDFGenerator = require('../services/pdf-generator');
const EmailService = require('../services/email-service');

const renderer = new TemplateRenderer();
const pdfGen = new PDFGenerator(renderer);
const emailService = new EmailService(pdfGen);

// Render preview HTML
async function renderPreview(event, orderNumber, settings) {
  try {
    const html = await renderer.renderOrder(orderNumber, settings.template, settings);
    return { success: true, html };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// Print order
async function printOrder(event, orderNumber, settings) {
  return await pdfGen.print(orderNumber, settings);
}

// Save PDF
async function savePDF(event, orderNumber, settings) {
  const { dialog } = require('electron');

  // Show save dialog
  const result = await dialog.showSaveDialog({
    title: 'Save Purchase Order PDF',
    defaultPath: `PO_${orderNumber.replace(/\//g, '_')}.pdf`,
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] }
    ]
  });

  if (result.canceled) {
    return { success: false, message: 'Save cancelled' };
  }

  return await pdfGen.generatePDF(orderNumber, settings, result.filePath);
}

// Send email
async function sendEmail(event, orderNumber, recipientEmail, settings, emailTemplate) {
  // Initialize email service with saved settings
  const emailSettings = await getEmailSettings(); // From electron-store
  await emailService.initialize(emailSettings);

  return await emailService.sendOrderEmail(
    orderNumber,
    recipientEmail,
    settings,
    emailTemplate
  );
}

// Batch operations
async function batchPDF(event, orderNumbers, settings, outputDir) {
  return await pdfGen.generateBatchPDF(orderNumbers, settings, outputDir);
}

async function batchEmail(event, orders, settings, emailTemplate) {
  const emailSettings = await getEmailSettings();
  await emailService.initialize(emailSettings);

  return await emailService.sendBatchEmails(orders, settings, emailTemplate);
}

module.exports = {
  renderPreview,
  printOrder,
  savePDF,
  sendEmail,
  batchPDF,
  batchEmail
};
```

## Data Flow Diagrams

### Preview Flow
```
User clicks "Preview" on Order
    ↓
Frontend: Open OrderPreviewModal
    ↓
IPC Call: renderPreview(orderNumber, settings)
    ↓
Backend: TemplateRenderer.renderOrder()
    ├── Load template (Handlebars)
    ├── Query database for order data
    ├── Apply price settings
    ├── Calculate totals/GST
    ├── Replace UDF variables
    └── Render HTML
    ↓
Return HTML to Frontend
    ↓
Display in preview modal
```

### PDF Flow
```
User clicks "Save PDF" from Preview
    ↓
Frontend: Show save dialog
    ↓
IPC Call: savePDF(orderNumber, settings, filePath)
    ↓
Backend: PDFGenerator.generatePDF()
    ├── TemplateRenderer.renderOrder() → HTML
    ├── Create hidden BrowserWindow
    ├── Load HTML content
    ├── Call printToPDF()
    └── Save to file
    ↓
Return success + file path
    ↓
Show success message to user
```

### Email Flow
```
User clicks "Email" from Preview
    ↓
Frontend: Show EmailComposerModal
    ├── Pre-fill recipient (supplier email)
    ├── Load email template
    └── Allow editing subject/body
    ↓
User clicks "Send"
    ↓
IPC Call: sendEmail(orderNumber, recipient, settings, template)
    ↓
Backend: EmailService.sendOrderEmail()
    ├── PDFGenerator.generatePDF() → buffer
    ├── Get order data for template variables
    ├── Replace variables in subject/body
    └── nodemailer.sendMail() with PDF attachment
    ↓
Return success/failure
    ↓
Show confirmation to user
```

## Template Examples

### Default Purchase Order Template

**File:** `src/templates/purchase-orders/default-po.hbs`

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Purchase Order {{OrderNumber}}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 11pt;
      margin: 0;
      padding: 0;
    }
    .header {
      border-bottom: 3px solid #333;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .company-name {
      font-size: 24pt;
      font-weight: bold;
      color: #333;
    }
    .document-title {
      font-size: 18pt;
      font-weight: bold;
      text-align: right;
      margin-top: -30px;
    }
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .info-box {
      width: 48%;
    }
    .info-label {
      font-weight: bold;
      display: inline-block;
      width: 120px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background-color: #333;
      color: white;
      padding: 8px;
      text-align: left;
      font-size: 10pt;
    }
    td {
      padding: 6px 8px;
      border-bottom: 1px solid #ddd;
      font-size: 10pt;
    }
    .workup {
      padding-left: 30px;
      font-style: italic;
      color: #666;
      font-size: 9pt;
    }
    .totals-section {
      margin-top: 30px;
      text-align: right;
    }
    .total-row {
      margin: 5px 0;
    }
    .total-label {
      display: inline-block;
      width: 150px;
      font-weight: bold;
    }
    .total-value {
      display: inline-block;
      width: 120px;
      text-align: right;
    }
    .grand-total {
      font-size: 14pt;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 2px solid #333;
    }
    .notes-section {
      margin-top: 30px;
      page-break-inside: avoid;
    }
    .note {
      margin: 10px 0;
      padding: 10px;
      background-color: #f9f9f9;
      border-left: 4px solid #333;
    }
    .footer {
      margin-top: 40px;
      padding-top: 10px;
      border-top: 1px solid #ccc;
      font-size: 9pt;
      text-align: center;
      color: #666;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="company-name">Your Company Name</div>
    <div class="document-title">PURCHASE ORDER</div>
  </div>

  <!-- Order Info -->
  <div class="info-section">
    <div class="info-box">
      <div><span class="info-label">Order Number:</span> {{OrderNumber}}</div>
      <div><span class="info-label">Order Date:</span> {{formatDate OrderDate}}</div>
      <div><span class="info-label">Job Number:</span> {{JobNo}}</div>
      <div><span class="info-label">Job Name:</span> {{JobName}}</div>
      <div><span class="info-label">Cost Centre:</span> {{CostCentre}} - {{CostCentreName}}</div>
    </div>
    <div class="info-box">
      <strong>SUPPLIER:</strong><br>
      {{SupplierName}}<br>
      {{#if SupplierContact}}Attn: {{SupplierContact}}<br>{{/if}}
      {{#if SupplierAddress}}{{SupplierAddress}}<br>{{/if}}
      {{#if SupplierPhone}}Ph: {{SupplierPhone}}<br>{{/if}}
      {{#if SupplierEmail}}Email: {{SupplierEmail}}{{/if}}
    </div>
  </div>

  <!-- Line Items -->
  <table>
    <thead>
      <tr>
        <th style="width: 15%;">Item Code</th>
        {{#if showSupplierRef}}<th style="width: 15%;">Supplier Ref</th>{{/if}}
        <th style="width: {{#if showSupplierRef}}30%{{else}}45%{{/if}};">Description</th>
        <th style="width: 10%; text-align: right;">Qty</th>
        <th style="width: 8%;">Unit</th>
        {{#if showLinePrices}}
        <th style="width: 12%; text-align: right;">Unit Price</th>
        <th style="width: 12%; text-align: right;">Total</th>
        {{/if}}
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{ItemCode}}</td>
        {{#if ../showSupplierRef}}<td>{{SupplierReference}}</td>{{/if}}
        <td>{{Description}}</td>
        <td style="text-align: right;">{{Quantity}}</td>
        <td>{{Unit}}</td>
        {{#if ../showLinePrices}}
        <td style="text-align: right;">{{currency UnitPrice}}</td>
        <td style="text-align: right;">{{currency LineTotal}}</td>
        {{/if}}
      </tr>
      {{#if Workup}}
      <tr>
        <td colspan="{{#if ../showLinePrices}}7{{else}}5{{/if}}" class="workup">
          {{Workup}}
        </td>
      </tr>
      {{/if}}
      {{/each}}
    </tbody>
  </table>

  <!-- Totals -->
  {{#if showPrices}}
  <div class="totals-section">
    <div class="total-row">
      <span class="total-label">Subtotal:</span>
      <span class="total-value">{{currency SubTotal}}</span>
    </div>
    {{#if GSTAmount}}
    {{#if (eq gstMode 'perLine')}}
    <div class="total-row">
      <span class="total-label">GST (10%):</span>
      <span class="total-value">{{currency GSTAmount}}</span>
    </div>
    {{/if}}
    {{#if (eq gstMode 'total')}}
    <div class="total-row">
      <span class="total-label">GST (10%):</span>
      <span class="total-value">{{currency GSTAmount}}</span>
    </div>
    {{/if}}
    {{/if}}
    <div class="total-row grand-total">
      <span class="total-label">TOTAL:</span>
      <span class="total-value">{{currency GrandTotal}}</span>
    </div>
  </div>
  {{/if}}

  <!-- Standard Notes -->
  {{#if standardNotes.length}}
  <div class="notes-section">
    <h3>Notes:</h3>
    {{#each standardNotes}}
    <div class="note">
      <strong>{{NoteCode}}:</strong> {{NoteText}}
    </div>
    {{/each}}
  </div>
  {{/if}}

  <!-- Global Notes -->
  {{#if globalNotes.length}}
  <div class="notes-section">
    {{#each globalNotes}}
    <div class="note">
      {{NoteText}}
    </div>
    {{/each}}
  </div>
  {{/if}}

  <!-- Footer -->
  <div class="footer">
    Purchase Order generated by DBx Connector Vue on {{formatDate currentDate}}
  </div>
</body>
</html>
```

## Storage Schema

### po-settings.json (electron-store)

```json
{
  "defaultTemplate": "default-po",
  "defaultPriceDisplay": "all",
  "defaultGSTMode": "total",
  "defaultCodeDisplay": "our",
  "autoLogOnPreview": false,
  "pdfSaveDirectory": "C:\\Orders\\PDFs",
  "defaultOutputType": "PO"
}
```

### email-settings.json (electron-store)

```json
{
  "smtpHost": "smtp.gmail.com",
  "smtpPort": 587,
  "smtpSecure": false,
  "smtpUser": "orders@yourcompany.com",
  "smtpPass": "encrypted-password",
  "fromEmail": "orders@yourcompany.com",
  "fromName": "Your Company Orders",
  "defaultTemplate": {
    "subject": "Purchase Order {OrderNumber} - {JobName}",
    "body": "<p>Dear {SupplierName},</p><p>Please find attached Purchase Order <strong>{OrderNumber}</strong>...</p>"
  }
}
```

### po-templates.json (electron-store)

```json
{
  "custom": [
    {
      "name": "company-po",
      "displayName": "Company Standard PO",
      "filePath": "src/templates/purchase-orders/custom/company-po.hbs",
      "type": "PO"
    },
    {
      "name": "minimal-rfq",
      "displayName": "Minimal RFQ",
      "filePath": "src/templates/purchase-orders/custom/minimal-rfq.hbs",
      "type": "RFQ"
    }
  ]
}
```

## Implementation Phases

### Phase 1: Core Template System (Week 1)
- [ ] Install Handlebars.js
- [ ] Create TemplateRenderer class
- [ ] Create default PO template
- [ ] Create default RFQ template
- [ ] Implement helper functions (currency, date formatting)
- [ ] Create data gathering queries
- [ ] Implement UDF variable replacement

### Phase 2: Preview System (Week 1-2)
- [ ] Create OrderPreviewModal.vue component
- [ ] Implement settings panel
- [ ] Implement real-time preview refresh
- [ ] Add IPC handler for renderPreview
- [ ] Test with sample order data

### Phase 3: PDF Generation (Week 2)
- [ ] Create PDFGenerator class
- [ ] Implement single PDF generation
- [ ] Implement batch PDF generation
- [ ] Add IPC handlers for PDF operations
- [ ] Test PDF output quality and formatting
- [ ] Add save dialog integration

### Phase 4: Print Functionality (Week 2)
- [ ] Implement print() method in PDFGenerator
- [ ] Add print IPC handler
- [ ] Test print preview and output
- [ ] Add printer selection if needed

### Phase 5: Email System (Week 3)
- [ ] Install nodemailer
- [ ] Create EmailService class
- [ ] Create EmailSettingsModal.vue for SMTP config
- [ ] Create EmailComposerModal.vue for email composition
- [ ] Implement single email sending
- [ ] Implement batch email sending
- [ ] Add email tracking/logging
- [ ] Test with various SMTP servers (Gmail, Outlook, etc.)

### Phase 6: Template Management (Week 3-4)
- [ ] Create template upload/management UI
- [ ] Implement custom template validation
- [ ] Add template preview functionality
- [ ] Create template variable documentation
- [ ] Add template import/export

### Phase 7: Integration & Testing (Week 4)
- [ ] Integrate with main PurchaseOrdersTab
- [ ] Add batch operations UI
- [ ] Comprehensive testing of all workflows
- [ ] Performance optimization
- [ ] Error handling and user feedback
- [ ] Documentation

## Success Criteria

✅ **Preview System:**
- Live preview updates when settings change
- All template variables display correctly
- Price calculations accurate
- GST calculations correct
- Notes display with UDF replacement

✅ **PDF Generation:**
- High-quality PDF output
- Proper page breaks
- Formatting matches preview
- Batch generation works for multiple orders
- PDFs save to user-selected location

✅ **Print Functionality:**
- Print dialog appears correctly
- Print output matches preview
- Page formatting preserved

✅ **Email System:**
- SMTP connection successful
- Emails send with PDF attachments
- Template variables replaced correctly
- Batch emailing works reliably
- Error handling for failed sends

✅ **User Experience:**
- Intuitive workflow
- Fast preview rendering (< 1 second)
- Clear error messages
- Progress indicators for batch operations
- Settings persist between sessions

## Technical Considerations

### Performance
- **Preview Rendering:** Cache rendered HTML for same order/settings
- **Batch Operations:** Process in chunks with progress feedback
- **PDF Generation:** Reuse BrowserWindow where possible
- **Email Sending:** Rate limiting to avoid SMTP throttling

### Error Handling
- Template compilation errors → Show user-friendly message
- PDF generation fails → Fallback to print dialog
- Email send fails → Log error, allow retry, show failed items
- Missing data → Use placeholders or show warnings

### Security
- **Email Credentials:** Encrypt stored SMTP password
- **Template Injection:** Sanitize user-provided template content
- **File Paths:** Validate save paths to prevent directory traversal

### Accessibility
- Print-friendly CSS (avoid dark backgrounds)
- High contrast for readability
- Proper heading hierarchy in templates
- Screen reader compatible preview

## Future Enhancements

- **Template Editor:** WYSIWYG template editor with live preview
- **Cloud Storage:** Save PDFs to cloud storage (Dropbox, Google Drive)
- **SMS Notifications:** Send SMS to supplier contacts
- **Digital Signatures:** Add electronic signature support
- **Multi-language:** Template translations
- **Advanced Formatting:** Rich text editing for notes
- **Audit Trail:** Track all sent orders with timestamps
- **Reporting:** Analytics on order volumes, suppliers, etc.
