import { CAMERA_PATH_URL } from '@/lib/camera/constants';
import { normalizeTempleRoom } from '@/lib/camera/normalizeRoom';
import type { CameraPathFrame } from '@/lib/camera/types';
import { JOURNEY_FRAME_COUNT } from '@/lib/journey/frames';

let cache: CameraPathFrame[] | null = null;
let loading: Promise<CameraPathFrame[]> | null = null;

function normalizePath(raw: CameraPathFrame[]): CameraPathFrame[] {
  return raw.map((sample) => ({
    ...sample,
    room: normalizeTempleRoom(sample.room as unknown as string),
  }));
}

/** Fetch + cache camera_path_1200.json (shared by audio / typography settle gates). */
export function ensureCameraPath(): Promise<CameraPathFrame[]> {
  if (cache) return Promise.resolve(cache);
  if (loading) return loading;
  loading = fetch(CAMERA_PATH_URL)
    .then((r) => {
      if (!r.ok) throw new Error('camera_path_1200.json missing');
      return r.json() as Promise<CameraPathFrame[]>;
    })
    .then((path) => {
      cache = normalizePath(path);
      loading = null;
      return cache;
    })
    .catch((err) => {
      loading = null;
      throw err;
    });
  return loading;
}

export function getCameraSample(pathIndex0: number): CameraPathFrame | null {
  if (!cache?.length) return null;
  const i = Math.max(0, Math.min(cache.length - 1, pathIndex0));
  return cache[i] ?? null;
}

export function getCameraVelocity(pathIndex0: number): number {
  return getCameraSample(pathIndex0)?.velocity ?? 0;
}

/**
 * 1 when camera is settled, 0 when clearly moving.
 * Soft shoulder so holds can fade without hard pop.
 */
export function settleFactor(
  velocity: number,
  settled = 0.008,
  moving = 0.028
): number {
  if (velocity <= settled) return 1;
  if (velocity >= moving) return 0;
  const t = (velocity - settled) / (moving - settled);
  const x = Math.max(0, Math.min(1, t));
  return 1 - x * x * (3 - 2 * x);
}

export function pathIndexInRange(pathIndex0: number): number {
  return Math.max(0, Math.min(JOURNEY_FRAME_COUNT - 1, pathIndex0));
}
