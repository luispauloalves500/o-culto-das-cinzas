// Fatia "3º andar": ala pediátrica / maternidade sobre a administração (y 7.3, x12..41 z14..26) — corredor,
// brinquedoteca (teatrinho de fantoches + caixinha de música), berçário, posto de enfermagem, posto de segurança,
// o Quarto 7 (secreto, acorrentado) e a escada de incêndio externa que desce ao patamar da escada principal.
// Só geometria/portas/luzes/navegação; a lógica fica em HospitalPedsScript.js.
import * as THREE from 'three';
import { Door } from '../../world/Doors.js';

export const UP2 = 4, ROOF = 7.3;
const TOP2 = 7, TOP3 = 10.4, HOUSE_TOP = 10;
const P = { tag: 'prop', sight: false, cast: true };
const PL = { tag: 'prop-low', sight: false, cast: true };
const NC = { collide: false };

export const PEDS_CHECKPOINTS = {
  peds: { x: 27, y: ROOF, z: 24.4, yaw: Math.PI },
  postoPed: { x: 34.2, y: ROOF, z: 17.5, yaw: Math.PI },
  fireEscape: { x: 42.2, y: UP2, z: 22.7, yaw: Math.PI },
};

export const PEDS_ZONES = [
  { id: 'peds', minX: 12, maxX: 41, minZ: 14, maxZ: 26, minY: 7.0, maxY: 11, fog: 0x0d090c, density: 0.08 },
  { id: 'fireEscape', minX: 41, maxX: 44.5, minZ: 13, maxZ: 24.5, minY: 3.5, maxY: 12, fog: 0x0b1018, density: 0.035 },
];

// teatrinho de fantoches que esconde a porta do Quarto 7 (lado da brinquedoteca)
export const THEATER = { x0: 16.1, x1: 17.0, z0: 16.9, z1: 19.1 };
// cadeado da corrente do Quarto 7 (só cede a um tiro)
export const PADLOCK = { x: 16.24, y: ROOF + 1.05, z: 18.25 };
export const MUSIC_BOX = { x: 22.1, y: ROOF + 0.95, z: 14.7 };

export function buildPeds(L) {
  shell(L);
  rooms(L);
  fireEscape(L);
  doors(L);
  lights(L);
  nav(L);
}

// ---------- estrutura ----------
function shell(L) {
  const b = L.b;
  b.floor(12, 14, 41, 26, ROOF, 'tile', 'peds');
  b.ceiling(12, 14, 41, 26, TOP3);
  // externas
  b.wallX(14, 12, 41, TOP2, TOP3);
  b.wallZ(12, 14, 26, TOP2, TOP3);
  b.wallX(26, 36, 41, TOP2, ROOF, [], 'concrete');
  b.wallX(26, 16.4, 41, ROOF, TOP3, [27]);                     // porta para o telhado
  b.wallX(26, 12, 13, ROOF, TOP3);
  b.wallX(26, 13, 16.4, HOUSE_TOP, TOP3);
  b.wallZ(41, 14, 26, TOP2, ROOF, [], 'concrete');
  b.wallZ(41, 14, 26, ROOF, TOP3, [15.1]);                     // saída de incêndio
  // divisórias: corredor × quartos, e entre quartos
  b.wallX(22, 12, 16, ROOF, TOP3);
  b.wallX(22, 16, 41, ROOF, TOP3, [19.5, 27, 33.5, 38.5]);
  b.wallZ(16, 14, 22, ROOF, TOP3, [18], 'wallLower');          // Quarto 7 (atrás do teatrinho)
  b.wallZ(23, 14, 22, ROOF, TOP3);
  b.wallZ(31, 14, 22, ROOF, TOP3);
  b.wallZ(36, 14, 22, ROOF, TOP3);
  // placa da entrada, vista do telhado
  L.sign('PEDIATRIA · MATERNIDADE', 27, ROOF + 2.62, 26.13, 0, 1.9, 0.22, { bg: '#d8c8a8', fg: '#3a1a18' });
  L.sign('SILÊNCIO — BEBÊS DORMINDO', 27, ROOF + 2.55, 22.13, 0, 1.6, 0.16, { bg: '#c8b8d0', fg: '#2a1a2a' });
  L.sign('BRINQUEDOTECA', 19.5, ROOF + 2.45, 22.13, 0, 0.9, 0.14, { bg: '#e0c890' });
  L.sign('POSTO DE ENFERMAGEM', 33.5, ROOF + 2.45, 22.13, 0, 1.1, 0.14, { bg: '#c9c2a4' });
  L.sign('SEGURANÇA', 38.5, ROOF + 2.45, 22.13, 0, 0.8, 0.14, { bg: '#7a2018', fg: '#f0e0d0' });
  L.sign('SAÍDA DE INCÊNDIO →', 40.85, ROOF + 2.45, 15.1, -Math.PI / 2, 1.0, 0.14, { bg: '#2a6a30', fg: '#e8ffe8' });
  L.sign('SAÍDA DE INCÊNDIO', 40.85, UP2 + 2.5, 23.15, -Math.PI / 2, 0.9, 0.14, { bg: '#2a6a30', fg: '#e8ffe8' });
}

