/**
 * Entity Pills and Modal Detail View
 * Renders entity pills in messages and displays detailed entity profiles
 */

import { fetchWithRetry } from './api.js';
import { API_BASE } from './config.js';
import { formatDate, escapeHtml } from './utils.js';

/**
 * Extract entity-like names from answer text
 * Uses heuristics to find capitalized multi-word phrases that could be entities
 * @param {string} text - The answer text to extract from
 * @returns {Array<string>} Array of potential entity names
 */
function extractEntityNames(text) {
  if (!text) return [];

  // Common words to filter out (not entities)
  const stopWords = new Set([
    'The', 'This', 'That', 'These', 'Those', 'What', 'When', 'Where', 'Why', 'How',
    'Here', 'There', 'Yes', 'No', 'Some', 'Many', 'Most', 'All', 'None', 'Each',
    'Every', 'Other', 'Another', 'Such', 'Based', 'According', 'However', 'Therefore',
    'Additionally', 'Furthermore', 'Moreover', 'Meanwhile', 'Overall', 'Indeed'
  ]);

  // Extract capitalized multi-word phrases (2+ consecutive capitalized words)
  // Pattern: match sequences like "Bitcoin", "Ethereum Foundation", "DeFi Protocol"
  const pattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
  const matches = text.match(pattern) || [];

  // Filter out stop words and deduplicate
  const entities = new Set();
  for (const match of matches) {
    const firstWord = match.split(' ')[0];
    if (!stopWords.has(firstWord) && match.length > 2) {
      entities.add(match);
    }
  }

  // Limit to 5 most common entities
  return Array.from(entities).slice(0, 5);
}

/**
 * Render entity pills below a bot message
 * Extracts entity names from the answer text and creates clickable pills
 * @param {HTMLElement} messageEl - The message element containing the answer
 * @param {object} metaData - Metadata from the SSE meta event (optional, not currently used)
 */
export function renderEntityPills(messageEl, metaData = null) {
  if (!messageEl) return;

  const answerContent = messageEl.querySelector('.answer-content');
  const entitiesContainer = messageEl.querySelector('.entities-container');

  if (!answerContent || !entitiesContainer) return;

  // Extract entity names from the rendered answer text
  const answerText = answerContent.innerText || answerContent.textContent;
  const entityNames = extractEntityNames(answerText);

  if (entityNames.length === 0) {
    // No entities found, keep container hidden
    return;
  }

  // Create pills for each entity
  entitiesContainer.innerHTML = '';
  entityNames.forEach(entityName => {
    const pill = document.createElement('span');
    pill.className = 'inline-block px-2 py-0.5 text-xs bg-blue-900/30 border border-blue-700 text-blue-300 rounded-full cursor-pointer hover:bg-blue-800/50 transition-colors mr-2 mb-2';
    pill.textContent = entityName;
    pill.addEventListener('click', () => showEntityDetail(entityName));
    entitiesContainer.appendChild(pill);
  });

  // Show the container
  entitiesContainer.classList.remove('hidden');
}

/**
 * Show entity detail modal with profile data
 * Fetches entity profile from API and displays in modal
 * @param {string} entityName - Name of the entity to show
 */
