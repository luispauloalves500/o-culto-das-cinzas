// Fatia "ala cirúrgica superior": escada principal (atalho térreo ↔ 2º andar), ala cirúrgica do 2º andar
// (esterilização, sala 2, recuperação, expurgo emparedado), escada do telhado e o telhado com o barracão.
// Só geometria/portas/luzes/navegação; a lógica fica em HospitalWingScript.js.
import * as THREE from 'three';
import { Door } from '../../world/Doors.js';

export const UP = 0, UP2 = 4, ROOF = 7.3;
const H_UP = 3.2, TOP2 = 7, CEIL_ARENA = -0.8, HOUSE_TOP = 10;
const P = { tag: 'prop', sight: false, cast: true };
const PL = { tag: 'prop-low', sight: false, cast: true };
const NC = { collide: false };

export const WING_CHECKPOINTS = {
  wing: { x: 26, y: UP2, z: 27.4, yaw: 0 },
  recovery: { x: 34.2, y: UP2, z: 36.4, yaw: Math.PI },
  roof: { x: 18.2, y: ROOF, z: 36.9, yaw: Math.PI / 2 },
};

export const WING_ZONES = [
  { id: 'roof', minX: 12, maxX: 37, minZ: 25, maxZ: 39.5, minY: 7.0, maxY: 14, fog: 0x0b1018, density: 0.035 },
  { id: 'wing', minX: 16.4, maxX: 36, minZ: 26, maxZ: 38.4, minY: 3.5, maxY: 7.0, fog: 0x090c0d, density: 0.085 },
];

// cilindros de oxigênio (explodem quando golpeados)
export const OXYGEN_TANKS = [
  { id: 'o2_cor', x: 23.2, z: 28.55 },
  { id: 'o2_s2a', x: 24.6, z: 35.3 },
  { id: 'o2_s2b', x: 30.4, z: 30.0 },
  { id: 'o2_rec', x: 31.6, z: 29.7 },
];
// painel de tijolos do expurgo (só cai com golpe forte do martelo)
export const CRACKED_WALL = { x: 27.5, z: 36, y0: UP2, w: 1.8, h: 2.3 };

export function buildWing(L) {
  mainStair(L);
  wing(L);
  roofStair(L);
  roof(L);
  doors(L);
  lights(L);
  nav(L);
}

// ---------- ESCADA PRINCIPAL x38..41 z14..23.9 (térreo ↔ 2º andar) ----------
function mainStair(L) {
  const b = L.b;
  b.floor(38, 14, 41, 15.0, UP, 'concrete', 'mainStairBase');
  b.stairsZ(38.1, 40.9, 22.4, 15.0, UP2, UP, 18, 'concrete');
  b.floor(38, 22.4, 41, 23.9, UP2, 'wood', 'mainStairLanding');
  b.ceiling(38, 14, 41, 23.9, TOP2);
  b.wallZ(41, 14, 23.9, UP, TOP2, [], 'wallLower');
  b.wallX(23.9, 38, 41, UP, TOP2, [], 'wallLower');
  b.wallX(14, 38, 41, H_UP, TOP2, [], 'wallLower');
  b.wallZ(38, 22, 24, H_UP, UP2, [], 'wallLower');
  b.wallX(22.4, 38.1, 40.9, UP, UP2 - 0.3, [], 'wallLower');
  b.box(40.8, 0.9, 15.0, 40.86, 0.96, 22.4, 'rust', NC);     // corrimão
  L.sign('ESCADA PRINCIPAL', 39.2, 2.62, 13.87, Math.PI, 1.2, 0.2, { bg: '#c9c2a4', fg: '#1c1a14' });
  L.sign('CENTRO CIRÚRGICO ↑', 39.5, UP2 + 2.5, 23.78, Math.PI, 1.2, 0.2, { bg: '#c9c2a4' });
}

