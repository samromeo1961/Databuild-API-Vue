/**
 * Purchase Order Diagnostics
 * Checks database for Jobs and Orders data
 */

const { getPool, getJobDatabaseName } = require('../database/connection');

/**
 * Check if Job database has data for Purchase Orders
 */
async function checkPOData(event) {
  const pool = getPool();
  if (!pool) {
    return {
      success: false,
      message: 'No database connection'
    };
  }

  const dbConfig = pool.config;
  const systemDbName = dbConfig.database;
  const jobDbName = getJobDatabaseName(dbConfig);

  if (!jobDbName) {
    return {
      success: false,
      message: 'Job Database not configured',
      hasSystemDb: true,
      hasJobDb: false
    };
  }

  try {
    // Check Jobs table
    const jobsQuery = `SELECT COUNT(*) as jobCount FROM [${jobDbName}].[dbo].[Jobs] WHERE Archived = 0`;
    const jobsResult = await pool.request().query(jobsQuery);
    const jobCount = jobsResult.recordset[0].jobCount;

    // Check Orders table
    const ordersQuery = `SELECT COUNT(*) as orderCount FROM [${jobDbName}].[dbo].[Orders]`;
    const ordersResult = await pool.request().query(ordersQuery);
    const orderCount = ordersResult.recordset[0].orderCount;

    // Check Bill table
    const billQuery = `SELECT COUNT(*) as billCount FROM [${jobDbName}].[dbo].[Bill]`;
    const billResult = await pool.request().query(billQuery);
    const billCount = billResult.recordset[0].billCount;

    // Get sample job numbers
    const sampleJobsQuery = `SELECT TOP 3 JobNo, JobName FROM [${jobDbName}].[dbo].[Jobs] WHERE Archived = 0 ORDER BY JobNo`;
    const sampleJobsResult = await pool.request().query(sampleJobsQuery);
    const sampleJobs = sampleJobsResult.recordset;

    return {
      success: true,
      hasSystemDb: true,
      hasJobDb: true,
      systemDatabase: systemDbName,
      jobDatabase: jobDbName,
      data: {
        jobs: jobCount,
        orders: orderCount,
        billLines: billCount
      },
      sampleJobs,
      hasData: jobCount > 0 && billCount > 0,
      message: jobCount > 0 && billCount > 0
        ? `Found ${jobCount} jobs with ${billCount} bill lines`
        : 'No Jobs or Orders data found in database'
    };

  } catch (error) {
    console.error('Error checking PO data:', error);
    return {
      success: false,
      message: error.message,
      error: error.toString()
    };
  }
}

/**
 * Get sample data for testing (when no real data exists)
 */
function getSamplePOData(event) {
  return {
    success: true,
    sampleJobs: [
      {
        JobNo: 'DEMO001',
        JobName: 'Sample Commercial Build',
        Client: 'Demo Client Pty Ltd',
        Status: 'Active',
        OrderCount: 5,
        LoggedCount: 2
      },
      {
        JobNo: 'DEMO002',
        JobName: 'Residential Renovation',
        Client: 'Smith & Associates',
        Status: 'Active',
        OrderCount: 3,
        LoggedCount: 1
      }
    ],
    sampleOrders: [
      {
        OrderNumber: 'DEMO001/Plumb.1',
        CostCentre: 'Plumb',
        CostCentreName: 'Plumbing',
        SupplierName: 'ABC Plumbing Supplies',
        ItemCount: 12,
        OrderTotal: 15750.50,
        OrderDate: new Date().toISOString(),
        IsLogged: 0
      },
      {
        OrderNumber: 'DEMO001/Elec.1',
        CostCentre: 'Elec',
        CostCentreName: 'Electrical',
        SupplierName: 'XYZ Electrical',
        ItemCount: 8,
        OrderTotal: 8950.00,
        OrderDate: new Date().toISOString(),
        IsLogged: 1
      },
      {
        OrderNumber: 'DEMO001/Carp.1',
        CostCentre: 'Carp',
        CostCentreName: 'Carpentry',
        SupplierName: 'Timber & Hardware Co',
        ItemCount: 25,
        OrderTotal: 22300.75,
        OrderDate: new Date().toISOString(),
        IsLogged: 0
      }
    ]
  };
}

module.exports = {
  checkPOData,
  getSamplePOData
};
