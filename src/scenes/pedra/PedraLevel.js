// Capítulo 7 — Sob a Pedra (primeira fatia) · catacumbas sob o Museu e a estação velha do metrô. A escada de serviço do
// alçapão da reserva técnica termina num poço de pedra; dali, a galeria de pedra da Companhia do Metrô (carrinho de
// ferramentas), a grade rangente do ossuário, o ossuário (paredes de crânios, pilares, ossos espalhados no chão que
// estalam, nichos emparedados com cal — os "irmãos da vigília", cegos, que acordam com barulho), a cripta do coveiro-mor
// (jazigo com tampa de pedra: alavanca → chave + recado de Inês), a grade do fundo (cadeado de crânio), o túnel de
// serviço e a plataforma da Estação Sé Velha (Linha Velha, fechada desde 1912), com os trilhos 1 m abaixo e o túnel
// leste para a Estação Sob a Pedra (fim da fatia). Um corredor de serviço volta da plataforma ao poço (atalho com
// ferrolho do lado de lá). A pedra ecoa: cada área multiplica o raio dos ruídos (PerceptionSystem.acoustics).
// Mesma base modular (LevelBuilder/Door/Navigation), tudo procedural; um único piso em y = 0 (trilhos em y = −1).
import * as THREE from 'three';
import { LevelBuilder } from '../../world/LevelBuilder.js';
import { Door } from '../../world/Doors.js';
import { HospitalLevel } from '../hospital/HospitalLevel.js';

const LIGHT_BUDGET = 12;
export const GROUND = 0;
export const TRACK_Y = -1;
const Y = GROUND;
export const SHAFT = { minX: 14, maxX: 22, minZ: 0, maxZ: 6 };
export const STONE_GALLERY = { minX: 16, maxX: 20, minZ: 6, maxZ: 16 };
export const OSSUARY = { minX: 12, maxX: 24, minZ: 16, maxZ: 36 };
export const CRYPT = { minX: 4, maxX: 12, minZ: 30, maxZ: 38 };
export const TUNNEL = { minX: 16, maxX: 20, minZ: 36, maxZ: 44 };
export const PLATFORM = { minX: 4, maxX: 44, minZ: 44, maxZ: 50 };
export const TRACKS = { minX: 4, maxX: 50, minZ: 50, maxZ: 55.2, endX: 46.2 };
export const SERVICE_S = { minX: 22, maxX: 39.5, minZ: 1.5, maxZ: 4.5 };
export const SERVICE_N = { minX: 36.5, maxX: 39.5, minZ: 4.5, maxZ: 44 };
// escada do alçapão (parede sul do poço) e o carrinho de ferramentas da galeria
export const LADDER = { x: 18, z: 0.15 };
export const TOOL_CART = { x: 19.2, z: 10.8 };
// jazigo do coveiro-mor (cripta, encostado na parede norte): a tampa só sai com alavanca
export const JAZIGO = { minX: 7.2, maxX: 9.6, minZ: 36.2, maxZ: 37.8, x: 8.4, z: 37, use: { x: 8.4, z: 35.4 } };
// nichos emparedados (parede de cal na frente; o morador fica de pé lá dentro, x = centro do nicho)
export const NICHES = [
  { id: 'nW1', x: 11.5, z: 20.5, face: Math.PI / 2, enemy: 'c7_emp1' },
  { id: 'nW2', x: 11.5, z: 27, face: Math.PI / 2, enemy: 'c7_emp3' },
  { id: 'nE1', x: 24.5, z: 22, face: -Math.PI / 2, enemy: null },          // já aberto: vazio, cal no chão
  { id: 'nE2', x: 24.5, z: 29.5, face: -Math.PI / 2, enemy: 'c7_emp2' },
  { id: 'nC', x: 3.5, z: 33.5, face: Math.PI / 2, enemy: 'c7_emp4' },       // cripta, ao lado do jazigo
];
// ossos espalhados no chão do ossuário: pisar estala (barulho real, propagado pela pedra)
export const BONE_PATCHES = [
  { id: 'b0', x0: 16.4, x1: 19.6, z0: 22.2, z1: 24.0 },
  { id: 'b1', x0: 13.2, x1: 16.6, z0: 28.4, z1: 30.2 },
  { id: 'b2', x0: 19.4, x1: 22.8, z0: 28.4, z1: 30.2 },
  { id: 'b3', x0: 12.2, x1: 15.0, z0: 34.3, z1: 35.8 },
];
export function boneAt(x, z) { for (const b of BONE_PATCHES) if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) return b; return null; }

export const PEDRA_CHECKPOINTS = {
  c7_ladder: { x: 18, y: GROUND, z: 2.2, yaw: 0 },
  c7_ossuary: { x: 18, y: GROUND, z: 17.4, yaw: 0 },
  c7_platform: { x: 9.6, y: GROUND, z: 46.4, yaw: Math.PI / 2 },
  c7_slice: { x: 45.4, y: TRACK_Y, z: 52.6, yaw: Math.PI / 2 },
};

