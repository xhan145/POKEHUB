# POKEHUB

## Overview

POKEHUB is a 3D pixel-card market intelligence dashboard for the Pokemon TCG: sealed MSRP, card identity, raw and graded value signals, liquidity, sales velocity, and opportunity/risk scoring.

It's styled as a GBA-era collector terminal opened in the back room of a card shop: pixel panels, CRT scanlines, neon rarity glow, CSS-3D floating/flipping cards, rarity chips, dense tables, and the UUPM label for the Unified Underground Price Monitor.

## Feature tour

- **Market Arcade** — headline stats (tracked products, MSRP basis, market estimate, snapshot count, source freshness, last sync) and a top-movers strip of floating cards.
- **Sealed Product Dex** — sortable sealed-product table with MSRP, estimated market, above-MSRP %, velocity, reprint risk, and signal badges; mobile card grid with flip-to-detail.
- **Card Value Lab** — searchable/filterable card table plus flip cards showing raw value, graded estimate, population, spread, liquidity, confidence, and signal score.
- **Signal Radar** — nine opportunity/risk categories (under-MSRP, above-MSRP movers, high-spread traps, stale sources, grade arbitrage, character hype, low-pop grails, fast velocity, suspicious outliers).
- **Portfolio** — owned quantity, acquisition cost, current estimate, signed unrealized gain/loss, and watch/hold/grade/sell/avoid status.
- **Control Center** — live source-adapter status: enabled/disabled, credentials present, rate limits, last run/insert/update counts.
- **Settings** — environment readiness booleans (Supabase, API keys, ingest token, shared-database mode) and a compact source-adapter summary.

## 3D card system

Built entirely from `transform`/`opacity` CSS (`src/styles/globals.css`) driven by small hooks and components, no 3D library:

- `src/lib/use-tilt.ts` (`useTilt`) — pointer-driven `--tilt-x`/`--tilt-y` custom properties for card tilt.
- `src/lib/use-count-up.ts` (`useCountUp`) — eased rAF count-up for stat values.
- `src/lib/use-reduced-motion.ts` (`usePrefersReducedMotion`) — reads `prefers-reduced-motion`.
- `src/components/three/CardStage.tsx`, `FloatingCard.tsx` (glow tiers `common`/`rare`/`ultra`/`secret`), `CardFlip.tsx`, `CardOrbitGrid.tsx` — perspective stage, idle-float glow cards, click/keyboard flip cards, and a staggered-entrance grid.

All motion respects `prefers-reduced-motion: reduce` — animations and transitions are disabled and cards render in their resting/flipped state instantly (see the reduced-motion block in `src/styles/globals.css`).

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

The homepage renders from `src/data/msrp-seed.json` and local mock card/portfolio data without external API keys or a database connection.

## Environment

`.env.local` is never committed. All values below are optional — POKEHUB boots and renders fully in seed mode with zero keys set.

| Variable | Used by | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | Supabase project URL (public). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | Supabase anonymous key (public, read-only via RLS). |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Enables writes/ingestion; never sent to the browser or returned by any API. |
| `NEXT_PUBLIC_POKEHUB_PROJECT_TAG` / `POKEHUB_PROJECT_TAG` | client / server | Project tag for shared-table isolation; defaults to `POKE`. |
| `POKEMON_TCG_API_KEY` | server | Optional; raises Pokemon TCG API rate limits. Works keyless. |
| `PRICECHARTING_TOKEN` | server | Optional; enables the PriceCharting adapter. |
| `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET` | server | Optional; enables the eBay Browse adapter (client-credentials grant). |
| `POKEHUB_INGEST_TOKEN` | server | Shared secret required in the `x-pokehub-ingest-token` header for `POST /api/ingest/*` routes. |

The browser client only ever reads `NEXT_PUBLIC_*` values. `SUPABASE_SERVICE_ROLE_KEY` and `POKEHUB_INGEST_TOKEN` must never appear in client code, and no API response ever renders a secret's value — only booleans indicating whether it is configured.

## Shared database mode

POKEHUB shares its Supabase/Postgres tables with other projects. Every POKEHUB-owned row carries:

```txt
project_tag = 'POKE'
```

- Reads against shared tables must filter `.eq("project_tag", "POKE")`, or read from a `poke_*` view (`poke_sealed_products`, `poke_cards`, `poke_market_snapshots`, `poke_value_scores`, `poke_portfolio_items`, `poke_ingestion_runs`), which pre-filter to `POKE` rows.
- Writes use `withProjectTag` (`src/lib/project-tag.ts`) so every insert/upsert carries `project_tag: 'POKE'`.
- Uniqueness is always composite with the project tag, never global: `project_tag + name` (sealed products, data sources) and `project_tag + pokemon_tcg_id` (cards). No unique index ignores `project_tag`.

## Supabase schema setup

Run `supabase/schema.sql` in the Supabase SQL editor (or apply it as a migration). It is idempotent and safe to rerun, and includes explicit grants for newer Supabase projects where public tables aren't automatically exposed through the Data API. It creates `data_sources`, `sealed_products`, `cards`, `market_snapshots`, `value_scores`, `portfolio_items`, and `ingestion_runs`, each with row-level security, a `poke_*` read view, and project-tag-scoped indexes/uniqueness.

## API routes

