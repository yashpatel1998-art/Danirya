/** Shared motion tokens — single source of truth for JS animation. */
export const MOTION = {
  duration: {
    fast: 200,
    base: 400,
    slow: 800,
    cinematic: 1200,
  },
  easing: {
    premium: [0.22, 1, 0.36, 1] as const,
    smooth: [0.4, 0, 0.2, 1] as const,
    linear: [0, 0, 1, 1] as const,
  },
  inertia: {
    /** Scroll progress follow strength per frame (0–1). Lower = more cinematic lag. */
    stiffness: 0.07,
    snapThreshold: 0.0002,
  },
  reveal: {
    translateY: 16,
    blur: 5,
  },
} as const;
