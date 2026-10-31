// Capítulo 8 — A Última Chama · primeira fatia: a Usina de Véspera. A escada de serviço das catacumbas sai no
// PÁTIO DO CARVÃO (montes de carvão, vagonetes nos trilhos, cinza caindo, guarita com o livro de registros). O portão de
// carga da Casa das Caldeiras está trancado por dentro; o caminho é a TORRE DE CARVÃO: uma escada de marinheiro (escalada
// de verdade — PlayerController.startClimb) até a ESTEIRA coberta, que entra pela galeria leste da CASA DAS CALDEIRAS
// (y 4,4). Lá embaixo, três caldeiras horizontais, com manômetros no vermelho e as válvulas de alívio SEM VOLANTE. O
// volante está na OFICINA, a oeste, depois do CORREDOR DE TUBOS (vazamentos de vapor periódicos que queimam — fecháveis
// pelo registro de alimentação). Aliviar as três caldeiras (I e II no chão; a III só pela passarela sobre ela) derruba a
// pressão da linha: a PORTA-PISTÃO da SALA DA TURBINA destrava. Na sala, o quadro de transmissão alimenta a torre; a
// chave geral desarmada solta a fechadura elétrica da BASE DA TORRE (fim da fatia: o monta-cargas sobe até Inês).
// O barulho das máquinas abafa os passos (acústica < 1); conforme a pressão cai, a usina fica silenciosa — e os inimigos
// escutam mais longe.
import * as THREE from 'three';
import { LevelBuilder } from '../../world/LevelBuilder.js';
import { Door } from '../../world/Doors.js';
import { HospitalLevel } from '../hospital/HospitalLevel.js';
import { buildTower, towerLights, towerNav, updateTower, TOWER_ZONES, TOWER_CHECKPOINTS } from './UsinaTower.js';

const LIGHT_BUDGET = 12;
export const GROUND = 0;
export const GALLERY_Y = 4.4;
const Y = GROUND, G = GALLERY_Y;

export const YARD = { minX: 0, maxX: 26, minZ: 0, maxZ: 24 };
export const HUT = { minX: 1, maxX: 5, minZ: 8, maxZ: 12, door: { x: 5, z: 10 } };
export const HEAPS = [{ x: 10, z: 6, r: 1.6 }, { x: 16, z: 11, r: 1.6 }];
export const WAGONS = [{ minX: 8, maxX: 11.5, minZ: 18.7, maxZ: 20.3 }, { minX: 14.4, maxX: 17.9, minZ: 18.7, maxZ: 20.3 }];
// torre de carvão (silo) com a escada de marinheiro na face sul; o topo (y 4,4) liga na esteira coberta
export const TOWER = { minX: 20, maxX: 24, minZ: 12, maxZ: 16 };
export const LADDER_C8 = { id: 'c8_tower', x: 22, z: 11.6, y0: GROUND, y1: GALLERY_Y, yaw: 0, top: { x: 22, z: 12.75 }, bottom: { x: 22, z: 10.9 } };
export const CATWALK = { minX: 21, maxX: 23, minZ: 16, maxZ: 24 };
// Casa das Caldeiras e a galeria leste (y 4,4) com o patamar, a passarela sobre a caldeira III e a escada
export const BOILER_HOUSE = { minX: 0, maxX: 30, minZ: 24, maxZ: 52, h: 9 };
export const GALLERY = { minX: 20, maxX: 30, minZ: 24, maxZ: 44 };
export const LANDING = { minX: 20, maxX: 26, minZ: 44, maxZ: 49 };
export const BRIDGE = { minX: 10, maxX: 20, minZ: 47.6, maxZ: 49 };
export const GSTAIR = { minX: 26, maxX: 29, zTop: 44, zBottom: 50 };
export const CARGO_GATE = { x: 13, z: 24, width: 2.4 };
// três caldeiras horizontais (eixo x, x 3..15); válvula de alívio na frente (leste) da I e II — a haste da III quebrou,
// e a válvula dela só se alcança por cima, da passarela. O alívio descarrega num bocal sobre o corredor entre caldeiras.
export const BOILERS = [
  { id: 'I', z: 29, valve: { x: 17.1, y: GROUND, z: 29.9 }, plume: { x: 10, y: GROUND, z: 33 } },
  { id: 'II', z: 37, valve: { x: 17.1, y: GROUND, z: 37.9 }, plume: { x: 10, y: GROUND, z: 41 } },
  { id: 'III', z: 45, valve: { x: 11, y: GALLERY_Y, z: 48.3 }, plume: { x: 7, y: GROUND, z: 49.6 }, top: true, broken: { x: 17.1, z: 45.9 } },
];
export const BOILER_R = 1.8;
export const STEAM_DOOR = { x: 13, z: 52, width: 2.2, h: 2.8 };
// corredor de tubos (vazamentos) e oficina, a oeste
export const PIPES = { minX: -14, maxX: 0, minZ: 32, maxZ: 34.4 };
export const OFICINA = { minX: -22, maxX: -14, minZ: 28, maxZ: 38 };
export const LEAK = { period: 3.2, on: 1.3, halfW: 0.55 };
export const LEAKS = [{ id: 0, x: -3.5, off: 0 }, { id: 1, x: -7, off: 1.05 }, { id: 2, x: -10.5, off: 2.1 }];
/** o jato i está soprando no instante t (ciclo periódico com defasagem) */
export function leakOn(i, t) { const L = LEAKS[i]; const ph = ((t + L.off) % LEAK.period + LEAK.period) % LEAK.period; return ph < LEAK.on; }
/** vazamento (índice) cuja faixa contém x (só dentro do corredor) */
export function leakAt(p) {
  if (p.z < PIPES.minZ || p.z > PIPES.maxZ || p.x < PIPES.minX || p.x > PIPES.maxX || p.y > 2.2) return -1;
  for (const L of LEAKS) if (Math.abs(p.x - L.x) <= LEAK.halfW) return L.id;
  return -1;
}
export const FEED_VALVE = { x: -13.2, z: 32.3 };
export const WORKBENCH = { minX: -21.6, maxX: -18.6, minZ: 36.6, maxZ: 37.7 };
// Sala da Turbina e a base da torre de transmissão
export const TURBINE_HALL = { minX: 0, maxX: 30, minZ: 52, maxZ: 68, h: 9 };
export const TURBINE = { minX: 6, maxX: 21, minZ: 58, maxZ: 62 };
export const BOARD = { x: 29.6, z: 56, use: { x: 28.4, z: 56 } };
export const TOWER_BASE = { minX: 8, maxX: 18, minZ: 68, maxZ: 76 };
export const SLICE_END_Z = 69.6;
export const PLUME_R = 1.8;
export const PLUME_DY = 2;
/** dentro da nuvem de vapor de um alívio (raio horizontal + faixa de altura) */
export function inPlume(B, p) { return Math.hypot(p.x - B.plume.x, p.z - B.plume.z) <= PLUME_R && Math.abs(p.y - B.plume.y) <= PLUME_DY; }

