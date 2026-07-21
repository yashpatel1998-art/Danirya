'use client';

import { Logo3D } from '@/components/brand/Logo3D';
import styles from './LoadingSplash.module.css';

/** Next.js route-level loading UI — one Meshy GLB, not the temple bake. */
export function LoadingSplash() {
  return (
    <div className={styles.root} aria-busy aria-label="Loading">
      <div className={styles.center}>
        <Logo3D variant="hero" spin={0.7} spinAxis="y" />
        <p className={styles.copy}>A studio, reimagined as a temple.</p>
      </div>
    </div>
  );
}
