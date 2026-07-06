import assert from "node:assert/strict";
import test from "node:test";

import { scoreLiquidity } from "@/workers/score-market";

import { getDerivedCardStats, getDerivedSealedStats } from "./derived-stats";

test("getDerivedSealedStats returns the same estimate for the same input", () => {
  const first = getDerivedSealedStats("30th Celebration Ultra-Premium Collection", 119.99);
  const second = getDerivedSealedStats("30th Celebration Ultra-Premium Collection", 119.99);

  assert.deepEqual(first, second);
});

test("getDerivedSealedStats keeps every field within its documented seed range", () => {
  const names = [
    "Elite Trainer Box",
    "Booster Bundle",
    "Mini Tin",
    "Ultra-Premium Collection",
    "Battle Deck"
  ];

  for (const name of names) {
    const stats = getDerivedSealedStats(name, 49.99);

    assert.ok(stats.activeListings >= 3 && stats.activeListings <= 40);
    assert.ok(stats.soldComps >= 1 && stats.soldComps <= 25);
    assert.ok(["SLOW", "STEADY", "FAST"].includes(stats.velocity));
    assert.ok(["LOW", "MED", "HIGH"].includes(stats.reprintRisk));
    assert.ok(stats.liquidityScore >= 0 && stats.liquidityScore <= 100);
    assert.ok(stats.signalScore >= 0 && stats.signalScore <= 100);
  }
});

test("getDerivedSealedStats liquidityScore is scoreLiquidity of the derived counts", () => {
  const stats = getDerivedSealedStats("Elite Trainer Box", 49.99);

  assert.equal(
    stats.liquidityScore,
    scoreLiquidity({ activeListings: stats.activeListings, soldCount: stats.soldComps })
  );
});

test("getDerivedCardStats returns the same estimate for the same input", () => {
  const card = { pokemonTcgId: "sv3pt5-199", name: "Charizard ex", rarity: "Special Illustration Rare" };

  assert.deepEqual(getDerivedCardStats(card), getDerivedCardStats(card));
});

test("getDerivedCardStats keeps every field within its documented seed range", () => {
  const cards = [
    { pokemonTcgId: "sv3pt5-199", name: "Charizard ex", rarity: "Special Illustration Rare" },
    { pokemonTcgId: "swsh12pt5-160", name: "Pikachu", rarity: "Secret Rare" },
    { pokemonTcgId: "swsh7-215", name: "Umbreon VMAX", rarity: "Rare Rainbow" },
    { pokemonTcgId: "base1-58", name: "Pikachu", rarity: "Common" },
    { pokemonTcgId: "base1-1", name: "Alakazam" }
  ];

  for (const card of cards) {
    const stats = getDerivedCardStats(card);

    assert.ok(stats.rawMarket >= 5 && stats.rawMarket <= 250);
    assert.equal(Number(stats.rawMarket.toFixed(2)), stats.rawMarket);
    assert.ok(stats.gradedEstimate >= stats.rawMarket * 1.6 - 0.01);
    assert.ok(stats.gradedEstimate <= stats.rawMarket * 2.4 + 0.01);
    assert.equal(Number(stats.gradedEstimate.toFixed(2)), stats.gradedEstimate);
    assert.equal(stats.population, "PENDING");
    assert.ok(stats.spread >= 0 && stats.spread <= 1);
    assert.equal(Number(stats.spread.toFixed(2)), stats.spread);
    assert.ok(stats.liquidityScore >= 0 && stats.liquidityScore <= 100);
    assert.ok(stats.confidenceScore >= 0 && stats.confidenceScore <= 100);
    assert.ok(stats.signalScore >= 0 && stats.signalScore <= 100);
    assert.ok(["common", "rare", "ultra", "secret"].includes(stats.glow));
  }
});

test("getDerivedCardStats maps rarity keywords to glow tiers", () => {
  const glowFor = (rarity?: string) =>
    getDerivedCardStats({ pokemonTcgId: "test-1", name: "Test Card", rarity }).glow;

  assert.equal(glowFor("Secret Rare"), "secret");
  assert.equal(glowFor("Rare Rainbow"), "secret");
  assert.equal(glowFor("Special Illustration Rare"), "ultra");
  assert.equal(glowFor("Ultra Rare"), "ultra");
  assert.equal(glowFor("VMAX"), "ultra");
  assert.equal(glowFor("Hyper Rare"), "ultra");
  assert.equal(glowFor("Rare Holo"), "rare");
  assert.equal(glowFor("Rare"), "rare");
  assert.equal(glowFor("Common"), "common");
  assert.equal(glowFor(undefined), "common");
});

test("getDerivedCardStats grades higher glow tiers with a larger multiplier", () => {
  const secret = getDerivedCardStats({ pokemonTcgId: "test-1", name: "Test Card", rarity: "Secret Rare" });
  const common = getDerivedCardStats({ pokemonTcgId: "test-1", name: "Test Card", rarity: "Common" });

  assert.equal(secret.rawMarket, common.rawMarket);
  assert.ok(secret.gradedEstimate > common.gradedEstimate);
});
