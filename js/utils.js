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
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    // Non-ISO date strings like "Q4 2025" or "2025-01-26 to 2025-02-01"
    return String(dateString);
  }
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

/**
 * Format a numeric amount as currency with M/B suffix
 * @param {number|string} amount - Amount (may be in millions or raw)
 * @returns {string} Formatted amount (e.g., "$10.5M", "$1.2B")
 */
export function formatCurrency(amount) {
  if (amount == null || amount === '') return '';
  // If already formatted as string like "$200M" or "$3B", return as-is
  if (typeof amount === 'string' && /^\$[\d.]+[KMBkmb]?$/i.test(amount.trim())) {
    return amount.trim();
  }
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.]/g, '')) : amount;
  if (isNaN(num)) return String(amount);
  if (num >= 1000) {
    return '$' + (num / 1000).toFixed(1) + 'B';
  }
  if (num >= 1) {
    return '$' + num.toFixed(1) + 'M';
  }
  return '$' + (num * 1000).toFixed(0) + 'K';
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
