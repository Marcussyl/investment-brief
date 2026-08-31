# GitHub Pages Setup Guide 🚀

## Quick Start: Enable GitHub Pages

Your investment brief website is ready to deploy! Follow these steps to make it live at **https://marcussyl.github.io/investment-brief/**

### Step-by-Step Instructions

1. **Open Repository Settings**
   - Go to https://github.com/Marcussyl/investment-brief
   - Click **Settings** tab (top navigation)

2. **Navigate to Pages Section**
   - In left sidebar, click **Pages** (under "Code and automation")

3. **Configure Source**
   - Under **Build and deployment**
   - **Source**: Select `Deploy from a branch`
   - **Branch**: Select `main` and `/ (root)`
   - Click **Save**

4. **Wait for Deployment**
   - GitHub Pages will start building (usually 1-2 minutes)
   - Refresh the Pages settings page to see the live URL
   - A green banner will appear when deployment succeeds

5. **Visit Your Site**
   - Open https://marcussyl.github.io/investment-brief/
   - You should see the investment brief with charts!

### Troubleshooting

**If the site doesn't load after 5 minutes:**
- Check the Actions tab for deployment status
- Ensure `index.html` exists in the main branch root
- Try a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

**If you see a 404 error:**
- Verify the branch is set to `main` (not `master`)
- Verify the folder is set to `/ (root)` (not `/docs`)
- Wait a bit longer - first deployment can take up to 10 minutes

**If charts don't load:**
- Check browser console for errors (F12 → Console)
- Verify `data/watchlist.json` and `data/briefs-index.json` exist
- Ensure JSON files are valid (use JSONLint to check)

## Alternative: GitHub Actions (Optional)

If you prefer using GitHub Actions for deployment, you can create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Pages
        uses: actions/configure-pages@v4
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      
      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4
```

Then in Settings → Pages, change **Source** to `GitHub Actions`.

## Daily Publishing Workflow

Once Pages is enabled, new briefs auto-deploy when you push to `main`:

```bash
# 1. Create new brief
vim data/briefs/2026-09-01.json

# 2. Update index
vim data/briefs-index.json
# Add "2026-09-01.json" to the briefs array

# 3. Update watchlist (optional)
vim data/watchlist.json
# Refresh price data

# 4. Commit and push
git add data/
git commit -m "Add brief for 2026-09-01"
git push origin main

# 5. Wait 1-2 minutes for GitHub Pages to rebuild
```

The site updates automatically - no manual deployment needed!

## Custom Domain (Optional)

To use a custom domain like `investment-brief.marcussyl.com`:

1. In Pages settings, enter your custom domain under **Custom domain**
2. Add a `CNAME` record in your DNS settings pointing to `marcussyl.github.io`
3. Wait for DNS propagation (up to 48 hours)
4. Enable **Enforce HTTPS** once DNS is verified

---

**Need help?** Check the [GitHub Pages documentation](https://docs.github.com/en/pages) or open an issue in the repo.
