<template>
  <div class="modal fade show d-block" tabindex="-1" @click.self="closeModal">
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
      <div class="modal-content">
        <!-- Header -->
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-file-earmark-text me-2"></i>
            Purchase Order Templates
          </h5>
          <button type="button" class="btn-close" @click="closeModal"></button>
        </div>

        <!-- Body -->
        <div class="modal-body">
          <!-- Loading State -->
          <div v-if="loading" class="p-5 text-center">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3 text-muted">Loading templates...</p>
          </div>

          <!-- Templates Grid -->
          <div v-else>
            <div class="row g-4">
              <div
                v-for="template in templates"
                :key="template.id"
                class="col-md-6 col-lg-4">
                <div class="card h-100 template-card" :class="{ 'border-primary': template.id === defaultTemplateId }">
                  <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                      <h6 class="card-title mb-0">{{ template.name }}</h6>
                      <span v-if="template.isBuiltIn" class="badge bg-secondary">Built-in</span>
                      <span v-else class="badge bg-info">Custom</span>
                    </div>

                    <p class="card-text text-muted small">{{ template.description }}</p>

                    <div class="mb-2">
                      <span class="badge bg-light text-dark">{{ template.category }}</span>
                      <span class="badge bg-light text-dark ms-1">{{ template.type }}</span>
                    </div>

                    <div v-if="template.id === defaultTemplateId" class="alert alert-primary py-1 px-2 small mb-2">
                      <i class="bi bi-star-fill me-1"></i>
                      Default Template
                    </div>
                  </div>

                  <div class="card-footer bg-transparent">
                    <div class="d-flex gap-2 mb-2">
                      <button class="btn btn-sm btn-outline-primary flex-fill" @click="previewTemplate(template)">
                        <i class="bi bi-eye me-1"></i>
                        Preview
                      </button>
                      <button class="btn btn-sm btn-outline-secondary flex-fill" @click="editTemplateHTML(template)">
                        <i class="bi bi-code-slash me-1"></i>
                        Edit HTML
                      </button>
                    </div>
                    <div class="d-flex gap-2">
                      <button
                        class="btn btn-sm btn-outline-secondary flex-fill"
                        @click="setAsDefault(template)">
                        <i class="bi bi-star me-1"></i>
                        Set Default
                      </button>
                      <button
                        class="btn btn-sm btn-outline-info flex-fill"
                        @click="duplicateTemplate(template)"
                        title="Duplicate">
                        <i class="bi bi-files me-1"></i>
                        Duplicate
                      </button>
                      <button
                        v-if="!template.isBuiltIn"
                        class="btn btn-sm btn-outline-danger"
                        @click="deleteTemplate(template)"
                        title="Delete">
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div v-if="templates.length === 0" class="p-5 text-center">
              <i class="bi bi-file-earmark-text text-muted" style="font-size: 3rem;"></i>
              <p class="mt-3 text-muted">No templates found</p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn btn-outline-secondary" @click="importTemplate">
            <i class="bi bi-upload me-2"></i>
            Import
          </button>
          <button class="btn btn-secondary" @click="closeModal">
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Template HTML Editor Modal -->
    <TemplateHtmlEditor
      v-if="showHtmlEditor"
      :templateId="selectedTemplate.id"
      :templateName="selectedTemplate.name"
      @close="showHtmlEditor = false"
      @saved="onTemplateSaved"
      @preview="onPreviewFromEditor"
    />

    <!-- Template Preview Modal -->
    <TemplatePreviewModal
      v-if="showPreview"
      :templateId="previewTemplateId"
      :templateName="previewTemplateName"
      :customHtml="previewCustomHtml"
      @close="showPreview = false"
    />
  </div>
  <div class="modal-backdrop fade show"></div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useElectronAPI } from '../../composables/useElectronAPI';
import TemplateHtmlEditorEnhanced from './TemplateHtmlEditorEnhanced.vue';
import TemplatePreviewModal from './TemplatePreviewModal.vue';

