/** Danirya Temple — single Work case study (real build stills). */

export const TEMPLE_STILLS_DIR = '/assets/temple-stills';

export type TempleStill = {
  src: string;
  alt: string;
  caption: string;
};

export const TEMPLE_CASE = {
  id: 'danirya-temple',
  category: 'Digital Experience',
  title: 'Danirya Temple',
  subtitle: 'Digital Experience',
  outcome:
    'A scroll-driven temple walkthrough — architecture, light, and brand as one continuous film.',
  detail:
    'Built end-to-end as Danirya Studio’s flagship: path-camera cinematography, room pacing, and a post-temple document that continues the same scroll. This case study uses stills from the production Blender scene.',
} as const;

/** Full-bleed Work hero — wide Sanctuary room (not logo macro). */
export const TEMPLE_HERO: TempleStill = {
  src: `${TEMPLE_STILLS_DIR}/room_sanctuary_wide.png`,
  alt: 'Sanctuary room with Danirya D on the pedestal, torches, and night sky',
  caption: 'Sanctuary',
};

/** Scroll-reveal sequence below the hero (not shown all at once on load). */
export const TEMPLE_SEQUENCE: TempleStill[] = [
  {
    src: `${TEMPLE_STILLS_DIR}/room_forecourt_f0040.png`,
    alt: 'Temple forecourt pylons under a starry sky',
    caption: 'Forecourt',
  },
  {
    src: `${TEMPLE_STILLS_DIR}/room_threshold_f0140.png`,
    alt: 'Threshold looking toward the hall and sanctuary',
    caption: 'Threshold',
  },
  {
    src: `${TEMPLE_STILLS_DIR}/room_hall_f0270.png`,
    alt: 'Hall torch light and pylons',
    caption: 'Hall',
  },
  {
    src: `${TEMPLE_STILLS_DIR}/room_chapel_f0360.png`,
    alt: 'Chapel corridor between pylons',
    caption: 'Chapel',
  },
  {
    src: `${TEMPLE_STILLS_DIR}/detail_logo_torch.png`,
    alt: 'Hero logo beside sanctuary torch flame',
    caption: 'Logo & torch',
  },
  {
    src: `${TEMPLE_STILLS_DIR}/room_sanctuary_hero_f0720.png`,
    alt: 'Monument lookback on the cracked-stone D',
    caption: 'Sanctuary monument',
  },
];

/** Studio — process & craft stills (same production scene, detail cameras). */
export const TEMPLE_PROCESS: TempleStill[] = [
  {
    src: `${TEMPLE_STILLS_DIR}/detail_logo_closeup.png`,
    alt: 'Cracked-stone D with gold inlay close-up',
    caption: 'Material',
  },
  {
    src: `${TEMPLE_STILLS_DIR}/detail_torch_flame.png`,
    alt: 'Torch flame against temple architecture',
    caption: 'Light',
  },
  {
    src: `${TEMPLE_STILLS_DIR}/detail_column_hall.png`,
    alt: 'Hall column and torch metal detail',
    caption: 'Structure',
  },
];
