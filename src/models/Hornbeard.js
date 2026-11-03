// src/models/Hornbeard.js — carrega o modelo do Enfermeiro (Hornbeard)
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

let cache = null;
let loading = null;

export async function loadHornbeard() {
  if (cache) return cache.clone(true);
  if (loading) return loading.then((m) => m.clone(true));
  loading = new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    loader.setDRACOLoader(draco);
    loader.load('/models/hornbeard.glb', (gltf) => {
      const root = gltf.scene;
      root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const scale = 1.9 / Math.max(size.y, 0.1);
      root.scale.setScalar(scale);
      root.position.y = -box.min.y * scale;
      cache = root;
      resolve(root);
    }, undefined, reject);
  });
  return loading.then((m) => m.clone(true));
}
