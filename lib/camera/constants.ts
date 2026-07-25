/**
 * Frame markers aligned with the live Phase B `camera_path_1200.json` (1200 samples, 0-based).
 * Room enters derived from first normalized segment labels on the bake path.
 */

/** Phase B master path (1200 samples) — production Hero + audio. */
export const CAMERA_PATH_1200_URL = '/data/camera_path_1200.json';

/** Live production camera path URL. */
export const CAMERA_PATH_URL = CAMERA_PATH_1200_URL;

/**
 * First frame of each room (inclusive, 0-based) on the Phase B path.
 * Journey is not strictly forecourt→…→sanctuary (starts in hall, reverse-exits);
 * these mark first appearance for titles / whoosh / fallback room probes.
 */
export const ROOM_ENTER_FRAME = {
  hall: 0,
  chapel: 370,
  threshold: 922,
  forecourt: 993,
  /** Sky-ascend bookend — no discrete sanctuary segment on this bake. */
  sanctuary: 1030,
} as const;

/** Whoosh one-shots when crossing into these rooms. */
export const WHOOSH_ENTER_FRAMES = [
  ROOM_ENTER_FRAME.chapel,
  ROOM_ENTER_FRAME.threshold,
] as const;

/**
 * Final sky-ascend bookend — Sanctuary CTA + sanctuary tone sync.
 * Phase B has no 180° lookback; this is the reverse-exit culmination.
 */
export const LOOKBACK_COMPLETE_FRAME = 1030;

/** Length of the live Phase B camera path. */
export const TOTAL_CAMERA_FRAMES = 1200;
