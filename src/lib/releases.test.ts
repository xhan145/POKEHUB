import assert from "node:assert/strict";
import test from "node:test";

import releasesSeed from "@/data/releases-seed.json";
import type { ReleaseSeedEntry } from "@/types/pokehub";

import { buildUpcoming, daysUntil, groupByMonth, isReleased } from "./releases";

const NOW = Date.UTC(2026, 6, 17); // 2026-07-17

function entry(overrides: Partial<ReleaseSeedEntry>): ReleaseSeedEntry {
  return {
    id: "x",
    name: "X",
    kind: "set",
    date: null,
    hype: {},
    ...overrides
  };
}

test("daysUntil handles TBA, future, and past dates in UTC", () => {
  assert.equal(daysUntil(null, NOW), null);
  assert.equal(daysUntil("2026-07-18", NOW), 1);
  assert.equal(daysUntil("2026-08-16", NOW), 30);
  assert.equal(daysUntil("2026-07-17", NOW), 0);
  assert.equal(daysUntil("2026-05-22", NOW), 0);
});

test("isReleased is true only for past or today dates", () => {
  assert.equal(isReleased(null, NOW), false);
  assert.equal(isReleased("2026-05-22", NOW), true);
  assert.equal(isReleased("2026-07-17", NOW), true);
  assert.equal(isReleased("2026-09-01", NOW), false);
});

test("buildUpcoming orders dated-unreleased by anticipation, then TBA, then released", () => {
  const seed = [
    entry({ id: "released", date: "2026-05-22", hype: { franchiseWeight: 100, scarcityRisk: 100, nostalgiaFactor: 100 } }),
    entry({ id: "tba-big", date: null, hype: { franchiseWeight: 100, scarcityRisk: 100, nostalgiaFactor: 100 } }),
    entry({ id: "dated-low", date: "2026-09-01", hype: {} }),
    entry({ id: "dated-high", date: "2026-10-01", hype: { franchiseWeight: 100, scarcityRisk: 100, nostalgiaFactor: 100 } })
  ];
  const out = buildUpcoming(seed, {}, NOW);
  assert.deepEqual(
    out.map((r) => r.id),
    ["dated-high", "dated-low", "tba-big", "released"]
  );
  const tba = out.find((r) => r.id === "tba-big");
  assert.equal(tba?.daysUntil, null);
  assert.equal(tba?.released, false);
  assert.equal(out.find((r) => r.id === "released")?.released, true);
});

test("buildUpcoming applies per-release pressure to anticipation", () => {
  const seed = [entry({ id: "p", date: "2026-09-01", hype: { franchiseWeight: 90, scarcityRisk: 90, nostalgiaFactor: 90 } })];
  const withPressure = buildUpcoming(seed, { p: { marketPressure: 100, dataConfidence: 100 } }, NOW)[0];
  const without = buildUpcoming(seed, {}, NOW)[0];
  assert.ok(withPressure.anticipation.score > without.anticipation.score);
});

test("groupByMonth is chronological with TBA last", () => {
  const seed = [
    entry({ id: "sep", date: "2026-09-01" }),
    entry({ id: "aug", date: "2026-08-10" }),
    entry({ id: "tba", date: null })
  ];
  const groups = groupByMonth(buildUpcoming(seed, {}, NOW));
  assert.deepEqual(
    groups.map((g) => g.month),
    ["August 2026", "September 2026", "TBA"]
  );
});

test("releases seed has valid shape and unique ids", () => {
  const seen = new Set<string>();
  assert.equal(releasesSeed.schemaVersion, 1);
  assert.ok(releasesSeed.releases.length >= 1);
  for (const release of releasesSeed.releases as ReleaseSeedEntry[]) {
    assert.ok(release.id && !seen.has(release.id), `duplicate or missing id: ${release.id}`);
    seen.add(release.id);
    assert.ok(release.name);
    assert.ok(["set", "sealed", "collection"].includes(release.kind));
    assert.ok(release.date === null || /^\d{4}-\d{2}-\d{2}$/.test(release.date));
    assert.ok(release.hype && typeof release.hype === "object");
  }
});

test("flagship 30th Celebration entry stays honest: TBA with real MSRP total", () => {
  const flagship = (releasesSeed.releases as ReleaseSeedEntry[]).find((r) => r.id === "30th-celebration");
  assert.ok(flagship);
  assert.equal(flagship?.date, null);
  assert.equal(flagship?.msrpTotal, 566.78);
  assert.equal(flagship?.products?.length, 17);
});
