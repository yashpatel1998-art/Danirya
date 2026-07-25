'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  HOLD_SANCTUARY_CTA,
  holdEnvelope,
  smoothstep01,
} from '@/lib/camera/roomTypography';
import { MOTION } from '@/lib/constants/motion';
import { subscribeJourneyFrame } from '@/lib/journey/frameBus';
import { EntranceBrandOverlay } from '@/components/hero/EntranceBrandOverlay';
import { TempleInscriptions } from '@/components/hero/TempleInscriptions';
import { BRAND } from '@/lib/content/brand';
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

/** Journey typography — room inscriptions + sanctuary CTA (Phase B snap). */
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
    // Phase B snap: statue typology replaces work-bay HTML plaques.
    const sanctuary = holdEnvelope(frame1, HOLD_SANCTUARY_CTA);
    if (sanctuary > 0) next.push({ id: 'sanctuary', progress: sanctuary });

    return next;
  }, [frame1]);

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

      {/* Room inscriptions — suppressed during statue typology holds */}
      <TempleInscriptions suppressed={suppressInscriptions} />
      <EntranceBrandOverlay />

      {primary?.id === 'sanctuary' && (
        <div
          className={`${styles.panel} ${styles.scaleBookend} ${styles.sanctuaryMinimal}`}
          style={revealStyle(primary.progress)}
        >
          <p className={styles.sanctuaryBrand}>{BRAND.nameUpper}</p>
        </div>
      )}
    </div>
  );
}
