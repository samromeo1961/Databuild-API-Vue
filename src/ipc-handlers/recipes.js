const { getPool } = require('../database/connection');

/**
 * Get all recipe items (where Recipe = 1)
 * IPC Handler: 'recipes:get-list'
 */
async function getRecipesList(event, params) {
  try {
    const {
      searchTerm,
      costCentres,
      dateFrom,
      dateTo,
      showArchived = false,
      limit = 100,
      offset = 0,
      sortField,
      sortOrder = 'asc',
      // Column filters
      PriceCode,
      Description,
      CostCentre,
      CostCentreName,
      Unit,
      SubGroup
    } = params;

    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    // Build WHERE clause - only show items that are recipes and optionally filter archived
    let whereConditions = ['PL.Recipe = 1'];
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

    // Add cost centres filter (array)
    if (costCentres && Array.isArray(costCentres) && costCentres.length > 0) {
      const costCentrePlaceholders = costCentres.map((cc, index) => {
        request.input(`costCentre${index}`, cc);
        return `@costCentre${index}`;
      });
      whereConditions.push(`PL.CostCentre IN (${costCentrePlaceholders.join(', ')})`);
      console.log('Filtering recipes by cost centres:', costCentres);
    }

    // Add column filters
    if (PriceCode) {
      whereConditions.push(`PL.PriceCode LIKE @priceCodeFilter`);
      request.input('priceCodeFilter', `%${PriceCode}%`);
    }

    if (Description) {
      whereConditions.push(`PL.Description LIKE @descriptionFilter`);
      request.input('descriptionFilter', `%${Description}%`);
    }

    if (CostCentre) {
      whereConditions.push(`PL.CostCentre LIKE @costCentreFilter`);
      request.input('costCentreFilter', `%${CostCentre}%`);
    }

    if (CostCentreName) {
      whereConditions.push(`CC.Name LIKE @costCentreNameFilter`);
      request.input('costCentreNameFilter', `%${CostCentreName}%`);
    }

    if (Unit) {
      whereConditions.push(`PC.Printout LIKE @unitFilter`);
      request.input('unitFilter', `%${Unit}%`);
    }

    if (SubGroup) {
      whereConditions.push(`CC.SubGroup LIKE @subGroupFilter`);
      request.input('subGroupFilter', `%${SubGroup}%`);
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

    // When date filters are active, exclude recipes without matching prices
    if (dateFrom || dateTo) {
      whereConditions.push(`LP.PriceCode IS NOT NULL`);
      console.log('Date filter active: excluding recipes without prices in date range');
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Build ORDER BY clause
    let orderByClause = 'ORDER BY PL.CostCentre, CC.SortOrder, CC.SubGroup, PL.Description';

    if (sortField) {
      const fieldMapping = {
        'PriceCode': 'PL.PriceCode',
        'Description': 'PL.Description',
        'Unit': 'PC.Printout',
        'CostCentre': 'PL.CostCentre',
        'CostCentreName': 'CC.Name',
        'SubGroup': 'CC.SubGroup',
        'LatestPrice': 'LP.Price',
        'PriceDate': 'LP.Date'
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

    // Query to get recipe items with latest prices
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
        PL.PriceCode,
        PL.Description,
        PC.Printout AS Unit,
        PC.CalculationRoutine,
        LP.Price AS LatestPrice,
        LP.Date AS PriceDate,
        CC.SubGroup,
        PL.Template,
        PL.Recipe,
        PL.Archived,
        PL.CostCentre,
        CC.Name AS CostCentreName,
        CC.SortOrder
      FROM CostCentres CC
      INNER JOIN PriceList PL ON CC.Code = PL.CostCentre
      INNER JOIN PerCodes PC ON PL.PerCode = PC.Code
      LEFT JOIN LatestPrices LP ON PL.PriceCode = LP.PriceCode AND LP.rn = 1
      ${whereClause}
      ${orderByClause}
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    request.input('offset', parseInt(offset));
    request.input('limit', parseInt(limit));

    // Get total count (with same date filtering as main query)
    const countQuery = `
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
      FROM CostCentres CC
      INNER JOIN PriceList PL ON CC.Code = PL.CostCentre
      INNER JOIN PerCodes PC ON PL.PerCode = PC.Code
      LEFT JOIN LatestPrices LP ON PL.PriceCode = LP.PriceCode AND LP.rn = 1
      ${whereClause}
    `;

    const countRequest = pool.request();
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

    // Add cost centres array for count query
    if (costCentres && Array.isArray(costCentres) && costCentres.length > 0) {
      costCentres.forEach((cc, index) => {
        countRequest.input(`costCentre${index}`, cc);
      });
    }

    // Add column filter inputs for count query
    if (PriceCode) countRequest.input('priceCodeFilter', `%${PriceCode}%`);
    if (Description) countRequest.input('descriptionFilter', `%${Description}%`);
    if (CostCentre) countRequest.input('costCentreFilter', `%${CostCentre}%`);
    if (CostCentreName) countRequest.input('costCentreNameFilter', `%${CostCentreName}%`);
    if (Unit) countRequest.input('unitFilter', `%${Unit}%`);
    if (SubGroup) countRequest.input('subGroupFilter', `%${SubGroup}%`);

    // Add date range filter inputs for count query (used in CTE)
    if (dateFrom) {
      countRequest.input('dateFrom', dateFrom);
      console.log(`Count query: Filtering by date from: ${dateFrom}`);
    }
    if (dateTo) {
      countRequest.input('dateTo', dateTo);
      console.log(`Count query: Filtering by date to: ${dateTo}`);
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
      filters: {
        searchTerm: searchTerm || null
      },
      data: result.recordset
    };

  } catch (err) {
    console.error('Error fetching recipes:', err);
    return {
      success: false,
      error: 'Failed to fetch recipes',
      message: err.message
    };
  }
}

/**
 * Get sub-items for a specific recipe
 * IPC Handler: 'recipes:get-subitems'
 */
async function getRecipeSubItems(event, priceCode) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const request = pool.request();
    request.input('priceCode', priceCode);

    // Verify the recipe exists
    const recipeCheckQuery = `
      SELECT PriceCode, Description, Recipe
      FROM PriceList
      WHERE PriceCode = @priceCode AND Recipe = 1
    `;

    const recipeCheck = await request.query(recipeCheckQuery);

    if (recipeCheck.recordset.length === 0) {
      return {
        success: false,
        error: 'Recipe not found or item is not a recipe'
      };
    }

    // Get sub-items from Recipe table
    const subItemsQuery = `
      WITH LatestPrices AS (
        SELECT
          PriceCode,
          Price,
          Date,
          ROW_NUMBER() OVER (PARTITION BY PriceCode ORDER BY Date DESC) AS rn
        FROM Prices
        WHERE PriceLevel = 1
      )
      SELECT
        R.Counter AS LineNumber,
        R.Sub_Item AS SubItemCode,
        R.Formula,
        R.Quantity,
        R.Cost_Centre,
        PL.Description AS SubItemDescription,
        PC.Printout AS Unit,
        CC.Name AS CostCentreName,
        CC.SubGroup,
        PL.Recipe AS IsRecipe,
        PL.Archived AS IsArchived,
        LP.Price AS LatestPrice,
        LP.Date AS PriceDate
      FROM Recipe R
      LEFT JOIN PriceList PL ON R.Sub_Item = PL.PriceCode
      LEFT JOIN PerCodes PC ON PL.PerCode = PC.Code
      LEFT JOIN CostCentres CC ON R.Cost_Centre = CC.Code
      LEFT JOIN LatestPrices LP ON R.Sub_Item = LP.PriceCode AND LP.rn = 1
      WHERE R.Main_Item = @priceCode
      ORDER BY R.Counter
    `;

    const subItemsResult = await pool.request()
      .input('priceCode', priceCode)
      .query(subItemsQuery);

    const subItems = subItemsResult.recordset;

    return {
      success: true,
      recipe: {
        priceCode: recipeCheck.recordset[0].PriceCode,
        description: recipeCheck.recordset[0].Description
      },
      subItemCount: subItems.length,
      data: subItems
    };

  } catch (err) {
    console.error('Error fetching recipe sub-items:', err);
    return {
      success: false,
      error: 'Failed to fetch recipe sub-items',
      message: err.message
    };
  }
}

/**
 * Get a specific recipe with all details and sub-items
 * IPC Handler: 'recipes:get-recipe'
 */
async function getRecipe(event, priceCode) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const request = pool.request();
    request.input('priceCode', priceCode);

    // Get recipe details with latest price
    const recipeQuery = `
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
      WHERE PL.PriceCode = @priceCode AND PL.Recipe = 1
    `;

    // Get sub-items
    const subItemsQuery = `
      WITH LatestPrices AS (
        SELECT
          PriceCode,
          Price,
          Date,
          ROW_NUMBER() OVER (PARTITION BY PriceCode ORDER BY Date DESC) AS rn
        FROM Prices
        WHERE PriceLevel = 1
      )
      SELECT
        R.Counter AS LineNumber,
        R.Sub_Item AS SubItemCode,
        R.Formula,
        R.Quantity,
        R.Cost_Centre,
        PL.Description AS SubItemDescription,
        PC.Printout AS Unit,
        CC.Name AS CostCentreName,
        CC.SubGroup,
        PL.Recipe AS IsRecipe,
        PL.Archived AS IsArchived,
        LP.Price AS LatestPrice,
        LP.Date AS PriceDate
      FROM Recipe R
      LEFT JOIN PriceList PL ON R.Sub_Item = PL.PriceCode
      LEFT JOIN PerCodes PC ON PL.PerCode = PC.Code
      LEFT JOIN CostCentres CC ON R.Cost_Centre = CC.Code
      LEFT JOIN LatestPrices LP ON R.Sub_Item = LP.PriceCode AND LP.rn = 1
      WHERE R.Main_Item = @priceCode
      ORDER BY R.Counter
    `;

    const [recipeResult, subItemsResult] = await Promise.all([
      request.query(recipeQuery),
      pool.request()
        .input('priceCode', priceCode)
        .query(subItemsQuery)
    ]);

    if (recipeResult.recordset.length === 0) {
      return {
        success: false,
        error: 'Recipe not found or item is not a recipe'
      };
    }

    const recipe = recipeResult.recordset[0];
    const subItems = subItemsResult.recordset;

    return {
      success: true,
      data: {
        recipe: recipe,
        subItems: subItems,
        subItemCount: subItems.length
      }
    };

  } catch (err) {
    console.error('Error fetching recipe details:', err);
    return {
      success: false,
      error: 'Failed to fetch recipe details',
      message: err.message
    };
  }
}

