import { TEMPLE_STILLS_DIR, type TempleStill } from '@/lib/work/templeCaseStudy';

/**
 * Studio discipline tabs — labels match real process stills (Material / Light / Structure).
 * No invented service taxonomy; these are the craft axes already in the case study.
 */
export type StudioDiscipline = {
  id: string;
  label: string;
  body: string;
  still: TempleStill;
};

export const STUDIO_DISCIPLINES: readonly StudioDiscipline[] = [
  {
    id: 'material',
    label: 'Material',
    body:
      'Stone, metal, and inlay held to the same standard as code — surfaces that carry weight, not decoration. Close framing on the cracked-stone mark is how we judge material honesty.',
    still: {
      src: `${TEMPLE_STILLS_DIR}/detail_logo_closeup.png`,
      alt: 'Cracked-stone D with gold inlay close-up',
      caption: 'Material',
    },
  },
  {
    id: 'light',
    label: 'Light',
    body:
      'Torch fire and ambient falloff shape every hold. Light is paced with the camera — warm where the eye should rest, restrained where the path must keep moving.',
    still: {
      src: `${TEMPLE_STILLS_DIR}/detail_torch_flame.png`,
      alt: 'Torch flame against temple architecture',
      caption: 'Light',
    },
  },
  {
    id: 'structure',
    label: 'Structure',
    body:
      'Columns, bays, and thresholds are the scroll’s skeleton. Structure decides when the visitor pauses, turns, and continues — the same logic as information architecture.',
    still: {
      src: `${TEMPLE_STILLS_DIR}/detail_column_hall.png`,
      alt: 'Hall column and torch metal detail',
      caption: 'Structure',
    },
  },
] as const;
