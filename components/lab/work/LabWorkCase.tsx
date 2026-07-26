'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ClayReveal } from '@/components/lab/clay-reveal/ClayReveal';
import { LAB_BACKDROP_SRC } from '@/lib/lab/backdrop';
import { prefersReducedMotion } from '@/lib/motion/prefersReducedMotion';
import styles from './LabWorkCase.module.css';

gsap.registerPlugin(ScrollTrigger);

/** Matches --ease-premium cubic-bezier(0.22, 1, 0.36, 1). */
const EASE_PREMIUM = 'cubic-bezier(0.22, 1, 0.36, 1)';
const RISE_Y = 28;
const ENTER_DURATION = 1.05;
const STAGGER = 0.16;

/**
 * Entrance that re-fires only after a full viewport exit.
 * start/end span the whole element (`top bottom` → `bottom top`), so
 * leave/enterBack only fire when the block is completely off-screen —
 * small scroll jitters mid-view cannot re-trigger. toggleActions
 * `restart none restart none` plays on enter / enterBack and leaves
 * the finished state while off-screen (invisible anyway).
 */
function bindReplayEntrance(
  trigger: HTMLElement,
  parts: NodeListOf<HTMLElement> | HTMLElement[],
) {
  gsap.fromTo(
    parts,
    { opacity: 0, y: RISE_Y },
    {
      opacity: 1,
      y: 0,
      duration: ENTER_DURATION,
      stagger: STAGGER,
      ease: EASE_PREMIUM,
      scrollTrigger: {
        trigger,
        start: 'top bottom',
        end: 'bottom top',
        toggleActions: 'restart none restart none',
      },
    },
  );
}

/**
 * Temple case-study flagship — shared by /work (production) and /lab/work.
 * Dimmed elephant backdrop only; clay reveal stays the star. No journey/snap.
 */
export function LabWorkCase() {
  const pageRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const page = pageRef.current;
    const hero = heroRef.current;
    const frame = frameRef.current;
    if (!page || !hero || !frame) return;

    const heroParts = hero.querySelectorAll<HTMLElement>('[data-hero-part]');
    const frameParts = frame.querySelectorAll<HTMLElement>('[data-frame-part]');
    if (heroParts.length === 0 || frameParts.length === 0) return;

    if (prefersReducedMotion()) {
      gsap.set([...heroParts, ...frameParts], { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      bindReplayEntrance(hero, heroParts);
      bindReplayEntrance(frame, frameParts);
    }, page);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <main ref={pageRef} className={styles.page}>
      {/* Quiet elephant-entrance atmosphere — behind reveal + type only. */}
      <div className={styles.backdrop} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.backdropImg}
          src={LAB_BACKDROP_SRC}
          alt=""
          width={1920}
          height={1080}
          decoding="async"
        />
        <div className={styles.backdropWash} />
      </div>

      {/* 1. Hero */}
      <section
        ref={heroRef}
        className={styles.hero}
        aria-labelledby="lab-work-title"
      >
        <h1 id="lab-work-title" className={styles.title} data-hero-part>
          The Temple
        </h1>
        <p className={styles.lede} data-hero-part>
          Gilt Foundry&apos;s own flagship build — a cinematic, scroll-driven
          experience.
        </p>
      </section>

      {/* 2. Framed clay reveal */}
      <section
        ref={frameRef}
        className={styles.reveal}
        aria-label="Clay reveal"
      >
        <p className={styles.eyebrow} data-frame-part>
          BEHIND THE SCROLL
        </p>
        <h2 className={styles.mainLine} data-frame-part>
          What the surface is hiding.
        </h2>
        <div className={styles.revealStage} data-frame-part>
          <ClayReveal variant="embed" />
        </div>
        <p className={styles.revealCaption} data-frame-part>
          Drag the raw and feel the 3D experience.
        </p>
      </section>

      {/* 3. Closing */}
      <footer className={styles.close}>
        <p className={styles.closeLine}>One project at a time.</p>
      </footer>
    </main>
  );
}
