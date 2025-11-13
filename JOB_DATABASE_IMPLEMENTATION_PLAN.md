# Job Database Integration - Implementation Plan

**Date:** January 2025
**Version:** 1.0
**Feature:** Import jobs from Databuild Job Database into Templates Tab

---

## 1. Overview

### Current State
DBx Connector currently connects to ONE database:
- **System Database** (e.g., `CROWNESYS`) - Contains Catalogue, Recipes, Suppliers, Contacts

### Target State
DBx Connector will support TWO databases on the same SQL Server:
- **System Database** (e.g., `CROWNESYS`) - Existing functionality
- **Job Database** (e.g., `CROWNEJOB`) - NEW - Import job data as templates

### Key Requirements
1. User must have read permissions on BOTH databases
2. Cross-database SQL queries (joining `[CROWNESYS].[dbo].[Table]` with `[CROWNEJOB].[dbo].[Table]`)
3. UI to lookup jobs by number
4. Import job items into Templates Tab
5. Handle quantity-based zzType logic:
   - Quantity = 1 → zzType = 'part' (measurement type)
   - Quantity = 0 or > 1 → Use default zzType from Preferences

---

## 2. Database Authentication & Permissions

### 2.1 SQL Server User Setup

**Extend SQL_USER_SETUP.sql to include Job Database:**

```sql
-- ============================================================
-- Databuild SQL Server User Setup Script
-- For DBx Connector Vue - SYSTEM & JOB Database Access
-- ============================================================

-- CONFIGURATION VARIABLES
DECLARE @SystemDatabase NVARCHAR(128) = 'CROWNESYS';    -- System Database (Catalogue, Recipes, etc.)
DECLARE @JobDatabase NVARCHAR(128) = 'CROWNEJOB';       -- Job Database (Bill, Orders, etc.)
DECLARE @Username NVARCHAR(128) = 'dbx_user';
DECLARE @Password NVARCHAR(128) = 'YourSecurePassword123!';
DECLARE @PermissionLevel VARCHAR(20) = 'READ_ONLY';     -- READ_ONLY recommended

-- CREATE LOGIN (Server-level)
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = @Username)
BEGIN
    DECLARE @CreateLoginSQL NVARCHAR(MAX) =
        'CREATE LOGIN [' + @Username + '] WITH PASSWORD = ''' + @Password + ''',
         DEFAULT_DATABASE = [' + @SystemDatabase + '],
         CHECK_POLICY = OFF,
         CHECK_EXPIRATION = OFF';
    EXEC sp_executesql @CreateLoginSQL;
    PRINT '✓ Login created: ' + @Username;
END
ELSE
    PRINT '⚠ Login already exists: ' + @Username;

-- ============================================================
-- SYSTEM DATABASE - Grant Permissions
-- ============================================================
USE [master];  -- Switch to master first
DECLARE @UseSysDbSQL NVARCHAR(MAX) = 'USE [' + @SystemDatabase + ']';
EXEC sp_executesql @UseSysDbSQL;

-- Create database user for the login
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = @Username)
BEGIN
    DECLARE @CreateSysUserSQL NVARCHAR(MAX) =
        'USE [' + @SystemDatabase + ']; CREATE USER [' + @Username + '] FOR LOGIN [' + @Username + ']';
    EXEC sp_executesql @CreateSysUserSQL;
    PRINT '✓ User created in SYSTEM database: ' + @SystemDatabase;
END
ELSE
    PRINT '⚠ User already exists in SYSTEM database: ' + @SystemDatabase;

-- Grant READ_ONLY role
DECLARE @GrantSysRoleSQL NVARCHAR(MAX) =
    'USE [' + @SystemDatabase + ']; ALTER ROLE db_datareader ADD MEMBER [' + @Username + ']';
EXEC sp_executesql @GrantSysRoleSQL;
PRINT '✓ Granted db_datareader role on SYSTEM database';

-- ============================================================
-- JOB DATABASE - Grant Permissions
-- ============================================================
USE [master];  -- Switch to master first
DECLARE @UseJobDbSQL NVARCHAR(MAX) = 'USE [' + @JobDatabase + ']';
EXEC sp_executesql @UseJobDbSQL;

-- Create database user for the login
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = @Username)
BEGIN
    DECLARE @CreateJobUserSQL NVARCHAR(MAX) =
        'USE [' + @JobDatabase + ']; CREATE USER [' + @Username + '] FOR LOGIN [' + @Username + ']';
    EXEC sp_executesql @CreateJobUserSQL;
    PRINT '✓ User created in JOB database: ' + @JobDatabase;
END
ELSE
    PRINT '⚠ User already exists in JOB database: ' + @JobDatabase;

-- Grant READ_ONLY role
DECLARE @GrantJobRoleSQL NVARCHAR(MAX) =
    'USE [' + @JobDatabase + ']; ALTER ROLE db_datareader ADD MEMBER [' + @Username + ']';
EXEC sp_executesql @GrantJobRoleSQL;
PRINT '✓ Granted db_datareader role on JOB database';

-- ============================================================
-- VERIFICATION
-- ============================================================
PRINT '';
PRINT '============================================================';
PRINT 'Setup Complete! User has read access to BOTH databases:';
PRINT '  - SYSTEM: ' + @SystemDatabase;
PRINT '  - JOB: ' + @JobDatabase;
PRINT '============================================================';
```

