import { JOURNEY_FRAME_COUNT, progressToFrame1 } from '@/lib/journey/frames';
import { remapWorkStudioFilmProgress } from '@/lib/journey/workStudioScrollRemap';
import {
  templeFrame1ToScrollProgress,
  templeScrollProgressToFrame1,
} from '@/lib/journey/templeFilmMap';

/**
 * Scroll film progress → frame.
 * Inscription plateaus freeze the base frame (extra scroll, no skip);
 * Work/Studio cinematic remap then runs on that content progress.
 */
export function templeFilmProgressToFrame1(linearFilm: number): number {
  const baseFrame1 = templeScrollProgressToFrame1(linearFilm);
  const contentProgress =
    (baseFrame1 - 1) / Math.max(1, JOURNEY_FRAME_COUNT - 1);
  return progressToFrame1(remapWorkStudioFilmProgress(contentProgress));
}

/** @deprecated — use templeFilmProgressToFrame1 */
export function remapTempleFilmProgress(linearFilm: number): number {
  const frame1 = templeFilmProgressToFrame1(linearFilm);
  return (frame1 - 1) / Math.max(1, JOURNEY_FRAME_COUNT - 1);
}

export { templeFrame1ToScrollProgress, templeScrollProgressToFrame1 };
