# 投資簡報 📊

Visual weekday investment news brief with charts, hosted on Vercel. Traditional Chinese UI with dark/light theme toggle.

**Live Site:** https://investment-brief.vercel.app/ (Vercel primary)  
**Legacy:** https://marcussyl.github.io/investment-brief/ (GitHub Pages, optional)

## Overview

Marcus's daily investment brief for HK retail investors. This site provides:
- 📰 Story cards with drill-through sources (filings, news, third-party)
- 📈 Interactive price charts with real market data
- 🎯 Per-name drawers with Chinese names, roles, Notion links
- 💡 Concept glossary with definitions (Jackson Hole, FOMC vs 金管局, etc.)
- 🌓 Dark/light theme toggle (persists, follows system by default)
- 📱 Mobile-first bottom sheets with 44pt touch targets
- 🖥️ Desktop right panel for drill-through

**⚠️ 非投資建議 / Not Financial Advice:** 本簡報僅供參考，唔構成買賣建議。

## Features

### 1. Morning Brief Audio (今日口播)

Each day's brief can include a pre-generated MP3 audio narration in Traditional Chinese. When available, an HTML5 audio player appears at the top of the 今日焦點 view.

**Audio Generation:**
- Path convention: `data/audio/YYYY-MM-DD.mp3` (audio file) and `data/audio/YYYY-MM-DD.txt` (spoken script for debugging)
- Script: `scripts/generate-brief-audio.py [YYYY-MM-DD]`
- TTS: Azure Cognitive Services Speech (primary) or edge-tts (fallback)
- Voice: `zh-TW-HsiaoChenNeural` (Taiwan Mandarin female)
- Content: Date intro + each story (title, summary, whyItMatters, whatToWatch)
- Length: Capped at ~2500-3500 characters (~3-4 minutes)

**Environment Variables (for Azure TTS):**
- `AZURE_SPEECH_KEY` - Azure Speech service key
- `AZURE_SPEECH_REGION` - Azure region (e.g., `eastasia`)

If Azure env vars are missing, the script automatically falls back to edge-tts (free, no auth required).

**Brief JSON Schema:**
```json
{
  "date": "YYYY-MM-DD",
  "audioUrl": "data/audio/YYYY-MM-DD.mp3",
  "audioScriptChars": 2847,
  "audioVoice": "zh-TW-HsiaoChenNeural",
  "stories": [...]
}
```

If `audioUrl` is missing or the file doesn't exist, the player is hidden gracefully (no broken UI).

**Retention:**
- Keep last ~60 days of audio in repo (prune older files as needed)
- Do NOT commit large unrelated binaries

### 2. Expanded News (Story Cards)

Stories are shown as cards on the home screen. Tap to open a bottom sheet with:
- 發生了什麼？(What happened)
- 新手點解要理？(Why it matters for newbies)
- 接下來睇什麼？(What to watch)
- 來源 (Sources grouped: company/IR/SEC/HKEX, news wires, third-party)

Sources are complete URLs with publisher, date, title. If no URL exists, marked as 「未核實」(unverified).

### 2. Per-Name Drawer

Tap a ticker chip, sparkline, or story ticker to open a drawer with:
- 中文名 + ticker + exchange (e.g., "英偉達 / NVDA / NASDAQ")
- Role pill: 持倉 (Holding), 研究 (Research), 學習 (Learning), 对照 (Benchmark)
- 1M/3M/1Y chart (empty state if no series available)
- Stories from latest brief mentioning this ticker
- Last filing (title + date + link) if known
- 「在 Notion 打開筆記」link if notes URL exists, else 「還沒有筆記頁」

No buy/sell recommendations, no price targets, no position sizes.

### 3. Concept Chips (Glossary)

Home shows 3-6 concept chips. Tap to open a gloss sheet:
- 它是什麼？(What is it)
- 新手點解要理？(Why newbies should care)
- 今天邊度出現？(Where it appears today)
- 接下來睇什麼？(What to watch)
- Notion link (optional)
- Related ticker chips open the name drawer

Examples: 中國數據中心假設為零, FOMC vs 金管局, GAAP vs 非 GAAP, Jackson Hole.

### 4. Dark/Light Theme Toggle

Moon/sun icon in header. Cycles: auto → light → dark.
- **Auto:** Follows system `prefers-color-scheme`
- **Light:** Teal Insight light palette
- **Dark:** Teal Insight dark palette
- Persists choice in `localStorage`

### 5. Mobile Bottom Sheets & Desktop Panel

- **Mobile (<1024px):** Bottom sheets slide up from bottom (90% height, handle, scrim)
- **Desktop (≥1024px):** Right panel (420px) shows ticker/story/concept details

