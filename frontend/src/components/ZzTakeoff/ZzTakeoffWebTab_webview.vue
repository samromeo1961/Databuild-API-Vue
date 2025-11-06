<template>
  <div class="zztakeoff-web-tab h-100 d-flex flex-column">
    <!-- Toolbar -->
    <div class="toolbar border-bottom p-2 d-flex align-items-center gap-2">
      <!-- Navigate to Tab Dropdown (when maximized) -->
      <div v-if="isMaximized" class="btn-group position-relative" role="group">
        <button
          @click="goBackToLastTab"
          class="btn btn-sm btn-warning"
          title="Back to Last Tab"
        >
          <i class="bi bi-arrow-left-circle me-1"></i>
          Back to {{ lastTabLabel }}
        </button>
        <button
          type="button"
          class="btn btn-sm btn-warning dropdown-toggle dropdown-toggle-split"
          @click="toggleTabDropdown"
          title="Select Tab"
        >
          <span class="visually-hidden">Select Tab</span>
        </button>
        <ul class="dropdown-menu" :class="{ 'show': showTabDropdown }">
          <li v-for="tab in availableTabs" :key="tab.path">
            <a
              class="dropdown-item"
              href="#"
              @click.prevent="selectTabAndGoBack(tab)"
              :class="{ 'active': lastTabPath === tab.path }"
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

      <template v-if="!isMaximized">
        <button
          @click="goBack"
          class="btn btn-sm btn-outline-secondary"
          title="Go Back"
          :disabled="!canGoBack"
        >
          <i class="bi bi-arrow-left"></i>
        </button>
        <button
          @click="goForward"
          class="btn btn-sm btn-outline-secondary"
          title="Go Forward"
          :disabled="!canGoForward"
        >
          <i class="bi bi-arrow-right"></i>
        </button>
        <button
          @click="reload"
          class="btn btn-sm btn-outline-secondary"
          title="Reload"
        >
          <i class="bi bi-arrow-clockwise"></i>
        </button>
        <button
          @click="goHome"
          class="btn btn-sm btn-outline-primary"
          title="Go to Login"
        >
          <i class="bi bi-house"></i> Login
        </button>
      </template>

      <!-- URL Bar -->
      <div class="flex-grow-1 d-flex align-items-center gap-2">
        <input
          :value="currentUrl"
          class="form-control form-control-sm"
          type="text"
          placeholder="URL"
          readonly
          style="max-width: 400px;"
        />
        <span v-if="isLoading" class="spinner-border spinner-border-sm text-primary"></span>
      </div>

      <!-- Theme Toggle Button -->
      <button
        @click="toggleTheme"
        class="btn btn-sm btn-outline-secondary"
        title="Toggle Dark Mode"
      >
        <i class="bi" :class="theme === 'dark' ? 'bi-sun' : 'bi-moon'"></i>
      </button>

      <!-- Maximize Button (when not maximized) -->
      <button
        v-if="!isMaximized"
        @click="toggleMaximize"
        class="btn btn-sm btn-outline-success"
        title="Maximize Webview (Fullscreen)"
      >
        <i class="bi bi-fullscreen"></i>
      </button>
    </div>

    <!-- Error Message -->
    <div v-if="hasError" class="alert alert-danger m-3 d-flex align-items-start gap-2" role="alert">
      <i class="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
      <div class="flex-grow-1">
        <strong>Unable to load page</strong>
        <p class="mb-2">{{ errorMessage }}</p>
        <button @click="reload" class="btn btn-sm btn-danger mt-2">
          <i class="bi bi-arrow-clockwise me-1"></i>
          Try Again
        </button>
      </div>
    </div>

    <!-- Info Message (only show when not maximized and no error) -->
    <div v-if="!hasError && !isMaximized" class="alert alert-info m-3" role="alert">
      <i class="bi bi-info-circle me-2"></i>
      <strong>zzTakeoff Web Integration</strong> - Click the <i class="bi bi-fullscreen"></i> button to maximize once logged in.
    </div>

    <!-- Webview Container -->
    <div class="webview-wrapper flex-grow-1 position-relative">
      <!-- The <webview> tag embeds the external website -->
      <webview
        ref="webviewRef"
        :src="homeUrl"
        class="webview-element"
        style="width: 100%; height: 100%; display: inline-flex;"
        partition="persist:zztakeoff"
        allowpopups
        nodeintegration="false"
        webpreferences="contextIsolation=yes"
      ></webview>

      <!-- Grey overlay when dropdown is open -->
      <div
        v-if="showTabDropdown"
        class="dropdown-overlay"
        @click="closeDropdown"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, onMounted, onUnmounted, nextTick, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useElectronAPI } from '../../composables/useElectronAPI';