**Key Points:**
- Single SQL login has access to BOTH databases
- User is created in each database separately
- Both databases must be on the same SQL Server instance
- Cross-database queries work automatically with these permissions

### 2.2 Connection Strategy

**Option A: Single Connection with Cross-Database Queries (RECOMMENDED)**

✅ **Advantages:**
- Simplest implementation
- No connection switching overhead
- Atomic transactions across databases
- Current connection already supports this

```javascript
// Current connection to CROWNESYS can query CROWNEJOB directly:
const query = `
  SELECT
    b.ItemCode,
    b.CostCentre,
    cc.Name AS CostCentreName
  FROM
    [CROWNEJOB].[dbo].[Bill] b
  LEFT JOIN
    [CROWNESYS].[dbo].[CostCentres] cc ON b.CostCentre = cc.Code AND cc.Tier = 1
  WHERE
    b.JobNo = @jobNo
`;
```

**Implementation:**
1. User configures System Database (CROWNESYS) in settings
2. App connects to System Database
3. Job Database name is derived: Replace 'SYS' with 'JOB' in database name
4. SQL queries use fully-qualified table names: `[DatabaseName].[dbo].[TableName]`

**Option B: Dynamic Database Switching**

⚠️ **Disadvantages:**
- More complex
- Connection overhead when switching
- Cannot do atomic cross-database transactions
- Already implemented but not necessary for this use case

---

## 3. Database Configuration

### 3.1 Enhanced Settings UI

Add Job Database configuration to `settings.html`:

```html
<!-- SYSTEM DATABASE (Existing) -->
<div class="form-group">
    <label for="database">System Database Name (CROWNESYS):</label>
    <input type="text" id="database" placeholder="CROWNESYS" required>
    <small class="hint">This database contains Catalogue, Recipes, Suppliers, Contacts</small>
</div>

<!-- JOB DATABASE (NEW) -->
<div class="form-group">
    <label for="jobDatabase">Job Database Name (CROWNEJOB):</label>
    <input type="text" id="jobDatabase" placeholder="CROWNEJOB">
    <small class="hint">Optional: Job database for importing templates. Leave blank to auto-detect (replace SYS with JOB)</small>
</div>

<div class="form-check">
    <input type="checkbox" id="autoDetectJobDb" checked>
    <label for="autoDetectJobDb">Auto-detect Job Database (replace 'SYS' with 'JOB' in System DB name)</label>
</div>
```

### 3.2 Database Config Storage

**Extend electron-store config:**

```javascript
// Current config.json structure:
{
  "dbConfig": {
    "server": "localhost\\SQLEXPRESS",
    "database": "CROWNESYS",
    "user": "dbx_user",
    "password": "encrypted_password"
  }
}

// Enhanced config.json:
{
  "dbConfig": {
    "server": "localhost\\SQLEXPRESS",
    "systemDatabase": "CROWNESYS",      // Renamed from 'database'
    "jobDatabase": "CROWNEJOB",         // NEW - Explicit job database name
    "autoDetectJobDb": true,            // NEW - Auto-detect job DB name
    "user": "dbx_user",
    "password": "encrypted_password"
  }
}
```

