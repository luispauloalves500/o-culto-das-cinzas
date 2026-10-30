// Lógica da maternidade (2º andar, ala norte): chave no quadro do posto de segurança (3º andar) → porta da
// maternidade na secretaria → lança improvisada (sala de parto), manivela (alojamento), chave do arquivo morto e
// livro de partos (posto obstétrico). Autosave na entrada; inimigos adormecidos acordam com a proximidade ou com a coleta.
import * as THREE from 'three';
import { UP2, LANCE_POS, MATERNITY_DOORS } from './HospitalMaternity.js';
import { giveAmmo, wakeEnemy, ammoMesh } from './HospitalPedsScript.js';

export { MATERNITY_DOORS };
const ROOF = 7.3;

export const MATERNITY_SPAWNS = [
  { id: 'enf_mat', type: 'enfermeiro', x: 34, y: UP2, z: 12.5, patrol: [{ x: 36.5, y: UP2, z: 12.4 }, { x: 15.4, y: UP2, z: 12.5 }] },
  { id: 'int_parto', type: 'interno', x: 15.3, y: UP2, z: 3.6, yaw: Math.PI / 2, dormant: true },
  { id: 'ras_aloj', type: 'rastejador', x: 30.0, y: UP2, z: 7.8, yaw: -Math.PI / 2, dormant: true },
];

export function setupMaternity(S) {
  const g = S.game, M = g.materials;
  // chave da maternidade: quadro de chaves do posto de segurança (3º andar)
  S.level.b.box(40.82, ROOF + 1.1, 16.6, 40.9, ROOF + 1.7, 17.4, 'woodDark', { collide: false });
  S._pickup('key_mat', { x: 40.3, y: ROOF + 1.3, z: 17.0 }, 'Pegar chave do quadro: "MATERNIDADE"', () => {
    S._giveItem('chave_maternidade'); S.q.set('hasMatKey');
    S.hint('matKey', 'A etiqueta diz <b>"MATERNIDADE — 2º andar (pela secretaria)"</b>.', 7);
  }, () => keyMesh(M, 40.8, ROOF + 1.35, 17.0, M.toyRed || M.axeMetal));
  // LANÇA: suporte de soro com um bisturi de parto amarrado com esparadrapo
  S._pickup('lanca', { x: LANCE_POS.x, y: UP2 + 1.0, z: LANCE_POS.z }, 'Pegar a lança improvisada (suporte de soro)', () => {
    g.inventory.addWeapon('lanca'); g.player.setWeapon('lanca'); S.q.set('hasLance');
    g.hud.toast('Lança improvisada — em mãos', 3);
    S.hint('lanca', '<b>Lança improvisada</b>: estocada longa — acerta antes de ser alcançado. <b>Botão direito</b>: estocada forte, que atravessa. Fraca para os lados.<br><b>R</b>: trocar de arma.', 10);
    wakeEnemy(S, 'int_parto');
  }, () => lanceMesh(M));
  S._doc('prontuario_parto', { x: 15.6, y: UP2 + 1.0, z: 8.6 }, 15.6, UP2 + 0.91, 8.6);
  // ALOJAMENTO: manivela da cama (encaixe quadrado), carta, bandagem
  S._pickup('manivela', { x: 23.6, y: UP2 + 0.6, z: 4.6 }, 'Soltar a manivela da cama', () => {
    S._giveItem('manivela'); S.q.set('hasCrank');
    g.audio.play('clang', { x: 23.6, y: UP2 + 0.3, z: 4.3 }, { pitch: 1.4 }); g.perception.noise({ x: 23.6, y: UP2, z: 4.3 }, 8, 'clang');
    S.hint('crank', 'A <b>manivela</b> tem um encaixe quadrado. Serve em algum mecanismo manual do hospital.', 7);
    wakeEnemy(S, 'ras_aloj');
  }, () => crankMesh(M, 23.6, UP2 + 0.25, 4.38));
  S._doc('carta_mae', { x: 26.5, y: UP2 + 0.7, z: 4.0 }, 26.5, UP2 + 0.61, 3.7);
  S._pickup('band_mat', { x: 29.4, y: UP2 + 0.7, z: 4.0 }, 'Pegar bandagem', () => S._giveItem('bandagem'), () => S._bandMesh(29.4, UP2 + 0.65, 3.7));
  // POSTO OBSTÉTRICO: chave do arquivo morto, livro de partos, munição, livro de registros
  S._pickup('key_arqm', { x: 37.4, y: UP2 + 1.3, z: 6.0 }, 'Pegar chave grande: "ARQ. MORTO — SUBSOLO"', () => {
    S._giveItem('chave_arquivo_morto'); S.q.set('hasDeadArchiveKey');
    S.hint('arqKey', 'Chave de ferro antiga: <b>"ARQ. MORTO — SUBSOLO"</b>. O fundo do Arquivo, no hall do subsolo, tem uma porta de ferro.', 8);
  }, () => keyMesh(M, 37.85, UP2 + 1.35, 6.0, M.rust));
  S._doc('livro_partos', { x: 32.4, y: UP2 + 1.05, z: 5.5 }, 31.6, UP2 + 1.01, 5.5);
  S._pickup('ammo_mat', { x: 32.4, y: UP2 + 1.05, z: 7.8 }, 'Pegar munição .38 (×2)', () => giveAmmo(S, 2), () => ammoMesh(M, 31.55, UP2 + 1.0, 7.8, 2));
  S._saveBook('book_mat', { x: 36.6, y: UP2 + 0.9, z: 3.6 }, 36.6, UP2 + 0.89, 2.7, 'maternity');
}

