import type { ConstellationNode } from '../core/types';
import type { AggNode, TreeSource } from './aggregator';

/** A node in a flat parent-pointer list (the easiest way to describe a tree). */
export interface FlatNode {
  id: string;
  parentId: string | null;
  /** Generic visual channels + payload for this node. */
  node?: Omit<ConstellationNode, 'id' | 'kind' | 'clusterCount' | 'position'>;
}

/**
 * Build an in-memory {@link TreeSource} from a flat parent-pointer list,
 * rolling up leaf-descendant counts once so `children()` is O(1). Reusable for
 * demos, tests, and as a client-side fallback when an app already holds its
 * whole (moderate) dataset in memory.
 */
export function buildTreeSource(flat: FlatNode[], rootId = 'root'): TreeSource {
  const childIds = new Map<string, string[]>();
  const byId = new Map<string, FlatNode>();
  for (const f of flat) {
    byId.set(f.id, f);
    const key = f.parentId ?? rootId;
    const list = childIds.get(key);
    if (list) list.push(f.id);
    else childIds.set(key, [f.id]);
  }

  const countCache = new Map<string, number>();
  const subtreeCount = (id: string): number => {
    const cached = countCache.get(id);
    if (cached !== undefined) return cached;
    const kids = childIds.get(id);
    const count = !kids || kids.length === 0 ? 1 : kids.reduce((s, k) => s + subtreeCount(k), 0);
    countCache.set(id, count);
    return count;
  };

  const children = (id: string): AggNode[] => {
    const kids = childIds.get(id) ?? [];
    return kids.map((kid) => {
      const isLeaf = !childIds.has(kid) || childIds.get(kid)!.length === 0;
      return {
        id: kid,
        isLeaf,
        subtreeCount: subtreeCount(kid),
        node: byId.get(kid)?.node ?? {},
      };
    });
  };

  return { rootId, children };
}
