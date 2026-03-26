# Adding Logos to Purchase Order Templates

This guide explains how to add your company logo to purchase order templates in DBx Connector Vue.

## ⚠️ IMPORTANT: Content Security Policy (CSP) Restrictions

The application enforces Content Security Policy (CSP) restrictions for security. **External image URLs are blocked** and will not display in templates or PDFs.

**Allowed image sources:**
- ✅ Base64 encoded images (data: URIs) - **RECOMMENDED**
- ✅ Same-origin images ('self')
- ❌ External URLs (https://...) - **BLOCKED BY CSP**

**Always use the Base64 upload method described in Method 1 below.**

## Method 1: Base64 Encoded Image (Recommended - CSP Compliant)

Base64 encoding embeds the image directly in the HTML, making the template portable, self-contained, and **CSP compliant**.

### Steps:

1. **Convert your logo to Base64:**
   - Use an online tool like https://www.base64-image.de/
   - Or use PowerShell:
     ```powershell
     $imagePath = "C:\path\to\your\logo.png"
     $bytes = [System.IO.File]::ReadAllBytes($imagePath)
     $base64 = [System.Convert]::ToBase64String($bytes)
     Write-Output $base64
     ```

2. **Add to your template HTML:**

```html
<!-- In the company header section -->
<div class="company-header">
  <img
    src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA..."
    alt="Company Logo"
    style="max-width: 200px; max-height: 80px;"
  />
  <div class="company-info">
    <h1>{{customizations.content.companyName}}</h1>
    <p>Your company address and contact details here</p>
  </div>
</div>
```

### Supported Image Formats:
- PNG: `data:image/png;base64,`
- JPG/JPEG: `data:image/jpeg;base64,`
- GIF: `data:image/gif;base64,`
- SVG: `data:image/svg+xml;base64,`

### Example Template Structure with Logo:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Purchase Order</title>
  <style>
    .company-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px;
      border-bottom: 2px solid {{customizations.colors.primary}};
    }

    .logo-container {
      flex: 0 0 200px;
    }

    .logo-container img {
      max-width: 100%;
      height: auto;
    }

    .company-info {
      flex: 1;
      text-align: right;
    }
  </style>
