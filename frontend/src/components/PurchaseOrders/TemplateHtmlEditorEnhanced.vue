<template>
  <div class="modal fade show d-block" tabindex="-1" @click.self="closeModal">
    <div class="modal-dialog modal-fullscreen">
      <div class="modal-content">
        <!-- Header -->
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-code-slash me-2"></i>
            Edit Template HTML: {{ templateName }}
          </h5>
          <button type="button" class="btn-close" @click="closeModal"></button>
        </div>

        <!-- Toolbar -->
        <div class="toolbar p-2 border-bottom bg-light">
          <div class="d-flex justify-content-between align-items-center">
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-primary" @click="formatCode" title="Format HTML">
                <i class="bi bi-code"></i>
                Format
              </button>
              <button class="btn btn-sm btn-outline-success" @click="showLogoModal = true" title="Insert Company Header">
                <i class="bi bi-building"></i>
                Company Header
              </button>
              <button class="btn btn-sm btn-outline-warning" @click="showVariablePicker = true" title="Insert Handlebars Variable">
                <i class="bi bi-braces"></i>
                Insert Variable
              </button>
              <button class="btn btn-sm btn-outline-info" @click="showSectionsLibrary = true" title="Insert Template Section">
                <i class="bi bi-puzzle"></i>
                Insert Section
              </button>
              <div class="input-group input-group-sm" style="width: 250px;">
                <input
                  type="text"
                  class="form-control"
                  placeholder="Search code..."
                  v-model="searchQuery"
                  @keyup.enter="searchCode"
                />
                <button class="btn btn-outline-secondary" @click="searchCode" title="Search">
                  <i class="bi bi-search"></i>
                </button>
              </div>
              <button
                class="btn btn-sm"
                :class="showPreview ? 'btn-primary' : 'btn-outline-secondary'"
                @click="togglePreview">
                <i class="bi bi-layout-split"></i>
                {{ showPreview ? 'Hide' : 'Show' }} Live Preview
              </button>
              <button class="btn btn-sm btn-outline-info" @click="showFieldGuide = !showFieldGuide">
                <i class="bi bi-info-circle"></i>
                Field Guide
              </button>
              <select
                v-if="templateSections.length > 0"
                class="form-select form-select-sm ms-2"
                style="width: auto;"
                @change="jumpToSection($event.target.value)"
                title="Jump to Section">
                <option value="">Jump to Section...</option>
                <option v-for="section in templateSections" :key="section.line" :value="section.line">
                  {{ section.name }}
                </option>
              </select>
              <span v-if="hasChanges" class="badge bg-warning text-dark ms-2 align-self-center">
                <i class="bi bi-exclamation-circle me-1"></i>
                Unsaved Changes
              </span>
            </div>
            <div class="d-flex gap-2 align-items-center">
              <div class="form-check form-switch mb-0">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="lineNumbers"
                  v-model="showLineNumbers"
                />
                <label class="form-check-label small" for="lineNumbers">
                  Line Numbers
                </label>
              </div>
              <!-- Syntax Highlighting removed - caused misalignment issues -->
              <!-- Future: Consider Monaco Editor integration for proper syntax highlighting -->
            </div>
          </div>
        </div>

        <!-- Field Guide Panel -->
        <div v-if="showFieldGuide" class="field-guide p-3 border-bottom bg-info bg-opacity-10">
          <div class="row small">
            <div class="col-md-3">
              <h6 class="fw-bold">Order Fields</h6>
              <code>{{dbl}}OrderNumber{{dbr}}</code><br>
              <code>{{dbl}}OrderDate{{dbr}}</code><br>
              <code class="text-success">{{dbl}}DelDate{{dbr}}</code> <span class="badge bg-success">NEW</span><br>
              <code>{{dbl}}JobNo{{dbr}}</code><br>
              <code>{{dbl}}JobName{{dbr}}</code><br>
              <code>{{dbl}}Client{{dbr}}</code>
            </div>
            <div class="col-md-3">
              <h6 class="fw-bold">Site Address (NEW)</h6>
              <code class="text-success">{{dbl}}SiteStreet{{dbr}}</code><br>
              <code class="text-success">{{dbl}}SiteSuburb{{dbr}}</code><br>
              <code class="text-success">{{dbl}}SiteState{{dbr}}</code>
            </div>
            <div class="col-md-3">
              <h6 class="fw-bold">Supervisor (NEW)</h6>
              <code class="text-success">{{dbl}}Supervisor{{dbr}}</code><br>
              <code class="text-success">{{dbl}}SupervisorPhone{{dbr}}</code><br>
              <code class="text-success">{{dbl}}SupervisorMobile{{dbr}}</code>
            </div>
            <div class="col-md-3">
              <h6 class="fw-bold">Supplier</h6>
              <code>{{dbl}}SupplierName{{dbr}}</code><br>
              <code class="text-success">{{dbl}}AccountContact{{dbr}}</code> <span class="badge bg-success">NEW</span><br>
              <code class="text-success">{{dbl}}AccountPhone{{dbr}}</code> <span class="badge bg-success">NEW</span><br>
              <code class="text-success">{{dbl}}AccountEmail{{dbr}}</code> <span class="badge bg-success">NEW</span><br>
              <code class="text-success">{{dbl}}AccountAddress{{dbr}}</code> <span class="badge bg-success">NEW</span><br>
              <code class="text-success">{{dbl}}SpecialInstructions{{dbr}}</code> <span class="badge bg-success">NEW</span>
            </div>
          </div>
        </div>

        <!-- Body - Split Screen -->
        <div class="modal-body p-0 d-flex" style="height: calc(100vh - 240px);">
          <!-- Loading State -->
          <div v-if="loading" class="flex-fill d-flex align-items-center justify-content-center">
            <div class="text-center">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              <p class="mt-3 text-muted">Loading template...</p>
            </div>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="flex-fill d-flex align-items-center justify-content-center">
            <div class="alert alert-danger m-3">
              <i class="bi bi-exclamation-triangle me-2"></i>
              {{ error }}
            </div>
          </div>

          <!-- Editor & Preview Split -->
          <template v-else>
            <!-- Editor Panel -->
            <div class="editor-panel" :class="{ 'full-width': !showPreview, 'split-width': showPreview }">
              <div class="editor-container">
                <div class="editor-wrapper">
                  <div v-if="showLineNumbers" class="line-numbers" ref="lineNumbers">
                    <div v-for="n in lineCount" :key="n" class="line-number">{{ n }}</div>
                  </div>
                  <textarea
                    ref="editorTextarea"
                    v-model="htmlContent"
                    class="html-editor"
                    :class="{ 'with-line-numbers': showLineNumbers }"
                    spellcheck="false"
                    @input="onContentChange"
                    @scroll="syncScroll"
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- Preview Panel -->
            <div v-if="showPreview" class="preview-panel split-width border-start">
              <div class="preview-header p-2 bg-light border-bottom">
                <div class="d-flex justify-content-between align-items-center">
                  <small class="text-muted">
                    <i class="bi bi-eye me-1"></i>
                    Live Preview
                    <span class="badge bg-info ms-2" style="font-size: 0.7rem;">
                      <i class="bi bi-cursor me-1"></i>
                      Click sections to jump to code
                    </span>
                  </small>
                  <button class="btn btn-sm btn-outline-secondary" @click="refreshPreview" :disabled="loadingPreview">
                    <i class="bi bi-arrow-clockwise" :class="{ 'spin': loadingPreview }"></i>
                  </button>
                </div>
              </div>
              <div class="preview-container">
                <div v-if="loadingPreview" class="preview-loading">
                  <div class="spinner-border spinner-border-sm text-primary"></div>
                  <small class="text-muted ms-2">Rendering...</small>
                </div>
                <div v-else-if="previewError" class="preview-loading">
                  <i class="bi bi-exclamation-triangle text-danger"></i>
                  <small class="text-danger ms-2">{{ previewError }}</small>
                </div>
                <div v-else class="preview-frame" v-html="previewHTML"></div>
              </div>
            </div>
          </template>
        </div>

        <!-- Info Bar -->
        <div class="info-bar p-2 border-top bg-light">
          <div class="d-flex justify-content-between align-items-center small text-muted">
            <div>
              <i class="bi bi-info-circle me-1"></i>
              Template Path: <code>{{ templatePath }}</code>
            </div>
            <div>
              Lines: {{ lineCount }} | Characters: {{ htmlContent.length }}
              <span v-if="showPreview" class="ms-3">
                <i class="bi bi-arrows-angle-expand me-1"></i>
                Split View
              </span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            @click="closeModal"
            :disabled="saving">
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-outline-secondary"
            @click="revertChanges"
            :disabled="!hasChanges || saving">
            <i class="bi bi-arrow-counterclockwise me-1"></i>
            Revert Changes
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click="saveTemplate"
            :disabled="!hasChanges || saving">
            <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
            <i v-else class="bi bi-save me-1"></i>
            {{ saving ? 'Saving...' : 'Save Template' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Company Header Insert Modal -->
    <div v-if="showLogoModal" class="modal fade show d-block" tabindex="-1" @click.self="closeLogoModal" style="z-index: 1070;">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-building me-2"></i>
              Insert Company Header
            </h5>
            <button type="button" class="btn-close" @click="closeLogoModal"></button>
          </div>
          <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
            <div class="mb-3">
              <label class="form-label fw-bold">Upload Image File</label>
              <input
                type="file"
                class="form-control"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/svg+xml"
                @change="handleLogoUpload"
                ref="logoFileInput"
              />
              <small class="form-text text-muted">
                Supports PNG, JPG, GIF, SVG. Max 500KB recommended.
              </small>
            </div>

            <div class="text-center my-3">
              <span class="badge bg-secondary">OR</span>
            </div>

            <div class="mb-3">
              <label class="form-label fw-bold">Image URL</label>
              <input
                type="url"
                class="form-control"
                v-model="logoUrl"
                placeholder="https://example.com/logo.png"
              />
              <small class="form-text text-muted">
                Enter a direct link to an image file
              </small>
            </div>

            <div class="mb-3">
              <label class="form-label fw-bold">Logo Size</label>
              <div class="row g-2">
                <div class="col">
                  <input
                    type="number"
                    class="form-control form-control-sm"
                    v-model="logoMaxWidth"
                    placeholder="Width"
                  />
                  <small class="form-text text-muted">Max Width (px)</small>
                </div>
                <div class="col">
                  <input
                    type="number"
                    class="form-control form-control-sm"
                    v-model="logoMaxHeight"
                    placeholder="Height"
                  />
                  <small class="form-text text-muted">Max Height (px)</small>
                </div>
              </div>
            </div>

            <div v-if="logoPreview" class="mb-3">
              <label class="form-label fw-bold">Preview:</label>
              <div class="text-center p-3 border rounded bg-light">
                <img :src="logoPreview" alt="Logo Preview" :style="`max-width: ${logoMaxWidth}px; max-height: ${logoMaxHeight}px;`" />
              </div>
            </div>

            <hr class="my-4" />

            <!-- Company Details Section -->
            <h6 class="mb-3">
              <i class="bi bi-info-circle me-2"></i>
              Company Details
            </h6>

            <div class="mb-3">
              <label class="form-label fw-bold">Company Name</label>
              <input
                type="text"
                class="form-control"
                v-model="companyName"
                placeholder="Your Company Name"
              />
            </div>

            <div class="mb-3">
              <label class="form-label fw-bold">ABN</label>
              <input
                type="text"
                class="form-control"
                v-model="companyABN"
                placeholder="12 345 678 901"
              />
            </div>

            <div class="mb-3">
              <label class="form-label fw-bold">Street Address</label>
              <input
                type="text"
                class="form-control"
                v-model="companyAddress"
                placeholder="123 Business Street"
              />
            </div>

            <div class="row g-2 mb-3">
              <div class="col-md-5">
                <label class="form-label fw-bold">City</label>
                <input
                  type="text"
                  class="form-control"
                  v-model="companyCity"
                  placeholder="Sydney"
                />
              </div>
              <div class="col-md-4">
                <label class="form-label fw-bold">State</label>
                <input
                  type="text"
                  class="form-control"
                  v-model="companyState"
                  placeholder="NSW"
                />
              </div>
              <div class="col-md-3">
                <label class="form-label fw-bold">Postcode</label>
                <input
                  type="text"
                  class="form-control"
                  v-model="companyPostcode"
                  placeholder="2000"
                />
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label fw-bold">Phone</label>
              <input
                type="tel"
                class="form-control"
                v-model="companyPhone"
                placeholder="(02) 1234 5678"
              />
            </div>

            <div class="mb-3">
              <label class="form-label fw-bold">Email</label>
              <input
                type="email"
                class="form-control"
                v-model="companyEmail"
                placeholder="orders@company.com.au"
              />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeLogoModal">
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-primary"
              @click="insertLogo">
              <i class="bi bi-plus-circle me-1"></i>
              Insert Company Header
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showLogoModal" class="modal-backdrop fade show" style="z-index: 1065;"></div>
  </div>
  <div class="modal-backdrop fade show"></div>
</template>

<script>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useElectronAPI } from '../../composables/useElectronAPI';

export default {
  name: 'TemplateHtmlEditorEnhanced',
  props: {
    templateId: {
      type: String,
      required: true
    },
    templateName: {
      type: String,
      required: true
    }
  },
  emits: ['close', 'saved', 'preview'],
  setup(props, { emit }) {
    const api = useElectronAPI();

    // State
    const loading = ref(false);
    const saving = ref(false);
    const error = ref('');
    const htmlContent = ref('');
    const originalContent = ref('');
    const templatePath = ref('');
    const showLineNumbers = ref(true);
    const enableSyntaxHighlight = ref(false);  // Disabled - causes misalignment issues
    const showPreview = ref(true);  // Always visible by default for split-screen editing
    const showFieldGuide = ref(false);
    const previewHTML = ref('');
    const loadingPreview = ref(false);
    const previewError = ref('');
    const editorTextarea = ref(null);
    const lineNumbers = ref(null);
    const syntaxOverlay = ref(null);

    // Logo modal
    const showLogoModal = ref(false);
    const logoFileInput = ref(null);
    const logoPreview = ref('');
    const logoUrl = ref('');
    const logoMaxWidth = ref(200);
    const logoMaxHeight = ref(80);

    // Company details
    const companyName = ref('Your Company Name');
    const companyABN = ref('12 345 678 901');
    const companyAddress = ref('123 Business Street');
    const companyCity = ref('Building City');
    const companyState = ref('NSW');
    const companyPostcode = ref('2000');
    const companyPhone = ref('(02) 1234 5678');
    const companyEmail = ref('orders@company.com.au');

    // Search functionality
    const searchQuery = ref('');
    const searchMatches = ref([]);
    const currentMatchIndex = ref(0);

    // Variable Picker
    const showVariablePicker = ref(false);
    const variablePickerSearch = ref('');

    // Template Sections
    const showSectionsLibrary = ref(false);

    // For field guide
    const dbl = '{{';
    const dbr = '}}';

    // Computed
    const lineCount = computed(() => {
      return htmlContent.value.split('\n').length;
    });

    const hasChanges = computed(() => {
      return htmlContent.value !== originalContent.value;
    });

    const templateSections = computed(() => {
      // Parse the HTML to find major sections
      const sections = [];
      const lines = htmlContent.value.split('\n');

      lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmed = line.trim();

        // Look for HTML comments that mark sections
        if (trimmed.startsWith('<!-- ') && trimmed.endsWith(' -->')) {
          const comment = trimmed.slice(5, -4).trim();

          // Filter for section markers (exclude guide comments)
          if (!comment.includes('=====') &&
              !comment.includes('TEMPLATE STRUCTURE') &&
              comment.length < 60) {
            sections.push({ line: lineNum, name: comment });
          }
        }

        // Also look for major HTML sections
        if (trimmed.match(/<div class="(company-header|order-info|supplier-info|info-section|notes-section|totals-section|footer)"/)) {
          const match = trimmed.match(/class="([^"]+)"/);
          if (match) {
            const className = match[1].split(' ')[0];
            const name = className.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            sections.push({ line: lineNum, name });
          }
        }
      });

      return sections;
    });

    const highlightedCode = computed(() => {
      if (!enableSyntaxHighlight.value) return '';

      let code = htmlContent.value;

      // Escape HTML
      code = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Highlight Handlebars variables and helpers
      code = code.replace(/\{\{([^}]+)\}\}/g, (match) => {
        return `<span class="hbs-var">${match}</span>`;
      });

      // Highlight HTML tags
      code = code.replace(/&lt;(\/?[a-z][a-z0-9]*)/gi, (match, tag) => {
        return `<span class="html-tag">&lt;${tag}</span>`;
      });

      // Highlight HTML attributes
      code = code.replace(/([a-z-]+)=["']/gi, (match) => {
        return `<span class="html-attr">${match}</span>`;
      });

      // Highlight CSS comments
      code = code.replace(/(\/\*[\s\S]*?\*\/)/g, (match) => {
        return `<span class="comment">${match}</span>`;
      });

      // Highlight HTML comments
      code = code.replace(/(&lt;!--[\s\S]*?--&gt;)/g, (match) => {
        return `<span class="comment">${match}</span>`;
      });

      return code;
    });

    // Methods
    const loadTemplate = async () => {
      loading.value = true;
      error.value = '';

      try {
        const result = await api.poTemplates.loadHTML(props.templateId);

        if (result.success) {
          // Add helpful comments to the template
          let html = result.html;

          // Check if comments already exist
          if (!html.includes('TEMPLATE STRUCTURE GUIDE')) {
            html = addTemplateComments(html);
          }

          htmlContent.value = html;
          originalContent.value = html;
          templatePath.value = result.path || 'Unknown';

          // Load initial preview if enabled
          if (showPreview.value) {
            await refreshPreview();
          }
        } else {
          error.value = result.message || 'Failed to load template HTML';
        }
      } catch (err) {
        console.error('Error loading template HTML:', err);
        error.value = err.message || 'Failed to load template HTML';
      } finally {
        loading.value = false;
      }
    };

    const addTemplateComments = (html) => {
      // Don't add comments if they already exist
      if (html.includes('TEMPLATE STRUCTURE GUIDE')) {
        return html;
      }

      // Add a comprehensive guide at the top (after opening <body> tag)
      // Note: Escape Handlebars syntax in comments to prevent parsing errors
      const guideComment = `
<!--
================================================================================
TEMPLATE STRUCTURE GUIDE - Classic Purchase Order
================================================================================

AVAILABLE FIELDS: (Use double curly braces around field names)
-----------------
Order Information:
  OrderNumber           - Full order number (e.g., "1483/250.1")
  OrderDate             - Order date (use with formatDate helper)
  DelDate               - Delivery date (NEW - use with formatDate helper)
  JobNo                 - Job number
  JobName               - Job name/description
  Client                - Client name
  CostCentre            - Cost centre code
  CostCentreName        - Cost centre name

Site Address (NEW FIELDS):
  SiteStreet            - Site street address
  SiteSuburb            - Site suburb
  SiteState             - Site state

Site Supervisor (NEW FIELDS):
  Supervisor            - Supervisor name
  SupervisorPhone       - Supervisor phone number
  SupervisorMobile      - Supervisor mobile number

Supplier Information:
  SupplierName          - Supplier name
  AccountContact        - Supplier contact person (NEW)
  AccountPhone          - Supplier phone (NEW)
  AccountEmail          - Supplier email (NEW)
  AccountAddress        - Supplier street address (NEW)
  AccountCity           - Supplier city (NEW)
  AccountState          - Supplier state (NEW)
  AccountPostcode       - Supplier postcode (NEW)

Special Instructions:
  SpecialInstructions   - Order special instructions (NEW - from Orders.Note)

Line Items (use #each items helper):
  ItemCode              - Item code
  Description           - Item description
  Quantity              - Item quantity
  Unit                  - Unit of measure
  UnitPrice             - Unit price
  LineTotal             - Line total
  Workup                - Extended description/workup
  SupplierReference     - Supplier's reference code

Totals:
  SubTotal              - Order subtotal
  GSTAmount             - GST amount
  GrandTotal            - Grand total

HANDLEBARS HELPERS:
-------------------
  formatDate date       - Format date as DD/MM/YYYY
  formatNumber num      - Format number with commas
  currency amount       - Format as currency ($1,234.56)

CONDITIONAL SECTIONS (use #if helper):
---------------------
  customizations.sections.showJobDetails
  customizations.sections.showSupplierAddress
  customizations.sections.showNotes

================================================================================
-->
`;

      return html.replace(/<body>/, `<body>\n${guideComment}`);
    };

    const onContentChange = () => {
      console.log('✓ onContentChange fired, content length:', htmlContent.value.length);

      // Auto-refresh preview on change (debounced)
      if (showPreview.value) {
        clearTimeout(onContentChange.timer);
        onContentChange.timer = setTimeout(() => {
          refreshPreview();
        }, 1000);
      }
    };

    const syncLineNumbers = () => {
      if (editorTextarea.value && lineNumbers.value) {
        lineNumbers.value.scrollTop = editorTextarea.value.scrollTop;
      }
    };

    const syncScroll = () => {
      if (editorTextarea.value) {
        // Sync line numbers
        if (lineNumbers.value) {
          lineNumbers.value.scrollTop = editorTextarea.value.scrollTop;
        }
        // Sync syntax overlay
        if (enableSyntaxHighlight.value && syntaxOverlay.value) {
          syntaxOverlay.value.scrollTop = editorTextarea.value.scrollTop;
          syntaxOverlay.value.scrollLeft = editorTextarea.value.scrollLeft;
        }
      }
    };

    const syncEditorScroll = (e) => {
      if (editorTextarea.value) {
        editorTextarea.value.scrollTop = e.target.scrollTop;
      }
    };

    const formatCode = () => {
      try {
        let formatted = htmlContent.value;
        formatted = formatted.replace(/>\s+</g, '>\n<');

        const lines = formatted.split('\n');
        let indent = 0;
        const indentedLines = lines.map(line => {
          const trimmed = line.trim();
          if (!trimmed) return '';

          if (trimmed.startsWith('</')) {
            indent = Math.max(0, indent - 1);
          }

          const indentedLine = '  '.repeat(indent) + trimmed;

          if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>') && !trimmed.startsWith('<!--')) {
            indent++;
          }

          return indentedLine;
        });

        htmlContent.value = indentedLines.join('\n');
      } catch (err) {
        console.error('Error formatting code:', err);
      }
    };

    const togglePreview = () => {
      showPreview.value = !showPreview.value;
      if (showPreview.value) {
        refreshPreview();
      }
    };

    const refreshPreview = async () => {
      loadingPreview.value = true;
      previewError.value = '';

      try {
        // Add line markers to the template before rendering
        const markedHTML = addLineMarkers(htmlContent.value);

        // Render the template with sample data using backend
        const result = await api.poTemplates.previewCustomHTML(markedHTML);

        if (result.success) {
          previewHTML.value = result.html;

          // Add click handlers after DOM updates - use longer delay to ensure v-html has rendered
          await nextTick();
          setTimeout(() => {
            attachPreviewClickHandlers();
          }, 100);
        } else {
          previewError.value = result.message || 'Failed to render preview';
        }
      } catch (err) {
        console.error('Error refreshing preview:', err);
        previewError.value = err.message || 'Failed to render preview';
      } finally {
        loadingPreview.value = false;
      }
    };

    const addLineMarkers = (html) => {
      // Add data-line attributes to major sections
      const lines = html.split('\n');
      return lines.map((line, index) => {
        const lineNum = index + 1;
        const trimmed = line.trim();

        // Add markers to div elements with major classes
        if (trimmed.match(/<div class="(company-header|order-info|supplier-info|info-section|info-box|notes-section|totals-section|footer)"/)) {
          return line.replace(/<div class="([^"]+)"/, `<div class="$1" data-source-line="${lineNum}" style="cursor: pointer;" title="Click to edit this section"`);
        }

        // Add markers to section comments
        if (trimmed.startsWith('<!-- ') && !trimmed.includes('=====')) {
          return `${line}\n<span data-source-line="${lineNum}" style="display:none;"></span>`;
        }

        return line;
      }).join('\n');
    };

    const attachPreviewClickHandlers = () => {
      const previewFrame = document.querySelector('.preview-frame');
      if (!previewFrame) {
        console.warn('Preview frame not found');
        return;
      }

      // Find all elements with data-source-line attribute
      const clickableElements = previewFrame.querySelectorAll('[data-source-line]');
      console.log(`Found ${clickableElements.length} clickable elements in preview`);

      clickableElements.forEach((element, index) => {
        const lineNumber = element.getAttribute('data-source-line');
        console.log(`Element ${index}: line ${lineNumber}, tag: ${element.tagName}`);

        element.addEventListener('click', (e) => {
          console.log(`Clicked on line ${lineNumber}`);
          if (lineNumber) {
            jumpToSection(lineNumber);
            e.stopPropagation();
            e.preventDefault();
          }
        });

        // Add hover effect
        element.addEventListener('mouseenter', () => {
          element.style.outline = '2px dashed #0066cc';
          element.style.outlineOffset = '2px';
          element.style.backgroundColor = 'rgba(0, 102, 204, 0.05)';
        });

        element.addEventListener('mouseleave', () => {
          element.style.outline = '';
          element.style.outlineOffset = '';
          element.style.backgroundColor = '';
        });
      });
    };

    const revertChanges = () => {
      if (confirm('Are you sure you want to revert all changes?')) {
        htmlContent.value = originalContent.value;
        if (showPreview.value) {
          refreshPreview();
        }
      }
    };

    const saveTemplate = async () => {
      if (!hasChanges.value) {
        console.warn('No changes to save');
        alert('No changes to save');
        return;
      }

      console.log('Starting template save...');
      console.log('Template ID:', props.templateId);
      console.log('Content length:', htmlContent.value.length);

      saving.value = true;

      try {
        const result = await api.poTemplates.update(props.templateId, {
          html: htmlContent.value
        });

        console.log('Save result:', result);

        if (result.success) {
          originalContent.value = htmlContent.value;
          emit('saved');
          console.log('Template saved successfully');
          alert('Template saved successfully!');
        } else {
          const errorMsg = 'Failed to save template: ' + (result.message || 'Unknown error');
          console.error(errorMsg);
          alert(errorMsg);
        }
      } catch (err) {
        console.error('Error saving template:', err);
        console.error('Error stack:', err.stack);
        alert('Error saving template: ' + err.message + '\n\nCheck console for details.');
      } finally {
        saving.value = false;
      }
    };

    const closeModal = () => {
      if (hasChanges.value) {
        if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
          return;
        }
      }
      emit('close');
    };

    const jumpToSection = (lineNumber) => {
      if (!lineNumber || !editorTextarea.value) {
        console.warn('Cannot jump: missing lineNumber or editor');
        return;
      }

      const targetLine = parseInt(lineNumber);
      console.log(`Jumping to line ${targetLine}`);

      const lines = htmlContent.value.split('\n');
      const totalLines = lines.length;

      // Get actual line height from computed styles
      const lineHeight = 19.5; // 13px font-size * 1.5 line-height
      const editorHeight = editorTextarea.value.clientHeight;

      // Calculate position to center the target line
      // Position = (line number - 1) * line height - (viewport height / 3) to show it in upper third
      const targetPosition = (targetLine - 1) * lineHeight;
      const scrollTop = Math.max(0, targetPosition - editorHeight / 3);

      console.log(`Line ${targetLine} of ${totalLines}`);
      console.log(`Target position: ${targetPosition}px, Scroll to: ${scrollTop}px`);
      console.log(`Editor height: ${editorHeight}px, Line height: ${lineHeight}px`);

      // Scroll the editor with smooth behavior
      editorTextarea.value.scrollTop = scrollTop;

      // Also scroll line numbers and syntax overlay
      if (lineNumbers.value) {
        lineNumbers.value.scrollTop = scrollTop;
      }
      if (syntaxOverlay.value) {
        syntaxOverlay.value.scrollTop = scrollTop;
      }

      // Wait for scroll to complete before highlighting
      setTimeout(() => {
        // Highlight the target lines (show 12 lines total: 2 before, target line, 9 after)
        highlightLines(Math.max(1, targetLine - 2), Math.min(totalLines, targetLine + 9));

        console.log(`Final scroll position: ${editorTextarea.value.scrollTop}px`);
      }, 50);

      // Focus the editor
      editorTextarea.value.focus();

      // Reset the dropdown
      nextTick(() => {
        const select = document.querySelector('select[title="Jump to Section"]');
        if (select) select.value = '';
      });
    };

    const highlightLines = (startLine, endLine) => {
      if (!editorTextarea.value) {
        console.warn('No editor textarea found');
        return;
      }

      // Remove any existing highlights and their timers
      const existingHighlights = document.querySelectorAll('.line-highlight');
      existingHighlights.forEach(el => {
        if (el.dataset.removeTimer) {
          clearTimeout(parseInt(el.dataset.removeTimer));
        }
        el.remove();
      });

      const lineHeight = 19.5;
      // Adjust top position to account for editor padding
      const topPosition = Math.max(0, startLine - 1) * lineHeight;

      console.log(`Highlighting lines ${startLine} to ${endLine}, top: ${topPosition}px`);

      // Create highlight with bright, visible styling
      // IMPORTANT: z-index must be 0 (below textarea which is z-index 2) to not block editing
      const highlight = document.createElement('div');
      highlight.className = 'line-highlight';
      highlight.style.cssText = `
        position: absolute;
        left: ${showLineNumbers.value ? '50px' : '0'};
        right: 12px;
        top: ${topPosition}px;
        height: ${(endLine - startLine + 1) * lineHeight}px;
        background-color: rgba(255, 255, 0, 0.5);
        border: 3px solid #FFA500;
        border-radius: 4px;
        pointer-events: none;
        z-index: 0;
        box-shadow: 0 0 20px rgba(255, 215, 0, 0.9);
      `;

      // Insert into the editor wrapper (parent of textarea)
      const editorWrapper = editorTextarea.value.parentElement;
      if (!editorWrapper) {
        console.error('Editor wrapper not found');
        return;
      }

      editorWrapper.appendChild(highlight);

      console.log('Highlight element created and appended');
      console.log('Highlight in DOM:', document.body.contains(highlight));
      console.log('Highlight computed styles:', window.getComputedStyle(highlight).backgroundColor);

      // Keep highlight for 5 seconds with explicit timer
      const timerId = setTimeout(() => {
        console.log('Timer executing, checking if highlight still exists...');
        if (highlight && highlight.parentElement) {
          console.log('Removing highlight after 5s');
          highlight.remove();
        } else {
          console.log('Highlight already removed');
        }
      }, 5000);

      // Store timer ID
      highlight.dataset.removeTimer = String(timerId);
      console.log(`Timer ${timerId} set for 5 seconds`);
    };

    const closeLogoModal = async () => {
      // Save company details before closing
      await saveCompanyDetails();

      showLogoModal.value = false;

      // Return focus to editor after modal closes
      nextTick(() => {
        if (editorTextarea.value) {
          editorTextarea.value.focus();
          console.log('Focus returned to editor after closing logo modal');
        }
      });
    };

    const handleLogoUpload = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      // Check file size (500KB limit)
      if (file.size > 500 * 1024) {
        alert('File size too large. Please use an image under 500KB.');
        return;
      }

      // Read file and convert to Base64
      const reader = new FileReader();
      reader.onload = (e) => {
        logoPreview.value = e.target.result;
        logoUrl.value = ''; // Clear URL if file uploaded
        console.log('Logo uploaded and converted to Base64');
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        alert('Error reading file. Please try again.');
      };
      reader.readAsDataURL(file);
    };

    const insertLogo = async () => {
      const src = logoPreview.value || logoUrl.value;

      // Warn about external URLs and CSP restrictions (only if using external URL)
      if (logoUrl.value && !logoPreview.value && !logoUrl.value.startsWith('data:')) {
        const proceed = confirm(
          'WARNING: External image URLs may not display due to Content Security Policy restrictions.\n\n' +
          'For best results, please upload your logo image instead, which will be automatically converted to Base64 format.\n\n' +
          'Do you want to continue anyway?'
        );
        if (!proceed) return;
      }

      // Build company details HTML
      const companyDetailsLines = [];
      if (companyABN.value) companyDetailsLines.push(`<p style="margin: 5px 0 0 0; color: #666;">ABN: ${companyABN.value}</p>`);
      if (companyAddress.value) companyDetailsLines.push(`<p style="margin: 5px 0 0 0; color: #666;">${companyAddress.value}</p>`);

      // Build city/state/postcode line
      const locationParts = [];
      if (companyCity.value) locationParts.push(companyCity.value);
      if (companyState.value) locationParts.push(companyState.value);
      if (companyPostcode.value) locationParts.push(companyPostcode.value);
      if (locationParts.length > 0) {
        companyDetailsLines.push(`<p style="margin: 5px 0 0 0; color: #666;">${locationParts.join(', ')}</p>`);
      }

      if (companyPhone.value) companyDetailsLines.push(`<p style="margin: 5px 0 0 0; color: #666;">Phone: ${companyPhone.value}</p>`);
      if (companyEmail.value) companyDetailsLines.push(`<p style="margin: 5px 0 0 0; color: #666;">Email: ${companyEmail.value}</p>`);

      // Generate company header HTML code with proper styling
      const logoHTML = `
    <div class="company-header" style="display: flex; align-items: center; justify-content: space-between; padding: 20px; margin-bottom: 20px; border-bottom: 2px solid #003366;">
      ${src ? `<div class="logo-container" style="flex: 0 0 auto;">
        <img
          src="${src}"
          alt="Company Logo"
          style="max-width: ${logoMaxWidth.value}px; max-height: ${logoMaxHeight.value}px; width: auto; height: auto; object-fit: contain; display: block;"
        />
      </div>` : ''}
      <div class="company-info" style="flex: 1; text-align: right; ${src ? 'margin-left: 20px;' : ''}">
        <h1 style="margin: 0; color: #003366; font-size: 24px;">${companyName.value}</h1>
        ${companyDetailsLines.join('\n        ')}
      </div>
    </div>
`;

      // Find where to insert (after <body> tag or replace existing header)
      let updatedHTML = htmlContent.value;

      // Check if there's already a company-header
      if (updatedHTML.includes('class="company-header"')) {
        if (confirm('Replace existing company header with new logo?')) {
          // Find and replace the entire company-header div
          const headerRegex = /<div class="company-header">[\s\S]*?<\/div>\s*<\/div>/;
          updatedHTML = updatedHTML.replace(headerRegex, logoHTML.trim());
        } else {
          return;
        }
      } else {
        // Insert after opening body tag
        const bodyMatch = updatedHTML.match(/<body[^>]*>/);
        if (bodyMatch) {
          const insertPos = updatedHTML.indexOf(bodyMatch[0]) + bodyMatch[0].length;
          // Skip any guide comments
          let afterBody = updatedHTML.substring(insertPos);
          const guideEnd = afterBody.indexOf('-->');
          if (guideEnd !== -1 && afterBody.substring(0, guideEnd).includes('TEMPLATE STRUCTURE GUIDE')) {
            // Insert after guide
            const realInsertPos = insertPos + guideEnd + 3;
            updatedHTML = updatedHTML.substring(0, realInsertPos) + '\n\n' + logoHTML + updatedHTML.substring(realInsertPos);
          } else {
            updatedHTML = updatedHTML.substring(0, insertPos) + '\n\n' + logoHTML + updatedHTML.substring(insertPos);
          }
        }
      }

      htmlContent.value = updatedHTML;

      // Save company details before closing
      await saveCompanyDetails();

      // Close modal (keep logo and company details for next time)
      showLogoModal.value = false;

      // Refresh preview if open
      if (showPreview.value) {
        refreshPreview();
      }

      // Return focus to the editor textarea after closing modal
      nextTick(() => {
        if (editorTextarea.value) {
          editorTextarea.value.focus();
          console.log('Focus returned to editor after logo insertion');
        }
      });

      alert('Company header inserted successfully! Scroll to the top to see it.');
    };

    const searchCode = () => {
      if (!searchQuery.value.trim()) {
        alert('Please enter a search term');
        return;
      }

      const query = searchQuery.value.toLowerCase();
      const lines = htmlContent.value.split('\n');
      const matches = [];

      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(query)) {
          matches.push(index + 1);
        }
      });

      searchMatches.value = matches;
      currentMatchIndex.value = 0;

      if (matches.length > 0) {
        jumpToSection(matches[0]);
        console.log(`Found ${matches.length} matches for "${searchQuery.value}"`);

        // Show match count in temporary notification
        const notification = document.createElement('div');
        notification.textContent = `Found ${matches.length} match${matches.length > 1 ? 'es' : ''}`;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.padding = '10px 20px';
        notification.style.backgroundColor = '#28a745';
        notification.style.color = 'white';
        notification.style.borderRadius = '4px';
        notification.style.zIndex = '9999';
        notification.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        document.body.appendChild(notification);

        setTimeout(() => {
          notification.remove();
        }, 2000);
      } else {
        alert(`No matches found for "${searchQuery.value}"`);
      }
    };

    const searchNext = () => {
      if (searchMatches.value.length === 0) return;

      currentMatchIndex.value = (currentMatchIndex.value + 1) % searchMatches.value.length;
      jumpToSection(searchMatches.value[currentMatchIndex.value]);
      console.log(`Match ${currentMatchIndex.value + 1} of ${searchMatches.value.length}`);
    };

    const searchPrevious = () => {
      if (searchMatches.value.length === 0) return;

      currentMatchIndex.value = currentMatchIndex.value === 0
        ? searchMatches.value.length - 1
        : currentMatchIndex.value - 1;
      jumpToSection(searchMatches.value[currentMatchIndex.value]);
      console.log(`Match ${currentMatchIndex.value + 1} of ${searchMatches.value.length}`);
    };

    // Watch for settings changes
    watch(showLineNumbers, async () => {
      await nextTick();
      syncLineNumbers();
    });

    // Load saved company details from preferences
    const loadCompanyDetails = async () => {
      try {
        const result = await api.preferences.get('companyDetails');
        if (result.success && result.value) {
          const saved = result.value;
          if (saved.companyName) companyName.value = saved.companyName;
          if (saved.companyABN) companyABN.value = saved.companyABN;
          if (saved.companyAddress) companyAddress.value = saved.companyAddress;
          if (saved.companyCity) companyCity.value = saved.companyCity;
          if (saved.companyState) companyState.value = saved.companyState;
          if (saved.companyPostcode) companyPostcode.value = saved.companyPostcode;
          if (saved.companyPhone) companyPhone.value = saved.companyPhone;
          if (saved.companyEmail) companyEmail.value = saved.companyEmail;
          if (saved.logo) logoPreview.value = saved.logo;
          console.log('✓ Loaded saved company details from preferences');
        }
      } catch (err) {
        console.error('Error loading company details:', err);
      }
    };

    // Save company details to preferences
    const saveCompanyDetails = async () => {
      try {
        const companyDetails = {
          companyName: companyName.value,
          companyABN: companyABN.value,
          companyAddress: companyAddress.value,
          companyCity: companyCity.value,
          companyState: companyState.value,
          companyPostcode: companyPostcode.value,
          companyPhone: companyPhone.value,
          companyEmail: companyEmail.value,
          logo: logoPreview.value
        };
        await api.preferences.set('companyDetails', companyDetails);
        console.log('✓ Saved company details to preferences');
      } catch (err) {
        console.error('Error saving company details:', err);
      }
    };

    // Lifecycle
    onMounted(() => {
      loadTemplate();
      loadCompanyDetails();

      // Diagnostic check
      nextTick(() => {
        if (editorTextarea.value) {
          console.log('=== EDITOR DIAGNOSTIC ===');
          console.log('Textarea element:', editorTextarea.value);
          console.log('Readonly:', editorTextarea.value.readOnly);
          console.log('Disabled:', editorTextarea.value.disabled);
          console.log('TabIndex:', editorTextarea.value.tabIndex);
          console.log('Computed z-index:', window.getComputedStyle(editorTextarea.value).zIndex);
          console.log('Computed pointer-events:', window.getComputedStyle(editorTextarea.value).pointerEvents);
          console.log('Computed user-select:', window.getComputedStyle(editorTextarea.value).userSelect);
          console.log('=========================');
        }
      });
    });

    return {
      loading,
      saving,
      error,
      htmlContent,
      templatePath,
      showLineNumbers,
      enableSyntaxHighlight,
      showPreview,
      showFieldGuide,
      previewHTML,
      loadingPreview,
      previewError,
      editorTextarea,
      lineNumbers,
      syntaxOverlay,
      lineCount,
      hasChanges,
      templateSections,
      highlightedCode,
      dbl,
      dbr,
      onContentChange,
      syncLineNumbers,
      syncScroll,
      syncEditorScroll,
      formatCode,
      togglePreview,
      refreshPreview,
      revertChanges,
      saveTemplate,
      closeModal,
      jumpToSection,
      showLogoModal,
      logoFileInput,
      logoPreview,
      logoUrl,
      logoMaxWidth,
      logoMaxHeight,
      companyName,
      companyABN,
      companyAddress,
      companyCity,
      companyState,
      companyPostcode,
      companyPhone,
      companyEmail,
      closeLogoModal,
      handleLogoUpload,
      insertLogo,
      searchQuery,
      searchMatches,
      currentMatchIndex,
      searchCode,
      searchNext,
      searchPrevious
    };
  }
};
</script>

