// Anexos do Cap. 1: lavanderia + incinerador (subsolo), escada de serviço + administração (2º andar)
// e a capela com coro. Tudo procedural (caixas + canvas). Chamado por HospitalLevel.build().
import * as THREE from 'three';
import { Door } from '../../world/Doors.js';

export const UP = 0, LO = -5, UP2 = 4;
const H_UP = 3.2, CEIL_LO = -1.8, TOP2 = 7;

export const ANNEX_CHECKPOINTS = {
  laundry: { x: 10.4, y: LO, z: 12.3, yaw: -Math.PI / 2 },
  admin: { x: 26, y: UP2, z: 23.8, yaw: -Math.PI / 2 },
  diretoria: { x: 35.6, y: UP2, z: 16.4, yaw: -Math.PI / 2 },
  chapel: { x: 6, y: UP, z: 15.6, yaw: 0 },
};

export const ANNEX_ZONES = [
  { id: 'furnace', minX: 0, maxX: 10, minZ: 14, maxZ: 20, minY: LO - 1, maxY: CEIL_LO, fog: 0x1c0a04, density: 0.09 },
  { id: 'laundry', minX: 2, maxX: 12, minZ: 2, maxZ: 14, minY: LO - 1, maxY: CEIL_LO, fog: 0x0c0c08, density: 0.08 },
  { id: 'chapel', minX: 0, maxX: 12, minZ: 14, maxZ: 24, minY: UP - 1, maxY: TOP2, fog: 0x0a0a12, density: 0.06 },
  { id: 'admin', minX: 12, maxX: 38, minZ: 14, maxZ: 26, minY: UP2 - 1, maxY: TOP2, fog: 0x080a10, density: 0.07 },
];

// ordem dos santos no hino (resposta do enigma das velas)
export const CANDLE_ORDER = ['bras', 'luzia', 'roque', 'dimas'];
export const CANDLES = {
  luzia: { name: 'S. LUZIA', x: 0.4, z: 15.6, face: Math.PI / 2 },
  roque: { name: 'S. ROQUE', x: 0.4, z: 21.2, face: Math.PI / 2 },
  bras: { name: 'S. BRÁS', x: 8.1, z: 14.4, face: 0 },
  dimas: { name: 'S. DIMAS', x: 3.3, z: 23.6, face: Math.PI },
};

export function buildAnnex(L) {
  laundry(L); furnace(L); serviceStair(L); admin(L); chapel(L);
  doors(L); lights(L); nav(L);
}

