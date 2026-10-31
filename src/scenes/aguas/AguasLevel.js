// Capítulo 5 — Águas Negras · estação de bombeamento (primeira fatia). A passagem do Relógio desce até o Canal 3:
// água preta parada no leito (−1.4), margens estreitas de concreto, uma passarela de tábuas e, a leste, a galeria
// de serviço até a casa de bombas. O portão do salão das bombas está sem energia (fusível do comporteiro +
// disjuntores na ordem do relatório). Com energia, a escada retrátil desce para o mezanino; de lá, a passarela do
// reservatório leva à válvula da comporta e à antecâmara das turbinas, onde a Afogada guarda as comportas.
// Mesma base modular (LevelBuilder/Door/Navigation), tudo procedural; margens em y = 0, mezanino em y = 4.5.
import * as THREE from 'three';
import { LevelBuilder } from '../../world/LevelBuilder.js';
import { Door } from '../../world/Doors.js';
import { HospitalLevel } from '../hospital/HospitalLevel.js';

const LIGHT_BUDGET = 12;
export const GROUND = 0;
const Y = GROUND;
export const UPPER = 4.5;
// água: retângulos [x0, z0, x1, z1], cota do leito e da lâmina; correnteza (m/s) empurra para leste no canal
export const WATERS = [
  { id: 'canal', minX: 0, maxX: 42, minZ: 13, maxZ: 19, bed: -1.4, level: -0.45, cx: 0.45, cz: 0 },
  { id: 'reservatorio', minX: 26, maxX: 40, minZ: 46, maxZ: 60, bed: -1.2, level: -0.3, cx: 0, cz: 0 },
  // poço das turbinas (salão da Afogada): margens no mezanino (top = 4.5); o ralo de drenagem o esvazia
  { id: 'turbinas', minX: 28, maxX: 38, minZ: 72, maxZ: 84, bed: UPPER - 1.4, level: UPPER - 0.45, top: UPPER, cx: 0, cz: 0 },
];
export const POOL = WATERS[2];
// rampas de limpeza (saída da água): eixo z, a = borda da margem (y 0) → b = leito
export const CANAL_RAMPS = [
  { id: 'S1', minX: 2, maxX: 5, a: 13, b: 15.2 }, { id: 'S2', minX: 35, maxX: 38, a: 13, b: 15.2 },
  { id: 'N2', minX: 8, maxX: 11, a: 19, b: 16.8 }, { id: 'N1', minX: 28, maxX: 31, a: 19, b: 16.8 }, { id: 'N3', minX: 36, maxX: 39, a: 19, b: 16.8 },
];
export const BRIDGE = { minX: 19.5, maxX: 20.5, minZ: 13, maxZ: 19 };
export const RUBBLE = { minX: 23, maxX: 25.5, minZ: 10, maxZ: 13 };
export const HUT = { minX: 1, maxX: 8, minZ: 22, maxZ: 28 };
export const PANEL = { minX: 24, maxX: 30, minZ: 22, maxZ: 28 };
export const ANTE = { minX: 30, maxX: 42, minZ: 22, maxZ: 28 };
export const HALL = { minX: 26, maxX: 46, minZ: 28, maxZ: 46 };
export const STAIR = { minX: 43.6, maxX: 45.4, zBottom: 33, zTop: 40 };
export const CATWALK = { minX: 28.6, maxX: 30, minZ: 46, maxZ: 60 };
export const TURBINES = { minX: 26, maxX: 40, minZ: 60, maxZ: 68 };
// salão das turbinas (arena da Afogada) e galeria de descarga (saída do capítulo)
export const ARENA = { minX: 24, maxX: 42, minZ: 68, maxZ: 90 };
export const ARENA_BOUNDS = { minX: 24.7, maxX: 41.3, minZ: 68.8, maxZ: 89.3 };
export const DISCHARGE = { minX: 31.6, maxX: 34.4, minZ: 90, maxZ: 101, endZ: 99.4 };
export const POOL_RAMPS = [{ id: 'PS', minX: 29, maxX: 31, a: 72, b: 74.4 }, { id: 'PN', minX: 35.8, maxX: 37.8, a: 84, b: 81.6 }];
export const TURBINE_HOUSING = { minX: 30.5, maxX: 35.5, minZ: 84.9, maxZ: 87.5 };
export const INTAKE = { x: 33, z: 83.0 };
export const TURBINE_LEVER = { x: 36.2, y: UPPER + 1.1, z: 86.2 };
export const DRAIN_VALVE = { x: 24.25, y: UPPER + 1.0, z: 78 };
// grades de contenção (obstáculos de ferro): a investida da Afogada para nelas
export const GRATES = [{ minX: 26, maxX: 27.6, minZ: 74, maxZ: 74.35 }, { minX: 38.4, maxX: 40, minZ: 81.4, maxZ: 81.75 }];
export const VALVE = { x: 30.25, y: UPPER + 1.0, z: 53 };
export const PANEL_POS = { x: 24.25, y: 1.2, z: 25 };
export const BREAKERS = ['BOMBA 1', 'BOMBA 2', 'COMPORTA'];
export const BREAKER_ORDER = [1, 0, 2]; // BOMBA 2 → BOMBA 1 → COMPORTA

export const AGUAS_CHECKPOINTS = {
  c5_passage: { x: 15, y: GROUND, z: 1.2, yaw: 0 },
  c5_pumps: { x: 36, y: GROUND, z: 23.4, yaw: 0 },
  c5_slice: { x: 33, y: UPPER, z: 61.5, yaw: 0 },
  c5_boss: { x: 33, y: UPPER, z: 70.2, yaw: 0 },
  c5_end: { x: 33, y: UPPER, z: 93, yaw: 0 },
};

// névoa padrão: vapor verde-escuro que sobe da água parada
export const AGUAS_FOG = { fog: 0x0a1214, density: 0.06 };
export const AGUAS_ZONES = [
  { id: 'c5_passagem', minX: 13, maxX: 17, minZ: -1.5, maxZ: 10, minY: -1, maxY: 4, fog: 0x080a0c, density: 0.08 },
  { id: 'c5_comporteiro', minX: 1, maxX: 8, minZ: 22, maxZ: 28, minY: -1, maxY: 4, fog: 0x0e0c08, density: 0.06 },
  { id: 'c5_painel', minX: 24, maxX: 30, minZ: 22, maxZ: 28, minY: -1, maxY: 4, fog: 0x100808, density: 0.065 },
  { id: 'c5_ante', minX: 30, maxX: 42, minZ: 22, maxZ: 28, minY: -1, maxY: 4, fog: 0x0c0d0c, density: 0.055 },
  { id: 'c5_bombas', minX: 26, maxX: 46, minZ: 28, maxZ: 46, minY: -1, maxY: 10, fog: 0x0a0e10, density: 0.05 },
  { id: 'c5_reservatorio', minX: 26, maxX: 40, minZ: 46, maxZ: 60, minY: -2, maxY: 10, fog: 0x081214, density: 0.07 },
  { id: 'c5_turbinas', minX: 26, maxX: 40, minZ: 60, maxZ: 68, minY: 3, maxY: 10, fog: 0x0a0a10, density: 0.06 },
  { id: 'c5_salaoTurbinas', minX: 24, maxX: 42, minZ: 68, maxZ: 90, minY: 2, maxY: 12, fog: 0x08100f, density: 0.055 },
  { id: 'c5_descarga', minX: 31, maxX: 35, minZ: 90, maxZ: 101, minY: 3, maxY: 8, fog: 0x060808, density: 0.08 },
];

