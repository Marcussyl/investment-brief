// Stitch App - Investment Brief
// Traditional Chinese UI with dark/light theme

// Built-in Vercel proxy for refresh webhook (avoids CORS from browser to api2.cursor.sh)
// Relative path works for same-origin requests (Vercel deployment or any custom domain)
const DEFAULT_REFRESH_PROXY = '/api/refresh';

let briefData = null;
let watchlistData = null;
let techNewsData = null;
let portfolioAnalysisData = null;
let currentTheme = 'auto';
let charts = {};

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initNavigation();
  initUpdateButton();
  initAlertClose();
  await loadSiteData();
  renderUI();
  setupEventListeners();
  autoSelectFirstStoryOnDesktop();
});

// Theme Management
function initTheme() {
  const saved = localStorage.getItem('theme') || 'auto';
  currentTheme = saved;
  applyTheme(saved);
  
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
}

function toggleTheme() {
  const themes = ['auto', 'light', 'dark'];
  const currentIndex = themes.indexOf(currentTheme);
  const nextTheme = themes[(currentIndex + 1) % themes.length];
  
  currentTheme = nextTheme;
  localStorage.setItem('theme', nextTheme);
  applyTheme(nextTheme);
}

function applyTheme(theme) {
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.body.setAttribute('data-theme', theme);
  }
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (currentTheme === 'auto') {
    applyTheme('auto');
  }
});

// Navigation
function initNavigation() {
  const mobileNavItems = document.querySelectorAll('.nav-item');
  const desktopNavItems = document.querySelectorAll('.desktop-nav-item');
  const allNavItems = [...mobileNavItems, ...desktopNavItems];
  
  allNavItems.forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      switchView(view);
      
      allNavItems.forEach(n => n.classList.remove('active'));
      
      mobileNavItems.forEach(n => {
        if (n.dataset.view === view) n.classList.add('active');
      });
      desktopNavItems.forEach(n => {
        if (n.dataset.view === view) n.classList.add('active');
      });
    });
  });
  
  // Restore saved view from localStorage
  restoreSavedView(mobileNavItems, desktopNavItems);
}

function restoreSavedView(mobileNavItems, desktopNavItems) {
  const savedView = localStorage.getItem('ib_active_view');
  const validViews = ['today', 'market', 'portfolio', 'glossary'];
  const viewToRestore = validViews.includes(savedView) ? savedView : 'today';
  
  // Switch to the saved/default view
  switchView(viewToRestore);
  
  // Update nav item active states
  const allNavItems = [...mobileNavItems, ...desktopNavItems];
  allNavItems.forEach(n => n.classList.remove('active'));
  
  mobileNavItems.forEach(n => {
    if (n.dataset.view === viewToRestore) n.classList.add('active');
  });
  desktopNavItems.forEach(n => {
    if (n.dataset.view === viewToRestore) n.classList.add('active');
  });
}

