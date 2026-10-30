// Lógica do 3º andar (ala pediátrica / maternidade): facão no berçário, revólver na segurança (munição escassa),
// caixinha de música que atrai inimigos, teatrinho que esconde o Quarto 7 (segredo: cadeado que só cede a um tiro),
// saída de incêndio (atalho até a escada principal), autosaves e inimigos adormecidos.
import * as THREE from 'three';
import { ROOF, UP2, PADLOCK, MUSIC_BOX, THEATER, PEDS_DOORS } from './HospitalPeds.js';

export { PEDS_DOORS };

export const PEDS_SPAWNS = [
  { id: 'enf_ped', type: 'enfermeiro', x: 36, y: ROOF, z: 24, patrol: [{ x: 37, y: ROOF, z: 24 }, { x: 15, y: ROOF, z: 24.2 }] },
  { id: 'int_brinq', type: 'interno', x: 21.6, y: ROOF, z: 20.6, yaw: Math.PI, dormant: true },
  { id: 'ras_berc', type: 'rastejador', x: 29.4, y: ROOF, z: 20.6, yaw: Math.PI, dormant: true },
  { id: 'int_seg', type: 'interno', x: 39.4, y: ROOF, z: 16.4, yaw: -Math.PI / 2, dormant: true },
];

const MUSIC_DUR = 12, NOTES = [659, 784, 880, 784, 659, 587, 523, 587];

/** cadeado da corrente do Quarto 7: alvo que só cede a um tiro */
class Padlock {
  constructor(S) { this.S = S; this.id = 'padlock'; this.isProp = true; this.pos = { x: PADLOCK.x, y: PADLOCK.y - 1, z: PADLOCK.z }; }
  get alive() { return this.S.q.has('theaterMoved') && !this.S.q.has('lockBroken'); }
  set alive(v) { /* derivado das flags */ }
  hurtVolumes() { return [{ type: 'sphere', part: 'lock', x: PADLOCK.x, y: PADLOCK.y, z: PADLOCK.z, r: 0.2 }]; }
  takeHit(h) {
    const S = this.S, g = S.game, at = h.point || PADLOCK;
    if (h.bullet) { breakLock(S, false); return 'dead'; }
    g.audio.play('clang', at); g.combat.sparks(at, 8); g.perception.noise(at, 7, 'clang');
    g.hud.toast('A lâmina resvala na corrente. Grossa demais — talvez um tiro no cadeado.', 3);
    return 'immune';
  }
}

