'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import {
  STUDIO_DISCIPLINES,
  type StudioDiscipline,
} from '@/lib/content/studioDisciplines';
import { prefersReducedMotion } from '@/lib/motion/prefersReducedMotion';
import styles from './StudioDisciplineSwitch.module.css';

/**
 * Material / Light / Structure — tab switch with GSAP crossfade of copy + image.
 */
export function StudioDisciplineSwitch() {
  const [activeId, setActiveId] = useState(STUDIO_DISCIPLINES[0].id);
  const imgRef = useRef<HTMLImageElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const captionRef = useRef<HTMLElement>(null);
  const animating = useRef(false);
  const hasSwitched = useRef(false);

  const active =
    STUDIO_DISCIPLINES.find((d) => d.id === activeId) ?? STUDIO_DISCIPLINES[0];

  const fadeTargets = () =>
    [imgRef.current, bodyRef.current, captionRef.current].filter(
      (el): el is HTMLElement => !!el
    );

  const switchTo = (next: StudioDiscipline) => {
    if (next.id === activeId || animating.current) return;

    if (prefersReducedMotion()) {
      setActiveId(next.id);
      return;
    }

    const targets = fadeTargets();
    if (!targets.length) {
      setActiveId(next.id);
      return;
    }

    animating.current = true;
    gsap.to(targets, {
      opacity: 0,
      y: 10,
      duration: 0.28,
      ease: 'power2.in',
      stagger: 0.03,
      onComplete: () => {
        hasSwitched.current = true;
        setActiveId(next.id);
      },
    });
  };

  useLayoutEffect(() => {
    if (!hasSwitched.current) return;
    const targets = fadeTargets();
    if (!targets.length) {
      animating.current = false;
      return;
    }
    if (prefersReducedMotion()) {
      gsap.set(targets, { opacity: 1, y: 0 });
      animating.current = false;
      return;
    }
    const tween = gsap.fromTo(
      targets,
      { opacity: 0, y: -8 },
      {
        opacity: 1,
        y: 0,
        duration: 0.42,
        ease: 'power2.out',
        stagger: 0.04,
        onComplete: () => {
          animating.current = false;
        },
      }
    );
    return () => {
      tween.kill();
    };
  }, [activeId]);

  return (
    <div className={styles.root}>
      <div
        className={styles.tabs}
        role="tablist"
        aria-label="Studio disciplines"
      >
        {STUDIO_DISCIPLINES.map((d, i) => (
          <button
            key={d.id}
            type="button"
            role="tab"
            id={`studio-tab-${d.id}`}
            aria-selected={d.id === activeId}
            aria-controls="studio-discipline-panel"
            className={`${styles.tab} ${d.id === activeId ? styles.tabActive : ''}`}
            onClick={() => switchTo(d)}
            data-magnetic
            data-cursor="enter"
            data-cursor-label={d.label}
          >
            {i > 0 && <span className={styles.tabLine} aria-hidden />}
            <span className={styles.tabLabel}>{d.label}</span>
          </button>
        ))}
      </div>

      <div
        id="studio-discipline-panel"
        role="tabpanel"
        aria-labelledby={`studio-tab-${active.id}`}
        className={styles.stage}
      >
        <div className={styles.card}>
          <span className={styles.grain} aria-hidden />
          <div
            className={styles.frame}
            data-cursor="view"
            data-cursor-label="View"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={active.still.src}
              alt={active.still.alt}
              className={styles.img}
              width={1920}
              height={1080}
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className={styles.copy}>
            <span ref={captionRef} className={styles.caption}>
              {active.label}
            </span>
            <p ref={bodyRef} className={styles.body}>
              {active.body}
            </p>
          </div>
          <span className={styles.goldRule} aria-hidden />
        </div>
      </div>

      <ul className={styles.cardStrip} aria-label="Studio capabilities">
        {STUDIO_DISCIPLINES.map((d, i) => (
          <li key={d.id} className={styles.stripItem}>
            {i > 0 && <span className={styles.stripLine} aria-hidden />}
            <button
              type="button"
              className={`${styles.stripCard} ${d.id === activeId ? styles.stripCardActive : ''}`}
              aria-pressed={d.id === activeId}
              onClick={() => switchTo(d)}
            >
              <span className={styles.stripGrain} aria-hidden />
              <span className={styles.stripLabel}>{d.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
