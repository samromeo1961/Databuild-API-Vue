const reportRenderer = require('../services/report-renderer');
const templateManager = require('../services/template-manager');
const { getPool, getJobDatabaseName, getSystemDatabaseName } = require('../database/connection');

/**
 * IPC Handlers for Purchase Order Operations
 *
 * Handles:
 * - Getting orders for a job
 * - Rendering order previews
 * - Getting order data
 * - Listing jobs with orders
 */

/**
 * Get all jobs from the Job Database
 */
async function getJobs(event) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database connection not available' };
    }

    const jobDbName = getJobDatabaseName();
    const sysDbName = getSystemDatabaseName();

    if (!jobDbName) {
      return { success: false, message: 'Job Database not configured' };
    }

    const query = `
      SELECT
        j.Job_No AS JobNo,
        ISNULL(c.Address, 'Job ' + j.Job_No) AS JobName,
        c.Name AS Client,
        c.Address,
        c.City,
        j.Status,
        j.StartDate
      FROM [${jobDbName}].[dbo].[Jobs] j
      LEFT JOIN [${sysDbName}].[dbo].[Contacts] c ON j.Job_No = c.Code
      WHERE j.Status != 'Archived'
      ORDER BY j.Job_No DESC
    `;

    const result = await pool.request().query(query);

    return {
      success: true,
      jobs: result.recordset
    };
  } catch (error) {
    console.error('Error getting jobs:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Ensure Status column exists in Orders table
 */
async function ensureStatusColumn() {
  try {
    const pool = getPool();
    if (!pool) {
      console.log('ensureStatusColumn: No pool available');
      return false;
    }

    const jobDbName = getJobDatabaseName();
    if (!jobDbName) {
      console.log('ensureStatusColumn: No job database configured');
      return false;
    }

    // Check if Status column exists
    const checkColumn = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME = 'Orders'
        AND COLUMN_NAME = 'Status'
        AND TABLE_CATALOG = '${jobDbName}'
    `);

    if (checkColumn.recordset.length === 0) {
      console.log('Status column does not exist, adding it now...');

      // Add Status column with default 'Draft'
      await pool.request().query(`
        ALTER TABLE [${jobDbName}].[dbo].[Orders]
        ADD Status VARCHAR(20) NULL
      `);

      // Set default value for new rows
      await pool.request().query(`
        ALTER TABLE [${jobDbName}].[dbo].[Orders]
        ADD CONSTRAINT DF_Orders_Status DEFAULT 'Draft' FOR Status
      `);

      // Update existing records based on OrderDate
      await pool.request().query(`
        UPDATE [${jobDbName}].[dbo].[Orders]
        SET Status = CASE
          WHEN OrderDate IS NOT NULL THEN 'Ordered'
          ELSE 'Draft'
        END
        WHERE Status IS NULL
      `);

      console.log('✓ Status column added to Orders table successfully');
      return true;
    } else {
      console.log('Status column already exists');
      return true;
    }
  } catch (error) {
    console.error('Error ensuring Status column:', error.message);
    return false;
  }
}

/**
 * Get orders for a specific job
 * Returns orders grouped by cost centre
 */
async function getOrdersForJob(event, jobNo) {
  try {
    // Handle sample/demo data
    if (jobNo && jobNo.startsWith('DEMO')) {
      console.log('Returning sample orders for demo job:', jobNo);
      return {
        success: true,
        orders: [
          {
            OrderNumber: `${jobNo}/Plumb.1`,
            CostCentre: 'Plumb',
            CostCentreName: 'Plumbing',
            SupplierName: 'ABC Plumbing Supplies',
            ItemCount: 12,
            OrderTotal: 15750.50,
            OrderDate: new Date().toISOString(),
            IsLogged: 0,
            IsPreferredSupplier: 1,
            SupplierSortOrder: 1,
            SortOrder: 100
          },
          {
            OrderNumber: `${jobNo}/Elec.1`,
            CostCentre: 'Elec',
            CostCentreName: 'Electrical',
            SupplierName: 'XYZ Electrical Wholesale',
            ItemCount: 8,
            OrderTotal: 8950.00,
            OrderDate: new Date().toISOString(),
            IsLogged: 1,
            IsPreferredSupplier: 1,
            SupplierSortOrder: 1,
            SortOrder: 200
          },
          {
            OrderNumber: `${jobNo}/Carp.1`,
            CostCentre: 'Carp',
            CostCentreName: 'Carpentry',
            SupplierName: 'Timber & Hardware Co',
            ItemCount: 25,
            OrderTotal: 22300.75,
            OrderDate: new Date().toISOString(),
            IsLogged: 0,
            IsPreferredSupplier: 0,
            SupplierSortOrder: null,
            SortOrder: 300
          },
          {
            OrderNumber: `${jobNo}/Paint.1`,
            CostCentre: 'Paint',
            CostCentreName: 'Painting',
            SupplierName: 'Premier Paint Supplies',
            ItemCount: 15,
            OrderTotal: 4275.00,
            OrderDate: new Date().toISOString(),
            IsLogged: 1,
            IsPreferredSupplier: 1,
            SupplierSortOrder: 1,
            SortOrder: 400
          },
          {
            OrderNumber: `${jobNo}/Conc.1`,
            CostCentre: 'Conc',
            CostCentreName: 'Concrete',
            SupplierName: 'Metro Concrete Solutions',
            ItemCount: 6,
            OrderTotal: 18500.00,
            OrderDate: new Date().toISOString(),
            IsLogged: 0,
            IsPreferredSupplier: 1,
            SupplierSortOrder: 1,
            SortOrder: 500
          }
        ],
        isSampleData: true
      };
    }

    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database connection not available' };
    }

    const jobDbName = getJobDatabaseName();
    const sysDbName = getSystemDatabaseName();

    if (!jobDbName) {
      return { success: false, message: 'Job Database not configured' };
    }

    // Ensure Status column exists in Orders table
    const hasStatusColumn = await ensureStatusColumn();

    // Check if CCSuppliers table exists (optional table for Preferred Suppliers feature)
    let hasCCSuppliers = false;
    try {
      const checkTable = await pool.request().query(`
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME = 'CCSuppliers'
        AND TABLE_CATALOG = '${sysDbName}'
      `);
      hasCCSuppliers = checkTable.recordset.length > 0;
    } catch (err) {
      console.log('CCSuppliers table check failed, assuming it does not exist');
    }

    // Build Status field selection based on whether column exists
    const statusField = hasStatusColumn ? "ISNULL(o.Status, 'Draft') AS Status" : "'Draft' AS Status";
    const statusGroupBy = hasStatusColumn ? "o.Status," : "";

    // Build query with or without CCSuppliers join
    const query = hasCCSuppliers ? `
      SELECT
        b.JobNo,
        b.CostCentre,
        b.BLoad,
        CONCAT(b.JobNo, '/', b.CostCentre, '.', b.BLoad) AS OrderNumber,
        cc.Name AS CostCentreName,
        cc.SortOrder,
        o.Supplier,
        s.SupplierName,
        s.AccountEmail AS SupplierEmail,
        o.OrderDate,
        ${statusField},
        CASE WHEN o.OrderNumber IS NOT NULL THEN 1 ELSE 0 END AS IsLogged,
        ISNULL(ccs.Preferred, 0) AS IsPreferredSupplier,
        ccs.SortOrder AS SupplierSortOrder,
        SUM(b.Quantity * b.UnitPrice) AS OrderTotal,
        COUNT(*) AS ItemCount
      FROM [${jobDbName}].[dbo].[Bill] b
      LEFT JOIN [${sysDbName}].[dbo].[CostCentres] cc ON b.CostCentre = cc.Code AND cc.Tier = 1
      LEFT JOIN [${jobDbName}].[dbo].[Orders] o ON CONCAT(b.JobNo, '/', b.CostCentre, '.', b.BLoad) = o.OrderNumber
      LEFT JOIN [${sysDbName}].[dbo].[Supplier] s ON o.Supplier = s.Supplier_Code
      LEFT JOIN [${sysDbName}].[dbo].[CCSuppliers] ccs ON b.CostCentre = ccs.CostCentre AND o.Supplier = ccs.SupplierCode
      WHERE b.JobNo = @JobNo
        AND b.Quantity > 0
      GROUP BY
        b.JobNo,
        b.CostCentre,
        b.BLoad,
        cc.Name,
        cc.SortOrder,
        o.Supplier,
        s.SupplierName,
        s.AccountEmail,
        o.OrderDate,
        o.OrderNumber,
        ${statusGroupBy}
        ccs.Preferred,
        ccs.SortOrder
      ORDER BY ISNULL(cc.SortOrder, 999999), b.CostCentre, b.BLoad
    ` : `
      SELECT
        b.JobNo,
        b.CostCentre,
        b.BLoad,
        CONCAT(b.JobNo, '/', b.CostCentre, '.', b.BLoad) AS OrderNumber,
        cc.Name AS CostCentreName,
        cc.SortOrder,
        o.Supplier,
        s.SupplierName,
        s.AccountEmail AS SupplierEmail,
        o.OrderDate,
        ${statusField},
        CASE WHEN o.OrderNumber IS NOT NULL THEN 1 ELSE 0 END AS IsLogged,
        0 AS IsPreferredSupplier,
        NULL AS SupplierSortOrder,
        SUM(b.Quantity * b.UnitPrice) AS OrderTotal,
        COUNT(*) AS ItemCount
      FROM [${jobDbName}].[dbo].[Bill] b
      LEFT JOIN [${sysDbName}].[dbo].[CostCentres] cc ON b.CostCentre = cc.Code AND cc.Tier = 1
      LEFT JOIN [${jobDbName}].[dbo].[Orders] o ON CONCAT(b.JobNo, '/', b.CostCentre, '.', b.BLoad) = o.OrderNumber
      LEFT JOIN [${sysDbName}].[dbo].[Supplier] s ON o.Supplier = s.Supplier_Code
      WHERE b.JobNo = @JobNo
        AND b.Quantity > 0
      GROUP BY
        b.JobNo,
        b.CostCentre,
        b.BLoad,
        cc.Name,
        cc.SortOrder,
        o.Supplier,
        s.SupplierName,
        s.AccountEmail,
        o.OrderDate,
        o.OrderNumber${hasStatusColumn ? ',\n        o.Status' : ''}
      ORDER BY ISNULL(cc.SortOrder, 999999), b.CostCentre, b.BLoad
    `;

    const result = await pool.request()
      .input('JobNo', jobNo)
      .query(query);

    return {
      success: true,
      orders: result.recordset
    };
  } catch (error) {
    console.error('Error getting orders for job:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get detailed line items for an order
 */
async function getOrderLineItems(event, orderNumber) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database connection not available' };
    }

    const jobDbName = getJobDatabaseName();
    const sysDbName = getSystemDatabaseName();

    if (!jobDbName) {
      return { success: false, message: 'Job Database not configured' };
    }

    // Parse order number: JobNo/CostCentre.BLoad
    const [jobPart, bLoad] = orderNumber.split('.');
    const [jobNo, costCentre] = jobPart.split('/');

    const query = `
      SELECT
        b.ItemCode,
        b.LineNumber,
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
      LEFT JOIN [${jobDbName}].[dbo].[Orders] o ON CONCAT(b.JobNo, '/', b.CostCentre, '.', b.BLoad) = o.OrderNumber
      LEFT JOIN [${sysDbName}].[dbo].[SuppliersPrices] sp
        ON sp.ItemCode = b.ItemCode
        AND sp.Supplier = o.Supplier
      WHERE b.JobNo = @JobNo
        AND b.CostCentre = @CostCentre
        AND b.BLoad = @BLoad
        AND b.Quantity > 0
      ORDER BY b.LineNumber
    `;

    const result = await pool.request()
      .input('JobNo', jobNo)
      .input('CostCentre', costCentre)
      .input('BLoad', parseInt(bLoad))
      .query(query);

    return {
      success: true,
      items: result.recordset
    };
  } catch (error) {
    console.error('Error getting order line items:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Render order preview HTML (using jsreport)
 */
async function renderOrderPreview(event, orderNumber, settings) {
  try {
    console.log('Rendering order preview for:', orderNumber);
    console.log('Settings:', settings);

    // 1. Load the template content
    const templateId = settings.templateId || settings.template || 'classic-po';
    console.log('Loading template:', templateId);

    const template = await templateManager.getTemplateById(templateId);

    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    console.log('Template loaded:', template.name);
    console.log('Template path:', template.templatePath);

    // 1b. Load the actual HTML content from the template file
    const fs = require('fs').promises;
    let htmlContent;

    if (template.isBuiltIn) {
      // For built-in templates, read from file system
      htmlContent = await fs.readFile(template.templatePath, 'utf8');
      console.log('Loaded built-in template HTML, length:', htmlContent.length);
    } else {
      // For custom templates, HTML is stored in the template object
      htmlContent = template.html || template.htmlContent;
      console.log('Loaded custom template HTML, length:', htmlContent?.length || 0);
    }

    if (!htmlContent) {
      throw new Error('Template HTML content is missing');
    }

    // 2. Gather order data
    let orderData;
    if (orderNumber && orderNumber.startsWith('DEMO')) {
      console.log('Using sample data for demo order');
      orderData = reportRenderer.getSampleData();
      orderData.OrderNumber = orderNumber;
      orderData.job.jobNo = orderNumber.split('/')[0];
    } else {
      orderData = await reportRenderer.gatherOrderData(orderNumber);
    }

    // 3. Apply settings
    const processedData = reportRenderer.applyPriceSettings(orderData, settings);
    const withTotals = reportRenderer.calculateTotals(processedData, settings);
    const finalData = reportRenderer.replaceUDFVariables(withTotals);

    // 4. Add metadata
    finalData.currentDate = new Date();
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

    if (settings.customizations && settings.customizations.sections) {
      finalData.customizations.sections = {
        ...finalData.customizations.sections,
        ...settings.customizations.sections
      };
    }

    finalData.showPrices = settings.priceDisplay !== 'none';
    finalData.showLinePrices = settings.priceDisplay === 'all';
    finalData.showSupplierRef = settings.codeDisplay === 'supplier' || settings.codeDisplay === 'both';
    finalData.gstMode = settings.gstMode || 'total';

    // 5. Render to HTML using Handlebars
    console.log('Calling reportRenderer.renderToHTML...');
    console.log('Template content length:', htmlContent.length);
    console.log('Data keys:', Object.keys(finalData));

    const html = await reportRenderer.renderToHTML(htmlContent, finalData);

    console.log('Preview rendered successfully');
    console.log('HTML type:', typeof html);
    console.log('HTML length:', html?.length || 0);
    console.log('HTML preview (first 200 chars):', html?.substring(0, 200) || 'EMPTY');

    return {
      success: true,
      html: String(html)
    };
  } catch (error) {
    console.error('Error rendering order preview:', error);
    console.error('Error stack:', error.stack);
    return { success: false, message: error.message };
  }
}

/**
 * Render order to PDF (using jsreport)
 */
async function renderOrderToPDF(event, orderNumber, settings) {
  try {
    console.log('Rendering order to PDF for:', orderNumber);
    console.log('Settings:', settings);

    // 1. Load the template content
    const templateId = settings.templateId || settings.template || 'classic-po';
    console.log('Loading template:', templateId);

    const template = await templateManager.getTemplateById(templateId);

    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    console.log('Template loaded:', template.name);
    console.log('Template path:', template.templatePath);

    // 1b. Load the actual HTML content from the template file
    const fs = require('fs').promises;
    let htmlContent;

    if (template.isBuiltIn) {
      // For built-in templates, read from file system
      htmlContent = await fs.readFile(template.templatePath, 'utf8');
      console.log('Loaded built-in template HTML, length:', htmlContent.length);
    } else {
      // For custom templates, HTML is stored in the template object
      htmlContent = template.html || template.htmlContent;
      console.log('Loaded custom template HTML, length:', htmlContent?.length || 0);
    }

    if (!htmlContent) {
      throw new Error('Template HTML content is missing');
    }

    console.log('About to call renderOrder with:');
    console.log('- orderNumber:', orderNumber);
    console.log('- htmlContent length:', htmlContent.length);
    console.log('- htmlContent first 50 chars:', htmlContent.substring(0, 50));
    console.log('- settings:', JSON.stringify(settings, null, 2));

    // 2. Use reportRenderer to generate PDF
    const pdfBuffer = await reportRenderer.renderOrder(
      orderNumber,
      htmlContent,
      settings
    );

    console.log('PDF rendered successfully, size:', pdfBuffer.length, 'bytes');

    return {
      success: true,
      pdf: pdfBuffer,
      filename: `PO_${orderNumber.replace(/\//g, '_')}.pdf`
    };
  } catch (error) {
    console.error('Error rendering order to PDF:', error);
    console.error('Error stack:', error.stack);
    return { success: false, message: error.message };
  }
}

/**
 * Get order summary data (for display in grids, etc.)
 */
async function getOrderSummary(event, orderNumber) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database connection not available' };
    }

    const jobDbName = getJobDatabaseName();
    const sysDbName = getSystemDatabaseName();

    if (!jobDbName) {
      return { success: false, message: 'Job Database not configured' };
    }

    // Parse order number
    const [jobPart, bLoad] = orderNumber.split('.');
    const [jobNo, costCentre] = jobPart.split('/');

    const query = `
      SELECT
        '${orderNumber}' AS OrderNumber,
        j.Job_No AS JobNo,
        ISNULL(c.Address, 'Job ' + j.Job_No) AS JobName,
        c.Name AS Client,
        cc.Code AS CostCentre,
        cc.Name AS CostCentreName,
        o.Supplier,
        s.SupplierName,
        s.AccountEmail AS SupplierEmail,
        o.OrderDate,
        CASE WHEN o.OrderNumber IS NOT NULL THEN 1 ELSE 0 END AS IsLogged,
        COUNT(b.ItemCode) AS ItemCount,
        SUM(b.Quantity * b.UnitPrice) AS SubTotal,
        SUM(b.Quantity * b.UnitPrice) * 0.10 AS GSTAmount,
        SUM(b.Quantity * b.UnitPrice) * 1.10 AS Total
      FROM [${jobDbName}].[dbo].[Bill] b
      LEFT JOIN [${jobDbName}].[dbo].[Jobs] j ON b.JobNo = j.Job_No
      LEFT JOIN [${sysDbName}].[dbo].[Contacts] c ON j.Job_No = c.Code
      LEFT JOIN [${sysDbName}].[dbo].[CostCentres] cc ON b.CostCentre = cc.Code AND cc.Tier = 1
      LEFT JOIN [${jobDbName}].[dbo].[Orders] o ON CONCAT(b.JobNo, '/', b.CostCentre, '.', b.BLoad) = o.OrderNumber
      LEFT JOIN [${sysDbName}].[dbo].[Supplier] s ON o.Supplier = s.Supplier_Code
      WHERE b.JobNo = @JobNo
        AND b.CostCentre = @CostCentre
        AND b.BLoad = @BLoad
        AND b.Quantity > 0
      GROUP BY
        j.Job_No,
        c.Address,
        c.Name,
        cc.Code,
        cc.Name,
        o.Supplier,
        s.SupplierName,
        s.AccountEmail,
        o.OrderDate,
        o.OrderNumber
    `;

    const result = await pool.request()
      .input('JobNo', jobNo)
      .input('CostCentre', costCentre)
      .input('BLoad', parseInt(bLoad))
      .query(query);

    if (result.recordset.length === 0) {
      return { success: false, message: 'Order not found' };
    }

    return {
      success: true,
      summary: result.recordset[0]
    };
  } catch (error) {
    console.error('Error getting order summary:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get all cost centres (for dropdowns, etc.)
 */
async function getCostCentres(event) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database connection not available' };
    }

    const sysDbName = getSystemDatabaseName();

    const query = `
      SELECT
        Code,
        Name,
        SubGroup,
        SortOrder
      FROM [${sysDbName}].[dbo].[CostCentres]
      WHERE Tier = 1
      ORDER BY SortOrder, Code
    `;

    const result = await pool.request().query(query);

    return {
      success: true,
      costCentres: result.recordset
    };
  } catch (error) {
    console.error('Error getting cost centres:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get jobs with order counts
 * Useful for job selection screen
 */
async function getJobsWithOrderCounts(event) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database connection not available' };
    }

    const jobDbName = getJobDatabaseName();
    const sysDbName = getSystemDatabaseName();

    if (!jobDbName) {
      return { success: false, message: 'Job Database not configured' };
    }

    const query = `
      SELECT
        j.Job_No AS JobNo,
        ISNULL(c.Address, 'Job ' + j.Job_No) AS JobName,
        c.Name AS Client,
        j.Status,
        c.Address AS SiteStreet,
        c.City AS SiteSuburb,
        c.State AS SiteState,
        COUNT(DISTINCT CONCAT(b.CostCentre, '.', b.BLoad)) AS OrderCount,
        SUM(CASE WHEN o.OrderNumber IS NOT NULL THEN 1 ELSE 0 END) AS LoggedCount
      FROM [${jobDbName}].[dbo].[Jobs] j
      LEFT JOIN [${sysDbName}].[dbo].[Contacts] c ON j.Job_No = c.Code
      LEFT JOIN [${jobDbName}].[dbo].[Bill] b ON j.Job_No = b.JobNo AND b.Quantity > 0
      LEFT JOIN [${jobDbName}].[dbo].[Orders] o ON CONCAT(b.JobNo, '/', b.CostCentre, '.', b.BLoad) = o.OrderNumber
      WHERE j.Status != 'Archived'
      GROUP BY j.Job_No, c.Address, c.Name, c.City, c.State, j.Status
      HAVING COUNT(DISTINCT CONCAT(b.CostCentre, '.', b.BLoad)) > 0
      ORDER BY j.Job_No DESC
    `;

    const result = await pool.request().query(query);

    // If no real data, return sample data for testing
    if (result.recordset.length === 0) {
      console.log('No jobs found in database, returning sample data for testing');
      return {
        success: true,
        jobs: [
          {
            JobNo: 'DEMO001',
            JobName: 'Sample Commercial Build - 123 Main Street',
            Client: 'Demo Construction Pty Ltd',
            Status: 'Active',
            SiteStreet: '123 Main Street',
            SiteSuburb: 'Sydney',
            SiteState: 'NSW',
            OrderCount: 5,
            LoggedCount: 2
          },
          {
            JobNo: 'DEMO002',
            JobName: 'Residential Renovation - Smith Residence',
            Client: 'Smith & Associates',
            Status: 'Active',
            SiteStreet: '45 Oak Avenue',
            SiteSuburb: 'Melbourne',
            SiteState: 'VIC',
            OrderCount: 3,
            LoggedCount: 1
          },
          {
            JobNo: 'DEMO003',
            JobName: 'Office Fitout - CBD Tower Level 8',
            Client: 'Corporate Solutions Ltd',
            Status: 'Active',
            SiteStreet: 'Level 8, 100 George Street',
            SiteSuburb: 'Brisbane',
            SiteState: 'QLD',
            OrderCount: 4,
            LoggedCount: 3
          }
        ],
        isSampleData: true,
        message: 'No jobs found in database - showing sample data for testing'
      };
    }

    return {
      success: true,
      jobs: result.recordset
    };
  } catch (error) {
    console.error('Error getting jobs with order counts:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get preferred suppliers for a cost centre
 * Useful for supplier selection dropdowns
 */
async function getPreferredSuppliers(event, costCentre) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database connection not available' };
    }

    const sysDbName = getSystemDatabaseName();

    // Check for NominatedSupplier table (newer) or CCSuppliers table (older)
    const checkTable = await pool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'dbo'
      AND (TABLE_NAME = 'NominatedSupplier' OR TABLE_NAME = 'CCSuppliers')
      AND TABLE_CATALOG = '${sysDbName}'
    `);

    if (checkTable.recordset.length === 0) {
      // No supplier assignment table exists - return all suppliers
      return {
        success: true,
        suppliers: [],
        preferredSupplier: null,
        message: 'No supplier assignment table found'
      };
    }

    const hasNominatedSupplier = checkTable.recordset.some(r => r.TABLE_NAME === 'NominatedSupplier');

    let query;
    if (hasNominatedSupplier) {
      // Use NominatedSupplier table (Code = Supplier code)
      query = `
        SELECT
          ns.CostCentre,
          ns.Code AS SupplierCode,
          s.Supplier_Code,
          s.SupplierName,
          s.AccountContact,
          s.AccountPhone,
          s.AccountEmail,
          ns.Counter AS SortOrder
        FROM [${sysDbName}].[dbo].[NominatedSupplier] ns
        INNER JOIN [${sysDbName}].[dbo].[Supplier] s ON ns.Code = s.Supplier_Code
        WHERE ns.CostCentre = @CostCentre
          AND s.Archived = 0
        ORDER BY ns.Counter
      `;
    } else {
      // Fallback to CCSuppliers table
      query = `
        SELECT
          ccs.CostCentre,
          ccs.SupplierCode,
          ccs.Preferred,
          ccs.SortOrder,
          s.SupplierName,
          s.AccountContact,
          s.AccountPhone,
          s.AccountEmail
        FROM [${sysDbName}].[dbo].[CCSuppliers] ccs
        INNER JOIN [${sysDbName}].[dbo].[Supplier] s ON ccs.SupplierCode = s.Supplier_Code
        WHERE ccs.CostCentre = @CostCentre
        ORDER BY ccs.Preferred DESC, ccs.SortOrder, s.SupplierName
      `;
    }

    const result = await pool.request()
      .input('CostCentre', costCentre)
      .query(query);

    return {
      success: true,
      suppliers: result.recordset,
      preferredSupplier: result.recordset[0] || null // First supplier in sort order
    };
  } catch (error) {
    console.error('Error getting preferred suppliers:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get all suppliers for a cost centre (including non-preferred)
 */
async function getSuppliersForCostCentre(event, costCentre) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database connection not available' };
    }

    const sysDbName = getSystemDatabaseName();

    // Check for NominatedSupplier or CCSuppliers table
    const checkTable = await pool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'dbo'
      AND (TABLE_NAME = 'NominatedSupplier' OR TABLE_NAME = 'CCSuppliers')
      AND TABLE_CATALOG = '${sysDbName}'
    `);

    const hasNominatedSupplier = checkTable.recordset.some(r => r.TABLE_NAME === 'NominatedSupplier');
    const hasCCSuppliers = checkTable.recordset.some(r => r.TABLE_NAME === 'CCSuppliers');

    let query;
    if (hasNominatedSupplier) {
      // Use NominatedSupplier table - show only nominated suppliers for this cost centre
      query = `
        SELECT
          s.Supplier_Code,
          s.SupplierName,
          s.AccountContact,
          s.AccountPhone,
          s.AccountEmail,
          1 AS IsNominated,
          ns.Counter AS SortOrder
        FROM [${sysDbName}].[dbo].[NominatedSupplier] ns
        INNER JOIN [${sysDbName}].[dbo].[Supplier] s ON ns.Code = s.Supplier_Code
        WHERE ns.CostCentre = @CostCentre
          AND s.Archived = 0
        ORDER BY ns.Counter, s.SupplierName
      `;
    } else if (hasCCSuppliers) {
      // Use CCSuppliers table
      query = `
        SELECT
          s.Supplier_Code,
          s.SupplierName,
          s.AccountContact,
          s.AccountPhone,
          s.AccountEmail,
          ISNULL(ccs.Preferred, 0) AS IsPreferred,
          ccs.SortOrder
        FROM [${sysDbName}].[dbo].[Supplier] s
        LEFT JOIN [${sysDbName}].[dbo].[CCSuppliers] ccs
          ON s.Supplier_Code = ccs.SupplierCode AND ccs.CostCentre = @CostCentre
        WHERE s.Archived = 0
        ORDER BY ISNULL(ccs.Preferred, 0) DESC,
                 ISNULL(ccs.SortOrder, 999999),
                 s.SupplierName
      `;
    } else {
      // No assignment table - return all suppliers
      query = `
        SELECT
          s.Supplier_Code,
          s.SupplierName,
          s.AccountContact,
          s.AccountPhone,
          s.AccountEmail,
          0 AS IsPreferred,
          NULL AS SortOrder
        FROM [${sysDbName}].[dbo].[Supplier] s
        WHERE s.Archived = 0
        ORDER BY s.SupplierName
      `;
    }

    const result = await pool.request()
      .input('CostCentre', costCentre)
      .query(query);

    return {
      success: true,
      suppliers: result.recordset
    };
  } catch (error) {
    console.error('Error getting suppliers for cost centre:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Update order details (supplier, delivery date, special instructions)
 */
async function updateOrder(event, orderNumber, updates) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database connection not available' };
    }

    const jobDbName = getJobDatabaseName();

    if (!jobDbName) {
      return { success: false, message: 'Job Database not configured' };
    }

    // Parse order number (format: "JobNo/CostCentre.BLoad")
    const [jobPart, bLoad] = orderNumber.split('.');
    const [jobNo, costCentre] = jobPart.split('/');

    // Check if order exists in Orders table using the unique index columns
    // The unique index is on (Job, CostCentre, BLoad, VO)
    const checkQuery = `
      SELECT OrderNumber FROM [${jobDbName}].[dbo].[Orders]
      WHERE Job = @JobNo
        AND CostCentre = @CostCentre
        AND BLoad = @BLoad
        AND ISNULL(VO, 0) = 0
    `;

    const checkResult = await pool.request()
      .input('JobNo', jobNo)
      .input('CostCentre', costCentre)
      .input('BLoad', parseInt(bLoad))
      .query(checkQuery);

    const orderExists = checkResult.recordset.length > 0;

    // Ensure Status column exists
    const hasStatusColumn = await ensureStatusColumn();

    if (orderExists) {
      // Update existing order
      const updateFields = ['OrderDate = GETDATE()']; // Always update OrderDate when assigning supplier
      const request = pool.request()
        .input('JobNo', jobNo)
        .input('CostCentre', costCentre)
        .input('BLoad', parseInt(bLoad));

      if (updates.supplier !== undefined) {
        updateFields.push('Supplier = @Supplier');
        request.input('Supplier', updates.supplier);

        // Only update Status if column exists
        if (hasStatusColumn) {
          updateFields.push('Status = @Status');
          request.input('Status', updates.status || 'Draft');
        }
      }
      if (updates.delDate !== undefined) {
        updateFields.push('DelDate = @DelDate');
        request.input('DelDate', updates.delDate);
      }
      if (updates.note !== undefined) {
        updateFields.push('Note = @Note');
        request.input('Note', updates.note);
      }
      if (updates.status !== undefined && updates.supplier === undefined && hasStatusColumn) {
        // Allow status to be updated independently (e.g., Ordered, Cancelled)
        // Only if Status column exists
        updateFields.push('Status = @Status');
        request.input('Status', updates.status);
      }

      const updateQuery = `
        UPDATE [${jobDbName}].[dbo].[Orders]
        SET ${updateFields.join(', ')}
        WHERE Job = @JobNo
          AND CostCentre = @CostCentre
          AND BLoad = @BLoad
          AND ISNULL(VO, 0) = 0
      `;

      await request.query(updateQuery);
    } else {
      // Insert new order record
      const insertRequest = pool.request()
        .input('OrderNumber', orderNumber)
        .input('JobNo', jobNo)
        .input('CostCentre', costCentre)
        .input('BLoad', parseInt(bLoad))
        .input('Supplier', updates.supplier || null)
        .input('DelDate', updates.delDate || null)
        .input('Note', updates.note || null);

      let insertQuery;
      if (hasStatusColumn) {
        // Include Status if column exists
        insertRequest.input('Status', updates.status || 'Draft');
        insertQuery = `
          INSERT INTO [${jobDbName}].[dbo].[Orders]
          (OrderNumber, Job, CostCentre, BLoad, Supplier, DelDate, Note, OrderDate, Status)
          VALUES (@OrderNumber, @JobNo, @CostCentre, @BLoad, @Supplier, @DelDate, @Note, GETDATE(), @Status)
        `;
      } else {
        // Don't include Status if column doesn't exist
        insertQuery = `
          INSERT INTO [${jobDbName}].[dbo].[Orders]
          (OrderNumber, Job, CostCentre, BLoad, Supplier, DelDate, Note, OrderDate)
          VALUES (@OrderNumber, @JobNo, @CostCentre, @BLoad, @Supplier, @DelDate, @Note, GETDATE())
        `;
      }

      await insertRequest.query(insertQuery);
    }

    return {
      success: true,
      message: orderExists ? 'Order updated successfully' : 'Order logged successfully'
    };
  } catch (error) {
    console.error('Error updating order:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Log an order (create entry in Orders table)
 */
async function logOrder(event, orderNumber, supplier, delDate, note) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database connection not available' };
    }

    const jobDbName = getJobDatabaseName();

    if (!jobDbName) {
      return { success: false, message: 'Job Database not configured' };
    }

    // Parse order number
    const [jobPart, bLoad] = orderNumber.split('.');
    const [jobNo, costCentre] = jobPart.split('/');

    // Check if order already exists
    const checkQuery = `
      SELECT OrderNumber FROM [${jobDbName}].[dbo].[Orders]
      WHERE OrderNumber = @OrderNumber
    `;

    const checkResult = await pool.request()
      .input('OrderNumber', orderNumber)
      .query(checkQuery);

    if (checkResult.recordset.length > 0) {
      return { success: false, message: 'Order is already logged' };
    }

    // Insert new order
    const insertQuery = `
      INSERT INTO [${jobDbName}].[dbo].[Orders]
      (OrderNumber, Job, CostCentre, BLoad, Supplier, DelDate, Note, OrderDate)
      VALUES (@OrderNumber, @JobNo, @CostCentre, @BLoad, @Supplier, @DelDate, @Note, GETDATE())
    `;

    await pool.request()
      .input('OrderNumber', orderNumber)
      .input('JobNo', jobNo)
      .input('CostCentre', costCentre)
      .input('BLoad', parseInt(bLoad))
      .input('Supplier', supplier || null)
      .input('DelDate', delDate || null)
      .input('Note', note || null)
      .query(insertQuery);

    return {
      success: true,
      message: 'Order logged successfully'
    };
  } catch (error) {
    console.error('Error logging order:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get order details for editing
 */
async function getOrderDetails(event, orderNumber) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database connection not available' };
    }

    const jobDbName = getJobDatabaseName();
    const sysDbName = getSystemDatabaseName();

    if (!jobDbName) {
      return { success: false, message: 'Job Database not configured' };
    }

    // Parse order number
    const [jobPart, bLoad] = orderNumber.split('.');
    const [jobNo, costCentre] = jobPart.split('/');

    const query = `
      SELECT
        o.OrderNumber,
        o.Job AS JobNo,
        o.CostCentre,
        o.BLoad,
        o.Supplier,
        o.DelDate,
        o.Note,
        o.OrderDate,
        s.SupplierName,
        cc.Name AS CostCentreName,
        CASE WHEN o.OrderNumber IS NOT NULL THEN 1 ELSE 0 END AS IsLogged
      FROM [${jobDbName}].[dbo].[Orders] o
      LEFT JOIN [${sysDbName}].[dbo].[Supplier] s ON o.Supplier = s.Supplier_Code
      LEFT JOIN [${sysDbName}].[dbo].[CostCentres] cc ON o.CostCentre = cc.Code AND cc.Tier = 1
      WHERE o.OrderNumber = @OrderNumber
    `;

    const result = await pool.request()
      .input('OrderNumber', orderNumber)
      .query(query);

    if (result.recordset.length === 0) {
      // Order not logged yet - return minimal data
      return {
        success: true,
        order: {
          OrderNumber: orderNumber,
          JobNo: jobNo,
          CostCentre: costCentre,
          BLoad: parseInt(bLoad),
          Supplier: null,
          DelDate: null,
          Note: null,
          IsLogged: 0
        }
      };
    }

    return {
      success: true,
      order: result.recordset[0]
    };
  } catch (error) {
    console.error('Error getting order details:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Batch render multiple orders to PDF
 * Returns an array of PDF results
 */
async function batchRenderPDF(event, orderNumbers, settings) {
  try {
    const results = [];

    for (const orderNumber of orderNumbers) {
      try {
        const result = await renderOrderToPDF(event, orderNumber, settings);
        results.push({
          orderNumber,
          success: result.success,
          pdf: result.pdf,
          filename: result.filename,
          error: result.message
        });
      } catch (error) {
        results.push({
          orderNumber,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: true,
      results,
      total: orderNumbers.length,
      succeeded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };
  } catch (error) {
    console.error('Error batch rendering PDFs:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Batch print multiple orders
 * Uses Electron's print API to send to default printer or show print dialog
 */
async function batchPrint(event, orderNumbers, settings) {
  try {
    const { BrowserWindow } = require('electron');
    const results = [];

    for (const orderNumber of orderNumbers) {
      try {
        // Render to PDF first
        const pdfResult = await renderOrderToPDF(event, orderNumber, settings);

        if (!pdfResult.success) {
          results.push({
            orderNumber,
            success: false,
            error: pdfResult.message
          });
          continue;
        }

        // Create a hidden window to print the PDF
        const printWindow = new BrowserWindow({
          show: false,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        });

        // Load PDF as data URL
        const pdfDataUrl = `data:application/pdf;base64,${pdfResult.pdf.toString('base64')}`;
        await printWindow.loadURL(pdfDataUrl);

        // Print with options
        const printOptions = {
          silent: settings.silentPrint || false,
          printBackground: true,
          color: settings.color || true,
          margin: {
            marginType: 'printableArea'
          },
          landscape: settings.landscape || false,
          pagesPerSheet: 1,
          collate: false,
          copies: settings.copies || 1
        };

        await printWindow.webContents.print(printOptions);
        printWindow.destroy();

        results.push({
          orderNumber,
          success: true
        });
      } catch (error) {
        results.push({
          orderNumber,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: true,
      results,
      total: orderNumbers.length,
      succeeded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };
  } catch (error) {
    console.error('Error batch printing orders:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Batch email multiple orders
 * Sends PO emails to suppliers using configured email settings
 */
async function batchEmail(event, orderNumbers, settings) {
  try {
    const nodemailer = require('nodemailer');
    const results = [];

    // Get email configuration from settings or use defaults
    const emailConfig = settings.emailConfig || {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: settings.emailUser,
        pass: settings.emailPassword
      }
    };

    // Create transporter
    const transporter = nodemailer.createTransport(emailConfig);

    for (const orderNumber of orderNumbers) {
      try {
        // Get order summary for supplier email
        const summaryResult = await getOrderSummary(event, orderNumber);
        if (!summaryResult.success) {
          results.push({
            orderNumber,
            success: false,
            error: 'Failed to get order summary'
          });
          continue;
        }

        const summary = summaryResult.summary;

        if (!summary.SupplierEmail) {
          results.push({
            orderNumber,
            success: false,
            error: 'Supplier has no email address'
          });
          continue;
        }

        // Render to PDF
        const pdfResult = await renderOrderToPDF(event, orderNumber, settings);

        if (!pdfResult.success) {
          results.push({
            orderNumber,
            success: false,
            error: pdfResult.message
          });
          continue;
        }

        // Prepare email
        const emailSubject = settings.emailSubject ||
          `Purchase Order ${orderNumber} - ${summary.JobName || ''}`;

        const emailBody = settings.emailBody ||
          `Dear ${summary.SupplierName},\n\nPlease find attached Purchase Order ${orderNumber}.\n\n` +
          `Job: ${summary.JobName || summary.JobNo}\n` +
          `Cost Centre: ${summary.CostCentreName}\n\n` +
          `Please confirm receipt and provide delivery timeframe.\n\n` +
          `Regards`;

        const mailOptions = {
          from: settings.emailFrom || emailConfig.auth.user,
          to: summary.SupplierEmail,
          cc: settings.emailCC,
          subject: emailSubject,
          text: emailBody,
          html: emailBody.replace(/\n/g, '<br>'),
          attachments: [{
            filename: pdfResult.filename,
            content: pdfResult.pdf,
            contentType: 'application/pdf'
          }]
        };

        // Send email
        await transporter.sendMail(mailOptions);

        results.push({
          orderNumber,
          success: true,
          recipient: summary.SupplierEmail
        });
      } catch (error) {
        results.push({
          orderNumber,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: true,
      results,
      total: orderNumbers.length,
      succeeded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };
  } catch (error) {
    console.error('Error batch emailing orders:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Batch save multiple orders as PDF files to a selected folder
 * Opens folder picker dialog and saves all PDFs
 */
async function batchSavePDF(event, orderNumbers, settings) {
  try {
    const { dialog } = require('electron');
    const fs = require('fs');
    const path = require('path');

    // Show folder picker
    const result = await dialog.showOpenDialog({
      title: 'Select folder to save PDFs',
      properties: ['openDirectory', 'createDirectory']
    });

    if (result.canceled || !result.filePaths.length) {
      return {
        success: false,
        message: 'Cancelled by user',
        cancelled: true
      };
    }

    const saveDir = result.filePaths[0];

    // Generate PDFs
    const pdfResults = await batchRenderPDF(event, orderNumbers, settings);

    if (!pdfResults.success) {
      return pdfResults;
    }

    let savedCount = 0;
    let failedCount = 0;
    const errors = [];

    // Save each PDF
    for (const pdfResult of pdfResults.results) {
      if (pdfResult.success && pdfResult.pdf) {
        try {
          const filePath = path.join(saveDir, pdfResult.filename);
          fs.writeFileSync(filePath, pdfResult.pdf);
          savedCount++;
        } catch (err) {
          console.error(`Failed to save ${pdfResult.filename}:`, err);
          failedCount++;
          errors.push(`${pdfResult.filename}: ${err.message}`);
        }
      } else {
        failedCount++;
        errors.push(`${pdfResult.orderNumber}: ${pdfResult.error}`);
      }
    }

    return {
      success: true,
      saveDir,
      total: orderNumbers.length,
      saved: savedCount,
      failed: failedCount,
      errors
    };
  } catch (error) {
    console.error('Error batch saving PDFs:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get all suppliers (for adding to nominated suppliers list)
 */
async function getAllSuppliers(event) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database connection not available' };
    }

    const sysDbName = getSystemDatabaseName();

    const query = `
      SELECT
        Supplier_Code,
        SupplierName,
        AccountContact,
        AccountPhone,
        AccountEmail,
        SuppGroup
      FROM [${sysDbName}].[dbo].[Supplier]
      WHERE Archived = 0
      ORDER BY SupplierName
    `;

    const result = await pool.request().query(query);

    return {
      success: true,
      suppliers: result.recordset
    };
  } catch (error) {
    console.error('Error getting all suppliers:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Add a supplier to a cost centre's nominated suppliers list
 */
async function addNominatedSupplier(event, costCentre, supplierCode) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database connection not available' };
    }

    const sysDbName = getSystemDatabaseName();

    // Check if NominatedSupplier table exists
    const checkTable = await pool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'dbo'
      AND TABLE_NAME = 'NominatedSupplier'
      AND TABLE_CATALOG = '${sysDbName}'
    `);

    if (checkTable.recordset.length === 0) {
      return { success: false, message: 'NominatedSupplier table not found in database' };
    }

    // Check if this supplier is already nominated for this cost centre
    const checkExisting = await pool.request()
      .input('CostCentre', costCentre)
      .input('SupplierCode', supplierCode)
      .query(`
        SELECT * FROM [${sysDbName}].[dbo].[NominatedSupplier]
        WHERE CostCentre = @CostCentre AND Code = @SupplierCode
      `);

    if (checkExisting.recordset.length > 0) {
      return { success: false, message: 'Supplier is already nominated for this cost centre' };
    }

    // Insert the nominated supplier (Counter is auto-increment, don't set it)
    await pool.request()
      .input('CostCentre', costCentre)
      .input('SupplierCode', supplierCode)
      .query(`
        INSERT INTO [${sysDbName}].[dbo].[NominatedSupplier]
        (CostCentre, Code)
        VALUES (@CostCentre, @SupplierCode)
      `);

    return {
      success: true,
      message: 'Supplier added to nominated suppliers list'
    };
  } catch (error) {
    console.error('Error adding nominated supplier:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Remove a supplier from a cost centre's nominated suppliers list
 */
async function removeNominatedSupplier(event, costCentre, supplierCode) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database connection not available' };
    }

    const sysDbName = getSystemDatabaseName();

    await pool.request()
      .input('CostCentre', costCentre)
      .input('SupplierCode', supplierCode)
      .query(`
        DELETE FROM [${sysDbName}].[dbo].[NominatedSupplier]
        WHERE CostCentre = @CostCentre AND Code = @SupplierCode
      `);

    return {
      success: true,
      message: 'Supplier removed from nominated suppliers list'
    };
  } catch (error) {
    console.error('Error removing nominated supplier:', error);
    return { success: false, message: error.message };
  }
}

module.exports = {
  getJobs,
  getOrdersForJob,
  getOrderLineItems,
  renderOrderPreview,
  renderOrderToPDF,
  getOrderSummary,
  getCostCentres,
  getJobsWithOrderCounts,
  getPreferredSuppliers,
  getSuppliersForCostCentre,
  updateOrder,
  logOrder,
  getOrderDetails,
  batchRenderPDF,
  batchPrint,
  batchEmail,
  batchSavePDF,
  getAllSuppliers,
  addNominatedSupplier,
  removeNominatedSupplier
};
