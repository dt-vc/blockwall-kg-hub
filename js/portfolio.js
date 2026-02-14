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

    // Render company cards (clickable)
    container.innerHTML = data.companies.map(company => `
      <div class="glass glass-hover p-4 cursor-pointer"
           data-slug="${escapeHtml(company.slug)}" data-company-name="${escapeHtml(company.name)}">
        <h3 class="font-display text-lg font-bold mb-3" style="color: var(--text-primary);">${escapeHtml(company.name)}</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span style="color: var(--text-secondary);">Intel Items</span>
            <span class="font-semibold" style="color: var(--text-primary);">${company.intel_count || 0}</span>
          </div>
          <div class="flex justify-between">
            <span style="color: var(--text-secondary);">Funding Rounds</span>
            <span class="font-semibold" style="color: var(--text-primary);">${company.funding_count || 0}</span>
          </div>
          <div class="flex justify-between">
            <span style="color: var(--text-secondary);">Blog Posts</span>
            <span class="font-semibold" style="color: var(--text-primary);">${company.blog_count || 0}</span>
          </div>
          <div class="flex justify-between">
            <span style="color: var(--text-secondary);">News Coverage</span>
            <span class="font-semibold" style="color: var(--text-primary);">${company.news_items_count || 0}</span>
          </div>
        </div>
        <p class="text-xs mt-3" style="color: var(--gold);">Click for intel details &rarr;</p>
      </div>
    `).join('');

    // Add click handlers to cards
    container.querySelectorAll('[data-slug]').forEach(card => {
      card.addEventListener('click', () => {
        showCompanyDetail(card.dataset.slug, card.dataset.companyName);
      });
    });

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
        <div class="glass p-4" style="border-left: 3px solid var(--gold);">
          <div class="flex justify-between items-start mb-2">
            <h4 class="font-bold" style="color: var(--text-primary);">${escapeHtml(round.company)}</h4>
            <span class="text-xs" style="color: var(--text-secondary);">${formatDate(date)}</span>
          </div>
          <div class="flex flex-wrap gap-2 text-sm">
            <span class="glass-gold px-2 py-0.5 rounded text-xs" style="color: var(--gold);">
              ${escapeHtml(round.round)}${stage ? escapeHtml(stage) : ''}
            </span>
            ${amount ? `<span class="font-semibold" style="color: var(--text-primary);">${amount}</span>` : ''}
          </div>
          ${leadInvestors ? `
            <p class="text-xs mt-2" style="color: var(--text-secondary);">Lead: ${leadInvestors.map(inv => escapeHtml(inv)).join(', ')}</p>
          ` : ''}
          ${relevantPortfolio ? `
            <p class="text-xs mt-1" style="color: var(--gold);">Related: ${relevantPortfolio.map(comp => escapeHtml(comp)).join(', ')}</p>
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

/**
 * Show company detail in modal
 */
async function showCompanyDetail(slug, name) {
  const modal = document.getElementById('entity-modal');
  const title = document.getElementById('entity-modal-title');
  const content = document.getElementById('entity-modal-content');
  if (!modal || !title || !content) return;

  title.textContent = name;
  content.innerHTML = `
    <div class="flex items-center gap-2 text-gray-400 py-8 justify-center">
      <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Loading intel...</span>
    </div>
  `;
  modal.classList.remove('hidden');

  try {
    const response = await fetchWithRetry(API_BASE + '/api/portfolio/company/' + slug);
    const data = await response.json();

    if (!data.found) {
      content.innerHTML = '<p class="text-gray-400">Company not found</p>';
      return;
    }

    let html = '';

    // Sectors
    if (data.sectors && data.sectors.length > 0) {
      html += `<div class="flex flex-wrap gap-2 mb-4">${data.sectors.map(s =>
        `<span class="glass-gold px-2 py-1 rounded text-xs" style="color: var(--gold);">${escapeHtml(s)}</span>`
      ).join('')}</div>`;
    }

    // Intel items
    if (data.intel && data.intel.length > 0) {
      html += '<h3 class="text-sm font-semibold uppercase tracking-wide mb-3" style="color: var(--text-secondary);">Intel Briefings</h3>';
      html += data.intel.map(item => `
        <div class="glass p-4 mb-3">
          <div class="flex justify-between items-start mb-2">
            <h4 class="font-bold text-sm flex-1" style="color: var(--text-primary);">${escapeHtml(item.headline)}</h4>
            <span class="glass px-2 py-0.5 rounded text-xs ml-2 whitespace-nowrap" style="color: var(--text-secondary);">${escapeHtml(item.item_type)}</span>
          </div>
          ${item.collected_at ? `<p class="text-xs mb-2" style="color: var(--text-muted);">${formatDate(item.collected_at)}</p>` : ''}
          ${item.why_it_matters ? `<p class="text-sm mb-2" style="color: var(--text-secondary);">${escapeHtml(item.why_it_matters)}</p>` : ''}
          ${item.sources && item.sources.length > 0 ? `
            <div class="flex flex-wrap gap-2 mt-2">
              ${item.sources.map(src => `<a href="${escapeHtml(src.url)}" target="_blank" rel="noopener" class="text-xs underline" style="color: var(--gold);">${escapeHtml(src.label)}</a>`).join('')}
            </div>
          ` : ''}
        </div>
      `).join('');
    }

    // Funding rounds
    if (data.funding && data.funding.length > 0) {
      html += '<h3 class="text-sm font-semibold uppercase tracking-wide mb-3 mt-4" style="color: var(--text-secondary);">Funding Rounds</h3>';
      html += data.funding.map(f => `
        <div class="glass p-3 mb-2" style="border-left: 3px solid var(--green);">
          <span class="font-semibold" style="color: var(--text-primary);">${escapeHtml(f.round || '')}</span>
          ${f.amount ? ` <span style="color: var(--text-secondary);">${formatCurrency(f.amount)}</span>` : ''}
          ${f.date ? ` <span class="text-xs" style="color: var(--text-muted);">${formatDate(f.date)}</span>` : ''}
        </div>
      `).join('');
    }

    // Blog posts from company website
    if (data.blogs && data.blogs.length > 0) {
      html += '<h3 class="text-sm font-semibold uppercase tracking-wide mb-3 mt-4" style="color: var(--text-secondary);">Latest Posts</h3>';
      html += data.blogs.map(post => `
        <div class="glass p-3 mb-2">
          <a href="${escapeHtml(post.url)}" target="_blank" rel="noopener" class="font-semibold text-sm hover:underline" style="color: var(--text-primary);">${escapeHtml(post.title)}</a>
          ${post.date ? `<span class="text-xs ml-2" style="color: var(--text-muted);">${formatDate(post.date)}</span>` : ''}
          ${post.excerpt ? `<p class="text-xs mt-1" style="color: var(--text-secondary);">${escapeHtml(post.excerpt)}</p>` : ''}
        </div>
      `).join('');
    }

    // Third-party news coverage
    if (data.news_items && data.news_items.length > 0) {
      html += '<h3 class="text-sm font-semibold uppercase tracking-wide mb-3 mt-4" style="color: var(--text-secondary);">News Coverage</h3>';
      html += data.news_items.map(item => `
        <div class="glass p-3 mb-2" style="border-left: 3px solid var(--gold);">
          <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" class="font-semibold text-sm hover:underline" style="color: var(--text-primary);">${escapeHtml(item.title)}</a>
          <div class="flex gap-3 mt-1 text-xs" style="color: var(--text-muted);">
            ${item.publisher ? `<span>${escapeHtml(item.publisher)}</span>` : ''}
            ${item.date ? `<span>${formatDate(item.date)}</span>` : ''}
          </div>
        </div>
      `).join('');
    }

    if (!html) {
      html = '<p class="text-gray-400">No intel data available for this company.</p>';
    }

    content.innerHTML = html;
  } catch (error) {
    console.error('Failed to load company detail:', error);
    content.innerHTML = `<p class="text-red-400">Failed to load company details: ${escapeHtml(error.message)}</p>`;
  }
}
