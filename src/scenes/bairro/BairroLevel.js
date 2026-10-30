// Capítulo 2 — Fumaça · Bairro Operário: Rua dos Tecelões, beco, depósito da tecelagem, escritório do
// capataz, pátio de carga com o ponto do bonde, Rua do Carvão, Carvoaria São Brás, o salão da fábrica de
// fumaça (Cia. de Gás e Coque) e a casa das fornalhas, onde Brás guarda a "Garganta". Tudo no nível da rua (y = 0), céu aberto
// coberto de fumaça parda e fuligem caindo. Mesma base modular do hospital (LevelBuilder/Door/Navigation).
import * as THREE from 'three';
import { LevelBuilder } from '../../world/LevelBuilder.js';
import { Door } from '../../world/Doors.js';
import { HospitalLevel } from '../hospital/HospitalLevel.js';

// 14 luzes do cenário + lanterna/preenchimento do jogador + luz do ponto fraco do chefe = 16 no máximo
const LIGHT_BUDGET = 13;
export const STREET = 0;
const H_DEP = 5.5; // pé-direito do depósito
const H_CARV = 4.5, H_FAB = 7, H_ARENA = 9;

export const BAIRRO_CHECKPOINTS = {
  c2_gate: { x: 3, y: STREET, z: 4, yaw: Math.PI / 2 },
  c2_depot: { x: 24, y: STREET, z: 10, yaw: 0 },
  c2_office: { x: 37.5, y: STREET, z: 21, yaw: Math.PI },
  c2_yard: { x: 43, y: STREET, z: 25, yaw: 0 },
  c2_coal: { x: 43, y: STREET, z: 33, yaw: 0 },
  c2_carv: { x: 34.5, y: STREET, z: 43.5, yaw: Math.PI / 2 },
  c2_factory: { x: 43, y: STREET, z: 62, yaw: 0 },
  c2_preboss: { x: 45, y: STREET, z: 75.5, yaw: 0 },
  c2_end: { x: 53, y: STREET, z: 87, yaw: Math.PI / 2 },
};

// névoa padrão da rua: fumaça parda e quente do incêndio da fundição
export const BAIRRO_FOG = { fog: 0x1a120c, density: 0.06 };
export const BAIRRO_ZONES = [
  { id: 'c2_office', minX: 34, maxX: 40, minZ: 18, maxZ: 24, minY: -1, maxY: 6, fog: 0x0c0907, density: 0.06 },
  { id: 'c2_depot', minX: 18, maxX: 40, minZ: 8, maxZ: 24, minY: -1, maxY: 6, fog: 0x0e0b08, density: 0.07 },
  { id: 'c2_beco', minX: 9.5, maxX: 12.5, minZ: 8, maxZ: 16, minY: -1, maxY: 6, fog: 0x120d0a, density: 0.085 },
  { id: 'c2_yard', minX: 40, maxX: 46, minZ: 8, maxZ: 30, minY: -1, maxY: 8, fog: 0x15171c, density: 0.05 },
  { id: 'c2_carv', minX: 30, maxX: 38, minZ: 38, maxZ: 48, minY: -1, maxY: 6, fog: 0x0c0907, density: 0.07 },
  { id: 'c2_coal', minX: 38, maxX: 50, minZ: 30, maxZ: 60, minY: -1, maxY: 10, fog: 0x1c1208, density: 0.07 },
  { id: 'c2_factory', minX: 34, maxX: 56, minZ: 60, maxZ: 78, minY: -1, maxY: 8, fog: 0x1a0e08, density: 0.065 },
  { id: 'c2_arena', minX: 34, maxX: 56, minZ: 78, maxZ: 96, minY: -1, maxY: 10, fog: 0x220c04, density: 0.05 },
];
const INDOOR = new Set(['c2_depot', 'c2_office', 'c2_carv', 'c2_factory', 'c2_arena']);

export class BairroLevel {
  constructor(game) {
    this.game = game;
    this.M = game.materials;
    this.b = new LevelBuilder(game.scene, game.col, game.materials);
    this.doors = {};
    this.lights = { power: [], emergency: [], flicker: [], all: [] };
    this.fires = [];
    this.pickupMeshes = {};
    this.drawers = {};
    this.zone = null;
    this.fireLit = true; // marca de fogo no mapa (bonde em chamas)
    this.smokeBoost = 0;   // fumaça extra na casa das fornalhas (fases 2 e 3 do chefe)
  }

  build() {
    this._street();
    this._alley();
    this._depot();
    this._yard();
    this._coalStreet();
    this._carvoaria();
    this._factory();
    this._arena();
    this._doors();
    this._lights();
    this._soot();
    this._nav();
    return this;
  }

  // reaproveita utilitários do hospital (lâmpada com luminária, placas de texto em canvas)
  lamp(...a) { return HospitalLevel.prototype.lamp.apply(this, a); }
  sign(...a) { return HospitalLevel.prototype.sign.apply(this, a); }

