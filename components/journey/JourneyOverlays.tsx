'use client';

import type { JourneyOverlayVisibility } from '@/hooks/useJourneyVideoPlayback';
import { ApplicationPanel } from './ApplicationPanel';
import styles from './JourneyOverlays.module.css';

type JourneyOverlaysProps = {
  overlays: JourneyOverlayVisibility;
};

export function JourneyOverlays({ overlays }: JourneyOverlaysProps) {
  return (
    <div className={styles.root}>
      <div
        className={styles.panel}
        style={{ opacity: overlays.gallery }}
        aria-hidden={overlays.gallery < 0.05}
      >
        <span className={styles.label}>Selected Work</span>
        <h2 className={styles.title}>Exhibits</h2>
        <p className={styles.copy}>
          Digital experiences presented as architecture —
          studied, lit, and held with museum restraint.
        </p>
      </div>

      <div
        className={`${styles.panel} ${styles.panelLab}`}
        style={{ opacity: overlays.lab }}
        aria-hidden={overlays.lab < 0.05}
      >
        <span className={styles.label}>Laboratory</span>
        <h2 className={styles.title}>Our Thinking</h2>
        <div className={styles.labGrid}>
          <div>
            <h3 className={styles.labHead}>Process</h3>
            <p className={styles.labText}>
              Research the brand. Model the space. Direct the light.
              Every motion earns its place in the narrative.
            </p>
          </div>
          <div>
            <h3 className={styles.labHead}>Workflow</h3>
            <p className={styles.labText}>
              Concept → environment → camera → craft → polish.
              DANIRYA builds premium digital experiences as complete worlds.
            </p>
          </div>
        </div>
      </div>

      <div
        className={`${styles.panel} ${styles.panelApp}`}
        style={{
          opacity: overlays.application,
          pointerEvents: overlays.application > 0.4 ? 'auto' : 'none',
        }}
        aria-hidden={overlays.application < 0.05}
      >
        <ApplicationPanel active={overlays.application > 0.4} />
      </div>

      <div
        className={styles.final}
        style={{ opacity: overlays.finalLogo }}
        aria-hidden={overlays.finalLogo < 0.05}
      >
        <span className={styles.finalMark}>DANIRYA</span>
        <span className={styles.finalSub}>Journey complete</span>
      </div>
    </div>
  );
}
