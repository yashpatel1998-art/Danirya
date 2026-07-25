'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTempleAudioOptional } from '@/components/audio/AudioProvider';
import { LabSnapTypology } from '@/components/lab/snap/LabSnapTypology';
import { StatueLens } from '@/components/lab/snap/StatueLens';
import { useLenis } from '@/components/shared/LenisContext';
import { useHeroSnapPlayback } from '@/hooks/useHeroSnapPlayback';
import { JOURNEY_POSTER } from '@/lib/journey/frames';
import { HeroLoader } from './HeroLoader';
import { HeroOverlay } from './HeroOverlay';
import { ScrollCue } from './ScrollCue';
import styles from './Hero.module.css';

export const Hero = memo(function Hero() {
  const trackRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lenis = useLenis();
  const audio = useTempleAudioOptional();
  const [fontsReady, setFontsReady] = useState(false);
  const [blastDone, setBlastDone] = useState(false);
  const [loaderGone, setLoaderGone] = useState(false);
  const [verifyFast, setVerifyFast] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const ready = async () => {
      try {
        if (document.fonts?.ready) {
          await Promise.race([
            document.fonts.ready,
            new Promise<void>((r) => window.setTimeout(r, 2500)),
          ]);
        }
      } catch {
        /* allow handoff if Font Loading API unavailable */
      }
      if (!cancelled) setFontsReady(true);
    };
    void ready();
    const fallback = window.setTimeout(() => {
      if (!cancelled) setFontsReady(true);
    }, 3000);
    return () => {
      cancelled = true;
      clearTimeout(fallback);
    };
  }, []);

  // Opening settle after loader blast + iris: arm beds, then unmute on gesture.
  const onDiveUnlock = useCallback(() => {
    audio?.armJourney();
    void audio?.setMuted(false);
  }, [audio]);

  const audioSettled = verifyFast || audio == null || audio.ready;
  // Dive handoff can wait briefly for audio; loader blast must not.
  const handoffReady = fontsReady && audioSettled;

  const {
    framesReady,
    firstPaintDone,
    loadProgress,
    openingHeld,
    restorePending,
    phase,
    pointIndex,
    frame1,
    typologyPoint,
    typologyMode,
    onTypologyEntranceComplete,
    onTypologyExitComplete,
  } = useHeroSnapPlayback({
    canvasRef,
    pinRef,
    lenis,
    onDiveUnlock,
    handoffReady,
    // Dive only after loader blast + fade — logo never rides the frame camera.
    // Restore path self-arms inside the hook once frames are warm.
    diveArmed: loaderGone || verifyFast,
  });

  // Pre-arm debug surface for Playwright (controller fills fields after snap arm).
  useEffect(() => {
    const w = window as Window & {
      __HERO_SNAP_DEBUG__?: {
        phase: string;
        pointIndex: number;
        frame1: number;
        stopId: string | null;
        kind: string | null;
        statueId: string | null;
        masterFrame: number | null;
        typologyMode: string | null;
        snapArmed: boolean;
        openingHeld: boolean;
        loadProgress: number;
        framesReady: boolean;
        loaderGone: boolean;
        firstPaintDone: boolean;
        restorePending?: boolean;
      };
    };
    const prev = w.__HERO_SNAP_DEBUG__;
    w.__HERO_SNAP_DEBUG__ = {
      phase: prev?.phase ?? phase,
      pointIndex: prev?.pointIndex ?? pointIndex,
      frame1: prev?.frame1 ?? frame1,
      stopId: prev?.stopId ?? typologyPoint?.id ?? null,
      kind: prev?.kind ?? typologyPoint?.kind ?? null,
      statueId: prev?.statueId ?? typologyPoint?.statueId ?? null,
      masterFrame: prev?.masterFrame ?? typologyPoint?.masterFrame ?? null,
      typologyMode: typologyMode,
      snapArmed: !openingHeld && (loaderGone || verifyFast || restorePending),
      openingHeld,
      loadProgress,
      framesReady,
      loaderGone,
      firstPaintDone,
      restorePending,
    };
  }, [
    phase,
    pointIndex,
    frame1,
    typologyPoint,
    typologyMode,
    openingHeld,
    loadProgress,
    framesReady,
    loaderGone,
    firstPaintDone,
    verifyFast,
    restorePending,
  ]);

  // Blast as soon as frames + scroll-load are done — don't wait on audio decode.
  // Return-position restore skips scroll-loader + blast entirely.
  const readyToBlast =
    verifyFast ||
    restorePending ||
    (framesReady && fontsReady && loadProgress >= 1);
  const showScrollCue =
    loaderGone && firstPaintDone && openingHeld && !restorePending;

  const onBlastComplete = useCallback(() => {
    setBlastDone(true);
  }, []);

  const onLoaderGone = useCallback(() => setLoaderGone(true), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fast = params.has('verify');
    if (fast) setVerifyFast(true);
    // Restore / verify: dismiss loader immediately (no scroll-intent + no blast).
    if (fast || restorePending) {
      setBlastDone(true);
      setLoaderGone(true);
    }
  }, [restorePending]);

  // If the mark exit never finishes, don't leave the loader up forever.
  useEffect(() => {
    if (!readyToBlast || blastDone) return;
    const id = window.setTimeout(() => {
      console.warn('[hero] blast watchdog — dismissing loader');
      setBlastDone(true);
    }, 5000);
    return () => clearTimeout(id);
  }, [readyToBlast, blastDone]);

  // Ensure onGone runs even if HeroLoader unmount path is skipped.
  useEffect(() => {
    if (!blastDone || loaderGone) return;
    const id = window.setTimeout(() => setLoaderGone(true), 100);
    return () => clearTimeout(id);
  }, [blastDone, loaderGone]);

  // Absolute failsafe after hard refresh — dismiss a stuck loader only.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setBlastDone(true);
      setLoaderGone(true);
      document.documentElement.style.overflow = '';
      const smooth = (
        window as Window & {
          __lenis?: { start: () => void };
        }
      ).__lenis;
      smooth?.start();
    }, 16000);
    return () => clearTimeout(id);
  }, []);

  const washActive =
    typologyPoint != null &&
    typologyPoint.kind === 'statue' &&
    (typologyMode === 'enter' ||
      typologyMode === 'hold' ||
      typologyMode === 'exit');
  const washExiting = typologyMode === 'exit';
  const showLens =
    typologyPoint?.kind === 'statue' &&
    typologyPoint.lensSrc != null &&
    (typologyMode === 'enter' ||
      typologyMode === 'hold' ||
      typologyMode === 'exit');
  const suppressInscriptions =
    typologyPoint?.kind === 'statue' &&
    (typologyMode === 'enter' ||
      typologyMode === 'hold' ||
      typologyMode === 'exit');

  return (
    <section
      ref={trackRef}
      className={styles.track}
      aria-label="Hero"
      data-cursor-scroll
      data-hero-snap="1"
      data-dive-armed={loaderGone || restorePending ? 'true' : 'false'}
      data-opening-held={openingHeld ? 'true' : 'false'}
      data-hero-phase={phase}
      data-hero-frame={String(frame1)}
      data-hero-stop={String(pointIndex + 1)}
    >
      <div ref={pinRef} className={styles.sticky}>
        <div
          className={`${styles.stage} ${loaderGone && firstPaintDone ? styles.stageLive : ''}`}
          data-hero-snap-stage="1"
        >
          {!loaderGone && (
            <img
              src={JOURNEY_POSTER}
              alt=""
              aria-hidden
              className={styles.poster}
            />
          )}
          <canvas
            ref={canvasRef}
            className={`${styles.canvas} ${loaderGone && firstPaintDone ? styles.canvasReady : ''}`}
            aria-hidden
          />
          <div
            className={`${styles.sceneWash} ${washActive && !washExiting ? styles.sceneWashActive : ''} ${washExiting ? styles.sceneWashExit : ''}`}
            aria-hidden
          />
          {showLens && typologyPoint?.lensSrc ? (
            <StatueLens
              key={`lens-${typologyPoint.id}`}
              src={typologyPoint.lensSrc}
              alt={typologyPoint.eyebrow}
              mode={typologyMode}
              stageSelector="[data-hero-snap-stage='1']"
            />
          ) : null}
          {typologyPoint ? (
            <LabSnapTypology
              key={typologyPoint.id}
              point={typologyPoint}
              mode={typologyMode}
              onEntranceComplete={onTypologyEntranceComplete}
              onExitComplete={onTypologyExitComplete}
            />
          ) : null}
          <HeroLoader
            loadProgress={loadProgress}
            explode={readyToBlast}
            visible={!blastDone}
            onExplosionComplete={onBlastComplete}
            onGone={onLoaderGone}
          />
          <ScrollCue visible={showScrollCue} />
        </div>
        {loaderGone ? (
          <HeroOverlay suppressInscriptions={suppressInscriptions} />
        ) : null}
      </div>
    </section>
  );
});
