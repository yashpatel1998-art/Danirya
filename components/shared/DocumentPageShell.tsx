'use client';

import type { ReactNode } from 'react';
import { Logo3D } from '@/components/brand/Logo3D';
import { useRouteBridge } from '@/components/transition/RouteTransition';
import styles from './DocumentPage.module.css';

type DocumentPageShellProps = {
  children: ReactNode;
  /** Rotating mark behind copy pages (off for full-bleed Work gallery). */
  watermark?: boolean;
  /** Drop outer padding so section components own their own margins. */
  flush?: boolean;
};

/** Beige document pages (/work, /studio) with optional logo watermark. */
export function DocumentPageShell({
  children,
  watermark = true,
  flush = false,
}: DocumentPageShellProps) {
  const bridge = useRouteBridge();

  return (
    <main
      className={`${styles.page} ${flush ? styles.pageFlush : ''}`}
      data-tone="document"
      id="after-temple"
    >
      <div className={styles.atmosphere} aria-hidden />
      {watermark ? (
        <div className={styles.watermark} aria-hidden>
          <Logo3D variant="follow" tone="document" spin={0.28} />
        </div>
      ) : null}
      <div className={flush ? styles.innerFlush : styles.inner}>
        <button
          type="button"
          className={styles.back}
          onClick={() => bridge?.go('/') ?? (window.location.href = '/')}
        >
          ← Back to the temple
        </button>
        {children}
      </div>
    </main>
  );
}
