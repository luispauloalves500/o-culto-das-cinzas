// Lógica da ala cirúrgica superior e do telhado: martelo industrial, parede rachada do expurgo (segredo),
// cilindros de oxigênio explosivos, atalho da escada principal, autosaves e inimigos adormecidos.
// Funções recebem o HospitalScript (S) para reaproveitar _pickup/_doc/_saveBook/hint e as flags (S.q).
import * as THREE from 'three';
import { UP2, ROOF, OXYGEN_TANKS, CRACKED_WALL, WING_DOORS } from './HospitalWing.js';

export { WING_DOORS };

export const WING_SPAWNS = [
  { id: 'enf_wing', type: 'enfermeiro', x: 34.5, y: UP2, z: 27.5, patrol: [{ x: 34.8, y: UP2, z: 27.5 }, { x: 18, y: UP2, z: 27.5 }] },
  { id: 'int_s2', type: 'interno', x: 28.9, y: UP2, z: 33.2, yaw: -Math.PI / 2, dormant: true },
  { id: 'ras_ster', type: 'rastejador', x: 19.6, y: UP2, z: 36.6, yaw: Math.PI, dormant: true },
  { id: 'int_roof', type: 'interno', x: 27, y: ROOF, z: 28.5, patrol: [{ x: 27, y: ROOF, z: 28.2 }, { x: 33, y: ROOF, z: 28.6 }, { x: 27.5, y: ROOF, z: 34.4 }] },
];

const BLAST_R = 3.2, BLAST_PLAYER_R = 2.6, CHAIN_R = 2.8;

/** parede de tijolo novo do expurgo: alvo de combate que só cede ao golpe forte do martelo */
class CrackedWall {
  constructor(S) { this.S = S; this.id = 'crackedWall'; this.isProp = true; this.alive = true; this.pos = { x: CRACKED_WALL.x, y: CRACKED_WALL.y0, z: CRACKED_WALL.z }; }
  hurtVolumes() { const C = CRACKED_WALL; return [{ type: 'capsule', x: C.x, z: C.z, y0: C.y0 + 0.2, y1: C.y0 + 2.1, r: 0.62 }]; }
  takeHit(h) { return wallHit(this.S, h); }
}
/** cilindro de oxigênio: qualquer golpe faz explodir */
class OxygenTank {
  constructor(S, t) { this.S = S; this.id = t.id; this.isProp = true; this.alive = true; this.pos = { x: t.x, y: UP2, z: t.z }; }
  hurtVolumes() { return [{ type: 'capsule', x: this.pos.x, z: this.pos.z, y0: UP2 + 0.1, y1: UP2 + 1.4, r: 0.26 }]; }
  takeHit() { explode(this.S, this.id); return 'dead'; }
}

export function setupWing(S) {
  const g = S.game, L = S.level, M = g.materials;
  S.props = [new CrackedWall(S), ...OXYGEN_TANKS.map((t) => new OxygenTank(S, t))];
  S.pendingBlasts = [];
  // martelo industrial no barracão do telhado
  S._pickup('hammer', { x: 33.9, y: ROOF + 1.0, z: 37.3 }, 'Pegar martelo industrial', () => {
    g.inventory.addWeapon('martelo'); g.player.setWeapon('martelo'); S.q.set('hasHammer');
    g.hud.toast('Martelo industrial — em mãos', 3);
    S.hint('hammer', '<b>Martelo industrial</b>: lento e caro em fôlego, mas quebra a guarda. O <b>golpe forte</b> derruba alvenaria fraca.<br><b>R</b> (LB no controle): trocar de arma.', 10);
  }, () => hammerMesh(M));
  // expurgo emparedado (segredo)
  S._pickup('whetstone', { x: 27.2, y: UP2 + 1.0, z: 37.6 }, 'Pegar pedra de afiar', () => {
    S._giveItem('pedra_afiar'); S.q.set('sharpened'); g.player.sharpened = true;
    g.hud.toast('Pedra de afiar — o machado de incêndio agora corta 30% mais fundo.', 4);
  }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.08), M.stone); m.position.set(27.2, UP2 + 0.93, 37.95); m.rotation.y = 0.3; return m; });
  S._pickup('band_exp', { x: 25.0, y: UP2 + 1.0, z: 37.6 }, 'Pegar bandagens (×2)', () => { g.inventory.add('bandagem', 2); g.hud.toast('Bandagem ×2 obtida'); },
    () => { const gr = new THREE.Group(); gr.add(S._bandMesh(24.8, UP2 + 0.95, 37.95)); gr.add(S._bandMesh(25.05, UP2 + 0.95, 37.9)); return gr; });
  S._pickup('band_ster', { x: 23.0, y: UP2 + 0.95, z: 33.6 }, 'Pegar bandagem', () => S._giveItem('bandagem'), () => S._bandMesh(23.0, UP2 + 0.9, 34.05));
  S._pickup('band_rec', { x: 34.6, y: UP2 + 0.8, z: 31.2 }, 'Pegar bandagem', () => S._giveItem('bandagem'), () => S._bandMesh(34.6, UP2 + 0.64, 31.2));
  S._doc('registro_cirurgico', { x: 22.2, y: UP2 + 0.95, z: 33.6 }, 22.2, UP2 + 0.86, 34.05);
  S._doc('bilhete_zelador', { x: 34.6, y: ROOF + 0.95, z: 37.3 }, 34.6, ROOF + 0.91, 37.8);
  S._doc('ultimo_bilhete', { x: 28.1, y: UP2 + 0.95, z: 37.6 }, 28.1, UP2 + 0.91, 38.0);
  S._saveBook('book_wing', { x: 35.3, y: UP2 + 0.95, z: 37.2 }, 35.3, UP2 + 0.93, 37.75, 'recovery');
  // examinar a parede rachada
  g.interact.add({ id: 'cracked_wall', pos: { x: CRACKED_WALL.x, y: UP2 + 1.2, z: 35.4 }, radius: 1.4,
    enabled: () => !S.q.has('wallBroken'), prompt: 'Examinar a parede de tijolos',
    onInteract: () => {
      S.q.set('sawCrackedWall');
      g.audio.play('block', { x: CRACKED_WALL.x, y: UP2 + 1.2, z: CRACKED_WALL.z });
      g.hud.toast(g.inventory.weapons.includes('martelo')
        ? 'Tijolo novo, reboco mal acabado. Soa oco. Um golpe forte de martelo derrubaria isso.'
        : 'Tijolo novo sobre reboco ainda claro. Bato e soa oco — mas o machado só arrancaria lascas. Precisaria de algo pesado.', 5);
    } });
}