function switchView(viewName) {
  const views = document.querySelectorAll('.view');
  views.forEach(v => v.classList.remove('active'));
  document.getElementById(`view${capitalize(viewName)}`).classList.add('active');
  
  // Save active view to localStorage
  localStorage.setItem('ib_active_view', viewName);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Data Loading
function cacheBustUrl(path, bustCache) {
  if (!bustCache) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}t=${Date.now()}`;
}

async function fetchJson(path, { bustCache = false, optional = false } = {}) {
  const url = cacheBustUrl(path, bustCache);
  const options = bustCache ? { cache: 'no-store' } : {};
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      if (optional) return null;
      throw new Error(`HTTP ${res.status} for ${path}`);
    }
    return await res.json();
  } catch (error) {
    if (optional) return null;
    throw error;
  }
}

async function loadSiteData({ bustCache = false } = {}) {
  try {
    let latestBriefFile = '2026-08-31.json';

    try {
      const indexData = await fetchJson('data/briefs-index.json', { bustCache, optional: true });
      if (indexData && indexData.briefs && indexData.briefs.length > 0) {
        latestBriefFile = indexData.briefs[0];
      }
    } catch (e) {
      console.warn('Could not load briefs index, using fallback');
    }

    const [brief, watchlist, techNews, portfolioAnalysis] = await Promise.all([
      fetchJson(`data/briefs/${latestBriefFile}`, { bustCache }),
      fetchJson('data/watchlist.json', { bustCache }),
      fetchJson('data/tech-news.json', { bustCache, optional: true }),
      fetchJson('data/portfolio-analysis.json', { bustCache, optional: true })
    ]);

    briefData = brief;
    watchlistData = watchlist;
    techNewsData = techNews;
    portfolioAnalysisData = portfolioAnalysis;

    updateDateLabel();
    return true;
  } catch (error) {
    console.error('Error loading data:', error);
    if (!bustCache) {
      showError('無法載入數據');
    }
    return false;
  }
}

function destroyAllCharts() {
  Object.keys(charts).forEach((key) => {
    try {
      charts[key].destroy();
    } catch (e) {
      // ignore stale chart instances
    }
    delete charts[key];
  });
}

function refreshRenderedViews() {
  renderUI();
}

function showAlert(message, type = 'info') {
  const alert = document.getElementById('alert');
  if (!alert) return;

  const titleEl = alert.querySelector('.alert-title');
  const messageEl = alert.querySelector('.alert-message');
  
  if (!titleEl || !messageEl) return;

  // Set title based on type
  let title = '提示';
  if (type === 'success') {
    title = '完成';
  } else if (type === 'error') {
    title = '錯誤';
  } else if (type === 'info' && (message.includes('同步') || message.includes('更新'))) {
    title = '同步';
  }

  titleEl.textContent = title;
  messageEl.textContent = message;

  alert.classList.remove('show', 'success', 'error', 'info');
  alert.classList.add(type);

  void alert.offsetWidth;
  alert.classList.add('show');

  clearTimeout(showAlert._timer);
  showAlert._timer = setTimeout(() => {
    dismissAlert();
  }, 3500);
}

function dismissAlert() {
  const alert = document.getElementById('alert');
  if (!alert) return;
  
  alert.classList.remove('show');
  setTimeout(() => {
    const titleEl = alert.querySelector('.alert-title');
    const messageEl = alert.querySelector('.alert-message');
    if (titleEl) titleEl.textContent = '';
    if (messageEl) messageEl.textContent = '';
    alert.classList.remove('success', 'error', 'info');
  }, 300);
}

function initAlertClose() {
  const alertClose = document.querySelector('.alert-close');
  if (alertClose) {
    alertClose.addEventListener('click', () => {
      clearTimeout(showAlert._timer);
      dismissAlert();
    });
  }
}

// Webhook credentials (localStorage)
// Webhook always uses same-origin Vercel proxy (no browser config needed)

function setUpdateButtonLoading(isLoading) {
  const btn = document.getElementById('updateBtn');
  if (!btn) return;
  const label = btn.querySelector('.update-label');
  btn.disabled = isLoading;
  btn.classList.toggle('is-loading', isLoading);
  btn.setAttribute('aria-busy', isLoading ? 'true' : 'false');
  if (label) {
    label.textContent = isLoading ? '更新中…' : '更新';
  }
}

async function triggerWebhook() {
  try {
    const res = await fetch(DEFAULT_REFRESH_PROXY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ source: 'investment-brief-update-btn' })
    });
    
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        if (body && body.message) {
          detail = body.message;
        } else if (body && body.error) {
          detail = body.error;
        }
      } catch (e) {
        // ignore JSON parse error
      }
      return { ok: false, status: res.status, detail };
    }
    
    return { ok: true };
  } catch (error) {
    console.error('Webhook failed:', error);
    return { ok: false, detail: error.message || 'Network error' };
  }
}

async function refreshSiteData() {
  const btn = document.getElementById('updateBtn');
  if (btn && btn.disabled) return;

  // Check 5-minute rate limit
  const RATE_LIMIT_MS = 5 * 60 * 1000;
  const RATE_LIMIT_KEY = 'ib_last_refresh_trigger_at';
  
  try {
    const lastTriggerStr = localStorage.getItem(RATE_LIMIT_KEY);
    if (lastTriggerStr) {
      const lastTrigger = parseInt(lastTriggerStr, 10);
      const now = Date.now();
      const elapsed = now - lastTrigger;
      
      if (elapsed < RATE_LIMIT_MS) {
        const remainingMs = RATE_LIMIT_MS - elapsed;
        const remainingMin = Math.ceil(remainingMs / 60000);
        showAlert(`請稍後再試（約 ${remainingMin} 分鐘限速）`, 'info');
        return;
      }
    }
  } catch (e) {
    console.warn('Failed to check rate limit:', e);
  }

  setUpdateButtonLoading(true);
  showAlert('同步中…', 'info');

  try {
    const result = await triggerWebhook();
    
    if (!result.ok) {
      let message = '同步失敗，請稍後再試。';
      
      // Check for 500 server configuration error
      if (result.status === 500 && result.detail) {
        if (result.detail.includes('not configured') || result.detail.includes('configuration error')) {
          message = 'Webhook 未配置。請聯絡管理員在 Vercel 設定 REFRESH_WEBHOOK_URL 同 REFRESH_WEBHOOK_AUTH 環境變量。';
        } else {
          message = `伺服器錯誤（${result.detail}）。`;
        }
      } else if (result.status) {
        message = `Webhook 失敗（HTTP ${result.status}）。${result.detail || ''}`;
      } else if (result.detail) {
        message = `網絡錯誤：${result.detail}`;
      }
      
      showAlert(message, 'error');
      setUpdateButtonLoading(false);
      return;
    }
    
    // Webhook succeeded! Record timestamp for rate-limiting
    try {
      localStorage.setItem(RATE_LIMIT_KEY, Date.now().toString());
    } catch (e) {
      console.warn('Failed to record refresh timestamp:', e);
    }
    
    // Start polling for data update
    showAlert('已觸發遠端同步', 'info');
    
    // Capture baseline lastUpdated from current watchlistData
    const baselineLastUpdated = watchlistData?.lastUpdated || null;
    
    // Short grace period before first poll
    await new Promise(resolve => setTimeout(resolve, 3000));
    showAlert('同步中，等待資料更新…', 'info');
    
    // Poll for data update (check every 4.5 seconds, timeout after 3 minutes)
    const pollInterval = 4500;
    const pollTimeout = 180000;
    const startTime = Date.now();
    let synced = false;
    
    while (Date.now() - startTime < pollTimeout) {
      try {
        // Poll watchlist.json with cache-bust
        const freshWatchlist = await fetchJson('data/watchlist.json', { bustCache: true, optional: true });
        
        if (freshWatchlist) {
          const newLastUpdated = freshWatchlist.lastUpdated || null;
          
          // Success condition: lastUpdated changed from baseline
          if (baselineLastUpdated && newLastUpdated && newLastUpdated !== baselineLastUpdated) {
            synced = true;
            break;
          }
          
          // Fallback: if baseline was missing but now we have data with tickers, consider it success
          if (!baselineLastUpdated && newLastUpdated && freshWatchlist.tickers && freshWatchlist.tickers.length > 0) {
            synced = true;
            break;
          }
        }
      } catch (pollError) {
        console.warn('Poll attempt failed:', pollError);
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    if (synced) {
      // Data updated! Reload all data and refresh UI
      const ok = await loadSiteData({ bustCache: true });
      if (!ok) {
        showAlert('重新載入失敗，請稍後再試', 'error');
      } else {
        refreshRenderedViews();
        showAlert('已同步', 'success');
      }
    } else {
      // Timeout: sync might still be in progress
      showAlert('同步可能仍在進行，請稍後再手動重新整理', 'info');
    }
  } catch (error) {
    console.error('Refresh failed:', error);
    showAlert('同步失敗，請檢查網絡連接', 'error');
  } finally {
    setUpdateButtonLoading(false);
  }
}

function initUpdateButton() {
  const btn = document.getElementById('updateBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    refreshSiteData();
  });
}

function updateDateLabel() {
  if (!briefData || !briefData.date) return;
  
  const date = new Date(briefData.date);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  const dateLabels = document.querySelectorAll('.date-label');
  dateLabels[0].textContent = `${year}年${month}月${day}日`;
}

// Render UI
function renderUI() {
  if (!briefData || !watchlistData) return;
  
  renderWatchlistChips();
  renderConceptChips();
  renderStories();
  renderGlossary();
  renderTechNews();
  renderPortfolio();
}

// Render Watchlist Chips
function renderWatchlistChips() {
  const container = document.getElementById('watchlistChips');
  const watchlistTickers = watchlistData.tickers || [];
  
  const html = watchlistTickers.map(watchlistTicker => {
    const briefTicker = (briefData.tickers || []).find(t => t.symbol === watchlistTicker.symbol);
    let changeHtml = '';
    
    if (watchlistTicker.prices['1M'].length >= 2) {
      const prices = watchlistTicker.prices['1M'];
      const latest = prices[prices.length - 1].close;
      const previous = prices[prices.length - 2].close;
      const change = ((latest - previous) / previous * 100).toFixed(2);
      const isPositive = change >= 0;
      
      changeHtml = `<span class="chip-change ${isPositive ? 'up' : 'down'}">${isPositive ? '+' : ''}${change}%</span>`;
    }
    
    return `
      <button class="chip" data-ticker="${watchlistTicker.symbol}">
        ${watchlistTicker.symbol}
        ${changeHtml}
      </button>
    `;
  }).join('');
  
  container.innerHTML = html;
  
  container.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const ticker = chip.dataset.ticker;
      openTicker(ticker);
    });
  });
}

// Unified routing helpers
function openTicker(symbol) {
  closeSheet();
  setActiveChip(symbol, 'ticker');
  const isDesktop = window.innerWidth >= 1024;
  if (isDesktop) {
    openTickerInPanel(symbol);
  } else {
    openTickerSheet(symbol);
  }
}

function openConcept(conceptId) {
  closeSheet();
  setActiveChip(conceptId, 'concept');
  const isDesktop = window.innerWidth >= 1024;
  if (isDesktop) {
    openConceptInPanel(conceptId);
  } else {
    openConceptSheet(conceptId);
  }
}

function setActiveChip(identifier, type) {
  document.querySelectorAll('.chip').forEach(chip => chip.classList.remove('active'));
  
  if (type === 'ticker') {
    const targetChip = document.querySelector(`.chip[data-ticker="${identifier}"]`);
    if (targetChip) targetChip.classList.add('active');
  } else if (type === 'concept') {
    const targetChip = document.querySelector(`.chip[data-concept-id="${identifier}"]`);
    if (targetChip) targetChip.classList.add('active');
  }
}

function clearActiveChips() {
  document.querySelectorAll('.chip').forEach(chip => chip.classList.remove('active'));
}

// Render Concept Chips
function renderConceptChips() {
  const container = document.getElementById('conceptChips');
  const concepts = briefData.concepts || [];
  
  const html = concepts.map(concept => `
    <button class="chip concept" data-concept-id="${concept.id}">
      ${concept.title}
    </button>
  `).join('');
  
  container.innerHTML = html;
  
  container.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const conceptId = chip.dataset.conceptId;
      openConcept(conceptId);
    });
  });
}

function formatBriefDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
}

// Render Stories
function renderStories() {
  const container = document.getElementById('storyGrid');
  const stories = briefData.stories || [];
  
  const briefDate = formatBriefDate(briefData.date);
  
  const html = stories.map(story => {
    const sourcesCount = story.sources?.length || 0;
    const sourceText = sourcesCount > 0 
      ? `來源：${story.sources[0].publisher}${sourcesCount > 1 ? ` +${sourcesCount - 1}` : ''}`
      : '來源：未核實';
    
    const truncatedWhy = story.whyItMatters && story.whyItMatters.length > 100 
      ? story.whyItMatters.substring(0, 100) + '...'
      : story.whyItMatters;
    
    return `
      <div class="story-card" data-story-id="${story.id}">
        <div class="story-header">
          ${story.ticker ? `<span class="story-ticker">${story.ticker}</span>` : ''}
          <span class="story-time">${briefDate}</span>
        </div>
        <h3 class="story-title">${story.title}</h3>
        <p class="story-summary">${story.summary}</p>
        ${story.whyItMatters ? `
          <div class="story-callout">
            <div class="story-callout-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              新手點解要理？
            </div>
            <p class="story-callout-text">${truncatedWhy}</p>
          </div>
        ` : ''}
        <div class="story-footer">
          <span class="story-source">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            ${sourceText}
          </span>
          <svg class="story-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = html;
  
  container.querySelectorAll('.story-card').forEach(card => {
    card.addEventListener('click', () => {
      const storyId = card.dataset.storyId;
      openStoryInPanel(storyId);
    });
  });
}

