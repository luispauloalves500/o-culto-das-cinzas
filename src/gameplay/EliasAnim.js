// Camada de animação do Elias (pt67u): locomoção por direção, IK barato de pé,
// olhar, inclinação, trava do pé de apoio e medidas para os testes.
// Não altera tempos de ataque, dano nem cadência — só o visual do esqueleto.
import * as THREE from 'three';

/** deslizamento máximo aceitável do pé de apoio (m) num passo, depois da trava */
export const FOOT_SLIP_LIMIT = 0.1;

const _y = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _q = new THREE.Quaternion();
const _p0 = new THREE.Vector3(), _p1 = new THREE.Vector3(), _p2 = new THREE.Vector3(), _tgt = new THREE.Vector3();

export function wrapPi(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** classifica o deslocamento em relação à frente: idle, forward, back, left, right */
export function locoKind(moveYaw, faceYaw, hs, dead = 0.28) {
  if (!(hs > dead)) return 'idle';
  const d = wrapPi(moveYaw - faceYaw);
  const ad = Math.abs(d);
  if (ad < 0.6) return 'forward';
  if (ad > Math.PI - 0.6) return 'back';
  return d > 0 ? 'left' : 'right';
}

/**
 * Durante o apoio, o pé fica no XZ em que o apoio começou, até `maxSlip`.
 * Fora do apoio, a trava solta. Usado na trava visual e nos testes de patinação.
 */
export function lockSupport(prev, foot, support, maxSlip = FOOT_SLIP_LIMIT) {
  if (!support) return null;
  if (!prev) return { x: foot.x, z: foot.z };
  const dx = foot.x - prev.x, dz = foot.z - prev.z;
  const d = Math.hypot(dx, dz);
  if (d <= maxSlip) return prev;
  const k = maxSlip / d;
  return { x: prev.x + dx * k, z: prev.z + dz * k };
}

/** maior desvio XZ do pé em relação à trava, nos quadros de apoio */
export function supportSlip(frames, maxSlip = FOOT_SLIP_LIMIT) {
  let lock = null, worst = 0;
  for (const f of frames) {
    lock = lockSupport(lock, f, f.support, maxSlip);
    if (lock && f.support) worst = Math.max(worst, Math.hypot(f.x - lock.x, f.z - lock.z));
  }
  return worst;
}

/**
 * Ajusta a cadeia coxa–joelho–pé para a sola chegar em `groundY + sole`.
 * Rotação em espaço do mundo, peso `w` (0..1). Devolve o erro residual em Y (m).
 */
export function plantFoot(upper, mid, end, groundY, sole = 0.04, w = 1) {
  if (!upper || !mid || !end) return 0;
  end.getWorldPosition(_p2);
  const err0 = (groundY + sole) - _p2.y;
  if (err0 < -0.04 || err0 > 0.5) return err0;
  _tgt.set(_p2.x, groundY + sole, _p2.z);
  mid.getWorldPosition(_p1);
  upper.getWorldPosition(_p0);
  const l1 = _p0.distanceTo(_p1), l2 = _p1.distanceTo(_p2);
  if (l1 < 1e-4 || l2 < 1e-4) return err0;
  // joelha: aponta mid→end para o alvo, com um pouco da coxa
  _v.copy(_p2).sub(_p1).normalize();
  _w.copy(_tgt).sub(_p1);
  if (_w.lengthSq() < 1e-8) return err0;
  _w.normalize();
  _q.setFromUnitVectors(_v, _w);
  _applyWorldRot(mid, _q, w * 0.75);
  mid.updateMatrixWorld(true);
  end.updateMatrixWorld(true);
  end.getWorldPosition(_p2);
  upper.getWorldPosition(_p0);
  _v.copy(_p2).sub(_p0).normalize();
  _w.copy(_tgt).sub(_p0);
  if (_w.lengthSq() > 1e-8) {
    _w.normalize();
    _q.setFromUnitVectors(_v, _w);
    _applyWorldRot(upper, _q, w * 0.85);
    upper.updateMatrixWorld(true);
    mid.updateMatrixWorld(true);
    end.updateMatrixWorld(true);
  }
  // sola mais nivelada (pé olha para baixo-frente)
  end.getWorldPosition(_p2);
  const footChild = end.children[0] || null;
  if (footChild) {
    footChild.getWorldPosition(_p1);
    _v.copy(_p1).sub(_p2); _v.y = 0;
    if (_v.lengthSq() > 1e-8) {
      _v.normalize();
      _w.set(_v.x, -0.15, _v.z).normalize();
      _q.setFromUnitVectors(_v, _w);
      _applyWorldRot(end, _q, w * 0.5);
      end.updateMatrixWorld(true);
    }
  }
  end.getWorldPosition(_p2);
  return (groundY + sole) - _p2.y;
}

function _applyWorldRot(bone, qWorld, w) {
  if (w <= 0) return;
  const pw = bone.parent;
  const qw = new THREE.Quaternion();
  const qp = new THREE.Quaternion();
  bone.getWorldQuaternion(qw).premultiply(qWorld);
  if (pw) pw.getWorldQuaternion(qp);
  else qp.identity();
  const loc = qp.invert().multiply(qw);
  if (w >= 1) bone.quaternion.copy(loc);
  else bone.quaternion.slerp(loc, w);
}

/** olhar local (yaw/pitch) limitado, com amortecimento */
export function dampLook(cur, wantYaw, wantPitch, dt, limYaw = 0.55, limPitch = 0.4, speed = 6) {
  const ty = THREE.MathUtils.clamp(wantYaw, -limYaw, limYaw);
  const tp = THREE.MathUtils.clamp(wantPitch, -limPitch, limPitch);
  const k = 1 - Math.exp(-speed * dt);
  cur.yaw += wrapPi(ty - cur.yaw) * k;
  cur.pitch += (tp - cur.pitch) * k;
  return cur;
}

/** ponto de interesse em coordenadas locais do personagem (yaw/pitch) */
export function lookAnglesTo(origin, facingYaw, target) {
  if (!target) return { yaw: 0, pitch: 0 };
  const dx = target.x - origin.x, dy = (target.y ?? origin.y + 1.4) - (origin.y + 1.5), dz = target.z - origin.z;
  const yaw = wrapPi(Math.atan2(dx, dz) - facingYaw);
  const pitch = Math.atan2(-dy, Math.hypot(dx, dz) || 1);
  return { yaw, pitch };
}

/** devolve o alvo mais próximo à frente (lista ou um só ponto); null se nenhum serve */
export function interestInFront(origin, facingYaw, targets, maxDist = 10, maxAng = 1.15) {
  const list = Array.isArray(targets) ? targets : (targets ? [targets] : []);
  let best = null, bestD = Infinity;
  for (const t of list) {
    if (!t) continue;
    const dx = t.x - origin.x, dz = t.z - origin.z;
    const d = Math.hypot(dx, dz);
    if (d > maxDist || d < 0.2) continue;
    if (Math.abs(wrapPi(Math.atan2(dx, dz) - facingYaw)) >= maxAng) continue;
    if (d < bestD) { bestD = d; best = t; }
  }
  return best;
}

/** ângulo de inclinação (rad) a partir da taxa de curva (yaw/s) e da velocidade */
export function turnLean(turnRate, hs, max = 0.18) {
  return THREE.MathUtils.clamp(-turnRate * 0.07 * Math.min(1, hs / 2.4), -max, max);
}

/** direção do golpe em espaço do personagem: fwd/side em −1..1 (atacante à frente = fwd +) */
export function hitFacing(pos, facing, from) {
  const dx = from.x - pos.x, dz = from.z - pos.z;
  const d = Math.hypot(dx, dz) || 1;
  const fx = typeof facing === 'number' ? Math.sin(facing) : facing.x;
  const fz = typeof facing === 'number' ? Math.cos(facing) : facing.z;
  return { fwd: (dx * fx + dz * fz) / d, side: (dx * fz - dz * fx) / d };
}