All routes run on the Node.js runtime and respond with an `ApiEnvelope` (`{ ok: true, data, run? }` or `{ ok: false, error }`). Ingest routes are gated by the `x-pokehub-ingest-token` header, which must match `POKEHUB_INGEST_TOKEN`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/sources/status` | none (read-only booleans) | Adapter status for every source, enriched with its latest ingestion run. |
| `POST` | `/api/ingest/msrp` | `x-pokehub-ingest-token` | Upserts sealed products from a JSON product list and/or manual CSV text. |
| `POST` | `/api/ingest/pokemon-tcg` | `x-pokehub-ingest-token` | Fetches from the Pokemon TCG API adapter and upserts cards + market snapshots. |
| `POST` | `/api/ingest/market-snapshot` | `x-pokehub-ingest-token` | Inserts a single market snapshot row for a card or sealed product. |

When `POKEHUB_INGEST_TOKEN` is unset, ingest routes respond `503` rather than silently accepting unauthenticated writes. Every ingest run is recorded in `ingestion_runs` (status, inserted/updated/skipped counts, timestamps) so Control Center and Settings can show real history instead of guesses.

## Source adapters

POKEHUB uses an API-first, permission-aware ingestion strategy. Live/API adapters (`src/lib/sources/`):

| Adapter | Kind | Credentials | Notes |
| --- | --- | --- | --- |
| Pokemon TCG API | api | optional (`POKEMON_TCG_API_KEY`) | Canonical card IDs, set metadata, rarity, images, embedded TCGplayer/Cardmarket pricing. Works keyless at shared public rate limits. |
| eBay Browse API | api | required (`EBAY_CLIENT_ID` + `EBAY_CLIENT_SECRET`) | Active listing counts and price range via the client-credentials OAuth grant. Disabled until both credentials are set. |
| PriceCharting API | api | required (`PRICECHARTING_TOKEN`) | Raw/graded value bands. Disabled until a token is set. |
| Manual CSV Import | csv | none | Local `name,price,kind,source` import flowing through `POST /api/ingest/msrp`. |

Grading/marketplace scrape stubs are registered but **stay `enabled: false`** and only exist to document the compliant path forward — POKEHUB does not scrape sites whose robots.txt or Terms of Service disallow it, and never employs CAPTCHA solving or other anti-bot evasion:

| Stub | Policy stance |
| --- | --- |
| TCGplayer Direct | ToS prohibits scraping; requires the TCGplayer developer program API key instead. |
| Cardmarket Direct | ToS prohibits scraping; requires a Cardmarket API app token/secret instead. |
| PSA Population | Do not scrape report pages; requires the PSA Public API (`PSA_API_TOKEN`). |
| CGC Population | No public API; requires written permission or a licensed data feed. |
| BGS Population | No public API; requires written permission or a licensed data feed from Beckett. |

A stub only ever graduates to a real adapter after written permission or approved API access exists — never by working around ToS or robots.txt.

## Scoring model

`src/workers/score-market.ts` exports pure functions clamped to 0–100:

- `cardValueSignalScore` (alias `scoreCardValueSignal`) — weighted blend of liquidity (22%), sold velocity (18%), rarity (15%), grade scarcity (12%), character demand (10%), set age (8%), condition confidence (7%), market spread (5%), source freshness (3%).
- `sealedProductSignalScore` (alias `scoreSealedProductSignal`) — above-MSRP (28%), sold velocity (20%), product type demand (15%), set popularity (12%), supply absorption (10%), reprint risk inverse (8%), source freshness (7%).
- `dataConfidenceScore` (alias `scoreDataConfidence`) — source freshness (35%), source quality (30%), sample size (20%), spread sanity (15%).
- `scoreSourceFreshness(hoursSinceObservation)` — 100 at 0h, linear decay to 0 at 168h (7 days).
- `scoreLiquidity({ activeListings, soldCount })` — blends capped active-listing and sold-count signals.
- `scoreSpreadRisk({ low, high, mid })` — 100 at a zero spread, decaying to 0 as the low/high spread widens; invalid input returns a neutral 50.
- `clampScore` — shared 0–100 clamp used by every function above.

`src/lib/derived-stats.ts` (`getDerivedSealedStats`, `getDerivedCardStats`) produces deterministic, string-hash-based placeholder stats (never `Math.random()`) for items without a live snapshot yet, always paired with an `EstimateTag` in the UI.

Run:

```bash
npm run score
npm test
```

## Security notes

- `SUPABASE_SERVICE_ROLE_KEY` is read only on the server and is never bundled into client code or returned by any route.
- No API response ever renders a secret's value — credential and token state is always surfaced as a boolean (`hasCredentials`, `ingestToken`, etc.).
- Every ingest route requires the `x-pokehub-ingest-token` header to match `POKEHUB_INGEST_TOKEN`; if the token isn't configured server-side, the route fails closed with `503` instead of accepting writes.
- Shared Supabase tables have row-level security enabled; anonymous/authenticated roles get `SELECT` scoped to `project_tag = 'POKE'`, and only the service role can write.

## Disclaimer

POKEHUB is a collector analytics tool, not financial advice. All card and sealed-product prices are estimates derived from heuristics, deterministic placeholder math, and embedded third-party API data — not verified appraisals. Trading cards are volatile collectibles: data can be incomplete, delayed, noisy, or distorted by fake sales, reprints, grading variance, hype cycles, and thin liquidity. Always verify before buying, selling, or grading.
