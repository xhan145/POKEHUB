# POKEHUB 3D Pixel Supercharge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform POKEHUB into a 3D pixel-card market intelligence dashboard: CSS-3D card system, 7 modules with desktop rail + mobile bottom nav, lawful source-adapter ingestion layer with 4 API routes, scoring additions, live Supabase schema application, README.

**Architecture:** Two tracks. Frontend: design tokens + rAF hooks → 4 CSS-3D components + shared atoms → per-module upgrades → nav/shell rework. Backend: types + adapter layer → API routes + schema additions. Integration, verification, migration, and delivery run last. Spec: `docs/superpowers/specs/2026-07-06-pokehub-3d-supercharge-design.md`.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind 3, `@supabase/supabase-js`, Zod, `node --import tsx --test`. **Zero new runtime dependencies.**

## Global Constraints

- Every shared-table write includes `project_tag: 'POKE'` (via `withProjectTag` from `src/lib/project-tag.ts`); reads filter `.eq("project_tag", "POKE")` or use `poke_*` views.
- No global uniqueness constraints that ignore `project_tag`.
- `SUPABASE_SERVICE_ROLE_KEY` server-only; no secret values ever rendered or returned by APIs (booleans only).
- `.env.local` never committed. MSRP seed data never removed. App must boot fully with zero API keys.
- No scraping that violates robots.txt/ToS; scraper stubs stay `enabled: false`.
- All animation uses `transform`/`opacity` only; micro-interactions 150–300ms; global `prefers-reduced-motion` fallback.
- SVG icons only (no emoji as icons). Touch targets ≥44px. `cursor-pointer` on clickables.
- All score functions pure and clamped 0–100.
- Placeholder market stats are deterministic (string-hash based), never `Math.random()`, always labeled "estimate"/"seed".
- File ownership is exclusive per task — a task only edits files listed under its **Files** block.
- Gate before delivery: `npm run typecheck`, `npm run build`, `npm test`, `npm run score` all green.

---

## Phase 1 — Foundations (Tasks 1–3 run in parallel; disjoint files)

### Task 1: Frontend foundation — tokens, fonts, hooks, 3D components, atoms, icons

**Files:**
- Modify: `src/styles/globals.css`
- Modify: `src/app/layout.tsx`
- Create: `src/lib/use-reduced-motion.ts`
- Create: `src/lib/use-tilt.ts`
- Create: `src/lib/use-count-up.ts`
- Create: `src/components/three/CardStage.tsx`
- Create: `src/components/three/FloatingCard.tsx`
- Create: `src/components/three/CardFlip.tsx`
- Create: `src/components/three/CardOrbitGrid.tsx`
- Create: `src/components/pixel/icons.tsx`
- Create: `src/components/pixel/atoms.tsx`

**Interfaces:**
- Consumes: existing pixel CSS classes (`.pixel-panel`, `.pixel-chip`, `.pixel-kicker`, `.pixel-input`).
- Produces (later tasks rely on these EXACT names):

```ts
// src/lib/use-reduced-motion.ts
export function usePrefersReducedMotion(): boolean;

// src/lib/use-tilt.ts — sets --tilt-x/--tilt-y CSS custom props directly on the node (no re-render)
export function useTilt<T extends HTMLElement>(maxDeg?: number): {
  ref: React.RefObject<T | null>;
  onPointerMove: (event: React.PointerEvent<T>) => void;
  onPointerLeave: () => void;
};

// src/lib/use-count-up.ts — rAF ease-out count from 0; instant when reduced motion
export function useCountUp(target: number, durationMs?: number): number;

// src/components/three/CardStage.tsx
export function CardStage({ children, className }: { children: React.ReactNode; className?: string });

// src/components/three/FloatingCard.tsx
export type GlowTier = "common" | "rare" | "ultra" | "secret";
export function FloatingCard(props: {
  children: React.ReactNode;
  glow?: GlowTier;            // default "common"
  floatDelay?: number;        // seconds, staggers idle float
  interactive?: boolean;      // default true: tilt + press feedback
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
});

// src/components/three/CardFlip.tsx — click/Enter/Space flips; Escape unflips
export function CardFlip(props: {
  front: React.ReactNode;
  back: React.ReactNode;
  glow?: GlowTier;
  className?: string;
  ariaLabel?: string;
});

// src/components/three/CardOrbitGrid.tsx — grid wrapper, children get staggered entrance
export function CardOrbitGrid({ children, className }: { children: React.ReactNode; className?: string });

// src/components/pixel/icons.tsx — 24x24 inline SVGs, stroke currentColor, strokeWidth 2
export function IconArcade(props: React.SVGProps<SVGSVGElement>);
export function IconBox(props: React.SVGProps<SVGSVGElement>);
export function IconCard(props: React.SVGProps<SVGSVGElement>);
export function IconRadar(props: React.SVGProps<SVGSVGElement>);
export function IconFolder(props: React.SVGProps<SVGSVGElement>);
export function IconSatellite(props: React.SVGProps<SVGSVGElement>);
export function IconGear(props: React.SVGProps<SVGSVGElement>);
export function IconMore(props: React.SVGProps<SVGSVGElement>);

// src/components/pixel/atoms.tsx
export function Money({ value }: { value: number });                       // Intl USD format
export function StatValue({ value, format }: { value: number; format?: "int" | "money" }); // uses useCountUp
export function SkeletonPanel({ lines }: { lines?: number });              // shimmer placeholder
export function EmptyState({ title, body }: { title: string; body: string });
export function SectionHeader({ kicker, title }: { kicker: string; title: string });
export function DetailDrawer(props: {                                       // focus-trapped slide-in
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
});
export function EstimateTag();                                               // tiny "EST" chip marking derived values
```

