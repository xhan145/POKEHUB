# POKEHUB

POKEHUB is a Pokemon TCG market intelligence dashboard for sealed MSRP, card identity, raw and graded value signals, liquidity, sales velocity, and opportunity/risk scoring.

The UI is styled like a retro collector terminal: pixel panels, CRT scanlines, rarity chips, Pokemon card imagery, dense tables, and the UUPM label for the Unified Underground Price Monitor.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

The homepage renders from `src/data/msrp-seed.json` and local mock card/portfolio data without external API keys.

## Environment

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_POKEHUB_PROJECT_TAG=POKE
POKEHUB_PROJECT_TAG=POKE

POKEMON_TCG_API_KEY=
PRICECHARTING_TOKEN=
EBAY_CLIENT_ID=
EBAY_CLIENT_SECRET=
```

Never commit `.env.local`. The browser client uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Workers may use `SUPABASE_SERVICE_ROLE_KEY`, but that key must never appear in client code.

## Shared database mode

POKEHUB is designed to share Supabase/Postgres tables with other projects. Every POKEHUB-owned row uses:

```txt
project_tag = POKE
```

All shared-table reads must filter by `.eq("project_tag", "POKE")` unless reading from a `poke_*` view. All writes use `project_tag = POKE`. Unique indexes are scoped by project tag, such as `project_tag + name` and `project_tag + pokemon_tcg_id`.

Run `supabase/schema.sql` in the Supabase SQL editor. The schema is safe to rerun and includes explicit grants for newer Supabase projects where public tables are not automatically exposed through the Data API.

## Data sources

POKEHUB uses an API-first, permission-aware ingestion strategy:

- Pokemon TCG API: canonical card IDs, set metadata, rarity, images, TCGplayer pricing, and Cardmarket pricing.
- MSRP seed: local sealed product catalog in `src/data/msrp-seed.json`.
- PriceCharting: optional future raw/graded values when a token is configured.
- eBay Browse API: optional future active listing supply when credentials are configured.
- Grading data: optional future PSA/CGC/BGS enrichment using approved APIs, exports, or manual imports.

Sites that explicitly prohibit automated access are not bulk scraped. Permission-only sources should become adapters only after written permission or approved API access exists.

## Ingestion

Apply the schema first, then configure Supabase credentials.

```bash
npm run ingest:msrp
npm run ingest:pokemon
```

Pokemon TCG ingest supports small safe batches:

```bash
npm run ingest:pokemon -- --pageSize=50 --maxPages=2
npm run ingest:pokemon -- --q=name:charizard --pageSize=25 --maxPages=1
```

If Supabase credentials are missing, workers log a clear message and avoid writing rows.

## Scoring model

`src/workers/score-market.ts` exports pure 0-100 scoring helpers:

- `cardValueSignalScore`
- `sealedProductSignalScore`
- `dataConfidenceScore`
- `clampScore`

Run:

```bash
npm run score
npm test
```

## Validation

```bash
npm install
npm run typecheck
npm run build
npm run score
```

## Disclaimer

POKEHUB is a collector analytics tool, not financial advice. Trading cards are volatile collectibles. Data can be incomplete, delayed, noisy, or distorted by fake sales, reprints, grading variance, hype cycles, and thin liquidity.
