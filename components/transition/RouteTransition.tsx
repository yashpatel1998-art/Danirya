'use client';

import { gsap } from 'gsap';
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
import {
  playMarkSignatureEnter,
  prefersReducedMotion,
} from '@/lib/transition/playMarkSignature';
import styles from './RouteTransition.module.css';

const MARK_SRC = '/brand/danirya-mark.png';
const EXIT_S = 0.42;

const BRIDGED = new Set(['/', '/apply', '/work']);

type BridgeApi = {
  /** Play the logo veil, then navigate. */
  go: (href: string) => void;
};

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
 * Near-black → gold logo mark → arrive — route navigations only.
 * Do NOT fire on continuous-scroll section boundaries (that caused the
 * black-screen + logo flash while scrolling Work → Studio / Apply).
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLImageElement>(null);
  const busyRef = useRef(false);
  const pendingEnterRef = useRef(false);
  const pathRef = useRef(pathname);
  const mountedRef = useRef(false);

  useEffect(() => {
    document.body.dataset.scrollChrome = pathname !== '/' ? 'branded' : 'lenis';
    document.body.dataset.pageTone = pathname === '/' ? 'temple' : 'document';
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
      },
    });
  }, []);

  const runExitThenNavigate = useCallback(
    (dest: string) => {
      if (busyRef.current) return;
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={markRef}
          src={MARK_SRC}
          alt=""
          width={280}
          height={280}
          className={styles.mark}
          draggable={false}
        />
      </div>
    </BridgeContext.Provider>
  );
}
