// Rig humanoide low-poly procedural (hierarquia de articulações) com poses animadas por código.
// Substitui temporariamente personagens GLB: mesma interface de articulações (hips/torso/head/braços/pernas).
import * as THREE from 'three';

function part(w, h, d, mat, y = 0, x = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

/**
 * @param {object} o  scale, mats {skin, shirt, pants, arms, legs, head}, hunch, armLen, legLen
 */
export function createHumanoid(o = {}) {
  const s = o.scale ?? 1;
  const M = o.mats;
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const legLen = (o.legLen ?? 0.46) * s;
  const hips = new THREE.Group(); hips.position.y = legLen * 2 + 0.06 * s; body.add(hips);
  hips.add(part(0.36 * s, 0.2 * s, 0.22 * s, M.pants));
  const torso = new THREE.Group(); torso.position.y = 0.08 * s; hips.add(torso);
  const tw = (o.torsoW ?? 0.44) * s;
  torso.add(part(tw, 0.56 * s, 0.25 * s, M.shirt, 0.3 * s));
  const neck = new THREE.Group(); neck.position.y = 0.6 * s; torso.add(neck);
  const head = new THREE.Group(); neck.add(head);
  head.add(part(0.22 * s, 0.26 * s, 0.24 * s, M.head || M.skin, 0.15 * s));

  function limb(parent, x, y, upLen, loLen, w, mu, ml, endMat) {
    const upper = new THREE.Group(); upper.position.set(x, y, 0); parent.add(upper);
    upper.add(part(w, upLen, w, mu, -upLen / 2));
    const lower = new THREE.Group(); lower.position.y = -upLen; upper.add(lower);
    lower.add(part(w * 0.88, loLen, w * 0.88, ml, -loLen / 2));
    const end = new THREE.Group(); end.position.y = -loLen; lower.add(end);
    if (endMat) end.add(part(w * 0.95, w * 0.7, w * 1.6, endMat, -w * 0.3, 0, w * 0.3));
    return { upper, lower, end };
  }
  const armLen = (o.armLen ?? 0.3) * s;
  const aw = (o.armW ?? 0.11) * s;
  // modelo olha para +Z; o lado direito do personagem fica em −X
  const armR = limb(torso, -(tw / 2 + aw / 2), 0.52 * s, armLen, armLen, aw, M.arms || M.shirt, M.skin);
  const armL = limb(torso, (tw / 2 + aw / 2), 0.52 * s, armLen, armLen, aw, M.arms || M.shirt, M.skin);
  const legR = limb(hips, -0.1 * s, -0.04 * s, legLen, legLen, 0.15 * s, M.pants, M.legs || M.pants, M.feet || M.pants);
  const legL = limb(hips, 0.1 * s, -0.04 * s, legLen, legLen, 0.15 * s, M.pants, M.legs || M.pants, M.feet || M.pants);

  const rig = { root, body, hips, torso, neck, head, armR, armL, legR, legL, scale: s, baseHipY: hips.position.y, hunch: o.hunch ?? 0 };
  rig.reset = () => resetPose(rig);
  return rig;
}

export function resetPose(r) {
  for (const g of [r.body, r.torso, r.neck, r.head, r.armR.upper, r.armR.lower, r.armL.upper, r.armL.lower, r.legR.upper, r.legR.lower, r.legL.upper, r.legL.lower]) g.rotation.set(0, 0, 0);
  r.hips.position.y = r.baseHipY;
  r.body.position.set(0, 0, 0);
  r.torso.rotation.x = r.hunch;
}

/** ciclo de caminhada: phase em radianos, amt 0..1 (intensidade), run 0..1 */
export function poseWalk(r, phase, amt, run = 0) {
  const sw = (0.55 + run * 0.35) * amt;
  const s = Math.sin(phase), c = Math.cos(phase);
  r.legR.upper.rotation.x = -s * sw;
  r.legL.upper.rotation.x = s * sw;
  r.legR.lower.rotation.x = Math.max(0, s) * sw * 1.3;
  r.legL.lower.rotation.x = Math.max(0, -s) * sw * 1.3;
  r.armR.upper.rotation.x = s * sw * 0.8;
  r.armL.upper.rotation.x = -s * sw * 0.8;
  r.armR.lower.rotation.x = -0.25 - run * 0.6 * amt;
  r.armL.lower.rotation.x = -0.25 - run * 0.6 * amt;
  r.hips.position.y = r.baseHipY - Math.abs(c) * 0.05 * amt * r.scale;
  r.torso.rotation.x = r.hunch + run * 0.18 * amt;
  r.torso.rotation.y = s * 0.08 * amt;
}

export function poseIdle(r, t) {
  const b = Math.sin(t * 1.7) * 0.015;
  r.torso.rotation.x = r.hunch + b;
  r.armR.upper.rotation.z = -0.06; r.armL.upper.rotation.z = 0.06;
  r.armR.lower.rotation.x = -0.15; r.armL.lower.rotation.x = -0.15;
  r.head.rotation.y = Math.sin(t * 0.4) * 0.15;
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => t * t * (3 - 2 * t);
/** interpola chaves [[t, valor], ...] */
export function keys(k, t) {
  if (t <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (t <= k[i][0]) {
      const u = (t - k[i - 1][0]) / (k[i][0] - k[i - 1][0]);
      return lerp(k[i - 1][1], k[i][1], ease(u));
    }
  }
  return k[k.length - 1][1];
}
