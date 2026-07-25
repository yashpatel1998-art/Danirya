/**
 * /lab/snap Phase B 9-stop path.
 *
 * Freeze/travel indices are 1:1 with the on-disk 1200-frame WebP bake
 * (`JOURNEY_FRAME_COUNT` / Phase B master).
 */

import { JOURNEY_FRAME_COUNT } from '@/lib/journey/frames';

export type SnapPointKind = 'statue' | 'passage';

export type LabSnapPoint = {
  /** Visit-unique stop id (React remount key). Never reuse across visits. */
  id: string;
  /**
   * Content identity — same across return visits of one statue
   * (lying-1 and lying-2 share `lying-hanuman`).
   */
  statueId: string;
  /** Freeze frame on the bake timeline (1-based, 1–1200). */
  frame: number;
  /** Phase B master freeze (1-based, same as `frame` for this bake). */
  masterFrame: number;
  kind: SnapPointKind;
  label: string;
  eyebrow: string;
  /** Typology lines — statue holds only. */
  lines: string[];
  /** Public URL for magnify-lens crop (statue gates only). */
  lensSrc?: string;
};

export type LabSnapTravel = {
  fromFrame: number;
  toFrame: number;
};

/** Phase B Blender master length — matches on-disk bake. */
export const PHASE_B_MASTER_FRAME_COUNT = 1200;

/** On-disk WebP count for lab snap travel / clamp. */
export const LAB_SNAP_FRAME_COUNT = JOURNEY_FRAME_COUNT;

/** ~24fps feel for travel duration (linear in bake frame index). */
export const LAB_SNAP_TRAVEL_FPS = 24;

function stop(
  partial: Omit<LabSnapPoint, 'frame'> & { masterFrame: number }
): LabSnapPoint {
  return {
    ...partial,
    frame: partial.masterFrame,
  };
}

/**
 * 9 stops from phase_b_restructure_report.json.
 * Freeze = mid-hold for statues; end-of-segment for travel-only passages.
 */
export const LAB_SNAP_POINTS: LabSnapPoint[] = [
  stop({
    id: 'lying-1',
    statueId: 'lying-hanuman',
    masterFrame: 310, // mid 271–350
    kind: 'statue',
    label: 'Lying Hanuman (visit 1)',
    eyebrow: 'LYING HANUMAN',
    lensSrc: '/lab/snap/lenses/01_lying_hanuman.png',
    lines: [
      'Before his lord, the mightiest of warriors',
      'chose to lie lowest of all.',
      'Strength that serves is stronger',
      'than strength that stands alone.',
    ],
  }),
  stop({
    id: 'standing-hanuman',
    statueId: 'standing-hanuman',
    masterFrame: 430, // mid 411–450
    kind: 'statue',
    label: 'Standing Hanuman',
    eyebrow: 'STANDING HANUMAN',
    lensSrc: '/lab/snap/lenses/02_standing_hanuman.png',
    lines: [
      'When time ran short and a life hung in balance,',
      'he did not search for the herb — he carried the mountain.',
      'Devotion does not calculate the easiest way.',
      'It finds the surest one.',
    ],
  }),
  stop({
    id: 'shiva',
    statueId: 'shiva',
    masterFrame: 530, // mid 511–550
    kind: 'statue',
    label: 'Shiva',
    eyebrow: 'SHIVA',
    lensSrc: '/lab/snap/lenses/03_shiva.png',
    lines: [
      'Ascetic on the mountain, dancer at the end of ages —',
      'Shiva holds both stillness and destruction in the same breath.',
      'What is destroyed is only ever making room',
      'for what comes next.',
    ],
  }),
  stop({
    id: 'radha-krishna',
    statueId: 'radha-krishna',
    masterFrame: 635, // mid 611–660
    kind: 'statue',
    label: 'Radha & Krishna',
    eyebrow: 'RADHA & KRISHNA',
    lensSrc: '/lab/snap/lenses/04_radha_krishna.png',
    lines: [
      'The flute calls, and distance stops mattering.',
      "Radha's longing became the oldest language of devotion.",
      'Not two lovers, but one truth',
      'wearing two forms.',
    ],
  }),
  stop({
    id: 'lying-2',
    statueId: 'lying-hanuman',
    masterFrame: 760, // mid 731–790
    kind: 'statue',
    label: 'Lying Hanuman (return)',
    eyebrow: 'LYING HANUMAN',
    lensSrc: '/lab/snap/lenses/01_lying_hanuman.png',
    lines: [
      'Among the immortals, he alone remains —',
      'still watching, still waiting, still whole.',
      'Some devotion was never meant to end.',
      'It simply keeps arriving.',
    ],
  }),
  stop({
    id: 'reverse-hall',
    statueId: 'passage',
    masterFrame: 910, // end 791–910
    kind: 'passage',
    label: 'Reverse hall',
    eyebrow: 'PASSAGE',
    lines: [],
  }),
  stop({
    id: 'reverse-threshold',
    statueId: 'passage',
    masterFrame: 970, // end 911–970
    kind: 'passage',
    label: 'Reverse threshold',
    eyebrow: 'PASSAGE',
    lines: [],
  }),
  stop({
    id: 'reverse-forecourt',
    statueId: 'passage',
    masterFrame: 1030, // end 971–1030
    kind: 'passage',
    label: 'Reverse forecourt',
    eyebrow: 'PASSAGE',
    lines: [],
  }),
  stop({
    id: 'entrance-sky-ascend',
    statueId: 'passage',
    masterFrame: 1200, // end 1031–1200
    kind: 'passage',
    label: 'Entrance sky ascend',
    eyebrow: 'PASSAGE',
    lines: [],
  }),
];

/** Travel segment arriving at `pointIndex` from the previous point (bake frames). */
export function travelInto(
  pointIndex: number,
  points: LabSnapPoint[] = LAB_SNAP_POINTS
): LabSnapTravel | null {
  if (pointIndex <= 0 || pointIndex >= points.length) return null;
  const prev = points[pointIndex - 1];
  const next = points[pointIndex];
  return { fromFrame: prev.frame, toFrame: next.frame };
}
