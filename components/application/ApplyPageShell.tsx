'use client';

import { type ReactNode } from 'react';
import { useRouteBridge } from '@/components/transition/RouteTransition';
import styles from './ApplyPage.module.css';

type ApplyPageShellProps = {
  children: ReactNode;
};

/** Warm-beige apply shell — no watermark over the form (legibility first). */
export function ApplyPageShell({ children }: ApplyPageShellProps) {
  const bridge = useRouteBridge();

  return (
    <main className={styles.page}>
      <div className={styles.atmosphere} aria-hidden />
      <div className={styles.layout}>
        <div className={styles.inner}>
          <button
            type="button"
            className={styles.back}
            onClick={() => bridge?.go('/')}
          >
            ← Back to the temple
          </button>
          {children}
        </div>
      </div>
    </main>
  );
}
