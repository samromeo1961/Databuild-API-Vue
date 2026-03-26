# CKEditor Formatting Issue - FIXED

## Issue Reported

**User Report:** "When You click on the editor the underlying HTML is changed and forced into 1 line and all the Original Formating is Lost"

**Date:** 2025-11-15
**Severity:** CRITICAL - Destroys carefully formatted HTML code

---

## Root Cause

**CKEditor normalizes HTML when loading it.** This is a fundamental limitation of all WYSIWYG editors:

### Why This Happens:
1. WYSIWYG editors parse HTML into an internal document model
2. They regenerate HTML from this model when saving
3. This process **removes all formatting** (indentation, line breaks, whitespace)
4. The HTML becomes unreadable in code view

### Example of the Problem:

**Original HTML (formatted):**
```html
<div class="order-info">
  <div class="info-section">
    <label>Order Number:</label>
    <span>{{order.orderNumber}}</span>
  </div>
  <div class="info-section">
    <label>Date:</label>
    <span>{{order.date}}</span>
  </div>
</div>
```

**After CKEditor loads it (reformatted):**
```html
<div class="order-info"><div class="info-section"><label>Order Number:</label><span>{{order.orderNumber}}</span></div><div class="info-section"><label>Date:</label><span>{{order.date}}</span></div></div>
```

---

## Solution Implemented

### 1. Changed Default Mode to Advanced

**Before:**
- Editor opened in Visual mode by default
- HTML immediately reformatted on load
- Users lost formatting without warning

**After:**
- Editor now opens in **Advanced (HTML) mode by default**
- Formatting is preserved unless user switches to Visual mode
- Line: 525 in TemplateHtmlEditorEnhanced.vue

```javascript
const editorMode = ref('advanced'); // Default to advanced mode to preserve formatting
```

### 2. Added Warning Dialog Before Visual Mode

**Implementation:**
- Created `switchToVisualMode()` function (lines 783-803)
- Shows confirmation dialog explaining formatting loss
- User must explicitly confirm before entering Visual mode
- Can cancel to stay in Advanced mode

**Warning Message:**
```
⚠️ WARNING: Visual Editor Mode

Switching to Visual mode will REFORMAT your HTML code:
• All indentation will be removed
• Line breaks will be changed
• Code will be harder to read in Advanced mode

This is a limitation of WYSIWYG editors.

RECOMMENDATION: Only use Visual mode for quick edits.
Use Advanced mode for precise formatting control.

Do you want to continue to Visual mode?
```

**Code:**
```javascript
const switchToVisualMode = () => {
  const userConfirmed = confirm(
    '⚠️ WARNING: Visual Editor Mode\n\n' +
    'Switching to Visual mode will REFORMAT your HTML code:\n' +
    '• All indentation will be removed\n' +
    '• Line breaks will be changed\n' +
    '• Code will be harder to read in Advanced mode\n\n' +
    'This is a limitation of WYSIWYG editors.\n\n' +
    'RECOMMENDATION: Only use Visual mode for quick edits.\n' +
    'Use Advanced mode for precise formatting control.\n\n' +
    'Do you want to continue to Visual mode?'
  );

  if (userConfirmed) {
    editorMode.value = 'visual';
    console.log('⚠️ User switched to Visual mode - HTML formatting will be lost');
  } else {
    console.log('✓ User cancelled Visual mode switch - staying in Advanced mode');
  }
};
```

### 3. Updated Button Tooltips

**Visual Button:**
- Old tooltip: "Visual Editor (WYSIWYG)"
- New tooltip: "Visual Editor (WYSIWYG) - WARNING: Will reformat HTML"

**Advanced Button:**
- Old tooltip: "Advanced HTML Editor"
- New tooltip: "Advanced HTML Editor - Preserves formatting"

**Code (lines 25, 34):**
```vue
<button
  @click="switchToVisualMode"
  title="Visual Editor (WYSIWYG) - WARNING: Will reformat HTML">
  <i class="bi bi-eye"></i>
  Visual
</button>
<button
  @click="editorMode = 'advanced'"
  title="Advanced HTML Editor - Preserves formatting">
  <i class="bi bi-code-slash"></i>
  Advanced
</button>
```

---

## Files Modified