- [ ] **Step 1: Fonts via next/font.** In `src/app/layout.tsx`, import `Press_Start_2P` and `VT323` from `next/font/google` (both `weight: "400"`, `subsets: ["latin"]`, `variable: "--font-pixel"` / `"--font-terminal"`, `display: "swap"`) and add both `.variable` classes to `<body>`.

- [ ] **Step 2: Extend `globals.css`.** Append (keep everything existing):

```css
:root {
  --color-primary: #15803d;
  --color-accent: #d97706;
  --glow-common: rgba(148, 163, 184, 0.35);
  --glow-rare: rgba(52, 211, 153, 0.55);
  --glow-ultra: rgba(217, 119, 6, 0.6);
  --glow-secret: rgba(232, 121, 249, 0.6);
  --motion-fast: 180ms;
  --motion-medium: 260ms;
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

.font-pixel { font-family: var(--font-pixel), ui-monospace, monospace; }
.font-terminal { font-family: var(--font-terminal), ui-monospace, monospace; }
.pixel-kicker { font-family: var(--font-pixel), ui-monospace, monospace; font-size: 0.6rem; }
.pixel-title { font-family: var(--font-pixel), ui-monospace, monospace; font-size: clamp(2rem, 8vw, 4.5rem); line-height: 1.05; }

.card-stage { perspective: 1000px; }

.floating-card {
  position: relative;
  transform-style: preserve-3d;
  transform: rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg));
  transition: transform var(--motion-medium) var(--ease-spring), box-shadow var(--motion-medium) ease;
  will-change: transform;
  cursor: pointer;
}
.floating-card--idle { animation: float-idle 5s ease-in-out infinite; }
.floating-card:active { transform: scale(0.97) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)); }
.floating-card:focus-visible { outline: 3px solid var(--color-accent); outline-offset: 3px; }
.glow-common { box-shadow: 0 0 14px var(--glow-common), 6px 6px 0 rgba(0, 0, 0, 0.45); }
.glow-rare { box-shadow: 0 0 18px var(--glow-rare), 6px 6px 0 rgba(0, 0, 0, 0.45); }
.glow-ultra { box-shadow: 0 0 22px var(--glow-ultra), 6px 6px 0 rgba(0, 0, 0, 0.45); }
.glow-secret { box-shadow: 0 0 24px var(--glow-secret), 6px 6px 0 rgba(0, 0, 0, 0.45); }

@keyframes float-idle {
  0%, 100% { translate: 0 0; rotate: 0deg; }
  50% { translate: 0 -7px; rotate: 0.4deg; }
}

.card-flip { position: relative; transform-style: preserve-3d; transition: transform 420ms var(--ease-spring); }
.card-flip--flipped { transform: rotateY(180deg); }
.card-flip__face { backface-visibility: hidden; }
.card-flip__face--back { position: absolute; inset: 0; transform: rotateY(180deg); overflow: auto; }
@keyframes card-spin { from { transform: rotateY(0deg); } to { transform: rotateY(360deg); } }
.card-spin-once { animation: card-spin 500ms ease-out; }

.orbit-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
.stagger-item { opacity: 0; animation: panel-enter 320ms ease-out forwards; }
.stagger-item:nth-child(1) { animation-delay: 0ms; } .stagger-item:nth-child(2) { animation-delay: 40ms; }
.stagger-item:nth-child(3) { animation-delay: 80ms; } .stagger-item:nth-child(4) { animation-delay: 120ms; }
.stagger-item:nth-child(5) { animation-delay: 160ms; } .stagger-item:nth-child(6) { animation-delay: 200ms; }
.stagger-item:nth-child(7) { animation-delay: 240ms; } .stagger-item:nth-child(8) { animation-delay: 280ms; }
.stagger-item:nth-child(9) { animation-delay: 320ms; } .stagger-item:nth-child(10) { animation-delay: 360ms; }
.stagger-item:nth-child(11) { animation-delay: 400ms; } .stagger-item:nth-child(n + 12) { animation-delay: 440ms; }
@keyframes panel-enter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.tab-panel { animation: panel-enter 220ms ease-out; min-height: 60vh; }

.skeleton-panel { position: relative; overflow: hidden; border: 2px solid rgba(52, 211, 153, 0.25); background: rgba(13, 20, 24, 0.8); }
.skeleton-line { height: 0.9rem; margin: 0.6rem 1rem; background: rgba(148, 163, 184, 0.15); }
.skeleton-panel::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(100deg, transparent 30%, rgba(255, 255, 255, 0.06) 50%, transparent 70%);
  animation: shimmer 1.4s infinite; transform: translateX(-100%);
}
@keyframes shimmer { to { transform: translateX(100%); } }

.side-rail { display: none; }
.bottom-nav {
  position: fixed; inset: auto 0 0 0; z-index: 60;
  display: grid; grid-template-columns: repeat(6, minmax(0, 1fr));
  border-top: 2px solid rgba(52, 211, 153, 0.55);
  background: rgba(8, 7, 13, 0.96); backdrop-filter: blur(6px);
  padding-bottom: env(safe-area-inset-bottom);
}
.nav-item {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px; min-height: 56px; padding: 6px 2px; cursor: pointer;
  color: rgb(148, 163, 184); border: none; background: transparent;
  font-family: var(--font-pixel), monospace; font-size: 0.45rem; text-transform: uppercase;
  transition: color var(--motion-fast) ease;
}
.nav-item[aria-selected="true"], .nav-item[aria-current="page"] { color: rgb(253, 224, 71); }
.nav-item svg { width: 20px; height: 20px; }

.more-sheet {
  position: fixed; inset: auto 0 0 0; z-index: 70;
  border: 2px solid rgba(52, 211, 153, 0.55); border-bottom: none;
  background: rgba(8, 7, 13, 0.98); padding: 1rem 1rem calc(1rem + env(safe-area-inset-bottom));
  animation: sheet-up 240ms ease-out;
}
@keyframes sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }

.drawer-scrim { position: fixed; inset: 0; z-index: 80; background: rgba(0, 0, 0, 0.55); }
.detail-drawer {
  position: fixed; top: 0; right: 0; bottom: 0; z-index: 90;
  width: min(480px, 100vw); overflow-y: auto;
  border-left: 2px solid rgba(52, 211, 153, 0.55);
  background: linear-gradient(135deg, rgba(13, 20, 24, 0.99), rgba(30, 11, 33, 0.98));
  animation: drawer-in 260ms ease-out; padding: 1.25rem;
}
@keyframes drawer-in { from { transform: translateX(100%); } to { transform: translateX(0); } }

@media (min-width: 1024px) {
  .side-rail { display: flex; flex-direction: column; gap: 0.25rem; width: 210px; flex: 0 0 auto; }
  .side-rail .nav-item { flex-direction: row; justify-content: flex-start; gap: 0.6rem; min-height: 48px; padding: 0.6rem 0.8rem; font-size: 0.55rem; border: 2px solid transparent; }
  .side-rail .nav-item[aria-selected="true"] { border-color: rgba(217, 119, 6, 0.8); background: rgba(6, 78, 59, 0.45); }
  .bottom-nav { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .floating-card, .floating-card--idle, .card-flip, .stagger-item, .tab-panel,
  .skeleton-panel::after, .more-sheet, .detail-drawer, .card-spin-once {
    animation: none !important;
    transition: none !important;
  }
  .floating-card { transform: none !important; }
  .stagger-item { opacity: 1; }
  .card-flip--flipped { transform: none; }
  .card-flip--flipped .card-flip__face--front { visibility: hidden; }
  .card-flip--flipped .card-flip__face--back { transform: none; }
}
```

