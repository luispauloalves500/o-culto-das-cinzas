// Capítulo 8 — A Última Chama · a TORRE DE TRANSMISSÃO (resto do capítulo).
// Base da torre (y 0) → CASA DE MÁQUINAS (y 7: guincho do monta-cargas, banco de baterias, faca de força, Helena
// ferida) → SALA DOS TRANSMISSORES (y 13,5: bobinas, acumuladores de vapor, a lâmpada da Primeira Cinza e Inês na
// cadeira). Tudo é geometria e colisão reais: a escada de marinheiro (startClimb) liga a base à casa de máquinas por um
// alçapão; o MONTA-CARGAS é uma cabine com piso de colisão dinâmico que leva o jogador (e Helena) entre as três paradas,
// com portas pantográficas que só abrem com a cabine parada no andar.
import * as THREE from 'three';
import { createHumanoid, resetPose, poseWalk, poseIdle } from '../../gameplay/ProceduralRig.js';

export const MACH_Y = 7;
export const ARENA_Y = 13.5;
export const ARENA_TOP = 20;
export const TB = { minX: 8, maxX: 18, minZ: 68, maxZ: 76 };
export const SHAFT = { minX: 11, maxX: 15, minZ: 72.4, maxZ: 75.8 };
export const CAB = { minX: 11.05, maxX: 14.95, minZ: 72.45, maxZ: 75.75 };
export const HOUSING_TOP = ARENA_Y + 3.7;
export const LIFT_STOPS = { base: 0, maq: MACH_Y, topo: ARENA_Y };
export const LIFT_ORDER = ['base', 'maq', 'topo'];
export const LIFT_SPEED = 1.6;
export const GATE_H = 2.7;
export const HATCH = { minX: 8, maxX: 9.3, minZ: 68.1, maxZ: 70.6 };
export const LADDER_T1 = { id: 'c8_towerLadder', x: 8.5, z: 69.4, y0: 0, y1: MACH_Y, yaw: -Math.PI / 2, top: { x: 9.9, z: 69.4 }, bottom: { x: 9.2, z: 69.4 } };
export const KNIFE = { x: 16.8, z: 68.35, use: { x: 16.8, z: 69.5 } };
export const BATTERIES = { minX: 11.2, maxX: 16.2, minZ: 68.1, maxZ: 68.9 };
export const WINCH = { minX: 15.6, maxX: 17.6, minZ: 73, maxZ: 75.4 };
export const HELENA_SEAT = { x: 9.0, z: 74.4, yaw: Math.PI / 2 };
export const HELENA_DOC = { x: 8.8, z: 75.45 };
export const MACH_BOOK = { x: 17.35, z: 71.5, use: { x: 16.5, z: 71.5 } };
export const ARENA = { minX: 3, maxX: 23, minZ: 68, maxZ: 88 };
export const ARENA_EXIT_Z = 76.6;
// acumuladores de vapor da torre: girar o registro → o jato sai pelo bocal (raio STEAM.r) depois de STEAM.delay
export const ARENA_STEAM = [
  { id: 'W', tank: { x: 3.9, z: 72 }, use: { x: 4.9, z: 73.6 }, plume: { x: 6.6, z: 76.6 } },
  { id: 'E', tank: { x: 22.1, z: 72 }, use: { x: 21.1, z: 73.6 }, plume: { x: 19.4, z: 76.6 } },
];
export const STEAM = { hold: 1.6, delay: 0.8, dur: 5, recharge: 12, r: 2.0, dmg: 5, every: 0.25 };
// bobinas de Tesla que alimentam a lâmpada (e, depois, a Manifestação); cada uma tem um disjuntor na parede
export const ARENA_COILS = [
  { id: 'W', x: 5.4, z: 81.5, breaker: { x: 3.25, z: 81.5 }, use: { x: 4.1, z: 81.5 } },
  { id: 'E', x: 20.6, z: 81.5, breaker: { x: 22.75, z: 81.5 }, use: { x: 21.9, z: 81.5 } },
  { id: 'N', x: 18.2, z: 85.4, breaker: { x: 18.2, z: 87.75 }, use: { x: 18.2, z: 86.9 } },
];
export const COIL_R = 0.7;
export const COIL_HOLD = 1.6;
export const BULB = { x: 13, z: 86.4, y: ARENA_Y + 1.45, r: 0.36, pedestal: { minX: 12.3, maxX: 13.7, minZ: 85.7, maxZ: 87.1 } };
export const INES_CHAIR = { x: 10.2, z: 85.6, yaw: Math.PI * 0.85 };
export const INES_USE = { x: 10.6, z: 84.3 };
export const HELENA_ARENA = { x: 15.6, z: 84.0, yaw: -Math.PI * 0.75 };
export const VERNET_START = { x: 13, z: 83.6, yaw: Math.PI };
export const MANIF_CENTER = { x: 13, z: 81 };

export const TOWER_CHECKPOINTS = {
  c8_machine: { x: 12.5, y: MACH_Y, z: 70.9, yaw: Math.PI / 2 },
  c8_top: { x: 13, y: ARENA_Y, z: 77.2, yaw: 0 },
  c8_arena: { x: 7.5, y: ARENA_Y, z: 77.5, yaw: 1.0 },
  c8_free: { x: 12, y: ARENA_Y, z: 80.5, yaw: 0 },
  c8_end: { x: 13, y: ARENA_Y, z: 83.2, yaw: 0 },
};
export const TOWER_ZONES = [
  { id: 'c8_maquinas', minX: 8, maxX: 18, minZ: 68, maxZ: 76, minY: 6.5, maxY: 13.2, fog: 0x0e0b09, density: 0.045, acoustic: 1.1 },
  { id: 'c8_transmissores', minX: 3, maxX: 23, minZ: 68, maxZ: 88, minY: 13.2, maxY: 21, fog: 0x12100f, density: 0.03, acoustic: 1.3 },
];

