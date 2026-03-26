const { getPool } = require('../database/connection');
const { qualifyTable } = require('../database/query-builder');
const credStore = require('../database/credentials-store');

/**
 * BOQ (Bill of Quantities) IPC Handlers
 * Handles all BOQ operations including item management, pricing, and reporting
 */

/**
 * Get Bill of Quantities for a job
 * @param {Object} event - IPC event
 * @param {Object} params - { jobNo, costCentre?, bLoad? }
 */
async function getJobBill(event, params) {
  try {
    const { jobNo, costCentre, bLoad } = params;
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    // Get database configuration
    const dbConfig = credStore.getCredentials();
    if (!dbConfig) {
      throw new Error('Database configuration not available');
    }

    // Build fully-qualified table names
    const billTable = qualifyTable('Bill', dbConfig);
    const priceListTable = qualifyTable('PriceList', dbConfig);
    const perCodesTable = qualifyTable('PerCodes', dbConfig);
    const costCentresTable = qualifyTable('CostCentres', dbConfig);

    console.log('📊 BOQ: Loading bill for job:', jobNo, 'CC:', costCentre, 'Load:', bLoad);

    const query = `
      SELECT
        b.JobNo,
        b.ItemCode,
        b.CostCentre,
        cc.Name AS CostCentreName,
        cc.SubGroup,
        b.BLoad,
        b.LineNumber,
        b.Quantity,
        b.UnitPrice,
        b.XDescription AS Workup,
        pl.Description,
        pc.Printout AS Unit,
        pl.Recipe,
        pl.RecipeIngredient,
        -- Calculate line total (handle percentage units specially)
        CASE
          WHEN pc.Printout = '%' THEN b.UnitPrice * (b.Quantity / 100.0)
          ELSE b.Quantity * b.UnitPrice
        END AS LineTotal
      FROM ${billTable} b
      LEFT JOIN ${priceListTable} pl ON b.ItemCode = pl.PriceCode
      LEFT JOIN ${perCodesTable} pc ON pl.PerCode = pc.Code
      LEFT JOIN ${costCentresTable} cc ON b.CostCentre = cc.Code AND cc.Tier = 1
      WHERE b.JobNo = @jobNo
        AND (@costCentre IS NULL OR b.CostCentre = @costCentre)
        AND (@bLoad IS NULL OR b.BLoad = @bLoad)
        AND b.Quantity > 0
      ORDER BY ISNULL(cc.SortOrder, 999999), b.CostCentre, b.LineNumber
    `;

    const request = pool.request()
      .input('jobNo', jobNo)
      .input('costCentre', costCentre || null)
      .input('bLoad', bLoad || null);

    const result = await request.query(query);

    console.log('✓ BOQ: Loaded', result.recordset.length, 'items');

    return {
      success: true,
      data: result.recordset,
      count: result.recordset.length
    };
  } catch (error) {
    console.error('✗ BOQ: Error getting job bill:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

/**
 * Add a new item to the bill
 * @param {Object} event - IPC event
 * @param {Object} billItem - { JobNo, ItemCode, CostCentre, BLoad, Quantity, UnitPrice, XDescription? }
 */
async function addItem(event, billItem) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    const billTable = qualifyTable('Bill', dbConfig);

    console.log('➕ BOQ: Adding item:', billItem.ItemCode, 'to job:', billItem.JobNo);

    // Get next line number for this cost centre and load
    const maxLineQuery = `
      SELECT ISNULL(MAX(LineNumber), 0) AS MaxLine
      FROM ${billTable}
      WHERE JobNo = @jobNo
        AND CostCentre = @costCentre
        AND BLoad = @bLoad
    `;

    const maxLineResult = await pool.request()
      .input('jobNo', billItem.JobNo)
      .input('costCentre', billItem.CostCentre)
      .input('bLoad', billItem.BLoad)
      .query(maxLineQuery);

    const nextLineNumber = maxLineResult.recordset[0].MaxLine + 1;

    // Insert new bill item
    const insertQuery = `
      INSERT INTO ${billTable} (
        JobNo, ItemCode, CostCentre, BLoad, LineNumber,
        Quantity, UnitPrice, XDescription
      )
      VALUES (
        @jobNo, @itemCode, @costCentre, @bLoad, @lineNumber,
        @quantity, @unitPrice, @xDescription
      )
    `;

    await pool.request()
      .input('jobNo', billItem.JobNo)
      .input('itemCode', billItem.ItemCode)
      .input('costCentre', billItem.CostCentre)
      .input('bLoad', billItem.BLoad)
      .input('lineNumber', nextLineNumber)
      .input('quantity', billItem.Quantity || 1)
      .input('unitPrice', billItem.UnitPrice || 0)
      .input('xDescription', billItem.XDescription || null)
      .query(insertQuery);

    console.log('✓ BOQ: Item added successfully at line', nextLineNumber);

    return {
      success: true,
      lineNumber: nextLineNumber,
      message: 'Item added successfully'
    };
  } catch (error) {
    console.error('✗ BOQ: Error adding item:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Update an existing bill item
 * @param {Object} event - IPC event
 * @param {Object} billItem - { JobNo, CostCentre, BLoad, LineNumber, Quantity?, UnitPrice?, XDescription? }
 */
async function updateItem(event, billItem) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    const billTable = qualifyTable('Bill', dbConfig);

    console.log('✏️ BOQ: Updating item at line', billItem.LineNumber);

    // Build dynamic update query based on provided fields
    const updates = [];
    const request = pool.request()
      .input('jobNo', billItem.JobNo)
      .input('costCentre', billItem.CostCentre)
      .input('bLoad', billItem.BLoad)
      .input('lineNumber', billItem.LineNumber);

    if (billItem.Quantity !== undefined) {
      updates.push('Quantity = @quantity');
      request.input('quantity', billItem.Quantity);
    }

    if (billItem.UnitPrice !== undefined) {
      updates.push('UnitPrice = @unitPrice');
      request.input('unitPrice', billItem.UnitPrice);
    }

    if (billItem.XDescription !== undefined) {
      updates.push('XDescription = @xDescription');
      request.input('xDescription', billItem.XDescription);
    }

    if (updates.length === 0) {
      return {
        success: true,
        message: 'No fields to update'
      };
    }

    const updateQuery = `
      UPDATE ${billTable}
      SET ${updates.join(', ')}
      WHERE JobNo = @jobNo
        AND CostCentre = @costCentre
        AND BLoad = @bLoad
        AND LineNumber = @lineNumber
    `;

    const result = await request.query(updateQuery);

    console.log('✓ BOQ: Item updated successfully');

    return {
      success: true,
      rowsAffected: result.rowsAffected[0],
      message: 'Item updated successfully'
    };
  } catch (error) {
    console.error('✗ BOQ: Error updating item:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Delete a bill item
 * @param {Object} event - IPC event
 * @param {Object} params - { jobNo, costCentre, bLoad, lineNumber }
 */
async function deleteItem(event, params) {
  try {
    const { jobNo, costCentre, bLoad, lineNumber } = params;
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    const billTable = qualifyTable('Bill', dbConfig);

    console.log('🗑️ BOQ: Deleting item at line', lineNumber);

    const deleteQuery = `
      DELETE FROM ${billTable}
      WHERE JobNo = @jobNo
        AND CostCentre = @costCentre
        AND BLoad = @bLoad
        AND LineNumber = @lineNumber
    `;

    const result = await pool.request()
      .input('jobNo', jobNo)
      .input('costCentre', costCentre)
      .input('bLoad', bLoad)
      .input('lineNumber', lineNumber)
      .query(deleteQuery);

    console.log('✓ BOQ: Item deleted successfully');

    return {
      success: true,
      rowsAffected: result.rowsAffected[0],
      message: 'Item deleted successfully'
    };
  } catch (error) {
    console.error('✗ BOQ: Error deleting item:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Get cost centres with budget indicators
 * Returns cost centres marked BOLD if they have quantities
 * @param {Object} event - IPC event
 * @param {Object} params - { jobNo }
 */
async function getCostCentresWithBudgets(event, params) {
  try {
    const { jobNo } = params;
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    const billTable = qualifyTable('Bill', dbConfig);
    const costCentresTable = qualifyTable('CostCentres', dbConfig);
    const perCodesTable = qualifyTable('PerCodes', dbConfig);
    const priceListTable = qualifyTable('PriceList', dbConfig);

    console.log('📋 BOQ: Getting cost centres with budgets for job:', jobNo);

    const query = `
      SELECT
        cc.Code,
        cc.Name,
        cc.SubGroup,
        cc.SortOrder,
        CASE WHEN b.ItemCount > 0 THEN 1 ELSE 0 END AS HasBudget,
        ISNULL(b.BudgetTotal, 0) AS BudgetTotal,
        ISNULL(b.ItemCount, 0) AS ItemCount
      FROM ${costCentresTable} cc
      LEFT JOIN (
        SELECT
          b.CostCentre,
          COUNT(*) AS ItemCount,
          SUM(
            CASE
              WHEN pc.Printout = '%' THEN b.UnitPrice * (b.Quantity / 100.0)
              ELSE b.Quantity * b.UnitPrice
            END
          ) AS BudgetTotal
        FROM ${billTable} b
        LEFT JOIN ${priceListTable} pl ON b.ItemCode = pl.PriceCode
        LEFT JOIN ${perCodesTable} pc ON pl.PerCode = pc.Code
        WHERE b.JobNo = @jobNo AND b.Quantity > 0
        GROUP BY b.CostCentre
      ) b ON cc.Code = b.CostCentre
      WHERE cc.Tier = 1
      ORDER BY cc.SortOrder, cc.Code
    `;

    const result = await pool.request()
      .input('jobNo', jobNo)
      .query(query);

    console.log('✓ BOQ: Found', result.recordset.length, 'cost centres');

    return {
      success: true,
      data: result.recordset,
      count: result.recordset.length
    };
  } catch (error) {
    console.error('✗ BOQ: Error getting cost centres with budgets:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

/**
 * Reprice bill items based on price level and date
 * @param {Object} event - IPC event
 * @param {Object} params - { jobNo, priceLevel, billDate }
 */
async function repriceBill(event, params) {
  try {
    const { jobNo, priceLevel, billDate } = params;
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    const billTable = qualifyTable('Bill', dbConfig);
    const pricesTable = qualifyTable('Prices', dbConfig);

    console.log('💰 BOQ: Repricing job', jobNo, 'at price level', priceLevel, 'date:', billDate);

    // Update prices for all items in the bill
    const repriceQuery = `
      UPDATE b
      SET b.UnitPrice = ISNULL(p.Price, b.UnitPrice)
      FROM ${billTable} b
      LEFT JOIN (
        SELECT
          PriceCode,
          Price,
          ROW_NUMBER() OVER (PARTITION BY PriceCode ORDER BY Date DESC) AS RowNum
        FROM ${pricesTable}
        WHERE PriceLevel = @priceLevel
          AND Date <= @billDate
      ) p ON b.ItemCode = p.PriceCode AND p.RowNum = 1
      WHERE b.JobNo = @jobNo
    `;

    const result = await pool.request()
      .input('jobNo', jobNo)
      .input('priceLevel', priceLevel)
      .input('billDate', billDate)
      .query(repriceQuery);

    console.log('✓ BOQ: Repriced', result.rowsAffected[0], 'items');

    return {
      success: true,
      rowsAffected: result.rowsAffected[0],
      message: `Repriced ${result.rowsAffected[0]} items`
    };
  } catch (error) {
    console.error('✗ BOQ: Error repricing bill:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Explode a recipe into its sub-items
 * @param {Object} event - IPC event
 * @param {Object} params - { jobNo, costCentre, bLoad, priceCode, quantity, options }
 */
async function explodeRecipe(event, params) {
  try {
    const { jobNo, costCentre, bLoad, priceCode, quantity, options = {} } = params;
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    const recipeTable = qualifyTable('Recipe', dbConfig);
    const priceListTable = qualifyTable('PriceList', dbConfig);
    const pricesTable = qualifyTable('Prices', dbConfig);

    console.log('💥 BOQ: Exploding recipe', priceCode, 'qty:', quantity);

    // Get recipe sub-items
    const recipeQuery = `
      SELECT
        R.Sub_Item,
        R.Quantity,
        R.Cost_Centre,
        PL.Description,
        (
          SELECT TOP 1 Price
          FROM ${pricesTable}
          WHERE PriceCode = R.Sub_Item
            AND PriceLevel = @priceLevel
          ORDER BY Date DESC
        ) AS Price
      FROM ${recipeTable} R
      INNER JOIN ${priceListTable} PL ON R.Sub_Item = PL.PriceCode
      WHERE R.Main_Item = @priceCode
      ORDER BY R.Counter
    `;

    const recipeResult = await pool.request()
      .input('priceCode', priceCode)
      .input('priceLevel', options.priceLevel || 0)
      .query(recipeQuery);

    const subItems = recipeResult.recordset;

    if (subItems.length === 0) {
      return {
        success: false,
        message: 'No sub-items found for this recipe'
      };
    }

    console.log('📦 BOQ: Found', subItems.length, 'sub-items');

    // Add each sub-item to the bill
    let addedCount = 0;
    for (const subItem of subItems) {
      const subQuantity = subItem.Quantity * quantity;
      const subCostCentre = subItem.Cost_Centre || costCentre;

      // Skip if explodeZeroQtyRecipes is false and quantity is 0
      if (!options.explodeZeroQtyRecipes && subQuantity === 0) {
        continue;
      }

      await addItem(event, {
        JobNo: jobNo,
        ItemCode: subItem.Sub_Item,
        CostCentre: subCostCentre,
        BLoad: bLoad,
        Quantity: subQuantity,
        UnitPrice: subItem.Price || 0
      });

      addedCount++;
    }

    console.log('✓ BOQ: Exploded recipe - added', addedCount, 'sub-items');

    return {
      success: true,
      subItemsAdded: addedCount,
      message: `Recipe exploded - ${addedCount} sub-items added`
    };
  } catch (error) {
    console.error('✗ BOQ: Error exploding recipe:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Get available loads for a job/cost centre
 * @param {Object} event - IPC event
 * @param {Object} params - { jobNo, costCentre? }
 */
async function getLoads(event, params) {
  try {
    const { jobNo, costCentre } = params;
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    const billTable = qualifyTable('Bill', dbConfig);

    const query = `
      SELECT DISTINCT BLoad
      FROM ${billTable}
      WHERE JobNo = @jobNo
        AND (@costCentre IS NULL OR CostCentre = @costCentre)
      ORDER BY BLoad
    `;

    const result = await pool.request()
      .input('jobNo', jobNo)
      .input('costCentre', costCentre || null)
      .query(query);

    const loads = result.recordset.map(row => row.BLoad);

    return {
      success: true,
      data: loads,
      count: loads.length
    };
  } catch (error) {
    console.error('✗ BOQ: Error getting loads:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

/**
 * Create a new load for a job/cost centre
 * @param {Object} event - IPC event
 * @param {Object} params - { jobNo, costCentre }
 */
async function createLoad(event, params) {
  try {
    const { jobNo, costCentre } = params;
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    const billTable = qualifyTable('Bill', dbConfig);

    console.log('📦 BOQ: Creating new load for job', jobNo, 'CC:', costCentre);

    // Get max load number
    const maxLoadQuery = `
      SELECT ISNULL(MAX(BLoad), 0) AS MaxLoad
      FROM ${billTable}
      WHERE JobNo = @jobNo
        AND CostCentre = @costCentre
    `;

    const result = await pool.request()
      .input('jobNo', jobNo)
      .input('costCentre', costCentre)
      .query(maxLoadQuery);

    const newLoad = result.recordset[0].MaxLoad + 1;

    console.log('✓ BOQ: New load number:', newLoad);

    return {
      success: true,
      bLoad: newLoad,
      message: `Load ${newLoad} created`
    };
  } catch (error) {
    console.error('✗ BOQ: Error creating load:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Generate a BOQ report
 * @param {Object} event - IPC event
 * @param {Object} params - { reportType, jobNo, costCentre? }
 */
async function generateReport(event, params) {
  try {
    const { reportType, jobNo, costCentre } = params;

    console.log('📄 BOQ: Generating report type:', reportType, 'for job:', jobNo);

    // Different report types: 'single', 'full', 'summary'
    // This is a placeholder - full implementation will generate formatted reports

    return {
      success: true,
      reportType,
      message: 'Report generation not yet implemented'
    };
  } catch (error) {
    console.error('✗ BOQ: Error generating report:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

module.exports = {
  getJobBill,
  addItem,
  updateItem,
  deleteItem,
  getCostCentresWithBudgets,
  repriceBill,
  explodeRecipe,
  getLoads,
  createLoad,
  generateReport
};
