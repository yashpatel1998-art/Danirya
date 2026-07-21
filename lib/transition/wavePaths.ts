/**
 * Compatible torn-edge path keyframes (same command count / point count).
 * GSAP attr tween interpolates `d` without MorphSVG Club plugin.
 */

const close = ' L1440,280 L0,280 Z';

/** Build a full-width jagged top edge from Y samples (length must match). */
function edge(ys: number[]): string {
  const step = 1440 / (ys.length - 1);
  let d = `M0,${ys[0]}`;
  for (let i = 1; i < ys.length; i++) {
    d += ` L${Math.round(i * step)},${ys[i]}`;
  }
  return d + close;
}

/** 17 samples across width — shared by every keyframe. */
export const WAVE_PATHS = [
  edge([78, 52, 88, 44, 82, 48, 90, 40, 76, 54, 86, 42, 80, 50, 84, 46, 72]),
  edge([62, 90, 48, 84, 40, 88, 54, 78, 44, 92, 50, 80, 38, 86, 56, 74, 68]),
  edge([88, 42, 76, 58, 92, 36, 70, 86, 48, 80, 40, 90, 54, 72, 46, 84, 60]),
  edge([70, 86, 40, 78, 56, 92, 44, 68, 88, 38, 82, 52, 90, 42, 76, 58, 80]),
] as const;
