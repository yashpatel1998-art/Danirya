'use client';

import { useEffect, useRef, useState } from 'react';
import type { LabSnapTypologyMode } from '@/components/lab/snap/LabSnapTypology';
import {
  createSnapController,
  type SnapPhase,
} from '@/lib/lab/snap/createSnapController';
import { resolveLabSnapStride } from '@/lib/lab/snap/stride';
import {
  LAB_SNAP_POINTS,
  type LabSnapPoint,
} from '@/lib/lab/snap/stubPath';
import { frame1ToPathIndex } from '@/lib/journey/frames';
import { publishJourneyFrame } from '@/lib/journey/frameBus';
import {
  createSlidingFrameCache,
  resolveSlidingWindowConfig,
  type SlidingFrameCache,
} from '@/lib/journey/slidingFrameCache';
import type Lenis from 'lenis';

/** 1 viewport of scroll intent ≈ 15% loader progress (~6.67 pages → 100%). */
const SCROLL_LOAD_PERCENT_PER_PAGE = 0.15;
const IDLE_WHEEL_THRESHOLD = 28;

function pinScrollToOpening(lenis: Lenis | null | undefined) {
  if (typeof window === 'undefined') return;
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  lenis?.scrollTo(0, { immediate: true });
}

function resolveFrameStride(): number {
  return resolveLabSnapStride();
}

function resolveMaxDpr(): number {
  if (typeof window === 'undefined') return 2;
  const narrow = window.matchMedia('(max-width: 768px)').matches;
  return narrow ? 1 : Math.min(window.devicePixelRatio || 1, 2);
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource & {
    naturalWidth?: number;
    naturalHeight?: number;
    width: number;
    height: number;
  },
  cssW: number,
  cssH: number
): void {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih || !cssW || !cssH) return;

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

export type HeroSnapPlaybackResult = {
  framesReady: boolean;
  firstPaintDone: boolean;
  loadProgress: number;
  /** True until snap controller arms after loader / dive unlock. */
  openingHeld: boolean;
  phase: SnapPhase;
  pointIndex: number;
  frame1: number;
  typologyPoint: LabSnapPoint | null;
  typologyMode: LabSnapTypologyMode;
  onTypologyEntranceComplete: () => void;
  onTypologyExitComplete: () => void;
};

type Options = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  pinRef: React.RefObject<HTMLElement | null>;
  lenis: Lenis | null;
  onDiveUnlock?: () => void;
  handoffReady?: boolean;
  diveArmed?: boolean;
};

/**
 * Production Hero journey — Phase B 1200-frame snap controller.
 * Loader scroll-intent + sliding cache, then wheel/touch `advance()` like /lab/snap.
 * Replaces continuous Lenis/GSAP scrub as the primary driver on `/`.
 */