const P = { tag: 'prop', sight: false, cast: true };
const PL = { tag: 'prop-low', sight: false, cast: true };
const NC = { collide: false };

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- LAVANDERIA (subsolo) x2..12 z2..14 ----------
function laundry(L) {
  const b = L.b, M = L.M;
  b.floor(2, 2, 12, 14, LO, 'concrete', 'laundry');
  b.ceiling(2, 2, 12, 14, CEIL_LO, 'wallLower');
  b.wallZ(2, 2, 14, LO, CEIL_LO, [], 'wallLower');
  b.wallX(2, 2, 12, LO, CEIL_LO, [], 'wallLower');
  b.wallX(14, 0, 12, LO, CEIL_LO, [6], 'brick');           // lavanderia / incinerador (porta x=6)
  L.sign('LAVANDERIA', 12.13, LO + 2.62, 12, Math.PI / 2, 1.1, 0.2, { bg: '#4a4a3a', fg: '#e0dcc4' });
  // máquinas de lavar industriais (parede oeste)
  for (const z of [4, 6.5, 9]) {
    b.box(2.1, LO, z - 0.6, 3.4, LO + 1.15, z + 0.6, 'steel', P);
    const door = new THREE.Mesh(new THREE.CircleGeometry(0.34, 10), M.steelDark);
    door.rotation.y = Math.PI / 2; door.position.set(3.41, LO + 0.62, z); b.group.add(door);
    b.box(3.4, LO + 0.25, z - 0.45, 3.44, LO + 0.3, z + 0.45, 'rust', NC);
  }
  // calandra (passadeira de rolos)
  b.box(5, LO, 2.2, 9, LO + 1.0, 3.3, 'rust', P);
  for (const x of [5.6, 7, 8.4]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.1, 8), M.steel);
    r.rotation.x = Math.PI / 2; r.position.set(x, LO + 1.1, 2.75); b.group.add(r);
  }
  // mesa de dobrar + carrinhos de roupa
  b.box(9.6, LO, 4.4, 11.7, LO + 0.88, 6.1, 'steel', PL);
  b.box(9.8, LO + 0.88, 4.6, 10.6, LO + 0.98, 5.3, 'sheet', NC);
  b.box(8.4, LO, 7.1, 9.3, LO + 0.85, 7.8, 'metal', PL);
  b.box(8.45, LO + 0.6, 7.15, 9.25, LO + 0.95, 7.75, 'sheet', { collide: false, tile: 1 });
  b.box(4.4, LO, 11.2, 5.2, LO + 0.85, 12.0, 'metal', PL);
  b.box(4.45, LO + 0.6, 11.25, 5.15, LO + 0.9, 11.95, 'bandageDirty', NC);
  // varal com lençóis pendurados (escondem quem está atrás)
  b.box(3.8, LO + 2.75, 8.18, 9.6, LO + 2.78, 8.22, 'metal', NC);
  for (const [x0, x1, low] of [[4.2, 5.4, 0.7], [5.9, 7.1, 0.55], [7.6, 8.8, 0.8]]) {
    b.box(x0, LO + low, 8.17, x1, LO + 2.75, 8.23, 'sheet', { collide: false, tile: 1 });
  }
  // duto de roupa suja vindo da enfermaria
  b.box(10.8, LO + 1.5, 2.1, 11.9, CEIL_LO, 3.2, 'metal', { tag: 'prop', cast: true });
  b.box(10.6, LO, 2.1, 11.95, LO + 0.5, 3.6, 'sheet', { tag: 'prop-low', sight: false, tile: 1 });
  // registro de gás do incinerador + tubulação
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 5, 10), M.lampRed);
  wheel.rotation.y = Math.PI / 2; wheel.position.set(2.2, LO + 1.3, 12.5); b.group.add(wheel);
  for (const a of [0, Math.PI / 2]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 0.03), M.rust); s.rotation.x = a; wheel.add(s); }
  L.valveWheel = wheel;
  b.box(2.02, LO + 1.25, 12.0, 2.14, LO + 1.35, 14, 'rust', NC);
  b.box(2.02, LO + 1.25, 11.0, 2.14, CEIL_LO, 11.1, 'rust', NC);
  L.sign('GÁS · INCINERADOR', 2.13, LO + 1.75, 12.5, Math.PI / 2, 0.7, 0.14, { bg: '#d8c890', fg: '#5a1a10' });
  for (const [x, z, sz] of [[7.5, 10.5, 0.9], [4.2, 5.2, 0.6]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), M.bloodDecal); m.rotation.x = -Math.PI / 2; m.rotation.z = x; m.position.set(x, LO + 0.013, z); b.group.add(m);
  }
}

