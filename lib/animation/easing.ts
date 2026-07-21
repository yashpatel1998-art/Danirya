import type { EasingFn } from '@/types/animation';

export const easeOutCubic: EasingFn = (t) => 1 - Math.pow(1 - t, 3);

export const easeInOutCubic: EasingFn = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeOutExpo: EasingFn = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

export function toCssBezier(points: readonly [number, number, number, number]): string {
  return `cubic-bezier(${points.join(', ')})`;
}