export function setupPeds(S) {
  const g = S.game, L = S.level, M = g.materials;
  S.props.push(new Padlock(S));
  S.music = { t: 0, note: 0, noise: 0 };
  // FACÃO cravado num berço
  S._pickup('facao', { x: 27.0, y: ROOF + 1.0, z: 15.9 }, 'Arrancar o facão do berço', () => {
    g.inventory.addWeapon('facao'); g.player.setWeapon('facao'); S.q.set('hasFacao');
    g.hud.toast('Facão — em mãos', 3);
    S.hint('facao', '<b>Facão</b>: rápido e barato em fôlego, combos curtos. Bom contra quem rasteja.<br><b>R</b> (LB no controle): trocar de arma.', 9);
    wakeEnemy(S, 'ras_berc');
  }, () => facaoMesh(M));
  // posto de enfermagem: chave da segurança, munição, bandagem, livro de registros
  S._pickup('key_seg', { x: 34.0, y: ROOF + 1.05, z: 19.95 }, 'Pegar chave da segurança', () => { S._giveItem('chave_seguranca'); S.q.set('hasSecKey'); },
    () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.04), M.gold); m.position.set(34.0, ROOF + 1.01, 19.95); return m; });
  S._pickup('ammo_posto', { x: 32.3, y: ROOF + 1.0, z: 15.3 }, 'Pegar munição .38 (×2)', () => giveAmmo(S, 2), () => ammoMesh(M, 32.15, ROOF + 0.95, 15.3, 2));
  S._pickup('band_ped', { x: 31.8, y: ROOF + 1.05, z: 19.95 }, 'Pegar bandagem', () => S._giveItem('bandagem'), () => S._bandMesh(31.8, ROOF + 1.05, 19.95));
  S._saveBook('book_peds', { x: 34.8, y: ROOF + 0.95, z: 14.65 }, 34.8, ROOF + 0.93, 14.65, 'postoPed');
  // REVÓLVER na mesa do vigia + munição do armário
  S._pickup('revolver', { x: 38.0, y: ROOF + 0.95, z: 18.1 }, 'Pegar o revólver .38 do vigia', () => {
    g.inventory.addWeapon('revolver'); g.inventory.add('municao_38', 3); g.player.setWeapon('revolver'); S.q.set('hasRevolver');
    g.hud.toast('Revólver .38 — 3 balas no tambor', 3.5);
    S.hint('revolver', '<b>Revólver .38</b>: <b>botão direito</b> atira (mira automática no alvo à frente; acerta pontos fracos). Botão esquerdo dá coronhada.<br>Munição escassa — e cada tiro acorda o andar inteiro. <b>R</b>: trocar de arma.', 11);
    wakeEnemy(S, 'int_seg');
  }, () => revolverMesh(M));
  S._pickup('ammo_seg', { x: 39.6, y: ROOF + 1.0, z: 20.6 }, 'Pegar munição .38 (×3)', () => giveAmmo(S, 3), () => ammoMesh(M, 39.62, ROOF + 0.9, 20.6, 3));
  // docs
  S._doc('desenho_crianca', { x: 19.5, y: ROOF + 0.6, z: 16.4 }, 19.5, ROOF + 0.51, 16.4);
  S._doc('ficha_bercario', { x: 29.4, y: ROOF + 0.7, z: 15.6 }, 29.4, ROOF + 0.56, 15.6);
  S._doc('ordem_seguranca', { x: 38.5, y: ROOF + 0.95, z: 17.8 }, 38.5, ROOF + 0.86, 17.8);
  S._doc('diario_menino', { x: 12.7, y: ROOF + 0.6, z: 15.7 }, 12.7, ROOF + 0.46, 15.7);
  // QUARTO 7: amuleto + balas escondidas
  S._pickup('amulet', { x: 12.8, y: ROOF + 0.85, z: 21.2 }, 'Pegar o amuleto do menino', () => {
    g.inventory.add('amuleto_menino'); S.q.set('hasAmulet'); applyAmulet(S); g.player.st = g.player.maxSt;
    g.inventory.add('municao_38', 4);
    g.hud.toast('Amuleto do menino — fôlego máximo +25. Embaixo dele, 4 balas .38 embrulhadas num desenho.', 5);
  }, () => {
    const gr = new THREE.Group();
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.03), M.sheet); t.position.set(12.8, ROOF + 0.73, 21.2); gr.add(t);
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.008, 4, 12), M.toyRed || M.bloodDecal); r.rotation.x = Math.PI / 2; r.position.set(12.8, ROOF + 0.71, 21.2); gr.add(r);
    gr.add(ammoMesh(M, 13.05, ROOF + 0.7, 21.3, 4));
    return gr;
  });
  // teatrinho de fantoches
  g.interact.add({ id: 'theater', pos: { x: 17.2, y: ROOF + 1.1, z: 18 }, radius: 1.5, enabled: () => !S.q.has('theaterMoved'),
    prompt: 'Empurrar o teatrinho de fantoches', onInteract: () => moveTheater(S, false) });
  // porta do Quarto 7 (só depois de achar a porta)
  const d7 = L.doors.quarto7;
  g.interact.add({ id: 'door_quarto7', radius: 1.6, pos: { x: d7.x, y: d7.y + 1, z: d7.z }, enabled: () => S.q.has('theaterMoved'),
    prompt: () => (d7.locked ? 'Examinar a porta do Quarto 7' : d7.open ? 'Fechar a porta do Quarto 7' : 'Abrir a porta do Quarto 7'),
    onInteract: () => {
      if (d7.locked) { S.q.set('note_quarto7'); g.audio.play('locked', d7); g.hud.toast(d7.lockMsg + (g.inventory.weapons.includes('revolver') ? ' Mas o cadeado… um tiro resolveria.' : ''), 4); return; }
      d7.setOpen(!d7.open); g.perception.noise(d7, 5, 'door');
    } });
  // caixinha de música: toca 12 s e atrai quem estiver no andar
  g.interact.add({ id: 'musicbox', pos: { x: MUSIC_BOX.x, y: MUSIC_BOX.y, z: MUSIC_BOX.z + 0.5 }, radius: 1.4, enabled: () => S.music.t <= 0,
    prompt: 'Dar corda na caixinha de música', onInteract: () => windMusicBox(S) });
}