</head>
<body>
  {{#if customizations.sections.showCompanyHeader}}
  <div class="company-header">
    <div class="logo-container">
      <img
        src="data:image/png;base64,YOUR_BASE64_STRING_HERE"
        alt="Company Logo"
      />
    </div>
    <div class="company-info">
      <h1>{{customizations.content.companyName}}</h1>
      <p>ABN: 12 345 678 901</p>
      <p>123 Business Street, City NSW 2000</p>
      <p>Phone: (02) 1234 5678</p>
      <p>Email: orders@company.com.au</p>
    </div>
  </div>
  {{/if}}

  <!-- Rest of template... -->
</body>
</html>
```

## Method 2: External URL ⚠️ NOT RECOMMENDED - CSP BLOCKED

**WARNING:** External URLs are **blocked by Content Security Policy** and will **NOT work**.

```html
<!-- ❌ THIS WILL NOT WORK - BLOCKED BY CSP -->
<img src="https://yourcompany.com/logo.png" alt="Company Logo" />

<!-- ❌ THIS WILL NOT WORK - BLOCKED BY CSP -->
<img src="file:///C:/Company/Logos/logo.png" alt="Company Logo" />
```

**Error you will see:**
```
Refused to load the image 'https://yourcompany.com/...' because it violates the following Content Security Policy directive: "img-src 'self' data: ..."
```

**Solution:** Use the Base64 upload feature in the "Insert Logo" button instead.

## Method 3: SVG Inline (Best Quality, Scalable)

For vector logos, you can embed SVG directly:

```html
<div class="logo-container">
  <svg width="200" height="80" viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg">
    <!-- Your SVG path data here -->
    <rect width="200" height="80" fill="#003366"/>
    <text x="100" y="45" font-size="24" fill="white" text-anchor="middle">
      YOUR COMPANY
    </text>
  </svg>
</div>
```

## Quick Method: Using the "Insert Logo" Button ⭐ EASIEST

The Template HTML Editor has a built-in "Insert Logo" feature that handles everything automatically:

1. Open **Template Gallery** and click **"Edit HTML"** on your template
2. In the toolbar, click the **"Insert Logo"** button (image icon)
3. In the modal that appears:
   - **Upload Image:** Click "Choose File" and select your logo (PNG, JPG, GIF, or SVG)
     - Maximum file size: 500KB
     - Image is automatically converted to Base64 (CSP compliant)
   - **OR Enter URL:** Enter an image URL (will show CSP warning)
   - **Adjust Size:** Set max width/height (default: 200×80px)
   - **Preview:** See how your logo will look
4. Click **"Insert Logo"** button
5. The logo HTML is automatically added to your template
6. Click **"Save Template"**

**This is the recommended method** as it:
- ✅ Automatically converts images to Base64 (CSP compliant)
- ✅ Handles file size validation
- ✅ Provides live preview
- ✅ Inserts properly formatted HTML
- ✅ Warns about CSP issues with external URLs

## How to Create a New Template with Logo (Manual Method)

### Option 1: Duplicate Existing Template

1. Open **Purchase Orders** tab → **Templates** subtab
2. Click **"Template Gallery"** button
3. Find the template you want to use as a base (e.g., "Classic PO")
4. Click **"Duplicate"** button on that template
5. Enter a name for your new template (e.g., "Company PO with Logo")
6. Click **"Edit HTML"** on your new template
7. Add your logo code in the company header section
8. Click **"Save Template"**
9. Set as default if desired

### Option 2: Edit Built-In Template

**Warning:** This modifies the built-in template. Consider duplicating first!

1. Open **Template Gallery**
2. Click **"Edit HTML"** on a built-in template
3. Add your logo code
4. Click **"Save Template"**

## CSS Styling Tips for Logos

### Responsive Logo Sizing:
```css
.logo-container img {
  max-width: 200px;
  max-height: 80px;
  width: auto;
  height: auto;
  object-fit: contain;
}
```

### Center Logo:
```css
.logo-container {
  text-align: center;
}
```

### Logo with Border:
```css
.logo-container img {
  border: 2px solid #003366;
  padding: 10px;
  background: white;
}
```

### Print-Specific Styling:
```css
@media print {
  .logo-container img {
    max-width: 150px;
    max-height: 60px;
  }
}
```

## Testing Your Logo

1. After adding your logo, use the **"Show Live Preview"** button in the HTML editor
2. Or click **"Preview"** in the Template Gallery
3. Adjust the `max-width` and `max-height` CSS properties until it looks right
4. Test PDF generation by creating a purchase order with your template

## Troubleshooting

### Logo not showing:
- Check that Base64 string includes the correct prefix (`data:image/png;base64,`)
- Ensure Base64 string is complete (no line breaks or truncation)
- Verify the conditional `{{#if customizations.sections.showCompanyHeader}}` is set to true

### Logo too large/small:
- Adjust `max-width` and `max-height` in CSS
- Use `object-fit: contain` to maintain aspect ratio

### Logo quality poor in PDF:
- Use higher resolution source image (300 DPI recommended)
- Consider using SVG for vector graphics (infinite scalability)
- PNG format generally works better than JPG for logos

## Example: Complete Company Header with Logo

```html
{{#if customizations.sections.showCompanyHeader}}
<div class="company-header">
  <div class="header-left">
    <img
      src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA..."
      alt="Company Logo"
      style="max-width: 200px; max-height: 80px; display: block;"
    />
  </div>
  <div class="header-right">
    <h1 style="margin: 0; color: #003366; font-size: 24px;">
      {{#if customizations.content.companyName}}
        {{customizations.content.companyName}}
      {{else}}
        Your Company Name
      {{/if}}
    </h1>
    <p style="margin: 5px 0;">ABN: 12 345 678 901</p>
    <p style="margin: 5px 0;">123 Business Street, City NSW 2000</p>
    <p style="margin: 5px 0;">Phone: (02) 1234 5678 | Email: orders@company.com.au</p>
  </div>
</div>
<hr style="border: 1px solid #003366; margin: 20px 0;">
{{/if}}
```

## Need Help?

- Use the **Field Guide** panel in the HTML editor to see available template variables
- Click **"Format"** button to auto-format your HTML
- Use **"Show Live Preview"** to see changes in real-time
- Templates use **Handlebars** templating engine - see https://handlebarsjs.com/ for syntax

---

**Remember:** Always test your templates thoroughly before using them for real purchase orders!
