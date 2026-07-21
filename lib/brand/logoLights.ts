import * as THREE from 'three';

/**
 * Hero-validated Meshy lighting — shared by Logo3D + Studio showcase.
 * Materials stay as authored (baseColor / MR / normal / emissive, OPAQUE).
 */
export function addHeroLogoLights(scene: THREE.Scene): void {
  scene.add(new THREE.AmbientLight(0x2a241c, 0.5));
  const key = new THREE.DirectionalLight(0xffe2b8, 2.6);
  key.position.set(2.2, 3.2, 2.4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xb8c8ff, 0.55);
  fill.position.set(-2.4, 0.6, 1.2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffb060, 1.15);
  rim.position.set(0.2, 1.4, -2.2);
  scene.add(rim);
}
