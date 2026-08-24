'use client';

import { useEffect, useState } from 'react';
import { shouldUseStaticHomeLoader } from '@/lib/device/capabilities';
import { MOTION } from '@/lib/constants/motion';
import { StaticLoaderMark } from './StaticLoaderMark';
import styles from './HeroLoader.module.css';

type HeroLoaderProps = {
  loadProgress: number;
  explode: boolean;
  visible: boolean;
  onExplosionComplete?: () => void;
  onGone?: () => void;
};

/**
 * Arrival screen — spinning Meshy GF mark (OpeningLogo), beige+grey vignette,
 * gold meter, scroll cue. Leaves via fragment blast then iris fade.
 */
export function HeroLoader({
  loadProgress,
  explode,
  visible,
  onExplosionComplete,
  onGone,
}: HeroLoaderProps) {
  const staticLoader = shouldUseStaticHomeLoader();
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (visible) {
      setLeaving(false);
      setGone(false);
      return;
    }
    setLeaving(true);
    const id = window.setTimeout(() => {
      setGone(true);
      onGone?.();
    }, MOTION.duration.slow);
    return () => clearTimeout(id);
  }, [visible, onGone]);

  if (gone) return null;

  const p = Math.max(0, Math.min(1, loadProgress));
  const pct = Math.round(p * 100);

  return (
    <div
      className={`${styles.root} ${leaving ? styles.rootLeave : ''} ${
        leaving ? styles.rootIris : ''
      }`}
      aria-live="polite"
      aria-busy={visible || explode}
      data-hero-loader="1"
    >
      <div className={styles.blastLayer}>
        <StaticLoaderMark
          explode={explode}
          onExplosionComplete={onExplosionComplete}
        />
      </div>

      {!explode && (
        <div className={styles.stage}>
          <p className={styles.tagline}>A studio, not a template.</p>

          <div
            className={styles.meter}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          >
            <span className={styles.pct}>{pct}%</span>
            <div className={styles.track} aria-hidden>
              <div className={styles.fill} style={{ transform: `scaleX(${p})` }} />
            </div>
          </div>

          {visible && pct < 100 && (
            <span className={styles.hint}>Scroll or tap to enter</span>
          )}
        </div>
      )}
    </div>
  );
}
