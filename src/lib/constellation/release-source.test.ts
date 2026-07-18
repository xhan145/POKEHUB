import assert from "node:assert/strict";
import test from "node:test";

import type { UpcomingRelease } from "@/types/pokehub";

import { buildReleaseFlatNodes, TIER_COLOR } from "./release-source";

function release(overrides: Partial<UpcomingRelease>): UpcomingRelease {
  return {
    id: "r1",
    name: "Test Release",
    kind: "collection",
    date: null,
    hype: {},
    anticipation: { score: 84.3, tier: "HOT" },
    daysUntil: null,
    released: false,
    ...overrides
  };
}

const SETS = [
  { name: "Chaos Rising", releaseDate: "2026-05-22" },
  { name: "Perfect Order", releaseDate: "2026-03-27" }
];

test("root has upcoming and recent-sets clusters; empty ones are omitted", () => {
  const nodes = buildReleaseFlatNodes([release({})], SETS, []);
  const clusters = nodes.filter((node) => node.parentId === null);
  assert.deepEqual(
    clusters.map((cluster) => cluster.id).sort(),
    ["recent-sets", "upcoming"]
  );
  assert.ok(clusters.find((c) => c.id === "upcoming")?.node?.label?.includes("(1)"));

  const noSets = buildReleaseFlatNodes([release({})], [], []);
  assert.equal(noSets.some((node) => node.id === "recent-sets"), false);
});

test("release node encodes tier color, glow, mass bounds, and TBA label", () => {
  const nodes = buildReleaseFlatNodes([release({ msrpTotal: 566.78 })], [], []);
  const releaseNode = nodes.find((node) => node.id === "release:r1");
  assert.ok(releaseNode);
  assert.equal(releaseNode?.parentId, "upcoming");
  assert.equal(releaseNode?.node?.color, TIER_COLOR.HOT);
  assert.equal(releaseNode?.node?.luminosity, 0.843);
  assert.ok((releaseNode?.node?.mass ?? 0) > 0.05 && (releaseNode?.node?.mass ?? 0) <= 1);
  assert.ok(releaseNode?.node?.label?.endsWith("· TBA"));
  assert.equal(releaseNode?.node?.anomaly, "none");
});

test("dated release label carries the countdown", () => {
  const nodes = buildReleaseFlatNodes([release({ date: "2026-09-01", daysUntil: 46 })], [], []);
  assert.ok(nodes.find((node) => node.id === "release:r1")?.node?.label?.endsWith("· 46d"));
});

test("saving ids get the warn ring", () => {
  const saved = buildReleaseFlatNodes([release({})], [], ["r1"]);
  assert.equal(saved.find((node) => node.id === "release:r1")?.node?.anomaly, "warn");
});

test("product moons orbit their release with inherited tier color", () => {
  const products = Array.from({ length: 17 }, (_, index) => `Product ${index + 1}`);
  const nodes = buildReleaseFlatNodes([release({ products })], [], []);
  const moons = nodes.filter((node) => node.parentId === "release:r1");
  assert.equal(moons.length, 17);
  assert.equal(moons[0].id, "product:r1:0");
  assert.equal(moons[0].node?.label, "Product 1");
  assert.equal(moons[0].node?.color, TIER_COLOR.HOT);
  assert.equal(moons[0].node?.mass, 0.1);
});

test("recent sets dim with age and keep dated labels", () => {
  const nodes = buildReleaseFlatNodes([], SETS, []);
  const sets = nodes.filter((node) => node.parentId === "recent-sets");
  assert.equal(sets.length, 2);
  assert.equal(sets[0].node?.luminosity, 0.9);
  assert.equal(sets[1].node?.luminosity, 0.82);
  assert.ok(sets[0].node?.label?.includes("2026-05-22"));
});

test("deterministic output", () => {
  const upcoming = [release({ products: ["A", "B"] })];
  assert.deepEqual(
    buildReleaseFlatNodes(upcoming, SETS, ["r1"]),
    buildReleaseFlatNodes(upcoming, SETS, ["r1"])
  );
});
