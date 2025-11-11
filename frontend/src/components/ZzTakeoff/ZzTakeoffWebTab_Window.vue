<template>
  <div class="zztakeoff-web-tab h-100 d-flex flex-column align-items-center justify-content-center p-5">
    <div class="text-center">
      <i class="bi bi-window-stack" style="font-size: 4rem; color: var(--bs-primary);"></i>
      <h2 class="mt-4 mb-3">zzTakeoff Web Integration</h2>
      <p class="text-muted mb-4">
        Open zzTakeoff in a separate window for the best experience.
      </p>

      <button
        @click="openZzTakeoffWindow"
        class="btn btn-primary btn-lg"
        :disabled="isOpening"
      >
        <i class="bi bi-box-arrow-up-right me-2"></i>
        {{ isOpening ? 'Opening...' : 'Open zzTakeoff Window' }}
      </button>

      <div v-if="error" class="alert alert-danger mt-4" role="alert">
        <i class="bi bi-exclamation-triangle me-2"></i>
        {{ error }}
      </div>

      <div class="mt-5 text-muted small">
        <p class="mb-1"><strong>Benefits of separate window:</strong></p>
        <ul class="list-unstyled">
          <li><i class="bi bi-check-circle text-success me-2"></i>Full screen real estate</li>
          <li><i class="bi bi-check-circle text-success me-2"></i>Independent positioning and sizing</li>
          <li><i class="bi bi-check-circle text-success me-2"></i>Persistent session across visits</li>
          <li><i class="bi bi-check-circle text-success me-2"></i>Integrates with Send to zzTakeoff</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useElectronAPI } from '../../composables/useElectronAPI';

const api = useElectronAPI();
const isOpening = ref(false);
const error = ref(null);

const openZzTakeoffWindow = async () => {
  try {
    isOpening.value = true;
    error.value = null;

    const result = await api.zzTakeoffWindow.open('https://www.zztakeoff.com/login');

    if (!result.success) {
      error.value = result.message || 'Failed to open zzTakeoff window';
    }
  } catch (err) {
    console.error('Error opening zzTakeoff window:', err);
    error.value = err.message || 'Failed to open zzTakeoff window';
  } finally {
    isOpening.value = false;
  }
};
</script>

<style scoped>
.zztakeoff-web-tab {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.btn-primary {
  min-width: 250px;
  font-weight: 600;
}

ul {
  margin-top: 1rem;
}

ul li {
  text-align: left;
  padding: 0.25rem 0;
}

[data-theme="dark"] .zztakeoff-web-tab {
  background-color: var(--bg-primary);
}

[data-theme="dark"] .alert-danger {
  background-color: #842029;
  border-color: #a52834;
  color: #f8d7da;
}
</style>
