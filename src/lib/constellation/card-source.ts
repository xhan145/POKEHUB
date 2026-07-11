import type { Anomaly } from "./core/types";
import type { FlatNode } from "./providers";

/**
 * POKEHUB-authored source builder for the constellation engine. Lives alongside
 * the vendored engine but is NOT part of it: it turns the domain payload (cards
 * grouped by energy type + trust tier) into the engine's generic FlatNode tree.
 */

export type ConstellationCard = {
  id: string;
  name: string;
  type: string;
  price: number;
  tier: string;
  rarity: string;
  set: string;
};

export type TypeSummary = { type: string; count: number };

// Canonical TCG energy-type palette (spec card-source section). `Other` is the
// fallback for any unrecognized type string.
export const TYPE_COLOR: Record<string, string> = {
  Grass: "#4CA64C",
  Fire: "#E8503A",
  Water: "#4C86D6",
  Lightning: "#F2C438",
  Psychic: "#A24CC8",
  Fighting: "#B85C38",
  Darkness: "#3A3A4A",
  Metal: "#8A97A6",
  Dragon: "#C9A227",
  Fairy: "#E489B1",
  Colorless: "#C9C6BE",
  Trainer: "#5AA0A0",
  Energy: "#9B7ED6",
  Other: "#8892A0"
};

// Trust tier -> emissive glow (recency/verification). Spec card-source section.
const TIER_GLOW: Record<string, number> = {
  VERIFIED: 1,
  SOLID: 0.7,
  SINGLE_SOURCE: 0.45,
  STALE: 0.2,
  NONE: 0.1
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function colorForType(type: string): string {
  return TYPE_COLOR[type] ?? TYPE_COLOR.Other;
}

// mass = clamp(log10(price+1)/3, 0.05, 1): $0->0.05, $10->~0.34, $1000->1.
function massForPrice(price: number): number {
  const safePrice = Number.isFinite(price) && price > 0 ? price : 0;
  return clamp(Math.log10(safePrice + 1) / 3, 0.05, 1);
}

function luminosityForTier(tier: string): number {
  return TIER_GLOW[tier] ?? TIER_GLOW.NONE;
}

function anomalyForTier(tier: string): Anomaly {
  if (tier === "STALE") return "warn";
  if (tier === "NONE") return "error";
  return "none";
}

/**
 * Build the flat parent-pointer tree the engine's `buildTreeSource` consumes:
 * root -> one cluster per type -> one leaf per card. Deterministic: clusters
 * follow `types` order, leaves follow `cards` order.
 */
export function buildCardFlatNodes(
  cards: ConstellationCard[],
  types: TypeSummary[]
): FlatNode[] {
  const nodes: FlatNode[] = [];

  for (const summary of types) {
    nodes.push({
      id: `type:${summary.type}`,
      parentId: null,
      node: {
        color: colorForType(summary.type),
        label: `${summary.type} (${summary.count})`
      }
    });
  }

  for (const card of cards) {
    nodes.push({
      id: `card:${card.id}`,
      parentId: `type:${card.type}`,
      node: {
        color: colorForType(card.type),
        mass: massForPrice(card.price),
        luminosity: luminosityForTier(card.tier),
        anomaly: anomalyForTier(card.tier),
        label: card.name,
        data: card
      }
    });
  }

  return nodes;
}
