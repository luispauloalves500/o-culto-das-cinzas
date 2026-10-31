// Capítulo 7 — Sob a Pedra · catacumbas sob o Museu e a estação velha do metrô. A escada de serviço do
// alçapão da reserva técnica termina num poço de pedra; dali, a galeria de pedra da Companhia do Metrô (carrinho de
// ferramentas), a grade rangente do ossuário, o ossuário (paredes de crânios, pilares, ossos espalhados no chão que
// estalam, nichos emparedados com cal — os "irmãos da vigília", cegos, que acordam com barulho), a cripta do coveiro-mor
// (jazigo com tampa de pedra: alavanca → chave + recado de Inês), a grade do fundo (cadeado de crânio), o túnel de
// serviço e a plataforma da Estação Sé Velha (Linha Velha, fechada desde 1912), com os trilhos 1 m abaixo e o túnel
// leste. Além da grade acorrentada (pé de cabra): a Linha Velha (cascalho que range, dois nichos), a cabine de
// sinalização (agulhas + sinal → grade levadiça), a Estação Sob a Pedra (pilares de ferro, vagão funerário, sinetas,
// parede de cal do Vigia Caiado — chefe final) e a escada de serviço para a Usina (fim do capítulo). Um corredor de serviço volta da plataforma ao poço (atalho com
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

// ---------- resto do capítulo: Linha Velha além da grade, cabine de sinalização, Estação Sob a Pedra ----------
// grade acorrentada (x 49) no fim dos trilhos da Sé Velha: a corrente nova só sai com o pé de cabra
export const LINE_GATE = { x: 49, z: 52.6, use: { x: 48.2, z: 52.6 } };
// túnel da Linha Velha (piso dos trilhos, teto baixo) até a grade levadiça da Estação Sob a Pedra (x 78)
export const LINE = { minX: 50, maxX: 78, minZ: 50, maxZ: 55.2 };
export const LINE_H = 3.6;
// cabine de sinalização ao norte dos trilhos: quadro de alavancas (agulhas I, II, III + sinal), livro de registros
export const CABIN = { minX: 60, maxX: 66, minZ: 45, maxZ: 50, door: { x: 63, z: 50 } };
export const LEVERS = [
  { id: 'I', x: 61.3, z: 45.45 }, { id: 'II', x: 62.2, z: 45.45 }, { id: 'III', x: 63.1, z: 45.45 },
];
export const SIGNAL_LEVER = { x: 64.6, z: 45.45 };
// combinação de agulhas da quarta estação (apagada no quadro): I e II pela guia de remoção, III pelo quadro de horários
export const SWITCH_CODE = { I: 'R', II: 'N', III: 'R' };
// sineta de alarme do túnel: o sinal errado toca aqui (perto do nicho do leste)
export const LINE_BELL = { x: 70.5, z: 51.2 };
// grade levadiça na boca da estação (comandada pelo sinal da cabine)
export const PORTCULLIS = { x: 78, minZ: 50, maxZ: 55.2, h: 3.4 };
// Estação Sob a Pedra: salão alto, pilares de ferro fundido, vagão funerário nos trilhos, parede de cal do Vigia a leste
export const SOB = { minX: 78, maxX: 104, minZ: 42, maxZ: 64, h: 7 };
export const SOB_PILLARS = [84, 91, 98].flatMap((x) => [46.5, 59.5].map((z) => ({ x, z, r: 0.42 })));
export const WAGON = { minX: 86, maxX: 93, minZ: 51.5, maxZ: 53.7 };
// nicho do Vigia na parede leste (lacrado com cal)
export const VIGIA_NICHE = { x: 104.9, z: 52.8, out: { x: 101.4, z: 52.8 }, minZ: 51.4, maxZ: 54.2 };
// sinetas da estação: alavanca na parede oeste, sino no canto leste (barulho real lá longe = isca)
export const SOB_BELLS = [
  { id: 'n', lever: { x: 78.75, z: 43.4 }, bell: { x: 102.8, z: 43.4 } },
  { id: 's', lever: { x: 78.75, z: 62.6 }, bell: { x: 102.8, z: 62.6 } },
];
// atril com a ata da Primeira Cinza (diante da parede de cal)
export const ATRIL = { x: 101.6, z: 47.6 };
// escada de serviço (saída norte) para a Usina — grade com cadeado, chave no corpo do Vigia
export const STAIR = { minX: 97.4, maxX: 100.6, minZ: 64, maxZ: 69.5, door: { x: 99, z: 64 }, endZ: 65.6 };
// cascalho solto no leito dos trilhos: range sob os pés (como os ossos do ossuário)
export const GRAVEL_PATCHES = [
  { id: 'g0', x0: 56.4, x1: 61.6, z0: 52.0, z1: 55.1 },
  { id: 'g1', x0: 69.4, x1: 74.6, z0: 50.1, z1: 53.2 },
];
export function gravelAt(x, z) { for (const g of GRAVEL_PATCHES) if (x >= g.x0 && x <= g.x1 && z >= g.z0 && z <= g.z1) return g; return null; }
export const LINE_NICHES = [
  { id: 'nL1', x: 59, z: 55.7, y: TRACK_Y, face: Math.PI, enemy: 'c7_emp6' },   // parede sul do túnel
  { id: 'nL2', x: 72, z: 49.5, y: TRACK_Y, face: 0, enemy: 'c7_emp7' },         // parede norte do túnel
];
export const SOB_NICHES = [
  { id: 'nS1', x: 77.5, z: 45.6, y: TRACK_Y, face: Math.PI / 2, enemy: 'c7_emp8' },
  { id: 'nS2', x: 77.5, z: 59.6, y: TRACK_Y, face: Math.PI / 2, enemy: 'c7_emp9' },
];