- [ ] **Step 3: Implement hooks.** `usePrefersReducedMotion` — `matchMedia("(prefers-reduced-motion: reduce)")` with change listener, SSR-safe default `false`. `useTilt` — on pointer move compute offsets from element center, set `--tilt-x` = `-(offsetY/halfHeight)*maxDeg` deg and `--tilt-y` = `(offsetX/halfWidth)*maxDeg` deg via `style.setProperty` on the node; on leave reset both to `0deg`; skip entirely when `event.pointerType === "touch"` or reduced motion. Default `maxDeg = 10`. `useCountUp` — rAF loop, ease-out cubic (`1 - (1-t)^3`), returns rounded current value, re-runs on `target` change, instant when reduced motion; cancel rAF on unmount. Default `durationMs = 900`.

- [ ] **Step 4: Implement 3D components** composing the CSS above. `FloatingCard`: wraps children in a `div` with `floating-card floating-card--idle glow-<tier>` + tilt handlers when `interactive`; `style={{ animationDelay: floatDelay + "s" }}`; `role="button"`+`tabIndex=0`+Enter/Space keydown when `onClick` given. `CardFlip`: internal `flipped` state; outer `card-stage`, inner `card-flip` (+`--flipped`); front/back in `card-flip__face` / `card-flip__face--back`; toggles on click/Enter/Space, Escape unflips; `aria-pressed={flipped}`. `CardOrbitGrid`: `div.orbit-grid.card-stage`, each child wrapped in `div.stagger-item`. `CardStage`: `div.card-stage`.

- [ ] **Step 5: Implement atoms + icons.** `DetailDrawer`: renders `null` unless `open`; scrim click + Escape call `onClose`; focus moves to drawer on open and returns on close; `role="dialog" aria-modal="true"`; close button ≥44px. `SkeletonPanel`: `lines ?? 4` `.skeleton-line` divs. `StatValue`: `useCountUp`, `font-terminal` class, `format === "money"` → Intl USD, tabular-nums. Icons: simple geometric 24×24 `viewBox="0 0 24 24"` `fill="none" stroke="currentColor" strokeWidth={2}` paths (joystick, cube, card rectangle, radar arcs, folder, satellite dish, gear, three dots).

- [ ] **Step 6: Verify** `npx tsc --noEmit` passes for these files (full-project typecheck happens at integration).

### Task 2: Types extension + source adapter layer + tests

**Files:**
- Modify: `src/types/pokehub.ts` (append only — do not change existing types)
- Create: `src/lib/sources/types.ts`, `src/lib/sources/scrape-policy.ts`, `src/lib/sources/throttle.ts`, `src/lib/sources/pokemon-tcg.ts`, `src/lib/sources/ebay-browse.ts`, `src/lib/sources/pricecharting.ts`, `src/lib/sources/manual-csv.ts`, `src/lib/sources/source-registry.ts`
- Test: `src/lib/sources/source-registry.test.ts`, `src/lib/sources/manual-csv.test.ts`, `src/lib/sources/throttle.test.ts`

**Interfaces:**
- Consumes: `MarketSnapshot`, `CardIdentity`, `DataSource`, `ProjectTag` from `src/types/pokehub.ts`; `POKEHUB_PROJECT_TAG` from `src/lib/project-tag.ts`.
- Produces (EXACT):

