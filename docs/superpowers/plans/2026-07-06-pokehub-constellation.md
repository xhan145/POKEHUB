# POKEHUB Card Constellation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps.

**Goal:** New lazy-loaded Constellation tab — a WebGL galaxy of all 20,359 cards grouped by energy type, orb size=price, glow=trust. Vendored `~/constellation` engine + our data.

**Architecture:** Orchestrator vendors the engine + adds `three` (Task 0, inline). Then: data/endpoint/source-builder (Task 1) and module/nav (Task 2) via agents. Orchestrator applies migrations, backfills `types`, ships (Task 3). Spec: `docs/superpowers/specs/2026-07-06-pokehub-constellation-design.md` (READ IT — exact SQL, palette, channel formulas).

**Tech Stack:** Next.js route handlers + client components, `three` (WebGL), vendored constellation engine, Zod, `node --import tsx --test`. New dep: `three` + `@types/three`.

## Global Constraints

- Vendored engine files under `src/lib/constellation/{core,react,providers,encodings}` are copied VERBATIM — do not modify them.
- Reads via `poke_*` views / anon client only; no secrets in any route. `runtime="nodejs"` on the route.
- Constellation tab MUST be `dynamic(..., { ssr:false })` so `three` stays out of the initial bundle.
- Channel formulas exactly as the spec's card-source section (mass log-scale, TIER_GLOW, anomaly, TYPE_COLOR palette).
- `--skipSnapshots` backfill must NOT insert market_snapshots.
- File ownership exclusive per task; no git by implementers; 2-space, double quotes.

---

## Task 0 (orchestrator, inline): vendor engine + dependency

- [ ] Copy `C:/Users/xhan1/constellation/src/{core,react,providers,encodings}` → `C:/Users/xhan1/Projects/POKEHUB/src/lib/constellation/` (preserve subdirs so relative imports resolve). Exclude `*.test.ts` optionally, or keep them.
- [ ] `package.json`: add `"three": "^0.169.0"` to dependencies, `"@types/three": "^0.169.0"` to devDependencies. Run `npm install`.
- [ ] Verify `npx tsc --noEmit` resolves the vendored engine + `three` (fix only import/path issues, not engine logic). Confirm `import { ConstellationView } from "@/lib/constellation/react/ConstellationView"` and `HierarchicalAggregator`, `buildTreeSource` from `@/lib/constellation/providers` type-resolve.

## Task 1: Data view, endpoint, source builder

**Files:**
- Create: `src/lib/constellation/card-source.ts`, `src/lib/constellation/card-source.test.ts`, `src/app/api/v1/constellation/route.ts`, `src/lib/api-v1/constellation-repo.ts`
- Modify: `src/workers/ingest-pokemon-tcg.ts` (types + `--skipSnapshots`), `supabase/schema.sql` (append `types` column + `poke_card_constellation` view), `package.json` (append `card-source.test.ts` to test list)

**Interfaces — Produces (EXACT):** `ConstellationCard`, `TypeSummary`, `buildCardFlatNodes`, `TYPE_COLOR` (spec card-source section); and:
```ts
// src/lib/api-v1/constellation-repo.ts
export type ConstellationPayload = { total: number; types: TypeSummary[]; cards: ConstellationCard[] };
export async function getConstellation(): Promise<RepoResult<ConstellationPayload>>;
// reads poke_card_constellation; per row price = market_tcgplayer ?? market_cardmarket ?? 0;
// tier = computeTrust([{source:"tcgplayer",market,observedAt:newest_observed},{source:"cardmarket",market,observedAt:newest_observed}].filter(finite market), Date.now()).tier;
// types = counts grouped by type, sorted desc.
```

- [ ] **Step 1:** Worker: add `types` to the API `select` string; `CardSchema.types: z.array(z.string()).optional()`; `toCardRow` adds `types: card.types ?? []`. Add `const skipSnapshots = process.argv.includes("--skipSnapshots");` and guard the `market_snapshots` insert with `if (!skipSnapshots && snapshotRows.length > 0)`.
- [ ] **Step 2:** Append to `supabase/schema.sql`: the `alter table public.cards add column if not exists types text[] not null default '{}';` and the `poke_card_constellation` view + grant (verbatim from spec).
- [ ] **Step 3:** Write failing `card-source.test.ts` (spec Testing cases). Run → fail. Implement `card-source.ts` (buildCardFlatNodes + TYPE_COLOR + channel formulas). Run → pass. Append test to package.json.
- [ ] **Step 4:** Implement `constellation-repo.ts` (`getConstellation`, reusing `getAnonClient`/`RepoResult` from `cards-repo.ts`, `computeTrust` from `@/lib/api-v1/trust-engine`) and `constellation/route.ts` (`runtime="nodejs"`; `getConstellation` → `singleResponse(payload, CACHE_OK)`; repo error → `errorResponse(503, "catalog database unavailable")`).
- [ ] **Step 5:** `npx tsc --noEmit` clean; `npm test` green; `npm run build` shows `/api/v1/constellation`.

