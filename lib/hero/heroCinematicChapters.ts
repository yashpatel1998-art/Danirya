export type HeroCinematicChapter = {
  /** Scroll progress start (0–1). */
  scrollStart: number;
  /** Scroll progress end (0–1). */
  scrollEnd: number;
  /** Normalised film progress start (0–1). */
  filmStart: number;
  /** Normalised film progress end (0–1). */
  filmEnd: number;
  /** GSAP ease for this chapter. */
  ease: string;
};

const FILM = {
  /** Opening black — frame 1. */
  black: 0,
  /** Logo fully revealed — frame 49. */
  logoReveal: 48 / 279,
  /** Logo hold — frame 63. */
  logoHold: 62 / 279,
  /** Museum reveal underway — frame 200. */
  museumTravel: 200 / 279,
  /** End of hero film — frame 280. */
  end: 1,
} as const;

/**
 * Directed five-act scroll → film mapping.
 * Scroll percentages follow the Monument creative brief.
 */
export const HERO_CINEMATIC_CHAPTERS: readonly HeroCinematicChapter[] = [
  {
    scrollStart: 0,
    scrollEnd: 0.15,
    filmStart: FILM.black,
    filmEnd: FILM.black,
    ease: 'none',
  },
  {
    scrollStart: 0.15,
    scrollEnd: 0.35,
    filmStart: FILM.black,
    filmEnd: FILM.logoReveal,
    ease: 'sine.out',
  },
  {
    scrollStart: 0.35,
    scrollEnd: 0.54,
    filmStart: FILM.logoReveal,
    filmEnd: FILM.logoHold,
    ease: 'none',
  },
  {
    scrollStart: 0.54,
    scrollEnd: 0.88,
    filmStart: FILM.logoHold,
    filmEnd: FILM.museumTravel,
    ease: 'power1.inOut',
  },
  {
    scrollStart: 0.88,
    scrollEnd: 1,
    filmStart: FILM.museumTravel,
    filmEnd: FILM.end,
    ease: 'power1.out',
  },
] as const;

/** GSAP scrub lag in seconds — adds physical weight to the playhead. */
export const HERO_SCRUB_LAG = 0.85;

/**
 * Resolves scroll progress to normalised film progress (0–1).
 * Mirrors the GSAP chapter timeline for typography and diagnostics.
 */
export function resolveCinematicFilmProgress(scrollProgress: number): number {
  const p = Math.min(1, Math.max(0, scrollProgress));

  for (const chapter of HERO_CINEMATIC_CHAPTERS) {
    if (p >= chapter.scrollStart && p <= chapter.scrollEnd) {
      const span = chapter.scrollEnd - chapter.scrollStart;
      if (span <= 0) return chapter.filmEnd;

      const local = (p - chapter.scrollStart) / span;
      const eased = applyGsapEase(local, chapter.ease);
      return chapter.filmStart + (chapter.filmEnd - chapter.filmStart) * eased;
    }
    if (p > chapter.scrollEnd) {
      continue;
    }
  }

  return FILM.end;
}

/** Minimal ease approximations for non-GSAP consumers. */
function applyGsapEase(t: number, ease: string): number {
  const clamped = Math.min(1, Math.max(0, t));

  switch (ease) {
    case 'sine.out':
      return Math.sin((clamped * Math.PI) / 2);
    case 'power2.in':
      return clamped * clamped;
    case 'power1.out':
      return 1 - Math.pow(1 - clamped, 1);
    case 'none':
    default:
      return clamped;
  }
}
