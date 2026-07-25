'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { cloneLogoScene, normalizeLogo } from '@/lib/brand/loadLogoGltf';
import { addHeroLogoLights } from '@/lib/brand/logoLights';
import styles from './LogoShowcase.module.css';

/** One full turn every ~25s — display piece, not a spinner. */
const IDLE_RAD_PER_SEC = (Math.PI * 2) / 25;
const RESUME_IDLE_MS = 1400;
const DRAG_SENS = 0.0055;
const PITCH_MAX = THREE.MathUtils.degToRad(28);
const VELOCITY_DAMP = 0.92;

/**
 * Interactive Meshy mark — same GLB clone + hero lighting.
 * Separate canvas (temple film is 2D WebP); RAF pauses when off-screen.
 */
export function LogoShowcase() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webglReady, setWebglReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let disposed = false;
    let raf = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let inView = true;
    let dragging = false;
    let resumeTimer = 0;
    let idleEnabled = !reduced;
    let yaw = 0;
    let pitch = THREE.MathUtils.degToRad(8);
    let velYaw = 0;
    let velPitch = 0;
    let lastPtrX = 0;
    let lastPtrY = 0;
    let last = performance.now();
    let hasLogo = false;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
    camera.position.set(0, 0.08, 3.25);

    const pivot = new THREE.Group();
    scene.add(pivot);
    addHeroLogoLights(scene);

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch (err) {
      console.error('[logo showcase] WebGL unavailable', err);
      return;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    const resize = () => {
      if (!renderer || !host) return;
      const rect = host.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      if (w < 2 || h < 2) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (hasLogo) renderer.render(scene, camera);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry?.isIntersecting ?? false;
        if (inView && hasLogo && renderer) {
          renderer.render(scene, camera);
        }
      },
      { rootMargin: '20% 0px', threshold: 0 }
    );
    io.observe(host);

    void (async () => {
      try {
        const logo = await cloneLogoScene();
        if (disposed || !renderer) return;
        // GF monogram is wider than the old D — keep full glyph inside the frame.
        normalizeLogo(logo, 1.18);
        logo.rotation.x = THREE.MathUtils.degToRad(6);
        pivot.clear();
        pivot.add(logo);
        hasLogo = true;
        resize();
        renderer.render(scene, camera);
        setWebglReady(true);
      } catch (err) {
        console.error('[logo showcase]', err);
      }
    })();

    const scheduleIdleResume = () => {
      window.clearTimeout(resumeTimer);
      if (reduced) return;
      resumeTimer = window.setTimeout(() => {
        idleEnabled = true;
        velYaw = 0;
        velPitch = 0;
      }, RESUME_IDLE_MS);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || !hasLogo) return;
      dragging = true;
      idleEnabled = false;
      window.clearTimeout(resumeTimer);
      velYaw = 0;
      velPitch = 0;
      lastPtrX = e.clientX;
      lastPtrY = e.clientY;
      host.setPointerCapture(e.pointerId);
      host.dataset.dragging = 'true';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastPtrX;
      const dy = e.clientY - lastPtrY;
      lastPtrX = e.clientX;
      lastPtrY = e.clientY;
      yaw += dx * DRAG_SENS;
      pitch = THREE.MathUtils.clamp(
        pitch + dy * DRAG_SENS,
        -PITCH_MAX,
        PITCH_MAX
      );
      velYaw = dx * DRAG_SENS * 18;
      velPitch = dy * DRAG_SENS * 18;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      try {
        host.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      delete host.dataset.dragging;
      scheduleIdleResume();
    };

    host.addEventListener('pointerdown', onPointerDown);
    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('pointerup', onPointerUp);
    host.addEventListener('pointercancel', onPointerUp);

    const tick = (now: number) => {
      if (disposed || !renderer) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (inView && hasLogo) {
        if (!dragging) {
          if (Math.abs(velYaw) > 0.0002 || Math.abs(velPitch) > 0.0002) {
            yaw += velYaw * dt;
            pitch = THREE.MathUtils.clamp(
              pitch + velPitch * dt,
              -PITCH_MAX,
              PITCH_MAX
            );
            velYaw *= VELOCITY_DAMP;
            velPitch *= VELOCITY_DAMP;
          } else if (idleEnabled) {
            yaw += IDLE_RAD_PER_SEC * dt;
          }
        }

        pivot.rotation.y = yaw;
        pivot.rotation.x = pitch;
        renderer.render(scene, camera);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(resumeTimer);
      ro.disconnect();
      io.disconnect();
      host.removeEventListener('pointerdown', onPointerDown);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerup', onPointerUp);
      host.removeEventListener('pointercancel', onPointerUp);
      pivot.clear();
      renderer?.dispose();
      renderer = null;
    };
  }, []);

  return (
    <figure
      className={styles.figure}
      id="logo-showcase"
      data-rotating-logo="true"
      data-logo-showcase
    >
      <div
        ref={hostRef}
        className={styles.host}
        role="img"
        aria-label="Gilt Foundry rotating logo — drag to turn"
        data-rotating-logo-stage
        data-cursor="view"
        data-cursor-label="Drag"
        tabIndex={0}
      >
        <canvas
          ref={canvasRef}
          className={`${styles.canvas} ${webglReady ? styles.canvasShow : ''}`}
        />
      </div>
      <figcaption className={styles.caption}>
        Cracked stone mark — drag to turn
      </figcaption>
    </figure>
  );
}
