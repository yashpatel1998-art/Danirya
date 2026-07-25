import {
  LAB_SNAP_FRAME_COUNT,
  LAB_SNAP_POINTS,
  LAB_SNAP_TRAVEL_FPS,
  travelInto,
  type LabSnapPoint,
} from '@/lib/lab/snap/stubPath';
import { alignFrame1, sampleTravelFrame1 } from '@/lib/lab/snap/stride';

export type SnapPhase = 'idle' | 'traveling' | 'holdGate';

export type SnapPathConfig = {
  points: LabSnapPoint[];
  frameCount: number;
  travelFps?: number;
  /**
   * When true, advancing past the last stop restarts at point 0.
   * Production Hero keeps this false — sky-ascend is the final beat.
   */
  loopAtEnd?: boolean;
};

export type SnapControllerHandlers = {
  onFrame: (frame1: number) => void;
  onPhase: (phase: SnapPhase, pointIndex: number) => void;
  /**
   * Statue hold gate — run typology; call `complete()` when reveal finishes.
   * Passage stops never invoke this.
   */
  onHoldGate: (point: LabSnapPoint, complete: () => void) => void;
};

export type SnapController = {
  getPhase: () => SnapPhase;
  getPointIndex: () => number;
  getFrame1: () => number;
  /** One gesture advance — discarded entirely while phase !== 'idle'. */
  advance: () => void;
  destroy: () => void;
};

const DEFAULT_PATH: SnapPathConfig = {
  points: LAB_SNAP_POINTS,
  frameCount: LAB_SNAP_FRAME_COUNT,
  travelFps: LAB_SNAP_TRAVEL_FPS,
  loopAtEnd: false,
};

/**
 * Discrete snap state machine for Phase B journey (/ and /lab/snap).
 * Travel = linear rAF frame-index tween (no re-easing).
 * Input during travel + holdGate is discarded (no queue / no replay on unlock).
 */
export function createSnapController(
  stride: number,
  handlers: SnapControllerHandlers,
  path: Partial<SnapPathConfig> = {}
): SnapController {
  const cfg: SnapPathConfig = { ...DEFAULT_PATH, ...path };
  const points = cfg.points;
  const frameCount = cfg.frameCount;
  const travelFps = cfg.travelFps ?? LAB_SNAP_TRAVEL_FPS;
  const loopAtEnd = cfg.loopAtEnd ?? false;

  let phase: SnapPhase = 'idle';
  let pointIndex = 0;
  let frame1 = alignFrame1(points[0].frame, stride, frameCount);
  let rafId = 0;
  let destroyed = false;

  const emitFrame = (f: number) => {
    frame1 = f;
    handlers.onFrame(f);
  };

  const setPhase = (next: SnapPhase) => {
    phase = next;
    handlers.onPhase(phase, pointIndex);
  };

  const enterIdleAt = (index: number) => {
    pointIndex = index;
    const point = points[index];
    emitFrame(alignFrame1(point.frame, stride, frameCount));
    setPhase('idle');
  };

  const beginHoldGate = (index: number) => {
    pointIndex = index;
    const point = points[index];
    emitFrame(alignFrame1(point.frame, stride, frameCount));
    setPhase('holdGate');

    if (point.kind !== 'statue') {
      // Passage: travel-then-stop only — unlock immediately.
      enterIdleAt(index);
      return;
    }

    let settled = false;
    const complete = () => {
      if (settled || destroyed || phase !== 'holdGate') return;
      settled = true;
      enterIdleAt(index);
    };
    handlers.onHoldGate(point, complete);
  };

  const runTravel = (toIndex: number) => {
    const travel = travelInto(toIndex, points);
    if (!travel) {
      beginHoldGate(toIndex);
      return;
    }

    setPhase('traveling');
    const from = alignFrame1(travel.fromFrame, stride, frameCount);
    const to = alignFrame1(travel.toFrame, stride, frameCount);
    const span = Math.max(1, Math.abs(to - from));
    const durationMs = (span / travelFps) * 1000;
    const t0 = performance.now();

    const step = (now: number) => {
      if (destroyed) return;
      const t = Math.min(1, (now - t0) / durationMs);
      emitFrame(sampleTravelFrame1(from, to, t, stride, frameCount));
      if (t < 1) {
        rafId = requestAnimationFrame(step);
        return;
      }
      rafId = 0;
      beginHoldGate(toIndex);
    };

    rafId = requestAnimationFrame(step);
  };

  const advance = () => {
    if (destroyed) return;
    // Full discard while locked — nothing carries over into the next idle.
    if (phase !== 'idle') return;
    if (pointIndex >= points.length - 1) {
      if (!loopAtEnd) {
        // Final beat — discard further advances (no reverse-return).
        return;
      }
      // Lab harness: restart at opening statue gate.
      beginHoldGate(0);
      return;
    }
    runTravel(pointIndex + 1);
  };

  // Opening freeze goes through the statue hold gate (typology unlock).
  beginHoldGate(0);

  return {
    getPhase: () => phase,
    getPointIndex: () => pointIndex,
    getFrame1: () => frame1,
    advance,
    destroy: () => {
      destroyed = true;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    },
  };
}
