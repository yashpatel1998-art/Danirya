'use client';

import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLayoutEffect, useState } from 'react';
import { createJourneyVideoTimeline } from '@/lib/journey/createJourneyVideoTimeline';
import {
  JOURNEY_OVERLAY,
  JOURNEY_PLAYHEAD_CHASE_SPEED,
  JOURNEY_SEEK_EPSILON,
} from '@/lib/journey/constants';
import { lerpFilmProgress } from '@/lib/utils/smoothProgress';

export type JourneyOverlayVisibility = {
  gallery: number;
  lab: number;
  application: number;
  finalLogo: number;
};

type JourneyVideoPlaybackResult = {
  videoReady: boolean;
  scrollProgress: number;
  overlays: JourneyOverlayVisibility;
};

type UseJourneyVideoPlaybackOptions = {
  trackRef: React.RefObject<HTMLElement | null>;
  pinRef: React.RefObject<HTMLElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
};

function overlayOpacity(
  scrollProgress: number,
  enter: number,
  exit: number
): number {
  if (scrollProgress < enter || scrollProgress > exit) return 0;
  const fade = Math.min(0.04, (exit - enter) * 0.2);
  if (scrollProgress < enter + fade) {
    return (scrollProgress - enter) / fade;
  }
  if (scrollProgress > exit - fade) {
    return (exit - scrollProgress) / fade;
  }
  return 1;
}

/**
 * Post-Hero journey playback — same locked stack as Hero:
 * Lenis → GSAP scrub chapters → weighted playhead → video.currentTime
 */
export function useJourneyVideoPlayback({
  trackRef,
  pinRef,
  videoRef,
}: UseJourneyVideoPlaybackOptions): JourneyVideoPlaybackResult {
  const [videoReady, setVideoReady] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [overlays, setOverlays] = useState<JourneyOverlayVisibility>({
    gallery: 0,
    lab: 0,
    application: 0,
    finalLogo: 0,
  });

  useLayoutEffect(() => {
    let waitRafId = 0;
    let drawRafId = 0;
    let journeyTimeline: ReturnType<typeof createJourneyVideoTimeline> | null =
      null;
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
      let lastScroll = -1;
      let lastOverlays = { gallery: 0, lab: 0, application: 0, finalLogo: 0 };
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
      if (video.readyState >= 4) markReady();

      journeyTimeline = createJourneyVideoTimeline({ track, pin });
      ScrollTrigger.refresh();

      const syncOverlays = (p: number) => {
        const next = {
          gallery: overlayOpacity(
            p,
            JOURNEY_OVERLAY.gallery.enter,
            JOURNEY_OVERLAY.gallery.exit
          ),
          lab: overlayOpacity(
            p,
            JOURNEY_OVERLAY.lab.enter,
            JOURNEY_OVERLAY.lab.exit
          ),
          application: overlayOpacity(
            p,
            JOURNEY_OVERLAY.application.enter,
            JOURNEY_OVERLAY.application.exit
          ),
          finalLogo: overlayOpacity(
            p,
            JOURNEY_OVERLAY.finalLogo.enter,
            JOURNEY_OVERLAY.finalLogo.exit
          ),
        };
        const changed =
          Math.abs(next.gallery - lastOverlays.gallery) > 0.02 ||
          Math.abs(next.lab - lastOverlays.lab) > 0.02 ||
          Math.abs(next.application - lastOverlays.application) > 0.02 ||
          Math.abs(next.finalLogo - lastOverlays.finalLogo) > 0.02;
        if (changed) {
          lastOverlays = next;
          setOverlays(next);
        }
      };

      const loop = (timestamp: number) => {
        if (!journeyTimeline) return;

        const dtSeconds =
          lastFrameTime > 0 ? (timestamp - lastFrameTime) / 1000 : 0;
        lastFrameTime = timestamp;

        ScrollTrigger.update();

        if (!video.paused) video.pause();

        const p = journeyTimeline.getScrollProgress();
        if (Math.abs(p - lastScroll) > 0.001) {
          lastScroll = p;
          setScrollProgress(p);
        }
        syncOverlays(p);

        const targetFilmProgress = journeyTimeline.filmState.filmProgress;
        displayedFilmProgress = lerpFilmProgress(
          displayedFilmProgress,
          targetFilmProgress,
          dtSeconds,
          JOURNEY_PLAYHEAD_CHASE_SPEED
        );

        if (
          video.readyState >= 2 &&
          Number.isFinite(video.duration) &&
          video.duration > 0
        ) {
          const targetTime = Math.min(
            video.duration,
            Math.max(0, displayedFilmProgress * video.duration)
          );
          if (Math.abs(video.currentTime - targetTime) > JOURNEY_SEEK_EPSILON) {
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
        journeyTimeline?.kill();
        journeyTimeline = null;
      };
    };

    init();
    return () => teardown?.();
  }, [trackRef, pinRef, videoRef]);

  return { videoReady, scrollProgress, overlays };
}
