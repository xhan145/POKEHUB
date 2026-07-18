# POKEHUB Release Constellation — Design Spec

Date: 2026-07-17
Status: Approved (3D hero above the calendar inside the Release Radar tab).

## Goal

Render the Release Radar as a GPU-accelerated 3D orbit view (WebGL via the vendored constellation engine) at the top of the Release Radar tab: releases as glowing orbs whose visual channels encode anticipation, product moons around each release, the recent-set cadence as its own constellation, and a live gold ring on anything you're saving for. The existing HTML calendar below remains the accessible representation.

## Node tree & channels (`src/lib/constellation/release-source.ts`, pure, tested)

```ts
export function buildReleaseFlatNodes(
  upcoming: UpcomingRelease[],
  recentSets: { name: string; releaseDate: string }[],
  savingIds: string[]
): FlatNode[];
export const TIER_COLOR: Record<AnticipationTier, string>;
// GRAIL "#E879F9", HOT "#F2C438", WARM "#4C86D6", WATCH "#8892A0"
```

Tree: root → cluster `upcoming` (label `UPCOMING (n)`) + cluster `recent-sets` (label `RECENT SETS (n)`); clusters omitted when empty.
- Release node `release:<id>` under `upcoming`: color `TIER_COLOR[tier]`; `mass = clamp(log10((msrpTotal ?? 0)+1)/3, 0.05, 1)`; `luminosity = anticipation.score/100`; `anomaly = savingIds.includes(id) ? "warn" : "none"`; label `name · <daysUntil>d` or `name · TBA`; `data` = the release.
- Product moon `product:<releaseId>:<index>` under its release: label = product name; color = the release's tier color; `mass 0.1`; `luminosity 0.3`; `data = { productName, releaseId }`.
- Set node `set:<index>` under `recent-sets`: label `name · YYYY-MM-DD`; color `#4CA64C`; `mass 0.15`; `luminosity = 0.9 - index*0.08` clamped ≥0.2 (newest brightest); `data = { name, releaseDate }`.
Deterministic; no randomness.

## Component (`src/components/dashboard/ReleaseConstellation.tsx`)

Client; imported by ReleaseRadar via `dynamic(..., { ssr: false, loading: SkeletonPanel })` so `three` stays lazy. Props:
```ts
{ upcoming: UpcomingRelease[]; recentSets: { name: string; releaseDate: string }[];
  savingIds: string[]; onToggleSaving(id: string): void }
```
- Provider = `new HierarchicalAggregator(buildTreeSource(buildReleaseFlatNodes(...)))`, memoized on inputs (savingIds changes rebuild → ring updates live).
- `<ConstellationView provider theme={POKE_THEME} budget={500} bloom style={{height:"55vh"}} onSelect={...} />`.
- HUD overlay (absolute, pointer-events-none except panel): legend line ("orb = release · size = MSRP · glow = anticipation · ring = saving"); on release select, a panel with name, tier chip, countdown/TBA, `Money(msrpTotal)`, SAVE toggle button (`aria-pressed`, calls `onToggleSaving`); product select shows product name + parent release; dismiss on cluster select/null.
- Guards: `isWebglAvailable()` false or `prefers-reduced-motion` → render a single-line note ("3D view off — the calendar below has everything") instead of the canvas. Engine dispose handled by ConstellationView.

## Shared theme refactor

Extract the `POKE_THEME` const currently inside `ConstellationModule.tsx` to `src/lib/constellation/poke-theme.ts` (`export const POKE_THEME: Theme`); both ConstellationModule and ReleaseConstellation import it. No visual change.

## Integration

`ReleaseRadar.tsx`: render `<ReleaseConstellation>` between the SectionHeader and the saving bar, only when `state.status === "ready"`; pass `savingFor.ids` + `savingFor.toggle`. Everything below unchanged.

## Testing

`release-source.test.ts` (node:test, registered in package.json): root has 2 clusters / omits empty ones; release channel mapping (tier color, mass log bounds, luminosity from score, warn ring only for saved ids, TBA vs `Nd` labels); 17 product moons parented correctly; recent-set luminosity ordering; determinism (deepEqual twice).

## Out of scope

Orbit-line date axis; editing seed from the 3D view; instancing/LOD beyond the engine's defaults (29 nodes today).

## Acceptance

Tests + typecheck + build green; tab shows the galaxy above the calendar; selecting the 30th orb shows the HUD with working SAVE toggle that updates the ring; WebGL/reduced-motion fallback line renders; deployed + live-verified.
