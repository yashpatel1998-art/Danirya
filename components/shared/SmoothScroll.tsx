'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { useLayoutEffect, useState, type ReactNode } from 'react';
import { LenisProvider } from './LenisContext';

gsap.registerPlugin(ScrollTrigger);

ScrollTrigger.config({ ignoreMobileResize: true });

type SmoothScrollProps = {
  children: ReactNode;
};

/**
 * Lenis + GSAP ScrollTrigger with scrollerProxy for frame-perfect sync.
 */
export function SmoothScroll({ children }: SmoothScrollProps) {
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useLayoutEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) return;

    const instance = new Lenis({
      lerp: 0.12,
      smoothWheel: true,
      syncTouch: true,
      wheelMultiplier: 1,
    });

    setLenis(instance);
    // Test / verify scripts drive Lenis through this handle (scrollTo, not native scrollTop).
    (window as Window & { __lenis?: Lenis }).__lenis = instance;

    ScrollTrigger.scrollerProxy(document.documentElement, {
      scrollTop(value) {
        if (arguments.length && typeof value === 'number') {
          instance.scrollTo(value, { immediate: true });
        }
        return instance.animatedScroll;
      },
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
      },
      // 'fixed' avoids the stacked/split pin paint bug with Lenis when
      // html/body are not transformed. 'transform' was doubling the hero.
      pinType: 'fixed',
    });

    instance.on('scroll', ScrollTrigger.update);

    const rafCallback = (time: number) => {
      instance.raf(time * 1000);
    };

    gsap.ticker.add(rafCallback, false, true);
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.refresh();

    return () => {
      gsap.ticker.remove(rafCallback);
      ScrollTrigger.scrollerProxy(document.documentElement, {});
      const w = window as Window & { __lenis?: Lenis };
      if (w.__lenis === instance) delete w.__lenis;
      instance.destroy();
      setLenis(null);
    };
  }, []);

  return <LenisProvider lenis={lenis}>{children}</LenisProvider>;
}
