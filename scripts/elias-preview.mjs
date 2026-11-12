// Folha de poses do Elias (pt67u): rig procedural nas poses novas, projeção 2D para o desenho.
import * as THREE from 'three';
import { writeFileSync } from 'node:fs';
import { createHumanoid, resetPose, poseIdle, poseWalk, poseHit, poseDeath } from '../src/gameplay/ProceduralRig.js';
import { keys } from '../src/gameplay/ProceduralRig.js';

const mat = new THREE.MeshBasicMaterial({ color: 0x888888 });
const mats = { skin: mat, shirt: mat, arms: mat, pants: mat, legs: mat, feet: mat, head: mat };

function rig() {
  return createHumanoid({ scale: 1, mats, hunch: 0.08, face: true });
}

function pt(o) {
  const v = new THREE.Vector3();
  o.getWorldPosition(v);
  return [+v.x.toFixed(4), +v.y.toFixed(4), +v.z.toFixed(4)];
}

function skeleton(r) {
  r.root.updateMatrixWorld(true);
  return {
    hips: pt(r.hips), torso: pt(r.torso), neck: pt(r.neck), head: pt(r.head),
    shR: pt(r.armR.upper), elR: pt(r.armR.lower), wrR: pt(r.armR.end),
    shL: pt(r.armL.upper), elL: pt(r.armL.lower), wrL: pt(r.armL.end),
    hipR: pt(r.legR.upper), knR: pt(r.legR.lower), anR: pt(r.legR.end),
    hipL: pt(r.legL.upper), knL: pt(r.legL.lower), anL: pt(r.legL.end),
    body: pt(r.body),
  };
}

function poseAttack(r, t, A) {
  resetPose(r);
  r.torso.rotation.y = keys(A.torsoY, t);
  if (A.torsoX) r.torso.rotation.x = keys(A.torsoX, t);
  r.armR.upper.rotation.x = keys(A.upX, t);
  r.armR.upper.rotation.z = keys(A.upZ, t);
  r.armR.lower.rotation.x = keys(A.loX, t);
  r.armL.upper.rotation.x = keys(A.upX, t) * 0.95;
  r.armL.upper.rotation.z = -0.45;
  r.armL.lower.rotation.x = keys(A.loX, t);
  r.legR.upper.rotation.x = 0.25; r.legL.upper.rotation.x = -0.35; r.legL.lower.rotation.x = 0.3;
  r.hips.position.y = r.baseHipY - 0.06;
}

const LIGHT1 = {
  torsoY: [[0, 0], [0.28, -1.15], [0.58, 0.95], [1, 0.2]],
  upX: [[0, -0.3], [0.28, -1.65], [0.58, -1.35], [1, -0.4]],
  upZ: [[0, 0], [0.28, -0.55], [0.58, 0.35], [1, 0]],
  loX: [[0, -0.3], [0.28, -1.1], [0.5, -0.15], [1, -0.3]],
};

function snap(label, fn) {
  const r = rig();
  fn(r);
  return { label, sk: skeleton(r) };
}

