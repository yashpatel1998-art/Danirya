'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { envelopeToOpacity, stageEnvelope } from '@/lib/animation/envelope';
import type { RevealValues } from '@/types/animation';
import { clamp } from '@/lib/utils/clamp';

export type ContactRevealStages = {
  email: RevealValues;
  heading: RevealValues;
  subtitle: RevealValues;
  form: RevealValues;
  cta: RevealValues;
  focus: number;
};

function computeStages(progress: number): ContactRevealStages {
  const p = clamp(progress, 0, 1);

  const email = envelopeToOpacity(
    stageEnvelope(p, { enterStart: 0.1, enterEnd: 0.22, exitStart: 0.78, exitEnd: 0.92 })
  );
  const heading = envelopeToOpacity(
    stageEnvelope(p, { enterStart: 0.2, enterEnd: 0.34, exitStart: 0.8, exitEnd: 0.93 })
  );
  const subtitle = envelopeToOpacity(
    stageEnvelope(p, { enterStart: 0.3, enterEnd: 0.44, exitStart: 0.81, exitEnd: 0.94 })
  );
  const form = envelopeToOpacity(
    stageEnvelope(p, { enterStart: 0.4, enterEnd: 0.54, exitStart: 0.82, exitEnd: 0.95 })
  );
  const cta = envelopeToOpacity(
    stageEnvelope(p, { enterStart: 0.5, enterEnd: 0.62, exitStart: 0.83, exitEnd: 0.96 })
  );
  const focus = stageEnvelope(p, {
    enterStart: 0.18,
    enterEnd: 0.28,
    exitStart: 0.72,
    exitEnd: 0.88,
  });

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
      setStages(computeStages(raw));
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
