'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { drawTornEdge } from '@/lib/transition/drawTornEdge';
import { prefersReducedMotion } from '@/lib/motion/prefersReducedMotion';
import styles from './WaveEdge.module.css';

gsap.registerPlugin(ScrollTrigger);

/**
 * Temple → document handoff — Editions cream-over-dark torn paper.
 * Full-bleed, scroll-scrubbed edge + sheet rise (live home after Hero).
 */
export function WaveEdge() {
  const rootRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const pin = pinRef.current;
    const sheet = sheetRef.current;
    const canvas = canvasRef.current;
    if (!root || !pin || !sheet || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = prefersReducedMotion();
    const cleanups: Array<() => void> = [];
    let disposed = false;
    let raf = 0;
    let w = 0;
    let h = 0;
    let scrollPhase = 0;
    let breath = 0;

    const cream =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--doc-bg')
        .trim() || '#e6dcc8';

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const paint = () => {
      if (!w || !h) return;
      drawTornEdge(ctx, w, h, scrollPhase, breath, { cream });
    };

    resize();
    paint();
    const ro = new ResizeObserver(() => {
      resize();
      paint();
    });
    ro.observe(canvas);
    cleanups.push(() => ro.disconnect());

    if (reduced) {
      gsap.set(sheet, { yPercent: -8 });
      root.dataset.waveProgress = '1';
      root.dataset.waveMorph = 'static';
      paint();
    } else {
      root.dataset.waveMorph = 'torn-paper-scroll';
      // Start higher so the tear is visible without a long empty black well
      gsap.set(sheet, { yPercent: 28 });
      root.dataset.waveProgress = '0';

      const tick = () => {
        if (disposed) return;
        breath += 0.006;
        paint();
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      cleanups.push(() => cancelAnimationFrame(raf));

      const reveal = gsap.to(sheet, {
        yPercent: -8,
        ease: 'none',
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: '+=100%',
          pin: pin,
          scrub: 0.45,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: (self) => {
            root.dataset.waveStart = String(Math.round(self.start));
            root.dataset.waveEnd = String(Math.round(self.end));
          },
          onUpdate: (self) => {
            const p = self.progress;
            root.dataset.waveProgress = p.toFixed(3);
            scrollPhase = p * Math.PI * 2.6;
          },
        },
      });
      if (reveal.scrollTrigger) {
        root.dataset.waveStart = String(Math.round(reveal.scrollTrigger.start));
        root.dataset.waveEnd = String(Math.round(reveal.scrollTrigger.end));
      }
      cleanups.push(() => {
        reveal.scrollTrigger?.kill();
        reveal.kill();
      });
    }

    const refresh = () => {
      resize();
      paint();
      ScrollTrigger.refresh();
    };
    const t1 = window.setTimeout(refresh, 400);
    const t2 = window.setTimeout(refresh, 1800);
    window.addEventListener('load', refresh);
    cleanups.push(() => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('load', refresh);
    });

    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-wave-edge
      aria-hidden
    >
      <div ref={pinRef} className={styles.pin}>
        <div className={styles.well} />
        <div ref={sheetRef} className={styles.sheet} data-wave-sheet>
          <canvas
            ref={canvasRef}
            className={styles.tear}
            data-wave-tear-canvas
            aria-hidden
          />
          <div className={styles.sheetBody} />
        </div>
      </div>
    </div>
  );
}
