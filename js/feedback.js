/**
 * Feedback Component
 * Handles feedback button rendering and submission to the API
 */

import { API_BASE } from "./config.js";

// Generate a unique session ID for this page session
const SESSION_ID = crypto.randomUUID();

/**
 * Creates feedback buttons (thumbs up/down) for a bot response
 * @param {string} question - The user's question
 * @param {string} answer - The bot's answer
 * @returns {HTMLElement} Container with feedback buttons
 */
export function createFeedbackButtons(question, answer) {
  const container = document.createElement("div");
  container.className = "flex items-center gap-2 mt-2 pt-2";
  container.style.borderTop = '1px solid var(--border-subtle)';

  // "Was this helpful?" text
  const text = document.createElement("span");
  text.className = "text-xs";
  text.style.color = 'var(--text-secondary)';
  text.textContent = "Was this helpful?";

  // Thumbs up button
  const thumbsUp = document.createElement("button");
  thumbsUp.className = "px-2 py-1 text-sm glass glass-hover rounded cursor-pointer";
  thumbsUp.textContent = "👍";
  thumbsUp.title = "Helpful";
  thumbsUp.addEventListener("click", () => submitFeedback(true, question, answer, container));

  // Thumbs down button
  const thumbsDown = document.createElement("button");
  thumbsDown.className = "px-2 py-1 text-sm glass glass-hover rounded cursor-pointer";
  thumbsDown.textContent = "👎";
  thumbsDown.title = "Not helpful";
  thumbsDown.addEventListener("click", () => submitFeedback(false, question, answer, container));

  container.appendChild(text);
  container.appendChild(thumbsUp);
  container.appendChild(thumbsDown);

  return container;
}

/**
 * Submits feedback to the API
 * @param {boolean} rating - True for thumbs up, false for thumbs down
 * @param {string} question - The user's question
 * @param {string} answer - The bot's answer
 * @param {HTMLElement} container - The feedback button container
 */
async function submitFeedback(rating, question, answer, container) {
  // Disable both buttons immediately
  const buttons = container.querySelectorAll("button");
  buttons.forEach(btn => {
    btn.disabled = true;
    btn.classList.add("opacity-50");
  });

  // Show optional comment prompt ONLY for thumbs down
  const comment = !rating ? prompt("What could be improved? (optional)") : null;

  try {
    const response = await fetch(`${API_BASE}/api/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        session_id: SESSION_ID,
        question,
        answer,
        rating,
        comment: comment || null
      })
    });

    if (response.ok) {
      // Success - replace buttons with confirmation
      container.innerHTML = '<span class="text-xs" style="color: var(--text-secondary);">Thanks for your feedback!</span>';
    } else {
      // Error - log and re-enable buttons (non-intrusive)
      console.error("Failed to submit feedback:", await response.text());
      buttons.forEach(btn => {
        btn.disabled = false;
        btn.classList.remove("opacity-50");
      });
    }
  } catch (error) {
    // Network error - log and re-enable buttons (non-intrusive)
    console.error("Failed to submit feedback:", error);
    buttons.forEach(btn => {
      btn.disabled = false;
      btn.classList.remove("opacity-50");
    });
  }
}
