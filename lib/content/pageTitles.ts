import { ROOM_ENTER_FRAME } from '@/lib/camera/constants';

export const BASE_TITLE =
  'Danirya Studio — Premium digital craftsmanship';

export const PAGE_TITLES = {
  home: BASE_TITLE,
  apply: 'Danirya Studio — Begin your project',
  work: 'Danirya Studio — Work',
  notFound: 'Danirya Studio — Path unseen',
} as const;

/** Room-marker titles for the main 3D scroll experience (0-based path index). */
export function titleForJourneyFrame(pathIndex0: number): string {
  const i = Math.max(0, pathIndex0);
  if (i >= ROOM_ENTER_FRAME.sanctuary) return 'Danirya Studio — Contact';
  if (i >= ROOM_ENTER_FRAME.chapel) return 'Danirya Studio — Studio';
  if (i >= ROOM_ENTER_FRAME.hall) return 'Danirya Studio — Work';
  return BASE_TITLE;
}
