// App state
let currentPeriod = '1M';
let watchlistData = null;
let latestBriefData = null;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadLatestBrief();
  await loadWatchlist();
  await loadHistory();
});

// Setup event listeners
function setupEventListeners() {
  document.querySelectorAll('.timeframe-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentPeriod = e.target.dataset.period;
      renderCharts();
    });
  });
}

// Load latest brief
async function loadLatestBrief() {
  try {
    const briefs = await fetchBriefsList();
    if (briefs.length === 0) {
      showError('latest-brief-content', 'No briefs available');
      return;
    }

    const latestBriefFile = briefs[0];
    const response = await fetch(`data/briefs/${latestBriefFile}`);
    
    if (!response.ok) {
      throw new Error('Failed to load brief');
    }

    latestBriefData = await response.json();
    renderBrief(latestBriefData);
  } catch (error) {
    console.error('Error loading latest brief:', error);
    showError('latest-brief-content', 'Failed to load latest brief');
  }
}

// Render brief
function renderBrief(brief) {
  const container = document.getElementById('latest-brief-content');
  
  const html = `
    <div class="brief-header">
      <div class="brief-date">${formatDate(brief.date)}</div>
    </div>
    
    <div class="brief-names">
      ${brief.names.map(name => `<span class="ticker-tag">${name}</span>`).join('')}
    </div>

    <div class="brief-section">
      <h3>📈 What Moved</h3>
      <ul>
        ${brief.movements.map(m => `
          <li>
            <strong>${m.name}</strong>: ${m.description}
            ${m.source ? `<span class="source-flag">${m.source}</span>` : ''}
          </li>
        `).join('')}
      </ul>
    </div>

    <div class="brief-section">
      <h3>💡 Why It Matters</h3>
      <p>${brief.whyItMatters}</p>
    </div>

    <div class="brief-section">
      <h3>👀 What To Watch</h3>
      <ul>
        ${brief.whatToWatch.map(w => `
          <li>
            ${w.event} ${w.date ? `- <em>${w.date}</em>` : ''}
          </li>
        `).join('')}
      </ul>
    </div>
  `;
  
  container.innerHTML = html;
}

// Load watchlist
async function loadWatchlist() {
  try {
    const response = await fetch('data/watchlist.json');
    
    if (!response.ok) {
      throw new Error('Failed to load watchlist');
    }

    watchlistData = await response.json();
    renderCharts();
  } catch (error) {
    console.error('Error loading watchlist:', error);
    showError('watchlist-charts', 'Failed to load watchlist');
  }
}

// Render charts
function renderCharts() {
  if (!watchlistData) return;

  const container = document.getElementById('watchlist-charts');
  container.innerHTML = '';

  watchlistData.tickers.forEach(ticker => {
    const chartCard = createChartCard(ticker);
    container.appendChild(chartCard);
  });
}

// Create chart card
function createChartCard(ticker) {
  const card = document.createElement('div');
  card.className = 'chart-card';

  const priceData = ticker.prices[currentPeriod];
  
  if (!priceData || priceData.length === 0) {
    card.innerHTML = `
      <div class="chart-header">
        <div class="chart-ticker">${ticker.symbol}</div>
      </div>
      <div class="chart-empty">No data available for ${currentPeriod}</div>
    `;
    return card;
  }

  const latestPrice = priceData[priceData.length - 1].close;
  const firstPrice = priceData[0].close;
  const change = ((latestPrice - firstPrice) / firstPrice * 100).toFixed(2);
  const isPositive = change >= 0;

  card.innerHTML = `
    <div class="chart-header">
      <div class="chart-ticker">${ticker.symbol}</div>
      <div class="chart-price ${isPositive ? 'price-up' : 'price-down'}">
        $${latestPrice.toFixed(2)} (${isPositive ? '+' : ''}${change}%)
      </div>
    </div>
    <div class="chart-container">
      <canvas id="chart-${ticker.symbol.replace('.', '-')}"></canvas>
    </div>
  `;

  setTimeout(() => {
    createChart(ticker.symbol, priceData);
  }, 0);

  return card;
}

// Create Chart.js chart
function createChart(symbol, priceData) {
  const canvasId = `chart-${symbol.replace('.', '-')}`;
  const canvas = document.getElementById(canvasId);
  
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const labels = priceData.map(d => d.date);
  const prices = priceData.map(d => d.close);

  const gradient = ctx.createLinearGradient(0, 0, 0, 250);
  gradient.addColorStop(0, 'rgba(88, 166, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(88, 166, 255, 0)');

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: symbol,
        data: prices,
        borderColor: '#58a6ff',
        backgroundColor: gradient,
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 5,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(22, 27, 34, 0.95)',
          titleColor: '#e6edf3',
          bodyColor: '#8b949e',
          borderColor: '#30363d',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            label: function(context) {
              return `$${context.parsed.y.toFixed(2)}`;
            }
          }
        }
      },
      scales: {
        x: {
          display: false
        },
        y: {
          border: {
            display: false
          },
          grid: {
            color: '#30363d',
            drawTicks: false
          },
          ticks: {
            color: '#8b949e',
            padding: 10,
            callback: function(value) {
              return '$' + value.toFixed(0);
            }
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    }
  });
}

// Load history
async function loadHistory() {
  try {
    const briefs = await fetchBriefsList();
    
    if (briefs.length === 0) {
      showError('history-list', 'No briefs available');
      return;
    }

    const historyBriefs = briefs.slice(1);
    
    if (historyBriefs.length === 0) {
      document.getElementById('history-list').innerHTML = 
        '<div class="loading">No past briefs yet</div>';
      return;
    }

    const container = document.getElementById('history-list');
    container.innerHTML = '';

    for (const briefFile of historyBriefs) {
      const item = await createHistoryItem(briefFile);
      container.appendChild(item);
    }
  } catch (error) {
    console.error('Error loading history:', error);
    showError('history-list', 'Failed to load history');
  }
}

// Create history item
async function createHistoryItem(briefFile) {
  const item = document.createElement('a');
  item.className = 'history-item';
  item.href = `#${briefFile}`;
  
  try {
    const response = await fetch(`data/briefs/${briefFile}`);
    const brief = await response.json();
    
    const namesPreview = brief.names.slice(0, 5).join(', ') + 
      (brief.names.length > 5 ? '...' : '');
    
    item.innerHTML = `
      <div class="history-item-header">
        <div class="history-date">${formatDate(brief.date)}</div>
      </div>
      <div class="history-preview">${namesPreview}</div>
    `;

    item.addEventListener('click', (e) => {
      e.preventDefault();
      renderBrief(brief);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  } catch (error) {
    item.innerHTML = `
      <div class="history-item-header">
        <div class="history-date">${briefFile}</div>
      </div>
      <div class="history-preview">Failed to load</div>
    `;
  }

  return item;
}

// Fetch briefs list
async function fetchBriefsList() {
  try {
    const response = await fetch('data/briefs-index.json');
    
    if (!response.ok) {
      return [];
    }

    const index = await response.json();
    return index.briefs.sort((a, b) => b.localeCompare(a));
  } catch (error) {
    console.error('Error fetching briefs list:', error);
    return [];
  }
}

// Format date
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

// Show error
function showError(containerId, message) {
  const container = document.getElementById(containerId);
  container.innerHTML = `<div class="error">${message}</div>`;
}
