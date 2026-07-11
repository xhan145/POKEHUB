import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCardFlatNodes,
  TYPE_COLOR,
  type ConstellationCard,
  type TypeSummary
} from "./card-source";

function card(overrides: Partial<ConstellationCard> = {}): ConstellationCard {
  return {
    id: "sv1-1",
    name: "Sprigatito",
    type: "Grass",
    price: 0,
    tier: "NONE",
    rarity: "Common",
    set: "Scarlet & Violet",
    ...overrides
  };
}

test("builds a root -> type-cluster -> card-leaf tree shape", () => {
  const cards: ConstellationCard[] = [
    card({ id: "a", type: "Fire", tier: "VERIFIED", price: 10 }),
    card({ id: "b", type: "Water", tier: "SOLID", price: 5 })
  ];
  const types: TypeSummary[] = [
    { type: "Fire", count: 1 },
    { type: "Water", count: 1 }
  ];

  const nodes = buildCardFlatNodes(cards, types);

  const clusters = nodes.filter((n) => n.id.startsWith("type:"));
  const leaves = nodes.filter((n) => n.id.startsWith("card:"));

  assert.equal(clusters.length, 2);
  assert.equal(leaves.length, 2);

  // Clusters hang off the root (parentId null) and label with counts.
  for (const cluster of clusters) {
    assert.equal(cluster.parentId, null);
  }
  const fireCluster = clusters.find((n) => n.id === "type:Fire");
  assert.ok(fireCluster);
  assert.equal(fireCluster?.node?.label, "Fire (1)");
  assert.equal(fireCluster?.node?.color, TYPE_COLOR.Fire);

  // Leaves hang off their type cluster.
  const leafA = leaves.find((n) => n.id === "card:a");
  assert.ok(leafA);
  assert.equal(leafA?.parentId, "type:Fire");
  assert.equal(leafA?.node?.label, "Sprigatito");
  assert.equal(leafA?.node?.color, TYPE_COLOR.Fire);
  assert.equal(leafA?.node?.data, cards[0]);
});

test("mass log-scales price within [0.05, 1] bounds", () => {
  const cases: Array<[number, number]> = [
    [0, 0.05], // log10(1)/3 = 0 -> floor 0.05
    [10, Math.log10(11) / 3], // ~0.34
    [1000, 1] // log10(1001)/3 ~ 1.0 -> clamp 1
  ];

  for (const [price, expected] of cases) {
    const nodes = buildCardFlatNodes(
      [card({ id: "x", type: "Fire", price })],
      [{ type: "Fire", count: 1 }]
    );
    const leaf = nodes.find((n) => n.id === "card:x");
    assert.ok(leaf);
    assert.ok(Math.abs((leaf?.node?.mass ?? -1) - expected) < 1e-9, `price ${price}`);
  }

  // Never below the floor, never above 1.
  const huge = buildCardFlatNodes(
    [card({ id: "h", type: "Fire", price: 1_000_000 })],
    [{ type: "Fire", count: 1 }]
  );
  const hugeLeaf = huge.find((n) => n.id === "card:h");
  assert.ok((hugeLeaf?.node?.mass ?? 0) <= 1);
  assert.ok((hugeLeaf?.node?.mass ?? 0) >= 0.05);
});

test("maps each tier to luminosity and anomaly", () => {
  const expectations: Array<[string, number, string]> = [
    ["VERIFIED", 1, "none"],
    ["SOLID", 0.7, "none"],
    ["SINGLE_SOURCE", 0.45, "none"],
    ["STALE", 0.2, "warn"],
    ["NONE", 0.1, "error"]
  ];

  for (const [tier, luminosity, anomaly] of expectations) {
    const nodes = buildCardFlatNodes(
      [card({ id: "t", type: "Fire", tier })],
      [{ type: "Fire", count: 1 }]
    );
    const leaf = nodes.find((n) => n.id === "card:t");
    assert.ok(leaf, tier);
    assert.equal(leaf?.node?.luminosity, luminosity, tier);
    assert.equal(leaf?.node?.anomaly, anomaly, tier);
  }
});

test("supports Trainer and Energy pseudo-galaxies", () => {
  const cards: ConstellationCard[] = [
    card({ id: "tr", type: "Trainer" }),
    card({ id: "en", type: "Energy" })
  ];
  const types: TypeSummary[] = [
    { type: "Trainer", count: 1 },
    { type: "Energy", count: 1 }
  ];

  const nodes = buildCardFlatNodes(cards, types);

  const trainer = nodes.find((n) => n.id === "type:Trainer");
  const energy = nodes.find((n) => n.id === "type:Energy");
  assert.equal(trainer?.node?.color, TYPE_COLOR.Trainer);
  assert.equal(energy?.node?.color, TYPE_COLOR.Energy);
  assert.equal(nodes.find((n) => n.id === "card:tr")?.parentId, "type:Trainer");
  assert.equal(nodes.find((n) => n.id === "card:en")?.parentId, "type:Energy");
});

test("unknown types fall back to the Other color", () => {
  const nodes = buildCardFlatNodes(
    [card({ id: "u", type: "Mystery" })],
    [{ type: "Mystery", count: 1 }]
  );
  assert.equal(nodes.find((n) => n.id === "type:Mystery")?.node?.color, TYPE_COLOR.Other);
  assert.equal(nodes.find((n) => n.id === "card:u")?.node?.color, TYPE_COLOR.Other);
});

test("is deterministic for identical input", () => {
  const cards: ConstellationCard[] = [
    card({ id: "a", type: "Fire", price: 12, tier: "VERIFIED" }),
    card({ id: "b", type: "Water", price: 3, tier: "STALE" })
  ];
  const types: TypeSummary[] = [
    { type: "Fire", count: 1 },
    { type: "Water", count: 1 }
  ];

  assert.deepEqual(buildCardFlatNodes(cards, types), buildCardFlatNodes(cards, types));
});
