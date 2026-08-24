/** Client-side heuristics for touch / low-power / save-data devices. */

function readConnectionProfile():
  | { saveData: boolean; effectiveType: string }
  | null {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return null;
  }
  const conn = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (!conn) return null;
  return {
    saveData: conn.saveData === true,
    effectiveType: conn.effectiveType ?? '',
  };
}

export function shouldReduceLoaderExperience(): boolean {
  if (typeof window === 'undefined') return true;

  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.matchMedia('(max-width: 768px)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const conn = readConnectionProfile();
  const saveData = conn?.saveData === true;
  const slowLink = /(?:^2g$|^slow-2g$|^3g$)/.test(conn?.effectiveType ?? '');
  const lowMemory =
    'deviceMemory' in navigator &&
    typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory ===
      'number' &&
    ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4;

  return coarse || narrow || reducedMotion || saveData || slowLink || lowMemory;
}

/**
 * Home loader must never depend on a 45MB+ GLB fetch — use static mark everywhere.
 * WebGL blast stays available on /logo-explode only.
 */
export function shouldUseStaticHomeLoader(): boolean {
  return true;
}

/** Native scroll is smoother than Lenis on touch devices. */
export function shouldUseNativeScroll(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.matchMedia('(max-width: 768px)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return coarse || narrow || reducedMotion;
}
