/**
 * Utility functions for the Blockwall Knowledge Hub
 */

/**
 * Sleep for a specified number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format a date string to human-readable format
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

/**
 * Escape HTML characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitize and render markdown to HTML
 * Uses marked.js for parsing and DOMPurify for sanitization
 * @param {string} markdown - Markdown string
 * @returns {string} Sanitized HTML string
 */
export function sanitizeAndRender(markdown) {
  if (!markdown) return '';

  // Parse markdown to HTML using marked (global from CDN)
  const html = window.marked.parse(markdown);

  // Sanitize HTML using DOMPurify (global from CDN)
  const sanitized = window.DOMPurify.sanitize(html);

  return sanitized;
}
