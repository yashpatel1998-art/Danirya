'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import {
  ensureCameraPath,
  getCameraVelocity,
  settleFactor,
} from '@/lib/camera/cameraPath';
import { holdEnvelope } from '@/lib/camera/roomTypography';
import {
  inscriptionForRoom,
  inscriptionHoldForRoom,
  roomAtPathIndex0,
  type TempleRoomId,
} from '@/lib/content/templeInscriptions';
import { MOTION } from '@/lib/constants/motion';
import { INSCRIPTION_HOLD_TIMING } from '@/lib/content/inscriptionHoldTiming';
import { subscribeJourneyFrame } from '@/lib/journey/frameBus';
import {
  armInscriptionGate,
  clearInscriptionGate,
  markInscriptionRevealComplete,
} from '@/lib/journey/inscriptionGate';
import { prefersReducedMotion } from '@/lib/motion/prefersReducedMotion';
import styles from './TempleInscriptions.module.css';

/** Pause after room label finishes before inscription words (~400–500ms). */
const AFTER_LABEL_PAUSE = 0.45;
/** Stagger between word starts — keep in sync with hold timing math. */
const WORD_STAGGER = INSCRIPTION_HOLD_TIMING.wordStagger;
/** Per-word entrance duration. */
const WORD_DURATION = INSCRIPTION_HOLD_TIMING.wordDuration;
/** Room label entrance duration. */
const LABEL_DURATION = 0.5;
/** Unified exit fade (also used in hold sizing). */
const EXIT_DURATION = INSCRIPTION_HOLD_TIMING.exitDuration;
/** Matches --ease-premium cubic-bezier(0.22, 1, 0.36, 1). */
const EASE_PREMIUM = 'power3.out';

/**
 * Looser than Studio focus — forecourt never drops below ~0.17 velocity.
 * Hold window is primary; settle only softens entry.
 */
const SETTLE_LOW = 0.12;
const SETTLE_HIGH = 0.3;
const PLAY_GATE = 0.45;

type TempleInscriptionsProps = {
  suppressed?: boolean;
};

function splitWords(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean);
}

/**
 * Typography overlay on the continuous temple scroll.
 * Room label → pause → word-by-word fade+rise; exit fades the whole block.
 */
