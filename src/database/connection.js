const sql = require('mssql');

let dbPool = null;

/**
 * Connect to SQL Server database
 * @param {Object} dbConfig - Database configuration
 * @returns {Promise<Object>} Database pool
 */
async function connect(dbConfig) {
  try {
    if (dbPool && dbPool.connected) {
      console.log('✓ Using existing database connection');
      return dbPool;
    }

    const sqlConfig = {
      user: dbConfig.user,
      password: dbConfig.password,
      server: dbConfig.server,
      database: dbConfig.database,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
        instanceName: dbConfig.server.includes('\\')
          ? dbConfig.server.split('\\')[1]
          : undefined
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      }
    };

    dbPool = await sql.connect(sqlConfig);
    console.log('✓ Database connected successfully');
    return dbPool;
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    throw error;
  }
}

/**
 * Test database connection and validate Databuild schema
 * Validates BOTH System and Job databases (if configured)
 * @param {Object} dbConfig - Database configuration
 * @returns {Promise<Object>} Result with success flag and message
 */
async function testConnection(dbConfig) {
  let testPool = null;
  try {
    const sqlConfig = {
      user: dbConfig.user,
      password: dbConfig.password,
      server: dbConfig.server,
      database: dbConfig.systemDatabase || dbConfig.database,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
        instanceName: dbConfig.server.includes('\\')
          ? dbConfig.server.split('\\')[1]
          : undefined
      },
      connectionTimeout: 15000,
      requestTimeout: 15000
    };

    testPool = await sql.connect(sqlConfig);

    // Validate SYSTEM Database schema
    const systemResult = await testPool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME IN ('Supplier', 'PriceList', 'CostCentres', 'Recipe', 'SupplierGroup', 'CCBanks')
    `);

    const systemTables = systemResult.recordset.map(row => row.TABLE_NAME);

    // Check if Job Database is configured
    const jobDatabaseName = getJobDatabaseName(dbConfig);
    let jobTables = [];
    let jobDatabaseExists = false;

    // Test Job Database if it's configured (and not explicitly disabled)
    if (jobDatabaseName && dbConfig.enableJobDatabase !== false) {
      try {
        // Check if Job Database exists
        const dbCheckResult = await testPool.request().query(`
          SELECT name
          FROM sys.databases
          WHERE name = '${jobDatabaseName}'
        `);

        if (dbCheckResult.recordset.length > 0) {
          jobDatabaseExists = true;

          // Validate Job Database schema
          const jobResult = await testPool.request().query(`
            SELECT TABLE_NAME
            FROM [${jobDatabaseName}].INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
            AND TABLE_NAME IN ('Bill', 'Orders', 'OrderDetails')
          `);

          jobTables = jobResult.recordset.map(row => row.TABLE_NAME);
        }
      } catch (jobError) {
        console.warn('Job Database test failed:', jobError.message);
        // Don't fail the whole test if Job DB is unavailable
      }
    }

    await testPool.close();

    // Determine success based on System Database (Job DB is optional)
    if (systemTables.length >= 5) {
      let message = 'Connection successful! Databuild System database validated.';

      if (jobDatabaseExists && jobTables.length >= 3) {
        message += ` Job database (${jobDatabaseName}) also validated.`;
      } else if (jobDatabaseName && dbConfig.enableJobDatabase !== false) {
        message += ` Note: Job database (${jobDatabaseName}) not found or missing tables. Job import feature will be unavailable.`;
      }

      return {
        success: true,
        message,
        systemTables,
        jobTables,
        jobDatabaseName: jobDatabaseExists ? jobDatabaseName : null,
        jobDatabaseAvailable: jobDatabaseExists && jobTables.length >= 3
      };
    } else {
      return {
        success: false,
        message: `Connected but missing required Databuild tables. Found: ${systemTables.join(', ')}`
      };
    }
  } catch (error) {
    if (testPool) {
      await testPool.close().catch(() => {});
    }
    return {
      success: false,
      message: `Connection failed: ${error.message}`
    };
  }
}

/**
 * Get the current database pool
 * @returns {Object|null} Database pool or null
 */
function getPool() {
  return dbPool;
}

/**
 * Get Job Database name from System Database name
 * Auto-detects by replacing 'SYS' with 'JOB' or uses explicit configuration
 * @param {Object} dbConfig - Database configuration
 * @returns {string|null} Job database name or null if not configured
 */
function getJobDatabaseName(dbConfig) {
  // If explicitly configured, use it
  if (dbConfig.jobDatabase) {
    return dbConfig.jobDatabase;
  }

  // Get system database name
  const systemDb = dbConfig.systemDatabase || dbConfig.database;
  if (!systemDb) {
    return null;
  }

  // Auto-detect: Replace 'SYS' with 'JOB' (case-insensitive)
  if (systemDb.toUpperCase().endsWith('SYS')) {
    return systemDb.substring(0, systemDb.length - 3) + 'JOB';
  } else if (systemDb.toUpperCase().includes('SYS')) {
    // Replace SYS in middle of name (e.g., MySysDB → MyJobDB)
    return systemDb.replace(/SYS/gi, 'JOB').replace(/Sys/g, 'Job');
  }

  // No auto-detection possible
  return null;
}

/**
 * Switch to a different database on the same server
 * @param {string} newDatabase - Name of the new database
 * @param {Object} savedConfig - Saved database configuration with credentials
 * @returns {Promise<Object>} Result with success flag
 */
async function switchDatabase(newDatabase, savedConfig) {
  let newPool = null;
  const oldPool = dbPool;

  try {
    if (!savedConfig || !savedConfig.server || !savedConfig.user) {
      return {
        success: false,
        message: 'No saved database configuration available'
      };
    }

    console.log(`🔄 Switching database to: ${newDatabase}`);

    // Create new configuration with different database
    const newConfig = {
      user: savedConfig.user,
      password: savedConfig.password,
      server: savedConfig.server,
      database: newDatabase,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
        instanceName: savedConfig.server.includes('\\')
          ? savedConfig.server.split('\\')[1]
          : undefined
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      }
    };

    // Try to connect to new database FIRST before closing old connection
    newPool = await sql.connect(newConfig);
    console.log(`✓ Connected to new database: ${newDatabase}`);

    // Only after successful connection, close the old pool and switch
    if (oldPool) {
      try {
        await oldPool.close();
        console.log('✓ Closed previous database connection');
      } catch (closeErr) {
        console.warn('Warning: Error closing old pool:', closeErr.message);
        // Continue anyway since new connection is established
      }
    }

    // Update global pool reference
    dbPool = newPool;
    console.log(`✓ Successfully switched to database: ${newDatabase}`);

    return {
      success: true,
      message: `Successfully switched to database: ${newDatabase}`,
      database: newDatabase
    };

  } catch (error) {
    console.error('✗ Database switch failed:', error.message);

    // If new connection failed, make sure we still have the old connection
    if (newPool) {
      try {
        await newPool.close();
      } catch (closeErr) {
        console.error('Error closing failed new pool:', closeErr.message);
      }
    }

    // Ensure old pool is still active
    if (oldPool && !dbPool) {
      dbPool = oldPool;
      console.log('✓ Retained original database connection');
    }

    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Close database connection
 */
async function close() {
  if (dbPool) {
    await sql.close();
    dbPool = null;
    console.log('✓ Database connection closed');
  }
}

module.exports = {
  connect,
  testConnection,
  switchDatabase,
  getPool,
  getJobDatabaseName,
  close
};