```ts
// append to src/types/pokehub.ts
export type SourceCredentialStatus = {
  sourceId: string;
  hasCredentials: boolean;
  required: boolean;
  detail?: string;
};

export type SourceFetchInput = { query?: string; limit?: number };

export type SourceFetchResult =
  | { status: "ok"; snapshots: MarketSnapshot[]; cards?: CardIdentity[]; activeListings?: number }
  | { status: "disabled" | "no_credentials" | "rate_limited" | "error"; message: string };

export type SourceAdapter = {
  id: string;
  label: string;
  kind: "api" | "csv" | "scraper_stub";
  enabled: boolean;
  requiresSecret: boolean;
  rateLimitPerMinute?: number;
  checkCredentials(): Promise<SourceCredentialStatus>;
  fetchSnapshot(input: SourceFetchInput): Promise<SourceFetchResult>;
};

export type ScrapePolicy = {
  sourceId: string;
  robotsTxtAllowed: "yes" | "no" | "unknown";
  tosAllowsScraping: "yes" | "no" | "unknown";
  requiresApproval: boolean;
  notes: string;
};

export type IngestionRun = {
  id?: string;
  projectTag: ProjectTag;
  sourceId: string;
  status: "success" | "error" | "partial";
  startedAt: string;
  finishedAt?: string;
  inserted: number;
  updated: number;
  skipped: number;
  errorMessage?: string;
};

export type AdapterStatus = {
  id: string;
  label: string;
  kind: "api" | "csv" | "scraper_stub";
  enabled: boolean;
  requiresSecret: boolean;
  hasCredentials: boolean;
  rateLimitPerMinute?: number;
  policy?: ScrapePolicy;
  lastRun?: IngestionRun | null;
};

export type LiveOverview = {
  sealedCount: number;
  cardCount: number;
  snapshotCount: number;
  lastSync: string | null;
};

// ALSO append one field to the existing EnvReadiness type (do not otherwise modify it):
//   ingestToken: boolean;

// src/lib/sources/throttle.ts
export function createRateLimiter(intervalMs: number): { acquire(): Promise<void> };

// src/lib/sources/manual-csv.ts
export type CsvRow = { name: string; price: number; kind: "card" | "sealed_product"; source: string };
export function parseManualCsv(text: string): { rows: CsvRow[]; errors: string[] };

// src/lib/sources/source-registry.ts
export function getSourceAdapters(): SourceAdapter[];
export function getAdapterStatuses(): Promise<AdapterStatus[]>; // no lastRun enrichment here (route adds it)

// src/lib/sources/scrape-policy.ts
export const scrapePolicies: ScrapePolicy[];
export function getScrapePolicy(sourceId: string): ScrapePolicy | undefined;
```

- [ ] **Step 1: Write failing tests first** (`node --import tsx --test src/lib/sources/*.test.ts`):
  - registry: with `POKEMON_TCG_API_KEY`/`EBAY_CLIENT_ID`/`EBAY_CLIENT_SECRET`/`PRICECHARTING_TOKEN` deleted from `process.env` → `getAdapterStatuses()` shows `pokemon-tcg` `enabled: true, hasCredentials: false` (keyless mode allowed), `ebay-browse` and `pricecharting` `enabled: false, hasCredentials: false`; every `kind: "scraper_stub"` entry has `enabled: false` and a `policy` with `requiresApproval: true`; JSON.stringify of statuses contains no env values (set a sentinel env value and assert it does not appear).
  - manual-csv: header `name,price,kind,source`; valid rows parse; bad price/kind rows land in `errors` with row numbers; empty text → `{ rows: [], errors: [] }`.
  - throttle: `createRateLimiter(30)` — three sequential `acquire()`s take ≥60ms total (use `performance.now()`).
- [ ] **Step 2: Run tests, verify they fail** (module not found).
- [ ] **Step 3: Implement.**
  - `throttle.ts`: promise-chain limiter — keep `nextAvailable` timestamp; `acquire()` awaits `setTimeout` until slot, then advances by `intervalMs`.
  - `scrape-policy.ts`: policies for `tcgplayer-direct`, `cardmarket-direct`, `psa-population`, `cgc-population`, `bgs-population` — all `requiresApproval: true`, `robotsTxtAllowed: "unknown"`, `tosAllowsScraping: "no"` for marketplace sites and `"unknown"` for grading population, notes naming the needed API program/key.
  - `pokemon-tcg.ts`: adapter id `pokemon-tcg`; `enabled: true`, `requiresSecret: false`; `checkCredentials` reflects `POKEMON_TCG_API_KEY` presence with `required: false`; `fetchSnapshot` GETs `https://api.pokemontcg.io/v2/cards` (pageSize = min(limit ?? 20, 50), optional `q`, `X-Api-Key` header when set), maps embedded tcgplayer/cardmarket prices to `MarketSnapshot[]` and card identities to `CardIdentity[]` (reuse the mapping shape from `src/workers/ingest-pokemon-tcg.ts`); wraps fetch failures as `{ status: "error", message }`.
  - `ebay-browse.ts`: id `ebay-browse`; `requiresSecret: true`; `enabled` = both `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET` set; token via POST `https://api.ebay.com/identity/v1/oauth2/token` (Basic base64(id:secret), body `grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope`), cache token in module scope until expiry−60s; then GET `https://api.ebay.com/buy/browse/v1/item_summary/search?q=<query>&limit=<limit ?? 50>&category_ids=183454`; produce one `MarketSnapshot` with `activeListings = total`, `low/high` from item price min/max, `source: "ebay_browse"`, `confidenceScore: 55`; `{ status: "no_credentials" }` when unset.
  - `pricecharting.ts`: id `pricecharting`; `requiresSecret: true`; `enabled` = `PRICECHARTING_TOKEN` set; module-level `createRateLimiter(1000)` + `Map` cache keyed by query with 5-minute TTL; GET `https://www.pricecharting.com/api/products?t=<token>&q=<query>`; map `loose-price`/`cib-price`/`new-price` cents → dollars into one `MarketSnapshot` per product (`source: "pricecharting"`, `confidenceScore: 60`); `{ status: "no_credentials" }` when tokenless.
  - `manual-csv.ts`: adapter id `manual-csv`, `kind: "csv"`, `enabled: true`, `requiresSecret: false`; `fetchSnapshot` returns `{ status: "disabled", message: "CSV imports flow through POST /api/ingest/msrp" }`; plus the pure `parseManualCsv`.
  - `source-registry.ts`: array of the 4 real adapters + 5 stub entries built from `scrapePolicies` (stub `fetchSnapshot` returns `{ status: "disabled", message: policy.notes }`); `getAdapterStatuses()` maps adapters through `checkCredentials()`.
