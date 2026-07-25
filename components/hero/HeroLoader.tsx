'use client';

import { useEffect, useState } from 'react';
import { Logo3D } from '@/components/brand/Logo3D';
import { MOTION } from '@/lib/constants/motion';
import styles from './HeroLoader.module.css';

type HeroLoaderProps = {
  loadProgress: number;
  explode: boolean;
  visible: boolean;
  onExplosionComplete?: () => void;
  onGone?: () => void;
};

/**
 * Arrival screen — static Meshy GF mark, brand line, gold meter, scroll cue.
 * Opaque near-black stage; leaves via iris fade (no fragment blast).
 */
export function HeroLoader({
  loadProgress,
  explode,
  visible,
  onExplosionComplete,
  onGone,
}: HeroLoaderProps) {
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

  // Fade/scale exit — clean 3D mark exit (no fragment blast).
  useEffect(() => {
    if (!explode) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const id = window.setTimeout(
      () => onExplosionComplete?.(),
      reduced ? 0 : MOTION.duration.slow
    );
    return () => clearTimeout(id);
  }, [explode, onExplosionComplete]);

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
      <div className={styles.stage}>
        <div
          className={`${styles.markHost} ${explode ? styles.markExplode : ''}`}
          aria-hidden
        >
          <Logo3D
            variant="hero"
            spin={0}
            restYawDeg={22}
            className={styles.mark}
          />
        </div>

        {!explode && (
          <>
            <p className={styles.tagline}>A studio, not a template.</p>

            <div className={styles.meter} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
              <span className={styles.pct}>{pct}%</span>
              <div className={styles.track} aria-hidden>
                <div className={styles.fill} style={{ transform: `scaleX(${p})` }} />
              </div>
            </div>

            {visible && pct < 100 && (
              <span className={styles.hint}>Scroll to enter</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