/** parada em que a cabine fica ao carregar o checkpoint */
export function liftStopFor(cp, flags = {}) {
  if (cp === 'c8_top' || cp === 'c8_arena' || cp === 'c8_free' || cp === 'c8_end') return 'topo';
  if (flags.c8_atTop) return 'topo';
  return 'maq';
}
export function inSteamPlume(V, p) { return Math.hypot(p.x - V.plume.x, p.z - V.plume.z) <= STEAM.r && Math.abs(p.y - ARENA_Y) < 2.2; }
export function inCabin(p, y, tol = 0.35) {
  return p.x > CAB.minX && p.x < CAB.maxX && p.z > CAB.minZ && p.z < CAB.maxZ && Math.abs(p.y - y) < tol;
}

/** monta-cargas: estado puro (posição, destino, paradas) — o nível desenha e a colisão lê lift.y */
export class Lift {
  constructor(stop = 'maq') { this.y = LIFT_STOPS[stop] ?? MACH_Y; this.target = this.y; this.moving = false; this.dir = 0; this.trips = 0; this.dist = 0; }
  get stop() {
    if (this.moving) return null;
    for (const k of LIFT_ORDER) if (Math.abs(this.y - LIFT_STOPS[k]) < 0.01) return k;
    return null;
  }
  /** parada vizinha (dir +1 sobe, −1 desce) */
  next(dir) { const i = LIFT_ORDER.indexOf(this.stop); return i < 0 ? null : LIFT_ORDER[i + dir] || null; }
  go(stop) {
    const y = LIFT_STOPS[stop];
    if (y === undefined || this.moving || Math.abs(y - this.y) < 0.01) return false;
    this.target = y; this.moving = true; this.dir = Math.sign(y - this.y);
    return true;
  }
  place(stop) { this.y = this.target = LIFT_STOPS[stop]; this.moving = false; this.dir = 0; }
  /** avança; devolve o nome da parada quando chega */
  update(dt) {
    if (!this.moving) return null;
    const d = this.target - this.y;
    // arranca e freia devagar (cabos e contrapeso)
    const s = LIFT_SPEED * Math.min(1, 0.35 + Math.abs(d) / 1.2) * dt;
    if (Math.abs(d) <= s) { this.dist += Math.abs(d); this.y = this.target; this.moving = false; this.dir = 0; this.trips++; return this.stop; }
    this.y += Math.sign(d) * s; this.dist += s;
    return null;
  }
}

// ---------- NPCs (Helena e Inês): humanoides procedurais com poses sentada/em pé/andando ----------
export function makeNpc(M, kind) {
  const helena = kind === 'helena';
  const s = helena ? 0.96 : 0.9;
  const coat = helena ? (M.nurseCoat || M.linen) : (M.linen || M.gown);
  const rig = createHumanoid({ scale: s, hunch: helena ? 0.05 : 0.08, torsoW: 0.4, armLen: 0.3, armW: 0.09, legLen: 0.46,
    mats: { skin: M.skin, shirt: coat, arms: coat, pants: helena ? M.pantsGray : coat, legs: helena ? M.pantsGray : M.skin, feet: M.leatherDark, head: M.skin } });
  const h = rig.head;
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.24 * s, helena ? 0.08 * s : 0.1 * s, 0.26 * s), M.coal || M.leatherDark);
  hair.position.set(0, 0.28 * s, -0.01); h.add(hair);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.23 * s, helena ? 0.12 * s : 0.36 * s, 0.06 * s), M.coal || M.leatherDark);
  back.position.set(0, helena ? 0.2 * s : 0.08 * s, -0.13 * s); h.add(back);
  if (helena) {
    // sangue no flanco (ferida) e a maleta de chumbo
    const blood = new THREE.Mesh(new THREE.BoxGeometry(0.16 * s, 0.18 * s, 0.02), M.bloodDecal || M.ember); blood.position.set(0.12 * s, 0.25 * s, 0.13 * s); rig.torso.add(blood);
    const caseM = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.1), M.steelDark || M.metal); caseM.position.set(0, -0.12, 0.02); rig.armL.end.add(caseM);
    rig.case = caseM;
  } else {
    // vestido até os joelhos (Inês)
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.42 * s, 0.42 * s, 0.28 * s), coat); skirt.position.set(0, -0.22 * s, 0); rig.hips.add(skirt);
  }
  return { kind, rig, pos: new THREE.Vector3(), yaw: 0, mode: 'stand', walk: null, phase: 0, t: 0, ride: false };
}
export function placeNpc(n, x, y, z, yaw) { n.pos.set(x, y, z); n.yaw = yaw; n.rig.root.position.copy(n.pos); n.rig.root.rotation.y = yaw; }
/** a NPC anda em linha reta até (x,z) — usado só em trechos sem obstáculo (saída da cabine) */
export function npcWalkTo(n, pts, speed = 1.2, onArrive = null) { n.walk = { pts: pts.slice(), speed, onArrive }; n.mode = 'walk'; }
export function updateNpc(n, dt) {
  const r = n.rig; n.t += dt;
  resetPose(r);
  if (n.walk) {
    const w = n.walk, tgt = w.pts[0];
    const dx = tgt.x - n.pos.x, dz = tgt.z - n.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.08) {
      w.pts.shift();
      if (!w.pts.length) { n.walk = null; n.mode = 'stand'; if (tgt.yaw !== undefined) n.yaw = tgt.yaw; w.onArrive?.(); }
    } else {
      const st = Math.min(d, w.speed * dt);
      n.pos.x += (dx / d) * st; n.pos.z += (dz / d) * st;
      n.yaw = Math.atan2(dx, dz);
      n.phase += dt * w.speed * 4.2;
      poseWalk(r, n.phase, 1, 0);
    }
  }
  const s = r.scale;
  if (n.mode === 'sitFloor') {
    r.body.position.y = -(r.baseHipY - 0.13 * s);
    r.legR.upper.rotation.x = -1.4; r.legL.upper.rotation.x = -1.25; r.legL.lower.rotation.x = 0.5;
    r.torso.rotation.x = -0.18 + Math.sin(n.t * 1.3) * 0.02;
    r.armL.upper.rotation.x = -0.5; r.armL.lower.rotation.x = -1.2;   // mão na ferida
    r.armR.upper.rotation.z = -0.2; r.head.rotation.x = 0.15;
  } else if (n.mode === 'sitChair') {
    r.body.position.y = -(r.baseHipY - 0.5);
    r.legR.upper.rotation.x = -1.5; r.legL.upper.rotation.x = -1.5; r.legR.lower.rotation.x = 1.45; r.legL.lower.rotation.x = 1.45;
    r.armR.upper.rotation.x = -0.55; r.armL.upper.rotation.x = -0.55; r.armR.lower.rotation.x = -0.6; r.armL.lower.rotation.x = -0.6;
    r.head.rotation.x = n.limp ? 0.55 : 0.1 + Math.sin(n.t * 0.9) * 0.05;
    r.head.rotation.y = n.limp ? 0.2 : Math.sin(n.t * 0.5) * 0.2;
  } else if (n.mode === 'stand') {
    poseIdle(r, n.t);
    if (n.hold) { r.armL.upper.rotation.x = -0.9; r.armL.lower.rotation.x = -0.6; }
  }
  r.root.position.copy(n.pos); r.root.rotation.y = n.yaw;
}

