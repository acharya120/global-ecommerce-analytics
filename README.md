# Global E-commerce Aggregator & Review Analytics Engine

Search for smartphones, group the same phone across marketplaces, and rank products by total review volume — with automated pros / cons / verdict for each. Built for a **₹0 initial budget**: Next.js (App Router) + Tailwind, deployed with GitHub + Vercel Hobby.

* **Demo Mode (default):** works immediately after deployment. No keys, no card.
* **Live Mode (optional, off by default):** only authorised APIs / partner feeds. Currently implemented: **Best Buy Products API** (free developer key). Every other marketplace shows an honest *Unavailable* status with the reason.

> **Demo data is synthetic.** Prices, ratings, review counts and review texts in `data/demoProducts.js` are invented. The UI labels them **DEMO DATA** everywhere.

---

## 1. Deploy for free (beginner steps)

1. **Download and extract** `global-ecommerce-analytics.zip`.
2. **Create a GitHub repository** — github.com → *New repository* → name it `global-ecommerce-analytics` → *Create* (leave "Add README" unticked).
3. **Upload the files** — on the empty repo page click *uploading an existing file*, drag in **everything inside the extracted folder** (the folder's *contents*, so `package.json` is at the top level), then *Commit changes*.
   *(Tip: the browser uploader skips hidden files; `.gitignore` and `.env.example` are optional for deployment.)*
4. **Connect to Vercel** — vercel.com → sign up with GitHub (Hobby plan) → *Add New… → Project* → import your repo.
5. **Deploy** — leave the defaults (Framework: Next.js; no environment variables needed) → *Deploy*.
6. **Open** the `*.vercel.app` URL. Search "iPhone 17 Pro Max" in Demo Mode.

Local run (optional): `npm install` → `npm run dev` → http://localhost:3000. Tests: `npm test`. Production build: `npm run build`. Lint: `npm run lint`.

Requires Node.js 20+.

## 2. Demo Mode vs Live Mode

| | Demo Mode | Live Mode |
|---|---|---|
| Keys needed | none | depends on provider |
| Enabled | always | only if `LIVE_MODE_ENABLED=true` on the server |
| Data | 31 synthetic listings, 8 marketplaces, mixed review-count formats | real data from authorised sources only |
| Cost | ₹0 | ₹0 with free keys (Best Buy); paid providers stay off |
| Reviews text for insights | synthetic samples | only if the source supplies it, otherwise "not enough review text" |

Live Mode never fabricates data: a marketplace without an accessible, authorised source returns *Unavailable*. The app does **not** bypass CAPTCHAs or anti-bot protections and does no scraping inside serverless functions.

## 3. Architecture

```
Browser (app/page.js, components/)
   │  GET /api/search?q=…&country=…&markets=…&top=…&sort=…&mode=…
   ▼
app/api/search/route.js     validate → rate-limit → cache lookup → runSearch → cache store
   ▼
services/marketplaceService.js
   Promise.allSettled( one task per marketplace, each wrapped in a timeout )
   → normalizeListing → dedupe → groupListings → filters → rank by reviews → Top N → display sort → insights
   ├─ Demo: data/demoProducts.js            Live: services/adapters/*.js (one module per marketplace)
   ├─ lib/normalization.js  "1.2K", "2,34,567", "2.3 lakh", "250+" → integers; names → canonical key
   ├─ lib/aggregation.js    duplicate detection + review-population aggregation
   ├─ lib/sorting.js        strict descending review ranking, nulls separate, filters, sort modes
   └─ services/reviewAnalyticsService.js   rule-based themes (free) + optional OpenAI (off)
lib/cache.js + lib/redis.js   in-memory cache, optional Upstash Redis via REST (no SDK)
lib/config.js, usage.js, rateLimit.js   cost-control settings, API usage log, per-IP limits
app/api/analytics (POST reviews[] → insights), app/api/health (non-secret settings + usage)
```

**Review-count rules.** Only *product review* counts are used (seller ratings / rating counts are ignored). Several listings or sellers inside one marketplace share a review population, so the **maximum** is used, not the sum. Different marketplaces are independent populations and are summed. A listing can set `reviewPopulationId` when two sources are known to share reviews. Products with no valid count are never treated as 0; they appear in a separate "Missing review counts" list.

**Ranking.** Filters → rank by total reviews (descending, computed on every request) → keep Top 5/10 → apply the chosen display sort within those. The rank badge shows the position in the current order.

**Currency.** The country selector (India / United States) keeps each search in one currency, so price sorting is never mixed across currencies.

## 4. Environment variables

All optional — see `.env.example`. Never commit real keys; set them in Vercel → *Project → Settings → Environment Variables*.

| Variable | Belongs to | Cost |
|---|---|---|
| `LIVE_MODE_ENABLED`, `PAID_PROVIDERS_ENABLED`, `AI_ENABLED` | this app's cost switches (all `false`) | – |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis cache | free tier exists |
| `BESTBUY_API_KEY` | Best Buy Products API (Live Mode) | free developer key |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | optional AI summaries | **paid, per use** |
| `SCRAPER_API_KEY`, `SCRAPINGBEE_API_KEY`, `BRIGHTDATA_API_KEY` | optional scraping providers | **paid** |
| `CACHE_TTL_SECONDS`, `REQUEST_TIMEOUT_MS`, `RATE_LIMIT_PER_MINUTE`, `MAX_API_CALLS_PER_DAY`, `AI_MAX_CALLS_PER_DAY` | limits | – |

Cost controls: paid providers and OpenAI are refused unless both the switch **and** a key are set; calls are counted per day and capped; there are no automatic retries of paid calls; OpenAI results are cached. The UI asks for confirmation before switching to Live Mode. Usage counters and rate limits are in-memory per serverless instance (they reset on cold starts) — set spending caps with the provider as well.

## 5. Optional paid services (never required)

OpenAI API · ScraperAPI · ScrapingBee · Bright Data · paid Upstash tiers · Vercel Pro. Free-tier limits of Vercel Hobby, Upstash and Best Buy can change — check their current pricing pages instead of assuming unlimited free use. Hobby plans are for non-commercial use; read Vercel's terms before monetising.

## 6. Adding a marketplace

Create `services/adapters/<name>.js` exporting `{ id, name, async search({ query, tokens, config, fetchImpl, signal }) }` returning raw records `{ title, price, originalPrice, currency, rating, reviewCount, url, image, reviews? }`, register it in `services/marketplaceService.js` and `lib/marketplaces.js`. Throw `AppError(503, 'UNAVAILABLE', reason)` when there is no authorised source. Use only official APIs or licensed data feeds.

## 7. Known limitations

* The Best Buy adapter follows the public API documentation but is untested against the live service in the build environment.
* The rule-based analytics is keyword matching (themes, simple negation); it is labelled as automated insight, not AI.
* In-memory cache, rate limit and usage counters are per instance unless Redis is configured (only the cache uses Redis).
