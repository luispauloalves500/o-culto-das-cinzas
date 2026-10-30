// Geometria, luzes, adereços, portas, grafo de navegação e posições do Hospital São Dimas.
// Unidades em metros. Andar superior y = 0; subsolo y = −5.
import * as THREE from 'three';
import { LevelBuilder } from '../../world/LevelBuilder.js';
import { Door } from '../../world/Doors.js';
import { buildAnnex, updateAnnex, ANNEX_CHECKPOINTS, ANNEX_ZONES } from './HospitalAnnex.js';

export const UP = 0, LO = -5;
const H_UP = 3.2;           // pé-direito superior
const CEIL_LO = -1.8;       // teto do subsolo
const CEIL_ARENA = -0.8;

export const CHECKPOINTS = {
  ward_bed: { x: 2.9, y: UP, z: 1.5, yaw: Math.PI / 2 },
  machine_room: { x: 33, y: UP, z: 17.5, yaw: Math.PI },
  lower_hall: { x: 38, y: LO, z: 12, yaw: -Math.PI / 2 },
  pre_boss: { x: 22, y: LO, z: 15.5, yaw: 0 },
  yard: { x: 40, y: LO, z: 28, yaw: Math.PI / 2 },
  east_ward: { x: 33.5, y: UP, z: -1.2, yaw: Math.PI },
  morgue: { x: 20, y: LO, z: 8.2, yaw: Math.PI },
  ...ANNEX_CHECKPOINTS,
};

// zonas de atmosfera (névoa/cor) — o necrotério é frio e esverdeado
export const ZONES = [
  ...ANNEX_ZONES,
  { id: 'morgue', minX: 16, maxX: 26, minZ: -3, maxZ: 10, minY: LO - 1, maxY: CEIL_LO, fog: 0x0a1a14, density: 0.11 },
  { id: 'east', minX: 16, maxX: 38, minZ: -3, maxZ: 10, minY: UP - 1, maxY: H_UP, fog: 0x0a0c08, density: 0.085 },
];
const FOG_DEFAULT = { fog: 0x050806, density: 0.075 };

export class HospitalLevel {
  constructor(game) {
    this.game = game;
    this.M = game.materials;
    this.b = new LevelBuilder(game.scene, game.col, game.materials);
    this.doors = {};
    this.lights = { power: [], emergency: [], flicker: [], all: [] };
    this.pickupMeshes = {};
    this.drawers = {};
    this.zone = null;
  }

  build() {
    this._shell();
    this._props();
    this._eastWard();
    this._morgue();
    this._doors();
    this._lights();
    this._elevator();
    this._nav();
    buildAnnex(this);
    return this;
  }

