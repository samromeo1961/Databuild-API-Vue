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

        <!-- Body -->
        <div class="modal-body p-0 d-flex flex-column">
          <!-- Toolbar -->
          <div class="toolbar p-2 border-bottom bg-light">
            <div class="d-flex justify-content-between align-items-center">
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-primary" @click="formatCode" title="Format HTML">
                  <i class="bi bi-code"></i>
                  Format
                </button>
                <button class="btn btn-sm btn-outline-secondary" @click="showPreview" :disabled="!hasChanges">
                  <i class="bi bi-eye"></i>
                  Preview Changes
                </button>
                <span v-if="hasChanges" class="badge bg-warning text-dark ms-2">
                  <i class="bi bi-exclamation-circle me-1"></i>
                  Unsaved Changes
                </span>
              </div>
              <div class="form-check form-switch">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="lineNumbers"
                  v-model="showLineNumbers"
                />
                <label class="form-check-label" for="lineNumbers">
                  Line Numbers
                </label>
              </div>
            </div>
          </div>

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

          <!-- Editor -->
          <div v-else class="editor-container flex-fill">
            <div class="editor-wrapper">
              <div v-if="showLineNumbers" class="line-numbers">
                <div v-for="n in lineCount" :key="n" class="line-number">{{ n }}</div>
              </div>
              <textarea
                ref="editorTextarea"
                v-model="htmlContent"
                class="html-editor"
                :class="{ 'with-line-numbers': showLineNumbers }"
                spellcheck="false"
                @input="onContentChange"
                @scroll="syncLineNumbers"
              ></textarea>
            </div>
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
              </div>
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
  </div>
  <div class="modal-backdrop fade show"></div>
</template>

<script>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useElectronAPI } from '../../composables/useElectronAPI';

export default {
  name: 'TemplateHtmlEditor',
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
    const editorTextarea = ref(null);

    // Computed
    const lineCount = computed(() => {
      return htmlContent.value.split('\n').length;
    });

    const hasChanges = computed(() => {
      return htmlContent.value !== originalContent.value;
    });

    // Methods
    const loadTemplate = async () => {
      loading.value = true;
      error.value = '';

      try {
        const result = await api.poTemplates.loadHTML(props.templateId);

        if (result.success) {
          htmlContent.value = result.html;
          originalContent.value = result.html;
          templatePath.value = result.path || 'Unknown';
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

    const onContentChange = () => {
      // Track changes
    };

    const syncLineNumbers = () => {
      if (editorTextarea.value) {
        const lineNumbersEl = editorTextarea.value.parentElement.querySelector('.line-numbers');
        if (lineNumbersEl) {
          lineNumbersEl.scrollTop = editorTextarea.value.scrollTop;
        }
      }
    };

    const formatCode = () => {
      // Basic HTML formatting
      try {
        let formatted = htmlContent.value;

        // Remove extra whitespace
        formatted = formatted.replace(/>\s+</g, '>\n<');

        // Add indentation (simple version)
        const lines = formatted.split('\n');
        let indent = 0;
        const indentedLines = lines.map(line => {
          const trimmed = line.trim();

          if (!trimmed) return '';

          // Decrease indent for closing tags
          if (trimmed.startsWith('</')) {
            indent = Math.max(0, indent - 1);
          }

          const indentedLine = '  '.repeat(indent) + trimmed;

          // Increase indent for opening tags (but not self-closing)
          if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>')) {
            indent++;
          }

          return indentedLine;
        });

        htmlContent.value = indentedLines.join('\n');
      } catch (err) {
        console.error('Error formatting code:', err);
        alert('Error formatting code: ' + err.message);
      }
    };

    const showPreview = () => {
      emit('preview', {
        templateId: props.templateId,
        html: htmlContent.value
      });
    };

    const revertChanges = () => {
      if (confirm('Are you sure you want to revert all changes?')) {
        htmlContent.value = originalContent.value;
      }
    };

    const saveTemplate = async () => {
      saving.value = true;

      try {
        // For now, we'll save to a custom template
        // In a real implementation, you'd update the template file
        const result = await api.poTemplates.update(props.templateId, {
          html: htmlContent.value
        });

        if (result.success) {
          originalContent.value = htmlContent.value;
          emit('saved');
          alert('Template saved successfully!');
        } else {
          alert('Failed to save template: ' + (result.message || 'Unknown error'));
        }
      } catch (err) {
        console.error('Error saving template:', err);
        alert('Error saving template: ' + err.message);
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

    // Watch for line number toggle
    watch(showLineNumbers, async () => {
      await nextTick();
      syncLineNumbers();
    });

    // Lifecycle
    onMounted(() => {
      loadTemplate();
    });

    return {
      loading,
      saving,
      error,
      htmlContent,
      templatePath,
      showLineNumbers,
      editorTextarea,
      lineCount,
      hasChanges,
      onContentChange,
      syncLineNumbers,
      formatCode,
      showPreview,
      revertChanges,
      saveTemplate,
      closeModal
    };
  }
};
</script>

<style scoped>
.modal {
  background: rgba(0, 0, 0, 0.5);
  z-index: 1055;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.modal-backdrop {
  z-index: 1050;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

.editor-container {
  background: #1e1e1e;
  overflow: hidden;
}

.editor-wrapper {
  display: flex;
  height: 100%;
  overflow: hidden;
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
  overflow-y: auto;
  white-space: pre;
}

.html-editor.with-line-numbers {
  padding-left: 5px;
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

.toolbar {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.info-bar {
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
}

code {
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
}
</style>
