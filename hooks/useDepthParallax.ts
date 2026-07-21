'use client';

import { useLayoutEffect, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '@/lib/motion/prefersReducedMotion';

gsap.registerPlugin(ScrollTrigger);

type DepthParallaxOpts = {
  /** Moves at 1× (faster / nearer). */
  fastRef: RefObject<HTMLElement | null>;
  /** Moves at ~0.5× (slower / farther). */
  slowRef: RefObject<HTMLElement | null>;
  triggerRef?: RefObject<HTMLElement | null>;
  /** Peak Y travel in px for the fast layer. */
  amount?: number;
  scrub?: number | boolean;
};

/**
 * Continuous 0.5× vs 1× scroll-linked depth via CSS transform only.
 * Scrub ties progress to scroll forever — no once / no replay needed.
 */
export function useDepthParallax({
  fastRef,
  slowRef,
  triggerRef,
  amount = 48,
  scrub = true,
}: DepthParallaxOpts): void {
  useLayoutEffect(() => {
    const fast = fastRef.current;
    const slow = slowRef.current;
    if (!fast || !slow) return;
    if (prefersReducedMotion()) return;

    const trigger =
      triggerRef?.current ?? fast.closest('section') ?? fast.parentElement ?? fast;

    const scrubCfg = {
      trigger,
      start: 'top bottom',
      end: 'bottom top',
      scrub,
      invalidateOnRefresh: true,
    };

    const fastTween = gsap.fromTo(
      fast,
      { y: amount },
      { y: -amount, ease: 'none', immediateRender: false, scrollTrigger: { ...scrubCfg } }
    );
    const slowTween = gsap.fromTo(
      slow,
      { y: amount * 0.5 },
      {
        y: -amount * 0.5,
        ease: 'none',
        immediateRender: false,
        scrollTrigger: { ...scrubCfg },
      }
    );

    // Recalc after fonts/layout settle
    requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      fastTween.scrollTrigger?.kill();
      slowTween.scrollTrigger?.kill();
      fastTween.kill();
      slowTween.kill();
    };
  }, [fastRef, slowRef, triggerRef, amount, scrub]);
}
