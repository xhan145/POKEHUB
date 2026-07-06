import { z } from "zod";

export type CardQueryFilter =
  | { kind: "name-contains"; value: string }
  | {
      kind: "field";
      column: "set_id" | "set_name" | "rarity" | "supertype" | "number" | "artist";
      op: "eq" | "ilike";
      value: string;
    };

type FieldFilter = Extract<CardQueryFilter, { kind: "field" }>;

const FIELD_MAP: Record<string, Pick<FieldFilter, "column" | "op">> = {
  "set.id": { column: "set_id", op: "eq" },
  "set.name": { column: "set_name", op: "ilike" },
  rarity: { column: "rarity", op: "ilike" },
  supertype: { column: "supertype", op: "ilike" },
  number: { column: "number", op: "eq" },
  artist: { column: "artist", op: "ilike" }
};

// Tokens are whitespace-separated, except that a value opening with `"` right
// after `field:` runs until the closing quote (or the end of the string).
const TOKEN_PATTERN = /[^\s"]+:"[^"]*"?|\S+/g;

function unquote(value: string): string {
  if (!value.startsWith('"')) return value;
  const body = value.slice(1);
  return body.endsWith('"') ? body.slice(0, -1) : body;
}

export function parseCardQuery(q: string): CardQueryFilter[] {
  const nameTerms: string[] = [];
  const fieldFilters: FieldFilter[] = [];

  for (const token of q.match(TOKEN_PATTERN) ?? []) {
    const colonAt = token.indexOf(":");
    if (colonAt === -1) {
      nameTerms.push(token);
      continue;
    }

    const field = token.slice(0, colonAt);
    const value = unquote(token.slice(colonAt + 1));
    if (value === "") continue;

    if (field === "name") {
      nameTerms.push(value);
    } else if (field in FIELD_MAP) {
      fieldFilters.push({ kind: "field", ...FIELD_MAP[field], value });
    }
    // Unrecognized `foo:bar` tokens are dropped silently.
  }

  const filters: CardQueryFilter[] = [];
  if (nameTerms.length > 0) {
    filters.push({ kind: "name-contains", value: nameTerms.join(" ") });
  }
  filters.push(...fieldFilters);
  return filters;
}

export type OrderBy = "name" | "-name" | "number" | "-number" | "set.name" | "-set.name" | "default";

export type CardsParams = { q?: string; page: number; pageSize: number; orderBy: OrderBy };

const orderBySchema = z
  .enum(["name", "-name", "number", "-number", "set.name", "-set.name", "default"])
  .catch("default");

function clampedInt(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw === null) return fallback;
  const num = Number(raw);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(Math.max(Math.floor(num), min), max);
}

export function parseCardsParams(searchParams: URLSearchParams): CardsParams {
  const q = searchParams.get("q")?.trim() || undefined;
  return {
    q,
    page: clampedInt(searchParams.get("page"), 1, 1, Number.MAX_SAFE_INTEGER),
    pageSize: clampedInt(searchParams.get("pageSize"), 50, 1, 250),
    orderBy: orderBySchema.parse(searchParams.get("orderBy"))
  };
}
