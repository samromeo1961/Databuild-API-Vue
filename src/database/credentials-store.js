const Store = require('electron-store');
const crypto = require('crypto');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// Create encrypted store for credentials
const store = new Store({
  name: 'credentials',
  encryptionKey: 'dbx-connector-credentials-encryption-key'
});

console.log('✓ Credentials storage initialized at:', store.path);

/**
 * Derive encryption key from password
 */
function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt password
 */
function encryptPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey('dbx-connector-master-key', salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Combine salt + iv + tag + encrypted data
  return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypt password
 */
function decryptPassword(encryptedData) {
  try {
    const buffer = Buffer.from(encryptedData, 'base64');

    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const key = deriveKey('dbx-connector-master-key', salt);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(encrypted, null, 'utf8') + decipher.final('utf8');
  } catch (error) {
    console.error('Error decrypting password:', error);
    return null;
  }
}

/**
 * Save credentials for a URL
 */
function saveCredentials(url, username, password) {
  try {
    const credentials = store.get('credentials', {});

    credentials[url] = {
      username,
      password: encryptPassword(password),
      savedAt: new Date().toISOString()
    };

    store.set('credentials', credentials);
    console.log(`✓ Credentials saved for: ${url}`);

    return { success: true };
  } catch (error) {
    console.error('Error saving credentials:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get credentials for a URL
 */
function getCredentials(url) {
  try {
    const credentials = store.get('credentials', {});

    if (credentials[url]) {
      return {
        success: true,
        data: {
          username: credentials[url].username,
          password: decryptPassword(credentials[url].password),
          savedAt: credentials[url].savedAt
        }
      };
    }

    return { success: false, message: 'No credentials found for this URL' };
  } catch (error) {
    console.error('Error getting credentials:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get all saved URLs
 */
function getAllUrls() {
  try {
    const credentials = store.get('credentials', {});
    const urls = Object.keys(credentials).map(url => ({
      url,
      username: credentials[url].username,
      savedAt: credentials[url].savedAt
    }));

    return { success: true, data: urls };
  } catch (error) {
    console.error('Error getting URLs:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Delete credentials for a URL
 */
function deleteCredentials(url) {
  try {
    const credentials = store.get('credentials', {});
    delete credentials[url];
    store.set('credentials', credentials);

    console.log(`✓ Credentials deleted for: ${url}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting credentials:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Clear all credentials
 */
function clearAllCredentials() {
  try {
    store.set('credentials', {});
    console.log('✓ All credentials cleared');
    return { success: true };
  } catch (error) {
    console.error('Error clearing credentials:', error);
    return { success: false, message: error.message };
  }
}

module.exports = {
  saveCredentials,
  getCredentials,
  getAllUrls,
  deleteCredentials,
  clearAllCredentials
};