  // ---------- RUA DOS TECELÕES x1..38 z0..8 ----------
  _street() {
    const b = this.b, Y = STREET;
    b.floor(1, 1.4, 40, 6.6, Y, 'stone', 'c2_street');
    b.floor(1, 0, 40, 1.4, Y, 'concrete', 'c2_walkS');
    b.floor(1, 6.6, 40, 8, Y, 'concrete', 'c2_walkN');
    // meio-fio (visual)
    b.box(1, Y, 1.35, 38, Y + 0.06, 1.45, 'concrete', { collide: false });
    b.box(1, Y, 6.55, 18, Y + 0.06, 6.65, 'concrete', { collide: false });
    // muro do hospital com o portão de serviço fechado atrás de Elias (oeste)
    b.box(0.2, Y, -1, 1.0, Y + 4.2, 9, 'brick');
    for (let z = 2.3; z <= 5.7; z += 0.34) b.box(1.0, Y, z - 0.03, 1.08, Y + 3.0, z + 0.03, 'rust', { collide: false });
    b.box(1.0, Y + 2.95, 2.2, 1.12, Y + 3.1, 5.8, 'rust', { collide: false });
    this.sign('HOSPITAL SÃO DIMAS', 1.13, Y + 3.5, 4, Math.PI / 2, 2.2, 0.3, { bg: '#3a3026', fg: '#c8b890' });
    // fachadas das casas geminadas (sul), alturas variadas
    const houses = [[1, 7, 5.6, 'brick'], [7, 13, 6.4, 'wall'], [13, 19, 5.2, 'brick'], [19, 26, 6.8, 'wallLower'], [26, 32, 5.8, 'brick'], [32, 40, 6.2, 'wall']];
    for (const [x0, x1, h, mat] of houses) {
      b.box(x0, Y, -3, x1, Y + h, 0, mat);
      b.box(x0, Y + h, -3.2, x1, Y + h + 0.25, 0.25, 'woodDark', { collide: false }); // beiral
      const mid = (x0 + x1) / 2;
      b.box(mid - 0.55, Y, -0.02, mid + 0.55, Y + 2.2, 0.06, 'door', { collide: false });             // porta pregada
      b.box(mid - 0.7, Y + 0.9, 0.04, mid + 0.7, Y + 1.05, 0.1, 'wood', { collide: false });          // tábua atravessada
      for (const wx of [x0 + 1.2, x1 - 1.2]) {
        b.box(wx - 0.45, Y + 1.2, -0.02, wx + 0.45, Y + 2.2, 0.04, 'glass', { collide: false });
        b.box(wx - 0.5, Y + 3.4, -0.02, wx + 0.5, Y + 4.4, 0.04, 'glass', { collide: false });
      }
    }
    // casas do lado norte (x1..18), separadas pelo beco x9.5..12.5
    b.box(1, Y, 8, 9.5, Y + 6, 16, 'wall');
    b.box(12.5, Y, 8, 18, Y + 5.4, 16, 'brick');
    for (const [x0, x1] of [[1, 9.5], [12.5, 18]]) {
      const mid = (x0 + x1) / 2;
      b.box(mid - 0.55, Y, 7.94, mid + 0.55, Y + 2.2, 8.02, 'door', { collide: false });
      b.box(x0 + 0.8, Y + 1.2, 7.94, x0 + 1.8, Y + 2.2, 8.0, 'glass', { collide: false });
    }
    // barricada a leste: bonde tombado em chamas, entulho e sacos
    b.box(39.4, Y, -1, 40.6, Y + 4, 8, 'brick');
    b.box(35.6, Y, 1.6, 39.4, Y + 2.6, 6.4, 'rust', { cast: true });
    b.box(35.9, Y + 1.4, 1.55, 39.1, Y + 2.2, 1.6, 'glass', { collide: false });
    b.box(35.6, Y + 2.6, 2.2, 39.4, Y + 2.8, 5.8, 'woodDark', { collide: false });
    b.box(34.2, Y, 0.2, 35.6, Y + 1.1, 1.6, 'concrete', { tag: 'prop' });
    b.box(34.6, Y, 6.4, 36.6, Y + 0.9, 7.9, 'stone', { tag: 'prop' });
    this.sign('LINHA 4', 37.5, Y + 2.35, 6.42, 0, 1.0, 0.25, { bg: '#2a2016', fg: '#d0a060' });
    this._fire(37.4, Y + 2.8, 4.0, 1.0);
    this._fire(35.0, Y + 1.1, 0.9, 0.5);
    // postes de lampião a gás
    for (const [x, z] of [[6, 1.1], [16, 6.9], [30, 1.1]]) {
      b.box(x - 0.06, Y, z - 0.06, x + 0.06, Y + 3.6, z + 0.06, 'metal', { tag: 'prop' });
      b.box(x - 0.16, Y + 3.5, z - 0.16, x + 0.16, Y + 3.85, z + 0.16, 'lampOn', { collide: false });
    }
    // carroça abandonada, barris e caixotes (obstáculos baixos: não tapam a visão)
    b.box(20, Y, 5.4, 23, Y + 1.0, 6.4, 'wood', { tag: 'prop-low', sight: false });
    b.box(20.4, Y, 5.2, 20.8, Y + 0.6, 6.6, 'woodDark', { collide: false });
    b.box(27, Y, 1.5, 27.8, Y + 0.9, 2.3, 'woodDark', { tag: 'prop-low', sight: false });
    b.box(14, Y, 0.3, 14.7, Y + 0.85, 1.0, 'rust', { tag: 'prop-low', sight: false });
    // cartazes
    this.sign('RUA DOS TECELÕES', 4, Y + 2.8, 0.08, 0, 1.6, 0.26, { bg: '#1e2a3a', fg: '#d8d2b8' });
    this.sign('TOQUE DE RECOLHER APÓS A SIRENE', 16.5, Y + 1.7, 0.08, 0, 1.5, 0.3, { bg: '#c9c2a4', fg: '#6a1010' });
  }