- [ ] **Step 4: Run tests, verify pass.**

### Task 3: Scoring additions + derived seed stats + env readiness

**Files:**
- Modify: `src/workers/score-market.ts` (append; keep existing exports and weights)
- Modify: `src/workers/score-market.test.ts` (append)
- Create: `src/lib/derived-stats.ts`
- Test: `src/lib/derived-stats.test.ts`
- Modify: `src/lib/pokehub-data.ts` (only: add `ingestToken` to `getEnvReadiness`)
- Modify: `src/types/pokehub.ts` — **NO**: `EnvReadiness.ingestToken` is added by Task 2's owner? **Resolution:** Task 2 owns `src/types/pokehub.ts`; it also appends `ingestToken: boolean;` to `EnvReadiness`. Task 3 does not touch the types file.

**Interfaces:**
- Produces (EXACT):

```ts
// append to src/workers/score-market.ts — all pure, all clamped 0–100
export function scoreSourceFreshness(hoursSinceObservation: number): number; // 100 at 0h, linear decay to 0 at 168h (7 days)
export function scoreLiquidity(input: { activeListings?: number; soldCount?: number }): number;
// 0.45 * min(100, activeListings * 2) + 0.55 * min(100, soldCount * 5)
export function scoreSpreadRisk(input: { low?: number; high?: number; mid?: number }): number;
// spreadRatio = (high - low) / mid; 100 at ratio 0 → 0 at ratio ≥ 1.5, linear; missing/invalid inputs → 50
export const scoreCardValueSignal: typeof cardValueSignalScore;      // alias
export const scoreSealedProductSignal: typeof sealedProductSignalScore; // alias
export const scoreDataConfidence: typeof dataConfidenceScore;        // alias

// src/lib/derived-stats.ts — deterministic placeholder stats from a string hash (djb2), labeled estimates
export type DerivedSealedStats = {
  activeListings: number;   // 3..40
  soldComps: number;        // 1..25
  velocity: "SLOW" | "STEADY" | "FAST";
  reprintRisk: "LOW" | "MED" | "HIGH";
  liquidityScore: number;   // scoreLiquidity of the above
  signalScore: number;      // scoreSealedProductSignal fed with derived inputs
};
export function getDerivedSealedStats(name: string, msrp: number): DerivedSealedStats;

export type DerivedCardStats = {
  rawMarket: number;        // deterministic from name hash, 5..250, 2dp
  gradedEstimate: number;   // rawMarket * 1.6..2.4 by rarity keyword, 2dp
  population: "PENDING";    // placeholder until PSA/CGC/BGS access
  spread: number;           // 0..1 ratio, 2dp
  liquidityScore: number;
  confidenceScore: number;
  signalScore: number;
  glow: "common" | "rare" | "ultra" | "secret";
};
export function getDerivedCardStats(card: { pokemonTcgId: string; name: string; rarity?: string }): DerivedCardStats;
```

  `glow` mapping: rarity contains "Secret"/"Rainbow" → `secret`; "Special Illustration"/"Ultra"/"VMAX"/"Hyper" → `ultra`; "Rare"/"Holo" → `rare`; else `common`.

- [ ] **Step 1: Write failing tests** — freshness: `scoreSourceFreshness(0) === 100`, `(84) === 50`, `(168) === 0`, `(1000) === 0`, negative clamps to 100; liquidity/spread clamp and monotonicity; aliases are the same functions; derived stats: same input → same output (call twice), values within documented ranges, glow mapping cases.
- [ ] **Step 2: Run tests, verify fail.**
- [ ] **Step 3: Implement.** djb2 hash: `let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;` then range-map with modulo. `getEnvReadiness` gains `ingestToken: Boolean(process.env.POKEHUB_INGEST_TOKEN)`.
- [ ] **Step 4: Run tests, verify pass.**

---

## Phase 2 — Routes, modules, nav, README (Tasks 4–13 run in parallel; disjoint files)

### Task 4: API routes + ingestion-runs + schema + env + test wiring

**Files:**
- Create: `src/app/api/sources/status/route.ts`, `src/app/api/ingest/msrp/route.ts`, `src/app/api/ingest/pokemon-tcg/route.ts`, `src/app/api/ingest/market-snapshot/route.ts`
- Create: `src/lib/sources/ingest-schemas.ts`, `src/lib/sources/ingestion-runs.ts`, `src/lib/sources/route-helpers.ts`
- Test: `src/lib/sources/ingest-schemas.test.ts`
- Modify: `supabase/schema.sql` (append), `.env.example` (append `POKEHUB_INGEST_TOKEN=`), `package.json` (test script), `docs/data-model.md` (document `ingestion_runs`)

