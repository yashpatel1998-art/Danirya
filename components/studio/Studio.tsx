'use client';

import { useEffect, useRef } from 'react';
import { HangingPlacard } from '@/components/museum/HangingPlacard';
import { LogoShowcase } from '@/components/studio/LogoShowcase';
import { StudioDisciplineSwitch } from '@/components/studio/StudioDisciplineSwitch';
import { loadLogoTemplate } from '@/lib/brand/loadLogoGltf';
import { STUDIO_SECTION_COPY } from '@/lib/content/sectionCopy';
import { useDepthParallax } from '@/hooks/useDepthParallax';
import { useTypoCascade } from '@/hooks/useTypoCascade';
import styles from './Studio.module.css';

/**
 * Post-temple Studio — philosophy, Meshy mark, discipline switch.
 * Typography cascades one-by-one on scroll.
 */
export function Studio() {
  const sectionRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleBlockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadLogoTemplate().catch(() => {
      /* LogoShowcase retries via cloneLogoScene */
    });
  }, []);

  useDepthParallax({
    fastRef: panelRef,
    slowRef: titleBlockRef,
    triggerRef: sectionRef,
    amount: 32,
    scrub: true,
  });

  useTypoCascade(sectionRef, {
    start: 'top 75%',
    end: '+=85%',
    stagger: 0.45,
  });

  return (
    <section
      ref={sectionRef}
      className={styles.room}
      aria-label="The Studio"
      data-room="studio"
      id="studio"
    >
      <div ref={panelRef} className={styles.atmosphere} aria-hidden />
      <HangingPlacard title="STUDIO" descriptor="Process & craft" start="top 72%" />

      <div className={styles.inner}>
        <p className={styles.label} data-typo="wipe">
          The Studio
        </p>
        <div ref={titleBlockRef}>
          <h2 className={styles.title} data-typo="wipe">
            {STUDIO_SECTION_COPY.title}
          </h2>
        </div>
        <p className={styles.body} data-typo="wipe">
          {STUDIO_SECTION_COPY.philosophy}
        </p>

        <div data-typo="fade" className={styles.typoBlock}>
          <LogoShowcase />
        </div>

        <div data-typo="fade" className={styles.typoBlock}>
          <StudioDisciplineSwitch />
        </div>

        <a
          href="#apply"
          className={styles.continue}
          data-typo="wipe"
          data-magnetic
          data-cursor="enter"
          data-cursor-label="Enter"
        >
          Begin your project
        </a>
      </div>
    </section>
  );
}
