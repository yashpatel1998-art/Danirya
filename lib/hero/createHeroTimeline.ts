import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { clamp } from '@/lib/utils/clamp';

gsap.registerPlugin(ScrollTrigger);

/**
 * Progress from Lenis scroll pixels mapped to ScrollTrigger start/end.
 * getBoundingClientRect stays at 0 while pinned — this reads actual scroll.
 */
export function readHeroScrollProgress(scrollTrigger: ScrollTrigger): number {
  const range = scrollTrigger.end - scrollTrigger.start;
  if (range <= 0) return 0;
  const scroll = scrollTrigger.scroll();
  return clamp((scroll - scrollTrigger.start) / range, 0, 1);
}
