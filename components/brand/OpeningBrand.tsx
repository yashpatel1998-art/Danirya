'use client';

import { OpeningLogo } from '@/components/brand/OpeningLogo';
import styles from './OpeningBrand.module.css';

type OpeningBrandProps = {
  showIntact: boolean;
  explode: boolean;
  onExplosionComplete?: () => void;
};

/**
 * Held-opening brand: one canvas, Y-spin → shatter.
 * Never mounts a second WebGL logo (no overlap / blank context).
 */
export function OpeningBrand({
  showIntact,
  explode,
  onExplosionComplete,
}: OpeningBrandProps) {
  if (!showIntact && !explode) return null;

  return (
    <div className={styles.root} aria-hidden>
      <OpeningLogo explode={explode} onExplosionComplete={onExplosionComplete} />
    </div>
  );
}
