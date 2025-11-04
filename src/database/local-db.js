const path = require('path');
const { app } = require('electron');
const fs = require('fs');

// Try to load better-sqlite3, but gracefully handle if it's not available
let Database;
let sqliteAvailable = false;

try {
  Database = require('better-sqlite3');
  sqliteAvailable = true;
  console.log('✓ better-sqlite3 loaded successfully');
} catch (err) {
  console.warn('⚠ better-sqlite3 not available, will use electron-store fallback');
  console.warn('  To enable SQLite: install Visual Studio Build Tools and run "npm rebuild better-sqlite3"');
}

// Database file location
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'dbx-local.db');

if (sqliteAvailable) {
  console.log('✓ Local database path:', dbPath);
}

// Initialize database
let db;

function initDatabase() {
  if (!sqliteAvailable) {
    return null;
  }

  try {
    // Ensure directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    // Open database connection
    db = new Database(dbPath, { verbose: console.log });

    // Enable WAL mode for better concurrent performance
    db.pragma('journal_mode = WAL');

    // Create tables if they don't exist
    createTables();

    console.log('✓ Local SQLite database initialized');
    return db;
  } catch (err) {
    console.error('Error initializing local database:', err);
    sqliteAvailable = false;
    return null;
  }
}

function createTables() {
  // Templates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      templateName TEXT NOT NULL,
      description TEXT,
      dateCreated TEXT NOT NULL,
      dateModified TEXT NOT NULL,
      userId TEXT DEFAULT 'default'
    )
  `);

  // Template items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS template_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      templateId TEXT NOT NULL,
      PriceCode TEXT NOT NULL,
      description TEXT,
      Unit TEXT,
      Price REAL DEFAULT 0,
      CostCentre TEXT,
      zzType TEXT DEFAULT 'count',
      quantity REAL DEFAULT 1,
      sortOrder INTEGER DEFAULT 0,
      FOREIGN KEY (templateId) REFERENCES templates(id) ON DELETE CASCADE
    )
  `);

  // Preferences table (key-value store with JSON support)
  db.exec(`
    CREATE TABLE IF NOT EXISTS preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      dateModified TEXT NOT NULL
    )
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_template_items_templateId
    ON template_items(templateId)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_template_items_PriceCode
    ON template_items(PriceCode)
  `);

  console.log('✓ Local database tables created/verified');
}

function getDatabase() {
  if (!sqliteAvailable) {
    return null;
  }
  if (!db) {
    initDatabase();
  }
  return db;
}

function isSqliteAvailable() {
  return sqliteAvailable;
}

function closeDatabase() {
  if (db) {
    db.close();
    console.log('✓ Local database connection closed');
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase,
  isSqliteAvailable,
  dbPath
};
