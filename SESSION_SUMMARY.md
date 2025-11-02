# Session Summary - Recipes Tab Enhancements

**Date**: 2025-11-02
**Session Type**: Continuation from previous context

---

## ✅ Completed Tasks

### 1. Cost Centres Dropdown Filter for Recipes Tab
**Problem**: Dropdown showed all cost centres, not just those with recipes. User reported knowing at least cost centres 2000 and 2500 should appear.

**Solution**:
- **Backend** (`src/ipc-handlers/recipes.js`):
  - Created `getRecipeCostCentres()` function (lines 420-456)
  - SQL query filters: `WHERE PL.Recipe = 1 AND PL.Archived = 0`
  - Returns only cost centres that have active recipes

- **IPC Registration**:
  - Registered in `main.js` (line 233): `ipcMain.handle('recipes:get-cost-centres', ...)`
  - Exposed in `preload.js` (line 28): `getCostCentres: (params) => ...`
  - Added to `useElectronAPI.js` (line 34): `getCostCentres: (params) => ...`

- **Frontend** (`RecipesTab_updated.vue`):
  - Added `loadCostCentres()` function (lines 687-697)
  - Called in `onMounted()` hook (line 860)
  - Added SearchableMultiSelect component for cost centres filter (lines 43-53)
  - Added `onFilterChange()` handler that resets pagination (lines 714-717)

**Files Modified**:
- `src/ipc-handlers/recipes.js`
- `main.js`
- `preload.js`
- `frontend/src/composables/useElectronAPI.js`
- `frontend/src/components/Recipes/RecipesTab_updated.vue`

---

### 2. Archived Items Filtering

**Catalogue Tab**:
- Updated `src/ipc-handlers/catalogue.js` (line 36)
- Added `PL.Archived = 0` to WHERE clause
- Now filters out all archived items

**Recipes Tab - Visual Styling**:
- **Backend** (`src/ipc-handlers/recipes.js`):
  - Updated sub-items queries to include `PL.Archived AS IsArchived` (lines 272, 370)

- **Frontend** (`RecipesTab_updated.vue`):
  - Enhanced `displayData` computed (lines 412-419):
    - Detects if recipe has any archived ingredients
    - Sets `hasArchivedIngredients` flag on parent rows
  - Updated `getRowStyle()` function (lines 448-480):
    - **Archived ingredients**: Amber background (`#fef3c7` light / `rgba(245,158,11,0.15)` dark), italic text, amber color
    - **Recipes with archived ingredients**: Bold, amber color text
    - Works in both light and dark modes

---

### 3. Server-Side Pagination Fix

**Problem**: Page navigation showed "1 to 50 of 50" and "Page 1 of 1" even with 2106 recipes. Grid was treating data as client-side pagination.

**Solution** (Applied to both RecipesTab and CatalogueTab):

**RecipesTab_updated.vue**:
- Added `currentPage = ref(0)` state variable (line 188)
- Added `@pagination-changed="onPaginationChanged"` event (line 126)
- Updated `loadData()` function (lines 622-686):
  - Accepts `resetPage` parameter
  - Uses `currentPage.value * pageSize.value` for offset
  - Resets to page 0 when `resetPage=true`
- Created `onPaginationChanged()` handler (lines 735-757):
  - Detects page changes and loads new data
  - Prevents duplicate loads
- Updated all filter handlers to call `loadData(true)`:
  - `onSearchChange()` (line 703)
  - `clearSearch()` (line 710)
  - `onFilterChange()` (line 716)

**CatalogueTab.vue**:
- Same pattern applied (pagination handler around lines 648-670)

**Result**: Pagination now shows "1 to 50 of 2106" and allows navigation through all pages.

---

### 4. Page Size Selector Fix

**Problem**: Selecting different page sizes (25, 50, 100, 200) didn't change the number of items displayed.

**Solution** (Applied to both tabs):

**Enhanced `onPaginationChanged()` handler**:
```javascript
const newPageSize = gridApi.value.paginationGetPageSize();

// Check if page size changed
if (newPageSize !== pageSize.value) {
  console.log('Page size changed from', pageSize.value, 'to', newPageSize);
  pageSize.value = newPageSize;
  currentPage.value = 0; // Reset to first page
  loadData();
  return;
}
```

