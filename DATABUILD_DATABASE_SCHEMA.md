# Databuild Database Schema Documentation

This document provides comprehensive documentation of the Databuild SQL Server database structure and recommended development environment for building applications that integrate with Databuild construction estimating software.

## Table of Contents
1. [Development Environment Setup](#development-environment-setup)
2. [Recommended Technology Stack](#recommended-technology-stack)
3. [Database Architecture Overview](#database-architecture-overview)
4. [System Database Tables](#system-database-tables)
5. [Job Database Tables](#job-database-tables)
6. [Common Query Patterns](#common-query-patterns)
7. [Data Relationships](#data-relationships)
8. [Important Notes](#important-notes)

---

## Development Environment Setup

### Prerequisites

**Required Software:**
- **Node.js**: v18.x or higher (LTS recommended)
- **npm**: v9.x or higher (comes with Node.js)
- **SQL Server**: Any version compatible with Databuild
- **Git**: For version control
- **Visual Studio Code**: Recommended IDE

**Optional but Recommended:**
- **SQL Server Management Studio (SSMS)**: For database exploration
- **Vue DevTools**: Browser extension for Vue.js debugging
- **Postman** or **Insomnia**: For API testing

### Project Structure

For a Bill of Quantities application, the recommended structure is:

```
your-boq-app/
├── frontend/                  # Vue.js frontend application
│   ├── src/
│   │   ├── components/       # Vue components
│   │   │   ├── common/      # Shared components
│   │   │   ├── Bill/        # Bill of Quantities components
│   │   │   └── Jobs/        # Job management components
│   │   ├── composables/     # Vue 3 composables
│   │   │   └── useElectronAPI.js  # API wrapper
│   │   ├── router/          # Vue Router configuration
│   │   ├── assets/          # Static assets (CSS, images)
│   │   ├── App.vue          # Root component
│   │   └── main.js          # Vue app entry point
│   ├── public/              # Public static files
│   ├── package.json         # Frontend dependencies
│   └── vite.config.js       # Vite build configuration
├── src/                      # Backend (Electron main process)
│   ├── database/            # Database connection and stores
│   │   └── connection.js    # SQL Server connection pool
│   ├── ipc-handlers/        # IPC handler modules
│   │   ├── bill.js         # Bill of Quantities handlers
│   │   ├── jobs.js         # Job management handlers
│   │   └── catalogue.js    # Catalogue/PriceList handlers
│   └── services/            # Business logic services
├── main.js                  # Electron main process entry
├── preload.js              # Electron preload script (IPC bridge)
├── package.json            # Project dependencies
└── DATABUILD_DATABASE_SCHEMA.md  # This file
```

---

## Recommended Technology Stack

### Frontend

**Vue.js 3 (Composition API)**
```json
{
  "vue": "^3.4.0",
  "vue-router": "^4.2.0"
}
```

**Why Vue 3:**
- Modern reactivity system with excellent performance
- Composition API for better code organization
- TypeScript support (optional but recommended)
- Smaller bundle size than alternatives
- Excellent documentation and community

**UI Framework: Bootstrap 5**
```json
{
  "bootstrap": "^5.3.0",
  "bootstrap-icons": "^1.11.0"
}
```

**Grid Component: AG Grid Community**
```json
{
  "ag-grid-community": "^34.0.0",
  "ag-grid-vue3": "^34.0.0"
}
```

**Build Tool: Vite**
```json
{
  "vite": "^5.0.0",
  "@vitejs/plugin-vue": "^5.0.0"
}
```

### Backend

**Electron (for desktop applications)**
```json
{
  "electron": "^32.0.0",
  "electron-builder": "^25.0.0"
}
```

**Database Access: mssql (SQL Server client)**
```json
{
  "mssql": "^11.0.0"
}
```

**Persistent Storage: electron-store**
```json
{
  "electron-store": "^10.0.0"
}
```

**Utilities:**
```json
{
  "lodash": "^4.17.21",
  "date-fns": "^3.0.0"
}
```

### Development Tools

```json
{
  "concurrently": "^8.2.0",
  "wait-on": "^7.2.0",
  "cross-env": "^7.0.3"
}
```

---

## Application Architecture

### Electron + Vue.js Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│                   (Browser Window)                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │           Vue.js Frontend (Renderer)              │  │
│  │  ┌──────────────────────────────────────────┐    │  │
│  │  │  Components (Bill, Jobs, Catalogue)      │    │  │
│  │  └──────────────────────────────────────────┘    │  │
│  │  ┌──────────────────────────────────────────┐    │  │
│  │  │  Vue Router (Navigation)                  │    │  │
│  │  └──────────────────────────────────────────┘    │  │
│  │  ┌──────────────────────────────────────────┐    │  │
│  │  │  useElectronAPI (IPC Bridge)             │    │  │
│  │  └──────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                         ↕ IPC (Inter-Process Communication)
┌─────────────────────────────────────────────────────────┐
│              Electron Main Process                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │           preload.js (Context Bridge)             │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │        IPC Handlers (bill.js, jobs.js)           │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │     Database Connection (mssql pool)              │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                         ↕ SQL Protocol
┌─────────────────────────────────────────────────────────┐
│              SQL Server Database                         │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │  System Database │  │  Job Database    │            │
│  │  (CROWNESYS)     │  │  (CROWNEJOB)     │            │
│  └──────────────────┘  └──────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

### IPC Communication Pattern

**Frontend (Vue Component):**
```javascript
// In your Vue component
import { useElectronAPI } from '@/composables/useElectronAPI';

export default {
  setup() {
    const api = useElectronAPI();

    async function loadBillForJob(jobNo) {
      const result = await api.bill.getForJob(jobNo);
      if (result.success) {
        return result.items;
      } else {
        console.error(result.message);
        return [];
      }
    }

    return { loadBillForJob };
  }
}
```

**Preload Script (IPC Bridge):**
```javascript
// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  bill: {
    getForJob: (jobNo) => ipcRenderer.invoke('bill:get-for-job', jobNo),
    updateLineItem: (jobNo, lineNo, updates) =>
      ipcRenderer.invoke('bill:update-line-item', jobNo, lineNo, updates)
  }
});
```

**Main Process (IPC Handler):**
```javascript
// src/ipc-handlers/bill.js
const { getPool } = require('../database/connection');

async function getForJob(event, jobNo) {
  try {
    const pool = getPool();
    const result = await pool.request()
      .input('JobNo', jobNo)
      .query(`
        SELECT b.ItemCode, b.Quantity, b.UnitPrice, pl.Description
        FROM Bill b
        LEFT JOIN PriceList pl ON b.ItemCode = pl.PriceCode
        WHERE b.JobNo = @JobNo
        ORDER BY b.LineNumber
      `);

    return { success: true, items: result.recordset };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

module.exports = { getForJob };
```

**Main Process Registration:**
```javascript
// main.js
const { ipcMain } = require('electron');
const billHandlers = require('./src/ipc-handlers/bill');

ipcMain.handle('bill:get-for-job', billHandlers.getForJob);
```

### Database Connection Setup

**Connection Module (src/database/connection.js):**
```javascript
const sql = require('mssql');

let pool = null;
let systemDbName = null;
let jobDbName = null;

/**
 * Connect to SQL Server
 */
async function connect(config) {
  try {
    // System Database connection
    const systemConfig = {
      server: config.server,
      database: config.systemDatabase || config.database,
      user: config.user,
      password: config.password,
      options: {
        encrypt: config.encrypt !== false,
        trustServerCertificate: true,
        enableArithAbort: true
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      }
    };

    pool = await sql.connect(systemConfig);
    systemDbName = config.systemDatabase || config.database;

    // Auto-detect or set Job Database name
    if (config.jobDatabase) {
      jobDbName = config.jobDatabase;
    } else {
      // Auto-detect: Replace SYS with JOB
      jobDbName = systemDbName.replace(/SYS$/i, 'JOB');
    }

    console.log('✓ Connected to System DB:', systemDbName);
    console.log('✓ Job DB configured as:', jobDbName);

    return { success: true };
  } catch (error) {
    console.error('Database connection error:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get active connection pool
 */
function getPool() {
  if (!pool) {
    throw new Error('Database not connected');
  }
  return pool;
}

/**
 * Get Job Database name
 */
function getJobDatabaseName() {
  return jobDbName;
}

/**
 * Get System Database name
 */
function getSystemDatabaseName() {
  return systemDbName;
}

/**
 * Close connection
 */
async function close() {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

module.exports = {
  connect,
  getPool,
  getJobDatabaseName,
  getSystemDatabaseName,
  close
};
```

### Vue.js Composable Pattern

**useElectronAPI.js:**
```javascript
// frontend/src/composables/useElectronAPI.js
export function useElectronAPI() {
  // Fallback for browser mode (development)
  if (!window.electronAPI) {
    console.warn('electronAPI not available (browser mode)');
    return {
      bill: {
        getForJob: () => Promise.resolve({ success: false, message: 'Not in Electron' })
      }
    };
  }

  return window.electronAPI;
}
```

### Vue Component Example

**BillTab.vue:**
```vue
<template>
  <div class="bill-tab">
    <h2>Bill of Quantities - Job {{ selectedJob }}</h2>

    <!-- Job Selector -->
    <select v-model="selectedJob" @change="loadBill" class="form-select mb-3">
      <option v-for="job in jobs" :key="job.JobNo" :value="job.JobNo">
        {{ job.JobNo }} - {{ job.Client }}
      </option>
    </select>

    <!-- AG Grid -->
    <ag-grid-vue
      class="ag-theme-quartz"
      :columnDefs="columnDefs"
      :rowData="billItems"
      :defaultColDef="defaultColDef"
      @grid-ready="onGridReady"
      style="height: 600px;">
    </ag-grid-vue>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { useElectronAPI } from '@/composables/useElectronAPI';

export default {
  name: 'BillTab',
  components: { AgGridVue },
  setup() {
    const api = useElectronAPI();
    const jobs = ref([]);
    const selectedJob = ref(null);
    const billItems = ref([]);

    const columnDefs = ref([
      { field: 'ItemCode', headerName: 'Code', width: 150 },
      { field: 'Description', headerName: 'Description', flex: 1 },
      { field: 'Quantity', headerName: 'Qty', width: 100, type: 'numericColumn' },
      { field: 'Unit', headerName: 'Unit', width: 80 },
      { field: 'UnitPrice', headerName: 'Unit Price', width: 120, valueFormatter: params => `$${params.value?.toFixed(2)}` },
      { field: 'LineTotal', headerName: 'Total', width: 120, valueFormatter: params => `$${params.value?.toFixed(2)}` }
    ]);

    const defaultColDef = ref({
      sortable: true,
      filter: true,
      resizable: true
    });

    async function loadJobs() {
      const result = await api.jobs.getAll();
      if (result.success) {
        jobs.value = result.jobs;
        if (jobs.value.length > 0) {
          selectedJob.value = jobs.value[0].JobNo;
          await loadBill();
        }
      }
    }

    async function loadBill() {
      if (!selectedJob.value) return;

      const result = await api.bill.getForJob(selectedJob.value);
      if (result.success) {
        billItems.value = result.items;
      }
    }

    onMounted(() => {
      loadJobs();
    });

    return {
      jobs,
      selectedJob,
      billItems,
      columnDefs,
      defaultColDef,
      loadBill
    };
  }
};
</script>

<style scoped>
.bill-tab {
  padding: 20px;
}
</style>
```

### Package.json Scripts

```json
{
  "name": "boq-app",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "dev": "concurrently \"npm run dev:frontend\" \"wait-on http://localhost:5173 && npm run dev:electron\"",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:electron": "cross-env NODE_ENV=development electron .",
    "build": "npm run build:frontend && npm run build:electron",
    "build:frontend": "cd frontend && npm run build",
    "build:electron": "electron-builder",
    "dist": "electron-builder"
  },
  "build": {
    "appId": "com.yourcompany.boqapp",
    "productName": "BOQ App",
    "directories": {
      "output": "dist"
    },
    "files": [
      "main.js",
      "preload.js",
      "src/**/*",
      "frontend/dist/**/*"
    ],
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    }
  }
}
```

### Vite Configuration

**frontend/vite.config.js:**
```javascript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  server: {
    port: 5173,
    strictPort: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
});
```

---

## Database Architecture Overview

Databuild uses a **three-database architecture**:

### 1. Common Database
- **Purpose:** User authentication and system-wide settings
- **Usage:** Not typically used by external applications
- **Access:** Administrative only

### 2. System Database
- **Naming Convention:** `T_Esys` or `[COMPANY]SYS` (e.g., `CROWNESYS`)
- **Purpose:** Core master data shared across all jobs
- **Contains:**
  - Price lists and catalogue items
  - Cost centre hierarchy
  - Supplier and contact information
  - Recipe definitions (assemblies)
  - Standard notes and templates
  - Unit of measure definitions

### 3. Job Database
- **Naming Convention:** `T_EJob` or `[COMPANY]JOB` (e.g., `CROWNEJOB`)
- **Purpose:** Project-specific data for all jobs
- **Contains:**
  - Job master records
  - Bills of quantities
  - Purchase orders
  - Job-specific notes
  - Client information (via Contacts link)

### Database Name Detection
If the Job Database name is not explicitly configured, it can be auto-detected by replacing the `SYS` suffix with `JOB` in the System Database name:
- `CROWNESYS` → `CROWNEJOB`
- `T_Esys` → `T_EJob`

---

## System Database Tables

### PriceList
**Purpose:** Master catalogue of all items and recipes

**Primary Key:** `PriceCode` (nvarchar(30))

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `PriceCode` | nvarchar(30) | Unique item identifier (PK) |
| `Description` | nvarchar(120) | Item description |
| `CostCentre` | nvarchar(10) | Links to CostCentres.Code |
| `PerCode` | int | Links to PerCodes.Code (unit of measure) |
| `Recipe` | bit | 1 = recipe/assembly, 0 = standard item |
| `RecipeIngredient` | bit | 1 = can be used in recipes |
| `Template` | ntext | Template data for item |
| `Specification` | ntext | Item specifications |
| `Master` | bit | Master item flag |
| `Archived` | bit | Archived status (0 = active, 1 = archived) |
| `OneOff` | bit | One-off item flag |
| `Hours` | float | Labor hours |
| `Weight` | float | Item weight |

**Indexes:**
- Primary: `PriceCode`
- Foreign: `CostCentre`, `PerCode`

**Important Notes:**
- Use `LEFT JOIN` from PriceList to avoid filtering out items without cost centres
- Always filter `Archived = 0` for active items only
- `Recipe = 1` indicates the item is a recipe/assembly that has sub-items in the Recipe table

---

### CostCentres
**Purpose:** Hierarchical cost centre structure for organizing items

**Primary Key:** `Code` + `Tier`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `Code` | nvarchar(10) | Cost centre code (PK) |
| `Tier` | nvarchar(8) | Tier level (PK): 1 = main, 2+ = sub-levels |
| `Name` | nvarchar(32) | Cost centre name |
| `SubGroup` | nvarchar(24) | Sub-group classification |
| `SortOrder` | float | Display order |
| `Master` | bit | Master cost centre flag |
| `Owner` | nvarchar(96) | Owner/responsible party |
| `Markup` | real | Markup percentage |
| `GLAccount` | float | General ledger account number |

**Indexes:**
- Primary: `Code`, `Tier`

**Important Notes:**
- **ALWAYS filter for `Tier = 1`** to get main cost centres
- Put `Tier = 1` in the JOIN condition, NOT the WHERE clause:
  ```sql
  LEFT JOIN CostCentres CC ON PL.CostCentre = CC.Code AND CC.Tier = 1
  ```
- `SortOrder` determines display sequence
- Use `ISNULL(CC.SortOrder, 999999)` in ORDER BY to handle NULLs

---

### Recipe
**Purpose:** Defines recipe sub-items (ingredients/components)

**Primary Key:** `Counter` (int, IDENTITY)

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `Counter` | int | Auto-increment ID (PK) |
| `Main_Item` | nvarchar(30) | Parent recipe PriceCode |
| `Sub_Item` | nvarchar(30) | Ingredient PriceCode |
| `Quantity` | float | Quantity of ingredient |
| `Formula` | ntext | Calculation formula for quantity |
| `Cost_Centre` | nvarchar(10) | Override cost centre |

**Indexes:**
- Primary: `Counter`
- Foreign: `Main_Item` (for efficient recipe expansion)

**Query Pattern:**
```sql
SELECT R.Main_Item, R.Sub_Item, R.Quantity, PL.Description, PC.Printout AS Unit
FROM Recipe R
INNER JOIN PriceList PL ON R.Sub_Item = PL.PriceCode
LEFT JOIN PerCodes PC ON PL.PerCode = PC.Code
WHERE R.Main_Item = @PriceCode
ORDER BY R.Counter
```

---

### PerCodes
**Purpose:** Unit of measure definitions

**Primary Key:** `Code` (int)

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `Code` | int | Unit code (PK) |
| `Printout` | nvarchar(15) | Display text (e.g., "m", "m²", "each", "%") |
| `Display` | nvarchar(15) | Alternate display text |
| `Divisor` | int | Divisor for calculations |
| `CalculationRoutine` | int | Calculation method |
| `Rounding` | float | Rounding precision |

**Common Units:**
- `m` - Metres (linear)
- `m²` - Square metres
- `m³` - Cubic metres
- `%` - Percentage (special calculation: Total = UnitPrice × Quantity ÷ 100)
- `each` - Individual items
- `nr` - Number
- `Week/s` - Weeks

---

### Supplier
**Purpose:** Supplier and subcontractor records

**Primary Key:** `Supplier_Code` (nvarchar(8))

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `Supplier_Code` | nvarchar(8) | Supplier unique code (PK) |
| `SupplierName` | nvarchar(96) | Supplier name |
| `SuppGroup` | int | Links to SupplierGroup.GroupNumber |
| `AccountContact` | nvarchar(32) | Contact person |
| `AccountPhone` | nvarchar(50) | Phone number |
| `AccountEmail` | nvarchar(255) | Email address |
| `AccountAddress` | nvarchar(255) | Street address |
| `AccountCity` | nvarchar(50) | City |
| `AccountState` | nvarchar(20) | State |
| `AccountPostcode` | nvarchar(8) | Postcode |
| `GST` | bit | GST registered |
| `Archived` | bit | Archived status |
| `OSC` | bit | OSC integration flag |
| `Area` | nvarchar(24) | Geographic area for RFQ distribution |

**Important Notes:**
- Filter `Archived = 0` for active suppliers
- `Area` used for regional RFQ distribution

---

### SupplierGroup
**Purpose:** Supplier categorization

**Primary Key:** `GroupNumber` (int)

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `GroupNumber` | int | Group ID (PK) |
| `GroupName` | nvarchar(20) | Group name |
| `Lcolor` | int | Label color |

---

### CCSuppliers
**Purpose:** Preferred suppliers per cost centre (many-to-many relationship)

**Primary Key:** `CostCentre` + `Supplier`

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `CostCentre` | nvarchar(10) | Cost centre code (PK) |
| `Supplier` | nvarchar(8) | Supplier code (PK) |
| `SortOrder` | int | Display order in preferred list |

**Important Business Rule:**
- **ONLY suppliers in this table can be selected for purchase orders for that cost centre**
- This is a critical constraint enforced by Databuild

**Query Pattern:**
```sql
SELECT s.Supplier_Code, s.SupplierName, cs.SortOrder
FROM CCSuppliers cs
INNER JOIN Supplier s ON cs.Supplier = s.Supplier_Code
WHERE cs.CostCentre = @CostCentreCode
ORDER BY cs.SortOrder
```

---

### Prices
**Purpose:** Price history for catalogue items

**Primary Key:** `Counter` (int, IDENTITY)

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `Counter` | int | Auto-increment ID (PK) |
| `PriceCode` | nvarchar(30) | Links to PriceList.PriceCode |
| `Price` | money | Price value |
| `Date` | datetime | Price effective date |
| `PriceLevel` | int | Price level (0 = base, 1+ = alternate) |

**Indexes:**
- Primary: `Counter`
- Foreign: `PriceCode`, `Date`, `PriceLevel`

**Get Latest Price:**
```sql
SELECT TOP 1 Price, Date
FROM Prices
WHERE PriceCode = @PriceCode AND PriceLevel = 0
ORDER BY Date DESC
```

---

### SuppliersPrices
**Purpose:** Supplier-specific pricing and item references

**Primary Key:** `Counter` (int, IDENTITY)

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `Counter` | int | Auto-increment ID (PK) |
| `Supplier` | nvarchar(9) | Supplier code |
| `ItemCode` | nvarchar(30) | Internal item code |
| `Reference` | nvarchar(30) | Supplier's reference/part number |
| `Price` | money | Supplier's price |
| `Supp_Date` | datetime | Price date |
| `Area` | nvarchar(24) | Geographic area |
| `PriceLevel` | int | Price level |

**Usage:**
- Display supplier's reference on purchase orders
- Get supplier-specific pricing

---

### Contacts
**Purpose:** Contact records (clients, suppliers, contractors)

**Primary Key:** `Code` (nvarchar(8))

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `Code` | nvarchar(8) | Contact code (PK) |
| `Name` | nvarchar(96) | Contact name |
| `Group_` | int | Links to ContactGroup.Code |
| `Contact` | nvarchar(32) | Contact person |
| `Phone` | nvarchar(50) | Phone number |
| `Mobile` | nvarchar(50) | Mobile number |
| `Email` | nvarchar(255) | Email address |
| `Address` | nvarchar(255) | Street address |
| `City` | nvarchar(50) | City |
| `State` | nvarchar(20) | State |
| `Postcode` | nvarchar(8) | Postcode |
| `Supplier` | bit | Is supplier flag |
| `Debtor` | bit | Is debtor/client flag |
| `Notes` | ntext | Notes |

**Important Link:**
- Jobs use `Jobs.Job_No = Contacts.Code` to link to client details
- Client name comes from `Contacts.Name`
- Site address comes from `Contacts.Address`, `Contacts.City`, `Contacts.State`

---

### ContactGroup
**Purpose:** Contact categorization

**Primary Key:** `Code` (int)

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `Code` | int | Group code (PK) |
| `Name` | nvarchar(20) | Group name |
| `Lcolor` | int | Label color |

---

### StandardNotes
**Purpose:** Reusable notes for purchase orders

**Primary Key:** `NoteCode` (nvarchar(8))

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `NoteCode` | nvarchar(8) | Note identifier (PK, max 8 chars) |
| `NoteText` | ntext | Note content |
| `Category` | nvarchar(20) | Note category/grouping |

**Important:**
- Can contain User Defined Field (UDF) variables: `[job udf1]`, `[job udf2]`, etc.
- Variables replaced with actual job data when processed
- Example: `[job udf1]` → "Site Address: 123 Main St"

---

### GlobalNotes
**Purpose:** Notes that automatically appear on every purchase order

**Primary Key:** `NoteCode` (nvarchar(8))

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `NoteCode` | nvarchar(8) | Note identifier (PK) |
| `NoteText` | ntext | Note content |
| `Active` | bit | Whether note is currently active |

**Usage:**
- `Active = 1` notes appear on all POs automatically
- Can be toggled on/off without deletion

---

### CCBanks
**Purpose:** Cost centre banks for budget tracking

**Primary Key:** `CCBankCode` (nvarchar(8))

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `CCBankCode` | nvarchar(8) | Bank code (PK) |
| `CCBankName` | nvarchar(50) | Bank name |
| `IncludeBudgets` | bit | Include budgets flag |
| `IncludeOrders` | bit | Include orders flag |

---

## Job Database Tables

### Jobs
**Purpose:** Job master records

**Primary Key:** `Job_No` (nvarchar(10))

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `Job_No` | nvarchar(10) | Job number/code (PK) |
| `Status` | nvarchar(20) | Job status (Active, Archived, etc.) |
| `ScheduleProfile` | nvarchar | Schedule profile reference |
| `StartDate` | datetime | Project start date |
| `UDF1` - `UDF10` | nvarchar | User-defined fields for custom data |

**IMPORTANT - No Built-in Job Details:**
- Jobs table does **NOT** have JobName, Client, Address, or City columns
- Client name and address come from **Contacts** table
- Join pattern: `Jobs.Job_No = Contacts.Code`
- Job description typically uses `Contacts.Address` or constructed from `'Job ' + Job_No`

**UDF Usage:**
- UDF fields store custom job-specific data
- Common uses: Site address, site manager, contact numbers, special instructions
- Referenced in StandardNotes as `[job udf1]`, `[job udf2]`, etc.

---

### Bill
**Purpose:** Bill of Quantities - job line items with quantities and prices

**Primary Key:** Composite (`JobNo`, `CostCentre`, `BLoad`, `LineNumber`)

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `JobNo` | nvarchar(10) | Job number |
| `ItemCode` | nvarchar(30) | Links to PriceList.PriceCode |
| `CostCentre` | nvarchar(10) | Cost centre code |
| `BLoad` | int | Budget load number |
| `LineNumber` | int | Line sequence number |
| `Quantity` | float | Item quantity |
| `UnitPrice` | money | Price per unit |
| `XDescription` | ntext | Extended description (workup/notes) |

**Important Notes:**
- `BLoad` represents different budget versions or loads
- `XDescription` contains item-specific notes/workup
- If workup starts with `[Hide]`, it's for internal use only and should not appear on printed orders
- Quantity > 0 for active items

**Line Total Calculation:**
- **Standard:** `LineTotal = Quantity × UnitPrice`
- **Percentage Units (%):** `LineTotal = UnitPrice × (Quantity ÷ 100)`
  - Example: 10% of $858 = $858 × 0.10 = $85.80

---

### Orders
**Purpose:** Purchase order header information

**Primary Key:** `OrderNumber` (nvarchar(50))

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `OrderNumber` | nvarchar(50) | Format: `JobNo/CostCentre.BLoad` (PK) |
| `Supplier` | nvarchar(8) | Supplier code |
| `CCSortOrder` | int | Cost centre sort order |
| `OrderDate` | datetime | Order date |

**Order Number Format:**
- Pattern: `{JobNo}/{CostCentre}.{BLoad}`
- Example: `001/CONC.1` = Job 001, Concrete cost centre, Load 1
- Example: `1473/090.1` = Job 1473, Cost centre 090, Load 1

**Order Status Logic:**
- **Logged Order (Blue):** Record exists in Orders table
- **To Order (Green):** Bill record exists but no Orders record yet
- Logged orders are immutable (cannot be edited, only viewed)

---

### OrderDetails
**Purpose:** Order detail descriptions (alternative to PriceList descriptions)

**Primary Key:** `Code` (nvarchar(30))

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `Code` | nvarchar(30) | Item code (PK) |
| `Description` | nvarchar(120) | Item description |

**Usage:**
- Provides alternative descriptions for order items
- Use first occurrence when multiple rows exist for same code:
  ```sql
  ROW_NUMBER() OVER (PARTITION BY Code ORDER BY (SELECT NULL)) AS RowNum
  ```

---

## Common Query Patterns

### Get Catalogue with Latest Prices
```sql
SELECT
  PL.PriceCode,
  PL.Description,
  PL.CostCentre,
  CC.Name AS CostCentreName,
  CC.SubGroup,
  PC.Printout AS Unit,
  PL.Recipe,
  (SELECT TOP 1 Price FROM Prices
   WHERE PriceCode = PL.PriceCode AND PriceLevel = 0
   ORDER BY Date DESC) AS LatestPrice,
  (SELECT TOP 1 Date FROM Prices
   WHERE PriceCode = PL.PriceCode AND PriceLevel = 0
   ORDER BY Date DESC) AS LatestPriceDate
FROM PriceList PL
LEFT JOIN CostCentres CC ON PL.CostCentre = CC.Code AND CC.Tier = 1
LEFT JOIN PerCodes PC ON PL.PerCode = PC.Code
WHERE PL.Archived = 0
ORDER BY ISNULL(CC.SortOrder, 999999), PL.PriceCode
```

### Get Recipe with Sub-Items
```sql
SELECT
  R.Main_Item,
  R.Sub_Item,
  R.Quantity,
  R.Formula,
  PL.Description AS SubItemDescription,
  PC.Printout AS Unit,
  PL.CostCentre
FROM Recipe R
INNER JOIN PriceList PL ON R.Sub_Item = PL.PriceCode
LEFT JOIN PerCodes PC ON PL.PerCode = PC.Code
WHERE R.Main_Item = @PriceCode
ORDER BY R.Counter
```

### Get Bill of Quantities for Job
```sql
DECLARE @sysDbName NVARCHAR(50) = 'CROWNESYS';
DECLARE @jobDbName NVARCHAR(50) = 'CROWNEJOB';

SELECT
  b.ItemCode,
  b.CostCentre,
  cc.Name AS CostCentreName,
  b.Quantity,
  pc.Printout AS Unit,
  b.UnitPrice,
  b.XDescription AS Workup,
  pl.Description,
  -- Calculate line total (handle percentage units)
  CASE
    WHEN pc.Printout = '%' THEN b.UnitPrice * (b.Quantity / 100.0)
    ELSE b.Quantity * b.UnitPrice
  END AS LineTotal
FROM [{jobDbName}].[dbo].[Bill] b
LEFT JOIN [{sysDbName}].[dbo].[PriceList] pl ON b.ItemCode = pl.PriceCode
LEFT JOIN [{sysDbName}].[dbo].[PerCodes] pc ON pl.PerCode = pc.Code
LEFT JOIN [{sysDbName}].[dbo].[CostCentres] cc ON b.CostCentre = cc.Code AND cc.Tier = 1
WHERE b.JobNo = @JobNo
  AND b.Quantity > 0
ORDER BY cc.SortOrder, b.CostCentre, b.LineNumber
```

### Get Job Orders with Line Items (Cross-Database)
```sql
DECLARE @sysDbName NVARCHAR(50) = 'CROWNESYS';
DECLARE @jobDbName NVARCHAR(50) = 'CROWNEJOB';

WITH OrderDetailsRanked AS (
  SELECT
    Code,
    Description,
    ROW_NUMBER() OVER (PARTITION BY Code ORDER BY (SELECT NULL)) AS RowNum
  FROM [{jobDbName}].[dbo].[OrderDetails]
)
SELECT
  b.JobNo,
  b.ItemCode,
  b.CostCentre,
  cc.Name AS CostCentreName,
  odr.Description,
  b.XDescription AS Workup,
  b.Quantity,
  pc.Printout AS Unit,
  b.UnitPrice,
  CONCAT(b.JobNo, '/', b.CostCentre, '.', b.BLoad) AS OrderNumber,
  b.LineNumber,
  o.Supplier,
  s.SupplierName,
  o.CCSortOrder,
  CASE WHEN o.OrderNumber IS NULL THEN 0 ELSE 1 END AS IsLogged
FROM [{jobDbName}].[dbo].[Bill] b
LEFT JOIN [{jobDbName}].[dbo].[Orders] o
  ON CONCAT(b.JobNo, '/', b.CostCentre, '.', b.BLoad) = o.OrderNumber
LEFT JOIN OrderDetailsRanked odr ON b.ItemCode = odr.Code AND odr.RowNum = 1
LEFT JOIN [{sysDbName}].[dbo].[PriceList] pl ON b.ItemCode = pl.PriceCode
LEFT JOIN [{sysDbName}].[dbo].[PerCodes] pc ON pl.PerCode = pc.Code
LEFT JOIN [{sysDbName}].[dbo].[CostCentres] cc ON b.CostCentre = cc.Code AND cc.Tier = 1
LEFT JOIN [{sysDbName}].[dbo].[Supplier] s ON o.Supplier = s.Supplier_Code
WHERE b.JobNo = @JobNo
  AND b.Quantity > 0
ORDER BY o.CCSortOrder, cc.SortOrder, b.CostCentre, b.LineNumber
```

### Get Job with Client Details
```sql
DECLARE @sysDbName NVARCHAR(50) = 'CROWNESYS';
DECLARE @jobDbName NVARCHAR(50) = 'CROWNEJOB';

SELECT
  j.Job_No AS JobNo,
  c.Name AS Client,
  c.Address AS SiteStreet,
  c.City AS SiteSuburb,
  c.State AS SiteState,
  c.Postcode AS SitePostcode,
  j.Status,
  j.StartDate,
  j.UDF1,
  j.UDF2,
  j.UDF3
FROM [{jobDbName}].[dbo].[Jobs] j
LEFT JOIN [{sysDbName}].[dbo].[Contacts] c ON j.Job_No = c.Code
WHERE j.Job_No = @JobNo
```

---

## Data Relationships

### Core Relationships

```
System Database:
  PriceList (1) ──┬─→ (∞) Recipe [Main_Item]
                  ├─→ (∞) Prices [PriceCode]
                  ├─→ (1) CostCentres [CostCentre → Code]
                  └─→ (1) PerCodes [PerCode → Code]

  CostCentres (1) ──→ (∞) CCSuppliers [CostCentre → Code]

  Supplier (1) ──→ (∞) CCSuppliers [Supplier → Supplier_Code]
               └─→ (∞) SuppliersPrices [Supplier → Supplier_Code]

  SupplierGroup (1) ──→ (∞) Supplier [GroupNumber → SuppGroup]

  ContactGroup (1) ──→ (∞) Contacts [Code → Group_]

Job Database:
  Jobs (1) ──┬─→ (∞) Bill [Job_No → JobNo]
             └─→ (1) Contacts [Job_No → Code] (System DB)

  Bill (∞) ──→ (1) Orders [CONCAT(JobNo, '/', CostCentre, '.', BLoad) → OrderNumber]
           └─→ (1) PriceList [ItemCode → PriceCode] (System DB)

  Orders (∞) ──→ (1) Supplier [Supplier → Supplier_Code] (System DB)
```

### Cross-Database Relationships

**Jobs to Contacts (Client Info):**
```
[JobDB].Jobs.Job_No = [SysDB].Contacts.Code
```

**Bill to PriceList (Item Details):**
```
[JobDB].Bill.ItemCode = [SysDB].PriceList.PriceCode
```

**Bill to CostCentres (Cost Centre Info):**
```
[JobDB].Bill.CostCentre = [SysDB].CostCentres.Code
WHERE CostCentres.Tier = 1
```

**Orders to Supplier (Supplier Info):**
```
[JobDB].Orders.Supplier = [SysDB].Supplier.Supplier_Code
```

---

## Important Notes

### Query Best Practices

1. **Always Use LEFT JOIN from PriceList:**
   ```sql
   -- CORRECT
   FROM PriceList PL
   LEFT JOIN CostCentres CC ON PL.CostCentre = CC.Code AND CC.Tier = 1

   -- INCORRECT (filters out items without Tier 1 cost centres)
   FROM PriceList PL
   INNER JOIN CostCentres CC ON PL.CostCentre = CC.Code
   WHERE CC.Tier = 1
   ```

2. **Use Fully Qualified Table Names for Cross-Database Queries:**
   ```sql
   FROM [CROWNEJOB].[dbo].[Bill] b
   LEFT JOIN [CROWNESYS].[dbo].[PriceList] pl ON b.ItemCode = pl.PriceCode
   ```

3. **Handle NULL SortOrder Values:**
   ```sql
   ORDER BY ISNULL(CC.SortOrder, 999999), PL.PriceCode
   ```

### Business Rules

1. **Order Number Format Must Be Enforced:**
   - Pattern: `{JobNo}/{CostCentre}.{BLoad}`
   - Example: `001/CONC.1`
   - Never allow manual deviation from this format

2. **Supplier Selection Constraint:**
   - Only suppliers in `CCSuppliers` table can be selected for a given cost centre
   - This is a hard business rule enforced by Databuild

3. **Logged Orders are Immutable:**
   - Once an order exists in the `Orders` table, it cannot be edited
   - Only unlogged orders (in `Bill` but not in `Orders`) can be modified

4. **Percentage Unit Calculation:**
   - When `Unit = '%'`, line total = `UnitPrice × (Quantity ÷ 100)`
   - Example: 10% of $858.00 = $85.80
   - All other units: line total = `Quantity × UnitPrice`

5. **Hidden Workup Notes:**
   - If `Bill.XDescription` starts with `[Hide]`, the note is for internal use only
   - Do not display on printed purchase orders or external documents

### Database Integrity

1. **No Built-in Foreign Keys:**
   - Databuild does not use SQL Server foreign key constraints
   - Applications must maintain referential integrity programmatically

2. **Null Handling:**
   - Many fields can be NULL
   - Always use `ISNULL()` or `COALESCE()` when appropriate
   - Default values should be applied in application logic

3. **String Encoding:**
   - All text fields use `nvarchar` (Unicode)
   - Support for international characters

4. **Date Handling:**
   - Dates stored as `datetime`
   - Default SQL Server date format: `YYYY-MM-DD HH:MM:SS`
   - Client formatting should be applied in application layer

### Performance Considerations

1. **Index Usage:**
   - `PriceCode` is heavily indexed (PriceList, Prices, SuppliersPrices)
   - Always filter on indexed fields for best performance

2. **Avoid SELECT *:**
   - Explicitly list required columns
   - Many tables have large `ntext` fields (Template, Specification, Notes)

3. **Use Appropriate JOIN Types:**
   - LEFT JOIN for optional relationships
   - INNER JOIN only when relationship is required

4. **Limit Result Sets:**
   - Always include WHERE clauses for large tables
   - Filter `Archived = 0` on PriceList and Supplier
   - Filter `Status != 'Archived'` on Jobs

---

## Connection String Example

```javascript
const config = {
  server: 'localhost',
  database: 'CROWNESYS',  // System Database
  user: 'sa',
  password: 'your_password',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};
```

For Job Database queries, you'll need to reference it explicitly:
```sql
SELECT * FROM [CROWNEJOB].[dbo].[Bill]
```

Or switch databases programmatically:
```javascript
await pool.request().query('USE CROWNEJOB');
```

---

## Version Information

**Document Version:** 1.0
**Last Updated:** November 2025
**Compatible with:** Databuild SQL Server databases (all versions)

---

## Support and Questions

This documentation is based on analysis of the Databuild database structure as implemented in DBx Connector Vue. For questions specific to your implementation, please refer to Databuild's official documentation or contact Databuild support.

---

## License

This documentation is provided as-is for development purposes. Databuild is a registered trademark of Databuild Estimating Pty Ltd. All database schemas and structures remain the intellectual property of Databuild.
