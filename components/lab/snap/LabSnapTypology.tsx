'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { INSCRIPTION_HOLD_TIMING } from '@/lib/content/inscriptionHoldTiming';
import type { LabSnapPoint } from '@/lib/lab/snap/stubPath';
import { prefersReducedMotion } from '@/lib/motion/prefersReducedMotion';
import styles from './LabSnapTypology.module.css';

export type LabSnapTypologyMode = 'enter' | 'hold' | 'exit';

type LabSnapTypologyProps = {
  point: LabSnapPoint;
  mode: LabSnapTypologyMode;
  /** Fires when entrance finishes — unlock only; text stays visible. */
  onEntranceComplete: () => void;
  /** Fires when exit (triggered by next advance) finishes — safe to unmount. */
  onExitComplete: () => void;
};

function splitWords(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean);
}

/** Matches --ease-premium cubic-bezier(0.22, 1, 0.36, 1). */
const EASE_PREMIUM = 'cubic-bezier(0.22, 1, 0.36, 1)';
/** Fully masked — right inset covers the block. */
const CLIP_HIDDEN = 'inset(0 100% 0 0)';
/** Fully revealed. */
const CLIP_OPEN = 'inset(0 0% 0 0)';
const ENTER_DURATION = 0.85;

/**
 * Statue hold typology (magnify-glass gates only).
 * Mask/wipe reveal — clip edge slides open on enter, closed on exit.
 * No opacity fade. Room inscriptions (Forecourt / Threshold / Hall, etc.)
 * live in TempleInscriptions and keep fade+rise.
 *
 * Strict Mode safe: completion is marked only in onComplete — a killed
 * first-mount timeline does not block the surviving remount from re-entering.
 *
 * Repeat visits: parent keys this component by visit-unique stop `id`, not
 * `statueId`. Same statue content on a return stop gets a fresh mount + gate.
 */
export function LabSnapTypology({
  point,
  mode,
  onEntranceComplete,
  onExitComplete,
}: LabSnapTypologyProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<HTMLDivElement>(null);
  const onEntranceRef = useRef(onEntranceComplete);
  const onExitRef = useRef(onExitComplete);
  onEntranceRef.current = onEntranceComplete;
  onExitRef.current = onExitComplete;
  /** Set only after entrance genuinely completes — never on start. Visit-scoped. */
  const completedEntranceIdRef = useRef<string | null>(null);

  // Entrance — recreate cleanly on each surviving mount until completion.
  useLayoutEffect(() => {
    const mask = maskRef.current;
    if (!mask) return;

    // Already finished for this visit (stop id) — keep final visible state.
    // Do NOT key this on statueId: return visits share statueId and must re-run.
    if (completedEntranceIdRef.current === point.id) {
      gsap.set(mask, { clipPath: CLIP_OPEN });
      return;
    }

    let completed = false;

    const finishEntrance = () => {
      if (completed) return;
      completed = true;
      completedEntranceIdRef.current = point.id;
      onEntranceRef.current();
    };

    if (prefersReducedMotion()) {
      gsap.set(mask, { clipPath: CLIP_OPEN });
      finishEntrance();
      return;
    }

    gsap.set(mask, { clipPath: CLIP_HIDDEN });

    const tl = gsap.timeline({
      onComplete: finishEntrance,
    });
    tl.to(mask, {
      clipPath: CLIP_OPEN,
      duration: ENTER_DURATION,
      ease: EASE_PREMIUM,
    });

    return () => {
      // Kill interrupted attempt — do NOT mark completed; remount may retry.
      tl.kill();
    };
  }, [point.id]);

  // Exit — only when parent couples this to advance()/travel.
  useLayoutEffect(() => {
    if (mode !== 'exit') return;
    const mask = maskRef.current;
    if (!mask) return;

    let finished = false;

    const finishExit = () => {
      if (finished) return;
      finished = true;
      onExitRef.current();
    };

    if (prefersReducedMotion()) {
      gsap.set(mask, { clipPath: CLIP_HIDDEN });
      finishExit();
      return;
    }

    const tl = gsap.timeline({
      onComplete: finishExit,
    });
    tl.to(mask, {
      clipPath: CLIP_HIDDEN,
      duration: INSCRIPTION_HOLD_TIMING.exitDuration,
      ease: EASE_PREMIUM,
    });

    return () => {
      tl.kill();
    };
  }, [mode, point.id]);

  return (
    <div ref={rootRef} className={styles.root} aria-live="polite">
      <div ref={maskRef} className={styles.mask}>
        <div className={styles.block}>
          <p className={styles.eyebrow}>{point.eyebrow}</p>
          {point.lines.map((line) => (
            <p key={line} className={styles.line}>
              {splitWords(line).map((word, i) => (
                <span key={`${word}-${i}`} className={styles.word}>
                  {word}
                </span>
              ))}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