// ---------- geometria ----------
export function buildTower(L) {
  const b = L.b, M = L.M, g = L.game, col = g.col;
  const T = TB, S = SHAFT;
  L.tower = { gates: {}, valves: {}, coils: {}, breakers: {} };
  const tw = L.tower;
  L.lift = new Lift('maq');
  L.liftLocked = false;
  L.ashStorm = 0;

  // ===== BASE (y 0) =====
  b.floor(T.minX, T.minZ, T.maxX, T.maxZ, 0, 'concrete', 'c8_torre');
  b.wallZ(T.minX, T.minZ, T.maxZ, 0, ARENA_Y, [], 'brick');
  b.wallZ(T.maxX, T.minZ, T.maxZ, 0, ARENA_Y, [], 'brick');
  b.wallX(T.maxZ, T.minX, T.maxX, 0, ARENA_Y, [], 'brick');
  b.wallX(T.minZ, T.minX, T.maxX, 9, ARENA_Y, [], 'brick');   // acima do teto da Sala da Turbina
  // laje da casa de máquinas (com o alçapão da escada e o poço) + colisor de teto da base (câmera)
  const machPieces = [
    [HATCH.maxX, T.minZ, T.maxX, HATCH.maxZ], [T.minX, HATCH.maxZ, T.maxX, S.minZ],
    [T.minX, S.minZ, S.minX, T.maxZ], [S.maxX, S.minZ, T.maxX, T.maxZ], [S.minX, S.maxZ, S.maxX, T.maxZ],
  ];
  for (const [a, c, d, e] of machPieces) {
    b.floor(a, c, d, e, MACH_Y, 'steelDark', 'c8_maquinas');
    col.addBox(a, MACH_Y - 0.3, c, d, MACH_Y - 0.02, e, { tag: 'ceiling', blocksSight: true });
  }
  // borda do alçapão: guarda-corpo baixo (a escada se pega por cima dele)
  b.box(HATCH.maxX - 0.05, MACH_Y, HATCH.minZ, HATCH.maxX + 0.05, MACH_Y + 1.0, HATCH.maxZ, 'rust', { tag: 'prop-low', sight: false });
  b.box(HATCH.minX, MACH_Y, HATCH.maxZ - 0.05, HATCH.maxX + 0.05, MACH_Y + 1.0, HATCH.maxZ + 0.05, 'rust', { tag: 'prop-low', sight: false });
  // escada de marinheiro na parede oeste
  const LX = 8.18;
  for (const z of [LADDER_T1.z - 0.25, LADDER_T1.z + 0.25]) b.box(LX - 0.03, 0, z - 0.03, LX + 0.03, MACH_Y + 1.1, z + 0.03, 'rust', { collide: false });
  for (let y = 0.3; y < MACH_Y + 1; y += 0.32) b.box(LX - 0.025, y, LADDER_T1.z - 0.25, LX + 0.025, y + 0.04, LADDER_T1.z + 0.25, 'rust', { collide: false });
  L.sign('CASA DE MÁQUINAS ↑', 8.13, 2.6, 70.8, Math.PI / 2, 1.5, 0.2, { bg: '#1a1712', fg: '#cbbf98' });

  // ===== POÇO DO MONTA-CARGAS =====
  b.box(S.minX - 0.1, 0, S.minZ, S.minX, ARENA_Y, S.maxZ + 0.1, 'rust', { tag: 'wall' });
  b.box(S.maxX, 0, S.minZ, S.maxX + 0.1, ARENA_Y, S.maxZ + 0.1, 'rust', { tag: 'wall' });
  b.box(S.minX - 0.1, ARENA_Y, S.minZ - 0.1, S.minX, HOUSING_TOP, S.maxZ, 'rust', { tag: 'obstacle' });
  b.box(S.maxX, ARENA_Y, S.minZ - 0.1, S.maxX + 0.1, HOUSING_TOP, S.maxZ, 'rust', { tag: 'obstacle' });
  b.box(S.minX, 0, S.maxZ, S.maxX, ARENA_Y, S.maxZ + 0.1, 'rust', { tag: 'wall' });
  b.box(S.minX - 0.1, ARENA_Y, S.minZ - 0.1, S.maxX + 0.1, HOUSING_TOP, S.minZ, 'rust', { tag: 'obstacle' });
  b.box(S.minX - 0.1, HOUSING_TOP, S.minZ - 0.1, S.maxX + 0.1, HOUSING_TOP + 0.2, S.maxZ + 0.1, 'steelDark', { tag: 'ceiling' });
  // paredes sul do poço acima das portas (base e casa de máquinas); dintel da porta de cima
  b.box(S.minX, GATE_H, S.minZ - 0.1, S.maxX, MACH_Y - 0.3, S.minZ, 'rust', { tag: 'wall' });
  b.box(S.minX, MACH_Y + GATE_H, S.minZ - 0.1, S.maxX, ARENA_Y - 0.3, S.minZ, 'rust', { tag: 'wall' });
  b.box(S.minX, ARENA_Y + GATE_H, S.maxZ, S.maxX, HOUSING_TOP, S.maxZ + 0.1, 'rust', { tag: 'obstacle' });
  // portas pantográficas (colisor real; abrem só com a cabine parada no andar)
  const mkGate = (id, z, y0, face) => {
    const coll = col.addBox(S.minX, y0, z - 0.07, S.maxX, y0 + GATE_H, z + 0.07, { tag: 'door', blocksSight: false });
    const grp = new THREE.Group(); b.group.add(grp);
    const bars = [];
    for (let i = 0; i <= 10; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, GATE_H - 0.1, 0.05), M.rust); m.position.set(S.minX + 0.1 + i * 0.38, y0 + GATE_H / 2, z); grp.add(m); bars.push(m);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(S.maxX - S.minX, 0.08, 0.1), M.steelDark); rail.position.set((S.minX + S.maxX) / 2, y0 + GATE_H - 0.04, z); grp.add(rail);
    // botoeira de chamada ao lado da porta
    const px = S.maxX + 0.45, pz = z + face * 0.12;
    b.box(px - 0.15, y0 + 1.0, pz - 0.05, px + 0.15, y0 + 1.5, pz + 0.05, 'steelDark', { collide: false });
    const lampMat = (M.lampRed || M.ember).clone();
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), lampMat); lamp.position.set(px, y0 + 1.38, pz + face * 0.05); b.group.add(lamp);
    tw.gates[id] = { id, z, y0, coll, bars, k: 0, lamp, lampMat };
  };
  mkGate('base', S.minZ - 0.05, 0, -1);
  mkGate('maq', S.minZ - 0.05, MACH_Y, -1);
  mkGate('topo', S.maxZ + 0.05, ARENA_Y, 1);
  L.sign('MONTA-CARGAS — TORRE DE TRANSMISSÃO', 13, 2.95, S.minZ - 0.12, Math.PI, 2.8, 0.24, { bg: '#2a1a0c', fg: '#f0c070' });

  // ===== CABINE =====
  const cab = new THREE.Group(); g.scene.add(cab); tw.cabin = cab;
  const cw = CAB.maxX - CAB.minX, cd = CAB.maxZ - CAB.minZ, cx = (CAB.minX + CAB.maxX) / 2, cz = (CAB.minZ + CAB.maxZ) / 2;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.14, cd), M.steelDark); plate.position.set(cx, -0.07, cz); cab.add(plate);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.1, cd), M.rust); roof.position.set(cx, 2.85, cz); cab.add(roof);
  for (const [x, z] of [[CAB.minX + 0.05, CAB.minZ + 0.05], [CAB.maxX - 0.05, CAB.minZ + 0.05], [CAB.minX + 0.05, CAB.maxZ - 0.05], [CAB.maxX - 0.05, CAB.maxZ - 0.05]]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.85, 0.08), M.rust); post.position.set(x, 1.42, z); cab.add(post);
  }
  for (const y of [0.5, 1.0]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, cd), M.rust); r.position.set(CAB.minX + 0.08, y, cz); cab.add(r); }
  // painel de alavancas (parede leste da cabine)
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 1.9), M.steelDark); panel.position.set(CAB.maxX - 0.12, 1.15, 74.1); cab.add(panel);
  tw.levers = {};
  for (const [id, z] of [['up', 73.4], ['down', 74.8]]) {
    const piv = new THREE.Group(); piv.position.set(CAB.maxX - 0.2, 1.15, z); cab.add(piv);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.05), M.brass || M.metal); arm.position.y = 0.2; piv.add(arm);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), id === 'up' ? (M.lampGreen || M.brass) : (M.lampRed || M.ember)); knob.position.y = 0.42; piv.add(knob);
    piv.visible = false; tw.levers[id] = piv;     // a manete encaixa no eixo
  }
  const cabLampMat = (M.lampOn || M.ember).clone();
  const cabLamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.2), cabLampMat); cabLamp.position.set(cx, 2.78, cz); cab.add(cabLamp);
  tw.cabLampMat = cabLampMat;
  col.addFloor({ minX: CAB.minX, maxX: CAB.maxX, minZ: CAB.minZ, maxZ: CAB.maxZ, y: () => L.lift.y, name: 'c8_cabine' });
  // cabos (do teto da cabine ao alto do poço) — esticam conforme ela anda
  const cable = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1, 0.04), M.steel || M.metal); g.scene.add(cable); tw.cable = cable;

  // ===== CASA DE MÁQUINAS (y 7) =====
  const MY = MACH_Y;
  // guincho: tambor que gira quando a cabine anda
  b.box(WINCH.minX, MY, WINCH.minZ, WINCH.maxX, MY + 0.4, WINCH.maxZ, 'steelDark', { tag: 'obstacle' });
  b.box(WINCH.minX, MY + 0.4, WINCH.minZ, WINCH.minX + 0.2, MY + 1.9, WINCH.maxZ, 'rust', { tag: 'obstacle' });
  b.box(WINCH.maxX - 0.2, MY + 0.4, WINCH.minZ, WINCH.maxX, MY + 1.9, WINCH.maxZ, 'rust', { tag: 'obstacle' });
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, WINCH.maxX - WINCH.minX - 0.45, 14), M.boilerIron || M.steel);
  drum.rotation.z = Math.PI / 2; drum.position.set((WINCH.minX + WINCH.maxX) / 2, MY + 1.15, (WINCH.minZ + WINCH.maxZ) / 2); b.group.add(drum);
  for (let i = 0; i < 4; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.3, WINCH.maxX - WINCH.minX - 0.5), M.rust); st.rotation.y = Math.PI / 2; const piv = new THREE.Group(); piv.rotation.y = (i * Math.PI) / 4; piv.add(st); drum.add(piv); }
  tw.drum = drum;
  b.box(S.maxX + 0.1, ARENA_Y - 0.8, 74, WINCH.minX + 0.6, ARENA_Y - 0.6, 74.4, 'steel', { collide: false });
  // banco de baterias (acumuladores ácidos) + faca de força
  b.box(BATTERIES.minX, MY, BATTERIES.minZ, BATTERIES.maxX, MY + 1.0, BATTERIES.maxZ, 'woodDark', { tag: 'prop-low', sight: false });
  for (let x = BATTERIES.minX + 0.3; x < BATTERIES.maxX - 0.2; x += 0.55) {
    b.box(x - 0.2, MY + 1.0, 68.25, x + 0.2, MY + 1.42, 68.75, M.vial || 'glass', { collide: false });
    b.box(x - 0.04, MY + 1.42, 68.45, x + 0.04, MY + 1.5, 68.55, 'brass', { collide: false });
  }
  b.box(KNIFE.x - 0.5, MY + 1.0, 68.1, KNIFE.x + 0.5, MY + 2.2, 68.3, 'woodDark', { collide: false });
  const knife = new THREE.Group(); knife.position.set(KNIFE.x, MY + 1.6, 68.42); b.group.add(knife);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.06), M.brass || M.metal); blade.position.x = 0.2; knife.add(blade);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.06), M.woodDark); handle.position.set(0.42, 0, 0.04); knife.add(handle);
  knife.rotation.z = 1.2; tw.knife = knife;
  const kLampMat = (M.lampRed || M.ember).clone();
  const kLamp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.04), kLampMat); kLamp.position.set(KNIFE.x - 0.35, MY + 2.0, 68.33); b.group.add(kLamp);
  tw.knifeLampMat = kLampMat;
  L.sign('FORÇA DO MONTA-CARGAS', KNIFE.x, MY + 2.45, 68.15, 0, 1.2, 0.18, { bg: '#2a1a0c', fg: '#f0c070' });
  // caixotes: diário de Helena (oeste) e livro de registros (leste)
  b.box(8.2, MY, 75.0, 9.4, MY + 0.65, 75.9, 'woodDark', { tag: 'prop-low', sight: false });
  b.box(16.8, MY, 71.0, 17.9, MY + 0.8, 72.0, 'woodDark', { tag: 'prop-low', sight: false });
  // trapos e uma maleta aberta ao lado de Helena (curativos)
  b.box(9.4, MY, 73.2, 10.0, MY + 0.06, 73.8, 'linen', { collide: false });
  L.sign('CASA DE MÁQUINAS — Nº 3', 13, MY + 3.4, T.minZ + 0.12, 0, 1.8, 0.24, { bg: '#1a1712', fg: '#cbbf98' });

  // ===== SALA DOS TRANSMISSORES (y 13,5) =====
  const AY = ARENA_Y, A = ARENA;
  const arenaPieces = [[A.minX, A.minZ, A.maxX, S.minZ], [A.minX, S.minZ, S.minX, S.maxZ], [S.maxX, S.minZ, A.maxX, S.maxZ], [A.minX, S.maxZ, A.maxX, A.maxZ]];
  for (const [a, c, d, e] of arenaPieces) {
    // a laje da casa de máquinas vai até TB; o resto é a sala, maior que a base (balanço sobre a turbina)
    b.floor(a, c, d, e, AY, 'steelDark', 'c8_transmissores');
  }
  for (const [a, c, d, e] of machPieces.concat([[HATCH.minX, HATCH.minZ, HATCH.maxX, HATCH.maxZ]])) col.addBox(a, AY - 0.3, c, d, AY - 0.02, e, { tag: 'ceiling', blocksSight: true });
  b.wallZ(A.minX, A.minZ, A.maxZ, AY, ARENA_TOP, [], 'brick');
  b.wallZ(A.maxX, A.minZ, A.maxZ, AY, ARENA_TOP, [], 'brick');
  b.wallX(A.minZ, A.minX, A.maxX, AY, ARENA_TOP, [], 'brick');
  b.wallX(A.maxZ, A.minX, A.maxX, AY, ARENA_TOP, [], 'brick');
  b.ceiling(A.minX, A.minZ, A.maxX, A.maxZ, ARENA_TOP, 'soot');
  // janelões sobre a cidade (vidro escuro, caixilhos)
  for (const z of [72, 78, 84]) for (const x of [A.minX + 0.06, A.maxX - 0.06]) {
    b.box(x - 0.04, AY + 2.4, z - 1.4, x + 0.04, AY + 5.4, z + 1.4, M.moonGlass || 'glass', { collide: false });
    b.box(x - 0.06, AY + 3.85, z - 1.4, x + 0.06, AY + 3.95, z + 1.4, 'rust', { collide: false });
  }
  // vigas do teto (treliça)
  for (const z of [71, 76, 81, 86]) b.box(A.minX, ARENA_TOP - 0.6, z - 0.12, A.maxX, ARENA_TOP - 0.4, z + 0.12, 'rust', { collide: false });
  // transmissores (armários de válvulas) na parede norte, leste
  b.box(19.5, AY, 87.2, 22.5, AY + 2.6, 87.9, 'steelDark', { tag: 'wall' });
  for (let x = 19.8; x < 22.4; x += 0.5) for (const y of [1.2, 1.7, 2.2]) b.box(x - 0.08, AY + y, 87.12, x + 0.08, AY + y + 0.16, 87.2, M.vial || 'glass', { collide: false });
  b.box(3.6, AY, 87.2, 7.6, AY + 2.6, 87.9, 'steelDark', { tag: 'wall' });
  for (let x = 3.9; x < 7.5; x += 0.5) b.box(x - 0.08, AY + 1.7, 87.12, x + 0.08, AY + 1.86, 87.2, M.vial || 'glass', { collide: false });
  L.sign('SALA DOS TRANSMISSORES', 13, AY + 4.4, A.maxZ - 0.12, Math.PI, 2.8, 0.3, { bg: '#2a1a0c', fg: '#f0c070' });
  // acumuladores de vapor (W/E), com registro e bocal apontado para o centro
  for (const V of ARENA_STEAM) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 3.2, 14), M.boilerIron || M.rust);
    tank.position.set(V.tank.x, AY + 1.6, V.tank.z); b.group.add(tank);
    col.addBox(V.tank.x - 0.8, AY, V.tank.z - 0.8, V.tank.x + 0.8, AY + 3.2, V.tank.z + 0.8, { tag: 'obstacle' });
    // tubo até o bocal sobre o chão (a nuvem desce no círculo do bocal)
    const nx = V.plume.x, nz = V.plume.z;
    const len = Math.hypot(nx - V.tank.x, nz - V.tank.z);
    const pipe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, len), M.rust);
    pipe.position.set((nx + V.tank.x) / 2, AY + 3.6, (nz + V.tank.z) / 2); pipe.rotation.y = Math.atan2(nx - V.tank.x, nz - V.tank.z); b.group.add(pipe);
    const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.28, 0.35, 10), M.brass || M.rust); noz.position.set(nx, AY + 3.45, nz); b.group.add(noz);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 6, 14), M.ember || M.rust);
    wheel.position.set(V.use.x - Math.sign(V.use.x - V.tank.x) * 0.25, AY + 1.2, V.use.z - 0.45); b.group.add(wheel);
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.01), M.needle || M.coal);
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 12), M.gauge || M.paper); dial.rotation.x = Math.PI / 2;
    dial.position.set(V.tank.x, AY + 2.0, V.tank.z + 0.82); b.group.add(dial);
    needle.position.set(V.tank.x, AY + 2.0, V.tank.z + 0.84); b.group.add(needle);
    const steamMat = (M.steam || M.glass).clone(); steamMat.transparent = true; steamMat.opacity = 0; steamMat.depthWrite = false;
    const plume = new THREE.Mesh(new THREE.CylinderGeometry(0.5, STEAM.r, 3.3, 16, 1, true), steamMat);
    plume.position.set(nx, AY + 1.65, nz); plume.visible = false; b.group.add(plume);
    tw.valves[V.id] = { V, wheel, needle, plume, steamMat, charge: 1, plumeT: 0, delayT: 0 };
  }
  // bobinas (obstáculos reais: a investida bate nelas)
  for (const C of ARENA_COILS) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(COIL_R, COIL_R + 0.1, 0.5, 14), M.steelDark); base.position.set(C.x, AY + 0.25, C.z); b.group.add(base);
    const wind = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 2.1, 14), M.brass || M.rust); wind.position.set(C.x, AY + 1.55, C.z); b.group.add(wind);
    const torusMat = (M.steel || M.metal).clone(); if (torusMat.emissive) torusMat.emissive.set(0x3a6aff);
    const tor = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.16, 8, 18), torusMat); tor.rotation.x = Math.PI / 2; tor.position.set(C.x, AY + 2.85, C.z); b.group.add(tor);
    col.addBox(C.x - COIL_R, AY, C.z - COIL_R, C.x + COIL_R, AY + 3, C.z + COIL_R, { tag: 'obstacle' });
    // cabo grosso até a lâmpada
    const dx = BULB.x - C.x, dz = BULB.z - C.z, len = Math.hypot(dx, dz);
    const cab2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, len), M.leatherDark); cab2.position.set((BULB.x + C.x) / 2, AY + 0.04, (BULB.z + C.z) / 2); cab2.rotation.y = Math.atan2(dx, dz); b.group.add(cab2);
    // disjuntor na parede
    const wallFace = C.id === 'N' ? 0 : C.id === 'W' ? 1 : -1;
    const bx = C.breaker.x, bz = C.breaker.z;
    if (C.id === 'N') b.box(bx - 0.35, AY + 1.0, bz - 0.12, bx + 0.35, AY + 1.9, bz + 0.12, 'steelDark', { collide: false });
    else b.box(bx - 0.12, AY + 1.0, bz - 0.35, bx + 0.12, AY + 1.9, bz + 0.35, 'steelDark', { collide: false });
    const lever = new THREE.Group(); lever.position.set(bx + wallFace * 0.15, AY + 1.45, bz + (C.id === 'N' ? -0.15 : 0)); b.group.add(lever);
    const la = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.06), M.ember || M.rust); la.position.y = 0.18; lever.add(la);
    tw.coils[C.id] = { C, tor, torusMat, lever, live: true };
    L.sign('DISJUNTOR ' + C.id, bx + wallFace * 0.14, AY + 2.15, bz + (C.id === 'N' ? -0.14 : 0), C.id === 'N' ? Math.PI : C.id === 'W' ? Math.PI / 2 : -Math.PI / 2, 0.9, 0.16, { bg: '#2a1a0c', fg: '#f0c070' });
  }
  // a lâmpada da Primeira Cinza sobre o pedestal
  const P = BULB.pedestal;
  b.box(P.minX, AY, P.minZ, P.maxX, AY + 1.05, P.maxZ, 'brass', { tag: 'obstacle' });
  const bulbMat = (M.vial || M.glass).clone(); bulbMat.transparent = true; bulbMat.opacity = 0.55;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(BULB.r, 16, 12), bulbMat); bulb.position.set(BULB.x, BULB.y, BULB.z); b.group.add(bulb);
  const emberMat = (M.fireCore || M.ember).clone();
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), emberMat); flame.position.set(BULB.x, BULB.y, BULB.z); b.group.add(flame);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.25, 12), M.brass || M.metal); cap.position.set(BULB.x, BULB.y - 0.42, BULB.z); b.group.add(cap);
  const shards = new THREE.Group(); shards.visible = false; b.group.add(shards);
  for (let i = 0; i < 9; i++) { const sh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.01, 0.07), bulbMat); sh.position.set(BULB.x + Math.cos(i * 1.7) * (0.4 + i * 0.08), AY + 0.02, BULB.z - 0.9 + Math.sin(i * 1.7) * 0.5); sh.rotation.y = i; shards.add(sh); }
  tw.bulb = { bulb, flame, bulbMat, emberMat, shards, broken: false, gone: false };
  // a cadeira de Inês: armação de ferro, capacete de fios até o teto, microfone de carvão diante da boca
  const IC = INES_CHAIR;
  b.box(IC.x - 0.35, AY, IC.z - 0.35, IC.x + 0.35, AY + 0.48, IC.z + 0.35, 'rust', { tag: 'obstacle' });
  const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.08), M.rust);
  chairBack.position.set(IC.x - Math.sin(IC.yaw) * 0.33, AY + 0.98, IC.z - Math.cos(IC.yaw) * 0.33); chairBack.rotation.y = IC.yaw; b.group.add(chairBack);
  const helmet = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.14, 12, 1, true), M.brass || M.metal);
  helmet.position.set(IC.x - Math.sin(IC.yaw) * 0.12, AY + 1.62, IC.z - Math.cos(IC.yaw) * 0.12); b.group.add(helmet);
  const wire = new THREE.Mesh(new THREE.BoxGeometry(0.03, ARENA_TOP - AY - 1.7, 0.03), M.leatherDark); wire.position.set(helmet.position.x, (AY + 1.7 + ARENA_TOP) / 2, helmet.position.z); b.group.add(wire);
  const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 8), M.steelDark); mic.position.set(IC.x + Math.sin(IC.yaw) * 0.45, AY + 1.25, IC.z + Math.cos(IC.yaw) * 0.45); b.group.add(mic);
  const straps = new THREE.Group(); b.group.add(straps);
  for (const dx of [-0.28, 0.28]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.3), M.leatherDark); st.position.set(IC.x + dx * Math.cos(IC.yaw), AY + 0.62, IC.z - dx * Math.sin(IC.yaw)); st.rotation.y = IC.yaw; straps.add(st); }
  tw.ines = { helmet, wire, straps };

  // ===== NPCs =====
  L.helena = makeNpc(M, 'helena'); g.scene.add(L.helena.rig.root);
  placeNpc(L.helena, HELENA_SEAT.x, MACH_Y, HELENA_SEAT.z, HELENA_SEAT.yaw); L.helena.mode = 'sitFloor';
  L.ines = makeNpc(M, 'ines'); g.scene.add(L.ines.rig.root);
  placeNpc(L.ines, IC.x, AY, IC.z, IC.yaw); L.ines.mode = 'sitChair'; L.ines.limp = true;
}

