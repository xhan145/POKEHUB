# POKEHUB 3D Pixel Market Intelligence — Design Spec

Date: 2026-07-06
Status: Approved approach A (CSS-3D-first), sections 1 approved explicitly; 2–4 presented; pending final spec review.

## Goal

Transform POKEHUB into a hyper-responsive, 3D pixel-card market intelligence dashboard for Pokémon cards and sealed products: a retro GBA collector terminal fused with a modern 3D trading-card vault. All POKEHUB rows in the shared Supabase DB use `project_tag = 'POKE'`.

## Decisions made during brainstorming

| Decision | Choice |
|---|---|
| Existing uncommitted working tree | Commit as its own baseline commit first, then build on top |
| Live database | Apply `supabase/schema.sql` to the shared Supabase project "The Collective" (`qfzguujtjloskyxcdbon`) — verified additive, zero table-name collisions with the 64 existing tables. Schema only; no seed rows pushed this pass |
| 3D approach | **A: CSS-3D-first.** Pure CSS 3D transforms + small React hooks. Zero new runtime dependencies. React Three Fiber deferred; `CardStage` is the future swap seam |
| Animation library | None. Hand-rolled rAF hooks + CSS cubic-bezier overshoot curves |
| Design grounding | UUPM (ui-ux-pro-max) design system: Retro-Futurism, felt-green/gold on dark, Press Start 2P + VT323 (tempered — see typography) |

## Section 1 — Visual language & 3D card system (approved)

### Tokens (in `src/styles/globals.css` as CSS variables)

- Keep `#08070d` CRT base + scanlines.
- Primary felt-green `#15803D`; accent/CTA gold `#D97706`; existing emerald/yellow retained.
- Rarity glow tokens: common→slate, rare→emerald, ultra→amber, secret→fuchsia.
- Semantic tokens (`--color-primary`, `--color-accent`, `--glow-<rarity>`, motion duration/easing tokens) — no raw hex in components.

### Typography

- **Press Start 2P**: POKEHUB title, tab labels, kickers only (10–14px, letter-spaced).
- **VT323**: stat numerals and badges.
- System sans remains for body/table text (data density and readability).
- Loaded via `next/font/google` (self-hosted, no CLS). No CSS `@import`.

### Components & hooks (zero new deps)

| File | Responsibility |
|---|---|
| `src/lib/use-tilt.ts` | Pointer-tracked tilt (max ~10° rotateX/Y via CSS vars), spring-back on leave, tap-only on touch, no-op under reduced motion |
| `src/lib/use-count-up.ts` | rAF numeric counter; instant final value under reduced motion |
| `src/components/three/CardStage.tsx` | `perspective: 1000px` scene wrapper; future R3F swap seam |
| `src/components/three/FloatingCard.tsx` | Idle float loop (4–6s, staggered `animation-delay`), tilt-on-hover, rarity/signal glow (`box-shadow`), press scale 0.97, front/back faces with `backface-visibility: hidden` |
| `src/components/three/CardFlip.tsx` | Click/tap flips 180° to stats back-face; click/Escape/blur restores; brief 360° spin variant on select |
| `src/components/three/CardOrbitGrid.tsx` | Responsive grid of FloatingCards, staggered entrance (30–50ms/item), per-row `translateZ` depth |

### Motion rules

- `transform`/`opacity` only; no layout-affecting animation.
- Micro-interactions 150–300ms; ease-out enter, ease-in exit.
- One global `@media (prefers-reduced-motion: reduce)` block: kills float/tilt/spin, flips become crossfades, counters render instantly.
- Touch targets ≥44px; visible focus states; cursor-pointer on clickables; SVG icons only (no emoji).

## Section 2 — Modules, navigation & UX

### Navigation

