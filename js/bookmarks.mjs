// Bookmarks/My Events management utility
// Handles saving and retrieving bookmarked events

import { getLocalStorage, setLocalStorage } from './utils.mjs';

const BOOKMARKS_KEY = 'ee-bookmarks';

/**
 * Get all bookmarked events
 * @returns {Array} Array of bookmarked event objects
 */
export function getBookmarks() {
  return getLocalStorage(BOOKMARKS_KEY) || [];
}

/**
 * Check if an event is bookmarked
 * @param {string} eventId - The event ID to check
 * @returns {boolean} True if event is bookmarked
 */
export function isBookmarked(eventId) {
  const bookmarks = getBookmarks();
  return bookmarks.some(event => event.id === eventId);
}

/**
 * Add an event to bookmarks
 * @param {Object} event - The event object to bookmark
 * @returns {boolean} True if added successfully
 */
export function addBookmark(event) {
  const bookmarks = getBookmarks();

  // Check if already bookmarked
  if (isBookmarked(event.id)) {
    return false;
  }

  // Add to bookmarks
  bookmarks.push(event);
  setLocalStorage(BOOKMARKS_KEY, bookmarks);
  return true;
}

/**
 * Remove an event from bookmarks
 * @param {string} eventId - The event ID to remove
 * @returns {boolean} True if removed successfully
 */
export function removeBookmark(eventId) {
  let bookmarks = getBookmarks();
  const initialLength = bookmarks.length;

  bookmarks = bookmarks.filter(event => event.id !== eventId);

  if (bookmarks.length < initialLength) {
    setLocalStorage(BOOKMARKS_KEY, bookmarks);
    return true;
  }

  return false;
}

/**
 * Toggle bookmark status for an event
 * @param {Object} event - The event object
 * @returns {boolean} True if now bookmarked, false if removed
 */
export function toggleBookmark(event) {
  if (isBookmarked(event.id)) {
    removeBookmark(event.id);
    return false;
  } else {
    addBookmark(event);
    return true;
  }
}

/**
 * Get the count of bookmarked events
 * @returns {number} Number of bookmarked events
 */
export function getBookmarkCount() {
  return getBookmarks().length;
}

/**
 * Clear all bookmarks
 */
export function clearAllBookmarks() {
  setLocalStorage(BOOKMARKS_KEY, []);
}