export function towerLights(L) {
  const warm = 0xffc080, cold = 0xa8c0c8;
  L.machLamp = L.lamp(13, MACH_Y + 5.6, 70.2, warm, 0.8, 11, { flicker: true });
  L.lamp(12.5, MACH_Y + 1.8, 69.2, 0x9affc0, 0.35, 4);                         // brilho dos acumuladores
  L.arenaLamps = [L.lamp(8, ARENA_TOP - 0.6, 78, cold, 0.8, 16), L.lamp(18, ARENA_TOP - 0.6, 78, cold, 0.8, 16)];
  L.bulbLamp = L.lamp(BULB.x, BULB.y + 0.3, BULB.z, 0xff7a2a, 1.2, 11, { mat: L.M.ember });
  if (L.bulbLamp.fixture) L.bulbLamp.fixture.visible = false;
}

export function towerNav(L) {
  const n = L.game.nav;
  const N = (id, x, z, y) => n.addNode(id, x, y, z);
  N('m0', 10.2, 71.4, MACH_Y); N('m1', 13, 71.4, MACH_Y); N('m2', 16, 71.4, MACH_Y); N('m3', 9.8, 73.6, MACH_Y); N('m4', 16.6, 75.5, MACH_Y);
  const Lk = (a, b) => n.link(a, b);
  Lk('m0', 'm1'); Lk('m1', 'm2'); Lk('m0', 'm3'); Lk('m2', 'm4');
  N('a0', 7, 70, ARENA_Y); N('a1', 19, 70, ARENA_Y); N('a2', 7, 78, ARENA_Y); N('a3', 19, 78, ARENA_Y); N('a4', 13, 78, ARENA_Y); N('a5', 9, 84, ARENA_Y); N('a6', 16.5, 83, ARENA_Y);
  Lk('a0', 'a1'); Lk('a0', 'a2'); Lk('a1', 'a3'); Lk('a2', 'a4'); Lk('a3', 'a4'); Lk('a2', 'a5'); Lk('a4', 'a5'); Lk('a4', 'a6'); Lk('a3', 'a6');
}