  // ---------- BECO x9.5..12.5 z8..16 (sem saída) ----------
  _alley() {
    const b = this.b, Y = STREET;
    b.floor(9.5, 8, 12.5, 16, Y, 'stone', 'c2_alley');
    b.box(9.5, Y, 15.8, 12.5, Y + 4.5, 16.4, 'brick');
    b.box(9.5, Y + 3.4, 8, 12.5, Y + 3.55, 8.3, 'woodDark', { collide: false }); // varal / viga
    b.box(10.0, Y, 14.6, 10.8, Y + 0.85, 15.4, 'woodDark', { tag: 'prop-low', sight: false }); // caixote
    b.box(11.6, Y, 14.9, 12.3, Y + 0.95, 15.6, 'rust', { tag: 'prop-low', sight: false });     // barril
    b.box(11.9, Y, 10.2, 12.4, Y + 1.6, 11.6, 'wood', { tag: 'prop' });                         // portas velhas encostadas
  }

  // ---------- DEPÓSITO DA TECELAGEM x18..40 z8..24 + ESCRITÓRIO x34..40 z18..24 ----------
  _depot() {
    const b = this.b, Y = STREET;
    b.floor(18, 8, 40, 24, Y, 'concrete', 'c2_depot');
    b.ceiling(18, 8, 40, 24, H_DEP, 'woodDark');
    b.wallX(8, 18, 39.4, Y, H_DEP, [24], 'brick', 1.6, 2.4);
    b.wallZ(18, 8, 24, Y, H_DEP, [], 'brick');
    b.wallX(24, 18, 40, Y, H_DEP, [], 'brick');
    b.wallZ(40, 8, 24, Y, H_DEP, [14], 'brick', 3.0, 3.0);
    // fachada: letreiro sobre a porta
    this.sign('TECELAGEM SANTA CECÍLIA — DEPÓSITO', 24, Y + 3.0, 7.88, Math.PI, 2.6, 0.32, { bg: '#2a1e14', fg: '#c8a060' });
    for (const x of [20, 28, 32, 36]) b.box(x - 0.6, Y + 1.4, 7.88, x + 0.6, Y + 2.4, 7.9, 'glass', { collide: false });
    // prateleiras com fardos de algodão (altas: bloqueiam a visão, criam corredores para se esconder)
    for (const [x0, z0, x1, z1, h, mat] of [[20.5, 13, 22, 22, 3.2, 'woodDark'], [26, 14, 28, 21, 2.6, 'wood'], [31, 13, 32.5, 17, 2.6, 'woodDark']]) {
      b.box(x0, Y, z0, x1, Y + h, z1, mat, { tag: 'prop' });
      for (let z = z0 + 0.6; z < z1 - 0.4; z += 1.4) b.box(x0 + 0.1, Y + h, z - 0.4, x1 - 0.1, Y + h + 0.5, z + 0.4, 'sheet', { collide: false });
    }
    // tear mecânico parado
    b.box(28.5, Y, 9.4, 32.5, Y + 1.5, 11, 'metal', { tag: 'prop-low', sight: false });
    b.box(28.7, Y + 1.5, 9.6, 32.3, Y + 2.4, 9.8, 'steelDark', { collide: false });
    b.box(29, Y + 1.5, 10.2, 32, Y + 1.56, 10.8, 'sheet', { collide: false });
    // fardos soltos e carrinho
    b.box(19, Y, 9, 20.4, Y + 1.0, 10.4, 'sheet', { tag: 'prop-low', sight: false });
    b.box(33.5, Y, 9, 35, Y + 0.9, 10.2, 'woodDark', { tag: 'prop-low', sight: false });
    b.box(24.8, Y, 22.6, 26.6, Y + 1.1, 23.8, 'sheet', { tag: 'prop-low', sight: false });
    // escritório do capataz
    b.wallX(18, 34, 40, Y, H_DEP, [37], 'wall', 1.4, 2.3);
    b.wallZ(34, 18, 24, Y, H_DEP, [], 'wall');
    b.box(34.2, Y + 1.2, 19.6, 34.3, Y + 2.1, 21.6, 'glass', { collide: false }); // janela interna (visual)
    b.box(37.6, Y, 20.4, 39.8, Y + 0.85, 21.6, 'wood', { tag: 'prop-low', sight: false }); // mesa
    b.box(38.3, Y, 22.8, 39.8, Y + 0.9, 23.8, 'woodDark', { tag: 'prop-low', sight: false }); // aparador (livro)
    b.box(34.3, Y, 22.9, 36.8, Y + 0.8, 23.8, 'woodDark', { tag: 'prop-low', sight: false }); // arquivo baixo
    b.box(39.6, Y + 1.3, 19, 39.8, Y + 2.3, 20.4, 'blueprint', { collide: false }); // quadro de turnos
    this.sign('CAPATAZ', 37, Y + 2.55, 17.88, Math.PI, 0.8, 0.2);
    this.sign('CARGA', 39.88, Y + 3.3, 14, -Math.PI / 2, 1.0, 0.24, { bg: '#3a2a10', fg: '#e0c070' });
    // eixo da porta de carga (onde a manivela encaixa)
    this.crankAxle = b.box(39.6, Y + 1.0, 12.1, 39.9, Y + 1.3, 12.4, 'metal', { collide: false });
  }