export function TempleInscriptions({
  suppressed = false,
}: TempleInscriptionsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const [room, setRoom] = useState<TempleRoomId>('forecourt');
  const [gateTick, setGateTick] = useState(0);
  const suppressedRef = useRef(suppressed);
  const pathReadyRef = useRef(false);
  const activeRoomRef = useRef<TempleRoomId | null>(null);
  const playedRef = useRef<TempleRoomId | null>(null);
  const pendingPlayRef = useRef<TempleRoomId | null>(null);
  const pendingFadeRef = useRef(false);
  /** Exit requested while entrance timeline still playing. */
  const exitAfterRevealRef = useRef(false);
  const revealCompleteRef = useRef(true);
  const fadingRef = useRef(false);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const reducedRef = useRef(false);

  suppressedRef.current = suppressed;
  const copy = inscriptionForRoom(room);

  const killTl = () => {
    tlRef.current?.kill();
    tlRef.current = null;
  };

  const collectWords = (root: HTMLElement): HTMLSpanElement[] =>
    Array.from(
      root.querySelectorAll<HTMLSpanElement>('[data-inscription-word]')
    );

  const hideInstant = () => {
    const root = rootRef.current;
    const label = labelRef.current;
    if (!root || !label) return;
    killTl();
    clearInscriptionGate();
    revealCompleteRef.current = true;
    exitAfterRevealRef.current = false;
    fadingRef.current = false;
    gsap.set(root, { opacity: 0, visibility: 'hidden' });
    gsap.set(label, { opacity: 0, y: 0 });
    gsap.set(collectWords(root), { opacity: 0, y: 0 });
  };

  const requestFadeOut = () => {
    if (fadingRef.current) return;
    // Safeguard: never start exit until entrance has reached 100%.
    if (!revealCompleteRef.current) {
      exitAfterRevealRef.current = true;
      return;
    }
    pendingFadeRef.current = true;
    setGateTick((n) => n + 1);
  };

  const playReveal = (forRoom: TempleRoomId) => {
    const root = rootRef.current;
    const label = labelRef.current;
    if (!root || !label) return;
    if (playedRef.current === forRoom) return;
    playedRef.current = forRoom;
    killTl();

    const hold = inscriptionHoldForRoom(forRoom);
    revealCompleteRef.current = false;
    exitAfterRevealRef.current = false;
    fadingRef.current = false;
    // Cap inside the plateau (before fade-out ramp) so envelope stays live.
    armInscriptionGate(Math.max(hold.enter, hold.exit - hold.fadeOut));

    const reduced = reducedRef.current;
    const durBase = MOTION.duration.base / 1000;
    const wordEls = collectWords(root);

    gsap.set(root, { visibility: 'visible', opacity: 1 });
    gsap.set(label, { opacity: 0, y: reduced ? 0 : 8 });
    gsap.set(wordEls, {
      opacity: 0,
      y: reduced ? 0 : 10,
    });

    const tl = gsap.timeline({
      onComplete: () => {
        revealCompleteRef.current = true;
        markInscriptionRevealComplete();
        if (exitAfterRevealRef.current) {
          exitAfterRevealRef.current = false;
          requestFadeOut();
        }
      },
    });
    tlRef.current = tl;

    // 1) Room label
    tl.to(label, {
      opacity: 1,
      y: 0,
      duration: reduced ? durBase : LABEL_DURATION,
      ease: EASE_PREMIUM,
    });

    // 2) Inscription words — after label finishes + settle pause
    if (reduced) {
      tl.to(
        wordEls,
        {
          opacity: 1,
          duration: durBase,
          ease: 'power1.out',
        },
        `>${AFTER_LABEL_PAUSE}`
      );
    } else {
      wordEls.forEach((wordEl, i) => {
        tl.to(
          wordEl,
          {
            opacity: 1,
            y: 0,
            duration: WORD_DURATION,
            ease: EASE_PREMIUM,
          },
          i === 0
            ? `>${AFTER_LABEL_PAUSE}`
            : `-=${WORD_DURATION - WORD_STAGGER}`
        );
      });
    }
  };

  const fadeOut = () => {
    const root = rootRef.current;
    if (!root || fadingRef.current) return;
    fadingRef.current = true;
    killTl();
    clearInscriptionGate();
    revealCompleteRef.current = true;
    exitAfterRevealRef.current = false;
    const tl = gsap.timeline({
      onComplete: () => {
        hideInstant();
        playedRef.current = null;
        activeRoomRef.current = null;
      },
    });
    tlRef.current = tl;
    // Exit: entire block as one unit — no per-word reverse
    tl.to(root, {
      opacity: 0,
      duration: EXIT_DURATION,
      ease: 'power1.out',
    });
  };

  useEffect(() => {
    reducedRef.current = prefersReducedMotion();
    let cancelled = false;
    void ensureCameraPath()
      .then(() => {
        if (!cancelled) pathReadyRef.current = true;
      })
      .catch(() => {
        /* settle stays closed */
      });

    const unsub = subscribeJourneyFrame((pathIndex0) => {
      if (!pathReadyRef.current) return;

      const nextRoom = roomAtPathIndex0(pathIndex0);
      setRoom((prev) => (prev === nextRoom ? prev : nextRoom));

      if (suppressedRef.current) {
        if (activeRoomRef.current) requestFadeOut();
        return;
      }

      const frame1 = pathIndex0 + 1;
      const hold = inscriptionHoldForRoom(nextRoom);
      const envelope = holdEnvelope(frame1, hold);
      if (envelope <= 0.01) {
        if (activeRoomRef.current) requestFadeOut();
        return;
      }

      const velocity = getCameraVelocity(pathIndex0);
      const settle = settleFactor(velocity, SETTLE_LOW, SETTLE_HIGH);
      const gated = envelope * (0.4 + 0.6 * settle);

      if (gated >= PLAY_GATE) {
        if (activeRoomRef.current !== nextRoom) {
          if (activeRoomRef.current) {
            hideInstant();
            playedRef.current = null;
          }
          activeRoomRef.current = nextRoom;
          pendingPlayRef.current = nextRoom;
          pendingFadeRef.current = false;
          exitAfterRevealRef.current = false;
          setGateTick((n) => n + 1);
        }
      } else if (gated < 0.2 && activeRoomRef.current) {
        requestFadeOut();
      }
    });

    return () => {
      cancelled = true;
      unsub();
      killTl();
    };
  }, []);

  useLayoutEffect(() => {
    if (pendingFadeRef.current) {
      pendingFadeRef.current = false;
      fadeOut();
      return;
    }
    if (pendingPlayRef.current === room) {
      pendingPlayRef.current = null;
      // Defer one frame so word spans from the new room are mounted
      requestAnimationFrame(() => playReveal(room));
    }
  }, [room, copy, suppressed, gateTick]);

  useEffect(() => {
    if (suppressed && activeRoomRef.current) {
      fadeOut();
    }
  }, [suppressed]);

  if (!copy) return null;

  let wordIndex = 0;
  let firstContentLine = true;

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-temple-inscription
      data-room={copy.room}
      aria-hidden
    >
      <p ref={labelRef} className={styles.label}>
        {copy.label}
      </p>
      <div className={styles.body}>
        {copy.lines.map((line, li) => {
          if (!line.trim()) {
            return <div key={`${copy.room}-gap-${li}`} className={styles.stanzaGap} />;
          }
          const parts = splitWords(line);
          // Brand-scale only for short opening marks (e.g. DANIRYA)
          const lead =
            firstContentLine &&
            parts.length <= 2 &&
            line.trim().length <= 16;
          firstContentLine = false;
          return (
            <p
              key={`${copy.room}-line-${li}`}
              className={lead ? `${styles.line} ${styles.lineLead}` : styles.line}
            >
              {parts.map((word, wi) => {
                const idx = wordIndex++;
                return (
                  <span key={`${copy.room}-w-${idx}`}>
                    <span className={styles.word} data-inscription-word>
                      {word}
                    </span>
                    {wi < parts.length - 1 ? ' ' : null}
                  </span>
                );
              })}
            </p>
          );
        })}
      </div>
    </div>
  );
}
