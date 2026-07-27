import { BRAND } from '@/lib/content/brand';
import { roomAtPathIndex0 } from '@/lib/content/templeInscriptions';

export const BASE_TITLE = `${BRAND.name} — Premium digital craftsmanship`;

export const PAGE_TITLES = {
  home: BASE_TITLE,
  apply: `${BRAND.name} · Apply`,
  work: `${BRAND.name} — Work`,
  studio: `${BRAND.name} — Studio`,
  notFound: `${BRAND.name} — Path unseen`,
} as const;

const ROOM_TITLE: Record<string, string> = {
  forecourt: BASE_TITLE,
  threshold: `${BRAND.name} — Threshold`,
  hall: `${BRAND.name} — Work`,
  chapel: `${BRAND.name} — Chapel`,
  sanctuary: `${BRAND.name} — Sanctuary`,
};

/** Room-marker titles for the main journey (0-based path index). */
export function titleForJourneyFrame(pathIndex0: number): string {
  return ROOM_TITLE[roomAtPathIndex0(pathIndex0)] ?? BASE_TITLE;
}