// ---------- ALA CIRÚRGICA SUPERIOR x16.4..36 z26..38.4 ----------
function wing(L) {
  const b = L.b, M = L.M;
  b.floor(16.4, 26, 36, 38.4, UP2, 'tile', 'wing');
  b.ceiling(16.4, 26, 36, 38.4, TOP2);
  // fachada sobre a sala de cirurgia (vista do pátio)
  b.wallZ(36, 24, 38.4, CEIL_ARENA, UP2, [], 'concrete');
  b.wallX(38.4, 16.4, 36, CEIL_ARENA, UP2, [], 'concrete');
  // paredes externas e divisórias
  b.wallZ(36, 26, 38.4, UP2, TOP2);
  b.wallX(38.4, 16.4, 36, UP2, TOP2);
  b.wallZ(16.4, 26, 38.4, UP2, TOP2, [27.5], 'wallLower');          // escada do telhado
  b.wallX(29, 16.4, 36, UP2, TOP2, [20, 27.5, 33.5]);                // esterilização · sala 2 · recuperação
  b.wallZ(24, 29, 38.4, UP2, TOP2);
  b.wallZ(31, 29, 38.4, UP2, TOP2);
  b.wallX(36, 24, 31, UP2, TOP2, [CRACKED_WALL.x], 'wall', CRACKED_WALL.w, CRACKED_WALL.h); // sala 2 / expurgo
  // janelas com luar
  for (const z of [27.5, 33.2, 36.8]) {
    b.box(35.86, UP2 + 1.0, z - 0.7, 35.9, UP2 + 2.3, z + 0.7, 'moonGlass', NC);
    b.box(35.84, UP2 + 1.0, z - 0.02, 35.86, UP2 + 2.3, z + 0.02, 'woodDark', NC);
  }
  for (const x of [18.5, 21.8, 33.5]) {
    b.box(x - 0.7, UP2 + 1.0, 38.26, x + 0.7, UP2 + 2.3, 38.3, 'moonGlass', NC);
    b.box(x - 0.02, UP2 + 1.0, 38.24, x + 0.02, UP2 + 2.3, 38.26, 'woodDark', NC);
  }
  // corredor: macas, placas
  b.box(29.4, UP2, 28.2, 31.4, UP2 + 0.8, 28.85, 'metal', PL);
  b.box(29.5, UP2 + 0.8, 28.25, 31.3, UP2 + 0.9, 28.8, 'sheet', NC);
  b.box(18.0, UP2, 26.15, 19.6, UP2 + 0.45, 26.7, 'woodDark', PL);
  L.sign('CENTRO CIRÚRGICO — ALA SUPERIOR', 26, UP2 + 2.62, 26.13, 0, 1.8, 0.2, { bg: '#c9c2a4' });
  L.sign('ESTERILIZAÇÃO', 20, UP2 + 2.45, 28.87, Math.PI, 0.9, 0.14, { bg: '#c9c2a4' });
  L.sign('SALA 2', 27.5, UP2 + 2.45, 28.87, Math.PI, 0.6, 0.14, { bg: '#c9c2a4' });
  L.sign('RECUPERAÇÃO', 33.5, UP2 + 2.45, 28.87, Math.PI, 0.9, 0.14, { bg: '#c9c2a4' });
  L.sign('TELHADO ↑', 16.55, UP2 + 2.45, 27.5, Math.PI / 2, 0.7, 0.14, { bg: '#7a2018', fg: '#f0e0d0' });
  // ESTERILIZAÇÃO x16.4..24 z29..38.4: autoclaves, prateleiras de bandejas
  for (const z of [30.2, 32.4]) {
    b.box(16.5, UP2, z, 17.7, UP2 + 1.6, z + 1.6, 'steel', P);
    b.box(17.68, UP2 + 0.5, z + 0.3, 17.72, UP2 + 1.3, z + 1.3, 'steelDark', NC);   // porta da autoclave
  }
  b.box(16.5, UP2, 35.2, 17.1, UP2 + 2.0, 38.2, 'metal', P);
  for (let i = 0; i < 4; i++) b.box(16.55, UP2 + 0.4 + i * 0.45, 35.3, 17.05, UP2 + 0.44 + i * 0.45, 38.1, 'steel', NC);
  b.box(21.2, UP2, 33.6, 23.6, UP2 + 0.85, 34.5, 'steel', PL);                      // bancada
  // SALA 2 x24..31 z29..36: mesa cirúrgica, foco, carrinho
  b.box(26.9, UP2, 31.6, 28.1, UP2 + 0.8, 33.8, 'steelDark', PL);
  b.box(26.8, UP2 + 0.8, 31.5, 28.2, UP2 + 0.92, 33.9, 'sheet', NC);
  b.box(27.0, TOP2 - 0.9, 32.2, 28.0, TOP2 - 0.75, 33.2, 'metal', NC);
  b.box(27.46, TOP2 - 0.75, 32.66, 27.54, TOP2, 32.74, 'metal', NC);
  b.box(29.3, UP2, 33.4, 30.2, UP2 + 0.9, 34.0, 'metal', PL);
  for (const [x, z, r] of [[26.2, 33.8, 0.4], [28.9, 31.1, 1.7], [27.4, 34.6, 2.4]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), M.bloodDecal); m.rotation.x = -Math.PI / 2; m.rotation.z = r; m.position.set(x, UP2 + 0.012, z); b.group.add(m);
  }
  // RECUPERAÇÃO x31..36 z29..38.4: leitos e cortinas
  for (const z of [31.2, 34.4]) {
    b.box(34.0, UP2 + 0.32, z - 0.5, 35.9, UP2 + 0.58, z + 0.5, 'sheet', PL);
    b.box(35.84, UP2, z - 0.5, 35.9, UP2 + 1.0, z + 0.5, 'metal', NC);
    b.box(33.6, UP2, z + 0.75, 35.9, UP2 + 2.2, z + 0.8, 'curtain', NC);
  }
  b.box(34.7, UP2, 37.3, 35.9, UP2 + 0.9, 38.2, 'woodDark', PL);                    // criado-mudo do livro
  // EXPURGO (secreto) x24..31 z36..38.4: pia, ossada do zelador, prateleira
  b.box(24.2, UP2, 37.6, 25.6, UP2 + 0.9, 38.3, 'steel', PL);
  b.box(26.4, UP2, 37.7, 28.6, UP2 + 0.9, 38.3, 'woodDark', PL);
  b.box(29.4, UP2, 37.0, 30.9, UP2 + 1.8, 38.3, 'metal', P);
  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.22), M.sheet); skull.position.set(30.1, UP2 + 0.68, 36.7); b.group.add(skull);
  const ribs = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.2), M.bandageDirty); ribs.position.set(30.1, UP2 + 0.3, 36.75); b.group.add(ribs);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.7), M.pantsGray); legs.position.set(30.1, UP2 + 0.06, 36.2); b.group.add(legs);
  // painel rachado (alvo destrutível) + rachaduras + entulho escondido
  const C = CRACKED_WALL, x0 = C.x - C.w / 2, x1 = C.x + C.w / 2;
  const panel = b.box(x0, C.y0, C.z - 0.12, x1, C.y0 + C.h, C.z + 0.12, 'brick', { tag: 'wall', tile: 1 });
  const cracks = [];
  for (const [cx, cy, w, h, r] of [[27.2, 1.4, 0.05, 0.9, 0.4], [27.7, 0.8, 0.05, 0.7, -0.5], [27.9, 1.7, 0.6, 0.04, 0.2], [26.9, 0.6, 0.4, 0.04, -0.3]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), M.ash); m.position.set(cx, C.y0 + cy, C.z - 0.135); m.rotation.z = r; b.group.add(m); cracks.push(m);
  }
  const debris = new THREE.Group(); debris.visible = false; b.group.add(debris);
  for (let i = 0; i < 22; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.11), M.brick);
    const a = (i * 2.399) % (Math.PI * 2), r = 0.25 + ((i * 37) % 10) / 10 * 1.1;
    m.position.set(C.x + Math.cos(a) * r * 0.9, C.y0 + 0.04 + (i % 3) * 0.06, C.z + Math.sin(a) * r * 0.55 - 0.2);
    m.rotation.set(i * 0.7, i * 1.3, i * 0.4); debris.add(m);
  }
  L.crackedWall = { panel, collider: panel.userData.collider, cracks, debris };
  // cilindros de oxigênio
  L.tanks = {};
  for (const t of OXYGEN_TANKS) {
    const g = new THREE.Group(); g.position.set(t.x, UP2, t.z);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.25, 10), L.M.o2 || (L.M.o2 = new THREE.MeshLambertMaterial({ color: 0x2f6a44 })));
    body.position.y = 0.63; g.add(body);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.14, 8), L.M.steel); cap.position.y = 1.32; g.add(cap);
    const valve = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.06), L.M.axeMetal); valve.position.y = 1.44; g.add(valve);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.08, 10), L.M.sheet); band.position.y = 1.0; g.add(band);
    b.group.add(g);
    const col = L.game.col.addBox(t.x - 0.2, UP2, t.z - 0.2, t.x + 0.2, UP2 + 1.4, t.z + 0.2, { tag: 'prop', blocksSight: false });
    const scorch = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), M.ash); scorch.rotation.x = -Math.PI / 2; scorch.position.set(t.x, UP2 + 0.015, t.z); scorch.visible = false; b.group.add(scorch);
    L.tanks[t.id] = { ...t, y: UP2, group: g, collider: col, scorch };
  }
  // clarão das explosões (uma luz reaproveitada, apagada por padrão)
  L.blastLight = new THREE.PointLight(0xffa040, 0, 9, 1.6); L.blastLight.position.set(26, UP2 + 1.5, 32); L.game.scene.add(L.blastLight);
}

