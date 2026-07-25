/**
 * Frame markers aligned with `camera_path.json` (800-sample Hero path, 0-based).
 * Phase B 1200 bake path is at `/data/camera_path_1200.json` — not wired to Hero yet.
 * Room ranges from path room labels; lookback turn end matches Blender LOOKBACK_TURN_END.
 */
export const CAMERA_PATH_URL = '/data/camera_path.json';
/** Phase B master path (1200 samples). Lab/data only until Hero is rewired. */
export const CAMERA_PATH_1200_URL = '/data/camera_path_1200.json';

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

/** Length of `camera_path.json` (Hero). Frame stills are 1200; path rewire pending. */
export const TOTAL_CAMERA_FRAMES = 800;
