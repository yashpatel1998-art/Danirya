/**
 * Linear interpolation toward a target, scaled by elapsed time.
 * Snaps when far behind to avoid visible lag during fast scroll.
 */
export function lerpToward(
  current: number,
  target: number,
  dtSeconds: number,
  speed: number,
  snapThreshold = 12
): number {
  const delta = target - current;
  if (Math.abs(delta) >= snapThreshold) return target;
  if (dtSeconds <= 0) return current;

  const catchUpSpeed =
    Math.abs(delta) > snapThreshold * 0.35
      ? speed * 2.2
      : Math.abs(delta) > snapThreshold * 0.12
        ? speed * 1.5
        : speed;
  const t = Math.min(1, catchUpSpeed * dtSeconds);
  const next = current + delta * t;

  if (Math.abs(target - next) < 0.002) {
    return target;
  }

  return next;
}

/** Normalised 0–1 playhead chase for video scrub. */
export function lerpFilmProgress(
  current: number,
  target: number,
  dtSeconds: number,
  speed: number
): number {
  return lerpToward(current, target, dtSeconds, speed, 0.08);
}
