/**
 * Nested stack — live home + /lab (shared timing tokens).
 *
 * Decisions:
 * 1) Sequencing — case-study-then-studio
 * 2) Inset — 4.5vh / 3.5vw (uniform)
 * 3) Mobile ≤720px — plain vertical
 *
 * Iris: logo fly-through → Case Study from tiny clip-path dot → breathe
 * Stack: case hold → studio → hold → application → hold
 * Lenis smooth scroll is provided by root SmoothScroll.
 */

export const NEST_INSET = {
  y: '4.5vh',
  x: '3.5vw',
  min: '1.25rem',
} as const;

export const NEST_PAGE_ZOOM = {
  start: 1,
  end: 6,
} as const;

export const NEST_LOGO_ZOOM = {
  start: 1,
  end: 14,
} as const;

export const NEST_CLIP_START_PX = 3;

export const NEST_IRIS_CONTENT_ZOOM = {
  start: 0.95,
  end: 1,
} as const;

export const NEST_IRIS_GATES = {
  flyEnd: 0.42,
  revealEnd: 0.82,
  caseBreatheEnd: 1,
} as const;

export const NEST_STACK_GATES = {
  caseHoldEnd: 0.38,
  studioArriveEnd: 0.55,
  studioHoldEnd: 0.72,
  applicationArriveEnd: 0.88,
  applicationHoldEnd: 1,
} as const;

export const NEST_MOBILE_MAX = 720;

export const NEST_SEQUENCE = 'case-study-then-studio' as const;

export const NEST_SCROLL = {
  irisVh: 420,
  stackVh: 640,
} as const;
