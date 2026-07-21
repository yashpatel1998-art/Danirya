import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  HERO_CINEMATIC_CHAPTERS,
  HERO_SCRUB_LAG,
} from '@/lib/hero/heroCinematicChapters';
import { readHeroScrollProgress } from '@/lib/hero/createHeroTimeline';

gsap.registerPlugin(ScrollTrigger);

export type HeroFilmState = {
  filmProgress: number;
};

export type CreateHeroVideoTimelineOptions = {
  track: HTMLElement;
  pin: HTMLElement;
};

export type HeroVideoTimelineHandle = {
  filmState: HeroFilmState;
  scrollTrigger: ScrollTrigger;
  timeline: gsap.core.Timeline;
  getScrollProgress: () => number;
  kill: () => void;
};

/**
 * GSAP scrub timeline: scroll → cinematic chapter film progress.
 * ScrollTrigger owns the playhead; video reads filmState.filmProgress.
 */
export function createHeroVideoTimeline({
  track,
  pin,
}: CreateHeroVideoTimelineOptions): HeroVideoTimelineHandle {
  const filmState: HeroFilmState = { filmProgress: 0 };

  const timeline = gsap.timeline({ defaults: { ease: 'none' } });

  for (const chapter of HERO_CINEMATIC_CHAPTERS) {
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
