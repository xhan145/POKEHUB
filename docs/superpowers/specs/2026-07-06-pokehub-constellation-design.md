# POKEHUB Card Constellation — Design Spec

Date: 2026-07-06
Status: Approved (energy-type galaxies via backfill; new tab; vendored WebGL engine).

## Goal

A new **Constellation** module: a full-screen WebGL galaxy of all 20,359 cards, grouped into energy-type galaxies, where orb **color = energy type**, **size/warp = market price**, **glow = trust/freshness**, and a **warning ring = stale/unverified**. Drill into a galaxy to see its cards; click a card to open the existing detail drawer. Reuses the `~/constellation` engine and the trust engine we just built.

## Decisions

| Decision | Choice |
|---|---|
| Engine | Vendor `~/constellation/src` into `src/lib/constellation/` (Vercel builds only the repo; external `file:` deps can't deploy). Add `three` as a dependency. |
| Grouping | Energy type (`types[0]`), backfilled. Trainer/Energy supertype cards become their own galaxies. No axis switcher this pass (YAGNI; set/rarity are future axes behind the same source builder). |
| Placement | New 8th nav tab "Constellation", lazy-loaded (`next/dynamic`, `ssr:false`) so it never touches the rest of the app's bundle. |
| Data | New `poke_card_constellation` view + `GET /api/v1/constellation`; client builds the tree with the engine's `buildTreeSource` + `HierarchicalAggregator`. |

## Energy-type backfill

The stored `raw_json` lacks `types` (the ingest never requested it). Fix:
1. Worker `src/workers/ingest-pokemon-tcg.ts`: add `types` to the API `select`; add `types` to `CardSchema` (`z.array(z.string()).optional()`); store `types: card.types ?? []` in `toCardRow`. Add a `--skipSnapshots` flag that skips the `market_snapshots` insert (so this metadata backfill does NOT add more duplicate snapshots).
2. Migration `pokehub_card_types`: `alter table public.cards add column if not exists types text[] not null default '{}';`.
3. One-time re-ingest: `npm run ingest:pokemon -- --pageSize=250 --maxPages=90 --delayMs=2000 --skipSnapshots` populates `types` (upsert updates existing rows).

## Data view + endpoint

Migration `pokehub_constellation_view` — per-card latest price per source + type:
```sql
create or replace view public.poke_card_constellation
with (security_invoker = true) as
with latest as (
  select distinct on (item_ref, source) item_ref, source, market, observed_at
  from public.market_snapshots
  where project_tag = 'POKE' and item_kind = 'card' and market is not null
  order by item_ref, source, observed_at desc
)
select
  c.pokemon_tcg_id as id,
  c.name,
  c.rarity,
  c.set_name,
  coalesce(nullif(c.types[1], ''),
    case c.supertype when 'Trainer' then 'Trainer' when 'Energy' then 'Energy' else 'Colorless' end) as type,
  max(l.market) filter (where l.source = 'tcgplayer')  as market_tcgplayer,
  max(l.market) filter (where l.source = 'cardmarket')  as market_cardmarket,
  max(l.observed_at) as newest_observed
from public.cards c
left join latest l on l.item_ref = c.pokemon_tcg_id
where c.project_tag = 'POKE'
group by c.pokemon_tcg_id, c.name, c.rarity, c.set_name, c.types, c.supertype;
grant select on public.poke_card_constellation to anon, authenticated;
```

`GET /api/v1/constellation` (`src/app/api/v1/constellation/route.ts`, `runtime="nodejs"`, cache `CACHE_OK`): reads the view, computes each card's trust via `computeTrust` fed the (tcgplayer, cardmarket) latest prices, returns:
```jsonc
{ "data": { "total": 20359,
    "types": [{ "type": "Fire", "count": 1234 }, ...],       // galaxy summary
    "cards": [{ "id": "sv3pt5-183", "name": "Charizard ex", "type": "Fire",
                "price": 45.21, "tier": "VERIFIED", "rarity": "...", "set": "..." }] },
  "count": 20359, "totalCount": 20359 }
```
`price` = `market_tcgplayer ?? market_cardmarket ?? 0`. Repo error → 503. Payload is ~20k compact rows (gzip ≈ a few hundred KB) — acceptable for a lazily-loaded viz tab.

## Source builder (`src/lib/constellation/card-source.ts`, pure, unit-tested)

Note: this file lives ALONGSIDE the vendored engine but is POKEHUB-authored (the engine copy under `src/lib/constellation/{core,react,providers,encodings}` is not modified).
```ts
export type ConstellationCard = { id: string; name: string; type: string; price: number; tier: string; rarity: string; set: string };
export type TypeSummary = { type: string; count: number };
export function buildCardFlatNodes(cards: ConstellationCard[], types: TypeSummary[]): FlatNode[];
// root -> one cluster per type {id:`type:${type}`, parentId:null, node:{ color: TYPE_COLOR[type], label:`${type} (${count})` }}
//      -> one leaf per card {id:`card:${id}`, parentId:`type:${type}`, node:{ color, mass, luminosity, anomaly, label:name, data:card }}
// mass = clamp(log10(price+1)/3, 0.05, 1)   (≈ $0→0.05, $10→0.34, $1000→1)
// luminosity = TIER_GLOW[tier] (VERIFIED 1, SOLID 0.7, SINGLE_SOURCE 0.45, STALE 0.2, NONE 0.1)
// anomaly = tier==="STALE" ? "warn" : tier==="NONE" ? "error" : "none"
// color = TYPE_COLOR[type] ?? TYPE_COLOR.Other
export const TYPE_COLOR: Record<string, string>;   // canonical TCG palette (below)
```
Palette: Grass `#4CA64C`, Fire `#E8503A`, Water `#4C86D6`, Lightning `#F2C438`, Psychic `#A24CC8`, Fighting `#B85C38`, Darkness `#3A3A4A`, Metal `#8A97A6`, Dragon `#C9A227`, Fairy `#E489B1`, Colorless `#C9C6BE`, Trainer `#5AA0A0`, Energy `#9B7ED6`, Other `#8892A0`.

## Module (`src/components/dashboard/ConstellationModule.tsx`, client, dynamic-imported)

- `useConstellationData()` hook: fetch `/api/v1/constellation`; loading → `SkeletonPanel`; error → `EmptyState`.
- Build `provider = new HierarchicalAggregator(buildTreeSource(buildCardFlatNodes(cards, types)))`; render `<ConstellationView provider={provider} theme={POKE_THEME} budget={2500} bloom onSelect={...} onExpand={...} />` inside a tall (`70vh`) `card-stage`-style container.
- `POKE_THEME`: dark background matching the app (`#08070d`), emerald/gold accents.
- `onSelect` with a leaf node → open the existing `DetailDrawer` (image via `/api/v1/cards/{id}` or the card payload) with the trust breakdown; cluster select → let the engine drill in.
- HUD overlay: total cards, current focus/galaxy, a one-line legend (size=price, glow=trust, ring=stale).
- **Fallback:** if `!window.WebGLRenderingContext` / WebGL context creation fails / `prefers-reduced-motion`, render a static panel: the type galaxies as a `CardOrbitGrid` of type chips with counts + a "your browser/settings disabled the live galaxy — browse cards in Card Lab" link. Never crash.

## Nav wiring

`DashboardApp.tsx`: `TabId` gains `"constellation"`; add to the tabs array with an icon (`IconConstellation` — a small star-cluster SVG added to `icons.tsx`); rail + bottom-nav "More" sheet placement (keeps 5 primary + More). Lazy: `const ConstellationModule = dynamic(() => import("./ConstellationModule"), { ssr:false, loading: () => <SkeletonPanel lines={10} /> })`.

## Build / deploy

- Vendor `~/constellation/src/{core,react,providers,encodings}` → `src/lib/constellation/` verbatim (relative imports preserved; `three` import resolves from POKEHUB `node_modules`).
- `package.json`: add `three` (dependencies) + `@types/three` (devDependencies). `npm install`.
- `next.config.js` unchanged (engine is app source now; no `transpilePackages`).
- Lazy load keeps `three` out of the initial bundle.

## Error handling

Endpoint 503 on DB failure. Module shows error/empty/fallback states, never blocks the app. Engine `dispose()` on unmount (the vendored `ConstellationView` already handles this). Cards with no price → mass floor 0.05, tier NONE (dim, error ring) — honest "unpriced".

## Testing

- `card-source.test.ts` (node:test): root→type→card tree shape; mass log-scaling bounds ($0→0.05, high→≤1); tier→luminosity/anomaly mapping; Trainer/Energy pseudo-galaxies; unknown type → Other color; deterministic.
- Vendored engine keeps its own unit tests (aggregator/layout/encodings/theme) — run them under POKEHUB's runner or leave as the engine's; note in the plan. WebGL itself verified via live smoke (DOM eval: canvas present, no console errors), not unit tests.
- `package.json` test list gains `card-source.test.ts`.

## Out of scope

Axis switcher (set/rarity); server-side viewport paging (client holds the 20k tree — the engine aggregates it); animating individual card art onto orbs; VR/XR.

## Acceptance criteria

- `types` backfilled (`select count(*) from poke_cards where types <> '{}'` ≈ Pokémon count); `poke_card_constellation` returns rows with type + prices.
- `GET /api/v1/constellation` returns the galaxy summary + compact cards with tiers.
- New Constellation tab renders a WebGL galaxy live (canvas present, no console errors); clusters by type; clicking a card opens the drawer; fallback works with WebGL disabled.
- `npm run typecheck`, `npm test` (incl. card-source), `npm run build` green; `three` lazy (not in the main chunk).
- Committed, pushed, deployed, verified.
