# POKEHUB /api/v1 Own-API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Public, keyless, pokemontcg.io-compatible REST API at `/api/v1` serving the full 20,359-card catalog from our own Supabase, plus a weekly refresh cron — ending runtime dependency on external card APIs.

**Architecture:** Pure query-grammar parser + envelope helpers (Task 1) feed thin Next.js route handlers backed by a read-only repo over `poke_*` views (Task 2); docs + weekly GitHub Actions refresh (Task 3); DB view migration, prod wiring, and live verification run inline by the orchestrator (Task 4). Spec: `docs/superpowers/specs/2026-07-06-pokehub-v1-api-design.md`.

**Tech Stack:** Next.js 15 route handlers (nodejs runtime), `@supabase/supabase-js` anon client, Zod, `node --import tsx --test`. **Zero new dependencies.**

## Global Constraints

- Reads ONLY via `poke_*` views (RLS-scoped); anon client from `src/lib/supabase/client.ts` (`createBrowserSupabaseClient` — safe server-side); never the service client in these routes.
- No secrets required, read, or returned by any `/api/v1` route.
- List envelope exactly `{ data, page, pageSize, count, totalCount }`; single `{ data }`; errors `{ error: string }`.
- Success responses: `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` (index/health: `s-maxage=300`). Error responses: `Cache-Control: no-store`.
- `pageSize` clamped to [1, 250] (default 50); `page` clamped to ≥1 (default 1). Bad params never 500 — coerce/clamp/default.
- Card objects served from `raw_json` with `pokehub.lastSnapshot` augmentation; synthesize from columns only when `raw_json` is null.
- `export const runtime = "nodejs"` in every route file.
- File ownership is exclusive per task. No git commits by task implementers (orchestrator commits).
- Match code style: 2-space indent, double quotes.

---

## Task 1: Query parser, param schemas, envelope helpers

