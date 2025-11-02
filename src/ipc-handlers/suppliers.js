const { getPool } = require('../database/connection');

/**
 * Get all supplier groups
 * IPC Handler: 'suppliers:get-groups'
 */
async function getSupplierGroups(event, params) {
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
 * Get suppliers list
 * IPC Handler: 'suppliers:get-list'
 */
async function getSuppliersList(event, params) {
  try {
    const { search, suppGroup, limit = 100, offset = 0 } = params;

    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    // Build WHERE clause
    let whereConditions = [
      'S.SuppGroup < 3',
      'S.Archived = 0',
      '(S.SupplierName IS NOT NULL AND S.SupplierName != \'\')'
    ];
    const request = pool.request();

    // Add supplier group filter
    if (suppGroup) {
      const groupArray = suppGroup.split(',').map(g => parseInt(g.trim())).filter(g => !isNaN(g));
      if (groupArray.length === 1) {
        whereConditions.push('SuppGroup = @suppGroup');
        request.input('suppGroup', groupArray[0]);
      } else if (groupArray.length > 1) {
        const placeholders = groupArray.map((_, index) => `@suppGroup${index}`).join(',');
        whereConditions.push(`SuppGroup IN (${placeholders})`);
        groupArray.forEach((group, index) => {
          request.input(`suppGroup${index}`, group);
        });
      }
    }

    // Enhanced search across multiple fields
    if (search) {
      const searchWords = search.trim().split(/\s+/).filter(word => word.length > 0);

      if (searchWords.length === 1) {
        whereConditions.push(`(
          SupplierName LIKE @search
          OR AccountContact LIKE @search
          OR AccountEmail LIKE @search
        )`);
        request.input('search', `%${search}%`);
      } else {
        const conditions = searchWords.map((word, index) => {
          request.input(`searchWord${index}`, `%${word}%`);
          return `(SupplierName LIKE @searchWord${index} OR AccountContact LIKE @searchWord${index} OR AccountEmail LIKE @searchWord${index})`;
        });
        whereConditions.push(`(${conditions.join(' AND ')})`);
      }
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const query = `
      SELECT
        S.Supplier_Code AS ShortName,
        S.SupplierName,
        S.ACN,
        S.SuppGroup,
        S.AccountAddress,
        S.AccountCity,
        S.AccountState,
        S.AccountPostcode,
        S.AccountContact,
        S.AccountEmail,
        S.AccountPhone,
        S.AccountMobile,
        SG.GroupName AS SupplierGroupName
      FROM Supplier S
      LEFT JOIN [T_Esys].[dbo].[SupplierGroup] SG ON S.SuppGroup = SG.GroupNumber
      ${whereClause}
      ORDER BY S.SupplierName
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    request.input('offset', parseInt(offset));
    request.input('limit', parseInt(limit));

    // Count query
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM Supplier S
      ${whereClause}
    `;

    const countRequest = pool.request();
    if (search) {
      const searchWords = search.trim().split(/\s+/).filter(word => word.length > 0);
      if (searchWords.length === 1) {
        countRequest.input('search', `%${search}%`);
      } else {
        searchWords.forEach((word, index) => {
          countRequest.input(`searchWord${index}`, `%${word}%`);
        });
      }
    }

    if (suppGroup) {
      const groupArray = suppGroup.split(',').map(g => parseInt(g.trim())).filter(g => !isNaN(g));
      if (groupArray.length === 1) {
        countRequest.input('suppGroup', groupArray[0]);
      } else if (groupArray.length > 1) {
        groupArray.forEach((group, index) => {
          countRequest.input(`suppGroup${index}`, group);
        });
      }
    }

    const [result, countResult] = await Promise.all([
      request.query(query),
      countRequest.query(countQuery)
    ]);

    return {
      success: true,
      total: countResult.recordset[0]?.total || 0,
      limit: parseInt(limit),
      offset: parseInt(offset),
      count: result.recordset.length,
      data: result.recordset
    };

  } catch (err) {
    console.error('Error fetching suppliers:', err);
    return {
      success: false,
      error: 'Failed to fetch suppliers',
      message: err.message
    };
  }
}

module.exports = {
  getSupplierGroups,
  getSuppliersList
};
