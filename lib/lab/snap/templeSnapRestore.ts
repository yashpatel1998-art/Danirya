/**
 * Return-position restore for the production temple snap journey (`/`).
 *
 * sessionStorage key `gf:temple-snap` holds the active stop when leaving
 * toward /work|/studio|/apply. On remount, validated restores jumpTo that
 * stop (freeze + typology/lens) without replaying travels 0→N.
 *
 * Clear: automatic after successful restore. Manual: sessionStorage.removeItem('gf:temple-snap')
 * or visit `/?replay` (clears pending restore and boots from stop 0).
 */

import { LAB_SNAP_POINTS } from '@/lib/lab/snap/stubPath';

export const TEMPLE_SNAP_STORAGE_KEY = 'gf:temple-snap';

export type TempleSnapRestoreV1 = {
  v: 1;
  pointIndex: number;
  stopId: string;
  exitHref?: string;
  writtenAt: number;
};

type LiveSnap = {
  pointIndex: number;
  stopId: string;
};

/** Module bus — Hero publishes; RouteTransition / CTAs capture on leave. */
let liveSnap: LiveSnap | null = null;

/**
 * Boot latch — survives React Strict Mode remounts after sessionStorage is
 * consumed. Reset on a new leave-capture or explicit `?replay` / clear.
 */
let bootLatch: TempleSnapRestoreV1 | null | undefined = undefined;

export function publishTempleSnapLive(next: {
  pointIndex: number;
  stopId: string | null;
}): void {
  if (
    !Number.isInteger(next.pointIndex) ||
    next.pointIndex < 0 ||
    next.pointIndex >= LAB_SNAP_POINTS.length ||
    !next.stopId
  ) {
    return;
  }
  const expected = LAB_SNAP_POINTS[next.pointIndex];
  if (!expected || expected.id !== next.stopId) return;
  liveSnap = { pointIndex: next.pointIndex, stopId: next.stopId };
}

export function readLiveTempleSnap(): LiveSnap | null {
  if (liveSnap) return liveSnap;
  if (typeof window === 'undefined') return null;
  const d = (
    window as Window & {
      __HERO_SNAP_DEBUG__?: {
        pointIndex?: number;
        stopId?: string | null;
      };
    }
  ).__HERO_SNAP_DEBUG__;
  if (!d || !Number.isInteger(d.pointIndex) || !d.stopId) return null;
  const expected = LAB_SNAP_POINTS[d.pointIndex!];
  if (!expected || expected.id !== d.stopId) return null;
  return { pointIndex: d.pointIndex!, stopId: d.stopId };
}

function isValidRestore(value: unknown): value is TempleSnapRestoreV1 {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  if (o.v !== 1) return false;
  if (!Number.isInteger(o.pointIndex)) return false;
  const index = o.pointIndex as number;
  if (index < 0 || index >= LAB_SNAP_POINTS.length) return false;
  if (typeof o.stopId !== 'string') return false;
  if (LAB_SNAP_POINTS[index].id !== o.stopId) return false;
  if (o.exitHref != null && typeof o.exitHref !== 'string') return false;
  if (typeof o.writtenAt !== 'number' || !Number.isFinite(o.writtenAt)) {
    return false;
  }
  return true;
}

/** Peek + validate. Invalid/stale payloads are cleared. Does not consume valid. */
export function peekTempleSnapRestore(): TempleSnapRestoreV1 | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(TEMPLE_SNAP_STORAGE_KEY);
    if (!raw) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      sessionStorage.removeItem(TEMPLE_SNAP_STORAGE_KEY);
      return null;
    }
    if (!isValidRestore(parsed)) {
      sessionStorage.removeItem(TEMPLE_SNAP_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearTempleSnapRestore(): void {
  bootLatch = undefined;
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(TEMPLE_SNAP_STORAGE_KEY);
  } catch {
    /* private mode / quota */
  }
}

/**
 * One-shot boot read: consume storage into a module latch so Strict Mode
 * remounts still restore the same stop. Call from Hero mount only.
 */
export function latchTempleSnapRestoreForBoot(): TempleSnapRestoreV1 | null {
  if (typeof window === 'undefined') return null;
  if (wantsTempleSnapReplay()) {
    clearTempleSnapRestore();
    bootLatch = null;
    return null;
  }
  if (bootLatch !== undefined) return bootLatch;

  const peeked = peekTempleSnapRestore();
  if (peeked) {
    try {
      sessionStorage.removeItem(TEMPLE_SNAP_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  bootLatch = peeked;
  return bootLatch;
}

/** After successful jump — drop latch so a later cold `/` boots at stop 0. */
export function finishTempleSnapRestoreBoot(): void {
  bootLatch = null;
}

/** Validate, return, and clear. Invalid already cleared by peek. */
export function consumeTempleSnapRestore(): TempleSnapRestoreV1 | null {
  const next = peekTempleSnapRestore();
  if (next) clearTempleSnapRestore();
  return next;
}

export function writeTempleSnapRestore(
  payload: Omit<TempleSnapRestoreV1, 'v' | 'writtenAt'> & {
    writtenAt?: number;
  }
): boolean {
  if (typeof window === 'undefined') return false;
  const record: TempleSnapRestoreV1 = {
    v: 1,
    pointIndex: payload.pointIndex,
    stopId: payload.stopId,
    writtenAt: payload.writtenAt ?? Date.now(),
    ...(payload.exitHref ? { exitHref: payload.exitHref } : {}),
  };
  if (!isValidRestore(record)) return false;
  try {
    // New leave supersedes any prior boot latch.
    bootLatch = undefined;
    sessionStorage.setItem(TEMPLE_SNAP_STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

/**
 * Capture the actually-active stop from the live bus / debug surface.
 * Returns true when a valid payload was written.
 */
export function captureActiveTempleSnap(exitHref?: string): boolean {
  const live = readLiveTempleSnap();
  if (!live) return false;
  return writeTempleSnapRestore({
    pointIndex: live.pointIndex,
    stopId: live.stopId,
    ...(exitHref ? { exitHref } : {}),
  });
}

/** `/?replay` — explicit restart from stop 0. */
export function wantsTempleSnapReplay(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).has('replay');
  } catch {
    return false;
  }
}
