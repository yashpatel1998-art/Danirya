'use client';

import type { RefObject } from 'react';
import { ApplicationForm } from '@/components/application/ApplicationForm';
import { CaseStudyGallery } from '@/components/gallery/CaseStudyGallery';
import { LogoShowcase } from '@/components/studio/LogoShowcase';
import {
  SANCTUARY_COPY,
  STUDIO_SECTION_COPY,
} from '@/lib/content/sectionCopy';
import { TEMPLE_CASE, TEMPLE_SEQUENCE } from '@/lib/work/templeCaseStudy';
import styles from './NestedStack.module.css';

/** Case Study panel — real work content, scrollable inside the nest window. */
export function NestCasePanel({
  innerRef,
}: {
  innerRef?: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={innerRef} className={styles.panelInner}>
      <p className={styles.panelLabel}>{TEMPLE_CASE.category}</p>
      <h2 className={styles.panelTitle}>{TEMPLE_CASE.title}</h2>
      <p className={styles.panelBody}>{TEMPLE_CASE.subtitle}</p>
      <p className={styles.panelBody}>{TEMPLE_CASE.outcome}</p>
      <div className={styles.panelScroll}>
        <CaseStudyGallery stills={TEMPLE_SEQUENCE} />
      </div>
    </div>
  );
}

/** Studio panel — philosophy + logo showcase. */
export function NestStudioPanel() {
  return (
    <div className={styles.panelInner}>
      <p className={styles.panelLabel}>The Studio</p>
      <h2 className={styles.panelTitle}>{STUDIO_SECTION_COPY.title}</h2>
      <p className={styles.panelBody}>{STUDIO_SECTION_COPY.philosophy}</p>
      <div className={styles.panelScroll}>
        <LogoShowcase />
      </div>
    </div>
  );
}

/** Application panel — enquire form. */
export function NestApplicationPanel() {
  return (
    <div className={`${styles.panelInner} ${styles.panelInnerForm}`}>
      <p className={styles.panelLabel}>{SANCTUARY_COPY.emailLabel}</p>
      <h2 className={styles.panelTitle}>{SANCTUARY_COPY.cta}</h2>
      <p className={styles.panelBody}>
        Tell us about the work — budget, timeline, and what you want to build.
      </p>
      <a href={`mailto:${SANCTUARY_COPY.email}`} className={styles.panelEmail}>
        {SANCTUARY_COPY.email}
      </a>
      <div className={styles.panelScroll}>
        <ApplicationForm />
      </div>
    </div>
  );
}