// ---------- INCINERADOR (subsolo) x0..10 z14..20 ----------
function furnace(L) {
  const b = L.b, M = L.M;
  b.floor(0, 14, 10, 20, LO, 'ash', 'furnace');
  b.ceiling(0, 14, 10, 20, CEIL_LO, 'brick');
  b.wallZ(0, 14, 20, LO, CEIL_LO, [], 'brick');
  b.wallX(20, 0, 10, LO, CEIL_LO, [], 'brick');
  b.wallZ(10, 14, 20, LO, CEIL_LO, [], 'brick');
  // corpo do forno (boca voltada para +x)
  L.game.col.addBox(0.1, LO, 15, 3, CEIL_LO, 19, { tag: 'wall', blocksSight: true });
  b.box(0.1, LO, 15, 3, LO + 0.4, 19, 'brick', NC);
  b.box(0.1, LO + 1.4, 15, 3, LO + 2.4, 19, 'brick', { collide: false, cast: true });
  b.box(0.1, LO + 0.4, 15, 3, LO + 1.4, 16.3, 'brick', NC);
  b.box(0.1, LO + 0.4, 17.7, 3, LO + 1.4, 19, 'brick', NC);
  b.box(0.1, LO + 2.4, 15.6, 2.2, CEIL_LO, 18.4, 'rust', NC);           // coifa / chaminé
  b.box(2.95, LO + 1.38, 16.2, 3.08, LO + 1.48, 17.8, 'rust', NC);     // verga de ferro
  b.box(0.2, LO + 0.4, 16.3, 0.3, LO + 1.4, 17.7, 'ember', NC);        // fundo em brasa
  // fogo animado (caixas aditivas) + cinzas
  const fire = new THREE.Group(); fire.position.set(1.6, LO + 0.4, 17); b.group.add(fire);
  const flames = [];
  for (let i = 0; i < 7; i++) {
    const big = i < 4;
    const m = new THREE.Mesh(new THREE.BoxGeometry(big ? 0.5 : 0.28, big ? 0.7 : 0.5, big ? 0.4 : 0.24), big ? M.fire : M.fireCore);
    m.position.set((i % 3 - 1) * 0.35, 0.3, ((i * 0.37) % 1 - 0.5) * 1.0); fire.add(m); flames.push({ m, ph: i * 1.7, big });
  }
  const bed = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.3), M.ember); bed.position.set(0, 0.02, 0); fire.add(bed);
  const light = new THREE.PointLight(0xff7030, 3.2, 11, 1.6); light.position.set(3.6, LO + 1.0, 17); L.game.scene.add(light);
  L.furnace = { fire, flames, bed, light, lit: true, t: 0 };
  for (const [x, z, s] of [[4.2, 16.5, 0.7], [3.5, 18.6, 0.5], [6.5, 15.2, 0.4]]) b.box(x - s, LO, z - s * 0.7, x + s, LO + 0.12, z + s * 0.7, 'ash', NC);
  // atiçador, carrinho de cadáveres, mesa do forneiro
  b.box(3.3, LO, 19.4, 3.36, LO + 1.6, 19.46, 'rust', NC);
  b.box(6.6, LO, 18.2, 8.4, LO + 0.8, 19.6, 'steel', PL);
  b.box(6.7, LO + 0.8, 18.3, 8.3, LO + 1.0, 19.5, 'sheet', { collide: false, tile: 1 });
  b.box(8.6, LO, 14.4, 9.8, LO + 0.82, 15.6, 'woodDark', PL);
  L.sign('INCINERADOR — PERIGO', 5, LO + 2.6, 19.87, Math.PI, 1.6, 0.24, { bg: '#7a1c12', fg: '#f0e0b0' });
  L.sign('INCINERADOR', 6, LO + 2.62, 14.13, Math.PI, 1.0, 0.2, { bg: '#4a3a2a', fg: '#e0d0b0' });
}

// ---------- ESCADA DE SERVIÇO x24..28 z14..22.4 (térreo → 2º andar) ----------
function serviceStair(L) {
  const b = L.b;
  b.floor(24, 14, 28, 22.4, UP, 'concrete', 'serviceStairBase');
  b.stairsZ(24.1, 27.9, 22.4, 14.8, UP2, UP, 18, 'concrete');
  b.ceiling(24, 14, 28, 22.4, TOP2);
  b.wallZ(24, 22, 22.4, UP, H_UP, [], 'wallLower');
  b.wallX(22.5, 24, 28, UP, UP2 - 0.3, [], 'wallLower');
  b.wallZ(24, 14, 22, H_UP, TOP2, [], 'wallLower');
  b.wallZ(28, 14, 22, H_UP, TOP2, [], 'wallLower');
  b.wallX(14, 24, 28, H_UP, TOP2, [], 'wallLower');
  b.box(24.1, 0.9, 14.8, 24.16, 0.96, 22.4, 'rust', NC);   // corrimão
  L.sign('ESCADA DE SERVIÇO', 26, 2.62, 13.87, Math.PI, 1.3, 0.2, { bg: '#c9c2a4', fg: '#1c1a14' });
  L.sign('ADMINISTRAÇÃO ↑', 26, UP2 + 2.5, 22.42, 0, 1.2, 0.2, { bg: '#c9c2a4' });
}

