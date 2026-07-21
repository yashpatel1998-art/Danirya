'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import styles from './CustomCursor.module.css';

type CursorMode = 'default' | 'scroll' | 'view' | 'enter' | 'magnetic';

/** Magnetic influence radius around interactive targets (px). */
const MAGNETIC_RADIUS = 20;

/**
 * Champagne-gold custom cursor — post-temple document only.
 * Transform-only; GSAP quickTo. Hidden over the temple scrub.
 */
export function CustomCursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<CursorMode>('default');
  const [label, setLabel] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const magTarget = useRef<HTMLElement | null>(null);
  const inDocRef = useRef(false);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const ring = ringRef.current;
    if (!ring) return;

    const xTo = gsap.quickTo(ring, 'x', { duration: 0.28, ease: 'power3.out' });
    const yTo = gsap.quickTo(ring, 'y', { duration: 0.28, ease: 'power3.out' });

    const zoneEl = () => document.getElementById('after-temple');

    const setZone = (active: boolean) => {
      if (inDocRef.current === active) return;
      inDocRef.current = active;
      setVisible(active);
      if (active) {
        document.documentElement.classList.add('has-custom-cursor');
      } else {
        document.documentElement.classList.remove('has-custom-cursor');
        if (magTarget.current) {
          gsap.set(magTarget.current, { x: 0, y: 0 });
          magTarget.current = null;
        }
        setMode('default');
        setLabel('');
      }
    };

    const isInPostTemple = (clientY: number) => {
      const zone = zoneEl();
      if (!zone) return false;
      const r = zone.getBoundingClientRect();
      // Geometric zone — not elementFromPoint — so Sound Off / DevTools
      // overlays don't kick the cursor out of the document belt.
      return clientY >= r.top && clientY <= r.bottom;
    };

    const onMove = (e: MouseEvent) => {
      const active = isInPostTemple(e.clientY);
      setZone(active);

      if (!active) {
        xTo(e.clientX);
        yTo(e.clientY);
        return;
      }

      let x = e.clientX;
      let y = e.clientY;
      const mag = magTarget.current;
      if (mag) {
        const r = mag.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        // Distance to box edge (0 = on edge / inside)
        const nearestX = Math.max(r.left, Math.min(e.clientX, r.right));
        const nearestY = Math.max(r.top, Math.min(e.clientY, r.bottom));
        const edgeDist = Math.hypot(e.clientX - nearestX, e.clientY - nearestY);
        if (edgeDist < MAGNETIC_RADIUS) {
          const t = 1 - edgeDist / MAGNETIC_RADIUS;
          x += (cx - e.clientX) * 0.12 * t;
          y += (cy - e.clientY) * 0.12 * t;
          gsap.to(mag, {
            x: dx * 0.1 * t,
            y: dy * 0.1 * t,
            duration: 0.28,
            ease: 'power3.out',
            overwrite: true,
          });
        } else {
          gsap.to(mag, {
            x: 0,
            y: 0,
            duration: 0.35,
            ease: 'power3.out',
            overwrite: true,
          });
        }
      }
      xTo(x);
      yTo(y);
    };

    const resolveTarget = (el: EventTarget | null, clientY?: number) => {
      const y =
        clientY ??
        (el instanceof Element
          ? el.getBoundingClientRect().top + 1
          : -1);
      if (!isInPostTemple(y)) {
        if (magTarget.current) {
          gsap.to(magTarget.current, {
            x: 0,
            y: 0,
            duration: 0.4,
            ease: 'power3.out',
          });
        }
        magTarget.current = null;
        setMode('default');
        setLabel('');
        return;
      }
      const node = el instanceof Element ? el : null;
      if (!node) {
        magTarget.current = null;
        setMode('default');
        setLabel('');
        return;
      }

      const interactive = node.closest(
        'a, button, [role="button"], input, textarea, select, [data-cursor]'
      ) as HTMLElement | null;
      const scrollZone = node.closest('[data-cursor-scroll]');
      const mag = node.closest('[data-magnetic]') as HTMLElement | null;

      if (mag) magTarget.current = mag;
      else {
        if (magTarget.current) {
          gsap.to(magTarget.current, {
            x: 0,
            y: 0,
            duration: 0.4,
            ease: 'power3.out',
          });
        }
        magTarget.current = null;
      }

      if (interactive) {
        const custom = interactive.getAttribute('data-cursor');
        const customLabel = interactive.getAttribute('data-cursor-label') ?? '';
        const tag = interactive.tagName;
        const isFormControl =
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          interactive.getAttribute('role') === 'combobox' ||
          interactive.hasAttribute('data-radix-select-trigger') ||
          !!node.closest('[data-radix-select-content]') ||
          custom === 'default';

        if (isFormControl) {
          setMode('default');
          setLabel('');
          return;
        }

        if (custom === 'view' || customLabel.toLowerCase() === 'view') {
          setMode('view');
          setLabel(customLabel || 'View');
        } else if (custom === 'enter' || customLabel.toLowerCase() === 'enter') {
          setMode('enter');
          setLabel(customLabel || 'Enter');
        } else if (customLabel) {
          setMode(mag ? 'magnetic' : 'view');
          setLabel(customLabel);
        } else {
          setMode(mag ? 'magnetic' : 'view');
          setLabel(tag === 'BUTTON' ? 'Enter' : 'View');
        }
        return;
      }

      if (scrollZone) {
        setMode('scroll');
        setLabel('Scroll');
        return;
      }

      setMode('default');
      setLabel('');
    };

    const onOver = (e: MouseEvent) => resolveTarget(e.target, e.clientY);
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseover', onOver, { passive: true });

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onOver);
      document.documentElement.classList.remove('has-custom-cursor');
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={ringRef}
      className={`${styles.ring} ${styles[`mode_${mode}`]} ${
        visible ? styles.visible : styles.hidden
      }`}
      aria-hidden
    >
      <span className={styles.dot} />
      <span className={styles.label}>{label}</span>
    </div>
  );
}
