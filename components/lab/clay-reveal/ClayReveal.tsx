'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { gsap } from 'gsap';
import styles from './ClayReveal.module.css';

/** Single knob — change this to swap both clay + gold frames. */
export const FRAME_NUMBER = 510;

/** Toggle CLAY / FINAL labels. */
export const SHOW_LABELS = true;

const PAD = 4; // zero-padded digits in filenames (frame_0510.webp)
const SWEEP_PEAK = 62;

function frameSrc(base: string, n: number) {
  return `${base}/frame_${String(n).padStart(PAD, '0')}.webp`;
}

type ClayRevealProps = {
  frameNumber?: number;
  showLabels?: boolean;
  /**
   * `page` — standalone /lab/clay-reveal chrome (default).
   * `embed` — stage only, for composition inside other lab pages.
   */
  variant?: 'page' | 'embed';
  className?: string;
};

/**
 * /lab/clay-reveal — isolated before/after drag reveal.
 * Clay under (left), gold over (right). Does not touch production.
 */
export function ClayReveal({
  frameNumber = FRAME_NUMBER,
  showLabels = SHOW_LABELS,
  variant = 'page',
  className,
}: ClayRevealProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const userInteractedRef = useRef(false);
  const sweepPlayedRef = useRef(false);
  const sweepTlRef = useRef<gsap.core.Timeline | null>(null);
  const [position, setPosition] = useState(50);
  const [cueDismissed, setCueDismissed] = useState(false);

  const claySrc = frameSrc('/work/clay/v1', frameNumber);
  const goldSrc = frameSrc('/journey/frames/v3', frameNumber);
  const embed = variant === 'embed';

  const killSweep = () => {
    if (sweepTlRef.current) {
      sweepTlRef.current.kill();
      sweepTlRef.current = null;
    }
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const el = stageRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return;
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      setPosition(Math.min(100, Math.max(0, x)));
    };

    const onUp = () => {
      draggingRef.current = false;
      document.body.classList.remove(styles.draggingBody);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.body.classList.remove(styles.draggingBody);
    };
  }, []);

  // One-time hint sweep when the stage first scrolls into view.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const playSweep = () => {
      if (sweepPlayedRef.current || userInteractedRef.current) return;
      sweepPlayedRef.current = true;

      const proxy = { pos: 50 };
      const tl = gsap.timeline({
        onComplete: () => {
          sweepTlRef.current = null;
        },
      });
      sweepTlRef.current = tl;

      tl.to(proxy, {
        pos: SWEEP_PEAK,
        duration: 0.5,
        ease: 'power2.inOut',
        onUpdate: () => {
          if (userInteractedRef.current) return;
          setPosition(proxy.pos);
        },
      }).to(proxy, {
        pos: 50,
        duration: 0.5,
        ease: 'power2.inOut',
        onUpdate: () => {
          if (userInteractedRef.current) return;
          setPosition(proxy.pos);
        },
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        playSweep();
        observer.disconnect();
      },
      { threshold: 0.45 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      killSweep();
    };
  }, []);

  const beginDrag = (e: ReactPointerEvent) => {
    e.preventDefault();

    // First interaction: dismiss cue + cancel any in-flight hint sweep.
    userInteractedRef.current = true;
    sweepPlayedRef.current = true;
    killSweep();
    setCueDismissed(true);

    draggingRef.current = true;
    document.body.classList.add(styles.draggingBody);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, x)));
  };

  const stage = (
    <div
      ref={stageRef}
      className={styles.stage}
      onPointerDown={beginDrag}
      role="slider"
      aria-label="Reveal between clay and final"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
      aria-orientation="horizontal"
    >
      {/* Clay: full base (left / under) */}
      <img
        className={styles.layer}
        src={claySrc}
        alt={`Clay frame ${frameNumber}`}
        draggable={false}
        decoding="async"
      />

      {/* Gold: clipped to the right of the divider */}
      <img
        className={`${styles.layer} ${styles.gold}`}
        src={goldSrc}
        alt={`Final frame ${frameNumber}`}
        draggable={false}
        decoding="async"
        style={{ clipPath: `inset(0 0 0 ${position}%)` }}
      />

      {showLabels && (
        <>
          <span className={`${styles.label} ${styles.labelClay}`}>Clay</span>
          <span className={`${styles.label} ${styles.labelFinal}`}>Final</span>
        </>
      )}

      <div
        className={styles.divider}
        style={{ left: `${position}%` }}
        aria-hidden
      >
        <div className={styles.line} />
        {/* Separate handle — restyle / swap for scalloped lens later */}
        <button
          type="button"
          className={styles.handle}
          tabIndex={-1}
          aria-hidden
          onPointerDown={beginDrag}
        />
        <span
          className={`${styles.cue} ${cueDismissed ? styles.cueHidden : ''}`}
        >
          Drag to reveal
        </span>
      </div>
    </div>
  );

  if (embed) {
    return (
      <div className={[styles.embed, className].filter(Boolean).join(' ')}>
        {stage}
      </div>
    );
  }

  return (
    <main className={[styles.page, className].filter(Boolean).join(' ')}>
      <p className={styles.kicker}>Lab · clay reveal</p>
      <h1 className={styles.title}>Clay → Final</h1>
      <p className={styles.note}>
        Drag the divider · frame {String(frameNumber).padStart(PAD, '0')}
      </p>
      {stage}
    </main>
  );
}
