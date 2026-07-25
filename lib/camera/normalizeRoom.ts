import type { TempleRoom } from '@/lib/camera/types';

/**
 * Phase B bake labels rooms as Blender segment ids (`hall_end`, `room_chapel`, …).
 * Map those onto the five production TempleRoom ids used by audio / inscriptions.
 */
const ROOM_ALIASES: Record<string, TempleRoom> = {
  forecourt: 'forecourt',
  room_forecourt: 'forecourt',
  forecourt_end: 'forecourt',
  threshold: 'threshold',
  room_threshold: 'threshold',
  threshold_end: 'threshold',
  hall: 'hall',
  room_hall: 'hall',
  hall_end: 'hall',
  chapel: 'chapel',
  room_chapel: 'chapel',
  chapel_end: 'chapel',
  sanctuary: 'sanctuary',
  room_sanctuary: 'sanctuary',
  sanctuary_end: 'sanctuary',
};

export function normalizeTempleRoom(raw: string | undefined | null): TempleRoom {
  if (!raw) return 'hall';
  return ROOM_ALIASES[raw] ?? ROOM_ALIASES[raw.toLowerCase()] ?? 'hall';
}
