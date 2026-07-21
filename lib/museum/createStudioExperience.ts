'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export type StudioTimelineConfig = {
  section: HTMLElement;
  darkVeil: HTMLElement;
  warmLight: HTMLElement;
  panels: HTMLElement[];
  logo: HTMLElement;
  logoReflection: HTMLElement;
  typeBlocks: HTMLElement[];
  particles: HTMLElement;
  cinematicDim: HTMLElement;
  corridor: HTMLElement;
  corridorLight: HTMLElement;
};

/** Typography beats — one message at a time, world-space feel */
export const STUDIO_TYPE_BLOCKS = [
  { lines: ['DANIRYA', 'Award-Winning', 'Digital Experiences'] },
  { lines: ['Crafted', 'with', 'Precision'] },
  { lines: ['Motion'] },
  { lines: ['Technology'] },
  { lines: ['Emotion'] },
] as const;

/**
 * Phase 6 Core — quiet corridor → illuminated studio → floating logo → Phase 7 corridor.
 */
export function createStudioExperience(cfg: StudioTimelineConfig): ScrollTrigger[] {
  const {
    section,
    darkVeil,
    warmLight,
    panels,
    logo,
    logoReflection,
    typeBlocks,
    particles,
    cinematicDim,
    corridor,
    corridorLight,
  } = cfg;

  // Veil is position:fixed — must start invisible or it blacks out the whole page
  // (including Hero) before this section is scrolled into view.
  gsap.set(darkVeil, { autoAlpha: 0 });
  gsap.set(warmLight, { autoAlpha: 0 });
  gsap.set(panels, { opacity: 0, y: 30 });
  gsap.set(logo, { opacity: 0, y: 40, rotateY: -12 });
  gsap.set(logoReflection, { opacity: 0, scaleY: 0.6 });
  gsap.set(typeBlocks, { opacity: 0, y: 20 });
  gsap.set(particles, { opacity: 0 });
  gsap.set(cinematicDim, { opacity: 0 });
  gsap.set(corridor, { opacity: 0, scaleX: 0.3 });
  gsap.set(corridorLight, { opacity: 0, scale: 0.5 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.4,
      pin: false,
      invalidateOnRefresh: true,
    },
  });

  // 0–10%: gallery quietens — corridor darkness (fade veil in from 0)
  tl.fromTo(
    darkVeil,
    { autoAlpha: 0 },
    { autoAlpha: 0.92, duration: 0.06, ease: 'power1.in' },
    0
  ).to(warmLight, { autoAlpha: 0.08, duration: 0.08 }, 0);

  // 8–18%: warm studio emerges — one room lit
  tl.to(darkVeil, { autoAlpha: 0.55, duration: 0.1, ease: 'power2.out' }, 0.08)
    .to(warmLight, { autoAlpha: 0.72, duration: 0.12, ease: 'power2.out' }, 0.1);

  // 12–22%: floating panels drift in
  panels.forEach((p, i) => {
    tl.to(p, { opacity: 0.35, y: 0, duration: 0.06, ease: 'power2.out' }, 0.12 + i * 0.025);
  });

  // 20–42%: camera approaches — logo reveal + slow orbit
  tl.to(logo, { opacity: 1, y: 0, rotateY: 0, duration: 0.14, ease: 'power2.out' }, 0.2)
    .to(logoReflection, { opacity: 0.18, scaleY: 1, duration: 0.1, ease: 'power2.out' }, 0.24)
    .to(logo, { rotateY: 18, duration: 0.16, ease: 'sine.inOut' }, 0.28)
    .to(logoReflection, { opacity: 0.22, duration: 0.08 }, 0.32);

  // 38–72%: typography — one block at a time
  typeBlocks.forEach((block, i) => {
    const t = 0.38 + i * 0.065;
    tl.to(block, { opacity: 1, y: 0, duration: 0.045, ease: 'power2.out' }, t)
      .to(block, { opacity: 0, y: -14, duration: 0.04, ease: 'power1.in' }, t + 0.05);
  });

  // 68–78%: cinematic peak — dim room, logo holds, particles
  tl.to(cinematicDim, { opacity: 1, duration: 0.08, ease: 'power2.inOut' }, 0.68)
    .to(warmLight, { opacity: 0.35, duration: 0.08 }, 0.68)
    .to(particles, { opacity: 0.6, duration: 0.06, ease: 'power2.out' }, 0.7)
    .to(logoReflection, { opacity: 0.28, duration: 0.06 }, 0.72)
    .to(cinematicDim, { opacity: 0, duration: 0.06 }, 0.76)
    .to(warmLight, { opacity: 0.55, duration: 0.06 }, 0.76)
    .to(particles, { opacity: 0, duration: 0.05 }, 0.78);

  // 78–92%: wall parts — corridor to Phase 7
  tl.to(logo, { rotateY: 28, x: -30, opacity: 0.4, duration: 0.1, ease: 'power1.inOut' }, 0.78)
    .to(corridor, { opacity: 1, scaleX: 1, duration: 0.1, ease: 'power2.out' }, 0.82)
    .to(corridorLight, { opacity: 1, scale: 1, duration: 0.08, ease: 'power2.out' }, 0.86)
    .to(warmLight, { opacity: 0.25, duration: 0.08 }, 0.88);

  return [tl.scrollTrigger!];
}
