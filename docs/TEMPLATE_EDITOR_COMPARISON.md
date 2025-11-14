# Purchase Order Template Editor - Solution Comparison

## Overview

This document compares different approaches for allowing users to create and edit Purchase Order layouts in the DBx Connector Vue application.

## User Requirements

1. **Edit Existing Templates** - Modify default PO/RFQ templates
2. **Create Custom Templates** - Build new templates from scratch
3. **Visual Feedback** - See changes in real-time
4. **No Code Required** - Non-technical users should be able to make basic changes
5. **Advanced Options** - Technical users can access HTML/CSS for complex customization
6. **Template Variables** - Easy access to available data fields
7. **Asset Management** - Upload logos, images, etc.
8. **Export/Import** - Share templates between installations

## Solution Options

### Option 1: jsreport (Open Source Reporting Server)

**What is jsreport?**
- Open-source reporting platform (https://jsreport.net/)
- Includes jsreport Studio (visual template designer)
- Supports multiple template engines (Handlebars, EJS, etc.)
- Can generate PDF, HTML, Excel, etc.
- Can embed in Node.js/Electron apps

**Architecture:**
```
Electron App → jsreport Server (embedded) → jsreport Studio (browser-based editor)
                    ↓
              Template Storage → PDF Generation
```

**Pros:**
✅ Professional visual template designer (Studio)
✅ Built-in preview functionality
✅ Asset management for logos/images
✅ Supports Handlebars (our chosen template engine)
✅ Can run embedded in Electron (no external server needed)
✅ Mature, well-documented, actively maintained
✅ Built-in PDF generation
✅ Can handle complex reports (charts, tables, etc.)
✅ Template versioning and management
✅ Recipe system (template + data + output format)

**Cons:**
❌ Large dependency footprint (~150MB+ with dependencies)
❌ Runs as separate server process (even when embedded)
❌ Complexity - full reporting server for simple templates
❌ Learning curve for users (Studio interface)
❌ Resource overhead (memory, startup time)
❌ Requires port for Studio UI (security consideration)
❌ May be overkill for this specific use case

**Implementation Effort:** High (2-3 weeks)

**Best For:**
- Complex reporting requirements
- Multiple output formats needed
- Advanced features like charts, data aggregation
- Large user base with diverse template needs

**Code Example:**
```javascript
// Embed jsreport in Electron
const jsreport = require('jsreport-core')();

jsreport.init().then(() => {
  return jsreport.render({
    template: {
      content: '<h1>{{OrderNumber}}</h1>',
      engine: 'handlebars',
      recipe: 'chrome-pdf'
    },
    data: orderData
  });
}).then((response) => {
  // response.content contains PDF buffer
});
```

---

### Option 2: GrapesJS (Visual Page Builder)

**What is GrapesJS?**
- Open-source drag-and-drop web page builder
- Component-based (drag headers, tables, images, etc.)
- WYSIWYG editing
- No coding required for basic layouts
- Exports clean HTML/CSS

**Architecture:**
```
Electron App → GrapesJS Editor (embedded in app) → HTML Template → Our PDF Generator
```

**Pros:**
✅ True WYSIWYG - what you see is what you get
✅ Drag-and-drop interface (user-friendly)
✅ Component library (headers, footers, tables, images)
✅ No coding required for basic use
✅ Can add custom components (e.g., "Line Items Table")
✅ Lighter weight than jsreport
✅ Integrates well with Electron
✅ Can restrict/guide users with custom components
✅ Storage manager for images/assets

**Cons:**
❌ Not specifically designed for templates/documents
❌ Need to build custom components for PO-specific elements
❌ No built-in variable system (need to integrate Handlebars)
❌ Users might create invalid/broken layouts
❌ Requires teaching component system
❌ May generate complex HTML that's hard to maintain

**Implementation Effort:** Medium-High (2 weeks)

**Best For:**
- Non-technical users
- Simple to moderate layout customization
- Visual branding (colors, fonts, logos)
- Page-builder style interface preferred

**Code Example:**
```javascript
import grapesjs from 'grapesjs';

const editor = grapesjs.init({
  container: '#gjs',
  fromElement: true,
  height: '600px',
  storageManager: false,
  panels: { defaults: [] },

  // Custom components for PO
  components: [
    {
      type: 'order-header',
      label: 'Order Header',
      content: '<div>{{OrderNumber}} - {{OrderDate}}</div>'
    },
    {
      type: 'line-items-table',
      label: 'Line Items',
      content: '<table>{{#each items}}...{{/each}}</table>'
    }
  ]
});

// Export template
const html = editor.getHtml();
const css = editor.getCss();
```

---

### Option 3: Monaco Editor (VS Code's Editor) + Live Preview

**What is Monaco Editor?**
- The code editor that powers VS Code
- Syntax highlighting, IntelliSense, error detection
- Lightweight, fast, highly customizable
- Split-pane: Code editor + Live preview

**Architecture:**
```
Electron App → Monaco Editor (HTML/Handlebars) + Preview Pane → Our PDF Generator
                        ↓
                  Live Preview Updates
```

**Pros:**
✅ Familiar interface for developers (VS Code-like)
✅ Syntax highlighting for HTML, CSS, Handlebars
✅ IntelliSense can suggest template variables
✅ Lightweight (~5MB minified)
✅ Full control over HTML/CSS
✅ Live preview in adjacent pane
✅ Easy to integrate in Electron
✅ Can provide snippets for common elements
✅ Built-in error detection
✅ Version control friendly (plain text)

**Cons:**
❌ Code-based - requires HTML knowledge for complex changes
❌ Not WYSIWYG - users must understand HTML
❌ Learning curve for non-technical users
❌ Need to build preview pane ourselves
❌ No drag-and-drop

**Implementation Effort:** Low-Medium (1 week)

**Best For:**
- Technical users comfortable with HTML
- Maximum customization flexibility
- Developers who prefer code over visual editors
- Quick implementation needed

**Code Example:**
```javascript
import * as monaco from 'monaco-editor';

const editor = monaco.editor.create(document.getElementById('editor'), {
  value: templateHTML,
  language: 'handlebars',
  theme: 'vs-dark',
  minimap: { enabled: false }
});

// Live preview
editor.onDidChangeModelContent(() => {
  const html = editor.getValue();
  updatePreview(html);
});

// IntelliSense for template variables
monaco.languages.registerCompletionItemProvider('handlebars', {
  provideCompletionItems: () => {
    return {
      suggestions: [
        { label: '{{OrderNumber}}', kind: monaco.languages.CompletionItemKind.Variable },
        { label: '{{JobName}}', kind: monaco.languages.CompletionItemKind.Variable },
        // ... all template variables
      ]
    };
  }
});
```

---

### Option 4: Hybrid Approach (RECOMMENDED)

**Concept:** Combine multiple approaches to serve different user skill levels.

**Two-Tier System:**

#### Tier 1: Template Gallery (No Code)
- Provide 5-10 professional, pre-built templates
- Simple customization wizard:
  - Upload company logo
  - Choose color scheme
  - Set font preferences
  - Toggle sections on/off (notes, prices, etc.)
  - Basic text replacements (company name, footer text)
- Configuration stored in JSON, applied to base template

#### Tier 2: Advanced Editor (For Technical Users)
- Monaco Editor with HTML/Handlebars editing
- Live preview pane with sample data
- Template variable reference panel
- Code snippets library
- Export/import capability

**Architecture:**
```
┌─────────────────────────────────────────┐
│   Template Selection Screen             │
│                                         │
│  [Gallery]  [Import]  [Advanced Edit]  │
└─────────────────────────────────────────┘
           ↓                  ↓
    ┌──────────┐      ┌──────────────┐
    │ Gallery  │      │ Monaco Editor│
    │ + Wizard │      │ + Preview    │
    └──────────┘      └──────────────┘
           ↓                  ↓
        ┌──────────────────────────┐
        │  Template Storage        │
        │  (electron-store)        │
        └──────────────────────────┘
```

**Pros:**
✅ Serves both non-technical and technical users
✅ Professional templates ready out-of-box
✅ Simple customization for common needs
✅ Full power for advanced users
✅ Gradual learning curve (start simple, go advanced)
✅ Lower implementation complexity
✅ Better user experience for majority users
✅ Flexible and extensible

**Cons:**
❌ Need to build both systems
❌ Need to maintain template gallery
❌ Complexity in architecture

**Implementation Effort:** Medium (1.5-2 weeks)

**Best For:**
- Diverse user base (technical and non-technical)
- Want professional results quickly
- Need flexibility for power users
- Balancing ease-of-use with customization

---

### Option 5: Simple HTML Editor (CodeMirror) + Basic Wizard

**What is CodeMirror?**
- Lightweight code editor (lighter than Monaco)
- Syntax highlighting
- Simple, focused feature set

**Combined with:**
- Basic customization wizard (like Tier 1 of Hybrid)
- Pre-built templates
- Less sophisticated than Monaco

**Pros:**
✅ Lightest weight option
✅ Fast implementation
✅ Covers basic needs
✅ Good balance of simplicity and flexibility

**Cons:**
❌ Less powerful than Monaco
❌ Fewer features for advanced users
❌ Still requires HTML knowledge for editing

**Implementation Effort:** Low (1 week)

**Best For:**
- Quick MVP
- Smaller user base
- Basic customization needs

---

## Detailed Comparison Matrix

| Feature | jsreport | GrapesJS | Monaco | Hybrid | CodeMirror |
|---------|----------|----------|--------|--------|------------|
| **Ease of Use (Non-Technical)** | Medium | High | Low | High | Medium |
| **Ease of Use (Technical)** | Medium | Medium | High | High | High |
| **Implementation Time** | 2-3 weeks | 2 weeks | 1 week | 1.5-2 weeks | 1 week |
| **Bundle Size** | Very Large (~150MB) | Medium (~5MB) | Medium (~5MB) | Medium (~6MB) | Small (~1MB) |
| **Resource Usage** | High | Medium | Low | Low | Low |
| **Customization Power** | Very High | Medium | Very High | Very High | High |
| **Learning Curve** | Steep | Gentle | Medium | Gentle→Medium | Medium |
| **Maintenance Burden** | High | Medium | Low | Medium | Low |
| **Professional Results** | Excellent | Good | Excellent | Excellent | Good |
| **Template Reusability** | Excellent | Good | Excellent | Excellent | Good |
| **Asset Management** | Built-in | Built-in | Manual | Manual | Manual |
| **WYSIWYG Editing** | Yes | Yes | No | Partial | No |
| **Version Control Friendly** | Medium | Medium | Excellent | Excellent | Excellent |
| **Suitable for Databuild** | Overkill | Good fit | Good fit | **Best fit** | Good fit |

---

## RECOMMENDED SOLUTION: Hybrid Approach

### Why Hybrid?

1. **Serves Both User Types:**
   - Construction estimators (non-technical) → Template Gallery + Wizard
   - IT managers/developers (technical) → Advanced Editor

2. **Quick Wins:**
   - Users can start with professional templates immediately
   - No HTML knowledge required for 80% of customization needs

3. **Future-Proof:**
   - Advanced users aren't limited
   - Can handle complex requirements as they arise

4. **Reasonable Complexity:**
   - Gallery + Wizard is straightforward to build
   - Monaco Editor is well-documented and stable

5. **Good ROI:**
   - 1.5-2 weeks implementation vs. 2-3 weeks for jsreport
   - Lower maintenance than jsreport
   - Better UX than code-only solutions

---

## Detailed Implementation Plan: Hybrid Approach

### Component 1: Template Gallery

**Location:** `frontend/src/components/PurchaseOrders/TemplateGallery.vue`

**Features:**
- Grid display of available templates (with previews)
- Template categories (Standard PO, RFQ, Minimalist, Detailed, etc.)
- Preview modal with sample data
- "Use This Template" button
- Import template from file
- Export current template

**Pre-built Templates (5 initial):**
1. **Classic Purchase Order** - Traditional, formal layout
2. **Modern Minimalist** - Clean, simple design
3. **Detailed RFQ** - Comprehensive with extra fields
4. **Compact PO** - Fits more on one page
5. **Professional Corporate** - Polished, branded look

**Template Metadata:**
```json
{
  "id": "classic-po",
  "name": "Classic Purchase Order",
  "description": "Traditional formal layout with company header",
  "category": "Standard",
  "author": "DBx Connector",
  "version": "1.0",
  "preview": "base64-encoded-thumbnail",
  "templateFile": "classic-po.hbs",
  "customizable": {
    "logo": true,
    "colors": true,
    "fonts": true,
    "sections": ["header", "footer", "notes"]
  }
}
```

---

### Component 2: Customization Wizard

**Location:** `frontend/src/components/PurchaseOrders/TemplateWizard.vue`

**Multi-Step Wizard:**

#### Step 1: Company Branding
- Upload logo (auto-resize to fit)
- Company name (appears in header)
- Tagline/Subtitle (optional)
- Choose logo position (left, center, right)

#### Step 2: Color Scheme
- Primary color (headers, borders)
- Secondary color (accents)
- Text color
- Background color
- Preview with live updates

#### Step 3: Typography
- Header font (dropdown of safe fonts)
- Body font
- Font sizes (small, medium, large presets)

#### Step 4: Layout Sections
- Toggle sections on/off:
  - Company header
  - Supplier address block
  - Job details section
  - Line items table
  - Subtotal/totals
  - Notes section
  - Custom footer

#### Step 5: Content Settings
- Default footer text
- Terms and conditions (optional)
- Page numbering format
- Date format preference

#### Step 6: Preview & Save
- Full preview with sample data
- Save as new template (give it a name)
- Set as default template

**Configuration Storage:**
```json
{
  "baseTemplate": "classic-po",
  "customizations": {
    "logo": "base64-or-path-to-logo",
    "companyName": "Acme Construction",
    "tagline": "Building Excellence Since 1995",
    "colors": {
      "primary": "#003366",
      "secondary": "#0066cc",
      "text": "#333333",
      "background": "#ffffff"
    },
    "fonts": {
      "header": "Arial",
      "body": "Helvetica"
    },
    "sections": {
      "showCompanyHeader": true,
      "showSupplierAddress": true,
      "showJobDetails": true,
      "showNotes": true,
      "showFooter": true
    },
    "content": {
      "footerText": "Thank you for your business",
      "terms": "Payment due within 30 days",
      "dateFormat": "DD/MM/YYYY"
    }
  }
}
```

**How Wizard Applies Customizations:**

The wizard modifies the base template by:
1. Injecting CSS variables for colors/fonts
2. Conditional Handlebars blocks for sections
3. Replacing placeholder text
4. Injecting logo as base64 data URI

```handlebars
<style>
  :root {
    --primary-color: {{customizations.colors.primary}};
    --secondary-color: {{customizations.colors.secondary}};
    --header-font: {{customizations.fonts.header}};
    --body-font: {{customizations.fonts.body}};
  }
</style>

{{#if customizations.sections.showCompanyHeader}}
<div class="company-header">
  {{#if customizations.logo}}
  <img src="{{customizations.logo}}" alt="Company Logo">
  {{/if}}
  <h1>{{customizations.companyName}}</h1>
  <p>{{customizations.tagline}}</p>
</div>
{{/if}}
```

---

### Component 3: Advanced Editor

**Location:** `frontend/src/components/PurchaseOrders/AdvancedTemplateEditor.vue`

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Template: Classic PO v2          [Save] [Preview] [X]  │
├──────────────────────┬──────────────────────────────────┤
│                      │                                  │
│  HTML/Handlebars     │      Live Preview                │
│  Editor              │                                  │
│  (Monaco)            │      (Rendered with             │
│                      │       sample data)              │
│                      │                                  │
├──────────────────────┼──────────────────────────────────┤
│  CSS Editor          │   Template Variables Reference   │
│  (Monaco)            │                                  │
│                      │   {{OrderNumber}}                │
│                      │   {{JobName}}                    │
│                      │   ...                            │
└──────────────────────┴──────────────────────────────────┘
```

**Features:**

1. **Split-Pane Editor:**
   - Left: HTML editor
   - Right: Live preview
   - Bottom: CSS editor (collapsible)
   - Far right: Variable reference (collapsible)

2. **Monaco Editor Configuration:**
   ```javascript
   const htmlEditor = monaco.editor.create(htmlContainer, {
     value: templateHTML,
     language: 'handlebars',
     theme: isDark ? 'vs-dark' : 'vs',
     automaticLayout: true,
     minimap: { enabled: true },
     wordWrap: 'on'
   });

   const cssEditor = monaco.editor.create(cssContainer, {
     value: templateCSS,
     language: 'css',
     theme: isDark ? 'vs-dark' : 'vs'
   });
   ```

3. **IntelliSense for Template Variables:**
   ```javascript
   monaco.languages.registerCompletionItemProvider('handlebars', {
     provideCompletionItems: (model, position) => {
       const suggestions = TEMPLATE_VARIABLES.map(v => ({
         label: v.variable,
         kind: monaco.languages.CompletionItemKind.Variable,
         insertText: v.variable,
         documentation: v.description,
         detail: v.example
       }));
       return { suggestions };
     }
   });
   ```

4. **Code Snippets:**
   - Insert common elements via dropdown or shortcuts
   - Line items table
   - Totals section
   - Notes block
   - Conditional sections

   ```javascript
   const SNIPPETS = {
     'table-line-items': {
       label: 'Line Items Table',
       code: `<table>
         <thead>
           <tr>
             <th>Item Code</th>
             <th>Description</th>
             <th>Qty</th>
             <th>Unit</th>
             <th>Unit Price</th>
             <th>Total</th>
           </tr>
         </thead>
         <tbody>
           {{#each items}}
           <tr>
             <td>{{ItemCode}}</td>
             <td>{{Description}}</td>
             <td>{{Quantity}}</td>
             <td>{{Unit}}</td>
             <td>{{currency UnitPrice}}</td>
             <td>{{currency LineTotal}}</td>
           </tr>
           {{/each}}
         </tbody>
       </table>`
     }
   };
   ```

5. **Live Preview:**
   - Updates on typing (debounced 500ms)
   - Uses sample order data
   - Renders via same engine as actual orders
   - Shows compilation errors if template invalid

6. **Toolbar Actions:**
   - Save template
   - Save as new template
   - Revert to last saved
   - Full-screen preview
   - Export template
   - Print test page

7. **Variable Reference Panel:**
   - Searchable list of all available variables
   - Grouped by category (Job, Order, Supplier, Items, etc.)
   - Click to copy to clipboard
   - Shows example values

   ```vue
   <div class="variable-reference">
     <input v-model="search" placeholder="Search variables...">
     <div v-for="category in filteredVariables" :key="category.name">
       <h4>{{ category.name }}</h4>
       <div v-for="variable in category.vars" :key="variable.name"
            @click="copyToClipboard(variable.handlebars)"
            class="variable-item">
         <code>{{ variable.handlebars }}</code>
         <span class="description">{{ variable.description }}</span>
         <span class="example">Example: {{ variable.example }}</span>
       </div>
     </div>
   </div>
   ```

---

### Component 4: Template Storage & Management

**Backend:** `src/database/template-store.js`

```javascript
const Store = require('electron-store');

const templateStore = new Store({
  name: 'po-templates',
  defaults: {
    templates: [],
    defaultTemplateId: 'classic-po',
    customTemplates: []
  }
});

class TemplateManager {
  // Get all templates (built-in + custom)
  getAllTemplates() {
    const builtIn = this.getBuiltInTemplates();
    const custom = templateStore.get('customTemplates', []);
    return [...builtIn, ...custom];
  }

  // Get built-in templates
  getBuiltInTemplates() {
    const templatesDir = path.join(__dirname, '../templates/purchase-orders');
    // Read template metadata files
    // Return array of template objects
  }

  // Save custom template
  saveCustomTemplate(templateData) {
    const custom = templateStore.get('customTemplates', []);

    // Generate unique ID
    const id = `custom-${Date.now()}`;

    const template = {
      id,
      name: templateData.name,
      description: templateData.description,
      category: 'Custom',
      author: templateData.author || 'User',
      created: new Date().toISOString(),
      html: templateData.html,
      css: templateData.css,
      customizations: templateData.customizations || null
    };

    custom.push(template);
    templateStore.set('customTemplates', custom);

    return { success: true, templateId: id };
  }

  // Load template by ID
  loadTemplate(templateId) {
    // Check built-in templates first
    const builtIn = this.getBuiltInTemplates();
    const found = builtIn.find(t => t.id === templateId);
    if (found) return found;

    // Check custom templates
    const custom = templateStore.get('customTemplates', []);
    return custom.find(t => t.id === templateId);
  }

  // Delete custom template
  deleteTemplate(templateId) {
    if (templateId.startsWith('custom-')) {
      const custom = templateStore.get('customTemplates', []);
      const filtered = custom.filter(t => t.id !== templateId);
      templateStore.set('customTemplates', filtered);
      return { success: true };
    }
    return { success: false, message: 'Cannot delete built-in template' };
  }

  // Export template to file
  exportTemplate(templateId) {
    const template = this.loadTemplate(templateId);
    if (!template) return { success: false, message: 'Template not found' };

    const exportData = {
      version: '1.0',
      template: {
        name: template.name,
        description: template.description,
        html: template.html,
        css: template.css,
        customizations: template.customizations
      }
    };

    return { success: true, data: JSON.stringify(exportData, null, 2) };
  }

  // Import template from file
  importTemplate(fileContent) {
    try {
      const importData = JSON.parse(fileContent);

      if (importData.version !== '1.0') {
        return { success: false, message: 'Unsupported template version' };
      }

      return this.saveCustomTemplate(importData.template);
    } catch (error) {
      return { success: false, message: 'Invalid template file' };
    }
  }

  // Set default template
  setDefaultTemplate(templateId) {
    templateStore.set('defaultTemplateId', templateId);
    return { success: true };
  }

  getDefaultTemplate() {
    return templateStore.get('defaultTemplateId', 'classic-po');
  }
}

module.exports = new TemplateManager();
```

---

## Implementation Timeline

### Week 1: Foundation
- [ ] Day 1-2: Set up Monaco Editor component
- [ ] Day 2-3: Create 5 built-in templates (HTML/Handlebars)
- [ ] Day 3-4: Build Template Gallery UI
- [ ] Day 4-5: Implement Template Manager (storage/loading)

### Week 2: Customization & Polish
- [ ] Day 1-2: Build Customization Wizard (multi-step)
- [ ] Day 2-3: Implement wizard → template application logic
- [ ] Day 3-4: Advanced Editor with live preview
- [ ] Day 4-5: Template import/export functionality

### Week 3: Integration & Testing
- [ ] Day 1-2: Integrate with existing PO system
- [ ] Day 2-3: Sample data generation for previews
- [ ] Day 3-4: Testing all templates with real data
- [ ] Day 4-5: Documentation and user guide

---

## User Workflows

### Workflow A: Non-Technical User
1. Opens Template Gallery
2. Browses pre-built templates with previews
3. Selects "Classic Purchase Order"
4. Clicks "Customize"
5. Customization Wizard opens:
   - Uploads company logo
   - Sets colors to company branding
   - Adds footer text
   - Previews changes
6. Saves as "Acme Construction PO"
7. Sets as default template
8. **Total time: 5-10 minutes, no code required**

### Workflow B: Technical User
1. Opens Template Gallery
2. Clicks "Create New Template" → Advanced Editor
3. Starts with blank template or copies existing
4. Edits HTML using Monaco Editor:
   - Uses IntelliSense for template variables
   - Inserts code snippets for common elements
   - Views live preview while editing
5. Adds custom CSS styling
6. Tests with sample data
7. Saves template
8. **Total time: 30-60 minutes for complex template**

### Workflow C: Template Sharing
1. User A creates custom template
2. Clicks "Export Template"
3. Saves .json file to disk
4. Sends file to User B
5. User B clicks "Import Template"
6. Selects .json file
7. Template appears in gallery
8. **Total time: 2 minutes**

---

## Asset Management

For logos and images, we'll use **base64 encoding** embedded in templates:

**Pros:**
- Self-contained templates (no external file dependencies)
- Easy to export/import
- Works in PDF generation
- Simple implementation

**Cons:**
- Larger template file size
- Can't easily swap images

**Implementation:**
```javascript
// In wizard, when user uploads logo
async function handleLogoUpload(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result; // data:image/png;base64,iVBORw0K...
    this.customizations.logo = base64;
  };
  reader.readAsDataURL(file);
}

// In template
<img src="{{customizations.logo}}" alt="Company Logo" style="max-height: 80px;">
```

---

## Security Considerations

1. **Template Injection:** Sanitize user input in wizard
2. **XSS Prevention:** Escape HTML in descriptions/notes
3. **File Size Limits:** Limit logo uploads to 2MB
4. **Template Validation:** Parse and validate before saving
5. **Safe Defaults:** Use safe HTML/CSS in built-in templates

---

## Conclusion

**Recommendation: Hybrid Approach**

This solution:
- Balances ease-of-use with power
- Serves diverse user base
- Reasonable implementation effort (1.5-2 weeks)
- Lower complexity than jsreport
- Better UX than code-only Monaco
- Future-proof and extensible

**Do NOT use jsreport because:**
- Overkill for this use case
- Large dependency footprint
- High resource usage
- Complex to maintain
- Steep learning curve

**The Hybrid approach gives us:**
- 5 professional templates out-of-box
- Simple wizard for 80% of customization needs
- Advanced editor for power users
- Clean architecture
- Easy to maintain and extend
