// pt54u: poses sintetizadas no esqueleto Mixamo (os GLBs só trazem Walking/Running).
// Cada pose é descrita por DIREÇÕES dos ossos no espaço do personagem (+Y para cima, +Z para a frente, +X = esquerda
// do personagem). Para cada osso, em ordem da hierarquia, gira-se o osso para que o segmento osso→filho aponte para a
// direção pedida (rotação mínima), partindo de um quadro "em pé" do Walking. Assim a pose independe dos eixos locais
// de cada exportação. O resultado vira um AnimationClip comum (idle com respiração; sentado; deitado de costas).
import * as THREE from 'three';

const CHILD = {
  Spine: 'Spine1', Spine1: 'Spine2', Spine2: 'Neck', Neck: 'Head', Head: 'HeadTop_End',
  LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand', LeftHand: 'LeftHandMiddle1',
  RightArm: 'RightForeArm', RightForeArm: 'RightHand', RightHand: 'RightHandMiddle1',
  LeftUpLeg: 'LeftLeg', LeftLeg: 'LeftFoot', LeftFoot: 'LeftToeBase',
  RightUpLeg: 'RightLeg', RightLeg: 'RightFoot', RightFoot: 'RightToeBase',
};
const ORDER = ['Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'];

/** poses: direções (não normalizadas) por osso; hips = orientação do quadril {up, fwd}; floor = altura do osso mais baixo
 *  acima do chão em frações da altura do personagem */
