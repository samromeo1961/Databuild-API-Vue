const templateRenderer = require('../services/template-renderer');
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
        o.OrderDate,
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
        o.OrderDate,
        o.OrderNumber,
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
        o.OrderDate,
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
        o.OrderDate,
        o.OrderNumber
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
 * Render order preview HTML
 */
async function renderOrderPreview(event, orderNumber, settings) {
  try {
    console.log('Rendering order preview for:', orderNumber);
    console.log('Settings:', settings);

    const html = await templateRenderer.renderOrder(
      orderNumber,
      settings.template || 'classic-po',
      settings
    );

    // Ensure we're returning a plain string, not any object references
    const plainHtml = String(html);

    console.log('Preview rendered successfully, HTML length:', plainHtml.length);

    return {
      success: true,
      html: plainHtml
    };
  } catch (error) {
    console.error('Error rendering order preview:', error);
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
        COUNT(DISTINCT CONCAT(b.CostCentre, '.', b.BLoad)) AS OrderCount,
        SUM(CASE WHEN o.OrderNumber IS NOT NULL THEN 1 ELSE 0 END) AS LoggedCount
      FROM [${jobDbName}].[dbo].[Jobs] j
      LEFT JOIN [${sysDbName}].[dbo].[Contacts] c ON j.Job_No = c.Code
      LEFT JOIN [${jobDbName}].[dbo].[Bill] b ON j.Job_No = b.JobNo AND b.Quantity > 0
      LEFT JOIN [${jobDbName}].[dbo].[Orders] o ON CONCAT(b.JobNo, '/', b.CostCentre, '.', b.BLoad) = o.OrderNumber
      WHERE j.Status != 'Archived'
      GROUP BY j.Job_No, c.Address, c.Name, j.Status
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
            OrderCount: 5,
            LoggedCount: 2
          },
          {
            JobNo: 'DEMO002',
            JobName: 'Residential Renovation - Smith Residence',
            Client: 'Smith & Associates',
            Status: 'Active',
            OrderCount: 3,
            LoggedCount: 1
          },
          {
            JobNo: 'DEMO003',
            JobName: 'Office Fitout - CBD Tower Level 8',
            Client: 'Corporate Solutions Ltd',
            Status: 'Active',
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

    // Check if CCSuppliers table exists
    const checkTable = await pool.request().query(`
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'dbo'
      AND TABLE_NAME = 'CCSuppliers'
      AND TABLE_CATALOG = '${sysDbName}'
    `);

    if (checkTable.recordset.length === 0) {
      // CCSuppliers table doesn't exist - return empty result
      return {
        success: true,
        suppliers: [],
        preferredSupplier: null,
        message: 'CCSuppliers table not found - Preferred Suppliers feature not available'
      };
    }

    const query = `
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

    const result = await pool.request()
      .input('CostCentre', costCentre)
      .query(query);

    return {
      success: true,
      suppliers: result.recordset,
      preferredSupplier: result.recordset.find(s => s.Preferred === 1) || null
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

    // Check if CCSuppliers table exists
    const checkTable = await pool.request().query(`
      SELECT 1 FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'dbo'
      AND TABLE_NAME = 'CCSuppliers'
      AND TABLE_CATALOG = '${sysDbName}'
    `);

    const hasCCSuppliers = checkTable.recordset.length > 0;

    const query = hasCCSuppliers ? `
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
    ` : `
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

module.exports = {
  getJobs,
  getOrdersForJob,
  getOrderLineItems,
  renderOrderPreview,
  getOrderSummary,
  getCostCentres,
  getJobsWithOrderCounts,
  getPreferredSuppliers,
  getSuppliersForCostCentre
};