### 3.3 Job Database Name Detection

**Helper function in `src/database/connection.js`:**

```javascript
/**
 * Get Job Database name from System Database name
 * @param {Object} dbConfig - Database configuration
 * @returns {string} Job database name
 */
function getJobDatabaseName(dbConfig) {
  // If explicitly configured, use it
  if (dbConfig.jobDatabase) {
    return dbConfig.jobDatabase;
  }

  // Auto-detect: Replace 'SYS' with 'JOB'
  const systemDb = dbConfig.systemDatabase || dbConfig.database;

  if (systemDb.toUpperCase().endsWith('SYS')) {
    return systemDb.substring(0, systemDb.length - 3) + 'JOB';
  } else if (systemDb.toUpperCase().includes('SYS')) {
    return systemDb.replace(/SYS/gi, 'JOB');
  }

  // Fallback: append 'JOB'
  return systemDb + 'JOB';
}

// Examples:
// CROWNESYS → CROWNEJOB ✓
// TestSys → TestJob ✓
// MyCompanySYSTEM → MyCompanyJOBTEM (not ideal, but explicit config solves this)
```

---

## 4. Cross-Database SQL Queries

### 4.1 SQL Syntax

SQL Server supports cross-database queries using fully-qualified names:

**Format:** `[DatabaseName].[SchemaName].[TableName]`

**Example from user's query:**
```sql
SELECT
  b.ItemCode,
  b.CostCentre,
  cc.Name AS CostCentreName
FROM
  [CROWNEJOB].[dbo].[Bill] b           -- Table from Job Database
LEFT JOIN
  [CROWNESYS].[dbo].[CostCentres] cc   -- Table from System Database
  ON b.CostCentre = cc.Code AND cc.Tier = 1
WHERE
  b.JobNo = '1447'
```

### 4.2 Query Builder Helper

**New file: `src/database/query-builder.js`**

```javascript
/**
 * Build qualified table name for cross-database queries
 * @param {string} tableName - Table name
 * @param {string} databaseType - 'system' or 'job'
 * @param {Object} dbConfig - Database configuration
 * @returns {string} Fully-qualified table name
 */
function qualifyTable(tableName, databaseType, dbConfig) {
  const dbName = databaseType === 'job'
    ? getJobDatabaseName(dbConfig)
    : (dbConfig.systemDatabase || dbConfig.database);

  return `[${dbName}].[dbo].[${tableName}]`;
}

// Usage:
// qualifyTable('Bill', 'job', dbConfig) → '[CROWNEJOB].[dbo].[Bill]'
// qualifyTable('CostCentres', 'system', dbConfig) → '[CROWNESYS].[dbo].[CostCentres]'
```

### 4.3 Job Query Implementation

**New IPC handler: `src/ipc-handlers/jobs.js`**

