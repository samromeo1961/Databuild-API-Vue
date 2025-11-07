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

    <!-- Info Message - BrowserView renders natively (only show when not maximized and no error) -->
    <div v-if="!hasError && !isMaximized" class="alert alert-info m-3" role="alert">
      <i class="bi bi-info-circle me-2"></i>
      <strong>Native Web View</strong> - This page is rendered using Electron's BrowserView. Click the <i class="bi bi-fullscreen"></i> button to maximize once logged in.
    </div>

    <!-- Webview Container (BrowserView will be positioned here) -->
    <div class="webview-container flex-grow-1 position-relative" ref="webviewContainerRef">
      <!-- BrowserView will be overlaid by Electron -->

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
const toggleTabDropdown = async () => {
  showTabDropdown.value = !showTabDropdown.value;

  // When dropdown opens, adjust BrowserView bounds to make room
  if (showTabDropdown.value) {
    await nextTick();
    const bounds = calculateBounds();
    if (bounds && api.webview) {
      // Reserve 450px for the dropdown menu
      const dropdownHeight = 450;
      const adjustedBounds = {
        ...bounds,
        y: bounds.y + dropdownHeight,
        height: Math.max(bounds.height - dropdownHeight, 100)
      };
      await api.webview.setBounds(adjustedBounds);
    }
  } else {
    // Restore original bounds when dropdown closes
    await nextTick();
    handleResize();
  }
};

// Close dropdown
const closeDropdown = async () => {
  showTabDropdown.value = false;
  await nextTick();
  handleResize();
};

// Exit fullscreen function
const exitFullscreen = async () => {
  showTabDropdown.value = false; // Close dropdown
  await nextTick();
  handleResize(); // Restore bounds
  isMaximized.value = false; // Exit fullscreen mode
};

// Calculate bounds for BrowserView
const calculateBounds = () => {
  if (!webviewContainerRef.value) return null;

  const rect = webviewContainerRef.value.getBoundingClientRect();
  return {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  };
};

// Create BrowserView
const createWebView = async () => {
  try {
    await nextTick();
    const bounds = calculateBounds();

    if (!bounds || bounds.width === 0 || bounds.height === 0) {
      console.warn('Invalid bounds, retrying...');
      setTimeout(createWebView, 100);
      return;
    }

    console.log('Creating BrowserView with bounds:', bounds);
    const result = await api.webview.create(currentUrl.value, bounds);

    if (result.success) {
      console.log('BrowserView created successfully');
      isLoading.value = true;
    } else {
      hasError.value = true;
      errorMessage.value = result.message || 'Failed to create web view';
    }
  } catch (error) {
    console.error('Error creating BrowserView:', error);
    hasError.value = true;
    errorMessage.value = error.message || 'Failed to create web view';
  }
};

// Navigation methods
const reload = async () => {
  try {
    hasError.value = false;
    errorMessage.value = null;
    errorDetails.value = null;
    isLoading.value = true;
    await api.webview.reload();
  } catch (error) {
    console.error('Error reloading:', error);
    hasError.value = true;
    errorMessage.value = error.message;
  }
};

const goHome = async () => {
  try {
    hasError.value = false;
    errorMessage.value = null;
    errorDetails.value = null;
    isLoading.value = true;
    currentUrl.value = 'https://www.zztakeoff.com/login';
    await api.webview.navigate(currentUrl.value);
  } catch (error) {
    console.error('Error navigating home:', error);
    hasError.value = true;
    errorMessage.value = error.message;
  }
};

const goBack = async () => {
  try {
    const result = await api.webview.goBack();
    if (result.success) {
      canGoBack.value = result.canGoBack !== false;
    }
  } catch (error) {
    console.error('Error going back:', error);
  }
};

const goForward = async () => {
  try {
    const result = await api.webview.goForward();
    if (result.success) {
      canGoForward.value = result.canGoForward !== false;
    }
  } catch (error) {
    console.error('Error going forward:', error);
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

  // Keep maximized state when going back to the tab
  // (isMaximized stays true, the other tab will handle it)
};

const selectTabAndGoBack = async (tab) => {
  // Close the dropdown and restore BrowserView bounds
  showTabDropdown.value = false;
  await nextTick();
  handleResize();

  // Save the selected tab to preferences
  lastTabPath.value = tab.path;
  await api.preferencesStore.update('lastActiveTab', tab.path);

  // Mark that we're navigating via dropdown
  navigatingViaDropdown.value = true;

  // Navigate to the selected tab and keep it maximized
  await router.push(tab.path);

  // Keep maximized state
  // (isMaximized stays true for the selected tab)
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
  console.log('[Find] Toggle find bar clicked, current state:', showFindBar.value);
  console.log('[Find] WebView available:', !!api.webview);

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
    if (api.webview && api.webview.stopFindInPage) {
      try {
        await api.webview.stopFindInPage('clearSelection');
        console.log('[Find] Stopped find in page');
      } catch (error) {
        console.error('[Find] Error stopping find:', error);
      }
    }
    findText.value = '';
    findResults.value = null;
  }
};

