/** Full walkthrough WebP sequence (Blender bake frames 1–800). */
export const JOURNEY_FRAME_COUNT = 800;
export const JOURNEY_FRAME_DIR = '/journey/frames';

/** First drawable still — matches loader / opening handoff. */
export const JOURNEY_POSTER = `${JOURNEY_FRAME_DIR}/frame_0001.webp`;

export function journeyFrameUrl(frame1Based: number): string {
  const n = Math.max(1, Math.min(JOURNEY_FRAME_COUNT, Math.round(frame1Based)));
  return `${JOURNEY_FRAME_DIR}/frame_${String(n).padStart(4, '0')}.webp`;
}

/** Progress 0–1 → 1-based frame index. */
export function progressToFrame1(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return 1 + Math.round(p * (JOURNEY_FRAME_COUNT - 1));
}

/** 1-based WebP index → 0-based camera_path index (same temporal axis for this bake). */
export function frame1ToPathIndex(frame1: number): number {
  return Math.max(0, Math.min(JOURNEY_FRAME_COUNT - 1, frame1 - 1));
}
