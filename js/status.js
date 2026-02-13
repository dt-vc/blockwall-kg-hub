/**
 * Pipeline Status Indicator Component
 * Shows real-time pipeline stage transitions and cold start retry messages
 */

// Maps SSE status events to user-friendly labels
const STATUS_LABELS = {
  classifying: "Classifying question...",
  generating_cypher: "Generating graph query...",
  querying_graph: "Searching knowledge graph...",
  answering: "Writing answer..."
};

// Maps status events to step numbers (for progress indicator)
const STATUS_STEPS = {
  classifying: { current: 1, total: 3 },
  generating_cypher: { current: 2, total: 3 },
  querying_graph: { current: 3, total: 3 },
  answering: null // answering hides the status bar
};

/**
 * Updates the pipeline status indicator with current stage
 * @param {string} status - Status event from SSE (classifying, generating_cypher, etc.)
 */
export function updateStatus(status) {
  const statusEl = document.getElementById("pipeline-status");
  if (!statusEl) return;

  // Hide status for idle, done, or answering stages
  if (status === "idle" || status === "done" || status === "answering") {
    statusEl.classList.add("hidden");
    return;
  }

  // Show status and update content
  statusEl.classList.remove("hidden");

  const label = STATUS_LABELS[status] || "Processing...";
  const step = STATUS_STEPS[status];

  let stepIndicator = "";
  if (step) {
    stepIndicator = `<span class="text-xs text-gray-500 ml-2">Step ${step.current}/${step.total}</span>`;
  }

  statusEl.innerHTML = `
    <div class="flex items-center gap-2">
      <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
      <span class="text-xs text-gray-400">${label}</span>
      ${stepIndicator}
    </div>
  `;
}

/**
 * Shows cold start retry status with countdown
 * @param {number} attempt - Current retry attempt number
 * @param {number} delayMs - Delay in milliseconds before next retry
 * @param {string} message - User-friendly retry message
 */
export function showRetryStatus(attempt, delayMs, message) {
  const statusEl = document.getElementById("pipeline-status");
  if (!statusEl) return;

  statusEl.classList.remove("hidden");

  const delaySeconds = Math.ceil(delayMs / 1000);
  const maxAttempts = 5;

  statusEl.innerHTML = `
    <div class="flex items-center gap-2">
      <div class="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
      <span class="text-xs text-amber-400">${message}</span>
      <span class="text-xs text-gray-500 ml-2">Attempt ${attempt}/${maxAttempts}</span>
      <span class="text-xs text-gray-600">• Retrying in ${delaySeconds}s</span>
    </div>
  `;
}

/**
 * Hides the pipeline status indicator
 */
export function hideStatus() {
  const statusEl = document.getElementById("pipeline-status");
  if (!statusEl) return;

  statusEl.classList.add("hidden");
}