- 7 modules: Market Arcade, Sealed Dex, Card Lab, Signal Radar, Portfolio, **Control Center (new)**, Settings.
- Desktop ≥1024px: left rail, icon+label, gold active indicator.
- Mobile: fixed bottom nav with 5 primary tabs (Arcade, Sealed, Cards, Radar, Portfolio) + "More" sheet for Control Center and Settings (bottom nav ≤5 rule).
- Tab switches crossfade ~200ms; content `min-height` reserved (no jank).
- `DashboardApp` stays the client tab owner; tab bodies lazy-loaded via `next/dynamic` (initial render ships only Market Arcade).

### Module upgrades (enhance existing components, do not rewrite)

- **Market Arcade**: count-up stat tiles; new tiles for snapshot count, source freshness, last sync (live DB when configured, seed-derived otherwise); top-movers strip as small FloatingCards; skeletons while hydrating.
- **Sealed Dex**: desktop table with full columns (product, MSRP, market estimate, above-MSRP %, active listings, sold comps, velocity, reprint risk, signal badge, last checked — placeholder-scored fields labeled "estimate" until real snapshots exist, derived deterministically by extending the existing heuristics in `src/lib/pokehub-data.ts` (badge/multiplier pattern), never random); mobile = CardOrbitGrid; search + productType/badge filters + sortable headers; click opens focus-trapped detail drawer (Esc/swipe-down dismiss) with large CardFlip product card.
- **Card Lab**: FloatingCard grid with real card images (mock set now, DB later); search + rarity/set/score filters; flip reveals raw market, graded estimate, population placeholder, spread, liquidity/confidence/signal scores, status badge.
- **Signal Radar**: 9 alert categories (under-MSRP sealed, above-MSRP movers, high-spread traps, stale sources, grade arbitrage, character hype, low-pop grails, fast-velocity commons, suspicious outliers) as animated panels with staggered entrance, count badges, items derived from the scoring engine over available data; empty states explain which data source lights each up.
- **Portfolio**: existing table + 3D inventory cards on mobile; total-value count-up header; unrealized G/L shown with sign + color (never color alone).
- **Control Center (new)**: adapter cards from the source registry — enabled state, credential presence (boolean only), last run/success/error, rate-limit status, records inserted/updated, next-run placeholder; disabled stubs show "Needs approval/API key".
- **Settings**: extend `SettingsPanel` with the full credential-presence checklist and adapter status list (shared component with Control Center). Never displays secret values.

## Section 3 — Data & ingestion architecture

### Source adapter layer (`src/lib/sources/`)

`types.ts` defines:

```ts
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
```

`source-registry.ts` enumerates all adapters and derives UI status.

| Adapter | Behavior |
|---|---|
| `pokemon-tcg.ts` | `api.pokemontcg.io/v2`; `X-Api-Key` when `POKEMON_TCG_API_KEY` set (keyless works at lower rate limits); canonical card identity/images/sets/rarity; extracts embedded TCGplayer/Cardmarket price fields into market snapshots |
| `ebay-browse.ts` | OAuth client-credentials flow (`EBAY_CLIENT_ID`/`EBAY_CLIENT_SECRET`); Browse `item_summary/search` for active listings; disabled "credentials missing" state when unset; no page scraping |
| `pricecharting.ts` | Token-gated (`PRICECHARTING_TOKEN`); 1 req/sec token-bucket throttle; in-memory TTL cache; disabled when tokenless |
| `manual-csv.ts` | Parses CSV (name, price, kind, source) into `project_tag = 'POKE'` rows |
| `scrape-policy.ts` + stubs | `ScrapePolicy` type records robots.txt/ToS status per source; disabled `scraper_stub` entries for TCGplayer-direct, Cardmarket-direct, PSA/CGC/BGS population reports, each documenting required approval/key. Nothing scrapes by default |

### API routes (`src/app/api/`)

- `GET /api/sources/status` — registry snapshot; booleans only, never secret values.
- `POST /api/ingest/msrp` — seed/CSV → `sealed_products`.
- `POST /api/ingest/pokemon-tcg` — cards + embedded prices.
- `POST /api/ingest/market-snapshot` — validated snapshot writes.