// Render Glossary
function renderGlossary() {
  const container = document.getElementById('glossaryGrid');
  const concepts = briefData.concepts || [];
  
  const html = concepts.map(concept => `
    <div class="glossary-card" data-concept-id="${concept.id}">
      <div class="glossary-title">${concept.title}</div>
      <div class="glossary-title-en">${concept.titleEn}</div>
      <p class="glossary-what">${concept.what}</p>
    </div>
  `).join('');
  
  container.innerHTML = html;
  
  container.querySelectorAll('.glossary-card').forEach(card => {
    card.addEventListener('click', () => {
      const conceptId = card.dataset.conceptId;
      openConcept(conceptId);
    });
  });
}

// Tech News Filter State
let techNewsFilters = {
  stock: 'all',
  source: 'all'
};

// Render Tech News Filters
function renderTechNewsFilters() {
  if (!techNewsData || !techNewsData.items || techNewsData.items.length === 0) return;

  // Extract unique stocks
  const stocksSet = new Set();
  techNewsData.items.forEach(item => {
    item.tickers.forEach(ticker => stocksSet.add(ticker));
  });
  const stocks = ['all', ...Array.from(stocksSet).sort()];

  // Extract unique sources
  const sourcesSet = new Set();
  techNewsData.items.forEach(item => {
    sourcesSet.add(item.source);
  });
  const sources = ['all', ...Array.from(sourcesSet).sort()];

  // Render stock filters
  const stockContainer = document.getElementById('stockFilters');
  const stockHtml = stocks.map(stock => {
    const label = stock === 'all' ? '全部' : stock;
    const active = techNewsFilters.stock === stock ? 'active' : '';
    return `<button class="filter-chip ${active}" data-filter-type="stock" data-filter-value="${stock}">${label}</button>`;
  }).join('');
  stockContainer.innerHTML = stockHtml;

  // Render source filters
  const sourceContainer = document.getElementById('sourceFilters');
  const sourceHtml = sources.map(source => {
    const label = source === 'all' ? '全部' : source;
    const active = techNewsFilters.source === source ? 'active' : '';
    return `<button class="filter-chip ${active}" data-filter-type="source" data-filter-value="${source}">${label}</button>`;
  }).join('');
  sourceContainer.innerHTML = sourceHtml;

  // Setup event listeners
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const filterType = chip.dataset.filterType;
      const filterValue = chip.dataset.filterValue;
      
      techNewsFilters[filterType] = filterValue;
      
      // Update active states
      const container = filterType === 'stock' ? stockContainer : sourceContainer;
      container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      
      // Re-render news
      renderTechNewsList();
    });
  });
}

