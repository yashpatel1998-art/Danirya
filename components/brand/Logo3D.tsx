'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cloneLogoScene, normalizeLogo } from '@/lib/brand/loadLogoGltf';
import { addHeroLogoLights } from '@/lib/brand/logoLights';
import { LOGO_MARK_PNG } from '@/lib/brand/logoUrl';
import styles from './Logo3D.module.css';

gsap.registerPlugin(ScrollTrigger);

export type Logo3DVariant = 'mark' | 'hero' | 'follow';

type Logo3DProps = {
  variant?: Logo3DVariant;
  className?: string;
  /** Radians per second. Full turn = 2π ≈ 6.28. */
  spin?: number;
  /** Axis for the continuous spin. Default z = screen-plane 360°. */
  spinAxis?: 'x' | 'y' | 'z';
  followSectionRef?: React.RefObject<HTMLElement | null>;
  followTurns?: number;
  /**
   * External yaw in degrees (e.g. gallery scrub). Applied inside WebGL so the
   * Meshy mesh shows depth — never CSS-rotate the canvas (that reads flat).
   */
  yawDegreesRef?: React.RefObject<number>;
  /** Static yaw offset so carved thickness reads at rest. */
  restYawDeg?: number;
  /** Off-axis camera for sculptural depth (gallery hub). */
  sculpt?: boolean;
  /** Darker ink rendering for warm-beige document pages. */
  tone?: 'default' | 'document';
  'aria-hidden'?: boolean;
};

/**
 * Meshy GLB logo (danirya-logo.glb) — Y-spin + optional scroll-linked yaw.
 * Follow/hero never use the flat PNG mark. Temple pedestal bake is never touched.
 */
export function Logo3D({
  variant = 'hero',
  className,
  spin = 0.35,
  spinAxis = 'y',
  followSectionRef,
  followTurns = 0.85,
  yawDegreesRef,
  restYawDeg = 0,
  sculpt = false,
  tone = 'default',
  'aria-hidden': ariaHidden = true,
}: Logo3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollYawRef = useRef(0);
  const [webglReady, setWebglReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let disposed = false;
    let raf = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let st: ScrollTrigger | null = null;
    let baseYaw = 0;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      sculpt ? 30 : variant === 'hero' ? 28 : 32,
      1,
      0.1,
      40
    );
    // Hero: farther back so the loader mark never clips its frame.
    // Sculpt: slight orbit so the Meshy stone reads with volume, not as a plate.
    if (sculpt) {
      camera.position.set(0.72, 0.36, 3.05);
      camera.lookAt(0, 0.02, 0);
    } else {
      camera.position.set(
        0,
        variant === 'hero' ? 0.04 : 0.15,
        variant === 'hero' ? 3.55 : 3.1
      );
    }

    const pivot = new THREE.Group();
    scene.add(pivot);

    /**
     * Document watermark: hero light language + gold kick.
     * Hierarchy via CSS opacity on the rail — not crushed exposure.
     */
    const documentTone = tone === 'document';
    if (documentTone) {
      scene.add(new THREE.AmbientLight(0x2a241c, 0.42));
      const key = new THREE.DirectionalLight(0xffe2b8, 2.35);
      key.position.set(2.2, 3.2, 2.4);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xb8c8ff, 0.48);
      fill.position.set(-2.4, 0.6, 1.2);
      scene.add(fill);
      const rim = new THREE.DirectionalLight(0xffb060, 1.25);
      rim.position.set(0.2, 1.4, -2.2);
      scene.add(rim);
      const goldKick = new THREE.DirectionalLight(0xffc078, 0.85);
      goldKick.position.set(-1.2, 2.4, 2.8);
      scene.add(goldKick);
    } else {
      addHeroLogoLights(scene);
    }

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // Keep exposure near hero so PBR gold rim survives; opacity stays on the rail.
    renderer.toneMappingExposure = documentTone ? 1.02 : 1.08;

    const resize = () => {
      if (!renderer || !host) return;
      const rect = host.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        variant === 'mark' ? 1.5 : 2
      );
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const section = followSectionRef?.current;
    if (section && !reduced) {
      st = ScrollTrigger.create({
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 0.45,
        onUpdate: (self) => {
          scrollYawRef.current = self.progress * Math.PI * 2 * followTurns;
        },
      });
    }

    void (async () => {
      try {
        const logo = await cloneLogoScene();
        if (disposed) return;
        // Hero fills the loader stage; mark/follow stay compact
        const target =
          variant === 'mark' ? 1.15 : sculpt ? 1.62 : variant === 'hero' ? 1.45 : 1.55;
        normalizeLogo(logo, target);
        // Pitch so Y-spin / scrub yaw reads volume (stronger in sculpt hub)
        logo.rotation.x = THREE.MathUtils.degToRad(
          sculpt ? 16 : variant === 'follow' ? 12 : 8
        );
        pivot.add(logo);
        setWebglReady(true);
      } catch (err) {
        console.error('[danirya logo3d]', err);
      }
    })();

    let last = performance.now();
    const spinSpeed = reduced ? 0 : spin;

    const tick = (now: number) => {
      if (disposed || !renderer) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      baseYaw += spinSpeed * dt;
      const externalYaw = THREE.MathUtils.degToRad(
        restYawDeg + (yawDegreesRef?.current ?? 0)
      );
      const angle = baseYaw + scrollYawRef.current + externalYaw;
      pivot.rotation.x = 0;
      pivot.rotation.y = 0;
      pivot.rotation.z = 0;
      if (spinAxis === 'x') pivot.rotation.x = angle;
      else if (spinAxis === 'y') pivot.rotation.y = angle;
      else pivot.rotation.z = angle;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      st?.kill();
      while (pivot.children.length) {
        pivot.remove(pivot.children[0]);
      }
      renderer?.dispose();
      renderer = null;
    };
  }, [
    variant,
    spin,
    spinAxis,
    followSectionRef,
    followTurns,
    yawDegreesRef,
    restYawDeg,
    sculpt,
    tone,
  ]);

  return (
    <div
      ref={hostRef}
      className={`${styles.host} ${styles[variant]} ${tone === 'document' ? styles.document : ''} ${className ?? ''}`}
      aria-hidden={ariaHidden}
    >
      {/* Flat PNG only for tiny marks — follow/hero are Meshy WebGL only */}
      {variant === 'mark' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={LOGO_MARK_PNG}
          alt=""
          className={`${styles.fallback} ${webglReady ? styles.fallbackHide : ''}`}
          draggable={false}
        />
      )}
      <canvas
        ref={canvasRef}
        className={`${styles.canvas} ${webglReady ? styles.canvasShow : ''}`}
      />
    </div>
  );
}
