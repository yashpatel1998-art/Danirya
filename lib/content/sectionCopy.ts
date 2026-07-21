/**
 * Locked / section copy for journey typography overlays.
 * Work project rows live in `workProjects.ts` (placeholder catalog).
 */

export const HERO_COPY = {
  wordmark: 'DANIRYA STUDIO',
  /** Final positioning — not placeholder. */
  positioning: 'Premium digital craftsmanship for ambitious brands.',
} as const;

export const WORK_SECTION_COPY = {
  title: 'WORK',
  intro: 'Danirya Temple — digital experience, built as the studio’s flagship case study.',
} as const;

export const STUDIO_SECTION_COPY = {
  title: 'STUDIO',
  /** Matches baked Work plaque language: title + short descriptor. */
  descriptor: 'Process & craft',
  philosophy:
    'We build digital presence as architecture — path, light, and material in one continuous system. The temple is how we work: deliberate framing, quiet motion, nothing decorative without purpose.',
} as const;

export const SANCTUARY_COPY = {
  emailLabel: 'Enquiries',
  email: 'hello@daniryastudio.com',
  /** Final CTA — not placeholder. */
  cta: 'Begin Your Project',
  /** In-page continuous scroll — not a hard route cut. */
  ctaHref: '/#apply',
} as const;
