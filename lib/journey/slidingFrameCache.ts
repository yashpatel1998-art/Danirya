/**
 * Bounded decoded-frame cache for the temple WebP scrubber.
 *
 * Root cause this replaces: `preloadAll` kept every decoded HTMLImageElement
 * for the full sequence → mobile OOM mid-scroll.
 *
 * Strategy:
 * - Keep only stride-aligned frames inside [center − behind, center + ahead]
 * - Prefer ImageBitmap (explicit `.close()`) over HTMLImageElement
 * - On mobile, decode downscaled (~half linear) so resident MB stays bounded
 *   even under a 1200-frame sequence design budget
 */

import { JOURNEY_FRAME_COUNT, journeyFrameUrl } from '@/lib/journey/frames';

export type SlidingFrameCacheOptions = {
  stride: number;
  /** How many 1-based frames behind the playhead to retain. */
  behind: number;
  /** How many 1-based frames ahead of the playhead to retain / prefetch. */
  ahead: number;
  concurrency: number;
  frameCount?: number;
  /**
   * Decode target width (height follows aspect). Mobile uses ~960 to cut
   * RGBA ~4× vs full 1920 — required for low-end devices at 1200-frame pressure.
   */
  decodeWidth?: number;
};

export type DecodedFrame = CanvasImageSource & {
  naturalWidth?: number;
  naturalHeight?: number;
  width: number;
  height: number;
};

/** Diagnostic counters — probe only; does not affect window / stride / eviction. */
export type SlidingFrameCacheStats = {
  /** Requested frame was resident (stride-aligned exact slot). */
  exactHits: number;
  /** Non-stride request served by nearest stride neighbor (expected under stride>1). */
  strideNeighbors: number;
  /** Served only after scanning beyond ±stride (soft miss / catch-up). */
  farFallbacks: number;
  /** Nothing drawable. */
  hardMisses: number;
  decodeCount: number;
  /** Per-decode wall ms (fetch+createImageBitmap). */
  decodeMs: number[];
  /** Last N paint lookups: requested frame1, drawn index0+1, kind. */
  recentLookups: Array<{
    req: number;
    drawn: number | null;
    kind: 'exact' | 'stride' | 'far' | 'miss';
    t: number;
  }>;
};

export type SlidingFrameCache = {
  ensureWindow: (
    centerFrame1: number,
    isActive?: () => boolean
  ) => Promise<void>;
  warmOpening: (
    endFrame1: number,
    isActive?: () => boolean
  ) => Promise<boolean>;
  getNearest: (frame1: number) => DecodedFrame | undefined;
  /** Probe: classify hit/miss without drawing. */
  lookup: (frame1: number) => {
    source: DecodedFrame | undefined;
    kind: 'exact' | 'stride' | 'far' | 'miss';
    drawnFrame1: number | null;
  };
  residentCount: () => number;
  /** Approx resident RGBA bytes (for memory probes). */
  residentBytesEstimate: () => number;
  getStats: () => SlidingFrameCacheStats;
  resetStats: () => void;
  dispose: () => void;
};

type Slot = {
  source: DecodedFrame;
  bytes: number;
  kind: 'bitmap' | 'image';
};

function releaseSlot(slots: (Slot | undefined)[], index0: number): void {
  const slot = slots[index0];
  if (!slot) return;
  if (slot.kind === 'bitmap' && 'close' in slot.source) {
    try {
      (slot.source as ImageBitmap).close();
    } catch {
      /* already closed */
    }
  } else {
    const img = slot.source as HTMLImageElement;
    img.onload = null;
    img.onerror = null;
    img.src = '';
    img.removeAttribute('src');
  }
  slots[index0] = undefined;
}

function isStrideFrame(index0: number, stride: number, last: number): boolean {
  if (stride <= 1) return true;
  return index0 % stride === 0 || index0 === last;
}

