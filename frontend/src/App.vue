<template>
  <div id="app" :data-theme="theme" class="h-100 d-flex flex-column" :class="{ 'webview-maximized': webviewMaximized }">
    <!-- Header (hidden when webview maximized) -->
    <div v-if="!webviewMaximized" class="app-header border-bottom">
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
          <button
            @click="toggleMaximize"
            class="btn btn-sm btn-outline-success"
            :title="webviewMaximized ? 'Exit Fullscreen' : 'Maximize'"
          >
            <i class="bi" :class="webviewMaximized ? 'bi-fullscreen-exit' : 'bi-fullscreen'"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Tab Navigation (hidden when webview maximized) -->
    <ul v-if="!webviewMaximized" class="nav nav-tabs" role="tablist">
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
            to="/zztakeoff-web"
            class="nav-link"
            active-class="active"
            role="tab"
          >
            zzTakeoff Web
          </router-link>
        </li>
        <li class="nav-item ms-auto" role="presentation">
          <button
            @click="showHelp"
            class="nav-link btn btn-link"
            title="Help (F1)"
          >
            <i class="bi bi-question-circle"></i>
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button
            @click="showPreferences"
            class="nav-link btn btn-link"
            title="Preferences"
          >
            <i class="bi bi-gear"></i>
          </button>
        </li>
      </ul>

    <!-- Fullscreen Navigation Toolbar (when maximized and not on zzTakeoff Web) -->
    <div
      v-if="webviewMaximized && currentRoute !== '/zztakeoff-web'"
      class="exit-fullscreen-toolbar border-bottom p-2 d-flex align-items-center gap-2"
    >
      <!-- Navigation Dropdown -->
      <div class="btn-group position-relative" role="group">
        <button
          @click="goBackToLastTab"
          class="btn btn-sm btn-warning"
          title="Back to Last Tab"
        >
          <i class="bi bi-grid-3x3-gap me-1"></i>
          Back to {{ lastVisitedTabLabel }}
        </button>
        <button
          type="button"
          class="btn btn-sm btn-warning dropdown-toggle dropdown-toggle-split"
          @click="toggleNavDropdown"
          title="Select Tab"
        >
          <span class="visually-hidden">Select Tab</span>
        </button>
        <ul class="dropdown-menu" :class="{ 'show': showNavDropdown }">
          <li v-for="tab in allTabs" :key="tab.path">
            <a
              class="dropdown-item"
              href="#"
              @click.prevent="navigateToTabMaximized(tab.path)"
              :class="{ 'active': currentRoute === tab.path }"
            >
              <i :class="tab.icon" class="me-2"></i>
              {{ tab.label }}
            </a>
          </li>
          <li><hr class="dropdown-divider"></li>
          <li>
            <a
              class="dropdown-item text-danger"
              href="#"
              @click.prevent="exitFullscreen"
            >
              <i class="bi bi-fullscreen-exit me-2"></i>
              Exit Fullscreen
            </a>
          </li>
        </ul>
      </div>

      <span class="text-muted small">Use dropdown to switch tabs or exit fullscreen mode</span>

      <!-- Current Tab Heading -->
      <div class="ms-auto d-flex align-items-center gap-2">
        <h5 class="mb-0 fw-bold current-tab-heading">
          <i :class="currentTabIcon" class="me-2"></i>
          {{ currentTabLabel }}
        </h5>
      </div>
    </div>

    <!-- Tab Content -->
    <div class="tab-content flex-grow-1">
      <router-view />
    </div>

    <!-- Help Modal -->
    <HelpModal ref="helpModalRef" />

    <!-- Preferences Modal -->
    <PreferencesModal ref="preferencesModalRef" />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, provide, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useElectronAPI } from './composables/useElectronAPI';
import HelpModal from './components/Help/HelpModal.vue';
import PreferencesModal from './components/Preferences/PreferencesModal.vue';

const api = useElectronAPI();
const router = useRouter();
const theme = ref('light');
const helpModalRef = ref(null);
const preferencesModalRef = ref(null);

// Create webview maximized state and provide to children
const webviewMaximized = ref(false);

// Track current route
const currentRoute = computed(() => router.currentRoute.value.path);

// Dropdown state
const showNavDropdown = ref(false);

// Track the last visited tab (for going back from other tabs, etc.)
const lastVisitedTab = ref('/catalogue'); // Default to Catalogue

// All tabs for navigation dropdown
const allTabs = [
  { path: '/catalogue', label: 'Catalogue', icon: 'bi bi-grid' },
  { path: '/recipes', label: 'Recipes', icon: 'bi bi-card-list' },
  { path: '/suppliers', label: 'Suppliers', icon: 'bi bi-shop' },
  { path: '/contacts', label: 'Contacts', icon: 'bi bi-people' },
  { path: '/templates', label: 'Templates', icon: 'bi bi-file-earmark-text' },
  { path: '/favourites', label: 'Favourites', icon: 'bi bi-star' },
  { path: '/recents', label: 'Recents', icon: 'bi bi-clock-history' },
  { path: '/zztakeoff-web', label: 'zzTakeoff Web', icon: 'bi bi-browser-chrome' }
];

// Computed label for the last visited tab
const lastVisitedTabLabel = computed(() => {
  const tab = allTabs.find(t => t.path === lastVisitedTab.value);
  return tab ? tab.label : 'Tab';
});

// Computed label for the current tab
const currentTabLabel = computed(() => {
  const tab = allTabs.find(t => t.path === currentRoute.value);
  return tab ? tab.label : 'Tab';
});

// Computed icon for the current tab
const currentTabIcon = computed(() => {
  const tab = allTabs.find(t => t.path === currentRoute.value);
  return tab ? tab.icon : 'bi bi-app';
});