/**
 * Get distinct cost centres that have recipes
 * IPC Handler: 'recipes:get-cost-centres'
 */
async function getRecipeCostCentres(event, params) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const query = `
      SELECT DISTINCT
        PL.CostCentre AS Code,
        CC.Name
      FROM PriceList PL
      INNER JOIN CostCentres CC ON PL.CostCentre = CC.Code
      WHERE PL.Recipe = 1
        AND PL.Archived = 0
      ORDER BY PL.CostCentre
    `;

    const result = await pool.request().query(query);

    console.log(`Found ${result.recordset.length} cost centres with active recipes`);

    return {
      success: true,
      count: result.recordset.length,
      data: result.recordset
    };

  } catch (err) {
    console.error('Error fetching recipe cost centres:', err);
    return {
      success: false,
      error: 'Failed to fetch recipe cost centres',
      message: err.message
    };
  }
}

/**
 * Update a recipe's description
 * IPC Handler: 'recipes:update-recipe'
 */
async function updateRecipe(event, params) {
  try {
    const { priceCode, description } = params;

    if (!priceCode) {
      return {
        success: false,
        error: 'Price code is required'
      };
    }

    if (!description || description.trim().length === 0) {
      return {
        success: false,
        error: 'Description cannot be empty'
      };
    }

    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const request = pool.request();
    request.input('priceCode', priceCode);
    request.input('description', description.trim());

    // Verify the recipe exists
    const checkQuery = `
      SELECT PriceCode, Description, Recipe
      FROM PriceList
      WHERE PriceCode = @priceCode AND Recipe = 1
    `;

    const checkResult = await request.query(checkQuery);

    if (checkResult.recordset.length === 0) {
      return {
        success: false,
        error: 'Recipe not found or item is not a recipe'
      };
    }

    // Update the description
    const updateQuery = `
      UPDATE PriceList
      SET Description = @description
      WHERE PriceCode = @priceCode AND Recipe = 1
    `;

    const updateRequest = pool.request();
    updateRequest.input('priceCode', priceCode);
    updateRequest.input('description', description.trim());

    await updateRequest.query(updateQuery);

    console.log(`Recipe ${priceCode} description updated successfully`);

    return {
      success: true,
      data: {
        priceCode: priceCode,
        description: description.trim()
      }
    };

  } catch (err) {
    console.error('Error updating recipe:', err);
    return {
      success: false,
      error: 'Failed to update recipe',
      message: err.message
    };
  }
}

module.exports = {
  getRecipesList,
  getRecipeSubItems,
  getRecipe,
  getRecipeCostCentres,
  updateRecipe
};