// ---------- 2º ANDAR: corredor administrativo, secretaria, diretoria ----------
function admin(L) {
  const b = L.b, M = L.M;
  b.floor(12, 22, 38, 26, UP2, 'wood', 'adminCorridor');
  b.ceiling(12, 22, 38, 26, TOP2);
  b.wallX(26, 12, 38, UP2, TOP2, [26]);                    // ala cirúrgica superior (porta x=26)
  b.wallZ(38, 22, 26, UP2, TOP2, [23.15]);                 // patamar da escada principal
  b.wallZ(12, 14, 26, UP2, TOP2, [23], 'chapelWall');      // passagem para o coro da capela
  b.wallX(22, 12, 24, UP2, TOP2, [19]);
  b.wallX(22, 28, 38, UP2, TOP2, [33]);
  // quadros de antigos diretores (as janelas deram lugar à ala cirúrgica)
  for (const x of [15.5, 21, 31, 35.5]) {
    b.box(x - 0.45, UP2 + 1.2, 25.86, x + 0.45, UP2 + 2.2, 25.9, 'woodDark', NC);
    b.box(x - 0.36, UP2 + 1.3, 25.84, x + 0.36, UP2 + 2.1, 25.86, 'leatherDark', NC);
  }
  b.box(29.2, UP2, 25.3, 30.8, UP2 + 0.45, 25.85, 'woodDark', PL);   // banco de espera
  b.box(16.6, UP2, 25.3, 18.2, UP2 + 0.45, 25.85, 'woodDark', PL);
  L.sign('ADMINISTRAÇÃO', 19, UP2 + 2.62, 22.13, 0, 1.2, 0.2, { bg: '#c9c2a4' });
  L.sign('SECRETARIA', 19, UP2 + 2.45, 22.13, 0, 0.8, 0.14, { bg: '#c9c2a4' });
  L.sign('DIRETORIA', 33, UP2 + 2.45, 22.13, 0, 0.8, 0.14, { bg: '#c9c2a4' });
  // SECRETARIA x14..24 z14..22
  b.floor(14, 14, 24, 22, UP2, 'wood', 'secretaria');
  b.ceiling(14, 14, 24, 22, TOP2);
  b.wallZ(14, 14, 22, H_UP, TOP2); b.wallX(14, 14, 24, H_UP, UP2); b.wallX(14, 14, 24, UP2, TOP2, [18.6]);
  for (const x0 of [15.4, 20]) {
    b.box(x0, UP2, 15.6, x0 + 1.8, UP2 + 0.76, 16.6, 'woodDark', PL);
    b.box(x0 + 0.5, UP2 + 0.76, 15.8, x0 + 1.0, UP2 + 0.96, 16.2, 'metal', NC);   // máquina de escrever
  }
  for (const z of [18, 19, 20]) b.box(14.1, UP2, z, 14.7, UP2 + 1.4, z + 0.9, 'metal', P); // arquivos
  b.box(22.6, UP2, 14.1, 23.9, UP2 + 2.0, 15.0, 'woodDark', P);
  for (const [x, z, r] of [[17.5, 19, 0.3], [21, 18, 1.2], [19.5, 15, 2]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.22), M.paper); m.rotation.x = -Math.PI / 2; m.rotation.z = r; m.position.set(x, UP2 + 0.012, z); b.group.add(m);
  }
  // DIRETORIA x28..38 z14..22
  b.floor(28, 14, 38, 22, UP2, 'wood', 'diretoria');
  b.ceiling(28, 14, 38, 22, TOP2);
  b.wallZ(38, 14, 22, H_UP, TOP2); b.wallX(14, 28, 38, H_UP, TOP2);
  b.box(31.4, UP2, 15.3, 34.6, UP2 + 0.78, 16.4, 'woodDark', PL);
  b.box(32.6, UP2, 14.3, 33.4, UP2 + 1.1, 14.9, 'leatherDark', PL);       // poltrona
  b.box(37.2, UP2, 16.6, 37.9, UP2 + 2.2, 21.6, 'woodDark', P);           // estante
  for (let i = 0; i < 4; i++) b.box(37.15, UP2 + 0.4 + i * 0.5, 16.7, 37.2, UP2 + 0.75 + i * 0.5, 21.5, 'leather', NC);
  b.box(36, UP2, 14.6, 37.2, UP2 + 0.86, 15.7, 'woodDark', PL);           // mesinha do livro
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), M.altarCloth); rug.rotation.x = -Math.PI / 2; rug.position.set(33, UP2 + 0.01, 18.4); b.group.add(rug);
  // retrato do diretor com o rosto raspado
  const tex = canvasTex(64, 80, (g, w, h) => {
    g.fillStyle = '#3a2a1a'; g.fillRect(0, 0, w, h); g.fillStyle = '#6a5a3a'; g.fillRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#2a2018'; g.fillRect(16, 40, 32, 36); g.fillStyle = '#b09070'; g.fillRect(22, 14, 20, 26);
    g.strokeStyle = '#1a0c08'; g.lineWidth = 2; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(20 + i * 2, 12); g.lineTo(26 + i * 2, 42); g.stroke(); }
  });
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), new THREE.MeshLambertMaterial({ map: tex }));
  pic.position.set(33, UP2 + 1.9, 14.12); b.group.add(pic);
  L.sign('DR. S. VERNET — DIRETOR', 33, UP2 + 1.25, 14.12, 0, 0.8, 0.1, { bg: '#b08a3a' });
}

