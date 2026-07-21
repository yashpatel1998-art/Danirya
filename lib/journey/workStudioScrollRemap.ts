import { JOURNEY_FRAME_COUNT } from '@/lib/journey/frames';

/**
 * Cinematic Work → Studio film remap (path indices, 0-based).
 *
 * Focus beats (not plaque fill / push-in):
 *   Work   → path 236–240 (v≈0 plateau)
 *   Studio → path 407 (same pose as 408–418 settle)
 *
 * Slight CSS pullback (`journeyDollyScale`) keeps those holds from reading
 * too close under object-fit: cover. Zone edges (210 / 480) stay fixed.
 */

type Seg = {
  start: number;
  end: number;
  weight: number;
};

export const CINEMATIC_ZONE_START = 210;
export const CINEMATIC_ZONE_END = 480;

/** Work focus — path 236–240 head-on, exit before motion resumes at 259. */
export const WORK_HERO_PATH = { start: 236, end: 245 } as const;

/** Studio focus — path 407 composition; short hold, then soft leave. */
export const STUDIO_HERO_PATH = { start: 407, end: 414 } as const;

/** @deprecated — no longer freezing; travel must remain visible. */
export const STUDIO_HOLD_FRAME = 407;

/** Pull back a touch on focus frames so cover crop isn’t nose-to-plaque. */
const FOCUS_PULLBACK = 0.935;
const FOCUS_PULLBACK_EDGE = 6;

const SEGMENTS: readonly Seg[] = [
  // Ease into Work
  { start: 210, end: 236, weight: 1.55 },
  // WORK focus — linger on 236–240
  { start: 236, end: 241, weight: 4.8 },
  // Soft leave Work plateau (same pose → first motion)
  { start: 241, end: 259, weight: 1.05 },
  // Hall travel
  { start: 259, end: 334, weight: 2.55 },
  // Chapel travel into Studio focus
  { start: 334, end: 407, weight: 2.5 },
  // STUDIO focus — hold on 407
  { start: 407, end: 412, weight: 5.4 },
  // Soft leave — do not whip into closer chapel frames
  { start: 412, end: 448, weight: 0.9 },
  // Forward drive toward sanctuary approach
  { start: 448, end: 480, weight: 1.2 },
];

function segmentWeightSum(segs: readonly Seg[]): number {
  let w = 0;
  for (const s of segs) w += (s.end - s.start) * s.weight;
  return w;
}

const TOTAL_WEIGHT = segmentWeightSum(SEGMENTS);

export function remapWorkStudioFilmProgress(linearFilm: number): number {
  const max = JOURNEY_FRAME_COUNT - 1;
  const p = Math.min(1, Math.max(0, linearFilm));
  const f = p * max;

  if (f <= CINEMATIC_ZONE_START || f >= CINEMATIC_ZONE_END) return p;

  const s0 = CINEMATIC_ZONE_START / max;
  const s1 = CINEMATIC_ZONE_END / max;
  const u = (p - s0) / (s1 - s0);

  let acc = 0;
  for (const seg of SEGMENTS) {
    const segW = ((seg.end - seg.start) * seg.weight) / TOTAL_WEIGHT;
    if (u <= acc + segW + 1e-9) {
      const local = segW <= 1e-9 ? 0 : (u - acc) / segW;
      const frame = seg.start + local * (seg.end - seg.start);
      return frame / max;
    }
    acc += segW;
  }

  return CINEMATIC_ZONE_END / max;
}

function focusPullback(pathIndex0: number, start: number, end: number): number {
  if (pathIndex0 < start - FOCUS_PULLBACK_EDGE || pathIndex0 > end + FOCUS_PULLBACK_EDGE) {
    return 1;
  }
  let t = 1;
  if (pathIndex0 < start) {
    t = (pathIndex0 - (start - FOCUS_PULLBACK_EDGE)) / FOCUS_PULLBACK_EDGE;
  } else if (pathIndex0 > end) {
    t = 1 - (pathIndex0 - end) / FOCUS_PULLBACK_EDGE;
  }
  t = Math.max(0, Math.min(1, t));
  const s = t * t * (3 - 2 * t);
  return 1 + (FOCUS_PULLBACK - 1) * s;
}

/** Slight zoom-out on Work / Studio focus so framing isn’t too tight. */
export function journeyDollyScale(pathIndex0: number): number {
  const work = focusPullback(
    pathIndex0,
    WORK_HERO_PATH.start,
    WORK_HERO_PATH.end
  );
  const studio = focusPullback(
    pathIndex0,
    STUDIO_HERO_PATH.start,
    STUDIO_HERO_PATH.end
  );
  return Math.min(work, studio);
}

export function journeyDollyY(_pathIndex0: number): string {
  return '0%';
}

export function journeyStageFill(_pathIndex0: number): string | null {
  return null;
}
