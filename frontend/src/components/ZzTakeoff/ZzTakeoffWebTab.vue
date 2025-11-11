<template>
  <div class="zztakeoff-web-tab h-100 d-flex flex-column" ref="containerRef">
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

      <!-- URL Bar or Find Bar (inline, mutually exclusive) -->
      <div class="flex-grow-1 d-flex align-items-center gap-2">
        <!-- URL Bar (shown when not searching) -->
        <template v-if="!showFindBar">
          <input
            :value="currentUrl"
            class="form-control form-control-sm"
            type="text"
            placeholder="URL"
            readonly
            style="max-width: 400px;"
          />
          <span v-if="isLoading" class="spinner-border spinner-border-sm text-primary"></span>
        </template>

        <!-- Find Bar (shown when searching) -->
        <template v-else>
          <input
            v-model="findText"
            @input="handleFindInput"
            @keydown.enter="findNext"
            @keydown.shift.enter.prevent="findPrevious"
            @keydown.esc="toggleFindBar"
            class="form-control form-control-sm flex-grow-1"
            type="text"
            placeholder="Find in page..."
            ref="findInputRef"
            autocomplete="off"
          />
          <span v-if="findResults" class="text-muted small text-nowrap">
            {{ findResults.activeMatchOrdinal }} of {{ findResults.matches }}
          </span>
          <button
            @click="findPrevious"
            class="btn btn-sm btn-outline-secondary"
            title="Previous (Shift+Enter)"
            :disabled="!findText"
          >
            <i class="bi bi-chevron-up"></i>
          </button>
          <button
            @click="findNext"
            class="btn btn-sm btn-outline-secondary"
            title="Next (Enter)"
            :disabled="!findText"
          >
            <i class="bi bi-chevron-down"></i>
          </button>
        </template>
      </div>

      <!-- Find/Close Button -->
      <button
        @click.prevent="toggleFindBar"
        class="btn btn-sm"
        :class="showFindBar ? 'btn-outline-danger' : 'btn-outline-secondary'"
        :title="showFindBar ? 'Close Find (Esc)' : 'Find in Page (Ctrl+F)'"
      >
        <i class="bi" :class="showFindBar ? 'bi-x-lg' : 'bi-search'"></i>
      </button>

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
        <div class="small" v-if="errorDetails">
          <strong>Error Details:</strong>
          <ul class="mb-0">
            <li><strong>Error Code:</strong> {{ errorDetails.errorCode }}</li>
            <li><strong>URL:</strong> {{ errorDetails.url }}</li>
          </ul>
        </div>
        <button @click="reload" class="btn btn-sm btn-danger mt-2">
          <i class="bi bi-arrow-clockwise me-1"></i>
          Try Again
        </button>
      </div>
    </div>

    <!-- Info Message - Webview info (only show when not maximized and no error) -->
    <div v-if="!hasError && !isMaximized" class="alert alert-info m-3" role="alert">
      <i class="bi bi-info-circle me-2"></i>
      <strong>Native Web View</strong> - This page is rendered using Electron's webview tag. Click the <i class="bi bi-fullscreen"></i> button to maximize once logged in.
    </div>

    <!-- Webview Container -->
    <div class="webview-container flex-grow-1 position-relative" ref="webviewContainerRef">
      <!-- Electron webview tag for reliable external content loading -->
      <webview
        ref="webviewElement"
        :src="currentUrl"
        class="webview-element"
        partition="persist:zztakeoff"
        allowpopups
        webpreferences="contextIsolation=true,sandbox=false"
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
const containerRef = ref(null);
const webviewContainerRef = ref(null);
const webviewElement = ref(null); // Reference to <webview> DOM element
const currentUrl = ref('https://www.zztakeoff.com/login');
const isLoading = ref(false);
const errorMessage = ref(null);
const errorDetails = ref(null);
const hasError = ref(false);
const canGoBack = ref(false);
const canGoForward = ref(false);

// Find in Page state
const showFindBar = ref(false);
const findText = ref('');
const findResults = ref(null);
const findInputRef = ref(null);

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
  showTabDropdown.value = false; // Close dropdown
  isMaximized.value = false; // Exit fullscreen mode
};

