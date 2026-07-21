import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MOTION } from '@/lib/constants/motion';

gsap.registerPlugin(ScrollTrigger);

export type TypoCascadeMode = 'wipe' | 'fade';

export type TypoCascadeConfig = {
  section: HTMLElement;
  /** Ordered nodes — revealed one-by-one as the visitor scrolls. */
  items: HTMLElement[];
  start?: string;
  /** Scrub end — taller = more scroll between each line. */
  end?: string;
  /** Delay between items in timeline units (scrubbed). */
  stagger?: number;
};

/**
 * Scroll-scrubbed typography cascade.
 * Text uses clip-path wipe; soft nodes (media/UI) use fade+drift.
 */
export function createTypoCascade({
  section,
  items,
  start = 'top 78%',
  end = '+=70%',
  stagger = 0.4,
}: TypoCascadeConfig): gsap.core.Timeline | null {
  if (!items.length) return null;

  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const dur = MOTION.duration.cinematic / 1000;
  const durBase = MOTION.duration.base / 1000;

  if (reduced) {
    gsap.set(items, {
      opacity: 0,
      y: 0,
      clipPath: 'none',
      clearProps: 'filter',
    });
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start,
        toggleActions: 'play none none none',
        once: true,
      },
    });
    items.forEach((el, i) => {
      tl.to(
        el,
        { opacity: 1, duration: durBase, ease: 'power3.out' },
        i * 0.12
      );
    });
    return tl;
  }

  items.forEach((el) => {
    const mode = (el.dataset.typo as TypoCascadeMode) || 'wipe';
    if (mode === 'fade') {
      gsap.set(el, { opacity: 0, y: 14, clipPath: 'none' });
    } else {
      gsap.set(el, {
        opacity: 1,
        y: 4,
        clipPath: 'inset(0 100% 0 0)',
      });
    }
  });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start,
      end,
      scrub: 0.65,
      invalidateOnRefresh: true,
    },
  });

  items.forEach((el, i) => {
    const mode = (el.dataset.typo as TypoCascadeMode) || 'wipe';
    const at = i * stagger;
    if (mode === 'fade') {
      tl.to(
        el,
        {
          opacity: 1,
          y: 0,
          duration: dur,
          ease: 'none',
        },
        at
      );
    } else {
      tl.to(
        el,
        {
          clipPath: 'inset(0 0% 0 0)',
          y: 0,
          duration: dur,
          ease: 'none',
        },
        at
      );
    }
  });

  return tl;
}

/** Query `[data-typo]` nodes in document order. */
export function typoNodes(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-typo]'));
}
