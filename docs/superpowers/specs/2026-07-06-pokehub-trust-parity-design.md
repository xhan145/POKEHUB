# POKEHUB Trust & Parity Engine — Design Spec

Date: 2026-07-06
Status: Approved direction (lawful, zero-key, over existing data). Proceeding to build.

## Goal

Give every card/version a **trust rating** derived from how well our independent data sources agree, how fresh the data is, and how many sources cover it. Surface it in Card Lab and in our own `/api/v1`. Reuse the existing scoring engine. No scraping; no new API keys. Structured so eBay/PriceCharting/PSA sources raise coverage automatically when their keys arrive.

## Why this is possible over existing data

53,970 price snapshots across 19,693 cards, all currently labeled `source='pokemon_tcg_api'` but distinguishable by `confidence_score`: **72 = TCGplayer**, **68 = Cardmarket** (assigned by `src/workers/ingest-pokemon-tcg.ts`). So we already have **two independent marketplaces per card** — a genuine cross-source parity signal. Re-running the (INSERT-based) worker duplicated snapshots, so trust logic must dedupe to the **latest snapshot per (card, source)**.

## Decisions

| Decision | Choice |
|---|---|
| Computation | Read-time, per request, cached at CDN. No precompute table (avoids staleness at our scale — a page is 24 cards). |
| Source labeling | Extend `DataSource` union with `"tcgplayer"` and `"cardmarket"`; migration relabels existing snapshots by `confidence_score`; worker labels future snapshots correctly. |
| Duplicate snapshots | Handled at read time (latest per source). No destructive delete on the shared DB this pass. |
| Reused scoring | `scoreSourceFreshness`, `scoreSpreadRisk`, `scoreDataConfidence` from `src/workers/score-market.ts` — all already pure and clamped. |

## The trust engine (`src/lib/api-v1/trust-engine.ts`, pure, unit-tested)

```ts
export type TrustSnapshotInput = { source: string; market: number | null; observedAt: string };
export type TrustSource = { source: string; market: number; observedAt: string };
export type TrustTier = "VERIFIED" | "SOLID" | "SINGLE_SOURCE" | "STALE" | "NONE";
export type TrustResult = {
  score: number;              // 0-100
  tier: TrustTier;
  parity: number | null;      // 0-100 cross-source agreement; null when <2 sources
  freshness: number;          // 0-100
  coverage: number;           // count of distinct sources with a usable price
  sources: TrustSource[];     // latest per source, sorted by source name
  newestObservedAt: string | null;
};
export function computeTrust(snapshots: TrustSnapshotInput[], nowMs: number): TrustResult;
```

Algorithm (deterministic; `nowMs` injected for testability):
1. Keep snapshots with finite `market > 0`.
2. Group by `source`; keep the one with the max `observedAt` per source → `latest`.
3. `coverage = latest.length`. If 0 → `{ score:0, tier:"NONE", parity:null, freshness:0, coverage:0, sources:[], newestObservedAt:null }`.
4. `newestObservedAt` = max observedAt. `ageHours = (nowMs - Date.parse(newest)) / 3_600_000`. `freshness = scoreSourceFreshness(ageHours)`.
5. `markets = latest.map(m => m.market)`. If `coverage >= 2`: `parity = scoreSpreadRisk({ low: min(markets), high: max(markets), mid: average(markets) })`; else `parity = null`.
6. `score = scoreDataConfidence({ sourceFreshness: freshness, sourceQuality: coverage >= 2 ? 85 : 60, sampleSize: clamp(coverage * 40, 0, 100), spreadSanity: parity ?? 55 })`.
7. Tier (first match wins): `coverage === 0` → NONE; `ageHours > 720` (30d) → STALE; `coverage === 1` → SINGLE_SOURCE; `parity >= 70 && freshness >= 60` → VERIFIED; else SOLID.
8. `sources` sorted by source name ascending.

