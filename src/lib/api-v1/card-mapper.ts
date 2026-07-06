import type { CardIdentity } from "@/types/pokehub";

export type LiveCard = { identity: CardIdentity; market: number | null };

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function requiredString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function optionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.every((item) => typeof item === "string") ? (value as string[]) : undefined;
}

export function apiCardToLiveCard(obj: Record<string, unknown>): LiveCard {
  const set = asRecord(obj.set);
  const images = asRecord(obj.images);
  const lastSnapshot = asRecord(asRecord(obj.pokehub).lastSnapshot);

  const identity: CardIdentity = {
    projectTag: "POKE",
    pokemonTcgId: requiredString(obj.id),
    name: requiredString(obj.name),
    setId: requiredString(set.id),
    setName: requiredString(set.name),
    number: requiredString(obj.number),
    rarity: optionalString(obj.rarity),
    artist: optionalString(obj.artist),
    supertype: optionalString(obj.supertype),
    subtypes: optionalStringArray(obj.subtypes),
    imageSmall: optionalString(images.small),
    imageLarge: optionalString(images.large)
  };

  const rawMarket = lastSnapshot.market;
  const market = rawMarket === null || rawMarket === undefined ? NaN : Number(rawMarket);
  return { identity, market: Number.isFinite(market) ? market : null };
}

export function mockToLiveCards(cards: CardIdentity[]): LiveCard[] {
  return cards.map((identity) => ({ identity, market: null }));
}
