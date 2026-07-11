/**
 * The reusable constellation contract. Domain-agnostic: an app describes its
 * data as ConstellationNodes + edges and implements a NodeProvider; the engine
 * renders whatever working set the provider returns for the current viewport.
 *
 * These types are the ONLY surface an app must understand to use the engine.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Anomaly state → a palette-breaking outline ring (error red / warn amber). */
export type Anomaly = 'none' | 'warn' | 'error';

/**
 * A single renderable node. `kind` distinguishes an individual datum (`leaf`,
 * e.g. one file) from an aggregate summarizing many (`cluster`, e.g. a folder
 * shown as one galaxy). All visual inputs are generic named channels so no
 * app-specific meaning leaks into the engine.
 */
export interface ConstellationNode {
  id: string;
  kind: 'leaf' | 'cluster';
  /** For clusters: how many descendants this galaxy summarizes (drives size/glow). */
  clusterCount?: number;
  /** App-controlled world position. If absent, the LayoutStrategy assigns one. */
  position?: Vec3;
  /** 0..1 → fabric well depth (spacetime warp) + orbital pull. */
  mass?: number;
  /** 0..1 → emissive activity glow (recency). */
  luminosity?: number;
  /** → outline ring. */
  anomaly?: Anomaly;
  /** Accent color or an explicit 3-stop vertical gradient [low, mid, high]. */
  color?: string | [string, string, string];
  /** Short human label (shown near the orb at close LOD). */
  label?: string;
  /** Opaque app payload echoed back on select/hover (e.g. the FileItem). */
  data?: unknown;
}

export interface ConstellationEdge {
  from: string;
  to: string;
  kind?: string;
}

/**
 * What the engine asks the provider for as the camera moves. The provider is
 * free to return clusters, leaves, or a mix — as long as it stays within
 * `budget`. Issued debounced during navigation.
 */
export interface ViewportQuery {
  camera: { position: Vec3; target: Vec3 };
  /** Engine-derived zoom level (higher = closer / more detail requested). */
  lod: number;
  /** The node the user has drilled into, if any (its children are candidates). */
  focusId?: string;
  /** Max nodes the engine wants back. The provider MUST NOT exceed this. */
  budget: number;
}

export interface WorkingSet {
  nodes: ConstellationNode[];
  edges: ConstellationEdge[];
  /** Total dataset size (all leaves), for HUD/scale readouts. */
  total: number;
}

/**
 * The seam every consumer implements. `query` is the hot path (called per
 * navigation batch). `expand` is an optional drill-in hook. A future remote
 * data-service is just a NodeProvider whose query() hits the network.
 */
export interface NodeProvider {
  query(q: ViewportQuery): WorkingSet | Promise<WorkingSet>;
  expand?(clusterId: string): void | Promise<void>;
  dispose?(): void;
}

/** Visual theme — replaces LumenDeck's CSS-variable resolution so the engine
 *  runs headless / in any app. Colors are concrete strings THREE.Color parses. */
export interface Theme {
  background: string;
  /** Primary accent (cyan-ish) and secondary accent (violet-ish). */
  accentPrimary: string;
  accentSecondary: string;
  /** Neon ground grid colors. */
  gridPrimary: string;
  gridSecondary: string;
  /** Default 3-stop orb gradient when a node provides no color. */
  defaultGradient: [string, string, string];
  anomalyWarn: string;
  anomalyError: string;
}

export const DEFAULT_THEME: Theme = {
  background: '#05070f',
  accentPrimary: '#22d3ee',
  accentSecondary: '#8b5cf6',
  gridPrimary: '#22d3ee',
  gridSecondary: '#8b5cf6',
  defaultGradient: ['#0e2740', '#2563eb', '#a5f3fc'],
  anomalyWarn: '#f59e0b',
  anomalyError: '#ef4444',
};
