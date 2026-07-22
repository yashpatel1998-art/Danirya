'use client';

import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef, useState } from 'react';
import { HERO_TYPOGRAPHY_SCROLL_THRESHOLD } from '@/lib/constants/hero';
import { HERO_PLAYHEAD_CHASE_SPEED } from '@/lib/hero-video/constants';
import { createJourneyFrameTimeline } from '@/lib/journey/createJourneyFrameTimeline';
import {
  JOURNEY_FRAME_COUNT,
  frame1ToPathIndex,
  journeyFrameUrl,
} from '@/lib/journey/frames';
import { publishJourneyFrame } from '@/lib/journey/frameBus';
import { getInscriptionFrameCap1 } from '@/lib/journey/inscriptionGate';
import {
  templeFilmProgressToFrame1,
  templeFrame1ToScrollProgress,
} from '@/lib/journey/inscriptionHoldRemap';
import { journeyDollyScale } from '@/lib/journey/workStudioScrollRemap';
import { lerpFilmProgress } from '@/lib/utils/smoothProgress';
import type Lenis from 'lenis';

const LOAD_CONCURRENCY_DESKTOP = 8;
const LOAD_CONCURRENCY_MOBILE = 4;
/** 1 viewport of scroll intent ≈ 15% loader progress (~6.67 pages → 100%). */
const SCROLL_LOAD_PERCENT_PER_PAGE = 0.15;

/** Pin document + Lenis to top so loader scroll-intent cannot leak into the film. */
function pinScrollToOpening(lenis: Lenis | null | undefined) {
  if (typeof window === 'undefined') return;
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  lenis?.scrollTo(0, { immediate: true });
}

type JourneyFramePlaybackResult = {
  framesReady: boolean;
  firstPaintDone: boolean;
  loadProgress: number;
  typographyVisible: boolean;
  /** True while exterior frame 1 is held before first scroll. */
  openingHeld: boolean;
};

