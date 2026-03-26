/**
 * Seed Example Data for Assets and Partials Libraries
 * Based on real Purchase Order and Work Order templates
 */

const assetsStore = require('./assets-store');
const partialsStore = require('./partials-store');

/**
 * Sample logo (simple SVG placeholder)
 */
const sampleLogoSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80" viewBox="0 0 200 80">
  <rect width="200" height="80" fill="#28a745"/>
  <text x="100" y="45" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">
    COMPANY
  </text>
  <text x="100" y="65" font-family="Arial, sans-serif" font-size="12" fill="#CCCCCC" text-anchor="middle">
    Building Excellence
  </text>
</svg>`;

/**
 * Purchase Order Base CSS (Green Theme)
 */
const purchaseOrderCSS = `/* Purchase Order Styles - Green Theme */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: #333;
  background: #f5f5f5;
  padding: 20px;
}

.container {
  max-width: 900px;
  margin: 0 auto;
  background: white;
  padding: 40px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 4px solid #28a745;
}

.company-logo {
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
}

.company-info h1 {
  color: #28a745;
  font-size: 28px;
  margin-bottom: 8px;
}

.company-info p {
  color: #666;
  font-size: 13px;
}

.po-title h2 {
  color: #28a745;
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 10px;
}

.po-number {
  background: #28a745;
  color: white;
  padding: 10px 20px;
  display: inline-block;
  font-size: 18px;
  font-weight: bold;
  border-radius: 4px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin: 25px 0;
}

.info-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 6px;
  border-left: 4px solid #28a745;
}

.info-card h3 {
  color: #28a745;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 30px 0;
}

thead {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
}

th {
  padding: 15px 12px;
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

td {
  padding: 15px 12px;
  border-bottom: 1px solid #e9ecef;
}

tbody tr:hover {
  background: #f8f9fa;
}

.totals-table {
  width: 350px;
  background: #f8f9fa;
  padding: 20px;
  border-radius: 6px;
}

.total-row {
  font-size: 18px;
  font-weight: bold;
  color: #28a745;
  border-top: 2px solid #28a745;
}

.notes-section {
  background: #fff9e6;
  border: 2px dashed #ffc107;
  padding: 20px;
  border-radius: 6px;
  margin: 30px 0;
}

.notes-section h3 {
  color: #856404;
  margin-bottom: 10px;
  font-size: 16px;
}

.terms-section {
  background: #e7f3ff;
  border-left: 4px solid #0066cc;
  padding: 20px;
  margin: 25px 0;
  border-radius: 4px;
}

.terms-section h3 {
  color: #0066cc;
  margin-bottom: 15px;
  font-size: 16px;
}

.signature-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin: 30px 0;
}

.signature-line {
  border-bottom: 2px solid #333;
  margin: 40px 20px 10px;
}

@media print {
  body { background: white; padding: 0; }
  .container { box-shadow: none; }
}`;

/**
 * Work Order Base CSS (Blue Theme)
 */
const workOrderCSS = `/* Work Order Styles - Blue Theme */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: #333;
  background: #f5f5f5;
  padding: 20px;
}

.container {
  max-width: 900px;
  margin: 0 auto;
  background: white;
  padding: 40px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 3px solid #2c5aa0;
}

.company-info h1 {
  color: #2c5aa0;
  font-size: 24px;
  margin-bottom: 5px;
}

.order-number {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
}

.date-info {
  background: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
}

.info-box {
  background: #f8f9fa;
  padding: 15px;
  border-left: 4px solid #2c5aa0;
  margin-bottom: 15px;
}

.section-title {
  color: #2c5aa0;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
}

thead {
  background: #2c5aa0;
  color: white;
}

th, td {
  padding: 12px;
  text-align: left;
  border: 1px solid #ddd;
}

tbody tr:nth-child(even) {
  background: #f8f9fa;
}

.alert-box {
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  padding: 15px;
  margin: 20px 0;
}

.alert-box.info {
  background: #d1ecf1;
  border-color: #0c5460;
}

.alert-box.success {
  background: #d4edda;
  border-color: #28a745;
}