export function useHeroSnapPlayback({
  canvasRef,
  pinRef,
  lenis,
  onDiveUnlock,
  handoffReady = true,
  diveArmed = false,
}: Options): HeroSnapPlaybackResult {
  const [framesReady, setFramesReady] = useState(false);
  const [firstPaintDone, setFirstPaintDone] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [openingHeld, setOpeningHeld] = useState(true);
  const [phase, setPhase] = useState<SnapPhase>('idle');
  const [pointIndex, setPointIndex] = useState(0);
  const [frame1, setFrame1] = useState(LAB_SNAP_POINTS[0]?.frame ?? 1);
  const [typologyPoint, setTypologyPoint] = useState<LabSnapPoint | null>(null);
  const [typologyMode, setTypologyMode] =
    useState<LabSnapTypologyMode>('enter');

  const lenisRef = useRef(lenis);
  const onDiveUnlockRef = useRef(onDiveUnlock);
  const handoffReadyRef = useRef(handoffReady);
  const diveArmedRef = useRef(diveArmed);
  const framesReadyRef = useRef(false);
  const loadProgressRef = useRef(0);
  const endScrollCaptureRef = useRef<(() => void) | null>(null);
  const unlockHoldRef = useRef<(() => void) | null>(null);
  const exitingStopIdRef = useRef<string | null>(null);
  const paintFrameRef = useRef<(f: number) => boolean>(() => false);
  const scheduleWindowRef = useRef<(f: number) => void>(() => {});

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
      const next = !framesReadyRef.current && raw >= 1 ? 0.99 : raw;
      loadProgressRef.current = next;
      setLoadProgress(next);
      if (next >= 1) {
        finished = true;
        teardown();
      }
    };

    endScrollCaptureRef.current = () => {
      finished = true;
      teardown();
    };

    const armedAt = performance.now() + 450;

    const addDelta = (deltaY: number) => {
      if (finished || deltaY <= 0) return;
      if (performance.now() < armedAt) return;
      if (deltaY < 8) return;
      const vh = Math.max(1, window.innerHeight);
      scrollPages += deltaY / vh;
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

  useEffect(() => {
    if (!framesReady) return;
    setLoadProgress((prev) => {
      if (prev < 0.99) return prev;
      loadProgressRef.current = 1;
      endScrollCaptureRef.current?.();
      return 1;
    });
  }, [framesReady]);

  // Frame cache + canvas paint loop (driven by snap frame1).
  useEffect(() => {
    let active = true;
    let cache: SlidingFrameCache | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    let windowEnsureGen = 0;
    let hasPainted = false;
    let removeResize: (() => void) | null = null;
    const frameStride = resolveFrameStride();
    const windowCfg = resolveSlidingWindowConfig(frameStride);
    const openingFrame1 = LAB_SNAP_POINTS[0]?.frame ?? 1;

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
      const cssW = Math.max(
        1,
        canvas.clientWidth || pinRef.current?.clientWidth || 0
      );
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

    const paintFrame = (targetFrame1: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !cache) return false;
      const looked = cache.lookup(targetFrame1);
      const img = looked.source;
      const iw = img ? img.naturalWidth || img.width : 0;
      if (!img || !iw) return false;

      const size = syncCanvasSize(canvas);
      if (!size) return false;

      if (!ctx) {
        ctx = canvas.getContext('2d', { alpha: false });
      }
      if (!ctx) return false;

      ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
      drawCover(ctx, img, size.cssW, size.cssH);

      if (typeof window !== 'undefined') {
        const w = window as Window & {
          __journeyLastPaint?: {
            req: number;
            drawn: number | null;
            kind: string;
          };
        };
        w.__journeyLastPaint = {
          req: targetFrame1,
          drawn: looked.drawnFrame1,
          kind: looked.kind,
        };
      }

      if (!hasPainted) {
        hasPainted = true;
        setFirstPaintDone(true);
      }
      return true;
    };

    const scheduleWindow = (centerFrame1: number) => {
      if (!cache || !active) return;
      const gen = ++windowEnsureGen;
      void cache
        .ensureWindow(centerFrame1, () => active && gen === windowEnsureGen)
        .then(() => {
          if (!active || gen !== windowEnsureGen || !cache) return;
          if (typeof window !== 'undefined') {
            const w = window as Window & {
              __journeyFrameResident?: number;
              __journeyFrameResidentMB?: number;
              __journeyCacheStats?: ReturnType<SlidingFrameCache['getStats']>;
              __journeyCacheResetStats?: () => void;
            };
            w.__journeyFrameResident = cache.residentCount();
            w.__journeyFrameResidentMB =
              Math.round((cache.residentBytesEstimate() / (1024 * 1024)) * 10) /
              10;
            w.__journeyCacheStats = cache.getStats();
            w.__journeyCacheResetStats = () => cache?.resetStats();
          }
        });
    };

    paintFrameRef.current = paintFrame;
    scheduleWindowRef.current = scheduleWindow;

    const onResize = () => {
      paintFrame(frame1);
    };
    window.addEventListener('resize', onResize);
    removeResize = () => window.removeEventListener('resize', onResize);

    const bootId = window.setTimeout(() => {
      void (async () => {
        cache = createSlidingFrameCache(windowCfg);
        // Warm around first snap freeze (lying Hanuman), not frame 1 title island.
        await cache.ensureWindow(openingFrame1, () => active);
        if (!active) return;
        const warmed = cache.lookup(openingFrame1).source;
        if (!warmed) {
          console.error('[hero-snap] preload failed; releasing opening hold');
          framesReadyRef.current = true;
          setFramesReady(true);
          loadProgressRef.current = 1;
          setLoadProgress(1);
          endScrollCaptureRef.current?.();
          return;
        }
        paintFrame(openingFrame1);
        publishJourneyFrame(frame1ToPathIndex(openingFrame1));
        framesReadyRef.current = true;
        setFramesReady(true);
      })();
    }, 50);

    const stuckTimer = window.setTimeout(() => {
      if (!active) return;
      console.warn('[hero-snap] opening warm timed out; unblocking');
      framesReadyRef.current = true;
      setFramesReady(true);
      loadProgressRef.current = 1;
      setLoadProgress(1);
      endScrollCaptureRef.current?.();
    }, 12000);

    return () => {
      active = false;
      clearTimeout(bootId);
      clearTimeout(stuckTimer);
      removeResize?.();
      cache?.dispose();
      cache = null;
      paintFrameRef.current = () => false;
      scheduleWindowRef.current = () => {};
      document.documentElement.style.overflow = prevOverflow;
      lenisRef.current?.start();
      ctx = null;
      if (typeof window !== 'undefined') {
        const w = window as Window & {
          __journeyFrameResident?: number;
          __journeyFrameResidentMB?: number;
        };
        delete w.__journeyFrameResident;
        delete w.__journeyFrameResidentMB;
      }
    };
    // frame1 only used for resize repaint seed; paint driven by snap effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once cache
  }, [canvasRef, pinRef]);

  // Latch once ready so loadProgress/handoff flaps don't remount the controller.
  const [snapArmed, setSnapArmed] = useState(false);
  useEffect(() => {
    const verifyMode =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('verify');
    const canArm =
      framesReady &&
      handoffReady &&
      diveArmed &&
      (verifyMode || loadProgress >= 1);
    if (canArm) setSnapArmed(true);
  }, [framesReady, handoffReady, diveArmed, loadProgress]);

  // Snap controller — arms after loader dive unlock (not continuous scrub).
  useEffect(() => {
    if (!snapArmed) return;

    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    lenis?.stop();

    setOpeningHeld(false);
    onDiveUnlockRef.current?.();

    type HeroSnapDebug = {
      phase: SnapPhase;
      pointIndex: number;
      frame1: number;
      stopId: string | null;
      kind: LabSnapPoint['kind'] | null;
      statueId: string | null;
      masterFrame: number | null;
      typologyMode: LabSnapTypologyMode | null;
      snapArmed: boolean;
      openingHeld: boolean;
    };

    const publishDebug = (
      patch: Partial<HeroSnapDebug> &
        Pick<HeroSnapDebug, 'phase' | 'pointIndex' | 'frame1'>
    ) => {
      if (typeof window === 'undefined') return;
      const point = LAB_SNAP_POINTS[patch.pointIndex];
      const w = window as Window & { __HERO_SNAP_DEBUG__?: HeroSnapDebug };
      w.__HERO_SNAP_DEBUG__ = {
        stopId: point?.id ?? null,
        kind: point?.kind ?? null,
        statueId: point?.statueId ?? null,
        masterFrame: point?.masterFrame ?? null,
        typologyMode: patch.typologyMode ?? null,
        snapArmed: true,
        openingHeld: false,
        ...patch,
      };
    };

    const resolvedStride = resolveLabSnapStride();
    let livePhase: SnapPhase = 'idle';
    let livePointIndex = 0;
    let liveFrame1 = LAB_SNAP_POINTS[0]?.frame ?? 1;

    const controller = createSnapController(resolvedStride, {
      onFrame: (f) => {
        liveFrame1 = f;
        setFrame1(f);
        publishJourneyFrame(frame1ToPathIndex(f));
        scheduleWindowRef.current(f);
        paintFrameRef.current(f);
        publishDebug({
          phase: livePhase,
          pointIndex: livePointIndex,
          frame1: f,
        });
      },
      onPhase: (p, idx) => {
        livePhase = p;
        livePointIndex = idx;
        setPhase(p);
        setPointIndex(idx);
        publishDebug({
          phase: p,
          pointIndex: idx,
          frame1: liveFrame1,
          typologyMode: p === 'traveling' ? 'exit' : null,
        });
        if (p === 'traveling') {
          setTypologyPoint((pt) => {
            exitingStopIdRef.current = pt?.id ?? null;
            return pt;
          });
          setTypologyMode((mode) => (mode === 'exit' ? mode : 'exit'));
          unlockHoldRef.current = null;
        }
      },
      onHoldGate: (point, complete) => {
        exitingStopIdRef.current = null;
        unlockHoldRef.current = complete;
        setTypologyPoint(point);
        setTypologyMode('enter');
        publishDebug({
          phase: 'holdGate',
          pointIndex: livePointIndex,
          frame1: liveFrame1,
          typologyMode: 'enter',
          stopId: point.id,
          kind: point.kind,
          statueId: point.statueId,
          masterFrame: point.masterFrame,
        });
      },
    });

    let touchY: number | null = null;
    let touchAcc = 0;
    let armedAt = performance.now() + 200;

    const tryAdvance = (deltaY: number) => {
      if (performance.now() < armedAt) return;
      if (deltaY < IDLE_WHEEL_THRESHOLD) return;
      controller.advance();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      tryAdvance(e.deltaY);
    };

    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? null;
      touchAcc = 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touchY == null) return;
      const y = e.touches[0]?.clientY;
      if (y == null) return;
      e.preventDefault();
      e.stopPropagation();
      const dy = touchY - y;
      touchY = y;
      touchAcc += dy;
      if (touchAcc >= IDLE_WHEEL_THRESHOLD) {
        touchAcc = 0;
        tryAdvance(IDLE_WHEEL_THRESHOLD);
      }
    };

    const onTouchEnd = () => {
      touchY = null;
      touchAcc = 0;
    };

    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === 'ArrowDown' ||
        e.key === 'PageDown' ||
        e.key === ' '
      ) {
        e.preventDefault();
        tryAdvance(120);
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKey);

    // Seed paint + bus from controller's opening freeze.
    const seed = controller.getFrame1();
    setFrame1(seed);
    publishJourneyFrame(frame1ToPathIndex(seed));
    scheduleWindowRef.current(seed);
    paintFrameRef.current(seed);
    publishDebug({
      phase: controller.getPhase(),
      pointIndex: controller.getPointIndex(),
      frame1: seed,
      typologyMode: 'enter',
    });

    // Expose hold → typo hold transitions for Playwright (no HUD on Hero).
    const w = window as Window & {
      __HERO_SNAP_DEBUG__?: HeroSnapDebug;
      __HERO_SNAP_SET_TYPO__?: (mode: LabSnapTypologyMode) => void;
    };
    w.__HERO_SNAP_SET_TYPO__ = (mode) => {
      const d = w.__HERO_SNAP_DEBUG__;
      if (!d) return;
      w.__HERO_SNAP_DEBUG__ = { ...d, typologyMode: mode };
    };

    return () => {
      controller.destroy();
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = prevOverflow;
      lenis?.start();
      unlockHoldRef.current = null;
      delete w.__HERO_SNAP_DEBUG__;
      delete w.__HERO_SNAP_SET_TYPO__;
    };
  }, [snapArmed, lenis]);

  // Keep Lenis stopped while hero snap owns input.
  useEffect(() => {
    if (!lenis) return;
    if (openingHeld || !diveArmed) {
      lenis.stop();
      return;
    }
    lenis.stop();
  }, [lenis, openingHeld, diveArmed]);

  return {
    framesReady,
    firstPaintDone,
    loadProgress,
    openingHeld,
    phase,
    pointIndex,
    frame1,
    typologyPoint,
    typologyMode,
    onTypologyEntranceComplete: () => {
      unlockHoldRef.current?.();
      unlockHoldRef.current = null;
      setTypologyMode('hold');
      if (typeof window !== 'undefined') {
        const w = window as Window & {
          __HERO_SNAP_SET_TYPO__?: (mode: LabSnapTypologyMode) => void;
        };
        w.__HERO_SNAP_SET_TYPO__?.('hold');
      }
    },
    onTypologyExitComplete: () => {
      const exitingId = exitingStopIdRef.current;
      exitingStopIdRef.current = null;
      setTypologyPoint((pt) => {
        if (exitingId == null) return pt;
        if (pt == null || pt.id !== exitingId) return pt;
        return null;
      });
      setTypologyMode((mode) => (mode === 'exit' ? 'enter' : mode));
    },
  };
}
