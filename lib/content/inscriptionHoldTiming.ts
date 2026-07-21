import { ROOM_ENTER_FRAME, TOTAL_CAMERA_FRAMES } from '@/lib/camera/constants';
import type { TypographyHold } from '@/lib/camera/roomTypography';
import {
  TEMPLE_INSCRIPTIONS,
  type TempleRoomId,
} from '@/lib/content/templeInscriptions';

/**
 * Per-room inscription hold sizing.
 * Hold windows are frame-based; seconds convert via HOLD_NOMINAL_FPS
 * (comfortable Lenis pace through a settle plateau).
 */
export const INSCRIPTION_HOLD_TIMING = {
  /** Stagger between word reveal starts (matches TempleInscriptions). */
  wordStagger: 0.095,
  /** Per-word entrance duration. */
  wordDuration: 0.7,
  /** Read time after the last word finishes. */
  readBuffer: 2.0,
  /** Unified block fade-out. */
  exitDuration: 0.4,
  /** Safety margin on the calculated minimum. */
  safetyMargin: 1.1,
  /**
   * Nominal path frames / second while gliding a hold at a normal Lenis pace.
   * Used to compare inscription target seconds vs the original 22–88% window.
   */
  nominalFps: 18,
  /** Earliest / latest fractions of the room span the hold may occupy. */
  enterMinFrac: 0.1,
  exitMaxFrac: 0.96,
  /** Legacy window (pre-inscription extension) — baseline for comparison. */
  legacyEnterFrac: 0.22,
  legacyExitFrac: 0.88,
} as const;

const ROOM_ORDER: TempleRoomId[] = [
  'forecourt',
  'threshold',
  'hall',
  'chapel',
  'sanctuary',
];

export type InscriptionHoldPlan = {
  room: TempleRoomId;
  wordCount: number;
  /** Formula minimum before margin (seconds). */
  revealSeconds: number;
  /** reveal + read + exit (seconds). */
  minimumSeconds: number;
  /** minimumSeconds × safety margin. */
  targetSeconds: number;
  /** Legacy 22–88% window length in frames. */
  legacyHoldFrames: number;
  /** Legacy window as seconds at nominalFps. */
  legacyHoldSeconds: number;
  /** Frames used after extension. */
  holdFrames: number;
  /** Actual hold seconds at nominalFps. */
  holdSeconds: number;
  /** Whether the window was widened past legacy. */
  extended: boolean;
  hold: TypographyHold;
  /** Path indices (0-based) for film linger remapping. */
  holdPathStart: number;
  holdPathEnd: number;
};

function splitWords(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean);
}

export function countInscriptionWords(lines: readonly string[]): number {
  let n = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    n += splitWords(line).length;
  }
  return n;
}

export function inscriptionRevealSeconds(wordCount: number): number {
  const { wordStagger, wordDuration } = INSCRIPTION_HOLD_TIMING;
  return wordCount * wordStagger + wordDuration;
}

export function inscriptionMinimumHoldSeconds(wordCount: number): number {
  const { readBuffer, exitDuration } = INSCRIPTION_HOLD_TIMING;
  return inscriptionRevealSeconds(wordCount) + readBuffer + exitDuration;
}

export function inscriptionTargetHoldSeconds(wordCount: number): number {
  return (
    inscriptionMinimumHoldSeconds(wordCount) *
    INSCRIPTION_HOLD_TIMING.safetyMargin
  );
}

function roomSpan(room: TempleRoomId): {
  start: number;
  next: number;
  span: number;
} {
  const start = ROOM_ENTER_FRAME[room];
  const idx = ROOM_ORDER.indexOf(room);
  const next =
    idx < ROOM_ORDER.length - 1
      ? ROOM_ENTER_FRAME[ROOM_ORDER[idx + 1]!]
      : TOTAL_CAMERA_FRAMES;
  return { start, next, span: Math.max(1, next - start) };
}

