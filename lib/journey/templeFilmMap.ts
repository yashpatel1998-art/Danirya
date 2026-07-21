import { JOURNEY_FRAME_COUNT } from '@/lib/journey/frames';
import {
  getInscriptionHoldPlans,
  INSCRIPTION_HOLD_TIMING,
} from '@/lib/content/inscriptionHoldTiming';

/**
 * Scroll → frame map with true hold plateaus.
 *
 * Diagnosis (hold-extension regression):
 * - ScrollTrigger filmProgress 0→1 is dynamic from the pin track (not stale).
 * - The old weighted linger remap kept p∈[0,1] over the same track by
 *   *compressing* non-hold zones → frames skipped between extended rooms.
 *
 * Fix: plateaus add scroll weight where frame index stays constant, and the
 * hero track grows by the same factor so travel zones keep ~1 frame / unit.
 */

const BASE_SCROLL_VH = 500;
const BASE_SCROLL_MOBILE_VH = 450;
const FRAME_STEPS = JOURNEY_FRAME_COUNT - 1; // 799

type Seg = {
  w0: number;
  w1: number;
  /** Inclusive path frame at segment start (0-based). */
  f0: number;
  /** Inclusive path frame at segment end (0-based). */
  f1: number;
};

type FilmMap = {
  segs: Seg[];
  totalW: number;
  scrollVh: number;
  scrollMobileVh: number;
};

let cached: FilmMap | null = null;

function buildFilmMap(): FilmMap {
  /** Extra scroll units (frame-equivalents) parked on a path frame. */
  const plateaus = new Map<number, number>();

  for (const plan of getInscriptionHoldPlans()) {
    // Only inject scroll plateaus for material shortfalls. Sub-second gaps
    // are covered by the reveal-completion gate without disturbing frame map.
    const shortfallSec = plan.targetSeconds - plan.holdSeconds;
    if (shortfallSec <= 0.5) continue;
    const extra =
      shortfallSec * INSCRIPTION_HOLD_TIMING.nominalFps;
    // Park the plateau at the mid-hold frame (still inside the typography window).
    const at = Math.round((plan.holdPathStart + plan.holdPathEnd) / 2);
    const frame = Math.max(0, Math.min(FRAME_STEPS, at));
    plateaus.set(frame, (plateaus.get(frame) ?? 0) + extra);
  }

  const segs: Seg[] = [];
  let w = 0;

  for (let f = 0; f < FRAME_STEPS; f += 1) {
    // Advance f → f+1 (one frame step, one scroll unit)
    segs.push({ w0: w, w1: w + 1, f0: f, f1: f + 1 });
    w += 1;

    const holdExtra = plateaus.get(f + 1);
    if (holdExtra && holdExtra > 0) {
      // True hold: scroll advances, frame index stays on f+1
      segs.push({
        w0: w,
        w1: w + holdExtra,
        f0: f + 1,
        f1: f + 1,
      });
      w += holdExtra;
    }
  }

  const totalW = Math.max(FRAME_STEPS, w);
  const scale = totalW / FRAME_STEPS;

  return {
    segs,
    totalW,
    scrollVh: Math.ceil(BASE_SCROLL_VH * scale),
    scrollMobileVh: Math.ceil(BASE_SCROLL_MOBILE_VH * scale),
  };
}

function getFilmMap(): FilmMap {
  if (!cached) cached = buildFilmMap();
  return cached;
}

/** Desktop hero track height in vh — includes inscription hold plateaus. */
export function getTempleScrollVh(): number {
  return getFilmMap().scrollVh;
}

export function getTempleScrollMobileVh(): number {
  return getFilmMap().scrollMobileVh;
}

/**
 * Linear ScrollTrigger film progress (0–1 over the live pin track)
 * → 1-based WebP frame. Monotonic; plateaus hold a constant frame.
 */
export function templeScrollProgressToFrame1(progress: number): number {
  const { segs, totalW } = getFilmMap();
  const p = Math.min(1, Math.max(0, progress));
  const target = p * totalW;

  // Binary search segment
  let lo = 0;
  let hi = segs.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const seg = segs[mid]!;
    if (target < seg.w0) hi = mid - 1;
    else if (target > seg.w1 && mid < segs.length - 1) lo = mid + 1;
    else {
      const span = seg.w1 - seg.w0;
      const local = span <= 1e-9 ? 0 : (target - seg.w0) / span;
      const frame0 = seg.f0 + local * (seg.f1 - seg.f0);
      return 1 + Math.round(Math.min(FRAME_STEPS, Math.max(0, frame0)));
    }
  }

  return JOURNEY_FRAME_COUNT;
}

/**
 * Lowest film progress (0–1) that reaches a given 1-based frame.
 * Used to pin the playhead while the inscription gate is armed.
 */
export function templeFrame1ToScrollProgress(frame1: number): number {
  const { segs, totalW } = getFilmMap();
  const frame0 = Math.max(0, Math.min(FRAME_STEPS, frame1 - 1));

  for (const seg of segs) {
    if (frame0 < seg.f0 || frame0 > seg.f1) continue;
    if (seg.f0 === seg.f1) {
      // Plateau — first scroll position of this hold
      return seg.w0 / totalW;
    }
    const spanF = seg.f1 - seg.f0;
    const local = spanF <= 1e-9 ? 0 : (frame0 - seg.f0) / spanF;
    return (seg.w0 + local * (seg.w1 - seg.w0)) / totalW;
  }

  return frame0 / FRAME_STEPS;
}

/** Test/debug: plateau extras and scaled track. */
export function getTempleFilmMapDebug() {
  const map = getFilmMap();
  const plateaus: { frame0: number; weight: number }[] = [];
  for (const seg of map.segs) {
    if (seg.f0 === seg.f1 && seg.w1 - seg.w0 > 1.001) {
      plateaus.push({ frame0: seg.f0, weight: seg.w1 - seg.w0 });
    }
  }
  return {
    totalW: map.totalW,
    frameSteps: FRAME_STEPS,
    scrollVh: map.scrollVh,
    scrollMobileVh: map.scrollMobileVh,
    plateauCount: plateaus.length,
    plateaus,
  };
}