**Interfaces:**
- Consumes: `getSourceAdapters`, `getAdapterStatuses` (Task 2); `createServiceSupabaseClient` (`src/lib/supabase/server.ts`); `withProjectTag`, `POKEHUB_PROJECT_TAG`; `IngestionRun`, `AdapterStatus` types.
- Produces (EXACT):

```ts
// src/lib/sources/ingest-schemas.ts (zod)
export const msrpIngestSchema: z.ZodType<{ products?: {name: string; msrp: number; productType: string; currency?: "USD"}[]; csv?: string }>;
export const pokemonTcgIngestSchema: z.ZodType<{ query?: string; limit?: number }>;
export const marketSnapshotIngestSchema; // itemKind, itemRef, source, observedAt?, low?, mid?, high?, market?, activeListings?, soldCount?, confidenceScore?
export type ApiEnvelope<T> = { ok: true; data: T; run?: IngestionRun } | { ok: false; error: string };

// src/lib/sources/route-helpers.ts
export function requireIngestToken(request: Request): { ok: true } | { ok: false; status: 401 | 503; error: string };
// 503 "ingest token not configured" when POKEHUB_INGEST_TOKEN unset; 401 when x-pokehub-ingest-token header missing/mismatched
export function jsonError(status: number, error: string): Response;

// src/lib/sources/ingestion-runs.ts
export async function recordIngestionRun(run: IngestionRun): Promise<void>; // no-op when service client null
export async function getLatestRuns(): Promise<Record<string, IngestionRun>>; // keyed by sourceId, empty when no client

// src/lib/sources/route-helpers.ts also exports camelCase→snake_case row mappers used before upsert:
export function cardToRow(card: CardIdentity): Record<string, unknown>;      // pokemon_tcg_id, set_id, set_name, image_small, image_large, raw_json, updated_at — wrapped in withProjectTag
export function snapshotToRow(snap: MarketSnapshot): Record<string, unknown>; // item_kind, item_ref, observed_at, direct_low, active_listings, sold_count, confidence_score, raw_json — wrapped in withProjectTag
```

Route behaviors:
- `GET /api/sources/status` → `{ ok: true, data: { adapters: AdapterStatus[] } }`, each status enriched with `lastRun` from `getLatestRuns()`. Never includes secret values. No auth (read-only booleans).
- `POST /api/ingest/msrp` → token-gated; accepts JSON products and/or `csv` string (via `parseManualCsv`); upserts to `sealed_products` `onConflict: "project_tag,name"`; 503 envelope when Supabase unconfigured; records run `sourceId: "manual-csv"`.
- `POST /api/ingest/pokemon-tcg` → token-gated; calls pokemon-tcg adapter `fetchSnapshot`; upserts cards `onConflict: "project_tag,pokemon_tcg_id"`, inserts snapshots; records run.
- `POST /api/ingest/market-snapshot` → token-gated; validates snapshot payload; inserts one `market_snapshots` row via `withProjectTag`; records run `sourceId: body.source`.
- All routes `export const runtime = "nodejs";` and return the `ApiEnvelope` shape with proper HTTP status (200/400/401/503/500).

- [ ] **Step 1: Write failing zod round-trip tests** for the three ingest schemas (valid payload parses; negative price / bad kind / oversize limit rejected) and `requireIngestToken` (unset env → 503; set env + wrong header → 401; correct header → ok). Run, verify fail.
- [ ] **Step 2: Implement schemas + helpers.** Run tests, verify pass.
- [ ] **Step 3: Implement the four routes** per behaviors above.
- [ ] **Step 4: Append to `supabase/schema.sql`:**

```sql
create table if not exists public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  project_tag text not null default 'POKE',
  source_id text not null,
  status text not null check (status in ('success', 'error', 'partial')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  inserted integer not null default 0,
  updated integer not null default 0,
  skipped integer not null default 0,
  error_message text
);

create index if not exists idx_ingestion_runs_source on public.ingestion_runs(project_tag, source_id, started_at desc);

create or replace view public.poke_ingestion_runs
with (security_invoker = true) as
select * from public.ingestion_runs where project_tag = 'POKE';

alter table public.ingestion_runs enable row level security;
drop policy if exists "POKE rows are readable" on public.ingestion_runs;
create policy "POKE rows are readable" on public.ingestion_runs for select to anon, authenticated using (project_tag = 'POKE');
grant select on public.poke_ingestion_runs to anon, authenticated;
grant select on public.ingestion_runs to anon, authenticated;
grant select, insert, update, delete on public.ingestion_runs to service_role;
```

- [ ] **Step 5: Update `package.json` test script** to:
  `node --import tsx --test src/lib/project-tag.test.ts src/workers/score-market.test.ts src/lib/sources/source-registry.test.ts src/lib/sources/manual-csv.test.ts src/lib/sources/throttle.test.ts src/lib/sources/ingest-schemas.test.ts src/lib/derived-stats.test.ts`
- [ ] **Step 6: Document `ingestion_runs` in `docs/data-model.md`.**

### Task 5: Market Arcade upgrade

