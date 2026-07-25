'use client';

import { useEffect, useState } from 'react';
import { Logo3D } from '@/components/brand/Logo3D';
import { BRAND } from '@/lib/content/brand';
import { LOADER_STAGES, loaderStageIndex } from '@/lib/content/loaderCopy';
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
 * Phase 1 — arrival preloader: Meshy 3D mark + torch meter + status line.
 * Leaves via iris fade; never fakes a minimum wait.
 */
export function HeroLoader({
  loadProgress,
  explode,
  visible,
  onExplosionComplete,
  onGone,
}: HeroLoaderProps) {
  const stage = loaderStageIndex(loadProgress);
  const copy = LOADER_STAGES[stage];
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
    >
      <div className={styles.blastLayer}>
        <div
          className={`${styles.markHost} ${explode ? styles.markExplode : ''}`}
          aria-hidden
        >
          <Logo3D variant="hero" spin={0.7} className={styles.mark} />
        </div>
      </div>

      {!explode && p >= 0.12 && (
        <p
          className={`${styles.brandName} ${p >= 0.35 ? styles.brandNameSettled : ''}`}
          aria-hidden
        >
          {BRAND.nameUpper}
        </p>
      )}

      {!explode && (
        <div className={styles.center}>
          {/* Torch flame meter — height tracks readiness */}
          <div className={styles.torch} aria-hidden>
            <div
              className={styles.flame}
              style={{ transform: `scaleY(${0.18 + p * 0.82})` }}
            />
            <div className={styles.torchBase} />
          </div>

          <p
            key={copy.id}
            className={`${styles.copy} ${copy.emphasis ? styles.copyEmphasis : ''}`}
          >
            {copy.text}
          </p>
          <span className={styles.pct}>{pct}%</span>
          {visible && pct < 100 && (
            <span className={styles.hint}>Scroll to enter</span>
          )}
        </div>
      )}
    </div>
  );
}