// Render Tech News List
function renderTechNewsList() {
  const container = document.getElementById('techNewsList');
  const emptyState = document.getElementById('techNewsEmpty');
  
  if (!techNewsData || !techNewsData.items || techNewsData.items.length === 0) {
    container.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  // Filter items
  const filteredItems = techNewsData.items.filter(item => {
    const stockMatch = techNewsFilters.stock === 'all' || item.tickers.includes(techNewsFilters.stock);
    const sourceMatch = techNewsFilters.source === 'all' || item.source === techNewsFilters.source;
    return stockMatch && sourceMatch;
  });

  if (filteredItems.length === 0) {
    container.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  container.style.display = 'grid';
  emptyState.style.display = 'none';

  const html = filteredItems.map(item => {
    const tickerChipsHtml = item.tickers.map(ticker => 
      `<button class="tech-news-ticker-chip" data-ticker="${ticker}">${ticker}</button>`
    ).join('');
    
    return `
      <div class="tech-news-item">
        <div class="tech-news-header">
          <span class="tech-news-source">${item.source}</span>
          <span class="tech-news-date">${item.date}</span>
        </div>
        <h3 class="tech-news-title">${item.title}</h3>
        <p class="tech-news-summary">${item.summary}</p>
        <div class="tech-news-footer">
          <div class="tech-news-tickers">
            ${tickerChipsHtml}
          </div>
          <a href="${item.url}" class="tech-news-link" target="_blank" rel="noopener noreferrer">
            原文
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = html;
  
  container.querySelectorAll('.tech-news-ticker-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const ticker = chip.dataset.ticker;
      openTicker(ticker);
    });
  });
}

// Render Tech News (with filters)
function renderTechNews() {
  const disclaimerDiv = document.getElementById('techNewsDisclaimer');
  const disclaimerText = document.getElementById('techNewsDisclaimerText');
  
  if (!techNewsData || !techNewsData.items || techNewsData.items.length === 0) {
    document.getElementById('techNewsList').innerHTML = '<div class="tech-news-empty">今朝未有篩過的科技新聞</div>';
    disclaimerDiv.style.display = 'none';
    document.getElementById('techNewsFilters').style.display = 'none';
    return;
  }
  
  disclaimerText.textContent = techNewsData.disclaimer;
  disclaimerDiv.style.display = 'flex';
  document.getElementById('techNewsFilters').style.display = 'block';
  
  renderTechNewsFilters();
  renderTechNewsList();
}

// Render Portfolio Analysis
function renderPortfolioAnalysis() {
  const section = document.getElementById('portfolioAnalysis');
  const disclaimerDiv = document.getElementById('analysisDisclaimer');
  const compositionDiv = document.getElementById('analysisComposition');
  const tiltDiv = document.getElementById('analysisTilt');
  const themesDiv = document.getElementById('analysisThemes');
  const trendsUl = document.getElementById('analysisTrends');
  const risksUl = document.getElementById('analysisRisks');
  
  const themeCard = document.getElementById('analysisThemeCard');
  const trendsCard = document.getElementById('analysisTrendsCard');
  const risksCard = document.getElementById('analysisRisksCard');
  
  // Get holdings from watchlist
  let holdings = [];
  if (watchlistData && watchlistData.tickers) {
    holdings = watchlistData.tickers.filter(ticker => {
      const briefTicker = (briefData.tickers || []).find(t => t.symbol === ticker.symbol);
      const briefRole = briefTicker ? briefTicker.role : null;
      const watchlistRole = ticker.role || null;
      const role = briefRole || watchlistRole;
      return role && (
        role === 'Holding' || 
        role === '持倉' || 
        role === '持仓' ||
        role.toLowerCase() === 'holding'
      );
    });
  }
  
  // If no holdings, hide analysis
  if (holdings.length === 0) {
    section.style.display = 'none';
    return;
  }
  
  section.style.display = 'block';
  
  // Auto-generate composition from holdings
  const autoComposition = generateAutoComposition(holdings);
  let compositionHtml = autoComposition.map(item => `
    <div class="composition-item">
      <div class="composition-label">${item.label}</div>
      <div class="composition-detail">${item.detail}</div>
      <div class="composition-tickers">
        ${item.tickers.map(t => `<span class="composition-ticker">${t}</span>`).join('')}
      </div>
    </div>
  `).join('');
  
  // If we have analysis data, use it
  if (portfolioAnalysisData) {
    disclaimerDiv.textContent = portfolioAnalysisData.disclaimer || '非投資建議 · 僅供學習參考，唔構成買賣建議。';
    
    // Use JSON composition if available, otherwise use auto
    if (portfolioAnalysisData.composition && portfolioAnalysisData.composition.length > 0) {
      compositionHtml = portfolioAnalysisData.composition.map(item => `
        <div class="composition-item">
          <div class="composition-label">${item.label}</div>
          <div class="composition-detail">${item.weightHint || ''}</div>
          <div class="composition-tickers">
            ${item.tickers.map(t => `<span class="composition-ticker">${t}</span>`).join('')}
          </div>
        </div>
      `).join('');
    }
    
    compositionDiv.innerHTML = compositionHtml;
    
    // Tilt summary
    if (portfolioAnalysisData.tiltSummary) {
      tiltDiv.innerHTML = portfolioAnalysisData.tiltSummary;
      tiltDiv.style.display = 'block';
    } else {
      tiltDiv.style.display = 'none';
    }
    
    // Theme focus
    if (portfolioAnalysisData.themeFocus && portfolioAnalysisData.themeFocus.length > 0) {
      themesDiv.innerHTML = portfolioAnalysisData.themeFocus.map(theme => `
        <div class="theme-item">
          <div class="theme-title">${theme.title}</div>
          <div class="theme-body">${theme.body}</div>
        </div>
      `).join('');
      themeCard.style.display = 'block';
    } else {
      themeCard.style.display = 'none';
    }
    
    // Trends to watch
    if (portfolioAnalysisData.trendsToWatch && portfolioAnalysisData.trendsToWatch.length > 0) {
      trendsUl.innerHTML = portfolioAnalysisData.trendsToWatch.map(trend => `<li>${trend}</li>`).join('');
      trendsCard.style.display = 'block';
    } else {
      trendsCard.style.display = 'none';
    }
    
    // Risks
    if (portfolioAnalysisData.risks && portfolioAnalysisData.risks.length > 0) {
      risksUl.innerHTML = portfolioAnalysisData.risks.map(risk => `<li>${risk}</li>`).join('');
      risksCard.style.display = 'block';
    } else {
      risksCard.style.display = 'none';
    }
  } else {
    // No analysis data, show auto composition only
    disclaimerDiv.textContent = '非投資建議 · 僅供學習參考，唔構成買賣建議。';
    compositionDiv.innerHTML = compositionHtml;
    tiltDiv.style.display = 'none';
    themeCard.style.display = 'none';
    trendsCard.style.display = 'none';
    risksCard.style.display = 'none';
  }
}

function generateAutoComposition(holdings) {
  const buckets = {
    '美股寬基': [],
    '海外股票': [],
    '黃金': [],
    '單一成長': []
  };
  
  holdings.forEach(ticker => {
    const symbol = ticker.symbol;
    if (symbol === 'SPYM') {
      buckets['美股寬基'].push(symbol);
    } else if (symbol === 'VEU') {
      buckets['海外股票'].push(symbol);
    } else if (symbol === 'GLD') {
      buckets['黃金'].push(symbol);
    } else if (symbol === 'SPCX' || symbol.includes('.HK')) {
      buckets['單一成長'].push(symbol);
    }
  });
  
  return Object.keys(buckets)
    .filter(label => buckets[label].length > 0)
    .map(label => ({
      label,
      detail: buckets[label].length > 1 ? `${buckets[label].length} 個名稱` : '',
      tickers: buckets[label]
    }));
}

// Render Portfolio
function renderPortfolio() {
  // Render analysis section first
  renderPortfolioAnalysis();
  
  const container = document.getElementById('portfolioList');
  const emptyState = document.getElementById('portfolioEmpty');
  
  if (!watchlistData || !watchlistData.tickers) {
    container.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }
  
  // Get holdings from watchlist tickers
  const holdings = watchlistData.tickers.filter(ticker => {
    // Check role from briefData first
    const briefTicker = (briefData.tickers || []).find(t => t.symbol === ticker.symbol);
    const briefRole = briefTicker ? briefTicker.role : null;
    
    // Also check role from watchlistData
    const watchlistRole = ticker.role || null;
    
    // Accept various forms: Holding, 持倉, 持仓
    const role = briefRole || watchlistRole;
    return role && (
      role === 'Holding' || 
      role === '持倉' || 
      role === '持仓' ||
      role.toLowerCase() === 'holding'
    );
  });
  
  if (holdings.length === 0) {
    container.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }
  
  container.style.display = 'grid';
  emptyState.style.display = 'none';
  
  const html = holdings.map(ticker => {
    const briefTicker = (briefData.tickers || []).find(t => t.symbol === ticker.symbol);
    const name = briefTicker ? briefTicker.name : '';
    
    // Get latest price from 1M series
    let priceHtml = '';
    let changeHtml = '';
    let sparklineData = [];
    
    if (ticker.prices['1M'] && ticker.prices['1M'].length > 0) {
      const prices = ticker.prices['1M'];
      const latest = prices[prices.length - 1].close;
      const currency = getCurrencySymbol(ticker.symbol, ticker.exchange);
      priceHtml = `<div class="portfolio-price">${currency}${latest.toFixed(2)}</div>`;
      
      // Calculate 1D change if we have at least 2 data points
      if (prices.length >= 2) {
        const previous = prices[prices.length - 2].close;
        const change = ((latest - previous) / previous * 100).toFixed(2);
        const isPositive = change >= 0;
        changeHtml = `<div class="portfolio-change ${isPositive ? 'up' : 'down'}">${isPositive ? '+' : ''}${change}%</div>`;
      }
      
      // Get sparkline data (last 10 points)
      sparklineData = prices.slice(-10).map(p => p.close);
    }
    
    // Generate sparkline SVG
    let sparklineHtml = '';
    if (sparklineData.length > 1) {
      const min = Math.min(...sparklineData);
      const max = Math.max(...sparklineData);
      const range = max - min || 1;
      const width = 80;
      const height = 24;
      
      const points = sparklineData.map((value, i) => {
        const x = (i / (sparklineData.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        return `${x},${y}`;
      }).join(' ');
      
      const isUp = sparklineData[sparklineData.length - 1] >= sparklineData[0];
      const color = isUp ? '#2EE6D6' : '#ef4444';
      
      sparklineHtml = `
        <svg class="portfolio-sparkline" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
          <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" />
        </svg>
      `;
    }
    
    return `
      <div class="portfolio-item" data-ticker="${ticker.symbol}">
        <div class="portfolio-header">
          <div class="portfolio-symbol">${ticker.symbol}</div>
          ${name ? `<div class="portfolio-name">${name}</div>` : ''}
        </div>
        <div class="portfolio-stats">
          <div class="portfolio-price-group">
            ${priceHtml}
            ${changeHtml}
          </div>
          ${sparklineHtml}
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = html;
  
  // Add click handlers to open ticker drawer
  container.querySelectorAll('.portfolio-item').forEach(item => {
    item.addEventListener('click', () => {
      const ticker = item.dataset.ticker;
      openTicker(ticker);
    });
  });
}

// Render Market Charts
// Render Chart in Sheet (with explicit sizing)
function renderSheetChart(symbol, period, containerId = 'sheetChart') {
  const ticker = watchlistData.tickers.find(t => t.symbol === symbol);
  if (!ticker || !ticker.prices[period] || ticker.prices[period].length === 0) return;
  
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Set explicit dimensions
  container.style.height = '180px';
  container.style.minHeight = '180px';
  container.style.position = 'relative';
  
  // Clear and create canvas
  container.innerHTML = '<canvas style="width: 100% !important; height: 180px !important;"></canvas>';
  const canvas = container.querySelector('canvas');
  
  // Destroy existing chart
  const chartKey = `${containerId}_${symbol}`;
  if (charts[chartKey]) {
    charts[chartKey].destroy();
    delete charts[chartKey];
  }
  
  const ctx = canvas.getContext('2d');
  const data = ticker.prices[period];
  const labels = data.map(d => d.date);
  const prices = data.map(d => d.close);
  
  const gradient = ctx.createLinearGradient(0, 0, 0, 180);
  gradient.addColorStop(0, 'rgba(46, 230, 214, 0.3)');
  gradient.addColorStop(1, 'rgba(46, 230, 214, 0)');
  
  charts[chartKey] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        data: prices,
        borderColor: '#2EE6D6',
        backgroundColor: gradient,
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#2EE6D6',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(24, 28, 28, 0.95)',
          titleColor: '#e0e3e1',
          bodyColor: '#bec9c6',
          borderColor: '#3f4946',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            label: (context) => `$${context.parsed.y.toFixed(2)}`
          }
        }
      },
      scales: {
        x: { display: false },
        y: {
          border: { display: false },
          grid: {
            color: 'rgba(190, 201, 198, 0.1)',
            drawTicks: false
          },
          ticks: {
            color: '#bec9c6',
            padding: 10,
            callback: (value) => '$' + value.toFixed(0)
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      },
      animation: {
        duration: 200,
        easing: 'easeOutQuart'
      }
    }
  });
}

