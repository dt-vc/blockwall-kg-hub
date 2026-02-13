/**
 * Chat Controller
 * Handles chat form submission, stream event routing, and question processing
 */

import { askQuestionStream, checkHealth } from "./api.js";
import {
  addUserMessage,
  addBotMessage,
  updateBotMessage,
  finalizeBotMessage,
  renderSources
} from "./messages.js";
import { updateStatus, showRetryStatus, hideStatus } from "./status.js";
import { renderEntityPills } from "./entities.js";

// State management
let isProcessing = false;
let currentMessageEl = null;
let storedMetaData = null;

/**
 * Initializes the chat form and event listeners
 */
export function initChat() {
  const form = document.getElementById("chat-form");
  const input = document.getElementById("question-input");

  if (!form || !input) {
    console.error("Chat form or input not found");
    return;
  }

  // Add submit event listener
  form.addEventListener("submit", handleSubmit);

  // Focus the input on init
  input.focus();

  // Add Enter key handler (submit on Enter, allow Shift+Enter for newlines)
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event("submit"));
    }
  });
}

/**
 * Handles form submission
 * @param {Event} event - The form submit event
 */
export function handleSubmit(event) {
  event.preventDefault();

  const input = document.getElementById("question-input");
  const button = document.querySelector('button[type="submit"]');

  if (!input) return;

  const question = input.value.trim();

  // Ignore empty submissions or if already processing
  if (!question || isProcessing) return;

  // Set processing state
  isProcessing = true;

  // Disable input and button
  input.disabled = true;
  input.classList.add("opacity-50", "cursor-not-allowed");

  if (button) {
    button.disabled = true;
    button.classList.add("opacity-50", "cursor-not-allowed");
  }

  // Hide suggestions if visible
  const suggestions = document.getElementById("suggestions");
  if (suggestions && !suggestions.classList.contains("hidden")) {
    suggestions.classList.add("hidden");
  }

  // Add user message to chat
  addUserMessage(question);

  // Clear input
  input.value = "";

  // Create empty bot message for streaming
  currentMessageEl = addBotMessage();

  // Process the question
  processQuestion(question);
}

/**
 * Processes a question through the GraphRAG pipeline
 * @param {string} question - The user's question
 */
async function processQuestion(question) {
  const input = document.getElementById("question-input");
  const button = document.querySelector('button[type="submit"]');

  try {
    await askQuestionStream(
      question,
      // onEvent callback
      (event) => {
        switch (event.type) {
          case "status":
            updateStatus(event.data);
            break;

          case "meta":
            // Render sources
            if (event.data.sources) {
              renderSources(currentMessageEl, event.data.sources);
            }
            // Store metadata on message element and in state for entity pills
            if (currentMessageEl) {
              currentMessageEl.dataset.metadata = JSON.stringify(event.data);
            }
            storedMetaData = event.data;
            break;

          case "token":
            updateBotMessage(currentMessageEl, event.data);
            break;

          case "error":
            // Show error in bot message
            if (currentMessageEl) {
              const answerContent = currentMessageEl.querySelector(".answer-content");
              if (answerContent) {
                answerContent.innerHTML = `<p class="text-red-400 text-sm">${event.data}</p>`;
              }
            }
            hideStatus();
            break;

          case "done":
            hideStatus();
            finalizeBotMessage(currentMessageEl);
            // Render entity pills after answer is complete
            if (currentMessageEl && storedMetaData) {
              renderEntityPills(currentMessageEl, storedMetaData);
            }
            break;
        }
      },
      // onError callback
      (error) => {
        console.error("Stream error:", error);
        if (currentMessageEl) {
          const answerContent = currentMessageEl.querySelector(".answer-content");
          if (answerContent) {
            answerContent.innerHTML = '<p class="text-red-400 text-sm">Failed to get response. Please try again.</p>';
          }
        }
        hideStatus();
      },
      // onRetry callback
      (attempt, delay, message) => {
        showRetryStatus(attempt, delay, message);
      }
    );
  } catch (error) {
    console.error("Failed to process question:", error);
    if (currentMessageEl) {
      const answerContent = currentMessageEl.querySelector(".answer-content");
      if (answerContent) {
        answerContent.innerHTML = '<p class="text-red-400 text-sm">Failed to get response. Please try again.</p>';
      }
    }
    hideStatus();
  } finally {
    // Re-enable input and button
    isProcessing = false;

    if (input) {
      input.disabled = false;
      input.classList.remove("opacity-50", "cursor-not-allowed");
      input.focus();
    }

    if (button) {
      button.disabled = false;
      button.classList.remove("opacity-50", "cursor-not-allowed");
    }
  }
}

/**
 * Sends a question (called from suggestion buttons)
 * @param {string} question - The question to send
 */
export function sendQuestion(question) {
  const input = document.getElementById("question-input");
  if (!input) return;

  // Set input value
  input.value = question;

  // Trigger form submit
  const form = document.getElementById("chat-form");
  if (form) {
    form.dispatchEvent(new Event("submit"));
  }
}
