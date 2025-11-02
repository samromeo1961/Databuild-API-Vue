<template>
  <div
    class="modal fade"
    :id="modalId"
    tabindex="-1"
    aria-labelledby="contactModalLabel"
    aria-hidden="true"
    ref="modalRef"
  >
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="contactModalLabel">
            <i class="bi bi-person-circle me-2"></i>
            {{ isEditMode ? 'Edit Contact' : 'Add New Contact' }}
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>

        <div class="modal-body">
          <!-- Error Messages -->
          <div v-if="error" class="alert alert-danger alert-dismissible fade show" role="alert">
            <i class="bi bi-exclamation-triangle me-2"></i>
            {{ error }}
            <button type="button" class="btn-close" @click="error = null"></button>
          </div>

          <form @submit.prevent="handleSubmit">
            <!-- Basic Information -->
            <div class="row mb-3">
              <div class="col-md-4">
                <label for="contactCode" class="form-label">
                  Code <span class="text-danger">*</span>
                </label>
                <input
                  type="text"
                  class="form-control"
                  id="contactCode"
                  v-model="formData.code"
                  :disabled="isEditMode"
                  required
                  maxlength="50"
                />
                <small class="text-muted">Unique identifier</small>
              </div>
              <div class="col-md-8">
                <label for="contactName" class="form-label">
                  Company/Name <span class="text-danger">*</span>
                </label>
                <input
                  type="text"
                  class="form-control"
                  id="contactName"
                  v-model="formData.name"
                  required
                  maxlength="100"
                />
              </div>
            </div>

            <!-- Contact Person & Dear -->
            <div class="row mb-3">
              <div class="col-md-6">
                <label for="contactPerson" class="form-label">Contact Person</label>
                <input
                  type="text"
                  class="form-control"
                  id="contactPerson"
                  v-model="formData.contact"
                  maxlength="100"
                />
              </div>
              <div class="col-md-6">
                <label for="contactDear" class="form-label">Salutation (Dear...)</label>
                <input
                  type="text"
                  class="form-control"
                  id="contactDear"
                  v-model="formData.dear"
                  maxlength="50"
                  placeholder="e.g., Mr. Smith"
                />
              </div>
            </div>

            <!-- Contact Details -->
            <div class="row mb-3">
              <div class="col-md-6">
                <label for="contactEmail" class="form-label">
                  <i class="bi bi-envelope me-1"></i>Email
                </label>
                <input
                  type="email"
                  class="form-control"
                  id="contactEmail"
                  v-model="formData.email"
                  maxlength="100"
                />
              </div>
              <div class="col-md-6">
                <label for="contactGroup" class="form-label">Group</label>
                <select class="form-select" id="contactGroup" v-model.number="formData.group">
                  <option :value="1">Clients</option>
                  <option :value="2">Suppliers</option>
                  <option :value="3">Subcontractors</option>
                  <option :value="4">Other</option>
                </select>
              </div>
            </div>

            <!-- Phone Numbers -->
            <div class="row mb-3">
              <div class="col-md-4">
                <label for="contactPhone" class="form-label">
                  <i class="bi bi-telephone me-1"></i>Phone
                </label>
                <input
                  type="tel"
                  class="form-control"
                  id="contactPhone"
                  v-model="formData.phone"
                  maxlength="20"
                />
              </div>
              <div class="col-md-4">
                <label for="contactMobile" class="form-label">
                  <i class="bi bi-phone me-1"></i>Mobile
                </label>
                <input
                  type="tel"
                  class="form-control"
                  id="contactMobile"
                  v-model="formData.mobile"
                  maxlength="20"
                />
              </div>
              <div class="col-md-4">
                <label for="contactFax" class="form-label">
                  <i class="bi bi-printer me-1"></i>Fax
                </label>
                <input
                  type="tel"
                  class="form-control"
                  id="contactFax"
                  v-model="formData.fax"
                  maxlength="20"
                />
              </div>
            </div>

            <!-- Address -->
            <div class="mb-3">
              <label for="contactAddress" class="form-label">
                <i class="bi bi-geo-alt me-1"></i>Address
              </label>
              <input
                type="text"
                class="form-control"
                id="contactAddress"
                v-model="formData.address"
                maxlength="200"
              />
            </div>

            <div class="row mb-3">
              <div class="col-md-5">
                <label for="contactCity" class="form-label">City</label>
                <input
                  type="text"
                  class="form-control"
                  id="contactCity"
                  v-model="formData.city"
                  maxlength="50"
                />
              </div>
              <div class="col-md-3">
                <label for="contactState" class="form-label">State</label>
                <input
                  type="text"
                  class="form-control"
                  id="contactState"
                  v-model="formData.state"
                  maxlength="20"
                />
              </div>
              <div class="col-md-4">
                <label for="contactPostcode" class="form-label">Postcode</label>
                <input
                  type="text"
                  class="form-control"
                  id="contactPostcode"
                  v-model="formData.postcode"
                  maxlength="10"
                />
              </div>
            </div>

            <!-- Type Flags -->
            <div class="mb-3">
              <label class="form-label d-block">Contact Type</label>
              <div class="form-check form-check-inline">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="contactDebtor"
                  v-model="formData.debtor"
                />
                <label class="form-check-label" for="contactDebtor">
                  Debtor (Customer)
                </label>
              </div>
              <div class="form-check form-check-inline">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="contactSupplier"
                  v-model="formData.supplier"
                />
                <label class="form-check-label" for="contactSupplier">
                  Supplier
                </label>
              </div>
              <div class="form-check form-check-inline">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="contactOSC"
                  v-model="formData.osc"
                />
                <label class="form-check-label" for="contactOSC">
                  OSC (Subcontractor)
                </label>
              </div>
            </div>

            <!-- Notes -->
            <div class="mb-3">
              <label for="contactNotes" class="form-label">
                <i class="bi bi-journal-text me-1"></i>Notes
              </label>
              <textarea
                class="form-control"
                id="contactNotes"
                v-model="formData.notes"
                rows="3"
                maxlength="500"
              ></textarea>
              <small class="text-muted">{{ formData.notes?.length || 0 }}/500</small>
            </div>
          </form>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
            <i class="bi bi-x-lg me-1"></i>
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click="handleSubmit"
            :disabled="saving"
          >
            <span v-if="saving">
              <span class="spinner-border spinner-border-sm me-2"></span>
              Saving...
            </span>
            <span v-else>
              <i class="bi bi-check-lg me-1"></i>
              {{ isEditMode ? 'Update' : 'Create' }} Contact
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Modal } from 'bootstrap';
import { useElectronAPI } from '../../composables/useElectronAPI';

