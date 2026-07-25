import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { LOGO_GLB_URL } from '@/lib/brand/logoUrl';

let template: THREE.Group | null = null;
let loading: Promise<THREE.Group> | null = null;

/**
 * Load the Meshy golden cracked-forge logo once; callers clone for each canvas.
 * Materials stay as authored in the GLB — no MeshStandard overrides.
 */
export function loadLogoTemplate(): Promise<THREE.Group> {
  if (template) return Promise.resolve(template);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        LOGO_GLB_URL,
        (gltf) => {
          template = gltf.scene;
          template.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
              const mesh = obj as THREE.Mesh;
              mesh.castShadow = false;
              mesh.receiveShadow = false;
              // Keep GPU happy on many instances
              mesh.frustumCulled = true;
              // Meshy often ships emissiveFactor [1,1,1] + map — that washes out
              // the hero gold rim rig. Keep authored maps; soften intensity only.
              const mats = Array.isArray(mesh.material)
                ? mesh.material
                : [mesh.material];
              for (const mat of mats) {
                if (!mat || !(mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
                  continue;
                }
                const std = mat as THREE.MeshStandardMaterial;
                if (
                  std.emissiveMap &&
                  std.emissive.r >= 0.99 &&
                  std.emissive.g >= 0.99 &&
                  std.emissive.b >= 0.99
                ) {
                  std.emissiveIntensity = 0.42;
                }
              }
            }
          });
          resolve(template);
        },
        undefined,
        (err) => {
          // Allow later callers to retry instead of caching a rejected promise.
          loading = null;
          reject(err);
        }
      );
    });
  }
  return loading;
}

export function cloneLogoScene(): Promise<THREE.Group> {
  return loadLogoTemplate().then((root) => root.clone(true));
}

/** Fit object into a unit box centered at origin. */
export function normalizeLogo(root: THREE.Object3D, targetSize = 1.35): void {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  root.position.sub(center);
  root.scale.multiplyScalar(targetSize / maxDim);
}
