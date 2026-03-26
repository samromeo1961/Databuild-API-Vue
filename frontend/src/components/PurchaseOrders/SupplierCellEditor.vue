<template>
  <div class="supplier-editor" ref="editorRef">
    <select
      ref="selectRef"
      v-model="selectedValue"
      class="form-select form-select-sm"
      @change="onValueChange"
      @blur="onBlur"
      @keydown.escape="onEscape"
      @keydown.enter="onEnter">
      <option value="">-- Select Supplier --</option>
      <option v-for="supplier in suppliers" :key="supplier" :value="supplier">
        {{ supplier }}
      </option>
    </select>
  </div>
</template>

<script>
import { ref, onMounted, nextTick } from 'vue';

export default {
  name: 'SupplierCellEditor',
  setup(props, { emit }) {
    const selectRef = ref(null);
    const editorRef = ref(null);
    const selectedValue = ref('');
    const suppliers = ref([]);
    let params = null;

    const getValue = () => {
      return selectedValue.value;
    };

    const isCancelBeforeStart = () => {
      return false;
    };

    const isCancelAfterEnd = () => {
      return false;
    };

    const onValueChange = () => {
      // Value changed, will be picked up by getValue()
    };

    const onBlur = () => {
      // Close editor on blur
      if (params && params.stopEditing) {
        params.stopEditing();
      }
    };

    const onEscape = () => {
      // Cancel editing on escape
      if (params && params.stopEditing) {
        params.stopEditing(true);
      }
    };

    const onEnter = (event) => {
      // Confirm selection on enter
      event.preventDefault();
      if (params && params.stopEditing) {
        params.stopEditing();
      }
    };

    const agInit = (agParams) => {
      params = agParams;
      selectedValue.value = agParams.value || '';
      suppliers.value = agParams.values || [];

      console.log('SupplierCellEditor initialized with suppliers:', suppliers.value);
    };

    onMounted(() => {
      nextTick(() => {
        // Focus and open the select element
        if (selectRef.value) {
          selectRef.value.focus();
          // Try to open the dropdown (works on some browsers)
          selectRef.value.click();
        }
      });
    });

    // Expose methods that AG Grid will call
    return {
      selectRef,
      editorRef,
      selectedValue,
      suppliers,
      onValueChange,
      onBlur,
      onEscape,
      onEnter,
      getValue,
      isCancelBeforeStart,
      isCancelAfterEnd,
      agInit
    };
  }
};
</script>

<style scoped>
.supplier-editor {
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 99999;
}

.supplier-editor select {
  width: 100%;
  height: 100%;
  border: 2px solid #0d6efd;
  background-color: white;
  z-index: 99999;
}

.supplier-editor select:focus {
  outline: none;
  border-color: #0d6efd;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
}
</style>
