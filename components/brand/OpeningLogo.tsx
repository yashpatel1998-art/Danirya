'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { cloneLogoScene, normalizeLogo } from '@/lib/brand/loadLogoGltf';
import { LOGO_FRAGMENTS_GLB_URL } from '@/lib/brand/logoUrl';
import styles from './OpeningLogo.module.css';

type OpeningLogoProps = {
  spin?: number;
  explode: boolean;
  onExplosionComplete?: () => void;
  /** Fires once concrete fragments are baked and ready to blast. */
  onFragmentsReady?: () => void;
};

type Shard = {
  mesh: THREE.Mesh;
  homePos: THREE.Vector3;
  homeQuat: THREE.Quaternion;
  velocity: THREE.Vector3;
  spinAxis: THREE.Vector3;
  spinSpeed: number;
};

const EXPLODE_DURATION = 2.8;
/** Fraction of the shorter camera frustum edge — matches loader Logo3D hero scale. */
const VIEW_FILL = 0.46;
const PITCH = THREE.MathUtils.degToRad(8);

/**
 * One WebGL context — Y-spin intact logo, then real concrete fragment blast
 * from logo_fragments.glb (geometry baked to scene space, radial velocities).
 */
export function OpeningLogo({
  spin = 0.7,
  explode,
  onExplosionComplete,
  onFragmentsReady,
}: OpeningLogoProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const explodeRef = useRef(explode);
  explodeRef.current = explode;
  const onCompleteRef = useRef(onExplosionComplete);
  onCompleteRef.current = onExplosionComplete;
  const onReadyRef = useRef(onFragmentsReady);
  onReadyRef.current = onFragmentsReady;
  const spinRef = useRef(spin);
  spinRef.current = spin;

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    let disposed = false;
    let raf = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let logo: THREE.Group | null = null;
    let yaw = 0;
    let exploding = false;
    let explodeT0 = 0;
    let last = performance.now();
    let completed = false;
    let fragmentsReady = false;
    let pendingExplode = false;

    const shards: Shard[] = [];
    const scene = new THREE.Scene();
    // Far plane leaves headroom for full-viewport shard travel
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 120);
    camera.position.set(0, 0.04, 3.6);

    const blastRoot = new THREE.Group();
    scene.add(blastRoot);

    let logoBaseScale = 1;
    let logoBasePos = new THREE.Vector3();
    let fragFitScale = 1;

    const viewFitSize = () => {
      const vFov = THREE.MathUtils.degToRad(camera.fov);
      const visibleH =
        2 * Math.tan(vFov / 2) * Math.abs(camera.position.z);
      const visibleW = visibleH * camera.aspect;
      return Math.min(visibleW, visibleH) * VIEW_FILL;
    };

    const refitLogo = () => {
      if (!logo) return;
      // logoBaseScale is the uniform scale that yields size ≈ 1 after normalize
      const t = viewFitSize();
      logo.scale.set(logoBaseScale * t, logoBaseScale * t, logoBaseScale * t);
      logo.position.copy(logoBasePos);
      // Lift slightly so the mark clears the temple wall sign behind
      logo.position.y += t * 0.14;
      blastRoot.position.y = t * 0.14;
    };

    // Lit for beige/grey loader stage (not a black void)
    scene.add(new THREE.AmbientLight(0xd8cfc0, 1.35));
    const key = new THREE.DirectionalLight(0xfff2e0, 3.2);
    key.position.set(2.4, 3.4, 2.8);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xe8e4dc, 1.7);
    fill.position.set(-2.4, 0.8, 2.4);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xc4a574, 1.55);
    rim.position.set(0.2, 1.4, -2.1);
    scene.add(rim);

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      });
    } catch {
      return;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.setClearAlpha(0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    const resize = () => {
      if (!renderer || !host) return;
      const rect = host.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      refitLogo();
      if (blastRoot.children.length && fragFitScale > 0) {
        const next = viewFitSize();
        const ratio = next / fragFitScale;
        if (Math.abs(ratio - 1) > 0.01) {
          blastRoot.scale.multiplyScalar(ratio);
          fragFitScale = next;
        }
      }
      // Keep stage transparent while the GLB is still loading
      renderer.render(scene, camera);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const prepareMat = (mat: THREE.Material) => {
      const c = mat.clone();
      c.transparent = true;
      c.opacity = 1;
      c.side = THREE.DoubleSide;
      c.depthWrite = true;
      const std = c as THREE.MeshStandardMaterial;
      if (std.isMeshStandardMaterial) {
        if (std.metalness > 0.85) std.metalness = 0.4;
        if (std.roughness < 0.3) std.roughness = 0.55;
        std.emissive = new THREE.Color(0x4a3018);
        std.emissiveIntensity = 0.45;
      }
      return c;
    };

    const setShardOpacity = (opacity: number) => {
      for (const s of shards) {
        const mats = Array.isArray(s.mesh.material)
          ? s.mesh.material
          : [s.mesh.material];
        for (const mat of mats) {
          if (!mat) continue;
          mat.transparent = true;
          mat.opacity = opacity;
          mat.depthWrite = opacity > 0.12;
          mat.needsUpdate = true;
        }
      }
    };

    const tick = (now: number) => {
      if (disposed || !renderer) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (explodeRef.current && !exploding) {
        if (fragmentsReady) armExplosion(now);
        else pendingExplode = true;
      }

      if (!exploding) {
        if (!reduced && logo?.visible) {
          yaw += spinRef.current * dt;
          logo.rotation.y = yaw;
        }
        renderer.toneMappingExposure = 1.45;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
        return;
      }

      const t = Math.min(1, (now - explodeT0) / (EXPLODE_DURATION * 1000));
      const flash = Math.max(0, 1 - t / 0.3);
      const fade = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      host.style.background = `radial-gradient(ellipse 70% 60% at 50% 48%, rgba(255,220,170,${0.35 * flash}), transparent 72%)`;
      renderer.toneMappingExposure = 1.35 + 0.55 * flash;
      blastRoot.rotation.y += spinRef.current * 0.15 * dt;

      for (const s of shards) {
        s.mesh.position.addScaledVector(s.velocity, dt);
        s.velocity.multiplyScalar(0.992);
        s.velocity.y -= 0.55 * dt;
        s.mesh.rotateOnAxis(s.spinAxis, s.spinSpeed * dt);
      }
      setShardOpacity(Math.max(0, fade));
      renderer.render(scene, camera);

      if (t >= 1) {
        host.style.background = '';
        for (const s of shards) s.mesh.visible = false;
        if (!completed) {
          completed = true;
          onCompleteRef.current?.();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const armExplosion = (now: number) => {
      if (disposed || !fragmentsReady || shards.length === 0 || exploding) return;

      exploding = true;
      explodeT0 = now;
      if (logo) logo.visible = false;
      blastRoot.rotation.y = yaw;

      // Full-viewport spray: cross most of the frustum in ~0.7s (~3.5–6.5 u/s).
      const fit = viewFitSize();
      const visibleSpan = fit / VIEW_FILL;
      const baseSpeed = Math.max(3.5, Math.min(6.5, (visibleSpan * 0.95) / 0.7));

      for (const s of shards) {
        s.mesh.visible = true;
        s.mesh.position.copy(s.homePos);
        s.mesh.quaternion.copy(s.homeQuat);

        const dir = s.homePos.clone();
        if (dir.lengthSq() < 1e-8) {
          dir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        }
        dir.normalize();
        // Radial + slight camera-ward Z so pieces read across the full frame
        dir.z += 0.55;
        dir.y += 0.22;
        dir.normalize();
        const speedMul = 0.85 + Math.random() * 0.55; // → ~3.0–6.5 with clamp
        s.velocity.copy(dir).multiplyScalar(baseSpeed * speedMul);
        s.spinAxis
          .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
          .normalize();
        s.spinSpeed = 8 + Math.random() * 14;
      }

      setShardOpacity(1);
      host.style.background =
        'radial-gradient(ellipse 70% 60% at 50% 48%, rgba(255,220,170,0.35), transparent 72%)';
      if (renderer) {
        renderer.toneMappingExposure = 1.55;
        renderer.render(scene, camera);
      }

      // Kick the loop in case we armed outside of tick (Strict Mode / debug)
      cancelAnimationFrame(raf);
      last = now;
      raf = requestAnimationFrame(tick);
    };

    const fragPromise = new Promise<THREE.Group>((resolve, reject) => {
      new GLTFLoader().load(
        LOGO_FRAGMENTS_GLB_URL,
        (g) => resolve(g.scene),
        undefined,
        reject
      );
    });

    void (async () => {
      try {
        logo = await cloneLogoScene();
        if (disposed || !renderer) return;
        normalizeLogo(logo, 1);
        logoBaseScale = logo.scale.x;
        logoBasePos.copy(logo.position);
        logo.rotation.x = PITCH;
        refitLogo();
        logo.traverse((obj) => {
          const m = obj as THREE.Mesh;
          if (!m.isMesh || !m.material) return;
          if (Array.isArray(m.material)) {
            m.material = m.material.map(prepareMat);
          } else {
            m.material = prepareMat(m.material);
          }
        });
        scene.add(logo);

        last = performance.now();
        raf = requestAnimationFrame(tick);

        const loaded = await fragPromise;
        if (disposed || !renderer) return;

        const box = new THREE.Box3().setFromObject(loaded);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        fragFitScale = viewFitSize();
        const scale = fragFitScale / maxDim;

        loaded.position.sub(center);
        loaded.scale.setScalar(scale);
        loaded.rotation.x = PITCH;
        scene.add(loaded);
        loaded.updateMatrixWorld(true);

        const meshes: THREE.Mesh[] = [];
        loaded.traverse((obj) => {
          const m = obj as THREE.Mesh;
          if (m.isMesh) meshes.push(m);
        });

        for (const mesh of meshes) {
          mesh.updateMatrixWorld(true);
          const geom = mesh.geometry.clone();
          geom.applyMatrix4(mesh.matrixWorld);
          geom.computeBoundingBox();
          const bb = geom.boundingBox!;
          const centroid = new THREE.Vector3();
          bb.getCenter(centroid);
          geom.translate(-centroid.x, -centroid.y, -centroid.z);
          geom.computeVertexNormals();
          geom.computeBoundingSphere();

          const mat = Array.isArray(mesh.material)
            ? mesh.material.map((m) => prepareMat(m))
            : prepareMat(mesh.material);

          const shard = new THREE.Mesh(geom, mat);
          shard.frustumCulled = false;
          shard.visible = false;
          shard.position.copy(centroid);
          blastRoot.add(shard);

          shards.push({
            mesh: shard,
            homePos: shard.position.clone(),
            homeQuat: shard.quaternion.clone(),
            velocity: new THREE.Vector3(),
            spinAxis: new THREE.Vector3(0, 1, 0),
            spinSpeed: 0,
          });
        }

        scene.remove(loaded);
        loaded.traverse((obj) => {
          const m = obj as THREE.Mesh;
          if (m.isMesh) m.geometry?.dispose();
        });

        if (disposed) return;

        setShardOpacity(0);
        fragmentsReady = true;
        onReadyRef.current?.();

        if (pendingExplode || explodeRef.current) {
          armExplosion(performance.now());
        }
      } catch (err) {
        console.error('[opening logo]', err);
        // Never block the site loader if GLB/fragments fail — complete immediately.
        if (!completed) {
          completed = true;
          onCompleteRef.current?.();
        }
      }
    })();

    // If explode is requested but never completes, don't freeze the page.
    let explodeSince = 0;
    const explodeWatchdog = window.setInterval(() => {
      if (disposed || completed) return;
      if (!explodeRef.current) {
        explodeSince = 0;
        return;
      }
      explodeSince += 500;
      // Fragments never armed, or explode animation hung.
      if (explodeSince >= 4500) {
        console.warn('[opening logo] explode watchdog — forcing complete');
        completed = true;
        onCompleteRef.current?.();
      }
    }, 500);

    return () => {
      disposed = true;
      clearInterval(explodeWatchdog);
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer?.dispose();
      renderer = null;
    };
  }, []);

  return (
    <div ref={hostRef} className={styles.root} aria-hidden>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
