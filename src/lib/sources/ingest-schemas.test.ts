import assert from "node:assert/strict";
import test from "node:test";

import {
  marketSnapshotIngestSchema,
  msrpIngestSchema,
  pokemonTcgIngestSchema
} from "./ingest-schemas";
import { requireIngestToken } from "./route-helpers";

const TOKEN_KEY = "POKEHUB_INGEST_TOKEN";

function withIngestToken(value: string | undefined, run: () => void) {
  const saved = process.env[TOKEN_KEY];
  try {
    if (value === undefined) {
      delete process.env[TOKEN_KEY];
    } else {
      process.env[TOKEN_KEY] = value;
    }
    run();
  } finally {
    if (saved === undefined) {
      delete process.env[TOKEN_KEY];
    } else {
      process.env[TOKEN_KEY] = saved;
    }
  }
}

function ingestRequest(headers?: Record<string, string>) {
  return new Request("http://localhost/api/ingest/msrp", { method: "POST", headers });
}

test("msrpIngestSchema parses products and csv round-trip", () => {
  const payload = {
    products: [
      { name: "Crown Zenith Elite Trainer Box", msrp: 49.99, productType: "elite_trainer_box", currency: "USD" as const }
    ],
    csv: "name,price,kind,source\nSurging Sparks Booster Box,159.99,sealed_product,manual"
  };

  const parsed = msrpIngestSchema.parse(payload);

  assert.deepEqual(parsed, payload);
});

test("msrpIngestSchema rejects a negative msrp", () => {
  const result = msrpIngestSchema.safeParse({
    products: [{ name: "Crown Zenith Elite Trainer Box", msrp: -5, productType: "elite_trainer_box" }]
  });

  assert.equal(result.success, false);
});

test("pokemonTcgIngestSchema parses query and limit round-trip", () => {
  const payload = { query: 'set.id:sv8 name:"pikachu"', limit: 25 };

  const parsed = pokemonTcgIngestSchema.parse(payload);

  assert.deepEqual(parsed, payload);
});

test("pokemonTcgIngestSchema rejects an oversize limit", () => {
  const result = pokemonTcgIngestSchema.safeParse({ limit: 500 });

  assert.equal(result.success, false);
});

test("marketSnapshotIngestSchema parses a full snapshot payload round-trip", () => {
  const payload = {
    itemKind: "card" as const,
    itemRef: "sv8-238",
    source: "manual" as const,
    observedAt: "2026-07-06T00:00:00.000Z",
    low: 40,
    mid: 52.5,
    high: 80,
    market: 55,
    activeListings: 12,
    soldCount: 4,
    confidenceScore: 60
  };

  const parsed = marketSnapshotIngestSchema.parse(payload);

  assert.deepEqual(parsed, payload);
});

test("marketSnapshotIngestSchema rejects a bad item kind", () => {
  const result = marketSnapshotIngestSchema.safeParse({
    itemKind: "booster",
    itemRef: "sv8-238",
    source: "manual"
  });

  assert.equal(result.success, false);
});

test("marketSnapshotIngestSchema rejects a negative price", () => {
  const result = marketSnapshotIngestSchema.safeParse({
    itemKind: "card",
    itemRef: "sv8-238",
    source: "manual",
    low: -1
  });

  assert.equal(result.success, false);
});

test("requireIngestToken returns 503 when POKEHUB_INGEST_TOKEN is unset", () => {
  withIngestToken(undefined, () => {
    const result = requireIngestToken(ingestRequest({ "x-pokehub-ingest-token": "anything" }));

    assert.deepEqual(result, { ok: false, status: 503, error: "ingest token not configured" });
  });
});

test("requireIngestToken returns 401 when the header is missing or mismatched", () => {
  withIngestToken("secret-token", () => {
    const missing = requireIngestToken(ingestRequest());
    assert.deepEqual(missing, { ok: false, status: 401, error: "invalid ingest token" });

    const mismatched = requireIngestToken(ingestRequest({ "x-pokehub-ingest-token": "wrong-token" }));
    assert.deepEqual(mismatched, { ok: false, status: 401, error: "invalid ingest token" });
  });
});

test("requireIngestToken accepts the matching header and never echoes the token", () => {
  withIngestToken("secret-token", () => {
    const result = requireIngestToken(ingestRequest({ "x-pokehub-ingest-token": "secret-token" }));

    assert.deepEqual(result, { ok: true });
    assert.ok(!JSON.stringify(result).includes("secret-token"), "result must never contain the token value");
  });
});
