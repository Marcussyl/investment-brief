# Vercel Deployment Checklist 🚀

Code is now ready for Vercel deployment. Follow these steps to complete the migration.

## Prerequisites

- Vercel account (free Hobby plan works)
- GitHub account with access to `Marcussyl/investment-brief`
- Webhook credentials from Grok Bot routine "On-demand site refresh"

## Deployment Steps

### 1. Import Repository to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select `Marcussyl/investment-brief`
4. **Framework Preset:** None (auto-detect)
5. **Root Directory:** `./` (default)
6. **Build Command:** Leave empty (static site)
7. **Output Directory:** Leave empty (root)
8. Click **"Deploy"**

### 2. Set Environment Variables

After initial deployment, go to **Project Settings → Environment Variables** and add:

| Variable | Value | Example |
|----------|-------|---------|
| `REFRESH_WEBHOOK_URL` | Full webhook URL from Grok Bot | `https://api2.cursor.sh/webhooks/xxx-yyy-zzz` |
| `REFRESH_WEBHOOK_AUTH` | Full Authorization header value | `Bearer abc123...` or `Key xyz789...` |
| `ALLOWED_ORIGIN` | Custom domain (optional) | `https://brief.example.com` |

**Scope:** Production + Preview (optional)

**Where to find webhook credentials:**
1. Open Grok Bot dashboard
2. Go to routine **"On-demand site refresh"**
3. Click routine → View webhook panel
4. Copy **Webhook URL** (full `https://...` value)
5. Copy **Authorization** (full header value including `Bearer` or `Key` prefix)

### 3. Trigger Redeploy

After setting environment variables:
1. Go to **Deployments** tab
2. Click **"Redeploy"** on the latest deployment (or push a new commit)
3. Environment variables will be active on next deploy

### 4. Verify Deployment

**Test static site:**
```bash
curl -I https://investment-brief.vercel.app/
# Should return 200 OK with HTML
```

**Test API endpoint:**
```bash
curl -X POST https://investment-brief.vercel.app/api/refresh
# Should return webhook result (200 OK if webhook succeeds, or error with status)
```

**Test on site:**
1. Visit `https://investment-brief.vercel.app/`
2. Click「更新」button in header
3. Should see「已觸發遠端同步」→ wait ~22s →「已同步」
4. If successful, Grok routine should show new `lastRunAt` timestamp

### 5. Optional: Custom Domain

If you want to use a custom domain (e.g., `brief.marcussyl.com`):

1. **Add domain in Vercel:**
   - Project Settings → Domains → Add domain
   - Follow DNS setup instructions (CNAME or A record)

2. **Update environment variables:**
   - Add `ALLOWED_ORIGIN=https://brief.marcussyl.com`
   - Redeploy

3. **Verify:**
   - Visit custom domain
   - Test Update button

### 6. Update GitHub Pages (Optional)

If you want to keep GitHub Pages as a fallback:

1. Restore base path in `index.html`:
   ```html
   <base href="/investment-brief/">
   ```
2. Push to `main`
3. GitHub Pages will use `/investment-brief/` path
4. **Note:** Update button won't work on GitHub Pages (no API support)

**Recommended:** Disable GitHub Pages and use Vercel exclusively for full functionality.

## Troubleshooting

### Update button shows「Webhook 失敗」

**Check:**
1. Environment variables are set correctly in Vercel
2. `REFRESH_WEBHOOK_URL` is the full URL (starts with `https://`)
3. `REFRESH_WEBHOOK_AUTH` includes the prefix (`Bearer ` or `Key `)
4. Webhook endpoint is accessible (not expired/revoked)

**Test webhook directly:**
```bash
curl -X POST https://investment-brief.vercel.app/api/refresh -v
# Check response status and headers
```

### CORS errors in browser console

**Check:**
1. You're accessing site via Vercel domain (e.g., `*.vercel.app`)
2. If using custom domain, `ALLOWED_ORIGIN` is set correctly
3. Browser is making same-origin request to `/api/refresh` (not cross-origin)

### API endpoint returns 500

**Check:**
1. Environment variables `REFRESH_WEBHOOK_URL` and `REFRESH_WEBHOOK_AUTH` are set
2. Redeploy after adding/updating environment variables
3. Check Vercel function logs: Project → Deployments → View Function Logs

## Post-Deployment

### Morning Sync Workflow

The morning job workflow remains the same:

1. Update JSON files (`data/briefs/*.json`, `data/watchlist.json`, etc.)
2. Push to `main`:
   ```bash
   git add data/
   git commit -m "Update brief 2026-09-02"
   git push origin main
   ```
3. Vercel auto-deploys within ~30 seconds
4. Live site refreshes automatically

### Manual Update Button

Users can click「更新」to trigger:
- Webhook POST to Grok Bot routine
- Waits ~22s for rebuild
- Reloads JSON data from Vercel deployment
- Shows「已同步」on success

No user credentials needed (proxy holds secrets server-side).

## Final Checklist

- [ ] Repo imported to Vercel
- [ ] Environment variables set (`REFRESH_WEBHOOK_URL`, `REFRESH_WEBHOOK_AUTH`)
- [ ] Initial deployment successful
- [ ] Static site loads at `https://investment-brief.vercel.app/`
- [ ] API endpoint `/api/refresh` responds (test with curl)
- [ ] Update button works (triggers webhook, reloads data)
- [ ] Custom domain configured (optional)
- [ ] GitHub Pages disabled or kept as legacy fallback (optional)

## Support

If issues persist:
1. Check [Vercel deployment logs](https://vercel.com/dashboard)
2. Check browser console for errors
3. Check Grok Bot routine logs for webhook calls
4. Verify environment variables are set correctly

---

**Current Status:** Code pushed to `main` (commit fc5c300). Ready for Vercel deployment.
