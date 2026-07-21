type FrameListener = (pathIndex0: number) => void;

const listeners = new Set<FrameListener>();
let lastPathIndex = 0;

/** Publish current journey frame (0-based camera_path index). */
export function publishJourneyFrame(pathIndex0: number): void {
  lastPathIndex = pathIndex0;
  if (typeof window !== 'undefined') {
    (window as Window & { __journeyFrame?: number }).__journeyFrame = pathIndex0;
  }
  for (const fn of listeners) fn(pathIndex0);
}

export function getJourneyFrame(): number {
  return lastPathIndex;
}

export function subscribeJourneyFrame(fn: FrameListener): () => void {
  listeners.add(fn);
  fn(lastPathIndex);
  return () => {
    listeners.delete(fn);
  };
}