@media print {
  body { background: white; padding: 0; }
  .container { box-shadow: none; padding: 20px; }
}`;

/**
 * PARTIAL: Purchase Order Header (Green Theme)
 */
const partialPOHeader = `<div class="header">
  <div class="logo-section">
    <div class="company-info">
      <h1>{{companyName}}</h1>
      <p><strong>ABN:</strong> {{companyABN}}</p>
      <p>{{companyAddress}}</p>
      <p>{{companyContact}}</p>
    </div>
  </div>
  <div class="po-title">
    <h2>PURCHASE ORDER</h2>
    <div class="po-number">PO-{{orderNumber}}</div>
  </div>
</div>`;

/**
 * PARTIAL: Work Order Header (Blue Theme)
 */
const partialWOHeader = `<div class="header">
  <div class="company-info">
    <h1>{{companyName}}</h1>
    <p>A.B.N. {{companyABN}}</p>
    <p>{{companyDetails}}</p>
  </div>
  <div class="order-details">
    <h2>Work Order Number</h2>
    <div class="order-number">{{orderNumber}}</div>
    <div class="date-info">
      <strong>Date Issued</strong>
      {{orderDate}}
    </div>
    <div class="date-info" style="margin-top: 5px;">
      <strong>Required on Site</strong>
      {{deliveryDate}}
    </div>
  </div>
</div>`;

/**
 * PARTIAL: Vendor Information Card
 */
const partialVendorInfo = `<div class="info-card">
  <h3>Vendor Information</h3>
  <p><strong>{{supplierName}}</strong></p>
  <p>{{supplierAddress}}</p>
  <p>{{supplierCity}}, {{supplierState}} {{supplierPostcode}}</p>
  <p class="label">Contact:</p>
  <p>Phone: {{supplierPhone}}</p>
  <p>Email: {{supplierEmail}}</p>
</div>`;

/**
 * PARTIAL: Order Details Card
 */
const partialOrderDetails = `<div class="info-card">
  <h3>Order Details</h3>
  <p class="label">Order Date:</p>
  <p><strong>{{orderDate}}</strong></p>
  <p class="label">Required Date:</p>
  <p><strong>{{requiredDate}}</strong></p>
  <p class="label">Delivery Location:</p>
  <p>{{deliveryAddress}}</p>
</div>`;

/**
 * PARTIAL: Project Information Card
 */
const partialProjectInfo = `<div class="info-card" style="margin: 20px 0;">
  <h3>Project Information</h3>
  <p><strong>Job Number:</strong> {{jobNumber}}</p>
  <p><strong>Job Address:</strong> {{jobAddress}}</p>
  <p><strong>Site Supervisor:</strong> {{supervisor}}</p>
