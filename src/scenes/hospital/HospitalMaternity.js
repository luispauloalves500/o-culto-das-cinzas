// Fatia "maternidade": ala norte do 2º andar (y 4, x14..38 z2..14), sobre a Ala Leste do térreo. Entrada pela
// secretaria (porta trancada — a chave fica no quadro do posto de segurança do 3º andar). Corredor + sala de parto
// (lança improvisada), alojamento conjunto (manivela da cama) e posto obstétrico (chave do arquivo morto, livro de partos).
// Só geometria/portas/luzes/navegação; a lógica fica em HospitalMaternityScript.js.
import * as THREE from 'three';
import { Door } from '../../world/Doors.js';

export const UP2 = 4;
const H_UP = 3.2, TOP2 = 7;
const P = { tag: 'prop', sight: false, cast: true };
const PL = { tag: 'prop-low', sight: false, cast: true };
const NC = { collide: false };

export const MATERNITY_CHECKPOINTS = {
  maternity: { x: 18.6, y: UP2, z: 12.6, yaw: Math.PI },
};

export const MATERNITY_ZONES = [
  { id: 'maternity', minX: 14, maxX: 38, minZ: 2, maxZ: 14, minY: 3.5, maxY: 7.2, fog: 0x100a0a, density: 0.09 },
];

export const LANCE_POS = { x: 20.6, z: 5.6 };

export function buildMaternity(L) {
  shell(L);
  rooms(L);
  doors(L);
  lights(L);
  nav(L);
}

function shell(L) {
  const b = L.b;
  b.floor(14, 2, 38, 14, UP2, 'tile', 'maternity');
  b.ceiling(14, 2, 38, 14, TOP2);
  // externas (a parede sul z=14 é a parede norte da secretaria / escada de serviço / diretoria)
  b.wallX(2, 14, 38, H_UP, TOP2);
  b.wallZ(14, 2, 14, H_UP, TOP2);
  b.wallZ(38, 2, 14, H_UP, TOP2);
  // corredor z11..14 × quartos ao norte
  b.wallX(11, 14, 38, UP2, TOP2, [18, 26.5, 34.5]);
  b.wallZ(22, 2, 11, UP2, TOP2);
  b.wallZ(31, 2, 11, UP2, TOP2);
  // janelas tapadas com tábuas (parede norte)
  for (const x of [17, 26.5, 34.5]) {
    b.box(x - 0.7, UP2 + 1.2, 2.12, x + 0.7, UP2 + 2.2, 2.16, 'glass', NC);
    for (let i = 0; i < 3; i++) b.box(x - 0.85, UP2 + 1.3 + i * 0.32, 2.17, x + 0.85, UP2 + 1.45 + i * 0.32, 2.22, 'woodDark', NC);
  }
  L.sign('MATERNIDADE', 18.6, UP2 + 2.55, 14.13, 0, 1.0, 0.16, { bg: '#d8b8c0', fg: '#3a1a22' });
  L.sign('ACESSO RESTRITO', 18.6, UP2 + 2.55, 13.87, Math.PI, 0.9, 0.14, { bg: '#7a2018', fg: '#f0e0d0' });
  L.sign('SALA DE PARTO', 18, UP2 + 2.45, 11.13, 0, 0.9, 0.14, { bg: '#c9c2a4' });
  L.sign('ALOJAMENTO CONJUNTO', 26.5, UP2 + 2.45, 11.13, 0, 1.1, 0.14, { bg: '#d8c8d8', fg: '#2a1a2a' });
  L.sign('POSTO OBSTÉTRICO', 34.5, UP2 + 2.45, 11.13, 0, 1.0, 0.14, { bg: '#c9c2a4' });
}

