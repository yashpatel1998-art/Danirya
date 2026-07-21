'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Logo3D } from '@/components/brand/Logo3D';
import { loadLogoTemplate } from '@/lib/brand/loadLogoGltf';
import { prefersReducedMotion } from '@/lib/motion/prefersReducedMotion';
import { TEMPLE_CASE, TEMPLE_HERO } from '@/lib/work/templeCaseStudy';
import styles from './JeskoReveal.module.css';

gsap.registerPlugin(ScrollTrigger);

/**
 * Short Jesko bridge after the temple (does not wrap the long document).
 * Logo flies out; the real Work page surface opens from a small center dot.
 * Background = document beige + real case hero — not a fake landscape.
 */
export function JeskoReveal() {
  const trackRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const logoWrapRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    void loadLogoTemplate().catch(() => {});

    const track = trackRef.current;
    const pin = pinRef.current;
    const page = pageRef.current;
    const logoWrap = logoWrapRef.current;
    if (!track || !pin || !page || !logoWrap) return;

    const mm = gsap.matchMedia();

    mm.add('(min-width: 721px)', () => {
      if (prefersReducedMotion()) {
        gsap.set(logoWrap, { autoAlpha: 0 });
        page.style.clipPath = 'none';
        return;
      }

      const proxy = { r: 0 };
      const setClip = (r: number) => {
        const cx = pin.clientWidth * 0.5;
        const cy = pin.clientHeight * 0.48;
        const rEnd =
          Math.hypot(
            Math.max(cx, pin.clientWidth - cx),
            Math.max(cy, pin.clientHeight - cy)
          ) + 24;
        page.style.clipPath = `circle(${Math.min(rEnd, Math.max(0, r))}px at ${cx}px ${cy}px)`;
        return rEnd;
      };

      let rEnd = setClip(0);
      gsap.set(logoWrap, {
        xPercent: -50,
        yPercent: -50,
        scale: 1,
        autoAlpha: 1,
        force3D: true,
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: track,
          start: 'top top',
          end: 'bottom top',
          pin,
          scrub: 0.45,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: () => {
            rEnd = setClip(proxy.r);
          },
        },
      });

      // Logo flies through — leaves viewport (Jesko)
      tl.fromTo(
        logoWrap,
        { scale: 1, autoAlpha: 1 },
        { scale: 14, ease: 'none', duration: 0.5, force3D: true },
        0
      );
      tl.to(logoWrap, { autoAlpha: 0, ease: 'none', duration: 0.18 }, 0.38);
      tl.set(logoWrap, { visibility: 'hidden' }, 0.52);

      // Page opens from a tiny center dot
      tl.call(
        () => {
          proxy.r = 3;
          setClip(3);
        },
        undefined,
        0.52
      );
      tl.to(
        proxy,
        {
          r: () => rEnd,
          ease: 'none',
          duration: 0.36,
          onUpdate: () => setClip(proxy.r),
        },
        0.52
      );
      tl.set(page, { clipPath: 'none' }, 0.92);

      const refresh = () => {
        ScrollTrigger.refresh();
        (
          window as Window & { __lenis?: { resize: () => void } }
        ).__lenis?.resize();
      };
      requestAnimationFrame(refresh);
      const t1 = window.setTimeout(refresh, 200);
      const t2 = window.setTimeout(refresh, 800);

      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
        tl.scrollTrigger?.kill();
        tl.kill();
      };
    });

    mm.add('(max-width: 720px)', () => {
      gsap.set(logoWrap, { autoAlpha: 0 });
      page.style.clipPath = 'none';
    });

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={trackRef}
      className={styles.track}
      aria-label="Open the work"
    >
      <div ref={pinRef} className={styles.pin}>
        {/* Real document surface — same beige Work page language, not a fake sky */}
        <div ref={pageRef} className={styles.page}>
          <div className={styles.heroBg}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={TEMPLE_HERO.src}
              alt=""
              className={styles.heroImg}
              width={1920}
              height={1080}
              decoding="async"
            />
            <div className={styles.heroScrim} aria-hidden />
          </div>
          <div className={styles.heroCopy}>
            <p className={styles.heroCategory}>{TEMPLE_CASE.category}</p>
            <h2 className={styles.heroTitle}>{TEMPLE_CASE.title}</h2>
            <p className={styles.heroSubtitle}>{TEMPLE_CASE.subtitle}</p>
          </div>
        </div>

        <div ref={logoWrapRef} className={styles.logoWrap} aria-hidden>
          <Logo3D variant="hero" spin={0} spinAxis="y" className={styles.logo} />
        </div>
      </div>
    </section>
  );
}