export const POSE_DEFS = {
  idle: { // de pé, curvado, cabeça pendendo, braços soltos (respira: lean oscila)
    floor: null, lean: [0.12, 0.2],
    dirs: { Head: [0.28, 1, 0.3], Neck: [0.1, 1, 0.25], LeftArm: [0.18, -1, 0.12], LeftForeArm: [0.06, -1, 0.35], RightArm: [-0.15, -1, 0.18], RightForeArm: [-0.05, -1, 0.45] },
  },
  sit: { // sentado no chão encostado, joelhos dobrados para cima, braços sobre os joelhos, cabeça baixa
    floor: 0.05, hipsDown: true,
    dirs: {
      Spine: [0, 1, 0.45], Spine1: [0, 1, 0.55], Spine2: [0, 1, 0.6], Neck: [0, 0.8, 0.8], Head: [0.15, 0.4, 1],
      LeftUpLeg: [0.25, 0.45, 1], LeftLeg: [0.04, -1, 0.15], LeftFoot: [0.05, -0.25, 1],
      RightUpLeg: [-0.25, 0.45, 1], RightLeg: [-0.04, -1, 0.15], RightFoot: [-0.05, -0.25, 1],
      LeftArm: [0.25, -0.35, 1], LeftForeArm: [-0.35, -0.55, 0.8], LeftHand: [-0.2, -1, 0.3],
      RightArm: [-0.25, -0.35, 1], RightForeArm: [0.35, -0.55, 0.8], RightHand: [0.2, -1, 0.3],
    },
  },
  lie: { // deitado de costas no chão, cabeça virada, um joelho dobrado, braços abertos
    floor: 0.045, hips: { up: [0, 0.06, -1], fwd: [0.12, 1, 0] },
    dirs: {
      Spine: [0.04, 0.05, -1], Spine1: [0.06, 0.04, -1], Spine2: [0.06, 0.03, -1], Neck: [0.1, 0.12, -1], Head: [0.7, 0.15, -1],
      LeftUpLeg: [0.22, 0.55, 1], LeftLeg: [0.12, -0.6, 1], LeftFoot: [0.15, 0.3, 1],
      RightUpLeg: [-0.18, 0.02, 1], RightLeg: [-0.12, 0, 1], RightFoot: [-0.2, 1, 0.35],
      LeftArm: [1, 0.02, -0.25], LeftForeArm: [0.55, 0.05, 0.85], LeftHand: [0.4, 0, 1],
      RightArm: [-1, 0.02, 0.1], RightForeArm: [-0.75, 0.05, -0.6], RightHand: [-0.6, 0, -1],
    },
  },
};
// pt55u: ataques em 4 quadros (pronto → preparação → golpe → recuperação), tempo do clipe = fase 0..3 do ataque
const LUNGE = { LeftUpLeg: [0.14, -1, -0.32], LeftLeg: [0.1, -1, -0.42], RightUpLeg: [-0.1, -1, 0.5], RightLeg: [-0.05, -1, 0.08], RightFoot: [-0.05, -0.35, 1] };
export const ATTACK_DEFS = {
  stab: [ // enfermeiro: faca na direita, ergue acima do ombro e crava de cima para baixo com estocada do corpo
    { lean: 0.15, dirs: { RightArm: [-0.35, -0.8, 0.45], RightForeArm: [-0.1, -0.25, 1], RightHand: [0, 0, 1], LeftArm: [0.3, -0.9, 0.25], LeftForeArm: [0.1, -0.6, 0.8] } },
    { dirs: { Spine: [0.18, 1, -0.12], Spine1: [0.22, 1, -0.15], Spine2: [0.25, 1, -0.15], Head: [0, 1, 0.35], RightArm: [-0.75, 0.55, -0.4], RightForeArm: [-0.1, 1, 0.15], RightHand: [0, 1, 0.45], LeftArm: [0.35, -0.45, 0.85], LeftForeArm: [0.05, -0.3, 1] } },
    { dirs: { ...LUNGE, Spine: [-0.1, 1, 0.5], Spine1: [-0.12, 1, 0.6], Spine2: [-0.12, 1, 0.6], Head: [0, 0.8, 0.7], RightArm: [-0.12, 0.15, 1], RightForeArm: [-0.02, -0.75, 0.9], RightHand: [0, -1, 0.35], LeftArm: [0.45, -0.9, -0.25], LeftForeArm: [0.25, -0.7, -0.4] } },
    { lean: 0.2, dirs: { RightArm: [-0.3, -0.75, 0.6], RightForeArm: [-0.1, -0.4, 1], RightHand: [0, -0.3, 1], LeftArm: [0.3, -0.9, 0.2], LeftForeArm: [0.1, -0.7, 0.6] } },
  ],
  claw: [ // infectado: braços estendidos, recua com os braços no alto e se lança arranhando para baixo, cabeça para morder
    { lean: 0.3, dirs: { Head: [0.15, 0.85, 0.6], LeftArm: [0.3, -0.25, 1], LeftForeArm: [0.1, -0.15, 1], RightArm: [-0.3, -0.25, 1], RightForeArm: [-0.1, -0.15, 1] } },
    { dirs: { Spine: [0, 1, -0.2], Spine1: [0, 1, -0.22], Spine2: [0, 1, -0.2], Neck: [0, 1, -0.1], Head: [0.2, 0.9, 0.35], LeftArm: [0.5, 0.85, -0.15], LeftForeArm: [0.15, 0.9, 0.45], LeftHand: [0, 0.6, 1], RightArm: [-0.5, 0.85, -0.15], RightForeArm: [-0.15, 0.9, 0.45], RightHand: [0, 0.6, 1] } },
    { dirs: { ...LUNGE, Spine: [0, 1, 0.75], Spine1: [0, 1, 0.85], Spine2: [0, 1, 0.9], Neck: [0, 0.6, 1], Head: [0, 0.35, 1], LeftArm: [0.15, -0.25, 1], LeftForeArm: [-0.3, -0.75, 0.7], LeftHand: [-0.3, -1, 0.2], RightArm: [-0.1, -0.1, 1], RightForeArm: [0.35, -0.6, 0.75], RightHand: [0.3, -1, 0.3] } },
    { lean: 0.35, dirs: { Head: [0.2, 0.8, 0.6], LeftArm: [0.35, -0.5, 0.85], LeftForeArm: [0.1, -0.4, 1], RightArm: [-0.35, -0.5, 0.85], RightForeArm: [-0.1, -0.4, 1] } },
  ],
};
export const DORMANT_POSES = ['sit', 'lie'];
/** pose de repouso de um inimigo dormente: opção explícita (`pose`) ou alterna sit/lie pelo id (determinístico) */
export function restPoseFor(o) {
  if (!o?.dormant) return null;
  if (o.pose && DORMANT_POSES.includes(o.pose)) return o.pose;
  let h = 0; for (const c of String(o.id || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return DORMANT_POSES[h % 2];
}

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _bq = new THREE.Quaternion();
const findBone = (root, base) => { let f = null; root.traverse((o) => { if (!f && o.isBone && (o.name === 'mixamorig' + base || o.name === base || o.name.endsWith(':' + base) || o.name.endsWith('rig' + base))) f = o; }); return f; };

/** gira `bone` para o segmento osso→filho apontar para `dir` (espaço do root) */
function aim(root, bone, child, dir) {
  root.updateMatrixWorld(true);
  const a = bone.getWorldPosition(new THREE.Vector3()), b = child.getWorldPosition(new THREE.Vector3());
  const rootQ = root.getWorldQuaternion(new THREE.Quaternion());
  _v.copy(b).sub(a).normalize();
  _w.set(...dir).normalize().applyQuaternion(rootQ);
  _q.setFromUnitVectors(_v, _w);
  bone.getWorldQuaternion(_bq); bone.parent.getWorldQuaternion(_pq);
  bone.quaternion.copy(_pq.invert().multiply(_q.multiply(_bq)));
}
/** orienta o quadril pelos eixos up (quadril→coluna) e fwd (barriga) */
function orientHips(root, hips, spine, up, fwd) {
  root.updateMatrixWorld(true);
  const a = hips.getWorldPosition(new THREE.Vector3()), b = spine.getWorldPosition(new THREE.Vector3());
  const curUp = b.sub(a).normalize(), curF = new THREE.Vector3(0, 0, 1);
  curF.sub(curUp.clone().multiplyScalar(curF.dot(curUp))).normalize();
  const m0 = new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(curUp, curF), curUp, curF);
  const U = new THREE.Vector3(...up).normalize(), F = new THREE.Vector3(...fwd); F.sub(U.clone().multiplyScalar(F.dot(U))).normalize();
  const m1 = new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(U, F), U, F);
  const d = new THREE.Quaternion().setFromRotationMatrix(m1.multiply(m0.invert()));
  hips.getWorldQuaternion(_bq); hips.parent.getWorldQuaternion(_pq);
  hips.quaternion.copy(_pq.invert().multiply(d.multiply(_bq)));
}
function lowestY(root) { root.updateMatrixWorld(true); let m = Infinity; root.traverse((o) => { if (o.isBone) m = Math.min(m, o.getWorldPosition(_v).y); }); return m; }

