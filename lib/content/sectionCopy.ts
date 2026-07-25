/**
 * Locked / section copy for journey typography overlays.
 * Work project rows live in `workProjects.ts`.
 */

import { BRAND } from '@/lib/content/brand';

export const HERO_COPY = {
  wordmark: BRAND.nameUpper,
  positioning: BRAND.tagline,
} as const;

export const WORK_SECTION_COPY = {
  title: 'WORK',
  intro: `${BRAND.name} Temple — digital experience, built as the studio’s flagship case study.`,
} as const;

export const STUDIO_SECTION_COPY = {
  title: 'STUDIO',
  descriptor: 'Process & craft',
  philosophy:
    'We build digital presence as architecture — path, light, and material in one continuous system. The temple is how we work: deliberate framing, quiet motion, nothing decorative without purpose.',
} as const;

export const SANCTUARY_COPY = {
  emailLabel: 'Enquiries',
  email: BRAND.email,
  cta: 'Begin Your Project',
} as const;
