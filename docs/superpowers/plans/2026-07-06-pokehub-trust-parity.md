# POKEHUB Trust & Parity Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Per-card cross-source trust rating (parity + freshness + coverage) over existing snapshots, surfaced in `/api/v1` and Card Lab. Zero new keys, reuse the scoring engine.

**Architecture:** Pure `computeTrust` engine (Task 1) → data/API layer that labels sources, computes trust, and exposes it (Task 2) → Card Lab badge + mapper + docs (Task 3). Spec: `docs/superpowers/specs/2026-07-06-pokehub-trust-parity-design.md`.

**Tech Stack:** TypeScript, Next.js route handlers, supabase-js anon reads, Zod, `node --import tsx --test`. Zero new deps.

## Global Constraints

- Reuse `scoreSourceFreshness`, `scoreSpreadRisk`, `scoreDataConfidence` from `src/workers/score-market.ts` (do not reimplement scoring math).
- Trust computed at read time; dedupe to latest snapshot per (card, source); engine never throws.
- Reads via `poke_*` views / anon client only; no secrets in any route.
- Card objects: `pokehub.trust` additive; existing `pokehub.lastSnapshot` and price rules unchanged.
- Tiers exactly: `VERIFIED | SOLID | SINGLE_SOURCE | STALE | NONE`.
- File ownership exclusive per task; no git by implementers; 2-space, double quotes.

---

## Task 1: Trust engine (pure) + tests

**Files:** Create `src/lib/api-v1/trust-engine.ts`, `src/lib/api-v1/trust-engine.test.ts`; Modify `package.json` (append `src/lib/api-v1/trust-engine.test.ts` to the `test` script).

**Interfaces — Produces (EXACT):** the types + `computeTrust` signature from the spec's "trust engine" section (TrustSnapshotInput, TrustSource, TrustTier, TrustResult, `computeTrust(snapshots, nowMs)`).

- [ ] **Step 1: Failing tests** — cases (use injected `nowMs = Date.parse("2026-07-06T00:00:00Z")`):
  - two sources `[{source:"tcgplayer",market:100,observedAt:now-1day},{source:"cardmarket",market:104,observedAt:now-1day}]` → tier VERIFIED, coverage 2, parity ≥ 70, sources length 2.
  - two sources 100 vs 400 (huge disagreement), fresh → tier SOLID, parity low (< 40).
  - one source → tier SINGLE_SOURCE, parity null, coverage 1.
  - newest snapshot 40 days old → tier STALE.
  - `[]` → tier NONE, score 0, sources [].
  - duplicate source rows (two tcgplayer snapshots, keep newest) → coverage 1, sources[0].market = newest.
  - determinism: same input + nowMs twice → deepEqual.
  - market ≤ 0 or non-finite is ignored.
- [ ] **Step 2:** Run `node --import tsx --test src/lib/api-v1/trust-engine.test.ts` → fail (module missing).
- [ ] **Step 3:** Implement per the spec algorithm (steps 1–8). Import scoring fns from `@/workers/score-market`. Local `average`/`clamp`. Sort sources by name.
- [ ] **Step 4:** Tests pass; append test to package.json.

## Task 2: Source labels, trust repo, API surface

**Files:**
- Modify: `src/types/pokehub.ts` (`DataSource` union += `"tcgplayer" | "cardmarket"`), `src/workers/ingest-pokemon-tcg.ts` (snapshot `source` labels), `src/lib/api-v1/cards-repo.ts`, `src/app/api/v1/cards/[id]/route.ts`, `supabase/schema.sql` (append a comment documenting the relabel migration)
- Create: `src/app/api/v1/trust/[cardId]/route.ts`

**Interfaces:**
- Consumes: `computeTrust`, `TrustResult`, `TrustSnapshotInput` (Task 1); existing `searchCardObjects`, `toCardObject`, `getCardById`, `RepoResult`, `getAnonClient`, `listResponse`/`singleResponse`/`errorResponse`, `CACHE_OK`.
- Produces (EXACT):
```ts
export async function getTrustForCards(cardIds: string[]): Promise<RepoResult<Record<string, TrustResult>>>;
export async function getTrustForCard(cardId: string): Promise<RepoResult<TrustResult>>;
```