const theme = inject('theme');
const toggleTheme = inject('toggleTheme');
const api = useElectronAPI();
const router = useRouter();

// Inject maximize state from parent (App.vue)
const isMaximized = inject('webviewMaximized');

// Refs
const webviewRef = ref(null);
const homeUrl = 'https://www.zztakeoff.com/login';
const currentUrl = ref(homeUrl);
const isLoading = ref(true);
const errorMessage = ref(null);
const hasError = ref(false);
const canGoBack = ref(false);
const canGoForward = ref(false);

// Dropdown state for tab selection
const showTabDropdown = ref(false);

// Tab navigation data
const lastTabPath = ref('/catalogue'); // Default to Catalogue tab
const navigatingViaDropdown = ref(false); // Track if we're navigating via dropdown
const availableTabs = [
  { path: '/catalogue', label: 'Catalogue', icon: 'bi bi-grid' },
  { path: '/recipes', label: 'Recipes', icon: 'bi bi-card-list' },
  { path: '/suppliers', label: 'Suppliers', icon: 'bi bi-shop' },
  { path: '/contacts', label: 'Contacts', icon: 'bi bi-people' },
  { path: '/templates', label: 'Templates', icon: 'bi bi-file-earmark-text' },
  { path: '/favourites', label: 'Favourites', icon: 'bi bi-star' },
  { path: '/recents', label: 'Recents', icon: 'bi bi-clock-history' },
  { path: '/zztakeoff', label: 'zzTakeoff API', icon: 'bi bi-cloud-arrow-up' }
];

// Computed label for the button
const lastTabLabel = computed(() => {
  const tab = availableTabs.find(t => t.path === lastTabPath.value);
  return tab ? tab.label : 'DBx Connector';
});

// Toggle tab dropdown
const toggleTabDropdown = () => {
  showTabDropdown.value = !showTabDropdown.value;
};

// Close dropdown
const closeDropdown = () => {
  showTabDropdown.value = false;
};

// Exit fullscreen function
const exitFullscreen = () => {
  showTabDropdown.value = false;
  isMaximized.value = false;
};

// Navigation methods
const reload = () => {
  if (webviewRef.value) {
    hasError.value = false;
    errorMessage.value = null;
    isLoading.value = true;
    webviewRef.value.reload();
  }
};

const goHome = () => {
  if (webviewRef.value) {
    hasError.value = false;
    errorMessage.value = null;
    isLoading.value = true;
    currentUrl.value = homeUrl;
    webviewRef.value.loadURL(homeUrl);
  }
};

const goBack = () => {
  if (webviewRef.value && webviewRef.value.canGoBack()) {
    webviewRef.value.goBack();
  }
};

const goForward = () => {
  if (webviewRef.value && webviewRef.value.canGoForward()) {
    webviewRef.value.goForward();
  }
};

// Update navigation state
const updateNavigationState = () => {
  if (webviewRef.value) {
    canGoBack.value = webviewRef.value.canGoBack();
    canGoForward.value = webviewRef.value.canGoForward();
  }
};

