// Capítulo 6 — O Acervo · Museu de Ciências Proibidas (primeira fatia). A barcaça da galeria de descarga atraca na
// doca de carga do Museu; dali, o átrio (recepção, bustos, portas principais acorrentadas), o Salão de Exposição
// (vitrines quebráveis com placas de latão e dois espécimes de pé em vitrines de corpo inteiro), a porta-cofre da
// Ala de Conservação (três discos: o número de inventário da peça mais antiga), a conservação (mesas de restauro,
// tanques de formol) e o depósito das remessas, que termina na porta de ferro da Galeria do Colecionador.
// Mesma base modular (LevelBuilder/Door/Navigation), tudo procedural; um único piso em y = 0.
import * as THREE from 'three';
import { LevelBuilder } from '../../world/LevelBuilder.js';
import { Door } from '../../world/Doors.js';
import { HospitalLevel } from '../hospital/HospitalLevel.js';

const LIGHT_BUDGET = 12;
export const GROUND = 0;
const Y = GROUND;
export const DOCK = { minX: 8, maxX: 22, minZ: 0, maxZ: 8 };
export const ATRIUM = { minX: 4, maxX: 26, minZ: 8, maxZ: 22 };
export const HALL = { minX: 0, maxX: 30, minZ: 22, maxZ: 44 };
export const CONSERV = { minX: 30, maxX: 44, minZ: 26, maxZ: 40 };
export const STORAGE = { minX: 30, maxX: 44, minZ: 40, maxZ: 54 };
// porta-cofre da Ala de Conservação: três discos (0–9) e a alavanca, na parede leste do salão
export const VAULT_CODE = [4, 1, 8];
export const DIAL = { x: 29.72, y: 1.35, zs: [34.9, 35.4, 35.9], handleZ: 36.5 };
// porta da Galeria do Colecionador (fim da fatia) e a placa de latão ao lado
export const COLLECTOR_DOOR = { x: 37, z: 54 };
export const COLLECTOR_PLAQUE = { x: 38.6, y: 1.6, z: 53.86 };
// vitrines: low = pedestal + caixa de vidro (o pedestal continua bloqueando); tall = vitrine de corpo inteiro (um
// espécime de pé dentro — quebrada, libera a passagem). year/inv: placa de latão; fogged: vidro fosco de cinza (a
// placa interna só se lê com a vitrine quebrada); loot: o que fica exposto quando o vidro cai.
export const VITRINES = [
  { id: 'v_atrio', x: 21.6, z: 15.6, kind: 'low', name: 'Lembranças do Museu', exhibit: 'souvenir', loot: 'bandagem' },
  { id: 'v_cranio', x: 6, z: 27, kind: 'low', name: 'Crânio de cinza', year: 1811, inv: '207', exhibit: 'skull' },
  { id: 'v_mascara', x: 12, z: 27, kind: 'low', name: 'Máscara mortuária do fundador', year: 1866, inv: '330', exhibit: 'mask', loot: 'ammo' },
  { id: 'v_pulmao', x: 18, z: 27, kind: 'low', name: 'Pulmão petrificado de carvoeiro', year: 1847, inv: '152', exhibit: 'lung' },
  { id: 'v_tabuleiro', x: 24, z: 27, kind: 'low', name: 'Tabuleiro de ossos (com gaveta)', year: 1790, inv: '096', exhibit: 'board', loot: 'cache' },
  { id: 'v_relicario', x: 9, z: 37, kind: 'low', name: 'Relicário da Primeira Cinza', year: 1702, inv: '418', exhibit: 'relic', fogged: true },
  { id: 'v_coracao', x: 21, z: 37, kind: 'low', name: 'Coração em formol', year: 1902, inv: '512', exhibit: 'heart', loot: 'bandagem' },
  { id: 'v_esp1', x: 2.4, z: 33, kind: 'tall', name: 'Espécime nº 77 — "O Carvoeiro de Pé"', year: 1921, inv: '077', specimen: 'c6_esp1', face: Math.PI / 2 },
  { id: 'v_esp2', x: 27.6, z: 40.6, kind: 'tall', name: 'Espécime nº 88 — "A Lavadeira"', year: 1928, inv: '088', specimen: 'c6_esp2', face: -Math.PI / 2 },
];
export const VITRINE_HP = { low: 18, tall: 30 };