**Files:** Modify `src/components/dashboard/MarketArcade.tsx` (becomes `"use client"`).
**Interfaces:** Consumes `StatValue`, `SectionHeader`, `SkeletonPanel` (atoms), `FloatingCard`, `CardOrbitGrid` (three), `getDerivedSealedStats`, `getEstimatedMarketPrice`; new prop `live?: LiveOverview | null` (added to props — DashboardApp Task 12 passes it).
**Behavior:** Stat tiles use `StatValue` count-ups. New tiles: Snapshot count (`live?.snapshotCount ?? 0`, hint "live" or "seed mode"), Source freshness (live?.lastSync ? hours-ago label : "SEED"), Last sync (formatted `live?.lastSync` or "LOCAL"). Top-movers strip: top 4 products by `getDerivedSealedStats(...).signalScore` rendered as small `FloatingCard`s in a `CardOrbitGrid` showing name, est. market `Money`, above-MSRP %, `EstimateTag`. Keep source-readiness panel.
- [ ] Implement, keep all existing stats, verify no unused imports.

### Task 6: Sealed Dex upgrade

**Files:** Modify `src/components/dashboard/SealedDex.tsx`.
**Interfaces:** Consumes `getDerivedSealedStats`, `DetailDrawer`, `EstimateTag`, `FloatingCard`, `CardFlip`, `CardOrbitGrid`, `Money`, existing filters.
**Behavior:** Table (desktop, `hidden md:block`): replace "pending/seed" cells with derived stats + `EstimateTag`; add Reprint risk and Last checked ("SEED") columns; sortable headers (name/msrp/market/aboveMsrp/velocity) via `useState<{key, dir}>` with `aria-sort`. Mobile (`md:hidden`): `CardOrbitGrid` of `FloatingCard`s (name, MSRP, est. market, badge, glow by badge: GRAIL WATCH→secret, CORE SEALED→ultra, PLAYABILITY→rare, else common). Row/card click opens `DetailDrawer` containing a `CardFlip` (front: product art placeholder pixel panel + name + badge; back: full derived stat list) + stat rows.
- [ ] Implement; keep existing filter logic intact.

### Task 7: Card Lab upgrade

**Files:** Modify `src/components/dashboard/CardValueLab.tsx`.
**Interfaces:** Consumes `getDerivedCardStats`, `CardFlip`, `CardOrbitGrid`, `EstimateTag`, `Money`, `SectionHeader`, `EmptyState`.
**Behavior:** Replace index-based fake numbers with `getDerivedCardStats`. Add rarity filter + min-signal-score filter (`ALL/60+/75+/90+`) alongside search. Above the table: `CardOrbitGrid` of `CardFlip` cards — front: card image (`imageSmall`, `loading="lazy"`, fixed aspect via h/w classes) with glow from derived stats; back: raw market, graded est., population "PENDING", spread, liquidity/confidence/signal scores + `EstimateTag`. Table remains for desktop density with derived values.
- [ ] Implement.

### Task 8: Signal Radar upgrade

**Files:** Modify `src/components/dashboard/SignalRadar.tsx` (becomes `"use client"`).
**Interfaces:** Consumes `getDerivedSealedStats`, `getDerivedCardStats`, `mockCards`, seed products via new props `products: MsrpProduct[]; cards: CardIdentity[]` (DashboardApp passes them — Task 12).
**Behavior:** 9 categories (add "Suspicious outlier sales" to the existing 8). Each panel: `.stagger-item` entrance, count badge computed from derived stats (e.g. under-MSRP = products where est market < msrp; above-MSRP movers = signalScore ≥ 70; high-spread traps = cards with spread ≥ 0.5; stale sources = live-less → all seed items count with "SEED" note; grade arbitrage = gradedEstimate ≥ 1.9 × rawMarket; character hype = name matches Charizard|Pikachu|Umbreon|Mew|Eevee; low-pop grails = glow secret; fast velocity = velocity FAST; suspicious outliers = spread ≥ 0.8). Panel lists up to 3 matching item names. Empty categories show which data source would activate them.
- [ ] Implement with a `computeRadar(products, cards)` helper in the same file, pure and unit-testable by inspection.

### Task 9: Portfolio upgrade

**Files:** Modify `src/components/dashboard/PixelPortfolio.tsx`.
**Interfaces:** Consumes `StatValue`, `Money`, `FloatingCard`, `CardOrbitGrid`, `SectionHeader`.
**Behavior:** Header row: total portfolio value (`StatValue` money count-up of Σ currentEstimatedValue), total unrealized G/L with explicit `+`/`−` sign AND color. Desktop table unchanged plus sign prefixes. Mobile (`md:hidden`): `CardOrbitGrid` of `FloatingCard`s per item (name, qty, current est., G/L signed, status chip; glow: grade→ultra, hold→rare, else common).
- [ ] Implement.

### Task 10: Settings upgrade

**Files:** Modify `src/components/dashboard/SettingsPanel.tsx` (becomes `"use client"`).
**Interfaces:** Consumes `useSourceStatus` (Task 11), `SkeletonPanel`, `EmptyState`; `env.ingestToken` row added.
**Behavior:** Keep readiness rows; add "Ingest token" row. Below: "SOURCE ADAPTERS" section via `useSourceStatus()` — loading → `SkeletonPanel`; error → `EmptyState`; ready → compact rows (label, kind chip, ENABLED/DISABLED, CRED yes/no). Booleans only.
- [ ] Implement.

### Task 11: Control Center (new module) + status hook

**Files:** Create `src/components/dashboard/ControlCenter.tsx`, `src/lib/use-source-status.ts`.
**Interfaces:**

```ts
// src/lib/use-source-status.ts
export type SourceStatusState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; adapters: AdapterStatus[] };
export function useSourceStatus(): SourceStatusState; // fetches GET /api/sources/status once on mount

// src/components/dashboard/ControlCenter.tsx
export function ControlCenter(); // no props
```

