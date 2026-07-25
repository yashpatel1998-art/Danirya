'use client';

import { useEffect, useRef, useState } from 'react';
import { useLenis } from '@/components/shared/LenisContext';
import type { LabSnapTypologyMode } from '@/components/lab/snap/LabSnapTypology';
import {
  createSnapController,
  type SnapPhase,
} from '@/lib/lab/snap/createSnapController';
import { resolveLabSnapStride } from '@/lib/lab/snap/stride';
import type { LabSnapPoint } from '@/lib/lab/snap/stubPath';

export type LabSnapUiState = {
  phase: SnapPhase;
  pointIndex: number;
  frame1: number;
  stride: number;
  /** Statue typology — stays mounted through idle until exit couples to travel. */
  typologyPoint: LabSnapPoint | null;
  typologyMode: LabSnapTypologyMode;
  onTypologyEntranceComplete: () => void;
  onTypologyExitComplete: () => void;
};

const IDLE_WHEEL_THRESHOLD = 28;

/**
 * /lab/snap harness — exclusive wheel/touch owner; Lenis stopped for the segment.
 * Production `/` uses the same createSnapController via useHeroSnapPlayback.
 */
export function useLabSnapController(): LabSnapUiState {
  const lenis = useLenis();
  const [phase, setPhase] = useState<SnapPhase>('idle');
  const [pointIndex, setPointIndex] = useState(0);
  const [frame1, setFrame1] = useState(1);
  const [stride, setStride] = useState(1);
  const [typologyPoint, setTypologyPoint] = useState<LabSnapPoint | null>(null);
  const [typologyMode, setTypologyMode] =
    useState<LabSnapTypologyMode>('enter');
  const unlockHoldRef = useRef<(() => void) | null>(null);
  /** Stop id whose exit is in flight — ignore late onExitComplete after a newer gate. */
  const exitingStopIdRef = useRef<string | null>(null);

  useEffect(() => {
    const resolvedStride = resolveLabSnapStride();
    setStride(resolvedStride);

    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    lenis?.stop();

    const controller = createSnapController(
      resolvedStride,
      {
        onFrame: (f) => setFrame1(f),
        onPhase: (p, idx) => {
          setPhase(p);
          setPointIndex(idx);
          // Couple typology exit to the same advance that starts travel.
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
          // New gate supersedes any in-flight exit for a prior stop.
          exitingStopIdRef.current = null;
          unlockHoldRef.current = complete;
          setTypologyPoint(point);
          setTypologyMode('enter');
        },
      },
      // Lab may restart; production Hero keeps loopAtEnd false (final CTA beat).
      { loopAtEnd: true }
    );

    let touchY: number | null = null;
    let touchAcc = 0;
    let armedAt = performance.now() + 200;

    const tryAdvance = (deltaY: number) => {
      if (performance.now() < armedAt) return;
      if (deltaY < IDLE_WHEEL_THRESHOLD) return;
      // advance() → traveling → typologyMode 'exit' in the same turn.
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

    lenis?.stop();

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
    };
  }, [lenis]);

  return {
    phase,
    pointIndex,
    frame1,
    stride,
    typologyPoint,
    typologyMode,
    onTypologyEntranceComplete: () => {
      // Unlock only — typology remains visible (mode → hold).
      unlockHoldRef.current?.();
      unlockHoldRef.current = null;
      setTypologyMode('hold');
    },
    onTypologyExitComplete: () => {
      const exitingId = exitingStopIdRef.current;
      exitingStopIdRef.current = null;
      // Do not clear a newer holdGate that already replaced this stop
      // (same statueId return visit, or a different statue arrived mid-exit).
      setTypologyPoint((pt) => {
        if (exitingId == null) return pt;
        if (pt == null || pt.id !== exitingId) return pt;
        return null;
      });
      setTypologyMode((mode) => (mode === 'exit' ? 'enter' : mode));
    },
  };
}
