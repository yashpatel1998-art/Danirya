import type { StageEnvelope } from '@/types/animation';
import { easeOutCubic } from '@/lib/animation/easing';
import { clamp } from '@/lib/utils/clamp';

export function stageEnvelope(
  progress: number,
  { enterStart, enterEnd, exitStart, exitEnd }: StageEnvelope
): number {
  if (progress <= enterStart) return 0;
  if (progress < enterEnd) {
    return easeOutCubic((progress - enterStart) / (enterEnd - enterStart));
  }
  if (progress <= exitStart) return 1;
  if (progress < exitEnd) {
    return 1 - easeOutCubic((progress - exitStart) / (exitEnd - exitStart));
  }
  return 0;
}

export function envelopeToOpacity(envelope: number): {
  opacity: number;
  translateY: number;
  blur: number;
} {
  return {
    opacity: envelope,
    translateY: 16 * (1 - envelope),
    blur: 5 * (1 - envelope),
  };
}