const api = useElectronAPI();

const props = defineProps({
  modalId: {
    type: String,
    default: 'contactModal'
  }
});

const emit = defineEmits(['saved', 'closed']);

// Modal ref
const modalRef = ref(null);
let modalInstance = null;

// State
const isEditMode = ref(false);
const saving = ref(false);
const error = ref(null);

// Form data
const formData = ref({
  code: '',
  name: '',
  contact: '',
  email: '',
  phone: '',
  mobile: '',
  fax: '',
  address: '',
  city: '',
  state: '',
  postcode: '',
  group: 1, // Default to Clients
  dear: '',
  notes: '',
  debtor: false,
  supplier: false,
  osc: false
});

// Reset form
const resetForm = () => {
  formData.value = {
    code: '',
    name: '',
    contact: '',
    email: '',
    phone: '',
    mobile: '',
    fax: '',
    address: '',
    city: '',
    state: '',
    postcode: '',
    group: 1,
    dear: '',
    notes: '',
    debtor: false,
    supplier: false,
    osc: false
  };
  error.value = null;
};

// Show modal for adding
const showAdd = () => {
  isEditMode.value = false;
  resetForm();
  if (modalInstance) {
    modalInstance.show();
  }
};

// Show modal for editing
const showEdit = (contact) => {
  isEditMode.value = true;
  formData.value = {
    code: contact.Code || '',
    name: contact.Name || '',
    contact: contact.Contact || '',
    email: contact.Email || '',
    phone: contact.Phone || '',
    mobile: contact.Mobile || '',
    fax: contact.Fax || '',
    address: contact.Address || '',
    city: contact.City || '',
    state: contact.State || '',
    postcode: contact.Postcode || '',
    group: contact.Group_ || 1,
    dear: contact.Dear || '',
    notes: contact.Notes || '',
    debtor: contact.Debtor === 1 || contact.Debtor === true,
    supplier: contact.Supplier === 1 || contact.Supplier === true,
    osc: contact.OSC === 1 || contact.OSC === true
  };
  error.value = null;
  if (modalInstance) {
    modalInstance.show();
  }
};

// Handle submit
const handleSubmit = async () => {
  error.value = null;

  // Validate
  if (!formData.value.code || !formData.value.name) {
    error.value = 'Contact code and name are required';
    return;
  }

  saving.value = true;

  try {
    let response;

    if (isEditMode.value) {
      // Update existing contact
      response = await api.contacts.update({
        code: formData.value.code,
        updates: {
          name: formData.value.name,
          contact: formData.value.contact,
          email: formData.value.email,
          phone: formData.value.phone,
          mobile: formData.value.mobile,
          fax: formData.value.fax,
          address: formData.value.address,
          city: formData.value.city,
          state: formData.value.state,
          postcode: formData.value.postcode,
          group: formData.value.group,
          dear: formData.value.dear,
          notes: formData.value.notes,
          debtor: formData.value.debtor,
          supplier: formData.value.supplier,
          osc: formData.value.osc
        }
      });
    } else {
      // Create new contact
      response = await api.contacts.create(formData.value);
    }

    if (response?.success) {
      emit('saved', response.data);
      if (modalInstance) {
        modalInstance.hide();
      }
    } else {
      error.value = response?.error || 'Failed to save contact';
    }
  } catch (err) {
    console.error('Error saving contact:', err);
    error.value = 'Failed to save contact: ' + err.message;
  } finally {
    saving.value = false;
  }
};

// Expose methods
defineExpose({
  showAdd,
  showEdit
});

onMounted(() => {
  if (modalRef.value) {
    modalInstance = new Modal(modalRef.value);

    // Listen for modal close
    modalRef.value.addEventListener('hidden.bs.modal', () => {
      resetForm();
      emit('closed');
    });
  }
});
</script>

<style scoped>
/* Dark mode styles */
[data-theme="dark"] .modal-content {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

[data-theme="dark"] .modal-header,
[data-theme="dark"] .modal-footer {
  border-color: var(--border-color);
}

[data-theme="dark"] .form-control,
[data-theme="dark"] .form-select {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border-color: var(--border-color);
}

[data-theme="dark"] .form-control:focus,
[data-theme="dark"] .form-select:focus {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border-color: var(--link-color);
}

[data-theme="dark"] .form-label {
  color: var(--text-primary);
}

[data-theme="dark"] .text-muted {
  color: var(--text-secondary) !important;
}

[data-theme="dark"] .form-check-label {
  color: var(--text-primary);
}
</style>
