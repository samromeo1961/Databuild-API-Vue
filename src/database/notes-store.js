const Store = require('electron-store');

// electron-store for user-specific notes
// Structure: { "PRICECODE": "user note text", ... }
const store = new Store({ name: 'notes', defaults: { notes: {} } });

/**
 * Get all notes
 * @returns {Object} Object with PriceCode as keys and note text as values
 */
function getAllNotes() {
  try {
    return store.get('notes', {});
  } catch (err) {
    console.error('Error getting all notes:', err);
    return {};
  }
}

/**
 * Get note for a specific PriceCode
 * @param {string} priceCode - PriceCode to get note for
 * @returns {string|null} Note text or null if not found
 */
function getNote(priceCode) {
  try {
    if (!priceCode) return null;
    const notes = store.get('notes', {});
    return notes[priceCode] || null;
  } catch (err) {
    console.error('Error getting note:', err);
    return null;
  }
}

/**
 * Save/update note for a PriceCode
 * @param {string} priceCode - PriceCode to save note for
 * @param {string} noteText - Note text (empty string to clear)
 * @returns {Object} Result object with success status
 */
function saveNote(priceCode, noteText) {
  try {
    if (!priceCode) {
      return {
        success: false,
        message: 'PriceCode is required'
      };
    }

    const notes = store.get('notes', {});

    if (!noteText || noteText.trim() === '') {
      // Delete note if empty
      delete notes[priceCode];
    } else {
      // Save note
      notes[priceCode] = noteText.trim();
    }

    store.set('notes', notes);

    return {
      success: true,
      message: 'Note saved successfully'
    };
  } catch (err) {
    console.error('Error saving note:', err);
    return {
      success: false,
      message: err.message
    };
  }
}

/**
 * Delete note for a PriceCode
 * @param {string} priceCode - PriceCode to delete note for
 * @returns {Object} Result object with success status
 */
function deleteNote(priceCode) {
  try {
    if (!priceCode) {
      return {
        success: false,
        message: 'PriceCode is required'
      };
    }

    const notes = store.get('notes', {});
    delete notes[priceCode];
    store.set('notes', notes);

    return {
      success: true,
      message: 'Note deleted successfully'
    };
  } catch (err) {
    console.error('Error deleting note:', err);
    return {
      success: false,
      message: err.message
    };
  }
}

/**
 * Save multiple notes at once (for import)
 * @param {Object} notesObj - Object with PriceCode as keys and note text as values
 * @param {boolean} merge - If true, merge with existing notes; if false, replace all
 * @returns {Object} Result object with success status
 */
function saveMultipleNotes(notesObj, merge = true) {
  try {
    if (!notesObj || typeof notesObj !== 'object') {
      return {
        success: false,
        message: 'Invalid notes object'
      };
    }

    let notes = merge ? store.get('notes', {}) : {};

    // Merge or replace notes
    Object.keys(notesObj).forEach(priceCode => {
      const noteText = notesObj[priceCode];
      if (noteText && noteText.trim() !== '') {
        notes[priceCode] = noteText.trim();
      }
    });

    store.set('notes', notes);

    return {
      success: true,
      message: `${Object.keys(notesObj).length} notes saved successfully`,
      count: Object.keys(notesObj).length
    };
  } catch (err) {
    console.error('Error saving multiple notes:', err);
    return {
      success: false,
      message: err.message
    };
  }
}

/**
 * Clear all notes
 * @returns {Object} Result object with success status
 */
function clearAllNotes() {
  try {
    store.set('notes', {});

    return {
      success: true,
      message: 'All notes cleared'
    };
  } catch (err) {
    console.error('Error clearing notes:', err);
    return {
      success: false,
      message: err.message
    };
  }
}

/**
 * Get notes count
 * @returns {number} Number of notes stored
 */
function getNotesCount() {
  try {
    const notes = store.get('notes', {});
    return Object.keys(notes).length;
  } catch (err) {
    console.error('Error getting notes count:', err);
    return 0;
  }
}

module.exports = {
  getAllNotes,
  getNote,
  saveNote,
  deleteNote,
  saveMultipleNotes,
  clearAllNotes,
  getNotesCount
};
