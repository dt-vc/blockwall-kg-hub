/**
 * Configuration for the Blockwall Knowledge Hub
 */

// API base URL pointing to the deployed Render backend
export const API_BASE = "https://blockwall-kg-api.onrender.com";

// Retry configuration for handling cold starts and network issues
export const RETRY_CONFIG = {
  maxAttempts: 5,
  initialDelay: 2000,        // Start with 2 seconds
  maxDelay: 30000,           // Cap at 30 seconds
  backoffMultiplier: 2,      // Double each time
  jitterFactor: 0.3,         // Add +/-30% randomness
  retryableStatuses: [408, 429, 500, 502, 503, 504]
};

// Starter questions to show when no messages exist
export const SUGGESTIONS = [
  "What are the latest trends in DeFi?",
  "Which companies are mentioned most frequently?",
  "What is the sentiment around Bitcoin?",
  "Tell me about recent funding rounds",
  "Which protocols are trending this week?"
];