// ---------- ESCADA DO TELHADO x13..16.4 z26..38.4 ----------
function roofStair(L) {
  const b = L.b;
  b.floor(13, 26, 16.4, 28.6, UP2, 'concrete', 'roofStairBase');
  b.stairsZ(13.1, 16.3, 35.4, 28.6, ROOF, UP2, 16, 'concrete');
  b.floor(13, 35.4, 16.4, 38.4, ROOF, 'concrete', 'roofStairTop');
  b.ceiling(13, 26, 16.4, 38.4, HOUSE_TOP);
  b.wallZ(13, 26, 38.4, UP2, HOUSE_TOP, [], 'wallLower');
  b.wallX(26, 13, 16.4, TOP2, HOUSE_TOP, [], 'wallLower');
  b.wallX(38.4, 13, 16.4, UP2, HOUSE_TOP, [], 'wallLower');
  b.wallZ(16.4, 26, 38.4, TOP2, ROOF, [], 'wallLower');
  b.wallZ(16.4, 26, 38.4, ROOF, HOUSE_TOP, [36.9], 'wallLower');
  b.wallX(35.4, 13.1, 16.3, UP2, ROOF - 0.3, [], 'wallLower');
  b.box(13.1, UP2 + 0.9, 28.6, 13.16, UP2 + 0.96, 35.4, 'rust', NC);
  // fachada da casa de máquinas da escada, vista do telhado
  b.box(12.9, HOUSE_TOP, 25.9, 16.5, HOUSE_TOP + 0.3, 38.5, 'concrete', NC);
}

