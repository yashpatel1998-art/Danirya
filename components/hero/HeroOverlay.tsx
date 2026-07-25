'use client';

import { EntranceBrandOverlay } from '@/components/hero/EntranceBrandOverlay';
import { TempleInscriptions } from '@/components/hero/TempleInscriptions';
import styles from './HeroOverlay.module.css';

type HeroOverlayProps = {
  /** Hide room inscriptions while statue typology / lens owns the hold. */
  suppressInscriptions?: boolean;
};

/** Journey typography — room inscriptions only (no sanctuary exit wordmark). */
export function HeroOverlay({
  suppressInscriptions = false,
}: HeroOverlayProps) {
  return (
    <div className={styles.overlay} aria-live="polite">
      {/* Room inscriptions — suppressed during statue typology holds */}
      <TempleInscriptions suppressed={suppressInscriptions} />
      <EntranceBrandOverlay />
    </div>
  );
}