/** Narrow / touch-first → load every Nth frame to cut decode + bandwidth. */
function resolveFrameStride(): number {
  if (typeof window === 'undefined') return 1;
  const narrow = window.matchMedia('(max-width: 768px)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  return narrow || coarse ? 2 : 1;
}

function resolveMaxDpr(): number {
  if (typeof window === 'undefined') return 2;
  const narrow = window.matchMedia('(max-width: 768px)').matches;
  return narrow ? 1 : Math.min(window.devicePixelRatio || 1, 2);
}

/** Nearest loaded 1-based frame when using a mobile stride. */
function nearestLoadedFrame1(
  frame1: number,
  images: HTMLImageElement[],
  stride: number
): number {
  if (stride <= 1) return frame1;
  const idx = frame1 - 1;
  if (images[idx]?.naturalWidth) return frame1;
  const base = Math.round(idx / stride) * stride;
  for (let d = 0; d <= stride; d += 1) {
    const a = base - d;
    const b = base + d;
    if (a >= 0 && images[a]?.naturalWidth) return a + 1;
    if (b < images.length && images[b]?.naturalWidth) return b + 1;
  }
  return 1;
}

type Options = {
  trackRef: React.RefObject<HTMLElement | null>;
  pinRef: React.RefObject<HTMLElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  lenis: Lenis | null;
  /** Fired once on first intentional scroll after the held opening. */
  onDiveUnlock?: () => void;
  /**
   * When false, keep the held opening locked even if frames are painted
   * (fonts / audio still settling under the loader).
   */
  handoffReady?: boolean;
  /**
   * When false, ignore dive-unlock gestures (loader still visible / leaving).
   * Arm only after HeroLoader has fully unmounted.
   */
  diveArmed?: boolean;
};

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cssW: number,
  cssH: number
): void {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih || !cssW || !cssH) return;

  // Full clear every paint — prevents prior-frame pixels from stacking.
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();

  const scale = Math.max(cssW / iw, cssH / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (cssW - dw) * 0.5, (cssH - dh) * 0.5, dw, dh);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed ${url}`));
    img.src = url;
  });
}

/** Opening dive buffer (1-based) — enough to hand off without hitching the first beat. */
const CRITICAL_FRAME1_END = 160;

function buildFrameIndices(stride: number): number[] {
  const indices: number[] = [];
  for (let i = 0; i < JOURNEY_FRAME_COUNT; i += stride) {
    indices.push(i);
  }
  const last = JOURNEY_FRAME_COUNT - 1;
  if (indices[indices.length - 1] !== last) indices.push(last);
  return indices;
}

async function loadIndexBatch(
  indices: number[],
  images: HTMLImageElement[],
  concurrency: number,
  onProgress: (loaded: number, total: number) => void,
  isActive: () => boolean
): Promise<void> {
  let loaded = 0;
  let cursor = 0;
  const total = indices.length;

  const worker = async () => {
    for (;;) {
      if (!isActive()) return;
      const slot = cursor;
      cursor += 1;
      if (slot >= indices.length) return;
      const i = indices[slot];
      try {
        images[i] = await loadImage(journeyFrameUrl(i + 1));
      } catch (err) {
        console.error('[journey]', err);
      }
      loaded += 1;
      if (isActive()) onProgress(loaded, total);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
}

/**
 * Critical opening frames first (loader handoff), remainder in background.
 * Same canvas — no layout shift as the rest fills in.
 */
async function preloadAll(
  isActive: () => boolean,
  stride: number
): Promise<HTMLImageElement[] | null> {
  const images: HTMLImageElement[] = new Array(JOURNEY_FRAME_COUNT);
  const indices = buildFrameIndices(stride);
  const critical = indices.filter(
    (i) => i === 0 || i + 1 <= CRITICAL_FRAME1_END
  );
  const remainder = indices.filter((i) => !critical.includes(i));
  const concurrency =
    stride > 1 ? LOAD_CONCURRENCY_MOBILE : LOAD_CONCURRENCY_DESKTOP;

  // Progress UI is scroll-driven — preload runs silently in the background.
  await loadIndexBatch(critical, images, concurrency, () => {}, isActive);

  if (!isActive()) return null;
  if (!images[0]?.naturalWidth) {
    console.error('[journey] frame 1 failed to load');
    return null;
  }

  // Remainder does not block the held-opening handoff.
  if (remainder.length) {
    void loadIndexBatch(
      remainder,
      images,
      concurrency,
      () => {
        /* background — loader already dismissed */
      },
      isActive
    );
  }

  return images;
}

/**
 * Preload WebP frames → held opening frame → Lenis/GSAP scrub on first scroll.
 * One rAF loop, one draw per frame index, clearRect before every paint.
 */
export function useJourneyFramePlayback({
  trackRef,
  pinRef,
  canvasRef,
  lenis,
  onDiveUnlock,
  handoffReady = true,
  diveArmed = false,
}: Options): JourneyFramePlaybackResult {
  const [framesReady, setFramesReady] = useState(false);
  const [firstPaintDone, setFirstPaintDone] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [typographyVisible, setTypographyVisible] = useState(false);
  const [openingHeld, setOpeningHeld] = useState(true);

  const lenisRef = useRef(lenis);
  const onDiveUnlockRef = useRef(onDiveUnlock);
  const handoffReadyRef = useRef(handoffReady);
  const diveArmedRef = useRef(diveArmed);
  const framesReadyRef = useRef(false);
  const loadProgressRef = useRef(0);
  const endScrollCaptureRef = useRef<(() => void) | null>(null);
  lenisRef.current = lenis;
  onDiveUnlockRef.current = onDiveUnlock;
  handoffReadyRef.current = handoffReady;
  diveArmedRef.current = diveArmed;
  framesReadyRef.current = framesReady;
  loadProgressRef.current = loadProgress;

  // Scroll intent drives loader % (assets preload separately).
  useEffect(() => {
    let scrollPages = 0;
    let touchY: number | null = null;
    let finished = false;
    let removeScroll: (() => void) | null = null;

    const teardown = () => {
      removeScroll?.();
      removeScroll = null;
    };

    const publish = (pages: number) => {
      const raw = Math.min(1, Math.max(0, pages) * SCROLL_LOAD_PERCENT_PER_PAGE);
      // Hold just under 100% until critical frames are ready.
      const next = !framesReadyRef.current && raw >= 1 ? 0.99 : raw;
      loadProgressRef.current = next;
      setLoadProgress(next);
      // Keep capturing (preventDefault) until published progress is truly 1.
      if (next >= 1) {
        finished = true;
        teardown();
      }
    };

    endScrollCaptureRef.current = () => {
      finished = true;
      teardown();
    };

    // Ignore trackpad noise / residual gestures right after mount (avoids jumping to ~2%).
    const armedAt = performance.now() + 450;

    const addDelta = (deltaY: number) => {
      if (finished || deltaY <= 0) return;
      if (performance.now() < armedAt) return;
      if (deltaY < 8) return;
      const vh = Math.max(1, window.innerHeight);
      scrollPages += deltaY / vh;
      // Intent-only: keep real scroll pinned so the temple never opens mid-film.
      pinScrollToOpening(lenisRef.current);
      publish(scrollPages);
    };

    const onWheel = (e: WheelEvent) => {
      if (finished) return;
      e.preventDefault();
      addDelta(e.deltaY);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (finished) return;
      touchY = e.touches[0]?.clientY ?? null;
      pinScrollToOpening(lenisRef.current);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (finished || touchY == null) return;
      const y = e.touches[0]?.clientY;
      if (y == null) return;
      e.preventDefault();
      const dy = touchY - y;
      touchY = y;
      addDelta(dy);
    };

    const onTouchEnd = () => {
      touchY = null;
    };

    const onKey = (e: KeyboardEvent) => {
      if (finished) return;
      if (
        e.key === 'ArrowDown' ||
        e.key === 'PageDown' ||
        e.key === ' '
      ) {
        e.preventDefault();
        addDelta(Math.max(1, window.innerHeight) * 0.35);
      }
    };

    const onClick = () => {
      if (finished) return;
      // Reduced-motion / accessibility: a tap completes the scroll load.
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        scrollPages = 1 / SCROLL_LOAD_PERCENT_PER_PAGE;
        publish(scrollPages);
      }
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      window.addEventListener('click', onClick);
      window.addEventListener('keydown', onKey);
      const timer = window.setTimeout(() => {
        scrollPages = 1 / SCROLL_LOAD_PERCENT_PER_PAGE;
        publish(scrollPages);
      }, 1200);
      removeScroll = () => {
        window.removeEventListener('click', onClick);
        window.removeEventListener('keydown', onKey);
        clearTimeout(timer);
      };
    } else {
      window.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('touchstart', onTouchStart, { passive: true });
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd, { passive: true });
      window.addEventListener('keydown', onKey);
      removeScroll = () => {
        window.removeEventListener('wheel', onWheel);
        window.removeEventListener('touchstart', onTouchStart);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('keydown', onKey);
      };
    }

    return () => {
      finished = true;
      endScrollCaptureRef.current = null;
      teardown();
    };
  }, []);

  // Once frames catch up after scroll already hit 100%, bump 0.99 → 1.
  useEffect(() => {
    if (!framesReady) return;
    setLoadProgress((prev) => {
      if (prev < 0.99) return prev;
      loadProgressRef.current = 1;
      endScrollCaptureRef.current?.();
      return 1;
    });
  }, [framesReady]);

  useEffect(() => {
    let active = true;
    let images: HTMLImageElement[] = [];
    let timeline: ReturnType<typeof createJourneyFrameTimeline> | null = null;
    let drawRafId = 0;
    let waitRafId = 0;
    let removeResize: (() => void) | null = null;
    let removeUnlock: (() => void) | null = null;
    let hasPainted = false;
    let diveUnlocked = false;
    let ctx: CanvasRenderingContext2D | null = null;
    const frameStride = resolveFrameStride();

    const prevOverflow = document.documentElement.style.overflow;
    const verifyModeBoot =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('verify');
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    pinScrollToOpening(lenisRef.current);
    if (!verifyModeBoot) {
      document.documentElement.style.overflow = 'hidden';
      lenisRef.current?.stop();
    }

    const syncCanvasSize = (canvas: HTMLCanvasElement) => {
      const dpr = resolveMaxDpr();
      // clientWidth/Height ignore CSS transforms — critical during Jesko scale
      // (getBoundingClientRect would resize the buffer to the blown-up stage).
      const cssW = Math.max(1, canvas.clientWidth || pinRef.current?.clientWidth || 0);
      const cssH = Math.max(
        1,
        canvas.clientHeight || pinRef.current?.clientHeight || 0
      );
      if (cssW < 2 || cssH < 2) return null;

      const w = Math.max(1, Math.round(cssW * dpr));
      const h = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        ctx = null;
      }
      return { cssW, cssH, dpr };
    };

    const paintFrame = (frame1: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return false;
      const drawFrame1 = nearestLoadedFrame1(frame1, images, frameStride);
      const img = images[drawFrame1 - 1];
      if (!img?.naturalWidth) return false;

      const size = syncCanvasSize(canvas);
      if (!size) return false;

      if (!ctx) {
        ctx = canvas.getContext('2d', { alpha: false });
      }
      if (!ctx) return false;

      ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
      drawCover(ctx, img, size.cssW, size.cssH);

      if (!hasPainted) {
        hasPainted = true;
        setFirstPaintDone(true);
      }
      return true;
    };

    const unlockDive = (scrollNudge = 0) => {
      const verifyMode =
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).has('verify');
      // Stay locked until loader is gone and scroll-load is complete.
      if (
        !active ||
        diveUnlocked ||
        !handoffReadyRef.current ||
        !diveArmedRef.current ||
        (!verifyMode && loadProgressRef.current < 1)
      ) {
        return;
      }
      diveUnlocked = true;
      setOpeningHeld(false);
      document.documentElement.style.overflow = prevOverflow;
      const smooth = lenisRef.current;
      // Always leave the held opening from frame 0 — never resume a leaked /
      // restored scrollY (that jumped fresh visits into the Studio hold).
      pinScrollToOpening(smooth);
      smooth?.start();
      // Same gesture that unlocks should begin the dive from the forecourt.
      if (scrollNudge !== 0) {
        const target = Math.max(0, scrollNudge);
        requestAnimationFrame(() => {
          pinScrollToOpening(smooth);
          smooth?.scrollTo(target, { immediate: false });
          window.scrollTo(0, target);
        });
      }
      onDiveUnlockRef.current?.();
      removeUnlock?.();
      removeUnlock = null;
    };

    const armUnlockListeners = () => {
      const onWheel = (e: WheelEvent) => {
        if (Math.abs(e.deltaY) < 2 && Math.abs(e.deltaX) < 2) return;
        unlockDive(e.deltaY);
      };
      const onTouch = () => unlockDive(48);
      const onKey = (e: KeyboardEvent) => {
        if (
          e.key === 'ArrowDown' ||
          e.key === 'PageDown' ||
          e.key === ' '
        ) {
          unlockDive(120);
        } else if (
          e.key === 'ArrowUp' ||
          e.key === 'PageUp' ||
          e.key === 'Home' ||
          e.key === 'End'
        ) {
          unlockDive();
        }
      };

      window.addEventListener('wheel', onWheel, { passive: true });
      window.addEventListener('touchstart', onTouch, { passive: true });
      window.addEventListener('keydown', onKey);
      removeUnlock = () => {
        window.removeEventListener('wheel', onWheel);
        window.removeEventListener('touchstart', onTouch);
        window.removeEventListener('keydown', onKey);
      };
    };

    const startPlayback = () => {
      if (!active) return;
      const track = trackRef.current;
      const pin = pinRef.current;
      const canvas = canvasRef.current;
      if (!track || !pin || !canvas) {
        waitRafId = requestAnimationFrame(startPlayback);
        return;
      }

      pinScrollToOpening(lenisRef.current);
      paintFrame(1);
      publishJourneyFrame(frame1ToPathIndex(1));

      timeline?.kill();
      timeline = createJourneyFrameTimeline({ track, pin });
      requestAnimationFrame(() => {
        pinScrollToOpening(lenisRef.current);
        ScrollTrigger.refresh();
        paintFrame(1);
      });

      const verifyMode =
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).has('verify');
      if (verifyMode) {
        // Automations / recordings need free Lenis scroll — skip hold lock.
        document.documentElement.style.overflow = prevOverflow;
        lenisRef.current?.start();
        setOpeningHeld(false);
        diveUnlocked = true;
      } else {
        lenisRef.current?.stop();
        document.documentElement.style.overflow = 'hidden';
        pinScrollToOpening(lenisRef.current);
        armUnlockListeners();
      }

      let displayedFilmProgress = 0;
      let lastDrawnFrame1 = -1;
      let lastTypographyVisible = false;
      let lastFrameTime = 0;
      const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

      const onResize = () => {
        lastDrawnFrame1 = -1;
        paintFrame(templeFilmProgressToFrame1(displayedFilmProgress));
      };
      window.addEventListener('resize', onResize);
      removeResize = () => window.removeEventListener('resize', onResize);

      const loop = (timestamp: number) => {
        if (!active || !timeline) return;

        const dtSeconds =
          lastFrameTime > 0 ? (timestamp - lastFrameTime) / 1000 : 0;
        lastFrameTime = timestamp;
        ScrollTrigger.update();

        const scrollProgress = diveUnlocked
          ? timeline.getScrollProgress()
          : 0;
        const visible = scrollProgress >= HERO_TYPOGRAPHY_SCROLL_THRESHOLD;
        if (visible !== lastTypographyVisible) {
          lastTypographyVisible = visible;
          setTypographyVisible(visible);
        }

        let targetFilm = diveUnlocked ? timeline.filmState.filmProgress : 0;

        // Gate: pin playhead so frames hold (no snap-jump when reveal completes).
        const cap1 = getInscriptionFrameCap1();
        if (cap1 != null) {
          const capProgress = templeFrame1ToScrollProgress(cap1);
          if (targetFilm > capProgress) targetFilm = capProgress;
        }

        displayedFilmProgress = !diveUnlocked
          ? 0
          : reducedMotion
            ? targetFilm
            : lerpFilmProgress(
                displayedFilmProgress,
                targetFilm,
                dtSeconds,
                HERO_PLAYHEAD_CHASE_SPEED
              );

        if (cap1 != null) {
          const capProgress = templeFrame1ToScrollProgress(cap1);
          if (displayedFilmProgress > capProgress) {
            displayedFilmProgress = capProgress;
          }
        }

        // Plateau map (true holds) + Work/Studio cinematic remap.
        let frame1 = templeFilmProgressToFrame1(displayedFilmProgress);
        if (cap1 != null && frame1 > cap1) frame1 = cap1;
        const pathIndex0 = frame1ToPathIndex(frame1);
        publishJourneyFrame(pathIndex0);

        const dolly = reducedMotion ? 1 : journeyDollyScale(pathIndex0);
        const dollyCss = dolly === 1 ? '' : `scale(${dolly})`;
        if (canvas.style.transform !== dollyCss) {
          canvas.style.transform = dollyCss;
          canvas.style.transformOrigin = dolly === 1 ? '' : '50% 50%';
        }

        const dpr = resolveMaxDpr();
        const bufferBloated =
          canvas.width > canvas.clientWidth * dpr + 2 ||
          canvas.height > canvas.clientHeight * dpr + 2;

        if (frame1 !== lastDrawnFrame1 || bufferBloated) {
          if (paintFrame(frame1)) lastDrawnFrame1 = frame1;
        }

        drawRafId = requestAnimationFrame(loop);
      };

      drawRafId = requestAnimationFrame(loop);
    };

    const releaseHoldEmergency = () => {
      if (!active || diveUnlocked) return;
      diveUnlocked = true;
      setOpeningHeld(false);
      setFirstPaintDone(true);
      document.documentElement.style.overflow = prevOverflow;
      pinScrollToOpening(lenisRef.current);
      lenisRef.current?.start();
      removeUnlock?.();
      removeUnlock = null;
      onDiveUnlockRef.current?.();
    };

    const bootId = window.setTimeout(() => {
      void (async () => {
        const loaded = await preloadAll(() => active, frameStride);
        if (!active) return;
        if (!loaded) {
          // Frames failed — never leave the document frozen on overflow:hidden.
          console.error('[journey] preload failed; releasing opening hold');
          framesReadyRef.current = true;
          setFramesReady(true);
          loadProgressRef.current = 1;
          setLoadProgress(1);
          endScrollCaptureRef.current?.();
          releaseHoldEmergency();
          return;
        }
        images = loaded;
        framesReadyRef.current = true;
        setFramesReady(true);
        startPlayback();
      })();
    }, 50);

    // Absolute failsafe: hard refresh / asset hang must not freeze the page.
    const stuckTimer = window.setTimeout(() => {
      if (!active || diveUnlocked) return;
      console.warn('[journey] opening hold timed out; forcing scroll unlock');
      framesReadyRef.current = true;
      setFramesReady(true);
      loadProgressRef.current = 1;
      setLoadProgress(1);
      endScrollCaptureRef.current?.();
      releaseHoldEmergency();
    }, 12000);

    return () => {
      active = false;
      clearTimeout(bootId);
      clearTimeout(stuckTimer);
      cancelAnimationFrame(waitRafId);
      cancelAnimationFrame(drawRafId);
      timeline?.kill();
      timeline = null;
      removeResize?.();
      removeUnlock?.();
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.transform = '';
        canvas.style.transformOrigin = '';
      }
      document.documentElement.style.overflow = prevOverflow;
      lenisRef.current?.start();
      ctx = null;
    };
  }, [trackRef, pinRef, canvasRef]);

  // Keep Lenis stopped while held if it mounts after the boot effect.
  useEffect(() => {
    if (!openingHeld) return;
    lenis?.stop();
  }, [lenis, openingHeld]);

  return {
    framesReady,
    firstPaintDone,
    loadProgress,
    typographyVisible,
    openingHeld,
  };
}