// Open Story Sheet (mobile only)
function openStorySheet(storyId) {
  clearActiveChips();
  const story = briefData.stories.find(s => s.id === storyId);
  if (!story) return;
  
  const html = renderStoryContent(story);
  showSheet(html);
}

// Open Ticker Sheet
function getCurrencySymbol(symbol, exchange) {
  if (symbol.includes('.HK') || (exchange && exchange.includes('HK'))) {
    return 'HK$';
  }
  if (exchange && (exchange.includes('NASDAQ') || exchange.includes('NYSE'))) {
    return '$';
  }
  return '';
}

function openTickerSheet(symbol) {
  const tickerMeta = briefData.tickers.find(t => t.symbol === symbol);
  const watchlistTicker = watchlistData.tickers.find(t => t.symbol === symbol);
  
  if (!tickerMeta || !watchlistTicker) return;
  
  const hasData = watchlistTicker.prices['1M'].length > 0;
  const latestPrice = hasData ? watchlistTicker.prices['1M'][watchlistTicker.prices['1M'].length - 1].close : 0;
  const currencySymbol = getCurrencySymbol(symbol, tickerMeta.exchange);
  
  const roleLabels = {
    '持仓': '持倉',
    '研究': '研究',
    '学习': '學習',
    '对照': '對照',
    '對照': '對照'
  };
  
  const relatedStories = briefData.stories.filter(s => s.ticker === symbol);
  
  const storiesHtml = relatedStories.length > 0 ? `
    <div class="sheet-section">
      <h3>✨ 今期簡報提及</h3>
      ${relatedStories.map(story => `
        <div class="story-card" onclick="openStoryInPanel('${story.id}')" style="margin-bottom: 12px; cursor: pointer;">
          <h4 style="font-size: 1rem; font-weight: 600; margin-bottom: 8px;">${story.title}</h4>
          <p style="font-size: 0.875rem; color: var(--on-surface-variant);">${story.summary.substring(0, 80)}...</p>
        </div>
      `).join('')}
    </div>
  ` : '';
  
  const notionHtml = tickerMeta.notesUrl ? `
    <a href="${tickerMeta.notesUrl}" target="_blank" rel="noopener" class="notion-link">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
      在 Notion 打開筆記
    </a>
  ` : '<p style="color: var(--on-surface-variant); font-style: italic;">還沒有筆記頁</p>';
  
  const filingHtml = tickerMeta.lastFiling ? `
    <div class="sheet-section">
      <h3>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        最新披露
      </h3>
      <a href="${tickerMeta.lastFiling.url}" target="_blank" rel="noopener" class="source-link">
        <div class="source-title">${tickerMeta.lastFiling.title}</div>
        <div class="source-date">${tickerMeta.lastFiling.date}</div>
      </a>
    </div>
  ` : '';
  
  const html = `
    <div class="sheet-ticker-header">
      <div class="sheet-ticker-info">
        <h2>${tickerMeta.nameCn || symbol}</h2>
        <div class="sheet-ticker-code">${symbol}</div>
        <div class="sheet-ticker-exchange">${tickerMeta.exchange}</div>
      </div>
      <span class="sheet-role-pill">${roleLabels[tickerMeta.role] || tickerMeta.role}</span>
    </div>
    
    ${hasData ? `<div class="sheet-price">${currencySymbol}${latestPrice.toFixed(2)}</div>` : ''}
    
    ${hasData ? `
      <div class="chart-container" id="sheetChart" style="height: 200px; min-height: 200px; margin-bottom: 16px;"></div>
      <div class="timeframe-selector" id="sheetTimeframeSelector">
        <button class="timeframe-btn active" data-period="1M">1M</button>
        <button class="timeframe-btn" data-period="3M">3M</button>
        <button class="timeframe-btn" data-period="1Y">1Y</button>
      </div>
    ` : '<div class="chart-empty">無可用數據</div>'}
    
    ${storiesHtml}
    
    ${filingHtml}
    
    <div class="sheet-section">
      <h3>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        筆記
      </h3>
      ${notionHtml}
    </div>
  `;
  
  showSheet(html);
  
  if (hasData) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        renderSheetChart(symbol, '1M', 'sheetChart');
        
        document.querySelectorAll('#sheetTimeframeSelector .timeframe-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const period = e.target.dataset.period;
            document.querySelectorAll('#sheetTimeframeSelector .timeframe-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderSheetChart(symbol, period, 'sheetChart');
          });
        });
      });
    });
  }
}

