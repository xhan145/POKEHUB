import assert from "node:assert/strict";
import test from "node:test";

import { getAdapterStatuses, getSourceAdapters } from "./source-registry";

const CREDENTIAL_KEYS = [
  "POKEMON_TCG_API_KEY",
  "EBAY_CLIENT_ID",
  "EBAY_CLIENT_SECRET",
  "PRICECHARTING_TOKEN"
] as const;

function snapshotEnv() {
  const saved: Record<string, string | undefined> = {};
  for (const key of CREDENTIAL_KEYS) saved[key] = process.env[key];
  return saved;
}

function restoreEnv(saved: Record<string, string | undefined>) {
  for (const key of CREDENTIAL_KEYS) {
    if (saved[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = saved[key];
    }
  }
}

test("registry exposes the four real adapters plus five scraper stubs", () => {
  const adapters = getSourceAdapters();
  assert.equal(adapters.length, 9);

  const ids = adapters.map((adapter) => adapter.id);
  for (const id of ["pokemon-tcg", "ebay-browse", "pricecharting", "manual-csv"]) {
    assert.ok(ids.includes(id), `expected registry to include ${id}`);
  }
  assert.equal(adapters.filter((adapter) => adapter.kind === "scraper_stub").length, 5);
});

test("getAdapterStatuses reflects keyless defaults when no credentials are set", async () => {
  const saved = snapshotEnv();
  try {
    for (const key of CREDENTIAL_KEYS) delete process.env[key];

    const statuses = await getAdapterStatuses();
    const byId = new Map(statuses.map((status) => [status.id, status]));

    const pokemonTcg = byId.get("pokemon-tcg");
    assert.ok(pokemonTcg, "expected pokemon-tcg status");
    assert.equal(pokemonTcg.enabled, true);
    assert.equal(pokemonTcg.hasCredentials, false);

    const ebay = byId.get("ebay-browse");
    assert.ok(ebay, "expected ebay-browse status");
    assert.equal(ebay.enabled, false);
    assert.equal(ebay.hasCredentials, false);

    const pricecharting = byId.get("pricecharting");
    assert.ok(pricecharting, "expected pricecharting status");
    assert.equal(pricecharting.enabled, false);
    assert.equal(pricecharting.hasCredentials, false);
  } finally {
    restoreEnv(saved);
  }
});

test("every scraper stub is disabled and carries an approval-gated policy", async () => {
  const statuses = await getAdapterStatuses();
  const stubs = statuses.filter((status) => status.kind === "scraper_stub");

  assert.equal(stubs.length, 5);
  for (const stub of stubs) {
    assert.equal(stub.enabled, false, `${stub.id} must stay disabled`);
    assert.ok(stub.policy, `${stub.id} must expose a scrape policy`);
    assert.equal(stub.policy.requiresApproval, true, `${stub.id} policy must require approval`);
  }
});

test("adapter statuses never serialize env secret values", async () => {
  const saved = snapshotEnv();
  try {
    const sentinel = "sentinel-secret-value-must-not-leak";
    for (const key of CREDENTIAL_KEYS) process.env[key] = sentinel;

    const statuses = await getAdapterStatuses();
    const serialized = JSON.stringify(statuses);

    assert.ok(!serialized.includes(sentinel), "statuses must never contain raw env values");

    const byId = new Map(statuses.map((status) => [status.id, status]));
    assert.equal(byId.get("pokemon-tcg")?.hasCredentials, true);
    assert.equal(byId.get("ebay-browse")?.hasCredentials, true);
    assert.equal(byId.get("pricecharting")?.hasCredentials, true);
  } finally {
    restoreEnv(saved);
  }
});