**Behavior:** Fetch via hook. Loading → grid of 4 `SkeletonPanel`s. Error → `EmptyState` with retry note. Ready → `CardOrbitGrid` of adapter cards (`FloatingCard`, glow: enabled+creds→rare, enabled→common, stub→common with dashed border): label, kind chip (`API`/`CSV`/`STUB`), ENABLED/DISABLED, credential present yes/no, last run/last success/last error from `lastRun` (or "never"), rate limit ("60/min" style or "—"), inserted/updated from lastRun, "Next run: manual" placeholder. Stubs show "Needs approval/API key" + policy notes. Never renders secret values.
- [ ] Implement.

### Task 12: Nav + shell + page wiring

**Files:** Modify `src/components/dashboard/DashboardApp.tsx`, `src/components/pixel/PixelShell.tsx`, `src/app/page.tsx`; Create `src/lib/live-data.ts`.
**Interfaces:**

```ts
// src/lib/live-data.ts (server-only usage from page.tsx)
export async function getLiveOverview(): Promise<LiveOverview | null>;
// Uses createBrowserSupabaseClient() from src/lib/supabase/client.ts (anon key; safe on the server).
// Returns null when the anon client is unconfigured or any query fails.
// Counts via poke_ views with { count: "exact", head: true }; lastSync = newest observed_at from
// poke_market_snapshots (order desc, limit 1). Wrap the whole thing in Promise.race with a
// 3000ms timer resolving null so a slow DB never blocks first paint.
```

**Behavior:**
- `page.tsx` becomes `async`; `const live = await getLiveOverview();` passed to `DashboardApp` as `live` prop.
- `DashboardApp`: `TabId` gains `"control"`. Tabs array: Arcade, Sealed, Cards, Radar, Portfolio, Control Center, Settings — each with an icon component (`IconArcade`, `IconBox`, `IconCard`, `IconRadar`, `IconFolder`, `IconSatellite`, `IconGear`).
- Layout: outer `div.lg:flex.lg:gap-5` → `nav.side-rail` (7 `.nav-item` buttons, `aria-selected`) + content `div.flex-1.min-w-0`. Old `.tab-bar` removed.
- Mobile: `.bottom-nav` with 5 primary items + `IconMore` "More" button (6 columns) toggling `.more-sheet` (Control Center + Settings items, scrim click closes). Content gets `pb-20 lg:pb-0` so the fixed bar never covers it.
- Active panel wrapped in `<div key={activeTab} className="tab-panel">` for crossfade.
- Lazy tabs: keep `MarketArcade` static; `SealedDex`, `CardValueLab`, `SignalRadar`, `PixelPortfolio`, `ControlCenter`, `SettingsPanel` via `next/dynamic` with `loading: () => <SkeletonPanel lines={8} />`.
- Prop pass-through: `<MarketArcade products cards env live />`, `<SignalRadar products cards />`, rest as today plus new components.
- `PixelShell`: replace "UUPM link active" text with a small live/seed indicator dot + label ("LIVE DB" when a new optional `liveMode?: boolean` prop is true, else "SEED MODE"); page passes `liveMode={Boolean(live)}`. PixelShell must accept and render it.
- [ ] Implement; ensure keyboard navigation works across rail/bottom nav (they are buttons).

### Task 13: README rewrite

**Files:** Modify `README.md`.
**Behavior:** Sections: Overview (3D pixel market intelligence, GBA collector terminal); Feature tour (7 modules, one line each); 3D card system (components + reduced-motion note); Run locally (unchanged commands); Environment (.env.local table incl. `POKEHUB_INGEST_TOKEN`); Shared database mode (`project_tag = POKE`, composite uniqueness, `poke_*` views); Supabase schema setup (apply `supabase/schema.sql`); API routes table (method/path/auth/purpose); Source adapters table (official APIs vs disabled stubs + policy stance: robots.txt/ToS respected, no CAPTCHA/anti-bot evasion); Scoring model (weights summary + new functions); Security notes (service role server-only, secrets never rendered, ingest token header); Disclaimer (collectible prices are estimates from heuristics/embedded API data; not financial advice).
- [ ] Rewrite preserving accurate existing content.

---

## Phase 3 — Integration, verification, migration, delivery (inline, sequential)

### Task 14: Verification loop

- [ ] `npm run typecheck` → fix until clean.
- [ ] `npm test` → all suites pass.
- [ ] `npm run build` → clean production build.
- [ ] `npm run score` → prints example scores.
- [ ] Preview verification: start dev server, check console for errors, snapshot each of the 7 tabs, verify mobile viewport (375px) bottom nav + card grids, verify reduced-motion via emulation, screenshot proof.

### Task 15: Apply schema to live shared Supabase

- [ ] Re-verify no table collisions (`list_tables`), then apply `supabase/schema.sql` as migration `pokehub_shared_schema_v0_3` via Supabase MCP `apply_migration`.
- [ ] Verify: `poke_sealed_products`, `poke_cards`, `poke_market_snapshots`, `poke_value_scores`, `poke_portfolio_items`, `poke_ingestion_runs` views exist; RLS enabled on all 7 POKEHUB tables; run `get_advisors` for security warnings.

### Task 16: Delivery

- [ ] Branch `feature/3d-supercharge` from main (work committed there phase-by-phase).
- [ ] Final commit: `Supercharge POKEHUB 3D dashboard and source adapters`.
- [ ] Push branch, open PR to main with summary body, merge (squash or merge commit — repo default), verify main contains the work.