function openTickerInPanel(symbol) {
  const tickerMeta = briefData.tickers.find(t => t.symbol === symbol);
  const watchlistTicker = watchlistData.tickers.find(t => t.symbol === symbol);
  
  if (!tickerMeta || !watchlistTicker) return;
  
  const hasData = watchlistTicker.prices['1M'].length > 0;
  const latestPrice = hasData ? watchlistTicker.prices['1M'][watchlistTicker.prices['1M'].length - 1].close : 0;
  const currencySymbol = getCurrencySymbol(symbol, tickerMeta.exchange);
  
  const roleLabels = {
    '持仓': '持倉',
    '研究': '研究',
    '学习': '學習',
    '对照': '對照',
    '對照': '對照'
  };
  
  const relatedStories = briefData.stories.filter(s => s.ticker === symbol);
  
  const storiesHtml = relatedStories.length > 0 ? `
    <div class="sheet-section">
      <h3>✨ 今期簡報提及</h3>
      ${relatedStories.map(story => `
        <div class="story-card" onclick="openStoryInPanel('${story.id}')" style="margin-bottom: 12px; cursor: pointer;">
          <h4 style="font-size: 1rem; font-weight: 600; margin-bottom: 8px;">${story.title}</h4>
          <p style="font-size: 0.875rem; color: var(--on-surface-variant);">${story.summary.substring(0, 80)}...</p>
        </div>
      `).join('')}
    </div>
  ` : '';
  
  const notionHtml = tickerMeta.notesUrl ? `
    <a href="${tickerMeta.notesUrl}" target="_blank" rel="noopener" class="notion-link">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
      在 Notion 打開筆記
    </a>
  ` : '<p style="color: var(--on-surface-variant); font-style: italic;">還沒有筆記頁</p>';
  
  const filingHtml = tickerMeta.lastFiling ? `
    <div class="sheet-section">
      <h3>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        最新披露
      </h3>
      <a href="${tickerMeta.lastFiling.url}" target="_blank" rel="noopener" class="source-link">
        <div class="source-title">${tickerMeta.lastFiling.title}</div>
        <div class="source-date">${tickerMeta.lastFiling.date}</div>
      </a>
    </div>
  ` : '';
  
  const html = `
    <div class="sheet-ticker-header">
      <div class="sheet-ticker-info">
        <h2>${tickerMeta.nameCn || symbol}</h2>
        <div class="sheet-ticker-code">${symbol}</div>
        <div class="sheet-ticker-exchange">${tickerMeta.exchange}</div>
      </div>
      <span class="sheet-role-pill">${roleLabels[tickerMeta.role] || tickerMeta.role}</span>
    </div>
    
    ${hasData ? `<div class="sheet-price">${currencySymbol}${latestPrice.toFixed(2)}</div>` : ''}
    
    ${hasData ? `
      <div class="chart-container" id="panelChart" style="height: 200px; min-height: 200px; margin-bottom: 16px;"></div>
      <div class="timeframe-selector" id="panelTimeframeSelector">
        <button class="timeframe-btn active" data-period="1M">1M</button>
        <button class="timeframe-btn" data-period="3M">3M</button>
        <button class="timeframe-btn" data-period="1Y">1Y</button>
      </div>
    ` : '<div class="chart-empty">無可用數據</div>'}
    
    ${storiesHtml}
    
    ${filingHtml}
    
    <div class="sheet-section">
      <h3>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        筆記
      </h3>
      ${notionHtml}
    </div>
  `;
  
  const panel = document.getElementById('rightPanel');
  panel.innerHTML = html;
  panel.classList.add('has-content');
  document.querySelector('.content-layout').classList.add('panel-active');
  
  if (hasData) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        renderSheetChart(symbol, '1M', 'panelChart');
        
        document.querySelectorAll('#panelTimeframeSelector .timeframe-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const period = e.target.dataset.period;
            document.querySelectorAll('#panelTimeframeSelector .timeframe-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderSheetChart(symbol, period, 'panelChart');
          });
        });
      });
    });
  }
}

