import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { ViewportQuery } from './types';

/**
 * Owns the camera + orbit controls and translates them into a ViewportQuery.
 * `lod` is derived from camera distance (closer → higher). Emits `onChange`
 * whenever the user moves the camera so the host can wake its render loop.
 */
export class ViewportController {
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  private readonly raycaster = new THREE.Raycaster();

  constructor(domElement: HTMLElement, width: number, height: number) {
    this.camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 20000);
    this.camera.position.set(0, 180, 420);
    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxDistance = 6000;
    this.controls.minDistance = 20;
  }

  onChange(handler: () => void): void {
    this.controls.addEventListener('change', handler);
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /** Distance-derived level of detail: 0 far → grows as you zoom in. */
  lod(): number {
    const dist = this.camera.position.distanceTo(this.controls.target);
    // ~0 at 6000 units out, ~6 up close.
    return Math.max(0, Math.log2(6000 / Math.max(1, dist)));
  }

  query(budget: number, focusId?: string): ViewportQuery {
    const p = this.camera.position;
    const t = this.controls.target;
    return {
      camera: { position: { x: p.x, y: p.y, z: p.z }, target: { x: t.x, y: t.y, z: t.z } },
      lod: this.lod(),
      focusId,
      budget,
    };
  }

  /** Set up a raycaster from normalized device coords (-1..1). */
  raycastFrom(ndcX: number, ndcY: number): THREE.Raycaster {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    return this.raycaster;
  }

  update(): boolean {
    return this.controls.update();
  }

  dispose(): void {
    this.controls.dispose();
  }
}
