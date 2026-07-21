'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '@/lib/motion/prefersReducedMotion';
import styles from './HangingPlacard.module.css';

gsap.registerPlugin(ScrollTrigger);

export type HangingPlacardProps = {
  /** Section name — e.g. WORK */
  title: string;
  /** One-line gallery descriptor */
  descriptor: string;
  /** ScrollTrigger start when the placard enters */
  start?: string;
  className?: string;
};

/**
 * Backlit wall signage — gold letterforms with soft warm rim glow
 * on a dark stone field (replaces iron-cable hanging boards).
 */
export function HangingPlacard({
  title,
  descriptor,
  start = 'top 70%',
  className,
}: HangingPlacardProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const section = root.closest('section') ?? root.parentElement;
    if (!section) return;

    if (prefersReducedMotion()) {
      gsap.set(root, { opacity: 1, y: 0, filter: 'none' });
      return;
    }

    gsap.set(root, {
      opacity: 0,
      y: 10,
      filter: 'blur(4px)',
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start,
        toggleActions: 'play none none reverse',
        invalidateOnRefresh: true,
      },
    });

    tl.to(root, {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 0.7,
      ease: 'power2.out',
    });

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [start]);

  return (
    <div
      ref={rootRef}
      className={[styles.hang, className].filter(Boolean).join(' ')}
      aria-hidden
    >
      <div className={styles.wall}>
        <span className={styles.glow} />
        <span className={styles.title}>{title}</span>
        <span className={styles.descriptor}>{descriptor}</span>
      </div>
    </div>
  );
}
