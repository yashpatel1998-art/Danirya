'use client';

import { usePathname } from 'next/navigation';
import { useTempleAudioOptional } from '@/components/audio/AudioProvider';
import styles from './AudioToggle.module.css';

const GUIDE_PATHS = new Set(['/guide', '/lab/guide']);

export function AudioToggle() {
  const pathname = usePathname();
  const audio = useTempleAudioOptional();
  if (GUIDE_PATHS.has(pathname)) return null;
  if (!audio) return null;

  const { ready, muted, setMuted } = audio;

  return (
    <button
      type="button"
      className={styles.toggle}
      aria-pressed={!muted}
      aria-label={muted ? 'Unmute soundscape' : 'Mute soundscape'}
      disabled={!ready}
      onClick={() => {
        void setMuted(!muted);
      }}
    >
      <span className={styles.icon} aria-hidden>
        {muted ? (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path
              d="M11 5L6 9H3v6h3l5 4V5z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path
              d="M16 9.5l5 5m0-5l-5 5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path
              d="M11 5L6 9H3v6h3l5 4V5z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path
              d="M15.5 9.5a4.5 4.5 0 010 5M18 7a8 8 0 010 10"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        )}
      </span>
      <span className={styles.label}>{muted ? 'Sound off' : 'Sound on'}</span>
    </button>
  );
}
