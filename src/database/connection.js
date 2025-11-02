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
      database: dbConfig.database,
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

    // Validate Databuild schema
    const result = await testPool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME IN ('Supplier', 'PriceList', 'CostCentres', 'Recipe', 'SupplierGroup', 'CCBanks')
    `);

    const tables = result.recordset.map(row => row.TABLE_NAME);

    await testPool.close();

    if (tables.length >= 5) {
      return {
        success: true,
        message: 'Connection successful! Databuild schema validated.',
        tables
      };
    } else {
      return {
        success: false,
        message: `Connected but missing required Databuild tables. Found: ${tables.join(', ')}`
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
  getPool,
  close
};
