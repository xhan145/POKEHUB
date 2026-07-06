import assert from "node:assert/strict";
import test from "node:test";

import { apiCardToLiveCard, mockToLiveCards } from "./card-mapper";
import type { CardIdentity } from "@/types/pokehub";

const fullApiCard = {
  id: "sv3pt5-199",
  name: "Charizard ex",
  set: { id: "sv3pt5", name: "Scarlet & Violet 151" },
  number: "199",
  rarity: "Special Illustration Rare",
  artist: "miki kudo",
  supertype: "Pokemon",
  subtypes: ["Stage 2", "ex"],
  images: {
    small: "https://images.pokemontcg.io/sv3pt5/199.png",
    large: "https://images.pokemontcg.io/sv3pt5/199_hires.png"
  },
  pokehub: {
    lastSnapshot: {
      source: "pokemon_tcg_api",
      observedAt: "2026-07-01T00:00:00Z",
      market: 45.21
    }
  }
};

test("apiCardToLiveCard maps a full card object to identity + market", () => {
  const live = apiCardToLiveCard(fullApiCard);

  assert.deepStrictEqual(live.identity, {
    projectTag: "POKE",
    pokemonTcgId: "sv3pt5-199",
    name: "Charizard ex",
    setId: "sv3pt5",
    setName: "Scarlet & Violet 151",
    number: "199",
    rarity: "Special Illustration Rare",
    artist: "miki kudo",
    supertype: "Pokemon",
    subtypes: ["Stage 2", "ex"],
    imageSmall: "https://images.pokemontcg.io/sv3pt5/199.png",
    imageLarge: "https://images.pokemontcg.io/sv3pt5/199_hires.png"
  });
  assert.equal(live.market, 45.21);
});

test("apiCardToLiveCard maps a minimal id+name object to identity defaults", () => {
  const live = apiCardToLiveCard({ id: "swsh7-215", name: "Umbreon VMAX" });

  assert.deepStrictEqual(live.identity, {
    projectTag: "POKE",
    pokemonTcgId: "swsh7-215",
    name: "Umbreon VMAX",
    setId: "",
    setName: "",
    number: "",
    rarity: undefined,
    artist: undefined,
    supertype: undefined,
    subtypes: undefined,
    imageSmall: undefined,
    imageLarge: undefined
  });
  assert.equal(live.market, null);
});

test("apiCardToLiveCard yields market null for non-finite or absent snapshot market", () => {
  assert.equal(apiCardToLiveCard({ id: "x", pokehub: {} }).market, null);
  assert.equal(apiCardToLiveCard({ id: "x", pokehub: { lastSnapshot: null } }).market, null);
  assert.equal(apiCardToLiveCard({ id: "x", pokehub: { lastSnapshot: { market: null } } }).market, null);
  assert.equal(
    apiCardToLiveCard({ id: "x", pokehub: { lastSnapshot: { market: "not-a-number" } } }).market,
    null
  );
  assert.equal(
    apiCardToLiveCard({ id: "x", pokehub: { lastSnapshot: { market: Infinity } } }).market,
    null
  );
  assert.equal(apiCardToLiveCard({ id: "x", pokehub: { lastSnapshot: { market: 0 } } }).market, 0);
});

test("apiCardToLiveCard never throws on an empty object and fills required defaults", () => {
  assert.doesNotThrow(() => apiCardToLiveCard({}));

  const live = apiCardToLiveCard({});
  assert.equal(live.identity.projectTag, "POKE");
  assert.equal(live.identity.pokemonTcgId, "");
  assert.equal(live.identity.name, "");
  assert.equal(live.identity.setId, "");
  assert.equal(live.identity.setName, "");
  assert.equal(live.identity.number, "");
  assert.equal(live.market, null);
});

test("apiCardToLiveCard ignores malformed nested shapes without throwing", () => {
  const live = apiCardToLiveCard({
    id: 42,
    name: ["not", "a", "string"],
    set: "not-an-object",
    images: 7,
    subtypes: ["ok", 3],
    pokehub: "nope"
  });

  assert.equal(live.identity.pokemonTcgId, "");
  assert.equal(live.identity.name, "");
  assert.equal(live.identity.setId, "");
  assert.equal(live.identity.subtypes, undefined);
  assert.equal(live.market, null);
});

test("apiCardToLiveCard parses a well-formed pokehub.trust into LiveCard.trust", () => {
  const trust = {
    score: 88,
    tier: "VERIFIED",
    parity: 91,
    freshness: 100,
    coverage: 2,
    sources: [
      { source: "cardmarket", market: 11.5, observedAt: "2026-07-01T00:00:00Z" },
      { source: "tcgplayer", market: 12.0, observedAt: "2026-07-02T00:00:00Z" }
    ],
    newestObservedAt: "2026-07-02T00:00:00Z"
  };
  const live = apiCardToLiveCard({ ...fullApiCard, pokehub: { ...fullApiCard.pokehub, trust } });

  assert.deepStrictEqual(live.trust, trust);
});

test("apiCardToLiveCard yields trust null when pokehub.trust is absent or malformed", () => {
  assert.equal(apiCardToLiveCard(fullApiCard).trust, null);
  assert.equal(apiCardToLiveCard({ id: "x" }).trust, null);
  assert.equal(apiCardToLiveCard({ id: "x", pokehub: {} }).trust, null);
  assert.equal(apiCardToLiveCard({ id: "x", pokehub: { trust: null } }).trust, null);
  assert.equal(apiCardToLiveCard({ id: "x", pokehub: { trust: "SOLID" } }).trust, null);
  assert.equal(apiCardToLiveCard({ id: "x", pokehub: { trust: {} } }).trust, null);
  assert.equal(apiCardToLiveCard({ id: "x", pokehub: { trust: { tier: 3 } } }).trust, null);
});

test("mockToLiveCards wraps identities with market null and trust null", () => {
  const identity: CardIdentity = {
    projectTag: "POKE",
    pokemonTcgId: "swsh12pt5-160",
    name: "Pikachu",
    setId: "swsh12pt5",
    setName: "Crown Zenith",
    number: "160"
  };

  assert.deepStrictEqual(mockToLiveCards([identity]), [{ identity, market: null, trust: null }]);
  assert.deepStrictEqual(mockToLiveCards([]), []);
});
