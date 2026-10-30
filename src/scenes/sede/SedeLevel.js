// Capítulo 3 — A Confraria · Sede do Véu (primeira fatia): o Largo do Véu (fim da Linha 4, chuva fina de cinza),
// a portaria com o postigo (só abre para quem mostra a fita vermelha), o salão nobre com colunas e a estátua
// velada, a secretaria, o portão de segredo de três discos e a escada para os arquivos subterrâneos (y −4.5),
// com estantes altas, o fichário e a grade da cripta do Sacristão (próxima fatia). Mesma base modular
// dos capítulos anteriores (LevelBuilder/Door/Navigation), tudo procedural.
import * as THREE from 'three';
import { LevelBuilder } from '../../world/LevelBuilder.js';
import { Door } from '../../world/Doors.js';
import { HospitalLevel } from '../hospital/HospitalLevel.js';

// luzes do cenário visíveis + hemisférica + preenchimento/lanterna do jogador ≤ 16
const LIGHT_BUDGET = 12;
export const GROUND = 0;
export const ARCH = -4.5;               // piso dos arquivos subterrâneos
const H_LODGE = 3.6, H_HALL = 7, H_SEC = 3.6, H_ARCH = 4;

export const SEDE_CHECKPOINTS = {
  c3_tram: { x: 6, y: GROUND, z: 5.2, yaw: Math.PI / 4 },
  c3_lodge: { x: 27, y: GROUND, z: 7, yaw: 0 },
  c3_hall: { x: 27, y: GROUND, z: 14, yaw: 0 },
  c3_archive: { x: 24, y: ARCH, z: 41.8, yaw: 0 },
};

// névoa padrão: noite úmida de cinza sobre o largo, azulada
export const SEDE_FOG = { fog: 0x10121a, density: 0.055 };
export const SEDE_ZONES = [
  { id: 'c3_lodge', minX: 24, maxX: 30, minZ: 4, maxZ: 12, minY: -1, maxY: 4, fog: 0x0d0a08, density: 0.06 },
  { id: 'c3_secretaria', minX: 6, maxX: 14, minZ: 30, maxZ: 38, minY: -1, maxY: 4, fog: 0x0c0908, density: 0.065 },
  { id: 'c3_hall', minX: 6, maxX: 30, minZ: 12, maxZ: 30, minY: -1, maxY: 8, fog: 0x120a0a, density: 0.05 },
  { id: 'c3_stairs', minX: 22.5, maxX: 25.5, minZ: 30, maxZ: 40, minY: -5, maxY: 4, fog: 0x08080a, density: 0.08 },
  { id: 'c3_archive', minX: 14, maxX: 36, minZ: 40, maxZ: 58, minY: -6, maxY: 0, fog: 0x0a0b0c, density: 0.07 },
];
const INDOOR = new Set(['c3_lodge', 'c3_secretaria', 'c3_hall', 'c3_stairs', 'c3_archive']);
// símbolos dos discos do portão do arquivo (a ordem certa está no Regimento, art. 7º)
export const DIAL_SYMBOLS = ['CINZA', 'OLHO', 'VÉU', 'CHAMA'];

export class SedeLevel {
  constructor(game) {
    this.game = game;
    this.M = game.materials;
    this.b = new LevelBuilder(game.scene, game.col, game.materials);
    this.doors = {};
    this.lights = { power: [], emergency: [], flicker: [], all: [] };
    this.fires = [];
    this.pickupMeshes = {};
    this.drawers = {};
    this.dials = [];
    this.zone = null;
  }

  build() {
    this._largo();
    this._lodge();
    this._hall();
    this._secretaria();
    this._stairs();
    this._archive();
    this._doors();
    this._lights();
    this._rain();
    this._nav();
    return this;
  }

  lamp(...a) { return HospitalLevel.prototype.lamp.apply(this, a); }
  sign(...a) { return HospitalLevel.prototype.sign.apply(this, a); }

