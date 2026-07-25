'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  HOLD_SANCTUARY_CTA,
  holdEnvelope,
  smoothstep01,
} from '@/lib/camera/roomTypography';
import { SANCTUARY_COPY } from '@/lib/content/sectionCopy';
import { MOTION } from '@/lib/constants/motion';
import { subscribeJourneyFrame } from '@/lib/journey/frameBus';
import { EntranceBrandOverlay } from '@/components/hero/EntranceBrandOverlay';
import { TempleInscriptions } from '@/components/hero/TempleInscriptions';
import styles from './HeroOverlay.module.css';

type LayerId = 'sanctuary';

type ActiveLayer = {
  id: LayerId;
  progress: number;
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

type HeroOverlayProps = {
  /** Hide room inscriptions while statue typology / lens owns the hold. */
  suppressInscriptions?: boolean;
};

/** Journey typography — room inscriptions + sanctuary CTA bookend (Phase B snap). */
export function HeroOverlay({
  suppressInscriptions = false,
}: HeroOverlayProps) {
  const [frame1, setFrame1] = useState(1);

  useEffect(() => {
    return subscribeJourneyFrame((pathIndex0) => {
      setFrame1(pathIndex0 + 1);
    });
  }, []);

  const layers = useMemo(() => {
    const next: ActiveLayer[] = [];
    const sanctuary = holdEnvelope(frame1, HOLD_SANCTUARY_CTA);
    if (sanctuary > 0) next.push({ id: 'sanctuary', progress: sanctuary });
    return next;
  }, [frame1]);

  const vignette = layers.reduce((max, layer) => {
    // Final sanctuary beat stays dimmed (fadeOut: 0 keeps progress at 1).
    if (layer.id === 'sanctuary' && layer.progress >= 0.999) {
      return Math.max(max, 0.62);
    }
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

      {/* Room inscriptions — suppressed during statue typology holds */}
      <TempleInscriptions suppressed={suppressInscriptions} />
      <EntranceBrandOverlay />

      {primary?.id === 'sanctuary' && (
        <div
          className={`${styles.panel} ${styles.scaleBookend} ${styles.sanctuaryMinimal}`}
          style={revealStyle(primary.progress)}
        >
          <p className={styles.sanctuaryLabel}>Continue</p>
          <p className={styles.sanctuaryLead}>
            The temple ends here — choose where to go next.
          </p>
          <div className={styles.sanctuaryCtas}>
            {SANCTUARY_COPY.exits.map((exit) => (
              <a
                key={exit.href}
                href={exit.href}
                className={styles.sanctuaryCta}
                data-magnetic
                data-cursor="enter"
                data-cursor-label={exit.cursorLabel}
              >
                {exit.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
