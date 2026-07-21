'use client';

import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLayoutEffect, useState } from 'react';
import { HERO_TYPOGRAPHY_SCROLL_THRESHOLD } from '@/lib/constants/hero';
import { createHeroVideoTimeline } from '@/lib/hero/createHeroVideoTimeline';
import {
  HERO_PLAYHEAD_CHASE_SPEED,
  HERO_SEEK_EPSILON,
} from '@/lib/hero-video/constants';
import { lerpFilmProgress } from '@/lib/utils/smoothProgress';

/** Film progress where opening veil is fully clear (end of logo reveal). */
const VEIL_CLEAR_AT = 48 / 279;

type HeroVideoPlaybackResult = {
  videoReady: boolean;
  typographyVisible: boolean;
  /** 1 = pure black opening veil, 0 = fully revealed. */
  openingVeil: number;
};

type UseHeroVideoPlaybackOptions = {
  trackRef: React.RefObject<HTMLElement | null>;
  pinRef: React.RefObject<HTMLElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
};

/**
 * Production Hero playback (architecture locked):
 * Lenis → GSAP scrub chapters → weighted playhead → video.currentTime
 */
export function useHeroVideoPlayback({
  trackRef,
  pinRef,
  videoRef,
}: UseHeroVideoPlaybackOptions): HeroVideoPlaybackResult {
  const [videoReady, setVideoReady] = useState(false);
  const [typographyVisible, setTypographyVisible] = useState(false);
  const [openingVeil, setOpeningVeil] = useState(1);

  useLayoutEffect(() => {
    let waitRafId = 0;
    let drawRafId = 0;
    let heroTimeline: ReturnType<typeof createHeroVideoTimeline> | null = null;
    let teardown: (() => void) | null = null;

    const init = () => {
      const track = trackRef.current;
      const pin = pinRef.current;
      const video = videoRef.current;
      if (!track || !pin || !video) {
        waitRafId = requestAnimationFrame(init);
        return;
      }

      let ready = false;
      let displayedFilmProgress = 0;
      let lastTypographyVisible = false;
      let lastVeil = 1;
      let lastFrameTime = 0;

      const markReady = () => {
        if (ready) return;
        ready = true;
        setVideoReady(true);
      };

      video.pause();
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.defaultMuted = true;
      video.disablePictureInPicture = true;
      video.controls = false;
      video.currentTime = 0;

      const onReady = () => markReady();
      const blockPlay = (event: Event) => {
        event.preventDefault();
        video.pause();
      };

      video.addEventListener('canplaythrough', onReady);
      video.addEventListener('canplay', onReady);
      video.addEventListener('loadeddata', onReady);
      video.addEventListener('play', blockPlay);
      if (video.readyState >= 4) {
        markReady();
      }

      heroTimeline = createHeroVideoTimeline({ track, pin });
      ScrollTrigger.refresh();

      const syncTypography = (scrollProgress: number) => {
        const visible = scrollProgress >= HERO_TYPOGRAPHY_SCROLL_THRESHOLD;
        if (visible !== lastTypographyVisible) {
          lastTypographyVisible = visible;
          setTypographyVisible(visible);
        }
      };

      const syncVeil = (filmProgress: number) => {
        const veil =
          filmProgress <= 0.0005
            ? 1
            : Math.max(0, Math.min(1, 1 - filmProgress / VEIL_CLEAR_AT));
        if (Math.abs(veil - lastVeil) > 0.01) {
          lastVeil = veil;
          setOpeningVeil(veil);
        }
      };

      const loop = (timestamp: number) => {
        if (!heroTimeline) return;

        const dtSeconds =
          lastFrameTime > 0 ? (timestamp - lastFrameTime) / 1000 : 0;
        lastFrameTime = timestamp;

        ScrollTrigger.update();

        if (!video.paused) {
          video.pause();
        }

        const scrollProgress = heroTimeline.getScrollProgress();
        syncTypography(scrollProgress);

        const targetFilmProgress = heroTimeline.filmState.filmProgress;
        displayedFilmProgress = lerpFilmProgress(
          displayedFilmProgress,
          targetFilmProgress,
          dtSeconds,
          HERO_PLAYHEAD_CHASE_SPEED
        );

        syncVeil(displayedFilmProgress);

        if (video.readyState >= 2 && Number.isFinite(video.duration) && video.duration > 0) {
          const targetTime = Math.min(
            video.duration,
            Math.max(0, displayedFilmProgress * video.duration)
          );
          if (Math.abs(video.currentTime - targetTime) > HERO_SEEK_EPSILON) {
            video.currentTime = targetTime;
          }
        }

        drawRafId = requestAnimationFrame(loop);
      };

      drawRafId = requestAnimationFrame(loop);

      teardown = () => {
        cancelAnimationFrame(waitRafId);
        cancelAnimationFrame(drawRafId);
        video.removeEventListener('canplaythrough', onReady);
        video.removeEventListener('canplay', onReady);
        video.removeEventListener('loadeddata', onReady);
        video.removeEventListener('play', blockPlay);
        heroTimeline?.kill();
        heroTimeline = null;
      };
    };

    init();

    return () => {
      teardown?.();
    };
  }, [trackRef, pinRef, videoRef]);

  return { videoReady, typographyVisible, openingVeil };
}
