'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Logo3D } from '@/components/brand/Logo3D';
import { loadLogoTemplate } from '@/lib/brand/loadLogoGltf';
import { TEMPLE_CASE, type TempleStill } from '@/lib/work/templeCaseStudy';
import { prefersReducedMotion } from '@/lib/motion/prefersReducedMotion';
import styles from './CaseStudyGallery.module.css';

gsap.registerPlugin(ScrollTrigger);

/** Breathing room between neighbors around the center logo. */
const RING_GAP = 1.4;

type CaseStudyGalleryProps = {
  stills: readonly TempleStill[];
};

/**
 * Beige/gold CSS-3D ring — champagne #d4a054 on --doc-bg.
 * Center logo: Meshy GLB with sculpt camera; scroll yaw in WebGL (opposite ring).
 */
export function CaseStudyGallery({ stills }: CaseStudyGalleryProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  /** Degrees — read by Logo3D each frame (WebGL yaw, not CSS). */
  const hubYawRef = useRef(0);
  const labelRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    void loadLogoTemplate().catch(() => {
      /* Logo3D retries */
    });
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const pin = pinRef.current;
    const ring = ringRef.current;
    if (!root || !pin || !ring) return;

    const items = Array.from(
      root.querySelectorAll<HTMLElement>('[data-orbit-item]')
    );
    const n = items.length;
    if (!n) return;

    const step = 360 / n;
    let radius = 0;

    const layout = () => {
      const face = items[0]?.querySelector<HTMLElement>('[data-orbit-face]');
      const faceW =
        face?.offsetWidth || Math.min(window.innerWidth * 0.34, 400);
      radius = ((faceW / 2) / Math.tan(Math.PI / n)) * RING_GAP;
      items.forEach((el, i) => {
        const angle = i * step;
        el.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;
        el.dataset.orbitAngle = String(angle);
      });
    };

    const updateFacing = (ringY: number) => {
      let best = 0;
      let bestScore = -Infinity;
      items.forEach((el, i) => {
        const base = i * step;
        const world = (((base + ringY) % 360) + 360) % 360;
        const delta = world > 180 ? world - 360 : world;
        const facing = Math.cos((delta * Math.PI) / 180);
        const opacity =
          Math.abs(delta) > 125
            ? 0
            : gsap.utils.clamp(
                0.18,
                1,
                gsap.utils.mapRange(-0.15, 1, 0.18, 1, facing)
              );
        el.style.opacity = String(opacity);
        el.style.visibility = opacity < 0.05 ? 'hidden' : 'visible';
        if (facing > bestScore) {
          bestScore = facing;
          best = i;
        }
      });
      items.forEach((el, i) => {
        el.dataset.front = i === best ? 'true' : 'false';
      });
      const label = labelRef.current;
      if (label) {
        const still = stills[best];
        label.textContent = still
          ? `${TEMPLE_CASE.title} — ${still.caption}`
          : TEMPLE_CASE.title;
      }
    };

    layout();
    updateFacing(0);

    if (prefersReducedMotion()) {
      gsap.set(ring, { rotateY: 0, rotateX: -10, force3D: true });
      hubYawRef.current = 0;
      const onResize = () => {
        layout();
        updateFacing(0);
      };
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }

    gsap.set(ring, {
      rotateY: 0,
      rotateX: -10,
      force3D: true,
      transformOrigin: '50% 50%',
    });

    const unclipPin = () => {
      pin.style.overflow = 'visible';
      const spacer = pin.parentElement;
      if (spacer && spacer !== root) spacer.style.overflow = 'visible';
      root.style.overflow = 'visible';
    };

    // Same scrub: ring −360° (CSS), logo hub +360° inside WebGL (mesh depth)
    const hubYaw = { deg: 0 };
    hubYawRef.current = 0;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: root,
        start: 'top top',
        end: 'bottom bottom',
        pin: pin,
        scrub: 0.55,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onRefresh: unclipPin,
        onEnter: unclipPin,
        onEnterBack: unclipPin,
        onUpdate: (self) => {
          updateFacing(-360 * self.progress);
        },
      },
    });
    tl.to(ring, { rotateY: -360, ease: 'none', force3D: true }, 0);
    tl.to(
      hubYaw,
      {
        deg: 360,
        ease: 'none',
        onUpdate: () => {
          hubYawRef.current = hubYaw.deg;
        },
      },
      0
    );
    unclipPin();

    const onResize = () => {
      layout();
      updateFacing(-360 * (tl.scrollTrigger?.progress ?? 0));
      ScrollTrigger.refresh();
    };
    window.addEventListener('resize', onResize);

    const imgs = root.querySelectorAll('img');
    const refresh = () => {
      layout();
      ScrollTrigger.refresh();
    };
    imgs.forEach((img) => {
      if (!img.complete) img.addEventListener('load', refresh, { once: true });
    });
    refresh();

    return () => {
      window.removeEventListener('resize', onResize);
      imgs.forEach((img) => img.removeEventListener('load', refresh));
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [stills]);

  return (
    <div
      ref={rootRef}
      className={styles.stage}
      data-orbital-gallery
      data-ring-gallery
      data-lab-gallery
      aria-label="Case study ring gallery"
    >
      <div ref={pinRef} className={styles.pin}>
        <div className={styles.scene} data-orbit-scene>
          <div className={styles.hub} data-orbit-hub data-lab-hub aria-hidden>
            {/* Yaw driven in WebGL — CSS rotateY on the canvas looked flat */}
            <div className={styles.hubSpin} data-orbit-hub-spin>
              <Logo3D
                variant="follow"
                spin={0}
                spinAxis="y"
                sculpt
                restYawDeg={32}
                yawDegreesRef={hubYawRef}
                className={styles.hubLogo}
              />
            </div>
          </div>

          <div ref={ringRef} className={styles.ring} data-orbit-ring>
            {stills.map((still, i) => (
              <article
                key={still.src}
                className={styles.item}
                data-orbit-item
                data-lab-panel
                data-cursor="view"
                data-cursor-label="View"
              >
                <div className={styles.face} data-orbit-face data-lab-face>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={still.src}
                    alt={still.alt}
                    className={styles.still}
                    width={1920}
                    height={1080}
                    loading={i < 2 ? 'eager' : 'lazy'}
                    decoding="async"
                  />
                  <div className={styles.veil} aria-hidden />
                  <header className={styles.copy}>
                    <p className={styles.project}>{TEMPLE_CASE.title}</p>
                    <h3 className={styles.room} data-lab-caption>
                      {still.caption}
                    </h3>
                    <p className={styles.category}>{TEMPLE_CASE.category}</p>
                  </header>
                </div>
              </article>
            ))}
          </div>
        </div>
        <p ref={labelRef} className={styles.label} data-orbit-label />
      </div>
    </div>
  );
}