**Files Modified**:
- `frontend/src/components/Recipes/RecipesTab_updated.vue` (lines 738-745)
- `frontend/src/components/Catalogue/CatalogueTab.vue` (lines 655-662)

**Result**: Page size selector now properly reloads grid with new page size.

---

### 5. Switched to RecipesTab_updated.vue

**Router Update**:
- Modified `frontend/src/router/index.js` (line 5)
- Changed from `RecipesTab.vue` to `RecipesTab_updated.vue`

**Features Gained**:
- ✅ Column show/hide via sidebar
- ✅ Column reordering via drag-and-drop
- ✅ Column resizing via column edges
- ✅ Column renaming (custom aliases)
- ✅ Column state persistence (electron-store)

**Migration**:
- Used Task agent to port all fixes from `RecipesTab.vue` to `RecipesTab_updated.vue`
- Preserved all column management functionality
- Integrated pagination, filtering, and styling fixes

---

### 6. CSV Export Enhancement

**Problem**: Export only exported current page (50 items).

**Solution** (`RecipesTab_updated.vue` lines 833-931):

**New `handleExportToExcel()` function**:
- Fetches ALL filtered recipes using `limit: 999999`
- Applies same filters as current view:
  - Search term filter
  - Cost centres filter
- Maps backend data to frontend format
- Exports only visible columns (respects column visibility)
- Proper CSV formatting:
  - Escapes quotes and commas
  - Formats prices as `$XX.XX`
  - Formats dates using `toLocaleDateString()`
- Timestamped filename: `recipes-export-YYYY-MM-DD.csv`
- Shows success message: "Exported {count} recipes to CSV"

**Result**: CSV export now exports all filtered recipes across all pages.

---

## 📁 Key Files Modified

### Backend:
1. **src/ipc-handlers/recipes.js**
   - New function: `getRecipeCostCentres()` (lines 420-456)
   - Updated: `getRecipeSubItems()` - added IsArchived field (line 272)
   - Updated: `getRecipe()` - added IsArchived field (line 370)
   - Added: Cost centres array filter support (lines 57-65, 178-183)

2. **src/ipc-handlers/catalogue.js**
   - Updated: Added archived filter (line 36)

3. **main.js**
   - Registered: `recipes:get-cost-centres` handler (line 233)

4. **preload.js**
   - Exposed: `recipes.getCostCentres()` (line 28)

### Frontend:
5. **frontend/src/composables/useElectronAPI.js**
   - Added: `recipes.getCostCentres()` (line 34)

6. **frontend/src/components/Recipes/RecipesTab_updated.vue**
   - Added: Cost centres loading and filtering (lines 687-697, 860)
   - Added: Server-side pagination (lines 622-686, 735-757)
   - Added: Page size detection (lines 738-745)
   - Added: Archived ingredients styling (lines 412-419, 448-480)
   - Updated: CSV export to export all filtered data (lines 833-931)
   - Added imports: `SearchableMultiSelect`, `nextTick` (lines 152, 156)

7. **frontend/src/components/Catalogue/CatalogueTab.vue**
   - Added: Server-side pagination (similar to RecipesTab)
   - Added: Page size detection (lines 655-662)

8. **frontend/src/router/index.js**
   - Updated: Import to use `RecipesTab_updated.vue` (line 5)

---

## 🔧 Technical Details

### Database Schema Used:
- **PriceList**: Main items table
  - `PriceCode`, `Description`, `CostCentre`, `Recipe`, `Archived`
- **Recipe**: Sub-items/ingredients
  - `Main_Item`, `Sub_Item`, `Quantity`, `Formula`, `Cost_Centre`
- **CostCentres**: Cost centre hierarchy
  - `Code`, `Name`, `Tier`, `SubGroup`, `SortOrder`
- **Prices**: Price history
  - `PriceCode`, `Price`, `Date`, `PriceLevel`
- **PerCodes**: Units of measure
  - `Code`, `Printout`

