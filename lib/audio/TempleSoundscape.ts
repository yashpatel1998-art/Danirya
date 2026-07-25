import type { CameraPathFrame, TempleRoom } from '@/lib/camera/types';
import {
  LOOKBACK_COMPLETE_FRAME,
  WHOOSH_ENTER_FRAMES,
} from '@/lib/camera/constants';
import {
  AMBIENT_BASE_VOLUME,
  AUDIO_ASSETS,
  CRACKLE_BASE_VOLUME,
  CRACKLE_LOOP,
  RADHA_KRISHNA_AMBIENT_SWELL,
  RADHA_KRISHNA_HOLD,
  SANCTUARY_TONE,
  WHOOSH_VOLUME,
} from '@/lib/audio/assets';

type LayerName = 'ambient' | 'crackle' | 'whoosh' | 'sanctuary';

const AMBIENT_ROOM_GAIN: Record<TempleRoom, number> = {
  forecourt: 0.92,
  threshold: 1.0,
  hall: 0.85,
  chapel: 1.12,
  sanctuary: 1.05,
};

/** Torch-dense rooms get higher crackle; hall is sparse. */
const CRACKLE_ROOM_GAIN: Record<TempleRoom, number> = {
  forecourt: 0.75,
  threshold: 1.0,
  hall: 0.28,
  chapel: 1.05,
  sanctuary: 0.7,
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function inRadhaKrishnaHold(frame0: number): boolean {
  return frame0 >= RADHA_KRISHNA_HOLD.enter && frame0 <= RADHA_KRISHNA_HOLD.exit;
}

/**
 * Scroll-driven temple soundscape.
 * Muted by default; visitor unmute + journey settle starts ambient + crackle loops.
 */
export class TempleSoundscape {
  private layers = new Map<LayerName, HTMLAudioElement>();
  private muted = true;
  private unlocked = false;
  /** True after Hero dive unlock (loader / title / opening settle complete). */
  private journeyArmed = false;
  private ready = false;
  private lastFrame = -1;
  private lastRoom: TempleRoom | null = null;
  private whooshFired = new Set<number>();
  private sanctuaryFired = false;
  private sanctuaryFadeTimer: ReturnType<typeof setTimeout> | null = null;
  private sanctuaryFadeRaf = 0;
  private crackleLoopBound = false;
  private targetAmbient = 0;
  private targetCrackle = 0;
  private displayedAmbient = 0;
  private displayedCrackle = 0;
  private rafId = 0;
  private ambientLoadStarted = false;

  /**
   * Wire elements only — do not decode the large ambient bed up front.
   * FX layers use metadata; ambient stays preload=none until settle/unmute.
   */
  async preload(): Promise<void> {
    const entries: [LayerName, string][] = [
      ['ambient', AUDIO_ASSETS.ambient],
      ['crackle', AUDIO_ASSETS.crackle],
      ['whoosh', AUDIO_ASSETS.whoosh],
      ['sanctuary', AUDIO_ASSETS.sanctuary],
    ];

    await Promise.all(
      entries.map(async ([name, src]) => {
        const el = new Audio();
        el.preload = name === 'ambient' ? 'none' : 'metadata';
        el.src = src;
        el.crossOrigin = 'anonymous';
        if (name === 'ambient') {
          el.loop = true;
        }
        el.volume = 0;
        this.layers.set(name, el);

        // Never block site ready on ambient decode (large stream).
        if (name === 'ambient') return;

        try {
          await this.waitCanPlay(el);
        } catch {
          // FX failure must not block the soundscape / loader handoff.
        }
      })
    );

    this.bindCrackleLoop();
    this.ready = true;
  }

  isReady(): boolean {
    return this.ready;
  }

  isMuted(): boolean {
    return this.muted;
  }

  /**
   * Call once when the temple opening settles after loader / title / smoke handoff
   * (Hero `onDiveUnlock`). Beds may play only after this + unmute.
   */
  armJourney(): void {
    if (this.journeyArmed) return;
    this.journeyArmed = true;
    if (!this.muted) {
      void this.unlockAndStartBeds();
    }
    this.applyVolumes(false);
  }

  isJourneyArmed(): boolean {
    return this.journeyArmed;
  }

  /** Playwright / verify probe — gain targets + RK hold flag. */
  getDebugSnapshot(): {
    muted: boolean;
    journeyArmed: boolean;
    unlocked: boolean;
    lastFrame: number;
    inRadhaKrishnaHold: boolean;
    targetAmbient: number;
    displayedAmbient: number;
    ambientElVolume: number;
  } {
    const ambient = this.layers.get('ambient');
    return {
      muted: this.muted,
      journeyArmed: this.journeyArmed,
      unlocked: this.unlocked,
      lastFrame: this.lastFrame,
      inRadhaKrishnaHold: inRadhaKrishnaHold(this.lastFrame),
      targetAmbient: this.targetAmbient,
      displayedAmbient: this.displayedAmbient,
      ambientElVolume: ambient?.volume ?? 0,
    };
  }

  /** Visitor gesture — required before any audible playback. */
  async setMuted(muted: boolean): Promise<void> {
    this.muted = muted;
    if (!muted) {
      await this.unlockAndStartBeds();
    } else {
      this.stopAllImmediate();
    }
    this.applyVolumes(true);
  }

  /**
   * Drive envelopes + one-shots from the current camera_path sample.
   * Call every scroll/animation frame with the active path entry.
   */
  update(sample: CameraPathFrame): void {
    if (!this.ready) return;

    const frame = sample.frame;
    const room = sample.room;
    const crossedForward = this.lastFrame >= 0 && frame > this.lastFrame;

    this.targetAmbient = this.ambientGainFor(room, frame);
    this.targetCrackle = this.crackleGainFor(room, sample.velocity);

    if (crossedForward) {
      for (const enterAt of WHOOSH_ENTER_FRAMES) {
        if (this.lastFrame < enterAt && frame >= enterAt) {
          this.fireWhoosh(enterAt);
        }
      }
      if (
        !this.sanctuaryFired &&
        this.lastFrame < LOOKBACK_COMPLETE_FRAME &&
        frame >= LOOKBACK_COMPLETE_FRAME
      ) {
        this.fireSanctuaryTone();
      }
    }

    // Allow re-trigger when scrubbing back past a whoosh gate then forward again
    if (frame < this.lastFrame) {
      for (const enterAt of WHOOSH_ENTER_FRAMES) {
        if (frame < enterAt) this.whooshFired.delete(enterAt);
      }
      if (frame < LOOKBACK_COMPLETE_FRAME) {
        this.sanctuaryFired = false;
      }
    }

    this.lastFrame = frame;
    this.lastRoom = room;
    this.ensureVolumeLoop();
  }

  dispose(): void {
    cancelAnimationFrame(this.rafId);
    cancelAnimationFrame(this.sanctuaryFadeRaf);
    if (this.sanctuaryFadeTimer) clearTimeout(this.sanctuaryFadeTimer);
    for (const el of this.layers.values()) {
      el.pause();
      el.src = '';
    }
    this.layers.clear();
  }

  private ambientGainFor(room: TempleRoom, frame0: number): number {
    if (this.muted || !this.unlocked || !this.journeyArmed) return 0;
    const swell = inRadhaKrishnaHold(frame0) ? RADHA_KRISHNA_AMBIENT_SWELL : 1;
    return AMBIENT_BASE_VOLUME * AMBIENT_ROOM_GAIN[room] * swell;
  }

  private crackleGainFor(room: TempleRoom, velocity: number): number {
    if (this.muted || !this.unlocked || !this.journeyArmed) return 0;
    // Lower velocity (lingering / holds) → more crackle presence
    const linger = clamp01(1 - velocity / 0.12);
    const roomGain = CRACKLE_ROOM_GAIN[room];
    const boost = lerp(0.55, 1.15, linger);
    return CRACKLE_BASE_VOLUME * roomGain * boost;
  }

  private ensureVolumeLoop(): void {
    if (this.rafId) return;
    const tick = () => {
      this.displayedAmbient = lerp(this.displayedAmbient, this.targetAmbient, 0.08);
      this.displayedCrackle = lerp(this.displayedCrackle, this.targetCrackle, 0.1);
      const ambient = this.layers.get('ambient');
      const crackle = this.layers.get('crackle');
      if (ambient) ambient.volume = clamp01(this.displayedAmbient);
      if (crackle) crackle.volume = clamp01(this.displayedCrackle);
      const stillSettling =
        Math.abs(this.displayedAmbient - this.targetAmbient) > 0.002 ||
        Math.abs(this.displayedCrackle - this.targetCrackle) > 0.002;
      if (stillSettling) {
        this.rafId = requestAnimationFrame(tick);
      } else {
        this.rafId = 0;
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private applyVolumes(immediate = false): void {
    if (immediate) {
      this.displayedAmbient = this.targetAmbient;
      this.displayedCrackle = this.targetCrackle;
      const ambient = this.layers.get('ambient');
      const crackle = this.layers.get('crackle');
      if (ambient) ambient.volume = clamp01(this.displayedAmbient);
      if (crackle) crackle.volume = clamp01(this.displayedCrackle);
    }
    this.ensureVolumeLoop();
  }

  private ensureAmbientLoading(): void {
    const ambient = this.layers.get('ambient');
    if (!ambient || this.ambientLoadStarted) return;
    this.ambientLoadStarted = true;
    // Stream on demand — first play() after load() kicks network fetch.
    ambient.load();
  }

  private async unlockAndStartBeds(): Promise<void> {
    this.unlocked = true;
    // Gesture unlock is recorded, but beds stay silent until journey settle.
    if (!this.journeyArmed) return;

    this.ensureAmbientLoading();

    const ambient = this.layers.get('ambient');
    const crackle = this.layers.get('crackle');
    try {
      if (ambient) {
        ambient.loop = true;
        if (ambient.paused) await ambient.play();
      }
      if (crackle) {
        if (crackle.currentTime < CRACKLE_LOOP.start || crackle.currentTime > CRACKLE_LOOP.end) {
          crackle.currentTime = CRACKLE_LOOP.start;
        }
        if (crackle.paused) await crackle.play();
      }
    } catch {
      // Autoplay blocked — stay muted until another gesture
      this.muted = true;
      this.unlocked = false;
    }
  }

  private stopAllImmediate(): void {
    for (const el of this.layers.values()) {
      el.pause();
      el.volume = 0;
    }
    this.targetAmbient = 0;
    this.targetCrackle = 0;
    this.displayedAmbient = 0;
    this.displayedCrackle = 0;
    if (this.sanctuaryFadeTimer) clearTimeout(this.sanctuaryFadeTimer);
    cancelAnimationFrame(this.sanctuaryFadeRaf);
  }

  private fireWhoosh(enterAt: number): void {
    if (this.muted || !this.unlocked) return;
    if (this.whooshFired.has(enterAt)) return;
    this.whooshFired.add(enterAt);
    const el = this.layers.get('whoosh');
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    el.volume = WHOOSH_VOLUME;
    void el.play().catch(() => undefined);
  }

  private fireSanctuaryTone(): void {
    if (this.muted || !this.unlocked) return;
    if (this.sanctuaryFired) return;
    this.sanctuaryFired = true;

    const el = this.layers.get('sanctuary');
    if (!el) return;

    if (this.sanctuaryFadeTimer) clearTimeout(this.sanctuaryFadeTimer);
    cancelAnimationFrame(this.sanctuaryFadeRaf);

    el.pause();
    el.currentTime = 0;
    el.volume = SANCTUARY_TONE.peakVolume;
    void el.play().catch(() => undefined);

    // Code fade after the opening swell — don't let the 46s file run as ambient
    this.sanctuaryFadeTimer = setTimeout(() => {
      const startVol = el.volume;
      const start = performance.now();
      const dur = SANCTUARY_TONE.fadeDuration * 1000;
      const step = (now: number) => {
        const t = clamp01((now - start) / dur);
        el.volume = startVol * (1 - t);
        if (t < 1) {
          this.sanctuaryFadeRaf = requestAnimationFrame(step);
        } else {
          el.pause();
          el.currentTime = 0;
          el.volume = 0;
        }
      };
      this.sanctuaryFadeRaf = requestAnimationFrame(step);
    }, SANCTUARY_TONE.fadeAfter * 1000);
  }

  private bindCrackleLoop(): void {
    if (this.crackleLoopBound) return;
    const crackle = this.layers.get('crackle');
    if (!crackle) return;
    crackle.loop = false;
    crackle.addEventListener('timeupdate', () => {
      if (crackle.currentTime >= CRACKLE_LOOP.end) {
        crackle.currentTime = CRACKLE_LOOP.start;
      }
    });
    this.crackleLoopBound = true;
  }

  private waitCanPlay(el: HTMLAudioElement): Promise<void> {
    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error(`Failed to load ${el.src}`));
      };
      const cleanup = () => {
        el.removeEventListener('loadedmetadata', onReady);
        el.removeEventListener('canplaythrough', onReady);
        el.removeEventListener('error', onError);
      };
      el.addEventListener('loadedmetadata', onReady, { once: true });
      el.addEventListener('canplaythrough', onReady, { once: true });
      el.addEventListener('error', onError, { once: true });
      el.load();
    });
  }
}