```javascript
const { getPool } = require('../database/connection');
const { qualifyTable, getJobDatabaseName } = require('../database/query-builder');

/**
 * Get job list from Job Database
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Result with job list
 */
async function getJobList(params = {}) {
  const pool = getPool();
  if (!pool) {
    return { success: false, message: 'Database not connected' };
  }

  const dbConfig = params.dbConfig; // Passed from main.js

  try {
    const query = `
      SELECT DISTINCT
        JobNo,
        JobName,
        Client
      FROM ${qualifyTable('Bill', 'job', dbConfig)}
      ORDER BY JobNo DESC
    `;

    const result = await pool.request().query(query);

    return {
      success: true,
      data: result.recordset
    };
  } catch (error) {
    console.error('Error fetching job list:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get job items for a specific job number
 * Implements the user's complex query with quantity-based zzType logic
 */
async function getJobItems(jobNo, dbConfig, defaultZzType = 'count') {
  const pool = getPool();
  if (!pool) {
    return { success: false, message: 'Database not connected' };
  }

  try {
    const jobDb = getJobDatabaseName(dbConfig);
    const sysDb = dbConfig.systemDatabase || dbConfig.database;

    const query = `
      WITH OrderDetailsRanked AS (
        SELECT
          Code,
          Description,
          ROW_NUMBER() OVER (PARTITION BY Code ORDER BY (SELECT NULL)) AS RowNum
        FROM
          [${jobDb}].[dbo].[OrderDetails]
      )
      SELECT
        b.ItemCode,
        b.CostCentre,
        cc.Name AS CostCentreName,
        odr.Description,
        b.XDescription AS Workup,
        b.Quantity,
        pc.Printout AS PerCode,
        b.UnitPrice,
        CONCAT(b.JobNo, '/', b.CostCentre, '.', b.BLoad) AS OrderNumber,
        b.LineNumber,
        o.Supplier,
        o.CCSortOrder,
        -- Calculate zzType based on Quantity
        CASE
          WHEN b.Quantity = 1 THEN 'part'
          ELSE @defaultZzType
        END AS zzType
      FROM
        [${jobDb}].[dbo].[Bill] b
      LEFT JOIN
        [${jobDb}].[dbo].[Orders] o
        ON CONCAT(b.JobNo, '/', b.CostCentre, '.', b.BLoad) = o.OrderNumber
      LEFT JOIN
        OrderDetailsRanked odr
        ON b.ItemCode = odr.Code AND odr.RowNum = 1
      LEFT JOIN
        [${sysDb}].[dbo].[PriceList] pl
        ON b.ItemCode = pl.PriceCode
      LEFT JOIN
        [${sysDb}].[dbo].[PerCodes] pc
        ON pl.PerCode = pc.Code
      LEFT JOIN
        [${sysDb}].[dbo].[CostCentres] cc
        ON b.CostCentre = cc.Code AND cc.Tier = 1
      WHERE
        b.JobNo = @jobNo
      ORDER BY
        o.CCSortOrder, b.CostCentre, b.LineNumber
    `;

    const result = await pool.request()
      .input('jobNo', jobNo)
      .input('defaultZzType', defaultZzType)
      .query(query);

    return {
      success: true,
      data: result.recordset,
      total: result.recordset.length
    };
  } catch (error) {
    console.error('Error fetching job items:', error);
    return { success: false, message: error.message };
  }
}

module.exports = {
  getJobList,
  getJobItems
};
```

---

## 5. UI/UX Flow - Job Import

### 5.1 Templates Tab Enhancement

**Add "Import from Job" section to TemplatesTab.vue:**

```
┌────────────────────────────────────────────────────────┐
│  Templates Tab                                         │
├────────────────────────────────────────────────────────┤
│  [Import from Job]  [Create New]  [Manage Templates]  │
├────────────────────────────────────────────────────────┤
│                                                        │
│  📋 Import Job as Template                            │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Job Number: [____1447____]  [Search Jobs ▼]     │ │
│  │                                                  │ │
│  │ Default zzType: [count ▼]  (for Qty ≠ 1)       │ │
│  │                                                  │ │
│  │ [Preview Job Items]                             │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  📊 Job Preview: Job 1447 (45 items)                  │
│  ┌──────────────────────────────────────────────────┐ │
│  │ ItemCode  │ Description     │ Qty  │ zzType     │ │
│  ├───────────┼─────────────────┼──────┼────────────┤ │
│  │ ABC123    │ Concrete Block  │ 1.0  │ part       │ │
│  │ XYZ456    │ Steel Beam      │ 12.0 │ count      │ │
│  │ ...       │ ...             │ ...  │ ...        │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  [Cancel]  [Import as Template]                       │
└────────────────────────────────────────────────────────┘
```

### 5.2 Job Lookup Modal

**New component: `JobLookupModal.vue`**

Features:
- Search jobs by number or name
- Display job list with client info
- Select job to import
- Set default zzType for items (Qty ≠ 1)
- Preview job items before import

```vue
<template>
  <div class="modal fade" id="jobLookupModal">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Import Job as Template</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>

        <div class="modal-body">
          <!-- Job Search -->
          <div class="row mb-3">
            <div class="col-md-6">
              <label>Job Number:</label>
              <input type="text" v-model="searchJobNo" class="form-control" placeholder="1447">
            </div>
            <div class="col-md-4">
              <label>Default zzType (Qty ≠ 1):</label>
              <select v-model="defaultZzType" class="form-select">
                <option value="count">Count</option>
                <option value="area">Area</option>
                <option value="linear">Linear</option>
                <option value="segment">Segment</option>
              </select>
            </div>
            <div class="col-md-2 d-flex align-items-end">
              <button @click="searchJob" class="btn btn-primary w-100">Search</button>
            </div>
          </div>

          <!-- Job Items Preview -->
          <ag-grid-vue
            v-if="jobItems.length > 0"
            class="ag-theme-quartz"
            :columnDefs="columnDefs"
            :rowData="jobItems"
            :pagination="true"
            :paginationPageSize="50"
          />
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          <button
            class="btn btn-primary"
            @click="importJobAsTemplate"
            :disabled="jobItems.length === 0"
          >
            Import {{ jobItems.length }} Items as Template
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
```

