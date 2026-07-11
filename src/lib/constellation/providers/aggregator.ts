import type {
  ConstellationNode,
  ConstellationEdge,
  NodeProvider,
  ViewportQuery,
  WorkingSet,
} from '../core/types';

/**
 * One child in a tree source. `subtreeCount` is the number of LEAF descendants
 * (1 for a leaf) — precomputed by the source (e.g. a SQL rollup) so the
 * aggregator never has to walk a subtree to size it. `node` carries the generic
 * visual channels + payload the engine renders.
 */
export interface AggNode {
  id: string;
  isLeaf: boolean;
  subtreeCount: number;
  node: Omit<ConstellationNode, 'id' | 'kind' | 'clusterCount' | 'position'>;
}

/**
 * The lazy tree boundary the aggregator reads. `children(id)` is called ONLY for
 * the path the user has drilled into — an in-memory map, an IndexedDB cursor, a
 * SQLite `GROUP BY parent`, or a future network call all satisfy it identically.
 */
export interface TreeSource {
  rootId: string;
  children(id: string): AggNode[];
}

export interface AggregatorOptions {
  /** Override which node is treated as the root (defaults to source.rootId). */
  rootId?: string;
}

/**
 * NodeProvider that turns a hierarchical source into a bounded working set:
 * the focused node's direct children, each internal child shown as a cluster
 * (galaxy) summarizing its subtree and each leaf as a star. Capped to
 * `budget`, largest subtrees kept first. Stateless w.r.t. focus — the engine
 * passes `focusId`, so identical queries yield identical results (deterministic).
 *
 * First-slice policy renders one drill level at a time; deeper simultaneous
 * aggregation (mixing levels within one budget) is a later refinement behind the
 * same interface.
 */
export class HierarchicalAggregator implements NodeProvider {
  private readonly source: TreeSource;
  private readonly rootId: string;

  constructor(source: TreeSource, opts: AggregatorOptions = {}) {
    this.source = source;
    this.rootId = opts.rootId ?? source.rootId;
  }

  query(q: ViewportQuery): WorkingSet {
    const focus = q.focusId ?? this.rootId;
    const children = this.source.children(focus);

    const total = this.source
      .children(this.rootId)
      .reduce((sum, c) => sum + c.subtreeCount, 0);

    const ranked = [...children].sort((a, b) => b.subtreeCount - a.subtreeCount);
    const budget = Math.max(0, Math.floor(q.budget));
    const kept = ranked.slice(0, budget);

    const nodes: ConstellationNode[] = kept.map((c) => {
      const isCluster = !c.isLeaf;
      return {
        ...c.node,
        id: c.id,
        kind: isCluster ? 'cluster' : 'leaf',
        ...(isCluster ? { clusterCount: c.subtreeCount } : {}),
      };
    });

    // First slice draws no edges between siblings; energy/wires come from the
    // app's own edge set when one exists.
    const edges: ConstellationEdge[] = [];

    return { nodes, edges, total };
  }

  /** Focus is driven via ViewportQuery.focusId, so expand is a no-op hook. */
  expand(): void {}
}