/** estado que vem do save (cabine, portas, bobinas, lâmpada, NPCs) */
export function applyTowerState(L, f, cp) {
  L.lift.place(liftStopFor(cp, f));
  const tw = L.tower;
  if (f.c8_liftPower) setKnife(L, true);
  if (f.c8_hasCrank || f.c8_metHelena) for (const k in tw.levers) tw.levers[k].visible = true;
  if (f.c8_cinzaDead) for (const id in tw.coils) setCoil(L, id, false);
  if (f.c8_ending === 'cinzas') breakBulb(L, true);
  if (f.c8_ending === 'guardiao' || f.c8_ending === 'herdeira') { tw.bulb.flame.visible = false; tw.bulb.gone = true; }
  if (f.c8_inesFree) freeInes(L, true);
  if (f.c8_helenaUp) { placeNpc(L.helena, HELENA_ARENA.x, ARENA_Y, HELENA_ARENA.z, HELENA_ARENA.yaw); L.helena.mode = 'stand'; }
  else if (f.c8_metHelena) { L.helena.mode = 'sitFloor'; }
}
export function setKnife(L, on) {
  const tw = L.tower;
  tw.knife.rotation.z = on ? -0.1 : 1.2;
  tw.knifeLampMat.color.set(on ? 0x60ff90 : 0xff4030); if (tw.knifeLampMat.emissive) tw.knifeLampMat.emissive.set(on ? 0x40ff70 : 0xff2010);
  L.liftPower = on;
}
export function setCoil(L, id, live) {
  const c = L.tower.coils[id]; if (!c) return;
  c.live = live;
  c.lever.rotation.z = live ? 0 : Math.PI * 0.8;
  if (c.torusMat.emissive) c.torusMat.emissive.set(live ? 0x3a6aff : 0x000000);
}
export function breakBulb(L, instant = false) {
  const B = L.tower.bulb; if (B.broken) return;
  B.broken = true; B.gone = true;
  B.bulb.visible = false; B.flame.visible = false; B.shards.visible = true;
  if (L.bulbLamp) L.bulbLamp.base = 0;
  if (!instant) L.game.audio.play('glass', { x: BULB.x, y: BULB.y, z: BULB.z }, { vol: 1 });
}
export function freeInes(L, instant = false) {
  const I = L.tower.ines; if (I.freed) return;
  I.freed = true; I.straps.visible = false; I.helmet.position.y += 0.35;
  const n = L.ines; n.limp = false;
  if (instant) { placeNpc(n, INES_USE.x - 0.6, ARENA_Y, INES_USE.z - 0.2, Math.PI * 0.9); n.mode = 'stand'; }
}

