'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  ensureCameraPath,
  getCameraVelocity,
  settleFactor,
} from '@/lib/camera/cameraPath';
import {
  HOLD_SANCTUARY_CTA,
  holdEnvelope,
  smoothstep01,
  workBayHold,
} from '@/lib/camera/roomTypography';
import { SANCTUARY_COPY } from '@/lib/content/sectionCopy';
import { workProjects } from '@/lib/content/workProjects';
import { MOTION } from '@/lib/constants/motion';
import { subscribeJourneyFrame } from '@/lib/journey/frameBus';
import { TempleInscriptions } from '@/components/hero/TempleInscriptions';
import styles from './HeroOverlay.module.css';

type LayerId = 'workBay' | 'sanctuary';

type ActiveLayer = {
  id: LayerId;
  progress: number;
  bay?: number;
};

function revealStyle(progress: number): CSSProperties {
  const t = smoothstep01(progress);
  const y = MOTION.reveal.translateY * (1 - t);
  const blur = MOTION.reveal.blur * (1 - t);
  return {
    opacity: t,
    transform: `translate3d(0, ${y}px, 0)`,
    filter: t >= 0.999 ? 'none' : `blur(${blur}px)`,
  };
}

/** Journey typography — room inscriptions, work bays, sanctuary CTA. */
export function HeroOverlay() {
  const [frame1, setFrame1] = useState(1);
  const [pathReady, setPathReady] = useState(false);

  const bayHolds = useMemo(
    () => workProjects.map((p) => workBayHold(p.bay)),
    []
  );

  useEffect(() => {
    let cancelled = false;
    void ensureCameraPath()
      .then(() => {
        if (!cancelled) setPathReady(true);
      })
      .catch(() => {
        /* settle gate stays closed until path loads */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return subscribeJourneyFrame((pathIndex0) => {
      setFrame1(pathIndex0 + 1);
    });
  }, []);

  const layers = useMemo(() => {
    const next: ActiveLayer[] = [];
    const pathIndex0 = frame1 - 1;
    const velocity = pathReady ? getCameraVelocity(pathIndex0) : 1;
    const baySettle = pathReady ? settleFactor(velocity, 0.04, 0.14) : 0;

    bayHolds.forEach((hold, i) => {
      const p = holdEnvelope(frame1, hold) * baySettle;
      if (p > 0.01) next.push({ id: 'workBay', progress: p, bay: i });
    });

    const sanctuary = holdEnvelope(frame1, HOLD_SANCTUARY_CTA);
    if (sanctuary > 0) next.push({ id: 'sanctuary', progress: sanctuary });

    return next;
  }, [frame1, bayHolds, pathReady]);

  const vignette = layers.reduce((max, layer) => {
    const peak =
      layer.progress < 0.55
        ? layer.progress / 0.55
        : (1 - layer.progress) / 0.45;
    return Math.max(max, Math.max(0, Math.min(1, peak)) * 0.85);
  }, 0);

  const primary =
    [...layers].sort((a, b) => b.progress - a.progress)[0] ?? null;

  return (
    <div className={styles.overlay} aria-live="polite">
      <div
        className={styles.vignette}
        style={{ opacity: vignette }}
        aria-hidden
      />

      {/* Room inscriptions — same continuous-scroll settle system as room markers */}
      <TempleInscriptions />

      {primary?.id === 'workBay' && primary.bay != null && (
        <div
          className={`${styles.panel} ${styles.scaleSection}`}
          style={revealStyle(primary.progress)}
        >
          <p className={styles.projectName}>{workProjects[primary.bay]?.name}</p>
          <p className={styles.projectOutcome}>
            {workProjects[primary.bay]?.outcome}
          </p>
          <p className={styles.projectCategory}>
            {workProjects[primary.bay]?.category}
          </p>
        </div>
      )}

      {primary?.id === 'sanctuary' && (
        <div
          className={`${styles.panel} ${styles.scaleBookend} ${styles.sanctuaryMinimal}`}
          style={revealStyle(primary.progress)}
        >
          <p className={styles.sanctuaryLabel}>{SANCTUARY_COPY.emailLabel}</p>
          <a
            className={styles.sanctuaryEmail}
            href={`mailto:${SANCTUARY_COPY.email}`}
          >
            {SANCTUARY_COPY.email}
          </a>
          <a
            href="#apply"
            className={styles.sanctuaryCta}
            data-magnetic
            data-cursor="enter"
            data-cursor-label="Enter"
          >
            {SANCTUARY_COPY.cta}
          </a>
        </div>
      )}
    </div>
  );
}
