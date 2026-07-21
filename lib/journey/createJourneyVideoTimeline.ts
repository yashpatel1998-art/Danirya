import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { JOURNEY_CHAPTERS, JOURNEY_SCRUB_LAG } from '@/lib/journey/constants';
import { readHeroScrollProgress } from '@/lib/hero/createHeroTimeline';

gsap.registerPlugin(ScrollTrigger);

export type JourneyFilmState = {
  filmProgress: number;
};

export type CreateJourneyVideoTimelineOptions = {
  track: HTMLElement;
  pin: HTMLElement;
};

export type JourneyVideoTimelineHandle = {
  filmState: JourneyFilmState;
  scrollTrigger: ScrollTrigger;
  timeline: gsap.core.Timeline;
  getScrollProgress: () => number;
  kill: () => void;
};

/**
 * GSAP scrub timeline for post-Hero journey film.
 * Same architecture as Hero — chapters drive filmProgress.
 */
export function createJourneyVideoTimeline({
  track,
  pin,
}: CreateJourneyVideoTimelineOptions): JourneyVideoTimelineHandle {
  const filmState: JourneyFilmState = { filmProgress: 0 };

  const timeline = gsap.timeline({ defaults: { ease: 'none' } });

  for (const chapter of JOURNEY_CHAPTERS) {
    const scrollDuration = chapter.scrollEnd - chapter.scrollStart;
    timeline.to(
      filmState,
      {
        filmProgress: chapter.filmEnd,
        duration: scrollDuration,
        ease: chapter.ease,
      },
      chapter.scrollStart
    );
  }

  const scrollTrigger = ScrollTrigger.create({
    trigger: track,
    pin,
    start: 'top top',
    end: 'bottom bottom',
    scroller: document.documentElement,
    scrub: JOURNEY_SCRUB_LAG,
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
