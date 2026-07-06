# POKEHUB /api/v1 — Own Card-Catalog API Design Spec

Date: 2026-07-06
Status: Approved (public keyless access + pokemontcg.io-compatible envelope confirmed by owner).

## Goal

Serve the complete Pokémon TCG catalog (20,359 cards + 38,630 price snapshots already ingested into our shared Supabase, `project_tag='POKE'`) from POKEHUB's own public REST API at `/api/v1`, so consumers — including POKEHUB itself — no longer depend on `api.pokemontcg.io` at runtime. Runtime dependency shrinks to a weekly background refresh.

## Decisions

| Decision | Choice |
|---|---|
| Access | Public, keyless. No rate-limit machinery this pass (CDN caching absorbs load); keys/metering are a later product decision. |
| Response format | pokemontcg.io-compatible: `{ data, page, pageSize, count, totalCount }` for lists, `{ data }` for single resources. Card objects served from stored `raw_json` (byte-faithful to the official API), augmented with our latest snapshot. |
| Hosting | Route handlers in the existing Next.js app (approach A). Reads use the anon Supabase client server-side (RLS-scoped). `export const runtime = "nodejs"`. |
| Caching | `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` on all GET responses (Vercel CDN). Health/index uses `s-maxage=300`. |
| Freshness | Weekly GitHub Actions cron runs `src/workers/ingest-pokemon-tcg.ts --pageSize=250 --maxPages=90 --delayMs=2000`. Repo secrets set via `gh secret set`. |
| Images | Continue hotlinking `images.pokemontcg.io` URLs stored in card data. Rehosting 20k Pokémon-IP images is explicitly out of scope. |

## Endpoints

All GET, all public, all returning `application/json`.

### `GET /api/v1/cards`
Query params:
- `q` — search string, subset of the official grammar (below). Absent = all cards.
- `page` — 1-based, default 1.
- `pageSize` — default 50, max 250 (clamped, not errored).
- `orderBy` — one of `name`, `-name`, `number`, `-number`, `set.name`, `-set.name`. Default: `set.name` then `number` (stable). Unknown values fall back to default.

Response `200`: `{ "data": CardObject[], "page": n, "pageSize": n, "count": <length of data>, "totalCount": <total matching> }`.

### `GET /api/v1/cards/{id}`
`{id}` = `pokemon_tcg_id` (e.g. `sv3pt5-199`). `200 { data: CardObject }` or `404 { error: "Card not found" }`.

### `GET /api/v1/sets`
From the `poke_sets` view. Response: `{ data: SetObject[], page, pageSize, count, totalCount }` (same pagination params; sets are ~173 so one page usually).
`SetObject = { id, name, total }` — `total` = card count in our catalog. (We did not ingest the official sets table; series/releaseDate are not available and are NOT faked.)

### `GET /api/v1/sets/{id}`
`200 { data: SetObject }` or `404 { error: "Set not found" }`.

### `GET /api/v1/prices/{cardId}` (POKEHUB extension)
Full snapshot history for a card, newest first, max 100 rows, in the standard list envelope:
`{ data: [{ source, observedAt, low, mid, high, market, directLow, confidenceScore }], page, pageSize, count, totalCount }`. `404` if the card id doesn't exist; `200` with empty `data` if the card exists but has no snapshots.

### `GET /api/v1`
Index + health: `{ data: { name: "POKEHUB API", version: "v1", endpoints: [...], cards: n, snapshots: n, lastIngest: iso|null } }`. Counts via head-count queries on `poke_cards`/`poke_market_snapshots`; `lastIngest` = newest `poke_ingestion_runs.started_at` (null if none readable).

## Card object shape

Served from `cards.raw_json` (the original pokemontcg.io object, stored at ingest). Augmentation: add `"pokehub": { "lastSnapshot": {...} | null }` with the newest market snapshot summary for the card. If `raw_json` is null for a row (should not happen; defensive), synthesize the object from columns (`id, name, set:{id,name}, number, rarity, artist, supertype, subtypes, images:{small,large}`).

## Search grammar (`q`)

