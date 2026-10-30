// Fatia "arquivo morto": subsolo a leste do Arquivo (y −5, x36..46 z−3..10). Porta de ferro no fundo do Arquivo
// (chave da maternidade). Corredores de estantes altas; ao sul, um arquivo deslizante de manivela que esconde a
// Sala de batismo (segredo, x38..44 z−6.6..−3).
// Só geometria/portas/luzes/navegação; a lógica fica em HospitalDeadArchiveScript.js.
import * as THREE from 'three';
import { Door } from '../../world/Doors.js';

export const LO = -5;
const CEIL_LO = -1.8;
const P = { tag: 'prop', sight: true, cast: true };
const PL = { tag: 'prop-low', sight: false, cast: true };
const NC = { collide: false };

export const DEAD_ARCHIVE_CHECKPOINTS = {
  deadArchive: { x: 37.6, y: LO, z: 9.0, yaw: Math.PI / 2 },
};

export const DEAD_ARCHIVE_ZONES = [
  { id: 'deadArchive', minX: 36, maxX: 46, minZ: -6.6, maxZ: 10, minY: LO - 1, maxY: CEIL_LO, fog: 0x0d0b08, density: 0.12 },
];

// arquivo deslizante (fecha o vão x=41 da parede sul); desliza 2.8 m para oeste com a manivela
export const ROLLING = { x0: 39.6, x1: 42.4, z0: -2.95, z1: -2.25, slide: -2.8 };
export const CRANK_SOCKET = { x: 42.5, y: LO + 1.0, z: -2.6 };
export const FONT = { x: 41, z: -5.2 };

export function buildDeadArchive(L) {
  shell(L);
  rooms(L);
  doors(L);
  lights(L);
  nav(L);
}

function shell(L) {
  const b = L.b;
  b.floor(36, -3, 46, 10, LO, 'concrete', 'deadArchive');
  b.ceiling(36, -3, 46, 10, CEIL_LO, 'wallLower');
  b.wallZ(36, -3, 2, LO, CEIL_LO, [], 'wallLower');         // (z2..10 é a parede leste do Arquivo, com a porta)
  b.wallZ(46, -3, 10, LO, CEIL_LO, [], 'wallLower');
  b.wallX(10, 44, 46, LO, CEIL_LO, [], 'wallLower');         // (x36..44 já fechado pelo hall e pelo poço do elevador)
  b.wallX(-3, 36, 46, LO, CEIL_LO, [41], 'wallLower');       // vão escondido atrás do arquivo deslizante
  // SALA DE BATISMO (secreta) x38..44 z−6.6..−3
  b.floor(38, -6.6, 44, -3, LO, 'stone', 'batismo');
  b.ceiling(38, -6.6, 44, -3, CEIL_LO, 'wallLower');
  b.wallX(-6.6, 38, 44, LO, CEIL_LO, [], 'chapelWall');
  b.wallZ(38, -6.6, -3, LO, CEIL_LO, [], 'chapelWall');
  b.wallZ(44, -6.6, -3, LO, CEIL_LO, [], 'chapelWall');
  L.sign('ARQUIVO MORTO', 35.87, LO + 2.5, 8.8, -Math.PI / 2, 0.9, 0.14, { bg: '#5a4a3a', fg: '#e8dcc0' });
  L.sign('PRONTUÁRIOS ENCERRADOS · 1950–1960', 41, LO + 2.75, 9.87, Math.PI, 1.6, 0.14, { bg: '#c9c2a4' });
}