function rooms(L) {
  const b = L.b, M = L.M;
  M.toyRed = M.toyRed || new THREE.MeshLambertMaterial({ color: 0x8a2a22 });
  M.toyBlue = M.toyBlue || new THREE.MeshLambertMaterial({ color: 0x2a4a7a });
  M.toyYellow = M.toyYellow || new THREE.MeshLambertMaterial({ color: 0xa08a2a });
  M.drawing = M.drawing || new THREE.MeshLambertMaterial({ color: 0xd8d0b8, side: THREE.DoubleSide });
  const toys = [M.toyRed, M.toyBlue, M.toyYellow];
  // CORREDOR z22..26: cadeiras de rodas, banco, desenhos de criança nas paredes, cavalinho
  b.box(13.0, ROOF, 24.6, 14.6, ROOF + 0.45, 25.6, 'woodDark', PL);
  b.box(30.2, ROOF, 25.1, 31.0, ROOF + 0.9, 25.8, 'metal', PL);
  b.box(35.6, ROOF, 22.3, 36.4, ROOF + 0.9, 23.0, 'metal', PL);
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.24), M.drawing);
    m.position.set(14 + i * 2.9 + (i % 2) * 0.4, ROOF + 1.3 + (i % 3) * 0.18, 22.12); m.rotation.z = ((i * 37) % 7 - 3) * 0.05; b.group.add(m);
  }
  const horse = new THREE.Group(); horse.position.set(24.4, ROOF, 24.9); horse.rotation.y = 0.7;
  const hb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.7), M.toyRed); hb.position.y = 0.55; horse.add(hb);
  const hh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.3, 0.2), M.toyRed); hh.position.set(0, 0.75, 0.38); horse.add(hh);
  const rk = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.9), M.woodDark); rk.position.y = 0.2; horse.add(rk);
  b.group.add(horse);
  // BRINQUEDOTECA x16..23 z14..22: mesinhas, blocos, estante e o teatrinho de fantoches
  b.box(18.6, ROOF, 15.8, 20.4, ROOF + 0.5, 17.0, 'wood', PL);
  b.box(18.6, ROOF, 19.0, 20.4, ROOF + 0.5, 20.2, 'wood', PL);
  for (const [x, z] of [[18.3, 16.4], [20.7, 16.4], [18.3, 19.6], [20.7, 19.6]]) b.box(x - 0.18, ROOF, z - 0.18, x + 0.18, ROOF + 0.32, z + 0.18, 'woodDark', NC);
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), toys[i % 3]);
    m.position.set(17.6 + ((i * 53) % 40) / 10, ROOF + 0.07 + (i % 4 === 0 ? 0.14 : 0), 14.8 + ((i * 29) % 65) / 10); m.rotation.y = i; b.group.add(m);
  }
  b.box(21.2, ROOF, 14.15, 22.85, ROOF + 0.9, 14.9, 'woodDark', PL);              // estante da caixinha
  // caixinha de música
  const mb = new THREE.Group(); mb.position.set(MUSIC_BOX.x, ROOF + 0.9, MUSIC_BOX.z);
  const mbody = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.16), M.toyBlue); mbody.position.y = 0.06; mb.add(mbody);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.16), M.gold); lid.position.set(0, 0.13, 0); mb.add(lid);
  const dancer = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.03, 0.1, 6), M.sheet); dancer.position.y = 0.19; mb.add(dancer);
  const crank = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.02), M.metal); crank.position.set(0.13, 0.06, 0); mb.add(crank);
  b.group.add(mb);
  L.musicBox = { group: mb, dancer, lid };
  // teatrinho (móvel): encostado na parede oeste, cobre a porta acorrentada
  const T = THEATER, th = new THREE.Group();
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; th.add(m); return m; };
  add(new THREE.BoxGeometry(T.x1 - T.x0, 1.0, T.z1 - T.z0), M.toyRed, 0, 0.5, 0);
  add(new THREE.BoxGeometry(0.1, 1.5, 0.12), M.toyRed, 0.35, 1.75, -1.0);
  add(new THREE.BoxGeometry(0.1, 1.5, 0.12), M.toyRed, 0.35, 1.75, 1.0);
  add(new THREE.BoxGeometry(0.12, 0.3, 2.2), M.toyYellow, 0.35, 2.6, 0);
  add(new THREE.BoxGeometry(0.04, 1.2, 1.9), M.curtain, 0.3, 1.65, 0);
  const puppet = add(new THREE.BoxGeometry(0.1, 0.18, 0.12), M.skin, 0.38, 1.15, 0.4);
  th.position.set((T.x0 + T.x1) / 2, ROOF, (T.z0 + T.z1) / 2);
  b.group.add(th);
  const thCol = L.game.col.addBox(T.x0, ROOF, T.z0, T.x1, ROOF + 2.7, T.z1, { tag: 'prop', blocksSight: true });
  L.theater = { group: th, collider: thCol, puppet, z: th.position.z };
  // corrente + cadeado sobre a porta do Quarto 7
  const chain = new THREE.Group();
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.08), M.steelDark); m.position.set(16.17, ROOF + 1.5 - i * 0.06 - Math.abs(i - 4) * 0.02, 17.5 + i * 0.18); m.rotation.x = 0.5 * (i % 2); chain.add(m); }
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.11), M.gold); lock.position.set(PADLOCK.x, PADLOCK.y, PADLOCK.z); chain.add(lock);
  b.group.add(chain);
  const brokenLock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.12), M.gold); brokenLock.position.set(16.5, ROOF + 0.03, 18.6); brokenLock.rotation.y = 0.8; brokenLock.visible = false; b.group.add(brokenLock);
  L.padlock = { chain, lock, broken: brokenLock };
  // BERÇÁRIO x23..31 z14..22: berços em fileiras, um deles com o facão cravado
  for (const x of [24.6, 27.0, 29.4]) for (const z of [15.6, 18.4]) {
    b.box(x - 0.4, ROOF, z - 0.6, x + 0.4, ROOF + 0.55, z + 0.6, 'sheet', PL);
    for (const dx of [-0.38, 0.38]) b.box(x + dx - 0.02, ROOF + 0.55, z - 0.6, x + dx + 0.02, ROOF + 0.95, z + 0.6, 'metal', NC);
    for (const dz of [-0.58, 0.58]) b.box(x - 0.4, ROOF + 0.55, z + dz - 0.02, x + 0.4, ROOF + 0.95, z + dz + 0.02, 'metal', NC);
  }
  for (const [x, z, r] of [[27.2, 16.0, 0.5], [25.6, 20.4, 2.1]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), M.bloodDecal); m.rotation.x = -Math.PI / 2; m.rotation.z = r; m.position.set(x, ROOF + 0.012, z); b.group.add(m);
  }
  // POSTO DE ENFERMAGEM x31..36 z14..22: balcão, armário, mesa do livro de registros
  b.box(31.2, ROOF, 19.6, 34.4, ROOF + 1.0, 20.3, 'woodDark', PL);
  b.box(33.8, ROOF, 14.2, 35.8, ROOF + 0.9, 15.1, 'wood', PL);
  b.box(31.2, ROOF, 14.2, 32.0, ROOF + 1.9, 16.4, 'metal', P);
  // POSTO DE SEGURANÇA x36..41 z14..22: mesa, armário de armas arrombado, monitores mortos
  b.box(37.0, ROOF, 17.6, 38.8, ROOF + 0.85, 18.6, 'woodDark', PL);
  b.box(39.9, ROOF, 19.6, 40.85, ROOF + 1.9, 21.6, 'steelDark', P);
  b.box(39.7, ROOF + 0.4, 19.7, 39.72, ROOF + 1.7, 21.5, 'steel', NC);
  for (const z of [17.7, 18.2]) b.box(37.2, ROOF + 0.85, z, 37.6, ROOF + 1.2, z + 0.35, 'steelDark', NC);
  // QUARTO 7 x12..16 z14..22: caminha, desenhos por toda parede, a fita vermelha
  b.box(12.2, ROOF, 14.3, 13.2, ROOF + 0.45, 16.1, 'sheet', PL);
  b.box(12.2, ROOF, 20.6, 13.4, ROOF + 0.7, 21.8, 'woodDark', PL);             // criado-mudo
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.22), M.drawing);
    const onX = i % 2 === 0;
    if (onX) { m.position.set(12.4 + (i * 0.27) % 3.3, ROOF + 0.6 + ((i * 13) % 17) / 10, 14.12); }
    else { m.position.set(12.12, ROOF + 0.6 + ((i * 11) % 17) / 10, 14.6 + (i * 0.61) % 7); m.rotation.y = Math.PI / 2; }
    m.rotation.z = ((i * 31) % 9 - 4) * 0.06; b.group.add(m);
  }
}