function rooms(L) {
  const b = L.b, M = L.M;
  // CORREDOR: maca virada, cadeira de rodas, pegadas pequenas de cinza
  b.box(30.4, UP2, 13.15, 32.6, UP2 + 0.85, 13.85, 'sheet', PL);
  b.box(36.6, UP2, 12.9, 37.5, UP2 + 0.9, 13.7, 'metal', PL);
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.16), M.ash); m.rotation.x = -Math.PI / 2;
    m.position.set(19 + i * 1.6, UP2 + 0.012, 12.3 + (i % 2) * 0.25); b.group.add(m);
  }
  // SALA DE PARTO x14..22 z2..11: mesa obstétrica, perneiras, foco cirúrgico, bandeja, incubadora, pia
  b.box(17.4, UP2, 4.8, 19.6, UP2 + 0.95, 6.4, 'sheet', PL);
  b.box(17.6, UP2 + 0.95, 4.9, 19.4, UP2 + 1.05, 5.4, 'leatherDark', NC);
  for (const x of [17.6, 19.4]) b.box(x - 0.03, UP2 + 0.95, 6.3, x + 0.03, UP2 + 1.5, 6.36, 'steel', NC);
  const lampDisk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.15, 12), M.steel); lampDisk.position.set(18.5, TOP2 - 0.7, 5.6); b.group.add(lampDisk);
  b.box(18.47, TOP2 - 0.65, 5.57, 18.53, TOP2, 5.63, 'steel', NC);
  b.box(15.2, UP2, 8.2, 16.0, UP2 + 0.9, 9.0, 'steel', PL);                          // bandeja de instrumentos
  b.box(14.2, UP2, 2.3, 15.4, UP2 + 1.1, 3.1, 'glass', P);                            // incubadora
  b.box(20.6, UP2, 2.2, 21.8, UP2 + 0.9, 2.9, 'steel', PL);                           // pia
  for (const [x, z, r] of [[18.4, 7.0, 0.3], [16.2, 6.0, 1.7], [20.6, 4.6, 2.6]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), M.bloodDecal); m.rotation.x = -Math.PI / 2; m.rotation.z = r; m.position.set(x, UP2 + 0.013, z); b.group.add(m);
  }
  // suporte de soro tombado (a lança é o outro suporte) + base de três pés
  b.box(20.25, UP2, 5.25, 20.95, UP2 + 0.05, 5.95, 'steelDark', NC);
  // ALOJAMENTO CONJUNTO x22..31 z2..11: três leitos com bercinhos ao lado
  for (const x of [23.6, 26.5, 29.4]) {
    b.box(x - 0.5, UP2, 2.2, x + 0.5, UP2 + 0.6, 4.2, 'sheet', PL);
    b.box(x - 0.5, UP2 + 0.6, 2.2, x + 0.5, UP2 + 1.0, 2.35, 'metal', NC);
    b.box(x + 0.7, UP2, 2.4, x + 1.3, UP2 + 0.8, 3.2, 'glass', PL);
  }
  b.box(23.55, UP2 + 0.2, 4.2, 23.65, UP2 + 0.3, 4.32, 'steelDark', NC);              // eixo da manivela (vazio, se coletada)
  for (const [x, z, r] of [[27.2, 6.4, 0.9], [29.6, 8.6, 2.1]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), M.bloodDecal); m.rotation.x = -Math.PI / 2; m.rotation.z = r; m.position.set(x, UP2 + 0.013, z); b.group.add(m);
  }
  // POSTO OBSTÉTRICO x31..38 z2..11: balcão, mesa do livro, quadro de chaves
  b.box(31.2, UP2, 3.0, 32.0, UP2 + 1.0, 8.5, 'woodDark', PL);
  b.box(35.6, UP2, 2.2, 37.8, UP2 + 0.85, 3.2, 'wood', PL);
  b.box(37.4, UP2, 8.4, 37.95, UP2 + 1.9, 10.6, 'metal', P);                          // armário
  b.box(37.9, UP2 + 1.0, 5.3, 37.98, UP2 + 1.8, 6.7, 'woodDark', NC);                 // quadro de chaves
  for (let i = 0; i < 4; i++) b.box(37.86, UP2 + 1.6, 5.5 + i * 0.32, 37.9, UP2 + 1.62, 5.52 + i * 0.32, 'steel', NC);
}

