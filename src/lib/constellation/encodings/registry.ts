/**
 * Data→visual encoding registry for the constellation. PURE, unit-tested.
 *
 * Ported principle from LumenDeck: no visual layer may render without a registry
 * entry naming the exact datum it encodes. Generalized here to the engine's
 * generic channels (mass / luminosity / anomaly / color) so any app inherits the
 * same auditable discipline. `auditLayers` lets an app assert (in a test) that
 * every layer it renders is accounted for.
 */

/** A render layer that must justify itself with a data source. */
export type EncodingLayer =
  | 'orbs'
  | 'wires'
  | 'fabric'
  | 'anomaly'
  | 'luminosity'
  | 'particles'
  | 'energyFlow'
  | 'environment';

export interface EncodingEntry {
  /** Stable id (also the human-facing legend name). */
  id: string;
  /** Exact datum this encoding reads, as an auditable string. */
  datum: string;
  /** The visual channel it drives. */
  channel: string;
  /** The render layer that owns the channel. */
  layer: EncodingLayer;
  /** Always on (vs behind a toggle / higher quality tier). */
  alwaysOn: boolean;
}

/** The registry. Every shipped visual layer MUST appear here. */
export const ENCODINGS: readonly EncodingEntry[] = [
  {
    id: 'color',
    datum: 'ConstellationNode.color (accent or 3-stop gradient)',
    channel: 'orb vertical gradient + category tint',
    layer: 'orbs',
    alwaysOn: true,
  },
  {
    id: 'cluster-size',
    datum: 'ConstellationNode.clusterCount (descendant count)',
    channel: 'galaxy orb radius + count glow',
    layer: 'orbs',
    alwaysOn: true,
  },
  {
    id: 'edges',
    datum: 'ConstellationEdge[] (from/to)',
    channel: 'glowing bezier wire lines',
    layer: 'wires',
    alwaysOn: true,
  },
  {
    id: 'mass',
    datum: 'ConstellationNode.mass (0..1)',
    channel: 'fabric well depth + sigma (spacetime warp)',
    layer: 'fabric',
    alwaysOn: true,
  },
  {
    id: 'anomaly',
    datum: 'ConstellationNode.anomaly (none|warn|error)',
    channel: 'palette-breaking outline ring (red error / amber warn)',
    layer: 'anomaly',
    alwaysOn: true,
  },
  {
    id: 'luminosity',
    datum: 'ConstellationNode.luminosity (0..1 recency/activity)',
    channel: 'orb emissive glow',
    layer: 'luminosity',
    alwaysOn: true,
  },
  {
    id: 'gravity-dust',
    datum: 'mass field (packWells of node.mass)',
    channel: 'volumetric particle infall / orbital streams',
    layer: 'particles',
    alwaysOn: false,
  },
  {
    id: 'energy-flow',
    datum: 'ConstellationEdge[] traversed as directed pulses',
    channel: 'traveling light pulses along wires',
    layer: 'energyFlow',
    alwaysOn: false,
  },
];

export interface AuditResult {
  ok: boolean;
  missing: EncodingLayer[];
}

/**
 * Assert that every active render layer has at least one registry entry. An app
 * calls this in a test with the layers it actually renders; an unregistered
 * layer fails the audit (and, wired into CI, fails the build).
 */
export function auditLayers(activeLayers: EncodingLayer[]): AuditResult {
  const registered = new Set(ENCODINGS.map((e) => e.layer));
  const missing = activeLayers.filter((layer) => !registered.has(layer));
  return { ok: missing.length === 0, missing };
}
