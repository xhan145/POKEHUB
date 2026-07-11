import type { ConstellationNode, Vec3 } from './types';

/** Golden angle (radians) — the phyllotaxis spacing that gives an even, seam-free
 *  spread (same constant LumenDeck's FileGraph used: index * 2.399963…). */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export interface LayoutOptions {
  /** World-unit spacing factor between successive spiral rings. */
  spacing?: number;
  /** Vertical wobble amplitude so the plane isn't perfectly flat. */
  heightJitter?: number;
}

/**
 * Deterministic placement for a level of the constellation. Nodes without an
 * app-supplied `position` are laid out on a golden-angle spiral on the y≈0
 * plane; a node's slot is decided by its RANK when the level's ids are sorted,
 * NOT by array order — so re-querying the same focus yields identical positions
 * (no thrash) regardless of provider ordering. App-provided positions are left
 * untouched.
 */
export class HierarchicalLayout {
  private readonly spacing: number;
  private readonly heightJitter: number;

  constructor(opts: LayoutOptions = {}) {
    this.spacing = opts.spacing ?? 46;
    this.heightJitter = opts.heightJitter ?? 12;
  }

  assign(nodes: ConstellationNode[]): void {
    const needsLayout = nodes.filter((node) => !isVec3(node.position));
    // Stable slot assignment: rank by id so positions are order-independent.
    const ranked = [...needsLayout].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    ranked.forEach((node, index) => {
      node.position = this.slot(index);
    });
  }

  /** The world position for the i-th slot on the golden-angle spiral. */
  slot(index: number): Vec3 {
    const angle = index * GOLDEN_ANGLE;
    const radius = this.spacing * Math.sqrt(index + 0.5);
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(index * 1.3) * this.heightJitter,
      z: Math.sin(angle) * radius,
    };
  }
}

function isVec3(v: unknown): v is Vec3 {
  return (
    !!v &&
    typeof v === 'object' &&
    Number.isFinite((v as Vec3).x) &&
    Number.isFinite((v as Vec3).y) &&
    Number.isFinite((v as Vec3).z)
  );
}