// Open Concept Sheet
function openConceptSheet(conceptId) {
  const concept = briefData.concepts.find(c => c.id === conceptId);
  if (!concept) return;
  
  const relatedChipsHtml = concept.relatedTickers && concept.relatedTickers.length > 0 ? `
    <div class="chip-row">
      ${concept.relatedTickers.map(ticker => `
        <button class="chip" onclick="openTicker('${ticker}')">
          ${ticker}
        </button>
      `).join('')}
    </div>
  ` : '';
  
  const notionHtml = concept.notionUrl ? `
    <a href="${concept.notionUrl}" target="_blank" rel="noopener" class="notion-link">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
      在 Notion 了解更多
    </a>
  ` : '';
  
  const html = `
    <div style="margin-bottom: 24px;">
      <h2 style="font-family: var(--font-label); font-size: 1.5rem; font-weight: 700; margin-bottom: 8px;">
        ${concept.title}
      </h2>
      <div style="font-size: 0.875rem; color: var(--on-surface-variant);">${concept.titleEn}</div>
    </div>
    
    <div class="sheet-section" style="border-top: none; padding-top: 0; margin-top: 0;">
      <h3>它是什麼？</h3>
      <p style="color: var(--on-surface); line-height: 1.6;">${concept.what}</p>
    </div>
    
    <div class="sheet-section">
      <h3>新手點解要理？</h3>
      <p style="color: var(--on-surface); line-height: 1.6;">${concept.whyItMatters}</p>
    </div>
    
    <div class="sheet-section">
      <h3>今天邊度出現？</h3>
      <p style="color: var(--on-surface); line-height: 1.6;">${concept.whereToday}</p>
    </div>
    
    ${concept.whatToWatch ? `
      <div class="sheet-section">
        <h3>接下來睇什麼？</h3>
        <p style="color: var(--on-surface); line-height: 1.6;">${concept.whatToWatch}</p>
      </div>
    ` : ''}
    
    ${relatedChipsHtml ? `
      <div class="sheet-section">
        <h3>相關名稱</h3>
        ${relatedChipsHtml}
      </div>
    ` : ''}
    
    ${notionHtml ? `
      <div class="sheet-section">
        ${notionHtml}
      </div>
    ` : ''}
    
    <div style="margin-top: 24px; padding: 16px; background: var(--warning-container); border-radius: 12px; font-size: 0.875rem;">
      <strong>非投資建議</strong> · 本簡報僅供參考，唔構成買賣建議。
    </div>
  `;
  
  showSheet(html);
}

function openConceptInPanel(conceptId) {
  const concept = briefData.concepts.find(c => c.id === conceptId);
  if (!concept) return;
  
  const relatedChipsHtml = concept.relatedTickers && concept.relatedTickers.length > 0 ? `
    <div class="chip-row">
      ${concept.relatedTickers.map(ticker => `
        <button class="chip" onclick="openTicker('${ticker}')">
          ${ticker}
        </button>
      `).join('')}
    </div>
  ` : '';
  
  const notionHtml = concept.notionUrl ? `
    <a href="${concept.notionUrl}" target="_blank" rel="noopener" class="notion-link">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
      在 Notion 了解更多
    </a>
  ` : '';
  
  const html = `
    <div style="margin-bottom: 24px;">
      <h2 style="font-family: var(--font-label); font-size: 1.5rem; font-weight: 700; margin-bottom: 8px;">
        ${concept.title}
      </h2>
      <div style="font-size: 0.875rem; color: var(--on-surface-variant);">${concept.titleEn}</div>
    </div>
    
    <div class="sheet-section">
      <h3>它是什麼？</h3>
      <p style="color: var(--on-surface); line-height: 1.6;">${concept.what}</p>
    </div>
    
    <div class="sheet-section">
      <h3>新手點解要理？</h3>
      <p style="color: var(--on-surface); line-height: 1.6;">${concept.whyItMatters}</p>
    </div>
    
    <div class="sheet-section">
      <h3>今天邊度出現？</h3>
      <p style="color: var(--on-surface); line-height: 1.6;">${concept.whereToday}</p>
    </div>
    
    ${concept.whatToWatch ? `
      <div class="sheet-section">
        <h3>接下來睇什麼？</h3>
        <p style="color: var(--on-surface); line-height: 1.6;">${concept.whatToWatch}</p>
      </div>
    ` : ''}
    
    ${relatedChipsHtml ? `
      <div class="sheet-section">
        <h3>相關名稱</h3>
        ${relatedChipsHtml}
      </div>
    ` : ''}
    
    ${notionHtml ? `
      <div class="sheet-section">
        ${notionHtml}
      </div>
    ` : ''}
    
    <div style="margin-top: 24px; padding: 16px; background: var(--warning-container); border-radius: 12px; font-size: 0.875rem;">
      <strong>非投資建議</strong> · 本簡報僅供參考，唔構成買賣建議。
    </div>
  `;
  
  const panel = document.getElementById('rightPanel');
  panel.innerHTML = html;
  panel.classList.add('has-content');
  document.querySelector('.content-layout').classList.add('panel-active');
}