export function giveAmmo(S, n) {
  const g = S.game; g.inventory.add('municao_38', n);
  g.hud.toast(`Munição .38 ×${n} (total ${g.inventory.count('municao_38')})`, 2.5);
}

export function windMusicBox(S) {
  const g = S.game, L = S.level;
  S.music.t = MUSIC_DUR; S.music.note = 0; S.music.noteT = 0; S.music.noise = 0;
  L.musicBox.playing = true;
  S.q.set('musicBoxUsed');
  g.audio.play('switch', MUSIC_BOX);
  g.hud.toast('A caixinha toca uma canção de ninar. Alto demais neste silêncio.', 3);
  S.hint('musicbox', 'A <b>caixinha de música</b> atrai os inimigos do andar até ela por alguns segundos. Use para passar — ou para emboscar.', 8);
}

export function moveTheater(S, instant) {
  const g = S.game, L = S.level, T = L.theater;
  S.q.set('theaterMoved');
  const dz = 2.4;
  g.col.setBox(T.collider, THEATER.x0, ROOF, THEATER.z0 + dz, THEATER.x1, ROOF + 2.7, THEATER.z1 + dz);
  if (instant) { T.slide = 1; T.group.position.z = T.z + dz; return; }
  T.slide = 0;
  g.audio.play('thud', { x: 16.6, y: ROOF + 0.5, z: 18 }, { pitch: 0.8 });
  g.perception.noise({ x: 16.6, y: ROOF, z: 18 }, 7, 'furniture');
  g.hud.toast('Atrás do teatrinho, uma porta com um 7 pintado à mão — passada a corrente e cadeado.', 4.5);
}

export function breakLock(S, instant) {
  const g = S.game, L = S.level, d = L.doors.quarto7;
  S.q.set('lockBroken');
  L.padlock.chain.visible = false; L.padlock.broken.visible = true;
  d.locked = false;
  if (instant) return;
  g.audio.play('clang', PADLOCK, { pitch: 1.3 }); g.combat.sparks(PADLOCK, 18);
  g.hud.toast('O cadeado estoura. A corrente escorrega até o chão. O Quarto 7 está aberto.', 4);
  wakeEnemy(S, 'int_brinq');
}

function applyAmulet(S) { if (S.q.has('hasAmulet')) S.game.player.maxSt = 125; }

export function wakeEnemy(S, id) {
  const g = S.game, w = g.enemies.find((e) => e.id === id);
  if (w && w.alive && w.dormant) { w.wake(); g.audio.play('groan', w.pos); }
}

/** porta trancada tratada pelo 3º andar; retorna true se resolveu */
export function useDoorPeds(S, d) {
  const g = S.game, p = g.player.pos;
  if (d.id === 'fireExit' && p.x > 41) {
    d.locked = false; d.setOpen(true); S.q.set('fireExitShortcut');
    g.audio.play('switch', d); g.audio.play('clang', d, { pitch: 0.7 });
    g.hud.toast('Você solta a corrente da barra antipânico. A escada de incêndio agora liga o 3º andar ao patamar da escada principal.', 4.5);
    return true;
  }
  if (d.id === 'seguranca' && g.inventory.has('chave_seguranca')) {
    g.inventory.remove('chave_seguranca');
    d.locked = false; d.setOpen(true); S.q.set('securityOpen');
    g.audio.play('switch', d); g.perception.noise(d, 7, 'door');
    g.hud.toast('A chave do ursinho gira. A segurança está aberta.');
    return true;
  }
  return false;
}

