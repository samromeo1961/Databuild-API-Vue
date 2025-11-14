const Handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const { getPool, getJobDatabaseName, getSystemDatabaseName } = require('../database/connection');

/**
 * TemplateRenderer - Handles rendering of Purchase Order templates
 *
 * Responsibilities:
 * - Load and compile Handlebars templates
 * - Gather order data from database
 * - Apply price display settings
 * - Calculate totals and GST
 * - Replace UDF variables in notes
 * - Format dates and currency
 * - Render final HTML
 */
class TemplateRenderer {
  constructor() {
    this.handlebars = Handlebars.create();
    this.registerHelpers();
    this.templateCache = new Map();
  }

  /**
   * Register custom Handlebars helpers
   */
  registerHelpers() {
    // Currency formatting helper
    this.handlebars.registerHelper('currency', (value) => {
      if (value === null || value === undefined) return '$0.00';
      const num = parseFloat(value);
      if (isNaN(num)) return '$0.00';
      return `$${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    });

    // Number formatting helper
    this.handlebars.registerHelper('formatNumber', (value, decimals = 2) => {
      if (value === null || value === undefined) return '0';
      const num = parseFloat(value);
      if (isNaN(num)) return '0';
      return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    });

    // Date formatting helper
    this.handlebars.registerHelper('formatDate', (date, format) => {
      if (!date) return '';
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';

      // Default Australian format: DD/MM/YYYY
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();

      if (format === 'MM/DD/YYYY') {
        return `${month}/${day}/${year}`;
      } else if (format === 'YYYY-MM-DD') {
        return `${year}-${month}-${day}`;
      }

      // Default: DD/MM/YYYY
      return `${day}/${month}/${year}`;
    });

    // Conditional equality helper
    this.handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
      return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
    });

    // Conditional NOT equality helper
    this.handlebars.registerHelper('ifNotEquals', function(arg1, arg2, options) {
      return (arg1 !== arg2) ? options.fn(this) : options.inverse(this);
    });

    // GST calculation helper
    this.handlebars.registerHelper('calculateGST', (amount, rate = 0.10) => {
      if (!amount) return 0;
      return parseFloat(amount) * parseFloat(rate);
    });

    // Logical OR helper
    this.handlebars.registerHelper('or', function() {
      return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
    });

    // Logical AND helper
    this.handlebars.registerHelper('and', function() {
      return Array.prototype.slice.call(arguments, 0, -1).every(Boolean);
    });
  }

  /**
   * Load template from file system
   * @param {string} templatePath - Path to template file
   * @returns {Promise<Function>} Compiled Handlebars template
   */
  async loadTemplate(templatePath) {
    // Check cache first
    if (this.templateCache.has(templatePath)) {
      return this.templateCache.get(templatePath);
    }

    try {
      const templateContent = await fs.readFile(templatePath, 'utf8');
      const compiled = this.handlebars.compile(templateContent);

      // Cache the compiled template
      this.templateCache.set(templatePath, compiled);

      return compiled;
    } catch (error) {
      console.error('Error loading template:', error);
      throw new Error(`Failed to load template: ${error.message}`);
    }
  }

  /**
   * Main render function
   * @param {string} orderNumber - Order number to render
   * @param {string} templateName - Template identifier
   * @param {Object} settings - Rendering settings
   * @returns {Promise<string>} Rendered HTML
   */
  async renderOrder(orderNumber, templateName, settings) {
    try {
      // 1. Load template
      const templatePath = this.getTemplatePath(templateName);
      const template = await this.loadTemplate(templatePath);

      // 2. Gather complete order data from database
      const orderData = await this.gatherOrderData(orderNumber);

      // 3. Apply price display settings
      const processedData = this.applyPriceSettings(orderData, settings);

      // 4. Calculate totals
      const withTotals = this.calculateTotals(processedData, settings);

      // 5. Replace UDF variables in notes
      const finalData = this.replaceUDFVariables(withTotals);

      // 6. Add current date for footer
      finalData.currentDate = new Date();

      // 7. Merge with customizations if provided
      if (settings.customizations) {
        finalData.customizations = settings.customizations;
      }

      // 8. Add display flags
      finalData.showPrices = settings.priceDisplay !== 'none';
      finalData.showLinePrices = settings.priceDisplay === 'all';
      finalData.showSupplierRef = settings.codeDisplay === 'supplier' || settings.codeDisplay === 'both';
      finalData.gstMode = settings.gstMode || 'total';

      // 9. Render HTML
      const html = template(finalData);

      return html;
    } catch (error) {
      console.error('Error rendering order:', error);
      throw new Error(`Failed to render order: ${error.message}`);
    }
  }

  /**
   * Get template file path
   * @param {string} templateName - Template identifier
   * @returns {string} Full path to template file
   */
  getTemplatePath(templateName) {
    // Built-in templates
    if (templateName.startsWith('custom-')) {
      // Custom templates are handled by TemplateManager
      throw new Error('Custom templates should be loaded via TemplateManager');
    }

    // Default templates path
    const templatesDir = path.join(__dirname, '../templates/purchase-orders/default');
    return path.join(templatesDir, `${templateName}.hbs`);
  }

  /**
   * Gather all order data from database
   * @param {string} orderNumber - Order number (format: JobNo/CostCentre.BLoad)
   * @returns {Promise<Object>} Complete order data
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
          j.JobNo,
          j.JobName,
          j.Client,
          j.Address,
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
        LEFT JOIN [${jobDbName}].[dbo].[Jobs] j ON j.JobNo = '${jobNo}'
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
            j.JobNo,
            j.JobName,
            j.Client,
            j.Address,
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
          CROSS JOIN [${sysDbName}].[dbo].[CostCentres] cc
          WHERE j.JobNo = '${jobNo}'
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
          b.UnitPrice,
          b.XDescription AS Workup,
          pl.Description,
          pc.Printout AS Unit,
          sp.Reference AS SupplierReference,
          (b.Quantity * b.UnitPrice) AS LineTotal
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

      // Query standard notes (if any attached to this order)
      // For now, we'll return empty array - this will be implemented when notes system is built
      const standardNotes = [];

      // Query global notes
      // For now, we'll return empty array - this will be implemented when notes system is built
      const globalNotes = [];

      // Build complete order data object
      const orderData = {
        OrderNumber: orderHeader.OrderNumber,
        OrderDate: orderHeader.OrderDate,
        JobNo: orderHeader.JobNo,
        JobName: orderHeader.JobName,
        Client: orderHeader.Client,
        Address: orderHeader.Address,
        CostCentre: orderHeader.CostCentre,
        CostCentreName: orderHeader.CostCentreName,
        SupplierCode: orderHeader.Supplier,
        SupplierName: orderHeader.SupplierName || 'To Be Assigned',
        SupplierContact: orderHeader.AccountContact,
        SupplierPhone: orderHeader.AccountPhone,
        SupplierEmail: orderHeader.AccountEmail,
        SupplierAddress: supplierAddress,
        items: itemsResult.recordset,
        standardNotes: standardNotes,
        globalNotes: globalNotes,
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
   * @param {Object} data - Order data
   * @param {Object} settings - Display settings
   * @returns {Object} Modified order data
   */
  applyPriceSettings(data, settings) {
    const modified = { ...data };

    switch (settings.priceDisplay) {
      case 'none':
        // Hide all prices
        modified.items = modified.items.map(item => ({
          ...item,
          UnitPrice: null,
          LineTotal: null
        }));
        break;

      case 'totalOnly':
        // Show totals but not line item prices
        // Prices are still calculated but won't be displayed in template
        break;

      case 'supplierOnly':
        // Only show items that have supplier-specific prices
        modified.items = modified.items.filter(item => item.SupplierReference);
        break;

      case 'all':
      default:
        // Show all prices (no modification needed)
        break;
    }

    return modified;
  }

  /**
   * Calculate totals with GST
   * @param {Object} data - Order data
   * @param {Object} settings - Calculation settings
   * @returns {Object} Data with calculated totals
   */
  calculateTotals(data, settings) {
    const modified = { ...data };

    // Calculate subtotal
    const subTotal = modified.items.reduce((sum, item) => {
      const qty = parseFloat(item.Quantity) || 0;
      const price = parseFloat(item.UnitPrice) || 0;
      return sum + (qty * price);
    }, 0);

    modified.SubTotal = subTotal;

    // Calculate GST based on mode
    switch (settings.gstMode) {
      case 'none':
        modified.GSTAmount = 0;
        modified.GrandTotal = subTotal;
        break;

      case 'perLine':
      case 'total':
        // Both modes calculate same total, display differs in template
        modified.GSTAmount = subTotal * 0.10; // 10% GST
        modified.GrandTotal = subTotal + modified.GSTAmount;
        break;

      default:
        modified.GSTAmount = 0;
        modified.GrandTotal = subTotal;
    }

    return modified;
  }

  /**
   * Replace UDF variables in note text with actual values
   * @param {Object} data - Order data
   * @returns {Object} Data with UDF variables replaced
   */
  replaceUDFVariables(data) {
    const modified = { ...data };

    // Build UDF replacement map
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

    // Replace in standard notes
    if (modified.standardNotes && modified.standardNotes.length > 0) {
      modified.standardNotes = modified.standardNotes.map(note => {
        let noteText = note.NoteText;
        Object.keys(udfMap).forEach(key => {
          noteText = noteText.replace(new RegExp(key, 'gi'), udfMap[key]);
        });
        return {
          ...note,
          NoteText: noteText
        };
      });
    }

    // Replace in global notes
    if (modified.globalNotes && modified.globalNotes.length > 0) {
      modified.globalNotes = modified.globalNotes.map(note => {
        let noteText = note.NoteText;
        Object.keys(udfMap).forEach(key => {
          noteText = noteText.replace(new RegExp(key, 'gi'), udfMap[key]);
        });
        return {
          ...note,
          NoteText: noteText
        };
      });
    }

    return modified;
  }

  /**
   * Clear template cache (useful for development/testing)
   */
  clearCache() {
    this.templateCache.clear();
  }

  /**
   * Get sample order data for template previews
   * @returns {Object} Sample data matching real order structure
   */
  getSampleData() {
    return {
      OrderNumber: '001/CONC.1',
      OrderDate: new Date(),
      JobNo: '001',
      JobName: 'Sample Construction Project',
      Client: 'ABC Developments Pty Ltd',
      Address: '123 Construction St, Building City NSW 2000',
      CostCentre: 'CONC',
      CostCentreName: 'Concrete Works',
      SupplierCode: 'SUPP001',
      SupplierName: 'Premium Concrete Suppliers',
      SupplierContact: 'John Smith',
      SupplierPhone: '(02) 9876 5432',
      SupplierEmail: 'orders@premiumconcrete.com.au',
      SupplierAddress: '456 Supplier Road, Industrial Park NSW 2100',
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
      standardNotes: [
        {
          NoteCode: 'DELIVERY',
          NoteText: 'All materials to be delivered to site address: [job udf1]'
        }
      ],
      globalNotes: [
        {
          NoteText: 'Site hours: Monday to Friday 7:00 AM - 4:00 PM. No weekend deliveries without prior approval.'
        }
      ],
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
}

// Export singleton instance
module.exports = new TemplateRenderer();