Supported subset of the official Lucene-ish grammar, parsed by a pure function:
- Bare terms: `charizard` → name ILIKE %charizard% (multiple bare terms join into one phrase).
- Field filters: `name:`, `set.id:`, `set.name:`, `rarity:`, `supertype:`, `number:`, `artist:` — value is the token after `:`; quoted values allow spaces (`rarity:"Special Illustration Rare"`).
- Multiple clauses = AND. Field filter matching: `set.id`, `number` exact (case-insensitive); the rest ILIKE contains.
- Unsupported syntax (OR, ranges, wildcards, negation) is NOT errored: unrecognized `field:` tokens are ignored; the parse never throws. Documented in README.

Parser contract (pure, unit-tested):
```ts
// src/lib/api-v1/query.ts
export type CardQueryFilter =
  | { kind: "name-contains"; value: string }
  | { kind: "field"; column: "set_id" | "set_name" | "rarity" | "supertype" | "number" | "artist"; op: "eq" | "ilike"; value: string };
export function parseCardQuery(q: string): CardQueryFilter[];
export const cardsParamsSchema: z.ZodType<{ q?: string; page: number; pageSize: number; orderBy: string }>;
```

## Database changes (migration `pokehub_v1_api_views`)

```sql
create or replace view public.poke_sets
with (security_invoker = true) as
select set_id as id, max(set_name) as name, count(*)::int as total
from public.cards
where project_tag = 'POKE' and set_id is not null
group by set_id;
grant select on public.poke_sets to anon, authenticated;
```
Also appended to `supabase/schema.sql`.

## Components

- `src/lib/api-v1/query.ts` — parser + zod param schemas (pure; unit tests in `query.test.ts`).
- `src/lib/api-v1/respond.ts` — envelope + cache-header helpers: `listResponse(data, page, pageSize, totalCount)`, `singleResponse(data)`, `notFound(msg)`, all setting the Cache-Control policy.
- `src/lib/api-v1/cards-repo.ts` — Supabase read functions (anon client): `searchCards(filters, page, pageSize, orderBy)`, `getCardById(id)`, `listSets()`, `getSetById(id)`, `getSnapshots(cardId)`, `getHealthCounts()`. All read `poke_*` views only.
- Route handlers: `src/app/api/v1/route.ts`, `cards/route.ts`, `cards/[id]/route.ts`, `sets/route.ts`, `sets/[id]/route.ts`, `prices/[cardId]/route.ts`.
- `.github/workflows/refresh-catalog.yml` — weekly cron (Mon 09:00 UTC) + manual dispatch; runs the worker with `NEXT_PUBLIC_SUPABASE_URL` (vars) and `SUPABASE_SERVICE_ROLE_KEY` (secret), optional `POKEMON_TCG_API_KEY`.
- README: new "POKEHUB API" section — endpoints table, grammar subset, compat statement, fair-use note.

## Error handling

- Invalid params (non-numeric page etc.): zod-clamped/coerced, never 500; worst case defaults.
- Supabase unreachable/unconfigured: `503 { error: "catalog database unavailable" }` (no envelope lie).
- Unknown id: 404 with `{ error }`. All errors uncached (`Cache-Control: no-store`).

## Out of scope

API keys/metering/rate limiting; rehosting card images; official sets-table ingest (series/releaseDate); OR/range/negation query syntax; GraphQL.

## Prod wiring folded into this delivery (unfinished from deploy mission)

1. `vercel env add` (production): `SUPABASE_SERVICE_ROLE_KEY`, `POKEHUB_INGEST_TOKEN` — server-only, sourced from `.env.ingest.local` / scratchpad token file, values never in command args (use stdin piping from file).
2. Redeploy production.
3. Verify: homepage badge LIVE DB + real counts; `/api/sources/status` 200; ingest route 401 without token / 503-or-200 semantics with token; `/api/v1/cards?q=name:charizard&pageSize=3` returns real cards; `/api/v1/sets` lists ~173 sets; `/api/v1/prices/{id}` returns snapshots.

## Acceptance criteria

- `npm run typecheck`, `npm test` (incl. new parser tests), `npm run build` green.
- Live `https://pokehub-gold.vercel.app/api/v1/cards?q=name:charizard` returns compatible envelope with real data from OUR DB.
- All six endpoint routes live; responses carry the CDN cache header; errors carry no-store.
- Weekly refresh workflow exists with secrets configured and a successful manual `workflow_dispatch` run OR a documented reason it must wait.
- README documents the API. Committed, pushed, merged to main.