async function decodeFrame(
  url: string,
  decodeWidth: number | undefined
): Promise<{ slot: Slot; decodeMs: number }> {
  const t0 = performance.now();
  const res = await fetch(url, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`Failed ${url} (${res.status})`);
  const blob = await res.blob();

  if (typeof createImageBitmap === 'function') {
    const opts: ImageBitmapOptions =
      decodeWidth && decodeWidth > 0
        ? {
            resizeWidth: decodeWidth,
            resizeQuality: 'medium',
          }
        : {};
    const bmp = await createImageBitmap(blob, opts);
    return {
      slot: {
        source: bmp,
        bytes: bmp.width * bmp.height * 4,
        kind: 'bitmap',
      },
      decodeMs: performance.now() - t0,
    };
  }

  // Fallback (older WebKit): HTMLImageElement — still evicted via src clear.
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.decoding = 'async';
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`Failed ${url}`));
      el.src = objectUrl;
    });
    return {
      slot: {
        source: img,
        bytes:
          (img.naturalWidth || img.width) *
          (img.naturalHeight || img.height) *
          4,
        kind: 'image',
      },
      decodeMs: performance.now() - t0,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Window sizes sized for a ~1200-frame decode budget (Phase B length).
 * Resident count stays O(behind+ahead), not O(sequence length).
 * Mobile also downscales decode so MB stays phone-safe.
 */
export function resolveSlidingWindowConfig(
  stride: number
): SlidingFrameCacheOptions {
  const mobile = stride > 1;
  if (mobile) {
    // stride=2 → ≈ (12+28)/2 + endpoints ≈ 20–22 decoded frames
    // @ 960×540 RGBA ≈ ~40MB resident (vs ~300MB+ at full 1920)
    return {
      stride,
      behind: 12,
      ahead: 28,
      concurrency: 2,
      decodeWidth: 960,
    };
  }
  return {
    stride: 1,
    behind: 36,
    ahead: 72,
    concurrency: 6,
    // Desktop keeps full resolution for the pin stage.
    decodeWidth: undefined,
  };
}

/** Opening warm length — keep small on mobile; sliding window fills the rest. */
export function resolveWarmOpeningEnd(stride: number): number {
  return stride > 1 ? 40 : 120;
}

export function createSlidingFrameCache(
  opts: SlidingFrameCacheOptions
): SlidingFrameCache {
  const frameCount = opts.frameCount ?? JOURNEY_FRAME_COUNT;
  const last = frameCount - 1;
  const slots: (Slot | undefined)[] = new Array(frameCount);
  const inflight = new Map<number, Promise<void>>();
  let disposed = false;
  /** Keep opening buffer resident until playhead advances past it. */
  let protectUntilFrame1 = 0;

  const stats: SlidingFrameCacheStats = {
    exactHits: 0,
    strideNeighbors: 0,
    farFallbacks: 0,
    hardMisses: 0,
    decodeCount: 0,
    decodeMs: [],
    recentLookups: [],
  };

  const recordLookup = (
    req: number,
    drawn: number | null,
    kind: SlidingFrameCacheStats['recentLookups'][number]['kind']
  ) => {
    if (kind === 'exact') stats.exactHits += 1;
    else if (kind === 'stride') stats.strideNeighbors += 1;
    else if (kind === 'far') stats.farFallbacks += 1;
    else stats.hardMisses += 1;
    stats.recentLookups.push({ req, drawn, kind, t: performance.now() });
    if (stats.recentLookups.length > 400) stats.recentLookups.shift();
  };

  const clampFrame1 = (f: number) =>
    Math.max(1, Math.min(frameCount, Math.round(f)));

  const windowRange = (centerFrame1: number) => {
    const c = clampFrame1(centerFrame1);
    return {
      lo: Math.max(1, c - opts.behind),
      hi: Math.min(frameCount, c + opts.ahead),
    };
  };

  const shouldKeep = (index0: number, lo: number, hi: number) => {
    const f1 = index0 + 1;
    if (f1 < lo || f1 > hi) return false;
    return isStrideFrame(index0, opts.stride, last);
  };

  const evictOutside = (lo: number, hi: number) => {
    for (let i = 0; i < frameCount; i += 1) {
      if (!slots[i]) continue;
      if (!shouldKeep(i, lo, hi)) releaseSlot(slots, i);
    }
  };

  const enqueueLoad = (index0: number, isActive: () => boolean) => {
    if (disposed || slots[index0] || inflight.has(index0)) {
      return inflight.get(index0);
    }
    const p = (async () => {
      try {
        if (!isActive() || disposed) return;
        const { slot, decodeMs } = await decodeFrame(
          journeyFrameUrl(index0 + 1),
          opts.decodeWidth
        );
        stats.decodeCount += 1;
        stats.decodeMs.push(decodeMs);
        if (stats.decodeMs.length > 200) stats.decodeMs.shift();
        if (!isActive() || disposed) {
          if (slot.kind === 'bitmap' && 'close' in slot.source) {
            (slot.source as ImageBitmap).close();
          }
          return;
        }
        slots[index0] = slot;
      } catch (err) {
        console.error('[journey-cache]', err);
      } finally {
        inflight.delete(index0);
      }
    })();
    inflight.set(index0, p);
    return p;
  };

  const loadNeeded = async (
    needed: number[],
    isActive: () => boolean
  ): Promise<void> => {
    let cursor = 0;
    const worker = async () => {
      for (;;) {
        if (!isActive() || disposed) return;
        const slot = cursor;
        cursor += 1;
        if (slot >= needed.length) return;
        await enqueueLoad(needed[slot], isActive);
      }
    };
    const n = Math.min(opts.concurrency, Math.max(1, needed.length));
    await Promise.all(Array.from({ length: n }, () => worker()));
  };

  const collectNeeded = (lo: number, hi: number, center1: number) => {
    const needed: number[] = [];
    for (let f1 = lo; f1 <= hi; f1 += 1) {
      const i = f1 - 1;
      if (!shouldKeep(i, lo, hi)) continue;
      if (slots[i]) continue;
      if (inflight.has(i)) continue;
      needed.push(i);
    }
    needed.sort(
      (a, b) => Math.abs(a + 1 - center1) - Math.abs(b + 1 - center1)
    );
    return needed;
  };

  const toDrawable = (slot: Slot | undefined): DecodedFrame | undefined => {
    if (!slot) return undefined;
    return slot.source;
  };

  const resolveLookup = (frame1: number) => {
    const f = clampFrame1(frame1);
    const idx = f - 1;
    if (slots[idx]) {
      return {
        source: toDrawable(slots[idx]),
        kind: 'exact' as const,
        drawnFrame1: f,
      };
    }
    if (opts.stride > 1) {
      const base = Math.round(idx / opts.stride) * opts.stride;
      for (let d = 0; d <= opts.stride; d += 1) {
        const a = base - d;
        const b = base + d;
        if (a >= 0 && slots[a]) {
          return {
            source: toDrawable(slots[a]),
            kind: 'stride' as const,
            drawnFrame1: a + 1,
          };
        }
        if (b <= last && slots[b]) {
          return {
            source: toDrawable(slots[b]),
            kind: 'stride' as const,
            drawnFrame1: b + 1,
          };
        }
      }
    }
    for (let d = 1; d < opts.behind + opts.ahead; d += 1) {
      const a = idx - d;
      const b = idx + d;
      if (a >= 0 && slots[a]) {
        return {
          source: toDrawable(slots[a]),
          kind: 'far' as const,
          drawnFrame1: a + 1,
        };
      }
      if (b <= last && slots[b]) {
        return {
          source: toDrawable(slots[b]),
          kind: 'far' as const,
          drawnFrame1: b + 1,
        };
      }
    }
    if (slots[0]) {
      return {
        source: toDrawable(slots[0]),
        kind: 'far' as const,
        drawnFrame1: 1,
      };
    }
    return {
      source: undefined,
      kind: 'miss' as const,
      drawnFrame1: null,
    };
  };

  return {
    async ensureWindow(centerFrame1, isActive = () => true) {
      if (disposed || !isActive()) return;
      const center = clampFrame1(centerFrame1);
      if (protectUntilFrame1 > 0 && center >= protectUntilFrame1) {
        protectUntilFrame1 = 0;
      }
      let { lo, hi } = windowRange(center);
      if (protectUntilFrame1 > 0) {
        lo = Math.min(lo, 1);
        hi = Math.max(hi, protectUntilFrame1);
      }
      evictOutside(lo, hi);
      const needed = collectNeeded(lo, hi, center);
      if (!needed.length) return;
      await loadNeeded(needed, isActive);
      if (isActive() && !disposed) {
        let again = windowRange(center);
        if (protectUntilFrame1 > 0) {
          again = {
            lo: Math.min(again.lo, 1),
            hi: Math.max(again.hi, protectUntilFrame1),
          };
        }
        evictOutside(again.lo, again.hi);
      }
    },

    async warmOpening(endFrame1, isActive = () => true) {
      if (disposed) return false;
      const hi = Math.max(1, Math.min(frameCount, endFrame1));
      protectUntilFrame1 = hi;
      const needed: number[] = [];
      for (let f1 = 1; f1 <= hi; f1 += 1) {
        const i = f1 - 1;
        if (!isStrideFrame(i, opts.stride, last)) continue;
        if (slots[i]) continue;
        needed.push(i);
      }
      needed.sort((a, b) => a - b);
      await loadNeeded(needed, isActive);
      return Boolean(slots[0]);
    },

    lookup(frame1: number) {
      const result = resolveLookup(frame1);
      recordLookup(clampFrame1(frame1), result.drawnFrame1, result.kind);
      return result;
    },

    getNearest(frame1: number) {
      // Prefer lookup() from paint path for classified stats; this stays for callers.
      return resolveLookup(frame1).source;
    },

    residentCount() {
      let n = 0;
      for (let i = 0; i < frameCount; i += 1) {
        if (slots[i]) n += 1;
      }
      return n;
    },

    residentBytesEstimate() {
      let bytes = 0;
      for (let i = 0; i < frameCount; i += 1) {
        const s = slots[i];
        if (s) bytes += s.bytes;
      }
      return bytes;
    },

    getStats() {
      return {
        exactHits: stats.exactHits,
        strideNeighbors: stats.strideNeighbors,
        farFallbacks: stats.farFallbacks,
        hardMisses: stats.hardMisses,
        decodeCount: stats.decodeCount,
        decodeMs: stats.decodeMs.slice(),
        recentLookups: stats.recentLookups.slice(),
      };
    },

    resetStats() {
      stats.exactHits = 0;
      stats.strideNeighbors = 0;
      stats.farFallbacks = 0;
      stats.hardMisses = 0;
      stats.decodeCount = 0;
      stats.decodeMs.length = 0;
      stats.recentLookups.length = 0;
    },

    dispose() {
      disposed = true;
      for (let i = 0; i < frameCount; i += 1) releaseSlot(slots, i);
      inflight.clear();
    },
  };
}
