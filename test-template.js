/**
 * Test script to render a purchase order template with sample data
 * Run with: node test-template.js
 */

const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

// Register Handlebars helpers
Handlebars.registerHelper('formatDate', function(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-AU');
});

Handlebars.registerHelper('formatNumber', function(value, decimals = 2) {
  if (value === null || value === undefined) return '0';
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
});

Handlebars.registerHelper('currency', function(amount) {
  if (amount === null || amount === undefined) return '$0.00';
  return '$' + parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
});

Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
  return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});

// Load template
const templatePath = path.join(__dirname, 'src', 'templates', 'purchase-orders', 'default', 'classic-po.hbs');
const templateSource = fs.readFileSync(templatePath, 'utf-8');
const template = Handlebars.compile(templateSource);

// Sample data with all new fields
const sampleData = {
  OrderNumber: '1483/250.1',
  OrderDate: new Date('2024-07-12'),
  DelDate: new Date('2024-07-20'),  // NEW FIELD
  SpecialInstructions: 'Please deliver to back entrance after 2pm. Call supervisor on arrival.',  // NEW FIELD
  JobNo: '1483',
  JobName: 'Sample Construction Project - 123 Main Street',
  Client: 'ABC Construction Pty Ltd',
  ClientAddress: '456 Business Ave, Sydney NSW 2000',  // NEW FIELD
  ClientPhone: '02 9876 5432',  // NEW FIELD
  ClientMobile: '0412 345 678',  // NEW FIELD

  // Site Address - NEW SECTION
  SiteStreet: '45 Construction Avenue',
  SiteSuburb: 'Parramatta',
  SiteState: 'NSW',

  // Supervisor - NEW SECTION
  Supervisor: 'Mike Johnson',
  SupervisorPhone: '02 9876 5432',
  SupervisorMobile: '0412 345 678',

  CostCentre: '250',
  CostCentreName: 'Sand & Cement',
  SupplierCode: 'SHEP001',
  SupplierName: 'Shepherds Group (NSW) Pty Ltd',

  // Supplier Details - UPDATED SECTION
  AccountContact: 'John Smith',
  AccountPhone: '02 1234 5678',
  AccountEmail: 'john.smith@supplier.com.au',
  AccountAddress: '123 Supply Street',
  AccountCity: 'Sydney',
  AccountState: 'NSW',
  AccountPostcode: '2000',

  items: [
    {
      ItemCode: 'CEM001',
      Description: 'Cement - General Purpose 20kg',
      Quantity: 50,
      Unit: 'bag',
      UnitPrice: 12.50,
      LineTotal: 625.00,
      Workup: null
    },
    {
      ItemCode: 'SAND001',
      Description: 'Sand - Washed River Sand',
      Quantity: 10,
      Unit: 't',
      UnitPrice: 45.00,
      LineTotal: 450.00,
      Workup: 'Delivered in bulk, spread evenly across site'
    }
  ],

  standardNotes: [],
  globalNotes: [],

  SubTotal: 1075.00,
  GSTAmount: 107.50,
  GrandTotal: 1182.50,

  currentDate: new Date(),

  // Customizations - THIS IS KEY!
  customizations: {
    sections: {
      showCompanyHeader: true,
      showJobDetails: true,      // ← Must be true to show Order Details, Site Address, Supervisor
      showSupplierAddress: true,  // ← Must be true to show Supplier section
      showNotes: true,
      showFooter: true
    },
    colors: {
      primary: '#003366',
      secondary: '#0066cc'
    },
    fonts: {},
    content: {
      companyName: 'Sample Construction Company',
      footerText: 'Thank you for your business'
    }
  },

  // Display flags
  showPrices: true,
  showLinePrices: true,
  showSupplierRef: false,
  gstMode: 'total',

  job: {
    UDF1: null,
    UDF2: null,
    UDF3: null,
    UDF4: null,
    UDF5: null,
    UDF6: null,
    UDF7: null,
    UDF8: null,
    UDF9: null,
    UDF10: null
  }
};

// Render template
console.log('Rendering template with sample data...\n');
console.log('Customizations:', JSON.stringify(sampleData.customizations, null, 2));
console.log('\n=== NEW FIELDS ===');
console.log('DelDate:', sampleData.DelDate);
console.log('SiteStreet:', sampleData.SiteStreet);
console.log('Supervisor:', sampleData.Supervisor);
console.log('AccountContact:', sampleData.AccountContact);
console.log('SpecialInstructions:', sampleData.SpecialInstructions);
console.log('==================\n');

const html = template(sampleData);

// Save output
const outputPath = path.join(__dirname, 'test-output.html');
fs.writeFileSync(outputPath, html);

console.log('✅ Template rendered successfully!');
console.log('📄 Output saved to:', outputPath);
console.log('\n🌐 Open this file in your browser to see the rendered purchase order.');
console.log('\nSearching for new sections in HTML...');

// Check if sections are present
const checks = [
  { name: 'Delivery Date section', pattern: /Delivery Date:/i },
  { name: 'Site Address section', pattern: /<h3>Site Address<\/h3>/i },
  { name: 'Site Supervisor section', pattern: /<h3>Site Supervisor<\/h3>/i },
  { name: 'Special Instructions section', pattern: /<h3>Special Instructions<\/h3>/i },
  { name: 'Supplier Contact', pattern: /Contact:/i },
  { name: 'Supplier Email', pattern: /Email:/i }
];

checks.forEach(check => {
  const found = check.pattern.test(html);
  console.log(`${found ? '✅' : '❌'} ${check.name}: ${found ? 'FOUND' : 'NOT FOUND'}`);
});