function doors(L) {
  const g = L.game, ctx = { materials: L.M, group: L.b.group, col: g.col, audio: g.audio, bus: g.bus };
  const D = (o) => (L.doors[o.id] = new Door({ mat: L.M.door, ...o }, ctx));
  D({ id: 'maternity', axis: 'x', x: 18.6, y: UP2, z: 14, swing: -1, mat: L.M.doorMetal, locked: true,
    lockMsg: 'MATERNIDADE — ACESSO RESTRITO. Trancada. Ao lado, um aviso: "chave com a vigilância do 3º andar".', label: 'porta da maternidade' });
  D({ id: 'salaParto', axis: 'x', x: 18, y: UP2, z: 11, swing: -1, label: 'porta da sala de parto' });
  D({ id: 'alojamento', axis: 'x', x: 26.5, y: UP2, z: 11, swing: -1, label: 'porta do alojamento' });
  D({ id: 'postoObst', axis: 'x', x: 34.5, y: UP2, z: 11, swing: -1, label: 'porta do posto obstétrico' });
}
export const MATERNITY_DOORS = ['maternity', 'salaParto', 'alojamento', 'postoObst'];

function lights(L) {
  L.lamp(18.6, TOP2, 12.5, 0xffc0b0, 1.4, 10, { flicker: true });
  L.lamp(31, TOP2, 12.5, 0xd8d0a0, 1.3, 10);
  L.lamp(18.5, TOP2, 6, 0xe8f0ff, 1.6, 9, { flicker: true });                         // foco da sala de parto
  L.lamp(26.5, TOP2, 6.5, 0xff6a50, 1.3, 9, { mat: L.M.lampRed });                    // alojamento
  L.lamp(34.5, TOP2, 6, 0xcfe8d8, 1.4, 8);                                            // posto
}

function nav(L) {
  const n = L.game.nav, d = L.doors;
  const N = (id, x, y, z) => n.addNode(id, x, y, z);
  const K = (a, b2, door) => n.link(a, b2, door);
  N('mt_sec', 18.6, UP2, 15.1); K('sec_c', 'mt_sec'); 
  N('mt_15', 15.2, UP2, 12.5); N('mt_18', 18.3, UP2, 12.5); N('mt_26', 26.5, UP2, 12.4); N('mt_34', 34.5, UP2, 12.4); N('mt_37', 36.8, UP2, 12.0);
  K('mt_sec', 'mt_18', d.maternity); K('mt_15', 'mt_18'); K('mt_18', 'mt_26'); K('mt_26', 'mt_34'); K('mt_34', 'mt_37');
  N('pa_d', 18, UP2, 9.8); N('pa_c', 16.2, UP2, 7.4); N('pa_n', 16.2, UP2, 3.8); N('pa_e', 20.8, UP2, 3.9); N('pa_se', 20.8, UP2, 8.2);
  K('mt_18', 'pa_d', d.salaParto); K('pa_d', 'pa_c'); K('pa_c', 'pa_n'); K('pa_n', 'pa_e'); K('pa_d', 'pa_se'); K('pa_se', 'pa_e');
  N('al_d', 26.5, UP2, 9.8); N('al_c', 26.5, UP2, 6.6); N('al_w', 23.4, UP2, 6.6); N('al_e', 29.8, UP2, 6.6);
  K('mt_26', 'al_d', d.alojamento); K('al_d', 'al_c'); K('al_c', 'al_w'); K('al_c', 'al_e');
  N('ob_d', 34.5, UP2, 9.8); N('ob_c', 34.5, UP2, 6.2); N('ob_n', 34.2, UP2, 4.0);
  K('mt_34', 'ob_d', d.postoObst); K('ob_d', 'ob_c'); K('ob_c', 'ob_n');
}
