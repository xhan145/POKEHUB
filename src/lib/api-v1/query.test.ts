import assert from "node:assert/strict";
import test from "node:test";

import { parseCardQuery, parseCardsParams } from "./query";
import {
  CACHE_INDEX,
  CACHE_OK,
  errorResponse,
  listResponse,
  singleResponse
} from "./respond";

test("parseCardQuery returns [] for empty input", () => {
  assert.deepStrictEqual(parseCardQuery(""), []);
});

test("parseCardQuery returns [] for whitespace-only input", () => {
  assert.deepStrictEqual(parseCardQuery("   "), []);
});

test("parseCardQuery merges bare tokens into one name-contains filter", () => {
  assert.deepStrictEqual(parseCardQuery("charizard ex"), [
    { kind: "name-contains", value: "charizard ex" }
  ]);
});

test("parseCardQuery maps name: to name-contains", () => {
  assert.deepStrictEqual(parseCardQuery("name:pikachu"), [
    { kind: "name-contains", value: "pikachu" }
  ]);
});

test("parseCardQuery maps set.id: to an exact set_id filter", () => {
  assert.deepStrictEqual(parseCardQuery("set.id:sv3pt5"), [
    { kind: "field", column: "set_id", op: "eq", value: "sv3pt5" }
  ]);
});

test("parseCardQuery supports quoted values with spaces", () => {
  assert.deepStrictEqual(parseCardQuery('rarity:"Special Illustration Rare"'), [
    { kind: "field", column: "rarity", op: "ilike", value: "Special Illustration Rare" }
  ]);
});

test("parseCardQuery maps number: to an exact number filter", () => {
  assert.deepStrictEqual(parseCardQuery("number:199"), [
    { kind: "field", column: "number", op: "eq", value: "199" }
  ]);
});

test("parseCardQuery ANDs clauses, drops unknown fields, merges bare terms", () => {
  assert.deepStrictEqual(parseCardQuery("mega set.name:chaos hp:200 rising"), [
    { kind: "name-contains", value: "mega rising" },
    { kind: "field", column: "set_name", op: "ilike", value: "chaos" }
  ]);
});

test("parseCardsParams clamps and defaults bad params", () => {
  const p = parseCardsParams(new URLSearchParams("page=0&pageSize=9999&orderBy=bogus&q= "));
  assert.deepStrictEqual(p, { q: undefined, page: 1, pageSize: 250, orderBy: "default" });
});

test("parseCardsParams defaults when params are absent", () => {
  const d = parseCardsParams(new URLSearchParams(""));
  assert.deepStrictEqual(d, { q: undefined, page: 1, pageSize: 50, orderBy: "default" });
});

test("parseCardsParams passes through valid params", () => {
  const p = parseCardsParams(new URLSearchParams("page=3&pageSize=100&orderBy=-name&q=charizard"));
  assert.deepStrictEqual(p, { q: "charizard", page: 3, pageSize: 100, orderBy: "-name" });
});

test("listResponse wraps data in the list envelope with CACHE_OK by default", async () => {
  const res = listResponse(["a"], 2, 50, 120);

  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Cache-Control"), CACHE_OK);
  assert.deepStrictEqual(await res.json(), {
    data: ["a"],
    page: 2,
    pageSize: 50,
    count: 1,
    totalCount: 120
  });
});

test("singleResponse wraps data and honors a cache override", async () => {
  const res = singleResponse({ id: "sv3pt5-199" }, CACHE_INDEX);

  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Cache-Control"), CACHE_INDEX);
  assert.deepStrictEqual(await res.json(), { data: { id: "sv3pt5-199" } });
});

test("errorResponse returns the error envelope with no-store", async () => {
  const res = errorResponse(404, "Card not found");

  assert.equal(res.status, 404);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  assert.deepStrictEqual(await res.json(), { error: "Card not found" });
});
