# Investment Brief 📊

Visual weekday investment news brief with charts, hosted on GitHub Pages.

**Live Site:** https://marcussyl.github.io/investment-brief/

## Overview

Marcus's daily investment brief for HK retail investors. This site provides:
- 📰 Latest morning brief with market insights
- 📈 Interactive price charts for the active watchlist
- 📚 Historical archive of past briefs
- 📱 Mobile-friendly dark theme interface

**⚠️ Not Financial Advice:** This brief is for informational purposes only.

## Publishing a New Brief

### Morning Job Workflow

To publish a new brief, create or update these JSON files and push to the `main` branch. GitHub Pages will automatically rebuild the site.

### 1. Create Brief File

**Location:** `data/briefs/YYYY-MM-DD.json`

**Schema:**

```json
{
  "date": "YYYY-MM-DD",
  "names": ["NVDA", "GOOGL", ...],
  "movements": [
    {
      "name": "Ticker Name",
      "description": "What happened and why",
      "source": "Earnings|Market|IPO|News"
    }
  ],
  "whyItMatters": "Single paragraph explaining relevance for newbie investors",
  "whatToWatch": [
    {
      "event": "Event description",
      "date": "Optional date string"
    }
  ]
}
```

**Example:** See `data/briefs/2026-08-31.json`

### 2. Update Briefs Index

**Location:** `data/briefs-index.json`

Add the new brief filename to the array:

```json
{
  "briefs": [
    "2026-09-01.json",
    "2026-08-31.json"
  ]
}
```

The site displays briefs in reverse chronological order (newest first).

### 3. Update Watchlist (Optional)

**Location:** `data/watchlist.json`

Update price data for chart rendering. The watchlist includes price history for three timeframes: 1M, 3M, 1Y.

**Schema:**

```json
{
  "lastUpdated": "ISO 8601 timestamp",
  "tickers": [
    {
      "symbol": "NVDA",
      "name": "NVIDIA Corporation",
      "prices": {
        "1M": [
          { "date": "YYYY-MM-DD", "close": 123.45 }
        ],
        "3M": [...],
        "1Y": [...]
      }
    }
  ]
}
```

**Notes:**
- Prices are snapshot data included at publish time (no runtime API calls)
- Empty arrays show "No data available" on the chart
- Date format must be `YYYY-MM-DD`
- Close prices should be numbers (not strings)

### 4. Push and Deploy

```bash
git add data/
git commit -m "Add brief for YYYY-MM-DD"
git push origin main
```

GitHub Pages rebuilds automatically (usually 1-2 minutes).

## Active Watchlist

Current tickers tracked:
- **US Tech:** NVDA, GOOGL, MSFT, AAPL, AMZN, META, TSLA
- **Space:** SPCX (SpaceX NASDAQ)
- **HK Tech:** 1810.HK (Xiaomi)
- **ETFs:** SPYM (S&P 500), VEU (All-World ex-US), GLD (Gold)

## Technology Stack

- **Frontend:** Static HTML, CSS, JavaScript
- **Charts:** Chart.js 4.4.0
- **Hosting:** GitHub Pages (static site)
- **Data:** JSON files (no backend required)

## Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/Marcussyl/investment-brief.git
   cd investment-brief
   ```

2. Serve locally (any HTTP server):
   ```bash
   python -m http.server 8000
   # or
   npx serve
   ```

3. Open http://localhost:8000

## Data Sources

Price data should be sourced from reliable market data providers. Do not invent or fabricate prices. If data is unavailable, leave the array empty to show a gap rather than made-up numbers.

## License

Personal project for educational purposes. Not financial advice.

---

**Maintained by Marcus** • [GitHub](https://github.com/Marcussyl/investment-brief)
