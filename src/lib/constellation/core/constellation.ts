import * as THREE from 'three';
import type { ConstellationNode, NodeProvider, Theme, WorkingSet } from './types';
import { DEFAULT_THEME } from './types';
import { buildNeonGrid, disposeObject3D } from './scene';
import { LODRenderer } from './renderer';
import { ViewportController } from './viewport';
import { HierarchicalLayout } from './layout';
import { createPostPipeline, type PostPipeline } from './postprocessing';

export interface ConstellationOptions {
  theme?: Theme;
  /** Max nodes requested per query (working-set cap). */
  budget?: number;
  /** Enable the bloom post pipeline (cinematic tier). */
  bloom?: boolean;
}

export type ConstellationEvent = 'select' | 'hover' | 'expand';
export interface SelectPayload {
  node: ConstellationNode | null;
}

type Handler = (payload: SelectPayload) => void;

/**
 * The engine facade. `mount(canvas)` wires renderer + scene + camera + bloom and
 * starts a dirty-driven loop. Feed it a NodeProvider; it queries on mount, on
 * provider change, and on drill-in (focus), lays the working set out
 * deterministically, and reconciles the two-tier renderer. Idle scenes stop
 * rendering (GPU sleep) until the camera moves or data changes.
 */
export class Constellation {
  private theme: Theme;
  private readonly budget: number;
  private readonly useBloom: boolean;

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private viewport?: ViewportController;
  private lod?: LODRenderer;
  private grid?: THREE.Group;
  private post?: PostPipeline;
  private readonly layout = new HierarchicalLayout();

  private provider?: NodeProvider;
  private focusId?: string;
  private lastWorkingSet?: WorkingSet;
  private byId = new Map<string, ConstellationNode>();

  private canvas?: HTMLCanvasElement;
  private rafId = 0;
  private dirty = true;
  private idleFrames = 0;
  private clock = new THREE.Clock();
  private running = false;

  private readonly handlers: Record<ConstellationEvent, Set<Handler>> = {
    select: new Set(),
    hover: new Set(),
    expand: new Set(),
  };

  constructor(opts: ConstellationOptions = {}) {
    this.theme = opts.theme ?? DEFAULT_THEME;
    this.budget = opts.budget ?? 2000;
    this.useBloom = opts.bloom ?? true;
  }

  mount(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    const width = canvas.clientWidth || 800;
    const height = canvas.clientHeight || 600;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    renderer.setClearColor(new THREE.Color(this.theme.background), 1);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(this.theme.background);
    scene.fog = new THREE.FogExp2(this.theme.background, 0.00035);
    this.scene = scene;

    // Lights: the leaf InstancedMesh uses a standard material; cluster orbs are
    // unlit shaders and ignore these.
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.PointLight(0xffffff, 1.1, 0, 0);
    key.position.set(200, 400, 300);
    scene.add(key);

    this.grid = buildNeonGrid(this.theme.gridPrimary, this.theme.gridSecondary);
    scene.add(this.grid);

    this.lod = new LODRenderer(this.theme);
    scene.add(this.lod.group);

    this.viewport = new ViewportController(canvas, width, height);
    this.viewport.onChange(() => this.wake());

    canvas.addEventListener('click', this.handleClick);

    if (this.useBloom) {
      // Gentle, high-threshold bloom: only the brightest cores glow, so orb
      // gradient/data colors survive instead of washing to white.
      this.post = createPostPipeline(renderer, scene, this.viewport.camera, { strength: 0.42, radius: 0.4, threshold: 0.9 });
    }

    this.running = true;
    this.clock.start();
    this.loop();
    if (this.provider) void this.refresh();
  }

