/**
 * Monument journey film — continuous scrub after locked Hero portal.
 * Frames align to Blender master: 240–900 (smoke bridge → final logo).
 * Hero architecture unchanged; this is Act 2–Final delivery only.
 */

export const JOURNEY_VIDEO_H265 = '/journey/video/journey_1440p_h265.mp4';
export const JOURNEY_VIDEO_WEBM = '/journey/video/journey_1440p_vp9.webm';
export const JOURNEY_VIDEO_POSTER = '/journey/video/journey_poster.jpg';

/** Scroll runway for the post-Hero journey (vh). */
export const JOURNEY_SCROLL_VH = 900;
export const JOURNEY_SCROLL_MOBILE_VH = 800;

export const JOURNEY_PLAYHEAD_CHASE_SPEED = 14;
export const JOURNEY_SEEK_EPSILON = 0.014;

/** GSAP scrub lag — same physical weight as Hero. */
export const JOURNEY_SCRUB_LAG = 0.85;

/**
 * Directed chapters map scroll → film progress for the journey reel.
 * Film is encoded from Blender frames 240–900 (661 frames @ 24fps ≈ 27.54s).
 */
export const JOURNEY_SOURCE_FRAME_START = 240;
export const JOURNEY_SOURCE_FRAME_END = 900;
export const JOURNEY_FRAME_COUNT =
  JOURNEY_SOURCE_FRAME_END - JOURNEY_SOURCE_FRAME_START + 1;

export type JourneyChapter = {
  id: string;
  scrollStart: number;
  scrollEnd: number;
  filmStart: number;
  filmEnd: number;
  ease: string;
};

/** Absolute Blender frame → normalised film progress on journey reel. */
export function blenderFrameToJourneyFilm(frame: number): number {
  return (frame - JOURNEY_SOURCE_FRAME_START) / (JOURNEY_FRAME_COUNT - 1);
}

export const JOURNEY_CHAPTERS: readonly JourneyChapter[] = [
  {
    id: 't01-smoke',
    scrollStart: 0,
    scrollEnd: 0.12,
    filmStart: blenderFrameToJourneyFilm(240),
    filmEnd: blenderFrameToJourneyFilm(318),
    ease: 'sine.inOut',
  },
  {
    id: 'gallery',
    scrollStart: 0.12,
    scrollEnd: 0.38,
    filmStart: blenderFrameToJourneyFilm(318),
    filmEnd: blenderFrameToJourneyFilm(468),
    ease: 'power1.inOut',
  },
  {
    id: 't02-dust',
    scrollStart: 0.38,
    scrollEnd: 0.48,
    filmStart: blenderFrameToJourneyFilm(448),
    filmEnd: blenderFrameToJourneyFilm(540),
    ease: 'sine.inOut',
  },
  {
    id: 'lab',
    scrollStart: 0.48,
    scrollEnd: 0.68,
    filmStart: blenderFrameToJourneyFilm(520),
    filmEnd: blenderFrameToJourneyFilm(640),
    ease: 'power1.inOut',
  },
  {
    id: 't03-warm',
    scrollStart: 0.68,
    scrollEnd: 0.76,
    filmStart: blenderFrameToJourneyFilm(620),
    filmEnd: blenderFrameToJourneyFilm(700),
    ease: 'sine.out',
  },
  {
    id: 'application',
    scrollStart: 0.76,
    scrollEnd: 0.9,
    filmStart: blenderFrameToJourneyFilm(680),
    filmEnd: blenderFrameToJourneyFilm(780),
    ease: 'none',
  },
  {
    id: 'final',
    scrollStart: 0.9,
    scrollEnd: 1,
    filmStart: blenderFrameToJourneyFilm(780),
    filmEnd: blenderFrameToJourneyFilm(900),
    ease: 'power1.out',
  },
] as const;

/** Overlay visibility windows (scroll progress on journey track). */
export const JOURNEY_OVERLAY = {
  gallery: { enter: 0.14, exit: 0.36 },
  lab: { enter: 0.5, exit: 0.66 },
  application: { enter: 0.78, exit: 0.9 },
  finalLogo: { enter: 0.94, exit: 1 },
} as const;