  // ---------- PÁTIO DE CARGA x40..46 z8..30 + ponto do bonde ----------
  _yard() {
    const b = this.b, Y = STREET;
    b.floor(40, 8, 46, 30, Y, 'stone', 'c2_yard');
    b.wallX(8, 39.4, 46.2, Y, 3, [], 'brick');
    b.wallZ(46, 8, 30, Y, 3, [], 'brick');
    b.wallX(30, 39.8, 46.2, Y, 3, [43], 'brick', 2.4, 2.6); // portão norte (trilhos) → Rua do Carvão
    b.wallZ(40, 24, 30, Y, 3, [], 'brick');
    // trilhos do bonde atravessando o pátio
    for (const x of [42.6, 43.4]) b.box(x - 0.04, Y, 18, x + 0.04, Y + 0.06, 30, 'steel', { collide: false });
    for (let z = 18.4; z < 30; z += 0.9) b.box(42.3, Y, z - 0.1, 43.7, Y + 0.03, z + 0.1, 'woodDark', { collide: false });
    // ponto do bonde: poste, placa e banco
    b.box(44.6, Y, 26.9, 44.75, Y + 2.8, 27.05, 'metal', { tag: 'prop' });
    this.sign('PONTO DO BONDE · LINHA 4', 44.2, Y + 2.6, 26.86, Math.PI, 1.3, 0.28, { bg: '#e0d8b0', fg: '#1c2a40' });
    b.box(44.8, Y, 24.6, 45.6, Y + 0.5, 26.4, 'wood', { tag: 'prop-low', sight: false });
    // caixotes de carga
    b.box(40.6, Y, 9, 42, Y + 1.2, 10.4, 'woodDark', { tag: 'prop-low', sight: false });
    b.box(44.4, Y, 12, 45.8, Y + 1.4, 13.6, 'wood', { tag: 'prop-low', sight: false });
    b.box(40.6, Y, 19, 41.6, Y + 0.9, 20, 'rust', { tag: 'prop-low', sight: false });
  }

  // ---------- RUA DO CARVÃO x38..50 z30..60 ----------
  _coalStreet() {
    const b = this.b, Y = STREET;
    b.floor(38, 30, 50, 60, Y, 'stone', 'c2_coalst');
    // cantos do portão do pátio
    b.box(38, Y, 29.8, 39.8, Y + 3, 30.2, 'brick'); b.box(46.2, Y, 29.8, 50, Y + 3, 30.2, 'brick');
    // casas do lado oeste (a carvoaria fica entre elas, z38..48)
    b.box(32, Y, 30.2, 38, Y + 5.2, 37.9, 'brick');
    b.box(32, Y, 48.1, 38, Y + 6.0, 60, 'wall');
    // quarteirão leste: casas de operários, alturas variadas, portas pregadas
    const east = [[30.2, 37, 5.8, 'wallLower'], [37, 44, 6.6, 'brick'], [44, 51, 5.4, 'wall'], [51, 60, 7.2, 'brick']];
    for (const [z0, z1, h, mat] of east) {
      b.box(50, Y, z0, 54, Y + h, z1, mat);
      b.box(49.8, Y + h, z0, 54.2, Y + h + 0.25, z1, 'woodDark', { collide: false });
      const mid = (z0 + z1) / 2;
      b.box(49.94, Y, mid - 0.55, 50.02, Y + 2.2, mid + 0.55, 'door', { collide: false });
      b.box(49.9, Y + 0.9, mid - 0.7, 49.96, Y + 1.05, mid + 0.7, 'wood', { collide: false });
      for (const wz of [z0 + 1.1, z1 - 1.1]) b.box(49.94, Y + 1.3, wz - 0.4, 50.0, Y + 2.2, wz + 0.4, 'glass', { collide: false });
    }
    for (const [z0, z1] of [[30.2, 37.9], [48.1, 60]]) {
      const mid = (z0 + z1) / 2;
      b.box(37.98, Y, mid - 0.55, 38.06, Y + 2.2, mid + 0.55, 'door', { collide: false });
      b.box(38.0, Y + 1.3, z0 + 0.8, 38.06, Y + 2.2, z0 + 1.6, 'glass', { collide: false });
    }
    // trilhos da Linha 4 seguindo até o portão da fábrica
    for (const x of [42.6, 43.4]) b.box(x - 0.04, Y, 30, x + 0.04, Y + 0.06, 58, 'steel', { collide: false });
    for (let z = 30.4; z < 58; z += 0.9) b.box(42.3, Y, z - 0.1, 43.7, Y + 0.03, z + 0.1, 'woodDark', { collide: false });
    // vagonete de carvão descarrilado sobre os trilhos (cobertura baixa)
    b.box(42.2, Y, 39, 43.8, Y + 1.1, 41, 'rust', { tag: 'prop-low', sight: false });
    b.box(42.3, Y + 1.1, 39.1, 43.7, Y + 1.35, 40.9, 'coal', { collide: false });
    // montes de carvão espalhados e entulho de uma casa desabada
    for (const [x0, z0, x1, z1, h] of [[38.2, 33, 39.6, 35.2, 0.7], [48.4, 46, 49.8, 48.6, 0.9], [38.2, 56.4, 40, 59.8, 1.0]]) b.box(x0, Y, z0, x1, Y + h, z1, 'coal', { tag: 'prop-low', sight: false });
    b.box(38, Y, 49, 41, Y + 1.8, 51, 'stone', { tag: 'prop' });
    b.box(38.4, Y + 1.8, 49.3, 40.2, Y + 2.4, 50.6, 'woodDark', { collide: false });
    // carroça de coque em chamas
    b.box(47, Y, 52, 49.5, Y + 1.0, 54, 'woodDark', { tag: 'prop-low', sight: false, cast: true });
    b.box(47.2, Y + 1.0, 52.2, 49.3, Y + 1.25, 53.8, 'coal', { collide: false });
    this._fire(48.2, Y + 1.2, 53, 0.8);
    // postes de lampião a gás
    for (const [x, z] of [[39, 34], [49, 44], [39, 54]]) {
      b.box(x - 0.06, Y, z - 0.06, x + 0.06, Y + 3.6, z + 0.06, 'metal', { tag: 'prop' });
      b.box(x - 0.16, Y + 3.5, z - 0.16, x + 0.16, Y + 3.85, z + 0.16, 'lampOn', { collide: false });
    }
    // chaminés da fábrica despontando ao fundo (silhuetas na fumaça)
    for (const [x, z, h] of [[38, 66, 22], [47, 72, 26], [54, 64, 19]]) b.box(x - 0.9, Y + H_FAB, z - 0.9, x + 0.9, Y + h, z + 0.9, 'soot', { collide: false });
    // placas
    this.sign('RUA DO CARVÃO', 39.9, Y + 2.7, 30.25, 0, 1.4, 0.26, { bg: '#1e2a3a', fg: '#d8d2b8' });
    this.sign('CIA. DE GÁS E COQUE DE VÉSPERA', 43, Y + 4.4, 59.85, Math.PI, 3.2, 0.36, { bg: '#2a1a10', fg: '#e0a050' });
    this.sign('PERIGO — FORNOS ACESOS', 46.2, Y + 2.2, 59.85, Math.PI, 1.3, 0.28, { bg: '#c9c2a4', fg: '#7a1010' });
  }