// ---------- TELHADO (y 7.3) x16.4..36 z26..38.4 + barracão de manutenção ----------
function roof(L) {
  const b = L.b, M = L.M;
  b.floor(16.4, 26, 36, 38.4, ROOF, 'concrete', 'roof');
  b.box(16.4, TOP2 + 0.25, 26, 36, ROOF, 38.4, 'concrete', NC);
  // platibanda
  b.box(16.4, ROOF, 25.8, 36.2, ROOF + 1.1, 26.1, 'concrete');
  b.box(35.9, ROOF, 26, 36.2, ROOF + 1.1, 38.6, 'concrete');
  b.box(16.4, ROOF, 38.3, 36.2, ROOF + 1.1, 38.6, 'concrete');
  // caixas d'água e respiros
  for (const x of [21, 24.5]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 1.8, 12), M.rust); t.position.set(x, ROOF + 1.6, 31.5); t.castShadow = true; b.group.add(t);
    for (const [dx, dz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) b.box(x + dx - 0.05, ROOF, 31.5 + dz - 0.05, x + dx + 0.05, ROOF + 0.7, 31.5 + dz + 0.05, 'metal', NC);
    L.game.col.addBox(x - 1.05, ROOF, 30.45, x + 1.05, ROOF + 2.5, 32.55, { tag: 'prop', blocksSight: true });
  }
  for (const [x, z] of [[19.2, 36.6], [29.2, 27.4], [33.4, 30.6]]) {
    b.box(x - 0.35, ROOF, z - 0.35, x + 0.35, ROOF + 0.9, z + 0.35, 'steelDark', P);
    b.box(x - 0.45, ROOF + 0.9, z - 0.45, x + 0.45, ROOF + 1.0, z + 0.45, 'metal', NC);
  }
  // barracão x31..35.8 z34..38.2 (porta no lado oeste, z 35.2)
  b.wallZ(31, 34, 38.2, ROOF, ROOF + 2.4, [35.2], 'rust', 1.2, 2.2);
  b.wallX(34, 31, 35.8, ROOF, ROOF + 2.4, [], 'rust');
  b.box(31, ROOF + 2.4, 34, 35.85, ROOF + 2.55, 38.25, 'rust', NC);
  b.box(33.1, ROOF, 37.5, 35.7, ROOF + 0.9, 38.15, 'woodDark', PL);               // bancada
  b.box(35.2, ROOF, 34.2, 35.75, ROOF + 1.8, 35.6, 'metal', P);                    // armário
  // a Torre de transmissão no horizonte (só cenário: luz vermelha piscando)
  const tower = new THREE.Group(); tower.position.set(70, ROOF - 30, 66);
  const towerMat = new THREE.MeshBasicMaterial({ color: 0x07090c, fog: false });
  for (const [h, w, y] of [[34, 2.4, 17], [20, 1.4, 44], [10, 0.6, 59]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), towerMat); m.position.y = y; tower.add(m); }
  const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshBasicMaterial({ color: 0xff2010, fog: false }));
  beacon.position.y = 64.5; tower.add(beacon);
  L.game.scene.add(tower);
  L.towerBeacon = beacon;
}

