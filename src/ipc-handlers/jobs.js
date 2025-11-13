const db = require('../database/connection');
const { qualifyTable, getJobDatabase } = require('../database/query-builder');

/**
 * Search for a job by job number and return all job items
 * with cost centre details and suggested zzType based on quantity
 *
 * @param {string} jobNumber - Job number to search
 * @param {string} defaultZzType - Default zzType for items with quantity ≠ 1
 * @param {Object} dbConfig - Database configuration
 * @returns {Object} Result with job items array and job info
 */
async function searchJob(jobNumber, defaultZzType, dbConfig) {
  try {
    const pool = db.getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    // Diagnostic logging
    console.log('🔍 searchJob - Config:', {
      systemDatabase: dbConfig.systemDatabase || dbConfig.database,
      jobDatabase: dbConfig.jobDatabase,
      autoDetected: !dbConfig.jobDatabase
    });

    // Build fully-qualified table names using query-builder
    const billTable = qualifyTable('Bill', dbConfig);
    const ordersTable = qualifyTable('Orders', dbConfig);
    const orderDetailsTable = qualifyTable('OrderDetails', dbConfig);
    const costCentresTable = qualifyTable('CostCentres', dbConfig);
    const priceListTable = qualifyTable('PriceList', dbConfig);
    const perCodesTable = qualifyTable('PerCodes', dbConfig);
    const jobsTable = qualifyTable('Jobs', dbConfig);
    const contactsTable = qualifyTable('Contacts', dbConfig);

    console.log('📊 Qualified table names:', {
      billTable,
      ordersTable,
      orderDetailsTable,
      costCentresTable,
      priceListTable,
      perCodesTable,
      jobsTable,
      contactsTable
    });

    // First, get job info (Schedule Profile and Address)
    const jobInfoQuery = `
      SELECT
        j.Job_No AS JobNo,
        j.ScheduleProfile,
        c.Address,
        c.City
      FROM ${jobsTable} j
      LEFT JOIN ${contactsTable} c ON j.Job_No = c.Code
      WHERE j.Job_No = @jobNumber
    `;

    const jobInfoResult = await pool.request()
      .input('jobNumber', jobNumber)
      .query(jobInfoQuery);

    const jobInfo = jobInfoResult.recordset.length > 0 ? jobInfoResult.recordset[0] : null;

    // Query job items with cross-database join
    // Full query matching user's requirements with Orders, OrderDetails, and System DB tables
    const query = `
      WITH OrderDetailsRanked AS (
        SELECT
          Code,
          Description,
          ROW_NUMBER() OVER (PARTITION BY Code ORDER BY (SELECT NULL)) AS RowNum
        FROM ${orderDetailsTable}
      )
      SELECT
        b.ItemCode,
        b.CostCentre,
        cc.Name AS CostCentreName,
        cc.SubGroup,
        odr.Description,
        b.XDescription AS Workup,
        b.Quantity,
        pc.Printout AS Unit,
        b.UnitPrice,
        CONCAT(b.JobNo, '/', b.CostCentre, '.', b.BLoad) AS OrderNumber,
        b.LineNumber,
        o.Supplier,
        o.CCSortOrder,
        -- Quantity-based zzType logic
        CASE
          WHEN b.Quantity = 1 THEN 'part'
          ELSE @defaultZzType
        END AS suggestedZzType
      FROM ${billTable} b
      LEFT JOIN ${ordersTable} o ON CONCAT(b.JobNo, '/', b.CostCentre, '.', b.BLoad) = o.OrderNumber
      LEFT JOIN OrderDetailsRanked odr ON b.ItemCode = odr.Code AND odr.RowNum = 1
      LEFT JOIN ${priceListTable} pl ON b.ItemCode = pl.PriceCode
      LEFT JOIN ${perCodesTable} pc ON pl.PerCode = pc.Code
      LEFT JOIN ${costCentresTable} cc ON b.CostCentre = cc.Code AND cc.Tier = 1
      WHERE b.JobNo = @jobNumber
      ORDER BY ISNULL(o.CCSortOrder, 999999), b.CostCentre, b.LineNumber
    `;

    const result = await pool.request()
      .input('jobNumber', jobNumber)
      .input('defaultZzType', defaultZzType || 'area')
      .query(query);

    return {
      success: true,
      data: result.recordset,
      count: result.recordset.length,
      jobInfo: jobInfo  // Include job info (ScheduleProfile, Address, City)
    };

  } catch (error) {
    console.error('Error searching job:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

/**
 * Get job summary information
 *
 * @param {string} jobNumber - Job number to search
 * @param {Object} dbConfig - Database configuration
 * @returns {Object} Result with job summary
 */
async function getJobSummary(jobNumber, dbConfig) {
  try {
    const pool = db.getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const ordersTable = qualifyTable('Orders', dbConfig);
    const billTable = qualifyTable('Bill', dbConfig);

    // Get job summary from Orders table
    // Note: Orders table has 'Job' column (not 'JobNo')
    const query = `
      SELECT
        o.Job AS JobNo,
        COUNT(b.ItemCode) AS ItemCount,
        SUM(b.Quantity * b.UnitPrice) AS TotalValue
      FROM ${ordersTable} o
      LEFT JOIN ${billTable} b ON o.Job = b.JobNo
      WHERE o.Job = @jobNumber
      GROUP BY o.Job
    `;

    const result = await pool.request()
      .input('jobNumber', jobNumber)
      .query(query);

    if (result.recordset.length > 0) {
      return {
        success: true,
        data: result.recordset[0]
      };
    } else {
      return {
        success: false,
        message: `Job ${jobNumber} not found`,
        data: null
      };
    }

  } catch (error) {
    console.error('Error getting job summary:', error);
    return {
      success: false,
      message: error.message,
      data: null
    };
  }
}

/**
 * Get list of all jobs
 *
 * @param {Object} dbConfig - Database configuration
 * @returns {Object} Result with jobs array
 */
async function getJobsList(dbConfig) {
  try {
    const pool = db.getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    // Diagnostic logging
    console.log('🔍 getJobsList - Config:', {
      systemDatabase: dbConfig.systemDatabase || dbConfig.database,
      jobDatabase: dbConfig.jobDatabase,
      autoDetected: !dbConfig.jobDatabase
    });

    const ordersTable = qualifyTable('Orders', dbConfig);
    const contactsTable = qualifyTable('Contacts', dbConfig);

    console.log('📊 Qualified tables:', {
      ordersTable,
      contactsTable
    });

    // Get all unique jobs from Orders table with address from Contacts
    // Cross-database JOIN: Orders (Job DB) with Contacts (System DB)
    // Match: Orders.Job = Contacts.Code
    // Filter: Only show jobs where Contact.Debtor = 1
    const query = `
      SELECT DISTINCT TOP 500
        o.Job AS JobNo,
        c.Address,
        c.City,
        CAST(COALESCE(o.OrderText, '') AS NVARCHAR(MAX)) AS Description
      FROM ${ordersTable} o
      LEFT JOIN ${contactsTable} c ON o.Job = c.Code
      WHERE o.Job IS NOT NULL
        AND o.Job <> ''
        AND c.Debtor = 1
      ORDER BY o.Job DESC
    `;

    console.log('🔍 Jobs query:', query);

    const result = await pool.request().query(query);

    return {
      success: true,
      data: result.recordset,
      count: result.recordset.length
    };

  } catch (error) {
    console.error('Error getting jobs list:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

/**
 * Get all tables in Job database (diagnostic)
 *
 * @param {Object} dbConfig - Database configuration
 * @returns {Object} Result with table information
 */
async function getJobDatabaseTables(dbConfig) {
  try {
    const pool = db.getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    // Use query-builder helper for proper auto-detection (T_Esys → T_EJOB)
    const jobDatabase = getJobDatabase(dbConfig);

    // Get all tables
    const tablesQuery = `
      SELECT
        TABLE_NAME,
        TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_CATALOG = @database
        AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `;

    const tablesResult = await pool.request()
      .input('database', jobDatabase)
      .query(tablesQuery);

    // For each table, get column count and sample columns
    const tables = [];
    for (const table of tablesResult.recordset) {
      const columnsQuery = `
        SELECT
          COLUMN_NAME,
          DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = @tableName
          AND TABLE_CATALOG = @database
        ORDER BY ORDINAL_POSITION
      `;

      const columnsResult = await pool.request()
        .input('database', jobDatabase)
        .input('tableName', table.TABLE_NAME)
        .query(columnsQuery);

      tables.push({
        tableName: table.TABLE_NAME,
        columnCount: columnsResult.recordset.length,
        columns: columnsResult.recordset.map(c => `${c.COLUMN_NAME} (${c.DATA_TYPE})`)
      });
    }

    return {
      success: true,
      database: jobDatabase,
      data: tables
    };

  } catch (error) {
    console.error('Error getting job database tables:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

/**
 * Get column information for Orders table (diagnostic)
 *
 * @param {Object} dbConfig - Database configuration
 * @returns {Object} Result with column information
 */
async function getOrdersColumns(dbConfig) {
  try {
    const pool = db.getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const jobDatabase = dbConfig.jobDatabase || dbConfig.database;

    const query = `
      SELECT
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Orders'
        AND TABLE_CATALOG = @database
      ORDER BY ORDINAL_POSITION
    `;

    const result = await pool.request()
      .input('database', jobDatabase)
      .query(query);

    return {
      success: true,
      data: result.recordset
    };

  } catch (error) {
    console.error('Error getting Orders columns:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

module.exports = {
  searchJob,
  getJobSummary,
  getJobsList,
  getOrdersColumns,
  getJobDatabaseTables
};