  // ---------- estrutura ----------
  _shell() {
    const b = this.b;
    // ENFERMARIA x0..12 z−3..10
    b.floor(0, -3, 12, 10, UP, 'tile', 'ward');
    b.ceiling(0, -3, 12, 10, H_UP);
    b.wallZ(0, -3, 10, UP, H_UP);
    b.wallX(-3, 0, 12, UP, H_UP);
    b.wallX(10, 0, 40, UP, H_UP, [6, 24]);             // enfermaria/corredor (porta x=6) · Ala Leste (x=24)
    b.wallZ(12, -3, 10, UP, H_UP, [-1.5]);             // atalho (porta z=−1.5)
    // PATAMAR + ESCADA x12..16
    b.floor(12, -3, 16, 0, UP, 'concrete', 'landing');
    b.ceiling(12, -3, 16, 10, H_UP);
    b.wallX(-3, 12, 16, UP, H_UP);
    b.wallZ(12, 0, 10, LO, UP, [], 'wallLower');
    b.wallZ(16, -3, 10, LO, UP, [], 'wallLower');
    b.wallZ(16, -3, 10, UP, H_UP, [-1.5], 'wallLower');  // patamar/Ala Leste (porta z=−1.5)
    b.stairsZ(12.1, 15.9, 0, 10, UP, LO, 20);
    b.box(12, CEIL_LO, 9.9, 16, UP - 0.3, 10.1, 'wallLower'); // verga sobre o pé da escada
    // CORREDOR x0..40 z10..14
    b.floor(0, 10, 40, 14, UP, 'tile', 'corridor');
    b.ceiling(0, 10, 40, 14, H_UP);
    b.wallZ(0, 10, 14, UP, H_UP);
    b.wallX(14, 0, 40, UP, H_UP, [6, 19, 26, 33]);          // capela (x=6) · depósito · escada de serviço (x=26) · máquinas
    b.wallZ(40, 10, 14, UP, H_UP, [12]);
    // DEPÓSITO x14..24 z14..22
    b.floor(14, 14, 24, 22, UP, 'concrete', 'storage');
    b.ceiling(14, 14, 24, 22, H_UP);
    b.wallZ(14, 14, 22, UP, H_UP); b.wallZ(24, 14, 22, UP, H_UP); b.wallX(22, 14, 24, UP, H_UP);
    // SALA DE MÁQUINAS x28..38 z14..24
    b.floor(28, 14, 38, 24, UP, 'concrete', 'machines');
    b.ceiling(28, 14, 38, 24, H_UP);
    b.wallZ(28, 14, 24, UP, H_UP, [], 'wallLower'); b.wallZ(38, 14, 24, UP, H_UP, [], 'wallLower'); b.wallX(24, 28, 38, UP, H_UP, [], 'wallLower');
    // POÇO DO ELEVADOR x40..44 z10..14
    b.wallZ(44, 10, 14, LO, H_UP, [], 'metal');
    b.wallX(10, 40, 44, LO, H_UP, [], 'metal');
    b.wallX(14, 40, 44, LO, H_UP, [], 'metal');
    b.ceiling(40, 10, 44, 14, H_UP);
    b.wallZ(40, 10, 14, LO, CEIL_LO, [12]);
    b.box(39.9, CEIL_LO, 10, 40.1, UP - 0.3, 14, 'wallLower'); // entre andares

    // SUBSOLO — HALL x12..40 z10..14
    b.floor(12, 10, 40, 14, LO, 'tile', 'lowerHall');
    b.ceiling(12, 10, 40, 14, CEIL_LO, 'wallLower');
    b.wallZ(12, 10, 14, LO, CEIL_LO, [12], 'wallLower');    // lavanderia (porta z=12)
    b.wallX(10, 16, 40, LO, CEIL_LO, [20, 31], 'wallLower'); // necrotério (x=20) · arquivo (x=31)
    b.wallX(14, 12, 40, LO, CEIL_LO, [22], 'wallLower');
    // ARQUIVO x26..36 z2..10
    b.floor(26, 2, 36, 10, LO, 'wood', 'archive');
    b.ceiling(26, 2, 36, 10, CEIL_LO, 'wallLower');
    b.wallZ(26, 2, 10, LO, CEIL_LO, [], 'wallLower'); b.wallZ(36, 2, 10, LO, CEIL_LO, [], 'wallLower'); b.wallX(2, 26, 36, LO, CEIL_LO, [], 'wallLower');
    // CORREDOR CIRÚRGICO x20..24 z14..20
    b.floor(20, 14, 24, 20, LO, 'tile', 'surgeryCorridor');
    b.ceiling(20, 14, 24, 20, CEIL_LO, 'wallLower');
    b.wallZ(20, 14, 20, LO, CEIL_LO, [], 'wallLower'); b.wallZ(24, 14, 20, LO, CEIL_LO, [], 'wallLower');
    // ARENA (sala de cirurgia) x10..36 z20..36
    b.floor(10, 20, 36, 36, LO, 'tile', 'arena');
    b.ceiling(10, 20, 36, 36, CEIL_ARENA, 'ceiling');
    b.wallX(20, 10, 36, LO, CEIL_ARENA, [22], 'wall');
    b.wallZ(10, 20, 36, LO, CEIL_ARENA, [], 'wall');
    b.wallX(36, 10, 36, LO, CEIL_ARENA, [], 'wall');
    b.wallZ(36, 20, 36, LO, CEIL_ARENA, [28], 'wall', 2.0, 2.6);
    // PÁTIO x36..46 z24..32 (céu aberto)
    b.floor(36, 24, 46, 32, LO, 'concrete', 'yard');
    b.wallX(24, 36, 46, LO, 1.0, [], 'concrete'); b.wallX(32, 36, 46, LO, 1.0, [], 'concrete');
    b.wallZ(46, 24, 32, LO, 1.0, [28], 'concrete', 2.4, 3.0);
    b.box(46, LO, 26, 50, 1, 30, 'concrete', { collide: true }); // além do portão: bloqueio (fim do capítulo)
  }

  // ---------- adereços ----------
  bed(x, z, rot = 0) {
    const b = this.b, M = this.M;
    const [w, l] = rot ? [2.0, 0.95] : [0.95, 2.0];
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - l / 2, z1 = z + l / 2;
    b.box(x0, 0.32, z0, x1, 0.4, z1, 'metal', { collide: false, cast: true });
    b.box(x0 + 0.04, 0.4, z0 + 0.04, x1 - 0.04, 0.58, z1 - 0.04, 'sheet', { collide: false, cast: true, tile: 1 });
    for (const [lx, lz] of [[x0, z0], [x1 - 0.05, z0], [x0, z1 - 0.05], [x1 - 0.05, z1 - 0.05]]) b.box(lx, 0, lz, lx + 0.05, 0.4, lz + 0.05, 'metal', { collide: false });
    // cabeceira
    if (rot) b.box(x0, 0, z0, x0 + 0.06, 1.0, z1, 'metal', { collide: false }); else b.box(x0, 0, z0, x1, 1.0, z0 + 0.06, 'metal', { collide: false });
    this.game.col.addBox(x0, 0, z0, x1, 0.62, z1, { tag: 'prop-low', blocksSight: false });
  }
  yShift(y) { return y; }