### 5.3 User Flow

**Step-by-step workflow:**

1. **User clicks "Import from Job"** in Templates Tab
   - Opens JobLookupModal

2. **User enters Job Number** (e.g., 1447)
   - Selects default zzType for items with Qty ≠ 1
   - Clicks "Search"

3. **System fetches job items**
   - Calls `api.jobs.getJobItems(jobNo, defaultZzType)`
   - Displays items in AG Grid with columns:
     - ItemCode
     - Description
     - CostCentre / CostCentreName
     - Quantity
     - PerCode (Unit)
     - UnitPrice
     - zzType (calculated: Qty=1 → 'part', else → defaultZzType)

4. **User reviews items** in grid
   - Can edit zzType inline if needed
   - Can deselect items they don't want

5. **User clicks "Import as Template"**
   - Creates new template in `templates.json` store:
     ```json
     {
       "id": "job-1447-2025-01-13",
       "name": "Job 1447 - Project Name",
       "source": "job-import",
       "jobNumber": "1447",
       "items": [
         {
           "PriceCode": "ABC123",
           "Description": "Concrete Block",
           "Quantity": 1,
           "Unit": "m³",
           "Price": 125.50,
           "CostCentre": "01",
           "zzType": "part"
         },
         // ... more items
       ],
       "createdAt": "2025-01-13T10:30:00Z"
     }
     ```
   - Shows success message
   - Closes modal
   - Refreshes Templates Tab grid

---

## 6. Implementation Checklist

### Phase 1: Database Setup (Week 1)
- [ ] Update `SQL_USER_SETUP.sql` with Job Database permissions
- [ ] Test SQL script on development SQL Server
- [ ] Document testing process in `USER_SETUP_GUIDE.md`
- [ ] Update `testConnection()` to validate BOTH databases exist

### Phase 2: Connection Layer (Week 1)
- [ ] Create `src/database/query-builder.js` with helper functions
- [ ] Add `getJobDatabaseName()` function
- [ ] Add `qualifyTable()` function for cross-database queries
- [ ] Enhance `settings.html` with Job Database field
- [ ] Update `dbConfig` electron-store schema
- [ ] Update settings IPC handlers to save/load job database name

### Phase 3: IPC Handlers (Week 2)
- [ ] Create `src/ipc-handlers/jobs.js`
- [ ] Implement `getJobList()` function
- [ ] Implement `getJobItems()` function with quantity logic
- [ ] Register IPC handlers in `main.js`:
  - `jobs:getList`
  - `jobs:getItems`
- [ ] Expose in `preload.js`: `window.electronAPI.jobs.*`
- [ ] Add to `useElectronAPI.js` composable

### Phase 4: Frontend Components (Week 2-3)
- [ ] Create `JobLookupModal.vue` component
- [ ] Add AG Grid with job items display
- [ ] Implement search functionality
- [ ] Add zzType selector (default for Qty ≠ 1)
- [ ] Implement item selection/deselection
- [ ] Add inline zzType editing per item

### Phase 5: Templates Tab Integration (Week 3)
- [ ] Add "Import from Job" button to TemplatesTab.vue
- [ ] Integrate JobLookupModal
- [ ] Implement `importJobAsTemplate()` function
- [ ] Save imported jobs to `templates.json` electron-store
- [ ] Display imported templates in Templates Tab grid
- [ ] Add "Source: Job Import" indicator in UI

### Phase 6: Testing & Documentation (Week 4)
- [ ] Test with CROWNESYS + CROWNEJOB databases
- [ ] Test auto-detection of job database name
- [ ] Test manual job database configuration
- [ ] Test quantity-based zzType logic (Qty=1 → part, else → default)
- [ ] Test cross-database JOIN performance
- [ ] Update `API_REFERENCE.md` with Jobs API
- [ ] Update `DEVELOPER_GUIDE.md` with cross-database patterns
- [ ] Update `USER_SETUP_GUIDE.md` with job import instructions