- [ ] **Step 1:** `DataSource` union gains `"tcgplayer" | "cardmarket"`. In `ingest-pokemon-tcg.ts`, the TCGplayer snapshot row uses `source: "tcgplayer"` (keep confidence 72), the Cardmarket row `source: "cardmarket"` (keep 68).
- [ ] **Step 2:** `getTrustForCards`: ONE query `poke_market_snapshots` `.eq("item_kind","card").in("item_ref", cardIds)` selecting `item_ref, source, market, observed_at`; group by `item_ref`; `computeTrust(rows.map(r => ({ source, market, observedAt: observed_at })), Date.now())` per id; return map. `getTrustForCard` = single-id wrapper (empty → still returns a NONE TrustResult). DB error → `{ ok:false, error }`.
- [ ] **Step 3:** In `cards-repo.ts`, extend the card-object build path so `toCardObject` output includes `pokehub.trust`. Implementation: `searchCardObjects` and the single-card route compute trust via `getTrustForCards` for the ids on the page and merge into each card object's `pokehub.trust` (keep `pokehub.lastSnapshot`). Ensure the snapshot query used for `lastSnapshot` also selects `source` so nothing regresses.
- [ ] **Step 4:** `trust/[cardId]/route.ts` (`runtime="nodejs"`): `getCardById` → 404 `"Card not found"` if null; else `getTrustForCard`; `singleResponse({ cardId, ...trust }, CACHE_OK)`; repo error → `errorResponse(503, "catalog database unavailable")`.
- [ ] **Step 5:** `npx tsc --noEmit` clean; `npm run build` shows `/api/v1/trust/[cardId]` in the route table. `npm test` green.

## Task 3: Card Lab trust badge + mapper + README

**Files:** Modify `src/lib/api-v1/card-mapper.ts`, `src/lib/api-v1/card-mapper.test.ts`, `src/components/dashboard/CardValueLab.tsx`, `README.md`.

**Interfaces:** Consumes `TrustResult` (from `@/lib/api-v1/trust-engine`), existing `LiveCard`, `apiCardToLiveCard`, `CardFlip`, `Money`, `FloatingCard`.

- [ ] **Step 1:** `LiveCard` gains `trust: TrustResult | null`. `apiCardToLiveCard` reads `obj.pokehub.trust` (validate it's an object with a `tier` string; else null). `mockToLiveCards` sets `trust: null`. Add a failing mapper test (card object with a `pokehub.trust` → parsed; without → null); run fail → implement → pass.
- [ ] **Step 2:** In `CardValueLab`, render a **Trust badge** on each card (tier → label + color class: VERIFIED emerald, SOLID sky, SINGLE_SOURCE amber, STALE slate, NONE zinc; hide when `trust` is null). In the `CardFlip` back / detail, show the parity breakdown: each `trust.sources` entry (`source` — `Money(market)` — short date) plus `parity`/`freshness`/`coverage` values. Use existing pixel classes; touch targets ≥44px where interactive.
- [ ] **Step 3:** README: add `pokehub.trust` field shape, `/api/v1/trust/{cardId}` row, and a tier legend (what VERIFIED/SOLID/SINGLE_SOURCE/STALE/NONE mean).
- [ ] **Step 4:** `npx tsc --noEmit` clean; `npm test` (incl. mapper) green; `npm run build` clean.

## Task 4 (orchestrator, inline): migrate, verify, ship

- [ ] Apply migration `pokehub_snapshot_source_labels` (relabel by confidence_score) via Supabase MCP; verify `select source, count(*) from poke_market_snapshots group by source` shows `tcgplayer` + `cardmarket`.
- [ ] Gates: typecheck, test, build green. Local smoke: `/api/v1/trust/<real id>` + `/api/v1/cards/<id>` carry trust.
- [ ] Commit, push main → auto-deploy; live-verify trust in API + Card Lab badges; update memory; report.
