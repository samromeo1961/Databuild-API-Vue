# DBx Connector Vue - IPC API Reference

**Version:** 1.3.10
**Last Updated:** January 2025

---

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [API Endpoints](#api-endpoints)
  - [Database](#database-api)
  - [Catalogue](#catalogue-api)
  - [Recipes](#recipes-api)
  - [Suppliers](#suppliers-api)
  - [Contacts](#contacts-api)
  - [Cost Centres](#cost-centres-api)
  - [Templates](#templates-api)
  - [Preferences](#preferences-api)
  - [Preferences Store](#preferences-store-api)
  - [Send History](#send-history-api)
  - [Favourites Store](#favourites-store-api)
  - [Recents Store](#recents-store-api)
  - [Column States](#column-states-api)
  - [Column Names](#column-names-api)
  - [zzType Store](#zztype-store-api)
  - [Filter State](#filter-state-api)
  - [zzTakeoff Window](#zztakeoff-window-api)
  - [External API](#external-api)

---

## Overview

DBx Connector Vue uses Electron's IPC (Inter-Process Communication) to enable communication between the Vue frontend (renderer process) and the Node.js backend (main process). This allows the frontend to access SQL Server database operations, file system storage, and external API calls securely.

### Architecture

```
Vue Component
    ↓ Call API method
useElectronAPI() composable
    ↓ Invoke IPC
window.electronAPI (preload.js)
    ↓ IPC Channel
ipcMain.handle() (main.js)
    ↓ Route to handler
IPC Handler (src/ipc-handlers/*.js)
    ↓ Execute operation
SQL Server / electron-store / External API
```

---

## Getting Started

### Using the API in Vue Components

```javascript
import { useElectronAPI } from '@/composables/useElectronAPI';

export default {
  setup() {
    const api = useElectronAPI();

    // Call API methods
    const loadData = async () => {
      const result = await api.catalogue.getItems({
        searchTerm: 'concrete',
        limit: 50
      });

      if (result.success) {
        console.log('Items:', result.data);
      }
    };

    return { loadData };
  }
};
```

### TypeScript Type Definitions

```typescript
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  total?: number;
  count?: number;
}
```

---

## Response Format

All IPC handlers return a standardized response object:

### Success Response

```javascript
{
  success: true,
  data: [...],           // Response data (array or object)
  total: 1500,           // Total count (for paginated results)
  count: 50              // Current page count
}
```

### Error Response

```javascript
{
  success: false,
  error: 'Error type',   // Error category
  message: 'Detailed error message'
}
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Database connection not available` | DB not connected | Check database settings |
| `Connection failed` | Invalid credentials | Verify SQL Server credentials |
| `Table not found` | Schema mismatch | Ensure Databuild database schema |
| `Timeout` | Query too slow | Add filters or pagination |

### Error Handling Example

```javascript
try {
  const result = await api.catalogue.getItems({ limit: 100 });

  if (!result.success) {
    console.error('API Error:', result.error, result.message);
    // Show error to user
    showNotification(result.message, 'error');
    return;
  }

  // Process successful result
  processData(result.data);

} catch (error) {
  console.error('Unexpected error:', error);
  showNotification('An unexpected error occurred', 'error');
}
```

---

## API Endpoints

---

## Database API

Manage database connections and settings.

### `db.testConnection(dbConfig)`

Test database connection and validate Databuild schema.

**Channel:** `db:test-connection`

**Parameters:**
```javascript
{
  server: string,        // SQL Server hostname or IP (e.g., 'localhost\SQLEXPRESS')
  database: string,      // Database name (e.g., 'T_Esys', 'CROWNESYS')
  user: string,          // SQL Server username
  password: string       // SQL Server password
}
```

**Returns:**
```javascript
{
  success: true,
  message: 'Connection successful! Databuild schema validated.',
  tables: ['Supplier', 'PriceList', 'CostCentres', 'Recipe', 'SupplierGroup', 'CCBanks']
}
```

**Example:**
```javascript
const api = useElectronAPI();

const testConnection = async () => {
  const result = await api.db.testConnection({
    server: 'localhost\\SQLEXPRESS',
    database: 'T_Esys',
    user: 'dbx_user',
    password: 'MyPassword123!'
  });

  if (result.success) {
    console.log('Connection OK:', result.tables);
  } else {
    console.error('Connection failed:', result.message);
  }
};
```

---

### `db.saveConnection(dbConfig)`

Save database connection settings securely.

**Channel:** `db:save-connection`

**Parameters:** Same as `testConnection`

**Returns:**
```javascript
{
  success: true,
  message: 'Connection saved successfully'
}
```

---

### `db.getSavedConnection()`

Get saved database connection settings (password encrypted).

**Channel:** `db:get-saved-connection`

**Returns:**
```javascript
{
  success: true,
  data: {
    server: 'localhost\\SQLEXPRESS',
    database: 'T_Esys',
    user: 'dbx_user'
    // password not returned for security
  }
}
```

---

### `db.clearSavedConnection()`

Clear saved database connection settings.

**Channel:** `db:clear-saved-connection`

**Returns:**
```javascript
{
  success: true,
  message: 'Connection settings cleared'
}
```

---

## Catalogue API

Manage catalogue items from the PriceList table.

### `catalogue.getItems(params)`

Fetch catalogue items with filtering, sorting, and pagination.

**Channel:** `catalogue:get-items`

**Parameters:**
```javascript
{
  // Search and filters
  searchTerm?: string,           // Search in PriceCode and Description (supports multi-word)
  costCentre?: string,           // Single cost centre code (legacy)
  costCentres?: string[],        // Multiple cost centre codes (preferred)
  dateFrom?: string,             // Filter prices from date (YYYY-MM-DD)
  dateTo?: string,               // Filter prices to date (YYYY-MM-DD)
  showArchived?: boolean,        // Include archived items (default: false)

  // Column filters (AG Grid)
  ItemCode?: string,             // Filter by price code (partial match)
  Description?: string,          // Filter by description (partial match)
  CostCentre?: string,           // Filter by cost centre (partial match)
  CostCentreName?: string,       // Filter by cost centre name
  Unit?: string,                 // Filter by unit
  Category?: string,             // Filter by category
  Recipe?: boolean,              // Filter by recipe status
  LatestPrice?: number,          // Filter by price
  LatestPriceDate?: string,      // Filter by price date

  // Pagination and sorting
  limit?: number,                // Items per page (default: 100, max: 999999)
  offset?: number,               // Pagination offset (default: 0)
  sortField?: string,            // Sort by field name
  sortOrder?: 'asc' | 'desc'     // Sort order (default: 'asc')
}
```

**Returns:**
```javascript
{
  success: true,
  data: [
    {
      PriceCode: 'ABC123',
      Description: 'Concrete Ready Mix 20MPa',
      Unit: 'm³',
      CostCentre: '01',
      CostCentreName: 'Concrete',
      SubGroup: 'Ready Mix',
      LatestPrice: 185.50,
      LatestPriceDate: '2025-01-10T00:00:00.000Z',
      Recipe: false,
      Template: false,
      Archived: false
    }
    // ... more items
  ],
  total: 1500,        // Total items matching filters
  count: 100          // Items in current page
}
```

**Example:**
```javascript
// Simple search
const result = await api.catalogue.getItems({
  searchTerm: 'concrete',
  limit: 50
});

// Multi-word search (searches for items containing ALL words)
const result = await api.catalogue.getItems({
  searchTerm: 'ready mix concrete',  // Searches: "ready" AND "mix" AND "concrete"
  limit: 50
});

// Advanced filtering
const result = await api.catalogue.getItems({
  costCentres: ['01', '02', '03'],    // Multiple cost centres
  dateFrom: '2024-01-01',
  dateTo: '2024-12-31',
  showArchived: false,
  limit: 100,
  offset: 0
});

// Column filters (from AG Grid)
const result = await api.catalogue.getItems({
  ItemCode: 'ABC',           // Items with code containing "ABC"
  Description: 'concrete',   // Items with description containing "concrete"
  CostCentre: '01',          // Items in cost centre containing "01"
  limit: 100
});
```

---

### `catalogue.getItem(priceCode)`

Fetch a single catalogue item by PriceCode.

**Channel:** `catalogue:get-item`

**Parameters:**
```javascript
priceCode: string  // Item PriceCode
```

**Returns:**
```javascript
{
  success: true,
  data: {
    PriceCode: 'ABC123',
    Description: 'Concrete Ready Mix 20MPa',
    // ... full item details
  }
}
```

---

### `catalogue.archiveItem(params)`

Archive or unarchive a catalogue item.

**Channel:** `catalogue:archive-item`

**Parameters:**
```javascript
{
  priceCode: string,     // Item PriceCode
  archived: boolean      // true to archive, false to unarchive
}
```

**Returns:**
```javascript
{
  success: true,
  message: 'Item archived successfully'
}
```

**Example:**
```javascript
// Archive an item
await api.catalogue.archiveItem({
  priceCode: 'ABC123',
  archived: true
});

// Unarchive an item
await api.catalogue.archiveItem({
  priceCode: 'ABC123',
  archived: false
});
```

---

### `catalogue.updateField(params)`

Update a specific field of a catalogue item.

**Channel:** `catalogue:update-field`

**Parameters:**
```javascript
{
  priceCode: string,     // Item PriceCode
  field: string,         // Field name (e.g., 'Description', 'Unit')
  value: any             // New value
}
```

**Returns:**
```javascript
{
  success: true,
  message: 'Field updated successfully'
}
```

**Example:**
```javascript
// Update description
await api.catalogue.updateField({
  priceCode: 'ABC123',
  field: 'Description',
  value: 'Updated description'
});

// Update unit
await api.catalogue.updateField({
  priceCode: 'ABC123',
  field: 'Unit',
  value: 'm²'
});
```

---

### `catalogue.updatePrice(params)`

Update the latest price for a catalogue item.

**Channel:** `catalogue:update-price`

**Parameters:**
```javascript
{
  priceCode: string,     // Item PriceCode
  price: number,         // New price
  priceLevel?: number    // Price level (default: 0)
}
```

**Returns:**
```javascript
{
  success: true,
  message: 'Price updated successfully'
}
```

---

## Recipes API

Manage recipe items and their ingredients (sub-items).

### `recipes.getList(params)`

Fetch recipe items (items where Recipe = 1).

**Channel:** `recipes:get-list`

**Parameters:** Similar to `catalogue.getItems` but filters for recipes only
```javascript
{
  searchTerm?: string,
  costCentres?: string[],
  dateFrom?: string,
  dateTo?: string,
  showArchived?: boolean,
  limit?: number,
  offset?: number,
  // Column filters
  PriceCode?: string,
  Description?: string,
  CostCentre?: string,
  CostCentreName?: string,
  Unit?: string,
  SubGroup?: string
}
```

**Returns:**
```javascript
{
  success: true,
  data: [
    {
      PriceCode: 'RECIPE001',
      Description: 'Concrete Slab Mix',
      Unit: 'm²',
      CostCentre: '01',
      CostCentreName: 'Concrete',
      SubGroup: 'Slabs',
      LatestPrice: 125.00,
      PriceDate: '2025-01-10T00:00:00.000Z'
    }
    // ... more recipes
  ],
  total: 250
}
```

---

### `recipes.getSubItems(priceCode)`

Fetch sub-items (ingredients) for a recipe.

**Channel:** `recipes:get-sub-items`

**Parameters:**
```javascript
priceCode: string  // Recipe PriceCode
```

**Returns:**
```javascript
{
  success: true,
  data: [
    {
      SubItemCode: 'CONC20',
      SubItemDescription: 'Concrete 20MPa',
      Quantity: 1.05,
      Formula: null,
      Unit: 'm³',
      LatestPrice: 185.50,
      PriceDate: '2025-01-10T00:00:00.000Z',
      Cost_Centre: '01',
      CostCentreName: 'Concrete',
      IsArchived: false
    }
    // ... more sub-items
  ]
}
```

**Example:**
```javascript
const result = await api.recipes.getSubItems('RECIPE001');

if (result.success) {
  console.log('Recipe has', result.data.length, 'ingredients');
  result.data.forEach(item => {
    console.log(`- ${item.Quantity} ${item.Unit} of ${item.SubItemDescription}`);
  });
}
```

---

### `recipes.getRecipe(priceCode)`

Fetch a single recipe with full details.

**Channel:** `recipes:get-recipe`

**Parameters:**
```javascript
priceCode: string  // Recipe PriceCode
```

**Returns:**
```javascript
{
  success: true,
  data: {
    PriceCode: 'RECIPE001',
    Description: 'Concrete Slab Mix',
    // ... full recipe details
  }
}
```

---

### `recipes.getCostCentres(params)`

Get list of cost centres that have recipes.

**Channel:** `recipes:get-cost-centres`

**Returns:**
```javascript
{
  success: true,
  data: [
    {
      Code: '01',
      Name: 'Concrete',
      SubGroup: 'Structural',
      SortOrder: 1
    }
    // ... more cost centres
  ]
}
```

---

### `recipes.updateRecipe(params)`

Update recipe description or other fields.

**Channel:** `recipes:update-recipe`

**Parameters:**
```javascript
{
  priceCode: string,
  description?: string,
  // ... other fields
}
```

**Returns:**
```javascript
{
  success: true,
  message: 'Recipe updated successfully'
}
```

---

### `recipes.archiveRecipe(params)`

Archive or unarchive a recipe.

**Channel:** `recipes:archive-recipe`

**Parameters:**
```javascript
{
  priceCode: string,
  archived: boolean
}
```

**Returns:**
```javascript
{
  success: true,
  message: 'Recipe archived successfully'
}
```

---

## Suppliers API

Manage supplier and subcontractor records.

### `suppliers.getGroups(params)`

Get all supplier groups.

**Channel:** `suppliers:get-groups`

**Returns:**
```javascript
{
  success: true,
  count: 15,
  data: [
    {
      GroupNumber: 1,
      GroupName: 'Concrete Suppliers',
      Lcolor: 16777215
    }
    // ... more groups
  ]
}
```

---

### `suppliers.getList(params)`

Fetch suppliers with filtering and pagination.

**Channel:** `suppliers:get-list`

**Parameters:**
```javascript
{
  search?: string,          // Search name, contact, email
  suppGroup?: number,       // Filter by supplier group
  showArchived?: boolean,   // Include archived suppliers
  limit?: number,           // Items per page (default: 100)
  offset?: number           // Pagination offset
}
```

**Returns:**
```javascript
{
  success: true,
  data: [
    {
      Supplier_Code: 'SUP001',
      ShortName: 'SUP001',
      SupplierName: 'ABC Concrete Supplies',
      SuppGroup: 1,
      SupplierGroupName: 'Concrete Suppliers',
      AccountContact: 'John Smith',
      AccountEmail: 'john@abcconcrete.com',
      AccountPhone: '555-1234',
      AccountAddress: '123 Main St',
      AccountCity: 'Sydney',
      AccountState: 'NSW',
      AccountPostcode: '2000',
      Archived: false
    }
    // ... more suppliers
  ],
  total: 450
}
```

**Example:**
```javascript
// Search suppliers
const result = await api.suppliers.getList({
  search: 'concrete',
  limit: 50
});

// Filter by group
const result = await api.suppliers.getList({
  suppGroup: 1,  // Concrete suppliers
  showArchived: false
});
```

---

### `suppliers.archive(params)`

Archive or unarchive a supplier.

**Channel:** `suppliers:archive`

**Parameters:**
```javascript
{
  supplierCode: string,
  archived: boolean
}
```

**Returns:**
```javascript
{
  success: true,
  message: 'Supplier archived successfully'
}
```

---

### `suppliers.updateGroup(params)`

Update supplier's group.

**Channel:** `suppliers:update-group`

**Parameters:**
```javascript
{
  supplierCode: string,
  suppGroup: number
}
```

**Returns:**
```javascript
{
  success: true,
  message: 'Supplier group updated'
}
```

---

## Contacts API

Manage contact records.

### `contacts.getGroups(params)`

Get all contact groups.

**Channel:** `contacts:get-groups`

**Returns:**
```javascript
{
  success: true,
  count: 8,
  data: [
    {
      Code: 1,
      Name: 'Clients',
      Lcolor: 16777215
    }
    // ... more groups
  ]
}
```

---

### `contacts.getList(params)`

Fetch contacts with filtering.

**Channel:** `contacts:get-list`

**Parameters:**
```javascript
{
  search?: string,       // Search name, contact, email
  group?: string,        // Filter by group code (comma-separated)
  limit?: number,
  offset?: number
}
```

**Returns:**
```javascript
{
  success: true,
  data: [
    {
      Code: 'C001',
      Name: 'ABC Construction',
      Group_: 1,
      GroupName: 'Clients',
      Contact: 'Jane Doe',
      Phone: '555-5678',
      Mobile: '555-9876',
      Email: 'jane@abcconstruction.com',
      Address: '456 Builder St',
      City: 'Melbourne',
      State: 'VIC',
      Postcode: '3000',
      Supplier: false,
      Debtor: true,
      Notes: 'Preferred client'
    }
    // ... more contacts
  ],
  total: 320
}
```

---

### `contacts.create(contactData)`

Create a new contact.

**Channel:** `contacts:create`

**Parameters:**
```javascript
{
  Code: string,          // Unique contact code
  Name: string,          // Contact/company name
  Group_?: number,       // Contact group
  Contact?: string,      // Contact person
  Phone?: string,
  Mobile?: string,
  Email?: string,
  Address?: string,
  City?: string,
  State?: string,
  Postcode?: string,
  Supplier?: boolean,
  Debtor?: boolean,
  Notes?: string
}
```

**Returns:**
```javascript
{
  success: true,
  message: 'Contact created successfully',
  code: 'C001'
}
```

---

### `contacts.update(data)`

Update existing contact.

**Channel:** `contacts:update`

**Parameters:** Same as `create` but Code is required to identify record

**Returns:**
```javascript
{
  success: true,
  message: 'Contact updated successfully'
}
```

---

## Cost Centres API

### `costCentres.getList(params)`

Get list of cost centres.

**Channel:** `cost-centres:get-list`

**Parameters:**
```javascript
{
  tier?: number,      // Filter by tier level (1 = main, 2+ = sub-levels)
  limit?: number,
  offset?: number
}
```

**Returns:**
```javascript
{
  success: true,
  data: [
    {
      Code: '01',
      Name: 'Concrete',
      SubGroup: 'Structural',
      Tier: '1',
      SortOrder: 1,
      Markup: 15.5,
      Owner: 'Construction Division'
    }
    // ... more cost centres
  ]
}
```

---

### `costCentres.getItem(code)`

Get single cost centre by code.

**Channel:** `cost-centres:get-item`

**Parameters:**
```javascript
code: string  // Cost centre code
```

**Returns:**
```javascript
{
  success: true,
  data: {
    Code: '01',
    Name: 'Concrete',
    // ... full details
  }
}
```

---

## Templates API

Manage template items.

### `templates.getList(params)`

Get template items (items where Template = true).

**Channel:** `templates:get-list`

**Parameters:** Similar to catalogue.getItems

**Returns:**
```javascript
{
  success: true,
  data: [/* template items */],
  total: 120
}
```

---

## Preferences API

Database operations for preferences (not to be confused with PreferencesStore).

### `preferences.getDatabases(params)`

Get list of databases on the SQL Server instance.

**Channel:** `preferences:get-databases`

**Returns:**
```javascript
{
  success: true,
  data: [
    { name: 'T_Esys' },
    { name: 'CROWNESYS' },
    { name: 'Databuild_Production' }
  ]
}
```

---

### `preferences.getUnits(params)`

Get list of units of measure from PerCodes table.

**Channel:** `preferences:get-units`

**Returns:**
```javascript
{
  success: true,
  data: [
    { Code: 1, Printout: 'm', Display: 'metre' },
    { Code: 2, Printout: 'm²', Display: 'square metre' },
    { Code: 3, Printout: 'each', Display: 'each' }
    // ... more units
  ]
}
```

---

### `preferences.getCostCentreBanks(params)`

Get list of cost centre banks.

**Channel:** `preferences:get-cost-centre-banks`

**Returns:**
```javascript
{
  success: true,
  data: [
    { CCBankCode: 'BANK01', CCBankName: 'Main Bank' }
    // ... more banks
  ]
}
```

---

### `preferences.getPriceLevels(params)`

Get available price levels.

**Channel:** `preferences:get-price-levels`

**Returns:**
```javascript
{
  success: true,
  data: [
    { level: 0, name: 'Base Price' },
    { level: 1, name: 'Retail Price' },
    { level: 2, name: 'Wholesale Price' }
  ]
}
```

---

### `preferences.getSupplierGroups(params)`

Get supplier groups (same as suppliers.getGroups).

**Channel:** `preferences:get-supplier-groups`

---

### `preferences.testConnection(params)`

Test database connection (same as db.testConnection).

**Channel:** `preferences:test-connection`

---

### `preferences.switchDatabase(params)`

Switch to a different database on the same server.

**Channel:** `preferences:switch-database`

**Parameters:**
```javascript
{
  database: string  // New database name
}
```

**Returns:**
```javascript
{
  success: true,
  message: 'Successfully switched to database: CROWNESYS',
  database: 'CROWNESYS'
}
```

**Example:**
```javascript
const result = await api.preferences.switchDatabase({
  database: 'CROWNESYS'
});

if (result.success) {
  console.log('Now using:', result.database);
  // Reload all data
  reloadAllData();
}
```

---

## Preferences Store API

Manage user preferences stored in electron-store (local JSON file).

### `preferencesStore.get()`

Get all preferences.

**Channel:** `preferences-store:get`

**Returns:**
```javascript
{
  success: true,
  data: {
    theme: 'dark',
    itemsPerPage: 50,
    unitTakeoffMappings: {
      'm': 'linear',
      'm²': 'area',
      'each': 'count'
    },
    costCentreBankCode: 'BANK01',
    priceLevel: 0
  }
}
```

---

### `preferencesStore.save(preferences)`

Save all preferences.

**Channel:** `preferences-store:save`

**Parameters:**
```javascript
{
  theme?: 'light' | 'dark',
  itemsPerPage?: number,
  unitTakeoffMappings?: { [unit: string]: string },
  costCentreBankCode?: string,
  priceLevel?: number
}
```

**Returns:**
```javascript
{
  success: true,
  message: 'Preferences saved'
}
```

---

### `preferencesStore.update(key, value)`

Update a single preference.

**Channel:** `preferences-store:update`

**Parameters:**
```javascript
{
  key: string,    // Preference key
  value: any      // New value
}
```

**Returns:**
```javascript
{
  success: true,
  message: 'Preference updated'
}
```

**Example:**
```javascript
// Change theme
await api.preferencesStore.update('theme', 'dark');

// Change items per page
await api.preferencesStore.update('itemsPerPage', 100);

// Update unit mappings
await api.preferencesStore.update('unitTakeoffMappings', {
  'm': 'linear',
  'm²': 'area',
  'm³': 'count',
  'each': 'count'
});
```

---

### `preferencesStore.reset()`

Reset preferences to defaults.

**Channel:** `preferences-store:reset`

**Returns:**
```javascript
{
  success: true,
  message: 'Preferences reset to defaults'
}
```

---

### `preferencesStore.getDefaults()`

Get default preference values.

**Channel:** `preferences-store:get-defaults`

**Returns:**
```javascript
{
  success: true,
  data: {
    theme: 'light',
    itemsPerPage: 50,
    unitTakeoffMappings: {},
    // ... defaults
  }
}
```

---

## Send History API

Track items sent to zzTakeoff (stored in electron-store).

### `sendHistory.add(sendData)`

Add item to send history.

**Channel:** `send-history:add`

**Parameters:**
```javascript
{
  priceCode: string,
  description: string,
  unit: string,
  price: number,
  costCentre: string,
  timestamp: string  // ISO date string
}
```

**Returns:**
```javascript
{
  success: true,
  id: 'uuid-generated-id'
}
```

---

### `sendHistory.getList(params)`

Get send history with pagination.

**Channel:** `send-history:get-list`

**Parameters:**
```javascript
{
  limit?: number,
  offset?: number
}
```

**Returns:**
```javascript
{
  success: true,
  data: [
    {
      id: 'uuid-1',
      priceCode: 'ABC123',
      description: 'Concrete Ready Mix',
      unit: 'm³',
      price: 185.50,
      costCentre: '01',
      timestamp: '2025-01-13T10:30:00.000Z'
    }
    // ... more history
  ],
  total: 350
}
```

---

### `sendHistory.clear()`

Clear all send history.

**Channel:** `send-history:clear`

---

### `sendHistory.delete(id)`

Delete specific history entry.

**Channel:** `send-history:delete`

**Parameters:**
```javascript
id: string  // History entry ID
```

---

### `sendHistory.getStats()`

Get send history statistics.

**Channel:** `send-history:get-stats`

**Returns:**
```javascript
{
  success: true,
  stats: {
    totalSent: 350,
    lastSentDate: '2025-01-13T10:30:00.000Z',
    mostSentItem: 'ABC123',
    // ... more stats
  }
}
```

---

## Favourites Store API

Manage favourite items (electron-store).

### `favouritesStore.add(item)`

Add item to favourites.

**Channel:** `favourites-store:add`

**Parameters:**
```javascript
{
  PriceCode: string,
  Description: string,
  Unit: string,
  Price: number,
  CostCentre: string
}
```

---

### `favouritesStore.getAll()`

Get all favourites.

**Channel:** `favourites-store:get-all`

**Returns:**
```javascript
{
  success: true,
  data: [/* favourite items */],
  count: 25
}
```

---

### `favouritesStore.remove(priceCode)`

Remove item from favourites.

**Channel:** `favourites-store:remove`

---

### `favouritesStore.clear()`

Clear all favourites.

**Channel:** `favourites-store:clear`

---

## Recents Store API

Track recently viewed items (electron-store).

### `recentsStore.add(item)`

Add item to recents.

**Channel:** `recents-store:add`

**Parameters:**
```javascript
{
  PriceCode: string,
  Description: string,
  Unit: string,
  Price: number,
  CostCentre: string,
  LastAccessed: string  // ISO date
}
```

---

### `recentsStore.getAll()`

Get all recent items.

**Channel:** `recents-store:get-all`

**Returns:**
```javascript
{
  success: true,
  data: [/* recent items, sorted by LastAccessed DESC */],
  count: 50
}
```

---

### `recentsStore.clear()`

Clear recents history.

**Channel:** `recents-store:clear`

---

## Column States API

Persist AG Grid column states (electron-store).

### `columnStates.save(data)`

Save column state for a tab.

**Channel:** `column-states:save`

**Parameters:**
```javascript
{
  tabName: string,              // Tab identifier (e.g., 'catalogue', 'recipes')
  columnState: string           // JSON stringified AG Grid column state
}
```

**Returns:**
```javascript
{
  success: true,
  message: 'Column state saved'
}
```

**Example:**
```javascript
const columnState = gridApi.getColumnState();
await api.columnStates.save({
  tabName: 'catalogue',
  columnState: JSON.stringify(columnState)
});
```

---

### `columnStates.get(tabName)`

Get saved column state for a tab.

**Channel:** `column-states:get`

**Parameters:**
```javascript
tabName: string
```

**Returns:**
```javascript
{
  success: true,
  data: {
    tabName: 'catalogue',
    columnState: '[{"colId":"PriceCode","width":150,"pinned":"left"}]'
  }
}
```

**Example:**
```javascript
const result = await api.columnStates.get('catalogue');
if (result.success && result.data?.columnState) {
  const state = JSON.parse(result.data.columnState);
  gridApi.applyColumnState({ state, applyOrder: true });
}
```

---

### `columnStates.delete(tabName)`

Delete column state for a tab.

**Channel:** `column-states:delete`

---

## Column Names API

Manage custom column names for zzTakeoff integration.

### `columnNames.get()`

Get all custom column names.

**Channel:** `column-names:get`

**Returns:**
```javascript
{
  success: true,
  data: {
    PriceCode: 'Product ID',
    Description: 'Item Name',
    LatestPrice: 'Unit Rate',
    CostCentre: 'Category'
  }
}
```

---

### `columnNames.save(columnNames)`

Save custom column names.

**Channel:** `column-names:save`

**Parameters:**
```javascript
{
  [fieldName: string]: string  // Map of field → custom name
}
```

---

### `columnNames.update(fieldName, displayName)`

Update single column name.

**Channel:** `column-names:update`

**Parameters:**
```javascript
{
  fieldName: string,      // Database field name
  displayName: string     // Custom display name
}
```

---

### `columnNames.reset()`

Reset column names to defaults.

**Channel:** `column-names:reset`

---

### `columnNames.getDisplayName(fieldName)`

Get display name for a field.

**Channel:** `column-names:get-display-name`

**Parameters:**
```javascript
fieldName: string
```

**Returns:**
```javascript
{
  success: true,
  displayName: 'Product ID'
}
```

---

### `columnNames.getZzTakeoffProperty(fieldName)`

Get zzTakeoff property name for a field.

**Channel:** `column-names:get-zztakeoff-property`

**Parameters:**
```javascript
fieldName: string
```

**Returns:**
```javascript
{
  success: true,
  propertyName: 'sku'  // or 'name', 'unit', etc.
}
```

---

## zzType Store API

Manage zzTakeoff type overrides per item.

### `zzTypeStore.set(priceCode, zzType)`

Set zzType override for an item.

**Channel:** `zztype-store:set`

**Parameters:**
```javascript
{
  priceCode: string,
  zzType: 'area' | 'linear' | 'segment' | 'count'
}
```

**Returns:**
```javascript
{
  success: true,
  message: 'zzType override saved'
}
```

---

### `zzTypeStore.get(priceCode)`

Get zzType override for an item.

**Channel:** `zztype-store:get`

**Parameters:**
```javascript
priceCode: string
```

**Returns:**
```javascript
{
  success: true,
  zzType: 'area'  // or null if no override
}
```

---

### `zzTypeStore.getAll()`

Get all zzType overrides.

**Channel:** `zztype-store:get-all`

**Returns:**
```javascript
{
  success: true,
  types: {
    'ABC123': 'area',
    'DEF456': 'linear',
    // ... more overrides
  }
}
```

---

### `zzTypeStore.delete(priceCode)`

Delete zzType override for an item.

**Channel:** `zztype-store:delete`

---

### `zzTypeStore.clear()`

Clear all zzType overrides.

**Channel:** `zztype-store:clear`

---

## Filter State API

Persist AG Grid filter states.

### `filterState.save(data)`

Save filter state for a tab.

**Channel:** `filter-state:save`

**Parameters:**
```javascript
{
  tabName: string,
  filterState: string  // JSON stringified filter model
}
```

---

### `filterState.get(tabName)`

Get saved filter state.

**Channel:** `filter-state:get`

---

### `filterState.delete(tabName)`

Delete filter state.

**Channel:** `filter-state:delete`

---

### `filterState.getAll()`

Get all saved filter states.

**Channel:** `filter-state:get-all`

---

### `filterState.clearAll()`

Clear all filter states.

**Channel:** `filter-state:clear-all`

---

## zzTakeoff Window API

Control the separate zzTakeoff window.

### `zzTakeoffWindow.open(url)`

Open or focus zzTakeoff window.

**Channel:** `zztakeoff-window:open`

**Parameters:**
```javascript
url?: string  // URL to navigate to (optional, uses current URL if omitted)
```

**Returns:**
```javascript
{
  success: true,
  message: 'zzTakeoff window opened'
}
```

**Example:**
```javascript
// Open and navigate to login
await api.zzTakeoffWindow.open('https://www.zztakeoff.com/login');

// Just focus existing window
await api.zzTakeoffWindow.open();
```

---

### `zzTakeoffWindow.close()`

Close zzTakeoff window.

**Channel:** `zztakeoff-window:close`

---

### `zzTakeoffWindow.isOpen()`

Check if zzTakeoff window is open.

**Channel:** `zztakeoff-window:is-open`

**Returns:**
```javascript
{
  isOpen: true
}
```

---

### `zzTakeoffWindow.executeJavaScript(code)`

Execute JavaScript in zzTakeoff window.

**Channel:** `zztakeoff-window:execute-js`

**Parameters:**
```javascript
code: string  // JavaScript code to execute
```

**Returns:**
```javascript
{
  success: true,
  result: { /* result of execution */ }
}
```

**Example:**
```javascript
const jsCode = `
  (function() {
    if (typeof startTakeoffWithProperties === 'function') {
      startTakeoffWithProperties({
        type: 'area',
        properties: {
          name: { value: 'Concrete Slab' },
          sku: { value: 'ABC123' }
        }
      });
      return { success: true };
    }
    return { success: false, error: 'Function not found' };
  })()
`;

const result = await api.zzTakeoffWindow.executeJavaScript(jsCode);
if (result.success && result.result.success) {
  console.log('Item sent to zzTakeoff');
}
```

---

## External API

Make external HTTP requests (proxied through main process).

### `external.httpRequest(config)`

Make HTTP request to external API.

**Channel:** `external:http-request`

**Parameters:** Axios request config
```javascript
{
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  headers?: { [key: string]: string },
  data?: any,
  params?: { [key: string]: any },
  timeout?: number
}
```

**Returns:**
```javascript
{
  success: true,
  data: { /* response data */ },
  status: 200,
  statusText: 'OK'
}
```

**Example:**
```javascript
// GET request
const result = await api.external.httpRequest({
  method: 'GET',
  url: 'https://api.example.com/data',
  headers: {
    'Authorization': 'Bearer token'
  }
});

// POST request
const result = await api.external.httpRequest({
  method: 'POST',
  url: 'https://api.example.com/submit',
  data: {
    name: 'Test',
    value: 123
  }
});
```

---

### `external.sendToZzTakeoff(data)`

Send data to zzTakeoff API (legacy method).

**Channel:** `external:send-to-zztakeoff`

**Parameters:**
```javascript
{
  itemData: object  // Item data to send
}
```

**Note:** This is a legacy method. Use `zzTakeoffWindow.executeJavaScript` for new implementations.

---

## Best Practices

### 1. Error Handling

Always check `success` property and handle errors:

```javascript
const result = await api.catalogue.getItems({ limit: 50 });

if (!result.success) {
  console.error('Error:', result.error, result.message);
  showNotification(result.message || 'Operation failed', 'error');
  return;
}

// Process successful result
processData(result.data);
```

### 2. Loading States

Show loading indicators during async operations:

```javascript
const loading = ref(true);
const error = ref(null);

try {
  loading.value = true;
  const result = await api.catalogue.getItems({ limit: 50 });

  if (!result.success) {
    error.value = result.message;
    return;
  }

  // Process data
  items.value = result.data;

} catch (err) {
  error.value = 'Unexpected error occurred';
  console.error(err);
} finally {
  loading.value = false;
}
```

### 3. Pagination

Handle pagination for large datasets:

```javascript
const page = ref(0);
const pageSize = 50;

const loadPage = async () => {
  const result = await api.catalogue.getItems({
    limit: pageSize,
    offset: page.value * pageSize
  });

  if (result.success) {
    items.value = result.data;
    totalItems.value = result.total;
  }
};

const nextPage = () => {
  if ((page.value + 1) * pageSize < totalItems.value) {
    page.value++;
    loadPage();
  }
};
```

### 4. Debouncing Searches

Debounce search input to reduce API calls:

```javascript
let searchDebounce = null;

const onSearchChange = () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    loadData(); // Calls API with search term
  }, 500);
};
```

### 5. Caching Results

Cache frequently accessed data:

```javascript
const cache = new Map();

const getCostCentres = async () => {
  if (cache.has('costCentres')) {
    return cache.get('costCentres');
  }

  const result = await api.costCentres.getList({});
  if (result.success) {
    cache.set('costCentres', result.data);
    return result.data;
  }

  return [];
};
```

---

## Troubleshooting

### IPC Handler Not Found

**Error:** `Cannot read property 'X' of undefined`

**Cause:** API method not registered

**Solution:**
1. Check `preload.js` - is method exposed?
2. Check `main.js` - is handler registered with `ipcMain.handle()`?
3. Check `useElectronAPI.js` - is wrapper method included?

### Database Connection Lost

**Error:** `Database connection not available`

**Solution:**
```javascript
// Reconnect to database
const dbConfig = await api.db.getSavedConnection();
if (dbConfig.success) {
  const result = await api.db.testConnection(dbConfig.data);
  if (!result.success) {
    // Show settings window
    window.electronAPI?.showSettings();
  }
}
```

### Timeout Errors

**Error:** `Request timeout`

**Solution:**
- Add pagination with smaller `limit`
- Add filters to reduce result set
- Check database performance
- Increase timeout in connection config

### Type Mismatches

**Error:** `Cannot convert value to type`

**Solution:**
- Ensure parameter types match API documentation
- Convert strings to numbers where needed: `parseInt(value)`, `parseFloat(value)`
- Handle null/undefined values: `value || defaultValue`

---

## Appendix: Quick Reference

### Common Patterns

```javascript
// Load data with error handling
const loadData = async () => {
  loading.value = true;
  error.value = null;

  try {
    const result = await api.catalogue.getItems({ limit: 50 });
    if (result.success) {
      items.value = result.data;
    } else {
      error.value = result.message;
    }
  } catch (err) {
    error.value = 'Unexpected error';
  } finally {
    loading.value = false;
  }
};

// Search with debounce
const searchTerm = ref('');
let searchDebounce = null;

watch(searchTerm, () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(loadData, 500);
});

// Pagination
const currentPage = ref(0);
const pageSize = 50;
const totalItems = ref(0);

const loadPage = async (page) => {
  const result = await api.catalogue.getItems({
    limit: pageSize,
    offset: page * pageSize
  });
  if (result.success) {
    items.value = result.data;
    totalItems.value = result.total;
    currentPage.value = page;
  }
};

// Multi-select filters
const selectedCostCentres = ref([]);

watch(selectedCostCentres, () => {
  loadData();
});

const loadData = async () => {
  const result = await api.catalogue.getItems({
    costCentres: selectedCostCentres.value,
    limit: 100
  });
  // ...
};
```

---

**Last Updated:** January 2025
**Version:** 1.3.10
**Maintained By:** DBx Connector Vue Team
