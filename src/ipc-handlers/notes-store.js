const notesStore = require('../database/notes-store');

/**
 * Get all notes
 */
async function handleGetAllNotes() {
  try {
    const notes = notesStore.getAllNotes();
    return {
      success: true,
      data: notes
    };
  } catch (err) {
    return {
      success: false,
      message: err.message,
      data: {}
    };
  }
}

/**
 * Get note for a specific PriceCode
 */
async function handleGetNote(event, priceCode) {
  try {
    const note = notesStore.getNote(priceCode);
    return {
      success: true,
      data: note
    };
  } catch (err) {
    return {
      success: false,
      message: err.message,
      data: null
    };
  }
}

/**
 * Save/update note for a PriceCode
 */
async function handleSaveNote(event, priceCode, noteText) {
  try {
    const result = notesStore.saveNote(priceCode, noteText);
    return result;
  } catch (err) {
    return {
      success: false,
      message: err.message
    };
  }
}

/**
 * Delete note for a PriceCode
 */
async function handleDeleteNote(event, priceCode) {
  try {
    const result = notesStore.deleteNote(priceCode);
    return result;
  } catch (err) {
    return {
      success: false,
      message: err.message
    };
  }
}

/**
 * Save multiple notes at once (for import)
 */
async function handleSaveMultipleNotes(event, notesObj, merge = true) {
  try {
    const result = notesStore.saveMultipleNotes(notesObj, merge);
    return result;
  } catch (err) {
    return {
      success: false,
      message: err.message
    };
  }
}

/**
 * Clear all notes
 */
async function handleClearAllNotes() {
  try {
    const result = notesStore.clearAllNotes();
    return result;
  } catch (err) {
    return {
      success: false,
      message: err.message
    };
  }
}

/**
 * Get notes count
 */
async function handleGetNotesCount() {
  try {
    const count = notesStore.getNotesCount();
    return {
      success: true,
      count: count
    };
  } catch (err) {
    return {
      success: false,
      message: err.message,
      count: 0
    };
  }
}

module.exports = {
  handleGetAllNotes,
  handleGetNote,
  handleSaveNote,
  handleDeleteNote,
  handleSaveMultipleNotes,
  handleClearAllNotes,
  handleGetNotesCount
};