  // ---------- CARVOARIA SÃO BRÁS x30..38 z38..48 ----------
  _carvoaria() {
    const b = this.b, Y = STREET;
    b.floor(30, 38, 38, 48, Y, 'concrete', 'c2_carv');
    b.ceiling(30, 38, 38, 48, H_CARV, 'woodDark');
    b.wallX(38, 30, 38, Y, H_CARV, [], 'brick');
    b.wallX(48, 30, 38, Y, H_CARV, [], 'brick');
    b.wallZ(30, 38, 48, Y, H_CARV, [], 'brick');
    b.wallZ(38, 38, 48, Y, H_CARV, [43], 'soot', 1.4, 2.3);
    this.sign('CARVOARIA SÃO BRÁS', 38.12, Y + 2.9, 43, Math.PI / 2, 1.8, 0.3, { bg: '#2a1e14', fg: '#d8b070' });
    // montes de carvão e sacos (corredores para contornar o que vive aqui)
    b.box(30.2, Y, 38.2, 32.6, Y + 1.6, 41.4, 'coal', { tag: 'prop' });
    b.box(31.8, Y, 45.6, 34.4, Y + 1.2, 47.8, 'coal', { tag: 'prop-low', sight: false });
    for (const [x, z] of [[35.2, 39], [36.2, 39], [35.7, 39.9]]) b.box(x - 0.4, Y, z - 0.3, x + 0.4, Y + 0.7, z + 0.3, 'sheet', { tag: 'prop-low', sight: false });
    // balança de pesagem com a mesa do encarregado (chave pendurada no gancho)
    b.box(35.5, Y, 46.6, 37.6, Y + 0.9, 47.8, 'wood', { tag: 'prop-low', sight: false });
    b.box(36.9, Y + 0.9, 47.4, 37.0, Y + 2.0, 47.5, 'metal', { collide: false });
    b.box(36.5, Y + 1.95, 47.3, 37.3, Y + 2.0, 47.6, 'metal', { collide: false });
    // prateleira com pás e lampiões
    b.box(30.2, Y, 43.6, 30.9, Y + 2.4, 45.8, 'woodDark', { tag: 'prop' });
    this.sign('PESO JUSTO — DEUS VÊ', 37.85, Y + 2.6, 46.9, -Math.PI / 2, 1.2, 0.22, { bg: '#c9c2a4', fg: '#3a2a10' });
  }

