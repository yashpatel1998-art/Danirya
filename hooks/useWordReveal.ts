'use client';

import { useLayoutEffect, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '@/lib/motion/prefersReducedMotion';

gsap.registerPlugin(ScrollTrigger);

/**
 * Split heading into words and reveal with upward slide + fade (power2.out).
 * Prefer SectionFlare `titleRef` when flare + text must share one timeline.
 * Re-arms on leave → re-enter (no once: true).
 */
export function useWordReveal(
  ref: RefObject<HTMLElement | null>,
  opts?: { start?: string; stagger?: number }
): void {
  const start = opts?.start ?? 'top 82%';
  const stagger = opts?.stagger ?? 0.08;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const text = (el.textContent ?? '').trim();
    if (!text) return;

    const reduced = prefersReducedMotion();
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

    if (reduced) return;

    gsap.set(spans, { yPercent: 110, opacity: 0 });

    const tween = gsap.to(spans, {
      yPercent: 0,
      opacity: 1,
      duration: 0.7,
      ease: 'power2.out',
      stagger,
      scrollTrigger: {
        trigger: el,
        start,
        // Re-play when scrolling back into view from above or below
        toggleActions: 'play reverse play reverse',
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      el.textContent = text;
    };
  }, [ref, start, stagger]);
}