function rooms(L) {
  const b = L.b, M = L.M;
  // estantes altas (bloqueiam a visão) com caixas de prontuários
  for (const x of [38.0, 40.6, 43.2]) {
    b.box(x, LO, -0.8, x + 0.6, LO + 2.5, 6.0, 'metal', P);
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.26, 0.38), (i % 3) ? M.paper : M.wood);
      m.position.set(x + 0.3, LO + 0.4 + (i % 3) * 0.8, -0.4 + Math.floor(i / 3) * 1.15); m.rotation.y = (i % 5 - 2) * 0.05; b.group.add(m);
    }
  }
  // caixas caídas, papéis no chão
  b.box(44.6, LO, 4.2, 45.4, LO + 0.45, 5.0, 'wood', PL);
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.3), M.paper); m.rotation.x = -Math.PI / 2; m.rotation.z = i * 0.7;
    m.position.set(36.6 + ((i * 37) % 90) / 10, LO + 0.012, -1.8 + ((i * 53) % 110) / 10); b.group.add(m);
  }
  // mesa de consulta (frente)
  b.box(44.2, LO, 8.6, 45.8, LO + 0.8, 9.7, 'woodDark', PL);
  // arquivo deslizante (móvel) com volante quebrado e encaixe quadrado de manivela
  const R = ROLLING, gr = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(R.x1 - R.x0, 2.4, R.z1 - R.z0), M.steelDark); body.position.y = 1.2; body.castShadow = true; gr.add(body);
  for (let i = 0; i < 4; i++) { const h = new THREE.Mesh(new THREE.BoxGeometry(R.x1 - R.x0 - 0.1, 0.04, 0.04), M.steel); h.position.set(0, 0.4 + i * 0.6, (R.z1 - R.z0) / 2 + 0.02); gr.add(h); }
  const socket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.12), M.rust); socket.position.set((R.x1 - R.x0) / 2 + 0.04, 1.0, 0); gr.add(socket);
  const handle = new THREE.Group(); handle.position.set((R.x1 - R.x0) / 2 + 0.12, 1.0, 0); handle.visible = false;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 0.03), M.metal); arm.position.y = 0.15; handle.add(arm);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 6), M.woodDark); knob.rotation.z = Math.PI / 2; knob.position.set(0.05, 0.3, 0); handle.add(knob);
  gr.add(handle);
  gr.position.set((R.x0 + R.x1) / 2, LO, (R.z0 + R.z1) / 2);
  b.group.add(gr);
  const col = L.game.col.addBox(R.x0, LO, R.z0, R.x1, LO + 2.4, R.z1, { tag: 'prop', blocksSight: true });
  L.rolling = { group: gr, collider: col, handle, x: gr.position.x };
  // trilhos no chão
  for (const z of [-2.85, -2.35]) b.box(36.6, LO, z - 0.02, 42.6, LO + 0.03, z + 0.02, 'steel', NC);
  // SALA DE BATISMO: pia batismal de pedra cheia de cinza, velas, pequenas pulseiras penduradas
  b.box(FONT.x - 0.6, LO, FONT.z - 0.6, FONT.x + 0.6, LO + 0.9, FONT.z + 0.6, 'stone', PL);
  const ash = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.04, 14), M.ash); ash.position.set(FONT.x, LO + 0.88, FONT.z); b.group.add(ash);
  L.fontAsh = ash; // escurece depois da revelação RN 0
  b.box(38.2, LO, -6.4, 39.4, LO + 0.9, -5.6, 'woodDark', PL);                       // altar lateral (recompensa)
  for (const [x, z] of [[38.4, -6.2], [39.2, -6.2], [42.8, -6.3], [43.6, -3.4]]) {
    b.box(x - 0.03, LO + (x < 40 ? 0.9 : 0), z - 0.03, x + 0.03, LO + (x < 40 ? 1.08 : 0.2), z + 0.03, 'candle', NC);
  }
  for (let i = 0; i < 12; i++) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.006, 4, 10), M.paper);
    m.position.set(39 + (i % 6) * 0.9, LO + 1.9 - (i % 2) * 0.15, -6.55); b.group.add(m);
  }
}

function doors(L) {
  const g = L.game, ctx = { materials: L.M, group: L.b.group, col: g.col, audio: g.audio, bus: g.bus };
  L.doors.deadArchive = new Door({ id: 'deadArchive', axis: 'z', x: 36, y: LO, z: 8.8, swing: 1, mat: L.M.doorMetal, locked: true,
    lockMsg: 'Porta de ferro: ARQUIVO MORTO. Fechadura antiga, de chave grande. Etiqueta: "chave no posto obstétrico".', label: 'porta do arquivo morto' }, ctx);
}
export const DEAD_ARCHIVE_DOORS = ['deadArchive'];

function lights(L) {
  L.lamp(41, CEIL_LO, 8.6, 0xd8c8a0, 1.2, 9, { flicker: true });
  L.lamp(41.9, CEIL_LO, 2.2, 0xb8c0a0, 0.9, 8, { flicker: true });
  L.batismoLamp = L.lamp(41, CEIL_LO, -4.8, 0xffa050, 1.0, 6);                       // sala de batismo
}

function nav(L) {
  const n = L.game.nav, d = L.doors;
  const N = (id, x, y, z) => n.addNode(id, x, y, z);
  const K = (a, b2, door) => n.link(a, b2, door);
  N('am_w', 35.3, LO, 8.8); N('am_e', 37.4, LO, 9.2); N('am_f', 44.6, LO, 7.6);
  K('arq_door', 'am_w'); K('am_w', 'am_e', d.deadArchive); K('am_e', 'am_f');
  N('am_a1', 39.6, LO, 7.0); N('am_a2', 42.2, LO, 7.0); N('am_a3', 44.6, LO, 2.5);
  N('am_s1', 39.6, LO, -1.6); N('am_gap', 41.0, LO, -1.6); N('am_s2', 42.2, LO, -1.6); N('am_s3', 44.6, LO, -1.6);
  K('am_e', 'am_a1'); K('am_a1', 'am_a2'); K('am_a2', 'am_f'); K('am_f', 'am_a3'); K('am_a3', 'am_s3');
  K('am_a1', 'am_s1'); K('am_a2', 'am_s2'); K('am_s1', 'am_gap'); K('am_gap', 'am_s2'); K('am_s2', 'am_s3');
  N('bt_c', 41.0, LO, -3.9);   // ligado a am_gap só quando o arquivo deslizante sai do vão
}

/** animação do arquivo deslizante */
export function updateDeadArchive(L, dt) {
  const r = L.rolling;
  if (r && r.slide !== undefined && r.slide < 1) {
    r.slide = Math.min(1, r.slide + dt / 1.6);
    const k = r.slide * r.slide * (3 - 2 * r.slide);
    r.group.position.x = r.x + k * ROLLING.slide;
    r.handle.rotation.x = -r.slide * 18;
  }
}
