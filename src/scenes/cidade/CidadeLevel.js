// Capítulo 4 — Cidade Morta · centro antigo de Véspera (primeira fatia). Elias sobe das catacumbas por um bueiro
// num beco sem saída e sai na Rua do Comércio: vitrines cobertas de cinza, portas de enrolar arriadas e todos os
// relógios parados às 3h07. No fim da rua, um bonde tombado e uma barricada fecham a passagem para a Praça do
// Relógio. O caminho é pela Relojoaria Ponteiro (trancada — a chave ficou na Farmácia Central, do outro lado da
// rua), pelos fundos dela e pelo pátio até o arco da praça, onde o Vigia desce da varanda da Torre do Relógio.
// Mesma base modular dos capítulos anteriores (LevelBuilder/Door/Navigation), tudo procedural, chão em y = 0.
import * as THREE from 'three';
import { LevelBuilder } from '../../world/LevelBuilder.js';
import { Door } from '../../world/Doors.js';
import { HospitalLevel } from '../hospital/HospitalLevel.js';

const LIGHT_BUDGET = 12;
export const GROUND = 0;
const Y = GROUND;
const H_SHOP = 3.6;
// praça: arena do Vigia x0..30 z50..76; obstáculos de pedra que atordoam a investida (chafariz, pedestais, banca)
export const PLAZA = { minX: 0, maxX: 30, minZ: 50, maxZ: 76 };
export const PLAZA_OBSTACLES = [[15, 62], [6, 68], [24, 68], [24, 56]];
export const VIGIA_BALCONY = { x: 15, y: 9.25, z: 75.2 };
export const VIGIA_POS = { x: 15, y: GROUND, z: 74.4, yaw: Math.PI };

export const CIDADE_CHECKPOINTS = {
  c4_drain: { x: 7, y: GROUND, z: 3.6, yaw: 0 },
  c4_watch: { x: 16.2, y: GROUND, z: 33, yaw: -Math.PI / 2 },
  c4_plaza: { x: 14, y: GROUND, z: 51.2, yaw: 0 },
  c4_tower: { x: 15, y: GROUND, z: 78.4, yaw: 0 },
};

// névoa padrão: cinza parada sobre o centro antigo, esverdeada como vidro velho
export const CIDADE_FOG = { fog: 0x14161a, density: 0.05 };
export const CIDADE_ZONES = [
  { id: 'c4_farmacia', minX: -4, maxX: 4, minZ: 18, maxZ: 28, minY: -1, maxY: 4, fog: 0x0c0e0c, density: 0.065 },
  { id: 'c4_relojoaria', minX: 10, maxX: 18, minZ: 30, maxZ: 40, minY: -1, maxY: 4, fog: 0x0e0b08, density: 0.06 },
  { id: 'c4_torre', minX: 11, maxX: 19, minZ: 76, maxZ: 84, minY: -1, maxY: 20, fog: 0x08080a, density: 0.08 },
  { id: 'c4_praca', minX: 0, maxX: 30, minZ: 50, maxZ: 76, minY: -1, maxY: 20, fog: 0x171a1e, density: 0.042 },
];
const INDOOR = new Set(['c4_farmacia', 'c4_relojoaria', 'c4_torre']);

export class CidadeLevel {
  constructor(game) {
    this.game = game;
    this.M = game.materials;
    this.b = new LevelBuilder(game.scene, game.col, game.materials);
    this.doors = {};
    this.lights = { power: [], emergency: [], flicker: [], all: [] };
    this.fires = [];
    this.pickupMeshes = {};
    this.zone = null;
  }

  build() {
    this._street();
    this._pharmacy();
    this._watchShop();
    this._yard();
    this._plaza();
    this._tower();
    this._doors();
    this._lights();
    this._ash();
    this._nav();
    return this;
  }

  lamp(...a) { return HospitalLevel.prototype.lamp.apply(this, a); }
  sign(...a) { return HospitalLevel.prototype.sign.apply(this, a); }

