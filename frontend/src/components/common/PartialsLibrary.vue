<template>
  <div class="modal fade show d-block" tabindex="-1" @click.self="closeModal">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <!-- Header -->
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-puzzle me-2"></i>
            Template Partials Library
          </h5>
          <button type="button" class="btn-close" @click="closeModal"></button>
        </div>

        <!-- Body -->
        <div class="modal-body">
          <!-- Info Banner -->
          <div class="alert alert-info mb-3">
            <i class="bi bi-info-circle me-2"></i>
            <strong>Template Partials</strong> are reusable template fragments that can be included across multiple Purchase Order templates.
            Use <code>&lbrace;&lbrace;&gt; partialName&rbrace;&rbrace;</code> in your templates to include a partial.
          </div>

          <!-- Create/Edit Section -->
          <div class="card mb-3">
            <div class="card-body">
              <h6 class="card-title">
                <i class="bi bi-plus-circle me-2"></i>
                {{ editingPartial ? 'Edit Partial' : 'Create New Partial' }}
              </h6>

              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Partial Name *</label>
                  <input
                    v-model="partialForm.name"
                    type="text"
                    class="form-control"
                    placeholder="e.g., header, footer, lineItem"
                    :disabled="!!editingPartial"
                    maxlength="50"
                  />
                  <small class="text-muted">
                    Use this name in templates: <code>&lbrace;&lbrace;&gt; partialName&rbrace;&rbrace;</code>
                  </small>
                </div>

                <div class="col-md-6">
                  <label class="form-label">Category</label>
                  <select v-model="partialForm.category" class="form-select">
                    <option value="header">Header</option>
                    <option value="footer">Footer</option>
                    <option value="lineItem">Line Item</option>
                    <option value="section">Section</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div class="col-12">
                  <label class="form-label">Description</label>
                  <input
                    v-model="partialForm.description"
                    type="text"
                    class="form-control"
                    placeholder="Brief description of this partial"
                    maxlength="200"
                  />
                </div>

                <div class="col-12">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <label class="form-label mb-0">Content (Handlebars HTML) *</label>
                    <div class="dropdown">
                      <button
                        class="btn btn-sm btn-outline-secondary dropdown-toggle"
                        type="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false">
                        <i class="bi bi-code-square me-1"></i>
                        Insert Snippet
                      </button>
                      <ul class="dropdown-menu dropdown-menu-end" style="max-height: 400px; overflow-y: auto;">
                        <li><h6 class="dropdown-header">Variables</h6></li>
                        <li><a class="dropdown-item font-monospace small" href="#" @click.prevent="insertSnippet(snippets.companyName)">&lbrace;&lbrace;companyName&rbrace;&rbrace;</a></li>
                        <li><a class="dropdown-item font-monospace small" href="#" @click.prevent="insertSnippet(snippets.orderNumber)">&lbrace;&lbrace;orderNumber&rbrace;&rbrace;</a></li>
                        <li><a class="dropdown-item font-monospace small" href="#" @click.prevent="insertSnippet(snippets.orderDate)">&lbrace;&lbrace;orderDate&rbrace;&rbrace;</a></li>
                        <li><a class="dropdown-item font-monospace small" href="#" @click.prevent="insertSnippet(snippets.jobNo)">&lbrace;&lbrace;jobNo&rbrace;&rbrace;</a></li>
                        <li><a class="dropdown-item font-monospace small" href="#" @click.prevent="insertSnippet(snippets.supplierName)">&lbrace;&lbrace;supplierName&rbrace;&rbrace;</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><h6 class="dropdown-header">Conditionals</h6></li>
                        <li><a class="dropdown-item font-monospace small" href="#" @click.prevent="insertSnippet(snippets.ifBlock)">&lbrace;&lbrace;#if&rbrace;&rbrace; block</a></li>
                        <li><a class="dropdown-item font-monospace small" href="#" @click.prevent="insertSnippet(snippets.ifElse)">&lbrace;&lbrace;#if&rbrace;&rbrace; with &lbrace;&lbrace;else&rbrace;&rbrace;</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><h6 class="dropdown-header">Loops</h6></li>
                        <li><a class="dropdown-item font-monospace small" href="#" @click.prevent="insertSnippet(snippets.eachLoop)">&lbrace;&lbrace;#each&rbrace;&rbrace; loop</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><h6 class="dropdown-header">Partials</h6></li>
                        <li><a class="dropdown-item font-monospace small" href="#" @click.prevent="insertSnippet(snippets.partial)">&lbrace;&lbrace;&gt; partial&rbrace;&rbrace;</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><h6 class="dropdown-header">HTML Structures</h6></li>
                        <li><a class="dropdown-item font-monospace small" href="#" @click.prevent="insertSnippet(snippets.headerDiv)">Header div</a></li>
                        <li><a class="dropdown-item font-monospace small" href="#" @click.prevent="insertSnippet(snippets.tableStructure)">Table structure</a></li>
                      </ul>
                    </div>
                  </div>
                  <textarea
                    ref="contentTextarea"
                    v-model="partialForm.content"
                    class="form-control font-monospace"
                    :class="{ 'border-danger': validationErrors.some(e => e.type === 'error'), 'border-warning': validationErrors.some(e => e.type === 'warning') && !validationErrors.some(e => e.type === 'error') }"
                    rows="8"
                    placeholder="Enter Handlebars template code here..."
                    @input="validateHandlebars(partialForm.content)"
                  ></textarea>

                  <!-- Validation Messages -->
                  <div v-if="validationErrors.length > 0" class="mt-2">
                    <div
                      v-for="(error, index) in validationErrors"
                      :key="index"
                      class="alert py-2 px-3 mb-2"
                      :class="error.type === 'error' ? 'alert-danger' : 'alert-warning'">
                      <i :class="error.type === 'error' ? 'bi-exclamation-triangle-fill' : 'bi-exclamation-circle-fill'" class="me-2"></i>
                      <strong>{{ error.type === 'error' ? 'Error' : 'Warning' }}:</strong> {{ error.message }}
                    </div>
                  </div>

                  <small class="text-muted">
                    You can use all Handlebars syntax, including variables, helpers, and nested partials. Use the "Insert Snippet" button above for common patterns.
                  </small>
                </div>

                <div class="col-12">
                  <button
                    class="btn btn-primary me-2"
                    @click="savePartialForm"
                    :disabled="!partialForm.name || !partialForm.content">
                    <i class="bi bi-save me-1"></i>
                    {{ editingPartial ? 'Update' : 'Create' }} Partial
                  </button>
                  <button
                    v-if="editingPartial"
                    class="btn btn-secondary"
                    @click="cancelEdit">
                    <i class="bi bi-x me-1"></i>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Filter and Stats -->
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div class="btn-group" role="group">
              <button
                v-for="category in categories"
                :key="category.value"
                class="btn btn-sm"
                :class="selectedCategory === category.value ? 'btn-primary' : 'btn-outline-primary'"
                @click="selectedCategory = category.value">
                <i :class="category.icon" class="me-1"></i>
                {{ category.label }}
                <span v-if="getCategoryCount(category.value)" class="badge bg-light text-dark ms-1">
                  {{ getCategoryCount(category.value) }}
                </span>
              </button>
            </div>

            <div class="d-flex gap-2">
              <button
                v-if="partials.length === 0"
                class="btn btn-sm btn-success"
                @click="loadExamples"
                title="Load example partials (headers, footers, line items)">
                <i class="bi bi-lightbulb me-1"></i>
                Load Examples
              </button>
              <button
                v-if="partials.length > 0"
                class="btn btn-sm btn-danger"
                @click="clearAllPartials"
                title="Clear all partials (allows re-seeding with new examples)">
                <i class="bi bi-trash me-1"></i>
                Clear All
              </button>
              <button
                class="btn btn-sm btn-outline-secondary"
                @click="exportAll"
                :disabled="partials.length === 0"
                title="Export all partials as JSON">
                <i class="bi bi-download me-1"></i>
                Export
              </button>
              <button
                class="btn btn-sm btn-outline-secondary"
                @click="triggerImport"
                title="Import partials from JSON">
                <i class="bi bi-upload me-1"></i>
                Import
              </button>
              <input
                ref="importInput"
                type="file"
                accept=".json"
                class="d-none"
                @change="handleImport"
              />
            </div>
          </div>

          <!-- Partials Grid -->
          <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary"></div>
            <p class="mt-2 text-muted">Loading partials...</p>
          </div>

          <div v-else-if="filteredPartials.length === 0" class="text-center py-5 text-muted">
            <i class="bi bi-inbox fs-1"></i>
            <p class="mt-2">No partials found</p>
            <small>Create your first reusable partial above</small>
          </div>

          <div v-else class="partials-grid">
            <div
              v-for="partial in filteredPartials"
              :key="partial.id"
              class="partial-card card">
              <!-- Partial Header -->
              <div class="card-header d-flex justify-content-between align-items-center">
                <div>
                  <h6 class="mb-0">
                    <i :class="getCategoryIcon(partial.category)" class="me-1 text-muted"></i>
                    {{ partial.name }}
                  </h6>
                  <small class="text-muted">{{ partial.description || 'No description' }}</small>
                </div>
                <span class="badge bg-secondary">{{ partial.category }}</span>
              </div>

              <!-- Partial Preview -->
              <div class="card-body">
                <div class="code-preview">
                  <code class="text-muted small">{{ getPreview(partial) }}</code>
                </div>
                <div class="mt-2">
                  <small class="text-muted">
                    <i class="bi bi-code-square me-1"></i>
                    {{ partial.contentLength }} characters
                  </small>
                </div>
              </div>

              <!-- Partial Actions -->
              <div class="card-footer">
                <div class="btn-group btn-group-sm w-100">
                  <button
                    class="btn btn-outline-secondary"
                    @click="copyReference(partial)"
                    title="Copy include reference">
                    <i class="bi bi-code-square"></i>
                    Reference
                  </button>
                  <button
                    class="btn btn-outline-primary"
                    @click="editPartial(partial)"
                    title="Edit partial">
                    <i class="bi bi-pencil"></i>
                    Edit
                  </button>
                  <button
                    class="btn btn-outline-info"
                    @click="viewPartial(partial)"
                    title="View full content">
                    <i class="bi bi-eye"></i>
                    View
                  </button>
                  <button
                    class="btn btn-outline-danger"
                    @click="deletePartialConfirm(partial.id)"
                    title="Delete">
                    <i class="bi bi-trash"></i>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer d-flex justify-content-between">
          <div v-if="stats" class="text-muted small">
            <i class="bi bi-info-circle me-1"></i>
            {{ stats.total }} total partials
          </div>
          <button type="button" class="btn btn-secondary" @click="closeModal">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>

  <!-- View Partial Modal -->
  <div
    v-if="viewingPartial"
    class="modal fade show d-block"
    tabindex="-1"
    @click.self="viewingPartial = null"
    style="z-index: 1060;">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-eye me-2"></i>
            View Partial: {{ viewingPartial.name }}
          </h5>
          <button type="button" class="btn-close" @click="viewingPartial = null"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <strong>Description:</strong> {{ viewingPartial.description || 'No description' }}
          </div>
          <div class="mb-3">
            <strong>Category:</strong> <span class="badge bg-secondary">{{ viewingPartial.category }}</span>
          </div>

          <!-- Tabs for Code and Preview -->
          <ul class="nav nav-tabs mb-3" role="tablist">
            <li class="nav-item">
              <button
                class="nav-link active"
                data-bs-toggle="tab"
                type="button"
                @click="viewTab = 'code'">
                <i class="bi bi-code-slash me-1"></i>
                Source Code
              </button>
            </li>
            <li class="nav-item">
              <button
                class="nav-link"
                data-bs-toggle="tab"
                type="button"
                @click="viewTab = 'preview'">
                <i class="bi bi-eye me-1"></i>
                Rendered Preview
              </button>
            </li>
          </ul>

          <div v-if="viewTab === 'code'">
            <strong>Template Code:</strong>
            <pre class="bg-light p-3 rounded mt-2 code-block"><code>{{ viewingPartial.content }}</code></pre>
          </div>

          <div v-else-if="viewTab === 'preview'">
            <strong>Preview with Sample Data:</strong>
            <div class="alert alert-info small mt-2">
              <i class="bi bi-info-circle me-1"></i>
              This preview uses sample data. Actual output will vary based on template variables.
            </div>
            <div class="preview-container border rounded p-3 mt-2 bg-white">
              <iframe
                ref="previewFrame"
                :srcdoc="getPreviewHtml(viewingPartial.content)"
                class="preview-iframe"
                sandbox="allow-same-origin allow-scripts"
              ></iframe>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="viewingPartial = null">Close</button>
          <button class="btn btn-primary" @click="copyContent(viewingPartial.content)">
            <i class="bi bi-clipboard me-1"></i>
            Copy Content
          </button>
        </div>
      </div>
    </div>
  </div>
  <div v-if="viewingPartial" class="modal-backdrop fade show" style="z-index: 1059;"></div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useElectronAPI } from '../../composables/useElectronAPI';