export const PEDRA_CHECKPOINTS = {
  c7_ladder: { x: 18, y: GROUND, z: 2.2, yaw: 0 },
  c7_ossuary: { x: 18, y: GROUND, z: 17.4, yaw: 0 },
  c7_platform: { x: 9.6, y: GROUND, z: 46.4, yaw: Math.PI / 2 },
  c7_slice: { x: 45.4, y: TRACK_Y, z: 52.6, yaw: Math.PI / 2 },
  c7_line: { x: 63, y: TRACK_Y, z: 47.6, yaw: Math.PI },
  c7_station: { x: 76.2, y: TRACK_Y, z: 52.6, yaw: Math.PI / 2 },
  c7_boss: { x: 92, y: TRACK_Y, z: 56.4, yaw: Math.PI / 2 },
  c7_end: { x: 99, y: TRACK_Y, z: 62.6, yaw: 0 },
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
  { id: 'c7_cabine', minX: 60, maxX: 66, minZ: 44.8, maxZ: 49.9, minY: -2, maxY: 3, fog: 0x0a0907, density: 0.05, acoustic: 1.0 },
  { id: 'c7_linha', minX: 50, maxX: 78, minZ: 49, maxZ: 56, minY: -2, maxY: 4, fog: 0x080908, density: 0.06, acoustic: 1.3 },
  { id: 'c7_sobapedra', minX: 78, maxX: 106, minZ: 42, maxZ: 64, minY: -2, maxY: 7, fog: 0x0c0d0c, density: 0.034, acoustic: 1.4 },
  { id: 'c7_saida', minX: 97, maxX: 101, minZ: 64, maxZ: 70, minY: -2, maxY: 5, fog: 0x0a0908, density: 0.05, acoustic: 1.2 },
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
    this.lineGate = null;
    this.portcullis = null;
    this.levers = {};
    this.vigiaWall = null;
    this.bells = {};
  }

  build() {
    this._shaft();
    this._stoneGallery();
    this._ossuary();
    this._crypt();
    this._tunnel();
    this._station();
    this._service();
    this._line();
    this._cabin();
    this._sobPedra();
    this._stair();
    for (const n of [...NICHES, ...LINE_NICHES, ...SOB_NICHES]) this._niche(n);
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

  /** nicho na parede: alcova de pedra; se tem morador, uma parede de cal na frente (quebra quando ele sai).
   *  face = direção para onde o nicho abre (π/2 → +x, −π/2 → −x, 0 → +z, π → −z); y = piso (padrão: GROUND) */
  _niche(n) {
    const b = this.b, y0 = n.y ?? Y;
    const dx = Math.round(Math.sin(n.face)), dz = Math.round(Math.cos(n.face)), alongX = dz !== 0;
    // coordenadas locais: u = profundidade (+ para fora do nicho, a linha da parede fica em u = 0,5), v = ao longo da parede
    const W = (u, v) => (alongX ? { x: n.x + v, z: n.z + dz * u } : { x: n.x + dx * u, z: n.z + v });
    const bx = (u0, u1, v0, v1, ya, yb, mat, opts) => {
      const A = W(u0, v0), B = W(u1, v1);
      return b.box(Math.min(A.x, B.x), ya, Math.min(A.z, B.z), Math.max(A.x, B.x), yb, Math.max(A.z, B.z), mat, opts);
    };
    bx(-0.6, -0.4, -0.9, 0.9, y0, y0 + 2.6, 'cantaria');
    bx(-0.6, 0.4, -0.9, -0.7, y0, y0 + 2.6, 'cantaria');
    bx(-0.6, 0.4, 0.7, 0.9, y0, y0 + 2.6, 'cantaria');
    bx(-0.6, 0.4, -0.9, 0.9, y0 + 2.4, y0 + 2.6, 'cantaria', { collide: false });
    // ossos ao pé do nicho
    for (let i = 0; i < 3; i++) { const q = W(-0.25, -0.45 + i * 0.45); this._skull(q.x, y0 + 0.1, q.z, 0.8); }
    const plaster = new THREE.Group();
    const rotY = alongX ? Math.PI / 2 : 0;
    if (n.enemy) {
      // parede de cal com rachaduras: cobre o vão do nicho (só visual; o morador atravessa ao acordar)
      const q = W(0.5, 0);
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.35, 1.4), this.M.lime || this.M.wall);
      p.position.set(q.x, y0 + 1.18, q.z); p.rotation.y = rotY; plaster.add(p);
      const qc = W(0.5, 0.15);
      const crack = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.2, 0.03), this.M.mortar || this.M.soot);
      crack.position.set(qc.x, y0 + 1.4, qc.z); crack.rotation.set(0.4, rotY, 0, 'YXZ'); plaster.add(crack);
      // uma fresta no alto: dá para ver o capuz lá dentro
      const qh = W(0.5, -0.2);
      const hole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.4), new THREE.MeshBasicMaterial({ color: 0x050403 }));
      hole.position.set(qh.x, y0 + 1.85, qh.z); hole.rotation.y = rotY; plaster.add(hole);
    }
    b.group.add(plaster);
    // cal quebrada no chão (aparece quando o nicho abre; o nicho vazio já nasce aberto)
    const rubble = new THREE.Group();
    const rnd = mulberry(Math.round(n.z * 31 + n.x));
    for (let i = 0; i < 7; i++) {
      const s = 0.12 + rnd() * 0.18;
      const m = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.5, s * 1.2), this.M.lime || this.M.wall);
      const q = W(0.5 + 0.2 + rnd() * 0.7, -0.6 + rnd() * 1.2);
      m.position.set(q.x, y0 + s * 0.25, q.z); m.rotation.y = rnd() * 3; rubble.add(m);
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
    // túnel leste (continuação dos trilhos): grade acorrentada da Linha Velha (abre com o pé de cabra) e testeira de pedra
    b.box(P.maxX, Y + 2.4, T.minZ, T.maxX, Y + 4.6, T.minZ + 0.2, 'cantaria', { collide: false });
    b.box(48.9, Y + 2.4, T.minZ, 50.1, Y + 4.6, T.maxZ, 'cantaria');
    this._lineGate();
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

  // ---------- GRADE ACORRENTADA DA LINHA VELHA (x 49): folha de ferro na dobradiça norte, corrente + cadeado ----------
  _lineGate() {
    const b = this.b, T = TRACKS, M = this.M, G = LINE_GATE;
    const pivot = new THREE.Group(); pivot.position.set(G.x, TRACK_Y, T.minZ); b.group.add(pivot);
    const H = Y + 2.4 - TRACK_Y, Wd = T.maxZ - T.minZ;
    const bar = (x0, y0, z0, x1, y1, z1, mat, parent = pivot) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.castShadow = true; parent.add(m); return m;
    };
    for (let z = 0.3; z < Wd; z += 0.45) bar(-0.03, 0, z - 0.025, 0.03, H - 0.05, z + 0.025, M.rust);
    for (const y of [0.25, 1.6, H - 0.15]) bar(-0.05, y, 0.05, 0.05, y + 0.1, Wd - 0.05, M.rust);
    // corrente nova e cadeado (lado da plataforma): somem quando o pé de cabra arrebenta um elo
    const chain = new THREE.Group(); b.group.add(chain);
    bar(48.8, Y + 0.0, 52.1, 48.86, Y + 0.12, 53.4, M.steel, chain);
    bar(48.76, Y - 0.15, 52.6, 48.84, Y + 0.12, 52.9, M.brass, chain);
    for (let i = 0; i < 6; i++) bar(48.84, Y - 0.6 + i * 0.12, 52.15 + (i % 2) * 0.05, 48.9, Y - 0.52 + i * 0.12, 52.25 + (i % 2) * 0.05, M.steel, chain);
    const broken = new THREE.Group(); broken.visible = false; b.group.add(broken);
    bar(48.4, TRACK_Y, 52.2, 48.7, TRACK_Y + 0.05, 53.3, M.steel, broken);
    bar(48.3, TRACK_Y, 52.9, 48.45, TRACK_Y + 0.12, 53.1, M.brass, broken);
    const collider = this.game.col.addBox(G.x - 0.1, TRACK_Y, T.minZ, G.x + 0.1, Y + 2.4, T.maxZ, { tag: 'wall' });
    this.lineGate = { pivot, chain, broken, collider, open: false, t: -1 };
  }
  /** pé de cabra na corrente: a grade cai aberta para leste (encosta na parede norte do túnel) */
  openLineGate(instant = false) {
    const L = this.lineGate;
    if (!L || L.open) return false;
    L.open = true; L.chain.visible = false; L.broken.visible = true; L.collider.enabled = false;
    if (instant) this._placeGate(1); else L.t = 0;
    return true;
  }
  _placeGate(k) { const s = Math.min(1, k); this.lineGate.pivot.rotation.y = (Math.PI / 2 - 0.12) * (1 - (1 - s) * (1 - s)); }

  // ---------- LINHA VELHA x50..78 z50..55.2 (piso dos trilhos): túnel baixo, cascalho, dois nichos, refúgio ----------
  _line() {
    const b = this.b, L = LINE, M = this.M, y0 = TRACK_Y, yT = TRACK_Y + LINE_H;
    b.floor(L.minX, L.minZ, L.maxX, L.maxZ, y0, 'concrete', 'c7_linha');
    b.ceiling(L.minX, L.minZ, L.maxX, L.maxZ, yT, 'brick');
    // parede norte: porta da cabine (x 63) e o nicho nL2 (x 72)
    b.box(L.minX, y0, L.minZ - 0.2, CABIN.door.x - 0.6, yT, L.minZ, 'brick');
    b.box(CABIN.door.x - 0.6, y0 + 2.3, L.minZ - 0.2, CABIN.door.x + 0.6, yT, L.minZ, 'brick');
    b.box(CABIN.door.x + 0.6, y0, L.minZ - 0.2, 71.3, yT, L.minZ, 'brick');
    b.box(71.3, y0 + 2.4, L.minZ - 0.2, 72.7, yT, L.minZ, 'brick');
    b.box(72.7, y0, L.minZ - 0.2, L.maxX, yT, L.minZ, 'brick');
    // parede sul: nicho nL1 (x 59) e um refúgio de manutenção (x 66..67.6)
    b.box(L.minX, y0, L.maxZ, 58.3, yT, L.maxZ + 0.2, 'brick');
    b.box(58.3, y0 + 2.4, L.maxZ, 59.7, yT, L.maxZ + 0.2, 'brick');
    b.box(59.7, y0, L.maxZ, 66, yT, L.maxZ + 0.2, 'brick');
    b.box(66, y0 + 2.2, L.maxZ, 67.6, yT, L.maxZ + 0.2, 'brick');
    b.box(67.6, y0, L.maxZ, L.maxX, yT, L.maxZ + 0.2, 'brick');
    b.floor(66, L.maxZ, 67.6, L.maxZ + 1.2, y0, 'concrete', 'c7_refugio');
    b.box(65.8, y0, L.maxZ + 0.2, 66, y0 + 2.2, L.maxZ + 1.4, 'brick');
    b.box(67.6, y0, L.maxZ + 0.2, 67.8, y0 + 2.2, L.maxZ + 1.4, 'brick');
    b.box(65.8, y0, L.maxZ + 1.2, 67.8, y0 + 2.2, L.maxZ + 1.4, 'brick');
    b.box(65.8, y0 + 2.2, L.maxZ, 67.8, y0 + 2.4, L.maxZ + 1.4, 'brick', { collide: false });
    this.sign('REFÚGIO', 66.8, y0 + 2.0, L.maxZ - 0.02, Math.PI, 0.8, 0.16, { bg: '#2a2010', fg: '#d0b070' });
    // trilhos, dormentes e cascalho solto (visual) sobre as manchas que rangem
    for (const z of [51.7, 53.3]) b.box(L.minX, y0, z - 0.04, L.maxX, y0 + 0.14, z + 0.04, 'steel', { collide: false });
    for (let x = L.minX + 0.4; x < L.maxX; x += 0.9) b.box(x, y0, 51.3, x + 0.25, y0 + 0.06, 53.7, 'woodDark', { collide: false });
    const rnd = mulberry(4711);
    for (const P of GRAVEL_PATCHES) {
      const pale = new THREE.Mesh(new THREE.PlaneGeometry(P.x1 - P.x0, P.z1 - P.z0), M.stone);
      pale.rotation.x = -Math.PI / 2; pale.position.set((P.x0 + P.x1) / 2, y0 + 0.01, (P.z0 + P.z1) / 2); b.group.add(pale);
      const n = Math.round((P.x1 - P.x0) * (P.z1 - P.z0) * 9);
      for (let i = 0; i < n; i++) {
        const s = 0.05 + rnd() * 0.08;
        const m = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.6, s), rnd() < 0.5 ? M.stone : M.concrete);
        m.position.set(P.x0 + rnd() * (P.x1 - P.x0), y0 + 0.03, P.z0 + rnd() * (P.z1 - P.z0)); m.rotation.y = rnd() * 3; b.group.add(m);
      }
    }
    // cabos ao longo da parede e marcos quilométricos
    b.box(L.minX, yT - 0.5, L.maxZ - 0.15, L.maxX, yT - 0.4, L.maxZ - 0.05, 'rust', { collide: false });
    this.sign('KM 2,4', 55, y0 + 1.6, L.minZ + 0.02, 0, 0.6, 0.18, { bg: '#e0d8c0', fg: '#1a1712' });
    this.sign('KM 2,6', 75, y0 + 1.6, L.minZ + 0.02, 0, 0.6, 0.18, { bg: '#e0d8c0', fg: '#1a1712' });
    this.sign('CABINE DE SINALIZAÇÃO 4', CABIN.door.x, y0 + 2.6, L.minZ + 0.02, 0, 2.0, 0.2, { bg: '#1a1712', fg: '#cbbf98' });
    // sineta de alarme do túnel (o sinal errado da cabine toca aqui)
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.2, 0.26, 10, 1, true), M.brass);
    bell.position.set(LINE_BELL.x, yT - 0.45, L.minZ + 0.25); b.group.add(bell);
    b.box(LINE_BELL.x - 0.03, yT - 0.32, L.minZ + 0.02, LINE_BELL.x + 0.03, yT, L.minZ + 0.3, 'rust', { collide: false });
    this.bells.line = { mesh: bell, t: -1 };
    this._portcullis();
  }

  // ---------- GRADE LEVADIÇA (x 78): sobe com o sinal certo da cabine; desce atrás de Elias na luta ----------
  _portcullis() {
    const P = PORTCULLIS, M = this.M, y0 = TRACK_Y;
    const g = new THREE.Group(); g.position.set(P.x, y0, 0); this.b.group.add(g);
    const bar = (x0, y, z0, x1, y1, z1) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y, z1 - z0), M.rust); m.position.set((x0 + x1) / 2, (y + y1) / 2, (z0 + z1) / 2); m.castShadow = true; g.add(m); };
    for (let z = P.minZ + 0.25; z < P.maxZ; z += 0.4) { bar(-0.04, 0, z - 0.035, 0.04, P.h, z + 0.035); bar(-0.05, -0.12, z - 0.02, 0.05, 0.02, z + 0.02); }
    for (const y of [0.6, 1.6, 2.6, P.h - 0.1]) bar(-0.06, y, P.minZ, 0.06, y + 0.1, P.maxZ);
    const collider = this.game.col.addBox(P.x - 0.12, y0, P.minZ, P.x + 0.12, y0 + LINE_H, P.maxZ, { tag: 'wall', blocksSight: false });
    this.portcullis = { group: g, collider, open: false, k: 0, target: 0 };
  }
  setPortcullis(open, instant = false) {
    const P = this.portcullis;
    if (!P) return false;
    const was = P.open;
    P.open = open; P.target = open ? 1 : 0;
    if (instant) P.k = P.target;
    // fechada: colide já (cai de uma vez); aberta: só quando passa da altura de Elias
    if (!open) P.collider.enabled = true;
    else if (instant) P.collider.enabled = false;
    P.group.position.y = TRACK_Y + P.k * (PORTCULLIS.h - 0.3);
    return was !== open;
  }

  // ---------- CABINE DE SINALIZAÇÃO x60..66 z45..50 (piso dos trilhos) ----------
  _cabin() {
    const b = this.b, C = CABIN, M = this.M, y0 = TRACK_Y, yT = TRACK_Y + 2.8;
    b.floor(C.minX, C.minZ, C.maxX, C.maxZ, y0, 'woodDark', 'c7_cabine');
    b.ceiling(C.minX, C.minZ, C.maxX, C.maxZ, yT, 'woodDark');
    b.box(C.minX - 0.2, y0, C.minZ - 0.2, C.maxX + 0.2, yT, C.minZ, 'brick');
    b.box(C.minX - 0.2, y0, C.minZ, C.minX, yT, C.maxZ - 0.2, 'brick');
    b.box(C.maxX, y0, C.minZ, C.maxX + 0.2, yT, C.maxZ - 0.2, 'brick');
    // quadro de alavancas (agulhas I, II, III + sinal vermelho) encostado na parede norte
    b.box(60.8, y0, C.minZ, 65.2, y0 + 0.5, C.minZ + 0.6, 'steelDark', { tag: 'prop-low', sight: false });
    for (const Lv of LEVERS) this._lever(Lv.id, Lv.x, Lv.z + 0.35, M.steel, Lv.id);
    this._lever('S', SIGNAL_LEVER.x, SIGNAL_LEVER.z + 0.35, M.lampRed || M.rust, 'SINAL');
    // painel do diagrama da linha (luzes das agulhas) acima das alavancas
    b.box(60.8, y0 + 1.6, C.minZ, 65.2, y0 + 2.5, C.minZ + 0.05, 'blueprint', { collide: false });
    this.signalLamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), M.lampRed || M.lampOff); this.signalLamp.position.set(64.6, y0 + 2.2, C.minZ + 0.08); b.group.add(this.signalLamp);
    // mesa do sinaleiro (guia de remoção + livro de registros) e placa esmaltada das agulhas
    b.box(64.4, y0, 47.6, 65.8, y0 + 0.85, 49.2, 'woodDark', { tag: 'prop-low', sight: false });
    b.box(64.6, y0 + 0.86, 48.2, 65.1, y0 + 0.88, 48.6, 'paper', { collide: false });
    b.box(60.2, y0, 47.8, 61.0, y0 + 1.6, 49.4, 'woodDark', { tag: 'prop', sight: false });   // armário (longe do quadro de alavancas)
    this.sign('AGULHAS: N = NORMAL (ALAVANCA EMPURRADA) · R = REVERSA (PUXADA)', 63, y0 + 2.62, C.minZ + 0.06, 0, 4.2, 0.18, { bg: '#e8e0c8', fg: '#20180c' });
    this.sign('I', 61.3, y0 + 1.45, C.minZ + 0.07, 0, 0.3, 0.2, { bg: '#e8e0c8', fg: '#20180c' });
    this.sign('II', 62.2, y0 + 1.45, C.minZ + 0.07, 0, 0.3, 0.2, { bg: '#e8e0c8', fg: '#20180c' });
    this.sign('III', 63.1, y0 + 1.45, C.minZ + 0.07, 0, 0.3, 0.2, { bg: '#e8e0c8', fg: '#20180c' });
    this.sign('SINAL', 64.6, y0 + 1.45, C.minZ + 0.07, 0, 0.5, 0.2, { bg: '#5a1010', fg: '#f0e0d0' });
  }
  /** alavanca de quadro: haste que inclina (N empurrada / R puxada) */
  _lever(id, x, z, mat, label) {
    const pivot = new THREE.Group(); pivot.position.set(x, TRACK_Y + 0.5, z); this.b.group.add(pivot);
    const rod = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.06), mat); rod.position.y = 0.47; pivot.add(rod);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.08), this.M.steelDark || this.M.metal); grip.position.y = 0.95; pivot.add(grip);
    const L = { id, label, pivot, state: 'N', t: 0, target: -0.35 };
    pivot.rotation.x = L.target;
    this.levers[id] = L;
    return L;
  }
  setLever(id, state, instant = false) {
    const L = this.levers[id]; if (!L) return;
    L.state = state;
    L.target = id === 'S' ? (state === 'R' ? 0.45 : -0.35) : state === 'R' ? 0.45 : -0.35;
    if (instant) L.pivot.rotation.x = L.target;
  }

  // ---------- ESTAÇÃO SOB A PEDRA x78..104 z42..64 (piso dos trilhos): a arena do Vigia Caiado ----------
  _sobPedra() {
    const b = this.b, S = SOB, M = this.M, y0 = TRACK_Y, yT = TRACK_Y + S.h;
    b.floor(S.minX, S.minZ, S.maxX, S.maxZ, y0, 'stationTile', 'c7_sobapedra');
    b.ceiling(S.minX, S.minZ, S.maxX, S.maxZ, yT, 'cantaria');
    // paredes: sul, norte (porta da escada x 99), oeste (boca do túnel + dois nichos), leste (nicho do Vigia)
    b.box(S.minX - 0.2, y0, S.minZ - 0.2, S.maxX + 0.2, yT, S.minZ, 'cantaria');
    b.box(S.minX - 0.2, y0, S.maxZ, STAIR.door.x - 0.8, yT, S.maxZ + 0.2, 'cantaria');
    b.box(STAIR.door.x + 0.8, y0, S.maxZ, S.maxX + 0.2, yT, S.maxZ + 0.2, 'cantaria');
    b.box(STAIR.door.x - 0.8, y0 + 2.4, S.maxZ, STAIR.door.x + 0.8, yT, S.maxZ + 0.2, 'cantaria');
    const wW = (z0, z1, ya = y0) => b.box(S.minX - 0.1, ya, z0, S.minX + 0.1, yT, z1, 'cantaria');
    wW(S.minZ, 44.9); wW(46.3, LINE.minZ); wW(LINE.maxZ, 58.9); wW(60.3, S.maxZ);
    wW(44.9, 46.3, y0 + 2.4); wW(58.9, 60.3, y0 + 2.4); wW(LINE.minZ, LINE.maxZ, y0 + LINE_H);
    const V = VIGIA_NICHE;
    b.box(S.maxX - 0.1, y0, S.minZ, S.maxX + 0.1, yT, V.minZ, 'cantaria');
    b.box(S.maxX - 0.1, y0, V.maxZ, S.maxX + 0.1, yT, S.maxZ, 'cantaria');
    b.box(S.maxX - 0.1, y0 + 3.4, V.minZ, S.maxX + 0.1, yT, V.maxZ, 'cantaria');
    // alcova do Vigia (atrás da parede de cal)
    b.floor(S.maxX, V.minZ, S.maxX + 1.8, V.maxZ, y0, 'cantaria', 'c7_nicho_vigia');
    b.box(S.maxX + 1.6, y0, V.minZ - 0.2, S.maxX + 1.8, y0 + 3.4, V.maxZ + 0.2, 'cantaria');
    b.box(S.maxX, y0, V.minZ - 0.2, S.maxX + 1.8, y0 + 3.4, V.minZ, 'cantaria');
    b.box(S.maxX, y0, V.maxZ, S.maxX + 1.8, y0 + 3.4, V.maxZ + 0.2, 'cantaria');
    b.box(S.maxX, y0 + 3.2, V.minZ, S.maxX + 1.8, y0 + 3.4, V.maxZ, 'cantaria', { collide: false });
    // parede de cal: lacre fresco com uma silhueta em relevo; colide até ele rompê-la
    const wall = new THREE.Group(); b.group.add(wall);
    const lime = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.35, V.maxZ - V.minZ), M.lime || M.wall); lime.position.set(S.maxX - 0.02, y0 + 1.68, (V.minZ + V.maxZ) / 2); wall.add(lime);
    const fig = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.5, 0.8), M.mortar || M.stone); fig.position.set(S.maxX - 0.1, y0 + 1.4, V.z); wall.add(fig);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), M.mortar || M.stone); head.position.set(S.maxX - 0.1, y0 + 2.85, V.z); head.scale.set(0.3, 1, 0.9); wall.add(head);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.9), M.mortar || M.stone); brim.position.set(S.maxX - 0.12, y0 + 3.0, V.z); wall.add(brim);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.14), new THREE.MeshBasicMaterial({ color: 0x6c8ca0 })); glow.position.set(S.maxX - 0.09, y0 + 2.2, V.z + 0.28); wall.add(glow);
    const wallCol = this.game.col.addBox(S.maxX - 0.1, y0, V.minZ, S.maxX + 0.05, y0 + 3.4, V.maxZ, { tag: 'wall' });
    const rubble = new THREE.Group(); rubble.visible = false; b.group.add(rubble);
    const rnd = mulberry(1912);
    for (let i = 0; i < 16; i++) {
      const s = 0.15 + rnd() * 0.3;
      const m = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.5, s * 1.3), M.lime || M.wall);
      m.position.set(S.maxX - 0.4 - rnd() * 2.2, y0 + s * 0.25, V.minZ + rnd() * (V.maxZ - V.minZ)); m.rotation.y = rnd() * 3; rubble.add(m);
    }
    this.vigiaWall = { wall, collider: wallCol, rubble, broken: false };
    // velas e oferendas ao pé da parede de cal
    for (const [x, z] of [[103.4, 50.6], [103.5, 51.2], [103.4, 54.5], [103.6, 55.2], [103.0, 52.8]]) b.box(x - 0.05, y0, z - 0.05, x + 0.05, y0 + 0.24, z + 0.05, 'candle', { collide: false });
    // pilares de ferro fundido (investida contra eles = atordoado) com capitéis
    for (const P of SOB_PILLARS) {
      b.box(P.x - P.r, y0, P.z - P.r, P.x + P.r, yT, P.z + P.r, 'steelDark', { tag: 'obstacle' });
      b.box(P.x - 0.6, y0, P.z - 0.6, P.x + 0.6, y0 + 0.35, P.z + 0.6, 'steel', { collide: false });
      b.box(P.x - 0.65, yT - 0.5, P.z - 0.65, P.x + 0.65, yT - 0.2, P.z + 0.65, 'steel', { collide: false });
    }
    // trilhos atravessando a estação e o vagão funerário (obstáculo)
    for (const z of [51.7, 53.3]) b.box(S.minX, y0, z - 0.04, 102, y0 + 0.14, z + 0.04, 'steel', { collide: false });
    for (let x = S.minX + 0.4; x < 102; x += 0.9) b.box(x, y0, 51.3, x + 0.25, y0 + 0.06, 53.7, 'woodDark', { collide: false });
    b.box(101.8, y0, 51.1, 102.4, y0 + 1.0, 53.9, 'rust');   // para-choque do fim da linha
    const Wg = WAGON;
    b.box(Wg.minX, y0 + 0.5, Wg.minZ, Wg.maxX, y0 + 2.9, Wg.maxZ, 'woodDark', { tag: 'obstacle' });
    b.box(Wg.minX - 0.1, y0 + 2.9, Wg.minZ - 0.1, Wg.maxX + 0.1, y0 + 3.05, Wg.maxZ + 0.1, 'coal', { collide: false });
    for (let x = Wg.minX + 0.6; x < Wg.maxX - 0.4; x += 1.4) {
      b.box(x, y0 + 1.6, Wg.minZ - 0.02, x + 0.8, y0 + 2.4, Wg.minZ, 'glass', { collide: false });
      b.box(x, y0 + 1.6, Wg.maxZ, x + 0.8, y0 + 2.4, Wg.maxZ + 0.02, 'glass', { collide: false });
    }
    for (const x of [Wg.minX + 1, Wg.maxX - 1]) for (const z of [51.7, 53.3]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 12), M.steelDark || M.rust); w.rotation.x = Math.PI / 2; w.position.set(x, y0 + 0.4, z); b.group.add(w);
    }
    this.sign('IRMANDADE — TRANSLADO', (Wg.minX + Wg.maxX) / 2, y0 + 1.1, Wg.minZ - 0.03, Math.PI, 2.4, 0.22, { bg: '#16140f', fg: '#c8b890' });
    // atril com a ata, bancos de pedra, placas
    const A = ATRIL;
    b.box(A.x - 0.3, y0, A.z - 0.25, A.x + 0.3, y0 + 1.05, A.z + 0.25, 'woodDark', { tag: 'prop-low', sight: false });
    b.box(A.x - 0.35, y0 + 1.05, A.z - 0.3, A.x + 0.35, y0 + 1.12, A.z + 0.3, 'paper', { collide: false });
    for (const z of [44.2, 61.8]) b.box(86, y0, z - 0.3, 89, y0 + 0.5, z + 0.3, 'stone', { tag: 'prop-low', sight: false });
    this.sign('SOB A PEDRA', 91, y0 + 3.6, S.minZ + 0.12, 0, 4.2, 0.6, { bg: '#0c2a3a', fg: '#e8e0c8' });
    this.sign('SOB A PEDRA', 84, y0 + 3.6, S.maxZ - 0.12, Math.PI, 4.2, 0.6, { bg: '#0c2a3a', fg: '#e8e0c8' });
    this.sign('AQUI DORME A PRIMEIRA CINZA', S.maxX - 0.12, y0 + 4.2, V.z, -Math.PI / 2, 3.2, 0.3, { bg: '#16140f', fg: '#c8b890' });
    this.sign('SAÍDA DE SERVIÇO ↑', STAIR.door.x, y0 + 2.75, S.maxZ - 0.12, Math.PI, 1.8, 0.22, { bg: '#1a1712', fg: '#cbbf98' });
    // sinetas da estação: alavanca na parede oeste, cabo pelo teto, sino no canto leste
    for (const B of SOB_BELLS) {
      const pv = new THREE.Group(); pv.position.set(B.lever.x - 0.25, y0 + 0.9, B.lever.z); b.group.add(pv);
      const rod = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.5), M.rust); rod.position.z = 0; rod.position.x = 0.25; rod.rotation.y = Math.PI / 2; pv.add(rod);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), M.brass); knob.position.x = 0.5; pv.add(knob);
      b.box(S.minX + 0.1, y0 + 0.9, B.lever.z - 0.02, B.lever.x - 0.2, yT - 0.6, B.lever.z + 0.02, 'rust', { collide: false });
      b.box(S.minX + 0.1, yT - 0.62, B.lever.z - 0.015, B.bell.x, yT - 0.58, B.lever.z + 0.015, 'rust', { collide: false });
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.32, 0.4, 12, 1, true), M.brass);
      bell.position.set(B.bell.x, yT - 0.9, B.bell.z); b.group.add(bell);
      this.bells[B.id] = { ...B, mesh: bell, lever: pv, t: -1, rung: 0 };
    }
  }
  /** balança uma sineta (visual); o barulho de verdade é do script (PerceptionSystem) */
  ringBell(id) { const B = this.bells[id]; if (B) { B.t = 0; B.rung = (B.rung || 0) + 1; } return !!B; }

  /** a parede de cal do Vigia se rompe (ou já está rompida, no save) */
  breakVigiaWall() {
    const V = this.vigiaWall;
    if (!V || V.broken) return false;
    V.broken = true; V.wall.visible = false; V.rubble.visible = true; V.collider.enabled = false;
    return true;
  }

  // ---------- ESCADA DE SERVIÇO (norte, x97.4..100.6 z64..69.5): grade com cadeado, degraus subindo para a Usina ----------
  _stair() {
    const b = this.b, S = STAIR, y0 = TRACK_Y;
    b.floor(S.minX, S.minZ, S.maxX, S.maxZ, y0, 'concrete', 'c7_saida');
    b.ceiling(S.minX, S.minZ, S.maxX, S.maxZ, y0 + 6, 'cantaria');
    b.box(S.minX - 0.2, y0, S.minZ, S.minX, y0 + 6, S.maxZ, 'cantaria');
    b.box(S.maxX, y0, S.minZ, S.maxX + 0.2, y0 + 6, S.maxZ, 'cantaria');
    b.box(S.minX - 0.2, y0, S.maxZ, S.maxX + 0.2, y0 + 6, S.maxZ + 0.2, 'cantaria');
    // degraus de ferro subindo para o norte (visual: a saída encerra o capítulo)
    for (let i = 0; i < 12; i++) b.box(S.minX + 0.3, y0, 65.4 + i * 0.34, S.maxX - 0.3, y0 + 0.2 + i * 0.3, 65.74 + i * 0.34, 'steelDark', { collide: false });
    this.sign('USINA DE VÉSPERA — TORRE DE TRANSMISSÃO ↑', 99, y0 + 4.6, S.maxZ - 0.02, Math.PI, 2.6, 0.24, { bg: '#2a1a0c', fg: '#f0c070' });
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
    D({ id: 'c7_cabin', axis: 'x', x: CABIN.door.x, y: TRACK_Y, z: CABIN.maxZ - 0.1, width: 1.2, height: 2.3, swing: -1, mat: this.M.door, label: 'porta da cabine de sinalização' });
    D({ id: 'c7_stairs', axis: 'x', x: STAIR.door.x, y: TRACK_Y, z: SOB.maxZ + 0.1, width: 1.6, height: 2.4, swing: 1, mat: this.M.rust || this.M.doorMetal, locked: true,
      lockMsg: 'Grade de ferro da escada de serviço, com um cadeado grosso da Irmandade. Do outro lado, degraus sobem para o escuro e um cheiro de óleo queimado.', label: 'grade da escada de serviço' });
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
    this.lamp(56, TRACK_Y + 3.4, 52.6, sodium, 0.55, 8, { flicker: true });  // Linha Velha
    this.lamp(70.5, TRACK_Y + 3.4, 52.6, sodium, 0.5, 8);
    this.lamp(63, TRACK_Y + 2.6, 47.4, warm, 0.8, 7);                        // cabine de sinalização
    this.lamp(76.4, TRACK_Y + 3.2, 52.6, red, 0.7, 7, { emergency: true });  // grade levadiça
    this.lamp(84, TRACK_Y + 6.6, 52.6, cold, 0.9, 14);                       // Estação Sob a Pedra
    this.lamp(96, TRACK_Y + 6.6, 52.6, cold, 0.8, 14, { flicker: true });
    this.lamp(103, TRACK_Y + 1.4, 52.8, candle, 0.9, 8, { flicker: true });  // velas da parede de cal
    this.lamp(99, TRACK_Y + 3.0, 66.4, warm, 0.6, 7);                        // escada de serviço
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
    // Linha Velha, cabine, Estação Sob a Pedra (piso dos trilhos)
    const T = TRACK_Y;
    N('l0', 51, 52.6, T); N('l1', 55, 52.6, T); N('l2', 59, 51.0, T); N('l3', 63, 52.6, T); N('l4', 68, 52.6, T); N('l5', 72, 54.2, T); N('l6', 76, 52.6, T);
    N('nL1', 59, 55.7, T); N('nL2', 72, 49.5, T); N('cab0', 63, 48.4, T); N('cab1', 62.6, 46.6, T);
    N('sp0', 80, 52.6, T); N('spNW', 81, 45, T); N('spSW', 81, 61, T); N('nS1', 77.5, 45.6, T); N('nS2', 77.5, 59.6, T);
    N('spN1', 87.5, 49.5, T); N('spS1', 87.5, 56, T); N('spN2', 94.5, 49.5, T); N('spS2', 94.5, 56, T);
    N('spNE', 101, 45, T); N('spE', 100.5, 52.8, T); N('spSE', 101, 61, T); N('spX', 99, 62.6, T); N('st0', 99, 66, T);
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
    L('trE', 'l0'); L('l0', 'l1'); L('l1', 'l2'); L('l2', 'l3'); L('l3', 'l4'); L('l4', 'l5'); L('l5', 'l6'); L('l6', 'sp0');
    L('l2', 'nL1'); L('l5', 'nL2'); L('l4', 'nL2'); L('l3', 'cab0', d.c7_cabin); L('cab0', 'cab1');
    L('sp0', 'spNW'); L('sp0', 'spSW'); L('spNW', 'nS1'); L('spSW', 'nS2'); L('sp0', 'spN1'); L('sp0', 'spS1');
    L('spNW', 'spN1'); L('spSW', 'spS1'); L('spN1', 'spN2'); L('spS1', 'spS2'); L('spN2', 'spNE'); L('spN2', 'spE'); L('spS2', 'spE'); L('spS2', 'spSE');
    L('spNE', 'spE'); L('spSE', 'spE'); L('spSE', 'spX'); L('spX', 'st0', d.c7_stairs);
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
    const G = this.lineGate;
    if (G && G.t >= 0) { G.t += dt; this._placeGate(G.t / 0.8); if (G.t >= 0.8) G.t = -1; }
    const P = this.portcullis;
    if (P && P.k !== P.target) {
      // sobe devagar (corrente), desce de uma vez
      P.k = P.target > P.k ? Math.min(P.target, P.k + dt / 2.4) : Math.max(P.target, P.k - dt / 0.35);
      P.group.position.y = TRACK_Y + P.k * (PORTCULLIS.h - 0.3);
      if (P.open && P.k > 0.6) P.collider.enabled = false;
    }
    for (const id in this.levers) { const Lv = this.levers[id]; Lv.pivot.rotation.x += (Lv.target - Lv.pivot.rotation.x) * Math.min(1, dt * 10); }
    if (this.signalLamp) this.signalLamp.material = this.portcullis?.open ? (this.M.lampGreen || this.M.lampOn) : (this.M.lampRed || this.M.lampOff);
    for (const id in this.bells) {
      const B = this.bells[id];
      if (B.t >= 0) { B.t += dt; B.mesh.rotation.z = Math.sin(B.t * 14) * 0.5 * Math.max(0, 1 - B.t / 2.2); if (B.lever) B.lever.rotation.z = -0.6 * Math.max(0, 1 - B.t / 0.6); if (B.t > 2.2) B.t = -1; }
    }
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
