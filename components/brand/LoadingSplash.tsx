'use client';

import { LOGO_MARK_PNG } from '@/lib/brand/logoUrl';
import styles from './LoadingSplash.module.css';

/** Next.js route-level loading UI — 2D GF mark, not the temple bake. */
export function LoadingSplash() {
  return (
    <div className={styles.root} aria-busy aria-label="Loading">
      <div className={styles.center}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_MARK_PNG}
          alt=""
          className={styles.mark}
          draggable={false}
          aria-hidden
        />
        <p className={styles.copy}>A studio, reimagined as a temple.</p>
      </div>
    </div>
  );
}
