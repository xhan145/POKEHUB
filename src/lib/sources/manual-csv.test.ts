import assert from "node:assert/strict";
import test from "node:test";

import { parseManualCsv } from "./manual-csv";

test("parseManualCsv parses valid rows under the name,price,kind,source header", () => {
  const text = [
    "name,price,kind,source",
    "Charizard ex 199/165,42.5,card,tcgplayer",
    "Crown Zenith Elite Trainer Box,59.99,sealed_product,manual"
  ].join("\n");

  const result = parseManualCsv(text);

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.rows, [
    { name: "Charizard ex 199/165", price: 42.5, kind: "card", source: "tcgplayer" },
    { name: "Crown Zenith Elite Trainer Box", price: 59.99, kind: "sealed_product", source: "manual" }
  ]);
});

test("parseManualCsv reports bad price and kind rows in errors with row numbers", () => {
  const text = [
    "name,price,kind,source",
    "Good Row,10,card,manual",
    "Bad Price,not-a-number,card,manual",
    "Bad Kind,12,booster,manual"
  ].join("\n");

  const result = parseManualCsv(text);

  assert.equal(result.rows.length, 1);
  assert.deepEqual(result.rows[0], { name: "Good Row", price: 10, kind: "card", source: "manual" });
  assert.equal(result.errors.length, 2);
  assert.ok(result.errors[0].includes("Row 3"), `expected first error to cite Row 3: ${result.errors[0]}`);
  assert.ok(result.errors[1].includes("Row 4"), `expected second error to cite Row 4: ${result.errors[1]}`);
});

test("parseManualCsv returns empty rows and errors for empty text", () => {
  assert.deepEqual(parseManualCsv(""), { rows: [], errors: [] });
});