## Task 2: Constellation module + nav wiring + fallback

**Files:**
- Create: `src/components/dashboard/ConstellationModule.tsx`, `src/lib/use-constellation-data.ts`
- Modify: `src/components/dashboard/DashboardApp.tsx`, `src/components/pixel/icons.tsx` (add `IconConstellation`), `README.md` (Constellation section)

**Interfaces:** Consumes `ConstellationView` (`@/lib/constellation/react/ConstellationView`), `HierarchicalAggregator` + `buildTreeSource` (`@/lib/constellation/providers`), `buildCardFlatNodes`/`ConstellationCard`/`TypeSummary` (Task 1), `DetailDrawer`/`SkeletonPanel`/`EmptyState`/`CardOrbitGrid` (existing), `/api/v1/constellation`.

```ts
// src/lib/use-constellation-data.ts
export type ConstellationState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; payload: ConstellationPayload };
export function useConstellationData(): ConstellationState; // fetch /api/v1/constellation once
export function isWebglAvailable(): boolean;                 // try create a webgl context, catch
```

- [ ] **Step 1:** `use-constellation-data.ts` — fetch on mount; `isWebglAvailable` via a throwaway canvas `getContext("webgl2")||getContext("webgl")`.
- [ ] **Step 2:** `ConstellationModule.tsx` (`"use client"`): loading→`SkeletonPanel`; error→`EmptyState`; if `!isWebglAvailable()` or `matchMedia("(prefers-reduced-motion: reduce)").matches` → fallback panel (`CardOrbitGrid` of type chips w/ counts + link text "browse cards in Card Lab"). Ready+WebGL: memoize `provider = new HierarchicalAggregator(buildTreeSource(buildCardFlatNodes(payload.cards, payload.types)))`; render `<ConstellationView provider={provider} theme={POKE_THEME} budget={2500} bloom style={{height:"70vh"}} onSelect={p => { const d=p.node?.data; if (d) setDrawerCard(d); }} />`; HUD overlay (total, legend: size=price · glow=trust · ring=stale); `DetailDrawer` for the selected card showing image + price + tier. `POKE_THEME` = Theme with background `#08070d`, accents emerald/gold.
- [ ] **Step 3:** `icons.tsx`: add `IconConstellation` (star-cluster SVG, same 24x24 stroke style as siblings).
- [ ] **Step 4:** `DashboardApp.tsx`: `TabId` += `"constellation"`; tabs array entry (label "Constellation", `IconConstellation`); place in the More sheet (keep 5 primary bottom-nav); `const ConstellationModule = dynamic(() => import("./ConstellationModule").then(m => m.ConstellationModule), { ssr:false, loading: () => <SkeletonPanel lines={10} /> })`; render when `activeTab==="constellation"`.
- [ ] **Step 5:** README: Constellation section (what it shows, the channel legend). `npx tsc --noEmit` + `npm run build` clean.

## Task 3 (orchestrator, inline): migrate, backfill, ship

- [ ] Apply migration `pokehub_card_types` (`alter table cards add column types`) via MCP.
- [ ] Backfill: `npm run ingest:pokemon -- --pageSize=250 --maxPages=90 --delayMs=2000 --skipSnapshots` (env from `.env.ingest.local`); verify `select count(*) from poke_cards where types <> '{}'` ≈ 17k.
- [ ] Apply migration `pokehub_constellation_view` (the `poke_card_constellation` view) via MCP; verify it returns rows with `type` + prices.
- [ ] Gates: typecheck, test, build green. Local smoke: `/api/v1/constellation` returns galaxy summary + cards; dev server → Constellation tab canvas present, no console errors, clusters visible.
- [ ] Commit, push main → deploy; live-verify the tab + endpoint; update memory; report.