**Files:**
- Create: `src/lib/api-v1/query.ts`, `src/lib/api-v1/respond.ts`
- Test: `src/lib/api-v1/query.test.ts`
- Modify: `package.json` (append `src/lib/api-v1/query.test.ts` to the `test` script's file list)

**Interfaces — Produces (EXACT):**

```ts
// src/lib/api-v1/query.ts
import { z } from "zod";

export type CardQueryFilter =
  | { kind: "name-contains"; value: string }
  | { kind: "field"; column: "set_id" | "set_name" | "rarity" | "supertype" | "number" | "artist"; op: "eq" | "ilike"; value: string };

export function parseCardQuery(q: string): CardQueryFilter[];
// Tokenization: split on whitespace, but a value starting with `"` after `field:` consumes until the closing quote.
// field:value mapping — name: -> name-contains; set.id: -> {column:"set_id",op:"eq"}; number: -> {column:"number",op:"eq"};
// set.name:/rarity:/supertype:/artist: -> {column, op:"ilike"}. Unrecognized `foo:bar` tokens are dropped silently.
// Bare tokens accumulate into ONE name-contains filter joined by spaces. Empty/whitespace q -> [].
// Never throws.

export type CardsParams = { q?: string; page: number; pageSize: number; orderBy: OrderBy };
export type OrderBy = "name" | "-name" | "number" | "-number" | "set.name" | "-set.name" | "default";
export function parseCardsParams(searchParams: URLSearchParams): CardsParams;
// page: Number(...) -> floor -> clamp >=1, default 1 on NaN. pageSize: clamp [1,250], default 50 on NaN.
// orderBy: one of the OrderBy literals, else "default". q: trimmed, undefined if empty.

// src/lib/api-v1/respond.ts
export const CACHE_OK = "public, s-maxage=3600, stale-while-revalidate=86400";
export const CACHE_INDEX = "public, s-maxage=300, stale-while-revalidate=3600";
export function listResponse(data: unknown[], page: number, pageSize: number, totalCount: number, cache?: string): Response;
// JSON { data, page, pageSize, count: data.length, totalCount }, status 200, Cache-Control cache ?? CACHE_OK
export function singleResponse(data: unknown, cache?: string): Response;      // { data }, 200
export function errorResponse(status: number, error: string): Response;       // { error }, Cache-Control: no-store
```

- [ ] **Step 1: Write failing tests** in `src/lib/api-v1/query.test.ts` (node:test + node:assert, matching existing test style). Cases (exact expectations):

```ts
// parseCardQuery
assert.deepStrictEqual(parseCardQuery(""), []);
assert.deepStrictEqual(parseCardQuery("charizard ex"), [{ kind: "name-contains", value: "charizard ex" }]);
assert.deepStrictEqual(parseCardQuery("name:pikachu"), [{ kind: "name-contains", value: "pikachu" }]);
assert.deepStrictEqual(parseCardQuery("set.id:sv3pt5"), [{ kind: "field", column: "set_id", op: "eq", value: "sv3pt5" }]);
assert.deepStrictEqual(parseCardQuery('rarity:"Special Illustration Rare"'), [{ kind: "field", column: "rarity", op: "ilike", value: "Special Illustration Rare" }]);
assert.deepStrictEqual(parseCardQuery("number:199"), [{ kind: "field", column: "number", op: "eq", value: "199" }]);
// AND semantics + unknown field dropped + bare terms merged
assert.deepStrictEqual(parseCardQuery('mega set.name:chaos hp:200 rising'), [
  { kind: "name-contains", value: "mega rising" },
  { kind: "field", column: "set_name", op: "ilike", value: "chaos" }
]);
// parseCardsParams
const p = parseCardsParams(new URLSearchParams("page=0&pageSize=9999&orderBy=bogus&q= "));
assert.deepStrictEqual(p, { q: undefined, page: 1, pageSize: 250, orderBy: "default" });
const d = parseCardsParams(new URLSearchParams(""));
assert.deepStrictEqual(d, { q: undefined, page: 1, pageSize: 50, orderBy: "default" });
// respond helpers: listResponse(["a"],2,50,120) -> status 200, json { data:["a"], page:2, pageSize:50, count:1, totalCount:120 }, header Cache-Control === CACHE_OK
// errorResponse(404,"Card not found") -> status 404, json { error }, Cache-Control "no-store"
```

- [ ] **Step 2:** Run `node --import tsx --test src/lib/api-v1/query.test.ts` → expect MODULE_NOT_FOUND failures.
- [ ] **Step 3:** Implement `query.ts` + `respond.ts` per the contracts. Filter order in output: the merged name-contains first (if any), then field filters in appearance order.
- [ ] **Step 4:** Re-run tests → all pass. Append the test file to `package.json` test script.

## Task 2: Cards repo + six route handlers + schema view

**Files:**
- Create: `src/lib/api-v1/cards-repo.ts`, `src/app/api/v1/route.ts`, `src/app/api/v1/cards/route.ts`, `src/app/api/v1/cards/[id]/route.ts`, `src/app/api/v1/sets/route.ts`, `src/app/api/v1/sets/[id]/route.ts`, `src/app/api/v1/prices/[cardId]/route.ts`
- Modify: `supabase/schema.sql` (append poke_sets view block)

**Interfaces:**
- Consumes (Task 1, exact): `parseCardQuery`, `parseCardsParams`, `CardQueryFilter`, `CardsParams`, `listResponse`, `singleResponse`, `errorResponse`, `CACHE_OK`, `CACHE_INDEX`; `createBrowserSupabaseClient` from `src/lib/supabase/client.ts`.
- Produces (EXACT):

```ts
// src/lib/api-v1/cards-repo.ts — all functions return null/throw-free results; DB errors surface as { error: string }
export type RepoResult<T> = { ok: true; value: T } | { ok: false; error: string };
export function getAnonClient(): SupabaseClient | null;
export async function searchCards(params: CardsParams): Promise<RepoResult<{ rows: CardRow[]; totalCount: number }>>;
// SELECT on poke_cards with { count: "exact" }; filters: name-contains -> .ilike("name", `%${v}%`);
// field eq -> .ilike(column, value) for case-insensitive exact? NO — eq columns (set_id, number) use .ilike(column, value)
// with no wildcards (case-insensitive exact); ilike columns use .ilike(column, `%${v}%`).
// orderBy: name/-name -> order("name"); number/-number -> order("number"); set.name/-set.name -> order("set_name");
// default -> order("set_name").order("number"). Descending when prefixed "-".
// range((page-1)*pageSize, page*pageSize - 1).
export async function getCardById(id: string): Promise<RepoResult<CardRow | null>>;            // .eq("pokemon_tcg_id", id).maybeSingle()
export async function listSets(page: number, pageSize: number): Promise<RepoResult<{ rows: SetRow[]; totalCount: number }>>; // poke_sets, order("id")
export async function getSetById(id: string): Promise<RepoResult<SetRow | null>>;
export async function getSnapshotsForCard(cardId: string, limit?: number): Promise<RepoResult<SnapshotRow[]>>;
// poke_market_snapshots .eq("item_kind","card").eq("item_ref",cardId).order("observed_at",{ascending:false}).limit(limit ?? 100)
export async function getHealth(): Promise<RepoResult<{ cards: number; snapshots: number; lastIngest: string | null }>>;
export function toCardObject(row: CardRow, lastSnapshot: SnapshotRow | null): Record<string, unknown>;
// row.raw_json if non-null else synthesized { id, name, set:{id,name}, number, rarity, artist, supertype, subtypes, images:{small,large} };
// then spread { pokehub: { lastSnapshot: lastSnapshot ? { source, observedAt, low, mid, high, market, directLow, confidenceScore } : null } }
```

Route behaviors (each file: `export const runtime = "nodejs";`):
- `cards/route.ts` GET: parse params; `searchCards`; for the returned page rows, fetch each row's latest snapshot in ONE query (`poke_market_snapshots` .eq("item_kind","card").in("item_ref", ids).order("observed_at",{ascending:false})`, then keep first per item_ref in JS); map `toCardObject`; `listResponse`. Repo error → `errorResponse(503, "catalog database unavailable")`. Client null → same 503.
- `cards/[id]/route.ts` GET: `getCardById`; null → `errorResponse(404, "Card not found")`; else latest snapshot for that card + `singleResponse(toCardObject(...))`.
- `sets/route.ts` GET: `parseCardsParams` for page/pageSize only; `listSets`; `listResponse`.
- `sets/[id]/route.ts` GET: 404 `"Set not found"` when absent.
- `prices/[cardId]/route.ts` GET: `getCardById` first (404 if absent); `getSnapshotsForCard`; respond `listResponse(snapshots, 1, snapshots.length || 1, snapshots.length)` with data as the snapshot summaries `{ source, observedAt, low, mid, high, market, directLow, confidenceScore }`.
- `route.ts` (index) GET: `getHealth`; `singleResponse({ name: "POKEHUB API", version: "v1", endpoints: ["/api/v1/cards","/api/v1/cards/{id}","/api/v1/sets","/api/v1/sets/{id}","/api/v1/prices/{cardId}"], cards, snapshots, lastIngest }, CACHE_INDEX)`; repo error → 503.