  // ---------- LARGO DO VÉU x0..24 z0..12 (exterior, fim da Linha 4) ----------
  _largo() {
    const b = this.b, Y = GROUND;
    b.floor(0, 0, 24, 9.4, Y, 'stone', 'c3_largo');
    b.floor(0, 9.4, 24, 12, Y, 'concrete', 'c3_adro');                 // adro diante da fachada
    for (const z of [2.0, 3.0]) b.box(0, Y, z - 0.05, 22, Y + 0.05, z + 0.05, 'rust', { collide: false }); // trilhos
    // muros do largo: casarões fechados ao sul, muro alto a oeste e a leste (até a portaria)
    b.box(-0.6, Y, -1, 0, Y + 5, 12, 'brick');
    const houses = [[0, 8, 7.2, 'wall'], [8, 15, 8.0, 'brick'], [15, 24, 6.8, 'wallLower']];
    for (const [x0, x1, h, mat] of houses) {
      b.box(x0, Y, -3, x1, Y + h, 0, mat);
      b.box(x0, Y + h, -3.2, x1, Y + h + 0.25, 0.25, 'woodDark', { collide: false });
      for (const wx of [x0 + 1.5, x1 - 1.5]) b.box(wx - 0.45, Y + 2.6, -0.02, wx + 0.45, Y + 3.8, 0.04, 'glass', { collide: false });
    }
    b.box(24, Y, -1, 24.6, Y + 5, 4, 'brick');
    // bonde da Linha 4 parado no fim da linha (trouxe Elias), janelas acesas
    b.box(1.2, Y, 1.4, 9.6, Y + 2.7, 3.6, 'rust', { cast: true });
    b.box(1.0, Y + 2.7, 1.3, 9.8, Y + 2.9, 3.7, 'woodDark', { collide: false });
    for (let x = 2; x < 9.4; x += 1.4) b.box(x, Y + 1.4, 3.6, x + 1.0, Y + 2.2, 3.64, 'lampOn', { collide: false });
    b.box(9.6, Y, 2.0, 9.9, Y + 1.0, 3.0, 'metal', { tag: 'prop-low', sight: false });
    this.sign('LINHA 4 — LARGO DO VÉU', 5.4, Y + 2.45, 3.66, 0, 1.8, 0.24, { bg: '#2a2016', fg: '#d0a060' });
    // poste do ponto final e bancos de pedra
    b.box(11.9, Y, 4.4, 12.1, Y + 3.6, 4.6, 'metal', { tag: 'prop' });
    b.box(15, Y, 4.6, 17.4, Y + 0.5, 5.2, 'stone', { tag: 'prop-low', sight: false });
    b.box(18.8, Y, 1.2, 20.2, Y + 0.9, 2.4, 'woodDark', { tag: 'prop-low', sight: false }); // caixote
    // FACHADA DA SEDE (z = 12): pedra clara, colunas, frontão e as portas de bronze no centro (x = 12)
    b.wallX(12, 0, 24, Y, Y + 9, [12], 'marble', 2.4, 3.2);
    for (const x of [7, 10, 14, 17]) b.box(x - 0.35, Y, 11.3, x + 0.35, Y + 6.2, 11.9, 'marble', { tag: 'prop' });
    b.box(5.5, Y + 6.2, 11.0, 18.5, Y + 6.8, 11.9, 'marble', { collide: false });
    b.box(9.5, Y, 10.6, 14.5, Y + 0.12, 11.9, 'marble', { collide: false }); // degrau
    this.sign('INSTITUTO DE BENEMERÊNCIA DE VÉSPERA', 12, Y + 6.5, 10.98, Math.PI, 4.4, 0.36, { bg: '#2a2622', fg: '#c8b080' });
    this.sign('· MCMIX ·', 12, Y + 4.2, 11.89, Math.PI, 1.2, 0.2, { bg: '#2a2622', fg: '#a89060' });
    // véu de pedra esculpido acima das portas (o símbolo da Confraria, escondido à vista)
    b.box(11.2, Y + 3.5, 11.86, 12.8, Y + 4.0, 11.9, 'veil', { collide: false });
    // lampiões a gás do largo
    for (const [x, z] of [[4, 8.5], [20, 8.5]]) {
      b.box(x - 0.06, Y, z - 0.06, x + 0.06, Y + 3.6, z + 0.06, 'metal', { tag: 'prop' });
      b.box(x - 0.16, Y + 3.5, z - 0.16, x + 0.16, Y + 3.85, z + 0.16, 'lampOn', { collide: false });
    }
    this.sign('PORTARIA →', 22.6, Y + 2.2, 11.88, Math.PI, 1.1, 0.22, { bg: '#c9c2a4', fg: '#3a1010' });
  }

