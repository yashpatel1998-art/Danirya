'use client';

import { useEffect, useState } from 'react';

export type ViewportSize = {
  width: number;
  height: number;
  dpr: number;
};

const DEFAULT: ViewportSize = { width: 0, height: 0, dpr: 1 };

export function useViewport(): ViewportSize {
  const [viewport, setViewport] = useState<ViewportSize>(DEFAULT);

  useEffect(() => {
    const measure = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      });
    };

    measure();
    window.addEventListener('resize', measure, { passive: true });
    return () => window.removeEventListener('resize', measure);
  }, []);

  return viewport;
}