/** quadro a quadro: cabine (e quem estiver nela), portas, tambor, válvulas, bobinas, lâmpada, NPCs */
export function updateTower(L, dt, t) {
  const tw = L.tower, lift = L.lift, g = L.game, p = g.player;
  const prevY = lift.y;
  const riding = p && inCabin(p.pos, prevY, 0.45) && p.state !== 'climb';
  const arrived = lift.update(dt);
  const dy = lift.y - prevY;
  if (riding && (lift.moving || arrived)) { p.pos.y = lift.y; p.vy = 0; if ('onGround' in p) p.onGround = true; }
  const h = L.helena; if (h.ride) h.pos.y = lift.y;
  tw.cabin.position.y = lift.y;
  tw.cable.scale.y = Math.max(0.1, HOUSING_TOP - (lift.y + 2.9)); tw.cable.position.set(13, (HOUSING_TOP + lift.y + 2.9) / 2, 74.1);
  if (dy) tw.drum.rotation.x += dy * 1.6;
  if (arrived) { L.onLiftArrive?.(arrived); g.audio.play('clang', { x: 13, y: lift.y + 1, z: 74 }); }
  tw.cabLampMat.color.set(L.liftPower ? 0xffd090 : 0x302a20);
  // portas: só a do andar onde a cabine está parada abre (e nenhuma com a torre travada pelo chefe)
  for (const id in tw.gates) {
    const G = tw.gates[id];
    const open = !lift.moving && lift.stop === id && !L.liftLocked;
    G.k += ((open ? 1 : 0) - G.k) * Math.min(1, dt * 3);
    G.coll.enabled = G.k < 0.9;
    for (let i = 0; i < G.bars.length; i++) G.bars[i].position.x = SHAFT.minX + 0.1 + i * 0.38 * (1 - 0.86 * G.k);
    G.lampMat.color.set(open ? 0x60ff90 : L.liftPower ? 0xffa040 : 0xff3020);
  }
  // acumuladores: carga e nuvem
  for (const id in tw.valves) {
    const v = tw.valves[id];
    v.charge = Math.min(1, v.charge + dt / STEAM.recharge);
    v.needle.rotation.z = 1.2 - v.charge * 2.4;
    if (v.delayT > 0) { v.delayT -= dt; if (v.delayT <= 0) { v.plumeT = STEAM.dur; g.audio.play('steam', { x: v.V.plume.x, y: ARENA_Y + 1, z: v.V.plume.z }, { dur: 2.5 }); } }
    if (v.plumeT > 0) v.plumeT -= dt;
    const k = v.plumeT > 0 ? Math.min(1, v.plumeT / 1, (STEAM.dur - v.plumeT + 0.2) / 0.5) : 0;
    v.plume.visible = k > 0.01; v.steamMat.opacity = 0.55 * k; v.plume.rotation.y += dt * 0.8;
  }
  // bobinas zumbem; a lâmpada pulsa
  for (const id in tw.coils) { const c = tw.coils[id]; if (c.live && c.torusMat.emissiveIntensity !== undefined) c.torusMat.emissiveIntensity = 0.6 + Math.sin(t * 23 + id.charCodeAt(0)) * 0.4; }
  const B = tw.bulb;
  if (!B.gone) {
    const live = Object.values(tw.coils).filter((c) => c.live).length;
    const pulse = 0.85 + Math.sin(t * 3.1) * 0.15;
    B.flame.scale.setScalar(0.7 + live * 0.18 * pulse);
    if (L.bulbLamp) L.bulbLamp.light.intensity = (0.5 + live * 0.25) * pulse;
  } else if (L.bulbLamp) L.bulbLamp.light.intensity = 0;
  updateNpc(L.helena, dt); updateNpc(L.ines, dt);
}