export default {
  name: 'TemplateGallery',
  components: {
    TemplateHtmlEditor: TemplateHtmlEditorEnhanced,
    TemplatePreviewModal
  },
  emits: ['close'],
  setup(props, { emit }) {
    const api = useElectronAPI();

    // State
    const templates = ref([]);
    const loading = ref(false);
    const defaultTemplateId = ref('');
    const showHtmlEditor = ref(false);
    const showPreview = ref(false);
    const selectedTemplate = ref({});
    const previewTemplateId = ref('');
    const previewTemplateName = ref('');
    const previewCustomHtml = ref(null);

    // Methods
    const loadTemplates = async () => {
      loading.value = true;
      try {
        const [templatesResult, defaultResult] = await Promise.all([
          api.poTemplates.getAll(),
          api.poTemplates.getDefaultId()
        ]);

        if (templatesResult.success) {
          templates.value = templatesResult.templates;
        }

        if (defaultResult.success) {
          defaultTemplateId.value = defaultResult.templateId;
        }
      } catch (error) {
        console.error('Error loading templates:', error);
        alert('Error loading templates: ' + error.message);
      } finally {
        loading.value = false;
      }
    };

    const previewTemplate = async (template) => {
      previewTemplateId.value = template.id;
      previewTemplateName.value = template.name;
      previewCustomHtml.value = null;
      showPreview.value = true;
    };

    const editTemplateHTML = (template) => {
      selectedTemplate.value = template;
      showHtmlEditor.value = true;
    };

    const onTemplateSaved = async () => {
      await loadTemplates();
    };

    const onPreviewFromEditor = (data) => {
      // Preview the edited HTML
      previewTemplateId.value = data.templateId;
      previewTemplateName.value = 'Preview (Unsaved Changes)';
      previewCustomHtml.value = data.html;
      showPreview.value = true;
    };

    const deleteTemplate = async (template) => {
      if (!confirm(`Delete template "${template.name}"?`)) return;

      try {
        const result = await api.poTemplates.delete(template.id);
        if (result.success) {
          await loadTemplates();
        } else {
          alert('Failed to delete template: ' + result.message);
        }
      } catch (error) {
        console.error('Error deleting template:', error);
        alert('Error deleting template: ' + error.message);
      }
    };

    const duplicateTemplate = async (template) => {
      // Create auto-generated name
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      const newName = `${template.name} (Copy ${timestamp})`;

      if (!confirm(`Duplicate "${template.name}" as "${newName}"?`)) return;

      try {
        // Load the template HTML
        const htmlResult = await api.poTemplates.loadHTML(template.id);
        if (!htmlResult.success) {
          alert('Failed to load template HTML: ' + htmlResult.message);
          return;
        }

        // Create a new custom template with the same HTML
        const result = await api.poTemplates.save({
          id: `custom-${Date.now()}`,
          name: newName.trim(),
          description: `Copy of ${template.name}`,
          category: template.category,
          type: template.type,
          html: htmlResult.html,
          isBuiltIn: false
        });

        if (result.success) {
          alert(`Template "${newName}" created successfully! You can now edit it.`);
          await loadTemplates();
        } else {
          alert('Failed to duplicate template: ' + result.message);
        }
      } catch (error) {
        console.error('Error duplicating template:', error);
        alert('Error duplicating template: ' + error.message);
      }
    };

    const setAsDefault = async (template) => {
      try {
        const result = await api.poTemplates.setDefault(template.id);
        if (result.success) {
          defaultTemplateId.value = template.id;
          alert(`"${template.name}" is now the default template`);
        } else {
          alert('Failed to set default: ' + result.message);
        }
      } catch (error) {
        console.error('Error setting default:', error);
        alert('Error setting default: ' + error.message);
      }
    };

    const importTemplate = async () => {
      try {
        const result = await api.poTemplates.import();
        if (result.success) {
          alert('Template imported successfully!');
          await loadTemplates();
        } else if (result.message !== 'Import cancelled') {
          alert('Failed to import: ' + result.message);
        }
      } catch (error) {
        console.error('Error importing template:', error);
        alert('Error importing template: ' + error.message);
      }
    };

    const closeModal = () => {
      emit('close');
    };

    // Lifecycle
    onMounted(() => {
      loadTemplates();
    });

    return {
      templates,
      loading,
      defaultTemplateId,
      showHtmlEditor,
      showPreview,
      selectedTemplate,
      previewTemplateId,
      previewTemplateName,
      previewCustomHtml,
      previewTemplate,
      editTemplateHTML,
      onTemplateSaved,
      onPreviewFromEditor,
      deleteTemplate,
      duplicateTemplate,
      setAsDefault,
      importTemplate,
      closeModal
    };
  }
};
</script>

<style scoped>
.modal {
  background: rgba(0, 0, 0, 0.5);
}

.template-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.template-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.template-card.border-primary {
  border-width: 2px;
}
</style>