export const ACERVO_CHECKPOINTS = {
  c6_dock: { x: 15, y: GROUND, z: 2, yaw: 0 },
  c6_atrium: { x: 15, y: GROUND, z: 12.6, yaw: 0 },
  c6_hall: { x: 15, y: GROUND, z: 24.2, yaw: 0 },
  c6_conserv: { x: 32.6, y: GROUND, z: 36.8, yaw: 0 },
  c6_slice: { x: 37, y: GROUND, z: 51.6, yaw: 0 },
};

// névoa padrão: poeira parada de museu fechado
export const ACERVO_FOG = { fog: 0x0e0c0a, density: 0.04 };
export const ACERVO_ZONES = [
  { id: 'c6_doca', minX: 4, maxX: 26, minZ: -14, maxZ: 8, minY: -3, maxY: 8, fog: 0x0a1012, density: 0.055 },
  { id: 'c6_atrio', minX: 4, maxX: 26, minZ: 8, maxZ: 22, minY: -1, maxY: 9, fog: 0x100c0a, density: 0.035 },
  { id: 'c6_salao', minX: 0, maxX: 30, minZ: 22, maxZ: 44, minY: -1, maxY: 9, fog: 0x0e0c0b, density: 0.03 },
  { id: 'c6_conservacao', minX: 30, maxX: 44, minZ: 26, maxZ: 40, minY: -1, maxY: 6, fog: 0x0a100c, density: 0.05 },
  { id: 'c6_deposito', minX: 30, maxX: 44, minZ: 40, maxZ: 54, minY: -1, maxY: 7, fog: 0x0c0a08, density: 0.055 },
];

export class AcervoLevel {
  constructor(game) {
    this.game = game;
    this.M = game.materials;
    this.b = new LevelBuilder(game.scene, game.col, game.materials);
    this.doors = {};
    this.lights = { power: [], emergency: [], flicker: [], all: [] };
    this.pickupMeshes = {};
    this.zone = null;
    this.vitrines = {};
    this.dialWheels = [];
    this.waterMeshes = [];
  }

  build() {
    this._dock();
    this._atrium();
    this._hall();
    this._conservation();
    this._storage();
    for (const v of VITRINES) this._vitrine(v);
    this._doors();
    this._lights();
    this._nav();
    return this;
  }

  lamp(...a) { return HospitalLevel.prototype.lamp.apply(this, a); }
  sign(...a) { return HospitalLevel.prototype.sign.apply(this, a); }

  // ---------- DOCA DE CARGA x8..22 z0..8 (rio ao sul, barcaça atracada) ----------
  _dock() {
    const b = this.b, D = DOCK, M = this.M;
    b.floor(D.minX, D.minZ, D.maxX, D.maxZ, Y, 'wood', 'c6_doca');
    b.ceiling(D.minX, D.minZ + 2, D.maxX, D.maxZ, Y + 4.2, 'woodDark');
    b.box(D.minX - 0.2, Y, D.minZ - 0.2, D.minX, Y + 4.2, D.maxZ, 'brick');
    b.box(D.maxX, Y, D.minZ - 0.2, D.maxX + 0.2, Y + 4.2, D.maxZ, 'brick');
    // guarda-corpo da beira (o rio é só cenário: a barcaça já atracou)
    b.box(D.minX, Y, D.minZ - 0.2, D.maxX, Y + 1.05, D.minZ, 'rust');
    for (let x = D.minX + 0.5; x < D.maxX; x += 1.5) b.box(x, Y - 1.4, -0.5, x + 0.25, Y, -0.25, 'woodDark', { collide: false });
    // rio das Cinzas: lâmina preta parada
    const wg = new THREE.PlaneGeometry(30, 16, 12, 6); wg.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(wg, M.water || M.coal); water.position.set(15, Y - 1.1, -8); b.group.add(water);
    this.waterMeshes.push({ m: water, base: Float32Array.from(wg.attributes.position.array) });
    // barcaça: casco, cabine, as amarras e o caixote vazio da remessa
    b.box(10, Y - 1.4, -4.6, 17.5, Y - 0.35, -0.7, 'woodDark', { collide: false });
    b.box(15.2, Y - 0.35, -4.0, 17.0, Y + 1.0, -1.4, 'wood', { collide: false });
    b.box(11, Y - 0.35, -3.2, 12.2, Y + 0.4, -2.0, 'woodDark', { collide: false });
    b.box(12.4, Y - 0.2, -0.75, 12.5, Y + 0.95, -0.25, 'leatherDark', { collide: false });
    // pilhas de caixotes e um guindaste de mão na doca
    b.box(8.4, Y, 5.4, 10.2, Y + 1.2, 7.6, 'woodDark', { tag: 'prop' });
    b.box(8.6, Y + 1.2, 5.8, 9.8, Y + 2.0, 7.0, 'wood', { tag: 'prop' });
    b.box(19.8, Y, 1.2, 21.6, Y + 0.9, 3.0, 'wood', { tag: 'prop-low', sight: false });
    b.box(20.4, Y, 4.6, 21.0, Y + 3.6, 5.2, 'rust', { tag: 'prop' });
    b.box(17.8, Y + 3.3, 4.7, 21.0, Y + 3.5, 5.1, 'rust', { collide: false });
    this.sign('DOCA DE CARGA — ENTRADA DE PEÇAS', 15, Y + 3.2, 7.88, Math.PI, 2.6, 0.3, { bg: '#1c1810', fg: '#d8c088' });
  }

