<template>
  <div id="app" :data-theme="theme" class="h-100 d-flex flex-column">
    <!-- Header -->
    <div class="app-header border-bottom">
      <div class="d-flex justify-content-between align-items-center">
        <img
          v-if="theme === 'dark'"
          src="./assets/zztakeoff-logo-dark.png"
          alt="zzTakeoff"
          class="zztakeoff-logo"
        />
        <img
          v-else
          src="https://d2t5nuahib5yds.cloudfront.net/public/svg/zztakeoff-logo-black.svg?v10"
          alt="zzTakeoff"
          class="zztakeoff-logo"
        />
        <div class="d-flex align-items-center gap-3">
          <h2 class="mb-0">DBx Connector</h2>
          <button
            @click="toggleTheme"
            class="btn btn-sm btn-outline-secondary"
            title="Toggle Dark Mode"
          >
            <i class="bi" :class="theme === 'dark' ? 'bi-sun' : 'bi-moon'"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Tab Navigation -->
    <ul class="nav nav-tabs" role="tablist">
        <li class="nav-item" role="presentation">
          <router-link
            to="/catalogue"
            class="nav-link"
            active-class="active"
            role="tab"
          >
            Catalogue
          </router-link>
        </li>
        <li class="nav-item" role="presentation">
          <router-link
            to="/recipes"
            class="nav-link"
            active-class="active"
            role="tab"
          >
            Recipes
          </router-link>
        </li>
        <li class="nav-item" role="presentation">
          <router-link
            to="/suppliers"
            class="nav-link"
            active-class="active"
            role="tab"
          >
            Suppliers
          </router-link>
        </li>
        <li class="nav-item" role="presentation">
          <router-link
            to="/contacts"
            class="nav-link"
            active-class="active"
            role="tab"
          >
            Contacts
          </router-link>
        </li>
        <li class="nav-item" role="presentation">
          <router-link
            to="/templates"
            class="nav-link"
            active-class="active"
            role="tab"
          >
            Templates
          </router-link>
        </li>
        <li class="nav-item" role="presentation">
          <router-link
            to="/favourites"
            class="nav-link"
            active-class="active"
            role="tab"
          >
            Favourites
          </router-link>
        </li>
        <li class="nav-item" role="presentation">
          <router-link
            to="/recents"
            class="nav-link"
            active-class="active"
            role="tab"
          >
            Recents
          </router-link>
        </li>
        <li class="nav-item" role="presentation">
          <router-link
            to="/zztakeoff"
            class="nav-link"
            active-class="active"
            role="tab"
          >
            zzTakeoff
          </router-link>
        </li>
        <li class="nav-item ms-auto" role="presentation">
          <router-link
            to="/preferences"
            class="nav-link"
            active-class="active"
            role="tab"
          >
            <i class="bi bi-gear"></i> Preferences
          </router-link>
        </li>
      </ul>

    <!-- Tab Content -->
    <div class="tab-content flex-grow-1">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, provide } from 'vue';
import { useElectronAPI } from './composables/useElectronAPI';

const api = useElectronAPI();
const theme = ref('light');

// Provide theme to all child components
provide('theme', theme);

// Load theme from preferences
onMounted(async () => {
  try {
    if (api.preferencesStore) {
      const response = await api.preferencesStore.get();
      if (response?.success && response.data?.theme) {
        theme.value = response.data.theme;
      }
    }
  } catch (error) {
    console.error('Error loading theme:', error);
  }
});

// Toggle theme
const toggleTheme = async () => {
  const newTheme = theme.value === 'light' ? 'dark' : 'light';
  theme.value = newTheme;

  // Save to preferences store
  try {
    if (api.preferencesStore) {
      await api.preferencesStore.update('theme', newTheme);
    }
  } catch (error) {
    console.error('Error saving theme:', error);
  }
};

// Apply theme to body
watch(theme, (newTheme) => {
  document.body.setAttribute('data-theme', newTheme);
}, { immediate: true });
</script>

<style>
/* Reset and base styles */
#app {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
}

/* Light theme (default) */
:root,
[data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-tertiary: #e9ecef;
  --text-primary: #212529;
  --text-secondary: #6c757d;
  --border-color: #dee2e6;
  --link-color: #0d6efd;
  --link-hover: #0a58ca;
}

/* Dark theme */
[data-theme="dark"] {
  --bg-primary: #1a1d20;
  --bg-secondary: #212529;
  --bg-tertiary: #2d3238;
  --text-primary: #f8f9fa;
  --text-secondary: #adb5bd;
  --border-color: #495057;
  --link-color: #6ea8fe;
  --link-hover: #9ec5fe;
}

/* Apply theme colors */
[data-theme="dark"] {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

[data-theme="dark"] .border-bottom {
  border-color: var(--border-color) !important;
}

[data-theme="dark"] .text-muted {
  color: var(--text-secondary) !important;
}

[data-theme="dark"] .nav-tabs {
  border-color: var(--border-color);
}

[data-theme="dark"] .nav-tabs .nav-link {
  color: var(--text-secondary);
  background-color: transparent;
  border-color: transparent;
}

[data-theme="dark"] .nav-tabs .nav-link:hover {
  color: var(--text-primary);
  background-color: var(--bg-tertiary);
  border-color: var(--border-color) var(--border-color) transparent;
}

[data-theme="dark"] .nav-tabs .nav-link.active {
  color: var(--text-primary);
  background-color: var(--bg-secondary);
  border-color: var(--border-color) var(--border-color) var(--bg-secondary);
}

[data-theme="dark"] .btn-outline-secondary {
  color: var(--text-secondary);
  border-color: var(--border-color);
}

[data-theme="dark"] .btn-outline-secondary:hover {
  color: var(--text-primary);
  background-color: var(--bg-tertiary);
  border-color: var(--border-color);
}

/* Tab content styling */
.tab-content {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-top: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow: hidden;
}

.tab-content > * {
  width: 100%;
  flex: 1;
  min-height: 0;
}

[data-theme="dark"] .tab-content {
  background-color: var(--bg-secondary);
}

/* Header styling */
.app-header {
  padding: 1rem 0;
}

.app-header h2 {
  color: var(--text-primary);
  font-weight: 600;
}

.app-header > div {
  padding-left: 1.5rem;
  padding-right: 1.5rem;
}

.zztakeoff-logo {
  height: 32px;
  width: auto;
  object-fit: contain;
}

/* Make tabs look better */
.nav-tabs {
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  padding-left: 0;
  padding-right: 0;
  margin: 0;
}

.nav-tabs .nav-item {
  padding-left: 1.5rem;
}

.nav-tabs .nav-item:last-child {
  padding-right: 1.5rem;
}

.nav-tabs .nav-link {
  white-space: nowrap;
  padding: 0.75rem 1.25rem;
}

/* Icons */
.bi {
  font-size: 1rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .app-header h2 {
    font-size: 1.5rem;
  }

  .nav-tabs .nav-link {
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
  }
}
</style>