export const USINA_CHECKPOINTS = {
  c8_yard: { x: 3.2, y: GROUND, z: 3, yaw: 0 },
  c8_boiler: { x: 22, y: GALLERY_Y, z: 22.4, yaw: 0 },
  c8_oficina: { x: -16.6, y: GROUND, z: 33.2, yaw: Math.PI / 2 },
  c8_turbine: { x: 13, y: GROUND, z: 54, yaw: 0 },
  c8_slice: { x: 13, y: GROUND, z: 70.4, yaw: 0 },
  ...TOWER_CHECKPOINTS,
};

export const USINA_FOG = { fog: 0x14100c, density: 0.04 };
// zonas: névoa + acústica (o ronco das caldeiras abafa os passos; base — o nível ajusta pela pressão)
export const USINA_ZONES = [
  { id: 'c8_patio', minX: -0.5, maxX: 26.5, minZ: -0.5, maxZ: 24, minY: -1, maxY: 12, fog: 0x1a1612, density: 0.034, acoustic: 1.0 },
  { id: 'c8_caldeiras', minX: 0, maxX: 30, minZ: 24, maxZ: 52, minY: -1, maxY: 9, fog: 0x1c120a, density: 0.04, acoustic: 0.6 },
  { id: 'c8_tubos', minX: -14, maxX: 0, minZ: 31.8, maxZ: 34.6, minY: -1, maxY: 4, fog: 0x18140f, density: 0.07, acoustic: 0.9 },
  { id: 'c8_oficina', minX: -22, maxX: -14, minZ: 28, maxZ: 38, minY: -1, maxY: 4, fog: 0x100d0a, density: 0.05, acoustic: 1.0 },
  { id: 'c8_turbina', minX: 0, maxX: 30, minZ: 52, maxZ: 68, minY: -1, maxY: 9, fog: 0x0e1012, density: 0.035, acoustic: 0.7 },
  { id: 'c8_torre', minX: 8, maxX: 18, minZ: 68, maxZ: 76, minY: -1, maxY: 7, fog: 0x0c0a0a, density: 0.05, acoustic: 1.2 },
  ...TOWER_ZONES,
];
export function usinaZoneAt(p) {
  for (const z of USINA_ZONES) if (p.x > z.minX && p.x < z.maxX && p.z > z.minZ && p.z < z.maxZ && p.y > z.minY && p.y < z.maxY) return z;
  return null;
}

export class UsinaLevel {
  constructor(game) {
    this.game = game;
    this.M = game.materials;
    this.b = new LevelBuilder(game.scene, game.col, game.materials);
    this.doors = {};
    this.lights = { power: [], emergency: [], flicker: [], all: [] };
    this.pickupMeshes = {};
    this.zone = null;
    this.boilers = {};      // id → { gauge needle, wheel, plume group, k (pressão 0..1), vented }
    this.leaks = [];        // jatos do corredor de tubos
    this.leaksOff = false;
    this.sabotage = false;
    this.turbineSpeed = 1;
    this.voltage = 220;
    this.time = 0;
  }

  build() {
    this._yard();
    this._hut();
    this._tower();
    this._boilerHouse();
    this._gallery();
    this._boilers();
    this._pipes();
    this._oficina();
    this._turbineHall();
    this._towerBase();
    this._doors();
    this._lights();
    this._nav();
    if (this.game.perception) this.game.perception.acoustics = (p) => this.acousticAt(p);
    return this;
  }

  lamp(...a) { return HospitalLevel.prototype.lamp.apply(this, a); }
  sign(...a) { return HospitalLevel.prototype.sign.apply(this, a); }

  // ---------- estado das máquinas ----------
  /** quantas caldeiras ainda pressurizam a linha */
  pressurized() { return BOILERS.filter((B) => !this.boilers[B.id]?.vented).length; }
  /** o ronco das caldeiras e da turbina abafa o som; conforme as máquinas param, o som vai mais longe */
  acousticAt(p) {
    const z = usinaZoneAt(p);
    if (!z) return 1;
    if (z.id === 'c8_caldeiras') return z.acoustic + 0.4 * (1 - this.pressurized() / 3);
    if (z.id === 'c8_turbina') return z.acoustic + 0.4 * (1 - this.turbineSpeed);
    return z.acoustic;
  }
  setVented(id, instant = false) {
    const B = this.boilers[id]; if (!B || B.vented) return false;
    B.vented = true; if (instant) B.k = 0;
    return true;
  }
  showWheel(id, on) { const B = this.boilers[id]; if (B) B.wheel.visible = !!on; }
  spinWheel(id, dt) { const B = this.boilers[id]; if (B) B.wheel.rotation[B.def.top ? 'z' : 'x'] += dt * 3; }
  /** nuvem de vapor do alívio (visual; dano é do roteiro): k 0..1 */
  setPlume(id, k) {
    const B = this.boilers[id]; if (!B) return;
    B.plume.visible = k > 0.02;
    B.plume.scale.setScalar(0.4 + 0.6 * k);
  }
  setLeaksOff(v = true) { this.leaksOff = v; for (const L of this.leaks) L.jet.visible = false; if (this.feedWheel) this.feedWheel.visible = true; }
  /** jato i soprando agora (relógio do nível) */
  leakActive(i) { return !this.leaksOff && leakOn(i, this.time); }
  setSabotage(v = true, instant = false) {
    this.sabotage = v;
    if (this.mainSwitch) this.mainSwitch.rotation.z = v ? 1.2 : -0.2;
    if (instant) this.voltage = v ? 0 : this.voltage;
  }

