'use client';

import { useLayoutEffect, useRef } from 'react';
import { createHeroBridge } from '@/lib/museum/roomReveal';
import styles from './HeroGalleryBridge.module.css';

/**
 * Architectural dissolve between Hero video and Gallery room.
 * V2: replace overlay with Blender smoke without changing section markup.
 */
export function HeroGalleryBridge() {
  const bridgeRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const bridge = bridgeRef.current;
    if (!bridge) return;

    const st = createHeroBridge({ bridge });
    return () => st.kill();
  }, []);

  return (
    <div
      ref={bridgeRef}
      className={styles.bridge}
      data-transition="hero-gallery"
      aria-hidden
    >
      <div className={styles.void} />
      <div className={styles.warmEdge} />
    </div>
  );
}
