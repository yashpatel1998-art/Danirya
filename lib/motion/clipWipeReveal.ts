/**
 * Pasqua / Adoratorio-style non-fading mask wipe.
 * Source of truth: statue-hold typology (`LabSnapTypology`).
 * Clip edge opens LTR — no opacity fade on the wiped block.
 */

/** Matches --ease-premium cubic-bezier(0.22, 1, 0.36, 1). */
export const CLIP_WIPE_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
/** Fully masked — right inset covers the block. */
export const CLIP_WIPE_HIDDEN = 'inset(0 100% 0 0)';
/** Fully revealed. */
export const CLIP_WIPE_OPEN = 'inset(0 0% 0 0)';
/** Entrance duration used by statue-hold typology. */
export const CLIP_WIPE_ENTER_DURATION = 0.85;