const frames = [
  snap('Parado', (r) => { resetPose(r); poseIdle(r, 0.4); }),
  snap('Respiração / fadiga', (r) => { resetPose(r); poseIdle(r, 1.2, { fatigue: 1 }); }),
  snap('Vida baixa', (r) => { resetPose(r); poseIdle(r, 0.8, { limp: 1, fatigue: 0.3 }); }),
  snap('Virar no lugar', (r) => { resetPose(r); poseIdle(r, 0.3, { turn: 1 }); }),
  snap('Andar', (r) => { resetPose(r); poseWalk(r, 1.1, 1, { run: 0 }); }),
  snap('Andar para trás', (r) => { resetPose(r); poseWalk(r, 1.1, 1, { back: 1 }); }),
  snap('Andar de lado', (r) => { resetPose(r); poseWalk(r, 0.8, 1, { strafe: 1 }); }),
  snap('Correr', (r) => { resetPose(r); poseWalk(r, 1.4, 1, { run: 1 }); }),
  snap('Mancar', (r) => { resetPose(r); poseWalk(r, 1.0, 0.9, { limp: 1 }); }),
  snap('Mira', (r) => {
    resetPose(r); poseIdle(r, 0.2);
    r.armR.upper.rotation.x = -1.5; r.armR.lower.rotation.x = -0.05;
    r.armL.upper.rotation.x = -1.3; r.armL.upper.rotation.z = -0.5; r.armL.lower.rotation.x = -0.4;
    r.torso.rotation.y = 0.15; r.head.rotation.x = -0.15;
  }),
  snap('Bloquear', (r) => {
    resetPose(r); poseIdle(r, 0.2);
    r.armR.upper.rotation.x = -1.25; r.armR.upper.rotation.z = 0.55; r.armR.lower.rotation.x = -0.9;
    r.armL.upper.rotation.x = -1.2; r.armL.upper.rotation.z = -0.5; r.armL.lower.rotation.x = -1.1;
    r.torso.rotation.x = 0.12;
  }),
  snap('Esquivar', (r) => {
    resetPose(r);
    const k = Math.sin(0.5 * Math.PI);
    r.hips.position.y = r.baseHipY - 0.35 * k;
    r.torso.rotation.x = 0.7 * k;
    r.legR.upper.rotation.x = -1.0 * k; r.legR.lower.rotation.x = 1.6 * k;
    r.legL.upper.rotation.x = -0.6 * k; r.legL.lower.rotation.x = 1.4 * k;
    r.armR.upper.rotation.x = -0.8 * k; r.armL.upper.rotation.x = -0.8 * k;
  }),
  snap('Golpe (antecipação)', (r) => poseAttack(r, 0.28, LIGHT1)),
  snap('Golpe (impacto)', (r) => poseAttack(r, 0.5, LIGHT1)),
  snap('Golpe (recuperação)', (r) => poseAttack(r, 0.85, LIGHT1)),
  snap('Dano à frente', (r) => { resetPose(r); poseHit(r, 0.21, { fwd: 1, side: 0 }); }),
  snap('Dano à esquerda', (r) => { resetPose(r); poseHit(r, 0.21, { fwd: 0, side: 1 }); }),
  snap('Dano à direita', (r) => { resetPose(r); poseHit(r, 0.21, { fwd: 0, side: -1 }); }),
  snap('Curar (bandagem)', (r) => {
    resetPose(r);
    const wrap = 1;
    r.torso.rotation.x = 0.38; r.head.rotation.x = 0.22;
    r.armR.upper.rotation.x = -1.05; r.armL.upper.rotation.x = -1.05;
    r.armR.upper.rotation.z = 0.35; r.armL.upper.rotation.z = -0.25;
    r.armR.lower.rotation.x = -1.35; r.armL.lower.rotation.x = -1.25;
  }),
  snap('Escalar', (r) => {
    resetPose(r);
    const s = 0.8;
    r.armR.upper.rotation.x = -2.5 + s * 0.35; r.armL.upper.rotation.x = -2.5 - s * 0.35;
    r.armR.lower.rotation.x = -0.5 - Math.max(0, s) * 0.5; r.armL.lower.rotation.x = -0.5 - Math.max(0, -s) * 0.5;
    r.legR.upper.rotation.x = -0.6 - Math.max(0, -s) * 0.5; r.legL.upper.rotation.x = -0.6 - Math.max(0, s) * 0.5;
    r.legR.lower.rotation.x = 0.9; r.legL.lower.rotation.x = 0.9;
    r.torso.rotation.x = 0.08;
  }),
  snap('Morte (meio)', (r) => { resetPose(r); poseDeath(r, 0.4); }),
  snap('Morte (assentada)', (r) => { resetPose(r); poseDeath(r, 0.8); }),
];

const walk = [];
for (let i = 0; i < 8; i++) {
  walk.push(snap('passo ' + (i + 1), (r) => { resetPose(r); poseWalk(r, i * Math.PI / 4, 1, { run: 0 }); }));
}

const out = { frames, walk };
writeFileSync('/tmp/elias-poses.json', JSON.stringify(out));
console.log('frames', frames.length, 'walk', walk.length);
