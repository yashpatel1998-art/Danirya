'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTempleAudioOptional } from '@/components/audio/AudioProvider';
import { useLenis } from '@/components/shared/LenisContext';
import { useJourneyFramePlayback } from '@/hooks/useJourneyFramePlayback';
import { loadLogoTemplate } from '@/lib/brand/loadLogoGltf';
import { JOURNEY_POSTER } from '@/lib/journey/frames';
import {
  getTempleScrollMobileVh,
  getTempleScrollVh,
} from '@/lib/journey/templeFilmMap';
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

  // Warm Meshy logo template used by the loader explosion.
  useEffect(() => {
    void loadLogoTemplate().catch(() => {
      /* OpeningLogo will retry */
    });
  }, []);

  const onDiveUnlock = useCallback(() => {
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
  } = useJourneyFramePlayback({
    trackRef,
    pinRef,
    canvasRef,
    lenis,
    onDiveUnlock,
    handoffReady,
    // Dive only after loader blast + fade — logo never rides the frame camera.
    diveArmed: loaderGone || verifyFast,
  });

  // Blast as soon as frames + scroll-load are done — don't wait on audio decode.
  const readyToBlast =
    verifyFast || (framesReady && fontsReady && loadProgress >= 1);
  const showScrollCue =
    loaderGone && firstPaintDone && openingHeld;

  const onBlastComplete = useCallback(() => {
    setBlastDone(true);
  }, []);

  const onLoaderGone = useCallback(() => setLoaderGone(true), []);

  useEffect(() => {
    const fast = new URLSearchParams(window.location.search).has('verify');
    if (!fast) return;
    setVerifyFast(true);
    setBlastDone(true);
    setLoaderGone(true);
  }, []);

  // If the Meshy explode never finishes, don't leave the loader up forever.
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

  // Absolute failsafe after hard refresh — never leave the first screen frozen.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setBlastDone(true);
      setLoaderGone(true);
      document.documentElement.style.overflow = '';
      window.scrollTo(0, 0);
      const smooth = (
        window as Window & {
          __lenis?: { start: () => void; scrollTo: (y: number, opts?: { immediate?: boolean }) => void };
        }
      ).__lenis;
      smooth?.scrollTo(0, { immediate: true });
      smooth?.start();
    }, 16000);
    return () => clearTimeout(id);
  }, []);

  // Track grows with inscription hold plateaus so travel frames stay 1:1.
  const templeScrollStyle = {
    ['--hero-scroll-vh' as string]: getTempleScrollVh(),
    ['--hero-scroll-mobile-vh' as string]: getTempleScrollMobileVh(),
  };

  return (
    <section
      ref={trackRef}
      className={styles.track}
      style={templeScrollStyle}
      aria-label="Hero"
      data-cursor-scroll
      data-dive-armed={loaderGone ? 'true' : 'false'}
      data-opening-held={openingHeld ? 'true' : 'false'}
    >
      <div ref={pinRef} className={styles.sticky}>
        <div
          className={`${styles.stage} ${loaderGone && firstPaintDone ? styles.stageLive : ''}`}
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
          <HeroLoader
            loadProgress={loadProgress}
            explode={readyToBlast}
            visible={!blastDone}
            onExplosionComplete={onBlastComplete}
            onGone={onLoaderGone}
          />
          <ScrollCue visible={showScrollCue} />
        </div>
        <HeroOverlay />
      </div>
    </section>
  );
});
