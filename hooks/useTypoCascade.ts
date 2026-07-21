'use client';

import { useLayoutEffect, type RefObject } from 'react';
import {
  createTypoCascade,
  typoNodes,
} from '@/lib/motion/createTypoCascade';

type UseTypoCascadeOptions = {
  start?: string;
  end?: string;
  stagger?: number;
};

/**
 * Scroll-scrubbed one-by-one typography reveal for a section.
 * Mark children with `data-typo` ("wipe" | "fade").
 */
export function useTypoCascade(
  sectionRef: RefObject<HTMLElement | null> | RefObject<HTMLDivElement | null>,
  options: UseTypoCascadeOptions = {}
) {
  const { start = 'top 78%', end = '+=70%', stagger = 0.4 } = options;

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const items = typoNodes(section);
    if (!items.length) return;

    const tl = createTypoCascade({
      section,
      items,
      start,
      end,
      stagger,
    });

    return () => {
      tl?.scrollTrigger?.kill();
      tl?.kill();
    };
  }, [sectionRef, start, end, stagger]);
}
