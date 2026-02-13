/**
 * API client for Blockwall Knowledge Hub
 * Handles communication with the Render backend with exponential backoff retry
 */

import { API_BASE, RETRY_CONFIG } from './config.js';
import { sleep } from './utils.js';

/**
 * Calculate backoff delay with exponential growth and jitter
 * @param {number} attempt - Current attempt number (1-indexed)
 * @returns {number} Delay in milliseconds
 */
function calculateBackoff(attempt) {
  // Exponential backoff: initialDelay * (multiplier ^ (attempt - 1))
  const baseDelay = RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1);

  // Cap at maxDelay
  const cappedDelay = Math.min(baseDelay, RETRY_CONFIG.maxDelay);

  // Add jitter: +/- jitterFactor * cappedDelay
  const jitterRange = RETRY_CONFIG.jitterFactor * cappedDelay;
  const jitter = (Math.random() * 2 - 1) * jitterRange; // Random between -jitterRange and +jitterRange

  return Math.floor(cappedDelay + jitter);
}

/**
 * Fetch with exponential backoff retry
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @param {function} onRetry - Callback(attempt, delay, message) called on each retry
 * @returns {Promise<Response>} Fetch response
 */
export async function fetchWithRetry(url, options = {}, onRetry = null) {
  const retryMessages = [
    "Waking up server...",
    "Connecting to database...",
    "Loading knowledge graph...",
    "Almost ready...",
    "Retrying..."
  ];

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      // Add 45s timeout for cold start
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Check if status is retryable
      if (RETRY_CONFIG.retryableStatuses.includes(response.status)) {
        if (attempt === RETRY_CONFIG.maxAttempts) {
          throw new Error(`Server returned ${response.status} after ${RETRY_CONFIG.maxAttempts} attempts`);
        }

        // Calculate delay and notify
        const delay = calculateBackoff(attempt);
        const message = retryMessages[Math.min(attempt - 1, retryMessages.length - 1)];

        if (onRetry) {
          onRetry(attempt, delay, message);
        }

        await sleep(delay);
        continue;
      }

      // Success or non-retryable error
      return response;

    } catch (error) {
      // Handle network errors and timeouts
      if (error.name === 'AbortError' || error instanceof TypeError) {
        if (attempt === RETRY_CONFIG.maxAttempts) {
          throw new Error(`Network error after ${RETRY_CONFIG.maxAttempts} attempts: ${error.message}`);
        }

        // Calculate delay and notify
        const delay = calculateBackoff(attempt);
        const message = retryMessages[Math.min(attempt - 1, retryMessages.length - 1)];

        if (onRetry) {
          onRetry(attempt, delay, message);
        }

        await sleep(delay);
        continue;
      }

      // Non-retryable error
      throw error;
    }
  }

  throw new Error('Max retry attempts exceeded');
}

/**
 * Check backend health
 * @returns {Promise<object>} Health check response
 */
export async function checkHealth() {
  const response = await fetchWithRetry(`${API_BASE}/health`);

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

// Store current stream controller to allow cancellation
let currentStreamController = null;

/**
 * Ask a question and stream the response via SSE
 * @param {string} question - The question to ask
 * @param {function} onEvent - Callback(event) for each SSE event
 * @param {function} onError - Callback(error) for errors
 * @param {function} onRetry - Callback(attempt, delay, message) for retry status
 */
export async function askQuestionStream(question, onEvent, onError, onRetry) {
  try {
    // Cancel previous stream if exists
    if (currentStreamController) {
      currentStreamController.abort();
      currentStreamController = null;
    }

    // First, wake up the backend with health check
    await fetchWithRetry(`${API_BASE}/health`, {}, onRetry);

    // Create new abort controller for this stream
    currentStreamController = new AbortController();

    // Start the streaming query
    const response = await fetch(`${API_BASE}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ question }),
      signal: currentStreamController.signal
    });

    if (!response.ok) {
      throw new Error(`Stream failed: ${response.status} ${response.statusText}`);
    }

    // Read the SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6); // Remove "data: " prefix

          if (data.trim()) {
            try {
              const event = JSON.parse(data);
              onEvent(event);

              // If done event, stop reading
              if (event.type === 'done') {
                reader.cancel();
                return;
              }
            } catch (parseError) {
              console.error('Failed to parse SSE event:', parseError, data);
            }
          }
        }
      }
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      // Stream was cancelled, this is normal
      console.log('Stream cancelled');
    } else {
      onError(error);
    }
  } finally {
    currentStreamController = null;
  }
}