  // ---------- PÁTIO DO CARVÃO x0..26 z0..24 (a céu aberto, cinza caindo) ----------
  _yard() {
    const b = this.b, M = this.M, Yd = YARD;
    b.floor(Yd.minX, Yd.minZ, Yd.maxX, Yd.maxZ, Y, 'coal', 'c8_patio');
    b.box(Yd.minX - 0.2, Y, Yd.minZ - 0.2, Yd.maxX + 0.2, Y + 4, Yd.minZ, 'brick');
    b.box(Yd.minX - 0.2, Y, Yd.minZ, Yd.minX, Y + 4, Yd.maxZ, 'brick');
    b.box(Yd.maxX, Y, Yd.minZ, Yd.maxX + 0.2, Y + 4, Yd.maxZ, 'brick');
    // casinhola da escada de serviço (de onde Elias sai das catacumbas)
    b.box(1.2, Y, 0, 5.2, Y + 2.6, 1.6, 'concrete');
    b.box(1.0, Y + 2.6, -0.1, 5.4, Y + 2.8, 1.8, 'rust', { collide: false });
    b.box(2.5, Y, 1.6, 3.9, Y + 2.2, 1.62, 'steelDark', { collide: false });
    this.sign('CIA. DO METRÔ — SAÍDA DE SERVIÇO', 3.2, Y + 2.35, 1.63, 0, 2.2, 0.2, { bg: '#1a1712', fg: '#cbbf98' });
    // montes de carvão (obstáculos) e os vagonetes nos trilhos
    for (const H of HEAPS) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(H.r + 0.6, 2.2, 9), M.coal); c.position.set(H.x, Y + 1.1, H.z); b.group.add(c);
      b.box(H.x - H.r, Y, H.z - H.r, H.x + H.r, Y + 1.8, H.z + H.r, M.coal, { tag: 'obstacle' }).visible = false;
    }
    for (const z of [19.1, 19.9]) b.box(4, Y, z - 0.04, 22, Y + 0.12, z + 0.04, 'steel', { collide: false });
    for (const W of WAGONS) {
      b.box(W.minX, Y + 0.35, W.minZ, W.maxX, Y + 1.7, W.maxZ, 'rust', { tag: 'obstacle' });
      b.box(W.minX + 0.15, Y + 1.7, W.minZ + 0.15, W.maxX - 0.15, Y + 1.95, W.maxZ - 0.15, 'coal', { collide: false });
    }
    // postes de luz de sódio
    for (const [x, z] of [[7, 13.5], [18, 4]]) b.box(x - 0.08, Y, z - 0.08, x + 0.08, Y + 5, z + 0.08, 'steelDark', { tag: 'obstacle' });
    this.sign('USINA DE VÉSPERA — PÁTIO DE CARVÃO', 13, Y + 3.4, 0.02, 0, 3.4, 0.34, { bg: '#2a1a0c', fg: '#f0c070' });
    // cinza caindo da chaminé (partículas)
    const N = 260, pos = new Float32Array(N * 3), rnd = mulberry(1934);
    for (let i = 0; i < N; i++) { pos[i * 3] = rnd() * 26; pos[i * 3 + 1] = rnd() * 10; pos[i * 3 + 2] = rnd() * 24; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.ash = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x8a8580, size: 0.06, transparent: true, opacity: 0.7, depthWrite: false }));
    b.group.add(this.ash);
  }

  // ---------- GUARITA x1..5 z8..12 ----------
  _hut() {
    const b = this.b, H = HUT;
    b.floor(H.minX, H.minZ, H.maxX, H.maxZ, Y + 0.01, 'parquet', 'c8_guarita');
    b.wallX(H.minZ, YARD.minX, H.maxX, Y, Y + 2.8, [], 'brick');
    b.wallX(H.maxZ, YARD.minX, H.maxX, Y, Y + 2.8, [], 'brick');
    b.wallZ(H.maxX, H.minZ, H.maxZ, Y, Y + 2.8, [H.door.z], 'brick', 1.1, 2.2);
    b.ceiling(YARD.minX, H.minZ, H.maxX, H.maxZ, Y + 2.8, 'ceiling');
    b.box(1.2, Y, 10.6, 2.6, Y + 0.85, 11.8, 'woodDark', { tag: 'prop-low', sight: false });  // mesa
    b.box(1.1, Y, 8.2, 1.8, Y + 1.6, 8.7, 'wood', { tag: 'prop-low', sight: false });         // estante
    this.sign('GUARITA', H.maxX + 0.12, Y + 2.45, 9.0, Math.PI / 2, 0.8, 0.2, { bg: '#1a1712', fg: '#cbbf98' });
  }

  // ---------- TORRE DE CARVÃO x20..24 z12..16 + escada de marinheiro + ESTEIRA coberta até a galeria ----------
  _tower() {
    const b = this.b, T = TOWER, C = CATWALK, L = LADDER_C8;
    b.box(T.minX + 0.2, Y, T.minZ + 0.2, T.maxX - 0.2, G, T.maxZ - 0.2, 'rust');            // silo (bloco sólido)
    b.floor(T.minX, T.minZ, T.maxX, T.maxZ, G, 'steelDark', 'c8_torre_carvao');
    // guarda-corpos do topo (vão da escada no sul, da esteira no norte)
    b.box(T.minX - 0.1, G, T.minZ, T.minX, G + 1.05, T.maxZ, 'steel');
    b.box(T.maxX, G, T.minZ, T.maxX + 0.1, G + 1.05, T.maxZ, 'steel');
    b.box(T.minX, G, T.minZ - 0.1, L.x - 0.6, G + 1.05, T.minZ, 'steel');
    b.box(L.x + 0.6, G, T.minZ - 0.1, T.maxX, G + 1.05, T.minZ, 'steel');
    b.box(T.minX, G, T.maxZ, C.minX, G + 1.05, T.maxZ + 0.1, 'steel');
    b.box(C.maxX, G, T.maxZ, T.maxX, G + 1.05, T.maxZ + 0.1, 'steel');
    for (const [x, z] of [[T.minX, T.minZ], [T.maxX, T.minZ], [T.minX, T.maxZ], [T.maxX, T.maxZ]]) b.box(x - 0.08, G, z - 0.08, x + 0.08, G + 3.4, z + 0.08, 'steelDark', { collide: false });
    b.box(T.minX - 0.3, G + 3.4, T.minZ - 0.3, T.maxX + 0.3, G + 3.6, T.maxZ + 0.3, 'rust', { collide: false });
    // escada de marinheiro (trilhos + degraus) na face sul do silo
    for (const x of [L.x - 0.3, L.x + 0.3]) b.box(x - 0.03, Y, T.minZ + 0.02, x + 0.03, G + 1.1, T.minZ + 0.1, 'rust', { collide: false });
    for (let y = 0.3; y < G + 0.1; y += 0.32) b.box(L.x - 0.3, Y + y, T.minZ + 0.04, L.x + 0.3, Y + y + 0.03, T.minZ + 0.08, 'rust', { collide: false });
    this.sign('SILO 2 — SOMENTE PESSOAL', L.x, Y + 1.9, T.minZ + 0.22, Math.PI, 1.3, 0.2, { bg: '#c9a020', fg: '#1a1712' });
    // esteira coberta (passarela y 4,4) até a parede sul da Casa das Caldeiras
    b.floor(C.minX, C.minZ, C.maxX, C.maxZ, G, 'steelDark', 'c8_esteira');
    b.box(C.minX - 0.1, G, C.minZ, C.minX, G + 1.05, C.maxZ, 'steel');
    b.box(C.maxX, G, C.minZ, C.maxX + 0.1, G + 1.05, C.maxZ, 'steel');
    b.box(C.maxX - 0.55, G, C.minZ + 0.2, C.maxX - 0.1, G + 0.35, C.maxZ - 0.2, 'belt', { collide: false });   // a correia
    b.box(C.minX - 0.2, G + 2.6, C.minZ, C.maxX + 0.2, G + 2.75, C.maxZ, 'rust', { collide: false });
    for (const z of [18.5, 22]) for (const x of [C.minX + 0.1, C.maxX - 0.1]) b.box(x - 0.1, Y, z - 0.1, x + 0.1, G - 0.3, z + 0.1, 'steelDark', { tag: 'obstacle' });
  }

  // ---------- CASA DAS CALDEIRAS x0..30 z24..52 ----------
  _boilerHouse() {
    const b = this.b, H = BOILER_HOUSE, yT = Y + H.h;
    b.floor(H.minX, H.minZ, H.maxX, H.maxZ, Y, 'concrete', 'c8_caldeiras');
    b.ceiling(H.minX, H.minZ, H.maxX, H.maxZ, yT, 'soot');
    // parede sul: portão de carga (x13) e a boca da esteira (x21..23, y 4,4..6,6)
    b.wallX(H.minZ, H.minX, CATWALK.minX, Y, yT, [CARGO_GATE.x], 'brick', CARGO_GATE.width, 3.0);
    b.box(CATWALK.minX, Y, H.minZ - 0.1, CATWALK.maxX, G, H.minZ + 0.1, 'brick');
    b.box(CATWALK.minX, G + 2.2, H.minZ - 0.1, CATWALK.maxX, yT, H.minZ + 0.1, 'brick');
    b.wallX(H.minZ, CATWALK.maxX, H.maxX, Y, yT, [], 'brick');
    b.wallZ(H.minX, H.minZ, H.maxZ, Y, yT, [33.2], 'brick', 1.2, 2.3);                        // porta do corredor de tubos
    b.wallZ(H.maxX, H.minZ, H.maxZ, Y, yT, [], 'brick');
    b.wallX(H.maxZ, H.minX, H.maxX, Y, yT, [STEAM_DOOR.x], 'brick', STEAM_DOOR.width, STEAM_DOOR.h);   // porta-pistão
    this.sign('CASA DAS CALDEIRAS', 13, Y + 3.6, H.minZ + 0.12, 0, 2.6, 0.3, { bg: '#2a1a0c', fg: '#f0c070' });
    this.sign('SALA DA TURBINA ↑', STEAM_DOOR.x, Y + 3.3, H.maxZ - 0.12, Math.PI, 1.8, 0.22, { bg: '#1a1712', fg: '#cbbf98' });
    this.sign('OFICINA ←', 0.12, Y + 2.6, 33.2, Math.PI / 2, 1.0, 0.2, { bg: '#1a1712', fg: '#cbbf98' });
    // tranca de ferro do portão de carga (some quando destravado por dentro)
    this.gateBar = b.box(CARGO_GATE.x - 1.5, Y + 1.25, H.minZ + 0.12, CARGO_GATE.x + 1.5, Y + 1.45, H.minZ + 0.28, 'rust', { collide: false });
    // manômetro geral da linha, ao lado da porta-pistão (agulha = caldeiras ainda pressurizadas / 3)
    const gg = new THREE.Group(); gg.position.set(STEAM_DOOR.x - 1.9, Y + 2.0, H.maxZ - 0.14); b.group.add(gg);
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 16), this.M.gauge); face.rotation.x = Math.PI / 2; gg.add(face);
    const nd = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28, 0.02), this.M.needle); nd.geometry.translate(0, 0.13, 0); nd.position.z = -0.04; gg.add(nd);
    this.lineNeedle = nd;
    // pistões da porta (visual)
    for (const dx of [-1.4, 1.4]) b.box(STEAM_DOOR.x + dx - 0.12, Y, H.maxZ - 0.5, STEAM_DOOR.x + dx + 0.12, Y + 3.2, H.maxZ - 0.12, 'boilerIron', { collide: false });
  }

  // ---------- GALERIA LESTE (y 4,4), patamar, passarela sobre a caldeira III e escada para o chão ----------
  _gallery() {
    const b = this.b, Gl = GALLERY, Ld = LANDING, Br = BRIDGE, S = GSTAIR;
    b.floor(Gl.minX, Gl.minZ, Gl.maxX, Gl.maxZ, G, 'steelDark', 'c8_galeria');
    b.floor(Ld.minX, Ld.minZ, Ld.maxX, Ld.maxZ, G, 'steelDark', 'c8_patamar');
    b.floor(Br.minX, Br.minZ, Br.maxX, Br.maxZ, G, 'steelDark', 'c8_passarela');
    b.stairsZ(S.minX, S.maxX, S.zTop, S.zBottom, G, Y, 14, 'steelDark');
    // guarda-corpos (só barram quem está em cima: ficam acima de y 4,4)
    b.box(Gl.minX - 0.1, G, Gl.minZ, Gl.minX + 0.05, G + 1.05, Gl.maxZ, 'steel');
    b.box(Ld.minX - 0.1, G, Ld.minZ, Ld.minX + 0.05, G + 1.05, Br.minZ, 'steel');
    b.box(Ld.minX, G, Ld.maxZ, Ld.maxX, G + 1.05, Ld.maxZ + 0.1, 'steel');
    b.box(S.maxX, G, Gl.maxZ - 0.1, Gl.maxX, G + 1.05, Gl.maxZ, 'steel');
    b.box(Br.minX, G, Br.minZ - 0.1, Br.maxX, G + 1.05, Br.minZ, 'steel');
    b.box(Br.minX, G, Br.maxZ, Br.maxX, G + 1.05, Br.maxZ + 0.1, 'steel');
    b.box(Br.minX - 0.1, G, Br.minZ, Br.minX, G + 1.05, Br.maxZ, 'steel');
    // painéis laterais da escada (barram o patamar e o vão a leste, em qualquer altura)
    b.box(S.minX - 0.05, Y, S.zTop + 0.6, S.minX + 0.05, G + 1.05, S.zBottom, 'steel');
    b.box(S.maxX - 0.05, Y, S.zTop, S.maxX + 0.05, G + 1.05, S.zBottom, 'steel');
    // embaixo da escada: blocos em degraus (ninguém entra sob a rampa)
    b.box(S.minX + 0.05, Y, S.zTop, S.maxX - 0.05, Y + 2.9, S.zTop + 2, 'concrete');
    b.box(S.minX + 0.05, Y, S.zTop + 2, S.maxX - 0.05, Y + 1.7, S.zTop + 3.6, 'concrete');
    b.box(S.minX + 0.05, Y, S.zTop + 3.6, S.maxX - 0.05, Y + 0.85, S.zTop + 4.8, 'concrete');
    // pilares (obstáculos no chão; a galeria passa por cima deles)
    for (const [x, z] of [[20.3, 28], [20.3, 34], [20.3, 40], [20.3, 46], [25.6, 48.6], [12, 48.3], [16, 48.3]]) b.box(x - 0.22, Y, z - 0.22, x + 0.22, G - 0.3, z + 0.22, 'steelDark', { tag: 'obstacle' });
  }

  // ---------- AS TRÊS CALDEIRAS ----------
  _boilers() {
    const b = this.b, M = this.M;
    for (const B of BOILERS) {
      const z = B.z;
      b.box(3, Y, z - BOILER_R + 0.2, 15, Y + 0.5, z + BOILER_R - 0.2, 'brick', { collide: false });
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(BOILER_R, BOILER_R, 12, 18), M.boilerIron);
      cyl.rotation.z = Math.PI / 2; cyl.position.set(9, Y + 2.1, z); b.group.add(cyl);
      for (const x of [4, 7, 10, 13]) { const r = new THREE.Mesh(new THREE.TorusGeometry(BOILER_R + 0.02, 0.05, 6, 18), M.rust); r.rotation.y = Math.PI / 2; r.position.set(x, Y + 2.1, z); b.group.add(r); }
      this.game.col.addBox(3, Y, z - BOILER_R, 15, Y + 3.9, z + BOILER_R, { tag: 'obstacle', blocksSight: true });
      // fornalha na frente (leste): boca em brasa
      b.box(15, Y, z - 1.2, 16.2, Y + 2.6, z + 1.2, 'boilerIron', { tag: 'obstacle' });
      b.box(16.2, Y + 0.4, z - 0.5, 16.24, Y + 1.2, z + 0.5, 'ember', { collide: false });
      // manômetro na frente da fornalha (agulha = pressão desta caldeira)
      const gg = new THREE.Group(); gg.position.set(16.27, Y + 2.0, z - 0.7); gg.rotation.y = Math.PI / 2; b.group.add(gg);
      const face = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 14), M.gauge); face.rotation.x = Math.PI / 2; gg.add(face);
      const red = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.01), M.needle); red.position.set(0.13, 0.12, 0.025); gg.add(red);
      const nd = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.02), M.steelDark || M.rust); nd.geometry.translate(0, 0.09, 0); nd.position.z = 0.04; gg.add(nd);
      // válvula de alívio + volante (o volante só aparece montado durante/depois do alívio)
      const wheel = new THREE.Group(); b.group.add(wheel);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 6, 14), M.rust); wheel.add(rim);
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.03, 0.03), M.rust); wheel.add(sp);
      const sp2 = sp.clone(); sp2.rotation.z = Math.PI / 2; wheel.add(sp2);
      if (B.top) {
        // III: válvula no dorso da caldeira, de frente para a passarela
        b.box(B.valve.x - 0.07, Y + 3.8, z + 0.9, B.valve.x + 0.07, G + 0.9, z + 1.05, 'rust', { collide: false });
        b.box(B.valve.x - 0.12, G + 0.75, z + 1.05, B.valve.x + 0.12, G + 0.95, BRIDGE.minZ - 0.15, 'rust', { collide: false });
        wheel.position.set(B.valve.x, G + 0.85, BRIDGE.minZ - 0.12);
        // a haste de baixo, na frente da fornalha, quebrada
        b.box(16.25, Y + 0.6, B.broken.z - 0.06, 16.45, Y + 1.0, B.broken.z + 0.06, 'rust', { collide: false });
      } else {
        b.box(16.2, Y + 1.0, B.valve.z - 0.06, 16.5, Y + 1.12, B.valve.z + 0.06, 'rust', { collide: false });
        wheel.position.set(16.52, Y + 1.06, B.valve.z); wheel.rotation.y = Math.PI / 2;
      }
      wheel.visible = false;
      // escape do alívio: cano do dorso da caldeira até o bocal sobre o corredor
      b.box(B.plume.x - 0.1, Y + 3.9, Math.min(z, B.plume.z) - 0.1, B.plume.x + 0.1, Y + 4.1, Math.max(z, B.plume.z) + 0.1, 'rust', { collide: false });
      b.box(B.plume.x - 0.12, Y + 3.0, B.plume.z - 0.12, B.plume.x + 0.12, Y + 4.1, B.plume.z + 0.12, 'rust', { collide: false });
      const plume = new THREE.Group(); plume.position.set(B.plume.x, Y, B.plume.z); b.group.add(plume);
      for (let i = 0; i < 4; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.9 + i * 0.25, 8, 6), M.steam);
        s.position.set(Math.sin(i * 2.1) * 0.5, 0.6 + i * 0.7, Math.cos(i * 2.1) * 0.5); plume.add(s);
      }
      plume.visible = false;
      this.boilers[B.id] = { def: B, needle: nd, wheel, plume, k: 1, vented: false };
      this.sign('CALDEIRA ' + B.id, 16.25, Y + 2.85, z, Math.PI / 2, 1.1, 0.22, { bg: '#2a1a0c', fg: '#f0c070' });
    }
  }

  // ---------- CORREDOR DE TUBOS x−14..0 z32..34,4 (vazamentos periódicos) ----------
  _pipes() {
    const b = this.b, P = PIPES, M = this.M;
    b.floor(P.minX, P.minZ, P.maxX, P.maxZ, Y, 'concrete', 'c8_tubos');
    b.ceiling(P.minX, P.minZ, P.maxX, P.maxZ, Y + 3, 'soot');
    b.wallX(P.minZ, P.minX, P.maxX, Y, Y + 3, [], 'brick');
    b.wallX(P.maxZ, P.minX, P.maxX, Y, Y + 3, [], 'brick');
    for (const y of [1.9, 2.3, 2.65]) b.box(P.minX, Y + y, P.maxZ - 0.35, P.maxX, Y + y + 0.18, P.maxZ - 0.15, 'rust', { collide: false });
    for (const L of LEAKS) {
      b.box(L.x - 0.12, Y + 1.7, P.maxZ - 0.45, L.x + 0.12, Y + 2.9, P.maxZ - 0.1, 'boilerIron', { collide: false });
      const jet = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.2, 8, 1, true), M.steam);
      jet.rotation.x = -Math.PI / 2; jet.position.set(L.x, Y + 1.2, P.maxZ - 1.4); jet.visible = false; b.group.add(jet);
      this.leaks.push({ ...L, jet });
    }
    // registro de alimentação (no fim do corredor, parede sul) — o volante fecha o vapor dos tubos
    b.box(FEED_VALVE.x - 0.1, Y + 0.3, P.minZ + 0.1, FEED_VALVE.x + 0.1, Y + 2.9, P.minZ + 0.3, 'rust', { collide: false });
    const fw = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 12), M.rust); fw.position.set(FEED_VALVE.x, Y + 1.2, P.minZ + 0.36); fw.visible = false; b.group.add(fw);
    this.feedWheel = fw;
    this.sign('REGISTRO DE ALIMENTAÇÃO', FEED_VALVE.x, Y + 1.75, P.minZ + 0.12, 0, 1.4, 0.18, { bg: '#c9a020', fg: '#1a1712' });
  }

  // ---------- OFICINA x−22..−14 z28..38 ----------
  _oficina() {
    const b = this.b, O = OFICINA, Wb = WORKBENCH;
    b.floor(O.minX, O.minZ, O.maxX, O.maxZ, Y, 'concrete', 'c8_oficina');
    b.ceiling(O.minX, O.minZ, O.maxX, O.maxZ, Y + 3.4, 'soot');
    b.wallX(O.minZ, O.minX, O.maxX, Y, Y + 3.4, [], 'brick');
    b.wallX(O.maxZ, O.minX, O.maxX, Y, Y + 3.4, [], 'brick');
    b.wallZ(O.minX, O.minZ, O.maxZ, Y, Y + 3.4, [], 'brick');
    b.wallZ(O.maxX, O.minZ, O.maxZ, Y, Y + 3.4, [33.2], 'brick', 1.4, 2.4);
    b.box(Wb.minX, Y, Wb.minZ, Wb.maxX, Y + 0.9, Wb.maxZ, 'woodDark', { tag: 'prop-low', sight: false });
    b.box(-21.8, Y, 28.3, -20.6, Y + 1.9, 29.0, 'steelDark', { tag: 'prop-low' });                 // armário
    b.box(-16.2, Y, 28.3, -14.4, Y + 0.8, 29.6, 'rust', { tag: 'prop-low', sight: false });         // torno
    for (let i = 0; i < 5; i++) b.box(-21.9, Y + 1.3 + i * 0.05, 31 + i * 0.9, -21.85, Y + 1.7, 31.5 + i * 0.9, 'rust', { collide: false });
    this.sign('OFICINA DE MANUTENÇÃO', -18, Y + 2.7, O.maxZ - 0.12, Math.PI, 2.4, 0.24, { bg: '#1a1712', fg: '#cbbf98' });
  }

  // ---------- SALA DA TURBINA x0..30 z52..68 ----------
  _turbineHall() {
    const b = this.b, H = TURBINE_HALL, T = TURBINE, M = this.M, yT = Y + H.h;
    b.floor(H.minX, H.minZ, H.maxX, H.maxZ, Y, 'tile', 'c8_turbina');
    b.ceiling(H.minX, H.minZ, H.maxX, H.maxZ, yT, 'soot');
    b.wallZ(H.minX, H.minZ, H.maxZ, Y, yT, [], 'brick');
    b.wallZ(H.maxX, H.minZ, H.maxZ, Y, yT, [], 'brick');
    b.wallX(H.maxZ, H.minX, H.maxX, Y, yT, [13], 'brick', 1.6, 2.4);
    // turbina: carcaça (obstáculo), gerador e o volante de inércia girando
    b.box(T.minX, Y, T.minZ, T.maxX, Y + 3.6, T.maxZ, M.boilerIron, { tag: 'obstacle' }).visible = false;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, T.maxX - T.minX, 18), M.boilerIron);
    body.rotation.z = Math.PI / 2; body.position.set((T.minX + T.maxX) / 2, Y + 2, (T.minZ + T.maxZ) / 2); b.group.add(body);
    b.box(T.maxX, Y, T.minZ - 0.5, T.maxX + 3, Y + 4, T.maxZ + 0.5, 'steelDark', { tag: 'obstacle' });
    const fw = new THREE.Group(); fw.position.set(T.minX - 0.4, Y + 2.3, (T.minZ + T.maxZ) / 2); b.group.add(fw);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.35, 20), M.steelDark || M.rust); disc.rotation.z = Math.PI / 2; fw.add(disc);
    for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 4.2), M.rust); sp.rotation.x = i * Math.PI / 6; fw.add(sp); }
    this.flywheel = fw;
    this.game.col.addBox(T.minX - 0.65, Y, T.minZ - 0.3, T.minX - 0.15, Y + 4.5, T.maxZ + 0.3, { tag: 'obstacle', blocksSight: true });
    // quadro de transmissão (parede leste): voltímetro + chave geral
    const Bd = BOARD;
    b.box(Bd.x - 0.3, Y + 0.3, Bd.z - 1.3, Bd.x + 0.4, Y + 2.8, Bd.z + 1.3, 'steelDark', { tag: 'prop-low' });
    const vg = new THREE.Group(); vg.position.set(Bd.x - 0.33, Y + 2.2, Bd.z - 0.6); vg.rotation.y = -Math.PI / 2; b.group.add(vg);
    const vf = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 14), M.gauge); vf.rotation.x = Math.PI / 2; vg.add(vf);
    const vn = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.21, 0.02), M.needle); vn.geometry.translate(0, 0.1, 0); vn.position.z = 0.04; vg.add(vn);
    this.voltNeedle = vn;
    const sw = new THREE.Group(); sw.position.set(Bd.x - 0.36, Y + 1.5, Bd.z + 0.5); b.group.add(sw);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.06), M.rust); arm.position.y = 0.28; sw.add(arm);
    const knob = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.22), M.leatherDark || M.rust); knob.position.y = 0.58; sw.add(knob);
    sw.rotation.z = -0.2; this.mainSwitch = sw;
    this.sign('TRANSMISSÃO — TORRE', Bd.x - 0.36, Y + 2.65, Bd.z + 0.4, -Math.PI / 2, 1.4, 0.2, { bg: '#2a1a0c', fg: '#f0c070' });
    // mesa do chefe de turno
    b.box(2.4, Y, 64.2, 5.2, Y + 0.85, 65.6, 'woodDark', { tag: 'prop-low', sight: false });
    this.sign('SALA DA TURBINA', 15, Y + 4.2, H.minZ + 0.12, 0, 2.6, 0.3, { bg: '#2a1a0c', fg: '#f0c070' });
    this.sign('TORRE DE TRANSMISSÃO ↑', 13, Y + 2.9, H.maxZ - 0.12, Math.PI, 2.2, 0.22, { bg: '#1a1712', fg: '#cbbf98' });
  }

  // ---------- TORRE DE TRANSMISSÃO x8..18 z68..76 (base, casa de máquinas, sala dos transmissores): UsinaTower.js ----------
  _towerBase() { buildTower(this); }

  _doors() {
    const ctx = { materials: this.M, group: this.b.group, col: this.game.col, audio: this.game.audio, bus: this.game.bus };
    const D = (o) => (this.doors[o.id] = new Door({ mat: this.M.door, ...o }, ctx));
    D({ id: 'c8_hut', axis: 'z', x: HUT.maxX, y: GROUND, z: HUT.door.z, width: 1.1, height: 2.2, swing: 1, mat: this.M.door, label: 'porta da guarita' });
    D({ id: 'c8_cargo', axis: 'x', x: CARGO_GATE.x, y: GROUND, z: BOILER_HOUSE.minZ, width: CARGO_GATE.width, height: 3.0, swing: 1, mat: this.M.rust || this.M.doorMetal, locked: true,
      lockMsg: 'Portão de carga da Casa das Caldeiras. Trancado por dentro — dá pra ouvir a tranca de ferro chacoalhar quando você empurra.', label: 'portão de carga' });
    D({ id: 'c8_pipes', axis: 'z', x: BOILER_HOUSE.minX, y: GROUND, z: 33.2, width: 1.2, height: 2.3, swing: -1, mat: this.M.doorMetal || this.M.door, label: 'porta do corredor de tubos' });
    D({ id: 'c8_steamDoor', axis: 'x', x: STEAM_DOOR.x, y: GROUND, z: BOILER_HOUSE.maxZ, width: STEAM_DOOR.width, height: STEAM_DOOR.h, kind: 'sliding', mat: this.M.boilerIron || this.M.doorMetal, locked: true,
      lockMsg: 'Porta-pistão da Sala da Turbina.', label: 'porta-pistão' });
    D({ id: 'c8_towerDoor', axis: 'x', x: 13, y: GROUND, z: TURBINE_HALL.maxZ, width: 1.6, height: 2.4, swing: 1, mat: this.M.doorMetal || this.M.door, locked: true,
      lockMsg: 'Porta da base da torre. Fechadura elétrica: a lâmpada verde do batente está acesa — a corrente da transmissão a mantém trancada.', label: 'porta da base da torre' });
  }

  _lights() {
    this.game.scene.add(new THREE.HemisphereLight(0x4a4038, 0x0a0806, 0.5));
    const sodium = 0xffa850, ember = 0xff6a20, warm = 0xffc080, cold = 0xa8c0c8, red = 0xff4030;
    this.lamp(7, Y + 5, 13.5, sodium, 0.9, 14);                              // pátio (postes)
    this.lamp(18, Y + 5, 4, sodium, 0.8, 13, { flicker: true });
    this.lamp(3, Y + 2.7, 10, warm, 0.7, 6);                                 // guarita
    this.lamp(22, G + 3.2, 14, sodium, 0.6, 8);                              // topo do silo
    this.lamp(22, G + 2.5, 20, sodium, 0.5, 7, { flicker: true });           // esteira
    for (const B of BOILERS) this.lamp(17.2, Y + 1.0, B.z, ember, 1.0, 9, { mat: this.M.ember });   // fornalhas
    this.lamp(25, G + 3.5, 34, warm, 0.7, 12);                               // galeria
    this.lamp(9, Y + 8.5, 38, warm, 0.6, 16, { flicker: true });             // teto da casa
    this.lamp(-7, Y + 2.7, 33.2, sodium, 0.5, 7, { flicker: true });         // corredor de tubos
    this.lamp(-18, Y + 3.1, 33, warm, 0.8, 9);                               // oficina
    this.turbineLights = [this.lamp(8, Y + 8.4, 55, cold, 0.9, 16, { power: true }), this.lamp(22, Y + 8.4, 65, cold, 0.9, 16, { power: true })];
    this.boardLamp = this.lamp(28.6, Y + 3.2, 56, red, 0.0, 7, { emergency: true });
    this.lamp(13, Y + 5.8, 70.5, red, 0.7, 9, { flicker: true });            // base da torre
    towerLights(this);
  }

  _nav() {
    const n = this.game.nav, d = this.doors;
    const N = (id, x, z, y = Y) => n.addNode(id, x, y, z);
    // pátio
    N('y0', 3.2, 3); N('y1', 7, 3); N('y2', 13.5, 3); N('y3', 19.5, 3.5); N('y4', 7, 10); N('y5', 13, 8); N('y6', 18.6, 8);
    N('y7', 6, 16); N('y8', 13, 15.5); N('y9', 18.8, 16.5); N('y10', 13, 22.4); N('yL', 22, 10.4); N('h0', 6.2, 10); N('h1', 3, 10);
    // casa das caldeiras (chão)
    N('b0', 13, 25.6); N('bW1', 1.5, 26); N('bW2', 1.5, 33.2); N('bW3', 1.5, 41); N('bW4', 1.5, 49.6);
    N('a1', 9, 33); N('a2', 9, 41); N('a3', 5, 49.6); N('bE1', 18, 26.2); N('bE2', 18, 33); N('bE3', 18, 41); N('bE4', 18, 49.8);
    N('bU1', 24.5, 29); N('bU2', 24.5, 38); N('bD', 13, 50.6); N('sB', 27.5, 51);
    // galeria / esteira / silo (y 4,4)
    N('t0', 22, 13.6, G); N('c0', 22, 17.5, G); N('c1', 22, 22.6, G); N('g0', 22.5, 25.4, G); N('g1', 24, 34, G); N('g2', 27.5, 40, G); N('g3', 27.5, 43.4, G);
    N('gL', 23, 46.4, G); N('gB1', 17, 48.3, G); N('gB2', 11.5, 48.3, G);
    // tubos / oficina
    N('p0', -1.5, 33.2); N('p1', -7, 33.2); N('p2', -12.6, 33.2); N('o0', -16, 33.2); N('o1', -19, 30.6); N('o2', -19.6, 35.4);
    // turbina / base da torre
    N('tS', 13, 54); N('tW', 3, 55); N('tE', 26, 55); N('tNW', 3, 64.8); N('tNE', 26, 64.8); N('tN', 13, 65.6); N('tb0', 13, 70);
    const L = (a, b, door) => n.link(a, b, door);
    L('y0', 'y1'); L('y1', 'y2'); L('y2', 'y3'); L('y1', 'y4'); L('y4', 'y5'); L('y2', 'y5'); L('y5', 'y6'); L('y3', 'y6'); L('y6', 'yL');
    L('y4', 'y7'); L('y4', 'h0'); L('h0', 'h1', d.c8_hut); L('y7', 'y8'); L('y5', 'y8'); L('y8', 'y9'); L('y6', 'y9'); L('y8', 'y10');
    L('y10', 'b0', d.c8_cargo);
    L('b0', 'bW1'); L('b0', 'bE1'); L('bW1', 'bW2'); L('bW2', 'bW3'); L('bW3', 'bW4'); L('bW2', 'a1'); L('bW3', 'a2'); L('bW4', 'a3');
    L('a1', 'bE2'); L('a2', 'bE3'); L('a3', 'bD'); L('bE1', 'bE2'); L('bE2', 'bE3'); L('bE3', 'bE4'); L('bE4', 'bD');
    L('bE1', 'bU1'); L('bU1', 'bU2'); L('bE2', 'bU1'); L('bE3', 'bU2'); L('bE4', 'sB');
    L('t0', 'c0'); L('c0', 'c1'); L('c1', 'g0'); L('g0', 'g1'); L('g1', 'g2'); L('g2', 'g3'); L('g3', 'sB'); L('g3', 'gL'); L('g1', 'gL');
    L('gL', 'gB1'); L('gB1', 'gB2');
    L('bW2', 'p0', d.c8_pipes); L('p0', 'p1'); L('p1', 'p2'); L('p2', 'o0'); L('o0', 'o1'); L('o0', 'o2');
    L('bD', 'tS', d.c8_steamDoor); L('tS', 'tW'); L('tS', 'tE'); L('tW', 'tNW'); L('tE', 'tNE'); L('tNW', 'tN'); L('tNE', 'tN');
    L('tN', 'tb0', d.c8_towerDoor);
    towerNav(this);
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
    this.time += dt;
    this._cullLights(dt);
    for (const L of this.lights.flicker) {
      const f = Math.sin(t * 9 + L.base * 7) * Math.sin(t * 5.3) > 0.95 ? 0.3 : 1;
      L.light.intensity = L.base * f * (0.9 + Math.random() * 0.1);
    }
    for (const id in this.doors) this.doors[id].update(dt);
    // pressão das caldeiras: a aliviada cai devagar; a agulha acompanha
    for (const id in this.boilers) {
      const B = this.boilers[id];
      if (B.vented && B.k > 0) B.k = Math.max(0, B.k - dt / 4);
      B.needle.rotation.z = 1.9 - B.k * 3.2;
    }
    if (this.lineNeedle) this.lineNeedle.rotation.z = 1.9 - (this.pressurized() / 3) * 3.2;
    // turbina perde rotação com a pressão; a tensão da torre cai a zero só com a chave geral desarmada
    const tgt = this.pressurized() / 3;
    this.turbineSpeed += (tgt - this.turbineSpeed) * Math.min(1, dt * 0.35);
    if (this.flywheel) this.flywheel.rotation.x += dt * this.turbineSpeed * 9;
    const vT = this.sabotage ? 0 : 110 + 110 * this.turbineSpeed;   // banco de acumuladores segura 110 V
    this.voltage += (vT - this.voltage) * Math.min(1, dt * 1.5);
    if (this.voltNeedle) this.voltNeedle.rotation.z = 1.4 - (this.voltage / 220) * 2.8;
    if (this.turbineLights) for (const L of this.turbineLights) L.light.intensity = L.base * (0.15 + 0.85 * this.voltage / 220);
    if (this.boardLamp) this.boardLamp.light.intensity = this.sabotage ? 0.9 : 0;
    // vazamentos do corredor
    for (const L of this.leaks) L.jet.visible = this.leakActive(L.id);
    // cinza caindo
    if (this.ash) {
      const a = this.ash.geometry.attributes.position, arr = a.array;
      for (let i = 0; i < arr.length; i += 3) { arr[i + 1] -= dt * 0.5; arr[i] += Math.sin(t + i) * dt * 0.15; if (arr[i + 1] < 0) arr[i + 1] += 10; }
      a.needsUpdate = true;
    }
    updateTower(this, dt, t);
    this._updateZone(dt);
  }
  zoneAt(p) { return usinaZoneAt(p); }
  _updateZone(dt) {
    const fog = this.game.scene.fog, p = this.game.player?.pos;
    if (!fog || !p) return;
    const z = this.zoneAt(p); this.zone = z ? z.id : null;
    const tgt = z || USINA_FOG, k = Math.min(1, dt * 1.5);
    this._fogC = this._fogC || new THREE.Color();
    this._fogC.set(tgt.fog);
    fog.color.lerp(this._fogC, k);
    fog.density += (tgt.density + (this.ashStorm || 0) + (this.smokeBoost || 0) - fog.density) * k;
    if (this.game.scene.background?.isColor) this.game.scene.background.copy(fog.color).multiplyScalar(0.8);
  }
}

// PRNG determinístico (cenário igual em todo carregamento)
function mulberry(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
