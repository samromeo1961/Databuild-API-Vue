<template>
  <div class="zztakeoff-tab h-100 d-flex flex-column">
    <!-- Header -->
    <div class="py-3 px-4 border-bottom">
      <div class="row align-items-center mb-3">
        <div class="col">
          <h4 class="mb-0">
            <i class="bi bi-send text-primary me-2"></i>
            zzTakeoff Integration
          </h4>
          <p class="text-muted small mb-0">
            Send items and templates directly to your zzTakeoff projects
          </p>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-grow-1 overflow-auto p-4">
      <div class="row justify-content-center">
        <div class="col-lg-10 col-xl-8">
          <!-- Coming Soon Card -->
          <div class="card text-center shadow-sm mb-4">
            <div class="card-body p-5">
              <div class="mb-4">
                <i class="bi bi-rocket-takeoff" style="font-size: 4rem; color: #0d6efd;"></i>
              </div>
              <h3 class="card-title mb-3">zzTakeoff Integration Coming Soon!</h3>
              <p class="card-text text-muted mb-4">
                This feature will allow you to send catalogue items, recipes, and templates
                directly to your zzTakeoff projects with just a few clicks.
              </p>
              <div class="alert alert-info text-start">
                <i class="bi bi-info-circle me-2"></i>
                <strong>Integration will be enabled when:</strong>
                <ul class="mb-0 mt-2">
                  <li>zzTakeoff API documentation becomes available</li>
                  <li>API authentication credentials are configured</li>
                  <li>Project selection interface is implemented</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Planned Features Card -->
          <div class="card shadow-sm">
            <div class="card-header bg-primary text-white">
              <h5 class="mb-0">
                <i class="bi bi-list-check me-2"></i>
                Planned Features
              </h5>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-6 mb-3">
                  <div class="d-flex align-items-start">
                    <i class="bi bi-check-circle-fill text-success me-2 mt-1"></i>
                    <div>
                      <strong>Direct Send</strong>
                      <p class="text-muted small mb-0">
                        Send individual items or entire templates
                      </p>
                    </div>
                  </div>
                </div>
                <div class="col-md-6 mb-3">
                  <div class="d-flex align-items-start">
                    <i class="bi bi-check-circle-fill text-success me-2 mt-1"></i>
                    <div>
                      <strong>Project Selection</strong>
                      <p class="text-muted small mb-0">
                        Choose which zzTakeoff project to send to
                      </p>
                    </div>
                  </div>
                </div>
                <div class="col-md-6 mb-3">
                  <div class="d-flex align-items-start">
                    <i class="bi bi-check-circle-fill text-success me-2 mt-1"></i>
                    <div>
                      <strong>Data Transformation</strong>
                      <p class="text-muted small mb-0">
                        Automatic mapping from Databuild to zzTakeoff format
                      </p>
                    </div>
                  </div>
                </div>
                <div class="col-md-6 mb-3">
                  <div class="d-flex align-items-start">
                    <i class="bi bi-check-circle-fill text-success me-2 mt-1"></i>
                    <div>
                      <strong>Send History</strong>
                      <p class="text-muted small mb-0">
                        Track what you've sent and when
                      </p>
                    </div>
                  </div>
                </div>
                <div class="col-md-6 mb-3">
                  <div class="d-flex align-items-start">
                    <i class="bi bi-check-circle-fill text-success me-2 mt-1"></i>
                    <div>
                      <strong>Unit Mapping</strong>
                      <p class="text-muted small mb-0">
                        Configure unit conversions in Preferences
                      </p>
                    </div>
                  </div>
                </div>
                <div class="col-md-6 mb-3">
                  <div class="d-flex align-items-start">
                    <i class="bi bi-check-circle-fill text-success me-2 mt-1"></i>
                    <div>
                      <strong>Batch Operations</strong>
                      <p class="text-muted small mb-0">
                        Send multiple items at once
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Placeholder Form (Demo) -->
          <div class="card shadow-sm mt-4">
            <div class="card-header">
              <h5 class="mb-0">
                <i class="bi bi-ui-checks me-2"></i>
                Integration Preview (Non-functional)
              </h5>
            </div>
            <div class="card-body">
              <form @submit.prevent="handleSendDemo">
                <div class="mb-3">
                  <label class="form-label">zzTakeoff Project</label>
                  <select class="form-select" disabled>
                    <option>Select a project...</option>
                  </select>
                  <div class="form-text">Project list will be loaded from zzTakeoff API</div>
                </div>
                <div class="mb-3">
                  <label class="form-label">Items to Send</label>
                  <div class="border rounded p-3 bg-light text-muted">
                    <i class="bi bi-inbox me-2"></i>
                    No items selected. Items will be selected from Catalogue, Recipes, or Templates tabs.
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label">Folder Structure</label>
                  <select class="form-select" disabled>
                    <option>Flat</option>
                    <option>Nested by Cost Centre</option>
                  </select>
                </div>
                <button type="submit" class="btn btn-primary" disabled>
                  <i class="bi bi-send me-2"></i>
                  Send to zzTakeoff
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const handleSendDemo = () => {
  alert('This is a demo interface. zzTakeoff integration is not yet implemented.');
};
</script>

<style scoped>
.zztakeoff-tab {
  background-color: var(--bg-primary);
}

/* Dark mode styles */
[data-theme="dark"] .card {
  background-color: var(--bg-secondary);
  border-color: var(--border-color);
  color: var(--text-primary);
}

[data-theme="dark"] .card-header {
  background-color: var(--bg-tertiary);
  border-color: var(--border-color);
  color: var(--text-primary);
}

[data-theme="dark"] .card-header.bg-primary {
  background-color: #0d6efd !important;
}

[data-theme="dark"] .card-text {
  color: var(--text-secondary);
}

[data-theme="dark"] .form-label {
  color: var(--text-primary);
}

[data-theme="dark"] .form-select {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border-color: var(--border-color);
}

[data-theme="dark"] .form-text {
  color: var(--text-secondary);
}

[data-theme="dark"] .bg-light {
  background-color: var(--bg-tertiary) !important;
}

[data-theme="dark"] .border {
  border-color: var(--border-color) !important;
}

/* Card hover effect */
.card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

[data-theme="dark"] .card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* Feature icons */
.bi-check-circle-fill {
  font-size: 1.25rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .card-body.p-5 {
    padding: 2rem !important;
  }

  .bi-rocket-takeoff {
    font-size: 3rem !important;
  }
}
</style>
