const { getPool } = require('../database/connection');

/**
 * Get all supplier groups
 * IPC Handler: 'suppliers:get-groups'
 */
async function getSupplierGroups(event, params) {
  try {
    console.log('[BACKEND] getSupplierGroups called');
    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const query = `
      SELECT
        GroupNumber,
        GroupName,
        Lcolor
      FROM SupplierGroup
      ORDER BY GroupNumber
    `;

    console.log('[BACKEND] Executing query:', query);
    const result = await pool.request().query(query);
    console.log('[BACKEND] Query result count:', result.recordset.length);
    console.log('[BACKEND] Groups found:', result.recordset);

    return {
      success: true,
      count: result.recordset.length,
      data: result.recordset
    };

  } catch (err) {
    console.error('[BACKEND] Error fetching supplier groups:', err);
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
    console.log('[DEBUG] getSuppliersList called with params:', params);

    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const { search, suppGroup, showArchived, limit = 100, offset = 0 } = params;

    // Build WHERE clause
    let whereConditions = [
      '(S.SupplierName IS NOT NULL AND S.SupplierName != \'\')'
    ];

    // Only filter out archived if showArchived is not true
    if (!showArchived) {
      whereConditions.push('S.Archived = 0');
    }

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
        S.Supplier_Code,
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
        S.Archived,
        SG.GroupName AS SupplierGroupName
      FROM Supplier S
      LEFT JOIN SupplierGroup SG ON S.SuppGroup = SG.GroupNumber
      ${whereClause}
      ORDER BY S.Supplier_Code
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    request.input('offset', parseInt(offset));
    request.input('limit', parseInt(limit));

    console.log('[DEBUG] Executing query:', query);
    console.log('[DEBUG] Where clause:', whereClause);

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

    console.log('[DEBUG] Query returned', result.recordset.length, 'rows');
    console.log('[DEBUG] Sample row:', result.recordset[0]);
    console.log('[DEBUG] Total count:', countResult.recordset[0]?.total);

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

/**
 * Archive/Unarchive a supplier
 * IPC Handler: 'suppliers:archive'
 */
async function archiveSupplier(event, params) {
  try {
    const { supplierCode, archived } = params;

    if (!supplierCode) {
      throw new Error('Supplier code is required');
    }

    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const query = `
      UPDATE Supplier
      SET Archived = @archived
      WHERE Supplier_Code = @supplierCode
    `;

    const request = pool.request();
    request.input('supplierCode', supplierCode);
    request.input('archived', archived ? 1 : 0);

    await request.query(query);

    return {
      success: true,
      message: `Supplier ${archived ? 'archived' : 'unarchived'} successfully`
    };

  } catch (err) {
    console.error('Error archiving supplier:', err);
    return {
      success: false,
      error: 'Failed to archive supplier',
      message: err.message
    };
  }
}

/**
 * Update supplier group
 * IPC Handler: 'suppliers:update-group'
 */
async function updateSupplierGroup(event, params) {
  try {
    const { supplierCode, suppGroup } = params;

    if (!supplierCode) {
      throw new Error('Supplier code is required');
    }

    if (suppGroup === undefined || suppGroup === null) {
      throw new Error('Supplier group is required');
    }

    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const query = `
      UPDATE Supplier
      SET SuppGroup = @suppGroup
      WHERE Supplier_Code = @supplierCode
    `;

    const request = pool.request();
    request.input('supplierCode', supplierCode);
    request.input('suppGroup', parseInt(suppGroup));

    await request.query(query);

    return {
      success: true,
      message: 'Supplier group updated successfully'
    };

  } catch (err) {
    console.error('Error updating supplier group:', err);
    return {
      success: false,
      error: 'Failed to update supplier group',
      message: err.message
    };
  }
}

module.exports = {
  getSupplierGroups,
  getSuppliersList,
  archiveSupplier,
  updateSupplierGroup
};