  // ---------- ÁTRIO x4..26 z8..22: recepção, bustos, bilheteria, portas principais (oeste, acorrentadas) ----------
  _atrium() {
    const b = this.b, A = ATRIUM;
    b.floor(A.minX, A.minZ, A.maxX, A.maxZ, Y, 'marble', 'c6_atrio');
    b.ceiling(A.minX, A.minZ, A.maxX, A.maxZ, Y + 7);
    b.wallX(8, A.minX, A.maxX, Y, Y + 7, [15], 'museumWall', 1.4, 2.3);
    b.wallZ(A.minX, A.minZ, A.maxZ, Y, Y + 7, [15], 'museumWall', 2.0, 2.8);
    b.box(A.maxX, Y, A.minZ, A.maxX + 0.2, Y + 7, A.maxZ, 'museumWall');
    b.wallX(22, A.minX, A.maxX, Y, Y + 7, [15], 'museumWall', 2.0, 2.8);
    // rodapé de madeira escura
    b.box(A.minX + 0.1, Y, A.minZ + 0.1, A.maxX - 0.1, Y + 0.25, A.minZ + 0.18, 'woodDark', { collide: false });
    // balcão da recepção
    b.box(12, Y, 14, 18, Y + 1.1, 15.2, 'woodDark', { tag: 'prop', sight: false });
    b.box(11.9, Y + 1.1, 13.9, 18.1, Y + 1.16, 15.3, 'marble', { collide: false });
    // bustos dos fundadores em pedestais
    for (const [x, z] of [[7, 12], [7, 19], [23, 12], [23, 19]]) {
      b.box(x - 0.35, Y, z - 0.35, x + 0.35, Y + 1.3, z + 0.35, 'marble', { tag: 'prop' });
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), this.M.stone); head.position.set(x, Y + 1.72, z); head.scale.set(0.9, 1.15, 1); b.group.add(head);
      b.box(x - 0.24, Y + 1.3, z - 0.16, x + 0.24, Y + 1.52, z + 0.16, 'stone', { collide: false });
    }
    // bilheteria (canto nordeste) e corrente nas portas principais
    b.box(19.5, Y, 20.2, 25.8, Y + 1.2, 21.8, 'woodDark', { tag: 'prop' });
    b.box(19.5, Y + 1.2, 21.6, 25.8, Y + 2.6, 21.8, 'glass', { collide: false });
    b.box(4.25, Y + 0.9, 14.0, 4.35, Y + 1.0, 16.0, 'rust', { collide: false });
    b.box(4.25, Y + 1.6, 14.0, 4.35, Y + 1.7, 16.0, 'rust', { collide: false });
    // tapete vermelho da entrada ao salão
    b.box(14.2, Y + 0.005, 8.2, 15.8, Y + 0.02, 21.8, 'velvet', { collide: false });
    this.sign('MUSEU DE CIÊNCIAS PROIBIDAS — FUNDADO EM 1702', 15, Y + 4.6, 21.88, Math.PI, 4.4, 0.4, { bg: '#20160c', fg: '#e0c890' });
    this.sign('SALÃO DE EXPOSIÇÃO', 15, Y + 3.1, 21.88, Math.PI, 2.0, 0.26, { bg: '#20160c', fg: '#e0c890' });
    this.sign('BILHETERIA', 22.6, Y + 2.9, 21.7, Math.PI, 1.4, 0.22, { bg: '#20160c', fg: '#e0c890' });
  }

  // ---------- SALÃO DE EXPOSIÇÃO x0..30 z22..44 (vitrines; porta-cofre da conservação a leste, z33) ----------
  _hall() {
    const b = this.b, H = HALL, M = this.M;
    b.floor(H.minX, H.minZ, H.maxX, H.maxZ, Y, 'parquet', 'c6_salao');
    b.ceiling(H.minX, H.minZ, H.maxX, H.maxZ, Y + 6.5);
    b.box(H.minX - 0.2, Y, H.minZ, H.minX, Y + 6.5, H.maxZ, 'museumWall');
    b.wallZ(H.maxX, H.minZ, H.maxZ, Y, Y + 6.5, [33], 'museumWall', 1.5, 2.5);
    b.box(H.minX - 0.2, Y, H.maxZ, H.maxX + 0.2, Y + 6.5, H.maxZ + 0.2, 'museumWall');
    // colunas
    for (const x of [7.5, 15, 22.5]) for (const z of [32, 42]) b.box(x - 0.35, Y, z - 0.35, x + 0.35, Y + 6.5, z + 0.35, 'marble');
    // painel do cofre: três discos de latão e a alavanca
    const pg = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 2.1), M.steelDark || M.metal); plate.position.set(0, 0, 0.7); pg.add(plate);
    for (let i = 0; i < 3; i++) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 10), M.brass || M.gold); w.rotation.z = Math.PI / 2; w.position.set(-0.07, 0.05, DIAL.zs[i] - 35); pg.add(w);
      const mark = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.03), M.coal); mark.position.set(-0.05, 0.12, 0); w.add(mark);
      this.dialWheels.push(w);
    }
    this.dialHandle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.1), M.steel || M.metal); this.dialHandle.position.set(-0.08, -0.05, DIAL.handleZ - 35); this.dialHandle.rotation.x = 0.5; pg.add(this.dialHandle);
    pg.position.set(DIAL.x + 0.12, DIAL.y, 35); b.group.add(pg);
    b.col.addBox(29.7, Y, 34.6, 29.9, Y + 1.8, 36.8, { tag: 'prop', blocksSight: false });
    this.sign('ALA DE CONSERVAÇÃO — SOMENTE PESSOAL', 29.88, Y + 2.9, 33, -Math.PI / 2, 2.4, 0.26, { bg: '#1a1410', fg: '#d8b880' });
    this.sign('Nº DE INVENTÁRIO', 29.86, Y + 2.0, 35.4, -Math.PI / 2, 1.2, 0.18, { bg: '#1a1410', fg: '#d8b880' });
    // estante do guia e cordão de veludo
    b.box(14.4, Y, 43.3, 15.6, Y + 1.0, 43.9, 'woodDark', { tag: 'prop-low', sight: false });
    this.sign('SALÃO DE EXPOSIÇÃO PERMANENTE', 15, Y + 4.2, 43.88, Math.PI, 3.2, 0.32, { bg: '#20160c', fg: '#e0c890' });
  }

  // ---------- ALA DE CONSERVAÇÃO x30..44 z26..40 ----------
  _conservation() {
    const b = this.b, C = CONSERV, M = this.M;
    b.floor(C.minX, C.minZ, C.maxX, C.maxZ, Y, 'tile', 'c6_conservacao');
    b.ceiling(C.minX, C.minZ, C.maxX, C.maxZ, Y + 3.6);
    b.box(C.minX, Y, C.minZ - 0.2, C.maxX + 0.2, Y + 3.6, C.minZ, 'wallLower');
    b.box(C.maxX, Y, C.minZ, C.maxX + 0.2, Y + 3.6, C.maxZ, 'wallLower');
    b.wallX(40, C.minX, C.maxX, Y, Y + 3.6, [37], 'wallLower', 1.3, 2.3);
    // mesa de restauro com frascos e a lupa
    b.box(34, Y, 29, 38, Y + 0.9, 30.5, 'steel', { tag: 'prop-low', sight: false });
    for (let i = 0; i < 5; i++) {
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.22, 8), M.glass); jar.position.set(34.4 + i * 0.7, Y + 1.01, 29.4); b.group.add(jar);
    }
    // tanques de formol (verde), um com a tampa aberta
    for (const z of [28.2, 30.4, 32.6, 34.8]) {
      b.box(42.2, Y, z, 43.8, Y + 2.0, z + 1.6, 'glass', { tag: 'prop' });
      const liquid = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.5, 1.4), new THREE.MeshLambertMaterial({ color: 0x4a6a30, transparent: true, opacity: 0.55, emissive: 0x0c1a04 }));
      liquid.position.set(43, Y + 0.8, z + 0.8); b.group.add(liquid);
    }
    // armário de ferramentas (livro de registros em cima) e maca de embalsamar
    b.box(30.2, Y, 37.8, 31.4, Y + 0.9, 39.6, 'woodDark', { tag: 'prop-low', sight: false });
    b.box(33, Y, 38.6, 35.4, Y + 0.85, 39.6, 'steel', { tag: 'prop-low', sight: false });
    this.sign('CONSERVAÇÃO E RESTAURO', 37, Y + 2.7, 26.12, 0, 2.2, 0.24, { bg: '#141a14', fg: '#c8d8b0' });
    this.sign('DEPÓSITO', 37, Y + 2.6, 39.88, Math.PI, 1.2, 0.22, { bg: '#141a14', fg: '#c8d8b0' });
  }

  // ---------- DEPÓSITO x30..44 z40..54 (caixotes das remessas; porta da Galeria do Colecionador ao norte) ----------
  _storage() {
    const b = this.b, S = STORAGE, M = this.M;
    b.floor(S.minX, S.minZ, S.maxX, S.maxZ, Y, 'concrete', 'c6_deposito');
    b.ceiling(S.minX, S.minZ, S.maxX, S.maxZ, Y + 5);
    b.box(S.minX - 0.2, Y, S.minZ, S.minX, Y + 5, S.maxZ, 'brick');
    b.box(S.maxX, Y, S.minZ, S.maxX + 0.2, Y + 5, S.maxZ, 'brick');
    b.box(S.minX - 0.2, Y + 3.6, S.minZ - 0.1, S.maxX + 0.2, Y + 5, S.minZ + 0.1, 'brick');
    b.wallX(54, S.minX - 0.2, S.maxX + 0.2, Y, Y + 5, [COLLECTOR_DOOR.x], 'brick', 2.0, 3.0);
    // caixotes empilhados
    b.box(34, Y, 44.6, 36.5, Y + 1.4, 47, 'woodDark', { tag: 'prop' });
    b.box(34.3, Y + 1.4, 45, 36, Y + 2.3, 46.6, 'wood', { tag: 'prop' });
    b.box(38, Y, 46.5, 40.5, Y + 1.2, 49, 'wood', { tag: 'prop' });
    b.box(42.8, Y, 45, 43.8, Y + 2.6, 49, 'woodDark', { tag: 'prop' });
    // a remessa nº 31: caixote aberto, tampa no chão, palha
    b.box(30.3, Y, 49, 31.3, Y + 0.9, 50.4, 'woodDark', { tag: 'prop-low', sight: false });
    b.box(30.2, Y, 50.6, 31.2, Y + 0.06, 52.0, 'wood', { collide: false });
    b.box(30.4, Y + 0.7, 49.1, 31.2, Y + 0.85, 50.3, 'ash', { collide: false });
    // arco de ferro e a placa de latão da Galeria
    b.box(35.6, Y + 3.0, 53.7, 38.4, Y + 3.4, 53.9, 'brass', { collide: false });
    const pl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 0.03), M.brass || M.gold); pl.position.set(COLLECTOR_PLAQUE.x, COLLECTOR_PLAQUE.y, COLLECTOR_PLAQUE.z); b.group.add(pl);
    this.sign('GALERIA DO COLECIONADOR', 37, Y + 3.7, 53.88, Math.PI, 2.6, 0.3, { bg: '#1a0e08', fg: '#e8c070' });
    this.sign('REMESSAS — CONFERIR LACRE', 31.2, Y + 2.6, 40.12, 0, 1.8, 0.22, { bg: '#1c1810', fg: '#d8c088' });
  }

  // ---------- vitrines (pedestal + vidro + cacos + peça + placa) ----------
  _vitrine(v) {
    const b = this.b, M = this.M, tall = v.kind === 'tall';
    const hx = tall ? 0.6 : 0.5, hz = tall ? 0.6 : 0.4;
    const base = tall ? 0.12 : 0.9, top = tall ? 2.5 : 1.7;
    const rec = { v, glass: null, shards: null, collider: null, broken: false, exhibit: null };
    b.box(v.x - hx, Y, v.z - hz, v.x + hx, Y + base, v.z + hz, tall ? 'marble' : 'woodDark', { collide: false });
    const gm = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, top - base, hz * 2), v.fogged ? (M.showcaseFog || M.glass) : (M.showcase || M.glass));
    gm.position.set(v.x, Y + (base + top) / 2, v.z); gm.renderOrder = 2; b.group.add(gm); rec.glass = gm;
    // moldura de latão
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(v.x + sx * hx - 0.03, Y + base, v.z + sz * hz - 0.03, v.x + sx * hx + 0.03, Y + top, v.z + sz * hz + 0.03, 'brass', { collide: false });
    b.box(v.x - hx, Y + top, v.z - hz, v.x + hx, Y + top + 0.05, v.z + hz, 'brass', { collide: false });
    // cacos no chão (aparecem quando quebra)
    const sg = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.12 + (i % 3) * 0.06, 0.01, 0.08 + (i % 2) * 0.07), M.shards || M.glass);
      const a = i * 2.39, r = 0.4 + (i % 4) * 0.22;
      s.position.set(v.x + Math.cos(a) * r, Y + (tall ? 0.01 : 0.01), v.z + Math.sin(a) * r); s.rotation.y = a; sg.add(s);
    }
    if (!tall) for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.01, 0.07), M.shards || M.glass); s.position.set(v.x - 0.2 + i * 0.2, Y + base + 0.01, v.z - 0.1 + (i % 2) * 0.15); sg.add(s); }
    sg.visible = false; b.group.add(sg); rec.shards = sg;
    // colisor: a vitrine baixa bloqueia inteira (pedestal + vidro); a alta só enquanto o vidro estiver inteiro
    rec.collider = this.game.col.addBox(v.x - hx, Y, v.z - hz, v.x + hx, Y + top, v.z + hz, { tag: 'prop', blocksSight: false });
    // placa de latão na frente (sul) do pedestal
    if (v.year) {
      const pz = tall ? v.z : v.z - hz - 0.01, px = tall ? v.x + (v.face > 0 ? hx + 0.01 : -hx - 0.01) : v.x;
      const pl = new THREE.Mesh(new THREE.BoxGeometry(tall ? 0.02 : 0.34, 0.12, tall ? 0.34 : 0.02), M.brass || M.gold);
      pl.position.set(px, Y + (tall ? 0.3 : 0.7), pz); b.group.add(pl);
    }
    rec.exhibit = this._exhibit(v, base);
    this.vitrines[v.id] = rec;
  }
  _exhibit(v, base) {
    const M = this.M, g = new THREE.Group(), y = Y + base;
    const add = (geo, mat, x, yy, z, s) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, yy, z); if (s) m.scale.set(...s); g.add(m); return m; };
    switch (v.exhibit) {
      case 'skull': add(new THREE.SphereGeometry(0.16, 8, 6), M.ash || M.stone, v.x, y + 0.22, v.z, [1, 1.1, 1.2]); add(new THREE.BoxGeometry(0.16, 0.08, 0.12), M.ash || M.stone, v.x, y + 0.08, v.z + 0.08); break;
      case 'mask': add(new THREE.BoxGeometry(0.26, 0.34, 0.06), M.wax || M.paper, v.x, y + 0.3, v.z); add(new THREE.BoxGeometry(0.3, 0.06, 0.2), M.velvet, v.x, y + 0.03, v.z); break;
      case 'lung': add(new THREE.SphereGeometry(0.12, 8, 6), M.coal, v.x - 0.1, y + 0.2, v.z, [1, 1.6, 0.8]); add(new THREE.SphereGeometry(0.12, 8, 6), M.coal, v.x + 0.1, y + 0.2, v.z, [1, 1.5, 0.8]); break;
      case 'board': add(new THREE.BoxGeometry(0.6, 0.05, 0.5), M.woodDark, v.x, y + 0.03, v.z); for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(0.05, 0.04, 0.05), M.bandage, v.x - 0.2 + (i % 3) * 0.2, y + 0.08, v.z - 0.1 + Math.floor(i / 3) * 0.2); break;
      case 'relic': add(new THREE.BoxGeometry(0.22, 0.28, 0.16), M.gold || M.brass, v.x, y + 0.14, v.z); add(new THREE.SphereGeometry(0.06, 6, 4), M.ember || M.ash, v.x, y + 0.34, v.z); break;
      case 'heart': add(new THREE.CylinderGeometry(0.13, 0.13, 0.36, 10), M.glass, v.x, y + 0.18, v.z); add(new THREE.SphereGeometry(0.08, 8, 6), M.velvet, v.x, y + 0.16, v.z, [1, 1.2, 0.9]); break;
      case 'souvenir': for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(0.12, 0.16, 0.04), M.paper, v.x - 0.3 + i * 0.2, y + 0.08, v.z + 0.1); break;
      default: break;
    }
    this.b.group.add(g);
    return g;
  }
  /** vidro estilhaçado: some o vidro, aparecem os cacos; a vitrine alta libera a passagem */
  breakVitrine(id) {
    const r = this.vitrines[id];
    if (!r || r.broken) return false;
    r.broken = true;
    r.glass.visible = false; r.shards.visible = true;
    if (r.v.kind === 'tall') r.collider.enabled = false;
    return true;
  }
  /** disco do cofre: d de 0 a 9 */
  setDial(i, d) { const w = this.dialWheels[i]; if (w) w.rotation.x = d * (Math.PI * 2 / 10); }

  _doors() {
    const ctx = { materials: this.M, group: this.b.group, col: this.game.col, audio: this.game.audio, bus: this.game.bus };
    const D = (o) => (this.doors[o.id] = new Door({ mat: this.M.door, ...o }, ctx));
    D({ id: 'c6_dock', axis: 'x', x: 15, y: GROUND, z: 8, width: 1.4, height: 2.3, swing: 1, mat: this.M.woodDark, label: 'porta da doca de carga' });
    D({ id: 'c6_main', axis: 'z', x: 4, y: GROUND, z: 15, width: 2.0, height: 2.8, swing: 1, mat: this.M.woodDark, locked: true,
      lockMsg: 'As portas principais do Museu estão acorrentadas por fora. Pela fresta, a praça vazia e a névoa. Visitante, esta noite, só entra pela doca.', label: 'portas principais' });
    D({ id: 'c6_hall', axis: 'x', x: 15, y: GROUND, z: 22, width: 2.0, height: 2.8, swing: 1, mat: this.M.woodDark, label: 'porta do Salão de Exposição' });
    D({ id: 'c6_vault', axis: 'z', x: 30, y: GROUND, z: 33, width: 1.5, height: 2.5, kind: 'sliding', mat: this.M.steelDark || this.M.doorMetal, locked: true,
      lockMsg: 'Porta-cofre de aço, sem fechadura: só os três discos de latão ao lado, sob a placa "Nº DE INVENTÁRIO".', label: 'porta-cofre da Ala de Conservação' });
    D({ id: 'c6_storage', axis: 'x', x: 37, y: GROUND, z: 40, width: 1.3, height: 2.3, swing: 1, mat: this.M.doorMetal || this.M.door, label: 'porta do depósito' });
    D({ id: 'c6_collector', axis: 'x', x: COLLECTOR_DOOR.x, y: GROUND, z: COLLECTOR_DOOR.z, width: 2.0, height: 3.0, kind: 'sliding', mat: this.M.rust || this.M.doorMetal, locked: true,
      lockMsg: 'Porta de ferro batido, trancada por dentro. Do outro lado, um relógio de pêndulo e uma voz baixa contando peças.', label: 'porta da Galeria do Colecionador' });
  }

  _lights() {
    this.game.scene.add(new THREE.HemisphereLight(0x3a3430, 0x0a0806, 0.5));
    const warm = 0xffc890, cold = 0xa8b8c8, sodium = 0xffa850, red = 0xff4030, formol = 0x9adf70;
    this.lamp(15, Y + 3.7, 5, sodium, 1.0, 10, { flicker: true });                     // doca
    const moon = this.lamp(13, Y + 6, -4, cold, 0.8, 16); moon.fixture.visible = false; // luar sobre o rio
    this.lamp(15, Y + 6.6, 15, warm, 1.3, 15);                                           // lustre do átrio
    this.lamp(8, Y + 3.6, 20, warm, 0.7, 8, { flicker: true });                         // átrio (oeste)
    this.lamp(8, Y + 6.0, 29, warm, 1.1, 13);                                            // salão
    this.lamp(22, Y + 6.0, 29, warm, 1.1, 13, { flicker: true });
    this.lamp(15, Y + 6.0, 39, warm, 1.1, 14);
    this.lamp(29.4, Y + 2.9, 34.2, red, 0.8, 7, { emergency: true });                   // painel do cofre
    this.lamp(36, Y + 3.5, 33, 0xe0e8d8, 1.0, 11, { flicker: true });                    // conservação
    this.lamp(41.6, Y + 2.4, 31.5, formol, 0.7, 7);                                      // tanques de formol
    this.lamp(37, Y + 4.8, 45, sodium, 1.0, 13, { flicker: true });                      // depósito
    this.lamp(37, Y + 3.3, 52.6, red, 0.9, 8, { emergency: true, flicker: true });       // porta da Galeria
  }

  _nav() {
    const n = this.game.nav, d = this.doors;
    const N = (id, x, z) => n.addNode(id, x, Y, z);
    N('d0', 15, 2); N('d1', 15, 6.6);
    N('a0', 15, 9.6); N('a1', 9, 10.6); N('a2', 21, 10.6); N('a3', 9.5, 18.6); N('a4', 20.5, 18.4); N('a5', 15, 20.6);
    N('h0', 15, 23.6); N('hW', 4.5, 23.8); N('hE', 26.5, 23.8);
    N('m0', 15, 30.6); N('mW', 4.5, 30.6); N('mE', 27, 30.6); N('vd', 28.8, 33);
    N('n0', 15, 34.6); N('nW', 4.5, 40.8); N('nC', 15, 40.6); N('nE', 25.4, 41.8);
    N('c0', 31.6, 33); N('c1', 33, 37.2); N('c2', 40, 37.2); N('c3', 40, 32.5); N('c4', 37, 38.6);
    N('s0', 37, 41.6); N('s1', 32, 43); N('s2', 41.8, 43); N('s3', 32.2, 51.6); N('s4', 41.8, 51); N('s5', 37, 52.2);
    const L = (a, b, door) => n.link(a, b, door);
    L('d0', 'd1'); L('d1', 'a0', d.c6_dock);
    L('a0', 'a1'); L('a0', 'a2'); L('a1', 'a3'); L('a2', 'a4'); L('a3', 'a5'); L('a4', 'a5');
    L('a5', 'h0', d.c6_hall);
    L('h0', 'hW'); L('h0', 'hE'); L('h0', 'm0'); L('hW', 'mW'); L('hE', 'mE'); L('m0', 'mW'); L('m0', 'mE'); L('m0', 'n0');
    L('mW', 'nW'); L('n0', 'nC'); L('nW', 'nC'); L('nC', 'nE'); L('mE', 'vd');
    L('vd', 'c0', d.c6_vault);
    L('c0', 'c1'); L('c0', 'c3'); L('c1', 'c4'); L('c2', 'c4'); L('c2', 'c3');
    L('c4', 's0', d.c6_storage);
    L('s0', 's1'); L('s0', 's2'); L('s1', 's3'); L('s2', 's4'); L('s3', 's5'); L('s4', 's5');
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
    for (const W of this.waterMeshes) {
      const a = W.m.geometry.attributes.position, arr = a.array, b0 = W.base;
      for (let i = 0; i < arr.length; i += 3) arr[i + 1] = b0[i + 1] + Math.sin(t * 1.1 + b0[i] * 0.6 + b0[i + 2] * 0.4) * 0.04;
      a.needsUpdate = true;
    }
    if (this.dialHandle?.userData.pull > 0) { this.dialHandle.userData.pull -= dt; this.dialHandle.rotation.x = this.dialHandle.userData.pull > 0 ? -0.5 : 0.5; }
    this._updateZone(dt);
  }
  zoneAt(p) {
    for (const z of ACERVO_ZONES) if (p.x > z.minX && p.x < z.maxX && p.z > z.minZ && p.z < z.maxZ && p.y > z.minY && p.y < z.maxY) return z;
    return null;
  }
  _updateZone(dt) {
    const fog = this.game.scene.fog, p = this.game.player?.pos;
    if (!fog || !p) return;
    const z = this.zoneAt(p); this.zone = z ? z.id : null;
    const tgt = z || ACERVO_FOG, k = Math.min(1, dt * 1.5);
    this._fogC = this._fogC || new THREE.Color();
    this._fogC.set(tgt.fog);
    fog.color.lerp(this._fogC, k);
    fog.density += (tgt.density - fog.density) * k;
    if (this.game.scene.background?.isColor) this.game.scene.background.copy(fog.color).multiplyScalar(0.8);
  }
}
