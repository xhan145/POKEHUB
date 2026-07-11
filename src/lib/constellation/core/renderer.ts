import * as THREE from 'three';
import type { ConstellationNode, Theme } from './types';
import {
  makeOrbGeometry,
  makeOrbMaterial,
  setOrbEmissive,
  setOrbTime,
  disposeObject3D,
} from './scene';
import { orbGradient, nodeAccent } from './theme';

/**
 * Two-tier renderer + working-set reconciler. CLUSTERS (galaxies, few) render as
 * full-fidelity gradient orbs — the hero look, bloom-lit. LEAVES (the bulk)
 * render as a single InstancedMesh (one draw call) with per-instance color and
 * scale, so a working set of thousands stays at ~a handful of draw calls.
 *
 * `update()` diffs the incoming working set against what's on screen and adds /
 * removes / repositions objects; nothing is rebuilt from scratch per frame.
 * Positions must already be assigned (by the LayoutStrategy) before update().
 */

const LEAF_CAPACITY = 8192;
const BASE_LEAF_RADIUS = 3.2;
const BASE_CLUSTER_RADIUS = 6;
/** How fast a galaxy orb grows with its descendant count (log-scaled). */
const CLUSTER_GROWTH = 0.32;
/** Cap so a mega-folder galaxy never becomes a screen-filling white blob. */
const MAX_CLUSTER_RADIUS = 22;

interface ClusterEntry {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  ring?: THREE.Mesh;
}

export class LODRenderer {
  readonly group = new THREE.Group();
  private theme: Theme;

  private readonly clusters = new Map<string, ClusterEntry>();
  private readonly clusterGeo: THREE.SphereGeometry;

  private readonly leafMesh: THREE.InstancedMesh;
  private readonly leafGeo: THREE.SphereGeometry;
  private readonly leafMat: THREE.MeshStandardMaterial;
  private leafIds: string[] = [];

  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();

  constructor(theme: Theme) {
    this.theme = theme;
    this.clusterGeo = makeOrbGeometry(1); // unit sphere; per-cluster scale via mesh.scale

    this.leafGeo = new THREE.SphereGeometry(1, 16, 12);
    this.leafMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 1,
      roughness: 0.4,
      metalness: 0.15,
      transparent: true,
      opacity: 0.98,
    });
    this.leafMesh = new THREE.InstancedMesh(this.leafGeo, this.leafMat, LEAF_CAPACITY);
    this.leafMesh.count = 0;
    this.leafMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.leafMesh);
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
  }

  /** Reconcile on-screen objects to match `nodes` (positions pre-assigned). */
  update(nodes: ConstellationNode[]): void {
    const clusterNodes = nodes.filter((n) => n.kind === 'cluster');
    const leafNodes = nodes.filter((n) => n.kind === 'leaf');
    this.reconcileClusters(clusterNodes);
    this.reconcileLeaves(leafNodes);
  }

  private reconcileClusters(clusterNodes: ConstellationNode[]): void {
    const seen = new Set<string>();
    for (const node of clusterNodes) {
      seen.add(node.id);
      const pos = node.position ?? { x: 0, y: 0, z: 0 };
      const radius = Math.min(
        MAX_CLUSTER_RADIUS,
        BASE_CLUSTER_RADIUS * (1 + Math.log10((node.clusterCount ?? 1) + 1) * CLUSTER_GROWTH),
      );
      let entry = this.clusters.get(node.id);
      if (!entry) {
        const material = makeOrbMaterial(orbGradient(node, this.theme), nodeAccent(node, this.theme), 1);
        const mesh = new THREE.Mesh(this.clusterGeo, material);
        this.group.add(mesh);
        entry = { mesh, material };
        this.clusters.set(node.id, entry);
      }
      entry.mesh.position.set(pos.x, pos.y, pos.z);
      entry.mesh.scale.setScalar(radius);
      setOrbEmissive(entry.material, node.luminosity ?? 0);
      this.syncRing(entry, node, radius, pos);
    }
    for (const [id, entry] of this.clusters) {
      if (!seen.has(id)) {
        this.group.remove(entry.mesh);
        entry.material.dispose();
        if (entry.ring) {
          this.group.remove(entry.ring);
          disposeObject3D(entry.ring);
        }
        this.clusters.delete(id);
      }
    }
  }

  private syncRing(entry: ClusterEntry, node: ConstellationNode, radius: number, pos: { x: number; y: number; z: number }): void {
    const anomaly = node.anomaly ?? 'none';
    if (anomaly === 'none') {
      if (entry.ring) {
        this.group.remove(entry.ring);
        disposeObject3D(entry.ring);
        entry.ring = undefined;
      }
      return;
    }
    const color = anomaly === 'error' ? this.theme.anomalyError : this.theme.anomalyWarn;
    if (!entry.ring) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1, 0.06, 8, 40),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      ring.rotation.x = Math.PI / 2;
      this.group.add(ring);
      entry.ring = ring;
    }
    (entry.ring.material as THREE.MeshBasicMaterial).color.set(color);
    entry.ring.position.set(pos.x, pos.y, pos.z);
    entry.ring.scale.setScalar(radius + 3);
  }

  private reconcileLeaves(leafNodes: ConstellationNode[]): void {
    const count = Math.min(leafNodes.length, LEAF_CAPACITY);
    this.leafIds = new Array(count);
    for (let i = 0; i < count; i++) {
      const node = leafNodes[i];
      const pos = node.position ?? { x: 0, y: 0, z: 0 };
      const radius = BASE_LEAF_RADIUS * (0.7 + (node.mass ?? 0.3) * 1.6);
      this.dummy.position.set(pos.x, pos.y, pos.z);
      this.dummy.scale.setScalar(radius);
      this.dummy.updateMatrix();
      this.leafMesh.setMatrixAt(i, this.dummy.matrix);
      this.color.set(nodeAccent(node, this.theme));
      // fold luminosity into brightness so recent leaves read hotter under bloom
      const lum = node.luminosity ?? 0;
      this.color.multiplyScalar(0.8 + lum * 0.6);
      this.leafMesh.setColorAt(i, this.color);
      this.leafIds[i] = node.id;
    }
    this.leafMesh.count = count;
    this.leafMesh.instanceMatrix.needsUpdate = true;
    if (this.leafMesh.instanceColor) this.leafMesh.instanceColor.needsUpdate = true;
  }

  /** Advance shimmer clocks (only while an animation loop runs). */
  setTime(tSec: number): void {
    for (const entry of this.clusters.values()) setOrbTime(entry.material, tSec);
  }

  /** Resolve a raycaster hit to a node id (clusters + instanced leaves). */
  pick(raycaster: THREE.Raycaster): string | null {
    const clusterMeshes = [...this.clusters.entries()];
    for (const [id, entry] of clusterMeshes) {
      if (raycaster.intersectObject(entry.mesh, false).length > 0) return id;
    }
    const hit = raycaster.intersectObject(this.leafMesh, false)[0];
    if (hit && hit.instanceId !== undefined && hit.instanceId < this.leafIds.length) {
      return this.leafIds[hit.instanceId];
    }
    return null;
  }

  dispose(): void {
    for (const entry of this.clusters.values()) {
      entry.material.dispose();
      if (entry.ring) disposeObject3D(entry.ring);
    }
    this.clusters.clear();
    this.clusterGeo.dispose();
    this.leafGeo.dispose();
    this.leafMat.dispose();
    this.leafMesh.dispose();
  }
}