export class AguasLevel {
  constructor(game) {
    this.game = game;
    this.M = game.materials;
    this.b = new LevelBuilder(game.scene, game.col, game.materials);
    this.doors = {};
    this.lights = { power: [], emergency: [], flicker: [], all: [] };
    this.pickupMeshes = {};
    this.zone = null;
    this.powered = false;
    this.breakerLevers = [];
    this.waterMeshes = [];
    // portas "virtuais" do grafo de navegação (escada retrátil, comporta da passarela)
    this.navStair = { open: false };
    this.navSluice = { open: false };
    this.poolDrained = false; this.drainT = 0; this.turbineT = 0;
  }

  build() {
    this._passage();
    this._canal();
    this._north();
    this._pumpHouse();
    this._hall();
    this._reservoir();
    this._turbines();
    this._arena();
    this._doors();
    this._lights();
    this._nav();
    return this;
  }

  lamp(...a) { return HospitalLevel.prototype.lamp.apply(this, a); }
  sign(...a) { return HospitalLevel.prototype.sign.apply(this, a); }

  // ---------- água: lentidão + correnteza para o PlayerController; "molhado" para os Afogados ----------
  waterRect(p) {
    for (const w of WATERS) {
      if (w.id === 'turbinas' && this.poolDrained) continue;
      if (p.x > w.minX && p.x < w.maxX && p.z > w.minZ && p.z < w.maxZ) return w;
    }
    return null;
  }
  /** dentro d'água (com a lâmina acima da canela): { slow, cx, cz, id } ou null */
  waterAt(p) {
    const w = this.waterRect(p);
    if (!w || p.y > w.level - 0.3) return null;
    return { id: w.id, slow: 0.55, cx: w.cx, cz: w.cz };
  }
  /** 0 seco … 1 água ou beira (até 1.6 m da borda, no nível das margens) */
  wetness(p) {
    for (const w of WATERS) {
      if (p.y > (w.top ?? 0) + 0.6) continue;
      if (w.id === 'turbinas' && this.poolDrained) continue;
      const dx = Math.max(w.minX - p.x, 0, p.x - w.maxX), dz = Math.max(w.minZ - p.z, 0, p.z - w.maxZ);
      const d = Math.hypot(dx, dz);
      if (d <= 0) return 1;
      if (d < 1.6) return 1 - d / 1.6 * 0.5;
      if (d < 3) return 0.5 * (1 - (d - 1.6) / 1.4);
    }
    return 0;
  }