// Toggle navigation dropdown
const toggleNavDropdown = () => {
  showNavDropdown.value = !showNavDropdown.value;
};

// Go back to the last visited tab with a single click
const goBackToLastTab = async () => {
  showNavDropdown.value = false; // Close dropdown if open
  await router.push(lastVisitedTab.value);
  // Keep maximized state
};

// Navigate to tab while staying maximized
const navigateToTabMaximized = async (path) => {
  showNavDropdown.value = false; // Close dropdown after selection
  // Save the CURRENT tab as the last visited tab before navigating
  lastVisitedTab.value = router.currentRoute.value.path;
  await router.push(path);
  // Keep webviewMaximized.value as true - don't change it
};

// Exit fullscreen function
const exitFullscreen = () => {
  showNavDropdown.value = false; // Close dropdown
  webviewMaximized.value = false;
};

// Toggle maximize function
const toggleMaximize = () => {
  webviewMaximized.value = !webviewMaximized.value;
};

// Toggle theme function
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

// Provide theme, webview state, and toggle function to all child components
provide('theme', theme);
provide('webviewMaximized', webviewMaximized);
provide('toggleTheme', toggleTheme);

// Watch for route changes to track the last visited tab
watch(() => router.currentRoute.value.path, (newPath, oldPath) => {
  // Update last visited tab when navigating
  if (oldPath && newPath !== oldPath) {
    lastVisitedTab.value = oldPath;
    console.log('Updated last visited tab to:', oldPath);
  }
});

// Load theme from preferences
onMounted(async () => {
  try {
    if (api.preferencesStore) {
      const response = await api.preferencesStore.get();
      if (response?.success && response.data?.theme) {
        theme.value = response.data.theme;
      }

      // Navigate to default tab from preferences
      if (response?.success && response.data?.defaultTab) {
        const defaultTab = response.data.defaultTab;
        if (defaultTab !== router.currentRoute.value.path) {
          await router.push(defaultTab);
          console.log('✓ Navigated to default tab:', defaultTab);
        }
      }
    }
  } catch (error) {
    console.error('Error loading theme:', error);
  }

  // Add F1 keyboard shortcut for help
  const handleKeyDown = (event) => {
    if (event.key === 'F1') {
      event.preventDefault();
      showHelp();
    }
  };
  document.addEventListener('keydown', handleKeyDown);

  // Listen for show-help event from Electron menu
  if (window.electronAPI?.onShowHelp) {
    window.electronAPI.onShowHelp(() => {
      showHelp();
    });
  }

  // Listen for navigate-to event from Electron menu
  if (window.electronAPI?.onNavigateTo) {
    window.electronAPI.onNavigateTo((path) => {
      router.push(path);
    });
  }

  // Listen for show-preferences event from Electron menu
  if (window.electronAPI?.onShowPreferences) {
    window.electronAPI.onShowPreferences(() => {
      showPreferences();
    });
  }

  // Listen for preferences updated event
  window.addEventListener('preferencesUpdated', (event) => {
    const updatedPreferences = event.detail;
    if (updatedPreferences?.theme) {
      theme.value = updatedPreferences.theme;
      console.log('✓ Theme updated from preferences:', updatedPreferences.theme);
    }
  });
});

// Show help modal
const showHelp = () => {
  if (helpModalRef.value) {
    helpModalRef.value.show();
  }
};

// Show preferences modal
const showPreferences = () => {
  if (preferencesModalRef.value) {
    preferencesModalRef.value.show();
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

/* Help button styling to match nav links */
.nav-item button.nav-link {
  background: transparent;
  border: none;
  color: inherit;
  text-decoration: none;
  padding: 0.75rem 1.25rem;
  cursor: pointer;
}

.nav-item button.nav-link:hover {
  background-color: var(--bg-tertiary);
  border-color: var(--border-color) var(--border-color) transparent;
}

[data-theme="dark"] .nav-item button.nav-link {
  color: var(--text-secondary);
}

[data-theme="dark"] .nav-item button.nav-link:hover {
  color: var(--text-primary);
  background-color: var(--bg-tertiary);
}

/* Exit Fullscreen Toolbar */
.exit-fullscreen-toolbar {
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  z-index: 1000;
}

/* Current Tab Heading */
.current-tab-heading {
  color: var(--text-primary);
  font-size: 1.25rem;
  padding: 0.25rem 1rem;
  border-radius: 0.375rem;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
}

.exit-fullscreen-toolbar .dropdown-menu {
  max-height: 400px;
  overflow-y: auto;
}

.exit-fullscreen-toolbar .dropdown-item.active {
  background-color: rgba(13, 110, 253, 0.1);
  font-weight: 600;
}

[data-theme="dark"] .exit-fullscreen-toolbar {
  background-color: var(--bg-secondary);
  border-bottom-color: var(--border-color);
}

[data-theme="dark"] .exit-fullscreen-toolbar .dropdown-menu {
  background-color: var(--bg-tertiary);
  border-color: var(--border-color);
}

[data-theme="dark"] .exit-fullscreen-toolbar .dropdown-item {
  color: var(--text-primary);
}

[data-theme="dark"] .exit-fullscreen-toolbar .dropdown-item:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

[data-theme="dark"] .exit-fullscreen-toolbar .dropdown-item.active {
  background-color: rgba(110, 168, 254, 0.2);
}

[data-theme="dark"] .exit-fullscreen-toolbar .dropdown-item.text-danger {
  color: #dc3545 !important;
}

[data-theme="dark"] .exit-fullscreen-toolbar .dropdown-divider {
  border-color: var(--border-color);
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

/* Webview Maximized Mode */
.webview-maximized .tab-content {
  border: none;
  padding: 0;
  height: 100vh;
  max-height: 100vh;
}
</style>
