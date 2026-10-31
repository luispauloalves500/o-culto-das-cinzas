// Rig humanoide low-poly procedural (hierarquia de articulações) com poses animadas por código.
// Substitui temporariamente personagens GLB: mesma interface de articulações (hips/torso/head/braços/pernas).
import * as THREE from 'three';

import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// geometrias de caixa arredondada compartilhadas por dimensão (mesmas medidas da caixa antiga: hitboxes intactas)
const GEO = new Map();
export function roundedBox(w, h, d, k = 0.22) {
  const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${k}`;
  let g = GEO.get(key);
  if (!g) { g = new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * k); g.userData.shared = true; GEO.set(key, g); }
  return g;
}
export function part(w, h, d, mat, y = 0, x = 0, z = 0, k) {
  const m = new THREE.Mesh(roundedBox(w, h, d, k), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}
const EYE = new THREE.MeshBasicMaterial({ color: 0x15100c });

/**
 * @param {object} o  scale, mats {skin, shirt, pants, arms, legs, head, hands}, hunch, armLen, legLen,
 *                    face (olhos/nariz/sobrancelha), hands (mãos nas pontas dos braços; padrão: sim)
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
  // ombros arredondados (caimento da roupa) e pescoço
  torso.add(part(tw * 0.96, 0.12 * s, 0.24 * s, M.arms || M.shirt, 0.54 * s, 0, 0, 0.45));
  const neck = new THREE.Group(); neck.position.y = 0.6 * s; torso.add(neck);
  const neckM = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * s, 0.065 * s, 0.1 * s, 8), M.skin); neckM.position.y = 0.0; neckM.castShadow = true; neck.add(neckM);
  const head = new THREE.Group(); neck.add(head);
  const skull = part(0.22 * s, 0.26 * s, 0.24 * s, M.head || M.skin, 0.15 * s, 0, 0, 0.32); head.add(skull);
  const parts = { neck: neckM, skull, hands: [], face: null };
  if (o.face) {
    const f = new THREE.Group(); f.name = 'face'; head.add(f);
    const em = o.face.eye || EYE;
    for (const sx of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.017 * s, 6, 4), em); e.position.set(sx * 0.05 * s, 0.175 * s, 0.118 * s); f.add(e);
      const b = part(0.06 * s, 0.014 * s, 0.02 * s, o.face.brow || M.head || M.skin, 0.205 * s, sx * 0.05 * s, 0.113 * s, 0.4); b.rotation.z = sx * -0.12; f.add(b);
    }
    f.add(part(0.03 * s, 0.06 * s, 0.04 * s, M.skin, 0.14 * s, 0, 0.125 * s, 0.4));
    f.add(part(0.06 * s, 0.012 * s, 0.01 * s, o.face.mouth || EYE, 0.085 * s, 0, 0.12 * s, 0.4));
    parts.face = f;
  }

  function limb(parent, x, y, upLen, loLen, w, mu, ml, endMat, hand) {
    const upper = new THREE.Group(); upper.position.set(x, y, 0); parent.add(upper);
    upper.add(part(w, upLen, w, mu, -upLen / 2));
    const lower = new THREE.Group(); lower.position.y = -upLen; upper.add(lower);
    lower.add(part(w * 0.88, loLen, w * 0.88, ml, -loLen / 2));
    const end = new THREE.Group(); end.position.y = -loLen; lower.add(end);
    if (endMat) end.add(part(w * 0.95, w * 0.7, w * 1.6, endMat, -w * 0.3, 0, w * 0.3, 0.35));
    if (hand) { const hm = part(w * 0.8, w * 1.05, w * 0.55, hand, -w * 0.45, 0, 0.005, 0.4); end.add(hm); parts.hands.push(hm); }
    return { upper, lower, end };
  }
  const armLen = (o.armLen ?? 0.3) * s;
  const aw = (o.armW ?? 0.11) * s;
  const handMat = o.hands === false ? null : (M.hands || M.skin);
  // modelo olha para +Z; o lado direito do personagem fica em −X
  const armR = limb(torso, -(tw / 2 + aw / 2), 0.52 * s, armLen, armLen, aw, M.arms || M.shirt, M.skin, null, handMat);
  const armL = limb(torso, (tw / 2 + aw / 2), 0.52 * s, armLen, armLen, aw, M.arms || M.shirt, M.skin, null, handMat);
  const legR = limb(hips, -0.1 * s, -0.04 * s, legLen, legLen, 0.15 * s, M.pants, M.legs || M.pants, M.feet || M.pants);
  const legL = limb(hips, 0.1 * s, -0.04 * s, legLen, legLen, 0.15 * s, M.pants, M.legs || M.pants, M.feet || M.pants);

  const rig = { root, body, hips, torso, neck, head, armR, armL, legR, legL, scale: s, baseHipY: hips.position.y, hunch: o.hunch ?? 0, parts };
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