Bottom navigation: 今日重點 / 市場動態 / 投資組合 / 專業術語

## Publishing a New Brief

### Morning Job Workflow

1. **Create brief file:** `data/briefs/YYYY-MM-DD.json`
2. **Update index:** `data/briefs-index.json` (add filename to array)
3. **Update watchlist:** `data/watchlist.json` (optional, refresh prices)
4. **Update tech news:** `data/tech-news.json` (optional, daily tech digest)
5. **Update portfolio analysis:** `data/portfolio-analysis.json` (optional, when holdings change)
6. **Generate audio (optional):**
   ```bash
   # Using Azure (preferred):
   export AZURE_SPEECH_KEY='your-key'
   export AZURE_SPEECH_REGION='eastasia'
   python scripts/generate-brief-audio.py

   # Or using edge-tts (fallback):
   pip install edge-tts
   python scripts/generate-brief-audio.py
   ```
7. **Push to main:** `git push origin main` → Vercel auto-deploys (production + GitHub Pages if enabled)

### Cache Busting

Static assets are cached by CDN. When updating `stitch.css` or `stitch-app.js`:

1. Increment the version query string in `index.html`:
   ```html
   <link rel="stylesheet" href="stitch.css?v=YYYYMMDD-NN">
   <script src="stitch-app.js?v=YYYYMMDD-NN"></script>
   ```
2. Use format: `YYYYMMDD-NN` (e.g., `20260901-22`, `20260901-23`, etc.)
3. Bump both CSS and JS versions together when either file changes

**Note:** Vercel CDN caches aggressively. Query string busting ensures fresh files. Users may need to hard-refresh (Ctrl+Shift+R / Cmd+Shift+R) if HTML is cached.

## Manual Update

The site has an「更新」(Update) button in the header that triggers a webhook to rebuild data and reload the page.

### Built-in Vercel Proxy (Recommended)

**Why?** Browsers cannot directly call `api2.cursor.sh` webhooks due to CORS restrictions. The built-in Vercel serverless proxy forwards requests with proper CORS headers.

**Setup (for repo maintainer):**