// ---------- portas ----------
function doors(L) {
  const g = L.game, ctx = { materials: L.M, group: L.b.group, col: g.col, audio: g.audio, bus: g.bus };
  const D = (o) => (L.doors[o.id] = new Door({ mat: L.M.door, ...o }, ctx));
  D({ id: 'mainStair', axis: 'x', x: 39.2, y: UP, z: 14, swing: -1, mat: L.M.doorMetal, locked: true,
    lockMsg: 'Não abre. Pelo vão, dá para ver um ferrolho passado do outro lado — na escada principal.', label: 'porta da escada principal' });
  D({ id: 'wing', axis: 'x', x: 26, y: UP2, z: 26, swing: 1, mat: L.M.doorMetal, label: 'porta da ala cirúrgica' });
  D({ id: 'sterile', axis: 'x', x: 20, y: UP2, z: 29, swing: 1, label: 'porta da esterilização' });
  D({ id: 'surgery2', axis: 'x', x: 27.5, y: UP2, z: 29, swing: 1, mat: L.M.doorMetal, label: 'porta da sala 2' });
  D({ id: 'recovery', axis: 'x', x: 33.5, y: UP2, z: 29, swing: 1, label: 'porta da recuperação' });
  D({ id: 'roofStair', axis: 'z', x: 16.4, y: UP2, z: 27.5, swing: -1, mat: L.M.doorMetal, label: 'porta da escada do telhado' });
  D({ id: 'roofDoor', axis: 'z', x: 16.4, y: ROOF, z: 36.9, swing: 1, mat: L.M.doorMetal, label: 'porta do telhado' });
}
export const WING_DOORS = ['mainStair', 'wing', 'sterile', 'surgery2', 'recovery', 'roofStair', 'roofDoor'];

// ---------- luzes ----------
function lights(L) {
  L.lamp(39.5, TOP2, 19, 0xffb46a, 1.8, 10, { flicker: true });                     // escada principal
  L.lamp(26, TOP2, 27.5, 0xd8d0a0, 2.0, 13, { flicker: true });                     // corredor da ala
  L.lamp(20, TOP2, 33.5, 0x9ab8c8, 1.5, 9);                                         // esterilização
  L.lamp(27.5, TOP2 - 0.75, 32.7, 0xf0f0ff, 2.3, 8, { flicker: true });             // foco da sala 2
  L.lamp(33.5, TOP2, 34, 0xff4a30, 1.5, 9, { mat: L.M.lampRed });                   // recuperação
  L.lamp(33.4, ROOF + 2.4, 36.1, 0xffb46a, 1.4, 6, { flicker: true });              // barracão
  const moon = new THREE.PointLight(0x7a90b8, 1.7, 30, 1.1); moon.position.set(25, ROOF + 9, 31); L.game.scene.add(moon);
}

