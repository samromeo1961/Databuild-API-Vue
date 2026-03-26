# Restart Required for Fixes to Work

## Backend Changes Made (Require App Restart)

### 1. Added "add" Helper for Templates
**File:** `src/services/template-renderer.js`
**Change:** Added math helpers (add, subtract, multiply) for Handlebars templates

### 2. Added SiteStreet to Job Data
**File:** `src/ipc-handlers/purchase-orders.js`
**Change:** Updated `getJobsWithOrderCounts` query to include SiteStreet, SiteSuburb, SiteState

## Frontend Changes Made (Already Active via HMR)

### 3. Updated Job Title Display
**File:** `frontend/src/components/PurchaseOrders/PurchaseOrdersTab.vue`
**Change:** Badge now shows `Job {{ selectedJob.JobNo }}: {{ selectedJob.SiteStreet || selectedJob.JobName }}`

### 4. Added Dark Theme Support
**File:** `frontend/src/components/PurchaseOrders/PurchaseOrdersTab.vue`
**Changes:**
- Job Summary Bar: `:class="isDarkMode ? 'bg-dark' : 'bg-light'"`
- Action Bar: `:class="isDarkMode ? 'bg-dark' : 'bg-light'"`
- AG Grid: Already had `:class="{ 'ag-theme-quartz-dark': isDarkMode }"`

## How to Restart the App

### Option 1: Restart via npm (Recommended)
1. **Stop the current Electron app** (if running)
2. Run: `npm run dev`

### Option 2: If App Won't Start
1. **Kill all Electron processes:** `taskkill /F /IM electron.exe /T`
2. **Wait 2 seconds**
3. **Restart:** `npm run dev`

## Testing After Restart

### Test 1: "add" Helper Fix ✅
1. Navigate to **Purchase Orders** tab
2. Select any job
3. Click **eye icon** on an order to preview
4. Select **"Modern Purchase Order (Green)"** template
5. Click **"Refresh Preview"**
6. **Expected:** Item numbers show as 1, 2, 3... (not 0, 1, 2...)
7. **Expected:** NO error "Missing helper: add"

### Test 2: Job Title Display ✅
1. Navigate to **Purchase Orders** tab
2. Click **"Select Job"**
3. Choose a job (e.g., Job 1480)
4. **Expected:** Header badge shows "Job 1480: BROOKER STREET" (site address first line)
5. **Not:** "Job 1480: BROOKER STREET LOT 42." (old behavior)

### Test 3: Dark Theme Support ✅
1. Navigate to **Purchase Orders** tab
2. Select a job to load the grid
3. **Toggle dark theme** using the theme switcher in top right
4. **Expected when LIGHT mode:**
   - AG Grid: Light background
   - Job Summary bar: Light gray background (`bg-light`)
   - Action bar (bottom): Light gray background (`bg-light`)
5. **Expected when DARK mode:**
   - AG Grid: Dark background with light text
   - Job Summary bar: Dark background (`bg-dark`)
   - Action bar (bottom): Dark background (`bg-dark`)
   - All text remains readable

## If Issues Persist

### "add" Helper Still Not Working:
- **Cause:** Template cache might be stale
- **Fix:** Clear browser cache or use Ctrl+Shift+R to hard refresh

### Job Title Still Shows Old Format:
- **Cause:** Job data might be cached
- **Fix:** Click "Select Job" and re-select the same job to reload data

### Dark Theme Not Working:
- **Check:** Verify that App.vue is providing `isDarkMode` via inject
- **Check:** Console for any errors related to theme switching
- **Fix:** Check if `data-theme` attribute is on root element

## Verification Checklist

- [ ] Electron app restarted successfully
- [ ] No "Missing helper: add" error in Modern PO template
- [ ] Item numbers start from 1 (not 0)
- [ ] Job title shows site street address
- [ ] Dark theme applies to Job Summary bar
- [ ] Dark theme applies to Action bar
- [ ] Dark theme applies to AG Grid
- [ ] All text readable in both light and dark modes

---

**Status:** All code changes complete - App restart required
**Date:** 2025-11-16
