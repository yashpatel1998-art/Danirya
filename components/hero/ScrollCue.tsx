'use client';

import styles from './ScrollCue.module.css';

type ScrollCueProps = {
  visible: boolean;
};

/** Minimal invitation once the held opening frame is stable. */
export function ScrollCue({ visible }: ScrollCueProps) {
  return (
    <div
      className={`${styles.root} ${visible ? styles.visible : ''}`}
      aria-hidden={!visible}
    >
      <span className={styles.label}>Scroll to begin</span>
      <span className={styles.line} />
    </div>
  );
}