// ---------- CAPELA x0..12 z14..24 (pé-direito duplo, coro no 2º andar) ----------
function chapel(L) {
  const b = L.b, M = L.M;
  b.floor(0, 14, 12, 24, UP, 'stone', 'chapel');
  b.ceiling(0, 14, 12, 24, TOP2, 'woodDark');
  b.wallZ(0, 14, 24, UP, TOP2, [], 'chapelWall');
  b.wallX(24, 0, 12, UP, TOP2, [], 'chapelWall');
  b.wallZ(12, 14, 24, UP, UP2, [], 'chapelWall');
  b.box(0, H_UP, 13.9, 12, TOP2, 14.1, 'chapelWall');
  L.sign('CAPELA DE SÃO DIMAS', 6, 2.62, 13.87, Math.PI, 1.5, 0.22, { bg: '#5a4a2a', fg: '#e8d8a8' });
  // degrau do altar, altar e relicário
  b.floor(2.5, 21.9, 9.5, 23.9, UP + 0.2, 'stone', 'altarStep');
  b.box(2.5, UP, 21.9, 9.5, UP + 0.2, 23.9, 'stone', NC);
  b.box(4.2, UP + 0.2, 22.7, 7.8, UP + 1.15, 23.5, 'stone', { tag: 'prop', cast: true });
  b.box(4.1, UP + 0.75, 22.62, 7.9, UP + 1.18, 23.58, 'altarCloth', NC);
  const rel = new THREE.Group(); rel.position.set(6, UP + 1.18, 23.1); b.group.add(rel);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.26, 0.32), M.gold); base.position.y = 0.13; rel.add(base);
  const lidPivot = new THREE.Group(); lidPivot.position.set(0, 0.26, 0.16); rel.add(lidPivot);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.34), M.gold); lid.position.set(0, 0.04, -0.17); lidPivot.add(lid);
  const cross = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.04), M.gold); cross.position.set(0, 0.12, -0.17); lidPivot.add(cross);
  L.relic = { group: rel, lid: lidPivot, open: false, t: 0 };
  // castiçais altos e o emblema do culto (sol de cinzas) sobre a imagem raspada
  for (const x of [3.2, 8.8]) { b.box(x - 0.05, UP + 0.2, 23.4, x + 0.05, UP + 1.9, 23.5, 'gold', NC); b.box(x - 0.04, UP + 1.9, 23.42, x + 0.04, UP + 2.1, 23.48, 'candle', NC); }
  const emb = canvasTex(128, 128, (g, w) => {
    g.fillStyle = '#2a2420'; g.fillRect(0, 0, w, w);
    g.strokeStyle = '#8a7a5a'; g.lineWidth = 3;
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g.beginPath(); g.moveTo(64 + Math.cos(a) * 22, 64 + Math.sin(a) * 22); g.lineTo(64 + Math.cos(a) * (i % 2 ? 46 : 58), 64 + Math.sin(a) * (i % 2 ? 46 : 58)); g.stroke(); }
    g.fillStyle = '#5a4a3a'; g.beginPath(); g.arc(64, 64, 20, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1a1410'; g.beginPath(); g.arc(64, 64, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#6a1a12'; for (let i = 0; i < 30; i++) g.fillRect((i * 37) % 128, 92 + ((i * 13) % 30), 2, 4 + (i % 5));
  });
  const embM = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshLambertMaterial({ map: emb, emissive: 0x100a04 }));
  embM.rotation.y = Math.PI; embM.position.set(6, 3.7, 23.88); b.group.add(embM);
  // vitrais (parede oeste) — só a luz da lua passa
  const palettes = [['#2a4a8a', '#8a2a2a', '#c8a040'], ['#2a6a4a', '#5a2a7a', '#c8c0a0'], ['#7a2a1a', '#2a3a7a', '#a08a30']];
  for (let i = 0; i < 3; i++) {
    const pal = palettes[i];
    const t = canvasTex(32, 96, (g, w, h) => {
      g.fillStyle = '#101010'; g.fillRect(0, 0, w, h);
      for (let y = 2; y < h - 2; y += 9) for (let x = 2; x < w - 2; x += 9) { g.fillStyle = pal[(x * 3 + y * 7 + i) % 3]; g.fillRect(x, y, 7, 7); }
      g.fillStyle = '#d8c890'; g.fillRect(12, 18, 8, 8); g.fillRect(10, 28, 12, 34);   // santo
      g.fillStyle = '#101010'; g.fillRect(12, 18, 8, 3);                                // rosto apagado
    });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.8), new THREE.MeshBasicMaterial({ map: t, color: 0x9098b0 }));
    glass.rotation.y = Math.PI / 2; glass.position.set(0.12, 3.6, 16.2 + i * 3); b.group.add(glass);
    b.box(0.1, 2.15, 15.6 + i * 3, 0.2, 2.2, 16.8 + i * 3, 'stone', NC);
  }
  // bancos (pews): dois blocos com corredor central
  for (const z of [16.4, 17.8, 19.2, 20.6]) for (const [x0, x1] of [[1.0, 4.6], [7.0, 9.6]]) {
    b.box(x0, UP + 0.42, z, x1, UP + 0.48, z + 0.45, 'pew', NC);
    b.box(x0, UP + 0.48, z + 0.4, x1, UP + 0.98, z + 0.48, 'pew', NC);
    for (const x of [x0, x1 - 0.06]) b.box(x, UP, z, x + 0.06, UP + 0.98, z + 0.48, 'pew', NC);
    L.game.col.addBox(x0, UP, z, x1, UP + 0.98, z + 0.5, { tag: 'prop-low', blocksSight: false });
  }
  // púlpito/estante com o hinário
  b.box(2.7, UP, 21.0, 3.3, UP + 1.05, 21.5, 'woodDark', PL);
  b.box(2.6, UP + 1.05, 20.95, 3.4, UP + 1.1, 21.55, 'woodDark', NC);
  // suportes de velas com placas
  L.candles = {};
  for (const id in CANDLES) {
    const c = CANDLES[id], fx = Math.sin(c.face), fz = Math.cos(c.face);
    const along = Math.abs(fx) > 0.5 ? 'z' : 'x';
    const hw = 0.45, hd = 0.22, y0 = id === 'dimas' ? UP + 0.2 : UP;
    const [x0, x1, z0, z1] = along === 'z' ? [c.x - hd, c.x + hd, c.z - hw, c.z + hw] : [c.x - hw, c.x + hw, c.z - hd, c.z + hd];
    b.box(x0, y0, z0, x1, y0 + 0.9, z1, 'woodDark', PL);
    const flames = [];
    for (let k = -2; k <= 2; k++) {
      const cx = c.x + (along === 'x' ? k * 0.16 : 0), cz = c.z + (along === 'z' ? k * 0.16 : 0);
      b.box(cx - 0.02, y0 + 0.9, cz - 0.02, cx + 0.02, y0 + 1.02 + (k & 1) * 0.04, cz + 0.02, 'candle', NC);
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.07, 0.035), M.flame); f.position.set(cx, y0 + 1.08 + (k & 1) * 0.04, cz); f.visible = false; b.group.add(f); flames.push(f);
    }
    L.sign(c.name, c.x + fx * (hd + 0.01), y0 + 0.62, c.z + fz * (hd + 0.01), c.face, 0.5, 0.12, { bg: '#3a2a1a', fg: '#e8d8a8' });
    L.candles[id] = { flames, lit: false, pos: { x: c.x + fx * 0.6, y: y0 + 1.0, z: c.z + fz * 0.6 } };
  }
  // escada para o coro (encostada à parede leste) + parede-guarda de madeira
  b.stairsZ(10.1, 11.9, 21.6, 15.4, UP2, UP, 16, 'woodDark');
  b.box(9.95, UP, 15.4, 10.05, UP2 + 1.0, 21.6, 'woodDark', { tag: 'wall' });
  // coro (mezanino) x8.6..12 z21.6..24 no nível do 2º andar
  b.floor(8.6, 21.6, 12, 24, UP2, 'woodDark', 'coro');
  b.box(8.6, UP2, 21.6, 8.7, UP2 + 1.0, 24, 'woodDark', { tag: 'wall', sight: false });
  b.box(8.6, UP2, 21.55, 10.05, UP2 + 1.0, 21.65, 'woodDark', { tag: 'wall', sight: false });
  b.box(8.8, UP2, 23.3, 10.0, UP2 + 1.9, 23.9, 'woodDark', P);   // órgão
  for (let i = 0; i < 6; i++) b.box(8.85 + i * 0.2, UP2 + 1.9, 23.6, 8.95 + i * 0.2, UP2 + 2.4 + (i % 3) * 0.25, 23.7, 'gold', NC);
}

