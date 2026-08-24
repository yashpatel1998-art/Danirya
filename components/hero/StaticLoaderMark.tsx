'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { GUIDE_LOGO_MARK } from '@/lib/guide/constants';
import styles from './StaticLoaderMark.module.css';

type StaticLoaderMarkProps = {
  explode: boolean;
  onExplosionComplete?: () => void;
};

/** Lightweight loader mark — no WebGL, no GLB fetch. */
export function StaticLoaderMark({
  explode,
  onExplosionComplete,
}: StaticLoaderMarkProps) {
  useEffect(() => {
    if (!explode) return;
    const id = window.setTimeout(() => onExplosionComplete?.(), 520);
    return () => clearTimeout(id);
  }, [explode, onExplosionComplete]);

  return (
    <div
      className={`${styles.root} ${explode ? styles.explode : ''}`}
      aria-hidden
    >
      <div className={styles.spin}>
        <Image
          src={GUIDE_LOGO_MARK}
          alt=""
          width={160}
          height={160}
          className={styles.mark}
          priority
        />
      </div>
    </div>
  );
}
