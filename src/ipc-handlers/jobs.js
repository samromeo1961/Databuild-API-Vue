const db = require('../database/connection');
const { qualifyTable } = require('../database/query-builder');

/**
 * Search for a job by job number and return all job items
 * with cost centre details and suggested zzType based on quantity
 *
 * @param {string} jobNumber - Job number to search
 * @param {string} defaultZzType - Default zzType for items with quantity ≠ 1
 * @param {Object} dbConfig - Database configuration
 * @returns {Object} Result with job items array
 */
async function searchJob(jobNumber, defaultZzType, dbConfig) {
  try {
    const pool = db.getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    // Build fully-qualified table names using query-builder
    const billTable = qualifyTable('Bill', dbConfig);
    const costCentresTable = qualifyTable('CostCentres', dbConfig);
    const priceListTable = qualifyTable('PriceList', dbConfig);
    const perCodesTable = qualifyTable('PerCodes', dbConfig);

    // Query job items with cross-database join
    const query = `
      SELECT
        b.ItemCode,
        b.CostCentre,
        cc.Name AS CostCentreName,
        cc.SubGroup,
        b.Quantity,
        b.UnitPrice,
        b.LineNumber,
        pl.Description,
        pc.Printout AS Unit,
        -- Quantity-based zzType logic
        CASE
          WHEN b.Quantity = 1 THEN 'part'
          ELSE @defaultZzType
        END AS suggestedZzType
      FROM ${billTable} b
      LEFT JOIN ${costCentresTable} cc ON b.CostCentre = cc.Code AND cc.Tier = 1
      LEFT JOIN ${priceListTable} pl ON b.ItemCode = pl.PriceCode
      LEFT JOIN ${perCodesTable} pc ON pl.PerCode = pc.Code
      WHERE b.JobNo = @jobNumber
      ORDER BY b.LineNumber
    `;

    const result = await pool.request()
      .input('jobNumber', jobNumber)
      .input('defaultZzType', defaultZzType || 'area')
      .query(query);

    return {
      success: true,
      data: result.recordset,
      count: result.recordset.length
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
    const query = `
      SELECT
        o.JobNo,
        COUNT(b.ItemCode) AS ItemCount,
        SUM(b.Quantity * b.UnitPrice) AS TotalValue
      FROM ${ordersTable} o
      LEFT JOIN ${billTable} b ON o.JobNo = b.JobNo
      WHERE o.JobNo = @jobNumber
      GROUP BY o.JobNo
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

    const ordersTable = qualifyTable('Orders', dbConfig);

    // Get all jobs from Orders table (simplified to use only JobNo)
    const query = `
      SELECT TOP 500
        JobNo,
        '' AS Description
      FROM ${ordersTable}
      WHERE JobNo IS NOT NULL
      ORDER BY JobNo DESC
    `;

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

    const jobDatabase = dbConfig.jobDatabase || dbConfig.database;

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
