'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { LOOKBACK_COMPLETE_FRAME } from '@/lib/camera/constants';
import { ensureCameraPath } from '@/lib/camera/cameraPath';
import type { CameraPathFrame } from '@/lib/camera/types';
import { TempleSoundscape } from '@/lib/audio/TempleSoundscape';
import { AudioToggle } from '@/components/audio/AudioToggle';
import { subscribeJourneyFrame } from '@/lib/journey/frameBus';
import { JOURNEY_FRAME_COUNT } from '@/lib/journey/frames';

type AudioContextValue = {
  ready: boolean;
  muted: boolean;
  setMuted: (muted: boolean) => void;
  /** Current camera_path frame index (0-based). */
  frame: number;
  /** True once lookback-complete frame has been reached (CTA sync). */
  lookbackComplete: boolean;
};

const AudioCtx = createContext<AudioContextValue | null>(null);

export function useTempleAudio(): AudioContextValue {
  const ctx = useContext(AudioCtx);
  if (!ctx) {
    throw new Error('useTempleAudio must be used within AudioProvider');
  }
  return ctx;
}

/** Optional access when outside provider (e.g. apply page). */
export function useTempleAudioOptional(): AudioContextValue | null {
  return useContext(AudioCtx);
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const soundscapeRef = useRef<TempleSoundscape | null>(null);
  const pathRef = useRef<CameraPathFrame[] | null>(null);
  const [ready, setReady] = useState(false);
  const [muted, setMutedState] = useState(true);
  const [frame, setFrame] = useState(0);
  const [lookbackComplete, setLookbackComplete] = useState(false);

  const setMuted = useCallback(async (next: boolean) => {
    setMutedState(next);
    const sc = soundscapeRef.current;
    if (!sc) return;
    await sc.setMuted(next);
    // Autoplay may force mute — keep React state in sync with the soundscape.
    setMutedState(sc.isMuted());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const soundscape = new TempleSoundscape();
    soundscapeRef.current = soundscape;

    const boot = async () => {
      try {
        const [pathRes] = await Promise.all([
          ensureCameraPath(),
          soundscape.preload(),
        ]);
        if (cancelled) return;
        pathRef.current = pathRes;
        setReady(true);
      } catch (err) {
        console.error('[danirya audio]', err);
        // Don't block the whole site/loader if audio assets fail.
        if (!cancelled) setReady(true);
      }
    };

    void boot();

    // Hard refresh must not freeze forever if decode/fetch stalls.
    const readyWatchdog = window.setTimeout(() => {
      if (cancelled) return;
      setReady((prev) => {
        if (!prev) console.warn('[danirya audio] ready watchdog — unblocking');
        return true;
      });
    }, 8000);

    return () => {
      cancelled = true;
      clearTimeout(readyWatchdog);
      soundscape.dispose();
      soundscapeRef.current = null;
    };
  }, []);

  // Driven by journey frame scrub (same index as the visible frame).
  useEffect(() => {
    if (!ready) return;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    return subscribeJourneyFrame((pathIndex0) => {
      const path = pathRef.current;
      const sc = soundscapeRef.current;
      if (!path?.length || !sc) return;

      const idx = Math.max(
        0,
        Math.min(JOURNEY_FRAME_COUNT - 1, Math.min(path.length - 1, pathIndex0))
      );
      const sample = path[idx];
      if (!sample) return;

      if (!reduced) {
        sc.update(sample);
      }
      setFrame(sample.frame);
      if (sample.frame >= LOOKBACK_COMPLETE_FRAME) {
        setLookbackComplete(true);
      }
    });
  }, [ready]);

  const value = useMemo(
    () => ({
      ready,
      muted,
      setMuted,
      frame,
      lookbackComplete,
    }),
    [ready, muted, setMuted, frame, lookbackComplete]
  );

  return (
    <AudioCtx.Provider value={value}>
      {children}
      <AudioToggle />
    </AudioCtx.Provider>
  );
}
