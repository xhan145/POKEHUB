import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { Constellation as Engine } from '../core/constellation';
import type { ConstellationOptions, SelectPayload } from '../core/constellation';
import type { NodeProvider, Theme } from '../core/types';

export interface ConstellationViewProps extends ConstellationOptions {
  provider: NodeProvider;
  theme?: Theme;
  onSelect?: (payload: SelectPayload) => void;
  onExpand?: (payload: SelectPayload) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * React wrapper. The engine renders INTO the canvas this component owns — it
 * never appends or removes DOM nodes — so there is no reconciler conflict (the
 * failure mode that blanked VaultTree3D's old FileGraph). Provider/theme changes
 * are pushed to the live engine without remounting.
 */
export function ConstellationView({
  provider,
  theme,
  onSelect,
  onExpand,
  className,
  style,
  budget,
  bloom,
}: ConstellationViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  // Keep latest callbacks without re-mounting the engine.
  const cbRef = useRef({ onSelect, onExpand });
  cbRef.current = { onSelect, onExpand };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new Engine({ theme, budget, bloom });
    engineRef.current = engine;
    engine.mount(canvas);
    const offSelect = engine.on('select', (p) => cbRef.current.onSelect?.(p));
    const offExpand = engine.on('expand', (p) => cbRef.current.onExpand?.(p));

    const host = canvas.parentElement ?? canvas;
    const ro = new ResizeObserver(() => {
      engine.resize(host.clientWidth || canvas.clientWidth, host.clientHeight || canvas.clientHeight);
    });
    ro.observe(host);

    return () => {
      offSelect();
      offExpand();
      ro.disconnect();
      engine.dispose();
      engineRef.current = null;
    };
    // Mount once; provider/theme are pushed via the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setProvider(provider);
  }, [provider]);

  useEffect(() => {
    if (theme) engineRef.current?.setTheme(theme);
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', ...style }}
    />
  );
}