Rules: server-only Supabase service client; Zod-validated payloads; structured `{ ok, data | error, run }` JSON; per-run `IngestionRun` accounting (inserted/updated/errors); graceful structured failure when Supabase/keys absent; ingest POSTs protected by shared-secret header `POKEHUB_INGEST_TOKEN` (added to `.env.example`; routes return structured 401 when it is set and missing/wrong, and structured 503 when it is unset).

### Scoring engine (`src/workers/score-market.ts`)

- Keep existing weighted functions and weights.
- Add named exports: `scoreSourceFreshness` (hours-since-observation decay), `scoreLiquidity` (active listings + sold comps), `scoreSpreadRisk` (low/high spread vs. mid), plus `scoreCardValueSignal` / `scoreSealedProductSignal` / `scoreDataConfidence` wrappers so old and new names both work.
- All pure, all clamped 0–100, all covered in `score-market.test.ts`.

### Types (`src/types/pokehub.ts`)

Extend with: `SourceAdapter`, `SourceFetchInput`, `SourceFetchResult`, `SourceCredentialStatus`, `IngestionRun`, `IngestionResult`, `ScrapePolicy`, `MarketSnapshot`, `ValueScore`, `DataSource` — camelCased to match `schema.sql` columns. (`ProjectTag`, `SealedProduct`, `CardIdentity`, `PortfolioItem`, `SignalBadge` already exist.)

## Section 4 — Supabase, error handling, testing, delivery

### Supabase

- Apply `supabase/schema.sql` to "The Collective" project as a named migration via Supabase MCP (verified additive; no name collisions).
- Add `ingestion_runs` table (project-tagged) so Control Center run history survives restarts; include it in `schema.sql`.
- App reads via `poke_*` views or `.eq("project_tag", "POKE")`; writes only via server routes using `project-tag.ts`.
- `.env.local` gets project URL + anon key locally; never committed; service role key optional (ingest only).

### Error handling

- Client: every data panel has skeleton/error/empty states; Supabase failure falls back to seed/mock data with a "local data" badge.
- Server: adapters return typed failures (`disabled` / `no_credentials` / `rate_limited` / `error`); registry and routes surface them; no unstructured 500s.

### Testing

Extend existing `node --test` suites: scoring (new exports, clamping, freshness decay), project-tag invariants, adapter registry (credential detection from env, stubs stay disabled), CSV parser, Zod round-trip per API payload. UI verified via preview workflow (snapshot + reduced-motion checks); no new test framework.

### Delivery

1. Commit existing WIP as baseline on `main`.
2. Branch `feature/3d-supercharge`.
3. Phases: tokens/3D system → modules → adapters/routes → schema application → README.
4. Gate: `npm run typecheck`, `npm run build`, `npm test`, `npm run score` all green.
5. Push, open PR, merge. Final commit message: `Supercharge POKEHUB 3D dashboard and source adapters`.

## Non-negotiables (from product prompt)

- Every shared-table write includes `project_tag: 'POKE'`; reads filter by tag or use `poke_*` views.
- No global uniqueness constraints ignoring `project_tag`; composite uniqueness only.
- `SUPABASE_SERVICE_ROLE_KEY` never in client code; no secret values ever rendered.
- `.env.local` never committed; MSRP seed data never removed.
- App boots and renders fully with zero API keys.
- No scraping that violates robots.txt/ToS; no CAPTCHA/anti-bot evasion; stubs stay disabled.

## Out of scope (this pass)

- React Three Fiber rendering (seam left in `CardStage`).
- Pushing seed rows to the live DB.
- Real PSA/CGC/BGS population data (placeholder fields only).
- Portfolio CRUD persistence (reads DB if rows exist; mock otherwise; editing UI is a later pass).

## README updates

Overview, 3D dashboard features, shared-DB mode + `project_tag = POKE`, `.env.local` setup, schema setup, ingestion routes + `POKEHUB_INGEST_TOKEN`, adapter table (official APIs vs. permitted stubs), scoring model, security notes, collectible-market disclaimer ("not financial advice; market estimates are heuristics").
