const { getPool } = require('../database/connection');

/**
 * Get available databases on the server
 * IPC Handler: 'preferences:get-databases'
 */
async function getDatabases(event, params) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const query = `
      SELECT name
      FROM sys.databases
      WHERE database_id > 4
      AND state_desc = 'ONLINE'
      ORDER BY name
    `;

    const result = await pool.request().query(query);

    return {
      success: true,
      data: result.recordset.map(row => row.name)
    };

  } catch (err) {
    console.error('Error fetching databases:', err);
    return {
      success: false,
      error: 'Failed to fetch databases',
      message: err.message
    };
  }
}

/**
 * Get unit codes (PerCodes)
 * IPC Handler: 'preferences:get-units'
 */
async function getUnits(event, params) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const query = `
      SELECT
        Code,
        Printout,
        CalculationRoutine
      FROM PerCodes
      ORDER BY Printout
    `;

    const result = await pool.request().query(query);

    return {
      success: true,
      data: result.recordset
    };

  } catch (err) {
    console.error('Error fetching units:', err);
    return {
      success: false,
      error: 'Failed to fetch units',
      message: err.message
    };
  }
}

/**
 * Get cost centre banks
 * IPC Handler: 'preferences:get-cost-centre-banks'
 */
async function getCostCentreBanks(event, params) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const query = `
      SELECT CCBankCode, CCBankName
      FROM CCBanks
      ORDER BY CCBankCode
    `;

    const result = await pool.request().query(query);

    return {
      success: true,
      data: result.recordset
    };

  } catch (err) {
    console.error('Error fetching cost centre banks:', err);
    return {
      success: false,
      error: 'Failed to fetch cost centre banks',
      message: err.message
    };
  }
}

/**
 * Get price levels
 * IPC Handler: 'preferences:get-price-levels'
 */
async function getPriceLevels(event, params) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const query = `
      SELECT DISTINCT PriceLevel
      FROM Prices
      WHERE PriceLevel IS NOT NULL
      ORDER BY PriceLevel
    `;

    const result = await pool.request().query(query);

    return {
      success: true,
      data: result.recordset.map(row => row.PriceLevel),
      count: result.recordset.length
    };

  } catch (err) {
    console.error('Error fetching price levels:', err);
    return {
      success: false,
      error: 'Failed to fetch price levels',
      message: err.message
    };
  }
}

/**
 * Get supplier groups for preferences
 * IPC Handler: 'preferences:get-supplier-groups'
 */
async function getSupplierGroupsList(event, params) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const query = `
      SELECT
        GroupNumber,
        GroupName
      FROM [T_Esys].[dbo].[SupplierGroup]
      ORDER BY GroupNumber
    `;

    const result = await pool.request().query(query);

    return {
      success: true,
      count: result.recordset.length,
      data: result.recordset
    };

  } catch (err) {
    console.error('Error fetching supplier groups:', err);
    return {
      success: false,
      error: 'Failed to fetch supplier groups',
      message: err.message
    };
  }
}

/**
 * Test database connection (current or alternative) and validate Databuild schema
 * IPC Handler: 'preferences:test-connection'
 *
 * If params.database is provided, tests that specific database.
 * Otherwise, tests the current connection.
 */
async function testConnection(event, params) {
  const sql = require('mssql');
  const { database } = params || {};
  let tempPool = null;

  try {
    let pool;

    // If testing a different database, create temporary connection
    if (database && database.trim() !== '') {
      const currentPool = getPool();
      if (!currentPool) {
        return {
          success: false,
          connected: false,
          valid: false,
          message: 'Current database connection not available'
        };
      }

      // Get current connection config and change database
      const config = {
        ...currentPool.config,
        database: database
      };

      // Create temporary pool for testing
      tempPool = await sql.connect(config);
      pool = tempPool;
    } else {
      // Test current connection
      pool = getPool();
      if (!pool || !pool.connected) {
        return {
          success: false,
          connected: false,
          valid: false,
          message: 'Not connected to database'
        };
      }
    }

    // Test basic connection
    const result = await pool.request().query('SELECT DB_NAME() AS CurrentDatabase, @@SERVERNAME AS ServerName, @@VERSION AS Version');
    const dbInfo = result.recordset[0];

    // Validate Databuild database schema
    const validationQuery = `
      SELECT COUNT(*) AS TableCount
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME IN ('Supplier', 'PriceList', 'CostCentres', 'Recipe', 'SupplierGroup', 'CCBanks')
    `;

    const validationResult = await pool.request().query(validationQuery);
    const tableCount = validationResult.recordset[0].TableCount;
    const isValidDatabuildDatabase = tableCount >= 5; // At least 5 of the 6 core tables must exist

    // Close temporary pool if created
    if (tempPool) {
      await tempPool.close();
    }

    if (!isValidDatabuildDatabase) {
      return {
        success: false,
        connected: true,
        valid: false,
        error: 'Invalid database schema',
        message: 'Please select a Databuild Valid System Database. The selected database does not contain the required Databuild tables.',
        details: {
          database: dbInfo.CurrentDatabase,
          tablesFound: tableCount,
          tablesRequired: 6
        }
      };
    }

    return {
      success: true,
      connected: true,
      valid: true,
      message: 'Database connection successful and schema validated',
      connectionInfo: {
        server: dbInfo.ServerName,
        database: dbInfo.CurrentDatabase,
        version: dbInfo.Version,
        authenticationType: 'SQL Server Authentication',
        tablesValidated: tableCount
      }
    };

  } catch (err) {
    console.error('Error testing connection:', err);

    // Close temporary pool if it was created
    if (tempPool) {
      try {
        await tempPool.close();
      } catch (closeErr) {
        console.error('Error closing temp pool:', closeErr);
      }
    }

    return {
      success: false,
      connected: false,
      valid: false,
      message: err.message,
      error: 'Connection test failed',
      details: {
        database: database || 'current'
      }
    };
  }
}

module.exports = {
  getDatabases,
  getUnits,
  getCostCentreBanks,
  getPriceLevels,
  getSupplierGroupsList,
  testConnection
};
