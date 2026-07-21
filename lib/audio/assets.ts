export const AUDIO_ASSETS = {
  ambient: '/audio/dark-ambient-22319.mp3',
  crackle: '/audio/crackle-fireplace-campfire-402289.mp3',
  whoosh: '/audio/whoosh-cinematic-sound-effect-376889.mp3',
  sanctuary: '/audio/eerie-shimmer-32212.mp3',
} as const;

/** Clean internal loop window for the long crackle file (seconds). */
export const CRACKLE_LOOP = {
  start: 2.0,
  end: 14.0,
} as const;

/** Sanctuary tone: play swell then fade (seconds). */
export const SANCTUARY_TONE = {
  fadeAfter: 3.2,
  fadeDuration: 1.2,
  peakVolume: 0.55,
} as const;

export const AMBIENT_BASE_VOLUME = 0.42;
export const CRACKLE_BASE_VOLUME = 0.38;
export const WHOOSH_VOLUME = 0.55;