function hammerMesh(M) {
  const gr = new THREE.Group();
  const h = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.86, 0.05), M.woodDark); gr.add(h);
  const hd = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.13), M.steelDark); hd.position.y = 0.43; gr.add(hd);
  gr.position.set(33.9, ROOF + 1.33, 37.95); gr.rotation.z = 0.2; gr.rotation.x = -0.12;
  return gr;
}

function wallHit(S, h) {
  const g = S.game, at = h.point || { x: CRACKED_WALL.x, y: UP2 + 1.2, z: CRACKED_WALL.z };
  if (h.weapon === 'martelo' && h.heavy) { breakWall(S, false); return 'dead'; }
  S.q.set('wallTried');
  g.audio.play('clang', at); g.combat.sparks(at, 10); g.cameraCtl.addShake(0.2);
  g.perception.noise(at, 9, 'clang');
  g.hud.toast(h.weapon === 'martelo' ? 'O tijolo trinca, mas não cede. Precisa de um golpe forte (botão direito).'
    : 'A parede soa oca. O machado só arranca lascas — seria preciso algo pesado.', 3);
  return 'immune';
}

export function breakWall(S, instant) {
  const g = S.game, L = S.level, W = L.crackedWall;
  W.panel.visible = false; W.collider.enabled = false;
  for (const c of W.cracks) c.visible = false;
  W.debris.visible = true;
  L.expurgoGate.open = true;
  const p = S.props?.find((x) => x.id === 'crackedWall'); if (p) p.alive = false;
  S.q.set('wallBroken');
  if (instant) return;
  const at = { x: CRACKED_WALL.x, y: UP2 + 1.1, z: CRACKED_WALL.z };
  g.audio.play('thud', at); g.audio.play('clang', at, { pitch: 0.6 });
  g.combat.sparks(at, 24); g.cameraCtl.addShake(0.55);
  g.perception.noise(at, 16, 'wall');
  g.hud.toast('O tijolo novo desaba. Atrás da parede, um cubículo que alguém quis esquecer.', 4);
  const w = g.enemies.find((e) => e.id === 'int_s2');
  if (w && w.alive && w.dormant) { w.wake(); g.audio.play('groan', w.pos); }
}

function applyTank(L, id) {
  const T = L.tanks[id];
  T.group.visible = false; T.collider.enabled = false; T.scorch.visible = true;
}