// névoa padrão: poeira de cal e umidade de pedra
export const PEDRA_FOG = { fog: 0x0a0908, density: 0.055 };
// zonas: névoa + acústica (multiplicador do raio dos ruídos — a pedra leva o som)
export const PEDRA_ZONES = [
  { id: 'c7_poco', minX: 14, maxX: 22, minZ: -1, maxZ: 6, minY: -1, maxY: 8, fog: 0x0a0908, density: 0.06, acoustic: 1.3 },
  { id: 'c7_galeria', minX: 16, maxX: 20, minZ: 6, maxZ: 16, minY: -1, maxY: 5, fog: 0x0b0a08, density: 0.065, acoustic: 1.3 },
  { id: 'c7_ossuario', minX: 11, maxX: 25, minZ: 16, maxZ: 36, minY: -1, maxY: 6, fog: 0x0d0b08, density: 0.05, acoustic: 1.6 },
  { id: 'c7_cripta', minX: 3, maxX: 12, minZ: 30, maxZ: 38, minY: -1, maxY: 5, fog: 0x0a0806, density: 0.07, acoustic: 1.4 },
  { id: 'c7_tunel', minX: 16, maxX: 20, minZ: 36, maxZ: 44, minY: -1, maxY: 5, fog: 0x080808, density: 0.06, acoustic: 1.2 },
  { id: 'c7_estacao', minX: 4, maxX: 50, minZ: 44, maxZ: 56, minY: -2, maxY: 6, fog: 0x0a0c0c, density: 0.042, acoustic: 1.2 },
  { id: 'c7_servico', minX: 22, maxX: 40, minZ: 1, maxZ: 44, minY: -1, maxY: 5, fog: 0x080808, density: 0.06, acoustic: 1.0 },
];
export function pedraZoneAt(p) {
  for (const z of PEDRA_ZONES) if (p.x > z.minX && p.x < z.maxX && p.z > z.minZ && p.z < z.maxZ && p.y > z.minY && p.y < z.maxY) return z;
  return null;
}
/** multiplicador acústico num ponto (1 fora das zonas) */
export function acousticAt(p) { return pedraZoneAt(p)?.acoustic ?? 1; }

export class PedraLevel {
  constructor(game) {
    this.game = game;
    this.M = game.materials;
    this.b = new LevelBuilder(game.scene, game.col, game.materials);
    this.doors = {};
    this.lights = { power: [], emergency: [], flicker: [], all: [] };
    this.pickupMeshes = {};
    this.zone = null;
    this.niches = {};
    this.jazigo = null;
  }

  build() {
    this._shaft();
    this._stoneGallery();
    this._ossuary();
    this._crypt();
    this._tunnel();
    this._station();
    this._service();
    for (const n of NICHES) this._niche(n);
    this._doors();
    this._lights();
    this._nav();
    // a pedra ecoa: o nível define a acústica (raio dos ruídos) de cada área
    if (this.game.perception) this.game.perception.acoustics = acousticAt;
    return this;
  }