Helpers `average`/`median`/`clamp` are local. Never throws (bad dates → treated as very old).

## Data source relabel (migration `pokehub_snapshot_source_labels`)

```sql
update public.market_snapshots
set source = case when confidence_score = 72 then 'tcgplayer'
                  when confidence_score = 68 then 'cardmarket'
                  else source end
where project_tag = 'POKE' and source = 'pokemon_tcg_api';
```
Idempotent (re-running matches nothing once relabeled). Worker change: `src/workers/ingest-pokemon-tcg.ts` sets `source: "tcgplayer"` / `"cardmarket"` on the two snapshot rows instead of `"pokemon_tcg_api"`. `DataSource` union in `src/types/pokehub.ts` gains `"tcgplayer" | "cardmarket"`.

## Repo (`src/lib/api-v1/cards-repo.ts`, extend)

```ts
export async function getTrustForCards(cardIds: string[]): Promise<RepoResult<Record<string, TrustResult>>>;
// ONE query: poke_market_snapshots .eq("item_kind","card").in("item_ref", cardIds)
// select source, market, observed_at; group in JS by item_ref; computeTrust(rows, Date.now()) per card.
export async function getTrustForCard(cardId: string): Promise<RepoResult<TrustResult>>; // single-id convenience
```

## API surface

- **Card objects** (`toCardObject` / `searchCardObjects` / `cards/[id]`): `pokehub` gains `trust: TrustResult`. The cards-list route already batch-fetches snapshots — reuse that batch to compute trust (no extra round trips beyond the existing snapshot query, which now also selects `source`).
- **New `GET /api/v1/trust/{cardId}`** (`src/app/api/v1/trust/[cardId]/route.ts`, `runtime="nodejs"`): 404 if the card id doesn't exist; else `singleResponse({ cardId, ...TrustResult }, CACHE_OK)`. Repo error → 503.
- README: document `pokehub.trust` and `/api/v1/trust/{cardId}`, and what each tier means.

## Card Lab surface

- `LiveCard` (`src/lib/api-v1/card-mapper.ts`) gains `trust: TrustResult | null` parsed from `obj.pokehub.trust`.
- `CardValueLab`: a **Trust badge** on each `FloatingCard`/`CardFlip` (tier → color + label: VERIFIED=emerald, SOLID=sky, SINGLE_SOURCE=amber, STALE=slate, NONE=zinc). The flip back / detail shows the **parity breakdown** — each source's market price + observedAt + the parity/freshness/coverage numbers. When `trust` is null (mock fallback), show nothing (no fake badge).
- Existing derived-stats price rule unchanged; trust is additive.

## Error handling

Engine never throws. Repo returns `{ ok:false, error }` on DB failure → routes 503; Card Lab renders cards without badges if the trust fetch fails (never blocks the catalog). Unknown card id → 404.

## Testing

`trust-engine.test.ts` (node:test): two agreeing sources fresh → VERIFIED + parity high; two disagreeing → SOLID + low parity; one source → SINGLE_SOURCE + parity null; newest > 30d → STALE; empty → NONE; duplicate snapshots per source → only latest counts; determinism (same input+nowMs → same output). `card-mapper.test.ts`: parses `pokehub.trust`, null when absent. Extend `package.json` test list.

## Out of scope

Precompute/caching table; deleting duplicate snapshot rows; live eBay/PriceCharting/PSA (they raise coverage automatically once keyed); trust history over time.

## Acceptance criteria

- `npm run typecheck`, `npm test` (incl. trust + mapper tests), `npm run build` green.
- Migration applied; `select distinct source from poke_market_snapshots` shows `tcgplayer`, `cardmarket`.
- Live `GET /api/v1/trust/<a real card id>` returns tier + per-source breakdown; `/api/v1/cards/{id}` card object carries `pokehub.trust`.
- Card Lab shows trust badges on the live site.
- Committed, pushed, deployed, verified.
