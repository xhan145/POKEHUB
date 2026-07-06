# Codex Prompt: Build POKEHUB MVP

You are working in the `POKEHUB` repo.

## Mission

Build a pixelated game-aesthetic Pokémon TCG market intelligence dashboard that standardizes sealed MSRP products, individual card metadata, market snapshots, grading variables, liquidity, and value signal scoring.

## Product direction

POKEHUB should feel like a Game Boy Advance market terminal: pixel borders, neon rarity chips, CRT scanlines, animated panels, compact dense tables, and playful but serious analytics.

It should help collectors answer:
- What is my card or sealed product worth?
- Is a sealed product above or below MSRP?
- Is a card price supported by real sold velocity?
- Is the market signal fresh, liquid, and trustworthy?
- Which items deserve watch, buy, grade, sell, or avoid status?

## Shared database requirement

POKEHUB must share a Supabase/Postgres database with other projects.

All POKEHUB-owned rows must use:

```txt
project_tag = POKE
```

Use these env vars:

```env
NEXT_PUBLIC_POKEHUB_PROJECT_TAG=POKE
POKEHUB_PROJECT_TAG=POKE
```

Rules:
- Every insert into shared tables must include `project_tag: "POKE"` or use the `withProjectTag()` helper.
- Every read from shared tables must filter by `.eq("project_tag", "POKE")`, unless reading from the `poke_*` helper views.
- Do not add global uniqueness constraints that ignore `project_tag`.
- Any uniqueness should be composite, such as `project_tag + name` or `project_tag + pokemon_tcg_id`.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client/browser code.

## Initial data

Use `src/data/msrp-seed.json` as the first sealed product seed list. Keep this list editable by the user.

## Data source design

Implement source adapters as modular services:
- Pokemon TCG API adapter for cards, sets, images, rarities, legalities, embedded TCGplayer/Cardmarket fields.
- PriceCharting adapter for current values in raw/graded conditions when token is available.
- eBay Browse adapter for active listing supply, listing price ranges, and basic marketplace metadata.
- Manual CSV importer for MSRP, collection inventory, population reports, and local comp notes.

Do not hard-code secrets. Use `.env.local`.

## Required screens

1. Home / Market Arcade
   - tracked products count
   - total MSRP basis
   - estimated market value placeholder
   - above MSRP delta placeholder
   - source freshness widget

2. Sealed Product Dex
   - product table
   - MSRP
   - current market estimate
   - above MSRP %
   - active listings
   - sold comps
   - velocity
   - signal badge

3. Card Value Lab
   - searchable card table
   - card image
   - set/name/number/rarity
   - raw value
   - graded bands
   - liquidity score
   - confidence score
   - signal score

4. Portfolio
   - owned quantity
   - acquisition cost
   - current estimate
   - unrealized gain/loss
   - grading candidate flag
   - sell/hold/watch status

5. Signal Radar
   - opportunities
   - risky spikes
   - low confidence data
   - stale source alerts
   - sealed above-MSRP movers
   - grade arbitrage candidates

## Database

Use the SQL in `supabase/schema.sql` as the baseline. Add migrations only if needed.

The schema must remain shared-database safe:
- all owned tables have `project_tag text not null default 'POKE'`
- indexes include `project_tag`
- POKEHUB-only views start with `poke_`

## Engineering requirements

- TypeScript strict mode.
- Clean reusable components.
- Source adapters must have narrow interfaces.
- Append-only market snapshots.
- Never overwrite historical price observations.
- Include loading/empty/error states.
- Include disclaimers that collectible markets are volatile and POKEHUB is not financial advice.
- Make UI mobile-friendly.

## Pixel aesthetic requirements

- 8-bit/pixel card panels.
- CRT scanlines overlay.
- Rarity chips.
- Neon emerald/fuchsia/yellow palette.
- Dense but readable tables.
- Button hover states with pixel-like offsets.
- No generic SaaS blandness. This should look like a collector opened a secret terminal in Celadon City.

## Acceptance Criteria

- `npm install`, `npm run typecheck`, and `npm run build` pass.
- Home page renders without external API keys.
- MSRP seed products appear in the Sealed Product Dex.
- Value scoring utility is unit-testable and documented.
- Supabase schema supports cards, sealed products, market snapshots, and value scores.
- Supabase schema supports shared database mode with `project_tag = 'POKE'`.
- All future Supabase queries filter by `project_tag` or use `poke_*` views.
- API keys are read only from environment variables.
- Dashboard has empty/error/loading states for future adapters.
- Pixel aesthetic is visible on desktop and mobile.
- README includes setup, shared database mode, data model, source adapters, scoring model, and disclaimer.
- Commit all changes with a clear message.