// Setup webview element event listeners
const setupWebviewListeners = () => {
  if (!webviewElement.value) {
    console.warn('Webview element not available, retrying...');
    setTimeout(setupWebviewListeners, 100);
    return;
  }

  const webview = webviewElement.value;

  // Loading events
  webview.addEventListener('did-start-loading', () => {
    isLoading.value = true;
    hasError.value = false;
    console.log('Webview started loading');
  });

  webview.addEventListener('did-stop-loading', () => {
    isLoading.value = false;
    console.log('Webview stopped loading');
  });

  // Navigation events
  webview.addEventListener('did-navigate', (event) => {
    currentUrl.value = event.url;
    canGoBack.value = webview.canGoBack();
    canGoForward.value = webview.canGoForward();
    console.log('Webview navigated to:', event.url);
  });

  webview.addEventListener('did-navigate-in-page', (event) => {
    currentUrl.value = event.url;
    console.log('Webview navigated in-page to:', event.url);
  });

  // Error handling
  webview.addEventListener('did-fail-load', (event) => {
    // Ignore -3 (ERR_ABORTED) errors for subframes and when navigating
    if (event.errorCode === -3 && !event.isMainFrame) {
      console.log('Ignoring ERR_ABORTED for subframe');
      return;
    }

    // Ignore errors for favicons and other non-critical resources
    if (event.errorCode === -3 && event.validatedURL && event.validatedURL.includes('favicon')) {
      console.log('Ignoring favicon load error');
      return;
    }

    console.error('Webview load error:', event);

    // Only show error for main frame failures
    if (event.isMainFrame) {
      hasError.value = true;
      errorMessage.value = event.errorDescription || 'Failed to load page';
      errorDetails.value = {
        errorCode: event.errorCode,
        url: event.validatedURL
      };
      isLoading.value = false;
    }
  });

  // Find in page results
  webview.addEventListener('found-in-page', (event) => {
    if (event.result.matches > 0) {
      findResults.value = {
        activeMatchOrdinal: event.result.activeMatchOrdinal,
        matches: event.result.matches
      };
    } else {
      findResults.value = null;
    }
  });

  // New window requests (open in default browser)
  webview.addEventListener('new-window', (event) => {
    console.log('New window requested:', event.url);
    // Let Electron handle opening in default browser
  });

  console.log('Webview listeners setup complete');
};

// Navigation methods
const reload = () => {
  if (!webviewElement.value) return;

  hasError.value = false;
  errorMessage.value = null;
  errorDetails.value = null;
  isLoading.value = true;
  webviewElement.value.reload();
};

const goHome = () => {
  if (!webviewElement.value) return;

  hasError.value = false;
  errorMessage.value = null;
  errorDetails.value = null;
  isLoading.value = true;
  currentUrl.value = 'https://www.zztakeoff.com/login';
  webviewElement.value.loadURL(currentUrl.value);
};

const goBack = () => {
  if (!webviewElement.value) return;

  if (webviewElement.value.canGoBack()) {
    webviewElement.value.goBack();
  }
};

const goForward = () => {
  if (!webviewElement.value) return;

  if (webviewElement.value.canGoForward()) {
    webviewElement.value.goForward();
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

// Find in Page functions
const toggleFindBar = async () => {
  console.log('[Find] Toggle find bar clicked');

  showFindBar.value = !showFindBar.value;

  if (showFindBar.value) {
    // Focus the input when opening
    await nextTick();
    if (findInputRef.value) {
      findInputRef.value.focus();
      findInputRef.value.select();
    }
  } else {
    // Stop find when closing
    if (webviewElement.value) {
      webviewElement.value.stopFindInPage('clearSelection');
      console.log('[Find] Stopped find in page');
    }
    findText.value = '';
    findResults.value = null;
  }
};

const handleFindInput = () => {
  if (!webviewElement.value) return;

  if (!findText.value) {
    findResults.value = null;
    webviewElement.value.stopFindInPage('clearSelection');
    return;
  }

  // Perform find with default options
  console.log('[Find] Searching for:', findText.value);
  webviewElement.value.findInPage(findText.value);
};

const findNext = () => {
  if (!webviewElement.value || !findText.value) return;

  console.log('[Find] Finding next');
  webviewElement.value.findInPage(findText.value, { forward: true, findNext: true });
};

const findPrevious = () => {
  if (!webviewElement.value || !findText.value) return;

  console.log('[Find] Finding previous');
  webviewElement.value.findInPage(findText.value, { forward: false, findNext: true });
};

const toggleMaximize = () => {
  isMaximized.value = !isMaximized.value;
};

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

// Setup and cleanup
onMounted(async () => {
  console.log('ZzTakeoffWebTab mounted - setting up webview');

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
    console.error('Error loading preferences:', error);
  }

  // Set up webview element event listeners
  await nextTick();
  setupWebviewListeners();

  // Auto-maximize webview if preference is enabled OR if parent set maximize state
  if (shouldAutoMaximize || isMaximized.value) {
    console.log('Auto-maximizing webview based on:', shouldAutoMaximize ? 'openExpanded preference' : 'parent maximize state');
    if (!isMaximized.value) {
      toggleMaximize();
    }
  }
});

onUnmounted(() => {
  console.log('ZzTakeoffWebTab unmounted');
  // Don't reset maximize state on unmount - let App.vue control the maximize state
  // This allows navigation between tabs via dropdown while staying maximized
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

.find-bar {
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  z-index: 2;
}

.find-bar input {
  max-width: 300px;
}

.webview-container {
  background-color: #ffffff;
  min-height: 200px;
}

.webview-element {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  visibility: visible;
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

[data-theme="dark"] .find-bar {
  background-color: var(--bg-secondary);
  border-bottom-color: var(--border-color);
}

[data-theme="dark"] .webview-container {
  background-color: #1a1a1a;
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

.alert ul {
  padding-left: 1.5rem;
  margin-top: 0.5rem;
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
