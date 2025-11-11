import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue()
  ],
  // Use relative base path for Electron (file:// protocol)
  base: './',
  build: {
    // Manual chunk splitting for better caching and initial load performance
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate AG Grid into its own chunk (large library)
          'ag-grid': ['ag-grid-community', 'ag-grid-vue3'],
          // Separate Vue and router
          'vue-vendor': ['vue', 'vue-router'],
          // Separate Bootstrap and related UI libraries
          'ui-vendor': ['bootstrap', '@popperjs/core', 'vuedraggable'],
          // Keep axios separate for API calls
          'api-vendor': ['axios']
        }
      }
    },
    // Increase chunk size warning limit since we're now splitting properly
    chunkSizeWarningLimit: 600
  }
})