  // ---------- PORTARIA x24..30 z4..12 (postigo a oeste, porta para o salão ao norte) ----------
  _lodge() {
    const b = this.b, Y = GROUND;
    b.floor(24, 4, 30, 12, Y, 'woodDark', 'c3_lodge');
    b.ceiling(24, 4, 30, 12, Y + H_LODGE);
    b.wallZ(24, 4, 12, Y, Y + H_LODGE + 2, [8], 'marble', 1.2, 2.2);         // postigo (x = 24, z = 8)
    b.box(23.7, Y + 1.5, 7.5, 23.8, Y + 1.8, 8.5, 'brass', { collide: false }); // portinhola de latão
    b.wallZ(30, 4, 12, Y, Y + H_LODGE, [], 'wall');
    b.wallX(4, 24, 30, Y, Y + H_LODGE, [], 'wall');
    // balcão do porteiro, cadeira, quadro de fitas e o livro de registros
    b.box(27.6, Y, 4.4, 29.8, Y + 1.0, 6.2, 'woodDark', { tag: 'prop-low', sight: false });
    b.box(28.2, Y, 6.6, 28.9, Y + 0.5, 7.3, 'wood', { tag: 'prop-low', sight: false });
    b.box(29.86, Y + 1.4, 6.8, 29.9, Y + 2.4, 9.0, 'woodDark', { collide: false });
    for (let z = 7.0; z < 8.9; z += 0.3) b.box(29.8, Y + 1.6, z, 29.84, Y + 2.1, z + 0.05, 'altarCloth', { collide: false }); // fitas
    this.sign('SÓ COM A FITA', 29.82, Y + 2.6, 7.9, -Math.PI / 2, 1.2, 0.2, { bg: '#2a2016', fg: '#c84030' });
    b.box(28.6, Y, 10.0, 29.8, Y + 0.95, 11.2, 'woodDark', { tag: 'prop-low', sight: false }); // estante do livro de registros
  }