export function explode(S, id) {
  const g = S.game, L = S.level, T = L.tanks[id], prop = S.props.find((x) => x.id === id);
  if (!T || !prop || !prop.alive) return;
  prop.alive = false;
  S.q.set('exploded_' + id);
  applyTank(L, id);
  const at = { x: T.x, y: UP2 + 0.8, z: T.z }, pp = g.player.pos;
  g.audio.play('thud', at, { pitch: 0.55 }); g.audio.play('clang', at, { pitch: 0.45 }); g.audio.play('spark', at);
  g.combat.sparks(at, 40);
  L.blastLight.position.set(T.x, UP2 + 1.4, T.z); L.blastLight.intensity = 7;
  const dp = Math.hypot(pp.x - T.x, pp.z - T.z);
  g.cameraCtl.addShake(Math.max(0.15, 0.8 - dp * 0.08));
  g.perception.noise(at, 18, 'blast');
  for (const e of g.enemies) {
    if (!e.alive || Math.abs(e.pos.y - UP2) > 2) continue;
    const d = Math.hypot(e.pos.x - T.x, e.pos.z - T.z);
    if (d < BLAST_R) e.takeHit({ dmg: Math.round(85 * (1 - (d / BLAST_R) * 0.4)), poise: 200, heavy: true, from: at, point: { x: e.pos.x, y: e.pos.y + 1, z: e.pos.z } });
  }
  if (dp < BLAST_PLAYER_R && Math.abs(pp.y - UP2) < 2 && g.player.hp > 0) {
    g.player.takeHit({ dmg: 35, from: at, blockable: false, knock: 5, source: 'blast' });
    g.hud.toast('A explosão te joga longe!', 1.5);
  }
  for (const o of S.props) {
    if (o.alive && o instanceof OxygenTank && Math.hypot(o.pos.x - T.x, o.pos.z - T.z) < CHAIN_R) S.pendingBlasts.push({ id: o.id, t: 0.3 });
  }
}

/** porta trancada tratada pela ala; retorna true se resolveu */
export function useDoorWing(S, d) {
  const g = S.game, p = g.player.pos;
  if (d.id === 'mainStair' && p.z > 14) {
    d.locked = false; d.setOpen(true); S.q.set('mainStairShortcut');
    g.audio.play('switch', d);
    g.hud.toast('Você puxou o ferrolho. A escada principal agora liga o térreo ao 2º andar.');
    return true;
  }
  return false;
}

export function applyWing(S, save) {
  const g = S.game, f = save.flags;
  if (f.wallBroken) breakWall(S, true);
  for (const t of OXYGEN_TANKS) if (f['exploded_' + t.id]) { applyTank(S.level, t.id); const p = S.props.find((x) => x.id === t.id); if (p) p.alive = false; }
  g.player.sharpened = !!f.sharpened;
  // saves antigos: o machado já coletado entra na lista de armas
  if (f.hasAxe && !g.inventory.weapons.includes('machado')) g.inventory.weapons.unshift('machado');
  if (f.hasHammer && !g.inventory.weapons.includes('martelo')) g.inventory.weapons.push('martelo');
  if (f.wallBroken) { const w = g.enemies.find((e) => e.id === 'int_s2'); if (w && w.alive) w.dormant = false; }
}

export function updateWing(S, dt) {
  const g = S.game, p = g.player.pos, q = S.q, room = S.room;
  // explosões em cadeia
  for (let i = S.pendingBlasts.length - 1; i >= 0; i--) {
    const b = S.pendingBlasts[i]; b.t -= dt;
    if (b.t <= 0) { S.pendingBlasts.splice(i, 1); explode(S, b.id); }
  }
  const autosave = (flag, cp) => { q.set(flag); g.saveGame(cp); g.hud.toast('Progresso salvo automaticamente.'); };
  const inWing = p.y > 3.5 && p.y < 6.6 && p.x > 16.4 && p.x < 36 && p.z > 26.2 && p.z < 38.4;
  if (!q.has('enteredWing') && inWing) autosave('enteredWing', 'wing');
  if (!q.has('reachedRoof') && p.y > 7 && p.x > 16.6 && p.z > 26 && p.z < 38.4) autosave('reachedRoof', 'roof');
  if (!q.has('readSurgLog') && g.inventory.documents.includes('registro_cirurgico')) q.set('readSurgLog');
  if (!q.has('foundExpurgo') && room === 'expurgo') { q.set('foundExpurgo'); g.audio.play('whisper', { x: 30, y: UP2 + 1, z: 37 }); }
  if (!q.has('usedMainStair') && room === 'mainStair') q.set('usedMainStair');
  // dica dos cilindros
  if (inWing && !S.tut.shown.o2) {
    for (const o of S.props) if (o.alive && o instanceof OxygenTank && Math.hypot(p.x - o.pos.x, p.z - o.pos.z) < 2.6) {
      S.hint('o2', 'Cilindros de <b>oxigênio</b>: um golpe e eles explodem. Atraia os inimigos para perto — e fique longe.', 8); break;
    }
  }
  // inimigos adormecidos acordam com a proximidade
  for (const [id, r] of [['int_s2', 2.4], ['ras_ster', 2.8]]) {
    const w = g.enemies.find((e) => e.id === id);
    if (w && w.alive && w.dormant && Math.abs(p.y - w.pos.y) < 1.5 && Math.hypot(p.x - w.pos.x, p.z - w.pos.z) < r) { w.wake(); g.audio.play('groan', w.pos); }
  }
}