export default {
  name: 'PartialsLibrary',
  emits: ['close'],
  setup(props, { emit }) {
    const api = useElectronAPI();

    // State
    const partials = ref([]);
    const stats = ref(null);
    const loading = ref(false);
    const selectedCategory = ref('all');
    const viewingPartial = ref(null);
    const editingPartial = ref(null);
    const importInput = ref(null);
    const viewTab = ref('code');
    const contentTextarea = ref(null);
    const validationErrors = ref([]);

    // Handlebars snippets
    const snippets = {
      companyName: '{{companyName}}',
      orderNumber: '{{orderNumber}}',
      orderDate: '{{orderDate}}',
      jobNo: '{{jobNo}}',
      supplierName: '{{supplierName}}',
      ifBlock: '{{#if variable}}\n  Content here\n{{/if}}',
      ifElse: '{{#if variable}}\n  True content\n{{else}}\n  False content\n{{/if}}',
      eachLoop: '{{#each items}}\n  {{itemCode}} - {{description}}\n{{/each}}',
      partial: '{{> partialName}}',
      headerDiv: '<div class="header">\n  <h2>{{title}}</h2>\n</div>',
      tableStructure: '<table>\n  <thead>\n    <tr>\n      <th>Column 1</th>\n      <th>Column 2</th>\n    </tr>\n  </thead>\n  <tbody>\n    {{#each items}}\n    <tr>\n      <td>{{column1}}</td>\n      <td>{{column2}}</td>\n    </tr>\n    {{/each}}\n  </tbody>\n</table>'
    };

    // Form state
    const partialForm = ref({
      name: '',
      description: '',
      content: '',
      category: 'other'
    });

    const categories = [
      { value: 'all', label: 'All', icon: 'bi-grid' },
      { value: 'header', label: 'Headers', icon: 'bi-layout-text-window' },
      { value: 'footer', label: 'Footers', icon: 'bi-layout-text-window-reverse' },
      { value: 'lineItem', label: 'Line Items', icon: 'bi-list-ul' },
      { value: 'section', label: 'Sections', icon: 'bi-layout-split' },
      { value: 'other', label: 'Other', icon: 'bi-file-earmark' }
    ];

    // Computed
    const filteredPartials = computed(() => {
      if (selectedCategory.value === 'all') {
        return partials.value;
      }
      return partials.value.filter(p => p.category === selectedCategory.value);
    });

    // Methods
    const loadPartials = async () => {
      loading.value = true;
      try {
        const result = await api.partials.getAll();
        if (result.success) {
          partials.value = result.partials;
        } else {
          console.error('Failed to load partials:', result.message);
        }
      } catch (error) {
        console.error('Error loading partials:', error);
      } finally {
        loading.value = false;
      }
    };

    const loadStats = async () => {
      try {
        const result = await api.partials.getStats();
        if (result.success) {
          stats.value = result.stats;
        }
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };

    const savePartialForm = async () => {
      if (!partialForm.value.name || !partialForm.value.content) {
        alert('Name and content are required');
        return;
      }

      try {
        const partialData = {
          ...partialForm.value,
          id: editingPartial.value?.id
        };

        const result = await api.partials.save(partialData);

        if (result.success) {
          console.log(`✓ Partial ${editingPartial.value ? 'updated' : 'created'}: ${partialForm.value.name}`);
          await loadPartials();
          await loadStats();
          resetForm();
        } else {
          alert('Failed to save partial: ' + result.message);
        }
      } catch (error) {
        console.error('Error saving partial:', error);
        alert('Error saving partial: ' + error.message);
      }
    };

    const editPartial = async (partial) => {
      // Load full content
      const result = await api.partials.get(partial.id);
      if (result.success) {
        editingPartial.value = result.partial;
        partialForm.value = {
          name: result.partial.name,
          description: result.partial.description,
          content: result.partial.content,
          category: result.partial.category
        };
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    const cancelEdit = () => {
      editingPartial.value = null;
      resetForm();
    };

    const resetForm = () => {
      partialForm.value = {
        name: '',
        description: '',
        content: '',
        category: 'other'
      };
      editingPartial.value = null;
    };

    const viewPartial = async (partial) => {
      const result = await api.partials.get(partial.id);
      if (result.success) {
        viewingPartial.value = result.partial;
        viewTab.value = 'code'; // Reset to code tab
      }
    };

    const deletePartialConfirm = async (id) => {
      if (!confirm('Delete this partial? Templates using it may break.')) {
        return;
      }

      try {
        const result = await api.partials.delete(id);
        if (result.success) {
          console.log('✓ Partial deleted');
          await loadPartials();
          await loadStats();
        } else {
          console.error('Failed to delete partial:', result.message);
        }
      } catch (error) {
        console.error('Error deleting partial:', error);
      }
    };

    const copyReference = (partial) => {
      const reference = `{{> ${partial.name}}}`;
      navigator.clipboard.writeText(reference);
      console.log(`✓ Copied reference: ${reference}`);
    };

    const copyContent = (content) => {
      navigator.clipboard.writeText(content);
      console.log('✓ Content copied to clipboard');
    };

    const getPreview = (partial) => {
      if (!partial.contentLength) return 'Empty';
      return partial.contentLength > 100
        ? '...' // Just show length for long partials
        : 'View content →';
    };

    const getCategoryIcon = (category) => {
      const cat = categories.find(c => c.value === category);
      return cat ? cat.icon : 'bi-file-earmark';
    };

    const getCategoryCount = (category) => {
      if (category === 'all') return partials.value.length;
      return partials.value.filter(p => p.category === category).length;
    };

    const exportAll = async () => {
      try {
        const result = await api.partials.export();
        if (result.success) {
          // Create downloadable JSON file
          const blob = new Blob([JSON.stringify(result.partials, null, 2)], {
            type: 'application/json'
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `partials-export-${new Date().toISOString().split('T')[0]}.json`;
          a.click();
          URL.revokeObjectURL(url);
          console.log(`✓ Exported ${result.partials.length} partials`);
        }
      } catch (error) {
        console.error('Error exporting partials:', error);
        alert('Error exporting partials: ' + error.message);
      }
    };

    const triggerImport = () => {
      importInput.value?.click();
    };

    const handleImport = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const partialsData = JSON.parse(text);

        const result = await api.partials.import(partialsData);

        if (result.success) {
          alert(
            `Import Results:\n\n` +
            `Imported: ${result.results.imported}\n` +
            `Skipped: ${result.results.skipped}\n` +
            (result.results.errors.length > 0 ? `\nErrors:\n${result.results.errors.join('\n')}` : '')
          );
          await loadPartials();
          await loadStats();
        } else {
          alert('Import failed: ' + result.message);
        }
      } catch (error) {
        console.error('Error importing partials:', error);
        alert('Error importing partials: ' + error.message);
      }

      // Reset file input
      event.target.value = '';
    };

    const loadExamples = async () => {
      if (!confirm('Load example partials (18 production-ready template fragments)?\n\nThis will add sample headers, footers, line items, and sections based on real Purchase Order and Work Order templates.')) {
        return;
      }

      try {
        const result = await api.seed.partials();
        if (result.success) {
          if (result.result.skipped) {
            alert('Partials already exist. Clear all partials first to reload examples.');
          } else {
            console.log('✓ Example partials loaded:', result.result.count);
            await loadPartials();
            await loadStats();
            alert(`Successfully loaded ${result.result.count} example partials!`);
          }
        } else {
          alert('Failed to load examples: ' + result.message);
        }
      } catch (error) {
        console.error('Error loading examples:', error);
        alert('Error loading examples: ' + error.message);
      }
    };

    const clearAllPartials = async () => {
      if (!confirm(`Clear all ${partials.value.length} partials?\n\nThis action cannot be undone. You can reload examples afterward using "Load Examples".`)) {
        return;
      }

      try {
        const result = await api.seed.clearPartials();
        if (result.success) {
          console.log(`✓ Cleared ${result.result.partialsCleared} partials`);
          await loadPartials();
          await loadStats();
          alert(`Successfully cleared ${result.result.partialsCleared} partials! You can now reload examples.`);
        } else {
          alert('Failed to clear partials: ' + result.message);
        }
      } catch (error) {
        console.error('Error clearing partials:', error);
        alert('Error clearing partials: ' + error.message);
      }
    };

    const insertSnippet = (snippet) => {
      const textarea = contentTextarea.value;
      if (!textarea) return;

      // Get cursor position
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // Get current content
      const currentContent = partialForm.value.content;

      // Insert snippet at cursor position
      const newContent =
        currentContent.substring(0, start) +
        snippet +
        currentContent.substring(end);

      // Update content
      partialForm.value.content = newContent;

      // Validate after inserting
      validateHandlebars(newContent);

      // Restore focus and set cursor position after inserted snippet
      textarea.focus();
      const newCursorPos = start + snippet.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    };

    const validateHandlebars = (content) => {
      const errors = [];

      if (!content || content.trim() === '') {
        validationErrors.value = [];
        return;
      }

      // Check for unmatched opening/closing tags
      const blockPatterns = [
        { open: /{{#if\s+\w+}}/g, close: /{{\/if}}/g, name: '{{#if}}...{{/if}}' },
        { open: /{{#each\s+\w+}}/g, close: /{{\/each}}/g, name: '{{#each}}...{{/each}}' },
        { open: /{{#unless\s+\w+}}/g, close: /{{\/unless}}/g, name: '{{#unless}}...{{/unless}}' },
        { open: /{{#with\s+\w+}}/g, close: /{{\/with}}/g, name: '{{#with}}...{{/with}}' }
      ];

      blockPatterns.forEach(pattern => {
        const opens = (content.match(pattern.open) || []).length;
        const closes = (content.match(pattern.close) || []).length;

        if (opens > closes) {
          errors.push({
            type: 'error',
            message: `Unmatched ${pattern.name} block: ${opens - closes} opening tag(s) without closing tag`
          });
        } else if (closes > opens) {
          errors.push({
            type: 'error',
            message: `Unmatched ${pattern.name} block: ${closes - opens} closing tag(s) without opening tag`
          });
        }
      });

      // Check for malformed variable syntax
      const malformedVars = content.match(/{{[^{}#/>][^{}]*[^}]?}(?!})|{[^{][^}]*}}/g);
      if (malformedVars) {
        errors.push({
          type: 'warning',
          message: `Possible malformed variable syntax: ${malformedVars.length} instance(s) found (should be {{variable}})`
        });
      }

      // Check for unclosed brackets
      const openBrackets = (content.match(/{{/g) || []).length;
      const closeBrackets = (content.match(/}}/g) || []).length;

      if (openBrackets !== closeBrackets) {
        errors.push({
          type: 'error',
          message: `Mismatched curly brackets: ${openBrackets} opening {{, ${closeBrackets} closing }}`
        });
      }

      // Check for common typos
      if (content.match(/{{#if\s+}}/)) {
        errors.push({
          type: 'error',
          message: '{{#if}} block is missing a variable name'
        });
      }

      if (content.match(/{{#each\s+}}/)) {
        errors.push({
          type: 'error',
          message: '{{#each}} block is missing an array variable name'
        });
      }

      // Check for partial syntax issues
      const badPartials = content.match(/{{>\s*}}/g);
      if (badPartials) {
        errors.push({
          type: 'error',
          message: 'Partial include is missing a partial name: {{> partialName}}'
        });
      }

      validationErrors.value = errors;
    };

    const getPreviewHtml = (content) => {
      // Sample data for preview
      const sampleData = {
        companyName: 'ABC Construction Ltd',
        companyAddress: '123 Builder Street',
        companyCity: 'Sydney',
        companyState: 'NSW',
        companyPostcode: '2000',
        companyPhone: '02 1234 5678',
        companyEmail: 'orders@abcconstruction.com.au',
        companyABN: '12 345 678 901',
        orderNumber: 'PO-2024-001',
        orderDate: new Date().toLocaleDateString(),
        jobNo: 'J-2024-042',
        jobName: 'Residential Development - Bondi',
        client: 'Prestige Developments Pty Ltd',
        clientAddress: '456 Developer Ave',
        clientCity: 'Sydney',
        clientState: 'NSW',
        clientPostcode: '2001',
        supplierName: 'Quality Supplies Co',
        supplierAddress: '789 Supplier Road',
        supplierCity: 'Sydney',
        supplierState: 'NSW',
        supplierPostcode: '2010',
        supplierPhone: '02 9876 5432',
        supplierEmail: 'sales@qualitysupplies.com.au',
        deliveryAddress: '123 Site Location',
        deliveryInstructions: 'Deliver to site office',
        costCentre: 'FRAME',
        costCentreName: 'Framing & Structural',
        subtotal: '$12,500.00',
        gst: '$1,250.00',
        total: '$13,750.00',
        terms: 'Net 30 Days',
        notes: 'Please confirm delivery date prior to dispatch'
      };

      // Replace Handlebars variables with sample data
      let html = content;

      // Replace {{variable}} patterns
      Object.keys(sampleData).forEach(key => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        html = html.replace(regex, sampleData[key]);
      });

      // Replace {{#if variable}} blocks (show content if variable exists)
      html = html.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, varName, content) => {
        return sampleData[varName] ? content : '';
      });

      // Replace {{#each items}} blocks with sample line items
      html = html.replace(/{{#each\s+items}}([\s\S]*?){{\/each}}/g, (match, itemTemplate) => {
        const sampleItems = [
          { itemCode: 'TIMBER-001', description: 'F17 Timber 90x45 H3', quantity: '250', unit: 'LM', unitPrice: '$4.50', lineTotal: '$1,125.00' },
          { itemCode: 'TIMBER-002', description: 'F27 Timber 140x45 H3', quantity: '180', unit: 'LM', unitPrice: '$8.20', lineTotal: '$1,476.00' },
          { itemCode: 'STEEL-001', description: 'Steel Beam 200UC', quantity: '12', unit: 'EA', unitPrice: '$245.00', lineTotal: '$2,940.00' }
        ];

        return sampleItems.map(item => {
          let itemHtml = itemTemplate;
          Object.keys(item).forEach(key => {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            itemHtml = itemHtml.replace(regex, item[key]);
          });
          return itemHtml;
        }).join('');
      });

      // Wrap in basic HTML structure with styles
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, Helvetica, sans-serif;
              font-size: 11pt;
              line-height: 1.4;
              color: #333;
              margin: 0;
              padding: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
            }
            th, td {
              padding: 8px;
              text-align: left;
              border: 1px solid #ddd;
            }
            th {
              background-color: #f8f9fa;
              font-weight: bold;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 3px solid #003366;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .company-info, .supplier-details, .delivery-details {
              margin-bottom: 15px;
            }
            .po-title {
              text-align: right;
            }
            .po-number {
              font-size: 24pt;
              font-weight: bold;
              color: #003366;
            }
            h1 { font-size: 18pt; margin: 0 0 10px 0; color: #003366; }
            h2 { font-size: 14pt; margin: 10px 0; color: #003366; }
            h3 { font-size: 12pt; margin: 8px 0; color: #555; }
            .totals { text-align: right; margin-top: 20px; font-size: 12pt; }
            .totals strong { display: inline-block; width: 150px; }
            .footer { margin-top: 30px; padding-top: 15px; border-top: 2px solid #003366; font-size: 9pt; color: #666; }
          </style>
        </head>
        <body>
          ${html}
        </body>
        </html>
      `;
    };

    const closeModal = () => {
      emit('close');
    };

    // Lifecycle
    onMounted(async () => {
      await Promise.all([
        loadPartials(),
        loadStats()
      ]);
    });

    return {
      partials,
      stats,
      loading,
      selectedCategory,
      categories,
      filteredPartials,
      partialForm,
      editingPartial,
      viewingPartial,
      importInput,
      viewTab,
      contentTextarea,
      snippets,
      validationErrors,
      savePartialForm,
      editPartial,
      cancelEdit,
      viewPartial,
      deletePartialConfirm,
      copyReference,
      copyContent,
      getPreview,
      getPreviewHtml,
      getCategoryIcon,
      getCategoryCount,
      exportAll,
      triggerImport,
      handleImport,
      loadExamples,
      clearAllPartials,
      insertSnippet,
      validateHandlebars,
      closeModal
    };
  }
};
</script>

<style scoped>
.modal {
  background: rgba(0, 0, 0, 0.5);
  z-index: 1050;
}

.modal-backdrop {
  z-index: 1040;
}

/* Ensure dropdown menus appear above modal content */
.dropdown-menu {
  z-index: 1055;
}

.partials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1rem;
  max-height: 500px;
  overflow-y: auto;
}

.partial-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.partial-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.code-preview {
  background-color: #f8f9fa;
  border-left: 3px solid #0d6efd;
  padding: 0.5rem;
  border-radius: 0.25rem;
  min-height: 60px;
  max-height: 120px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  word-break: break-all;
}

.font-monospace {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9rem;
}

.code-block {
  max-height: 400px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.preview-container {
  min-height: 300px;
  max-height: 500px;
  overflow: auto;
}

.preview-iframe {
  width: 100%;
  min-height: 300px;
  height: 500px;
  border: none;
}
</style>