---

## 7. Technical Considerations

### 7.1 Performance

**Cross-database JOINs:**
- SQL Server handles these efficiently when on same instance
- Use indexes on joined columns (Code, JobNo, etc.)
- Consider pagination for large jobs (>1000 items)

**Recommendations:**
```sql
-- Add indexes in Job Database (if not already present):
CREATE INDEX IX_Bill_JobNo ON [CROWNEJOB].[dbo].[Bill](JobNo);
CREATE INDEX IX_Bill_ItemCode ON [CROWNEJOB].[dbo].[Bill](ItemCode);
CREATE INDEX IX_Orders_OrderNumber ON [CROWNEJOB].[dbo].[Orders](OrderNumber);
```

### 7.2 Error Handling

**Common errors to handle:**

1. **Job Database not found**
   ```javascript
   if (error.message.includes('Could not find database')) {
     return {
       success: false,
       message: `Job database '${jobDbName}' not found. Please configure in Settings.`
     };
   }
   ```

2. **No permission on Job Database**
   ```javascript
   if (error.message.includes('permission')) {
     return {
       success: false,
       message: 'User does not have permission to access Job database. Run SQL_USER_SETUP.sql script.'
     };
   }
   ```

3. **Job not found**
   ```javascript
   if (result.recordset.length === 0) {
     return {
       success: false,
       message: `Job ${jobNo} not found in database.`
     };
   }
   ```

### 7.3 Security

**SQL Injection Prevention:**
- ✅ Always use parameterized queries with `@jobNo` parameter
- ✅ Never concatenate user input into SQL strings
- ✅ Validate job numbers: `/^[0-9]{1,10}$/`

**Example:**
```javascript
// GOOD ✓
const result = await pool.request()
  .input('jobNo', sql.NVarChar, jobNo)
  .query('SELECT * FROM Bill WHERE JobNo = @jobNo');

// BAD ✗
const query = `SELECT * FROM Bill WHERE JobNo = '${jobNo}'`; // SQL INJECTION RISK!
```

---

## 8. Future Enhancements

### 8.1 Advanced Features (Post-MVP)

1. **Job Updates**
   - Detect if job has been modified since template creation
   - Offer to update template with latest job data

2. **Multiple Job Import**
   - Select multiple jobs at once
   - Merge into single template

3. **Job-to-zzTakeoff Direct**
   - Skip Templates Tab
   - Send job items directly to zzTakeoff

4. **Cost Centre Filtering**
   - Filter job items by cost centre before import
   - Useful for large jobs with many cost centres

5. **Supplier-Based Templates**
   - Group job items by Supplier
   - Create separate templates per supplier

---

## 9. Migration Notes

### Breaking Changes
**None** - This is additive functionality. Existing features unchanged.

### Database Schema
**No changes to existing databases.** Read-only access to Job Database.

### User Action Required
1. Run updated `SQL_USER_SETUP.sql` to grant Job Database permissions
2. Configure Job Database name in Settings (or use auto-detect)
3. Restart application

---

## 10. Summary

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Connection Strategy** | Single connection with cross-database queries | Simplest, no switching overhead |
| **Job DB Name** | Auto-detect (replace SYS with JOB) | User-friendly, manual override available |
| **User Permissions** | READ_ONLY on both databases | Security best practice |
| **zzType Logic** | Qty=1 → 'part', else → default from Preferences | Per user requirement |
| **Storage** | Templates JSON store | Consistent with existing patterns |

### Estimated Effort
- **Development:** 3-4 weeks
- **Testing:** 1 week
- **Documentation:** Included in development
- **Total:** ~4-5 weeks

### Success Criteria
✅ User can search for jobs by number
✅ User can preview job items before import
✅ System correctly calculates zzType based on Quantity
✅ Imported jobs appear in Templates Tab
✅ Templates can be sent to zzTakeoff with correct properties
✅ Cross-database queries perform well (<2 seconds for typical jobs)

---

**Review Date:** January 2025
**Next Steps:** Review with user, get approval to proceed with Phase 1