// Tab navigation functions
const goBackToLastTab = async () => {
  // Save the current active tab before leaving
  await saveLastActiveTab();

  // Mark that we're navigating via dropdown
  navigatingViaDropdown.value = true;

  // Navigate to the last selected tab
  await router.push(lastTabPath.value);
};

const selectTabAndGoBack = async (tab) => {
  // Close the dropdown
  showTabDropdown.value = false;

  // Save the selected tab to preferences
  lastTabPath.value = tab.path;
  await api.preferencesStore.update('lastActiveTab', tab.path);

  // Mark that we're navigating via dropdown
  navigatingViaDropdown.value = true;

  // Navigate to the selected tab
  await router.push(tab.path);
};

const saveLastActiveTab = async () => {
  // Save the last active tab to preferences (called when switching to zzTakeoff Web)
  const currentPath = router.currentRoute.value.path;
  if (currentPath !== '/zztakeoff-web') {
    lastTabPath.value = currentPath;
    await api.preferencesStore.update('lastActiveTab', currentPath);
  }
};

const toggleMaximize = () => {
  isMaximized.value = !isMaximized.value;
};

// Setup and cleanup
onMounted(async () => {
  console.log('ZzTakeoffWebTab mounted');

  // Load last active tab from preferences
  let shouldAutoMaximize = false;
  try {
    if (api.preferencesStore) {
      const response = await api.preferencesStore.get();
      if (response?.success && response.data?.lastActiveTab) {
        lastTabPath.value = response.data.lastActiveTab;
      }
      // Check if webview should auto-maximize
      if (response?.success && response.data?.openExpanded) {
        shouldAutoMaximize = true;
      }
    }
  } catch (error) {
    console.error('Error loading last active tab:', error);
  }

  // Wait for webview element to be ready
  await nextTick();

  if (webviewRef.value) {
    console.log('Webview element ready, setting up event listeners');

    // Loading events
    webviewRef.value.addEventListener('did-start-loading', () => {
      console.log('Webview started loading');
      isLoading.value = true;
      hasError.value = false;
    });

    webviewRef.value.addEventListener('did-finish-load', () => {
      console.log('Webview finished loading');
      isLoading.value = false;
      updateNavigationState();
    });

    webviewRef.value.addEventListener('did-fail-load', (event) => {
      console.error('Webview failed to load:', event);
      if (event.errorCode !== -3) { // -3 is ERR_ABORTED (user cancelled), ignore it
        isLoading.value = false;
        hasError.value = true;
        errorMessage.value = `Failed to load page (error ${event.errorCode})`;
      }
    });

    // Navigation events
    webviewRef.value.addEventListener('did-navigate', (event) => {
      console.log('Webview navigated to:', event.url);
      currentUrl.value = event.url;
      updateNavigationState();
    });

    webviewRef.value.addEventListener('did-navigate-in-page', (event) => {
      console.log('Webview navigated in page:', event.url);
      currentUrl.value = event.url;
      updateNavigationState();
    });

    // Auto-maximize if preference is enabled
    if (shouldAutoMaximize && !isMaximized.value) {
      console.log('Auto-maximizing webview based on openExpanded preference');
      toggleMaximize();
    }
  } else {
    console.error('Webview element not found!');
  }
});

// Track navigation TO this component to save the previous tab
watch(() => router.currentRoute.value.path, async (newPath, oldPath) => {
  // If navigating TO zzTakeoff Web from another tab (not via dropdown)
  if (newPath === '/zztakeoff-web' && oldPath && oldPath !== '/zztakeoff-web' && !navigatingViaDropdown.value) {
    // Save the previous tab as the last active tab
    lastTabPath.value = oldPath;
    await api.preferencesStore.update('lastActiveTab', oldPath);
    console.log('Saved last active tab:', oldPath);
  }
  // Reset the flag after navigation
  navigatingViaDropdown.value = false;
}, { immediate: false });

