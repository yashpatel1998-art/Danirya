/** Shared options for apply form. */

export const MIN_DETAILS = 50;

/** Budget dropdown — labels match the clean reference form. */
export const BUDGETS = [
  '$0-$1k - Basic',
  '$1k-$3k - Intermediate',
  '$3k-$5k - Professional',
  '$5k-$10k - Advanced',
  '$10k-$20k - Award winning',
  '$20k+',
] as const;

export const TIMELINES = [
  'ASAP',
  'Within 30 days',
  '1-2 months',
  'Just researching right now',
  'Flexible',
] as const;

export type FaqItem = { q: string; a: string };

/** FAQ below the form (not inside the form card). */
export const FAQ_ITEMS: FaqItem[] = [
  {
    q: 'What happens after I apply?',
    a: "I read it myself and reply within 24 hours if it's a fit.",
  },
  {
    q: 'How much does it cost?',
    a: 'Every project is different, so I quote after I understand what you need.',
  },
  {
    q: 'How long does it take?',
    a: "Depends on the project. You'll get a real timeline once we talk.",
  },
  {
    q: 'Do you work with small businesses?',
    a: 'Yes. What matters is the idea, not the size.',
  },
];