// ---------- portas ----------
function doors(L) {
  const g = L.game, ctx = { materials: L.M, group: L.b.group, col: g.col, audio: g.audio, bus: g.bus };
  const D = (o) => (L.doors[o.id] = new Door({ mat: L.M.door, ...o }, ctx));
  D({ id: 'laundry', axis: 'z', x: 12, y: LO, z: 12, swing: -1, label: 'porta da lavanderia' });
  D({ id: 'furnace', axis: 'x', x: 6, y: LO, z: 14, swing: 1, mat: L.M.doorMetal, label: 'porta do incinerador' });
  D({ id: 'serviceStair', axis: 'x', x: 26, y: UP, z: 14, swing: -1, mat: L.M.doorMetal, locked: true,
    lockMsg: 'Trancada. Placa: "ESCADA DE SERVIÇO — ADMINISTRAÇÃO". A fechadura é de ferro fundido.', label: 'porta da escada de serviço' });
  D({ id: 'secretaria', axis: 'x', x: 19, y: UP2, z: 22, swing: -1, label: 'porta da secretaria' });
  D({ id: 'diretoria', axis: 'x', x: 33, y: UP2, z: 22, swing: -1, label: 'porta da diretoria' });
  D({ id: 'chapel', axis: 'x', x: 6, y: UP, z: 14, swing: 1, locked: true,
    lockMsg: 'Trancada por dentro. Do outro lado, alguém murmura uma reza.', label: 'porta da capela' });
}

