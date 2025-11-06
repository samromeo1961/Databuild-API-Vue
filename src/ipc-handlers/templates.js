const { getPool } = require('../database/connection');
const { getPreferences } = require('../database/preferences-store');

/**
 * Update prices for template items by fetching latest prices from database
 * IPC Handler: 'templates:update-prices'
 */
async function updatePrices(event, params) {
  const { items } = params || {};

  if (!items || !Array.isArray(items) || items.length === 0) {
    return {
      success: false,
      error: 'No items provided',
      message: 'Template items array is required'
    };
  }

  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    // Get user's price level preference
    const preferences = getPreferences();
    const priceLevel = preferences?.priceLevel ?? 0;

    console.log(`Updating prices with PriceLevel: ${priceLevel}`);

    // Get latest prices for all items in the template
    const priceCodes = items.map(item => item.PriceCode).filter(Boolean);

    if (priceCodes.length === 0) {
      return {
        success: false,
        error: 'No valid price codes found',
        message: 'Template items must have PriceCode field'
      };
    }

    console.log(`Fetching prices for ${priceCodes.length} items:`, priceCodes);

    // Build query using CTE with ROW_NUMBER to get latest prices
    // Same pattern as catalogue query
    const query = `
      WITH LatestPrices AS (
        SELECT
          PriceCode,
          Price,
          Date,
          ROW_NUMBER() OVER (PARTITION BY PriceCode ORDER BY Date DESC) AS rn
        FROM Prices
        WHERE PriceLevel = @priceLevel
      )
      SELECT
        PL.PriceCode,
        PL.Description,
        PC.Printout AS Unit,
        PL.CostCentre,
        LP.Price AS LatestPrice,
        LP.Date AS LatestPriceDate
      FROM PriceList PL
      LEFT JOIN PerCodes PC ON PL.PerCode = PC.Code
      LEFT JOIN LatestPrices LP ON PL.PriceCode = LP.PriceCode AND LP.rn = 1
      WHERE PL.PriceCode IN (${priceCodes.map((_, i) => `@priceCode${i}`).join(', ')})
        AND PL.Archived = 0
    `;

    const request = pool.request();

    // Add price level parameter
    request.input('priceLevel', priceLevel);

    // Add parameters for each price code
    priceCodes.forEach((priceCode, index) => {
      request.input(`priceCode${index}`, priceCode);
    });

    const result = await request.query(query);

    console.log(`Query returned ${result.recordset.length} results`);

    // Create a map of price code to latest price data
    const priceMap = new Map();
    result.recordset.forEach(row => {
      console.log(`  ${row.PriceCode}: Price=${row.LatestPrice}, Date=${row.LatestPriceDate}`);
      priceMap.set(row.PriceCode, {
        PriceCode: row.PriceCode,
        description: row.Description,
        Unit: row.Unit || '',
        Price: row.LatestPrice || 0,
        CostCentre: row.CostCentre || ''
      });
    });

    // Update items with latest prices
    let updatedCount = 0;
    const updatedItems = items.map(item => {
      const latestData = priceMap.get(item.PriceCode);

      if (latestData) {
        // Item found in database - update with latest price
        updatedCount++;
        return {
          ...item,
          description: latestData.description,
          Unit: latestData.Unit,
          Price: latestData.Price,
          CostCentre: latestData.CostCentre,
          // Preserve template-specific fields
          zzType: item.zzType || 'count',
          quantity: item.quantity || 1
        };
      } else {
        // Item not found or archived - keep original
        return { ...item };
      }
    });

    return {
      success: true,
      updatedItems: updatedItems,
      updatedCount: updatedCount,
      totalItems: items.length,
      message: `Successfully updated ${updatedCount} of ${items.length} items`
    };

  } catch (err) {
    console.error('Error updating template prices:', err);
    return {
      success: false,
      error: 'Failed to update prices',
      message: err.message
    };
  }
}

module.exports = {
  updatePrices
};
