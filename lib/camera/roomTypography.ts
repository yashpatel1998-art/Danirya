/**
 * Typography settle windows keyed to cinematic hero compositions
 * (1-based WebP frame = pathIndex0 + 1; path `frame` field is 0-based).
 *
 * Work title lives in the bake. Studio HTML plaque is intentionally omitted
 * so the temple film stays clean through the Studio hold.
 */

import { WORK_HERO_PATH } from '@/lib/journey/workStudioScrollRemap';
import { workProjects } from '@/lib/content/workProjects';

export type TypographyHold = {
  id: string;
  /** Inclusive enter frame (1-based WebP / overlay axis). */
  enter: number;
  /** Inclusive exit frame (1-based WebP / overlay axis). */
  exit: number;
  /** Frames to ramp in / out at hold edges. */
  fadeIn: number;
  fadeOut: number;
};

/** Opening forecourt settle — hero wordmark bookend. */
export const HOLD_HERO: TypographyHold = {
  id: 'hero',
  enter: 1,
  exit: 72,
  fadeIn: 10,
  fadeOut: 14,
};

/**
 * Entrance door plaque (baked DANIRYA text) — HTML cover shows GILT FOUNDRY.
 * Tuned to the threshold approach where the sign fills the doorway.
 */
export const HOLD_ENTRANCE_PLAQUE: TypographyHold = {
  id: 'entrance-plaque',
  enter: 78,
  exit: 145,
  fadeIn: 8,
  fadeOut: 10,
};

/**
 * Pedestal logo cover — disabled on Phase B (no sanctuary lookback composition).
 * exit < enter keeps holdEnvelope at 0.
 */
export const HOLD_SANCTUARY_LOGO: TypographyHold = {
  id: 'sanctuary-logo',
  enter: 0,
  exit: -1,
  fadeIn: 14,
  fadeOut: 18,
};

/**
 * WORK focus (path 236–240) — title lives in the bake.
 * Kept for vignette timing only; HeroOverlay does not paint Work HTML here.
 */
export const HOLD_WORK_TYPO: TypographyHold = {
  id: 'work',
  enter: WORK_HERO_PATH.start + 1,
  exit: WORK_HERO_PATH.end + 1,
  fadeIn: 4,
  fadeOut: 5,
};

/**
 * Sanctuary CTA — handoff as sky-ascend finishes (entrance-sky-ascend → f1200).
 * fadeOut: 0 keeps the final beat latched (no reverse-return / no loop).
 */
export const HOLD_SANCTUARY_CTA: TypographyHold = {
  id: 'sanctuary',
  enter: 1175,
  exit: 1200,
  fadeIn: 20,
  fadeOut: 0,
};

/**
 * Per-bay project peaks — Hall only, after Work plaque, before Chapel.
 */
export function workBayHold(bay: number): TypographyHold {
  const hallStart = Math.max(HOLD_WORK_TYPO.exit + 1, 260);
  const hallEnd = 333;
  const span = Math.max(1, hallEnd - hallStart);
  const n = workProjects.length;
  const peak = hallStart + Math.round((span * (bay + 0.5)) / n);
  const half = 8;
  return {
    id: `work-bay-${bay}`,
    enter: peak - half,
    exit: peak + half,
    fadeIn: 4,
    fadeOut: 4,
  };
}

/** 0…1 envelope: blur/opacity progress for a hold window. */
export function holdEnvelope(frame1: number, hold: TypographyHold): number {
  if (frame1 < hold.enter || frame1 > hold.exit) return 0;
  const into =
    hold.fadeIn <= 0
      ? 1
      : Math.min(1, (frame1 - hold.enter) / hold.fadeIn);
  const out =
    hold.fadeOut <= 0
      ? 1
      : Math.min(1, (hold.exit - frame1) / hold.fadeOut);
  return Math.max(0, Math.min(1, Math.min(into, out)));
}

/** Smoothstep for softer settle feel. */
export function smoothstep01(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}
