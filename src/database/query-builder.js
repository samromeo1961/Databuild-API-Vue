const { getJobDatabaseName } = require('./connection');

/**
 * Query Builder - Helper functions for cross-database queries
 * Generates fully-qualified table names for System and Job databases
 */

/**
 * Table to Database mapping
 * Defines which tables belong to which database
 *
 * NOTE: Bill, Orders, and OrderDetails are marked as 'system' because
 * in many Databuild installations these tables exist in the System database
 * rather than a separate Job database.
 */
const TABLE_DATABASE_MAP = {
  // System Database Tables
  'PriceList': 'system',
  'CostCentres': 'system',
  'Recipe': 'system',
  'Prices': 'system',
  'PerCodes': 'system',
  'Supplier': 'system',
  'SupplierGroup': 'system',
  'Contacts': 'system',
  'ContactGroup': 'system',
  'CCBanks': 'system',
  'SuppliersPrices': 'system',

  // Job/Order Tables (often in System database)
  'Bill': 'system',
  'Orders': 'system',
  'OrderDetails': 'system'
};

/**
 * Get System Database name from config
 * @param {Object} dbConfig - Database configuration
 * @returns {string} System database name
 */
function getSystemDatabase(dbConfig) {
  return dbConfig.systemDatabase || dbConfig.database;
}

/**
 * Get Job Database name from config (with auto-detection)
 * @param {Object} dbConfig - Database configuration
 * @returns {string|null} Job database name or null if not configured
 */
function getJobDatabase(dbConfig) {
  return getJobDatabaseName(dbConfig);
}

/**
 * Qualify a table name with its database
 * Generates: [DatabaseName].[dbo].[TableName]
 *
 * @param {string} tableName - Table name (e.g., 'PriceList', 'Bill')
 * @param {Object} dbConfig - Database configuration
 * @returns {string} Fully-qualified table name
 *
 * @example
 * qualifyTable('PriceList', dbConfig)
 * // Returns: '[T_Esys].[dbo].[PriceList]'
 *
 * qualifyTable('Bill', dbConfig)
 * // Returns: '[T_EJob].[dbo].[Bill]'
 */
function qualifyTable(tableName, dbConfig) {
  // Determine which database this table belongs to
  const databaseType = TABLE_DATABASE_MAP[tableName] || 'system'; // Default to system

  let databaseName;

  if (databaseType === 'job') {
    databaseName = getJobDatabase(dbConfig);
    if (!databaseName) {
      throw new Error(`Job Database not configured. Cannot qualify table: ${tableName}`);
    }
  } else {
    databaseName = getSystemDatabase(dbConfig);
    if (!databaseName) {
      throw new Error(`System Database not configured. Cannot qualify table: ${tableName}`);
    }
  }

  return `[${databaseName}].[dbo].[${tableName}]`;
}

/**
 * Build a cross-database JOIN query fragment
 * Helper for common pattern of joining System and Job database tables
 *
 * @param {string} jobTable - Job database table name
 * @param {string} systemTable - System database table name
 * @param {string} joinCondition - JOIN ON condition
 * @param {Object} dbConfig - Database configuration
 * @returns {string} SQL JOIN fragment
 *
 * @example
 * buildCrossJoin('Bill', 'CostCentres', 'b.CostCentre = cc.Code AND cc.Tier = 1', dbConfig)
 * // Returns: '[T_EJob].[dbo].[Bill] b LEFT JOIN [T_Esys].[dbo].[CostCentres] cc ON b.CostCentre = cc.Code AND cc.Tier = 1'
 */
function buildCrossJoin(jobTable, systemTable, joinCondition, dbConfig) {
  const qualifiedJobTable = qualifyTable(jobTable, dbConfig);
  const qualifiedSystemTable = qualifyTable(systemTable, dbConfig);

  // Extract aliases from table names (assume first letter lowercase)
  const jobAlias = jobTable.charAt(0).toLowerCase();
  const systemAlias = systemTable.charAt(0).toLowerCase() + systemTable.charAt(1).toLowerCase();

  return `${qualifiedJobTable} ${jobAlias} LEFT JOIN ${qualifiedSystemTable} ${systemAlias} ON ${joinCondition}`;
}

/**
 * Check if Job Database is available in config
 * @param {Object} dbConfig - Database configuration
 * @returns {boolean} True if Job Database is configured
 */
function isJobDatabaseAvailable(dbConfig) {
  return !!getJobDatabase(dbConfig);
}

/**
 * Get all qualified table names for a database type
 * Useful for schema validation or bulk operations
 *
 * @param {string} databaseType - 'system' or 'job'
 * @param {Object} dbConfig - Database configuration
 * @returns {Array<string>} Array of fully-qualified table names
 */
function getQualifiedTables(databaseType, dbConfig) {
  const tables = Object.entries(TABLE_DATABASE_MAP)
    .filter(([table, type]) => type === databaseType)
    .map(([table]) => table);

  return tables.map(table => qualifyTable(table, dbConfig));
}

module.exports = {
  qualifyTable,
  buildCrossJoin,
  getSystemDatabase,
  getJobDatabase,
  isJobDatabaseAvailable,
  getQualifiedTables,
  TABLE_DATABASE_MAP
};