  lamp(...a) { return HospitalLevel.prototype.lamp.apply(this, a); }
  sign(...a) { return HospitalLevel.prototype.sign.apply(this, a); }
  _skull(x, y, z, s = 1, parent = null) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.11 * s, 7, 5), this.M.bone || this.M.stone);
    m.position.set(x, y, z); m.scale.set(1, 0.9, 1.15); (parent || this.b.group).add(m);
    return m;
  }
  /** parede de crânios (ossuário): fileiras de crânios embutidos numa face de parede */
  _skullWall(axis, c, a0, a1, y0, rows, face) {
    const step = 0.34;
    for (let r = 0; r < rows; r++) for (let a = a0 + 0.2 + (r % 2) * 0.17; a < a1 - 0.1; a += step) {
      const y = y0 + r * 0.3;
      if (axis === 'x') this._skull(c + face * 0.02, y, a, 0.9);
      else this._skull(a, y, c + face * 0.02, 0.9);
    }
  }

  // ---------- POÇO DA ESCADA x14..22 z0..6: pé da escada de serviço; porta de ferro a leste (ferrolho do lado de lá) ----------
  _shaft() {
    const b = this.b, S = SHAFT;
    b.floor(S.minX, S.minZ, S.maxX, S.maxZ, Y, 'cantaria', 'c7_poco');
    b.ceiling(S.minX, S.minZ + 1.6, S.maxX, S.maxZ, Y + 3.4, 'cantaria');
    b.ceiling(S.minX, S.minZ, LADDER.x - 1.2, S.minZ + 1.6, Y + 3.4, 'cantaria');
    b.ceiling(LADDER.x + 1.2, S.minZ, S.maxX, S.minZ + 1.6, Y + 3.4, 'cantaria');
    b.box(S.minX - 0.2, Y, S.minZ - 0.2, S.maxX + 0.2, Y + 9, S.minZ, 'cantaria');                 // parede sul (escada)
    b.wallZ(S.minX, S.minZ, S.maxZ, Y, Y + 3.4, [], 'cantaria');
    b.wallZ(S.maxX, S.minZ, S.maxZ, Y, Y + 3.4, [3], 'cantaria', 1.2, 2.2);                       // porta de serviço
    b.wallX(S.maxZ, S.minX, S.maxX, Y, Y + 3.4, [18], 'cantaria', 4.0, 3.0);                       // arco para a galeria
    // poço da escada: chaminé de pedra subindo até o alçapão (fechado lá em cima)
    b.box(LADDER.x - 1.2, Y + 3.4, S.minZ, LADDER.x - 1.0, Y + 9, S.minZ + 1.6, 'cantaria');
    b.box(LADDER.x + 1.0, Y + 3.4, S.minZ, LADDER.x + 1.2, Y + 9, S.minZ + 1.6, 'cantaria');
    b.box(LADDER.x - 1.2, Y + 3.4, S.minZ + 1.6, LADDER.x + 1.2, Y + 9, S.minZ + 1.8, 'cantaria');
    b.box(LADDER.x - 1.0, Y + 8.9, S.minZ, LADDER.x + 1.0, Y + 9.0, S.minZ + 1.6, 'rust', { collide: false });
    for (const x of [LADDER.x - 0.32, LADDER.x + 0.32]) b.box(x - 0.03, Y, 0.12, x + 0.03, Y + 8.8, 0.2, 'rust', { collide: false });
    for (let y = 0.3; y < 8.8; y += 0.34) b.box(LADDER.x - 0.32, Y + y, 0.14, LADDER.x + 0.32, Y + y + 0.03, 0.18, 'rust', { collide: false });
    // caixotes e o que caiu da reserva técnica pelo alçapão
    b.box(19.9, Y, 4.2, 21.3, Y + 0.9, 5.6, 'woodDark', { tag: 'prop-low', sight: false });
    b.box(14.3, Y, 4.6, 15.4, Y + 0.7, 5.8, 'wood', { tag: 'prop-low', sight: false });
    b.box(16.6, Y + 0.002, 1.0, 17.3, Y + 0.02, 1.6, 'paper', { collide: false });
    this.sign('CIA. DO METROPOLITANO — POÇO DE SERVIÇO 3', 18, Y + 2.7, 5.88, Math.PI, 2.8, 0.26, { bg: '#1a1712', fg: '#cbbf98' });
    this.sign('SERVIÇO →', 21.88, Y + 2.5, 3, -Math.PI / 2, 0.9, 0.2, { bg: '#1a1712', fg: '#cbbf98' });
  }

  // ---------- GALERIA DE PEDRA x16..20 z6..16: abóbada baixa, carrinho de ferramentas da Companhia ----------
  _stoneGallery() {
    const b = this.b, G = STONE_GALLERY;
    b.floor(G.minX, G.minZ, G.maxX, G.maxZ, Y, 'cantaria', 'c7_galeria');
    b.ceiling(G.minX, G.minZ, G.maxX, G.maxZ, Y + 3.0, 'cantaria');
    b.wallZ(G.minX, G.minZ, G.maxZ, Y, Y + 3.0, [], 'cantaria');
    b.wallZ(G.maxX, G.minZ, G.maxZ, Y, Y + 3.0, [], 'cantaria');
    // arcos de reforço
    for (const z of [8.5, 12.5]) {
      b.box(G.minX + 0.1, Y, z - 0.2, G.minX + 0.4, Y + 2.8, z + 0.2, 'stone');
      b.box(G.maxX - 0.4, Y, z - 0.2, G.maxX - 0.1, Y + 2.8, z + 0.2, 'stone');
      b.box(G.minX + 0.1, Y + 2.6, z - 0.2, G.maxX - 0.1, Y + 2.95, z + 0.2, 'stone', { collide: false });
    }
    // carrinho de ferramentas (o pé de cabra fica em cima)
    const C = TOOL_CART;
    b.box(C.x - 0.45, Y + 0.25, C.z - 0.8, C.x + 0.45, Y + 0.85, C.z + 0.8, 'rust', { tag: 'prop-low', sight: false });
    for (const [dx, dz] of [[-0.35, -0.65], [0.35, -0.65], [-0.35, 0.65], [0.35, 0.65]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 10), this.M.steelDark || this.M.rust);
      w.rotation.z = Math.PI / 2; w.position.set(C.x + dx, Y + 0.13, C.z + dz); b.group.add(w);
    }
    b.box(C.x - 0.4, Y + 0.85, C.z + 0.3, C.x + 0.1, Y + 1.0, C.z + 0.7, 'woodDark', { collide: false });
    this.sign('CIA. METROPOLITANO — FERRAMENTAS', C.x + 0.46, Y + 0.55, C.z, Math.PI / 2, 1.4, 0.18, { bg: '#2a2010', fg: '#d0b070' });
    // trilho estreito de vagonete no chão, rumo ao ossuário
    for (const x of [17.6, 18.4]) b.box(x - 0.03, Y, G.minZ, x + 0.03, Y + 0.04, G.maxZ, 'rust', { collide: false });
  }

  // ---------- OSSUÁRIO x12..24 z16..36: paredes de crânios, nichos de cal, ossos no chão ----------
  _ossuary() {
    const b = this.b, O = OSSUARY;
    b.floor(O.minX - 1, O.minZ, O.maxX + 1, O.maxZ, Y, 'cantaria', 'c7_ossuario');
    b.ceiling(O.minX, O.minZ, O.maxX, O.maxZ, Y + 4.4, 'cantaria');
    b.wallX(O.minZ, O.minX, O.maxX, Y, Y + 4.4, [18], 'cantaria', 1.8, 2.6);
    b.wallX(O.maxZ, O.minX, O.maxX, Y, Y + 4.4, [18], 'cantaria', 1.8, 2.6);
    // oeste: dois nichos + porta da cripta (até z 38 para fechar o canto da cripta)
    b.wallZ(O.minX, O.minZ, CRYPT.maxZ, Y, Y + 4.4, [20.5, 27, 33.5], 'cantaria', 1.4, 2.4);
    b.wallZ(O.maxX, O.minZ, O.maxZ, Y, Y + 4.4, [22, 29.5], 'cantaria', 1.4, 2.4);
    // paredes de crânios (faixas entre os nichos)
    this._skullWall('x', O.minX + 0.1, 16.4, 19.6, Y + 0.6, 6, 1);
    this._skullWall('x', O.minX + 0.1, 21.4, 26.1, Y + 0.6, 6, 1);
    this._skullWall('x', O.maxX - 0.1, 16.4, 21.1, Y + 0.6, 6, -1);
    this._skullWall('x', O.maxX - 0.1, 23.0, 28.6, Y + 0.6, 6, -1);
    this._skullWall('x', O.maxX - 0.1, 30.4, 35.6, Y + 0.6, 6, -1);
    // pilares de ossos empilhados
    for (const [x, z] of [[14.8, 25.2], [21.2, 25.2], [14.8, 31.8], [21.2, 31.8]]) {
      b.box(x - 0.35, Y, z - 0.35, x + 0.35, Y + 4.4, z + 0.35, 'stone');
      for (let y = 0.5; y < 3.6; y += 0.45) { this._skull(x, Y + y, z - 0.37, 0.8); this._skull(x, Y + y, z + 0.37, 0.8); }
    }
    // estante do livro do coveiro (entrada)
    b.box(16.95, Y, 17.15, 17.55, Y + 1.05, 17.75, 'woodDark', { tag: 'prop-low', sight: false });
    // ossos no chão: fêmures e costelas espalhados (visual) sobre as manchas que estalam
    const rnd = mulberry(77);
    for (const P of BONE_PATCHES) {
      const area = (P.x1 - P.x0) * (P.z1 - P.z0), n = Math.round(area * 7);
      const pale = new THREE.Mesh(new THREE.PlaneGeometry(P.x1 - P.x0, P.z1 - P.z0), this.M.lime || this.M.ash);
      pale.rotation.x = -Math.PI / 2; pale.position.set((P.x0 + P.x1) / 2, Y + 0.008, (P.z0 + P.z1) / 2); b.group.add(pale);
      for (let i = 0; i < n; i++) {
        const x = P.x0 + rnd() * (P.x1 - P.x0), z = P.z0 + rnd() * (P.z1 - P.z0);
        if (rnd() < 0.18) { this._skull(x, Y + 0.09, z, 0.8); continue; }
        const L = 0.25 + rnd() * 0.25;
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, L, 5), this.M.bone || this.M.stone);
        m.rotation.z = Math.PI / 2; m.rotation.y = rnd() * Math.PI; m.position.set(x, Y + 0.03, z); b.group.add(m);
      }
    }
    // velas no chão junto às paredes
    for (const [x, z] of [[12.4, 18.2], [23.6, 24.6], [12.4, 30.2], [23.6, 34.8]]) {
      b.box(x - 0.05, Y, z - 0.05, x + 0.05, Y + 0.22, z + 0.05, 'candle', { collide: false });
    }
    this.sign('OSSUÁRIO DA IRMANDADE — SILÊNCIO', 18, Y + 3.0, 16.12, 0, 2.6, 0.26, { bg: '#16140f', fg: '#c8b890' });
    this.sign('AQUI ESPERAM OS DA VIGÍLIA', 18, Y + 3.0, 35.88, Math.PI, 2.4, 0.24, { bg: '#16140f', fg: '#c8b890' });
  }

  /** nicho na parede: alcova de pedra; se tem morador, uma parede de cal na frente (quebra quando ele sai) */
  _niche(n) {
    const b = this.b, west = n.face > 0, wx = west ? n.x + 0.5 : n.x - 0.5; // linha da parede
    const back = west ? n.x - 0.5 : n.x + 0.5;
    const [x0, x1] = west ? [back - 0.1, wx - 0.1] : [wx + 0.1, back + 0.1];
    b.box(Math.min(back - 0.1, back + 0.1), Y, n.z - 0.9, Math.max(back - 0.1, back + 0.1), Y + 2.6, n.z + 0.9, 'cantaria');
    b.box(x0, Y, n.z - 0.9, x1, Y + 2.6, n.z - 0.7, 'cantaria');
    b.box(x0, Y, n.z + 0.7, x1, Y + 2.6, n.z + 0.9, 'cantaria');
    b.box(x0, Y + 2.4, n.z - 0.9, x1, Y + 2.6, n.z + 0.9, 'cantaria', { collide: false });
    // ossos ao pé do nicho
    for (let i = 0; i < 3; i++) this._skull(n.x + (west ? -0.25 : 0.25), Y + 0.1, n.z - 0.45 + i * 0.45, 0.8);
    const plaster = new THREE.Group();
    if (n.enemy) {
      // parede de cal com rachaduras: cobre o vão do nicho (só visual; o morador atravessa ao acordar)
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.35, 1.4), this.M.lime || this.M.wall);
      p.position.set(wx, Y + 1.18, n.z); plaster.add(p);
      const crack = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.2, 0.03), this.M.mortar || this.M.soot);
      crack.position.set(wx, Y + 1.4, n.z + 0.15); crack.rotation.x = 0.4; plaster.add(crack);
      // uma fresta no alto: dá para ver o capuz lá dentro
      const hole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.4), new THREE.MeshBasicMaterial({ color: 0x050403 }));
      hole.position.set(wx, Y + 1.85, n.z - 0.2); plaster.add(hole);
    }
    b.group.add(plaster);
    // cal quebrada no chão (aparece quando o nicho abre; o nicho vazio já nasce aberto)
    const rubble = new THREE.Group();
    const rnd = mulberry(Math.round(n.z * 31 + n.x));
    for (let i = 0; i < 7; i++) {
      const s = 0.12 + rnd() * 0.18;
      const m = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.5, s * 1.2), this.M.lime || this.M.wall);
      m.position.set(wx + (west ? 1 : -1) * (0.2 + rnd() * 0.7), Y + s * 0.25, n.z - 0.6 + rnd() * 1.2); m.rotation.y = rnd() * 3; rubble.add(m);
    }
    rubble.visible = !n.enemy;
    b.group.add(rubble);
    this.niches[n.id] = { ...n, plaster, rubble, open: !n.enemy };
  }
  /** a parede de cal do nicho cai (morador acordou) */
  breakNiche(id) {
    const N = this.niches[id];
    if (!N || N.open) return false;
    N.open = true; N.plaster.visible = false; N.rubble.visible = true;
    return true;
  }
  nicheOf(enemyId) { return Object.values(this.niches).find((n) => n.enemy === enemyId) || null; }

  // ---------- CRIPTA x4..12 z30..38: sarcófagos; jazigo do coveiro-mor (tampa de pedra) ----------
  _crypt() {
    const b = this.b, C = CRYPT, M = this.M;
    b.floor(C.minX - 1, C.minZ, C.maxX, C.maxZ, Y, 'cantaria', 'c7_cripta');
    b.ceiling(C.minX, C.minZ, C.maxX, C.maxZ, Y + 3.2, 'cantaria');
    b.wallX(C.minZ, C.minX, C.maxX, Y, Y + 3.2, [], 'cantaria');
    b.wallX(C.maxZ, C.minX, C.maxX, Y, Y + 3.2, [], 'cantaria');
    b.wallZ(C.minX, C.minZ, C.maxZ, Y, Y + 3.2, [33.5], 'cantaria', 1.4, 2.4);
    // dois sarcófagos comuns
    for (const x of [6.0, 9.0]) {
      b.box(x, Y, 30.5, x + 1.4, Y + 0.8, 32.5, 'stone', { tag: 'prop-low', sight: false });
      b.box(x - 0.05, Y + 0.8, 30.45, x + 1.45, Y + 0.92, 32.55, 'cantaria', { collide: false });
      this._skull(x + 0.7, Y + 0.98, 30.75, 0.7);
    }
    // jazigo do coveiro-mor: corpo (colide), tampa solta (some de cima quando a alavanca a empurra)
    const J = JAZIGO;
    b.box(J.minX, Y, J.minZ, J.maxX, Y + 0.9, J.maxZ, 'stone', { tag: 'prop-low', sight: false });
    const lid = new THREE.Mesh(new THREE.BoxGeometry(J.maxX - J.minX + 0.1, 0.14, J.maxZ - J.minZ + 0.1), M.cantaria || M.stone);
    lid.position.set(J.x, Y + 0.97, J.z); b.group.add(lid);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.12), M.mortar || M.soot); cross.position.set(0, 0.085, 0); lid.add(cross);
    const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.6), M.mortar || M.soot); cross2.position.set(-0.2, 0.085, 0); lid.add(cross2);
    // dentro: o coveiro-mor (ossos com o cinto) e a fita vermelha amarrada no ferro
    const inside = new THREE.Group();
    this._skull(J.minX + 0.35, Y + 0.95, J.z, 1, inside);
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 5), M.bone || M.stone);
      m.rotation.z = Math.PI / 2; m.position.set(J.minX + 0.7 + i * 0.3, Y + 0.92, J.z - 0.15 + (i % 2) * 0.3); inside.add(m);
    }
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.25), M.velvet || M.lampRed); ribbon.position.set(J.maxX - 0.2, Y + 0.95, J.minZ + 0.1); inside.add(ribbon);
    inside.visible = false; b.group.add(inside);
    this.jazigo = { lid, inside, open: false, collider: null, t: -1 };
    this.sign('AQUI JAZ O COVEIRO-MOR — GUARDA AS CHAVES', J.x, Y + 1.7, CRYPT.maxZ - 0.12, Math.PI, 2.2, 0.2, { bg: '#16140f', fg: '#c8b890' });
  }
  /** alavanca: a tampa desliza e tomba para oeste (vira obstáculo no chão); abre o jazigo */
  openJazigo(instant = false) {
    const J = this.jazigo;
    if (!J || J.open) return false;
    J.open = true; J.inside.visible = true;
    J.collider = this.game.col.addBox(JAZIGO.minX - 2.3, Y, JAZIGO.minZ, JAZIGO.minX - 0.05, Y + 0.6, JAZIGO.maxZ, { tag: 'prop-low', blocksSight: false });
    if (instant) this._placeLid(1); else J.t = 0;
    return true;
  }
  _placeLid(k) {
    const J = this.jazigo, l = J.lid, s = Math.min(1, k);
    l.position.set(JAZIGO.x - 2.4 * s, Y + 0.97 - 0.62 * s * s, JAZIGO.z);
    l.rotation.z = 0.45 * s * s;
  }

  // ---------- TÚNEL x16..20 z36..44 ----------
  _tunnel() {
    const b = this.b, T = TUNNEL;
    b.floor(T.minX, T.minZ, T.maxX, T.maxZ, Y, 'cantaria', 'c7_tunel');
    b.ceiling(T.minX, T.minZ, T.maxX, T.maxZ, Y + 3.0, 'cantaria');
    b.wallZ(T.minX, T.minZ, T.maxZ, Y, Y + 3.0, [], 'brick');
    b.wallZ(T.maxX, T.minZ, T.maxZ, Y, Y + 3.0, [], 'brick');
    for (const x of [17.6, 18.4]) b.box(x - 0.03, Y, T.minZ, x + 0.03, Y + 0.04, T.maxZ, 'rust', { collide: false });
    b.box(T.minX + 0.1, Y, 40.5, T.minX + 0.9, Y + 0.5, 42.0, 'stone', { tag: 'prop-low', sight: false });
  }

  // ---------- ESTAÇÃO SÉ VELHA: plataforma x4..44 z44..50 (y 0) e trilhos x4..50 z50..55 (y −1) ----------
  _station() {
    const b = this.b, P = PLATFORM, T = TRACKS, M = this.M;
    b.floor(P.minX, P.minZ, P.maxX, P.maxZ, Y, 'stationTile', 'c7_plataforma');
    b.floor(T.minX, T.minZ, T.maxX, T.maxZ, TRACK_Y, 'concrete', 'c7_trilhos');
    b.ceiling(P.minX, P.minZ, T.maxX, T.maxZ, Y + 4.6, 'cantaria');
    // parede do fundo (túnel e porta de serviço), oeste (desabamento), leste da plataforma, parede além dos trilhos
    b.wallX(P.minZ, P.minX, P.maxX, Y, Y + 4.6, [18, 38], 'stationTile', 4.0, 3.0);
    b.box(36, Y, P.minZ - 0.1, 37.4, Y + 4.6, P.minZ + 0.1, 'stationTile');
    b.box(38.6, Y, P.minZ - 0.1, 40, Y + 4.6, P.minZ + 0.1, 'stationTile');
    b.box(37.4, Y + 2.3, P.minZ - 0.1, 38.6, Y + 4.6, P.minZ + 0.1, 'stationTile');
    b.box(P.minX - 0.2, TRACK_Y, P.minZ, P.minX, Y + 4.6, T.maxZ, 'cantaria');
    b.box(P.maxX, TRACK_Y, P.minZ, P.maxX + 0.2, Y + 4.6, P.maxZ, 'stationTile');
    b.box(P.minX, TRACK_Y, T.maxZ, T.maxX, Y + 4.6, T.maxZ + 0.2, 'cantaria');
    // túnel leste (continuação dos trilhos): teto baixo, grade acorrentada no fundo
    b.box(P.maxX, Y + 2.4, T.minZ, T.maxX, Y + 4.6, T.minZ + 0.2, 'cantaria', { collide: false });
    b.box(T.maxX, TRACK_Y, T.minZ, T.maxX + 0.2, Y + 4.6, T.maxZ, 'cantaria');
    b.box(48.9, TRACK_Y, T.minZ, 49.1, Y + 2.4, T.maxZ, 'rust');
    for (let z = T.minZ + 0.3; z < T.maxZ; z += 0.45) b.box(48.85, TRACK_Y, z - 0.03, 48.88, Y + 2.3, z + 0.03, 'rust', { collide: false });
    b.box(48.8, Y + 0.0, 52.1, 48.86, Y + 0.12, 53.4, 'steel', { collide: false });  // corrente e cadeado
    b.box(48.76, Y - 0.15, 52.6, 48.84, Y + 0.12, 52.9, 'brass', { collide: false });
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 3.4), new THREE.MeshBasicMaterial({ color: 0x020202 }));
    dark.rotation.y = -Math.PI / 2; dark.position.set(T.maxX - 0.02, Y + 0.7, (T.minZ + T.maxZ) / 2); b.group.add(dark);
    // desabamento a oeste (sobre os trilhos)
    b.box(T.minX, TRACK_Y, T.minZ, T.minX + 2.4, Y + 1.2, T.maxZ, 'stone');
    b.box(T.minX + 2.4, TRACK_Y, T.minZ + 1.6, T.minX + 3.6, Y + 0.2, T.maxZ, 'stone');
    // borda da plataforma: face de 1 m (não se sobe de volta sem a escada de manutenção a leste)
    b.box(P.minX, TRACK_Y, P.maxZ - 0.15, 41, Y, P.maxZ, 'concrete');
    b.box(43, TRACK_Y, P.maxZ - 0.15, P.maxX, Y, P.maxZ, 'concrete');
    b.box(P.minX, Y, P.maxZ - 0.55, P.maxX, Y + 0.012, P.maxZ - 0.35, 'hazard', { collide: false });
    this.stairs = b.stairsZ(41, 43, P.maxZ, P.maxZ + 3, Y, TRACK_Y, 5, 'concrete');
    b.box(40.85, Y, 49.4, 41.0, Y + 1.0, 49.6, 'rust', { collide: false });
    b.box(43.0, Y, 49.4, 43.15, Y + 1.0, 49.6, 'rust', { collide: false });
    // trilhos e dormentes
    for (const z of [51.7, 53.3]) b.box(T.minX + 3.6, TRACK_Y, z - 0.04, T.maxX, TRACK_Y + 0.14, z + 0.04, 'steel', { collide: false });
    for (let x = T.minX + 4; x < T.maxX; x += 0.9) b.box(x, TRACK_Y, 51.3, x + 0.25, TRACK_Y + 0.06, 53.7, 'woodDark', { collide: false });
    // pilares, bancos, bilheteria
    for (const x of [11, 25, 31]) b.box(x - 0.3, Y, 46.7, x + 0.3, Y + 4.6, 47.3, 'stationTile');
    for (const x of [14, 22.5, 28]) {
      b.box(x - 0.9, Y, 44.35, x + 0.9, Y + 0.45, 44.85, 'woodDark', { tag: 'prop-low', sight: false });
      b.box(x - 0.9, Y + 0.45, 44.2, x + 0.9, Y + 1.0, 44.3, 'woodDark', { collide: false });
    }
    b.box(P.minX, Y, P.minZ, 7.6, Y + 2.6, 46.0, 'woodDark', { tag: 'prop' });
    b.box(7.6, Y, 44.2, 9.2, Y + 1.0, 45.0, 'woodDark', { tag: 'prop-low', sight: false });
    b.box(P.minX + 0.2, Y + 1.2, 45.98, 7.4, Y + 2.2, 46.02, 'glass', { collide: false });
    // placas
    this.sign('SÉ VELHA', 24, Y + 2.4, T.maxZ - 0.02, Math.PI, 3.4, 0.5, { bg: '#0c2a3a', fg: '#e8e0c8' });
    this.sign('SÉ VELHA', 12, Y + 2.4, T.maxZ - 0.02, Math.PI, 3.4, 0.5, { bg: '#0c2a3a', fg: '#e8e0c8' });
    this.sign('LINHA 1 (VELHA) — SENTIDO CATEDRAL →', 36, Y + 3.4, P.minZ + 0.12, 0, 3.4, 0.28, { bg: '#0c2a3a', fg: '#e8e0c8' });
    this.sign('BILHETES', 6, Y + 2.85, 46.04, 0, 1.2, 0.22, { bg: '#20160c', fg: '#e0c890' });
    this.sign('SERVIÇO — SÓ PESSOAL DA CIA.', 38, Y + 2.6, P.minZ + 0.12, 0, 1.8, 0.2, { bg: '#1a1712', fg: '#cbbf98' });
    this.sign('↓ MANUTENÇÃO', 42, Y + 1.25, P.maxZ - 0.5, 0, 1.0, 0.2, { bg: '#2a2010', fg: '#d0b070' });
  }

  // ---------- CORREDOR DE SERVIÇO: plataforma (38,44) → norte–sul x36.5..39.5 → sul x22..39.5 z1.5..4.5 → poço ----------
  _service() {
    const b = this.b, S = SERVICE_S, N = SERVICE_N;
    b.floor(S.minX, S.minZ, S.maxX, S.maxZ, Y, 'concrete', 'c7_servico');
    b.floor(N.minX, N.minZ, N.maxX, N.maxZ, Y, 'concrete', 'c7_servico_n');
    b.ceiling(S.minX, S.minZ, S.maxX, S.maxZ, Y + 2.6, 'concrete');
    b.ceiling(N.minX, N.minZ, N.maxX, N.maxZ, Y + 2.6, 'concrete');
    b.wallX(S.minZ, S.minX, S.maxX, Y, Y + 2.6, [], 'brick');
    b.wallX(S.maxZ, S.minX, N.minX, Y, Y + 2.6, [], 'brick');
    b.wallZ(N.maxX, S.minZ, N.maxZ, Y, Y + 2.6, [], 'brick');
    b.wallZ(N.minX, N.minZ, N.maxZ, Y, Y + 2.6, [], 'brick');
    // canos ao longo do teto e caixotes da Companhia
    b.box(N.maxX - 0.35, Y + 2.2, N.minZ, N.maxX - 0.2, Y + 2.35, N.maxZ, 'rust', { collide: false });
    b.box(S.minX, Y + 2.2, S.minZ + 0.2, S.maxX, Y + 2.35, S.minZ + 0.35, 'rust', { collide: false });
    b.box(38.6, Y, 19.4, 39.4, Y + 0.8, 20.6, 'woodDark', { tag: 'prop-low', sight: false });
    b.box(36.6, Y, 30.0, 37.3, Y + 1.4, 31.2, 'wood', { tag: 'prop', sight: false });
    this.sign('← POÇO 3', 37.2, Y + 1.9, 4.62, 0, 0.9, 0.18, { bg: '#1a1712', fg: '#cbbf98' });
  }

  _doors() {
    const ctx = { materials: this.M, group: this.b.group, col: this.game.col, audio: this.game.audio, bus: this.game.bus };
    const D = (o) => (this.doors[o.id] = new Door({ mat: this.M.door, ...o }, ctx));
    D({ id: 'c7_service', axis: 'z', x: SHAFT.maxX, y: GROUND, z: 3, width: 1.2, height: 2.2, swing: 1, mat: this.M.rust || this.M.doorMetal, locked: true,
      lockMsg: 'Porta de ferro da Companhia. Não tem fechadura deste lado — só se ouve o ferrolho balançar do outro.', label: 'porta de serviço' });
    D({ id: 'c7_gate', axis: 'x', x: 18, y: GROUND, z: OSSUARY.minZ, width: 1.8, height: 2.6, swing: 1, mat: this.M.rust || this.M.doorMetal, label: 'grade do ossuário' });
    D({ id: 'c7_ossGate', axis: 'x', x: 18, y: GROUND, z: OSSUARY.maxZ, width: 1.8, height: 2.6, swing: 1, mat: this.M.rust || this.M.doorMetal, locked: true,
      lockMsg: 'Grade de ferro com um cadeado de bronze em forma de crânio. A fechadura fica na boca. Alguém levou a chave.', label: 'grade do fundo do ossuário' });
    D({ id: 'c7_corridor', axis: 'x', x: 38, y: GROUND, z: PLATFORM.minZ, width: 1.2, height: 2.3, swing: 1, mat: this.M.doorMetal || this.M.door, label: 'porta de serviço da plataforma' });
  }

  _lights() {
    this.game.scene.add(new THREE.HemisphereLight(0x3a3630, 0x080706, 0.45));
    const warm = 0xffc080, candle = 0xffa050, cold = 0xa8c0c8, sodium = 0xffa850, red = 0xff4030;
    this.lamp(18, Y + 3.2, 3.4, warm, 0.9, 9, { flicker: true });            // poço
    this.lamp(18, Y + 2.8, 11, sodium, 0.7, 8);                              // galeria de pedra
    this.lamp(18, Y + 4.1, 20.5, candle, 0.8, 10);                           // ossuário
    this.lamp(18, Y + 4.1, 28.5, candle, 0.9, 12, { flicker: true });
    this.lamp(18, Y + 3.0, 34.6, red, 0.6, 7, { emergency: true });          // grade do fundo
    this.lamp(8.4, Y + 2.9, 34, candle, 0.7, 8, { flicker: true });          // cripta
    this.lamp(18, Y + 2.8, 40, sodium, 0.6, 8, { flicker: true });           // túnel
    this.lamp(10, Y + 4.3, 47, cold, 0.9, 12);                               // plataforma
    this.lamp(24, Y + 4.3, 47, cold, 0.9, 12, { flicker: true });
    this.lamp(38, Y + 4.3, 47, cold, 0.8, 10);
    this.lamp(47.4, Y + 1.8, 52.6, red, 0.7, 7, { emergency: true });        // grade da Linha Velha
    this.lamp(26, Y + 2.4, 3, sodium, 0.5, 6, { flicker: true });            // corredor de serviço
    this.lamp(38, Y + 2.4, 12, sodium, 0.5, 7);
    this.lamp(38, Y + 2.4, 26, sodium, 0.5, 7, { flicker: true });
    this.lamp(38, Y + 2.4, 39, sodium, 0.5, 7);
  }

  _nav() {
    const n = this.game.nav, d = this.doors;
    const N = (id, x, z, y = Y) => n.addNode(id, x, y, z);
    N('p0', 18, 2.6); N('p1', 18, 5.4); N('pE', 20.8, 3);
    N('gl0', 18, 8); N('gl1', 18, 14.6);
    N('o0', 18, 17.6); N('oW1', 14.5, 20.5); N('oE1', 21.5, 22); N('oC', 18, 26); N('oW2', 14.5, 27); N('oE2', 21.5, 29.5);
    N('oN', 18, 33.6); N('oNW', 13.8, 33.5); N('oNE', 22.2, 33.6);
    N('nW1', 11.5, 20.5); N('nW2', 11.5, 27); N('nE1', 24.5, 22); N('nE2', 24.5, 29.5);
    N('c0', 10.6, 33.5); N('c1', 8, 34.4); N('cW', 5.2, 33.5); N('nC', 3.5, 33.5);
    N('t0', 18, 37.6); N('t1', 18, 42.6);
    N('pl0', 18, 46.4); N('plW', 9.6, 47.6); N('plE', 28, 48.4); N('plE2', 38, 45.6); N('plE3', 42, 48.6);
    N('tr0', 42, 52.6, TRACK_Y); N('trW', 12, 52.5, TRACK_Y); N('trE', 46.4, 52.6, TRACK_Y);
    N('s0', 38, 42.6); N('s1', 38, 24); N('s2', 38, 3); N('s3', 24, 3);
    const L = (a, b, door) => n.link(a, b, door);
    L('p0', 'p1'); L('p0', 'pE'); L('p1', 'pE'); L('p1', 'gl0'); L('gl0', 'gl1');
    L('gl1', 'o0', d.c7_gate);
    L('o0', 'oW1'); L('o0', 'oE1'); L('o0', 'oC'); L('oW1', 'nW1'); L('oE1', 'nE1'); L('oW1', 'oW2'); L('oE1', 'oE2');
    L('oC', 'oW2'); L('oC', 'oE2'); L('oW2', 'nW2'); L('oE2', 'nE2'); L('oW2', 'oNW'); L('oE2', 'oNE'); L('oC', 'oN'); L('oN', 'oNW'); L('oN', 'oNE');
    L('oNW', 'c0'); L('c0', 'c1'); L('c1', 'cW'); L('cW', 'nC');
    L('oN', 't0', d.c7_ossGate); L('t0', 't1'); L('t1', 'pl0');
    L('pl0', 'plW'); L('pl0', 'plE'); L('plE', 'plE2'); L('plE', 'plE3'); L('plE2', 'plE3'); L('plE3', 'tr0'); L('tr0', 'trW'); L('tr0', 'trE');
    L('plE2', 's0', d.c7_corridor); L('s0', 's1'); L('s1', 's2'); L('s2', 's3');
    L('s3', 'pE', d.c7_service);
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
      const f = Math.sin(t * 9 + L.base * 7) * Math.sin(t * 5.3) > 0.95 ? 0.3 : 1;
      L.light.intensity = L.base * f * (0.9 + Math.random() * 0.1);
    }
    for (const id in this.doors) this.doors[id].update(dt);
    const J = this.jazigo;
    if (J && J.t >= 0) { J.t += dt; this._placeLid(J.t / 0.9); if (J.t >= 0.9) J.t = -1; }
    this._updateZone(dt);
  }
  zoneAt(p) { return pedraZoneAt(p); }
  _updateZone(dt) {
    const fog = this.game.scene.fog, p = this.game.player?.pos;
    if (!fog || !p) return;
    const z = this.zoneAt(p); this.zone = z ? z.id : null;
    const tgt = z || PEDRA_FOG, k = Math.min(1, dt * 1.5);
    this._fogC = this._fogC || new THREE.Color();
    this._fogC.set(tgt.fog);
    fog.color.lerp(this._fogC, k);
    fog.density += (tgt.density - fog.density) * k;
    if (this.game.scene.background?.isColor) this.game.scene.background.copy(fog.color).multiplyScalar(0.8);
  }
}

// PRNG determinístico (cenário igual em todo carregamento)
function mulberry(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