// ---------- ESCADA DE INCÊNDIO x41..43.4 (2º andar ↔ 3º andar), lado externo da escada principal ----------
function fireEscape(L) {
  const b = L.b, g = L.game, col = g.col;
  b.floor(41, 14, 43.4, 16.2, ROOF, 'rust', 'fireEscapeTop');
  b.stairsZ(41.1, 43.3, 16.2, 21.4, ROOF, UP2, 16, 'rust');
  b.floor(41, 21.4, 43.4, 23.9, UP2, 'rust', 'fireEscapeBottom');
  // a escada principal ganha um vão no patamar do 2º andar (porta corta-fogo)
  // guarda-corpo: colisão contínua + montantes e corrimão visuais
  col.addBox(43.3, UP2, 14, 43.5, ROOF + 1.2, 23.95, { tag: 'wall', blocksSight: false });
  col.addBox(41, ROOF, 13.85, 43.5, ROOF + 1.2, 14.05, { tag: 'wall', blocksSight: false });
  col.addBox(41, UP2, 23.85, 43.5, UP2 + 1.2, 24.05, { tag: 'wall', blocksSight: false });
  for (let z = 14; z <= 23.9; z += 1.1) {
    const y0 = z < 16.2 ? ROOF : z > 21.4 ? UP2 : ROOF - (z - 16.2) / 5.2 * (ROOF - UP2);
    b.box(43.33, y0, z - 0.03, 43.39, y0 + 1.05, z + 0.03, 'rust', NC);
  }
  b.box(43.32, ROOF + 1.0, 14, 43.4, ROOF + 1.06, 16.2, 'rust', NC);
  b.box(43.32, UP2 + 1.0, 21.4, 43.4, UP2 + 1.06, 23.9, 'rust', NC);
  b.box(41, ROOF + 1.0, 13.95, 43.4, ROOF + 1.06, 14.03, 'rust', NC);
  b.box(41, UP2 + 1.0, 23.87, 43.4, UP2 + 1.06, 23.95, 'rust', NC);
  // corrimão inclinado
  const len = Math.hypot(5.2, ROOF - UP2), rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, len), L.M.rust);
  rail.position.set(43.36, (ROOF + UP2) / 2 + 1.03, 18.8); rail.rotation.x = Math.atan2(ROOF - UP2, 5.2); b.group.add(rail);
  // estrutura de sustentação até o chão
  for (const z of [16.2, 21.4, 23.85]) b.box(43.25, 0, z - 0.06, 43.37, z > 21 ? UP2 : ROOF, z + 0.06, 'rust', NC);
}

