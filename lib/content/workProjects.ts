/**
 * Work section project catalog.
 *
 * PLACEHOLDER CONTENT — replace entries in `workProjects` only.
 */

export type WorkProject = {
  id: string;
  bay: number;
  name: string;
  outcome: string;
  category: string;
  /** Longer case-study body (placeholder until real copy). */
  detail: string;
  /** Optional visual tone for thumbnail darkness→light. */
  accent?: string;
};

export const workProjects: readonly WorkProject[] = [
  {
    id: 'work-01',
    bay: 0,
    name: '[PLACEHOLDER PROJECT NAME]',
    outcome: '[placeholder one-line outcome]',
    category: '[placeholder category]',
    detail:
      '[PLACEHOLDER] A short case narrative — challenge, approach, and the quiet result. Replace before submission.',
    accent: '#2a241c',
  },
  {
    id: 'work-02',
    bay: 1,
    name: '[PLACEHOLDER PROJECT NAME]',
    outcome: '[placeholder one-line outcome]',
    category: '[placeholder category]',
    detail:
      '[PLACEHOLDER] A short case narrative — challenge, approach, and the quiet result. Replace before submission.',
    accent: '#1f1a14',
  },
  {
    id: 'work-03',
    bay: 2,
    name: '[PLACEHOLDER PROJECT NAME]',
    outcome: '[placeholder one-line outcome]',
    category: '[placeholder category]',
    detail:
      '[PLACEHOLDER] A short case narrative — challenge, approach, and the quiet result. Replace before submission.',
    accent: '#262019',
  },
  {
    id: 'work-04',
    bay: 3,
    name: '[PLACEHOLDER PROJECT NAME]',
    outcome: '[placeholder one-line outcome]',
    category: '[placeholder category]',
    detail:
      '[PLACEHOLDER] A short case narrative — challenge, approach, and the quiet result. Replace before submission.',
    accent: '#221c16',
  },
] as const;
