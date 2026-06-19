# Train Board

A real-time train departure dashboard designed to run full-screen on a wall-mounted iPad. Displays upcoming departures for two stations in the Paris (Ile-de-France) region:

- **Line L** at Courbevoie
- **Tramway T2** at Les Fauvelles

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

## Refresh schedule

The dashboard automatically adjusts its refresh rate to stay under the IDFM free tier limit (1,000 API calls/day):

| Window | Interval | ~Calls/day |
|---|---|---|
| Mon-Fri 08:15-09:45 (commute) | 30 seconds | 360 |
| Mon-Fri 05:00-01:00 (rest) | 4 minutes | 420 |
| Sat-Sun 05:00-01:00 | 3 minutes | 800 |
| 01:00-05:00 (no trains) | Off | 0 |

## Security

The worker is protected by three layers:

1. **Bearer token** — requests without the correct `Authorization` header get 401
2. **Origin check** — only requests from the GitHub Pages origin are accepted
3. **Allowlists** — only the two configured stops and two line refs can be queried

The auth token is not in the source code. It is passed via URL hash on first visit (`#token=...`) and persisted to `localStorage`. The hash fragment is never sent to GitHub servers.

Secrets stored in Cloudflare:

| Secret | Purpose |
|---|---|
| `IDFM_API_KEY` | IDFM PRIM API authentication |
| `AUTH_TOKEN` | Bearer token for worker requests |
| `ALLOWED_ORIGIN` | GitHub Pages origin for CORS |

## IDFM stop and line references

| Station | Type | Reference |
|---|---|---|
| Les Fauvelles (T2) | StopPoint | `STIF:StopPoint:Q:43729:` |
| Courbevoie (L) | StopArea | `STIF:StopArea:SP:43118:` |
| Tramway T2 | Line | `STIF:Line::C01390:` |
| Transilien L | Line | `STIF:Line::C01740:` |

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