onUnmounted(() => {
  console.log('ZzTakeoffWebTab unmounted');
  // The webview tag will be removed from DOM automatically
  // Session is persisted via partition="persist:zztakeoff"
});
</script>

<style scoped>
.zztakeoff-web-tab {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.toolbar {
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  z-index: 9999;
  position: relative;
}

.webview-wrapper {
  position: relative;
  overflow: hidden;
  min-height: 400px; /* Ensure minimum height */
}

.webview-element {
  display: flex; /* Ensure webview is visible */
  width: 100%;
  height: 100%;
  min-height: 400px; /* Match wrapper minimum */
  border: none;
}

/* Dropdown overlay */
.dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 9998;
  cursor: pointer;
}

/* Dark mode */
[data-theme="dark"] .toolbar {
  background-color: var(--bg-secondary);
  border-bottom-color: var(--border-color);
}

[data-theme="dark"] .alert-danger {
  background-color: #842029;
  border-color: #a52834;
  color: #f8d7da;
}

[data-theme="dark"] .alert-danger .btn-danger {
  background-color: #dc3545;
  border-color: #dc3545;
  color: #fff;
}

[data-theme="dark"] .alert-danger .btn-danger:hover {
  background-color: #bb2d3b;
  border-color: #b02a37;
}

[data-theme="dark"] .alert-info {
  background-color: #055160;
  border-color: #087990;
  color: #cff4fc;
}

/* Loading spinner */
.spinner-border-sm {
  width: 1rem;
  height: 1rem;
  border-width: 0.15em;
}

/* Error alert */
.alert {
  border-radius: 0.375rem;
}

/* Disabled buttons */
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Maximize button styling */
.btn-outline-success {
  transition: all 0.3s ease;
}

.btn-outline-success:hover {
  transform: scale(1.05);
}

/* Back to DBx button when maximized */
.btn-warning {
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

[data-theme="dark"] .btn-warning {
  background-color: #ffc107;
  border-color: #ffc107;
  color: #000;
}

[data-theme="dark"] .btn-warning:hover {
  background-color: #ffca2c;
  border-color: #ffc720;
  color: #000;
}

/* Dropdown menu styling */
.btn-group {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 99999;
  display: none;
  min-width: 250px;
  max-height: 400px;
  overflow-y: auto;
  background-color: #ffffff;
  border: 1px solid rgba(0,0,0,.15);
  border-radius: 0.25rem;
  box-shadow: 0 0.5rem 1rem rgba(0,0,0,.175);
}

.dropdown-menu.show {
  display: block;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 0.5rem 1rem;
  clear: both;
  font-weight: 400;
  color: #212529;
  text-align: inherit;
  text-decoration: none;
  white-space: nowrap;
  background-color: transparent;
  border: 0;
  cursor: pointer;
}

.dropdown-item:hover {
  background-color: #f8f9fa;
  color: #16181b;
}

.dropdown-item.active {
  background-color: rgba(13, 110, 253, 0.1);
  font-weight: 600;
}

.dropdown-divider {
  height: 0;
  margin: 0.5rem 0;
  overflow: hidden;
  border-top: 1px solid rgba(0,0,0,.15);
}

[data-theme="dark"] .dropdown-menu {
  background-color: #2d3238;
  border-color: #495057;
}

[data-theme="dark"] .dropdown-item {
  color: #f8f9fa;
}

[data-theme="dark"] .dropdown-item:hover {
  background-color: #212529;
  color: #f8f9fa;
}

[data-theme="dark"] .dropdown-item.active {
  background-color: rgba(110, 168, 254, 0.2);
  color: #f8f9fa;
}

[data-theme="dark"] .dropdown-item.text-danger {
  color: #dc3545 !important;
}

[data-theme="dark"] .dropdown-item.text-danger:hover {
  background-color: rgba(220, 53, 69, 0.1);
}

[data-theme="dark"] .dropdown-divider {
  border-top-color: #495057;
}
</style>