// ---------- luzes ----------
function lights(L) {
  const C = { amber: 0xffb46a, green: 0x7dffa0, red: 0xff4a30, moon: 0x7088a8 };
  L.lamp(7, CEIL_LO, 8, 0xd8d090, 2.2, 10, { flicker: true });                        // lavanderia
  L.lamp(26, TOP2, 18.5, C.amber, 2.2, 11, { flicker: true });                        // escada de serviço
  L.lamp(25, TOP2, 24, C.green, 2.2, 13, { mat: L.M.lampGreen });                     // corredor adm.
  L.lamp(19, TOP2, 18, C.amber, 1.8, 9, { flicker: true });                           // secretaria
  L.lamp(33, UP2 + 1.3, 15.8, 0x9fe8a0, 1.4, 7, { mat: L.M.lampGreen });              // abajur do diretor
  const altar = new THREE.PointLight(0xffa050, 0.5, 13, 1.6); altar.position.set(6, 2.4, 21.8); L.game.scene.add(altar);
  const moon = new THREE.PointLight(C.moon, 1.3, 12, 1.4); moon.position.set(1.4, 4.2, 19); L.game.scene.add(moon);
  L.chapelLight = altar;
}

// ---------- navegação ----------
function nav(L) {
  const n = L.game.nav, d = L.doors;
  const N = (id, x, y, z) => n.addNode(id, x, y, z);
  const K = (a, b2, door) => n.link(a, b2, door);
  // lavanderia + incinerador
  N('lh_13', 13.2, LO, 12); N('lav_door', 10.8, LO, 12); N('lav_c', 7, LO, 9.6); N('lav_n', 7, LO, 4.6); N('lav_s', 6, LO, 12.8);
  N('for_door', 6, LO, 15.2); N('for_c', 6, LO, 17.3);
  K('lh_14', 'lh_13'); K('lh_13', 'lav_door', d.laundry); K('lav_door', 'lav_c'); K('lav_door', 'lav_s');
  K('lav_c', 'lav_n'); K('lav_c', 'lav_s'); K('lav_s', 'for_door', d.furnace); K('for_door', 'for_c');
  // escada de serviço
  N('ss_door', 26, UP, 15.0); N('ss_mid', 26, 2.0, 18.6); N('ss_top', 26, UP2, 23.6);
  K('cor_26', 'ss_door', d.serviceStair); K('ss_door', 'ss_mid'); K('ss_mid', 'ss_top');
  // 2º andar
  N('ad_w', 12.9, UP2, 23); N('ad_14', 14.5, UP2, 24); N('ad_19', 19, UP2, 24); N('ad_33', 33, UP2, 24); N('ad_37', 36.8, UP2, 24);
  N('sec_door', 19, UP2, 20.8); N('sec_c', 19, UP2, 18.6); N('dir_door', 33, UP2, 20.8); N('dir_c', 33, UP2, 18);
  K('ad_w', 'ad_14'); K('ad_14', 'ad_19'); K('ad_19', 'ss_top'); K('ss_top', 'ad_33'); K('ad_33', 'ad_37');
  K('ad_19', 'sec_door', d.secretaria); K('sec_door', 'sec_c'); K('ad_33', 'dir_door', d.diretoria); K('dir_door', 'dir_c');
  // capela + coro
  N('ch_door', 6, UP, 15.2); N('ch_c', 6, UP, 18.5); N('ch_altar', 6, UP, 21.5); N('ch_w', 0.9, UP, 18.5);
  N('ch_stair_bot', 11, UP, 14.9); N('ch_stair_mid', 11, 2.0, 18.5); N('coro_top', 11, UP2, 22.3); N('coro_e', 11.4, UP2, 23);
  K('cor_6', 'ch_door', d.chapel); K('ch_door', 'ch_c'); K('ch_c', 'ch_altar'); K('ch_door', 'ch_stair_bot'); K('ch_door', 'ch_w'); K('ch_w', 'ch_altar');
  K('ch_stair_bot', 'ch_stair_mid'); K('ch_stair_mid', 'coro_top'); K('coro_top', 'coro_e'); K('coro_e', 'ad_w');
}