  _water(w) {
    const geo = new THREE.PlaneGeometry(w.maxX - w.minX, w.maxZ - w.minZ, 8, 4);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, this.M.water);
    m.position.set((w.minX + w.maxX) / 2, w.level, (w.minZ + w.maxZ) / 2);
    m.renderOrder = 2; m.name = 'agua_' + w.id;
    this.b.group.add(m);
    // espuma junto às paredes
    const foam = new THREE.Mesh(new THREE.PlaneGeometry(w.maxX - w.minX, 0.35).rotateX(-Math.PI / 2), this.M.waterFoam);
    foam.position.set(m.position.x, w.level + 0.01, w.minZ + 0.2); this.b.group.add(foam);
    this.waterMeshes.push({ m, w, foam, base: geo.attributes.position.array.slice() });
    return m;
  }

  // ---------- PASSAGEM DO RELÓGIO x13.6..16.4 z−1..10 ----------
  _passage() {
    const b = this.b;
    b.floor(13.6, -1, 16.4, 10, Y, 'concrete', 'c5_passagem');
    b.ceiling(13.6, -1, 16.4, 10, Y + 2.9, 'concrete');
    b.box(13.4, Y, -1, 13.6, Y + 3, 10, 'brick');
    b.box(16.4, Y, -1, 16.6, Y + 3, 10, 'brick');
    b.box(13.4, Y, -1.4, 16.6, Y + 3, -1, 'brick');
    // degraus que sobem de volta para a Torre (bloqueados por entulho)
    for (let i = 0; i < 5; i++) b.box(13.6, Y, -1 + i * 0.3, 16.4, Y + 0.3 + i * 0.3, -0.7 + i * 0.3, 'concrete', { collide: false, tile: 1 });
    b.box(13.6, Y, -1, 16.4, Y + 1.6, -0.1, 'concrete', { tag: 'obstacle' });
    // cano gotejando
    b.box(16.2, Y + 2.4, -1, 16.36, Y + 2.56, 10, 'rust', { collide: false });
  }

  // ---------- CANAL PRINCIPAL x0..42 z10..22 ----------
  _canal() {
    const b = this.b;
    // margem sul (z10..13) e norte (z19..22)
    b.floor(0, 10, 42, 13, Y, 'concrete', 'c5_margemSul');
    b.floor(0, 19, 42, 22, Y, 'concrete', 'c5_margemNorte');
    // leito do canal
    for (const w of WATERS) b.floor(w.minX, w.minZ, w.maxX, w.maxZ, w.bed, 'slime', 'leito_' + w.id);
    // muros de arrimo (topo em 0): só bloqueiam quem está dentro d'água; vãos nas rampas de limpeza
    const south = CANAL_RAMPS.filter((r) => r.a === 13), north = CANAL_RAMPS.filter((r) => r.a === 19);
    const retain = (z0, z1, ramps) => {
      let cur = 0;
      for (const r of [...ramps].sort((p, q) => p.minX - q.minX)) { if (r.minX > cur) b.box(cur, -1.6, z0, r.minX, Y, z1, 'concrete', { sight: false, tag: 'retain' }); cur = r.maxX; }
      if (cur < 42) b.box(cur, -1.6, z0, 42, Y, z1, 'concrete', { sight: false, tag: 'retain' });
    };
    // grossos (1 m, sob a margem): quem está na água é sempre empurrado de volta para o canal, nunca "atravessa" o muro
    retain(12.0, 13.0, south); retain(19.0, 20.0, north);
    for (const r of CANAL_RAMPS) {
      const f = this.col_ramp(r);
      f.name = 'rampa_' + r.id;
      // degraus de concreto
      const n = 5, dz = (r.b - r.a) / n;
      for (let i = 0; i < n; i++) {
        const za = r.a + dz * i, zb = r.a + dz * (i + 1), top = Y + (-1.4 - Y) * ((i + 1) / n);
        b.box(r.minX, -1.6, Math.min(za, zb), r.maxX, top + 0.05, Math.max(za, zb), 'concrete', { collide: false, tile: 1 });
      }
      b.box(r.minX - 0.06, Y, (r.a + r.b) / 2 - 0.04, r.minX, Y + 1.0, (r.a + r.b) / 2 + 0.04, 'rust', { collide: false });
    }
    // paredes externas do canal: oeste x0, leste x42, sul z10 (boca da passagem em x15), fundo norte z22
    b.box(-0.2, -1.6, 10, 0, Y + 6, 22, 'brick');
    b.box(42, -1.6, 10, 42.2, Y + 6, 22, 'brick');
    b.box(-0.2, Y, 9.8, 13.6, Y + 6, 10, 'brick');
    b.box(16.4, Y, 9.8, 42.2, Y + 6, 10, 'brick');
    b.box(13.4, Y + 2.9, 9.8, 16.6, Y + 6, 10, 'brick');
    for (const w of WATERS) { b.box(w.minX, w.bed - 0.3, w.minZ - 0.01, w.maxX, w.bed, w.minZ, 'slime', { collide: false }); this._water(w); }
    // passarela de tábuas (estreita) e os escombros da margem sul
    b.floor(BRIDGE.minX, BRIDGE.minZ, BRIDGE.maxX, BRIDGE.maxZ, Y, 'woodDark', 'c5_passarelaTabuas');
    for (let z = BRIDGE.minZ + 0.2; z < BRIDGE.maxZ; z += 0.5) b.box(BRIDGE.minX - 0.05, Y - 0.04, z, BRIDGE.maxX + 0.05, Y + 0.02, z + 0.32, 'wood', { collide: false, tile: 1 });
    b.box(BRIDGE.minX - 0.1, -1.6, 15.9, BRIDGE.maxX + 0.1, Y - 0.3, 16.1, 'rust', { collide: false }); // cavalete
    const R = RUBBLE;
    b.box(R.minX, Y, R.minZ, R.maxX, Y + 2.6, R.maxZ, 'concrete', { tag: 'obstacle' });
    b.box(R.minX - 0.6, Y, R.minZ + 0.4, R.minX, Y + 1.1, R.maxZ - 0.2, 'brick', { tag: 'prop-low', sight: false });
    b.box(R.minX + 0.4, Y + 2.6, R.minZ, R.maxX - 0.3, Y + 3.2, R.maxZ - 0.6, 'brick', { collide: false });
    // caixa de ferramentas atrás dos escombros (só se chega pela água)
    b.box(39.2, Y, 10.3, 40.4, Y + 0.5, 10.9, 'rust', { tag: 'prop-low', sight: false });
    // grade de esgoto na parede oeste e na leste (de onde vem/para onde vai a correnteza)
    for (const x of [0.02, 41.9]) for (let z = 13.4; z < 19; z += 0.5) b.box(x, -1.4, z, x + 0.08, -0.2, z + 0.06, 'rust', { collide: false });
    this.sign('CANAL 3 — CIA. MUNICIPAL DE ÁGUAS', 8, Y + 3.3, 10.12, 0, 3.2, 0.36, { bg: '#1c2a2a', fg: '#b8d0c8' });
    this.sign('CASA DE BOMBAS →', 30, Y + 2.6, 21.88, Math.PI, 2.0, 0.3, { bg: '#2a2416', fg: '#e0c890' });
  }
  col_ramp(r) {
    return this.game.col.addFloor({ minX: r.minX, maxX: r.maxX, minZ: Math.min(r.a, r.b), maxZ: Math.max(r.a, r.b), ramp: { axis: 'z', a: r.a, b: r.b, ya: Y, yb: -1.4 } });
  }

  // ---------- MARGEM NORTE: galeria de serviço (x20..42) e casa do comporteiro (x1..8 z22..28) ----------
  _north() {
    const b = this.b, H = HUT;
    // fundo norte da margem: casa do comporteiro (porta em x5), parede até a sala do painel
    b.box(-0.2, Y, 22, 1, Y + 6, 22.2, 'brick');
    b.wallX(22.1, 1, 8, Y, Y + 3, [5], 'wallLower', 1.4, 2.3);
    b.box(1, Y + 3, 22, 8, Y + 6, 22.2, 'brick', { collide: false });
    b.box(8, Y, 22, 24, Y + 6, 22.2, 'brick');
    // galeria: teto baixo e pilares entre x20 e x42
    b.ceiling(20, 19, 42, 22, Y + 3.1, 'concrete');
    for (let x = 22; x < 42; x += 4) if (!CANAL_RAMPS.some((r) => r.a === 19 && x > r.minX - 0.3 && x < r.maxX + 0.3)) b.box(x - 0.15, Y, 19.1, x + 0.15, Y + 3.1, 19.4, 'concrete', { tag: 'prop' });
    b.box(20, Y + 2.6, 21.7, 42, Y + 2.8, 21.9, 'rust', { collide: false }); // tubulação
    // casa do comporteiro
    b.floor(H.minX, H.minZ, H.maxX, H.maxZ, Y, 'wood', 'c5_comporteiro');
    b.ceiling(H.minX, H.minZ, H.maxX, H.maxZ, Y + 3);
    b.box(H.minX - 0.2, Y, H.minZ, H.minX, Y + 3, H.maxZ, 'wallLower');
    b.box(H.maxX, Y, H.minZ, H.maxX + 0.2, Y + 3, H.maxZ, 'wallLower');
    b.box(H.minX - 0.2, Y, H.maxZ, H.maxX + 0.2, Y + 3, H.maxZ + 0.2, 'wallLower');
    b.box(1.2, Y, 26.4, 3.2, Y + 0.6, 27.8, 'woodDark', { tag: 'prop-low', sight: false }); // catre
    b.box(5.6, Y, 26.9, 7.8, Y + 0.9, 27.8, 'woodDark', { tag: 'prop-low', sight: false }); // bancada
    this.fuseBox = b.box(7.7, Y + 1.0, 24.2, 7.98, Y + 1.6, 25.2, 'metal', { collide: false }); // caixa de reserva
  }

  // ---------- CASA DE BOMBAS: sala do painel (x24..30) e antecâmara (x30..42), z22..28 ----------
  _pumpHouse() {
    const b = this.b, P = PANEL, A = ANTE;
    b.floor(P.minX, P.minZ, A.maxX, A.maxZ, Y, 'tile', 'c5_casaBombas');
    b.ceiling(P.minX, P.minZ, A.maxX, A.maxZ, Y + 3.2);
    b.box(24, Y + 3, 22, 42.2, Y + 6, 22.2, 'brick', { collide: false });
    b.box(P.minX - 0.2, Y, P.minZ, P.minX, Y + 3.2, P.maxZ, 'wallLower');
    b.wallX(22.1, 24, 42, Y, Y + 3.2, [36], 'wallLower', 1.4, 2.3);
    b.wallZ(30, 22.2, 28, Y, Y + 3.2, [25], 'wallLower', 1.4, 2.3);
    b.box(A.maxX, Y, 22, A.maxX + 0.2, Y + 3.2, 28, 'wallLower');
    // parede z28 (portão de aço do salão em x36)
    b.wallX(28, 24, 46.2, Y, Y + 3.2, [36], 'concrete', 2.0, 2.8);
    // painel elétrico na parede oeste da sala do painel
    const M = this.M, g = new THREE.Group();
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 2.4), M.steelDark || M.metal); g.add(cab);
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 8), M.coal); sock.rotation.z = Math.PI / 2; sock.position.set(0.18, 0.5, -0.8); g.add(sock);
    this.fuseInPanel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 8), M.paper); this.fuseInPanel.rotation.z = Math.PI / 2; this.fuseInPanel.position.set(0.3, 0.5, -0.8); this.fuseInPanel.visible = false; g.add(this.fuseInPanel);
    for (let i = 0; i < 3; i++) {
      const lv = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.12), M.rust); lv.position.set(0.2, 0.05, -0.2 + i * 0.5); lv.rotation.z = 0.5; g.add(lv);
      this.breakerLevers.push(lv);
    }
    this.mainLever = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.14), M.steel || M.metal); this.mainLever.position.set(0.22, -0.3, 0.95); this.mainLever.rotation.z = 0.7; g.add(this.mainLever);
    this.panelLamp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: 0x401010 })); this.panelLamp.position.set(0.17, 0.65, 0.95); g.add(this.panelLamp);
    g.position.set(24.15, Y + 1.25, 25); b.group.add(g);
    b.col.addBox(24, Y, 23.8, 24.3, Y + 2.05, 26.2, { tag: 'prop', blocksSight: true });
    this.sign('BOMBA 1 · BOMBA 2 · COMPORTA', 24.32, Y + 2.25, 25, Math.PI / 2, 2.2, 0.22, { bg: '#2a1a14', fg: '#e0b090' });
    // antecâmara: armários, prancheta e banco
    b.box(41.4, Y, 22.4, 42, Y + 2.0, 24.6, 'metal', { tag: 'prop' });
    b.box(39.9, Y, 26.2, 41.4, Y + 0.85, 27.8, 'woodDark', { tag: 'prop-low', sight: false });
    b.box(31, Y, 26.8, 33.4, Y + 0.45, 27.6, 'wood', { tag: 'prop-low', sight: false });
    this.sign('SALÃO DAS BOMBAS', 36, Y + 3.0, 27.88, Math.PI, 1.8, 0.26, { bg: '#1e2420', fg: '#c8d8c0' });
  }

  // ---------- SALÃO DAS BOMBAS x26..46 z28..46 + mezanino (y 4.5, z40..46) e escada retrátil ----------
  _hall() {
    const b = this.b, H = HALL, U = UPPER;
    b.floor(H.minX, H.minZ, H.maxX, H.maxZ, Y, 'concrete', 'c5_bombas');
    b.ceiling(H.minX, H.minZ, H.maxX, H.maxZ, Y + 9);
    b.box(H.minX - 0.2, Y, H.minZ, H.minX, Y + 9, H.maxZ, 'brick');
    b.box(H.maxX, Y, H.minZ, H.maxX + 0.2, Y + 9, H.maxZ, 'brick');
    b.box(24, Y + 3.2, 27.9, 46.2, Y + 9, 28.1, 'brick');
    // parede norte: arco baixo (x37) para a rampa do reservatório; porta da passarela em cima (x29.3)
    b.wallX(46, 26, 46, Y, U, [37], 'brick', 1.8, 2.6);
    b.wallX(46, 26, 46, U, Y + 9, [29.3], 'brick', 1.4, 2.3);
    // três bombas centrífugas e os tubos
    for (const [x, z] of [[31, 34], [36, 36], [41, 34]]) {
      b.box(x - 1.1, Y, z - 1.6, x + 1.1, Y + 1.8, z + 1.6, 'steelDark', { tag: 'obstacle', cast: true });
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.2, 12), this.M.steel || this.M.metal); m.rotation.x = Math.PI / 2; m.position.set(x, Y + 2.4, z); b.group.add(m);
      b.box(x - 0.25, Y + 2.4, z + 1.6, x + 0.25, Y + 2.9, 46, 'rust', { collide: false });
    }
    // mezanino
    b.floor(H.minX, 40, H.maxX, H.maxZ, U, 'metal', 'c5_mezanino');
    for (const x of [27, 33, 39]) b.box(x - 0.12, Y, 39.9, x + 0.12, U - 0.3, 40.2, 'steelDark', { tag: 'prop' });
    b.box(H.minX, U, 39.9, STAIR.minX, U + 1.05, 40.0, 'rust', { sight: false });
    b.box(STAIR.maxX, U, 39.9, H.maxX, U + 1.05, 40.0, 'rust', { sight: false });
    b.box(STAIR.minX - 0.1, U, 40, STAIR.minX, U + 1.05, 41.2, 'rust', { sight: false });
    // escada retrátil (sobe recolhida até a energia voltar)
    this.stairGroup = new THREE.Group(); b.group.add(this.stairGroup);
    const n = 12, dz = (STAIR.zTop - STAIR.zBottom) / n;
    for (let i = 0; i < n; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(STAIR.maxX - STAIR.minX, 0.08, dz * 0.9), this.M.metal);
      s.position.set((STAIR.minX + STAIR.maxX) / 2, Y + U * (i + 1) / n, STAIR.zBottom + dz * (i + 0.5)); this.stairGroup.add(s);
    }
    for (const x of [STAIR.minX, STAIR.maxX]) {
      const len = Math.hypot(STAIR.zTop - STAIR.zBottom, U);
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, len), this.M.rust);
      r.position.set(x, U / 2 + 0.9, (STAIR.zTop + STAIR.zBottom) / 2); r.rotation.x = -Math.atan2(U, STAIR.zTop - STAIR.zBottom); this.stairGroup.add(r);
    }
    this.stairFloor = this.game.col.addFloor({ minX: STAIR.minX, maxX: STAIR.maxX, minZ: STAIR.zBottom, maxZ: STAIR.zTop, ramp: { axis: 'z', a: STAIR.zBottom, b: STAIR.zTop, ya: Y, yb: U }, name: 'c5_escada' });
    this.stairFloor.enabled = false;
    this.stairDown = false; this.stairT = 0;
    this.stairGroup.position.y = 4.2;
    this.stairGroup.scale.y = 0.15;
    this.sign('MEZANINO · RESERVATÓRIO', 44.5, Y + 3.0, 32.6 + 0.02, Math.PI, 1.6, 0.24, { bg: '#1e2420', fg: '#c8d8c0' });
  }

  // ---------- RESERVATÓRIO x26..40 z46..60 (água) + passarela em y 4.5 ----------
  _reservoir() {
    const b = this.b, U = UPPER, C = CATWALK;
    b.box(25.8, -1.6, 46, 26, Y + 9, 60, 'brick');
    b.box(40, -1.6, 46, 40.2, Y + 9, 60, 'brick');
    b.ceiling(26, 46, 40, 60, Y + 9);
    // rampa do arco baixo (x36..38), de volta ao salão: quem cai da passarela sai por aqui
    b.box(26, -1.6, 46, 36, Y, 46.1, 'concrete', { sight: false });
    b.box(38, -1.6, 46, 40, Y, 46.1, 'concrete', { sight: false });
    this.game.col.addFloor({ minX: 36, maxX: 38, minZ: 46, maxZ: 49.5, ramp: { axis: 'z', a: 46, b: 49.5, ya: Y, yb: -1.2 }, name: 'rampa_reservatorio' });
    for (let i = 0; i < 6; i++) b.box(36, -1.5, 46 + i * 0.58, 38, Y - 1.2 * (i + 1) / 6 + 0.05, 46.58 + i * 0.58, 'concrete', { collide: false, tile: 1 });
    // passarela
    b.floor(C.minX, C.minZ, C.maxX, C.maxZ, U, 'metal', 'c5_passarela');
    b.box(C.minX - 0.08, U, C.minZ, C.minX, U + 1.05, C.maxZ, 'rust', { sight: false });
    b.box(C.maxX, U, C.minZ, C.maxX + 0.08, U + 1.05, 50, 'rust', { sight: false });
    b.box(C.maxX, U, 55.4, C.maxX + 0.08, U + 1.05, C.maxZ, 'rust', { sight: false });
    for (const z of [48, 52, 56]) b.box(C.minX + 0.4, -1.2, z - 0.12, C.maxX - 0.4, U - 0.3, z + 0.12, 'steelDark', { sight: false });
    // corrimão quebrado: um pedaço pendurado na água
    const br = b.box(C.maxX, U - 1.6, 50.2, C.maxX + 0.06, U - 0.2, 50.3, 'rust', { collide: false }); br.rotation.x = 0.4; br.updateMatrix();
    // volante da válvula da comporta
    const vg = new THREE.Group();
    const wh = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.035, 6, 14), this.M.rust); vg.add(wh);
    for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, 0.03), this.M.rust); s.rotation.z = i * Math.PI / 3; vg.add(s); }
    vg.rotation.y = Math.PI / 2; vg.position.set(VALVE.x + 0.08, VALVE.y, VALVE.z); b.group.add(vg);
    this.valveWheel = vg;
    b.box(C.maxX, U, VALVE.z - 0.1, C.maxX + 0.25, VALVE.y, VALVE.z + 0.1, 'steelDark', { collide: false });
    // parede sul (z60) com a comporta da passarela
    b.box(26, -1.6, 59.9, 40, U, 60.1, 'brick');
    b.wallX(60, 26, 40, U, Y + 9, [29.3], 'brick', 1.4, 2.5);
    this.sluice = b.box(28.6, U, 59.85, 30, U + 2.5, 60.15, 'steelDark', { tag: 'door' });
    this.sluiceY0 = this.sluice.position.y;
    this.sluiceOpen = false;
    this.sign('COMPORTA 3', 29.3, U + 2.9, 59.84, Math.PI, 1.2, 0.22, { bg: '#2a1a14', fg: '#e0b090' });
  }

  // ---------- ANTECÂMARA DAS TURBINAS x26..40 z60..68 (y 4.5) ----------
  _turbines() {
    const b = this.b, T = TURBINES, U = UPPER;
    b.floor(T.minX, T.minZ, T.maxX, T.maxZ, U, 'tile', 'c5_turbinas');
    b.ceiling(T.minX, T.minZ, T.maxX, T.maxZ, U + 4);
    b.box(T.minX - 0.2, U - 0.5, T.minZ, T.minX, U + 4, T.maxZ, 'wallLower');
    b.box(T.maxX, U - 0.5, T.minZ, T.maxX + 0.2, U + 4, T.maxZ, 'wallLower');
    b.wallX(68, 26, 40, U, U + 4, [33], 'concrete', 2.2, 3.0);
    b.box(26, U - 0.6, 60, 40, U - 0.3, 68, 'concrete', { collide: false });
    // cofre das turbinas (bancada), manômetros e o grande portão
    b.box(36.6, U, 66.4, 39.8, U + 0.95, 67.8, 'steelDark', { tag: 'prop-low', sight: false });
    for (const x of [27.4, 39]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 10), this.M.paper); m.rotation.x = Math.PI / 2; m.position.set(x, U + 2.2, 67.85); b.group.add(m); }
    // poço de inspeção: grade sobre a água das turbinas
    for (let x = 31; x < 35; x += 0.3) b.box(x, U - 0.02, 63, x + 0.06, U + 0.01, 65, 'rust', { collide: false });
    this.sign('TURBINAS — ACESSO RESTRITO', 33, U + 3.3, 67.88, Math.PI, 2.6, 0.3, { bg: '#2a1010', fg: '#e8c0a0' });
  }

  // ---------- SALÃO DAS TURBINAS x24..42 z68..90 (margens em y 4.5) + GALERIA DE DESCARGA ----------
  _arena() {
    const b = this.b, A = ARENA, P = POOL, U = UPPER, H = U + 7;
    // margens secas em volta do poço (o leito e a lâmina d'água vêm do laço de WATERS em _canal)
    b.floor(A.minX, A.minZ, A.maxX, P.minZ, U, 'concrete', 'c5_arenaSul');
    b.floor(A.minX, P.maxZ, A.maxX, A.maxZ, U, 'concrete', 'c5_arenaNorte');
    b.floor(A.minX, P.minZ, P.minX, P.maxZ, U, 'concrete', 'c5_arenaOeste');
    b.floor(P.maxX, P.minZ, A.maxX, P.maxZ, U, 'concrete', 'c5_arenaLeste');
    b.ceiling(A.minX, A.minZ, A.maxX, A.maxZ, H, 'concrete');
    // paredes externas
    b.box(A.minX - 0.2, P.bed - 0.4, A.minZ, A.minX, H, A.maxZ, 'brick');
    b.box(A.maxX, P.bed - 0.4, A.minZ, A.maxX + 0.2, H, A.maxZ, 'brick');
    b.box(A.minX, U - 0.5, 67.85, 26, H, 68.15, 'brick');
    b.box(40, U - 0.5, 67.85, A.maxX, H, 68.15, 'brick');
    b.box(26, U + 4, 67.85, 40, H, 68.15, 'brick', { sight: false });
    b.wallX(A.maxZ, A.minX, A.maxX, U, H, [33], 'concrete', 1.8, 2.6);
    // muros de arrimo do poço (topo nas margens): só seguram quem está dentro d'água; vãos nas rampas
    const R = { sight: false, tag: 'retain' }, y0 = P.bed - 0.3;
    b.box(P.minX - 1, y0, P.minZ - 1, POOL_RAMPS[0].minX, U, P.minZ, 'concrete', R);
    b.box(POOL_RAMPS[0].maxX, y0, P.minZ - 1, P.maxX + 1, U, P.minZ, 'concrete', R);
    b.box(P.minX - 1, y0, P.maxZ, POOL_RAMPS[1].minX, U, P.maxZ + 1, 'concrete', R);
    b.box(POOL_RAMPS[1].maxX, y0, P.maxZ, P.maxX + 1, U, P.maxZ + 1, 'concrete', R);
    b.box(P.minX - 1, y0, P.minZ, P.minX, U, P.maxZ, 'concrete', R);
    b.box(P.maxX, y0, P.minZ, P.maxX + 1, U, P.maxZ, 'concrete', R);
    for (const r of POOL_RAMPS) {
      const f = this.game.col.addFloor({ minX: r.minX, maxX: r.maxX, minZ: Math.min(r.a, r.b), maxZ: Math.max(r.a, r.b), ramp: { axis: 'z', a: r.a, b: r.b, ya: U, yb: P.bed } });
      f.name = 'rampa_' + r.id;
      const n = 5, dz = (r.b - r.a) / n;
      for (let i = 0; i < n; i++) {
        const za = r.a + dz * i, zb = r.a + dz * (i + 1), top = U + (P.bed - U) * ((i + 1) / n);
        b.box(r.minX, y0, Math.min(za, zb), r.maxX, top + 0.05, Math.max(za, zb), 'concrete', { collide: false, tile: 1 });
      }
    }
    // turbina: carcaça de aço (obstáculo: a investida para nela), rotor exposto e a grade da tomada d'água
    const T = TURBINE_HOUSING;
    b.box(T.minX, U, T.minZ, T.maxX, U + 1.4, T.maxZ, 'steelDark', { tag: 'obstacle' });
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, T.maxX - T.minX - 0.4, 14), this.M.rust);
    drum.rotation.z = Math.PI / 2; drum.position.set((T.minX + T.maxX) / 2, U + 1.9, (T.minZ + T.maxZ) / 2); b.group.add(drum);
    this.rotor = new THREE.Group(); this.rotor.position.set(INTAKE.x, P.bed + 0.75, P.maxZ + 0.3); b.group.add(this.rotor);
    for (let i = 0; i < 6; i++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.05), this.M.metal || this.M.rust); bl.position.y = 0.32; const g = new THREE.Group(); g.rotation.z = i * Math.PI / 3; g.add(bl); this.rotor.add(g); }
    for (let x = 31; x <= 35; x += 0.35) b.box(x, P.bed, P.maxZ - 0.06, x + 0.06, U - 0.05, P.maxZ - 0.01, 'rust', { collide: false });
    b.box(31, U - 0.12, P.maxZ - 0.08, 35.06, U - 0.04, P.maxZ, 'rust', { collide: false });
    // alavanca da turbina (no posto de comando, à direita da carcaça)
    const L = TURBINE_LEVER;
    b.box(L.x - 0.3, U, L.z - 0.4, L.x + 0.1, U + 1.0, L.z + 0.4, 'steelDark', { tag: 'prop-low', sight: false });
    this.turbineLever = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.06), this.M.rust);
    this.turbineLever.geometry.translate(0, 0.3, 0); this.turbineLever.position.set(L.x - 0.1, U + 1.0, L.z); this.turbineLever.rotation.x = 0.6; b.group.add(this.turbineLever);
    this.turbineLamp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: 0x40ff60 })); this.turbineLamp.position.set(L.x - 0.1, U + 1.05, L.z - 0.3); b.group.add(this.turbineLamp);
    // volante do ralo de drenagem (parede oeste) e o cano que desce até o fundo do poço
    const V = DRAIN_VALVE;
    this.drainWheel = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.04, 5, 12), this.M.rust);
    this.drainWheel.rotation.y = Math.PI / 2; this.drainWheel.position.set(V.x + 0.12, V.y, V.z); b.group.add(this.drainWheel);
    for (const a of [0, Math.PI / 2]) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.66, 0.03), this.M.rust); sp.rotation.x = a; this.drainWheel.add(sp); }
    b.box(A.minX, P.bed, V.z - 0.12, A.minX + 0.2, V.y - 0.2, V.z + 0.12, 'rust', { collide: false });
    b.box(P.minX + 0.02, P.bed + 0.01, 77.4, P.minX + 1.0, P.bed + 0.05, 78.6, 'rust', { collide: false }); // ralo no fundo
    // grades de contenção
    for (const G of GRATES) {
      b.box(G.minX, U, G.minZ, G.maxX, U + 2.2, G.maxZ, 'rust', { tag: 'obstacle', sight: false });
    }
    this.sign('TURBINA 1 — CIA. MUNICIPAL DE ÁGUAS', 33, U + 3.6, 89.85, Math.PI, 3.4, 0.34, { bg: '#1c2a2a', fg: '#b8d0c8' });
    this.sign('RALO DE DRENAGEM', 24.03, U + 1.7, 78, Math.PI / 2, 1.6, 0.24, { bg: '#2a1a14', fg: '#e0b090' });
    // galeria de descarga (saída do capítulo)
    const D = DISCHARGE;
    b.floor(D.minX, D.minZ, D.maxX, D.maxZ, U, 'concrete', 'c5_descarga');
    b.ceiling(D.minX, D.minZ, D.maxX, D.maxZ, U + 3);
    b.box(D.minX - 0.2, U - 0.5, D.minZ, D.minX, U + 3, D.maxZ, 'brick');
    b.box(D.maxX, U - 0.5, D.minZ, D.maxX + 0.2, U + 3, D.maxZ, 'brick');
    b.box(D.minX - 0.2, U - 0.5, D.maxZ, D.maxX + 0.2, U + 3, D.maxZ + 0.2, 'brick');
    for (let x = D.minX + 0.3; x < D.maxX - 0.2; x += 0.3) b.box(x, U, D.maxZ - 0.15, x + 0.05, U + 2.6, D.maxZ - 0.1, 'rust', { collide: false });
    b.box(33.6, U, 95.5, 34.38, U + 0.7, 96.3, 'woodDark', { tag: 'prop-low', sight: false }); // caixote da remessa
    this.sign('DESCARGA — RIO DAS CINZAS', 33, U + 2.6, 90.15, 0, 2.4, 0.3, { bg: '#1c1c14', fg: '#d8c890' });
  }

  /** abre o ralo: a água do poço escoa em ~4 s (uma vez só) */
  drainPool(instant = false) {
    if (this.poolDrained) return false;
    this.poolDrained = true; this.drainT = instant ? 1 : 0;
    if (this.drainWheel) this.drainWheel.userData.spin = 3;
    if (instant) this._setPoolLevel(POOL.bed + 0.02);
    return true;
  }
  _setPoolLevel(y) {
    for (const W of this.waterMeshes) if (W.w.id === 'turbinas') { W.m.position.y = y; W.m.visible = y > POOL.bed + 0.05; if (W.foam) W.foam.visible = y > POOL.level - 0.1; }
  }
  /** liga a turbina por alguns segundos (rotor girando, sucção na grade) */
  spinTurbine(dur = 4) {
    this.turbineT = dur;
    if (this.turbineLever) this.turbineLever.rotation.x = -0.6;
  }

  _doors() {
    const ctx = { materials: this.M, group: this.b.group, col: this.game.col, audio: this.game.audio, bus: this.game.bus };
    const D = (o) => (this.doors[o.id] = new Door({ mat: this.M.door, ...o }, ctx));
    D({ id: 'c5_hut', axis: 'x', x: 5, y: GROUND, z: 22.1, width: 1.2, height: 2.3, swing: 1, mat: this.M.woodDark, label: 'porta do comporteiro' });
    D({ id: 'c5_ante', axis: 'x', x: 36, y: GROUND, z: 22.1, width: 1.2, height: 2.3, swing: 1, mat: this.M.doorMetal || this.M.rust, label: 'porta da casa de bombas' });
    D({ id: 'c5_panel', axis: 'z', x: 30, y: GROUND, z: 25, width: 1.2, height: 2.3, swing: -1, mat: this.M.woodDark, label: 'porta da sala do painel' });
    D({ id: 'c5_gate', axis: 'x', x: 36, y: GROUND, z: 28, width: 1.9, height: 2.75, kind: 'sliding', mat: this.M.steelDark || this.M.rust, locked: true,
      lockMsg: 'Portão de aço de acionamento elétrico. O motor está mudo — sem energia, não se mexe. O painel deve ficar na sala ao lado.', label: 'portão do salão das bombas' });
    D({ id: 'c5_catwalk', axis: 'x', x: 29.3, y: UPPER, z: 46, width: 1.2, height: 2.3, swing: 1, mat: this.M.doorMetal || this.M.rust, label: 'porta da passarela' });
    D({ id: 'c5_turbine', axis: 'x', x: 33, y: UPPER, z: 68, width: 2.1, height: 2.95, kind: 'sliding', mat: this.M.steelDark || this.M.rust, locked: true,
      lockMsg: 'As comportas das turbinas. Do outro lado, algo bate na água em compasso — a Afogada guarda as comportas.', label: 'comportas das turbinas' });
    D({ id: 'c5_exit', axis: 'x', x: 33, y: UPPER, z: ARENA.maxZ, width: 1.7, height: 2.55, kind: 'sliding', mat: this.M.steelDark || this.M.rust, locked: true,
      lockMsg: 'Portinhola de aço da galeria de descarga, travada por dentro do salão por uma corrente grossa. Enquanto a Afogada estiver na água, ninguém sai daqui.', label: 'portinhola da descarga' });
  }

  _lights() {
    this.game.scene.add(new THREE.HemisphereLight(0x2e4044, 0x060a08, 0.5));
    const cold = 0x9ab8c0, sodium = 0xffa850, red = 0xff4030;
    this.lamp(15, Y + 2.8, 4, sodium, 1.0, 8, { flicker: true });                     // passagem
    const m1 = this.lamp(6, Y + 4.6, 16, cold, 0.9, 14); m1.fixture.visible = false;  // luar pela grade (oeste)
    this.lamp(24, Y + 5.2, 11, sodium, 1.1, 12, { flicker: true });                    // margem sul
    this.lamp(34, Y + 3.0, 20.5, sodium, 1.0, 10, { flicker: true });                  // galeria
    this.lamp(4.5, Y + 2.9, 25, 0xffc070, 0.9, 7);                                      // comporteiro
    this.lamp(27, Y + 3.1, 25, red, 0.8, 7, { emergency: true, flicker: true });        // painel (emergência)
    this.lamp(36, Y + 3.1, 25, 0xd8e0c8, 0.9, 9);                                       // antecâmara
    this.lamp(36, Y + 3.2, 30, red, 0.6, 9, { emergency: true });                       // salão (emergência)
    this.lamp(31, Y + 8.6, 34, 0xe0f0e8, 1.6, 16, { power: true });                     // salão (energia)
    this.lamp(41, Y + 8.6, 38, 0xe0f0e8, 1.6, 16, { power: true });
    this.lamp(36, Y + 8.6, 43, 0xe0f0e8, 1.0, 10, { power: true });                     // mezanino
    this.lamp(29.3, Y + 8.4, 54, cold, 0.9, 12, { power: true });                       // passarela
    this.lamp(33, UPPER + 3.8, 64, 0xc8d0e0, 0.9, 10, { flicker: true });               // turbinas
    this.lamp(33, UPPER + 6.6, 75, cold, 1.3, 16);                                       // salão das turbinas
    this.lamp(33, UPPER + 6.2, 86.5, red, 0.8, 11, { flicker: true });                 // turbina (emergência)
    this.lamp(33, UPPER + 2.7, 96, sodium, 0.8, 8, { flicker: true });                  // descarga
    this.setPower(false);
  }

  // energia do painel: luzes do salão, lâmpada do painel, escada retrátil (o portão fica com o roteiro)
  setPower(on, instant = false) {
    this.powered = !!on;
    for (const L of this.lights.power) {
      L.light.intensity = on ? L.base : 0;
      if (L.fixture) L.fixture.material = on ? L.onMat : (this.M.lampOff || this.M.metal);
    }
    for (const L of this.lights.emergency) L.light.intensity = on ? L.base * 0.3 : L.base;
    if (this.panelLamp) this.panelLamp.material.color.set(on ? 0x60ff80 : 0x401010);
    if (this.mainLever) this.mainLever.rotation.z = on ? -0.7 : 0.7;
    if (on) this.lowerStair(instant);
  }
  lowerStair(instant = false) {
    this.stairDown = true;
    this.stairFloor.enabled = true;
    this.navStair.open = true;
    if (instant) { this.stairT = 1; this.stairGroup.position.y = 0; this.stairGroup.scale.y = 1; }
  }
  raiseSluice(instant = false) {
    this.sluiceOpen = true;
    if (this.sluice.userData.collider) this.sluice.userData.collider.enabled = false;
    this.navSluice.open = true;
    if (instant) { this.sluice.position.y = this.sluiceY0 + 2.4; this.sluice.updateMatrix(); }
  }
  setBreaker(i, on) { const lv = this.breakerLevers[i]; if (lv) lv.rotation.z = on ? -0.5 : 0.5; }

  _nav() {
    const n = this.game.nav, d = this.doors, U = UPPER, B = -1.4;
    const N = (id, x, y, z) => n.addNode(id, x, y, z);
    N('p0', 15, Y, 2); N('p1', 15, Y, 8);
    N('s0', 15, Y, 11.5); N('sW', 3.5, Y, 11.5); N('sB', 20, Y, 11.5); N('sE', 36.5, Y, 11.5); N('sE2', 30, Y, 11.5);
    N('c1', 3.5, B, 16.2); N('c2', 9.5, B, 16); N('c3', 20, B, 15.2); N('c4', 29.5, B, 16); N('c5', 36.8, B, 16);
    N('b1', 20, Y, 16);
    N('nH', 5, Y, 20.5); N('nW', 9.5, Y, 20.5); N('nB', 20, Y, 20.5); N('n1', 29.5, Y, 20.5); N('nA', 36, Y, 20.5); N('n3', 37.5, Y, 20.5);
    N('h0', 5, Y, 23.4); N('h1', 3, Y, 25.4); N('h2', 6.5, Y, 25.4);
    N('a0', 36, Y, 23.4); N('a1', 32, Y, 25); N('a2', 39.5, Y, 24.8); N('a3', 36, Y, 26.8);
    N('q0', 28.6, Y, 25); N('q1', 25.6, Y, 24.4);
    N('g0', 36, Y, 29.4); N('g1', 28.4, Y, 31); N('g2', 44.2, Y, 31); N('g3', 28.4, Y, 39); N('g4', 36, Y, 39.5); N('g5', 44.2, Y, 39.5); N('g6', 37, Y, 45);
    N('st0', 44.5, Y, 32.4); N('st1', 44.5, U, 40.6);
    N('m0', 40, U, 43); N('m1', 29.3, U, 44.6);
    N('w0', 29.3, U, 47.4); N('w1', 29.3, U, 53); N('w2', 29.3, U, 58.8);
    N('t0', 29.3, U, 61.4); N('t1', 33, U, 63); N('t2', 37.5, U, 63.5); N('t3', 30, U, 66.4);
    N('v0', 33, U, 69.6); N('vW', 25, U, 70); N('vW2', 25, U, 88.6); N('vE', 41, U, 70); N('vE2', 41, U, 88.6); N('vN', 33, U, 88.8);
    N('x0', 33, U, 91.2); N('x1', 33, U, 97.5);
    N('r0', 37, -1.2, 50.5); N('r1', 32, -1.2, 53); N('r2', 33, -1.2, 57.5);
    const L = (a, b, door) => n.link(a, b, door);
    L('p0', 'p1'); L('p1', 's0'); L('s0', 'sW'); L('s0', 'sB'); L('sE', 'sE2');
    L('sW', 'c1'); L('c1', 'c2'); L('c2', 'c3'); L('c3', 'c4'); L('c4', 'c5'); L('c5', 'sE'); L('c2', 'nW'); L('c4', 'n1'); L('c5', 'n3');
    L('sB', 'b1'); L('b1', 'nB');
    L('nH', 'nW'); L('nW', 'nB'); L('nB', 'n1'); L('n1', 'nA'); L('nA', 'n3');
    L('nH', 'h0', d.c5_hut); L('h0', 'h1'); L('h0', 'h2');
    L('nA', 'a0', d.c5_ante); L('a0', 'a1'); L('a0', 'a2'); L('a0', 'a3'); L('a1', 'a3'); L('a2', 'a3');
    L('a1', 'q0', d.c5_panel); L('q0', 'q1');
    L('a3', 'g0', d.c5_gate); L('g0', 'g1'); L('g0', 'g2'); L('g1', 'g3'); L('g2', 'g5'); L('g3', 'g4'); L('g4', 'g5'); L('g4', 'g6'); L('g2', 'st0');
    L('st0', 'st1', this.navStair); L('st1', 'm0'); L('m0', 'm1');
    L('m1', 'w0', d.c5_catwalk); L('w0', 'w1'); L('w1', 'w2'); L('w2', 't0', this.navSluice);
    L('t0', 't1'); L('t1', 't2'); L('t1', 't3');
    L('t1', 'v0', d.c5_turbine); L('v0', 'vW'); L('v0', 'vE'); L('vW', 'vW2'); L('vE', 'vE2'); L('vW2', 'vN'); L('vE2', 'vN');
    L('vN', 'x0', d.c5_exit); L('x0', 'x1');
    L('g6', 'r0'); L('r0', 'r1'); L('r1', 'r2');
  }

  _cullLights(dt) {
    this._cullT = (this._cullT || 0) - dt;
    if (this._cullT > 0) return;
    this._cullT = 0.2;
    const p = this.game.player?.pos; if (!p) return;
    const all = this.lights.all, n = Math.min(LIGHT_BUDGET, all.length);
    for (const L of all) { const q = L.light.position; L._d = Math.hypot(q.x - p.x, (q.y - p.y) * 2.5, q.z - p.z) - L.light.distance * 0.35; }
    const sorted = all.slice().sort((a, b) => a._d - b._d);
    for (let i = 0; i < sorted.length; i++) sorted[i].light.visible = i < n;
  }
  update(dt, t) {
    this._cullLights(dt);
    for (const L of this.lights.flicker) {
      if (L.power && !this.powered) continue;
      const f = Math.sin(t * 9 + L.base * 7) * Math.sin(t * 5.3) > 0.95 ? 0.3 : 1;
      const base = L.emergency && this.powered ? L.base * 0.3 : L.base;
      L.light.intensity = base * f * (0.9 + Math.random() * 0.1);
    }
    for (const id in this.doors) this.doors[id].update(dt);
    // ondulação da água
    for (const W of this.waterMeshes) {
      const a = W.m.geometry.attributes.position, arr = a.array, b0 = W.base;
      for (let i = 0; i < arr.length; i += 3) arr[i + 1] = b0[i + 1] + Math.sin(t * 1.3 + b0[i] * 0.7 + b0[i + 2] * 0.4) * 0.03;
      a.needsUpdate = true;
    }
    // drenagem do poço das turbinas
    if (this.poolDrained && this.drainT < 1) {
      this.drainT = Math.min(1, this.drainT + dt / 4);
      this._setPoolLevel(POOL.level + (POOL.bed + 0.02 - POOL.level) * this.drainT);
    }
    if (this.drainWheel?.userData.spin > 0) { this.drainWheel.userData.spin -= dt; this.drainWheel.rotation.x += dt * 5; }
    // turbina ligada: rotor girando
    if (this.turbineT > 0) {
      this.turbineT -= dt;
      if (this.rotor) this.rotor.rotation.z += dt * 18;
      if (this.turbineT <= 0 && this.turbineLever) this.turbineLever.rotation.x = 0.6;
    }
    // escada retrátil descendo
    if (this.stairDown && this.stairT < 1) {
      this.stairT = Math.min(1, this.stairT + dt / 2.5);
      const k = this.stairT;
      this.stairGroup.position.y = 4.2 * (1 - k); this.stairGroup.scale.y = 0.15 + 0.85 * k;
    }
    // comporta subindo
    if (this.sluiceOpen && this.sluice.position.y < this.sluiceY0 + 2.4) {
      this.sluice.position.y = Math.min(this.sluiceY0 + 2.4, this.sluice.position.y + dt * 0.9); this.sluice.updateMatrix();
    }
    this._updateZone(dt);
  }
  zoneAt(p) {
    for (const z of AGUAS_ZONES) if (p.x > z.minX && p.x < z.maxX && p.z > z.minZ && p.z < z.maxZ && p.y > z.minY && p.y < z.maxY) return z;
    return null;
  }
  _updateZone(dt) {
    const fog = this.game.scene.fog, p = this.game.player?.pos;
    if (!fog || !p) return;
    const z = this.zoneAt(p); this.zone = z ? z.id : null;
    const tgt = z || AGUAS_FOG, k = Math.min(1, dt * 1.5);
    this._fogC = this._fogC || new THREE.Color();
    this._fogC.set(tgt.fog);
    fog.color.lerp(this._fogC, k);
    fog.density += (tgt.density - fog.density) * k;
    if (this.game.scene.background?.isColor) this.game.scene.background.copy(fog.color).multiplyScalar(0.8);
  }
}
