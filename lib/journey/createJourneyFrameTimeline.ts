import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HERO_SCRUB_LAG } from '@/lib/hero/heroCinematicChapters';
import { readHeroScrollProgress } from '@/lib/hero/createHeroTimeline';

gsap.registerPlugin(ScrollTrigger);

export type JourneyFilmState = {
  filmProgress: number;
};

export type JourneyFrameTimelineHandle = {
  filmState: JourneyFilmState;
  scrollTrigger: ScrollTrigger;
  timeline: gsap.core.Timeline;
  getScrollProgress: () => number;
  kill: () => void;
};

/**
 * Scroll-scrubbed temple film only.
 * Jesko logo fly-through lives on the Work hero (Gallery), not here.
 */
export function createJourneyFrameTimeline({
  track,
  pin,
}: {
  track: HTMLElement;
  pin: HTMLElement;
}): JourneyFrameTimelineHandle {
  const filmState: JourneyFilmState = { filmProgress: 0 };

  const timeline = gsap.timeline({ defaults: { ease: 'none' } });
  timeline.to(filmState, { filmProgress: 1, duration: 1, ease: 'none' }, 0);

  const scrollTrigger = ScrollTrigger.create({
    trigger: track,
    pin,
    start: 'top top',
    end: 'bottom bottom',
    scroller: document.documentElement,
    scrub: HERO_SCRUB_LAG,
    animation: timeline,
    anticipatePin: 1,
    invalidateOnRefresh: true,
  });

  return {
    filmState,
    scrollTrigger,
    timeline,
    getScrollProgress: () => readHeroScrollProgress(scrollTrigger),
    kill: () => {
      scrollTrigger.kill();
      timeline.kill();
    },
  };
}
