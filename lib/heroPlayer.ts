export const HERO_TOTAL_FRAMES = 280;

export function heroFrameUrl(index: number): string {
  const n = Math.max(1, Math.min(HERO_TOTAL_FRAMES, Math.round(index)));
  return `/hero/frames/frame_${String(n).padStart(4, '0')}.png`;
}

/** Linear scroll progress (0–1) → frame index (0–279). */
export function progressToFrameIndex(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return Math.round(p * (HERO_TOTAL_FRAMES - 1));
}
