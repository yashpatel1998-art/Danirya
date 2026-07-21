import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export type RoomRevealConfig = {
  section: HTMLElement;
  /** Elements revealed in sequence */
  sequence: HTMLElement[];
  /** Optional atmosphere layer */
  atmosphere?: HTMLElement;
  /** Scroll start when section top hits this viewport position */
  start?: string;
  /** Stagger between sequence items */
  stagger?: number;
};

/**
 * Room reveal — plays once on enter.
 * Avoids scrub timelines that leave content stuck at opacity 0
 * for most of a tall section (empty black room).
 */
export function createRoomReveal({
  section,
  sequence,
  atmosphere,
  start = 'top 72%',
  stagger = 0.12,
}: RoomRevealConfig): ScrollTrigger {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (atmosphere) {
    gsap.set(atmosphere, { opacity: 1 });
  }

  if (reduced) {
    gsap.set(sequence, { opacity: 1, y: 0, filter: 'none' });
    return ScrollTrigger.create({
      trigger: section,
      start,
      once: true,
    });
  }

  gsap.set(sequence, { opacity: 0, y: 22, filter: 'blur(5px)' });

  const tl = gsap.timeline({
    paused: true,
    scrollTrigger: {
      trigger: section,
      start,
      toggleActions: 'play none none none',
      once: true,
      invalidateOnRefresh: true,
    },
  });

  sequence.forEach((el, i) => {
    tl.to(
      el,
      {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 0.55,
        ease: 'power2.out',
      },
      i * stagger
    );
  });

  // If the room is already on screen when this mounts (common after hero pin),
  // scrub-free reveals must still fire — don't leave content invisible.
  requestAnimationFrame(() => {
    const top = section.getBoundingClientRect().top;
    if (top < window.innerHeight * 0.85) {
      tl.play(0);
    }
  });

  return tl.scrollTrigger!;
}

export type BridgeRevealConfig = {
  bridge: HTMLElement;
  /** Fades out as visitor walks into next room */
  fadeStart?: string;
  fadeEnd?: string;
};

/** Hero → Gallery dissolve veil (black architectural handoff). */
export function createHeroBridge({
  bridge,
  fadeStart = 'top bottom',
  fadeEnd = 'bottom top',
}: BridgeRevealConfig): ScrollTrigger {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: bridge,
      start: fadeStart,
      end: fadeEnd,
      scrub: 0.85,
      invalidateOnRefresh: true,
    },
  });

  tl.fromTo(bridge, { opacity: 1 }, { opacity: 0, ease: 'power1.inOut', duration: 1 });

  return tl.scrollTrigger!;
}

export type PassageConfig = {
  passage: HTMLElement;
  warmth?: number;
};

/** Between-room atmospheric passage (gradient / light shift). */
export function createPassage({
  passage,
  warmth = 0,
}: PassageConfig): ScrollTrigger {
  const warm = passage.querySelector<HTMLElement>('[data-warmth]');

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: passage,
      start: 'top bottom',
      end: 'bottom top',
      scrub: 0.75,
      invalidateOnRefresh: true,
    },
  });

  tl.fromTo(passage, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'none' }, 0);
  tl.to(passage, { opacity: 0, duration: 0.35, ease: 'none' }, 0.65);

  if (warm) {
    tl.fromTo(
      warm,
      { opacity: 0 },
      { opacity: warmth, duration: 0.5, ease: 'sine.inOut' },
      0.2
    );
  }

  return tl.scrollTrigger!;
}

export function killRoomTriggers(section: HTMLElement) {
  ScrollTrigger.getAll().forEach((st) => {
    if (st.trigger === section) st.kill();
  });
}
