'use client';

import { useLayoutEffect, useRef } from 'react';
import { createPassage } from '@/lib/museum/roomReveal';
import styles from './RoomPassage.module.css';

type RoomPassageProps = {
  /** 0 = cool neutral, 1 = warm application approach */
  warmth?: number;
  transitionId: string;
};

export function RoomPassage({ warmth = 0, transitionId }: RoomPassageProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const passage = ref.current;
    if (!passage) return;
    const st = createPassage({ passage, warmth });
    return () => st.kill();
  }, [warmth]);

  return (
    <div
      ref={ref}
      className={styles.passage}
      data-transition={transitionId}
      aria-hidden
    >
      <div className={styles.cool} />
      <div className={styles.warm} data-warmth />
    </div>
  );
}
