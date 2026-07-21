'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Application } from '@/components/application/Application';
import { Logo3D } from '@/components/brand/Logo3D';
import { Gallery } from '@/components/gallery/Gallery';
import {
  NestApplicationPanel,
  NestCasePanel,
  NestStudioPanel,
} from '@/components/nest/NestPanels';
import { Studio } from '@/components/studio/Studio';
import { loadLogoTemplate } from '@/lib/brand/loadLogoGltf';
import {
  NEST_CLIP_START_PX,
  NEST_IRIS_CONTENT_ZOOM,
  NEST_IRIS_GATES,
  NEST_LOGO_ZOOM,
  NEST_MOBILE_MAX,
  NEST_PAGE_ZOOM,
  NEST_SCROLL,
  NEST_STACK_GATES,
} from '@/lib/nest/nestedStackConfig';
import { prefersReducedMotion } from '@/lib/motion/prefersReducedMotion';
import styles from './NestedStack.module.css';

gsap.registerPlugin(ScrollTrigger);

export type NestedStackProps = {
  /** Lab chrome banner for /lab scratch route. */
  labChrome?: boolean;
};

/**
 * Live + lab nested stack (Lenis via root SmoothScroll).
 *
 * Desktop: logo fly-through → Case Study from small dot → Studio → Application.
 * Mobile ≤720px: plain vertical Gallery → Studio → Application.
 * Does not touch Hero temple / wave / inscriptions.
 */
