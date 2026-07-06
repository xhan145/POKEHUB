import assert from "node:assert/strict";
import test from "node:test";

import { computeTrust } from "./trust-engine";
import type { TrustSnapshotInput } from "./trust-engine";

const now = Date.parse("2026-07-06T00:00:00Z");
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function iso(offsetMs: number): string {
  return new Date(now - offsetMs).toISOString();
}

test("two agreeing fresh sources produce a VERIFIED tier with high parity", () => {
  const snapshots: TrustSnapshotInput[] = [
    { source: "tcgplayer", market: 100, observedAt: iso(DAY) },
    { source: "cardmarket", market: 104, observedAt: iso(DAY) }
  ];

  const result = computeTrust(snapshots, now);

  assert.equal(result.tier, "VERIFIED");
  assert.equal(result.coverage, 2);
  assert.equal(result.sources.length, 2);
  assert.ok(result.parity !== null && result.parity >= 70);
});

test("two disagreeing fresh sources fall to SOLID with low parity", () => {
  const snapshots: TrustSnapshotInput[] = [
    { source: "tcgplayer", market: 100, observedAt: iso(DAY) },
    { source: "cardmarket", market: 400, observedAt: iso(DAY) }
  ];

  const result = computeTrust(snapshots, now);

  assert.equal(result.tier, "SOLID");
  assert.equal(result.coverage, 2);
  assert.ok(result.parity !== null && result.parity < 40);
});

test("a single source is SINGLE_SOURCE with null parity and coverage 1", () => {
  const snapshots: TrustSnapshotInput[] = [
    { source: "tcgplayer", market: 100, observedAt: iso(DAY) }
  ];

  const result = computeTrust(snapshots, now);

  assert.equal(result.tier, "SINGLE_SOURCE");
  assert.equal(result.parity, null);
  assert.equal(result.coverage, 1);
});

test("a newest snapshot older than 30 days is STALE", () => {
  const snapshots: TrustSnapshotInput[] = [
    { source: "tcgplayer", market: 100, observedAt: iso(40 * DAY) },
    { source: "cardmarket", market: 104, observedAt: iso(45 * DAY) }
  ];

  const result = computeTrust(snapshots, now);

  assert.equal(result.tier, "STALE");
});

test("no snapshots yield the NONE tier with a zero score and empty sources", () => {
  const result = computeTrust([], now);

  assert.equal(result.tier, "NONE");
  assert.equal(result.score, 0);
  assert.deepStrictEqual(result.sources, []);
  assert.equal(result.parity, null);
  assert.equal(result.coverage, 0);
  assert.equal(result.freshness, 0);
  assert.equal(result.newestObservedAt, null);
});

test("duplicate rows for one source keep only the newest snapshot", () => {
  const newest = iso(DAY);
  const snapshots: TrustSnapshotInput[] = [
    { source: "tcgplayer", market: 90, observedAt: iso(5 * DAY) },
    { source: "tcgplayer", market: 111, observedAt: newest }
  ];

  const result = computeTrust(snapshots, now);

  assert.equal(result.coverage, 1);
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].market, 111);
  assert.equal(result.sources[0].observedAt, newest);
});

test("computeTrust is deterministic for the same input and nowMs", () => {
  const snapshots: TrustSnapshotInput[] = [
    { source: "tcgplayer", market: 100, observedAt: iso(DAY) },
    { source: "cardmarket", market: 104, observedAt: iso(2 * DAY) }
  ];

  assert.deepStrictEqual(computeTrust(snapshots, now), computeTrust(snapshots, now));
});

test("snapshots with market <= 0 or non-finite are ignored", () => {
  const snapshots: TrustSnapshotInput[] = [
    { source: "tcgplayer", market: 0, observedAt: iso(DAY) },
    { source: "cardmarket", market: -5, observedAt: iso(DAY) },
    { source: "ebay", market: null, observedAt: iso(DAY) },
    { source: "psa", market: Number.NaN, observedAt: iso(DAY) },
    { source: "pricecharting", market: Number.POSITIVE_INFINITY, observedAt: iso(DAY) },
    { source: "cardmarket", market: 104, observedAt: iso(DAY) }
  ];

  const result = computeTrust(snapshots, now);

  assert.equal(result.coverage, 1);
  assert.equal(result.tier, "SINGLE_SOURCE");
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].source, "cardmarket");
  assert.equal(result.sources[0].market, 104);
});

test("sources are sorted by source name ascending", () => {
  const snapshots: TrustSnapshotInput[] = [
    { source: "tcgplayer", market: 100, observedAt: iso(DAY) },
    { source: "cardmarket", market: 104, observedAt: iso(DAY) }
  ];

  const result = computeTrust(snapshots, now);

  assert.deepStrictEqual(
    result.sources.map((s) => s.source),
    ["cardmarket", "tcgplayer"]
  );
});