// ---------- portas ----------
function doors(L) {
  const g = L.game, ctx = { materials: L.M, group: L.b.group, col: g.col, audio: g.audio, bus: g.bus };
  const D = (o) => (L.doors[o.id] = new Door({ mat: L.M.door, ...o }, ctx));
  D({ id: 'pedRoof', axis: 'x', x: 27, y: ROOF, z: 26, swing: -1, mat: L.M.doorMetal, label: 'porta da pediatria' });
  D({ id: 'brinq', axis: 'x', x: 19.5, y: ROOF, z: 22, swing: -1, label: 'porta da brinquedoteca' });
  D({ id: 'bercario', axis: 'x', x: 27, y: ROOF, z: 22, swing: -1, label: 'porta do berçário' });
  D({ id: 'postoPed', axis: 'x', x: 33.5, y: ROOF, z: 22, swing: -1, label: 'porta do posto de enfermagem' });
  D({ id: 'seguranca', axis: 'x', x: 38.5, y: ROOF, z: 22, swing: -1, mat: L.M.doorMetal, locked: true,
    lockMsg: 'Trancada. Pela janelinha: um armário de armas arrombado e alguém de uniforme sentado no chão.', label: 'porta da segurança' });
  D({ id: 'quarto7', axis: 'z', x: 16, y: ROOF, z: 18, swing: -1, mat: L.M.doorMetal, locked: true,
    lockMsg: 'Uma corrente grossa passa pela maçaneta, presa por um cadeado de aço. Nenhuma lâmina corta isso.', label: 'porta do Quarto 7' });
  D({ id: 'fireExitTop', axis: 'z', x: 41, y: ROOF, z: 15.1, swing: 1, mat: L.M.doorMetal, label: 'saída de incêndio' });
  D({ id: 'fireExit', axis: 'z', x: 41, y: UP2, z: 23.15, swing: 1, mat: L.M.doorMetal, locked: true,
    lockMsg: 'Porta corta-fogo. A barra antipânico só abre pelo lado de fora — da escada de incêndio.', label: 'porta corta-fogo' });
}
export const PEDS_DOORS = ['pedRoof', 'brinq', 'bercario', 'postoPed', 'seguranca', 'fireExitTop', 'fireExit'];

