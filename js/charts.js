/**
 * Dashboard Charts using Chart.js
 * Renders trending topics and sentiment visualizations
 */

import { fetchWithRetry } from './api.js';
import { API_BASE } from './config.js';

// Chart instance management to prevent memory leaks
const chartInstances = {};

// Set global Chart.js defaults for dark theme
Chart.defaults.color = 'rgb(229, 231, 235)'; // gray-200

/**
 * Render the trending topics horizontal bar chart
 */
export async function renderTrendingTopicsChart() {
  try {
    // Fetch trending topics data
    const response = await fetchWithRetry(API_BASE + '/api/trends/topics?days=7&limit=10');
    const data = await response.json();

    // Handle empty state
    if (!data.topics || data.topics.length === 0) {
      const canvas = document.getElementById('trending-topics-chart');
      if (canvas && canvas.parentElement) {
        canvas.parentElement.innerHTML = '<p class="text-center text-gray-400 py-12">No trending data available</p>';
      }
      return;
    }

    // Get canvas element
    const ctx = document.getElementById('trending-topics-chart');
    if (!ctx) {
      console.error('Canvas element #trending-topics-chart not found');
      return;
    }

    // Destroy existing chart instance if exists
    if (chartInstances['trending-topics-chart']) {
      chartInstances['trending-topics-chart'].destroy();
    }

    // Create horizontal bar chart
    chartInstances['trending-topics-chart'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.topics.map(t => t.topic),
        datasets: [{
          label: 'Articles',
          data: data.topics.map(t => t.articles),
          backgroundColor: 'rgba(59, 130, 246, 0.6)',   // blue-500
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Top 10 Trending Topics (Last 7 Days)',
            color: 'rgb(229, 231, 235)',
            font: { size: 14, weight: 'bold' }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { color: 'rgb(156, 163, 175)' },
            grid: { color: 'rgba(75, 85, 99, 0.3)' }
          },
          y: {
            ticks: { color: 'rgb(156, 163, 175)' },
            grid: { display: false }
          }
        }
      }
    });

    console.log('Trending topics chart rendered');
  } catch (error) {
    console.error('Failed to render trending topics chart:', error);
    throw error;
  }
}

/**
 * Render the sentiment distribution doughnut chart
 */
export async function renderSentimentChart() {
  try {
    // Fetch sentiment data
    const response = await fetchWithRetry(API_BASE + '/api/trends/sentiment?days=7');
    const data = await response.json();

    // Handle empty state
    if (!data.total_articles || data.total_articles === 0 || !data.breakdown || data.breakdown.length === 0) {
      const canvas = document.getElementById('sentiment-chart');
      if (canvas && canvas.parentElement) {
        canvas.parentElement.innerHTML = '<p class="text-center text-gray-400 py-12">No sentiment data available</p>';
      }
      return;
    }

    // Parse breakdown into counts (handles missing sentiment categories)
    const counts = { bullish: 0, bearish: 0, neutral: 0 };
    data.breakdown.forEach(item => {
      const sentiment = item.sentiment.toLowerCase();
      if (sentiment in counts) {
        counts[sentiment] = item.count;
      }
    });

    // Get canvas element
    const ctx = document.getElementById('sentiment-chart');
    if (!ctx) {
      console.error('Canvas element #sentiment-chart not found');
      return;
    }

    // Destroy existing chart instance if exists
    if (chartInstances['sentiment-chart']) {
      chartInstances['sentiment-chart'].destroy();
    }

    // Create doughnut chart
    chartInstances['sentiment-chart'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Bullish', 'Neutral', 'Bearish'],
        datasets: [{
          data: [counts.bullish, counts.neutral, counts.bearish],
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',    // green-500
            'rgba(156, 163, 175, 0.8)',  // gray-400
            'rgba(239, 68, 68, 0.8)'     // red-500
          ],
          borderColor: 'rgb(31, 41, 55)',  // gray-800
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: 'rgb(229, 231, 235)',
              padding: 16,
              font: { size: 13 }
            }
          },
          title: {
            display: true,
            text: 'Sentiment Distribution (Last 7 Days)',
            color: 'rgb(229, 231, 235)',
            font: { size: 14, weight: 'bold' }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const value = context.parsed;
                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                return context.label + ': ' + value + ' (' + pct + '%)';
              }
            }
          }
        }
      }
    });

    // Add percentage summary text below the chart
    const canvasParent = ctx.parentElement;
    if (canvasParent) {
      // Remove any existing summary
      const existingSummary = canvasParent.querySelector('.sentiment-summary');
      if (existingSummary) {
        existingSummary.remove();
      }

      // Calculate percentages
      const total = data.total_articles;
      const bullishPct = total > 0 ? ((counts.bullish / total) * 100).toFixed(1) : '0.0';
      const neutralPct = total > 0 ? ((counts.neutral / total) * 100).toFixed(1) : '0.0';
      const bearishPct = total > 0 ? ((counts.bearish / total) * 100).toFixed(1) : '0.0';

      // Create summary element
      const summaryEl = document.createElement('div');
      summaryEl.className = 'sentiment-summary text-center text-sm text-gray-400 mt-2';
      summaryEl.textContent = `${total} articles: ${bullishPct}% bullish, ${neutralPct}% neutral, ${bearishPct}% bearish`;
      canvasParent.appendChild(summaryEl);
    }

    console.log('Sentiment chart rendered');
  } catch (error) {
    console.error('Failed to render sentiment chart:', error);
    throw error;
  }
}
