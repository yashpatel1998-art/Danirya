export type Exhibit = {
  id: string;
  number: string;
  title: string;
  /** One-line outcome — restrained Work presentation */
  outcome: string;
};

export const GALLERY_EXHIBITS: readonly Exhibit[] = [
  {
    id: 'monument',
    number: '01',
    title: 'Project Monument',
    outcome: 'Cinematic scroll that feels like arrival.',
  },
  {
    id: 'spatial',
    number: '02',
    title: 'Spatial Brand Systems',
    outcome: 'Architecture, motion, and light as one system.',
  },
  {
    id: 'luxury',
    number: '03',
    title: 'Luxury Digital Presence',
    outcome: 'Editorial web with quiet, premium interaction.',
  },
  {
    id: 'motion',
    number: '04',
    title: 'Product Motion Studies',
    outcome: 'Filmic product animation with material craft.',
  },
] as const;
