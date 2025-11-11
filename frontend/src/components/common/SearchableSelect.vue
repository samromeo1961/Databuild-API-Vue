<template>
  <div class="searchable-select" ref="dropdownContainer">
    <div class="select-input" @click="toggleDropdown">
      <input
        type="text"
        class="form-control"
        :placeholder="displayValue || placeholder"
        v-model="searchQuery"
        @focus="showDropdown = true"
        @input="onSearch"
        ref="searchInput"
        :class="{ 'has-value': !!modelValue }"
      />
      <span class="dropdown-toggle-icon">
        <i class="bi" :class="showDropdown ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
      </span>
    </div>

    <div v-show="showDropdown" class="dropdown-menu show w-100">
      <div
        v-if="showClearOption && modelValue"
        class="dropdown-item clear-option"
        @click.prevent="clearSelection"
      >
        <strong>{{ clearLabel }}</strong>
      </div>
      <div class="dropdown-divider" v-if="showClearOption && modelValue && filteredOptions.length > 0"></div>

      <div v-if="filteredOptions.length === 0" class="dropdown-item text-muted">
        No items found
      </div>

      <div
        v-for="option in filteredOptions"
        :key="getItemValue(option)"
        class="dropdown-item d-flex align-items-center justify-content-between"
        :class="{ 'selected': isSelected(option) }"
        @click.prevent="selectOption(option)"
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
    type: [String, Number],
    default: ''
  },
  options: {
    type: Array,
    required: true,
    default: () => []
  },
  placeholder: {
    type: String,
    default: 'Select an item...'
  },
  labelKey: {
    type: [String, Function],
    default: 'label'
  },
  valueKey: {
    type: String,
    default: 'value'
  },
  showClearOption: {
    type: Boolean,
    default: true
  },
  clearLabel: {
    type: String,
    default: 'Clear Selection'
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const searchQuery = ref('');
const showDropdown = ref(false);
const dropdownContainer = ref(null);
const searchInput = ref(null);

// Get the selected option object
const selectedOption = computed(() => {
  return props.options.find(option => getItemValue(option) === props.modelValue);
});

// Display value for the input
const displayValue = computed(() => {
  if (!props.modelValue || !selectedOption.value) {
    return '';
  }
  return getItemLabel(selectedOption.value);
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
  return getItemValue(option) === props.modelValue;
};

const selectOption = (option) => {
  const value = getItemValue(option);
  emit('update:modelValue', value);
  emit('change', value);
  showDropdown.value = false;
  searchQuery.value = '';
};

const clearSelection = () => {
  emit('update:modelValue', '');
  emit('change', '');
  showDropdown.value = false;
  searchQuery.value = '';
};

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value;
  if (showDropdown.value) {
    searchQuery.value = '';
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
.searchable-select {
  position: relative;
  width: 100%;
}

.select-input {
  position: relative;
  cursor: pointer;
}

.select-input input {
  cursor: pointer;
  padding-right: 2.5rem;
}

.select-input input:focus {
  cursor: text;
}

.select-input input.has-value:not(:focus) {
  background-color: #f8f9fa;
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
  position: absolute;
  width: 100%;
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

.dropdown-item.clear-option {
  color: #0d6efd;
}

.dropdown-item.clear-option:hover {
  background-color: #f8f9fa;
}

/* Dark mode support */
[data-theme="dark"] .select-input input {
  background-color: var(--bg-secondary);
  border-color: var(--border-color);
  color: var(--text-primary);
}

[data-theme="dark"] .select-input input.has-value:not(:focus) {
  background-color: var(--bg-tertiary);
}

[data-theme="dark"] .select-input input::placeholder {
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

[data-theme="dark"] .dropdown-item.clear-option {
  color: #4da3ff;
}

[data-theme="dark"] .dropdown-item.clear-option:hover {
  background-color: var(--bg-tertiary);
}

[data-theme="dark"] .dropdown-divider {
  border-color: var(--border-color);
}
</style>
