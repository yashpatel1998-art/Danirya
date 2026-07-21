import { gsap } from 'gsap';

const ENTER_S = 0.4;

/** Same reduced-motion gate used by RouteTransition. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

type MarkTargets = {
  overlay: HTMLElement;
  mark: HTMLElement;
  onComplete?: () => void;
};

/**
 * Exact RouteTransition enter beat: near-black veil + mark scale/opacity
 * (from ~0.88 visual language with drop-shadow on the mark CSS).
 */
export function playMarkSignatureEnter({
  overlay,
  mark,
  onComplete,
}: MarkTargets): gsap.core.Timeline | null {
  if (prefersReducedMotion()) {
    gsap.set(overlay, {
      autoAlpha: 0,
      pointerEvents: 'none',
      backgroundColor: 'rgba(0,0,0,0)',
    });
    gsap.set(mark, { opacity: 0, scaleX: 0.88, scaleY: 0.88 });
    onComplete?.();
    return null;
  }

  return gsap
    .timeline({ onComplete })
    .set(overlay, {
      autoAlpha: 1,
      pointerEvents: 'all',
      backgroundColor: 'rgba(8, 6, 4, 0.97)',
    })
    .fromTo(
      mark,
      { opacity: 0.55, scaleX: 0.92, scaleY: 0.92 },
      {
        opacity: 0.85,
        scaleX: 1.04,
        scaleY: 1.04,
        duration: 0.14,
        ease: 'power2.out',
      }
    )
    .to(
      mark,
      {
        opacity: 0,
        scaleX: 1.12,
        scaleY: 1.12,
        duration: ENTER_S,
        ease: 'power2.inOut',
      },
      '+=0.06'
    )
    .to(
      overlay,
      {
        autoAlpha: 0,
        backgroundColor: 'rgba(0,0,0,0)',
        duration: ENTER_S,
        ease: 'power2.inOut',
        pointerEvents: 'none',
      },
      '<'
    );
}
