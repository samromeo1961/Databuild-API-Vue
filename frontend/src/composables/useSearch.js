/**
 * useSearch Composable
 *
 * Provides reusable search and filter logic with debouncing.
 * Eliminates ~200 lines of duplicate code across tab components.
 *
 * Features:
 * - Debounced search input
 * - Clear search functionality
 * - Loading state management
 * - Search callback integration
 *
 * @example
 * import { useSearch } from '@/composables/useSearch';
 *
 * const {
 *   searchTerm,
 *   isSearching,
 *   onSearchChange,
 *   clearSearch,
 *   setSearchTerm
 * } = useSearch({
 *   onSearch: loadData,
 *   debounceMs: 300
 * });
 */

import { ref, watch } from 'vue';
import logger from '../utils/logger';
import { GRID_DEFAULTS } from '../constants/grid';

export function useSearch(options = {}) {
  const {
    onSearch = null,
    debounceMs = GRID_DEFAULTS.SEARCH_DEBOUNCE_MS,
    minLength = 0,
    componentName = 'useSearch'
  } = options;

  // Search state
  const searchTerm = ref('');
  const isSearching = ref(false);
  let searchDebounce = null;

  /**
   * Handle search input with debouncing
   */
  const onSearchChange = () => {
    // Clear existing timeout
    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }

    // Set searching state
    isSearching.value = true;

    // Check minimum length
    if (minLength > 0 && searchTerm.value.length > 0 && searchTerm.value.length < minLength) {
      logger.debug(componentName, `Search term too short (min: ${minLength})`);
      isSearching.value = false;
      return;
    }

    // Debounce search
    searchDebounce = setTimeout(async () => {
      try {
        logger.debug(componentName, `Searching for: "${searchTerm.value}"`);

        if (onSearch) {
          await onSearch(searchTerm.value);
        }
      } catch (err) {
        logger.error(componentName, 'Error during search', err);
      } finally {
        isSearching.value = false;
      }
    }, debounceMs);
  };

  /**
   * Clear search term and trigger search callback
   */
  const clearSearch = async () => {
    try {
      searchTerm.value = '';
      isSearching.value = true;

      logger.debug(componentName, 'Search cleared');

      if (onSearch) {
        await onSearch('');
      }
    } catch (err) {
      logger.error(componentName, 'Error clearing search', err);
    } finally {
      isSearching.value = false;
    }
  };

  /**
   * Set search term programmatically (without debouncing)
   * @param {string} value - New search term
   * @param {boolean} triggerSearch - Whether to trigger search callback
   */
  const setSearchTerm = async (value, triggerSearch = true) => {
    searchTerm.value = value;

    if (triggerSearch && onSearch) {
      isSearching.value = true;
      try {
        await onSearch(value);
      } catch (err) {
        logger.error(componentName, 'Error setting search term', err);
      } finally {
        isSearching.value = false;
      }
    }
  };

  /**
   * Check if search term matches a value
   * @param {string} value - Value to check
   * @returns {boolean} True if matches
   */
  const matches = (value) => {
    if (!searchTerm.value) return true;
    if (!value) return false;

    const search = searchTerm.value.toLowerCase();
    const val = String(value).toLowerCase();

    return val.includes(search);
  };

  /**
   * Multi-field search - checks if search term matches any field
   * @param {Object} item - Item to search
   * @param {Array<string>} fields - Field names to search
   * @returns {boolean} True if any field matches
   *
   * @example
   * const match = matchesAny(item, ['code', 'description', 'unit']);
   */
  const matchesAny = (item, fields) => {
    if (!searchTerm.value) return true;
    if (!item) return false;

    const search = searchTerm.value.toLowerCase();

    return fields.some(field => {
      const value = item[field];
      if (!value) return false;
      return String(value).toLowerCase().includes(search);
    });
  };

  /**
   * Multi-word search - all words must match at least one field
   * @param {Object} item - Item to search
   * @param {Array<string>} fields - Field names to search
   * @returns {boolean} True if all search words match
   *
   * @example
   * // searchTerm = "concrete pipe"
   * // Returns true if item contains both "concrete" AND "pipe" in any field
   * const match = matchesAllWords(item, ['code', 'description']);
   */
  const matchesAllWords = (item, fields) => {
    if (!searchTerm.value) return true;
    if (!item) return false;

    // Split search term into words
    const searchWords = searchTerm.value
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => word.toLowerCase());

    if (searchWords.length === 0) return true;

    // Concatenate all searchable field values
    const searchableText = fields
      .map(field => String(item[field] || '').toLowerCase())
      .join(' ');

    // Check if all search words are present
    return searchWords.every(word => searchableText.includes(word));
  };

  return {
    // State
    searchTerm,
    isSearching,

    // Methods
    onSearchChange,
    clearSearch,
    setSearchTerm,
    matches,
    matchesAny,
    matchesAllWords
  };
}
