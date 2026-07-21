/** Temple-themed loader stages — arrival story, not a spinner. */
export const LOADER_STAGES = [
  {
    id: 'prepare',
    min: 0,
    max: 0.35,
    text: 'Preparing the temple…',
    emphasis: false,
  },
  {
    id: 'gateway',
    min: 0.35,
    max: 0.75,
    text: 'The gateway opens.',
    emphasis: false,
  },
  {
    id: 'enter',
    min: 0.75,
    max: 1,
    text: 'Enter when ready.',
    emphasis: true,
  },
] as const;

export function loaderStageIndex(progress: number): number {
  const p = Math.max(0, Math.min(1, progress));
  if (p < 0.35) return 0;
  if (p < 0.75) return 1;
  return 2;
}