  setProvider(provider: NodeProvider): void {
    this.provider = provider;
    this.focusId = undefined;
    if (this.running) void this.refresh();
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    this.lod?.setTheme(theme);
    if (this.scene) {
      this.scene.background = new THREE.Color(theme.background);
      (this.scene.fog as THREE.FogExp2).color.set(theme.background);
    }
    this.renderer?.setClearColor(new THREE.Color(theme.background), 1);
    this.wake();
  }

  /** Drill into a cluster (or null to return to root) and re-query. */
  focus(id: string | null): void {
    this.focusId = id ?? undefined;
    if (id) this.emit('expand', { node: this.byId.get(id) ?? null });
    void this.refresh();
  }

  on(event: ConstellationEvent, handler: Handler): () => void {
    this.handlers[event].add(handler);
    return () => this.handlers[event].delete(handler);
  }

  resize(width: number, height: number): void {
    if (!this.renderer || !this.viewport) return;
    this.renderer.setSize(width, height, false);
    this.viewport.resize(width, height);
    this.post?.setSize(width, height);
    this.wake();
  }

  private async refresh(): Promise<void> {
    if (!this.provider || !this.viewport || !this.lod) return;
    const q = this.viewport.query(this.budget, this.focusId);
    const ws = await this.provider.query(q);
    this.lastWorkingSet = ws;
    this.byId = new Map(ws.nodes.map((n) => [n.id, n]));
    // Assign deterministic positions to any node the provider left unplaced.
    this.layout.assign(ws.nodes);
    this.lod.update(ws.nodes);
    this.wake();
  }

  /** The last working set returned by the provider (for HUD/readouts). */
  get workingSet(): WorkingSet | undefined {
    return this.lastWorkingSet;
  }

  /** Live renderer stats (draw calls / triangles) — for diagnostics/tests. */
  get info(): { calls: number; triangles: number; frame: number } | undefined {
    const r = this.renderer?.info.render;
    return r ? { calls: r.calls, triangles: r.triangles, frame: r.frame } : undefined;
  }

  /**
   * Render the raw scene once (bypassing the bloom composer) and report true
   * geometry draw stats. Diagnostics only — `renderer.info` under the composer
   * otherwise reflects the final full-screen copy pass, not the scene.
   */
  debugSceneRender(): { calls: number; triangles: number } | undefined {
    if (!this.renderer || !this.scene || !this.viewport) return undefined;
    this.renderer.render(this.scene, this.viewport.camera);
    const r = this.renderer.info.render;
    return { calls: r.calls, triangles: r.triangles };
  }

  private wake(): void {
    this.dirty = true;
    this.idleFrames = 0;
  }

  private loop = (): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);
    const moving = this.viewport?.update() ?? false;
    if (moving) this.wake();
    if (!this.dirty && this.idleFrames > 2) return; // GPU sleep when settled
    this.render();
  };

  private render(): void {
    if (!this.renderer || !this.scene || !this.viewport) return;
    this.lod?.setTime(this.clock.getElapsedTime());
    if (this.post) this.post.render();
    else this.renderer.render(this.scene, this.viewport.camera);
    if (this.dirty) {
      this.dirty = false;
    } else {
      this.idleFrames++;
    }
  }

  private handleClick = (ev: MouseEvent): void => {
    if (!this.canvas || !this.viewport || !this.lod) return;
    const rect = this.canvas.getBoundingClientRect();
    const ndcX = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    const ray = this.viewport.raycastFrom(ndcX, ndcY);
    const id = this.lod.pick(ray);
    const node = id ? this.byId.get(id) ?? null : null;
    this.emit('select', { node });
    if (node?.kind === 'cluster') this.focus(node.id);
  };

  private emit(event: ConstellationEvent, payload: SelectPayload): void {
    for (const h of this.handlers[event]) h(payload);
  }

  dispose(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.canvas?.removeEventListener('click', this.handleClick);
    this.provider?.dispose?.();
    this.post?.dispose();
    this.lod?.dispose();
    if (this.grid) disposeObject3D(this.grid);
    this.renderer?.dispose();
  }
}