const handleFindInput = async () => {
  console.log('[Find] Input changed:', findText.value);

  if (!findText.value) {
    findResults.value = null;
    if (api.webview && api.webview.stopFindInPage) {
      try {
        await api.webview.stopFindInPage('clearSelection');
      } catch (error) {
        console.error('[Find] Error clearing selection:', error);
      }
    }
    return;
  }

  // Perform find with default options
  if (api.webview && api.webview.findInPage) {
    try {
      console.log('[Find] Searching for:', findText.value);
      const result = await api.webview.findInPage(findText.value, { findNext: false });
      console.log('[Find] Search result:', result);
    } catch (error) {
      console.error('[Find] Error finding in page:', error);
    }
  } else {
    console.warn('[Find] WebView or findInPage not available');
  }
};

const findNext = async () => {
  if (!findText.value) return;

  if (api.webview && api.webview.findInPage) {
    try {
      console.log('[Find] Finding next:', findText.value);
      await api.webview.findInPage(findText.value, { findNext: true, forward: true });
    } catch (error) {
      console.error('[Find] Error finding next:', error);
    }
  } else {
    console.warn('[Find] WebView or findInPage not available');
  }
};

const findPrevious = async () => {
  if (!findText.value) return;

  if (api.webview && api.webview.findInPage) {
    try {
      console.log('[Find] Finding previous:', findText.value);
      await api.webview.findInPage(findText.value, { findNext: true, forward: false });
    } catch (error) {
      console.error('[Find] Error finding previous:', error);
    }
  } else {
    console.warn('[Find] WebView or findInPage not available');
  }
};

const handleFoundInPage = (result) => {
  findResults.value = {
    activeMatchOrdinal: result.activeMatchOrdinal,
    matches: result.matches
  };
};

const toggleMaximize = () => {
  isMaximized.value = !isMaximized.value;
  // Recalculate and update bounds after maximize state changes
  nextTick(() => {
    handleResize();
  });
};

// Event handlers
const handleLoadingChange = (loading) => {
  isLoading.value = loading;
  console.log('Loading state changed:', loading);
};

const handleUrlChange = (url) => {
  currentUrl.value = url;
  console.log('URL changed:', url);
};

const handleLoadError = (error) => {
  console.error('Load error:', error);
  hasError.value = true;
  errorMessage.value = error.errorDescription || 'Failed to load page';
  errorDetails.value = error;
  isLoading.value = false;
};

// Handle window resize
const handleResize = () => {
  const bounds = calculateBounds();
  if (bounds && api.webview) {
    api.webview.setBounds(bounds);
  }
};

// Watch for maximize state changes to update bounds
watch(isMaximized, async () => {
  // Wait for DOM to update, then recalculate bounds
  await nextTick();
  setTimeout(() => {
    handleResize();
  }, 100);
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

// Setup and cleanup
onMounted(async () => {
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

  // Set up event listeners
  if (api.webview) {
    api.webview.onLoading(handleLoadingChange);
    api.webview.onUrlChanged(handleUrlChange);
    api.webview.onLoadError(handleLoadError);
    api.webview.onFoundInPage(handleFoundInPage);
  }

  // Create BrowserView
  await createWebView();

  // Auto-maximize webview if preference is enabled OR if parent set maximize state
  if (shouldAutoMaximize || isMaximized.value) {
    console.log('Auto-maximizing webview based on:', shouldAutoMaximize ? 'openExpanded preference' : 'parent maximize state');
    if (!isMaximized.value) {
      toggleMaximize();
    } else {
      // If already set to true by parent (e.g., SendToZzTakeoffModal), just update bounds
      await nextTick();
      handleResize();
    }
  }

  // Listen for window resize
  window.addEventListener('resize', handleResize);
});

onUnmounted(async () => {
  // Don't reset maximize state on unmount - let App.vue control the maximize state
  // This allows navigation between tabs via dropdown while staying maximized

  // Remove resize listener
  window.removeEventListener('resize', handleResize);

  // Destroy BrowserView
  if (api.webview) {
    try {
      await api.webview.destroy();
      console.log('BrowserView destroyed');
    } catch (error) {
      console.error('Error destroying BrowserView:', error);
    }
  }
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
