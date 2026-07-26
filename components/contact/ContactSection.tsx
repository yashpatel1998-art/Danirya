'use client';

import type { CSSProperties } from 'react';
import { SANCTUARY_COPY } from '@/lib/content/sectionCopy';
import { ContactForm } from './ContactForm';
import { revealStyle, useContactReveal } from './useContactReveal';
import styles from './ContactSection.module.css';

export function ContactSection() {
  const { sectionRef, stages } = useContactReveal();

  return (
    <section
      ref={sectionRef}
      id="contact"
      className={styles.contact}
      aria-label="Contact"
      style={{ '--focus': stages.focus } as CSSProperties}
    >
      <div className={styles.ambient} aria-hidden />
      <div className={styles.architecture} aria-hidden />

      <div className={styles.inner}>
        <header className={styles.emailHero} style={revealStyle(stages.email)}>
          <span className={styles.emailLabel} aria-hidden>
            {SANCTUARY_COPY.emailLabel}
          </span>
          <a
            href={`mailto:${SANCTUARY_COPY.email}`}
            className={styles.emailLink}
          >
            {SANCTUARY_COPY.email}
          </a>
        </header>

        <div className={styles.editorial}>
          <h2 className={styles.title} style={revealStyle(stages.heading)}>
            Let&apos;s Build Something Extraordinary
          </h2>
          <p className={styles.subtitle} style={revealStyle(stages.subtitle)}>
            Tell us about your vision.
            <br />
            We&apos;ll craft a digital experience together.
          </p>
        </div>

        <ContactForm formReveal={stages.form} ctaReveal={stages.cta} />
      </div>
    </section>
  );
}
