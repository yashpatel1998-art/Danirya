'use client';

import { useLayoutEffect, useRef, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '@/lib/motion/prefersReducedMotion';

gsap.registerPlugin(ScrollTrigger);

/** Title reveal only — section mark veil lives in RouteTransition. */
export const SECTION_SIGNATURE_EASE = 'power2.out';
export const SECTION_SIGNATURE_DURATION = 0.7;

type SectionFlareProps = {
  start?: string;
  titleRef?: RefObject<HTMLElement | null>;
  stagger?: number;
};

function splitWords(el: HTMLElement): HTMLSpanElement[] {
  const text = (el.textContent ?? '').trim();
  el.setAttribute('aria-label', text);
  const words = text.split(/\s+/);
  el.textContent = '';
  const spans: HTMLSpanElement[] = [];
  words.forEach((word, i) => {
    const wrap = document.createElement('span');
    wrap.style.display = 'inline-block';
    wrap.style.overflow = 'hidden';
    wrap.style.verticalAlign = 'baseline';
    const inner = document.createElement('span');
    inner.textContent = word;
    inner.style.display = 'inline-block';
    wrap.appendChild(inner);
    el.appendChild(wrap);
    if (i < words.length - 1) {
      el.appendChild(document.createTextNode(' '));
    }
    spans.push(inner);
  });
  return spans;
}

/**
 * Section title word-reveal. Gold flare removed.
 * RouteTransition mark veil is route-navigation only (not scroll boundaries).
 */
export function SectionFlare({
  start = 'top 72%',
  titleRef,
  stagger = 0.08,
}: SectionFlareProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    const section = host?.parentElement;
    const title = titleRef?.current ?? null;
    if (!section || !title) return;

    const originalTitle = (title.textContent ?? '').trim();
    if (!originalTitle) return;

    if (prefersReducedMotion()) {
      title.setAttribute('aria-label', originalTitle);
      return;
    }

    const spans = splitWords(title);
    gsap.set(spans, { yPercent: 110, opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start,
        toggleActions: 'play reverse play reverse',
      },
    });

    tl.to(spans, {
      yPercent: 0,
      opacity: 1,
      duration: SECTION_SIGNATURE_DURATION,
      ease: SECTION_SIGNATURE_EASE,
      stagger,
    });

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
      title.textContent = originalTitle;
    };
  }, [start, titleRef, stagger]);

  // Anchor for parent-section lookup when no title (Application)
  return <div ref={hostRef} hidden aria-hidden />;
}
