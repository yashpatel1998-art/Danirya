'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Logo3D } from '@/components/brand/Logo3D';
import { loadLogoTemplate } from '@/lib/brand/loadLogoGltf';
import styles from './PostTemple.module.css';

type PostTempleProps = {
  /** Work + Studio — watermark may sit behind these. */
  children: ReactNode;
  /** Application / form — never under the watermark. */
  after?: ReactNode;
};

/**
 * Continuous warm-beige document after the temple scrub.
 * Meshy logo watermark is scoped to Work/Studio only (not the form).
 */
export function PostTemple({ children, after }: PostTempleProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const watermarkZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadLogoTemplate().catch(() => {
      /* Logo3D retries via cloneLogoScene */
    });
  }, []);

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-tone="document"
      id="after-temple"
    >
      <div ref={watermarkZoneRef} className={styles.watermarkZone}>
        <div className={styles.watermarkRail} aria-hidden>
          <div className={styles.watermarkSticky}>
            <Logo3D
              variant="follow"
              tone="document"
              spin={0.42}
              spinAxis="y"
              followSectionRef={watermarkZoneRef}
              followTurns={1.35}
              className={styles.watermarkLogo}
            />
          </div>
        </div>
        <div className={styles.content}>{children}</div>
      </div>
      {after ? <div className={styles.after}>{after}</div> : null}
    </div>
  );
}
