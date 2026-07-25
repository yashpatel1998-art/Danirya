import { getCameraSample } from '@/lib/camera/cameraPath';
import { ROOM_ENTER_FRAME } from '@/lib/camera/constants';
import type { TypographyHold } from '@/lib/camera/roomTypography';
import { plannedInscriptionHold } from '@/lib/content/inscriptionHoldTiming';

export type TempleRoomId =
  | 'forecourt'
  | 'threshold'
  | 'hall'
  | 'chapel'
  | 'sanctuary';

export type TempleInscription = {
  room: TempleRoomId;
  /** Room marker label — reveals before inscription words. */
  label: string;
  /**
   * Inscription lines (empty string = stanza break).
   * Animated word-by-word after the label settles.
   */
  lines: readonly string[];
};

/**
 * Temple wall inscriptions — overlay copy paced with walkthrough rooms.
 * Room labels use the same continuous-scroll / settle-gate system.
 */
export const TEMPLE_INSCRIPTIONS: readonly TempleInscription[] = [
  {
    room: 'forecourt',
    label: 'FORECOURT',
    lines: ['A studio, not a template.'],
  },
  {
    room: 'threshold',
    label: 'THRESHOLD',
    lines: ['What does this need to become?'],
  },
  {
    room: 'hall',
    label: 'HALL',
    lines: ['Path. Light. Material. One at a time.'],
  },
  {
    room: 'chapel',
    label: 'CHAPEL',
    lines: ['Held to the same standard as code.'],
  },
  {
    room: 'sanctuary',
    label: 'SANCTUARY',
    lines: ['This is Gilt Foundry.'],
  },
] as const;

const ROOM_ORDER: TempleRoomId[] = [
  'forecourt',
  'threshold',
  'hall',
  'chapel',
  'sanctuary',
];

export function roomAtPathIndex0(pathIndex0: number): TempleRoomId {
  const i = Math.max(0, pathIndex0);
  // Prefer live path sample — Phase B rooms are non-monotonic (reverse exit).
  const sampleRoom = getCameraSample(i)?.room;
  if (sampleRoom) return sampleRoom;

  if (i >= ROOM_ENTER_FRAME.sanctuary) return 'sanctuary';
  if (i >= ROOM_ENTER_FRAME.forecourt) return 'forecourt';
  if (i >= ROOM_ENTER_FRAME.threshold) return 'threshold';
  if (i >= ROOM_ENTER_FRAME.chapel) return 'chapel';
  return 'hall';
}

/**
 * Mid-room window (1-based frames) for plaque visibility.
 * Sized per room from inscription word count — see inscriptionHoldTiming.
 */
export function inscriptionHoldForRoom(room: TempleRoomId): TypographyHold {
  return plannedInscriptionHold(room);
}

export function inscriptionForRoom(
  room: TempleRoomId
): TempleInscription | undefined {
  return TEMPLE_INSCRIPTIONS.find((entry) => entry.room === room);
}

/** Mid-hold path index (0-based) — useful for verify scroll targets. */
export function inscriptionPeekFrame(room: TempleRoomId): number {
  const hold = inscriptionHoldForRoom(room);
  return Math.round((hold.enter + hold.exit) / 2) - 1;
}