// ---------- navegação ----------
function nav(L) {
  const n = L.game.nav, d = L.doors;
  const N = (id, x, y, z) => n.addNode(id, x, y, z);
  const K = (a, b2, door) => n.link(a, b2, door);
  // escada principal
  N('ms_bot', 39.2, UP, 15.0); N('ms_mid', 39.5, 2.0, 18.7); N('ms_top', 39.5, UP2, 23.1);
  K('cor_39', 'ms_bot', d.mainStair); K('ms_bot', 'ms_mid'); K('ms_mid', 'ms_top'); N('ms_gap', 37.4, UP2, 23.15); K('ms_top', 'ms_gap'); K('ms_gap', 'ad_37');
  // ala
  N('wg_26', 26, UP2, 27.4); N('wg_17', 17.4, UP2, 27.5); N('wg_20', 20, UP2, 27.5); N('wg_27', 27.5, UP2, 27.5); N('wg_33', 33.5, UP2, 27.5); N('wg_35', 35.2, UP2, 27.5);
  K('ss_top', 'wg_26', d.wing); K('wg_26', 'wg_20'); K('wg_20', 'wg_17'); K('wg_26', 'wg_27'); K('wg_27', 'wg_33'); K('wg_33', 'wg_35');
  N('st_door', 20, UP2, 30.2); N('st_c', 20, UP2, 32.8); N('st_n', 19.5, UP2, 36.8);
  K('wg_20', 'st_door', d.sterile); K('st_door', 'st_c'); K('st_c', 'st_n');
  N('s2_door', 27.5, UP2, 30.2); N('s2_w', 25.6, UP2, 32.6); N('s2_n', 27.5, UP2, 35.1); N('s2_e', 29.4, UP2, 32.0); N('exp_c', 27.5, UP2, 37.0);
  K('wg_27', 's2_door', d.surgery2); K('s2_door', 's2_w'); K('s2_door', 's2_e'); K('s2_w', 's2_n'); K('s2_e', 's2_n');
  L.expurgoGate = { open: false };
  K('s2_n', 'exp_c', L.expurgoGate);
  N('rc_door', 33.5, UP2, 30.2); N('rc_c', 33.0, UP2, 33.8); N('rc_n', 33.0, UP2, 37.2);
  K('wg_33', 'rc_door', d.recovery); K('rc_door', 'rc_c'); K('rc_c', 'rc_n');
  // escada do telhado + telhado
  N('rs_low', 15.4, UP2, 27.5); N('rs_mid', 14.7, 5.65, 32); N('rs_top', 14.7, ROOF, 36.6);
  K('wg_17', 'rs_low', d.roofStair); K('rs_low', 'rs_mid'); K('rs_mid', 'rs_top');
  N('rf_door', 17.6, ROOF, 36.9); N('rf_w', 18.6, ROOF, 33.4); N('rf_c', 27, ROOF, 35); N('rf_s', 27, ROOF, 28); N('rf_e', 33.2, ROOF, 28.5);
  N('rf_shed', 30.2, ROOF, 35.2); N('shed_c', 33.2, ROOF, 35.6);
  K('rs_top', 'rf_door', d.roofDoor); K('rf_door', 'rf_w'); K('rf_door', 'rf_c'); K('rf_w', 'rf_c'); K('rf_c', 'rf_s'); K('rf_s', 'rf_e'); K('rf_e', 'rf_c');
  K('rf_c', 'rf_shed'); K('rf_shed', 'shed_c');
}

/** animação: farol da Torre */
export function updateWing(L, dt, t) {
  if (L.towerBeacon) L.towerBeacon.visible = Math.sin(t * 2.2) > 0.2;
  if (L.blastLight && L.blastLight.intensity > 0) L.blastLight.intensity = Math.max(0, L.blastLight.intensity - dt * 14);
}