  // ---------- FÁBRICA DE FUMAÇA — SALÃO x34..56 z60..78 ----------
  _factory() {
    const b = this.b, Y = STREET;
    b.floor(34, 60, 56, 78, Y, 'concrete', 'c2_fab');
    b.ceiling(34, 60, 56, 78, H_FAB, 'steelDark');
    b.wallX(60, 34, 56, Y, H_FAB + 1, [43], 'brick', 3.0, 3.2);
    b.wallZ(34, 60, 78, Y, H_FAB, [], 'brick');
    b.wallZ(56, 60, 78, Y, H_FAB, [], 'brick');
    b.wallX(78, 34, 56, Y, H_ARENA, [45], 'soot', 2.4, 2.8);
    // bateria de fornos de coque (parede oeste): portas de ferro e bocas em brasa
    b.box(34.1, Y, 62, 36.5, Y + 3.2, 76, 'soot', { tag: 'prop' });
    for (const z of [64, 68, 72]) {
      b.box(36.5, Y + 0.6, z - 0.8, 36.56, Y + 2.0, z + 0.8, 'rust', { collide: false });
      b.box(36.5, Y + 0.2, z - 0.5, 36.6, Y + 0.6, z + 0.5, 'ember', { collide: false });
      this._fire(36.9, Y, z, 0.45);
    }
    b.box(34.1, Y + 3.2, 62, 36.5, Y + 6.8, 63, 'soot', { collide: false });
    // esteira de coque parada (cobertura baixa)
    b.box(39, Y, 66, 51, Y + 1.0, 67.2, 'metal', { tag: 'prop-low', sight: false });
    b.box(39.2, Y + 1.0, 66.1, 50.8, Y + 1.12, 67.1, 'coal', { collide: false });
    for (let x = 40; x <= 50; x += 2.5) b.box(x - 0.1, Y + 1.12, 66, x + 0.1, Y + 4.5, 66.2, 'steelDark', { collide: false });
    // tanques de alcatrão (leste)
    b.box(51, Y, 70, 55, Y + 3.6, 76, 'rust', { tag: 'prop' });
    b.box(51.3, Y + 3.6, 70.4, 54.7, Y + 3.8, 75.6, 'steelDark', { collide: false });
    // canos e válvulas de alívio (duas rodas vermelhas)
    b.box(34.6, Y + 4.6, 60.3, 55.6, Y + 4.9, 60.6, 'steel', { collide: false });
    b.box(55.4, Y + 0.8, 60.6, 55.7, Y + 4.9, 60.9, 'steel', { collide: false });
    this.valveA = this._valve(36.75, Y + 1.25, 75.6, Math.PI / 2);
    this.valveB = this._valve(55.8, Y + 1.25, 63, -Math.PI / 2);
    // mesa do fornalheiro (diário) e caixote do livro de registro junto à porta da casa das fornalhas
    b.box(51.5, Y, 60.3, 54, Y + 0.85, 61.2, 'wood', { tag: 'prop-low', sight: false });
    b.box(47, Y, 76.8, 48.4, Y + 0.9, 77.8, 'woodDark', { tag: 'prop-low', sight: false });
    b.box(38.6, Y, 65.8, 39, Y + 1.0, 67.4, 'woodDark', { tag: 'prop-low', sight: false });
    this.sign('CASA DAS FORNALHAS', 45, Y + 3.2, 77.86, Math.PI, 1.8, 0.3, { bg: '#2a1a10', fg: '#e08040' });
    this.sign('ALIVIE AS VÁLVULAS ANTES DE ABRIR', 45, Y + 3.6, 77.86 - 0.01, Math.PI, 2.0, 0.22, { bg: '#c9c2a4', fg: '#7a1010' });
  }
  _valve(x, y, z, rotY) {
    const gr = new THREE.Group(); gr.position.set(x, y, z); gr.rotation.y = rotY;
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 5, 10), new THREE.MeshLambertMaterial({ color: 0x9a1c12 }));
    gr.add(wheel);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 6), this.M.steelDark); hub.rotation.x = Math.PI / 2; gr.add(hub);
    for (const a of [0, Math.PI / 2]) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.03, 0.03), this.M.rust); sp.rotation.z = a; gr.add(sp); }
    this.b.group.add(gr);
    return { gr, wheel, turned: false, spin: 0 };
  }

  // ---------- CASA DAS FORNALHAS (arena do chefe) x34..56 z78..96 ----------
  _arena() {
    const b = this.b, Y = STREET;
    b.floor(34, 78, 56, 96, Y, 'stone', 'c2_arena');
    b.ceiling(34, 78, 56, 96, H_ARENA, 'soot');
    b.wallZ(34, 78, 96, Y, H_ARENA, [], 'soot');
    b.wallZ(56, 78, 96, Y, H_ARENA, [], 'soot');
    b.wallX(96, 34, 56, Y, H_ARENA, [], 'soot');
    // a Garganta: fornalha gigante com boca em brasa e grelha
    b.box(41, Y, 93, 49, Y + 6.5, 96, 'brick');
    b.box(42.5, Y + 0.4, 92.94, 47.5, Y + 3.2, 93.0, 'ember', { collide: false });
    b.box(41.4, Y + 6.5, 93.6, 48.6, Y + 8.99, 95.6, 'soot', { collide: false });
    b.box(43, Y, 91.8, 47, Y + 0.4, 93, 'rust', { tag: 'prop-low', sight: false });
    for (let x = 43.3; x < 47; x += 0.5) b.box(x - 0.03, Y + 0.4, 91.8, x + 0.03, Y + 0.46, 93, 'steelDark', { collide: false });
    this._fire(45, Y + 0.4, 93.3, 1.4);
    // quatro pilares de ferro fundido: ele atordoa se investir contra eles
    for (const [x, z] of [[38.5, 82.5], [51.5, 82.5], [38.5, 89.5], [51.5, 89.5]]) {
      b.box(x - 0.7, Y, z - 0.7, x + 0.7, Y + H_ARENA, z + 0.7, 'steelDark', { tag: 'obstacle' });
      b.box(x - 0.85, Y, z - 0.85, x + 0.85, Y + 0.5, z + 0.85, 'rust', { collide: false });
    }
    // montes de coque nos cantos
    b.box(34.2, Y, 93.4, 37.4, Y + 1.4, 95.8, 'coal', { tag: 'prop-low', sight: false });
    b.box(52.6, Y, 93.4, 55.8, Y + 1.4, 95.8, 'coal', { tag: 'prop-low', sight: false });
    // caixote com o recado e a porta de serviço (saída leste)
    b.box(54.2, Y, 90, 55.8, Y + 0.9, 91.2, 'woodDark', { tag: 'prop-low', sight: false });
    b.box(55.9, Y, 86.2, 55.98, Y + 2.3, 87.8, 'doorMetal', { collide: false });
    b.box(55.84, Y + 1.0, 87.5, 55.9, Y + 1.1, 87.65, 'metal', { collide: false });
    this.sign('SAÍDA — RUA DA FUNDIÇÃO', 55.86, Y + 2.65, 87, -Math.PI / 2, 1.6, 0.26, { bg: '#1e2a3a', fg: '#d8d2b8' });
    this.sign('BRÁS GUARDA A GARGANTA DA FUMAÇA', 45, Y + 4.0, 92.9, Math.PI, 2.6, 0.3, { bg: '#2a1a10', fg: '#e08040' });
  }

  _doors() {
    const ctx = { materials: this.M, group: this.b.group, col: this.game.col, audio: this.game.audio, bus: this.game.bus };
    const D = (o) => (this.doors[o.id] = new Door({ mat: this.M.door, ...o }, ctx));
    D({ id: 'c2_depot', axis: 'x', x: 24, y: STREET, z: 8, width: 1.6, height: 2.4, swing: 1, mat: this.M.woodDark, label: 'porta do depósito' });
    D({ id: 'c2_office', axis: 'x', x: 37, y: STREET, z: 18, swing: 1, label: 'porta do escritório' });
    D({ id: 'c2_shutter', axis: 'z', x: 40, y: STREET, z: 14, width: 3.0, height: 3.0, kind: 'sliding', mat: this.M.rust, locked: true,
      lockMsg: 'A porta de enrolar está emperrada. O eixo pede uma manivela.', label: 'porta de carga' });
    D({ id: 'c2_yardgate', axis: 'x', x: 43, y: STREET, z: 30, width: 2.4, height: 2.6, kind: 'sliding', mat: this.M.rust, locked: true,
      lockMsg: 'O portão dos trilhos está travado. A trava é solta no poste do ponto do bonde.', label: 'portão dos trilhos' });
    D({ id: 'c2_carv', axis: 'z', x: 38, y: STREET, z: 43, swing: -1, mat: this.M.woodDark, label: 'porta da carvoaria' });
    D({ id: 'c2_factory', axis: 'x', x: 43, y: STREET, z: 60, width: 3.0, height: 3.2, kind: 'sliding', mat: this.M.rust, locked: true,
      lockMsg: 'O portão da fábrica tem um cadeado novo. Quem tem a chave é o encarregado da carvoaria.', label: 'portão da fábrica' });
    D({ id: 'c2_arena', axis: 'x', x: 45, y: STREET, z: 78, width: 2.4, height: 2.8, kind: 'sliding', mat: this.M.doorMetal || this.M.rust, locked: true,
      lockMsg: 'A porta da casa das fornalhas está quente demais. A pressão das válvulas a mantém travada.', label: 'porta da casa das fornalhas' });
  }

  // ---------- fogo (malhas + luz quente oscilante) ----------
  _fire(x, y, z, s) {
    const gr = new THREE.Group(); gr.position.set(x, y, z);
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.55 * s, 1.5 * s, 6), this.M.fire);
    outer.position.y = 0.7 * s; gr.add(outer);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.3 * s, 0.9 * s, 5), this.M.fireCore);
    core.position.y = 0.45 * s; gr.add(core);
    this.b.group.add(gr);
    const light = new THREE.PointLight(0xff6a20, 2.6 * s, 11 * s, 1.6); light.position.set(x, y + 0.9 * s, z);
    this.game.scene.add(light);
    const L = { light, fixture: null, base: 2.6 * s, fire: true };
    this.lights.all.push(L);
    this.fires.push({ gr, outer, core, L, s, ph: Math.random() * 10 });
  }

  _lights() {
    const Y = STREET, gas = 0xffb060;
    for (const [x, z] of [[6, 1.1], [16, 6.9], [30, 1.1]]) {
      const L = this.lamp(x, Y + 3.7, z, gas, 1.5, 9, { flicker: true });
      L.fixture.visible = false;
    }
    this.lamp(2.2, Y + 3.4, 6.4, 0xd09a60, 0.7, 6);                       // junto ao portão
    this.lamp(11, Y + 3.2, 13.5, 0xb08050, 0.6, 5.5, { flicker: true });   // beco
    this.lamp(24, Y + H_DEP - 0.1, 12, 0xffd28a, 1.3, 10);                  // depósito (entrada)
    this.lamp(29.5, Y + H_DEP - 0.1, 19.5, 0xffc070, 1.0, 9, { flicker: true });
    this.lamp(37, Y + 3.1, 21.2, 0xffcc88, 1.2, 6.5);                       // escritório
    const moon = this.lamp(43, Y + 6.5, 17, 0x8090b0, 0.8, 16); moon.fixture.visible = false; // luar no pátio
    this.lamp(44.2, Y + 3.2, 26.6, 0xfff0c0, 1.0, 7, { flicker: true });     // ponto do bonde
    // Rua do Carvão
    for (const [x, z] of [[39, 34], [49, 44], [39, 54]]) { const L = this.lamp(x, Y + 3.7, z, gas, 1.4, 9, { flicker: true }); L.fixture.visible = false; }
    this.lamp(34, Y + H_CARV - 0.1, 43, 0xd09a60, 0.9, 7, { flicker: true });     // carvoaria
    this.lamp(44, Y + H_FAB - 0.1, 63, 0xffc070, 1.1, 10);                         // salão (entrada)
    this.lamp(46, Y + H_FAB - 0.1, 73.5, 0xffb060, 0.9, 10, { flicker: true });    // salão (fundos)
    this.lamp(39, Y + H_ARENA - 0.2, 85, 0xff9050, 1.0, 12);                       // casa das fornalhas
    this.lamp(51, Y + H_ARENA - 0.2, 85, 0xff9050, 1.0, 12, { flicker: true });
  }

  // ---------- fuligem caindo (pontos que acompanham o jogador) ----------
  _soot() {
    const N = 700, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 24; pos[i * 3 + 1] = Math.random() * 8; pos[i * 3 + 2] = (Math.random() - 0.5) * 24; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0x3a322a, size: 0.06, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false });
    this.soot = new THREE.Points(geo, mat); this.soot.frustumCulled = false; this.soot.name = 'fuligem';
    this.game.scene.add(this.soot);
  }
  _updateSoot(dt, t) {
    const p = this.game.player?.pos; if (!p || !this.soot) return;
    const a = this.soot.geometry.attributes.position, arr = a.array;
    // dentro do depósito a fuligem some (telhado); fora, cai em diagonal com o vento
    const outside = !INDOOR.has(this.zone);
    this.soot.visible = outside;
    if (!outside) return;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 1] -= dt * (0.5 + (i % 7) * 0.06);
      arr[i] += dt * (0.25 + Math.sin(t * 0.7 + i) * 0.15);
      if (arr[i + 1] < 0) arr[i + 1] += 8;
      if (arr[i] > 12) arr[i] -= 24;
    }
    a.needsUpdate = true;
    this.soot.position.set(p.x, p.y, p.z);
  }

  _nav() {
    const n = this.game.nav, d = this.doors, Y = STREET;
    const N = (id, x, z) => n.addNode(id, x, Y, z);
    N('s0', 4, 4); N('s1', 11, 4); N('s2', 18, 3.6); N('s3', 24, 4); N('s4', 30, 4); N('s5', 33.5, 4);
    N('a1', 11, 9.5); N('a2', 11, 13.6);
    N('d0', 24, 9.3); N('i1', 24, 12); N('i2', 29.5, 12.4); N('i3', 35.5, 12.4); N('i4', 37, 16.8); N('i5', 24, 23); N('i6', 29.5, 22.5); N('i7', 38.6, 14);
    N('o1', 37, 19.4); N('o2', 36.5, 21.8);
    N('y1', 41.4, 14); N('y2', 43, 21); N('y3', 43, 27);
    const L = (a, b, door) => n.link(a, b, door);
    L('s0', 's1'); L('s1', 's2'); L('s2', 's3'); L('s3', 's4'); L('s4', 's5');
    L('s1', 'a1'); L('a1', 'a2');
    L('s3', 'd0', d.c2_depot); L('d0', 'i1'); L('i1', 'i2'); L('i2', 'i3'); L('i3', 'i4'); L('i3', 'i7'); L('i1', 'i5'); L('i5', 'i6'); L('i6', 'i2');
    L('i4', 'o1', d.c2_office); L('o1', 'o2');
    L('i7', 'y1', d.c2_shutter); L('y1', 'y2'); L('y2', 'y3');
    // Rua do Carvão, carvoaria, salão da fábrica e casa das fornalhas
    N('g1', 43, 31.5); N('r1', 45.5, 36); N('r2', 45.5, 44); N('r3', 44.5, 52); N('r4', 43, 57.5);
    N('k0', 39, 43); N('k1', 37, 43); N('k2', 33.5, 43); N('k3', 34, 40); N('k4', 34.6, 44.8);
    N('f0', 43, 62); N('f1', 37.8, 63); N('f2', 37.8, 70); N('f3', 37.8, 76); N('f4', 45, 63); N('f5', 53, 63); N('f6', 53, 68.4); N('f7', 45, 72); N('f8', 45, 76);
    N('a0', 45, 80); N('a1', 45, 86); N('a2', 40, 86); N('a3', 50, 86);
    L('y3', 'g1', d.c2_yardgate); L('g1', 'r1'); L('r1', 'r2'); L('r2', 'r3'); L('r3', 'r4'); L('r2', 'k0');
    L('k0', 'k1', d.c2_carv); L('k1', 'k2'); L('k2', 'k3'); L('k2', 'k4');
    L('r4', 'f0', d.c2_factory); L('f0', 'f1'); L('f0', 'f4'); L('f4', 'f5'); L('f5', 'f6'); L('f1', 'f2'); L('f2', 'f3'); L('f3', 'f8'); L('f2', 'f7'); L('f7', 'f8'); L('f6', 'f7');
    L('f8', 'a0', d.c2_arena); L('a0', 'a1'); L('a1', 'a2'); L('a1', 'a3');
  }

  // mesmo critério do hospital (mais próximas primeiro), com orçamento próprio: o chefe traz uma luz extra
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
    for (const F of this.fires) {
      const k = 0.8 + Math.sin(t * 11 + F.ph) * 0.12 + Math.sin(t * 23 + F.ph * 2) * 0.08;
      F.L.light.intensity = F.L.base * (0.75 + Math.random() * 0.3);
      F.outer.scale.set(1, k * 1.1, 1); F.core.scale.set(1, 1.2 - k * 0.3, 1);
      F.outer.rotation.y = t * 1.3 + F.ph; F.core.rotation.y = -t * 1.9;
    }
    for (const id in this.doors) this.doors[id].update(dt);
    for (const v of [this.valveA, this.valveB]) if (v && v.spin > 0) { const s = Math.min(v.spin, dt * 3); v.spin -= s; v.wheel.rotation.z += s * 4; }
    this._updateZone(dt);
    this._updateSoot(dt, t);
  }

  zoneAt(p) {
    for (const z of BAIRRO_ZONES) if (p.x > z.minX && p.x < z.maxX && p.z > z.minZ && p.z < z.maxZ && p.y > z.minY && p.y < z.maxY) return z;
    return null;
  }
  _updateZone(dt) {
    const fog = this.game.scene.fog, p = this.game.player?.pos;
    if (!fog || !p) return;
    const z = this.zoneAt(p); this.zone = z ? z.id : null;
    const tgt = z || BAIRRO_FOG, k = Math.min(1, dt * 1.5);
    this._fogC = this._fogC || new THREE.Color();
    this._fogC.set(tgt.fog);
    fog.color.lerp(this._fogC, k);
    fog.density += (tgt.density + (z?.id === 'c2_arena' ? this.smokeBoost || 0 : 0) - fog.density) * k;
    if (this.game.scene.background?.isColor) this.game.scene.background.copy(fog.color).multiplyScalar(0.8);
  }
}