function legacyWindow(room: TempleRoomId): {
  enter0: number;
  exit0: number;
  frames: number;
} {
  const { start, span } = roomSpan(room);
  const { legacyEnterFrac, legacyExitFrac } = INSCRIPTION_HOLD_TIMING;
  const enter0 = start + Math.round(span * legacyEnterFrac);
  const exit0 = start + Math.round(span * legacyExitFrac);
  return { enter0, exit0, frames: Math.max(1, exit0 - enter0) };
}

function buildHoldPlan(room: TempleRoomId): InscriptionHoldPlan {
  const copy = TEMPLE_INSCRIPTIONS.find((e) => e.room === room);
  const wordCount = copy ? countInscriptionWords(copy.lines) : 0;
  const revealSeconds = inscriptionRevealSeconds(wordCount);
  const minimumSeconds = inscriptionMinimumHoldSeconds(wordCount);
  const targetSeconds = inscriptionTargetHoldSeconds(wordCount);

  const { start, span } = roomSpan(room);
  const legacy = legacyWindow(room);
  const legacyHoldSeconds =
    legacy.frames / INSCRIPTION_HOLD_TIMING.nominalFps;

  const minFrames = Math.ceil(
    targetSeconds * INSCRIPTION_HOLD_TIMING.nominalFps
  );
  const { enterMinFrac, exitMaxFrac } = INSCRIPTION_HOLD_TIMING;
  const earliest0 = start + Math.round(span * enterMinFrac);
  const latest0 = start + Math.round(span * exitMaxFrac);
  const maxFrames = Math.max(1, latest0 - earliest0);

  const needExtend = minFrames > legacy.frames;
  const holdFrames = needExtend
    ? Math.min(maxFrames, minFrames)
    : legacy.frames;

  // Grow from the legacy window: pull enter earlier, push exit later.
  let enter0 = legacy.enter0;
  let exit0 = legacy.exit0;
  if (needExtend) {
    const extra = holdFrames - legacy.frames;
    const pull = Math.floor(extra / 2);
    const push = extra - pull;
    enter0 = Math.max(earliest0, legacy.enter0 - pull);
    exit0 = Math.min(latest0, legacy.exit0 + push);
    // If clamped on one side, consume remainder on the other.
    const short = holdFrames - (exit0 - enter0);
    if (short > 0) {
      if (enter0 > earliest0) {
        enter0 = Math.max(earliest0, enter0 - short);
      } else {
        exit0 = Math.min(latest0, exit0 + short);
      }
    }
  }

  const hold: TypographyHold = {
    id: `inscription-${room}`,
    enter: enter0 + 1,
    exit: exit0 + 1,
    fadeIn: 5,
    fadeOut: 6,
  };

  return {
    room,
    wordCount,
    revealSeconds,
    minimumSeconds,
    targetSeconds,
    legacyHoldFrames: legacy.frames,
    legacyHoldSeconds,
    holdFrames: exit0 - enter0,
    holdSeconds: (exit0 - enter0) / INSCRIPTION_HOLD_TIMING.nominalFps,
    extended: needExtend,
    hold,
    holdPathStart: enter0,
    holdPathEnd: exit0,
  };
}

let plansCache: InscriptionHoldPlan[] | null = null;
let planByRoom: Record<TempleRoomId, InscriptionHoldPlan> | null = null;

function ensurePlans() {
  if (plansCache && planByRoom) return;
  // Lazy — avoids circular init with templeInscriptions.ts
  plansCache = ROOM_ORDER.map(buildHoldPlan);
  planByRoom = Object.fromEntries(
    plansCache.map((p) => [p.room, p])
  ) as Record<TempleRoomId, InscriptionHoldPlan>;
}

/** Precomputed plans for all five rooms — source of truth for holds + linger. */
export function getInscriptionHoldPlans(): readonly InscriptionHoldPlan[] {
  ensurePlans();
  return plansCache!;
}

export function inscriptionHoldPlanForRoom(
  room: TempleRoomId
): InscriptionHoldPlan {
  ensurePlans();
  return planByRoom![room];
}

/** Extended (or legacy) typography hold for a room. */
export function plannedInscriptionHold(room: TempleRoomId): TypographyHold {
  return inscriptionHoldPlanForRoom(room).hold;
}
