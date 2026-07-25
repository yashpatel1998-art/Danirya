'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { Logo3D } from '@/components/brand/Logo3D';
import { captureActiveTempleSnap } from '@/lib/lab/snap/templeSnapRestore';
import {
  playMarkSignatureEnter,
  prefersReducedMotion,
} from '@/lib/transition/playMarkSignature';
import styles from './RouteTransition.module.css';

gsap.registerPlugin(ScrollTrigger);

const EXIT_S = 0.42;

const BRIDGED = new Set(['/', '/apply', '/work', '/studio']);
/** Document exits from the temple — persist active snap stop for return restore. */
const TEMPLE_EXITS = new Set(['/apply', '/work', '/studio']);

type BridgeApi = {
  /** Play the logo veil, then navigate. */
  go: (href: string) => void;
};

function maybePersistTempleSnap(from: string, dest: string) {
  if (from !== '/') return;
  if (!TEMPLE_EXITS.has(dest)) return;
  captureActiveTempleSnap(dest);
}

const BridgeContext = createContext<BridgeApi | null>(null);

export function useRouteBridge(): BridgeApi | null {
  return useContext(BridgeContext);
}

function normalizePath(href: string): string | null {
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return url.pathname.replace(/\/$/, '') || '/';
  } catch {
    return null;
  }
}

function shouldBridge(from: string, to: string): boolean {
  if (from === to) return false;
  return BRIDGED.has(from) && BRIDGED.has(to);
}

/**
 * Near-black → Meshy 3D logo → arrive — route navigations only.
 * Do NOT fire on continuous-scroll section boundaries (that caused the
 * black-screen + logo flash while scrolling Work → Studio / Apply).
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const pendingEnterRef = useRef(false);
  const pathRef = useRef(pathname);
  const mountedRef = useRef(false);

  useEffect(() => {
    document.body.dataset.scrollChrome = pathname !== '/' ? 'branded' : 'lenis';
    document.body.dataset.pageTone = pathname === '/' ? 'temple' : 'document';
  }, [pathname]);

  // Phase 2 separate pages share one Lenis instance from the root layout.
  // Without a reset, leaving the temple at ~500vh lands /work mid-Jesko
  // (animation looks "gone") and returning home can reopen mid-film.
  useEffect(() => {
    if (!mountedRef.current) return;
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const smooth = (
      window as Window & {
        __lenis?: { scrollTo: (y: number, opts?: { immediate?: boolean }) => void };
      }
    ).__lenis;
    smooth?.scrollTo(0, { immediate: true });
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }, [pathname]);

  const playEnter = useCallback(() => {
    const overlay = overlayRef.current;
    const mark = markRef.current;
    if (!overlay || !mark) {
      busyRef.current = false;
      return;
    }

    playMarkSignatureEnter({
      overlay,
      mark,
      onComplete: () => {
        busyRef.current = false;
        // Jesko / section pins measure after the veil lifts.
        ScrollTrigger.refresh();
      },
    });
  }, []);

  const runExitThenNavigate = useCallback(
    (dest: string) => {
      if (busyRef.current) return;
      const from = pathRef.current.replace(/\/$/, '') || '/';
      // Mid-journey leave: capture live stop before the veil navigates away.
      maybePersistTempleSnap(from, dest);

      const overlay = overlayRef.current;
      const mark = markRef.current;

      if (!overlay || !mark || prefersReducedMotion()) {
        router.push(dest);
        return;
      }

      busyRef.current = true;
      pendingEnterRef.current = true;

      gsap
        .timeline({
          onComplete: () => {
            router.push(dest);
          },
        })
        .set(overlay, { autoAlpha: 1, pointerEvents: 'all' })
        .fromTo(
          overlay,
          { backgroundColor: 'rgba(0,0,0,0)' },
          {
            backgroundColor: 'rgba(8, 6, 4, 0.97)',
            duration: EXIT_S,
            ease: 'power2.inOut',
          }
        )
        .fromTo(
          mark,
          { opacity: 0, scaleX: 0.82, scaleY: 0.82 },
          {
            opacity: 0.9,
            scaleX: 1,
            scaleY: 1,
            duration: EXIT_S,
            ease: 'power2.out',
          },
          0.02
        );
    },
    [router]
  );

  const go = useCallback(
    (href: string) => {
      const to = normalizePath(href);
      if (!to) {
        router.push(href);
        return;
      }
      const from = pathRef.current.replace(/\/$/, '') || '/';
      const dest = to === '/' ? '/' : to;
      if (!shouldBridge(from, dest)) {
        router.push(dest);
        return;
      }
      runExitThenNavigate(dest);
    },
    [router, runExitThenNavigate]
  );

  const api = useMemo(() => ({ go }), [go]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      pathRef.current = pathname;
      return;
    }

    const prev = pathRef.current;
    pathRef.current = pathname;
    if (prev === pathname) return;

    if (pendingEnterRef.current) {
      pendingEnterRef.current = false;
      playEnter();
    }
  }, [pathname, playEnter]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest?.('a');
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;
      if (anchor.getAttribute('data-bridge') === 'off') return;

      const hrefAttr = anchor.getAttribute('href');
      if (!hrefAttr || hrefAttr.startsWith('#')) return;
      if (hrefAttr.startsWith('mailto:') || hrefAttr.startsWith('tel:')) return;

      const to = normalizePath(hrefAttr);
      if (!to) return;

      const from = pathRef.current.replace(/\/$/, '') || '/';
      if (!shouldBridge(from, to)) return;

      event.preventDefault();
      event.stopPropagation();
      go(to === '/' ? '/' : to);
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [go]);

  return (
    <BridgeContext.Provider value={api}>
      {children}
      <div
        ref={overlayRef}
        className={styles.overlay}
        data-mark-signature
        aria-hidden
      >
        <div ref={markRef} className={styles.mark}>
          <Logo3D variant="hero" spin={0.55} className={styles.logo3d} />
        </div>
      </div>
    </BridgeContext.Provider>
  );
}
