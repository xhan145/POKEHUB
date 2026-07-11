import type { ConstellationNode, Theme } from './types';

/**
 * Resolve a node's `color` channel to the 3-stop vertical gradient the orb
 * shader wants. An explicit [low,mid,high] passes through; a single accent
 * string becomes a dark→accent→light ramp; absent color falls back to the
 * theme's default gradient. PURE.
 */
export function orbGradient(node: Pick<ConstellationNode, 'color'>, theme: Theme): [string, string, string] {
  const c = node.color;
  if (Array.isArray(c)) return c;
  if (typeof c === 'string') return rampFromAccent(c, theme);
  return theme.defaultGradient;
}

/** The accent color used for tint / ring / bulk instance color. */
export function nodeAccent(node: Pick<ConstellationNode, 'color'>, theme: Theme): string {
  const c = node.color;
  if (Array.isArray(c)) return c[2];
  if (typeof c === 'string') return c;
  return theme.accentPrimary;
}

function rampFromAccent(accent: string, theme: Theme): [string, string, string] {
  // Low = dark bg-mixed, mid = the accent, high = light accent. Kept simple and
  // shader-friendly (concrete hex strings); shading/rim handled in the shader.
  return [mix(accent, theme.background, 0.72), accent, mix(accent, '#ffffff', 0.55)];
}

/** Blend two #rrggbb colors (t=0 → a, t=1 → b). Tolerates shorthand-free hex. */
export function mix(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  if (!ca || !cb) return a;
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  return `#${[r, g, bl].map((v) => clamp255(v).toString(16).padStart(2, '0')).join('')}`;
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}
