'use client';

import { useRef } from 'react';
import { HangingPlacard } from '@/components/museum/HangingPlacard';
import { ApplicationForm } from '@/components/application/ApplicationForm';
import { SANCTUARY_COPY } from '@/lib/content/sectionCopy';
import { useTypoCascade } from '@/hooks/useTypoCascade';
import styles from './Application.module.css';

/**
 * Application room — form stays stationary.
 * Header typography cascades one-by-one on scroll; form fades in after.
 */
export function Application() {
  const headerRef = useRef<HTMLElement>(null);
  const formBlockRef = useRef<HTMLDivElement>(null);

  useTypoCascade(headerRef, {
    start: 'top 78%',
    end: '+=50%',
    stagger: 0.4,
  });

  useTypoCascade(formBlockRef, {
    start: 'top 88%',
    end: '+=28%',
    stagger: 0.35,
  });

  return (
    <section
      className={styles.room}
      aria-label="Application"
      data-room="application"
      id="apply"
      data-stable-form
    >
      <div className={styles.atmosphere} aria-hidden />
      <div className={styles.thresholdGlow} aria-hidden />
      <HangingPlacard
        title="APPLY"
        descriptor="Begin your project"
        start="top 70%"
      />

      <div className={styles.inner}>
        <header ref={headerRef} className={styles.header}>
          <p className={styles.emailLabel} data-typo="wipe">
            {SANCTUARY_COPY.emailLabel}
          </p>
          <a
            href={`mailto:${SANCTUARY_COPY.email}`}
            className={styles.emailHero}
            data-typo="wipe"
            data-magnetic
            data-cursor="enter"
            data-cursor-label="Write"
          >
            {SANCTUARY_COPY.email}
          </a>
          <h2 className={styles.headline} data-typo="wipe">
            {SANCTUARY_COPY.cta}
          </h2>
          <p className={styles.sub} data-typo="wipe">
            Tell us about the work — budget, timeline, and what you want to
            build. We reply within a few days.
          </p>
        </header>

        <div ref={formBlockRef} className={styles.formWrap}>
          <div data-typo="fade">
            <ApplicationForm />
          </div>
        </div>
      </div>
    </section>
  );
}
