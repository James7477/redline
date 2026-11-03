import type { CarSpec } from './cars';

export type Livery = { paint: string; rim: string };

export const STOCK = 'stock';

export const DEFAULT_LIVERY: Livery = { paint: STOCK, rim: STOCK };

export const PAINTS = [
  { id: 'ember', name: 'Ember', body: '#e8402f' },
  { id: 'violet', name: 'Violet', body: '#7358ff' },
  { id: 'teal', name: 'Teal', body: '#25c9b0' },
  { id: 'volt', name: 'Volt', body: '#d8e23a' },
  { id: 'ice', name: 'Ice', body: '#cfd8ea' },
  { id: 'magenta', name: 'Magenta', body: '#e0338a' },
  { id: 'sunset', name: 'Sunset', body: '#ff8a3c' },
  { id: 'carbon', name: 'Carbon', body: '#3a3f4d' },
];

export const RIMS = [
  { id: 'gold', name: 'Gold', color: '#ffc247' },
  { id: 'chrome', name: 'Chrome', color: '#dfe6f4' },
  { id: 'cyan', name: 'Cyan', color: '#3ddad7' },
  { id: 'blood', name: 'Blood', color: '#ff3b4e' },
  { id: 'violet', name: 'Violet', color: '#b28cff' },
  { id: 'graphite', name: 'Graphite', color: '#2c3344' },
];

/** Mix a #rrggbb colour toward near-black. */
export function darken(hex: string, amount: number): string {
  const raw = hex.replace('#', '');
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n) || full.length !== 6) return '#111119';
  const channel = (shift: number) => {
    const v = (n >> shift) & 255;
    return Math.max(0, Math.min(255, Math.round(v * (1 - amount))));
  };
  const r = channel(16).toString(16).padStart(2, '0');
  const g = channel(8).toString(16).padStart(2, '0');
  const b = channel(0).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

/**
 * Returns a copy of the spec with the player's paint and wheels applied.
 * Only colours change, so the physics of the car are untouched.
 */
export function applyLivery(spec: CarSpec, livery: Livery | undefined): CarSpec {
  const paint = PAINTS.find((p) => p.id === livery?.paint);
  const rim = RIMS.find((r) => r.id === livery?.rim);
  const body = paint?.body ?? spec.body;
  const accent = rim?.color ?? spec.accent;
  if (!paint && !rim) return spec;
  return {
    ...spec,
    body,
    bodyDark: paint ? darken(body, 0.56) : spec.bodyDark,
    accent,
    glow: paint ? body : spec.glow,
  };
}