export function NestedStack({ labChrome = false }: NestedStackProps) {
  const irisTrackRef = useRef<HTMLElement>(null);
  const irisPinRef = useRef<HTMLDivElement>(null);
  const irisZoomRef = useRef<HTMLDivElement>(null);
  const irisLogoWrapRef = useRef<HTMLDivElement>(null);
  const irisHintRef = useRef<HTMLParagraphElement>(null);
  const irisCaseRef = useRef<HTMLDivElement>(null);
  const irisCaseInnerRef = useRef<HTMLDivElement>(null);

  const stackTrackRef = useRef<HTMLElement>(null);
  const stackPinRef = useRef<HTMLDivElement>(null);
  const caseRef = useRef<HTMLDivElement>(null);
  const studioRef = useRef<HTMLDivElement>(null);
  const applicationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.dataset.scrollChrome = 'lenis';
    if (labChrome) document.body.dataset.pageTone = 'lab';
    else document.body.dataset.pageTone = 'document';
    void loadLogoTemplate().catch(() => {});
    return () => {
      delete document.body.dataset.pageTone;
    };
  }, [labChrome]);

  useLayoutEffect(() => {
    const irisTrack = irisTrackRef.current;
    const irisPin = irisPinRef.current;
    const irisZoom = irisZoomRef.current;
    const irisLogoWrap = irisLogoWrapRef.current;
    const irisHint = irisHintRef.current;
    const irisCase = irisCaseRef.current;
    const irisCaseInner = irisCaseInnerRef.current;
    const stackTrack = stackTrackRef.current;
    const stackPin = stackPinRef.current;
    const casePanel = caseRef.current;
    const studio = studioRef.current;
    const application = applicationRef.current;
    if (
      !irisTrack ||
      !irisPin ||
      !irisZoom ||
      !irisLogoWrap ||
      !irisCase ||
      !irisCaseInner ||
      !stackTrack ||
      !stackPin ||
      !casePanel ||
      !studio ||
      !application
    ) {
      return;
    }

    const mm = gsap.matchMedia();

    mm.add(`(min-width: ${NEST_MOBILE_MAX + 1}px)`, () => {
      const reduced = prefersReducedMotion();
      const timelines: gsap.core.Timeline[] = [];

      gsap.set(stackTrack, { autoAlpha: 0, pointerEvents: 'none' });
      gsap.set(casePanel, {
        xPercent: 0,
        yPercent: 0,
        scale: 1,
        autoAlpha: 1,
        force3D: true,
      });
      gsap.set(studio, { xPercent: 112, autoAlpha: 0, scale: 1, force3D: true });
      gsap.set(application, {
        yPercent: 115,
        autoAlpha: 0,
        scale: 1,
        force3D: true,
      });

      const LOGO_CX = 0.5;
      const LOGO_CY = 0.48;

      const measureClip = () => {
        const pinW = irisPin.clientWidth;
        const pinH = irisPin.clientHeight;
        const caseW = irisCase.clientWidth;
        const caseH = irisCase.clientHeight;
        const insetX = irisCase.offsetLeft;
        const insetY = irisCase.offsetTop;
        const cx = pinW * LOGO_CX - insetX;
        const cy = pinH * LOGO_CY - insetY;
        const rEnd =
          Math.hypot(
            Math.max(cx, caseW - cx),
            Math.max(cy, caseH - cy)
          ) + 12;
        return { cx, cy, rEnd };
      };

      let { cx, cy, rEnd } = measureClip();
      const rStart = NEST_CLIP_START_PX;

      const setClip = (r: number) => {
        irisCase.style.clipPath = `circle(${Math.max(0, r)}px at ${cx}px ${cy}px)`;
        irisCase.dataset.clipR = String(r);
      };

      setClip(0);
      gsap.set(irisCase, { autoAlpha: 0 });

      gsap.set(irisZoom, {
        scale: NEST_PAGE_ZOOM.start,
        autoAlpha: 1,
        transformOrigin: '50% 48%',
        force3D: true,
        visibility: 'visible',
      });
      gsap.set(irisLogoWrap, {
        xPercent: -50,
        yPercent: -50,
        scale: NEST_LOGO_ZOOM.start,
        autoAlpha: 1,
        force3D: true,
        visibility: 'visible',
      });
      gsap.set(irisCaseInner, {
        scale: NEST_IRIS_CONTENT_ZOOM.start,
        transformOrigin: '50% 48%',
        force3D: true,
      });
      if (irisHint) gsap.set(irisHint, { autoAlpha: 1 });

      if (reduced) {
        setClip(rEnd);
        gsap.set(irisCase, { autoAlpha: 1 });
        gsap.set(irisZoom, { autoAlpha: 0, scale: 1 });
        gsap.set(irisLogoWrap, { autoAlpha: 0, scale: 1 });
        gsap.set(irisCaseInner, { scale: 1 });
        if (irisHint) gsap.set(irisHint, { autoAlpha: 0 });
        gsap.set(stackTrack, { autoAlpha: 1, pointerEvents: 'auto' });
        gsap.set(studio, { xPercent: 0, autoAlpha: 1 });
        gsap.set(application, { yPercent: 0, autoAlpha: 1 });
        return () => {
          timelines.forEach((tl) => {
            tl.scrollTrigger?.kill();
            tl.kill();
          });
        };
      }

      const { flyEnd, revealEnd, caseBreatheEnd } = NEST_IRIS_GATES;
      const flyDur = flyEnd;
      const revealDur = revealEnd - flyEnd;
      const breatheDur = caseBreatheEnd - revealEnd;
      const irisProxy = { r: 0 };

      const showStack = () => {
        gsap.set(stackTrack, { autoAlpha: 1, pointerEvents: 'auto' });
        gsap.set(irisCase, { autoAlpha: 0 });
      };
      const keepStackHidden = () => {
        gsap.set(stackTrack, { autoAlpha: 0, pointerEvents: 'none' });
      };

      const irisTl = gsap.timeline({
        scrollTrigger: {
          trigger: irisTrack,
          start: 'top top',
          end: 'bottom top',
          pin: irisPin,
          scrub: 0.4,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: () => {
            const m = measureClip();
            cx = m.cx;
            cy = m.cy;
            rEnd = m.rEnd;
            setClip(irisProxy.r);
          },
          onUpdate: (self) => {
            if (self.progress >= 0.995) showStack();
            else keepStackHidden();
          },
          onLeave: showStack,
          onEnterBack: () => {
            keepStackHidden();
            if (irisProxy.r > 0) gsap.set(irisCase, { autoAlpha: 1 });
          },
        },
      });
      timelines.push(irisTl);

      irisTl.fromTo(
        irisZoom,
        { scale: NEST_PAGE_ZOOM.start },
        {
          scale: NEST_PAGE_ZOOM.end,
          ease: 'none',
          duration: flyDur,
          force3D: true,
        },
        0
      );
      irisTl.fromTo(
        irisLogoWrap,
        { scale: NEST_LOGO_ZOOM.start },
        {
          scale: NEST_LOGO_ZOOM.end,
          ease: 'none',
          duration: flyDur,
          force3D: true,
        },
        0
      );
      irisTl.fromTo(
        [irisZoom, irisLogoWrap],
        { autoAlpha: 1 },
        { autoAlpha: 0, ease: 'none', duration: flyDur * 0.28 },
        flyDur * 0.72
      );
      irisTl.set(
        [irisZoom, irisLogoWrap],
        { autoAlpha: 0, visibility: 'hidden' },
        flyEnd
      );

      if (irisHint) {
        irisTl.to(
          irisHint,
          { autoAlpha: 0, ease: 'none', duration: Math.min(0.08, flyDur) },
          0.02
        );
      }

      irisTl.set(irisCase, { autoAlpha: 1, visibility: 'visible' }, flyEnd);
      irisTl.set(irisProxy, { r: rStart }, flyEnd);
      irisTl.call(() => setClip(rStart), undefined, flyEnd);
      irisTl.to(
        irisProxy,
        {
          r: () => rEnd,
          ease: 'none',
          duration: revealDur,
          onUpdate: () => setClip(irisProxy.r),
        },
        flyEnd
      );
      irisTl.fromTo(
        irisCaseInner,
        { scale: NEST_IRIS_CONTENT_ZOOM.start },
        {
          scale: NEST_IRIS_CONTENT_ZOOM.end,
          ease: 'none',
          duration: revealDur,
        },
        flyEnd
      );

      irisTl.to({}, { duration: Math.max(0.1, breatheDur) }, revealEnd);

      const {
        caseHoldEnd,
        studioArriveEnd,
        studioHoldEnd,
        applicationArriveEnd,
        applicationHoldEnd,
      } = NEST_STACK_GATES;

      const stackTl = gsap.timeline({
        scrollTrigger: {
          trigger: stackTrack,
          start: 'top top',
          end: 'bottom top',
          pin: stackPin,
          scrub: 0.4,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
      timelines.push(stackTl);

      stackTl.to({}, { duration: Math.max(0.08, caseHoldEnd) }, 0);

      const studioDur = studioArriveEnd - caseHoldEnd;
      stackTl.set(studio, { autoAlpha: 1 }, caseHoldEnd);
      stackTl.fromTo(
        studio,
        { xPercent: 112 },
        { xPercent: 0, ease: 'none', duration: studioDur },
        caseHoldEnd
      );

      stackTl.to(
        {},
        { duration: Math.max(0.08, studioHoldEnd - studioArriveEnd) },
        studioArriveEnd
      );

      const appDur = applicationArriveEnd - studioHoldEnd;
      stackTl.set(application, { autoAlpha: 1 }, studioHoldEnd);
      stackTl.fromTo(
        application,
        { yPercent: 115 },
        { yPercent: 0, ease: 'none', duration: appDur },
        studioHoldEnd
      );

      stackTl.to(
        {},
        {
          duration: Math.max(
            0.08,
            applicationHoldEnd - applicationArriveEnd
          ),
        },
        applicationArriveEnd
      );

      const refresh = () => {
        ScrollTrigger.refresh();
        const lenis = (window as Window & { __lenis?: { resize: () => void } })
          .__lenis;
        lenis?.resize();
      };
      requestAnimationFrame(refresh);
      const t1 = window.setTimeout(refresh, 120);
      const t2 = window.setTimeout(refresh, 500);
      const t3 = window.setTimeout(refresh, 1200);

      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
        window.clearTimeout(t3);
        timelines.forEach((tl) => {
          tl.scrollTrigger?.kill();
          tl.kill();
        });
      };
    });

    return () => {
      mm.revert();
    };
  }, []);

  return (
    <div
      className={styles.root}
      data-nested-stack
      data-nest-uniform
      data-tone="document"
      id="after-temple"
    >
      {labChrome ? (
        <header className={styles.banner}>
          <p className={styles.kicker}>Effects lab · Nested stack</p>
          <h1 className={styles.bannerTitle}>
            Case Study → Studio → Application
          </h1>
          <p className={styles.meta}>
            Scratch route — same nest as live home. Logo fly-through → small-dot
            reveal → gated panels. Lenis smooth scroll from root layout.
          </p>
          <p className={styles.scrollCue} aria-hidden>
            ↓ Scroll
          </p>
        </header>
      ) : null}

      <section
        ref={irisTrackRef}
        className={styles.irisTrack}
        style={{ height: `${NEST_SCROLL.irisVh}vh` }}
        data-nest-iris
        aria-label="Logo fly-through then Case Study"
      >
        <div ref={irisPinRef} className={styles.irisPin}>
          <div className={styles.templeBg} data-nest-bg aria-hidden />
          <div
            ref={irisCaseRef}
            className={`${styles.window} ${styles.windowCase} ${styles.windowIris}`}
            data-nest-panel="case-study-iris"
          >
            <NestCasePanel innerRef={irisCaseInnerRef} />
          </div>

          <div
            ref={irisZoomRef}
            className={styles.irisZoom}
            data-nest-iris-zoom
          >
            <div className={styles.templeBg} aria-hidden />
            <div
              ref={irisLogoWrapRef}
              className={styles.irisLogoWrap}
              data-nest-iris-logo
            >
              <Logo3D
                variant="hero"
                spin={0}
                spinAxis="y"
                className={styles.irisLogo}
              />
            </div>
          </div>

          <p ref={irisHintRef} className={styles.irisHint}>
            Scroll — logo leaves, then open from the dot
          </p>
        </div>
      </section>

      <section
        ref={stackTrackRef}
        className={styles.stackTrack}
        style={{ height: `${NEST_SCROLL.stackVh}vh` }}
        data-nest-stack
        aria-label="Case Study Studio Application stack"
      >
        <div ref={stackPinRef} className={styles.stackPin}>
          <div className={styles.templeBg} data-nest-bg aria-hidden />

          <div
            ref={caseRef}
            className={`${styles.window} ${styles.windowCase}`}
            data-nest-panel="case-study"
            id="work"
          >
            <NestCasePanel />
          </div>

          <div
            ref={studioRef}
            className={`${styles.window} ${styles.windowStudio}`}
            data-nest-panel="studio"
            id="studio"
          >
            <NestStudioPanel />
          </div>

          <div
            ref={applicationRef}
            className={`${styles.window} ${styles.windowApplication}`}
            data-nest-panel="application"
            id="apply"
          >
            <NestApplicationPanel />
          </div>
        </div>
      </section>

      <div className={styles.mobileStack} data-nest-mobile>
        <Gallery />
        <Studio />
        <Application />
      </div>
    </div>
  );
}