1. **Connect repo to Vercel (primary host):**
   - Go to [vercel.com](https://vercel.com) and import `Marcussyl/investment-brief`
   - Deploy with default settings (root directory, auto-detect framework)
   - Vercel serves static files (`index.html`, CSS, JS, data) + API routes (`/api/refresh`)

2. **Set environment variables in Vercel project settings:**
   - `REFRESH_WEBHOOK_URL` = Full webhook URL from Grok Bot routine "On-demand site refresh"
   - `REFRESH_WEBHOOK_AUTH` = Full Authorization header value (e.g., `Bearer xyz123...`)
   - Optional: `ALLOWED_ORIGIN` = Custom domain if not using `*.vercel.app`
   - Scope: Production + Preview

3. **Verify deployment:**
   - Primary URL: `https://investment-brief.vercel.app/`
   - API endpoint: `https://investment-brief.vercel.app/api/refresh`
   - Test refresh proxy: `curl -X POST https://investment-brief.vercel.app/api/refresh`
   - Should return webhook result (200/401/500)

4. **Auto-deploy:**
   - Push to `main` → Vercel auto-deploys
   - Morning sync job: update JSON → `git push main` → Vercel redeploys within ~30s

**For end users:**
- Click「更新」without any setup → uses built-in proxy automatically
- Secrets stay on Vercel server (never exposed to browser)

### Custom Webhook (Advanced)

If you need to override the built-in proxy:

1. Open the Grok Bot routine **"On-demand site refresh"** in the Grok dashboard
2. Copy the **Webhook URL** and **Authorization** header
3. On the live site, click the ⚙️ settings button
4. Paste both values → Click「儲存」

**Note:** Custom webhooks may also encounter CORS issues if the endpoint doesn't support browser requests.

### Usage

- Click「更新」→ POST to webhook (via proxy) → wait ~22s → reload JSON → toast「已同步」
- To revert to built-in proxy: open settings → clear both fields → save
- Credentials (if custom) are stored only in browser `localStorage`, never committed to git

### JSON Schema

#### Brief File (`data/briefs/YYYY-MM-DD.json`)

```json
{
  "date": "YYYY-MM-DD",
  "audioUrl": "data/audio/YYYY-MM-DD.mp3" (optional),
  "audioScriptChars": 2847 (optional),
  "audioVoice": "zh-TW-HsiaoChenNeural" (optional),
  "stories": [
    {
      "id": "unique-story-id",
      "ticker": "NVDA" or null,
      "title": "Traditional Chinese title",
      "summary": "Brief summary",
      "whyItMatters": "Why newbies should care",
      "whatToWatch": "What to watch next",
      "sources": [
        {
          "category": "company|exchange|news|thirdParty",
          "publisher": "NVIDIA Investor Relations",
          "date": "YYYY-MM-DD",
          "title": "Full title",
          "url": "https://..." or null,
          "verified": false (omit if verified/true)
        }
      ]
    }
  ],
  "concepts": [
    {
      "id": "concept-id",
      "title": "中文標題",
      "titleEn": "English Title",
      "what": "Definition",
      "whyItMatters": "Why it matters",
      "whereToday": "Where it appears in today's brief",
      "whatToWatch": "What to watch next",
      "relatedTickers": ["NVDA", "GOOGL"],
      "notionUrl": "https://app.notion.com/p/..." or null
    }
  ],
  "tickers": [
    {
      "symbol": "NVDA",
      "nameCn": "英偉達",
      "exchange": "NASDAQ",
      "role": "持仓|研究|学习|对照",
      "notesUrl": "https://app.notion.com/p/..." or null,
      "lastFiling": {
        "title": "Q2 FY2027 Earnings Release",
        "date": "YYYY-MM-DD",
        "url": "https://..."
      } or null
    }
  ]
}
```

**Source Categories:**
- `company`: Company IR, SEC filings, HKEX announcements
- `exchange`: Exchange notices
- `news`: News wires, press
- `thirdParty`: Third-party analysis (flagged as 「第三方·非公告」)

**Source Verification:**
- Real URL: Normal source link
- No URL + `"verified": false`: Shows 「未核實」badge
- Never invent URLs or data

#### Watchlist (`data/watchlist.json`)

```json
{
  "lastUpdated": "ISO 8601 timestamp",
  "tickers": [
    {
      "symbol": "NVDA",
      "name": "NVIDIA Corporation",
      "prices": {
        "1M": [{"date": "YYYY-MM-DD", "close": 217.55}, ...],
        "3M": [...],
        "1Y": [...]
      }
    }
  ]
}
```

**Price Data Rules:**
- Use real market closes only (Yahoo Finance, API, etc.)
- Empty array if no data available (shows "無可用數據")
- Never invent prices or fabricate data
- SPCX has limited history (listed Jun 2026)

#### Briefs Index (`data/briefs-index.json`)

```json
{
  "briefs": [
    "2026-09-01.json",
    "2026-08-31.json"
  ]
}
```

Newest first. Site displays in reverse chronological order.

#### Tech News (`data/tech-news.json`)

```json
{
  "updated": "YYYY-MM-DD",
  "disclaimer": "第三方·非公告，唯供參考，唔構成買賣建議。",
  "items": [
    {
      "title": "Traditional Chinese headline",
      "summary": "1–2 sentence summary",
      "source": "科技新報|T客邦|電子時報|iThome|Reuters|CNBC|NVIDIA Newsroom|...",
      "date": "YYYY-MM-DD",
      "url": "https://...",
      "tickers": ["NVDA", "1810.HK"] or []
    }
  ]
}
```

**Tech News Rules:**
- Only real articles from trusted tech sources: 科技新報, T客邦, DigiTimes 電子時報, iThome, Reuters Tech, CNBC Tech, NVIDIA Newsroom (and other Active-watchlist IR when fresh)
- Target about 12–20 on-topic items (semiconductors/foundry/packaging, AI/compute/data-center/GPUs, chips, smartphones, EVs, cloud hyperscalers, Active watchlist)
- Complete URLs required (no placeholders); never invent headlines, numbers, or links
- Can be empty array if no relevant news
- Shown in 市場動態 (Market) tab as Google News-style digest
- Ticker chips open the per-name drawer
- Overwrite entire file daily from automation (8:18 AM weekday job)

#### Portfolio Analysis (`data/portfolio-analysis.json`)

```json
{
  "asOf": "YYYY-MM-DD",
  "headline": "Mixed portfolio: broad diversification + thematic growth + hedge",
  "composition": [
    {
      "label": "美股寬基",
      "weightHint": "SPYM covers S&P500",
      "tickers": ["SPYM"]
    }
  ],
  "tiltSummary": "Traditional Chinese paragraph explaining the overall portfolio structure, diversification, and major themes. Educational tone, no buy/sell recommendations.",
  "themeFocus": [
    {
      "title": "AI infrastructure boom affects broad market constituents",
      "body": "Traditional Chinese explanation of how this theme relates to holdings. Mention market trends, not specific actions."
    }
  ],
  "trendsToWatch": [
    "Fed policy impact on gold/USD (GLD hedge narrative)",
    "AI capex cycle sustainability (indirectly affects SPYM tech weight)",
    "China/HK consumer recovery (Xiaomi 1810 phones + EV business)"
  ],
  "risks": [
    "Single-name concentration risk: SPCX + 1810 lack diversification",
    "HK equity liquidity and policy uncertainty (1810 affected by US-China relations)",
    "Gold drawdown potential (if USD strengthens or real rates rise)"
  ],
  "disclaimer": "非投資建議 · 僅供學習參考，唔構成買賣建議。"
}
```

**Portfolio Analysis Rules:**
- Educational market observation for newbies, Traditional Chinese (HK)
- Framing: **觀察**, not personal recommendations
- NEVER say buy/sell/加倉/減倉/應該買邊隻
- Talk themes, concentration, scenarios, risks
- Content honest to actual holdings (SPYM, VEU, GLD, SPCX, 1810.HK)
- If JSON missing, UI auto-generates simple composition from holdings
- Shown in 投資組合 tab above holdings list
- Hidden if no Holding positions exist

## Design System

**Stitch Teal Insight Theme:**
- Primary: `#00504a` (dark teal)
- Accent: `#2EE6D6` (teal)
- Light bg: `#f7faf8`, Dark bg: `#0f1413`
- Fonts: Be Vietnam Pro (body), Hanken Grotesk (labels/tickers)
- Cards: 20px radius, chips: pill, 44pt touch targets
- Motion: 200–350ms (honors `prefers-reduced-motion`)

## Active Watchlist

Current tickers tracked:
- **US Tech:** NVDA, GOOGL, MSFT, AAPL, AMZN, META, TSLA
- **Space:** SPCX (SpaceX NASDAQ, listed Jun 12, 2026)
- **HK Tech:** 1810.HK (Xiaomi)
- **ETFs:** SPYM (S&P 500), VEU (All-World ex-US), GLD (Gold)

## Technology Stack

- **Frontend:** Static HTML, CSS, JavaScript (no build process)
- **Charts:** Chart.js 4.4.0 (CDN)
- **Hosting:** Vercel (primary), GitHub Pages (optional/legacy)
- **API:** Vercel Serverless Functions (`/api/refresh` - CORS proxy for webhook)
- **Data:** JSON files (static, pushed to git)
- **Theme:** Dark/light with system default, persisted in localStorage
- **Base Path:** `/` (root deploy on Vercel; GitHub Pages uses `/investment-brief/` if enabled)

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

4. To fetch new market data:
   ```bash
   pip install yfinance
   python3 fetch_market_data.py
   ```

## Data Sources

Price data is fetched from Yahoo Finance using the `fetch_market_data.py` script. Do not invent or fabricate prices. If data is unavailable, leave the array empty to show a gap rather than made-up numbers.

## Navigation

**Mobile Bottom Nav (4 tabs):**
1. **今日重點** (Today) - Latest brief, stories, concepts
2. **市場動態** (Market) - Watchlist charts
3. **投資組合** (Portfolio) - Holdings (empty state if none marked)
4. **專業術語** (Glossary) - All concepts with definitions

**Desktop:**
- Feed on left (scrolls)
- Right panel (sticky) shows ticker/story/concept details when clicked

## Accessibility

- 44pt minimum touch targets
- Semantic HTML with ARIA labels
- Keyboard navigation (Esc closes sheets)
- Reduced motion support (`prefers-reduced-motion`)
- Color contrast meets WCAG AA
- Screen reader friendly

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- iOS Safari 14+
- Android Chrome 90+
- Requires JavaScript enabled
- Responsive: 320px – 2560px viewports

## Deployment

### Vercel (Primary - Recommended)

1. **Import repo** at [vercel.com](https://vercel.com)
2. **Set environment variables:**
   - `REFRESH_WEBHOOK_URL` (from Grok Bot routine)
   - `REFRESH_WEBHOOK_AUTH` (full Bearer token)
   - `ALLOWED_ORIGIN` (optional, for custom domains)
3. **Deploy** - Vercel auto-detects static site + serverless functions
4. **Access** - `https://investment-brief.vercel.app/` or custom domain

Pushing to `main` triggers automatic redeployment (~30s).

### GitHub Pages (Legacy - Optional)

1. Enable Pages: repo Settings → Pages → Source: `main` branch, root `/`
2. **Note:** Requires `<base href="/investment-brief/">` in `index.html` if using project site
3. Access: `https://marcussyl.github.io/investment-brief/`
4. **Limitation:** Cannot use `/api/refresh` proxy (GitHub Pages doesn't support serverless functions)

For full functionality (Update button), use Vercel deployment.

## License

Personal project for educational purposes. Not financial advice.

---

**Maintained by Marcus** • [GitHub](https://github.com/Marcussyl/investment-brief) • [Live Site](https://investment-brief.vercel.app/)