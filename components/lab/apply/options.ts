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
    q: 'What does Gilt Foundry specialize in?',
    a: 'We design and build immersive, premium websites. Cinematic 3D, motion and interaction, crafted to make your brand impossible to ignore. Design, 3D and development all happen under one roof.',
  },
  {
    q: 'How do you work with my preferences?',
    a: "Every project starts with your goals, your audience and the sites you love. We share the direction early and you approve each stage before we move on, so the result feels like your brand, not ours.",
  },
  {
    q: 'Can we work together after launch?',
    a: 'Yes. We can stay on for updates, new pages and improvements as your business grows.',
  },
  {
    q: 'Can you move faster than normal?',
    a: "Often, yes. If you have a launch date, mention it in your application and we'll tell you honestly whether we can hit it.",
  },
  {
    q: 'What if I need a more complex build?',
    a: "That's where we do our best work. Custom 3D, interactive experiences and integrations are scoped individually, so you get a clear plan before anything starts.",
  },
  {
    q: 'Do you help with hosting, domains, and launch?',
    a: 'Yes. We handle deployment, connect your domain and make sure everything runs smoothly on launch day.',
  },
];
