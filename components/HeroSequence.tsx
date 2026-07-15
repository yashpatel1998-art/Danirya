'use client';

import { memo, useRef } from 'react';
import { useHeroPlayer } from '@/hooks/useHeroPlayer';
import styles from './HeroSequence.module.css';

export const HeroSequence = memo(function HeroSequence() {
  const trackRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { frameOneReady, allFramesReady } = useHeroPlayer(trackRef, canvasRef);

  return (
    <section ref={trackRef} className={styles.heroTrack} aria-label="Hero">
      <div className={styles.heroSticky}>
        <canvas ref={canvasRef} className={styles.heroCanvas} />
        {!frameOneReady && (
          <div className={styles.heroLoading} aria-live="polite">
            <span className={styles.heroLoadingText}>Loading</span>
          </div>
        )}
        {!allFramesReady && frameOneReady && (
          <div className={styles.heroBuffering} aria-hidden />
        )}
        <div className={styles.heroOverlay}>
          <p className={styles.zoneLabel}>Danirya Studio</p>
        </div>
      </div>
    </section>
  );
});