  // mostrador de relógio parado às 3h07 (n = normal do mostrador no plano XZ)
  clockFace(x, y, z, r, rotY, parent) {
    const M = this.M, g = new THREE.Group();
    const face = new THREE.Mesh(new THREE.CircleGeometry(r, 20), M.paper); g.add(face);
    const rim = new THREE.Mesh(new THREE.RingGeometry(r, r * 1.12, 20), M.brass || M.metal); rim.position.z = 0.005; g.add(rim);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, t = new THREE.Mesh(new THREE.BoxGeometry(r * 0.05, r * 0.16, 0.01), M.coal);
      t.position.set(Math.sin(a) * r * 0.84, Math.cos(a) * r * 0.84, 0.01); t.rotation.z = -a; g.add(t);
    }
    // 3h07: ponteiro das horas pouco depois do 3, minutos no 7 (42°) — no sentido horário de quem olha
    const hand = (len, w, ang) => {
      const h = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.012), M.coal);
      h.geometry.translate(0, len / 2, 0); h.position.z = 0.02; h.rotation.z = -ang; g.add(h);
    };
    hand(r * 0.55, r * 0.07, (3 + 7 / 60) / 12 * Math.PI * 2);
    hand(r * 0.8, r * 0.045, 7 / 60 * Math.PI * 2);
    g.position.set(x, y, z); g.rotation.y = rotY;
    (parent || this.b.group).add(g);
    return g;
  }

  // porta de enrolar arriada numa fachada (decoração) + letreiro
  _shutter(x, z0, z1, side, name) {
    const b = this.b, d = side > 0 ? 0.04 : -0.04;
    b.box(Math.min(x, x + d), Y, z0, Math.max(x, x + d), Y + 2.6, z1, 'rust', { collide: false });
    for (let y = 0.3; y < 2.6; y += 0.3) b.box(Math.min(x, x + d * 1.5), Y + y, z0, Math.max(x, x + d * 1.5), Y + y + 0.03, z1, 'metal', { collide: false });
    if (name) this.sign(name, x + d * 2, Y + 3.0, (z0 + z1) / 2, side > 0 ? Math.PI / 2 : -Math.PI / 2, Math.min(2.4, z1 - z0), 0.34, { bg: '#2a2620', fg: '#b8a888' });
  }

  // ---------- BECO DO BUEIRO + RUA DO COMÉRCIO x4..10 z0..50 ----------
  _street() {
    const b = this.b;
    b.floor(4, 0, 10, 10, Y, 'concrete', 'c4_beco');
    b.floor(4, 10, 10, 50, Y, 'stone', 'c4_rua');
    // fundo do beco: prédio desabado (paredão de tijolo e entulho)
    b.box(4, Y, -0.6, 10, Y + 6, 0, 'brick');
    b.box(4.2, Y, 0, 6.4, Y + 1.0, 1.4, 'concrete', { tag: 'prop-low', sight: false });
    b.box(8.8, Y, 0, 10, Y + 0.6, 1.0, 'woodDark', { tag: 'prop-low', sight: false });
    // bueiro aberto por onde Elias saiu das catacumbas (tampa de ferro ao lado)
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.04, 12), this.M.coal); ring.position.set(7, Y + 0.02, 2.2); b.group.add(ring);
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 12), new THREE.MeshBasicMaterial({ color: 0x030303 })); hole.position.set(7, Y + 0.03, 2.2); b.group.add(hole);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.05, 12), this.M.rust); lid.position.set(5.9, Y + 0.03, 2.9); b.group.add(lid);
    // fachadas a oeste (x = 4): sobrados com portas de enrolar; a farmácia no meio (porta em z 23)
    b.box(3.6, Y, 0, 4, Y + 7, 18, 'wall');
    b.wallZ(4, 18, 28, Y, Y + 6.5, [23], 'wallLower', 1.4, 2.3);
    b.box(3.6, Y, 28, 4, Y + 7.5, 50, 'brick');
    // fachadas a leste (x = 10): a relojoaria entre z 30 e 40 (porta em z 35), o muro do pátio depois
    b.box(10, Y, 0, 10.4, Y + 6.5, 30, 'wallLower');
    b.wallZ(10, 30, 40, Y, Y + 6, [35], 'wall', 1.4, 2.3);
    b.box(10, Y, 40, 10.4, Y + 4, 50, 'brick');
    // vitrines e letreiros
    this._shutter(4.0, 4, 8, 1, 'ARMARINHO SÃO JOSÉ');
    this._shutter(4.0, 11, 16, 1, 'BARBEARIA');
    this._shutter(4.0, 31, 36, 1, 'CAFÉ CENTRAL');
    this._shutter(4.0, 39, 44, 1, 'CHAPELARIA');
    this._shutter(10.0, 3, 8, -1, 'TIPOGRAFIA');
    this._shutter(10.0, 12, 18, -1, 'ALFAIATARIA MODELO');
    this._shutter(10.0, 21, 27, -1, 'BAZAR');
    this.sign('FARMÁCIA CENTRAL', 4.06, Y + 2.9, 23, Math.PI / 2, 2.6, 0.4, { bg: '#1e3020', fg: '#c8e0b0' });
    b.box(4.0, Y + 0.9, 19.0, 4.06, Y + 2.2, 21.8, 'glass', { collide: false });
    b.box(4.0, Y + 0.9, 24.2, 4.06, Y + 2.2, 27.0, 'glass', { collide: false });
    this.sign('RELOJOARIA PONTEIRO', 9.94, Y + 2.9, 35, -Math.PI / 2, 2.6, 0.4, { bg: '#2a2010', fg: '#e0c070' });
    b.box(9.94, Y + 0.9, 31.0, 10.0, Y + 2.2, 33.8, 'glass', { collide: false });
    b.box(9.94, Y + 0.9, 36.2, 10.0, Y + 2.2, 39.0, 'glass', { collide: false });
    // relógio de rua pendurado na fachada da relojoaria — parado, como todos
    this.clockFace(9.6, Y + 4.4, 35, 0.55, -Math.PI / 2);
    this.sign('RUA DO COMÉRCIO', 4.06, Y + 3.4, 9.5, Math.PI / 2, 1.8, 0.26, { bg: '#20304a', fg: '#e0e0d0' });
    // calçadas e meio-fio
    b.box(4, Y, 10, 5.0, Y + 0.12, 50, 'concrete', { collide: false });
    b.box(9.0, Y, 10, 10, Y + 0.12, 50, 'concrete', { collide: false });
    // carro abandonado, coberto de cinza, e entulho
    b.box(7.6, Y, 15.5, 9.3, Y + 1.35, 19.6, 'rust', { tag: 'obstacle', cast: true });
    b.box(7.7, Y + 1.35, 16.6, 9.2, Y + 1.5, 18.6, 'ash', { collide: false });
    b.box(5.0, Y, 29.0, 6.2, Y + 0.8, 30.2, 'woodDark', { tag: 'prop-low', sight: false }); // caixote
    b.box(8.6, Y, 41.0, 9.6, Y + 1.0, 42.0, 'metal', { tag: 'prop-low', sight: false });   // lixeira
    // montes de cinza junto aos muros
    for (const [x, z, w] of [[4.3, 13, 1.2], [9.6, 24, 1.4], [4.4, 37, 1.0], [9.5, 45, 1.2]]) b.box(x - w / 2, Y, z - w, x + w / 2, Y + 0.2, z + w, 'ash', { collide: false });
    // lampiões a gás (postes)
    for (const [x, z] of [[5.2, 14], [8.8, 30], [5.2, 42]]) b.box(x - 0.06, Y, z - 0.06, x + 0.06, Y + 3.6, z + 0.06, 'metal', { tag: 'prop' });
    // BARRICADA: o bonde da Linha 2 tombado de lado atravessa a rua, com sacos e uma carroça
    b.box(4, Y, 46, 10, Y + 2.7, 48.6, 'rust', { tag: 'obstacle', cast: true });
    for (let x = 4.6; x < 9.6; x += 1.4) b.box(x, Y + 1.0, 45.96, x + 0.9, Y + 1.8, 46.0, 'glass', { collide: false }); // janelas viradas
    b.box(4, Y, 44.6, 6.4, Y + 0.8, 45.6, 'pantsGray', { tag: 'prop-low', sight: false });  // sacos de areia
    b.box(8.4, Y, 44.4, 10, Y + 1.4, 46, 'woodDark', { tag: 'obstacle' });                   // carroça
    this.sign('LINHA 2 — PRAÇA DO RELÓGIO', 7, Y + 2.2, 45.95, Math.PI, 2.6, 0.26, { bg: '#2a2016', fg: '#d0a060' });
  }

  // ---------- FARMÁCIA CENTRAL x−4..4 z18..28 ----------
  _pharmacy() {
    const b = this.b;
    b.floor(-4, 18, 4, 28, Y, 'tile', 'c4_farmacia');
    b.ceiling(-4, 18, 4, 28, Y + H_SHOP);
    b.wallZ(-4, 18, 28, Y, Y + H_SHOP, [], 'wallLower');
    b.wallX(18, -4, 4, Y, Y + H_SHOP, [], 'wallLower');
    b.wallX(28, -4, 4, Y, Y + H_SHOP, [], 'wallLower');
    // balcão de madeira (o caixa fica sobre ele) e as prateleiras de vidros atrás
    b.box(-1.2, Y, 19.4, -0.4, Y + 1.05, 26.0, 'woodDark', { tag: 'prop-low', sight: false });
    b.box(-4, Y, 19, -3.5, Y + 2.6, 27.4, 'woodDark', { tag: 'prop' });
    for (let z = 19.3; z < 27; z += 0.45) for (const y of [0.9, 1.5, 2.1]) b.box(-3.48, Y + y, z, -3.36, Y + y + 0.24, z + 0.18, 'glass', { collide: false });
    this.sign('MANIPULAÇÃO', -3.46, Y + 2.85, 23, Math.PI / 2, 1.4, 0.24, { bg: '#c9c2a4', fg: '#1e3020' });
    // caixa registradora (gaveta) e balança
    b.box(-1.05, Y + 1.05, 21.1, -0.55, Y + 1.35, 21.9, 'metal', { collide: false });
    b.box(-1.0, Y + 1.05, 24.4, -0.6, Y + 1.25, 24.9, 'brass', { collide: false });
    // mesinha da entrada, cadeira de espera e a vitrine de frascos quebrada
    b.box(2.4, Y, 18.4, 3.6, Y + 0.85, 19.6, 'wood', { tag: 'prop-low', sight: false });
    b.box(2.6, Y, 26.4, 3.4, Y + 0.5, 27.2, 'wood', { tag: 'prop-low', sight: false });
    b.box(0.6, Y, 27.2, 3.0, Y + 1.0, 27.8, 'glass', { tag: 'prop-low', sight: false });
    // relógio de parede, parado
    this.clockFace(1.0, Y + 2.6, 18.12, 0.3, 0);
  }

  // ---------- RELOJOARIA PONTEIRO x10..18 z30..40 (porta da rua a oeste, porta dos fundos ao norte) ----------
  _watchShop() {
    const b = this.b;
    b.floor(10, 30, 18, 40, Y, 'woodDark', 'c4_relojoaria');
    b.ceiling(10, 30, 18, 40, Y + H_SHOP);
    b.wallX(30, 10, 18, Y, Y + H_SHOP, [], 'wall');
    b.wallZ(18, 30, 40, Y, Y + H_SHOP, [], 'wall');
    b.wallX(40, 10, 18, Y, Y + H_SHOP, [14], 'wall');
    // vitrines de vidro (duas, deixando o corredor da porta) e a bancada do relojoeiro
    b.box(11.4, Y, 30.6, 12.4, Y + 1.0, 34.0, 'glass', { tag: 'prop-low', sight: false });
    b.box(11.4, Y, 36.0, 12.4, Y + 1.0, 39.4, 'glass', { tag: 'prop-low', sight: false });
    b.box(16.9, Y, 31.0, 17.9, Y + 0.95, 35.2, 'woodDark', { tag: 'prop-low', sight: false });
    b.box(17.1, Y + 0.95, 31.4, 17.4, Y + 1.2, 31.8, 'brass', { collide: false }); // lupa/torno
    // parede de relógios (todos às 3h07) e o relógio de pé no canto
    for (let i = 0; i < 6; i++) this.clockFace(17.88, Y + 1.7 + (i % 2) * 0.75, 36.0 + Math.floor(i / 2) * 1.2, 0.26, -Math.PI / 2);
    b.box(10.5, Y, 39.0, 11.3, Y + 2.4, 39.8, 'woodDark', { tag: 'prop' });
    this.clockFace(10.9, Y + 1.9, 38.98, 0.24, Math.PI);
    this.sign('CONSERTOS — PRONTOS ÀS 3H', 14, Y + 2.9, 30.12, 0, 2.2, 0.26, { bg: '#2a2010', fg: '#e0c070' });
  }

  // ---------- PÁTIO DOS FUNDOS x10..18 z40..50 (arco para a praça ao norte) ----------
  _yard() {
    const b = this.b;
    b.floor(10.4, 40, 18, 50, Y, 'concrete', 'c4_patio');
    b.box(18, Y, 40, 18.4, Y + 4.5, 50, 'brick');
    b.wallX(50, 10, 18, Y, Y + 4.5, [14], 'brick', 1.8, 2.9);
    b.box(12.9, Y + 2.9, 49.7, 15.1, Y + 3.2, 50.3, 'stone', { collide: false }); // verga do arco
    // caixotes e um varal com lençóis cinzentos
    b.box(16.4, Y, 43.4, 17.8, Y + 1.1, 44.8, 'woodDark', { tag: 'obstacle' });
    b.box(10.6, Y, 46.4, 11.8, Y + 0.9, 47.6, 'woodDark', { tag: 'prop-low', sight: false });
    for (const x of [10.8, 17.6]) b.box(x - 0.04, Y, 41.96, x + 0.04, Y + 2.4, 42.04, 'metal', { collide: false });
    b.box(10.8, Y + 2.3, 41.99, 17.6, Y + 2.32, 42.01, 'metal', { collide: false });
    for (const x of [12, 14.2, 16.1]) b.box(x, Y + 1.3, 41.98, x + 1.2, Y + 2.3, 42.02, 'sheet', { collide: false });
  }

  // ---------- PRAÇA DO RELÓGIO x0..30 z50..76 ----------
  _plaza() {
    const b = this.b;
    b.floor(0, 50, 30, 76, Y, 'stone', 'c4_praca');
    b.floor(4, 48.6, 10, 50, Y, 'stone', 'c4_praca_b');
    b.box(-0.4, Y, 49.6, 0, Y + 8, 76.4, 'wall');
    b.box(30, Y, 49.6, 30.4, Y + 8, 76.4, 'brick');
    b.box(0, Y, 49.6, 4, Y + 7, 50, 'wallLower');
    b.box(18.4, Y, 49.6, 30, Y + 7, 50, 'wall');
    b.box(0, Y, 76, 11, Y + 9, 76.4, 'wall');
    b.box(19, Y, 76, 30, Y + 9, 76.4, 'wallLower');
    // casario em volta (janelas escuras, uma ou outra com vidro)
    for (const [x0, x1] of [[1, 4], [5, 9], [21, 25], [26, 29]]) b.box(x0, Y + 3.2, 75.96, x1, Y + 4.6, 76.0, 'glass', { collide: false });
    for (const z of [55, 61, 67, 72]) { b.box(0.0, Y + 3.0, z, 0.04, Y + 4.4, z + 2, 'glass', { collide: false }); b.box(29.96, Y + 3.0, z, 30.0, Y + 4.4, z + 2, 'glass', { collide: false }); }
    // chafariz seco, cheio de cinza (bacia + coluna) — obstáculo
    b.box(12.8, Y, 59.8, 17.2, Y + 0.9, 64.2, 'stone', { tag: 'obstacle' });
    b.box(13.1, Y + 0.6, 60.1, 16.9, Y + 0.85, 63.9, 'ash', { collide: false });
    b.box(14.6, Y, 61.6, 15.4, Y + 2.8, 62.4, 'stone', { tag: 'obstacle' });
    b.box(14.2, Y + 2.8, 61.2, 15.8, Y + 3.0, 62.8, 'stone', { collide: false });
    // pedestais: o do fundador (estátua sem cabeça) e um vazio; banca de jornais fechada
    b.box(4.8, Y, 66.8, 7.2, Y + 1.6, 69.2, 'stone', { tag: 'obstacle' });
    b.box(5.5, Y + 1.6, 67.6, 6.5, Y + 3.6, 68.4, 'concrete', { collide: false });
    b.box(22.8, Y, 66.8, 25.2, Y + 1.6, 69.2, 'stone', { tag: 'obstacle' });
    b.box(22.8, Y, 55, 25.2, Y + 2.4, 57, 'woodDark', { tag: 'obstacle' });
    b.box(22.6, Y + 2.4, 54.8, 25.4, Y + 2.55, 57.2, 'rust', { collide: false });
    this.sign('JORNAIS · REVISTAS', 24, Y + 2.1, 54.98, Math.PI, 1.8, 0.24, { bg: '#c9c2a4', fg: '#3a1010' });
    // bancos de pedra
    for (const [x, z] of [[3, 57], [26, 71], [3, 72]]) b.box(x - 1.0, Y, z - 0.3, x + 1.0, Y + 0.48, z + 0.3, 'stone', { tag: 'prop-low', sight: false });
    // lampiões da praça
    for (const [x, z] of [[2.5, 52.5], [27.5, 52.5], [2.5, 74], [27.5, 74]]) {
      b.box(x - 0.06, Y, z - 0.06, x + 0.06, Y + 3.8, z + 0.06, 'metal', { tag: 'prop' });
      b.box(x - 0.16, Y + 3.7, z - 0.16, x + 0.16, Y + 4.05, z + 0.16, 'lampOn', { collide: false });
    }
    this.sign('PRAÇA DO RELÓGIO', 14, Y + 3.5, 50.32, 0, 2.2, 0.3, { bg: '#20304a', fg: '#e0e0d0' });
  }

  // ---------- TORRE DO RELÓGIO x11..19 z76..84 (porta ao sul, varanda e mostrador) ----------
  _tower() {
    const b = this.b, H = 22;
    b.floor(11.4, 76.4, 18.6, 83.6, Y, 'stone', 'c4_torre');
    b.wallX(76.2, 11, 19, Y, Y + H, [15], 'stone', 1.6, 2.6);
    b.box(11, Y, 76, 11.4, Y + H, 84, 'stone');
    b.box(18.6, Y, 76, 19, Y + H, 84, 'stone');
    b.box(11, Y, 83.6, 19, Y + H, 84, 'stone');
    b.box(10.6, Y + H, 75.6, 19.4, Y + H + 0.5, 84.4, 'woodDark', { collide: false });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(6.2, 5, 4), this.M.rust); roof.position.set(15, Y + H + 3, 80); roof.rotation.y = Math.PI / 4; b.group.add(roof);
    // degraus da escada em caracol (só a base, a subida fica para a próxima fatia)
    for (let i = 0; i < 6; i++) { const a = i * 0.7; b.box(15 + Math.cos(a) * 2 - 0.6, Y, 80 + Math.sin(a) * 2 - 0.6, 15 + Math.cos(a) * 2 + 0.6, Y + 0.2 + i * 0.22, 80 + Math.sin(a) * 2 + 0.6, 'stone', { collide: false }); }
    // varanda do Vigia (y ≈ 9) e o mostrador parado às 3h07 acima dela
    b.box(12.5, Y + 9, 74.6, 17.5, Y + 9.25, 76, 'stone', { collide: false });
    b.box(12.5, Y + 9.25, 74.6, 17.5, Y + 10.2, 74.7, 'metal', { collide: false });
    this.clockFace(15, Y + 15.5, 75.94, 2.4, Math.PI);
    // campanário: abertura escura e o sino
    b.box(13.2, Y + 18.6, 75.9, 16.8, Y + 21.4, 75.98, new THREE.MeshBasicMaterial({ color: 0x050505 }), { collide: false });
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.1, 1.4, 10), this.M.brass || this.M.metal); bell.position.set(15, Y + 19.8, 76.8); b.group.add(bell);
    this.bell = bell;
    this.sign('VIGIA DE VÉSPERA · MDCCCXC', 15, Y + 3.4, 75.98, Math.PI, 3.2, 0.32, { bg: '#2a2622', fg: '#c8b080' });
  }

  _doors() {
    const ctx = { materials: this.M, group: this.b.group, col: this.game.col, audio: this.game.audio, bus: this.game.bus };
    const D = (o) => (this.doors[o.id] = new Door({ mat: this.M.door, ...o }, ctx));
    D({ id: 'c4_pharm', axis: 'z', x: 4, y: GROUND, z: 23, width: 1.2, height: 2.3, swing: 1, mat: this.M.woodDark, label: 'porta da farmácia' });
    D({ id: 'c4_watch', axis: 'z', x: 10, y: GROUND, z: 35, width: 1.2, height: 2.3, swing: -1, mat: this.M.woodDark, locked: true,
      lockMsg: 'A Relojoaria Ponteiro está trancada. Um bilhete preso no vidro: "Chave com o Dr. Lauro, na Farmácia Central — gaveta do caixa."', label: 'porta da relojoaria' });
    D({ id: 'c4_back', axis: 'x', x: 14, y: GROUND, z: 40, width: 1.2, height: 2.3, swing: 1, mat: this.M.woodDark, label: 'porta dos fundos' });
    D({ id: 'c4_tower', axis: 'x', x: 15, y: GROUND, z: 76.2, width: 1.6, height: 2.6, swing: 1, mat: this.M.doorMetal || this.M.rust, locked: true,
      lockMsg: 'A porta de ferro da Torre do Relógio. Fechadura grande, de chave antiga — quem tem a chave é o Vigia.', label: 'porta da Torre' });
  }

  _lights() {
    this.game.scene.add(new THREE.HemisphereLight(0x3a4048, 0x0a0908, 0.5));
    const gas = 0xffb060;
    for (const [x, z] of [[5.2, 14], [8.8, 30], [5.2, 42]]) this.lamp(x, Y + 3.7, z, gas, 1.4, 10, { flicker: true });
    const moon = this.lamp(7, Y + 9, 6, 0x7088b0, 0.6, 14); moon.fixture.visible = false;
    this.lamp(0, Y + H_SHOP - 0.1, 23, 0xd8f0c0, 0.9, 8, { flicker: true });     // farmácia
    this.lamp(14, Y + H_SHOP - 0.1, 34, 0xffc070, 1.1, 8);                       // relojoaria
    this.lamp(14, Y + 3.0, 46, 0x8090a0, 0.6, 8);                                // pátio
    for (const [x, z] of [[2.5, 52.5], [27.5, 52.5], [2.5, 74], [27.5, 74]]) { const L = this.lamp(x, Y + 3.9, z, gas, 1.3, 12, { flicker: x < 10 }); L.fixture.visible = false; }
    const face = this.lamp(15, Y + 13, 72, 0xc8d8e0, 0.9, 22); face.fixture.visible = false; // luar sobre o mostrador
    this.lamp(15, Y + 3.2, 80, 0x8a7a60, 0.6, 7, { flicker: true });            // base da torre
  }

  // ---------- cinza caindo devagar (pontos que acompanham o jogador ao ar livre) ----------
  _ash() {
    const N = 500, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 24; pos[i * 3 + 1] = Math.random() * 9; pos[i * 3 + 2] = (Math.random() - 0.5) * 24; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0x9a9890, size: 0.06, sizeAttenuation: true, transparent: true, opacity: 0.7, depthWrite: false });
    this.rain = new THREE.Points(geo, mat); this.rain.frustumCulled = false; this.rain.name = 'cinza';
    this.game.scene.add(this.rain);
  }
  _updateAsh(dt, t) {
    const p = this.game.player?.pos; if (!p || !this.rain) return;
    const outside = !INDOOR.has(this.zone);
    this.rain.visible = outside;
    if (!outside) return;
    const a = this.rain.geometry.attributes.position, arr = a.array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 1] -= dt * (0.6 + (i % 5) * 0.15);
      arr[i] += dt * 0.25 * Math.sin(t * 0.4 + i);
      if (arr[i + 1] < 0) arr[i + 1] += 9;
    }
    a.needsUpdate = true;
    this.rain.position.set(p.x, p.y, p.z);
  }

  _nav() {
    const n = this.game.nav, d = this.doors;
    const N = (id, x, y, z) => n.addNode(id, x, y, z);
    N('r0', 7, Y, 4); N('r1', 7, Y, 12); N('r2', 6, Y, 20); N('r3', 6, Y, 23); N('r4', 7, Y, 30); N('r5', 7.4, Y, 35); N('r6', 7, Y, 43);
    N('f0', 2.6, Y, 23); N('f1', 0.8, Y, 21.5); N('f2', 0.8, Y, 26.6); N('f3', -2.4, Y, 26.8); N('f4', -2.4, Y, 21.4);
    N('w0', 11.4, Y, 35); N('w1', 14, Y, 35); N('w2', 15.8, Y, 33); N('w3', 14, Y, 38.8);
    N('y0', 14, Y, 41.4); N('y1', 12.4, Y, 45); N('y2', 15.6, Y, 46.6); N('y3', 14, Y, 49);
    N('p0', 14, Y, 51.4); N('p1', 9, Y, 56); N('p2', 20, Y, 59); N('p3', 9, Y, 64); N('p4', 20.5, Y, 64); N('p5', 10, Y, 71.5); N('p6', 20, Y, 72); N('p7', 15, Y, 74.6);
    N('p8', 3, Y, 62); N('p9', 27.5, Y, 62); N('p10', 15, Y, 57.4);
    N('t0', 15, Y, 77.6);
    const L = (a, b, door) => n.link(a, b, door);
    L('r0', 'r1'); L('r1', 'r2'); L('r2', 'r3'); L('r3', 'r4'); L('r4', 'r5'); L('r5', 'r6');
    L('r3', 'f0', d.c4_pharm); L('f0', 'f1'); L('f0', 'f2'); L('f2', 'f3'); L('f3', 'f4');
    L('r5', 'w0', d.c4_watch); L('w0', 'w1'); L('w1', 'w2'); L('w1', 'w3'); L('w3', 'y0', d.c4_back);
    L('y0', 'y1'); L('y0', 'y2'); L('y1', 'y3'); L('y2', 'y3'); L('y3', 'p0');
    L('p0', 'p1'); L('p0', 'p2'); L('p0', 'p10'); L('p1', 'p3'); L('p2', 'p4'); L('p3', 'p5'); L('p4', 'p6'); L('p5', 'p7'); L('p6', 'p7');
    L('p1', 'p8'); L('p8', 'p3'); L('p2', 'p9'); L('p9', 'p4'); L('p10', 'p1'); L('p10', 'p2');
    L('p7', 't0', d.c4_tower);
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
    // o sino balança quando toca
    if (this.bell) { this.bellT = Math.max(0, (this.bellT || 0) - dt); this.bell.rotation.z = Math.sin(t * 6) * 0.35 * Math.min(1, this.bellT); }
    this._updateZone(dt);
    this._updateAsh(dt, t);
  }
  ringBell(s = 3) { this.bellT = s; }
  zoneAt(p) {
    for (const z of CIDADE_ZONES) if (p.x > z.minX && p.x < z.maxX && p.z > z.minZ && p.z < z.maxZ && p.y > z.minY && p.y < z.maxY) return z;
    return null;
  }
  _updateZone(dt) {
    const fog = this.game.scene.fog, p = this.game.player?.pos;
    if (!fog || !p) return;
    const z = this.zoneAt(p); this.zone = z ? z.id : null;
    const tgt = z || CIDADE_FOG, k = Math.min(1, dt * 1.5);
    this._fogC = this._fogC || new THREE.Color();
    this._fogC.set(tgt.fog);
    fog.color.lerp(this._fogC, k);
    fog.density += (tgt.density - fog.density) * k;
    if (this.game.scene.background?.isColor) this.game.scene.background.copy(fog.color).multiplyScalar(0.8);
  }
}
