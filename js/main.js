/**
 * Main App Initialization
 * Loads starter questions, initializes chat, and performs background health check
 */

import { initChat, sendQuestion } from "./chat.js";
import { checkHealth } from "./api.js";
import { SUGGESTIONS } from "./config.js";
import { initEntityModal } from "./entities.js";

// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Render starter suggestions
  renderSuggestions();

  // 2. Initialize chat
  initChat();

  // 3. Initialize entity modal
  initEntityModal();

  // 4. Background health check (wake backend)
  try {
    await checkHealth();
    console.log("Backend ready");
  } catch (error) {
    console.warn("Backend may be cold, will retry on first question:", error.message);
  }
});

/**
 * Renders starter question suggestions as clickable buttons
 */
function renderSuggestions() {
  const suggestionsEl = document.getElementById("suggestions");
  if (!suggestionsEl) return;

  // Clear existing content
  suggestionsEl.innerHTML = "";

  // Create wrapper
  const wrapper = document.createElement("div");
  wrapper.className = "text-center flex flex-col items-center mt-8";

  // Add label
  const label = document.createElement("p");
  label.className = "text-sm text-gray-500 mb-3";
  label.textContent = "Try asking:";
  wrapper.appendChild(label);

  // Add button container
  const buttonContainer = document.createElement("div");
  buttonContainer.className = "flex flex-wrap justify-center gap-2 max-w-3xl";

  // Create a button for each suggestion
  SUGGESTIONS.forEach((suggestion) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "text-xs px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:border-blue-500 transition-all cursor-pointer";
    button.textContent = suggestion;

    // Add click handler
    button.addEventListener("click", () => {
      sendQuestion(suggestion);
    });

    buttonContainer.appendChild(button);
  });

  wrapper.appendChild(buttonContainer);
  suggestionsEl.appendChild(wrapper);
}

// Make sendQuestion available globally (for debugging if needed)
window.sendQuestion = sendQuestion;
