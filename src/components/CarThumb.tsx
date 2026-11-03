import { useEffect, useRef } from 'react';
import type { CarSpec } from '../game/cars';
import { drawCarPreview } from '../game/render';

type Props = { spec: CarSpec; className?: string };

export function CarThumb({ spec, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawCarPreview(ctx, spec, rect.width, rect.height);
  }, [spec]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
