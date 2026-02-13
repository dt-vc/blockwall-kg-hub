/**
 * Dashboard Tab Navigation
 * Handles tab switching, lazy loading, and panel management
 */

// Track which tabs have been loaded
const loadedTabs = new Set();

/**
 * Initialize tab navigation
 */
export function initTabs() {
  const tabButtons = document.querySelectorAll('[role="tab"]');
  const tabPanels = document.querySelectorAll('[role="tabpanel"]');

  if (!tabButtons.length || !tabPanels.length) {
    console.warn('No tabs or panels found');
    return;
  }

  // Add click listeners to all tab buttons
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');
      if (targetTab) {
        switchTab(targetTab);
      }
    });
  });

  console.log('Tab navigation initialized');
}

/**
 * Switch to a specific tab
 * @param {string} targetTab - The tab to switch to (chat, trends, portfolio)
 */
async function switchTab(targetTab) {
  const tabButtons = document.querySelectorAll('[role="tab"]');
  const tabPanels = document.querySelectorAll('[role="tabpanel"]');

  // Update tab button states
  tabButtons.forEach(button => {
    const tab = button.getAttribute('data-tab');
    const isActive = tab === targetTab;

    if (isActive) {
      button.setAttribute('aria-selected', 'true');
      button.className = 'px-6 py-3 font-medium transition-colors border-b-2 border-blue-500 text-blue-500';
    } else {
      button.setAttribute('aria-selected', 'false');
      button.className = 'px-6 py-3 font-medium transition-colors border-b-2 border-transparent text-gray-400 hover:text-white';
    }
  });

  // Update panel visibility
  tabPanels.forEach(panel => {
    const panelName = panel.getAttribute('data-panel');
    const isActive = panelName === targetTab;

    if (isActive) {
      panel.classList.remove('hidden');
      panel.setAttribute('aria-hidden', 'false');
    } else {
      panel.classList.add('hidden');
      panel.setAttribute('aria-hidden', 'true');
    }
  });

  // Lazy load content on first switch
  if (!loadedTabs.has(targetTab)) {
    if (targetTab === 'trends') {
      await loadTrendsView();
      loadedTabs.add('trends');
    } else if (targetTab === 'portfolio') {
      await loadPortfolioView();
      loadedTabs.add('portfolio');
    }
  }
}

/**
 * Load the Trends view with charts
 */
async function loadTrendsView() {
  const trendsPanel = document.querySelector('[data-panel="trends"]');
  if (!trendsPanel) return;

  // Show loading spinner
  const spinner = createLoadingSpinner();
  trendsPanel.appendChild(spinner);

  try {
    // Dynamic import to avoid loading chart code until needed
    const { renderTrendingTopicsChart, renderSentimentChart } = await import('./charts.js');

    // Load both charts in parallel
    await Promise.all([
      renderTrendingTopicsChart(),
      renderSentimentChart()
    ]);

    // Remove spinner on success
    spinner.remove();
  } catch (error) {
    console.error('Failed to load trends view:', error);

    // Remove spinner
    spinner.remove();

    // Show error message
    const errorEl = document.createElement('div');
    errorEl.className = 'p-6 border border-red-500 rounded-lg bg-red-900/20 text-red-400';
    errorEl.innerHTML = `
      <p class="font-bold mb-2">Failed to load trends data</p>
      <p class="text-sm">${error.message}</p>
    `;
    trendsPanel.appendChild(errorEl);
  }
}

/**
 * Load the Portfolio view
 */
async function loadPortfolioView() {
  const portfolioPanel = document.querySelector('[data-panel="portfolio"]');
  if (!portfolioPanel) return;

  // Show loading spinner
  const spinner = createLoadingSpinner();
  portfolioPanel.appendChild(spinner);

  try {
    // Dynamic import (portfolio.js will be created in Plan 02)
    const { renderPortfolioGrid, renderFundingAlerts } = await import('./portfolio.js');

    // Load both components in parallel
    await Promise.all([
      renderPortfolioGrid(),
      renderFundingAlerts()
    ]);

    // Remove spinner on success
    spinner.remove();
  } catch (error) {
    console.error('Failed to load portfolio view:', error);

    // Remove spinner
    spinner.remove();

    // Show error message (graceful degradation if portfolio.js doesn't exist yet)
    const errorEl = document.createElement('div');
    errorEl.className = 'p-6 border border-yellow-500 rounded-lg bg-yellow-900/20 text-yellow-400';
    errorEl.innerHTML = `
      <p class="font-bold mb-2">Portfolio view not yet available</p>
      <p class="text-sm">This feature will be enabled in the next update.</p>
    `;
    portfolioPanel.appendChild(errorEl);
  }
}

/**
 * Create a loading spinner element
 * @returns {HTMLElement} Spinner element
 */
function createLoadingSpinner() {
  const spinner = document.createElement('div');
  spinner.className = 'flex items-center justify-center p-12';
  spinner.innerHTML = `
    <div class="flex items-center gap-3 text-gray-400">
      <svg class="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Loading...</span>
    </div>
  `;
  return spinner;
}