export async function showEntityDetail(entityName) {
  const modal = document.getElementById('entity-modal');
  const modalTitle = document.getElementById('entity-modal-title');
  const modalContent = document.getElementById('entity-modal-content');

  if (!modal || !modalTitle || !modalContent) {
    console.error('Entity modal elements not found');
    return;
  }

  // Show modal
  modal.classList.remove('hidden');

  // Prevent body scroll
  document.body.style.overflow = 'hidden';

  // Show loading state
  modalTitle.textContent = entityName;
  modalContent.innerHTML = `
    <div class="flex items-center gap-2 text-gray-400">
      <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Loading profile for ${escapeHtml(entityName)}...</span>
    </div>
  `;

  // Push state for browser back button support
  history.pushState({ modal: 'entity', entityName }, '', `#entity-${encodeURIComponent(entityName)}`);

  try {
    // Fetch entity profile
    const response = await fetchWithRetry(
      `${API_BASE}/api/entities/${encodeURIComponent(entityName)}/profile`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch entity profile: ${response.status}`);
    }

    const profile = await response.json();

    if (!profile.found) {
      // Entity not found
      modalContent.innerHTML = `
        <div class="text-center py-8">
          <p class="text-gray-400 text-lg mb-4">Entity not found in knowledge graph</p>
          <p class="text-gray-500 text-sm">The entity "${escapeHtml(entityName)}" may not exist or has not been indexed yet.</p>
        </div>
      `;
      return;
    }

    // Render entity profile
    renderEntityProfile(modalTitle, modalContent, profile);

  } catch (error) {
    console.error('Failed to load entity profile:', error);
    modalContent.innerHTML = `
      <div class="text-center py-8">
        <p class="text-red-400 text-lg mb-4">Failed to load entity profile</p>
        <p class="text-gray-500 text-sm">${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

/**
 * Render entity profile content in modal
 * @param {HTMLElement} titleEl - Modal title element
 * @param {HTMLElement} contentEl - Modal content element
 * @param {object} profile - Entity profile data from API
 */
function renderEntityProfile(titleEl, contentEl, profile) {
  const { entity_name, label, total_mentions, sentiment_breakdown, category_breakdown, co_occurring_entities, recent_articles } = profile;

  // Update title with label badge
  const labelColors = {
    Company: 'bg-purple-900/40 text-purple-300 border-purple-700',
    Person: 'bg-green-900/40 text-green-300 border-green-700',
    Protocol: 'bg-blue-900/40 text-blue-300 border-blue-700'
  };
  const labelClass = labelColors[label] || 'bg-gray-900/40 text-gray-300 border-gray-700';

  titleEl.innerHTML = `
    <span class="mr-3">${escapeHtml(entity_name)}</span>
    <span class="inline-block px-2 py-1 text-xs ${labelClass} border rounded-md">${escapeHtml(label)}</span>
  `;

  // Calculate dominant sentiment
  let dominantSentiment = 'neutral';
  let maxCount = 0;
  for (const [sentiment, count] of Object.entries(sentiment_breakdown || {})) {
    if (count > maxCount) {
      maxCount = count;
      dominantSentiment = sentiment;
    }
  }

  // Stats row
  const statsHtml = `
    <div class="grid grid-cols-2 gap-4 mb-6">
      <div class="bg-gray-900/50 rounded-lg p-3">
        <div class="text-gray-400 text-xs mb-1">Total Mentions</div>
        <div class="text-white text-2xl font-bold">${total_mentions}</div>
      </div>
      <div class="bg-gray-900/50 rounded-lg p-3">
        <div class="text-gray-400 text-xs mb-1">Dominant Sentiment</div>
        <div class="text-white text-2xl font-bold capitalize">${escapeHtml(dominantSentiment)}</div>
      </div>
    </div>
  `;

  // Sentiment breakdown (horizontal bar)
  const sentimentHtml = renderSentimentBreakdown(sentiment_breakdown, total_mentions);

  // Category breakdown
  const categoryHtml = renderCategoryBreakdown(category_breakdown);

  // Co-occurring entities
  const coEntitiesHtml = renderCoOccurringEntities(co_occurring_entities);

  // Recent articles
  const articlesHtml = renderRecentArticles(recent_articles);

  // Combine all sections
  contentEl.innerHTML = `
    ${statsHtml}
    ${sentimentHtml}
    ${categoryHtml}
    ${coEntitiesHtml}
    ${articlesHtml}
  `;
}

/**
 * Render sentiment breakdown as horizontal bar chart
 * @param {object} sentimentBreakdown - Sentiment counts
 * @param {number} total - Total mentions
 * @returns {string} HTML string
 */
function renderSentimentBreakdown(sentimentBreakdown, total) {
  if (!sentimentBreakdown || Object.keys(sentimentBreakdown).length === 0) {
    return '';
  }

  const bullish = sentimentBreakdown.bullish || 0;
  const bearish = sentimentBreakdown.bearish || 0;
  const neutral = sentimentBreakdown.neutral || 0;

  const bullishPct = Math.round((bullish / total) * 100);
  const bearishPct = Math.round((bearish / total) * 100);
  const neutralPct = Math.round((neutral / total) * 100);

  return `
    <div class="mb-6">
      <h3 class="text-sm font-semibold text-gray-400 mb-2">Sentiment Breakdown</h3>
      <div class="flex h-8 rounded-lg overflow-hidden">
        ${bullish > 0 ? `<div class="bg-green-600 flex items-center justify-center text-white text-xs font-medium" style="width: ${bullishPct}%">${bullishPct > 10 ? bullishPct + '%' : ''}</div>` : ''}
        ${bearish > 0 ? `<div class="bg-red-600 flex items-center justify-center text-white text-xs font-medium" style="width: ${bearishPct}%">${bearishPct > 10 ? bearishPct + '%' : ''}</div>` : ''}
        ${neutral > 0 ? `<div class="bg-gray-600 flex items-center justify-center text-white text-xs font-medium" style="width: ${neutralPct}%">${neutralPct > 10 ? neutralPct + '%' : ''}</div>` : ''}
      </div>
      <div class="flex justify-between mt-2 text-xs">
        <span class="text-green-400">Bullish: ${bullish}</span>
        <span class="text-red-400">Bearish: ${bearish}</span>
        <span class="text-gray-400">Neutral: ${neutral}</span>
      </div>
    </div>
  `;
}

/**
 * Render category breakdown
 * @param {object} categoryBreakdown - Category counts
 * @returns {string} HTML string
 */
function renderCategoryBreakdown(categoryBreakdown) {
  if (!categoryBreakdown || Object.keys(categoryBreakdown).length === 0) {
    return '';
  }

  const categoriesHtml = Object.entries(categoryBreakdown)
    .sort((a, b) => b[1] - a[1]) // Sort by count descending
    .slice(0, 5) // Top 5 categories
    .map(([category, count]) => `
      <div class="flex justify-between items-center py-1">
        <span class="text-gray-300 capitalize">${escapeHtml(category)}</span>
        <span class="text-gray-500 text-sm">${count}</span>
      </div>
    `)
    .join('');

  return `
    <div class="mb-6">
      <h3 class="text-sm font-semibold text-gray-400 mb-2">Categories</h3>
      <div class="bg-gray-900/50 rounded-lg p-3">
        ${categoriesHtml}
      </div>
    </div>
  `;
}

/**
 * Render co-occurring entities as clickable pills
 * @param {Array} coEntities - Array of co-occurring entity objects
 * @returns {string} HTML string
 */
function renderCoOccurringEntities(coEntities) {
  if (!coEntities || coEntities.length === 0) {
    return '';
  }

  const pillsHtml = coEntities
    .slice(0, 10) // Limit to 10
    .map(entity => {
      const name = entity.entity_name || entity.name;
      const count = entity.co_occurrence_count || entity.count || 0;
      return `<span class="inline-block px-2 py-1 text-xs bg-blue-900/30 border border-blue-700 text-blue-300 rounded-full cursor-pointer hover:bg-blue-800/50 transition-colors mr-2 mb-2" data-entity-name="${escapeHtml(name)}">${escapeHtml(name)} (${count})</span>`;
    })
    .join('');

  return `
    <div class="mb-6">
      <h3 class="text-sm font-semibold text-gray-400 mb-2">Co-occurring Entities</h3>
      <div id="co-entities-pills">
        ${pillsHtml}
      </div>
    </div>
  `;
}

/**
 * Render recent articles list
 * @param {Array} articles - Array of article objects
 * @returns {string} HTML string
 */
function renderRecentArticles(articles) {
  if (!articles || articles.length === 0) {
    return '';
  }

  const articlesHtml = articles
    .slice(0, 10) // Limit to 10
    .map(article => {
      const title = article.title || 'Untitled';
      const url = article.url;
      const publishedAt = article.published_at;
      const sentiment = article.sentiment;
      const category = article.category;

      const sentimentColors = {
        bullish: 'text-green-400',
        bearish: 'text-red-400',
        neutral: 'text-gray-400'
      };
      const sentimentClass = sentimentColors[sentiment] || 'text-gray-400';

      const titleHtml = url
        ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 hover:underline">${escapeHtml(title)}</a>`
        : `<span class="text-gray-300">${escapeHtml(title)}</span>`;

      return `
        <div class="border-b border-gray-700 py-3 last:border-0">
          <div class="mb-1">${titleHtml}</div>
          <div class="flex gap-3 text-xs text-gray-500">
            ${publishedAt ? `<span>${formatDate(publishedAt)}</span>` : ''}
            ${sentiment ? `<span class="${sentimentClass} capitalize">${sentiment}</span>` : ''}
            ${category ? `<span class="capitalize">${escapeHtml(category)}</span>` : ''}
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <div class="mb-4">
      <h3 class="text-sm font-semibold text-gray-400 mb-2">Recent Articles</h3>
      <div class="bg-gray-900/50 rounded-lg p-3 max-h-64 overflow-y-auto">
        ${articlesHtml}
      </div>
    </div>
  `;
}

/**
 * Close the entity modal
 */
export function closeEntityModal() {
  const modal = document.getElementById('entity-modal');
  if (!modal) return;

  // Hide modal
  modal.classList.add('hidden');

  // Re-enable body scroll
  document.body.style.overflow = '';

  // Clear content
  const modalContent = document.getElementById('entity-modal-content');
  if (modalContent) {
    modalContent.innerHTML = '';
  }

  // Remove hash from URL if it's an entity hash
  if (window.location.hash.startsWith('#entity-')) {
    history.back();
  }
}

/**
 * Initialize entity modal event listeners
 * Call this once on page load
 */
export function initEntityModal() {
  const modal = document.getElementById('entity-modal');
  const closeButton = document.getElementById('entity-modal-close');

  if (!modal || !closeButton) {
    console.error('Entity modal elements not found');
    return;
  }

  // Close button click handler
  closeButton.addEventListener('click', closeEntityModal);

  // Backdrop click handler (close if clicking outside content)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeEntityModal();
    }
  });

  // Escape key handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeEntityModal();
    }
  });

  // Browser back button handler (popstate)
  window.addEventListener('popstate', (e) => {
    if (!modal.classList.contains('hidden')) {
      closeEntityModal();
    }
  });

  // Delegate click handler for co-occurring entity pills
  document.addEventListener('click', (e) => {
    if (e.target.matches('#co-entities-pills span[data-entity-name]')) {
      const entityName = e.target.dataset.entityName;
      if (entityName) {
        showEntityDetail(entityName);
      }
    }
  });
}
