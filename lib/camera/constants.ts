/**
 * Frame markers aligned with camera_path.json (0-based indices).
 * Room ranges from path room labels; lookback turn end matches Blender LOOKBACK_TURN_END.
 */
export const CAMERA_PATH_URL = '/data/camera_path.json';

/** First frame of each room (inclusive). */
export const ROOM_ENTER_FRAME = {
  forecourt: 0,
  threshold: 89,
  hall: 207,
  chapel: 334,
  sanctuary: 532,
} as const;

/** Whoosh one-shots when crossing into these rooms. */
export const WHOOSH_ENTER_FRAMES = [
  ROOM_ENTER_FRAME.threshold,
  ROOM_ENTER_FRAME.chapel,
] as const;

/**
 * 180° lookback rotation completes here — same beat as Sanctuary CTA reveal.
 * Blender: LOOKBACK_START=640, LOOKBACK_TURN_FRAMES=80 → turn end 720.
 */
export const LOOKBACK_COMPLETE_FRAME = 720;

export const TOTAL_CAMERA_FRAMES = 800;
