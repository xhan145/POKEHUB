import * as THREE from 'three';

/**
 * Three.js scene primitives for the constellation — gradient orbs, glowing
 * wires, neon ground grid, disposal. Ported from LumenDeck's graph3d/scene.ts
 * and genericized: the orb material is driven by explicit gradient stops +
 * accent (from a node's `color` channel via theme.ts), with no CSS-variable
 * resolution and no workflow-specific ring. PURE of app domain.
 */

/** World y of the neon ground grid (below the node plane band). */
export const GRID_Y = -620;

const WIRE_SEGMENTS = 28;
const WIRE_ARC = 40;

export interface WorldPoint {
  x: number;
  y: number;
  z: number;
}

/** Receding neon ground: a brand-colored grid plus a fainter oversized halo grid. */
export function buildNeonGrid(primary: string, secondary: string): THREE.Group {
  const group = new THREE.Group();

  const main = new THREE.GridHelper(4800, 48, new THREE.Color(primary), new THREE.Color(secondary));
  const mainMat = main.material as THREE.LineBasicMaterial;
  mainMat.transparent = true;
  mainMat.opacity = 0.16;
  mainMat.depthWrite = false;
  main.position.y = GRID_Y;
  group.add(main);

  const halo = new THREE.GridHelper(9600, 24, new THREE.Color(secondary), new THREE.Color(primary));
  const haloMat = halo.material as THREE.LineBasicMaterial;
  haloMat.transparent = true;
  haloMat.opacity = 0.07;
  haloMat.depthWrite = false;
  halo.position.y = GRID_Y - 40;
  group.add(halo);

  return group;
}

/** Quadratic-bezier control point a wire bows through (toward camera). */
export function wireControl(from: WorldPoint, to: WorldPoint): WorldPoint {
  return {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2,
    z: Math.max(from.z, to.z) + WIRE_ARC,
  };
}

function wireCurve(from: WorldPoint, to: WorldPoint): THREE.QuadraticBezierCurve3 {
  const c = wireControl(from, to);
  return new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(from.x, from.y, from.z),
    new THREE.Vector3(c.x, c.y, c.z),
    new THREE.Vector3(to.x, to.y, to.z),
  );
}

/** Build a glowing additive wire between two world points. */
export function makeWireLine(from: WorldPoint, to: WorldPoint, color: string): THREE.Line {
  const geometry = new THREE.BufferGeometry().setFromPoints(wireCurve(from, to).getPoints(WIRE_SEGMENTS));
  const material = new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  return new THREE.Line(geometry, material);
}

// ---- Orb node rendering (the LumenDeck 'orbs' style, genericized) ----------

const ORB_ACCENT_MIX = 0.16;

const ORB_VERTEX_SHADER = /* glsl */ `
  uniform float uRadius;
  varying float vT;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vT = clamp(position.y / uRadius * 0.5 + 0.5, 0.0, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const ORB_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uLow;
  uniform vec3 uMid;
  uniform vec3 uHigh;
  uniform vec3 uAccent;
  uniform float uAccentMix;
  uniform float uEmissive;
  uniform float uTime;
  varying float vT;
  varying vec3 vNormal;
  varying vec3 vViewPos;

  float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float vnoise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    float n000 = hash3(i);
    float n100 = hash3(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash3(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash3(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash3(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash3(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash3(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash3(i + vec3(1.0, 1.0, 1.0));
    return mix(
      mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
      mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
      f.z);
  }

  void main() {
    float lowMix = clamp(vT * 2.0, 0.0, 1.0);
    float highMix = clamp(vT * 2.0 - 1.0, 0.0, 1.0);
    vec3 grad = mix(mix(uLow, uMid, lowMix), uHigh, highMix);
    vec3 base = mix(grad, uAccent, uAccentMix);
    vec3 nrm = normalize(vNormal);
    vec3 viewDir = normalize(-vViewPos);
    float diff = 0.5 + 0.5 * max(dot(nrm, normalize(vec3(0.35, 0.85, 0.45))), 0.0);
    float rim = pow(1.0 - max(dot(nrm, viewDir), 0.0), 2.6);
    float conv = vnoise(nrm * 3.0 + vec3(0.0, uTime * 0.05, 0.0));
    conv = conv * 0.65 + vnoise(nrm * 7.0 - vec3(uTime * 0.03)) * 0.35;
    float surface = 1.0 + (conv - 0.5) * 0.18;
    float shimmer = 0.85 + 0.3 * vnoise(nrm * 5.0 + vec3(uTime * 0.11));
    vec3 color = base * (0.38 + 0.62 * diff) * surface + base * rim * 0.85 * shimmer;
    float core = pow(max(dot(nrm, viewDir), 0.0), 2.0);
    color += (base + vec3(0.18)) * uEmissive * 0.55;
    color += vec3(0.9, 0.95, 1.0) * core * uEmissive * 0.35;
    gl_FragColor = vec4(color, clamp(0.97 + uEmissive * 0.03, 0.0, 1.0));
  }
`;

/** Shared orb sphere geometry (smooth-shaded). Dispose on teardown. */
export function makeOrbGeometry(radius: number): THREE.SphereGeometry {
  return new THREE.SphereGeometry(radius, 48, 32);
}

/** Gradient orb material: three-stop vertical ramp + accent tint. */
export function makeOrbMaterial(stops: [string, string, string], accent: string, radius: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: ORB_VERTEX_SHADER,
    fragmentShader: ORB_FRAGMENT_SHADER,
    transparent: true,
    uniforms: {
      uRadius: { value: radius },
      uLow: { value: new THREE.Color(stops[0]) },
      uMid: { value: new THREE.Color(stops[1]) },
      uHigh: { value: new THREE.Color(stops[2]) },
      uAccent: { value: new THREE.Color(accent) },
      uAccentMix: { value: ORB_ACCENT_MIX },
      uEmissive: { value: 0 },
      uTime: { value: 0 },
    },
  });
}

/** Set an orb's luminosity glow (0..1) — the activity-recency emissive. */
export function setOrbEmissive(material: THREE.ShaderMaterial, value: number): void {
  material.uniforms.uEmissive.value = value;
}

/** Advance an orb's shimmer clock (seconds). Only animation loops call this. */
export function setOrbTime(material: THREE.ShaderMaterial, tSec: number): void {
  material.uniforms.uTime.value = tSec;
}

/** Dispose every geometry/material under root (idempotent, safe on groups). */
export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const drawable = obj as Partial<THREE.Mesh>;
    drawable.geometry?.dispose();
    const material = drawable.material;
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else if (material) (material as THREE.Material).dispose();
  });
}
