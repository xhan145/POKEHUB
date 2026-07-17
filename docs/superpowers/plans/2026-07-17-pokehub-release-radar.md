# POKEHUB Release Radar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Checkbox steps.

**Goal:** New Release Radar tab + `/api/v1/releases`: curated upcoming-release calendar with computed anticipation scores, historical set cadence, and a localStorage "saving for this" marker — flagship focus on the 30th Celebration line.

**Architecture:** Pure logic first (scoring + release math, TDD), then the curated seed, then the API endpoint (seed + DB pressure/cadence), then the lazy client tab wired into nav. Spec: `docs/superpowers/specs/2026-07-17-pokehub-release-radar-design.md` (exact formulas, thresholds, ordering).

**Tech Stack:** Existing only — Next.js route handlers, supabase-js anon reads, `node --import tsx --test`. Zero new dependencies.

## Global Constraints

- No invented dates: unannounced releases carry `date: null` → rendered "TBA".
- Anticipation: `0.6*avg(hype) + 0.25*clamp(marketPressure ?? 40) + 0.15*clamp(dataConfidence ?? 30)`, clamped 0–100. Tiers GRAIL ≥85 / HOT ≥70 / WARM ≥50 / else WATCH.
- Ordering in `buildUpcoming`: unreleased sorted by anticipation desc, then TBA entries (by anticipation desc), then released entries last. `groupByMonth`: chronological months, "TBA" group last.
- `/api/v1/releases`: standard envelope, `CACHE_OK`, `runtime="nodejs"`. DB failure degrades gracefully (seed still served, default pressure, `recentSets: []`) — NOT a 503.
- Saving marker: `localStorage` key `pokehub.savingFor` (JSON `string[]`), SSR-safe (read in effect only).
- Tab is `dynamic()` lazy; reduced-motion-safe; toggles are buttons with `aria-pressed`; date math in UTC.
- All timestamps injected (`nowMs`) in pure functions — no `Date.now()` inside logic under test.
- 2-space indent, double quotes; tests registered in package.json.

---

### Task 1: Types + anticipation scoring (TDD)

**Files:** Modify `src/types/pokehub.ts` (append), `src/workers/score-market.ts` (append), `src/workers/score-market.test.ts` (append), `package.json` (no change — suite already registered).

**Produces (EXACT):**
```ts
// types/pokehub.ts (append)
export type ReleaseKind = "set" | "sealed" | "collection";
export type ReleaseHypeInputs = { franchiseWeight?: number; scarcityRisk?: number; nostalgiaFactor?: number };
export type ReleaseSeedEntry = {
  id: string; name: string; kind: ReleaseKind; date: string | null;
  msrpTotal?: number; products?: string[]; announcementUrl?: string;
  hype: ReleaseHypeInputs; notes?: string;
};
export type AnticipationTier = "GRAIL" | "HOT" | "WARM" | "WATCH";
export type Anticipation = { score: number; tier: AnticipationTier };
export type UpcomingRelease = ReleaseSeedEntry & { anticipation: Anticipation; daysUntil: number | null; released: boolean };

// score-market.ts (append)
export function scoreAnticipation(input: { hype: ReleaseHypeInputs; marketPressure?: number; dataConfidence?: number }): number;
export function anticipationTier(score: number): AnticipationTier;
```

- [ ] Failing tests: max hype (100/100/100) + pressure 80 + confidence 90 → ≥85 (GRAIL); all-default (`{hype:{}}`) → `0.6*0 + 0.25*40 + 0.15*30 = 14.5` (WATCH); partial hype averages only provided inputs? NO — spec says avg of the three clamped inputs with missing = 0? Resolution (explicit): missing hype inputs default to 0 and the average is over all three keys. Test asserts `scoreAnticipation({hype:{franchiseWeight:90}}) = 0.6*(90/3)+0.25*40+0.15*30 = 32.5`. Clamp: inputs >100 clamp to 100. Tier thresholds at exactly 85/70/50 boundaries.
- [ ] Run → fail. Implement using existing `clampScore`. Run → pass (suite total grows).

### Task 2: Release math lib + curated seed (TDD)

**Files:** Create `src/lib/releases.ts`, `src/lib/releases.test.ts`, `src/data/releases-seed.json`; Modify `package.json` (append `src/lib/releases.test.ts` to test script).

**Produces (EXACT):** `daysUntil(dateIso, nowMs)`, `isReleased(dateIso, nowMs)`, `buildUpcoming(seed, pressureByRelease, nowMs)`, `groupByMonth(releases)` per spec signatures; seed JSON with `schemaVersion: 1` and ONE entry: the 30th Celebration flagship — `id "30th-celebration"`, kind "collection", `date: null` (TBA — no announced street date), `msrpTotal` = sum of the 17 seed products' MSRP (read `src/data/msrp-seed.json` at implementation time and compute the literal), `products` = the 17 exact names, hype `{ franchiseWeight: 100, scarcityRisk: 90, nostalgiaFactor: 100 }`, notes on the 30th-anniversary flagship line.

