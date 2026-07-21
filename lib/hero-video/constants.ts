/**
 * Locked Hero delivery architecture (DANIRYA):
 * dual-codec scroll-scrubbed video · GSAP cinematic chapters · PNG master offline.
 *
 * Encode: scripts/encode_hero_video.ps1
 * Unlink PNG from public: scripts/unlink_hero_frames_from_public.ps1
 */

export const HERO_VIDEO_SCROLL_VH = 500;

export const HERO_VIDEO_SCROLL_MOBILE_VH = 450;

/** Primary — H.265 Main10 · 2560×1440 · CRF 18 · GOP 12 · black fade-in */
export const HERO_VIDEO_H265 = '/hero/video/hero_1440p_h265.mp4';

/** Fallback — VP9 · 2560×1440 · CRF 22 · GOP 12 · black fade-in */
export const HERO_VIDEO_WEBM = '/hero/video/hero_1440p_vp9.webm';

/** Solid black poster — premium opening until video ready */
export const HERO_VIDEO_POSTER = '/hero/video/hero_poster.jpg';

/** Soft playhead chase after GSAP scrub (film progress 0–1). */
export const HERO_PLAYHEAD_CHASE_SPEED = 16;

/** Seek only when delta exceeds this (seconds). */
export const HERO_SEEK_EPSILON = 0.012;