export function applyPeds(S, save) {
  const g = S.game, f = save.flags;
  if (f.theaterMoved) moveTheater(S, true);
  if (f.lockBroken) breakLock(S, true);
  applyAmulet(S);
  // armas coletadas (garantia para saves antigos/estado divergente)
  if (f.picked_facao && !g.inventory.weapons.includes('facao')) g.inventory.weapons.push('facao');
  if (f.picked_revolver && !g.inventory.weapons.includes('revolver')) g.inventory.weapons.push('revolver');
  if (f.picked_revolver) { const w = g.enemies.find((e) => e.id === 'int_seg'); if (w && w.alive) w.dormant = false; }
  if (f.picked_facao) { const w = g.enemies.find((e) => e.id === 'ras_berc'); if (w && w.alive) w.dormant = false; }
}

export function updatePedsScript(S, dt) {
  const g = S.game, p = g.player.pos, q = S.q, room = S.room;
  const autosave = (flag, cp) => { q.set(flag); g.saveGame(cp); g.hud.toast('Progresso salvo automaticamente.'); };
  if (!q.has('enteredPeds') && p.y > 7 && p.x > 12 && p.x < 41 && p.z > 14 && p.z < 25.7) autosave('enteredPeds', 'peds');
  if (!q.has('reachedFireEscape') && p.x > 41.2 && p.y < UP2 + 0.4 && p.y > UP2 - 0.4 && p.z > 21.4) autosave('reachedFireEscape', 'fireEscape');
  if (!q.has('readChildDrawing') && g.inventory.documents.includes('desenho_crianca')) q.set('readChildDrawing');
  if (!q.has('foundQuarto7') && room === 'quarto7') { q.set('foundQuarto7'); g.audio.play('whisper', { x: 14, y: ROOF + 1, z: 18 }); }
  // caixinha de música: notas + ruído periódico que atrai
  const m = S.music;
  if (m.t > 0) {
    m.t -= dt; m.noteT -= dt; m.noise -= dt;
    if (m.noteT <= 0) { m.noteT = 0.42; g.audio.play('chime', MUSIC_BOX, { f: NOTES[m.note++ % NOTES.length] * (m.t < 3 ? 0.94 : 1) }); }
    if (m.noise <= 0) { m.noise = 1.2; g.perception.noise(MUSIC_BOX, 24, 'music'); }
    if (m.t <= 0) { S.level.musicBox.playing = false; m.t = 0; }
  }
  // inimigos adormecidos acordam com a proximidade
  for (const [id, r] of [['int_brinq', 2.2], ['ras_berc', 2.6], ['int_seg', 2.2]]) {
    const w = g.enemies.find((e) => e.id === id);
    if (w && w.alive && w.dormant && Math.abs(p.y - w.pos.y) < 1.5 && Math.hypot(p.x - w.pos.x, p.z - w.pos.z) < r) { w.wake(); g.audio.play('groan', w.pos); }
  }
}

// ---------- modelos de coleta ----------
function facaoMesh(M) {
  const gr = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.012), M.axeEdge); blade.position.y = -0.1; gr.add(blade);
  const h = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.16, 0.035), M.woodDark); h.position.y = 0.23; gr.add(h);
  gr.position.set(27.0, ROOF + 0.95, 15.75); gr.rotation.z = 0.25; gr.rotation.x = 0.15;
  return gr;
}
function revolverMesh(M) {
  const gr = new THREE.Group();
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.18), M.steelDark); barrel.position.z = 0.08; gr.add(barrel);
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8), M.steel); cyl.rotation.x = Math.PI / 2; gr.add(cyl);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.1), M.woodDark); grip.position.set(0, 0, -0.08); grip.rotation.y = 0.4; gr.add(grip);
  gr.position.set(38.0, ROOF + 0.88, 18.1); gr.rotation.y = 0.6;
  return gr;
}
export function ammoMesh(M, x, y, z, n) {
  const gr = new THREE.Group();
  for (let i = 0; i < n; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.035, 6), M.gold); b.position.set(x + (i % 3) * 0.025, y + 0.018, z + Math.floor(i / 3) * 0.025); gr.add(b); }
  return gr;
}
