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
    if (!jobDbName) {
      return { success: false, message: 'Job Database not configured' };
    }

    const query = `
      SELECT
        JobNo,
        JobName,
        Client,
        Address,
        Status,
        StartDate
      FROM [${jobDbName}].[dbo].[Jobs]
      WHERE Status != 'Archived'
      ORDER BY JobNo DESC
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
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database connection not available' };
    }

    const jobDbName = getJobDatabaseName();
    const sysDbName = getSystemDatabaseName();

    if (!jobDbName) {
      return { success: false, message: 'Job Database not configured' };
    }

    // Get all cost centres with quantities for this job
    const query = `
      SELECT DISTINCT
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
    const html = await templateRenderer.renderOrder(
      orderNumber,
      settings.template || 'classic-po',
      settings
    );

    return {
      success: true,
      html
    };
  } catch (error) {
    console.error('Error rendering order preview:', error);
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
        j.JobNo,
        j.JobName,
        j.Client,
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
      LEFT JOIN [${jobDbName}].[dbo].[Jobs] j ON b.JobNo = j.JobNo
      LEFT JOIN [${sysDbName}].[dbo].[CostCentres] cc ON b.CostCentre = cc.Code AND cc.Tier = 1
      LEFT JOIN [${jobDbName}].[dbo].[Orders] o ON CONCAT(b.JobNo, '/', b.CostCentre, '.', b.BLoad) = o.OrderNumber
      LEFT JOIN [${sysDbName}].[dbo].[Supplier] s ON o.Supplier = s.Supplier_Code
      WHERE b.JobNo = @JobNo
        AND b.CostCentre = @CostCentre
        AND b.BLoad = @BLoad
        AND b.Quantity > 0
      GROUP BY
        j.JobNo,
        j.JobName,
        j.Client,
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

    if (!jobDbName) {
      return { success: false, message: 'Job Database not configured' };
    }

    const query = `
      SELECT
        j.JobNo,
        j.JobName,
        j.Client,
        j.Status,
        COUNT(DISTINCT CONCAT(b.CostCentre, '.', b.BLoad)) AS OrderCount,
        SUM(CASE WHEN o.OrderNumber IS NOT NULL THEN 1 ELSE 0 END) AS LoggedCount
      FROM [${jobDbName}].[dbo].[Jobs] j
      LEFT JOIN [${jobDbName}].[dbo].[Bill] b ON j.JobNo = b.JobNo AND b.Quantity > 0
      LEFT JOIN [${jobDbName}].[dbo].[Orders] o ON CONCAT(b.JobNo, '/', b.CostCentre, '.', b.BLoad) = o.OrderNumber
      WHERE j.Status != 'Archived'
      GROUP BY j.JobNo, j.JobName, j.Client, j.Status
      HAVING COUNT(DISTINCT CONCAT(b.CostCentre, '.', b.BLoad)) > 0
      ORDER BY j.JobNo DESC
    `;

    const result = await pool.request().query(query);

    return {
      success: true,
      jobs: result.recordset
    };
  } catch (error) {
    console.error('Error getting jobs with order counts:', error);
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
  getJobsWithOrderCounts
};
