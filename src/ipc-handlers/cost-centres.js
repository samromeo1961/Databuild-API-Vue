const { getPool } = require('../database/connection');

/**
 * Get cost centres list
 * IPC Handler: 'cost-centres:get-list'
 */
async function getCostCentresList(event, params) {
  try {
    const { tier = 1 } = params || {};

    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const request = pool.request();
    request.input('tier', parseInt(tier));

    const query = `
      SELECT
        CC.Code,
        CC.SubGroup,
        CC.Name,
        CC.SortOrder,
        CC.Tier
      FROM CostCentres CC
      WHERE CC.Tier = @tier
      GROUP BY CC.Code, CC.SubGroup, CC.Name, CC.SortOrder, CC.Tier
      ORDER BY CC.SortOrder, CC.SubGroup
    `;

    const result = await request.query(query);

    return {
      success: true,
      count: result.recordset.length,
      filters: {
        tier: parseInt(tier)
      },
      data: result.recordset
    };

  } catch (err) {
    console.error('Error fetching cost centres:', err);
    return {
      success: false,
      error: 'Failed to fetch cost centres',
      message: err.message
    };
  }
}

/**
 * Get a specific cost centre
 * IPC Handler: 'cost-centres:get-item'
 */
async function getCostCentre(event, code) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const request = pool.request();
    request.input('code', code);

    const query = `
      SELECT
        CC.Code,
        CC.SubGroup,
        CC.Name,
        CC.SortOrder,
        CC.Tier
      FROM CostCentres CC
      WHERE CC.Code = @code
    `;

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return {
        success: false,
        error: 'Cost centre not found'
      };
    }

    return {
      success: true,
      data: result.recordset[0]
    };

  } catch (err) {
    console.error('Error fetching cost centre:', err);
    return {
      success: false,
      error: 'Failed to fetch cost centre',
      message: err.message
    };
  }
}

module.exports = {
  getCostCentresList,
  getCostCentre
};