/** animação do fogo, relicário e velas (chamado por HospitalLevel.update) */
export function updateAnnex(L, dt, t) {
  const F = L.furnace;
  if (F) {
    F.fire.visible = F.lit;
    if (F.lit) {
      for (const f of F.flames) {
        const s = 0.75 + 0.35 * Math.sin(t * (f.big ? 7 : 11) + f.ph) * Math.sin(t * 3.1 + f.ph * 2);
        f.m.scale.set(1, s, 1); f.m.position.y = 0.25 + s * (f.big ? 0.32 : 0.45);
      }
      F.light.intensity = 2.6 + Math.sin(t * 9) * 0.4 + Math.random() * 0.5; F.light.color.setHex(0xff7030);
    } else { F.light.intensity = 0.5; F.light.color.setHex(0x803010); }
    const z = ANNEX_ZONES[0]; z.fog = F.lit ? 0x1c0a04 : 0x0c0b0a; z.density = F.lit ? 0.09 : 0.1;
  }
  const R = L.relic;
  if (R && R.open && R.t < 1) { R.t = Math.min(1, R.t + dt / 0.8); R.lid.rotation.x = -R.t * 1.9; }
  if (L.candles && L.chapelLight) {
    let lit = 0; for (const id in L.candles) if (L.candles[id].lit) lit++;
    L.chapelLight.intensity = 0.5 + lit * 0.55 + (lit ? Math.sin(t * 8) * 0.08 : 0);
  }
}
