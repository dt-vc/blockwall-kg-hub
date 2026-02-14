/**
 * Message Bubble Rendering Component
 * Handles user and bot message rendering, markdown formatting, and source citations
 */

import { formatDate, escapeHtml, sanitizeAndRender } from "./utils.js";

/**
 * Adds a user message bubble to the chat
 * @param {string} question - The user's question text
 * @returns {HTMLElement} The created message element
 */
export function addUserMessage(question) {
  const messagesContainer = document.getElementById("messages");
  if (!messagesContainer) return null;

  const messageDiv = document.createElement("div");
  messageDiv.className = "flex justify-end mb-4";

  const bubble = document.createElement("div");
  bubble.className = "glass-gold rounded-2xl rounded-br-sm px-4 py-2 max-w-[90%] md:max-w-[80%]";
  bubble.innerHTML = `<p class="text-sm" style="color: var(--text-primary);">${escapeHtml(question)}</p>`;

  messageDiv.appendChild(bubble);
  messagesContainer.appendChild(messageDiv);

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  return messageDiv;
}

/**
 * Adds an empty bot message bubble to the chat (for streaming)
 * @returns {HTMLElement} The created message element
 */
export function addBotMessage() {
  const messagesContainer = document.getElementById("messages");
  if (!messagesContainer) return null;

  const messageDiv = document.createElement("div");
  messageDiv.className = "flex justify-start mb-4";

  const bubble = document.createElement("div");
  bubble.className = "glass rounded-2xl rounded-bl-sm px-4 py-3 max-w-[90%] md:max-w-[85%]";

  bubble.innerHTML = `
    <div class="answer-content prose prose-invert prose-sm"></div>
    <div class="sources-container mt-3 hidden"></div>
    <div class="entities-container mt-2 hidden"></div>
    <div class="feedback-container mt-2 hidden"></div>
  `;

  messageDiv.appendChild(bubble);
  messagesContainer.appendChild(messageDiv);

  // Initialize the full text buffer
  messageDiv.dataset.fullText = "";

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  return messageDiv;
}

/**
 * Updates a bot message with a new token (for streaming)
 * @param {HTMLElement} messageEl - The bot message element
 * @param {string} token - The new token to append
 */
export function updateBotMessage(messageEl, token) {
  if (!messageEl) return;

  const answerContent = messageEl.querySelector(".answer-content");
  if (!answerContent) return;

  // Append token to full text buffer
  messageEl.dataset.fullText += token;

  // Re-render the entire text with markdown
  answerContent.innerHTML = sanitizeAndRender(messageEl.dataset.fullText);

  // Scroll to bottom
  const messagesContainer = document.getElementById("messages");
  if (messagesContainer) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

/**
 * Finalizes a bot message after streaming is complete
 * @param {HTMLElement} messageEl - The bot message element
 */
export function finalizeBotMessage(messageEl) {
  if (!messageEl) return;

  const answerContent = messageEl.querySelector(".answer-content");
  if (!answerContent) return;

  // Final render of the complete message
  const fullText = messageEl.dataset.fullText || "";
  answerContent.innerHTML = sanitizeAndRender(fullText);

  // Remove any loading indicators
  const loadingIndicator = messageEl.querySelector(".loading-indicator");
  if (loadingIndicator) {
    loadingIndicator.remove();
  }
}

/**
 * Renders source citations below a bot message
 * @param {HTMLElement} messageEl - The bot message element
 * @param {Array} sources - Array of source objects {title, url?, published_at?}
 */
export function renderSources(messageEl, sources) {
  if (!messageEl || !sources || sources.length === 0) return;

  const sourcesContainer = messageEl.querySelector(".sources-container");
  if (!sourcesContainer) return;

  // Show the container
  sourcesContainer.classList.remove("hidden");

  // Build sources HTML
  let sourcesHTML = '<p class="text-xs mb-2" style="color: var(--text-muted);">Sources:</p>';
  sourcesHTML += '<div class="space-y-1">';

  sources.forEach((source, index) => {
    const title = escapeHtml(source.title || `Source ${index + 1}`);
    const url = source.url;
    const publishedAt = source.published_at;

    sourcesHTML += '<div class="text-xs">';

    if (url) {
      // Clickable link
      sourcesHTML += `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="hover:underline" style="color: var(--gold);">${title}</a>`;
    } else {
      // Plain text
      sourcesHTML += `<span class="text-gray-400">${title}</span>`;
    }

    // Add published date if available
    if (publishedAt) {
      const formattedDate = formatDate(publishedAt);
      sourcesHTML += ` <span class="text-gray-600">${formattedDate}</span>`;
    }

    sourcesHTML += '</div>';
  });

  sourcesHTML += '</div>';
  sourcesContainer.innerHTML = sourcesHTML;
}

/**
 * Clears all messages from the chat (except suggestions)
 */
export function clearMessages() {
  const messagesContainer = document.getElementById("messages");
  if (!messagesContainer) return;

  // Get all message divs except suggestions
  const messageDivs = messagesContainer.querySelectorAll(":scope > div:not(#suggestions)");
  messageDivs.forEach(div => div.remove());
}
