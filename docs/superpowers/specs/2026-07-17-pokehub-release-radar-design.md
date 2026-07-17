# POKEHUB Release Radar — Design Spec

Date: 2026-07-17
Status: Approved (new tab; curated seed + computed anticipation; save-for-this marker).

## Goal

A **Release Radar** module answering: *when are the next drops, how anticipated is each, and which am I saving for?* Flagship focus on the Pokémon TCG 30th-anniversary line. Honest data only: curated seed for upcoming releases (dates get announced product-by-product; no lawful API provides a forward street-date calendar), computed anticipation labeled EST, real historical cadence from our own 173 sets.

## Decisions

| Decision | Choice |
|---|---|
| Placement | New 9th module "Release Radar" (More sheet alongside Constellation/Control Center/Settings). Lazy tab per existing pattern. |
| Upcoming data | Curated `src/data/releases-seed.json` edited by the owner (push → auto-deploy). NO invented dates — unannounced = `date: null` → "TBA". |
| Anticipation | Pure `scoreAnticipation()` in the scoring engine: manual hype inputs 60% + computed market pressure 25% (above-MSRP preorder premium when the release's products exist in `sealed_products` / derived stats) + data confidence 15%. Clamped 0–100. Tiers: GRAIL ≥85, HOT ≥70, WARM ≥50, else WATCH. |
| Save-for-this | Per-release toggle persisted in `localStorage` (`pokehub.savingFor` = release ids). No accounts, no server state. |
| API | `GET /api/v1/releases` in the public API (standard envelope + CACHE_OK). |

## Data model

`src/data/releases-seed.json`:
```jsonc
{ "schemaVersion": 1, "releases": [ {
  "id": "30th-celebration",            // kebab id, unique
  "name": "Pokémon TCG: 30th Celebration",
  "kind": "collection",                 // "set" | "sealed" | "collection"
  "date": null,                         // "YYYY-MM-DD" or null = TBA
  "msrpTotal": 566.78,                  // optional; sum of line MSRP
  "products": ["Pokémon TCG: 30th Celebration Ultra-Premium Collection", "..."], // names matching sealed_products.name
  "announcementUrl": "https://...",     // optional, official announcement
  "hype": { "franchiseWeight": 100, "scarcityRisk": 90, "nostalgiaFactor": 100 },
  "notes": "30th anniversary flagship line."
} ] }
```
Seed contents at ship: the 30th Celebration line (grouping the 17 tracked sealed products, flagship) + the known 2026 set cadence entries (recent sets with real dates from our DB; upcoming entries only if officially announced — otherwise TBA). Owner maintains it.

Types (`src/types/pokehub.ts`, append): `ReleaseKind`, `ReleaseHypeInputs`, `ReleaseSeedEntry`, `AnticipationTier ("GRAIL"|"HOT"|"WARM"|"WATCH")`, `Anticipation { score: number; tier: AnticipationTier }`, `UpcomingRelease = ReleaseSeedEntry & { anticipation: Anticipation; daysUntil: number | null; released: boolean }`.

## Scoring (`src/workers/score-market.ts`, append; pure, tested)

```ts
export function scoreAnticipation(input: {
  hype: { franchiseWeight?: number; scarcityRisk?: number; nostalgiaFactor?: number };
  marketPressure?: number;   // 0-100: above-MSRP preorder premium signal, when available
  dataConfidence?: number;   // 0-100: how much real data backs the pressure signal
}): number;
// 0.6 * avg(clamped hype inputs) + 0.25 * clamp(marketPressure ?? 40) + 0.15 * clamp(dataConfidence ?? 30)
export function anticipationTier(score: number): AnticipationTier; // thresholds above
```

## Release logic (`src/lib/releases.ts`, pure, tested)

```ts
export function daysUntil(dateIso: string | null, nowMs: number): number | null; // null for TBA; negative→0 & released
export function isReleased(dateIso: string | null, nowMs: number): boolean;
export function buildUpcoming(seed: ReleaseSeedEntry[], pressureByRelease: Record<string, { marketPressure: number; dataConfidence: number }>, nowMs: number): UpcomingRelease[];
// sorts: flagship = highest anticipation first among unreleased; TBA after dated; released last
export function groupByMonth(releases: UpcomingRelease[]): { month: string; releases: UpcomingRelease[] }[]; // "TBA" group last
```

## API

`GET /api/v1/releases` (`runtime="nodejs"`, CACHE_OK): server imports the seed directly; computes per-release market pressure from `sealed_products` + derived stats when `products` match rows (repo fn `getReleasePressure(names)` → avg above-MSRP% mapped to 0-100, confidence from match count); returns `singleResponse({ upcoming: UpcomingRelease[], recentSets: [{ name, releaseDate }] })` — `recentSets` = 8 newest distinct sets from the DB (release-cadence strip). DB failure → seed still served with default pressure (graceful, not 503, since the seed is local); recentSets empty.

## UI — `ReleaseRadar.tsx` (client, lazy 9th tab)

- Fetch `/api/v1/releases` via a small hook (loading skeleton / error EmptyState per house pattern).
- **Flagship hero**: top unreleased release — name, GRAIL/tier chip, anticipation meter bar, countdown (`StatValue`-style count-up, "TBA" when dateless), MSRP total, product count, notes, announcement link, SAVING FOR THIS toggle.
- **Monthly calendar**: releases grouped by month (pixel cards: date badge or TBA, name, kind chip, anticipation bar + tier, saving toggle). Stagger-entrance, reduced-motion safe.
- **Cadence strip**: "Recent sets" horizontal list (name + date) + average gap line ("a new set roughly every N weeks").
- **Saving summary bar** (when ≥1 toggled): pinned panel listing saved-for releases, combined MSRP, nearest countdown. Clearable per item.
- Toggle persistence: `localStorage` key `pokehub.savingFor` (JSON string[]); SSR-safe (read in effect).
- a11y: toggles are real buttons with `aria-pressed`, meter has text value, countdown readable text.

## Nav

`DashboardApp`: `TabId` += `"releases"`; label "Release Radar", icon `IconCalendar` (new, house SVG style); More sheet; `dynamic()` lazy like Constellation/others.

## Testing

`releases.test.ts` + scoring cases: daysUntil (future/past/TBA/DST-safe via UTC), isReleased, buildUpcoming ordering (flagship first, TBA after dated, released last), groupByMonth (TBA last), scoreAnticipation weights + clamps, anticipationTier thresholds. Seed-shape validation test (every entry has id/name/kind/hype; date null or ISO). Registered in package.json.

## Out of scope

Push/email release reminders; scraping retailer pages for dates; price-drop alerts; server-side accounts for the saving marker; editing UI for the seed.

## Acceptance criteria

- `GET /api/v1/releases` live: upcoming with anticipation+countdowns, recentSets cadence.
- Release Radar tab renders: flagship hero (30th Celebration as GRAIL), monthly groups, cadence strip, working saving toggle persisting across reloads.
- No invented dates: unannounced entries show TBA.
- Gates green (typecheck, tests incl. new suites, build); deployed; live-verified.
