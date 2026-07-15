'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

export type RevealValues = {
  opacity: number;
  translateY: number;
  blur: number;
};

export type ContactRevealStages = {
  email: RevealValues;
  heading: RevealValues;
  subtitle: RevealValues;
  form: RevealValues;
  cta: RevealValues;
  focus: number;
};

const EASE = (t: number) => 1 - Math.pow(1 - t, 3);

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function stageEnvelope(
  progress: number,
  enterStart: number,
  enterEnd: number,
  exitStart: number,
  exitEnd: number
): number {
  if (progress <= enterStart) return 0;
  if (progress < enterEnd) {
    return EASE((progress - enterStart) / (enterEnd - enterStart));
  }
  if (progress <= exitStart) return 1;
  if (progress < exitEnd) {
    return 1 - EASE((progress - exitStart) / (exitEnd - exitStart));
  }
  return 0;
}

function toReveal(envelope: number): RevealValues {
  const opacity = envelope;
  return {
    opacity,
    translateY: 16 * (1 - opacity),
    blur: 5 * (1 - opacity),
  };
}

function computeStages(progress: number): ContactRevealStages {
  const email = toReveal(stageEnvelope(progress, 0.1, 0.22, 0.78, 0.92));
  const heading = toReveal(stageEnvelope(progress, 0.2, 0.34, 0.8, 0.93));
  const subtitle = toReveal(stageEnvelope(progress, 0.3, 0.44, 0.81, 0.94));
  const form = toReveal(stageEnvelope(progress, 0.4, 0.54, 0.82, 0.95));
  const cta = toReveal(stageEnvelope(progress, 0.5, 0.62, 0.83, 0.96));

  const focus = stageEnvelope(progress, 0.18, 0.28, 0.72, 0.88);

  return { email, heading, subtitle, form, cta, focus };
}

const INITIAL = computeStages(0);

export function useContactReveal() {
  const sectionRef = useRef<HTMLElement>(null);
  const [stages, setStages] = useState<ContactRevealStages>(INITIAL);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = vh + rect.height;
      const raw = (vh - rect.top) / total;
      const progress = clamp(raw, 0, 1);
      setStages(computeStages(progress));
    };

    const onScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        measure();
      });
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return { sectionRef, stages };
}

export function revealStyle(values: RevealValues): CSSProperties {
  return {
    opacity: values.opacity,
    transform: `translateY(${values.translateY}px)`,
    filter: `blur(${values.blur}px)`,
    pointerEvents: values.opacity > 0.55 ? 'auto' : 'none',
  };
}