// Sheet Management
function showSheet(content) {
  const sheet = document.getElementById('bottomSheet');
  const scrim = document.getElementById('sheetScrim');
  const sheetContent = document.getElementById('sheetContent');
  
  sheetContent.innerHTML = content;
  
  scrim.classList.add('active');
  sheet.classList.add('active');
  
  document.body.style.overflow = 'hidden';
}

function closeSheet() {
  const sheet = document.getElementById('bottomSheet');
  const scrim = document.getElementById('sheetScrim');
  
  scrim.classList.remove('active');
  sheet.classList.remove('active');
  
  document.body.style.overflow = '';
  clearActiveChips();
}

// Setup Event Listeners
function setupEventListeners() {
  document.getElementById('sheetScrim').addEventListener('click', closeSheet);
  document.getElementById('sheetClose').addEventListener('click', closeSheet);
  
  // Close on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSheet();
    }
  });
}

// Auto-select first story on desktop
function autoSelectFirstStoryOnDesktop() {
  if (window.innerWidth >= 1024 && briefData && briefData.stories && briefData.stories.length > 0) {
    const firstStory = briefData.stories[0];
    openStoryInPanel(firstStory.id);
  }
}

// Open story in desktop panel or mobile sheet
function openStoryInPanel(storyId) {
  clearActiveChips();
  if (window.innerWidth >= 1024) {
    // Desktop: show in right panel
    const story = briefData.stories.find(s => s.id === storyId);
    if (!story) return;
    
    const panel = document.getElementById('rightPanel');
    const contentLayout = document.querySelector('.content-layout');
    
    panel.innerHTML = renderStoryContent(story);
    panel.classList.add('has-content');
    contentLayout.classList.add('panel-active');
  } else {
    // Mobile: show in bottom sheet
    openStorySheet(storyId);
  }
}

// Render story content (shared between panel and sheet)
function renderStoryContent(story) {
  const groupedSources = {
    company: [],
    exchange: [],
    news: [],
    thirdParty: []
  };
  
  (story.sources || []).forEach(source => {
    const category = source.category === 'company' ? 'company' :
                    source.category === 'exchange' ? 'exchange' :
                    source.category === 'news' ? 'news' : 'thirdParty';
    groupedSources[category].push(source);
  });
  
  const sourcesHtml = Object.entries(groupedSources).map(([category, sources]) => {
    if (sources.length === 0) return '';
    
    const categoryTitle = {
      company: '公司 / IR / SEC / 港交所',
      exchange: '交易所公告',
      news: '通訊社',
      thirdParty: '第三方 · 非公告'
    }[category];
    
    return `
      <div class="source-group">
        <div class="source-group-title">${categoryTitle}</div>
        ${sources.map(source => `
          ${source.url ? `
            <a href="${source.url}" target="_blank" rel="noopener" class="source-link ${source.verified === false ? 'unverified' : ''}">
              <div class="source-publisher">${source.publisher}</div>
              <div class="source-title">${source.title}</div>
              <div class="source-date">${source.date}</div>
              ${source.verified === false ? '<span class="source-unverified-badge">未核實</span>' : ''}
            </a>
          ` : `
            <div class="source-link unverified">
              <div class="source-publisher">${source.publisher}</div>
              <div class="source-title">${source.title}</div>
              <div class="source-date">${source.date}</div>
              <span class="source-unverified-badge">未核實</span>
            </div>
          `}
        `).join('')}
      </div>
    `;
  }).join('');
  
  const relatedChipsHtml = story.ticker ? `
    <div class="chip-row">
      <button class="chip" onclick="openTicker('${story.ticker}')">
        ${story.ticker}
      </button>
    </div>
  ` : '';
  
  const briefDate = formatBriefDate(briefData.date);
  
  return `
    <div class="sheet-ticker-header">
      ${story.ticker ? `<span class="story-ticker">${story.ticker}</span>` : ''}
      <span class="story-time">${briefDate}</span>
    </div>
    
    <h2 style="font-family: var(--font-label); font-size: 1.5rem; font-weight: 700; margin-bottom: 24px;">
      ${story.title}
    </h2>
    
    <div class="sheet-section" style="border-top: none; padding-top: 0; margin-top: 0;">
      <h3>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        發生了什麼？
      </h3>
      <p style="color: var(--on-surface); line-height: 1.6;">${story.summary}</p>
    </div>
    
    ${story.whyItMatters ? `
      <div class="sheet-section">
        <h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          新手點解要理？
        </h3>
        <p style="color: var(--on-surface); line-height: 1.6;">${story.whyItMatters}</p>
        ${relatedChipsHtml}
      </div>
    ` : ''}
    
    ${story.whatToWatch ? `
      <div class="sheet-section">
        <h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          接下來睇什麼？
        </h3>
        <p style="color: var(--on-surface); line-height: 1.6;">${story.whatToWatch}</p>
      </div>
    ` : ''}
    
    ${story.sources && story.sources.length > 0 ? `
      <div class="sheet-section">
        <h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
          來源
        </h3>
        ${sourcesHtml}
      </div>
    ` : ''}
    
    <div style="margin-top: 24px; padding: 16px; background: var(--warning-container); border-radius: 12px; font-size: 0.875rem;">
      <strong>非投資建議</strong> · 本簡報僅供參考，唔構成買賣建議。
    </div>
  `;
}

// Close desktop panel
function closePanel() {
  const panel = document.getElementById('rightPanel');
  const contentLayout = document.querySelector('.content-layout');
  
  panel.classList.remove('has-content');
  contentLayout.classList.remove('panel-active');
  clearActiveChips();
}

// Error Handling
function showError(message) {
  console.error(message);
  const feed = document.getElementById('mainFeed');
  feed.innerHTML = `
    <div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <h3>載入失敗</h3>
      <p>${message}</p>
    </div>
  `;
}
