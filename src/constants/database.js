/**
 * Database Constants
 *
 * Centralized constants for database queries and operations
 */

// Cost Centre Tier Levels
export const COST_CENTRE_TIER = {
  MAIN_LEVEL: '1',
  SUB_LEVEL_1: '2',
  SUB_LEVEL_2: '3'
};

// Price Levels
export const PRICE_LEVEL = {
  BASE: 0,
  LEVEL_1: 1,
  LEVEL_2: 2,
  LEVEL_3: 3
};

// Database Table Names
export const TABLES = {
  PRICE_LIST: 'PriceList',
  COST_CENTRES: 'CostCentres',
  RECIPE: 'Recipe',
  PRICES: 'Prices',
  PER_CODES: 'PerCodes',
  SUPPLIER: 'Supplier',
  SUPPLIER_GROUP: 'SupplierGroup',
  CONTACTS: 'Contacts',
  CONTACT_GROUP: 'ContactGroup',
  CC_BANKS: 'CCBanks',
  SUPPLIERS_PRICES: 'SuppliersPrices'
};

// Common SQL Field Names
export const FIELDS = {
  PRICE_CODE: 'PriceCode',
  DESCRIPTION: 'Description',
  COST_CENTRE: 'CostCentre',
  ARCHIVED: 'Archived',
  RECIPE: 'Recipe',
  TEMPLATE: 'Template'
};

// Default sort orders
export const DEFAULT_SORT_ORDER = 999999;

// Query limits
export const QUERY_LIMITS = {
  MAX_RESULTS: 10000,
  DEFAULT_LIMIT: 1000
};