  // ---------- SALÃO NOBRE x6..30 z12..30, pé-direito 7 ----------
  _hall() {
    const b = this.b, Y = GROUND;
    b.floor(6, 12, 30, 30, Y, 'marble', 'c3_hall');
    b.ceiling(6, 12, 30, 30, Y + H_HALL);
    b.wallX(12, 24, 30, Y, Y + H_HALL, [27], 'marble', 1.4, 2.3);           // parede da portaria (porta x = 27)
    b.wallZ(6, 12, 30, Y, Y + H_HALL, [], 'marble');
    b.wallZ(30, 12, 30, Y, Y + H_HALL, [], 'marble');
    b.wallX(30, 6, 17, Y, Y + H_HALL, [10], 'marble', 1.4, 2.3);            // secretaria (x = 10)
    b.wallX(30, 17, 30, Y, Y + H_HALL, [24], 'marble', 2.6, 3.0);           // portão do arquivo (x = 24)
    // tapete vermelho do portal ao fundo e colunas
    b.box(10.8, Y, 12.4, 13.2, Y + 0.02, 29.6, 'velvet', { collide: false });
    b.box(13.2, Y, 21.0, 26, Y + 0.02, 22.4, 'velvet', { collide: false });
    for (const [x, z] of [[9, 17], [15.5, 17], [20.5, 17], [27, 17], [9, 25], [15.5, 25], [20.5, 25], [27, 25]]) {
      b.box(x - 0.45, Y, z - 0.45, x + 0.45, Y + H_HALL, z + 0.45, 'marble', { tag: 'prop' });
      b.box(x - 0.6, Y, z - 0.6, x + 0.6, Y + 0.3, z + 0.6, 'stone', { collide: false });
    }
    // estátua velada no centro (pedestal + figura coberta)
    b.box(17.2, Y, 20.2, 18.8, Y + 1.0, 23.2, 'stone', { tag: 'prop' });
    b.box(17.5, Y + 1.0, 20.9, 18.5, Y + 2.9, 22.5, 'veil', { collide: false, cast: true });
    b.box(17.7, Y + 2.9, 21.3, 18.3, Y + 3.4, 22.1, 'veil', { collide: false });
    this.sign('A CINZA LEMBRA', 18, Y + 0.6, 20.18, Math.PI, 1.2, 0.2, { bg: '#2a2622', fg: '#c8b080' });
    // retratos dos fundadores nas paredes laterais
    for (const z of [15, 20, 25]) {
      b.box(6.1, Y + 2.6, z - 0.7, 6.16, Y + 4.4, z + 0.7, 'woodDark', { collide: false });
      b.box(6.16, Y + 2.8, z - 0.55, 6.2, Y + 4.2, z + 0.55, 'veil', { collide: false });
    }
    // bancos de espera e a tranca das portas de bronze (lado de dentro)
    b.box(6.3, Y, 13.5, 7.3, Y + 0.5, 16, 'pew', { tag: 'prop-low', sight: false });
    b.box(28.7, Y, 19, 29.7, Y + 0.5, 23, 'pew', { tag: 'prop-low', sight: false });
    this.mainBar = b.box(10.6, Y + 1.3, 12.12, 13.4, Y + 1.5, 12.3, 'woodDark', { collide: false });
    // painel do portão do arquivo: três discos de latão (esq. → dir.) e a alavanca
    this.sign('ARQUIVO — SÓ O ARQUIVISTA', 24, Y + 3.5, 29.88, Math.PI, 2.4, 0.28, { bg: '#2a2622', fg: '#c8b080' });
    b.box(19.9, Y + 0.9, 29.82, 22.9, Y + 2.1, 29.9, 'woodDark', { collide: false });
    for (let i = 0; i < 3; i++) {
      const x = 20.4 + i * 1.0;
      const gr = new THREE.Group(); gr.position.set(x, Y + 1.5, 29.78);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 12), this.M.brass); disc.rotation.x = Math.PI / 2; gr.add(disc);
      const mark = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.04), this.M.veil); mark.position.set(0, 0.17, -0.04); gr.add(mark);
      this.b.group.add(gr);
      const label = this.sign(DIAL_SYMBOLS[3], x, Y + 1.05, 29.8, Math.PI, 0.6, 0.14, { bg: '#2a2622', fg: '#d8b860' });
      this.dials.push({ gr, label, value: 3, x });
    }
    b.box(26.0, Y + 0.8, 29.8, 26.6, Y + 2.0, 29.9, 'metal', { collide: false });
    this.lever = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), this.M.brass);
    this.lever.position.set(26.3, Y + 1.6, 29.7); this.lever.rotation.x = -0.5; this.b.group.add(this.lever);
  }
  /** atualiza o símbolo e o ângulo de um disco (0..3) */
  setDial(i, v) {
    const d = this.dials[i]; if (!d) return;
    d.value = v; d.gr.rotation.z = -v * Math.PI / 2;
    const c = d.label.material.map.image, g = c.getContext('2d');
    g.fillStyle = '#2a2622'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#d8b860'; g.font = `bold ${Math.floor(c.height * 0.62)}px monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(DIAL_SYMBOLS[v], c.width / 2, c.height / 2 + 1);
    d.label.material.map.needsUpdate = true;
  }

  // ---------- SECRETARIA x6..14 z30..38 ----------
  _secretaria() {
    const b = this.b, Y = GROUND;
    b.floor(6, 30, 14, 38, Y, 'woodDark', 'c3_sec');
    b.ceiling(6, 30, 14, 38, Y + H_SEC);
    b.wallZ(6, 30, 38, Y, Y + H_SEC, [], 'wall');
    b.wallZ(14, 30, 38, Y, Y + H_SEC, [], 'wall');
    b.wallX(38, 6, 14, Y, Y + H_SEC, [], 'wall');
    // mesas de datilografia, arquivos de aço e o regimento emoldurado na parede do fundo
    b.box(11.6, Y, 33.2, 13.4, Y + 0.8, 35.0, 'woodDark', { tag: 'prop-low', sight: false });
    b.box(7.0, Y, 33.6, 8.8, Y + 0.8, 35.2, 'woodDark', { tag: 'prop-low', sight: false });
    b.box(12.0, Y + 0.8, 33.5, 12.6, Y + 1.05, 34.0, 'metal', { collide: false }); // máquina de escrever
    for (const x of [6.4, 7.4]) b.box(x, Y, 36.6, x + 0.9, Y + 1.9, 37.8, 'doorMetal', { tag: 'prop' });
    b.box(12.4, Y, 36.8, 13.8, Y + 2.1, 37.8, 'woodDark', { tag: 'prop' });
    b.box(9.3, Y + 1.2, 37.86, 10.9, Y + 2.3, 37.9, 'woodDark', { collide: false });
    this.sign('REGIMENTO', 10.1, Y + 2.45, 37.88, Math.PI, 1.0, 0.16, { bg: '#2a2622', fg: '#c8b080' });
  }

  // ---------- ESCADA DO ARQUIVO x22.6..25.4 z30..40 (y 0 → −4.5) ----------
  _stairs() {
    const b = this.b;
    b.floor(22.6, 30, 25.4, 30.6, GROUND, 'stone', 'c3_stair_top');
    b.stairsZ(22.7, 25.3, 30.6, 40, GROUND, ARCH, 18, 'stone');
    b.wallZ(22.6, 30, 40, ARCH, GROUND + 3.4, [], 'stone');
    b.wallZ(25.4, 30, 40, ARCH, GROUND + 3.4, [], 'stone');
    b.ceiling(22.5, 30, 25.5, 35, GROUND + 3.0, 'stone');
    b.ceiling(22.5, 35, 25.5, 40, GROUND + 0.6, 'stone');
    b.box(22.75, GROUND - 1.0, 30.6, 22.85, GROUND - 0.9, 40, 'brass', { collide: false }); // corrimão
  }

  // ---------- ARQUIVOS SUBTERRÂNEOS x14..36 z40..58 (y −4.5) ----------
  _archive() {
    const b = this.b, Y = ARCH;
    b.floor(14, 40, 36, 58, Y, 'stone', 'c3_archive');
    b.ceiling(14, 40, 36, 58, Y + H_ARCH, 'stone');
    b.wallX(40, 14, 36, Y, Y + H_ARCH, [24], 'stone', 2.6, 3.0);
    b.wallZ(14, 40, 58, Y, Y + H_ARCH, [], 'stone');
    b.wallZ(36, 40, 58, Y, Y + H_ARCH, [], 'stone');
    b.wallX(58, 14, 36, Y, Y + H_ARCH, [25], 'stone', 2.0, 2.6);           // grade da cripta (x = 25)
    // estantes altas (tapam a visão), corredor central x 22.5..26.5, passagens em z 48.4..50
    for (const x of [17.6, 20.6, 28.4, 31.4]) {
      for (const [z0, z1] of [[43, 48.4], [50, 55.4]]) {
        b.box(x - 0.4, Y, z0, x + 0.4, Y + 2.9, z1, 'woodDark', { tag: 'prop' });
        for (let k = 0; k < 4; k++) b.box(x - 0.42, Y + 0.3 + k * 0.7, z0 + 0.1, x + 0.42, Y + 0.6 + k * 0.7, z1 - 0.1, k % 2 ? 'paper' : 'leather', { collide: false });
      }
    }
    // fichário de gavetas no fundo leste (letra V) e a mesa de leitura com o livro de registros
    b.box(34.6, Y, 54.4, 35.8, Y + 1.6, 57.6, 'doorMetal', { tag: 'prop' });
    for (let z = 54.6; z < 57.4; z += 0.45) b.box(34.56, Y + 0.3, z, 34.6, Y + 1.4, z + 0.35, 'brass', { collide: false });
    this.sign('E — V', 34.55, Y + 1.8, 56, -Math.PI / 2, 0.8, 0.16, { bg: '#2a2622', fg: '#c8b080' });
    b.box(15.0, Y, 41.0, 16.6, Y + 0.8, 42.4, 'woodDark', { tag: 'prop-low', sight: false });
    b.box(26.4, Y, 44.0, 27.4, Y + 0.8, 45.2, 'woodDark', { tag: 'prop-low', sight: false }); // mesa de leitura do corredor
    // grade da cripta: barras e o selo da chama
    for (let x = 24.1; x <= 25.95; x += 0.25) b.box(x, Y, 58.25, x + 0.05, Y + 2.6, 58.3, 'rust', { collide: false });
    this.sign('CRIPTA — O SACRISTÃO', 25, Y + 3.0, 57.88, Math.PI, 1.8, 0.24, { bg: '#2a1010', fg: '#d0a060' });
    b.box(24.0, Y - 0.3, 58.4, 26.0, Y + 0.0, 60, 'stone', { collide: false });
    this.sign('ARQUIVO GERAL', 24, Y + 3.3, 40.12, 0, 1.6, 0.24, { bg: '#2a2622', fg: '#c8b080' });
  }

  _doors() {
    const ctx = { materials: this.M, group: this.b.group, col: this.game.col, audio: this.game.audio, bus: this.game.bus };
    const D = (o) => (this.doors[o.id] = new Door({ mat: this.M.door, ...o }, ctx));
    D({ id: 'c3_main', axis: 'x', x: 12, y: GROUND, z: 12, width: 2.4, height: 3.2, kind: 'sliding', mat: this.M.brass, locked: true,
      lockMsg: 'As portas de bronze estão trancadas por dentro. Do outro lado, uma tranca de madeira.', label: 'portas de bronze' });
    D({ id: 'c3_wicket', axis: 'z', x: 24, y: GROUND, z: 8, width: 1.2, height: 2.2, swing: 1, mat: this.M.woodDark, locked: true,
      lockMsg: 'O postigo da portaria. Lá de dentro, uma voz: "A fita."', label: 'postigo da portaria' });
    D({ id: 'c3_lodge', axis: 'x', x: 27, y: GROUND, z: 12, swing: 1, mat: this.M.woodDark, label: 'porta do salão' });
    D({ id: 'c3_secret', axis: 'x', x: 10, y: GROUND, z: 30, swing: 1, mat: this.M.woodDark, label: 'porta da secretaria' });
    D({ id: 'c3_vault', axis: 'x', x: 24, y: GROUND, z: 30, width: 2.6, height: 3.0, kind: 'sliding', mat: this.M.doorMetal, locked: true,
      lockMsg: 'O portão do arquivo não tem fechadura: três discos de segredo e uma alavanca, à esquerda e à direita.', label: 'portão do arquivo' });
    D({ id: 'c3_crypt', axis: 'x', x: 25, y: ARCH, z: 58, width: 2.0, height: 2.6, kind: 'sliding', mat: this.M.rust, locked: true,
      lockMsg: 'Atrás da grade, degraus descem para a cripta. Um cântico grave sobe — e, no meio dele, a voz de Inês. A grade não cede.', label: 'grade da cripta' });
  }

  _lights() {
    this.game.scene.add(new THREE.HemisphereLight(0x303848, 0x0a0806, 0.45));
    const gas = 0xffb060, Y = GROUND;
    for (const [x, z] of [[4, 8.5], [20, 8.5]]) { const L = this.lamp(x, Y + 3.7, z, gas, 1.5, 10, { flicker: true }); L.fixture.visible = false; }
    this.lamp(5.4, Y + 2.4, 2.5, 0xffd9a0, 0.9, 6);                         // interior do bonde
    const moon = this.lamp(12, Y + 8.5, 6, 0x7088b0, 0.7, 16); moon.fixture.visible = false;
    this.lamp(27, Y + H_LODGE - 0.1, 8, 0xffc070, 1.1, 7, { flicker: true }); // portaria
    this.lamp(12, Y + H_HALL - 0.3, 18, 0xffc880, 1.3, 13);                    // lustres do salão
    this.lamp(24, Y + H_HALL - 0.3, 24, 0xffb870, 1.2, 13, { flicker: true });
    this.lamp(10, Y + H_SEC - 0.1, 34, 0xffcc88, 1.0, 7);                      // secretaria
    this.lamp(24, Y + 2.6, 33, 0xd09a60, 0.6, 6, { flicker: true });           // escada
    this.lamp(24, ARCH + H_ARCH - 0.1, 44, 0xe0c090, 1.0, 10);                 // arquivo
    this.lamp(24, ARCH + H_ARCH - 0.1, 52, 0xd0b080, 0.9, 10, { flicker: true });
    this.lamp(33, ARCH + H_ARCH - 0.1, 55, 0xc09060, 0.8, 7, { flicker: true });
    this.lamp(25, ARCH + 2.4, 57.4, 0xff6030, 0.8, 6, { flicker: true, mat: this.M.ember }); // brilho da cripta
  }

  // ---------- garoa de cinza no largo (pontos que acompanham o jogador) ----------
  _rain() {
    const N = 600, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 24; pos[i * 3 + 1] = Math.random() * 9; pos[i * 3 + 2] = (Math.random() - 0.5) * 24; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0x8a8e98, size: 0.05, sizeAttenuation: true, transparent: true, opacity: 0.7, depthWrite: false });
    this.rain = new THREE.Points(geo, mat); this.rain.frustumCulled = false; this.rain.name = 'garoa';
    this.game.scene.add(this.rain);
  }
  _updateRain(dt, t) {
    const p = this.game.player?.pos; if (!p || !this.rain) return;
    const outside = !INDOOR.has(this.zone);
    this.rain.visible = outside;
    if (!outside) return;
    const a = this.rain.geometry.attributes.position, arr = a.array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 1] -= dt * (2.2 + (i % 5) * 0.3);
      arr[i] += dt * 0.3 * Math.sin(t * 0.5 + i);
      if (arr[i + 1] < 0) arr[i + 1] += 9;
    }
    a.needsUpdate = true;
    this.rain.position.set(p.x, p.y, p.z);
  }

  _nav() {
    const n = this.game.nav, d = this.doors;
    const N = (id, x, y, z) => n.addNode(id, x, y, z);
    // largo
    N('l0', 6, GROUND, 6); N('l1', 12, GROUND, 7); N('l2', 18, GROUND, 7); N('l3', 22.6, GROUND, 8); N('l4', 12, GROUND, 10.8);
    // portaria
    N('p0', 25.4, GROUND, 8); N('p1', 27, GROUND, 9); N('p2', 27, GROUND, 10.8);
    // salão
    N('h0', 27, GROUND, 13.4); N('h1', 24, GROUND, 14.5); N('h2', 12, GROUND, 13.4); N('h3', 12, GROUND, 21); N('h4', 24, GROUND, 21);
    N('h5', 12, GROUND, 28); N('h6', 24, GROUND, 28.4); N('h7', 18, GROUND, 27.8); N('h8', 18, GROUND, 14.5); N('h9', 10, GROUND, 28.6);
    // secretaria
    N('s0', 10, GROUND, 31.4); N('s1', 10, GROUND, 35.6);
    // escada e arquivo
    N('e0', 24, GROUND, 31); N('e1', 24, -2.2, 35.3); N('e2', 24, ARCH, 40.6);
    N('a0', 24, ARCH, 42); N('a1', 24.5, ARCH, 49.2); N('a2', 24.5, ARCH, 56.4); N('a3', 19.1, ARCH, 49.2); N('a4', 29.9, ARCH, 49.2);
    N('a5', 33, ARCH, 56.4); N('a6', 16, ARCH, 44); N('a7', 33, ARCH, 42.2); N('a8', 16, ARCH, 56.4);
    const L = (a, b, door) => n.link(a, b, door);
    L('l0', 'l1'); L('l1', 'l2'); L('l2', 'l3'); L('l1', 'l4');
    L('l3', 'p0', d.c3_wicket); L('p0', 'p1'); L('p1', 'p2');
    L('p2', 'h0', d.c3_lodge); L('h0', 'h1'); L('l4', 'h2', d.c3_main);
    L('h1', 'h8'); L('h8', 'h2'); L('h2', 'h3'); L('h1', 'h4'); L('h3', 'h5'); L('h4', 'h6'); L('h5', 'h7'); L('h7', 'h6'); L('h5', 'h9');
    L('h9', 's0', d.c3_secret); L('s0', 's1');
    L('h6', 'e0', d.c3_vault); L('e0', 'e1'); L('e1', 'e2'); L('e2', 'a0');
    L('a0', 'a1'); L('a1', 'a2'); L('a1', 'a3'); L('a1', 'a4'); L('a4', 'a5'); L('a2', 'a5'); L('a0', 'a6'); L('a0', 'a7'); L('a2', 'a8'); L('a3', 'a6');
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
    if (this.leverT > 0) { this.leverT = Math.max(0, this.leverT - dt); this.lever.rotation.x = -0.5 + Math.sin((1 - this.leverT) * Math.PI) * 1.0; }
    this._updateZone(dt);
    this._updateRain(dt, t);
  }
  pullLever() { this.leverT = 1; }
  zoneAt(p) {
    for (const z of SEDE_ZONES) if (p.x > z.minX && p.x < z.maxX && p.z > z.minZ && p.z < z.maxZ && p.y > z.minY && p.y < z.maxY) return z;
    return null;
  }
  _updateZone(dt) {
    const fog = this.game.scene.fog, p = this.game.player?.pos;
    if (!fog || !p) return;
    const z = this.zoneAt(p); this.zone = z ? z.id : null;
    const tgt = z || SEDE_FOG, k = Math.min(1, dt * 1.5);
    this._fogC = this._fogC || new THREE.Color();
    this._fogC.set(tgt.fog);
    fog.color.lerp(this._fogC, k);
    fog.density += (tgt.density - fog.density) * k;
    if (this.game.scene.background?.isColor) this.game.scene.background.copy(fog.color).multiplyScalar(0.8);
  }
}