  _props() {
    const b = this.b, M = this.M;
    const PL = { tag: 'prop-low', sight: false };
    const P = { tag: 'prop' };
    // --- Enfermaria
    for (const z of [-1.2, 4.5, 7.6]) this.bed(1.1, z);
    this.bed(1.1, 1.5); // cama do Elias
    this.bed(10.8, 2.6); this.bed(10.8, 5.6);
    b.box(1.9, 0, 2.7, 2.4, 0.6, 3.2, 'wood', { ...PL, cast: true });        // criado-mudo
    b.box(6, 0, -2.85, 8.2, 0.85, -2.1, 'wood', { ...PL, cast: true });       // escrivaninha (livro de registros)
    b.box(0.2, 0, 8.6, 0.75, 1.8, 9.8, 'metal', { ...P, cast: true });        // armário
    b.box(11.2, 0, 7.4, 11.8, 1.9, 9.6, 'metal', { ...P, cast: true });
    // caixa do machado na parede sul (lado da enfermaria)
    b.box(3.5, 0.9, 9.72, 4.7, 2.0, 9.9, 'axeMetal', { collide: false });
    b.box(3.6, 1.0, 9.69, 4.6, 1.9, 9.72, 'glass', { collide: false });
    // suportes de soro
    for (const [x, z] of [[2.2, -0.3], [2.2, 5.5], [9.9, 3.6]]) { b.box(x, 0, z, x + 0.04, 1.8, z + 0.04, 'metal', { collide: false }); b.box(x - 0.1, 1.7, z, x + 0.14, 1.74, z + 0.04, 'metal', { collide: false }); }
    // --- Corredor
    b.box(15, 0, 13.1, 17, 0.8, 13.8, 'metal', { ...PL, cast: true }); // maca
    b.box(15.1, 0.8, 13.15, 16.9, 0.9, 13.75, 'sheet', { collide: false });
    b.box(28, 0, 10.2, 30, 0.45, 10.6, 'wood', PL);                   // banco
    b.box(36.5, 0, 13.2, 37.4, 1.6, 13.85, 'metal', P);                // armário
    // --- Depósito
    for (const [x0, x1] of [[14.2, 14.9], [23.1, 23.8]]) {
      b.box(x0, 0, 15.6, x1, 2.2, 21, 'metal', { ...P, cast: true });
    }
    b.box(18, 0, 21, 20.2, 0.85, 21.8, 'wood', PL);                    // bancada do fusível
    b.box(16.5, 0, 17, 17.4, 0.8, 17.9, 'wood', { ...PL, cast: true }); // caixotes
    b.box(20.5, 0, 16.2, 21.3, 0.7, 17, 'wood', PL);
    // --- Sala de máquinas
    b.box(29, 0, 19.2, 32.2, 2.0, 23.2, 'rust', { ...P, cast: true });   // gerador
    b.box(29.4, 2.0, 20, 29.8, H_UP, 20.4, 'metal', { collide: false }); // exaustor
    b.box(28.1, 2.6, 14.2, 37.9, 2.8, 14.5, 'rust', { collide: false });  // tubulação
    b.box(37.7, 1.0, 15.5, 37.95, 1.9, 16.5, 'metal', { collide: false }); // painel do fusível
    b.box(37.65, 0.9, 17.5, 37.95, 2.0, 20.5, 'hazard', { collide: false }); // quadro de disjuntores
    b.box(37.6, 0, 21.5, 37.95, 1.6, 22.6, 'metal', { collide: false });   // base da alavanca
    // disjuntores (I, II, III) e alavanca principal: objetos móveis
    this.breakers = [];
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group(); g.position.set(37.6, 1.45, 18 + i);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.1), M.metal); handle.position.y = 0.12; g.add(handle);
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.08), M.breakerOff); led.position.set(0, 0.45, 0); g.add(led);
      g.rotation.z = -0.5;
      this.b.group.add(g); this.breakers.push({ g, led });
    }
    this.lever = new THREE.Group(); this.lever.position.set(37.55, 1.3, 22.05);
    const lh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), M.axeMetal); lh.position.y = 0.3; this.lever.add(lh);
    const lk = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.14), M.mask); lk.position.y = 0.62; this.lever.add(lk);
    this.lever.rotation.z = -0.7; this.b.group.add(this.lever);
    this.fuseSlot = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.25, 0.1), M.paper); this.fuseSlot.position.set(37.66, 1.45, 16); this.fuseSlot.visible = false; this.b.group.add(this.fuseSlot);
    b.box(36.6, 0, 23.1, 37.9, 1.2, 23.9, 'metal', P);
    // --- Subsolo: hall
    b.box(12.2, LO + 2.4, 13.6, 40, LO + 2.6, 13.85, 'rust', { collide: false });
    b.box(25, LO, 10.2, 27, LO + 0.8, 10.9, 'metal', PL);            // maca
    b.box(34, LO, 13.1, 35.5, LO + 1.2, 13.85, 'metal', P);
    // Arquivo
    for (const x of [27, 34.4]) b.box(x, LO, 3, x + 0.6, LO + 2.0, 8, 'metal', { ...P, cast: true });
    b.box(30, LO, 2.3, 32, LO + 0.8, 3.1, 'wood', PL);                 // mesa
    b.box(29.4, LO, 6.6, 30.2, LO + 0.6, 7.4, 'wood', PL);              // caixas
    // corredor cirúrgico
    b.box(23.2, LO, 16.2, 23.85, LO + 0.85, 18.2, 'metal', PL);
    // --- Arena: mesas e pilares (obstáculos da investida)
    const OB = { tag: 'obstacle', cast: true };
    b.box(15.5, LO, 26.9, 16.5, LO + 1.0, 29.1, 'metal', OB);
    b.box(29.5, LO, 26.9, 30.5, LO + 1.0, 29.1, 'metal', OB);
    b.box(22.4, LO, 32.4, 23.6, LO + 1.0, 34.6, 'metal', OB);
    for (const [x, z] of [[16, 23.5], [30, 23.5], [16, 33], [30, 33]]) b.box(x - 0.45, LO, z - 0.45, x + 0.45, CEIL_ARENA, z + 0.45, 'concrete', OB);
    for (const [x, z] of [[16, 28], [30, 28], [23, 33.5]]) {
      b.box(x - 0.4, CEIL_ARENA - 0.5, z - 0.4, x + 0.4, CEIL_ARENA - 0.35, z + 0.4, 'metal', { collide: false });
    }
    b.box(10.2, LO, 34, 12.5, LO + 1.6, 35.8, 'metal', P);
    // pátio
    b.box(38, LO, 24.3, 39.2, LO + 0.9, 25.3, 'wood', PL);              // caixote do livro
    b.box(43, LO, 30.6, 45.7, LO + 1.2, 31.7, 'rust', P);
    // portão do pátio (grade, apenas visual — colisão vem do bloqueio externo)
    for (let z = 26.9; z <= 29.1; z += 0.3) b.box(45.95, LO, z, 46.05, LO + 2.9, z + 0.06, 'rust', { collide: false });
    // --- sangue / sujeira
    const decals = [[5.8, UP, 6], [8, UP, 12.4], [21, UP, 18.5], [33.5, UP, 21], [24, LO, 12], [31, LO, 6], [22, LO, 17.5], [23, LO, 29], [19, LO, 31], [27, LO, 25]];
    decals.forEach(([x, y, z], i) => {
      const s = 0.8 + ((i * 37) % 10) / 8;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), M.bloodDecal);
      m.rotation.x = -Math.PI / 2; m.rotation.z = i; m.position.set(x, y + 0.01, z);
      this.b.group.add(m);
    });
    // placa de saída verde sobre a porta da enfermaria
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.04), M.exitSign); sign.position.set(6, 2.6, 9.86); this.b.group.add(sign);
  }

  // ---------- portas ----------
  _doors() {
    const ctx = { materials: this.M, group: this.b.group, col: this.game.col, audio: this.game.audio, bus: this.game.bus };
    const D = (o) => (this.doors[o.id] = new Door({ mat: this.M.door, ...o }, ctx));
    D({ id: 'ward', axis: 'x', x: 6, y: UP, z: 10, swing: 1, label: 'porta da enfermaria' });
    D({ id: 'shortcut', axis: 'z', x: 12, y: UP, z: -1.5, swing: 1, locked: true, lockMsg: 'Trancada. O ferrolho está do outro lado.', label: 'porta lateral' });
    D({ id: 'storage', axis: 'x', x: 19, y: UP, z: 14, swing: 1, label: 'porta do depósito' });
    D({ id: 'machines', axis: 'x', x: 33, y: UP, z: 14, swing: 1, mat: this.M.doorMetal, label: 'porta da sala de máquinas' });
    D({ id: 'archive', axis: 'x', x: 31, y: LO, z: 10, swing: -1, label: 'porta do arquivo' });
    D({ id: 'arena', axis: 'x', x: 22, y: LO, z: 20, swing: 1, mat: this.M.doorMetal, label: 'porta da sala de cirurgia' });
    D({ id: 'elevUp', axis: 'z', x: 40, y: UP, z: 12, kind: 'sliding', mat: this.M.doorMetal, label: 'porta do elevador', auto: true });
    D({ id: 'elevLo', axis: 'z', x: 40, y: LO, z: 12, kind: 'sliding', mat: this.M.doorMetal, label: 'porta do elevador', auto: true });
    D({ id: 'eastWard', axis: 'x', x: 24, y: UP, z: 10, swing: -1, mat: this.M.doorMetal, locked: true, lockMsg: 'Trava eletromagnética da quarentena. Sem energia, não cede.', label: 'porta da Ala Leste' });
    D({ id: 'eastLanding', axis: 'z', x: 16, y: UP, z: -1.5, swing: 1, locked: true, lockMsg: 'Trancada. O ferrolho está do outro lado.', label: 'porta do patamar' });
    D({ id: 'morgue', axis: 'x', x: 20, y: LO, z: 10, swing: -1, mat: this.M.doorMetal, locked: true, lockMsg: 'Trancada. Placa: "NECROTÉRIO — chave com a enfermeira-chefe da Ala Leste".', label: 'porta do necrotério' });
    D({ id: 'coldRoom', axis: 'x', x: 21.5, y: LO, z: 0, kind: 'sliding', mat: this.M.morgueWall, locked: true, lockMsg: 'Azulejos frios.', label: 'painel de azulejos' });
    D({ id: 'gate', axis: 'z', x: 36, y: LO, z: 28, width: 2.0, height: 2.6, kind: 'sliding', mat: this.M.rust, locked: true, lockMsg: 'O portão de serviço está travado.', label: 'portão de serviço', auto: true });
  }

  // ---------- luzes ----------
  lamp(x, y, z, color, intensity, dist, opts = {}) {
    const light = new THREE.PointLight(color, intensity, dist, 1.6);
    light.position.set(x, y - 0.25, z);
    this.game.scene.add(light);
    const fixture = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.25), opts.mat || this.M.lampOn);
    fixture.position.set(x, y - 0.05, z);
    this.b.group.add(fixture);
    const L = { light, fixture, base: intensity, flicker: !!opts.flicker, power: !!opts.power, onMat: opts.mat || this.M.lampOn };
    this.lights.all.push(L);
    if (L.flicker) this.lights.flicker.push(L);
    if (L.power) this.lights.power.push(L);
    if (opts.emergency) this.lights.emergency.push(L);
    return L;
  }

  _lights() {
    const s = this.game.scene;
    s.add(new THREE.HemisphereLight(0x3a4a3c, 0x0a0806, 0.55));
    const C = { amber: 0xffb46a, green: 0x7dffa0, red: 0xff4a30, cold: 0xcfe8d8, moon: 0x7088a8 };
    // superior
    this.lamp(3, H_UP, 1.5, C.amber, 5, 9, { flicker: true });
    this.lamp(8, H_UP, 6, C.green, 2.2, 8, { mat: this.M.lampGreen });
    this.lamp(7, H_UP, -2.4, C.amber, 2.5, 5);
    this.lamp(14, H_UP, -1.5, C.green, 2.0, 7, { mat: this.M.lampGreen });
    this.lamp(8, H_UP, 12, C.green, 2.4, 9, { mat: this.M.lampGreen, emergency: true });
    this.lamp(21, H_UP, 12, C.amber, 0, 11, { power: true });
    this.lamp(30, H_UP, 12, C.green, 2.4, 9, { mat: this.M.lampGreen, emergency: true, flicker: true });
    this.lamp(19, H_UP, 18, C.amber, 2.2, 8, { flicker: true });
    this.lamp(33, H_UP, 19, C.red, 3, 10, { mat: this.M.lampRed, emergency: true });
    this.lamp(35, H_UP, 16, C.amber, 0, 10, { power: true });
    this.lamp(14, 1.5, 6, C.green, 1.6, 8, { mat: this.M.lampGreen }); // escada
    // subsolo
    this.lamp(20, CEIL_LO, 12, C.green, 2.2, 10, { mat: this.M.lampGreen, flicker: true });
    this.lamp(34, CEIL_LO, 12, C.amber, 2.2, 10);
    this.lamp(31, CEIL_LO, 4, C.amber, 2.6, 8, { flicker: true });
    this.lamp(22, CEIL_LO, 17, C.red, 2.2, 7, { mat: this.M.lampRed });
    this.lamp(16, CEIL_ARENA - 0.5, 28, C.cold, 4, 13);
    this.lamp(30, CEIL_ARENA - 0.5, 28, C.cold, 4, 13, { flicker: true });
    this.lamp(23, CEIL_ARENA - 0.5, 33.5, C.green, 3, 11, { mat: this.M.lampGreen });
    this.lamp(41, LO + 3.5, 28, C.moon, 3, 14, { mat: this.M.lampOff });
    // Ala Leste: só a luz de energia acende de verdade; o resto pisca
    this.lamp(20, H_UP, 3, C.amber, 0, 10, { power: true });
    this.lamp(27, H_UP, 4, C.green, 2.0, 9, { mat: this.M.lampGreen, flicker: true });
    this.lamp(34, H_UP, 1, C.red, 2.4, 9, { mat: this.M.lampRed, emergency: true });
    this.lamp(34, H_UP, 7.5, C.amber, 1.4, 6, { flicker: true });
    // necrotério: verde frio e doentio; câmara fria quase às escuras
    const MG = 0x8cffb0;
    this.lamp(21, CEIL_LO, 4.6, MG, 2.6, 9, { mat: this.M.lampGreen, flicker: true });
    this.lamp(18, CEIL_LO, 8.4, 0xbfe8e0, 1.2, 6, { mat: this.M.lampGreen });
    this.lamp(24.5, CEIL_LO, 1.6, MG, 1.4, 6, { mat: this.M.lampGreen });
    this.lamp(21.5, CEIL_LO, -1.5, 0x9fc8ff, 1.3, 5, { mat: this.M.lampOff, flicker: true });
    // power lights começam apagadas
    for (const L of this.lights.power) { L.light.intensity = 0; L.fixture.material = this.M.lampOff; }
  }

  setPower(on) {
    for (const L of this.lights.power) { L.base = on ? 4 : 0; L.light.intensity = L.base; L.fixture.material = on ? L.onMat : this.M.lampOff; }
    for (const L of this.lights.emergency) { L.base = on ? 1.2 : L.base; }
    this.elevLamp.material = on ? this.M.lampOn : this.M.lampOff;
    this.elevLight.intensity = on ? 2.5 : 0;
  }

  // ---------- elevador ----------
  _elevator() {
    const M = this.M;
    const car = new THREE.Group();
    const floor = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.2, 3.8), M.metal); floor.position.set(0, -0.1, 0); car.add(floor);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.6, 3.8), M.metal); back.position.set(1.85, 1.3, 0); car.add(back);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.1, 3.8), M.metal); roof.position.set(0, 2.75, 0); car.add(roof);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.3), M.mask); panel.position.set(1.8, 1.2, 1.2); car.add(panel);
    this.elevLamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.4), M.lampOff); this.elevLamp.position.set(0, 2.68, 0); car.add(this.elevLamp);
    this.elevLight = new THREE.PointLight(0xffc890, 0, 5, 1.6); this.elevLight.position.set(0, 2.4, 0); car.add(this.elevLight);
    car.position.set(42, UP, 12);
    this.game.scene.add(car);
    this.elevator = { car, y: UP, target: UP, moving: false, level: 'upper' };
    this.game.col.addFloor({ minX: 40.05, maxX: 43.95, minZ: 10.05, maxZ: 13.95, y: () => this.elevator.y, name: 'elevator' });
  }

  // ---------- navegação ----------
  _nav() {
    const n = this.game.nav, d = this.doors;
    const N = (id, x, y, z) => n.addNode(id, x, y, z);
    N('ward_c', 6, UP, 3); N('ward_n', 6, UP, -1); N('ward_e', 10.8, UP, -1.5); N('ward_door', 6, UP, 8.8); N('ward_w', 3, UP, 6);
    N('cor_6', 6, UP, 12); N('cor_14', 13.5, UP, 12); N('cor_19', 19, UP, 12); N('cor_26', 26, UP, 12); N('cor_33', 33, UP, 12); N('cor_39', 38.5, UP, 12);
    N('dep_door', 19, UP, 15.3); N('dep_c', 19, UP, 18.5); N('mac_door', 33, UP, 15.3); N('mac_c', 34.5, UP, 18);
    N('land', 14, UP, -1.5); N('stair_top', 14, UP, 0.5); N('stair_mid', 14, -2.5, 5); N('stair_bot', 14, LO, 10.6);
    N('lh_14', 14, LO, 12); N('lh_22', 22, LO, 12); N('lh_31', 31, LO, 12); N('lh_38', 38, LO, 12);
    N('arq_door', 31, LO, 8.7); N('arq_c', 31, LO, 5.5);
    N('sc_15', 22, LO, 15.3); N('sc_19', 22, LO, 18.8);
    N('arena_in', 22, LO, 21.4); N('arena_c', 23, LO, 28);
    const L = (a, b, door) => n.link(a, b, door);
    L('ward_c', 'ward_n'); L('ward_n', 'ward_e'); L('ward_c', 'ward_door'); L('ward_c', 'ward_w'); L('ward_w', 'ward_door');
    L('ward_e', 'land', d.shortcut); L('land', 'stair_top'); L('stair_top', 'stair_mid'); L('stair_mid', 'stair_bot'); L('stair_bot', 'lh_14');
    L('ward_door', 'cor_6', d.ward);
    L('cor_6', 'cor_14'); L('cor_14', 'cor_19'); L('cor_19', 'cor_26'); L('cor_26', 'cor_33'); L('cor_33', 'cor_39');
    L('cor_19', 'dep_door', d.storage); L('dep_door', 'dep_c');
    L('cor_33', 'mac_door', d.machines); L('mac_door', 'mac_c');
    L('lh_14', 'lh_22'); L('lh_22', 'lh_31'); L('lh_31', 'lh_38');
    L('lh_31', 'arq_door', d.archive); L('arq_door', 'arq_c');
    // Ala Leste (quarentena) e atalho para o patamar
    N('cor_24', 24, UP, 12); N('east_door', 24, UP, 8.6); N('east_c', 24, UP, 4); N('east_w', 18, UP, 4); N('east_nw', 17.4, UP, -1.5);
    N('east_e', 28.6, UP, 3.5); N('iso_door', 31.4, UP, 3.5); N('iso_c', 34, UP, 4); N('iso_n', 33.5, UP, -1);
    L('cor_19', 'cor_24'); L('cor_24', 'cor_26'); L('cor_24', 'east_door', d.eastWard);
    L('east_door', 'east_c'); L('east_c', 'east_w'); L('east_w', 'east_nw'); L('east_nw', 'land', d.eastLanding);
    L('east_c', 'east_e'); L('east_e', 'iso_door'); L('iso_door', 'iso_c'); L('iso_c', 'iso_n');
    // necrotério e câmara fria
    N('lh_20', 20, LO, 12); N('mor_door', 20, LO, 8.6); N('mor_c', 21, LO, 6.5); N('mor_mid', 21, LO, 3); N('mor_w', 17.3, LO, 7);
    N('mor_e', 25, LO, 3); N('mor_n', 21.5, LO, 1.2); N('cold_c', 21.5, LO, -1.6);
    L('lh_14', 'lh_20'); L('lh_20', 'lh_22'); L('lh_20', 'mor_door', d.morgue);
    L('mor_door', 'mor_c'); L('mor_c', 'mor_w'); L('mor_c', 'mor_mid'); L('mor_mid', 'mor_e'); L('mor_mid', 'mor_n'); L('mor_n', 'cold_c', d.coldRoom);
    L('lh_22', 'sc_15'); L('sc_15', 'sc_19'); L('sc_19', 'arena_in', d.arena); L('arena_in', 'arena_c');
  }

  update(dt, t) {
    for (const L of this.lights.flicker) {
      const f = Math.sin(t * 13 + L.base * 7) * Math.sin(t * 7.3) > 0.93 ? 0.15 : 1;
      L.light.intensity = L.base * f * (0.92 + Math.random() * 0.08);
    }
    for (const id in this.doors) this.doors[id].update(dt);
    for (const n in this.drawers) {
      const dw = this.drawers[n], target = dw.open ? 1 : 0;
      if (dw.t !== target) { dw.t = target > dw.t ? Math.min(1, dw.t + dt / 0.6) : Math.max(0, dw.t - dt / 0.6); dw.g.position.z = dw.z + dw.t * dw.t * (3 - 2 * dw.t) * 0.62; }
    }
    updateAnnex(this, dt, t);
    this._updateZone(dt);
  }

  /** zona de atmosfera em que o jogador está (névoa interpola suavemente) */
  zoneAt(p) {
    for (const z of ZONES) if (p.x > z.minX && p.x < z.maxX && p.z > z.minZ && p.z < z.maxZ && p.y > z.minY && p.y < z.maxY) return z;
    return null;
  }
  _updateZone(dt) {
    const fog = this.game.scene.fog, p = this.game.player?.pos;
    if (!fog || !p) return;
    const z = this.zoneAt(p); this.zone = z ? z.id : null;
    const tgt = z || FOG_DEFAULT, k = Math.min(1, dt * 1.5);
    this._fogC = this._fogC || new THREE.Color();
    this._fogC.set(tgt.fog);
    fog.color.lerp(this._fogC, k);
    if (fog.density !== undefined) fog.density += (tgt.density - fog.density) * k;
    if (this.game.scene.background?.isColor) this.game.scene.background.copy(fog.color).multiplyScalar(0.8);
  }

  // ---------- placas com texto (canvas procedural) ----------
  sign(text, x, y, z, rotY = 0, w = 0.9, h = 0.22, opts = {}) {
    const c = document.createElement('canvas'); c.width = 128; c.height = Math.max(16, Math.round(128 * h / w));
    const g = c.getContext('2d');
    g.fillStyle = opts.bg || '#c9c2a4'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = opts.fg || '#1c1a14'; g.font = `bold ${Math.floor(c.height * 0.62)}px monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, c.width / 2, c.height / 2 + 1);
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: t, emissive: opts.glow || 0x000000 }));
    m.position.set(x, y, z); m.rotation.y = rotY; (opts.parent || this.b.group).add(m);
    return m;
  }

  // ---------- ALA LESTE (quarentena, andar superior) x16..38 z−3..10 ----------
  _eastWard() {
    const b = this.b, M = this.M;
    b.floor(16, -3, 38, 10, UP, 'tile', 'eastWard');
    b.ceiling(16, -3, 38, 10, H_UP);
    b.wallX(-3, 16, 38, UP, H_UP);
    b.wallZ(38, -3, 10, UP, H_UP);
    b.wallZ(30, -3, 10, UP, H_UP, [3.5]);              // ala / isolamento (vão aberto)
    // leitos da quarentena e biombos
    for (const x of [20, 23, 26]) this.bed(x, -1.8);
    this.bed(18.6, 7.9); this.bed(28.4, 7.9);
    for (const x of [21.5, 24.5]) b.box(x - 0.02, 0, -3, x + 0.02, 1.9, -0.9, 'curtain', { collide: false });
    for (const x of [19.9, 27.1]) b.box(x - 0.02, 0, 6.9, x + 0.02, 1.9, 9.2, 'curtain', { collide: false });
    b.box(16.2, 0, 4.6, 16.8, 1.8, 6.6, 'metal', { tag: 'prop', cast: true });           // armário de lençóis
    b.box(28.6, 0, -2.8, 29.8, 0.9, -2.1, 'wood', { tag: 'prop-low', sight: false });    // mesinha do prontuário
    // suporte de soro tombado
    b.box(22, 0.02, 3.2, 23.7, 0.06, 3.26, 'metal', { collide: false });
    // fita de quarentena no vão da porta (lado de dentro)
    b.box(23.3, 1.25, 9.7, 24.7, 1.32, 9.74, 'hazard', { collide: false });
    this.sign('QUARENTENA · ALA LESTE', 24, 2.75, 10.13, 0, 1.6, 0.24, { bg: '#7a1c12', fg: '#e9dcc0' });
    // isolamento / posto de enfermagem x30..38
    b.box(32, 0, -2.9, 35.6, 0.9, -2.0, 'wood', { tag: 'prop-low', sight: false, cast: true }); // balcão do posto
    b.box(36.9, 0, -2.9, 37.9, 2.0, -0.8, 'metal', { tag: 'prop', cast: true });              // armário de chaves
    b.box(36.85, 1.0, -2.0, 36.9, 1.7, -1.0, 'woodDark', { collide: false });                  // quadro de ganchos
    this.bed(36.6, 6.5, 1);
    b.box(30.4, 0, 8.4, 31.6, 1.2, 9.8, 'metal', { tag: 'prop', cast: true });
    for (const [x, z, sz] of [[26, 5, 1.2], [33.5, 6, 0.9], [35.8, -0.5, 0.7], [19, 1, 1]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), M.bloodDecal); m.rotation.x = -Math.PI / 2; m.rotation.z = x; m.position.set(x, UP + 0.012, z); b.group.add(m);
    }
  }

  // ---------- NECROTÉRIO (subsolo) x16..26 z0..10 + câmara fria x19..24 z−3..0 ----------
  _morgue() {
    const b = this.b, M = this.M;
    const P = { tag: 'prop', sight: false, cast: true };
    b.floor(16, 0, 26, 10, LO, 'morgueFloor', 'morgue');
    b.ceiling(16, 0, 26, 10, CEIL_LO, 'morgueWall');
    b.wallX(0, 16, 26, LO, CEIL_LO, [21.5], 'morgueWall');    // parede das gavetas (painel secreto x=21.5)
    b.wallZ(26, 0, 2, LO, CEIL_LO, [], 'morgueWall');
    // revestimento de azulejo nas paredes já existentes (lado de dentro)
    b.box(16.1, LO, 0.1, 16.14, CEIL_LO, 9.9, 'morgueWall', { collide: false });
    b.box(25.86, LO, 0.1, 25.9, CEIL_LO, 9.9, 'morgueWall', { collide: false });
    b.box(16.1, LO + 2.3, 9.86, 25.9, CEIL_LO, 9.9, 'morgueWall', { collide: false });
    for (const [x0, x1] of [[16.1, 19.3], [20.7, 25.9]]) b.box(x0, LO, 9.86, x1, LO + 2.3, 9.9, 'morgueWall', { collide: false });
    this.sign('NECROTÉRIO', 20, LO + 2.62, 10.13, 0, 1.1, 0.2, { bg: '#28463a', fg: '#cfe8d8' });
    // bancos de gavetas refrigeradas (procedural: colunas × fileiras numeradas)
    const COLW = 0.7, ROWS = [LO + 0.2, LO + 0.82, LO + 1.44], DH = 0.56, FRONT = 0.66;
    const banks = [{ x0: 16.4, cols: 6, n0: 0 }, { x0: 22.4, cols: 5, n0: 6 }];
    this.drawerSlots = {};
    for (const bk of banks) {
      b.box(bk.x0 - 0.1, LO, 0.1, bk.x0 + bk.cols * COLW + 0.1, LO + 2.1, FRONT - 0.03, 'steelDark', { tag: 'wall', cast: false });
      for (let c = 0; c < bk.cols; c++) for (let r = 0; r < 3; r++) {
        const n = (bk.n0 + c) * 3 + r + 1;
        const cx = bk.x0 + c * COLW + COLW / 2, cy = ROWS[2 - r] + DH / 2;
        this.drawerSlots[n] = { x: cx, y: cy, z: FRONT };
      }
    }
    // gavetas que realmente abrem (o resto é só frente fixa)
    this.openableDrawers = [5, 13, 20, 26];
    for (const n in this.drawerSlots) {
      const sl = this.drawerSlots[n], g = new THREE.Group();
      g.position.set(sl.x, sl.y, sl.z);
      const front = new THREE.Mesh(new THREE.BoxGeometry(COLW - 0.06, DH - 0.04, 0.05), M.steel); g.add(front);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.05), M.metal); handle.position.set(0, -0.12, 0.05); g.add(handle);
      this.sign(String(n).padStart(2, '0'), 0, 0.13, 0.027, 0, 0.16, 0.08, { parent: g, bg: '#d8d2b8' });
      if (this.openableDrawers.includes(+n)) {
        const tray = new THREE.Mesh(new THREE.BoxGeometry(COLW - 0.12, 0.04, 0.6), M.steelDark); tray.position.set(0, -0.2, -0.32); g.add(tray);
        if (+n === 5) { const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.58), M.sheet); body.position.set(0, -0.11, -0.32); g.add(body); }
        this.drawers[n] = { g, open: false, t: 0, z: sl.z, n: +n };
      }
      b.group.add(g);
    }
    // mesas de autópsia (pedestal + tampo de aço com borda e ralo)
    const table = (cx, cz, body) => {
      b.box(cx - 0.15, LO, cz - 0.15, cx + 0.15, LO + 0.76, cz + 0.15, 'steelDark', { collide: false });
      b.box(cx - 0.45, LO + 0.76, cz - 1.05, cx + 0.45, LO + 0.86, cz + 1.05, 'steel', { collide: false, cast: true });
      for (const sx of [-1, 1]) b.box(cx + sx * 0.45 - 0.03, LO + 0.86, cz - 1.05, cx + sx * 0.45 + 0.03, LO + 0.93, cz + 1.05, 'steel', { collide: false });
      b.box(cx - 0.06, LO + 0.861, cz + 0.85, cx + 0.06, LO + 0.865, cz + 0.97, 'mask', { collide: false });
      if (body) {
        b.box(cx - 0.25, LO + 0.86, cz - 0.85, cx + 0.25, LO + 1.06, cz + 0.8, 'sheet', { collide: false, cast: true, tile: 1 });
        b.box(cx - 0.12, LO + 0.86, cz - 0.98, cx + 0.12, LO + 1.1, cz - 0.78, 'sheet', { collide: false, tile: 1 });
      }
      this.game.col.addBox(cx - 0.47, LO, cz - 1.07, cx + 0.47, LO + 0.93, cz + 1.07, { tag: 'prop', blocksSight: false });
    };
    table(18.9, 4.4, true); table(23.1, 4.4, false); table(23.4, 7.9, true);
    // carrinho de instrumentos, pia, balança e ralos
    b.box(19.7, LO, 6.4, 20.4, LO + 0.85, 6.9, 'steel', P);
    for (const [x, z] of [[19.8, 6.5], [20.0, 6.7], [20.25, 6.55]]) b.box(x, LO + 0.85, z, x + 0.12, LO + 0.87, z + 0.03, 'axeEdge', { collide: false });
    b.box(25.3, LO, 4.9, 25.85, LO + 0.9, 6.6, 'steel', { tag: 'prop', cast: true });
    b.box(25.35, LO + 0.9, 5.0, 25.8, LO + 0.95, 6.5, 'steelDark', { collide: false });
    b.box(17, LO + 1.2, 9.4, 17.6, LO + 1.25, 9.85, 'steel', { collide: false });
    for (const [x, z] of [[21, 4.4], [21, 8]]) b.box(x - 0.2, LO + 0.005, z - 0.2, x + 0.2, LO + 0.012, z + 0.2, 'mask', { collide: false });
    // mesa do livro de entradas
    b.box(16.4, LO, 1.4, 17.2, LO + 0.85, 3.0, 'woodDark', { tag: 'prop-low', sight: false, cast: true });
    for (const [x, z, sz] of [[19.6, 2.6, 1.2], [22.6, 6.4, 0.9], [21.4, 0.9, 0.8], [17.7, 8.2, 0.7]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), M.bloodDecal); m.rotation.x = -Math.PI / 2; m.rotation.z = x; m.position.set(x, LO + 0.013, z); b.group.add(m);
    }
    // câmara fria do Morais (secreta)
    b.floor(19, -3, 24, 0, LO, 'concrete', 'coldRoom');
    b.ceiling(19, -3, 24, 0, CEIL_LO, 'morgueWall');
    b.wallZ(19, -3, 0, LO, CEIL_LO, [], 'morgueWall'); b.wallZ(24, -3, 0, LO, CEIL_LO, [], 'morgueWall'); b.wallX(-3, 19, 24, LO, CEIL_LO, [], 'morgueWall');
    for (const [x, z] of [[19.8, -2.2], [20.6, -1.0], [23.3, -1.4]]) { // corpos pendurados em ganchos
      b.box(x - 0.02, LO + 2.2, z - 0.02, x + 0.02, CEIL_LO, z + 0.02, 'metal', { collide: false });
      b.box(x - 0.2, LO + 0.6, z - 0.15, x + 0.2, LO + 2.2, z + 0.15, 'sheet', { collide: false, cast: true, tile: 1 });
    }
    b.box(22.2, LO, -2.9, 23.8, LO + 0.8, -2.2, 'wood', { tag: 'prop-low', sight: false, cast: true }); // caixote do Morais
    b.box(19.1, LO + 1.2, -2.9, 19.5, LO + 1.24, -0.4, 'woodDark', { collide: false });                // prateleira
  }
}