// ---------- luzes ----------
function lights(L) {
  L.lamp(19, TOP3, 24, 0xffc890, 1.6, 11, { flicker: true });                       // corredor oeste
  L.lamp(34, TOP3, 24, 0xd8d0a0, 1.6, 11);                                          // corredor leste
  L.lamp(19.5, TOP3, 18, 0xffa0c0, 1.5, 9, { flicker: true });                      // brinquedoteca
  L.lamp(27, TOP3, 18, 0xff5a40, 1.4, 9, { mat: L.M.lampRed });                     // berçário
  L.lamp(33.5, TOP3, 17, 0xcfe8d8, 1.5, 8);                                         // posto de enfermagem
  L.lamp(38.5, TOP3, 18, 0xffb46a, 1.3, 8, { flicker: true });                      // segurança
  L.lamp(14, TOP3, 18, 0xff8060, 0.9, 6, { flicker: true });                        // Quarto 7
  L.lamp(42.6, ROOF + 2.6, 15.1, 0x7dffa0, 1.2, 9, { mat: L.M.lampGreen });         // escada de incêndio
}

// ---------- navegação ----------
function nav(L) {
  const n = L.game.nav, d = L.doors;
  const N = (id, x, y, z) => n.addNode(id, x, y, z);
  const K = (a, b2, door) => n.link(a, b2, door);
  N('pc_14', 14.5, ROOF, 24); N('pc_19', 19.5, ROOF, 24); N('pc_27', 27, ROOF, 24.2); N('pc_33', 33.5, ROOF, 24); N('pc_38', 38.5, ROOF, 24); N('pc_40', 40, ROOF, 24.4);
  K('rf_s', 'pc_27', d.pedRoof); K('pc_14', 'pc_19'); K('pc_19', 'pc_27'); K('pc_27', 'pc_33'); K('pc_33', 'pc_38'); K('pc_38', 'pc_40');
  N('br_d', 19.5, ROOF, 20.8); N('br_c', 19.8, ROOF, 18); N('br_n', 19.5, ROOF, 15.2); N('q7_c', 14.2, ROOF, 18);
  K('pc_19', 'br_d', d.brinq); K('br_d', 'br_c'); K('br_c', 'br_n');
  K('br_c', 'q7_c', d.quarto7);
  N('be_d', 27, ROOF, 20.8); N('be_c', 27, ROOF, 17.0); N('be_n', 25.8, ROOF, 14.6);
  K('pc_27', 'be_d', d.bercario); K('be_d', 'be_c'); K('be_c', 'be_n');
  N('po_d', 33.5, ROOF, 20.9); N('po_c', 34.2, ROOF, 17.5);
  K('pc_33', 'po_d', d.postoPed); K('po_d', 'po_c');
  N('se_d', 38.5, ROOF, 20.8); N('se_c', 38.6, ROOF, 16.4); N('se_fx', 40.0, ROOF, 15.1);
  K('pc_38', 'se_d', d.seguranca); K('se_d', 'se_c'); K('se_c', 'se_fx');
  N('fe_top', 42.2, ROOF, 15.1); N('fe_mid', 42.2, 5.65, 18.8); N('fe_bot', 42.2, UP2, 22.6);
  K('se_fx', 'fe_top', d.fireExitTop); K('fe_top', 'fe_mid'); K('fe_mid', 'fe_bot'); K('fe_bot', 'ms_top', d.fireExit);
}

/** animação: a bailarina da caixinha gira enquanto toca */
export function updatePeds(L, dt) {
  const mb = L.musicBox;
  if (mb && mb.playing) mb.dancer.rotation.y += dt * 4;
  const th = L.theater;
  if (th && th.slide !== undefined && th.slide < 1) {
    th.slide = Math.min(1, th.slide + dt / 0.8);
    const k = th.slide * th.slide * (3 - 2 * th.slide);
    th.group.position.z = th.z + k * 2.4;
  }
}