</div>`;

/**
 * PARTIAL: Purchase Order Line Items Table
 */
const partialPOLineItems = `<table>
  <thead>
    <tr>
      <th style="width: 8%;">Item</th>
      <th style="width: 15%;">Code</th>
      <th style="width: 35%;">Description</th>
      <th style="width: 10%;">Qty</th>
      <th style="width: 10%;">Unit</th>
      <th style="width: 11%;">Unit Price</th>
      <th style="width: 11%;">Total</th>
    </tr>
  </thead>
  <tbody>
    {{#each items}}
    <tr>
      <td>{{@index}}</td>
      <td>{{itemCode}}</td>
      <td>
        {{description}}
        {{#if workup}}
        <br><small style="color: #666;">{{workup}}</small>
        {{/if}}
      </td>
      <td style="text-align: right;">{{quantity}}</td>
      <td>{{unit}}</td>
      <td style="text-align: right;">\${{unitPrice}}</td>
      <td style="text-align: right;">\${{lineTotal}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>`;

/**
 * PARTIAL: Work Order Line Items Table
 */
const partialWOLineItems = `<div class="section">
  <div class="section-title">Please Supply</div>
  <table>
    <thead>
      <tr>
        <th style="width: 15%;">Code</th>
        <th style="width: 40%;">Description</th>
        <th style="width: 10%;">Qty</th>
        <th style="width: 10%;">Unit</th>
        <th style="width: 12%;">Cost</th>
        <th style="width: 13%;">Total</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{itemCode}}</td>
        <td>
          {{description}}
          {{#if workup}}
          <br><small style="color: #666;">{{workup}}</small>
          {{/if}}
        </td>
        <td style="text-align: right;">{{quantity}}</td>
        <td>{{unit}}</td>
        <td style="text-align: right;">\${{unitPrice}}</td>
        <td style="text-align: right;">\${{lineTotal}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
</div>`;

/**
 * PARTIAL: Totals Section
 */
const partialTotals = `<div class="totals-section">
  <div class="totals-table">
    <table>
      <tr>
        <td>Subtotal:</td>
        <td style="text-align: right;"><strong>\${{subtotal}}</strong></td>
      </tr>
      <tr>
        <td>GST (10%):</td>
        <td style="text-align: right;"><strong>\${{gst}}</strong></td>
      </tr>
      <tr class="total-row">
        <td>TOTAL:</td>
        <td style="text-align: right;">\${{total}}</td>
      </tr>
    </table>
  </div>
</div>`;

/**
 * PARTIAL: Notes Section (Yellow Theme)
 */
const partialNotes = `{{#if notes}}
<div class="notes-section">
  <h3>📋 Additional Notes</h3>
  <p>{{notes}}</p>
</div>
{{/if}}`;

/**
 * PARTIAL: Terms & Conditions
 */
const partialTerms = `<div class="terms-section">
  <h3>Terms & Conditions</h3>
  <ul>
    <li>All goods must be delivered to the specified job address</li>
    <li>Invoices must reference this PO number: <strong>PO-{{orderNumber}}</strong></li>
    <li>Work and materials must meet BCOA Standards</li>
    <li>Insurance and safety documentation must be current</li>
    <li>Payment terms: {{paymentTerms}}</li>
    <li>Any variations must be approved in writing before proceeding</li>
  </ul>
</div>`;

/**
 * PARTIAL: Signature Grid (Two Columns)
 */
const partialSignatureGrid = `<div class="signature-grid">
  <div class="signature-box">
    <div class="signature-line"></div>
    <p><strong>Authorized By</strong></p>
    <p>{{authorizer}}</p>
    <p>{{currentDate}}</p>
  </div>
  <div class="signature-box">
    <div class="signature-line"></div>
    <p><strong>Vendor Acceptance</strong></p>
    <p>{{supplierName}}</p>
    <p>{{currentDate}}</p>
  </div>
</div>`;

/**
 * PARTIAL: Work Order Completion Signature
 */
const partialWOSignature = `<div class="signature-section">
  <p><strong>Work Completion Certification:</strong></p>
  <p style="font-size: 13px; margin-top: 10px;">Work has been completed to BCOA Standards and the site has been left in a neat and tidy state.</p>

  <div class="signature-box">
    <div>
      <p style="font-size: 12px; margin-bottom: 5px;">Supervisor Signature:</p>
      <div class="signature-line"></div>
      <p style="margin-top: 5px; font-size: 12px;">{{supervisor}}</p>
    </div>
    <div>
      <p style="font-size: 12px; margin-bottom: 5px;">Date:</p>
      <div class="signature-line"></div>
    </div>
  </div>
</div>`;

/**
 * PARTIAL: Alert Box (Warning/Info)
 */
const partialAlertBox = `<div class="alert-box {{alertType}}">
  <strong>{{alertTitle}}</strong>
  <p>{{alertMessage}}</p>
</div>`;

/**
 * PARTIAL: Work Order Alert - Invoice Requirements
 */
const partialWOInvoiceAlert = `<div class="alert-box info">
  <strong style="color: #0c5460;">Invoice Requirements:</strong>
  <p>All invoices to {{companyName}} <strong>must</strong> contain the Purchase Order Number <strong>{{orderNumber}}</strong> for the invoice to be paid. Invoices not clearly stating the P.O will be returned to the contractor or supplier.</p>
  <p style="margin-top: 10px;">Invoices in excess of the P.O will not be paid without prior written authority from {{companyName}}.</p>
  <p style="margin-top: 10px;">Work carried out and goods supplied must meet the BCOA Standards.</p>
</div>`;

/**
 * PARTIAL: Work Order Alert - Delivery Instructions
 */
const partialWODeliveryAlert = `<div class="alert-box success">
  <strong style="color: #155724;">To Ensure Prompt Attention to Your Invoice:</strong>
  <p>Supply the site supervisor {{supervisor}} with the delivery docket and PO for signing as being completed. Photocopy the signed PO and return with your invoice to our office.</p>
</div>`;

/**
 * PARTIAL: Purchase Order Footer
 */
const partialPOFooter = `<div class="footer">
  <p style="font-size: 11px; color: #666;">
    This purchase order constitutes a legally binding agreement. Please retain a copy for your records.
  </p>
</div>`;

/**
 * PARTIAL: Work Order Footer
 */
const partialWOFooter = `<div class="footer">
  <p>This order is subject to our Standard Terms and Conditions</p>
  <p>Authorised by: {{estimator}}</p>
</div>`;

/**
 * PARTIAL: Two-Column Layout (Supplier + Job)
 */
const partialTwoColumnLayout = `<div class="two-column">
  <div class="section">
    <div class="section-title">Supplier</div>
    <div class="info-box">
      <p><strong>{{supplierName}}</strong></p>
      <p>{{supplierAddress}}</p>
      <p>{{supplierCity}} {{supplierState}} {{supplierPostcode}}</p>
      <p style="margin-top: 10px;">Ph: {{supplierPhone}}</p>
      <p>Contact: {{supplierContact}}</p>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Job Address</div>
    <div class="info-box">
      <p>{{jobAddress}}</p>
      <p style="margin-top: 10px;"><strong>Supervisor:</strong></p>
      <p>{{supervisor}}</p>
    </div>
  </div>
</div>`;

/**
 * Seed Assets Library with examples
 */
function seedAssets() {
  console.log('📦 Seeding Assets Library with examples...');

  try {
    // Check if assets already exist
    const existing = assetsStore.getAllAssets();
    if (existing.length > 0) {
      console.log('ℹ️  Assets already exist. Skipping seed.');
      return { skipped: true, reason: 'Assets already exist' };
    }

    // Add sample logo (SVG as base64)
    const logoBase64 = Buffer.from(sampleLogoSVG).toString('base64');
    assetsStore.addAsset({
      name: 'company-logo.svg',
      type: 'image/svg+xml',
      content: logoBase64,
      category: 'logo',
      size: Buffer.from(sampleLogoSVG).length
    });

    // Add Purchase Order CSS
    const poCssBase64 = Buffer.from(purchaseOrderCSS).toString('base64');
    assetsStore.addAsset({
      name: 'purchase-order-styles.css',
      type: 'text/css',
      content: poCssBase64,
      category: 'css',
      size: Buffer.from(purchaseOrderCSS).length
    });

    // Add Work Order CSS
    const woCssBase64 = Buffer.from(workOrderCSS).toString('base64');
    assetsStore.addAsset({
      name: 'work-order-styles.css',
      type: 'text/css',
      content: woCssBase64,
      category: 'css',
      size: Buffer.from(workOrderCSS).length
    });

    console.log('✅ Assets seeded: 3 items (1 logo, 2 CSS files)');
    return { success: true, count: 3 };
  } catch (error) {
    console.error('❌ Error seeding assets:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Seed Partials Library with production-ready templates
 */
function seedPartials() {
  console.log('🧩 Seeding Partials Library with examples...');

  try {
    // Check if partials already exist
    const existing = partialsStore.getAllPartials();
    if (existing.length > 0) {
      console.log('ℹ️  Partials already exist. Skipping seed.');
      return { skipped: true, reason: 'Partials already exist' };
    }

    // Headers
    partialsStore.savePartial({
      name: 'poHeader',
      description: 'Purchase Order header with green theme and company info',
      content: partialPOHeader,
      category: 'header'
    });

    partialsStore.savePartial({
      name: 'woHeader',
      description: 'Work Order header with blue theme and order number',
      content: partialWOHeader,
      category: 'header'
    });

    // Information Cards
    partialsStore.savePartial({
      name: 'vendorInfo',
      description: 'Vendor/Supplier information card with contact details',
      content: partialVendorInfo,
      category: 'section'
    });

    partialsStore.savePartial({
      name: 'orderDetails',
      description: 'Order dates and delivery location card',
      content: partialOrderDetails,
      category: 'section'
    });

    partialsStore.savePartial({
      name: 'projectInfo',
      description: 'Project/Job information with supervisor details',
      content: partialProjectInfo,
      category: 'section'
    });

    partialsStore.savePartial({
      name: 'twoColumnLayout',
      description: 'Two-column layout for supplier and job address (WO style)',
      content: partialTwoColumnLayout,
      category: 'section'
    });

    // Line Items Tables
    partialsStore.savePartial({
      name: 'poLineItems',
      description: 'Purchase Order line items table with green header',
      content: partialPOLineItems,
      category: 'lineItem'
    });

    partialsStore.savePartial({
      name: 'woLineItems',
      description: 'Work Order line items table with blue header',
      content: partialWOLineItems,
      category: 'lineItem'
    });

    // Totals and Notes
    partialsStore.savePartial({
      name: 'totals',
      description: 'Subtotal, GST, and Total calculation section',
      content: partialTotals,
      category: 'section'
    });

    partialsStore.savePartial({
      name: 'notes',
      description: 'Additional notes section with yellow highlight',
      content: partialNotes,
      category: 'section'
    });

    partialsStore.savePartial({
      name: 'terms',
      description: 'Terms & Conditions section with blue theme',
      content: partialTerms,
      category: 'section'
    });

    // Alerts
    partialsStore.savePartial({
      name: 'alertBox',
      description: 'Generic alert box (warning/info/success)',
      content: partialAlertBox,
      category: 'other'
    });

    partialsStore.savePartial({
      name: 'woInvoiceAlert',
      description: 'Work Order invoice requirements alert',
      content: partialWOInvoiceAlert,
      category: 'other'
    });

    partialsStore.savePartial({
      name: 'woDeliveryAlert',
      description: 'Work Order delivery instructions alert',
      content: partialWODeliveryAlert,
      category: 'other'
    });

    // Signatures
    partialsStore.savePartial({
      name: 'signatureGrid',
      description: 'Two-column signature section for PO authorization',
      content: partialSignatureGrid,
      category: 'footer'
    });

    partialsStore.savePartial({
      name: 'woSignature',
      description: 'Work Order completion certification signature',
      content: partialWOSignature,
      category: 'footer'
    });

    // Footers
    partialsStore.savePartial({
      name: 'poFooter',
      description: 'Purchase Order footer with legal notice',
      content: partialPOFooter,
      category: 'footer'
    });

    partialsStore.savePartial({
      name: 'woFooter',
      description: 'Work Order footer with terms and authorization',
      content: partialWOFooter,
      category: 'footer'
    });

    console.log('✅ Partials seeded: 18 production-ready templates');
    return { success: true, count: 18 };
  } catch (error) {
    console.error('❌ Error seeding partials:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Seed both Assets and Partials
 */
function seedAll() {
  console.log('🌱 Seeding example data for Assets and Partials...\n');

  const assetsResult = seedAssets();
  const partialsResult = seedPartials();

  console.log('\n📊 Seed Summary:');
  console.log('Assets:', assetsResult);
  console.log('Partials:', partialsResult);

  return {
    assets: assetsResult,
    partials: partialsResult
  };
}

/**
 * Clear all example data (useful for re-seeding)
 */
function clearAll() {
  console.log('🗑️  Clearing all example data...');

  const assetsCount = assetsStore.clearAllAssets();
  const partialsCount = partialsStore.clearAllPartials();

  console.log(`✅ Cleared ${assetsCount} assets and ${partialsCount} partials`);

  return {
    assetsCleared: assetsCount,
    partialsCleared: partialsCount
  };
}

module.exports = {
  seedAssets,
  seedPartials,
  seedAll,
  clearAll
};
