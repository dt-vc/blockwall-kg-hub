/**
 * Portfolio Tab Components
 * Renders portfolio company grid and funding alerts
 */

import { fetchWithRetry } from './api.js';
import { API_BASE } from './config.js';
import { formatDate, formatCurrency, escapeHtml } from './utils.js';

/**
 * Render the portfolio companies grid
 */
export async function renderPortfolioGrid() {
  const container = document.getElementById('portfolio-grid');
  if (!container) {
    console.error('portfolio-grid container not found');
    return;
  }

  try {
    const response = await fetchWithRetry(API_BASE + '/api/portfolio/companies?limit=50');
    const data = await response.json();

    if (!data.companies || data.companies.length === 0) {
      container.innerHTML = `
        <div class="col-span-full flex items-center justify-center p-12 text-gray-400">
          <p>No portfolio companies found</p>
        </div>
      `;
      return;
    }

    // Render company cards
    container.innerHTML = data.companies.map(company => `
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-colors">
        <h3 class="text-lg font-bold text-white mb-3">${escapeHtml(company.name)}</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-400">Intel Items</span>
            <span class="text-white font-semibold">${company.intel_count || 0}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">Funding Rounds</span>
            <span class="text-white font-semibold">${company.funding_count || 0}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">News Articles</span>
            <span class="text-white font-semibold">${company.news_count || 0}</span>
          </div>
        </div>
      </div>
    `).join('');

    console.log(`Rendered ${data.companies.length} portfolio companies`);
  } catch (error) {
    console.error('Failed to render portfolio grid:', error);
    container.innerHTML = `
      <div class="col-span-full p-6 border border-red-500 rounded-lg bg-red-900/20 text-red-400">
        <p class="font-bold mb-2">Failed to load portfolio companies</p>
        <p class="text-sm">${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

/**
 * Render the funding alerts panel
 */
export async function renderFundingAlerts() {
  const container = document.getElementById('funding-alerts');
  if (!container) {
    console.error('funding-alerts container not found');
    return;
  }

  try {
    // Use 90 days to ensure we get results even with older seeded data
    const response = await fetchWithRetry(API_BASE + '/api/portfolio/funding?days=90&limit=15');
    const data = await response.json();

    if (!data.funding_rounds || data.funding_rounds.length === 0) {
      container.innerHTML = `
        <div class="flex items-center justify-center p-12 text-gray-400">
          <p>No recent funding rounds found</p>
        </div>
      `;
      return;
    }

    // Render funding round cards
    container.innerHTML = data.funding_rounds.map(round => {
      const date = round.date || round.collected_at;
      const leadRaw = round.lead_investors;
      const leadInvestors = leadRaw
        ? (Array.isArray(leadRaw) ? (leadRaw.length > 0 ? leadRaw : null) : [leadRaw])
        : null;
      const relRaw = round.relevant_portfolio;
      const relevantPortfolio = relRaw
        ? (Array.isArray(relRaw) ? (relRaw.length > 0 ? relRaw : null) : [relRaw])
        : null;
      const amount = round.amount ? formatCurrency(round.amount) : null;
      const stage = round.stage ? ` ${round.stage}` : '';

      return `
        <div class="border-l-4 border-blue-500 bg-gray-800 p-4 rounded-r-lg">
          <div class="flex justify-between items-start mb-2">
            <h4 class="font-bold text-white">${escapeHtml(round.company)}</h4>
            <span class="text-xs text-gray-400">${formatDate(date)}</span>
          </div>
          <div class="flex flex-wrap gap-2 text-sm">
            <span class="px-2 py-0.5 bg-blue-900/30 text-blue-300 rounded text-xs">
              ${escapeHtml(round.round)}${stage ? escapeHtml(stage) : ''}
            </span>
            ${amount ? `<span class="text-gray-300 font-semibold">${amount}</span>` : ''}
          </div>
          ${leadInvestors ? `
            <p class="text-xs text-gray-400 mt-2">Lead: ${leadInvestors.map(inv => escapeHtml(inv)).join(', ')}</p>
          ` : ''}
          ${relevantPortfolio ? `
            <p class="text-xs text-blue-400 mt-1">Related: ${relevantPortfolio.map(comp => escapeHtml(comp)).join(', ')}</p>
          ` : ''}
        </div>
      `;
    }).join('');

    console.log(`Rendered ${data.funding_rounds.length} funding rounds`);
  } catch (error) {
    console.error('Failed to render funding alerts:', error);
    container.innerHTML = `
      <div class="p-6 border border-red-500 rounded-lg bg-red-900/20 text-red-400">
        <p class="font-bold mb-2">Failed to load funding alerts</p>
        <p class="text-sm">${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}
