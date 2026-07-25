'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import {
  HOLD_SANCTUARY_CTA,
  holdEnvelope,
} from '@/lib/camera/roomTypography';
import { SANCTUARY_COPY } from '@/lib/content/sectionCopy';
import { MOTION } from '@/lib/constants/motion';
import { subscribeJourneyFrame } from '@/lib/journey/frameBus';
import { prefersReducedMotion } from '@/lib/motion/prefersReducedMotion';
import { EntranceBrandOverlay } from '@/components/hero/EntranceBrandOverlay';
import { TempleInscriptions } from '@/components/hero/TempleInscriptions';
import styles from './HeroOverlay.module.css';

type LayerId = 'sanctuary';

type ActiveLayer = {
  id: LayerId;
  progress: number;
};

/** Matches --ease-premium cubic-bezier(0.22, 1, 0.36, 1). */
const EASE_PREMIUM = 'power3.out';
/** Start CTA choreography once the sanctuary hold has meaningfully entered. */
const CTA_PLAY_GATE = 0.45;

type HeroOverlayProps = {
  /** Hide room inscriptions while statue typology / lens owns the hold. */
  suppressInscriptions?: boolean;
};

/** Journey typography — room inscriptions + sanctuary CTA bookend (Phase B snap). */
export function HeroOverlay({
  suppressInscriptions = false,
}: HeroOverlayProps) {
  const [frame1, setFrame1] = useState(1);
  const panelRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const ctasRef = useRef<HTMLDivElement>(null);
  const playedRef = useRef(false);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    return subscribeJourneyFrame((pathIndex0) => {
      setFrame1(pathIndex0 + 1);
    });
  }, []);

  const layers = useMemo(() => {
    const next: ActiveLayer[] = [];
    const sanctuary = holdEnvelope(frame1, HOLD_SANCTUARY_CTA);
    if (sanctuary > 0) next.push({ id: 'sanctuary', progress: sanctuary });
    return next;
  }, [frame1]);

  const vignette = layers.reduce((max, layer) => {
    // Final sanctuary beat stays dimmed (fadeOut: 0 keeps progress at 1).
    if (layer.id === 'sanctuary' && layer.progress >= 0.999) {
      return Math.max(max, 0.62);
    }
    const peak =
      layer.progress < 0.55
        ? layer.progress / 0.55
        : (1 - layer.progress) / 0.45;
    return Math.max(max, Math.max(0, Math.min(1, peak)) * 0.85);
  }, 0);

  const primary =
    [...layers].sort((a, b) => b.progress - a.progress)[0] ?? null;
  const sanctuaryActive = primary?.id === 'sanctuary';
  const sanctuaryProgress = sanctuaryActive ? primary.progress : 0;

  // Hide dock targets on mount; kill timelines when sanctuary leaves.
  useLayoutEffect(() => {
    if (!sanctuaryActive) {
      playedRef.current = false;
      tlRef.current?.kill();
      tlRef.current = null;
      return;
    }

    const panel = panelRef.current;
    const copy = copyRef.current;
    const ctas = ctasRef.current
      ? Array.from(ctasRef.current.querySelectorAll<HTMLElement>('a'))
      : [];
    if (!panel || !copy || ctas.length === 0) return;

    const reduced = prefersReducedMotion();
    gsap.set(panel, { opacity: 0, x: reduced ? 0 : 48 });
    gsap.set(copy, { opacity: 0, x: reduced ? 0 : 18 });
    gsap.set(ctas, { opacity: 0, x: reduced ? 0 : 32 });

    return () => {
      tlRef.current?.kill();
      tlRef.current = null;
      gsap.set([panel, copy, ...ctas], { clearProps: 'opacity,x,transform' });
    };
  }, [sanctuaryActive]);

  // Panel enter + CTA stagger once the hold crosses the play gate (once per visit).
  useLayoutEffect(() => {
    if (!sanctuaryActive || sanctuaryProgress < CTA_PLAY_GATE || playedRef.current) {
      return;
    }

    const panel = panelRef.current;
    const copy = copyRef.current;
    const ctas = ctasRef.current
      ? Array.from(ctasRef.current.querySelectorAll<HTMLElement>('a'))
      : [];
    if (!panel || !copy || ctas.length === 0) return;

    playedRef.current = true;
    const reduced = prefersReducedMotion();
    const dur = MOTION.duration.base / 1000;

    const tl = gsap.timeline();
    tlRef.current = tl;

    // 1) Panel slides in from the right
    tl.to(panel, {
      opacity: 1,
      x: 0,
      duration: reduced ? dur : 0.75,
      ease: EASE_PREMIUM,
    });

    // 2) Copy settles, then CTAs stagger from the right
    tl.to(
      copy,
      {
        opacity: 1,
        x: 0,
        duration: reduced ? dur * 0.75 : 0.5,
        ease: EASE_PREMIUM,
      },
      reduced ? 0 : '-=0.4'
    );

    tl.to(
      ctas,
      {
        opacity: 1,
        x: 0,
        duration: reduced ? dur * 0.75 : 0.48,
        stagger: reduced ? 0 : 0.11,
        ease: EASE_PREMIUM,
      },
      reduced ? 0 : '-=0.22'
    );
  }, [sanctuaryActive, sanctuaryProgress]);

  return (
    <div className={styles.overlay} aria-live="polite">
      <div
        className={styles.vignette}
        style={{ opacity: vignette }}
        aria-hidden
      />

      {/* Room inscriptions — suppressed during statue typology holds */}
      <TempleInscriptions suppressed={suppressInscriptions} />
      <EntranceBrandOverlay />

      {sanctuaryActive && (
        <div className={styles.sanctuaryDock}>
          <div
            ref={panelRef}
            className={`${styles.panel} ${styles.scaleBookend} ${styles.sanctuaryPanel}`}
          >
            <div ref={copyRef} className={styles.sanctuaryCopy}>
              <p className={styles.sanctuaryLabel}>Continue</p>
              <p className={styles.sanctuaryLead}>
                The temple ends here — choose where to go next.
              </p>
            </div>
            <div ref={ctasRef} className={styles.sanctuaryCtas}>
              {SANCTUARY_COPY.exits.map((exit, index) => (
                <a
                  key={exit.href}
                  href={exit.href}
                  className={
                    index === SANCTUARY_COPY.exits.length - 1
                      ? `${styles.sanctuaryCta} ${styles.sanctuaryCtaPrimary}`
                      : styles.sanctuaryCta
                  }
                  data-magnetic
                  data-cursor="enter"
                  data-cursor-label={exit.cursorLabel}
                >
                  {exit.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
