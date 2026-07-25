'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { prefersReducedMotion } from '@/lib/motion/prefersReducedMotion';
import styles from './StatueLens.module.css';

/** Shared Figma ornament frame — PNG includes the charcoal aperture ring. */
export const ORNAMENTED_LENS_FRAME_SRC =
  '/lab/snap/lenses/ornamented-lens-frame.png';

type StatueLensProps = {
  src: string;
  alt: string;
  /** Couples to typology mode — enter / hold / exit. */
  mode: 'enter' | 'hold' | 'exit';
  /**
   * Publishes crop circle geometry (viewport %) onto the stage so the
   * scene-wash mask can punch a full-color hole under the lens.
   */
  stageSelector?: string;
};

/**
 * Magnify-glass statue crop + shared ornamented frame overlay.
 * Enter once per visit; hold must NOT restart the enter tween.
 */
export function StatueLens({
  src,
  alt,
  mode,
  stageSelector = '[data-lab-snap="1"]',
}: StatueLensProps) {
  const animRef = useRef<HTMLDivElement>(null);
  const cropRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = animRef.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      gsap.set(el, {
        opacity: mode === 'exit' ? 0 : 1,
        scale: mode === 'exit' ? 0.92 : 1,
      });
      return;
    }

    if (mode === 'exit') {
      const tl = gsap.to(el, {
        opacity: 0,
        scale: 0.92,
        duration: 0.45,
        ease: 'power2.in',
      });
      return () => {
        tl.kill();
      };
    }

    if (mode === 'hold') {
      gsap.set(el, { opacity: 1, scale: 1 });
      return;
    }

    gsap.set(el, { opacity: 0, scale: 0.88 });
    const tl = gsap.to(el, {
      opacity: 1,
      scale: 1,
      duration: 0.7,
      ease: 'power3.out',
    });
    return () => {
      tl.kill();
    };
  }, [mode, src]);

  // Drive scene-wash CSS vars from the crop circle (not the larger frame).
  useLayoutEffect(() => {
    const crop = cropRef.current;
    const stage = document.querySelector(stageSelector) as HTMLElement | null;
    if (!crop || !stage) return;

    const publish = () => {
      const cr = crop.getBoundingClientRect();
      const sr = stage.getBoundingClientRect();
      if (sr.width < 1 || sr.height < 1) return;
      const cx = ((cr.left + cr.width * 0.5 - sr.left) / sr.width) * 100;
      const cy = ((cr.top + cr.height * 0.5 - sr.top) / sr.height) * 100;
      stage.style.setProperty('--lens-cx', `${cx}%`);
      stage.style.setProperty('--lens-cy', `${cy}%`);
      // Match crop radius so wash hole aligns with color aperture (charcoal ring stays).
      stage.style.setProperty('--lens-r', `${Math.max(1, cr.width * 0.5)}px`);
    };

    publish();
    window.addEventListener('resize', publish);
    return () => {
      window.removeEventListener('resize', publish);
    };
  }, [mode, src, stageSelector]);

  return (
    <div className={styles.root} aria-hidden={mode === 'exit'}>
      <div ref={animRef} className={styles.anim}>
        <div ref={cropRef} className={styles.crop}>
          <img className={styles.image} src={src} alt={alt} draggable={false} />
        </div>
        <img
          className={styles.frame}
          src={ORNAMENTED_LENS_FRAME_SRC}
          alt=""
          draggable={false}
        />
      </div>
    </div>
  );
}
