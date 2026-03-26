const jsreport = require('jsreport-core')();
const path = require('path');
const { getPool, getJobDatabaseName, getSystemDatabaseName } = require('../database/connection');

/**
 * ReportRenderer - JSReport-based rendering engine for all reports
 *
 * This service uses jsreport-core (free, LGPL) as the rendering engine.
 * Templates are stored in electron-store and sent inline with render requests,
 * so the 5-template limit does not apply.
 *
 * Key Features:
 * - HTML to PDF via Chrome headless (jsreport-chrome-pdf)
 * - Handlebars templating with custom helpers
 * - Asset management for logos/images
 * - No template storage in jsreport (unlimited free usage)
 * - Compatible with existing template-renderer.js API
 */
class ReportRenderer {
  constructor() {
    this.jsreport = null;
    this.initialized = false;
    this.initializing = false;
  }

  /**
   * Initialize jsreport instance with required extensions
   * Only initializes once (singleton pattern)
   */
  async init() {
    // Prevent multiple simultaneous initializations
    if (this.initialized) return;
    if (this.initializing) {
      // Wait for ongoing initialization
      while (this.initializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.initializing = true;
    console.log('Initializing jsreport-core...');

    try {
      // Register extensions
      jsreport.use(require('jsreport-handlebars')());
      jsreport.use(require('jsreport-chrome-pdf')());
      jsreport.use(require('jsreport-assets')());

      // Configure jsreport
      await jsreport.init({
        // Disable template storage (we use electron-store instead)
        store: {
          provider: 'memory'
        },
        // Disable extensions we don't need
        extensions: {
          express: { enabled: false },  // No web server
          studio: { enabled: false },    // No visual designer
          authentication: { enabled: false },
          authorization: { enabled: false },
          licensing: { enabled: false }  // Free version
        },
        // Chrome PDF settings
        chrome: {
          timeout: 30000,  // 30 second timeout
          launchOptions: {
            args: ['--no-sandbox', '--disable-setuid-sandbox']
          }
        },
        // Handlebars settings
        handlebars: {
          allowedModules: '*'
        },
        // Logging
        logger: {
          silent: false
        }
      });

      // Register custom Handlebars helpers
      this.registerHelpers();

      this.initialized = true;
      this.initializing = false;
      console.log('✓ jsreport-core initialized successfully');

    } catch (error) {
      this.initializing = false;
      console.error('Error initializing jsreport:', error);
      throw new Error(`Failed to initialize jsreport: ${error.message}`);
    }
  }

  /**
   * Register custom Handlebars helpers on the global Handlebars instance
   * (used for HTML preview rendering)
   */
  registerHelpers() {
    const Handlebars = require('handlebars');

    // Currency formatting helper
    Handlebars.registerHelper('currency', (value) => {
      if (value === null || value === undefined) return '$0.00';
      const num = parseFloat(value);
      if (isNaN(num)) return '$0.00';
      return `$${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    });

    // Alias for currency helper
    Handlebars.registerHelper('formatCurrency', (value) => {
      if (value === null || value === undefined) return '$0.00';
      const num = parseFloat(value);
      if (isNaN(num)) return '$0.00';
      return `$${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    });

    // Number formatting helper
    Handlebars.registerHelper('formatNumber', (value, decimals = 2) => {
      if (value === null || value === undefined) return '0';
      const num = parseFloat(value);
      if (isNaN(num)) return '0';
      return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    });

    // Date formatting helper
    Handlebars.registerHelper('formatDate', (date, format) => {
      if (!date) return '';
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';

      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();

      if (format === 'MM/DD/YYYY') {
        return `${month}/${day}/${year}`;
      } else if (format === 'YYYY-MM-DD') {
        return `${year}-${month}-${day}`;
      }
      return `${day}/${month}/${year}`;
    });

    // Conditional equality helper
    Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
      return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
    });

    // Conditional NOT equality helper
    Handlebars.registerHelper('ifNotEquals', function(arg1, arg2, options) {
      return (arg1 !== arg2) ? options.fn(this) : options.inverse(this);
    });

    // GST calculation helper
    Handlebars.registerHelper('calculateGST', (amount, rate = 0.10) => {
      if (!amount) return 0;
      return parseFloat(amount) * parseFloat(rate);
    });

    // Logical OR helper
    Handlebars.registerHelper('or', function() {
      return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
    });

    // Logical AND helper
    Handlebars.registerHelper('and', function() {
      return Array.prototype.slice.call(arguments, 0, -1).every(Boolean);
    });

    // Math helpers
    Handlebars.registerHelper('add', function(a, b) {
      return Number(a) + Number(b);
    });

    Handlebars.registerHelper('subtract', function(a, b) {
      return Number(a) - Number(b);
    });

    Handlebars.registerHelper('multiply', function(a, b) {
      return Number(a) * Number(b);
    });

    // String helpers
    Handlebars.registerHelper('startsWith', function(str, prefix) {
      if (!str || !prefix) return false;
      return String(str).startsWith(String(prefix));
    });

    // Line total calculation helper - handles percentage units
    Handlebars.registerHelper('calculateLineTotal', function(quantity, unitPrice, unit) {
      const qty = parseFloat(quantity) || 0;
      const price = parseFloat(unitPrice) || 0;

      // If unit is %, calculate as percentage of unit price
      if (unit === '%') {
        return price * (qty / 100);
      }

      // Standard calculation
      return qty * price;
    });

    console.log('✓ Custom Handlebars helpers registered');
  }

  /**
   * Get helpers as a JavaScript string to pass to jsreport
   * This is needed because jsreport uses its own Handlebars instance
   */
  getHelpersString() {
    return `
function currency(value) {
  if (value === null || value === undefined) return '$0.00';
  const num = parseFloat(value);
  if (isNaN(num)) return '$0.00';
  return '$' + num.toFixed(2).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');
}

function formatCurrency(value) {
  if (value === null || value === undefined) return '$0.00';
  const num = parseFloat(value);
  if (isNaN(num)) return '$0.00';
  return '$' + num.toFixed(2).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');
}

function formatNumber(value, decimals) {
  decimals = decimals || 2;
  if (value === null || value === undefined) return '0';
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  return num.toFixed(decimals).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');
}

function formatDate(date, format) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  if (format === 'MM/DD/YYYY') {
    return month + '/' + day + '/' + year;
  } else if (format === 'YYYY-MM-DD') {
    return year + '-' + month + '-' + day;
  }
  return day + '/' + month + '/' + year;
}

function ifEquals(arg1, arg2, options) {
  return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
}

function ifNotEquals(arg1, arg2, options) {
  return (arg1 !== arg2) ? options.fn(this) : options.inverse(this);
}

function calculateGST(amount, rate) {
  rate = rate || 0.10;
  if (!amount) return 0;
  return parseFloat(amount) * parseFloat(rate);
}

function or() {
  return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
}

function and() {
  return Array.prototype.slice.call(arguments, 0, -1).every(Boolean);
}

function add(a, b) {
  return Number(a) + Number(b);
}

function subtract(a, b) {
  return Number(a) - Number(b);
}

function multiply(a, b) {
  return Number(a) * Number(b);
}

function startsWith(str, prefix) {
  if (!str || !prefix) return false;
  return String(str).startsWith(String(prefix));
}

function calculateLineTotal(quantity, unitPrice, unit) {
  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;

  // If unit is %, calculate as percentage of unit price
  if (unit === '%') {
    return price * (qty / 100);
  }

  // Standard calculation
  return qty * price;
}
`;
  }

  /**
   * Render a report to PDF
   * @param {string} htmlContent - Full HTML template content
   * @param {Object} data - Data to pass to template
   * @param {Object} options - Rendering options
   * @returns {Promise<Buffer>} PDF as Buffer
   */
  async renderToPDF(htmlContent, data, options = {}) {
    await this.init();

    try {
      console.log('Rendering report to PDF...');
      console.log('htmlContent type:', typeof htmlContent);
      console.log('htmlContent is undefined?', htmlContent === undefined);
      console.log('htmlContent is null?', htmlContent === null);

      if (!htmlContent) {
        throw new Error('htmlContent is required but was: ' + htmlContent);
      }

      console.log('Data keys:', Object.keys(data));
      console.log('Template length:', htmlContent.length);

      const result = await jsreport.render({
        template: {
          content: htmlContent,
          engine: 'handlebars',
          recipe: 'chrome-pdf',
          helpers: this.getHelpersString(),
          chrome: {
            format: options.format || 'A4',
            landscape: options.landscape || false,
            printBackground: true,
            displayHeaderFooter: options.displayHeaderFooter || false,
            marginTop: options.marginTop || '10mm',
            marginBottom: options.marginBottom || '10mm',
            marginLeft: options.marginLeft || '10mm',
            marginRight: options.marginRight || '10mm',
            ...options.chrome
          }
        },
        data: data
      });

      console.log('✓ PDF rendered successfully, size:', result.content.length, 'bytes');
      return result.content;

    } catch (error) {
      console.error('Error rendering to PDF:', error);
      throw new Error(`Failed to render PDF: ${error.message}`);
    }
  }

  /**
   * Render a report to HTML (for preview)
   * Uses Handlebars directly instead of jsreport for faster preview rendering
   * @param {string} htmlContent - Full HTML template content
   * @param {Object} data - Data to pass to template
   * @returns {Promise<string>} Rendered HTML
   */
  async renderToHTML(htmlContent, data) {
    await this.init();

    try {
      console.log('Rendering report to HTML...');
      console.log('Template content length:', htmlContent?.length);
      console.log('Data object keys:', data ? Object.keys(data).join(', ') : 'NO DATA');

      // Use Handlebars directly for HTML preview (faster than jsreport)
      const Handlebars = require('handlebars');

      // Compile the template
      const template = Handlebars.compile(htmlContent);

      // Render with data
      const htmlString = template(data);

      console.log('✓ HTML rendered with Handlebars, length:', htmlString.length);
      console.log('First 100 chars:', htmlString.substring(0, 100));

      return htmlString;

    } catch (error) {
      console.error('Error rendering to HTML:', error);
      console.error('Error stack:', error.stack);
      throw new Error(`Failed to render HTML: ${error.message}`);
    }
  }

  /**
   * Main render function - Compatible with existing template-renderer.js API
   * @param {string} orderNumber - Order number to render
   * @param {string} templateContent - HTML template content
   * @param {Object} settings - Rendering settings
   * @returns {Promise<Buffer>} Rendered PDF
   */
  async renderOrder(orderNumber, templateContent, settings = {}) {
    try {
      console.log('===== renderOrder called =====');
      console.log('orderNumber:', orderNumber);
      console.log('templateContent type:', typeof templateContent);
      console.log('templateContent length:', templateContent?.length || 'N/A');
      console.log('templateContent first 100 chars:', templateContent?.substring(0, 100) || 'NONE');
      console.log('settings:', settings);

      if (!templateContent) {
        throw new Error('templateContent parameter is required but was: ' + templateContent);
      }

      // 1. Gather complete order data from database (or use sample data for demo orders)
      let orderData;
      if (orderNumber && orderNumber.startsWith('DEMO')) {
        console.log('Using sample data for demo order:', orderNumber);
        orderData = this.getSampleData();
        orderData.OrderNumber = orderNumber;
        orderData.job.jobNo = orderNumber.split('/')[0];
      } else {
        orderData = await this.gatherOrderData(orderNumber);
      }

      // 2. Apply price display settings
      const processedData = this.applyPriceSettings(orderData, settings);

      // 3. Calculate totals
      const withTotals = this.calculateTotals(processedData, settings);

      // 4. Replace UDF variables in notes
      const finalData = this.replaceUDFVariables(withTotals);

      // 5. Add current date
      finalData.currentDate = new Date();

      // 6. Merge with customizations
      finalData.customizations = {
        sections: {
          showCompanyHeader: true,
          showJobDetails: true,
          showSupplierAddress: true,
          showNotes: true,
          showFooter: true
        },
        colors: {},
        fonts: {},
        content: {},
        ...settings.customizations
      };

      // Ensure nested objects are merged properly
      if (settings.customizations && settings.customizations.sections) {
        finalData.customizations.sections = {
          ...finalData.customizations.sections,
          ...settings.customizations.sections
        };
      }

      // 7. Add display flags
      finalData.showPrices = settings.priceDisplay !== 'none';
      finalData.showLinePrices = settings.priceDisplay === 'all';
      finalData.showSupplierRef = settings.codeDisplay === 'supplier' || settings.codeDisplay === 'both';
      finalData.gstMode = settings.gstMode || 'total';

      // 8. Render to PDF using jsreport
      const pdf = await this.renderToPDF(templateContent, finalData, {
        format: settings.format || 'A4',
        landscape: settings.landscape || false
      });

      return pdf;

    } catch (error) {
      console.error('Error rendering order:', error);
      throw new Error(`Failed to render order: ${error.message}`);
    }
  }

  /**
   * Gather all order data from database
   * (Copied from original template-renderer.js)
   */
  async gatherOrderData(orderNumber) {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const jobDbName = getJobDatabaseName();
    const sysDbName = getSystemDatabaseName();

    if (!jobDbName) {
      throw new Error('Job Database not configured');
    }

    try {
      // Parse order number: JobNo/CostCentre.BLoad
      const [jobPart, bLoad] = orderNumber.split('.');
      const [jobNo, costCentre] = jobPart.split('/');

      // Query order header information
      const headerQuery = `
        SELECT TOP 1
          o.OrderNumber,
          o.Supplier,
          o.CCSortOrder,
          o.OrderDate,
          o.DelDate,
          o.Note AS SpecialInstructions,
          j.Job_No AS JobNo,
          ISNULL(c.Address, 'Job ' + j.Job_No) AS JobName,
          c.Name AS Client,
          c.Address AS ClientAddress,
          c.Phone AS ClientPhone,
          c.Mobile AS ClientMobile,
          j.SiteStreet,
          j.SiteSuburb,
          j.SiteState,
          j.Supervisor,
          sup.Phone AS SupervisorPhone,
          sup.Mobile AS SupervisorMobile,
          j.UDF1, j.UDF2, j.UDF3, j.UDF4, j.UDF5,
          j.UDF6, j.UDF7, j.UDF8, j.UDF9, j.UDF10,
          s.SupplierName,
          s.AccountContact,
          s.AccountPhone,
          s.AccountEmail,
          s.AccountAddress,
          s.AccountCity,
          s.AccountState,
          s.AccountPostcode,
          cc.Code AS CostCentre,
          cc.Name AS CostCentreName
        FROM [${jobDbName}].[dbo].[Orders] o
        LEFT JOIN [${jobDbName}].[dbo].[Jobs] j ON j.Job_No = '${jobNo}'
        LEFT JOIN [${sysDbName}].[dbo].[Contacts] c ON j.Job_No = c.Code
        LEFT JOIN [${sysDbName}].[dbo].[Contacts] sup ON j.Supervisor = sup.Name
        LEFT JOIN [${sysDbName}].[dbo].[Supplier] s ON o.Supplier = s.Supplier_Code
        LEFT JOIN [${sysDbName}].[dbo].[CostCentres] cc ON cc.Code = '${costCentre}' AND cc.Tier = 1
        WHERE o.OrderNumber = @OrderNumber
      `;

      const headerResult = await pool.request()
        .input('OrderNumber', orderNumber)
        .query(headerQuery);

      let orderHeader = headerResult.recordset[0];

      // If order doesn't exist in Orders table yet (unlogged), create basic header
      if (!orderHeader) {
        const basicHeaderQuery = `
          SELECT TOP 1
            '${orderNumber}' AS OrderNumber,
            NULL AS Supplier,
            NULL AS CCSortOrder,
            GETDATE() AS OrderDate,
            NULL AS DelDate,
            NULL AS SpecialInstructions,
            j.Job_No AS JobNo,
            ISNULL(c.Address, 'Job ' + j.Job_No) AS JobName,
            c.Name AS Client,
            c.Address AS ClientAddress,
            c.Phone AS ClientPhone,
            c.Mobile AS ClientMobile,
            j.SiteStreet,
            j.SiteSuburb,
            j.SiteState,
            j.Supervisor,
            sup.Phone AS SupervisorPhone,
            sup.Mobile AS SupervisorMobile,
            j.UDF1, j.UDF2, j.UDF3, j.UDF4, j.UDF5,
            j.UDF6, j.UDF7, j.UDF8, j.UDF9, j.UDF10,
            NULL AS SupplierName,
            NULL AS AccountContact,
            NULL AS AccountPhone,
            NULL AS AccountEmail,
            NULL AS AccountAddress,
            NULL AS AccountCity,
            NULL AS AccountState,
            NULL AS AccountPostcode,
            cc.Code AS CostCentre,
            cc.Name AS CostCentreName
          FROM [${jobDbName}].[dbo].[Jobs] j
          LEFT JOIN [${sysDbName}].[dbo].[Contacts] c ON j.Job_No = c.Code
          LEFT JOIN [${sysDbName}].[dbo].[Contacts] sup ON j.Supervisor = sup.Name
          CROSS JOIN [${sysDbName}].[dbo].[CostCentres] cc
          WHERE j.Job_No = '${jobNo}'
            AND cc.Code = '${costCentre}'
            AND cc.Tier = 1
        `;

        const basicResult = await pool.request().query(basicHeaderQuery);
        orderHeader = basicResult.recordset[0];
      }

      if (!orderHeader) {
        throw new Error(`Order ${orderNumber} not found`);
      }

      // Build supplier address string
      let supplierAddress = '';
      if (orderHeader.AccountAddress) supplierAddress += orderHeader.AccountAddress;
      if (orderHeader.AccountCity) {
        if (supplierAddress) supplierAddress += ', ';
        supplierAddress += orderHeader.AccountCity;
      }
      if (orderHeader.AccountState) {
        if (supplierAddress) supplierAddress += ', ';
        supplierAddress += orderHeader.AccountState;
      }
      if (orderHeader.AccountPostcode) {
        if (supplierAddress) supplierAddress += ' ';
        supplierAddress += orderHeader.AccountPostcode;
      }

      // Query line items
      const itemsQuery = `
        SELECT
          b.ItemCode,
          b.CostCentre,
          b.Quantity,
          b.UnitPrice AS CatalogPrice,
          ISNULL(sp.Price, b.UnitPrice) AS UnitPrice,
          sp.Price AS SupplierPrice,
          b.XDescription AS Workup,
          pl.Description,
          pc.Printout AS Unit,
          sp.Reference AS SupplierReference,
          (b.Quantity * ISNULL(sp.Price, b.UnitPrice)) AS LineTotal
        FROM [${jobDbName}].[dbo].[Bill] b
        LEFT JOIN [${sysDbName}].[dbo].[PriceList] pl ON b.ItemCode = pl.PriceCode
        LEFT JOIN [${sysDbName}].[dbo].[PerCodes] pc ON pl.PerCode = pc.Code
        LEFT JOIN [${sysDbName}].[dbo].[SuppliersPrices] sp
          ON sp.ItemCode = b.ItemCode
          AND sp.Supplier = @Supplier
        WHERE b.JobNo = @JobNo
          AND b.CostCentre = @CostCentre
          AND b.BLoad = @BLoad
          AND b.Quantity > 0
        ORDER BY b.LineNumber
      `;

      const itemsResult = await pool.request()
        .input('JobNo', jobNo)
        .input('CostCentre', costCentre)
        .input('BLoad', parseInt(bLoad))
        .input('Supplier', orderHeader.Supplier)
        .query(itemsQuery);

      // Build complete order data object
      const orderData = {
        OrderNumber: orderHeader.OrderNumber,
        OrderDate: orderHeader.OrderDate,
        DelDate: orderHeader.DelDate,
        SpecialInstructions: orderHeader.SpecialInstructions,
        JobNo: orderHeader.JobNo,
        JobName: orderHeader.JobName,
        Client: orderHeader.Client,
        ClientAddress: orderHeader.ClientAddress,
        ClientPhone: orderHeader.ClientPhone,
        ClientMobile: orderHeader.ClientMobile,
        SiteStreet: orderHeader.SiteStreet,
        SiteSuburb: orderHeader.SiteSuburb,
        SiteState: orderHeader.SiteState,
        Supervisor: orderHeader.Supervisor,
        SupervisorPhone: orderHeader.SupervisorPhone,
        SupervisorMobile: orderHeader.SupervisorMobile,
        CostCentre: orderHeader.CostCentre,
        CostCentreName: orderHeader.CostCentreName,
        SupplierCode: orderHeader.Supplier,
        SupplierName: orderHeader.SupplierName || 'To Be Assigned',
        AccountContact: orderHeader.AccountContact,
        AccountPhone: orderHeader.AccountPhone,
        AccountEmail: orderHeader.AccountEmail,
        AccountAddress: orderHeader.AccountAddress,
        AccountCity: orderHeader.AccountCity,
        AccountState: orderHeader.AccountState,
        AccountPostcode: orderHeader.AccountPostcode,
        SupplierContact: orderHeader.AccountContact,
        SupplierPhone: orderHeader.AccountPhone,
        SupplierEmail: orderHeader.AccountEmail,
        SupplierAddress: supplierAddress,
        items: itemsResult.recordset,
        standardNotes: [],
        globalNotes: [],
        job: {
          UDF1: orderHeader.UDF1,
          UDF2: orderHeader.UDF2,
          UDF3: orderHeader.UDF3,
          UDF4: orderHeader.UDF4,
          UDF5: orderHeader.UDF5,
          UDF6: orderHeader.UDF6,
          UDF7: orderHeader.UDF7,
          UDF8: orderHeader.UDF8,
          UDF9: orderHeader.UDF9,
          UDF10: orderHeader.UDF10
        }
      };

      return orderData;

    } catch (error) {
      console.error('Error gathering order data:', error);
      throw error;
    }
  }

  /**
   * Apply price display settings
   */
  applyPriceSettings(data, settings) {
    const modified = { ...data };

    switch (settings.priceDisplay) {
      case 'none':
        modified.items = modified.items.map(item => ({
          ...item,
          UnitPrice: null,
          LineTotal: null
        }));
        break;

      case 'totalOnly':
        break;

      case 'supplierOnly':
        modified.items = modified.items.map(item => ({
          ...item,
          hasSupplierPrice: item.SupplierPrice !== null,
          priceSource: item.SupplierPrice !== null ? 'supplier' : 'catalog'
        }));
        break;

      case 'all':
      default:
        break;
    }

    return modified;
  }

  /**
   * Calculate totals with GST
   */
  calculateTotals(data, settings) {
    const modified = { ...data };

    const subTotal = modified.items.reduce((sum, item) => {
      const qty = parseFloat(item.Quantity) || 0;
      const price = parseFloat(item.UnitPrice) || 0;

      // If unit is %, calculate as percentage of unit price
      if (item.Unit === '%') {
        return sum + (price * (qty / 100));
      }

      // Standard calculation
      return sum + (qty * price);
    }, 0);

    modified.SubTotal = subTotal;

    switch (settings.gstMode) {
      case 'none':
        modified.GSTAmount = 0;
        modified.GrandTotal = subTotal;
        break;

      case 'perLine':
      case 'total':
        modified.GSTAmount = subTotal * 0.10;
        modified.GrandTotal = subTotal + modified.GSTAmount;
        break;

      default:
        modified.GSTAmount = 0;
        modified.GrandTotal = subTotal;
    }

    return modified;
  }

  /**
   * Replace UDF variables in notes
   */
  replaceUDFVariables(data) {
    const modified = { ...data };

    const udfMap = {
      '[job udf1]': data.job.UDF1 || '',
      '[job udf2]': data.job.UDF2 || '',
      '[job udf3]': data.job.UDF3 || '',
      '[job udf4]': data.job.UDF4 || '',
      '[job udf5]': data.job.UDF5 || '',
      '[job udf6]': data.job.UDF6 || '',
      '[job udf7]': data.job.UDF7 || '',
      '[job udf8]': data.job.UDF8 || '',
      '[job udf9]': data.job.UDF9 || '',
      '[job udf10]': data.job.UDF10 || ''
    };

    if (modified.standardNotes && modified.standardNotes.length > 0) {
      modified.standardNotes = modified.standardNotes.map(note => {
        let noteText = note.NoteText;
        Object.keys(udfMap).forEach(key => {
          noteText = noteText.replace(new RegExp(key, 'gi'), udfMap[key]);
        });
        return { ...note, NoteText: noteText };
      });
    }

    if (modified.globalNotes && modified.globalNotes.length > 0) {
      modified.globalNotes = modified.globalNotes.map(note => {
        let noteText = note.NoteText;
        Object.keys(udfMap).forEach(key => {
          noteText = noteText.replace(new RegExp(key, 'gi'), udfMap[key]);
        });
        return { ...note, NoteText: noteText };
      });
    }

    return modified;
  }

  /**
   * Get sample order data for template previews
   */
  getSampleData() {
    return {
      OrderNumber: '001/CONC.1',
      OrderDate: new Date(),
      DelDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      SpecialInstructions: 'Please deliver to back entrance after 2pm. Call supervisor on arrival.',
      JobNo: '001',
      JobName: 'Sample Construction Project',
      Client: 'ABC Developments Pty Ltd',
      ClientAddress: '789 Client Tower, Business District NSW 2000',
      ClientPhone: '(02) 9555 1234',
      ClientMobile: '0412 555 123',
      Address: '123 Construction St, Building City NSW 2000',
      SiteStreet: '123 Construction Street',
      SiteSuburb: 'Building City',
      SiteState: 'NSW',
      Supervisor: 'Mike Johnson',
      SupervisorPhone: '(02) 9876 1111',
      SupervisorMobile: '0412 345 678',
      CostCentre: 'CONC',
      CostCentreName: 'Concrete Works',
      SupplierCode: 'SUPP001',
      SupplierName: 'Premium Concrete Suppliers',
      SupplierContact: 'John Smith',
      SupplierPhone: '(02) 9876 5432',
      SupplierEmail: 'orders@premiumconcrete.com.au',
      SupplierAddress: '456 Supplier Road, Industrial Park NSW 2100',
      AccountContact: 'John Smith',
      AccountPhone: '(02) 9876 5432',
      AccountEmail: 'orders@premiumconcrete.com.au',
      AccountAddress: '456 Supplier Road',
      AccountCity: 'Industrial Park',
      AccountState: 'NSW',
      AccountPostcode: '2100',
      items: [
        {
          ItemCode: 'CONC-40MPA',
          Description: '40 MPa Concrete Mix',
          Quantity: 25.5,
          Unit: 'm³',
          UnitPrice: 185.00,
          LineTotal: 4717.50,
          SupplierReference: 'PC-40MPA',
          Workup: 'Delivery required by 8:00 AM, pump access available'
        },
        {
          ItemCode: 'MESH-F72',
          Description: 'F72 Reinforcing Mesh',
          Quantity: 150,
          Unit: 'm²',
          UnitPrice: 12.50,
          LineTotal: 1875.00,
          SupplierReference: 'MESH-F72-6X2.4',
          Workup: null
        },
        {
          ItemCode: 'REBAR-N12',
          Description: 'N12 Reinforcing Bar',
          Quantity: 500,
          Unit: 'm',
          UnitPrice: 3.25,
          LineTotal: 1625.00,
          SupplierReference: 'RB-N12',
          Workup: 'Cut to length as per drawing'
        }
      ],
      standardNotes: [],
      globalNotes: [],
      job: {
        UDF1: '123 Construction St, Building City NSW 2000',
        UDF2: 'Site Manager: Jane Doe',
        UDF3: 'Contact: 0412 345 678',
        UDF4: '',
        UDF5: '',
        UDF6: '',
        UDF7: '',
        UDF8: '',
        UDF9: '',
        UDF10: ''
      },
      SubTotal: 8217.50,
      GSTAmount: 821.75,
      GrandTotal: 9039.25,
      currentDate: new Date()
    };
  }

  /**
   * Clear initialization state (useful for testing)
   */
  async shutdown() {
    if (this.initialized && this.jsreport) {
      console.log('Shutting down jsreport...');
      // jsreport-core doesn't have a close method, just reset state
      this.initialized = false;
      this.jsreport = null;
      console.log('✓ jsreport shutdown complete');
    }
  }
}

// Export singleton instance
module.exports = new ReportRenderer();
