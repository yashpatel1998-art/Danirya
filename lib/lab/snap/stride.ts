/** Mobile / coarse-pointer stride — mirrors journey playback heuristics. */
export function resolveLabSnapStride(): number {
  if (typeof window === 'undefined') return 1;
  const narrow = window.matchMedia('(max-width: 768px)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  return narrow || coarse ? 2 : 1;
}

/** Clamp + align a 1-based frame to a stride-resident slot. */
export function alignFrame1(
  frame1: number,
  stride: number,
  frameCount: number
): number {
  const last = frameCount;
  const clamped = Math.max(1, Math.min(last, Math.round(frame1)));
  if (stride <= 1) return clamped;
  if (clamped === 1 || clamped === last) return clamped;
  const index0 = clamped - 1;
  const aligned0 = Math.round(index0 / stride) * stride;
  return Math.max(1, Math.min(last, aligned0 + 1));
}

/**
 * Sample a linear frame-index tween, always returning a stride-resident frame.
 * t in [0, 1]; from/to are 1-based freeze frames.
 */
export function sampleTravelFrame1(
  fromFrame: number,
  toFrame: number,
  t: number,
  stride: number,
  frameCount: number
): number {
  const u = Math.min(1, Math.max(0, t));
  const raw = fromFrame + (toFrame - fromFrame) * u;
  return alignFrame1(raw, stride, frameCount);
}
