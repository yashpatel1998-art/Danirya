'use client';

import { useLayoutEffect, useState } from 'react';
import {
  HERO_TOTAL_FRAMES,
  heroFrameUrl,
  progressToFrameIndex,
} from '@/lib/heroPlayer';

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function paintCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number
): boolean {
  if (!img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) {
    return false;
  }

  const ia = img.naturalWidth / img.naturalHeight;
  const va = w / h;
  let dw: number;
  let dh: number;
  let dx: number;
  let dy: number;

  if (ia > va) {
    dh = h;
    dw = h * ia;
    dx = (w - dw) / 2;
    dy = 0;
  } else {
    dw = w;
    dh = w / ia;
    dx = 0;
    dy = (h - dh) / 2;
  }

  ctx.drawImage(img, dx, dy, dw, dh);
  return true;
}

function loadImage(index: number, signal: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('aborted'));
      return;
    }

    const img = new Image();
    img.decoding = 'async';

    const finish = (fn: () => void) => {
      signal.removeEventListener('abort', onAbort);
      fn();
    };

    const onAbort = () => {
      img.onload = null;
      img.onerror = null;
      img.src = '';
      reject(new Error('aborted'));
    };

    signal.addEventListener('abort', onAbort);

    img.onload = () => {
      if (!img.complete || img.naturalWidth <= 0) {
        finish(() => reject(new Error(`Frame ${index} decoded empty`)));
        return;
      }
      finish(() => resolve(img));
    };

    img.onerror = () => {
      finish(() => reject(new Error(`Frame ${index} missing`)));
    };

    img.src = heroFrameUrl(index);
  });
}

async function loadAllFrames(
  signal: AbortSignal,
  onFrame: (index: number, img: HTMLImageElement) => void
): Promise<number> {
  const first = await loadImage(1, signal);
  onFrame(0, first);

  const rest = Array.from({ length: HERO_TOTAL_FRAMES - 1 }, (_, i) => i + 2);
  const batchSize = 24;
  let ok = 1;

  for (let i = 0; i < rest.length; i += batchSize) {
    if (signal.aborted) break;

    const batch = rest.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((frameNum) => loadImage(frameNum, signal))
    );

    results.forEach((result, j) => {
      const frameNum = batch[j];
      if (result.status === 'fulfilled') {
        onFrame(frameNum - 1, result.value);
        ok += 1;
      } else if (result.reason?.message !== 'aborted') {
        console.error('[HeroPlayer] missing frame', frameNum, result.reason);
      }
    });
  }

  return ok;
}

export function useHeroPlayer(
  trackRef: React.RefObject<HTMLElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
  const [frameOneReady, setFrameOneReady] = useState(false);
  const [allFramesReady, setAllFramesReady] = useState(false);

  useLayoutEffect(() => {
    let generation = 0;
    let waitRafId = 0;
    let loopRafId = 0;
    let abortController: AbortController | null = null;
    let teardown: (() => void) | null = null;

    const init = () => {
      const track = trackRef.current;
      const canvas = canvasRef.current;
      if (!track || !canvas) {
        waitRafId = requestAnimationFrame(init);
        return;
      }

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      generation += 1;
      const gen = generation;
      abortController?.abort();
      abortController = new AbortController();
      const { signal } = abortController;

      const frames: (HTMLImageElement | null)[] = Array.from(
        { length: HERO_TOTAL_FRAMES },
        () => null
      );

      let progress = 0;
      let lastGoodIndex = 0;

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (w <= 0 || h <= 0) return false;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return true;
      };

      const draw = () => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (w <= 0 || h <= 0) return;

        const index = progressToFrameIndex(progress);
        const img = frames[index];

        if (img && paintCover(ctx, img, w, h)) {
          lastGoodIndex = index;
          return;
        }

        const fallback = frames[lastGoodIndex];
        if (fallback) {
          paintCover(ctx, fallback, w, h);
        }
      };

      const onScroll = () => {
        const scrollable = track.offsetHeight - window.innerHeight;
        if (scrollable <= 0) {
          progress = 0;
          return;
        }
        progress = clamp(-track.getBoundingClientRect().top / scrollable, 0, 1);
      };

      const loop = () => {
        if (gen !== generation) return;
        draw();
        loopRafId = requestAnimationFrame(loop);
      };

      const bootstrap = async () => {
        try {
          const ok = await loadAllFrames(signal, (index, img) => {
            frames[index] = img;
            if (index === 0 && gen === generation && !signal.aborted) {
              setFrameOneReady(true);
              if (resize()) draw();
            }
          });

          if (gen !== generation || signal.aborted) return;

          if (process.env.NODE_ENV === 'development') {
            console.log('[HeroPlayer] frames verified', ok, '/', HERO_TOTAL_FRAMES);
          }

          setAllFramesReady(ok === HERO_TOTAL_FRAMES);
        } catch (err) {
          if (signal.aborted) return;
          console.error('[HeroPlayer] bootstrap failed', err);
        }
      };

      resize();
      onScroll();
      loopRafId = requestAnimationFrame(loop);

      const ro = new ResizeObserver(() => {
        if (resize()) draw();
      });
      ro.observe(canvas);

      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });

      bootstrap();

      teardown = () => {
        cancelAnimationFrame(loopRafId);
        ro.disconnect();
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      };
    };

    init();

    return () => {
      generation += 1;
      abortController?.abort();
      cancelAnimationFrame(waitRafId);
      cancelAnimationFrame(loopRafId);
      teardown?.();
    };
  }, [trackRef, canvasRef]);

  return { frameOneReady, allFramesReady };
}
