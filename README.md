# Train Board

A real-time train departure dashboard designed to run full-screen on a wall-mounted iPad. 

Also shows live disruption alerts per line and current weather in Courbevoie.

## Architecture

```
iPad (Safari)                Cloudflare Worker              IDFM PRIM API
 index.html  ── fetch ──>   worker.js (proxy)  ── fetch ──>  stop-monitoring
                                                              general-message
             <── JSON ───                      <── JSON ───

 index.html  ── fetch ──>   Open-Meteo API (direct, no proxy needed)
```

Three components, all serverless and free:

| Component | Hosted on | Purpose |
|---|---|---|
| `index.html` | GitHub Pages | The dashboard UI — fetches data and renders departures |
| `worker.js` | Cloudflare Workers (free tier) | Proxies IDFM API calls, adds CORS headers and auth |
| IDFM PRIM API | iledefrance-mobilites.fr | Real-time train departures and disruption alerts |

### Why a proxy?

The IDFM API does not support CORS, so browsers block direct requests. The Cloudflare Worker adds `Access-Control-Allow-Origin` headers and keeps the IDFM API key server-side.

## Data sources

| Data | Source | Refresh rate |
|---|---|---|
| Train departures | IDFM PRIM Stop Monitoring API | 30s (commute), 3-4 min (off-peak) |
| Disruption alerts | IDFM PRIM General Message API | Every 5 min |
| Weather | Open-Meteo API (free, no key) | Every 10 min |

## Setup

### Prerequisites

- Node.js (for wrangler CLI)
- A free [Cloudflare](https://dash.cloudflare.com) account
- A free [IDFM PRIM](https://prim.iledefrance-mobilites.fr) API key (subscribe to "Prochains passages" and "Messages d'information")

### 1. Deploy the Cloudflare Worker

```bash
npm install -g wrangler
wrangler login
wrangler deploy

# Set secrets
wrangler secret put IDFM_API_KEY        # your IDFM API key
wrangler secret put AUTH_TOKEN           # generate with: openssl rand -hex 32
wrangler secret put ALLOWED_ORIGIN      # e.g. https://yourusername.github.io
```

### 2. Configure the HTML

In `index.html`, update:
- `PROXY_URL` — your Cloudflare Worker URL

### 3. Deploy to GitHub Pages

```bash
git init
git add index.html worker.js wrangler.toml README.md
git commit -m "Initial commit"
gh repo create train-board --private --source=. --push
# Enable GitHub Pages in repo Settings > Pages > Source: main
```

### 4. Open on iPad

Open in Safari (first visit must include the token):
```
https://yourusername.github.io/train-board/#token=YOUR_AUTH_TOKEN
```

Then:
1. Share > Add to Home Screen
2. Settings > Display & Brightness > Auto-Lock > Never
3. Settings > Accessibility > Guided Access > On
4. Keep plugged in

## Files

| File | Description |
|---|---|
| `index.html` | Dashboard UI — HTML, CSS, and JavaScript in a single file |
| `worker.js` | Cloudflare Worker — IDFM API proxy with auth and CORS |
| `wrangler.toml` | Cloudflare Worker deployment config |

## Cost

Everything is free:

- **Cloudflare Workers**: 100,000 requests/day free (we use <1,000)
- **IDFM PRIM API**: 1,000 requests/day free
- **Open-Meteo**: unlimited free tier
- **GitHub Pages**: free for public repos
- **iPad power**: ~22 kWh/year (~5.50 EUR/year)
