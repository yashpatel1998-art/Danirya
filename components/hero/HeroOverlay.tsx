'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import {
  HOLD_SANCTUARY_CTA,
  holdEnvelope,
} from '@/lib/camera/roomTypography';
import { SANCTUARY_COPY } from '@/lib/content/sectionCopy';
import { captureActiveTempleSnap } from '@/lib/lab/snap/templeSnapRestore';
import { LAB_BACKDROP_SRC } from '@/lib/lab/backdrop';
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
const EASE_PREMIUM = 'cubic-bezier(0.22, 1, 0.36, 1)';
/** Start CTA choreography once the sanctuary hold has meaningfully entered. */
const CTA_PLAY_GATE = 0.45;

const GROUP_RISE_Y = 36;
const GROUP_DURATION = 1.15;
const BTN_DURATION = 0.52;
const BTN_STAGGER = 0.14;
const BTN_RISE_Y = 14;

/**
 * Read-only frame-linked backdrop drift while sanctuary is active.
 * Maps HOLD_SANCTUARY_CTA frames 1175→1200 → tiny translate (does not
 * drive snap / Lenis; window scroll is pinned during the journey).
 */
const BACKDROP_DRIFT_Y = 28;
const BACKDROP_DRIFT_X = 8;
const SCROLL_LAG = 0.85;

type HeroOverlayProps = {
  /** Hide room inscriptions while statue typology / lens owns the hold. */
  suppressInscriptions?: boolean;
};

/** Journey typography — room inscriptions + sanctuary CTA bookend (Phase B snap). */
export function HeroOverlay({
  suppressInscriptions = false,
}: HeroOverlayProps) {
  const [frame1, setFrame1] = useState(1);
  const groupRef = useRef<HTMLDivElement>(null);
  const ctasRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const playedRef = useRef(false);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const driftTweenRef = useRef<gsap.core.Tween | null>(null);

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

    const group = groupRef.current;
    const ctas = ctasRef.current
      ? Array.from(ctasRef.current.querySelectorAll<HTMLElement>('a'))
      : [];
    if (!group || ctas.length === 0) return;

    const reduced = prefersReducedMotion();
    gsap.set(group, { opacity: 0, y: reduced ? 0 : GROUP_RISE_Y });
    gsap.set(ctas, { opacity: 0, y: reduced ? 0 : BTN_RISE_Y });

    return () => {
      tlRef.current?.kill();
      tlRef.current = null;
      gsap.set([group, ...ctas], { clearProps: 'opacity,y,transform' });
    };
  }, [sanctuaryActive]);

  // Group rise, then CTA stagger L→M→R once the hold crosses the play gate.
  useLayoutEffect(() => {
    if (!sanctuaryActive || sanctuaryProgress < CTA_PLAY_GATE || playedRef.current) {
      return;
    }

    const group = groupRef.current;
    const ctas = ctasRef.current
      ? Array.from(ctasRef.current.querySelectorAll<HTMLElement>('a'))
      : [];
    if (!group || ctas.length === 0) return;

    playedRef.current = true;
    const reduced = prefersReducedMotion();

    if (reduced) {
      gsap.set(group, { opacity: 1, y: 0 });
      gsap.set(ctas, { opacity: 1, y: 0 });
      return;
    }

    const tl = gsap.timeline();
    tlRef.current = tl;

    // 1) Entire CTA block rises as one group
    tl.to(group, {
      opacity: 1,
      y: 0,
      duration: GROUP_DURATION,
      ease: EASE_PREMIUM,
    });

    // 2) Buttons wave left → middle → right
    tl.to(
      ctas,
      {
        opacity: 1,
        y: 0,
        duration: BTN_DURATION,
        stagger: BTN_STAGGER,
        ease: EASE_PREMIUM,
      },
      '-=0.28',
    );
  }, [sanctuaryActive, sanctuaryProgress]);

  // Frame-linked backdrop parallax (read-only journey frame bus — no snap drive).
  useLayoutEffect(() => {
    const backdrop = backdropRef.current;
    if (!sanctuaryActive || !backdrop) {
      driftTweenRef.current?.kill();
      driftTweenRef.current = null;
      return;
    }

    if (prefersReducedMotion()) {
      gsap.set(backdrop, { x: 0, y: 0 });
      return;
    }

    const span = Math.max(1, HOLD_SANCTUARY_CTA.exit - HOLD_SANCTUARY_CTA.enter);
    const progress = Math.max(
      0,
      Math.min(1, (frame1 - HOLD_SANCTUARY_CTA.enter) / span),
    );

    driftTweenRef.current?.kill();
    driftTweenRef.current = gsap.to(backdrop, {
      x: progress * BACKDROP_DRIFT_X,
      y: progress * BACKDROP_DRIFT_Y,
      duration: SCROLL_LAG,
      ease: EASE_PREMIUM,
      overwrite: 'auto',
    });

    return () => {
      driftTweenRef.current?.kill();
      driftTweenRef.current = null;
    };
  }, [sanctuaryActive, frame1]);

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
          <div ref={backdropRef} className={styles.sanctuaryBackdrop} aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.sanctuaryBackdropImg}
              src={LAB_BACKDROP_SRC}
              alt=""
              width={1920}
              height={1080}
              decoding="async"
            />
            <div className={styles.sanctuaryBackdropWash} />
          </div>

          <div
            ref={groupRef}
            className={`${styles.panel} ${styles.scaleBookend} ${styles.sanctuaryPanel}`}
          >
            <div className={styles.sanctuaryCopy}>
              <p className={styles.sanctuaryLabel}>
                {SANCTUARY_COPY.emailLabel}
              </p>
              <a
                className={styles.sanctuaryEmail}
                href={`mailto:${SANCTUARY_COPY.email}`}
                data-magnetic
                data-cursor="enter"
                data-cursor-label="Write"
              >
                {SANCTUARY_COPY.email}
              </a>
              <p className={styles.sanctuaryEyebrow}>{SANCTUARY_COPY.eyebrow}</p>
              <h2 className={styles.sanctuaryHeading}>{SANCTUARY_COPY.heading}</h2>
              <p className={styles.sanctuaryLead}>{SANCTUARY_COPY.line}</p>
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
                  onClick={() => {
                    // Persist active sanctuary stop before RouteTransition bridges away.
                    captureActiveTempleSnap(exit.href);
                  }}
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