- [ ] Failing tests: `daysUntil(null,now)` → null; future date → ceil days (UTC, no DST drift: use `Date.UTC` parsing of "YYYY-MM-DD"); past → 0 + `isReleased` true; `buildUpcoming` ordering (dated-unreleased by anticipation desc, then TBA, then released); TBA flagship gets `daysUntil null, released false`; `groupByMonth` months chronological with "TBA" last; seed-shape test: parse the real JSON, assert every entry has id/name/kind/hype and date is null or `/^\d{4}-\d{2}-\d{2}$/`, ids unique.
- [ ] Run → fail. Implement. Run → pass. Register test file.

### Task 3: `/api/v1/releases` endpoint

**Files:** Create `src/app/api/v1/releases/route.ts`, `src/lib/api-v1/releases-repo.ts`.

**Produces (EXACT):**
```ts
// releases-repo.ts
export type ReleasePressure = { marketPressure: number; dataConfidence: number };
export async function getReleasePressure(productNames: string[]): Promise<ReleasePressure>;
// anon query sealed_products by name in(productNames); pressure = avg over matches of clamp(((estMarket-msrp)/msrp)*100 mapped: 0%→40, +50%→90, linear, clamped 0-100) using getEstimatedMarketPrice/getDerivedSealedStats when no live snapshot data; dataConfidence = clamp(matches/names.length*100). DB failure or zero matches → { marketPressure: 40, dataConfidence: 0 }.
export async function getRecentSets(limit?: number): Promise<{ name: string; releaseDate: string }[]>;
// from poke_cards raw_json set data is heavy — instead query poke_sets? it lacks dates. Resolution (explicit): one anon query per call on poke_cards selecting raw_json->set fields is too heavy; use rpc-free approach: select distinct set_name + set release date FROM a targeted query on poke_card_constellation? it lacks dates too. FINAL: query poke_cards with .select("set_name, raw_json->set->>releaseDate") is not expressible; instead select("set_name, raw_json") limit... too heavy. Use the existing sets endpoint data + one representative card per set: query poke_cards .select("set_id,set_name,raw_json").in("set_id", <ids from poke_sets>) is still heavy. SIMPLEST CORRECT: dedicated SQL view. Add to supabase/schema.sql + apply migration pokehub_set_dates: create view poke_set_dates as select distinct on (set_id) set_id, set_name, (raw_json->'set'->>'releaseDate') as release_date from cards where project_tag='POKE' order by set_id; then getRecentSets = .from("poke_set_dates").select("set_name, release_date").order("release_date",{ascending:false}).limit(limit ?? 8), mapping to { name, releaseDate }. DB failure → [].
```
Route: import seed JSON; `getReleasePressure` once for the flagship's products (map keyed by release id); `buildUpcoming(seed.releases, pressureMap, Date.now())`; `getRecentSets()`; `singleResponse({ upcoming, recentSets }, CACHE_OK)`. Never 503 (seed is local); repo failures degrade per constraints.

- [ ] Append `poke_set_dates` view to `supabase/schema.sql`; orchestrator applies migration before ship.
- [ ] Implement repo + route; `npx tsc --noEmit` clean; build shows `ƒ /api/v1/releases`.

### Task 4: Release Radar tab + nav + saving marker

**Files:** Create `src/components/dashboard/ReleaseRadar.tsx`, `src/lib/use-releases.ts`, `src/lib/use-saving-for.ts`; Modify `src/components/dashboard/DashboardApp.tsx`, `src/components/pixel/icons.tsx` (add `IconCalendar`), `README.md` (Release Radar section + /api/v1/releases row).

**Produces:**
```ts
// use-releases.ts
export type ReleasesState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; upcoming: UpcomingRelease[]; recentSets: { name: string; releaseDate: string }[] };
export function useReleases(): ReleasesState; // fetch /api/v1/releases once
// use-saving-for.ts
export function useSavingFor(): { ids: string[]; toggle(id: string): void; has(id: string): boolean };
// localStorage "pokehub.savingFor", JSON string[]; read in useEffect (SSR-safe); write-through on toggle.
```
UI per spec: flagship hero (top of `buildUpcoming` order — unreleased highest anticipation), tier chip + meter bar (div width %, text value beside), countdown or TBA badge, MSRP total via `Money`, SAVING FOR THIS toggle (`aria-pressed`, ≥44px); monthly groups via `groupByMonth` as stagger-entrance pixel cards; cadence strip from `recentSets` + average-gap line (compute mean day gap between consecutive dates, render "a new set roughly every N weeks"); saving summary bar when `ids.length > 0` (names, combined `msrpTotal` sum, nearest countdown). Loading `SkeletonPanel`, error `EmptyState`. Nav: `TabId` += `"releases"`, More-sheet entry, `dynamic()` lazy like ControlCenter.

- [ ] Implement; `npx tsc --noEmit` + `npm test` + `npm run build` all green.

### Task 5 (ship): migrate, verify, deploy

- [ ] Apply migration `pokehub_set_dates` (the view) via Supabase MCP; verify it returns 173 rows with dates.
- [ ] Local smoke vs live DB: `/api/v1/releases` → flagship GRAIL w/ TBA + 17 products + msrpTotal; recentSets 8 rows newest-first. Dev-server DOM smoke: tab renders hero + calendar + cadence; toggle persists across reload.
- [ ] Commit, push main → auto-deploy; live-verify endpoint + tab; memory + ledger update; final report.