/** quadro "em pé" do clipe de andar: o instante com as coxas mais próximas uma da outra */
export function standTime(root, walk, steps = 24) {
  const mx = new THREE.AnimationMixer(root), act = mx.clipAction(walk).play();
  const L = findBone(root, 'LeftFoot'), R = findBone(root, 'RightFoot');
  let best = 0, bd = Infinity;
  for (let i = 0; i < steps; i++) {
    const t = (walk.duration * i) / steps; mx.setTime(t); root.updateMatrixWorld(true);
    const d = Math.abs(L.getWorldPosition(_v).z - R.getWorldPosition(_w).z); if (d < bd) { bd = d; best = t; }
  }
  act.stop(); mx.uncacheRoot(root);
  return best;
}

/** cria os clipes de pose (Pose_idle, Pose_sit, Pose_lie) para um GLB Mixamo com clipe Walking */
export function buildPoseClips(root, clips, height) {
  const walk = clips.find((c) => c.name === 'Walking'); if (!walk) return [];
  const hips = findBone(root, 'Hips'), spine = findBone(root, 'Spine'); if (!hips || !spine) return [];
  const t0 = standTime(root, walk);
  const mx = new THREE.AnimationMixer(root), act = mx.clipAction(walk).play(); mx.setTime(t0); act.stop();
  const bones = []; root.traverse((o) => { if (o.isBone) bones.push(o); });
  const stand = new Map(bones.map((b) => [b, { q: b.quaternion.clone(), p: b.position.clone() }]));
  const floor0 = lowestY(root);
  const H = height || 1.7;
  const out = [];
  const snap = () => new Map(bones.map((b) => [b, { q: b.quaternion.clone(), p: b.position.clone() }]));
  const apply = (def, lean = 0) => {
    for (const [b, s] of stand) { b.quaternion.copy(s.q); b.position.copy(s.p); }
    if (def.hips) orientHips(root, hips, spine, def.hips.up, def.hips.fwd);
    for (const name of ORDER) {
      let dir = def.dirs[name];
      if (!dir && lean && /^Spine/.test(name)) dir = [0, 1, lean];
      if (!dir) continue;
      const b = findBone(root, name), c = findBone(root, CHILD[name]); if (b && c) aim(root, b, c, dir);
    }
    if (def.floor != null) {
      const dy = floor0 + def.floor * H - lowestY(root);
      const p = hips.getWorldPosition(new THREE.Vector3()); p.y += dy; hips.parent.worldToLocal(p); hips.position.copy(p);
    }
  };
  const hn = walk.tracks.map((t) => t.name);
  const makeClip = (name, frames, dur) => {
    const tracks = [];
    for (const b of bones) {
      const qn = b.name + '.quaternion', pn = b.name + '.position';
      if (hn.includes(qn)) tracks.push(new THREE.QuaternionKeyframeTrack(qn, frames.map((_, i) => (dur * i) / (frames.length - 1)), frames.flatMap((f) => f.get(b).q.toArray())));
      if (b === hips && hn.includes(pn)) tracks.push(new THREE.VectorKeyframeTrack(pn, frames.map((_, i) => (dur * i) / (frames.length - 1)), frames.flatMap((f) => f.get(b).p.toArray())));
    }
    return new THREE.AnimationClip(name, dur, tracks);
  };
  for (const [name, def] of Object.entries(POSE_DEFS)) {
    if (def.lean) { apply(def, def.lean[0]); const a = snap(); apply(def, def.lean[1]); const b = snap(); out.push(makeClip('Pose_' + name, [a, b, a], 3.2)); }
    else { apply(def); const a = snap(); out.push(makeClip('Pose_' + name, [a, a], 1)); }
  }
  for (const [name, frames] of Object.entries(ATTACK_DEFS)) {
    const snaps = frames.map((f) => { apply({ floor: null, dirs: f.dirs }, f.lean || 0); return snap(); });
    out.push(makeClip('Pose_atk_' + name, snaps, 3));
  }
  for (const [b, s] of stand) { b.quaternion.copy(s.q); b.position.copy(s.p); }
  mx.uncacheRoot(root);
  return out;
}
