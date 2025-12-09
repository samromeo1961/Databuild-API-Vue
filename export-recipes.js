/**
 * Standalone Recipe JSON Export Script
 * Run with: node export-recipes.js
 *
 * This bypasses SSMS truncation issues by using Node.js directly
 */

const sql = require('mssql');
const fs = require('fs');
const path = require('path');
const Store = require('electron-store');

// Load database config from electron-store
const store = new Store({ name: 'config' });
const dbConfig = store.get('dbConfig');

if (!dbConfig) {
  console.error('No database configuration found. Please run the app first to configure the database.');
  process.exit(1);
}

async function exportRecipes() {
  let pool;

  try {
    console.log('Connecting to database...');
    console.log(`Server: ${dbConfig.server}`);
    console.log(`Database: ${dbConfig.systemDatabase || dbConfig.database}`);

    // Connect to database
    pool = await sql.connect({
      server: dbConfig.server,
      database: dbConfig.systemDatabase || dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password,
      options: {
        encrypt: dbConfig.options?.encrypt || false,
        trustServerCertificate: dbConfig.options?.trustServerCertificate || true
      }
    });

    console.log('Connected! Fetching recipes...');

    // Get all non-archived recipes
    const recipesResult = await pool.request().query(`
      SELECT
        PL.PriceCode,
        PL.Description,
        CAST(PL.Specification AS NVARCHAR(MAX)) AS Specification,
        CC.Name AS CostCentreName,
        CC.SubGroup,
        PC.Printout AS Unit
      FROM PriceList PL
      LEFT JOIN CostCentres CC ON PL.CostCentre = CC.Code AND CC.Tier = 1
      LEFT JOIN PerCodes PC ON PL.PerCode = PC.Code
      WHERE PL.Recipe = 1
        AND PL.Archived = 0
        AND NOT EXISTS (
          SELECT 1 FROM Recipe R2
          INNER JOIN PriceList PL2 ON R2.Sub_Item = PL2.PriceCode
          WHERE R2.Main_Item = PL.PriceCode AND PL2.Archived = 1
        )
      ORDER BY CC.SortOrder, PL.CostCentre, PL.Description
    `);

    const recipes = recipesResult.recordset;
    console.log(`Found ${recipes.length} recipes`);

    if (recipes.length === 0) {
      console.log('No recipes found');
      return;
    }

    // Get all sub-items
    const subItemsResult = await pool.request().query(`
      WITH LatestPrices AS (
        SELECT
          PriceCode,
          Price,
          ROW_NUMBER() OVER (PARTITION BY PriceCode ORDER BY Date DESC) AS rn
        FROM Prices
        WHERE PriceLevel = 1
      )
      SELECT
        R.Main_Item,
        R.Sub_Item AS ProductSku,
        REPLACE(REPLACE(PL.Description, CHAR(13), ''), CHAR(10), '') AS ProductName,
        R.Quantity AS QuantityPer,
        CC.SubGroup,
        LP.Price AS UnitCost
      FROM Recipe R
      INNER JOIN PriceList PL ON R.Sub_Item = PL.PriceCode
      LEFT JOIN CostCentres CC ON COALESCE(R.Cost_Centre, PL.CostCentre) = CC.Code AND CC.Tier = 1
      LEFT JOIN LatestPrices LP ON R.Sub_Item = LP.PriceCode AND LP.rn = 1
      WHERE PL.Archived = 0
      ORDER BY R.Main_Item, R.Counter
    `);

    console.log(`Found ${subItemsResult.recordset.length} total ingredients`);

    // Group sub-items by recipe
    const subItemsByRecipe = {};
    for (const item of subItemsResult.recordset) {
      if (!subItemsByRecipe[item.Main_Item]) {
        subItemsByRecipe[item.Main_Item] = [];
      }
      subItemsByRecipe[item.Main_Item].push({
        productSku: item.ProductSku,
        productName: item.ProductName || '',
        quantityPer: item.QuantityPer || 0,
        wasteFactor: 0,
        isLabor: isLaborItem(item.SubGroup),
        unitCost: item.UnitCost || 0
      });
    }

    // Build export data
    const exportData = {
      recipes: recipes.map(recipe => ({
        code: recipe.PriceCode,
        name: cleanString(recipe.Description),
        description: cleanString(recipe.Specification || recipe.Description || ''),
        category: recipe.CostCentreName || recipe.SubGroup || 'Uncategorized',
        unitOfMeasure: recipe.Unit || 'each',
        items: subItemsByRecipe[recipe.PriceCode] || []
      }))
    };

    // Save to file
    const outputPath = path.join(__dirname, `recipes-export-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf8');

    console.log(`\nExport complete!`);
    console.log(`Recipes: ${exportData.recipes.length}`);
    console.log(`Total ingredients: ${subItemsResult.recordset.length}`);
    console.log(`File saved to: ${outputPath}`);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

function cleanString(str) {
  if (!str) return '';
  return str
    .replace(/\r\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLaborItem(subGroup) {
  if (!subGroup) return false;
  const laborKeywords = ['labour', 'labor', 'install', 'fitting', 'fix', 'laying', 'erect'];
  const lowerSubGroup = subGroup.toLowerCase();
  return laborKeywords.some(keyword => lowerSubGroup.includes(keyword));
}

exportRecipes();