**frontend/src/components/PurchaseOrders/TemplateHtmlEditorEnhanced.vue:**
- Line 525: Changed default mode from 'visual' to 'advanced'
- Line 526: Added `showVisualModeWarning` state variable
- Lines 783-803: Added `switchToVisualMode()` warning function
- Line 24: Updated Visual button to call `switchToVisualMode()`
- Line 25: Updated Visual button tooltip with warning
- Line 34: Updated Advanced button tooltip
- Line 1434: Added `switchToVisualMode` to return statement
- Line 1436: Added `showVisualModeWarning` to return statement

**CKEDITOR_INTEGRATION.md:**
- Added "⚠️ CRITICAL LIMITATION: HTML Formatting Loss" section at top
- Documented the problem with examples
- Documented the solution
- Added recommendations for users

---

## User Impact

### Before Fix:
1. ❌ User opens template editor
2. ❌ Visual mode loads by default
3. ❌ **HTML is immediately reformatted** (formatting lost)
4. ❌ User switches to Advanced mode to see HTML
5. ❌ Sees messy, unformatted code
6. ❌ Formatting is permanently lost

### After Fix:
1. ✅ User opens template editor
2. ✅ **Advanced mode loads by default**
3. ✅ **HTML formatting is preserved**
4. ✅ User can edit HTML with proper indentation
5. ✅ If user clicks "Visual" button:
   - ✅ Warning dialog appears
   - ✅ User is informed of consequences
   - ✅ User can cancel (stay in Advanced mode)
   - ✅ Or confirm (accept formatting loss)

---

## Usage Recommendations

### For Regular Template Editing:
✅ **Always use Advanced mode** (this is now the default)
- Preserves formatting
- Full control over HTML structure
- See exact code that will be saved
- Use line numbers, search, and code tools

### For Quick Content Edits:
⚠️ **Use Visual mode sparingly** (only when necessary)
- Only for simple text/content changes
- Not for structural or formatting changes
- Accept that formatting will be lost
- Use "Format HTML" button afterward to restore some indentation

### Workflow:
1. Open template in Advanced mode (default)
2. Make structural edits in Advanced mode
3. If needed, switch to Visual mode for quick content edits (accept warning)
4. Switch back to Advanced mode
5. Click "Format HTML" to restore indentation
6. Save template

---

## Alternative Solutions Considered

### Option 1: Use Different WYSIWYG Editor
**Editors evaluated:**
- **TinyMCE** - Has CSP issues with Electron, blocks external resources
- **Quill.js** - Simpler, but less features (no table editing)
- **TipTap** - Modern, but still normalizes HTML
- **ProseMirror** - Low-level, complex to configure

**Verdict:** All WYSIWYG editors normalize HTML. This is not unique to CKEditor.

### Option 2: Custom CKEditor Build with HTML Preservation
**Approach:**
- Build custom CKEditor with GeneralHtmlSupport plugin
- Configure to preserve more HTML structure
- Add source editing plugin

**Issues:**
- Requires creating custom build (complex)
- Online builder or local webpack build needed
- Still won't preserve all formatting (indentation, line breaks)
- Adds significant development time

**Verdict:** Not worth the complexity for marginal improvement.

### Option 3: Store Original HTML and Diff Changes
**Approach:**
- Keep backup of original formatted HTML
- When exiting Visual mode, compare changes
- Apply only content changes, preserve structure

**Issues:**
- Very complex to implement
- Error-prone (what if structure changed?)
- Difficult to merge changes reliably
- Could introduce bugs

**Verdict:** Too risky and complex.

### Option 4: Abandon WYSIWYG, Use Advanced Mode Only
**Approach:**
- Remove CKEditor integration entirely
- Keep only Advanced (HTML) mode
- Focus on improving HTML editing experience

**Issues:**
- Loses WYSIWYG capability requested by user
- Non-technical users still need visual editing
- Table editing is much easier in WYSIWYG

**Verdict:** Defeats the purpose of the feature request.

---

## Final Solution: Warning + Default to Advanced

**Best balance of:**
- ✅ Preserves formatting by default (Advanced mode)
- ✅ Warns users before destructive operation (Visual mode)
- ✅ Still provides WYSIWYG option when needed
- ✅ Simple implementation, no complex workarounds
- ✅ Clear user expectations

---

## Testing

