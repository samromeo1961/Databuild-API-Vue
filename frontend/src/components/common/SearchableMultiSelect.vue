<template>
  <div class="searchable-multiselect" ref="dropdownContainer">
    <div class="multiselect-input" @click="toggleDropdown">
      <div class="selected-items" v-if="selectedItems.length > 0">
        <span class="badge bg-primary me-1" v-for="item in selectedItems" :key="getItemValue(item)">
          {{ getItemLabel(item) }}
          <i class="bi bi-x ms-1" @click.stop="removeItem(item)"></i>
        </span>
      </div>
      <input
        type="text"
        class="form-control border-0"
        :placeholder="selectedItems.length > 0 ? '' : placeholder"
        v-model="searchQuery"
        @focus="showDropdown = true"
        @input="onSearch"
        ref="searchInput"
      />
      <span class="dropdown-toggle-icon">
        <i class="bi" :class="showDropdown ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
      </span>
    </div>

    <div v-show="showDropdown" class="dropdown-menu show w-100">
      <div
        class="dropdown-item clear-all-item"
        v-if="showSelectAll"
        @click.prevent="clearAll"
      >
        <strong>{{ selectAllLabel }}</strong>
      </div>
      <div class="dropdown-divider" v-if="showSelectAll && filteredOptions.length > 0"></div>

      <div v-if="filteredOptions.length === 0" class="dropdown-item text-muted">
        No items found
      </div>

      <div
        v-for="option in filteredOptions"
        :key="getItemValue(option)"
        class="dropdown-item d-flex align-items-center justify-content-between"
        :class="{ 'selected': isSelected(option) }"
        @click.prevent="toggleSelection(option)"
      >
        <span>{{ getItemLabel(option) }}</span>
        <i v-if="isSelected(option)" class="bi bi-check-lg text-primary"></i>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  options: {
    type: Array,
    required: true,
    default: () => []
  },
  placeholder: {
    type: String,
    default: 'Select items...'
  },
  labelKey: {
    type: [String, Function],
    default: 'label'
  },
  valueKey: {
    type: String,
    default: 'value'
  },
  showSelectAll: {
    type: Boolean,
    default: true
  },
  selectAllLabel: {
    type: String,
    default: 'Select All'
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const searchQuery = ref('');
const showDropdown = ref(false);
const dropdownContainer = ref(null);
const searchInput = ref(null);

// Get selected items as objects from the options array
const selectedItems = computed(() => {
  return props.options.filter(option =>
    props.modelValue.includes(getItemValue(option))
  );
});

// Filter options based on search query
const filteredOptions = computed(() => {
  if (!searchQuery.value) {
    return props.options;
  }

  const query = searchQuery.value.toLowerCase();
  return props.options.filter(option => {
    const label = getItemLabel(option).toLowerCase();
    return label.includes(query);
  });
});

// Helper functions
const getItemValue = (item) => {
  return typeof item === 'object' ? item[props.valueKey] : item;
};

const getItemLabel = (item) => {
  if (typeof props.labelKey === 'function') {
    return props.labelKey(item);
  }
  return typeof item === 'object' ? item[props.labelKey] : item;
};

const isSelected = (option) => {
  return props.modelValue.includes(getItemValue(option));
};

const toggleSelection = (option) => {
  const value = getItemValue(option);
  const newValue = isSelected(option)
    ? props.modelValue.filter(v => v !== value)
    : [...props.modelValue, value];

  emit('update:modelValue', newValue);
  emit('change', newValue);
};

const removeItem = (item) => {
  const value = getItemValue(item);
  const newValue = props.modelValue.filter(v => v !== value);
  emit('update:modelValue', newValue);
  emit('change', newValue);
};

const clearAll = () => {
  // Clear all selections (remove all filters)
  emit('update:modelValue', []);
  emit('change', []);
};

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value;
  if (showDropdown.value) {
    setTimeout(() => {
      searchInput.value?.focus();
    }, 100);
  }
};

const onSearch = () => {
  showDropdown.value = true;
};

// Click outside handler
const handleClickOutside = (event) => {
  if (dropdownContainer.value && !dropdownContainer.value.contains(event.target)) {
    showDropdown.value = false;
    searchQuery.value = '';
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});

// Clear search when dropdown closes
watch(showDropdown, (newVal) => {
  if (!newVal) {
    searchQuery.value = '';
  }
});
</script>

<style scoped>
.searchable-multiselect {
  position: relative;
  width: 100%;
}

.multiselect-input {
  display: flex;
  align-items: center;
  min-height: 38px;
  padding: 0.375rem 2.25rem 0.375rem 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  background-color: #fff;
  cursor: pointer;
  position: relative;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.multiselect-input:hover {
  border-color: #86b7fe;
}

.multiselect-input:focus-within {
  border-color: #86b7fe;
  outline: 0;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
}

.selected-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  flex: 1;
}

.selected-items .badge {
  display: inline-flex;
  align-items: center;
  font-weight: normal;
  padding: 0.25rem 0.5rem;
}

.selected-items .badge i {
  cursor: pointer;
  opacity: 0.7;
}

.selected-items .badge i:hover {
  opacity: 1;
}

.multiselect-input input {
  flex: 1;
  min-width: 100px;
  outline: none;
  padding: 0;
  margin: 0;
}

.dropdown-toggle-icon {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #6c757d;
}

.dropdown-menu {
  max-height: 300px;
  overflow-y: auto;
  z-index: 1050;
  margin-top: 0.125rem;
}

.dropdown-item {
  cursor: pointer;
  padding: 0.5rem 1rem;
}

.dropdown-item:hover {
  background-color: #f8f9fa;
}

.dropdown-item.selected {
  background-color: #e7f3ff;
}

.dropdown-item.selected:hover {
  background-color: #d0e7ff;
}

.dropdown-item.clear-all-item {
  color: #0d6efd;
}

.dropdown-item.clear-all-item:hover {
  background-color: #f8f9fa;
}

/* Dark mode support */
[data-theme="dark"] .multiselect-input {
  background-color: var(--bg-secondary);
  border-color: var(--border-color);
  color: var(--text-primary);
}

[data-theme="dark"] .multiselect-input input {
  background-color: transparent;
  color: var(--text-primary);
}

[data-theme="dark"] .multiselect-input input::placeholder {
  color: var(--text-secondary);
}

[data-theme="dark"] .dropdown-menu {
  background-color: var(--bg-secondary);
  border-color: var(--border-color);
}

[data-theme="dark"] .dropdown-item {
  color: var(--text-primary);
}

[data-theme="dark"] .dropdown-item:hover {
  background-color: var(--bg-tertiary);
}

[data-theme="dark"] .dropdown-item.selected {
  background-color: rgba(13, 110, 253, 0.15);
}

[data-theme="dark"] .dropdown-item.selected:hover {
  background-color: rgba(13, 110, 253, 0.25);
}

[data-theme="dark"] .dropdown-item.clear-all-item {
  color: #4da3ff;
}

[data-theme="dark"] .dropdown-item.clear-all-item:hover {
  background-color: var(--bg-tertiary);
}

[data-theme="dark"] .dropdown-divider {
  border-color: var(--border-color);
}

[data-theme="dark"] .selected-items .badge {
  background-color: #0d6efd !important;
}
</style>