### SQL Query Pattern:
Always use LEFT JOIN from PriceList with Tier filter in JOIN condition:
```sql
FROM PriceList PL
LEFT JOIN CostCentres CC ON PL.CostCentre = CC.Code AND CC.Tier = 1
```
Not in WHERE clause to avoid filtering out items without Tier 1 cost centres.

### Pagination Implementation:
- **Server-side**: Backend handles `limit` and `offset` parameters
- **Frontend tracking**: `currentPage` ref tracks current page (0-indexed)
- **Offset calculation**: `currentPage * pageSize`
- **Reset on filter**: All filter/search changes call `loadData(true)` to reset to page 0

### Event Handling:
- `@pagination-changed`: Detects both page number and page size changes
- `@column-resized`, `@column-moved`, `@column-visible`: Save column state
- `@grid-ready`: Initialize grid API, load cost centres, restore column state
- `@selection-changed`: Track selected rows

---

## 🐛 Debugging Notes

### Issue Encountered:
- **Error**: "No handler registered for 'recipes:get-cost-centres'"
- **Cause**: Electron app needed restart after adding new IPC handler
- **Fix**: Killed old process (bash 6da55c) and started new one (bash 39495c)

### Console Logging Added:
- `loadData()`: Logs page, offset, limit, and loaded count
- `loadCostCentres()`: Logs count of cost centres loaded
- `onPaginationChanged()`: Logs page and page size changes
- `handleExportToExcel()`: Logs export parameters and count

---

## 🎨 Styling Reference

### Archived Ingredients Colors:
**Dark Mode**:
- Background: `rgba(245, 158, 11, 0.15)`
- Text: `#fbbf24` (amber-400)

**Light Mode**:
- Background: `#fef3c7` (amber-100)
- Text: `#d97706` (amber-600)

### Recipe with Archived Ingredients:
- Text color: Same amber as above
- Font weight: `bold`

### Archived Ingredients (child rows):
- Font style: `italic`
- Plus amber background and text

---

## 📊 Current State

### Router Configuration:
- **Catalogue Tab**: `CatalogueTab.vue` (base version)
- **Recipes Tab**: `RecipesTab_updated.vue` (enhanced version with column management)

### Features Working:
✅ Server-side pagination (both tabs)
✅ Page size selector (25, 50, 100, 200)
✅ Cost centres dropdown (recipes only)
✅ Archived items filtering (catalogue)
✅ Archived ingredients styling (recipes)
✅ CSV export all filtered data
✅ Column management (recipes only)
✅ Column state persistence (recipes only)
✅ Search filtering
✅ Cost centres multi-select filtering

### Electron App Status:
- Multiple dev processes running (check background bash processes)
- Hot reload enabled via Vite dev server
- DevTools auto-open in development mode

---

## 🚀 Next Steps (If Needed)

### Potential Enhancements:
1. Apply column management to CatalogueTab (use `CatalogueTab_updated.vue` if exists)
2. Add same CSV export enhancement to CatalogueTab
3. Add column filters persistence across all tabs
4. Optimize large exports (2000+ items) with streaming/chunking
5. Add export format options (Excel, PDF)

### Known Limitations:
- CSV export limit set to 999999 (should handle most cases)
- No progress indicator during large exports
- Date formatting uses browser locale (not customizable)

---

## 📝 Files for Reference

### Original Files (Not Modified):
- `RecipesTab.vue` - Base version, kept for reference
- `CatalogueTab_updated.vue` - May exist but not confirmed

### Configuration Files:
- `package.json` - Dependencies and Electron builder config
- `frontend/vite.config.js` - Vite dev server config
- `CLAUDE.md` - Project documentation and instructions

---

## 🔄 Session Restart Checklist

When resuming:
1. ✅ All changes saved to files
2. ✅ Router updated to use RecipesTab_updated.vue
3. ✅ All IPC handlers registered
4. ✅ No pending git commits needed (changes applied)
5. ⚠️ Multiple background processes running - may need cleanup

**Important**: Check which bash process is the active dev server before making changes.

---

**End of Session Summary**
