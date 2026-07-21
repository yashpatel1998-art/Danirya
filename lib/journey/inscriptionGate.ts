/**
 * Frame cap while an inscription reveal is still playing.
 * Playback must not advance past this 1-based frame until the entrance
 * timeline reports 100% complete — protects fast Lenis scroll.
 */
let frameCap1: number | null = null;
let revealComplete = true;

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribeInscriptionGate(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Call when a room inscription starts playing. */
export function armInscriptionGate(holdExitFrame1: number) {
  frameCap1 = holdExitFrame1;
  revealComplete = false;
  notify();
}

/** Call when the entrance timeline reaches 100%. */
export function markInscriptionRevealComplete() {
  revealComplete = true;
  frameCap1 = null;
  notify();
}

/** Call on fade-out / hide so a stale cap never sticks. */
export function clearInscriptionGate() {
  revealComplete = true;
  frameCap1 = null;
  notify();
}

export function getInscriptionFrameCap1(): number | null {
  return revealComplete ? null : frameCap1;
}

export function isInscriptionRevealComplete(): boolean {
  return revealComplete;
}