/** porta trancada tratada pela maternidade; retorna true se resolveu */
export function useDoorMaternity(S, d) {
  const g = S.game;
  if (d.id === 'maternity' && g.inventory.has('chave_maternidade')) {
    g.inventory.remove('chave_maternidade');
    d.locked = false; d.setOpen(true); S.q.set('maternityOpen');
    g.audio.play('switch', d); g.perception.noise(d, 7, 'door');
    g.hud.toast('A chave da segurança gira. A maternidade está aberta — e cheira a leite azedo e cinza.', 4);
    return true;
  }
  return false;
}

export function applyMaternity(S, save) {
  const g = S.game, f = save.flags;
  if (f.picked_lanca && !g.inventory.weapons.includes('lanca')) g.inventory.weapons.push('lanca');
  for (const [flag, id] of [['picked_lanca', 'int_parto'], ['picked_manivela', 'ras_aloj']]) {
    if (f[flag]) { const w = g.enemies.find((e) => e.id === id); if (w && w.alive) w.dormant = false; }
  }
}

export function updateMaternityScript(S) {
  const g = S.game, p = g.player.pos, q = S.q;
  if (!q.has('enteredMaternity') && p.y > 3.5 && p.y < 6.6 && p.x > 14 && p.x < 38 && p.z > 2 && p.z < 13.6) {
    q.set('enteredMaternity'); g.saveGame('maternity'); g.hud.toast('Progresso salvo automaticamente.');
    g.audio.play('whisper', { x: 18, y: UP2 + 1, z: 6 });
  }
  if (!q.has('readBirthBook') && g.inventory.documents.includes('livro_partos')) q.set('readBirthBook');
  for (const [id, r] of [['int_parto', 2.2], ['ras_aloj', 2.6]]) {
    const w = g.enemies.find((e) => e.id === id);
    if (w && w.alive && w.dormant && Math.abs(p.y - w.pos.y) < 1.5 && Math.hypot(p.x - w.pos.x, p.z - w.pos.z) < r) { w.wake(); g.audio.play('groan', w.pos); }
  }
}

// ---------- modelos de coleta ----------
function keyMesh(M, x, y, z, tagMat) {
  const gr = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 4, 10), M.steel); ring.rotation.y = Math.PI / 2; gr.add(ring);
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.11, 0.012), M.steel); shaft.position.y = -0.08; gr.add(shaft);
  const bit = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, 0.03), M.steel); bit.position.set(0, -0.12, 0.015); gr.add(bit);
  const tag = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.05, 0.07), tagMat); tag.position.set(0, -0.02, -0.06); gr.add(tag);
  gr.position.set(x, y, z); return gr;
}
function lanceMesh(M) {
  const gr = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.62, 6), M.metal); shaft.position.y = 0.81; gr.add(shaft);
  const tape = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.14, 6), M.bandage); tape.position.y = 1.6; gr.add(tape);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.2, 0.034), M.axeEdge); blade.position.y = 1.74; gr.add(blade);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.006, 4, 10, Math.PI), M.metal); hook.position.y = 1.35; gr.add(hook);
  for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.02), M.steelDark); l.rotation.y = i * 2.1; l.position.set(Math.cos(i * 2.1) * 0.12, 0.02, -Math.sin(i * 2.1) * 0.12); gr.add(l); }
  gr.position.set(LANCE_POS.x, UP2, LANCE_POS.z); gr.rotation.z = 0.06;
  return gr;
}
function crankMesh(M, x, y, z) {
  const gr = new THREE.Group();
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.25, 0.025), M.metal); arm.position.y = -0.1; gr.add(arm);
  const sq = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.05), M.steelDark); sq.position.z = -0.03; gr.add(sq);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.09, 6), M.woodDark); knob.rotation.x = Math.PI / 2; knob.position.set(0, -0.22, 0.04); gr.add(knob);
  gr.position.set(x, y, z); return gr;
}
