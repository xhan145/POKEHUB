import type { SourceAdapter } from "./types";

export type CsvRow = { name: string; price: number; kind: "card" | "sealed_product"; source: string };

const EXPECTED_HEADER = ["name", "price", "kind", "source"];

export function parseManualCsv(text: string): { rows: CsvRow[]; errors: string[] } {
  const rows: CsvRow[] = [];
  const errors: string[] = [];

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return { rows, errors };

  const header = lines[0].split(",").map((cell) => cell.trim().toLowerCase());
  if (
    header.length !== EXPECTED_HEADER.length ||
    EXPECTED_HEADER.some((column, index) => header[index] !== column)
  ) {
    errors.push('Row 1: header must be exactly "name,price,kind,source".');
    return { rows, errors };
  }

  for (let index = 1; index < lines.length; index += 1) {
    const rowNumber = index + 1;
    const cells = lines[index].split(",").map((cell) => cell.trim());

    if (cells.length !== EXPECTED_HEADER.length) {
      errors.push(`Row ${rowNumber}: expected 4 columns, got ${cells.length}.`);
      continue;
    }

    const [name, priceRaw, kindRaw, source] = cells;
    if (!name) {
      errors.push(`Row ${rowNumber}: name is required.`);
      continue;
    }

    const price = Number(priceRaw);
    if (!priceRaw || !Number.isFinite(price) || price < 0) {
      errors.push(`Row ${rowNumber}: price "${priceRaw}" must be a non-negative number.`);
      continue;
    }

    if (kindRaw !== "card" && kindRaw !== "sealed_product") {
      errors.push(`Row ${rowNumber}: kind "${kindRaw}" must be "card" or "sealed_product".`);
      continue;
    }

    if (!source) {
      errors.push(`Row ${rowNumber}: source is required.`);
      continue;
    }

    rows.push({ name, price, kind: kindRaw, source });
  }

  return { rows, errors };
}

export const manualCsvAdapter: SourceAdapter = {
  id: "manual-csv",
  label: "Manual CSV Import",
  kind: "csv",
  enabled: true,
  requiresSecret: false,
  async checkCredentials() {
    return {
      sourceId: "manual-csv",
      hasCredentials: true,
      required: false,
      detail: "No credentials required for manual CSV imports."
    };
  },
  async fetchSnapshot() {
    return {
      status: "disabled",
      message: "CSV imports flow through POST /api/ingest/msrp"
    };
  }
};