### Test 1: Default Mode
1. ✅ Open template editor
2. ✅ Verify Advanced mode is active (button highlighted)
3. ✅ Verify HTML has proper indentation and line breaks
4. ✅ Make edits in Advanced mode
5. ✅ Save template
6. ✅ Reopen template
7. ✅ Verify formatting is preserved

### Test 2: Visual Mode Warning
1. ✅ Open template in Advanced mode
2. ✅ Click "Visual" button
3. ✅ Verify warning dialog appears
4. ✅ Read warning message
5. ✅ Click "Cancel"
6. ✅ Verify stays in Advanced mode
7. ✅ Click "Visual" again
8. ✅ Click "OK" to accept warning
9. ✅ Verify switches to Visual mode

### Test 3: Formatting Loss
1. ✅ Open template with formatted HTML
2. ✅ Note the formatting (indentation, line breaks)
3. ✅ Switch to Visual mode (accept warning)
4. ✅ Switch back to Advanced mode
5. ✅ Observe formatting is lost (HTML on one/few lines)
6. ✅ Click "Format HTML" button
7. ✅ Verify some indentation is restored

### Test 4: Visual Mode Editing
1. ✅ Switch to Visual mode (accept warning)
2. ✅ Make content edits (change text, add table, etc.)
3. ✅ Verify edits work correctly
4. ✅ Switch to Advanced mode
5. ✅ Verify content changes are present
6. ✅ Save template
7. ✅ Test template renders correctly

---

## Known Limitations

### What the Fix DOES:
✅ Defaults to Advanced mode (preserves formatting)
✅ Warns users before entering Visual mode
✅ Prevents accidental formatting loss
✅ Provides clear tooltips on buttons
✅ Allows informed choice to use Visual mode

### What the Fix DOES NOT:
❌ Prevent formatting loss in Visual mode (impossible)
❌ Restore formatting after Visual mode (not feasible)
❌ Make CKEditor preserve HTML formatting (editor limitation)
❌ Eliminate the need for "Format HTML" button

### Permanent Limitations:
- WYSIWYG editors **always** normalize HTML (by design)
- Indentation and line breaks **cannot** be preserved in Visual mode
- This is true for **all** WYSIWYG editors (not just CKEditor)
- Users must choose: **Visual editing** OR **Formatted code** (can't have both)

---

## Future Enhancements (Possible)

### 1. Custom HTML Formatter
**Goal:** Better indentation restoration after Visual mode
**Approach:**
- Write custom HTML formatter function
- Intelligently indent based on nesting level
- Preserve Handlebars variable placement
- Replace current basic "Format HTML" button

**Benefit:** Partially mitigate formatting loss

### 2. "Restore Formatting" Button
**Goal:** Quick way to reformat after Visual mode
**Approach:**
- Add dedicated button next to "Format HTML"
- Applies smart indentation rules
- Adds line breaks between major sections
- Optional: Save formatting preferences

**Benefit:** One-click formatting restoration

### 3. Visual Mode Detection
**Goal:** Track which sections were edited in Visual mode
**Approach:**
- Mark templates that have been in Visual mode
- Show badge or indicator
- Warn on save: "This template has unformatted sections"
- Offer to reformat before saving

**Benefit:** Awareness of formatting state

### 4. Handlebars Variable Protection (Planned)
**Goal:** Protect template variables in Visual mode
**Approach:**
- Convert `{{variable}}` to protected widgets/badges
- Prevents accidental deletion or corruption
- Visual indicator of dynamic fields
- Works in Visual mode without breaking syntax

**Benefit:** Safer Visual mode editing for templates

---

## Conclusion

**Status:** ✅ **FIXED**

The HTML formatting loss issue has been resolved by:
1. Changing default mode to Advanced (preserves formatting)
2. Adding warning before Visual mode (informed consent)
3. Updating tooltips (clear expectations)

**Users can now:**
- ✅ Edit templates without losing formatting (Advanced mode default)
- ✅ Use Visual mode when needed (with full awareness of consequences)
- ✅ Make informed choice between visual editing and formatted code

**Recommendation:**
- Use Advanced mode for all serious template editing
- Use Visual mode only for quick content changes
- Run "Format HTML" after using Visual mode
- Consider this a solved issue with acceptable tradeoffs

---

**Fixed By:** Claude Code (claude.ai/code)
**Date:** 2025-11-15
**Build:** frontend v1.3.10+
