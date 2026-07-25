'use client';

import { useEffect, useRef } from 'react';
import { useLabSnapController } from '@/hooks/useLabSnapController';
import { journeyFrameUrl } from '@/lib/journey/frames';
import {
  LAB_SNAP_FRAME_COUNT,
  LAB_SNAP_POINTS,
  PHASE_B_MASTER_FRAME_COUNT,
} from '@/lib/lab/snap/stubPath';
import { LabSnapTypology } from './LabSnapTypology';
import { StatueLens } from './StatueLens';
import styles from './LabSnapHarness.module.css';

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cssW: number,
  cssH: number
) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (!iw || !ih) return;
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, cssW, cssH);
  const scale = Math.max(cssW / iw, cssH / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (cssW - dw) * 0.5, (cssH - dh) * 0.5, dw, dh);
}

/**
 * /lab/snap — Phase B 9-stop harness on the 1200-frame WebP bake (1:1).
 * Does not touch production Hero dive/settle/audio/lens wiring.
 */
export function LabSnapHarness() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgCacheRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const {
    phase,
    pointIndex,
    frame1,
    stride,
    typologyPoint,
    typologyMode,
    onTypologyEntranceComplete,
    onTypologyExitComplete,
  } = useLabSnapController();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cache = imgCacheRef.current;
    let cancelled = false;

    const paint = () => {
      if (cancelled) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cssW = canvas.clientWidth || window.innerWidth;
      const cssH = canvas.clientHeight || window.innerHeight;
      const w = Math.max(1, Math.round(cssW * dpr));
      const h = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cached = cache.get(frame1);
      if (cached?.complete && cached.naturalWidth) {
        drawCover(ctx, cached, cssW, cssH);
        return;
      }

      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, cssW, cssH);

      let img = cached;
      if (!img) {
        img = new Image();
        img.decoding = 'async';
        cache.set(frame1, img);
        img.onload = () => {
          if (!cancelled) paint();
        };
        img.src = journeyFrameUrl(frame1);
      }
    };

    paint();
    // Prefetch neighbors for travel
    for (const delta of [-2, -1, 1, 2, 3, 4]) {
      const f = Math.max(1, Math.min(LAB_SNAP_FRAME_COUNT, frame1 + delta * stride));
      if (cache.has(f)) continue;
      const img = new Image();
      img.decoding = 'async';
      cache.set(f, img);
      img.src = journeyFrameUrl(f);
    }

    window.addEventListener('resize', paint);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', paint);
    };
  }, [frame1, stride]);

  const locked = phase !== 'idle';
  const point = LAB_SNAP_POINTS[pointIndex];
  const washActive =
    typologyPoint != null &&
    typologyPoint.kind === 'statue' &&
    (typologyMode === 'enter' ||
      typologyMode === 'hold' ||
      typologyMode === 'exit');
  const washExiting = typologyMode === 'exit';
  const showLens =
    typologyPoint?.kind === 'statue' &&
    typologyPoint.lensSrc != null &&
    (typologyMode === 'enter' ||
      typologyMode === 'hold' ||
      typologyMode === 'exit');

  return (
    <div className={styles.stage} data-lab-snap="1">
      <p className={styles.hint}>
        {phase === 'traveling'
          ? 'Traveling — input locked'
          : phase === 'holdGate'
            ? 'Hold gate — typology entrance'
            : typologyPoint
              ? 'Typology held — scroll to exit + travel'
              : 'Scroll / swipe / ↓ to advance'}
      </p>

      <canvas ref={canvasRef} className={styles.canvas} aria-hidden />

      <div
        className={`${styles.sceneWash} ${washActive && !washExiting ? styles.sceneWashActive : ''} ${washExiting ? styles.sceneWashExit : ''}`}
        aria-hidden
      />

      {showLens && typologyPoint?.lensSrc ? (
        <StatueLens
          key={`lens-${typologyPoint.id}`}
          src={typologyPoint.lensSrc}
          alt={typologyPoint.eyebrow}
          mode={typologyMode}
        />
      ) : null}

      {typologyPoint ? (
        // key = visit-unique stop id so same statueId return remounts (not reused).
        <LabSnapTypology
          key={typologyPoint.id}
          point={typologyPoint}
          mode={typologyMode}
          onEntranceComplete={onTypologyEntranceComplete}
          onExitComplete={onTypologyExitComplete}
        />
      ) : null}

      <aside className={styles.hud} aria-hidden>
        <div>
          phase <strong>{phase}</strong>
          {typologyPoint ? (
            <>
              {' '}
              · typo <strong>{typologyMode}</strong>
            </>
          ) : null}
        </div>
        <div>
          stop{' '}
          <strong>
            {pointIndex + 1}/{LAB_SNAP_POINTS.length}
          </strong>{' '}
          · {point?.id}
          {point?.statueId && point.statueId !== point.id
            ? ` · statue ${point.statueId}`
            : ''}{' '}
          ({point?.kind})
        </div>
        <div>
          bake f<strong>{frame1}</strong> / {LAB_SNAP_FRAME_COUNT}
          {point?.masterFrame != null ? (
            <>
              {' '}
              · master f<strong>{point.masterFrame}</strong> /{' '}
              {PHASE_B_MASTER_FRAME_COUNT}
            </>
          ) : null}
        </div>
        <div>
          stride <strong>{stride}</strong>
          {locked ? ' · locked' : ' · accepting gesture'}
        </div>
      </aside>
    </div>
  );
}
