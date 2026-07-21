'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HangingPlacard } from '@/components/museum/HangingPlacard';
import { CaseStudyGallery } from '@/components/gallery/CaseStudyGallery';
import { useDepthParallax } from '@/hooks/useDepthParallax';
import { useTypoCascade } from '@/hooks/useTypoCascade';
import { prefersReducedMotion } from '@/lib/motion/prefersReducedMotion';
import { HERO_SCRUB_LAG } from '@/lib/hero/heroCinematicChapters';
import { GALLERY_JESKO } from '@/lib/work/galleryJesko';
import {
  TEMPLE_CASE,
  TEMPLE_HERO,
  TEMPLE_SEQUENCE,
} from '@/lib/work/templeCaseStudy';
import styles from './Gallery.module.css';

gsap.registerPlugin(ScrollTrigger);

/**
 * Work hero (sanctuary D page) → Jesko zoom through the logo →
 * Case Study opens from a growing center dot.
 */
export function Gallery() {
  const sectionRef = useRef<HTMLElement>(null);
  const jeskoTrackRef = useRef<HTMLDivElement>(null);
  const jeskoPinRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const heroBgRef = useRef<HTMLDivElement>(null);
  const heroTitleRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const headerBlockRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  useDepthParallax({
    fastRef: heroTitleRef,
    slowRef: heroBgRef,
    triggerRef: jeskoTrackRef,
    amount: 48,
    scrub: true,
  });

  useDepthParallax({
    fastRef: panelRef,
    slowRef: headerBlockRef,
    triggerRef: sectionRef,
    amount: 36,
    scrub: true,
  });

  useTypoCascade(headerRef, {
    start: 'top 80%',
    end: '+=50%',
    stagger: 0.42,
  });

  useTypoCascade(footerRef, {
    start: 'top 88%',
    end: '+=25%',
    stagger: 0.35,
  });

  useLayoutEffect(() => {
    const track = jeskoTrackRef.current;
    const pin = jeskoPinRef.current;
    const page = pageRef.current;
    const reveal = revealRef.current;
    if (!track || !pin || !page || !reveal) return;

    const mm = gsap.matchMedia();

    mm.add('(min-width: 721px)', () => {
      if (prefersReducedMotion()) {
        reveal.style.clipPath = 'none';
        gsap.set(page, { autoAlpha: 0 });
        return;
      }

      const { holdEnd, zoomEnd, stageScaleEnd, transformOrigin, clipStartPx } =
        GALLERY_JESKO;

      const clip = { r: 0 };
      let cx = 0;
      let cy = 0;
      let rEnd = 1;

      const measure = () => {
        const parts = transformOrigin.split(' ').map((p) => parseFloat(p));
        const ox = Number.isFinite(parts[0]) ? parts[0] / 100 : 0.5;
        const oy = Number.isFinite(parts[1]) ? parts[1] / 100 : 0.46;
        cx = pin.clientWidth * ox;
        cy = pin.clientHeight * oy;
        rEnd =
          Math.hypot(
            Math.max(cx, pin.clientWidth - cx),
            Math.max(cy, pin.clientHeight - cy)
          ) + 24;
      };

      const setClip = (r: number) => {
        reveal.style.clipPath = `circle(${Math.max(0, r)}px at ${cx}px ${cy}px)`;
      };

      measure();
      setClip(0);
      gsap.set(page, {
        transformOrigin,
        scale: 1,
        autoAlpha: 1,
        force3D: true,
        visibility: 'visible',
      });
      gsap.set(reveal, { autoAlpha: 1 });

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: track,
          pin,
          start: 'top top',
          end: 'bottom bottom',
          scrub: HERO_SCRUB_LAG,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: () => {
            measure();
            if (clip.r > 0 && clip.r < rEnd * 0.98) setClip(clip.r);
          },
        },
      });

      // Hold the sanctuary page (uploaded composition)
      tl.to({}, { duration: holdEnd }, 0);

      // Whole page zooms through the 3D D
      tl.fromTo(
        page,
        { scale: 1, autoAlpha: 1 },
        {
          scale: stageScaleEnd,
          ease: 'none',
          duration: zoomEnd - holdEnd,
          force3D: true,
        },
        holdEnd
      );
      tl.to(
        page,
        {
          autoAlpha: 0,
          ease: 'none',
          duration: (zoomEnd - holdEnd) * 0.35,
        },
        holdEnd + (zoomEnd - holdEnd) * 0.62
      );
      tl.set(page, { visibility: 'hidden' }, zoomEnd);

      // Case Study opens from a tiny center dot
      tl.call(
        () => {
          measure();
          clip.r = clipStartPx;
          setClip(clipStartPx);
        },
        undefined,
        zoomEnd
      );
      tl.to(
        clip,
        {
          r: () => {
            measure();
            return rEnd;
          },
          ease: 'none',
          duration: 1 - zoomEnd,
          onUpdate: () => {
            measure();
            setClip(clip.r);
          },
        },
        zoomEnd
      );
      tl.set(reveal, { clipPath: 'none' }, 0.98);

      return () => {
        tl.scrollTrigger?.kill();
        tl.kill();
        page.style.cssText = '';
        reveal.style.clipPath = '';
      };
    });

    mm.add('(max-width: 720px)', () => {
      reveal.style.clipPath = 'none';
      gsap.set(page, { clearProps: 'all' });
    });

    return () => mm.revert();
  }, []);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const imgs = section.querySelectorAll('img');
    const refresh = () => ScrollTrigger.refresh();
    imgs.forEach((img) => {
      if (!img.complete) img.addEventListener('load', refresh, { once: true });
    });
    refresh();
    return () => {
      imgs.forEach((img) => img.removeEventListener('load', refresh));
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={styles.room}
      aria-label="Work"
      data-room="gallery"
      id="work"
    >
      <div ref={panelRef} className={styles.atmosphere} aria-hidden />

      <div ref={jeskoTrackRef} className={styles.jeskoTrack}>
        <div ref={jeskoPinRef} className={styles.jeskoPin}>
          {/* Upcoming section — grows from a center dot after the logo fly-through */}
          <div ref={revealRef} className={styles.jeskoReveal}>
            <div className={styles.revealInner}>
              <header ref={headerRef} className={styles.header}>
                <p className={styles.label}>Selected Work</p>
                <div ref={headerBlockRef} className={styles.headerTitleBlock}>
                  <h2 className={styles.title}>Case Study</h2>
                </div>
                <p className={styles.lede}>{TEMPLE_CASE.outcome}</p>
                <p className={styles.detail}>{TEMPLE_CASE.detail}</p>
              </header>
            </div>
          </div>

          {/* Sanctuary page from your screenshot — zooms through the 3D D */}
          <div ref={pageRef} className={styles.jeskoPage}>
            <HangingPlacard
              title="WORK"
              descriptor="Danirya Temple"
              start="top top"
            />
            <div
              ref={heroRef}
              className={`${styles.hero} ${styles.heroJesko}`}
              data-cursor="view"
              data-cursor-label="View"
            >
              <div ref={heroBgRef} className={styles.heroBg}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={TEMPLE_HERO.src}
                  alt={TEMPLE_HERO.alt}
                  className={styles.heroImg}
                  width={1920}
                  height={1080}
                  decoding="async"
                />
              </div>
              <div className={styles.heroScrim} aria-hidden />
              <div ref={heroTitleRef} className={styles.heroCopy}>
                <p className={styles.heroCategory}>
                  {TEMPLE_CASE.category}
                </p>
                <h2 className={styles.heroTitle}>{TEMPLE_CASE.title}</h2>
                <p className={styles.heroSubtitle}>
                  {TEMPLE_CASE.subtitle}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.inner}>
        <CaseStudyGallery stills={TEMPLE_SEQUENCE} />

        <div ref={footerRef} className={styles.footerTypo}>
          <a
            href="#studio"
            className={styles.workCta}
            data-typo="wipe"
            data-magnetic
            data-cursor="enter"
            data-cursor-label="Enter"
          >
            Continue to Studio
          </a>
        </div>
      </div>
    </section>
  );
}