- [ ] **Step 1:** Append to `supabase/schema.sql`:

```sql
create or replace view public.poke_sets
with (security_invoker = true) as
select set_id as id, max(set_name) as name, count(*)::int as total
from public.cards
where project_tag = 'POKE' and set_id is not null
group by set_id;
grant select on public.poke_sets to anon, authenticated;
```

- [ ] **Step 2:** Implement `cards-repo.ts`, then the six routes.
- [ ] **Step 3:** Verify: `npx tsc --noEmit` clean for your files; `npm run build` compiles all six routes (they appear in the route table as `ƒ`).

## Task 3: README API docs + weekly refresh workflow

**Files:**
- Modify: `README.md` (add "POKEHUB API (v1)" section after the existing API-routes section)
- Create: `.github/workflows/refresh-catalog.yml`

**Interfaces:** Consumes endpoint list + grammar subset from the spec (`docs/superpowers/specs/2026-07-06-pokehub-v1-api-design.md` — read it). No code interfaces produced.

- [ ] **Step 1:** README section: endpoint table (6 rows: path, params, description), the supported `q` grammar subset + explicit list of unsupported syntax (OR, ranges, wildcards, negation — ignored not errored), envelope example (real JSON block for `/api/v1/cards?q=name:charizard&pageSize=1`), compatibility statement ("same envelope and card object shape as pokemontcg.io; card objects come from the stored original API payloads"), caching note (CDN 1h), fair-use note (public + keyless; no guarantees), images note (image URLs remain hosted by pokemontcg.io).
- [ ] **Step 2:** `.github/workflows/refresh-catalog.yml`:

```yaml
name: Refresh card catalog
on:
  schedule:
    - cron: "0 9 * * 1"
  workflow_dispatch: {}
jobs:
  refresh:
    runs-on: ubuntu-latest
    timeout-minutes: 90
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npx tsx src/workers/ingest-pokemon-tcg.ts --pageSize=250 --maxPages=90 --delayMs=2000
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ vars.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          POKEMON_TCG_API_KEY: ${{ secrets.POKEMON_TCG_API_KEY }}
```

- [ ] **Step 3:** Verify YAML parses (`npx --yes yaml-lint` NOT available — instead `node -e "require('js-yaml')"` also unavailable; just visually verify indentation and rely on Actions validation; note this in report).

## Task 4 (orchestrator, inline): migration, prod wiring, live verification, delivery

- [ ] Apply migration `pokehub_v1_api_views` (the poke_sets block) via Supabase MCP; verify `select count(*) from poke_sets` ≈ 173.
- [ ] Gates: `npm run typecheck`, `npm test` (incl. query tests), `npm run build` — green.
- [ ] Local smoke: `next start` or dev; curl `/api/v1/cards?q=name:charizard&pageSize=3`, `/api/v1/sets`, `/api/v1/cards/sv3pt5-199`, `/api/v1/prices/sv3pt5-199`, `/api/v1` — correct envelopes + cache headers.
- [ ] Vercel prod env: `SUPABASE_SERVICE_ROLE_KEY` (from `.env.ingest.local`) + `POKEHUB_INGEST_TOKEN` (from scratchpad token file), values piped from files, never in argv.
- [ ] GitHub repo config: `gh variable set NEXT_PUBLIC_SUPABASE_URL`; `gh secret set SUPABASE_SERVICE_ROLE_KEY < file`.
- [ ] Commit, push main → auto-deploy; verify live: homepage LIVE DB badge + real counts; `/api/v1/cards?q=name:charizard&pageSize=3` real data; `/api/v1/sets` ~173; ingest route 401-without-token; `workflow_dispatch` the refresh workflow and confirm it starts.
- [ ] Update memory + ledger; final report.
