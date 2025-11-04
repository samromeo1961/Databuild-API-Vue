const { getPool } = require('../database/connection');

/**
 * Get catalogue items with latest prices
 * IPC Handler: 'catalogue:get-items'
 */
async function getCatalogueItems(event, params) {
  try {
    const {
      searchTerm,
      costCentre,
      costCentres,
      dateFrom,
      dateTo,
      showArchived = false,
      limit = 100,
      offset = 0,
      sortField,
      sortOrder = 'asc',
      // Column filters
      ItemCode,
      Description,
      CostCentre: costCentreFilter,
      CostCentreName,
      Unit,
      Category,
      Recipe,
      LatestPrice,
      LatestPriceDate
    } = params;

    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    // Build WHERE clause - removed CC.Tier = 1 from here, moved to JOIN
    // Filter out archived items unless showArchived is true
    let whereConditions = [];
    if (!showArchived) {
      whereConditions.push('PL.Archived = 0');
    }
    const request = pool.request();

    // Add search term filter
    if (searchTerm) {
      const searchWords = searchTerm.trim().split(/\s+/).filter(word => word.length > 0);

      if (searchWords.length === 1) {
        whereConditions.push(`(PL.PriceCode LIKE @searchTerm OR PL.Description LIKE @searchTerm)`);
        request.input('searchTerm', `%${searchTerm}%`);
      } else {
        const descriptionConditions = searchWords.map((word, index) => {
          request.input(`searchWord${index}`, `%${word}%`);
          return `PL.Description LIKE @searchWord${index}`;
        });

        const priceCodeConditions = searchWords.map((word, index) => {
          return `PL.PriceCode LIKE @searchWord${index}`;
        });

        whereConditions.push(
          `((${descriptionConditions.join(' AND ')}) OR (${priceCodeConditions.join(' AND ')}))`
        );
      }
    }

    // Add cost centre filter (supports both single and multiple cost centres)
    if (costCentres && Array.isArray(costCentres) && costCentres.length > 0) {
      // Multiple cost centres selected
      console.log('Backend received costCentres:', costCentres);
      const costCentrePlaceholders = costCentres.map((_, index) => `@costCentre${index}`).join(',');
      whereConditions.push(`PL.CostCentre IN (${costCentrePlaceholders})`);
      console.log('SQL filter:', `PL.CostCentre IN (${costCentrePlaceholders})`);
      costCentres.forEach((cc, index) => {
        request.input(`costCentre${index}`, cc);
      });
    } else if (costCentre) {
      // Single cost centre (legacy support)
      console.log('Backend received single costCentre:', costCentre);
      whereConditions.push(`PL.CostCentre = @costCentre`);
      request.input('costCentre', costCentre);
    }

    // Add column filters
    if (ItemCode) {
      whereConditions.push(`PL.PriceCode LIKE @itemCodeFilter`);
      request.input('itemCodeFilter', `%${ItemCode}%`);
    }

    if (Description) {
      whereConditions.push(`PL.Description LIKE @descriptionFilter`);
      request.input('descriptionFilter', `%${Description}%`);
    }

    if (costCentreFilter) {
      whereConditions.push(`PL.CostCentre LIKE @costCentreFilter`);
      request.input('costCentreFilter', `%${costCentreFilter}%`);
    }

    if (CostCentreName) {
      whereConditions.push(`CC.Name LIKE @costCentreNameFilter`);
      request.input('costCentreNameFilter', `%${CostCentreName}%`);
    }

    if (Unit) {
      whereConditions.push(`PC.Printout LIKE @unitFilter`);
      request.input('unitFilter', `%${Unit}%`);
    }

    if (Category) {
      whereConditions.push(`CC.SubGroup LIKE @categoryFilter`);
      request.input('categoryFilter', `%${Category}%`);
    }

    if (Recipe) {
      // Recipe filter: "True" = 1, "False" = 0
      if (Recipe.toLowerCase() === 'true') {
        whereConditions.push(`PL.Recipe = 1`);
      } else if (Recipe.toLowerCase() === 'false') {
        whereConditions.push(`PL.Recipe = 0`);
      }
    }

    if (LatestPrice) {
      whereConditions.push(`LP.Price = @latestPriceFilter`);
      request.input('latestPriceFilter', parseFloat(LatestPrice));
    }

    if (LatestPriceDate) {
      whereConditions.push(`CAST(LP.Date AS DATE) = @latestPriceDateFilter`);
      request.input('latestPriceDateFilter', LatestPriceDate);
    }

    // Add date inputs for SQL query (dates are used in CTE, not in WHERE clause)
    if (dateFrom) {
      request.input('dateFrom', dateFrom);
      console.log(`Filtering by date from: ${dateFrom}`);
    }
    if (dateTo) {
      request.input('dateTo', dateTo);
      console.log(`Filtering by date to: ${dateTo}`);
    }

    // When date filters are active, exclude items without matching prices
    if (dateFrom || dateTo) {
      whereConditions.push(`LP.PriceCode IS NOT NULL`);
      console.log('Date filter active: excluding items without prices in date range');
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Build ORDER BY clause
    let orderByClause = 'ORDER BY ISNULL(CC.SortOrder, 9999), PL.CostCentre, ISNULL(CC.SubGroup, \'\'), PL.Description';

    if (sortField) {
      const fieldMapping = {
        'CostCentre': 'PL.CostCentre',
        'CostCentreName': 'CC.Name',
        'ItemCode': 'PL.PriceCode',
        'Description': 'PL.Description',
        'Unit': 'PC.Printout',
        'Category': 'CC.SubGroup',
        'LatestPrice': 'LP.Price',
        'LatestPriceDate': 'LP.Date'
      };

      const dbField = fieldMapping[sortField] || 'PL.Description';
      const direction = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      orderByClause = `ORDER BY ${dbField} ${direction}`;
    }

    // Build CTE date filter
    let cteWhere = 'WHERE PriceLevel = 1';
    if (dateFrom && dateTo) {
      cteWhere += ` AND Date >= @dateFrom AND Date <= @dateTo`;
    } else if (dateFrom) {
      cteWhere += ` AND Date >= @dateFrom`;
    } else if (dateTo) {
      cteWhere += ` AND Date <= @dateTo`;
    }

    // Main query with CTE for latest prices
    // Changed to use PriceList as base table with LEFT JOINs
    const query = `
      WITH LatestPrices AS (
        SELECT
          PriceCode,
          Price,
          Date,
          ROW_NUMBER() OVER (PARTITION BY PriceCode ORDER BY Date DESC) AS rn
        FROM Prices
        ${cteWhere}
      )
      SELECT
        PL.CostCentre,
        CC.Name AS CostCentreName,
        PL.PriceCode AS ItemCode,
        PL.Description,
        PC.Printout AS Unit,
        CC.SubGroup AS Category,
        PL.Recipe,
        PL.RecipeIngredient,
        PL.Template,
        PL.Archived,
        CC.SortOrder,
        LP.Price AS LatestPrice,
        LP.Date AS LatestPriceDate
      FROM PriceList PL
      LEFT JOIN CostCentres CC ON PL.CostCentre = CC.Code AND CC.Tier = 1
      LEFT JOIN PerCodes PC ON PL.PerCode = PC.Code
      LEFT JOIN LatestPrices LP ON PL.PriceCode = LP.PriceCode AND LP.rn = 1
      ${whereClause}
      ${orderByClause}
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    request.input('offset', parseInt(offset));
    request.input('limit', parseInt(limit));

    // Count query - also updated to use LEFT JOINs
    // Include LatestPrices CTE if price filters or date filters are used
    const countQuery = (LatestPrice || LatestPriceDate || dateFrom || dateTo) ? `
      WITH LatestPrices AS (
        SELECT
          PriceCode,
          Price,
          Date,
          ROW_NUMBER() OVER (PARTITION BY PriceCode ORDER BY Date DESC) AS rn
        FROM Prices
        ${cteWhere}
      )
      SELECT COUNT(*) AS total
      FROM PriceList PL
      LEFT JOIN CostCentres CC ON PL.CostCentre = CC.Code AND CC.Tier = 1
      LEFT JOIN PerCodes PC ON PL.PerCode = PC.Code
      LEFT JOIN LatestPrices LP ON PL.PriceCode = LP.PriceCode AND LP.rn = 1
      ${whereClause}
    ` : `
      SELECT COUNT(*) AS total
      FROM PriceList PL
      LEFT JOIN CostCentres CC ON PL.CostCentre = CC.Code AND CC.Tier = 1
      LEFT JOIN PerCodes PC ON PL.PerCode = PC.Code
      ${whereClause}
    `;

    const countRequest = pool.request();

    // Apply same filters to count query
    if (searchTerm) {
      const searchWords = searchTerm.trim().split(/\s+/).filter(word => word.length > 0);
      if (searchWords.length === 1) {
        countRequest.input('searchTerm', `%${searchTerm}%`);
      } else {
        searchWords.forEach((word, index) => {
          countRequest.input(`searchWord${index}`, `%${word}%`);
        });
      }
    }
    // Add cost centre parameters to count query
    if (costCentres && Array.isArray(costCentres) && costCentres.length > 0) {
      costCentres.forEach((cc, index) => {
        countRequest.input(`costCentre${index}`, cc);
      });
    } else if (costCentre) {
      countRequest.input('costCentre', costCentre);
    }
    if (ItemCode) countRequest.input('itemCodeFilter', `%${ItemCode}%`);
    if (Description) countRequest.input('descriptionFilter', `%${Description}%`);
    if (costCentreFilter) countRequest.input('costCentreFilter', `%${costCentreFilter}%`);
    if (CostCentreName) countRequest.input('costCentreNameFilter', `%${CostCentreName}%`);
    if (Unit) countRequest.input('unitFilter', `%${Unit}%`);
    if (Category) countRequest.input('categoryFilter', `%${Category}%`);
    // Note: Recipe filter doesn't need parameters as it's a direct comparison
    if (LatestPrice) countRequest.input('latestPriceFilter', parseFloat(LatestPrice));
    if (LatestPriceDate) countRequest.input('latestPriceDateFilter', LatestPriceDate);

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
      filters: {
        searchTerm: searchTerm || null,
        costCentre: costCentre || null,
        costCentres: costCentres || null
      },
      data: result.recordset
    };

  } catch (err) {
    console.error('Error fetching catalogue items:', err);
    return {
      success: false,
      error: 'Failed to fetch catalogue items',
      message: err.message
    };
  }
}

/**
 * Get a specific catalogue item with price history
 * IPC Handler: 'catalogue:get-item'
 */
async function getCatalogueItem(event, priceCode) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const request = pool.request();
    request.input('priceCode', priceCode);

    // Get item details
    const itemQuery = `
      WITH LatestPrice AS (
        SELECT TOP 1
          Price,
          Date
        FROM Prices
        WHERE PriceCode = @priceCode AND PriceLevel = 1
        ORDER BY Date DESC
      )
      SELECT
        PL.*,
        PC.Printout AS Unit,
        CC.Name AS CostCentreName,
        CC.SubGroup,
        LP.Price AS LatestPrice,
        LP.Date AS PriceDate
      FROM PriceList PL
      LEFT JOIN LatestPrice LP ON 1=1
      LEFT JOIN CostCentres CC ON PL.CostCentre = CC.Code
      LEFT JOIN PerCodes PC ON PL.PerCode = PC.Code
      WHERE PL.PriceCode = @priceCode
    `;

    // Get price history
    const priceHistoryQuery = `
      SELECT TOP 10
        Price,
        Date AS PriceDate,
        PriceLevel
      FROM Prices
      WHERE PriceCode = @priceCode
      ORDER BY Date DESC
    `;

    const [itemResult, priceHistoryResult] = await Promise.all([
      request.query(itemQuery),
      pool.request()
        .input('priceCode', priceCode)
        .query(priceHistoryQuery)
    ]);

    if (itemResult.recordset.length === 0) {
      return {
        success: false,
        error: 'Item not found'
      };
    }

    return {
      success: true,
      data: {
        item: itemResult.recordset[0],
        priceHistory: priceHistoryResult.recordset
      }
    };

  } catch (err) {
    console.error('Error fetching catalogue item:', err);
    return {
      success: false,
      error: 'Failed to fetch catalogue item',
      message: err.message
    };
  }
}

/**
 * Archive or unarchive a catalogue item
 * IPC Handler: 'catalogue:archive-item'
 */
async function archiveItem(event, params) {
  try {
    const { priceCode, archived } = params;

    if (!priceCode) {
      return {
        success: false,
        error: 'PriceCode is required'
      };
    }

    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const request = pool.request();
    request.input('priceCode', priceCode);
    request.input('archived', archived ? 1 : 0);

    const query = `
      UPDATE PriceList
      SET Archived = @archived
      WHERE PriceCode = @priceCode
    `;

    await request.query(query);

    return {
      success: true,
      message: `Item ${archived ? 'archived' : 'unarchived'} successfully`
    };

  } catch (err) {
    console.error('Error archiving/unarchiving item:', err);
    return {
      success: false,
      error: 'Failed to update item archived status',
      message: err.message
    };
  }
}

/**
 * Update a field in catalogue item (Description or Unit)
 * IPC Handler: 'catalogue:update-field'
 */
async function updateField(event, params) {
  try {
    const { priceCode, field, value } = params;

    if (!priceCode || !field || value === undefined) {
      return {
        success: false,
        error: 'PriceCode, field, and value are required'
      };
    }

    // Validate field name to prevent SQL injection
    const allowedFields = ['Description', 'Unit'];
    if (!allowedFields.includes(field)) {
      return {
        success: false,
        error: 'Invalid field name'
      };
    }

    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const request = pool.request();
    request.input('priceCode', priceCode);
    request.input('value', value);

    // For Unit field, we need to update via PerCode lookup
    // For Description, direct update
    if (field === 'Unit') {
      // Update by finding PerCode that matches the Unit display text
      const query = `
        UPDATE PriceList
        SET PerCode = (SELECT TOP 1 Code FROM PerCodes WHERE Printout = @value)
        WHERE PriceCode = @priceCode
      `;
      await request.query(query);
    } else {
      const query = `
        UPDATE PriceList
        SET ${field} = @value
        WHERE PriceCode = @priceCode
      `;
      await request.query(query);
    }

    return {
      success: true,
      message: `${field} updated successfully`
    };

  } catch (err) {
    console.error('Error updating field:', err);
    return {
      success: false,
      error: 'Failed to update field',
      message: err.message
    };
  }
}

/**
 * Update price for catalogue item
 * IPC Handler: 'catalogue:update-price'
 */
async function updatePrice(event, params) {
  try {
    const { priceCode, price } = params;

    if (!priceCode || price === undefined) {
      return {
        success: false,
        error: 'PriceCode and price are required'
      };
    }

    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const request = pool.request();
    request.input('priceCode', priceCode);
    request.input('price', parseFloat(price));
    request.input('date', new Date());

    // Insert new price record with current date
    const query = `
      INSERT INTO Prices (PriceCode, Price, Date, PriceLevel)
      VALUES (@priceCode, @price, @date, 1)
    `;

    await request.query(query);

    return {
      success: true,
      message: 'Price updated successfully'
    };

  } catch (err) {
    console.error('Error updating price:', err);
    return {
      success: false,
      error: 'Failed to update price',
      message: err.message
    };
  }
}

/**
 * Get all available units from PerCodes table
 * IPC Handler: 'catalogue:get-units'
 */
async function getUnits(event) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const query = `
      SELECT Code, Printout, Display
      FROM PerCodes
      WHERE Printout IS NOT NULL AND Printout <> ''
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

module.exports = {
  getCatalogueItems,
  getCatalogueItem,
  archiveItem,
  updateField,
  updatePrice,
  getUnits
};
