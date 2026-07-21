'use client';

import type { ReactNode } from 'react';
import { Logo3D } from '@/components/brand/Logo3D';
import { useRouteBridge } from '@/components/transition/RouteTransition';
import styles from './DocumentPage.module.css';

/** Beige document pages (/work) with dark rotating logo watermark. */
export function DocumentPageShell({ children }: { children: ReactNode }) {
  const bridge = useRouteBridge();

  return (
    <main className={styles.page} data-tone="document">
      <div className={styles.atmosphere} aria-hidden />
      <div className={styles.watermark} aria-hidden>
        <Logo3D variant="follow" tone="document" spin={0.28} />
      </div>
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
    </main>
  );
}
