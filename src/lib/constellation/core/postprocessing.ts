import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js';

/**
 * Cinematic post pipeline (ported verbatim from LumenDeck): RenderPass →
 * UnrealBloomPass → CopyPass. BLOOM-ONLY by explicit decision — OutputPass /
 * ACES filmic tone mapping was rejected because every material here is authored
 * in display-ready sRGB and a linear→sRGB filmic curve visibly washes the data
 * colors to pastel. High bloom threshold (0.85) so only genuinely bright pixels
 * glow; wires and orb bodies stay crisp. Caller must supply an OPAQUE background
 * (UnrealBloomPass does not preserve canvas alpha).
 */

export interface PostPipelineOptions {
  strength?: number;
  radius?: number;
  threshold?: number;
}

export interface PostPipeline {
  render(): void;
  setSize(width: number, height: number): void;
  dispose(): void;
}

export function createPostPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  opts?: PostPipelineOptions,
): PostPipeline {
  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(Math.max(1, size.x), Math.max(1, size.y));

  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(Math.max(1, size.x), Math.max(1, size.y)),
    opts?.strength ?? 0.55,
    opts?.radius ?? 0.45,
    opts?.threshold ?? 0.85,
  );
  composer.addPass(bloom);
  const copyPass = new ShaderPass(CopyShader);
  composer.addPass(copyPass);

  let disposed = false;
  return {
    render() {
      if (!disposed) composer.render();
    },
    setSize(width, height) {
      if (disposed || width < 1 || height < 1) return;
      composer.setSize(width, height);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      // bloom owns a mip chain of render targets that composer.dispose() won't free.
      bloom.dispose();
      copyPass.material.dispose();
      composer.dispose();
    },
  };
}