<style scoped>
.modal {
  background: rgba(0, 0, 0, 0.5);
  z-index: 1055;
}

.modal-backdrop {
  z-index: 1050;
}

.toolbar {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.field-guide {
  max-height: 200px;
  overflow-y: auto;
}

.field-guide code {
  font-size: 11px;
  background: #fff;
  padding: 1px 4px;
  border-radius: 2px;
}

/* Split Screen Layout */
.editor-panel, .preview-panel {
  transition: width 0.3s ease;
}

.full-width {
  width: 100%;
}

.split-width {
  width: 50%;
}

/* Editor */
.editor-container {
  background: #1e1e1e;
  height: 100%;
  overflow: hidden;
}

.editor-wrapper {
  display: flex;
  height: 100%;
  position: relative;
}

.line-numbers {
  background: #252525;
  color: #858585;
  padding: 10px 5px;
  text-align: right;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  user-select: none;
  overflow-y: hidden;
  min-width: 50px;
  border-right: 1px solid #3e3e3e;
}

.line-number {
  padding-right: 10px;
}

.html-editor {
  flex: 1;
  width: 100%;
  height: 100%;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  border: none;
  outline: none;
  padding: 10px;
  resize: none;
  tab-size: 2;
  overflow-x: auto;
  overflow-y: scroll;
  white-space: pre;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
}

.html-editor.with-line-numbers {
  left: 50px;
}

.html-editor.with-highlight {
  /* REMOVED: color: transparent; - Users need to see text while typing! */
  /* Syntax highlighting overlay provides colors, but base text should be visible */
  color: #d4d4d4;  /* Make text visible instead of transparent */
  caret-color: #d4d4d4;
  background: transparent;
}

.html-editor::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

.html-editor::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.html-editor::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 6px;
}

.html-editor::-webkit-scrollbar-thumb:hover {
  background: #4e4e4e;
}

.syntax-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 10px;
  margin: 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre;
  overflow: hidden;
  pointer-events: none;
  color: #d4d4d4;
  background: #1e1e1e;
  z-index: 1;
}

.syntax-overlay.with-line-numbers {
  left: 50px;
}

/* Syntax Highlighting Colors */
.syntax-overlay :deep(.html-tag) {
  color: #569cd6;
}

.syntax-overlay :deep(.html-attr) {
  color: #9cdcfe;
}

.syntax-overlay :deep(.hbs-var) {
  color: #ce9178;
  font-weight: bold;
}

.syntax-overlay :deep(.comment) {
  color: #6a9955;
  font-style: italic;
}

/* Preview */
.preview-container {
  height: calc(100% - 45px);
  overflow-y: auto;
  background: #f5f5f5;
  padding: 20px;
}

.preview-frame {
  background: white;
  min-height: 100%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.preview-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  flex-direction: column;
}

.info-bar {
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
}

.info-bar code {
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
