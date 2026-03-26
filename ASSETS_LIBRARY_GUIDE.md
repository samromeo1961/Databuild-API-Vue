# Assets Library Guide

## Overview

The Assets Library provides centralized management of shared resources (logos, CSS files, fonts, images) used across all Purchase Order templates. Assets are stored locally using electron-store and embedded directly into templates as base64-encoded data URLs.

## Features

- **Upload Assets**: Drag-and-drop or file picker for easy uploads
- **Category Management**: Auto-categorization (Logos, Images, CSS, Fonts, Other)
- **Preview**: Visual previews for images, icons for other file types
- **Copy Reference**: One-click code generation for embedding in templates
- **Storage Stats**: Monitor total storage usage
- **Search & Filter**: Filter by category with item counts

## How to Access

Navigate to **Purchase Orders** tab → Click **Assets** button in the header

## Supported File Types

- **Images**: PNG, JPG, JPEG, GIF, SVG, WebP
- **CSS**: .css files for custom styling
- **Fonts**: TTF, WOFF, WOFF2, OTF

## Using Assets in Templates

### 1. Upload Your Asset

1. Open the Assets Library
2. Drag-and-drop files into the upload zone, or click "Select Files"
3. Assets are automatically categorized and stored

### 2. Copy Asset Reference

1. Find your asset in the grid
2. Click the **Copy Reference** button (code icon)
3. The appropriate code snippet is copied to your clipboard

### 3. Paste into Template

Open your template editor and paste the copied reference.

## Code Examples

### Images (Logos, Graphics)

When you copy a reference for an image, you get:

```html
<img src="data:image/png;base64,iVBORw0KG..." alt="company-logo.png" />
```

**In Handlebars Templates:**
```handlebars
<!-- Company Logo -->
<div class="header">
  <img src="data:image/png;base64,iVBORw0KG..." alt="Company Logo" style="width: 200px;" />
</div>
```

### CSS Files

When you copy a reference for a CSS file, you get:

```html
<style>
/* From custom-styles.css */
.header { background: #003366; color: white; }
.footer { font-size: 10px; text-align: center; }
</style>
```

**In Handlebars Templates:**
Place this in the `<head>` section of your template:

```handlebars
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Purchase Order</title>

  <!-- Custom Styles -->
  <style>
  /* From custom-styles.css */
  .header { background: #003366; color: white; padding: 20px; }
  .line-item { border-bottom: 1px solid #ccc; }
  </style>
</head>
<body>
  <!-- Template content -->
</body>
</html>
```

### Fonts

For fonts, you need to manually create a `@font-face` declaration. Upload your font file, then add:

```html
<style>
@font-face {
  font-family: 'CustomFont';
  src: url('data:font/woff2;base64,d09GMg...') format('woff2');
}

body {
  font-family: 'CustomFont', Arial, sans-serif;
}
</style>
```

## Best Practices

### File Naming

- Use descriptive names: `company-logo.png` not `IMG001.png`
- Use hyphens or underscores: `blue-header-bg.png`
- Include version if needed: `logo-v2.png`

### Logo Auto-Categorization

Files with "logo" or "brand" in the name are automatically categorized as Logos for easy filtering.

### File Size Considerations

- **Images**: Optimize before uploading (use tools like TinyPNG, ImageOptim)
- **Keep logos under 500KB**: Large base64 assets increase template file size
- **CSS**: Minify CSS files to reduce size
- **Fonts**: Use WOFF2 format (best compression)

### Storage Management

- Regularly review unused assets and delete them
- Monitor storage stats in the Assets Library
- Use "Clear All" sparingly (it deletes everything!)

## Template Integration Workflow

### Example: Adding Company Logo to PO Template

1. **Upload logo**:
   - Open Assets Library
   - Upload `acme-logo.png`
   - Automatically categorized as "Logo"

2. **Copy reference**:
   - Click copy button
   - Get: `<img src="data:image/png;base64,..." alt="acme-logo.png" />`

3. **Edit template**:
   - Open template in Template Gallery
   - Find the header section
   - Paste and style:

```handlebars
<div class="header">
  <img
    src="data:image/png;base64,..."
    alt="ACME Corp"
    style="width: 150px; height: auto; margin-bottom: 10px;"
  />
  <h1>Purchase Order</h1>
</div>
```

4. **Save and preview**:
   - Save template
   - Use Preview to verify logo appears correctly
   - Adjust width/height styles as needed

## Advanced Usage

### Responsive Images

```html
<img
  src="data:image/png;base64,..."
  alt="Logo"
  style="max-width: 200px; width: 100%; height: auto;"
/>
```

### Multiple CSS Files

You can embed multiple CSS files in one template:

```html
<style>
/* From reset.css */
* { margin: 0; padding: 0; box-sizing: border-box; }

/* From layout.css */
.container { max-width: 800px; margin: 0 auto; }

/* From theme.css */
.header { background: #003366; color: white; }
</style>
```

### Background Images

```html
<div style="
  background-image: url('data:image/png;base64,...');
  background-size: cover;
  background-position: center;
  height: 200px;
">
  Content here
</div>
```

## Technical Details

### Storage Location

Assets are stored in: `~/AppData/Roaming/dbx-connector-vue/assets-library.json`

### Data Format

```json
{
  "assets": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "company-logo.png",
      "type": "image/png",
      "content": "iVBORw0KGgoAAAANS...",
      "category": "logo",
      "size": 45678,
      "createdAt": "2025-11-15T10:30:00.000Z",
      "updatedAt": "2025-11-15T10:30:00.000Z"
    }
  ]
}
```

### Performance Notes

- Asset list loads metadata only (no content) for fast browsing
- Full content loaded on-demand when copying reference or previewing
- Image previews are lazy-loaded and cached
- Base64 encoding increases file size by ~33% (binary → text conversion)

## Troubleshooting

### Asset Not Displaying in Template

1. **Check base64 data**: Ensure the full data URL was copied (should start with `data:image/...`)
2. **Verify image format**: Some PDF renderers have limited format support
3. **Check file size**: Very large images may fail to render
4. **Browser cache**: Clear browser cache and reload

### Template File Too Large

- Optimize images before uploading
- Use WOFF2 for fonts (smallest format)
- Minify CSS files
- Consider external hosting for very large assets

### Upload Fails

- Check file type is supported
- Ensure file isn't corrupted
- Check available disk space
- Try smaller file size

## Future Enhancements

Planned features:

- Image editing/cropping tools
- Asset tagging and advanced search
- Usage tracking (which templates use which assets)
- Asset versioning
- Bulk export/import
- Cloud storage integration
- Asset optimization on upload

## Support

For issues or questions:
- Check JSREPORT_INTEGRATION.md for template syntax
- Review TEMPLATE_EDITOR_IMPROVEMENTS.md for editor features
- See CKEDITOR_INTEGRATION.md for rich text editing

---

**Version**: 1.0
**Last Updated**: November 2025
