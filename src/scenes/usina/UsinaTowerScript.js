// Capítulo 8 — A Última Chama (resto do capítulo): base da torre → escada de marinheiro → casa de máquinas (Helena,
// manete, faca de força) → MONTA-CARGAS (cabine real: carrega o jogador, portas pantográficas por andar) → Sala dos
// Transmissores: chefe em duas formas — DR. SILAS VERNET (o vapor dos acumuladores o escalda e atordoa, mecânica das
// caldeiras) e a MANIFESTAÇÃO DA PRIMEIRA CINZA (as bobinas a refazem; cortar os disjuntores a atordoa e abre o núcleo,
// mecânica da chave geral) → soltar Inês → Helena sobe no monta-cargas e conta a verdade → DECISÃO FINAL sem cronômetro:
// segurar a chama (custa vida), entregá-la a Helena ou quebrar a lâmpada em combate → cena do final → tela de fim e créditos.
import { Cutscene } from '../../gameplay/Cutscene.js';
import { VernetBoss } from '../../ai/VernetBoss.js';
import { ManifestacaoBoss } from '../../ai/ManifestacaoBoss.js';
import {
  MACH_Y, ARENA_Y, TB, LADDER_T1, KNIFE, HELENA_DOC, MACH_BOOK, ARENA, ARENA_EXIT_Z, ARENA_STEAM, STEAM, ARENA_COILS, COIL_HOLD,
  BULB, INES_USE, INES_CHAIR, HELENA_ARENA, VERNET_START, MANIF_CENTER, CAB, inSteamPlume, inCabin, placeNpc, npcWalkTo,
  setKnife, setCoil, breakBulb, freeInes, applyTowerState,
} from './UsinaTower.js';

const AY = ARENA_Y, MY = MACH_Y;
export const C8_HOLD_RANGE = 1.2;
export const C8_INES_HOLD = 2.0;
export const C8_FLAME_HOLD = 4.2;
export const C8_FLAME_DRAIN = { every: 0.4, dmg: 3, min: 8 };
export const C8_BULB_HP = 30;
export const C8_KNIFE_NOISE = 10;
export const C8_MANIF_RELOAD_DELAY = 1.5;
export const VERNET_NAME = 'DR. SILAS VERNET';
export const MANIF_NAME = 'A MANIFESTAÇÃO DA PRIMEIRA CINZA';

/** a lâmpada da Primeira Cinza: alvo de combate real (golpe ou tiro) — só depois da verdade, e só até a escolha */
class BulbProp {
  constructor(S) { this.S = S; this.id = 'c8_bulb'; this.isProp = true; this.hp = C8_BULB_HP; this.pos = { x: BULB.x, y: AY, z: BULB.z }; }
  get alive() { const q = this.S.q; return q.has('c8_choice') && !q.has('c8_ending') && this.hp > 0; }
  hurtVolumes() { return [{ type: 'sphere', part: 'bulb', x: BULB.x, y: BULB.y, z: BULB.z, r: BULB.r + 0.12 }]; }
  takeHit(h) {
    if (!this.alive) return 'immune';
    const g = this.S.game;
    this.hp -= Math.max(1, h.dmg || 10);
    g.audio.play('glass', { x: BULB.x, y: BULB.y, z: BULB.z }, { vol: 0.5 });
    if (this.hp > 0) { g.hud.toast('O vidro trinca. A brasa lá dentro se encolhe.', 2); return 'hit'; }
    breakBulb(this.S.level);
    chooseEnding(this.S, 'cinzas');
    return 'dead';
  }
}

export function setupTower(S, save) {
  const g = S.game, L = S.level, q = S.q;
  S.tw = { hold: null, plumeHit: {}, burnT: 0, enemyBurn: {}, trip: null, tripT: 0, manifT: 0, introDone: false };
  S.props = [...(S.props || []), new BulbProp(S)];
  L.onLiftArrive = (stop) => onArrive(S, stop);

  // ---------- base: botoeira e escada de marinheiro até o alçapão ----------
  g.interact.add({ id: 'c8_lift', pos: { x: 13, y: 1, z: 71.6 }, radius: 1.3, prompt: 'Chamar o monta-cargas', onInteract: () => callLift(S, 'base') });
  g.interact.add({ id: 'c8_towerLadder', pos: { x: LADDER_T1.bottom.x, y: 1, z: LADDER_T1.bottom.z }, radius: 1.1,
    enabled: () => g.player.state !== 'climb', prompt: 'Subir a escada de marinheiro (alçapão da casa de máquinas)',
    onInteract: () => { q.set('c8_triedLadder'); g.player.startClimb(LADDER_T1); } });
  g.interact.add({ id: 'c8_towerLadderTop', pos: { x: LADDER_T1.top.x, y: MY + 1, z: LADDER_T1.top.z }, radius: 1.0,
    enabled: () => g.player.state !== 'climb', prompt: 'Descer pela escada de marinheiro', onInteract: () => g.player.startClimb(LADDER_T1) });

  // ---------- casa de máquinas ----------
  g.interact.add({ id: 'c8_helena', pos: L.helena.pos, radius: 1.6,
    enabled: () => !q.has('c8_helenaUp') && !S.tw.trip,
    prompt: () => (q.has('c8_metHelena') ? 'Falar com Helena' : 'Mulher de jaleco, encostada nos caixotes'),
    onInteract: () => (q.has('c8_metHelena') ? helenaTalk(S) : meetHelena(S)) });
  S._doc('diario_helena', { x: HELENA_DOC.x + 0.6, y: MY + 1.2, z: HELENA_DOC.z }, HELENA_DOC.x, MY + 0.86, HELENA_DOC.z);
  S._saveBook('c8_mach_book', { x: MACH_BOOK.use.x, y: MY + 1.2, z: MACH_BOOK.use.z }, MACH_BOOK.x, MY + 0.89, MACH_BOOK.z, 'c8_machine');
  g.interact.add({ id: 'c8_knife', pos: { x: KNIFE.use.x, y: MY + 1, z: KNIFE.use.z }, radius: 1.2,
    enabled: () => !q.has('c8_liftPower'), prompt: 'Fechar a faca de força do monta-cargas', onInteract: () => closeKnife(S) });
  g.interact.add({ id: 'c8_lift_m', pos: { x: 13, y: MY + 1, z: 71.6 }, radius: 1.3, prompt: 'Chamar o monta-cargas', onInteract: () => callLift(S, 'maq') });
  // cabine: alavancas no painel (a posição acompanha a cabine)
  S.tw.cabPos = { x: 14.3, y: L.lift.y, z: 73.4 };
  S.tw.cabPos2 = { x: 14.3, y: L.lift.y, z: 74.9 };
  const inCab = () => inCabin(g.player.pos, L.lift.y, 0.45) && !L.lift.moving;
  g.interact.add({ id: 'c8_cab_up', pos: S.tw.cabPos, radius: 1.4, enabled: () => inCab() && !!L.lift.next(1),
    prompt: () => (g.inventory.has('manete_monta_cargas') ? 'Alavanca da cabine: SUBIR' : 'Painel da cabine (eixo sem manete)'), onInteract: () => cabLever(S, 1) });
  g.interact.add({ id: 'c8_cab_down', pos: S.tw.cabPos2, radius: 1.4, enabled: () => inCab() && !!L.lift.next(-1),
    prompt: () => (g.inventory.has('manete_monta_cargas') ? 'Alavanca da cabine: DESCER' : 'Painel da cabine (eixo sem manete)'), onInteract: () => cabLever(S, -1) });

  // ---------- Sala dos Transmissores ----------
  g.interact.add({ id: 'c8_lift_a', pos: { x: 13, y: AY + 1, z: 76.6 }, radius: 1.3, prompt: 'Chamar o monta-cargas', onInteract: () => callLift(S, 'topo') });
  S._plaque('relatorio_transmissao', 22.85, AY + 1.5, 77.4, -Math.PI / 2, { x: 21.9, z: 77.4 });
  for (const V of ARENA_STEAM) {
    g.interact.add({ id: 'c8_steam_' + V.id, pos: { x: V.use.x, y: AY + 1, z: V.use.z }, radius: 1.2,
      enabled: () => q.has('c8_atTop') && !S.tw.hold && !q.has('c8_cinzaDead'),
      prompt: () => { const v = L.tower.valves[V.id]; return v.charge >= 1 ? `Girar o registro do acumulador ${V.id === 'W' ? 'oeste' : 'leste'} (vapor)` : `Acumulador ${V.id === 'W' ? 'oeste' : 'leste'}: pressão ${Math.round(v.charge * 100)}%`; },
      onInteract: () => {
        const v = L.tower.valves[V.id];
        if (v.charge < 1 || v.delayT > 0 || v.plumeT > 0) { g.audio.play('locked', { x: V.tank.x, y: AY + 1, z: V.tank.z }); g.hud.toast('O manômetro ainda está subindo. O acumulador precisa recarregar.', 2.5); return; }
        startHold(S, 'steam_' + V.id, STEAM.hold, 'Girando o registro… (fique perto e não apanhe)', () => fireSteam(S, V.id));
      } });
  }
  for (const C of ARENA_COILS) {
    g.interact.add({ id: 'c8_breaker_' + C.id, pos: { x: C.use.x, y: AY + 1, z: C.use.z }, radius: 1.2,
      enabled: () => q.has('c8_vernetDown') && !q.has('c8_cinzaDead') && L.tower.coils[C.id].live && !S.tw.hold,
      prompt: 'Cortar o disjuntor da bobina (segure)',
      onInteract: () => startHold(S, 'coil_' + C.id, COIL_HOLD, 'Puxando o disjuntor… os arcos estalam na sua mão.', () => cutCoil(S, C.id)) });
  }
  g.interact.add({ id: 'c8_ines', pos: { x: INES_USE.x, y: AY + 1, z: INES_USE.z }, radius: 1.4,
    enabled: () => q.has('c8_cinzaDead') && !q.has('c8_inesFree') && !S.tw.hold, prompt: 'Soltar Inês da cadeira (segure)',
    onInteract: () => startHold(S, 'ines', C8_INES_HOLD, 'Soltando as correias e o capacete de fios…', () => releaseInes(S)) });
  g.interact.add({ id: 'c8_flame', pos: { x: BULB.x, y: AY + 1, z: BULB.z - 1.15 }, radius: 1.3,
    enabled: () => q.has('c8_choice') && !q.has('c8_ending') && !S.tw.hold, prompt: 'Segurar a chama (tomá-la para si — segure)',
    onInteract: () => {
      g.hud.hint('A brasa <b>queima</b> enquanto você segura: solte (afaste-se) para desistir.', 4);
      startHold(S, 'flame', C8_FLAME_HOLD, 'Você fecha a mão em volta do vidro. Queima.', () => chooseEnding(S, 'guardiao'), { drain: true });
    } });
  g.interact.add({ id: 'c8_helena_give', pos: L.helena.pos, radius: 1.6,
    enabled: () => q.has('c8_choice') && !q.has('c8_ending') && q.has('c8_helenaUp') && L.helena.mode === 'stand',
    prompt: 'Deixar Helena levar a chama (maleta de chumbo)', onInteract: () => chooseEnding(S, 'herdeira') });

  applyTowerFlow(S, save);
}

/** estado do roteiro da torre a partir do save (chefe certo, viagem da Helena, travas) */
export function applyTowerFlow(S, save) {
  const g = S.game, L = S.level, f = save.flags;
  applyTowerState(L, f, save.checkpoint);
  L.liftLocked = false;
  if (!f.c8_vernetDown) {
    g.boss = new VernetBoss(g, { x: VERNET_START.x, y: AY, z: VERNET_START.z, yaw: VERNET_START.yaw });
  } else if (!f.c8_cinzaDead) {
    spawnManif(S);
    L.liftLocked = true;
    S.tw.manifT = C8_MANIF_RELOAD_DELAY;
  }
  if (f.c8_inesFree && !f.c8_helenaUp) S.tw.trip = 'wait';
  if (f.c8_helenaUp && !f.c8_choice && !f.c8_ending) S.q.set('c8_choice');
  if (f.c8_ending === 'herdeira') { L.helena.hold = true; L.helena.rig.case && (L.helena.rig.case.visible = true); }
}

function spawnManif(S) {
  const g = S.game, L = S.level;
  const coils = ARENA_COILS.map((C) => ({ id: C.id, x: C.x, z: C.z, top: AY + 2.85, live: L.tower.coils[C.id].live }));
  const m = new ManifestacaoBoss(g, { x: MANIF_CENTER.x, y: AY, z: MANIF_CENTER.z, yaw: Math.PI, coils });
  g.boss = m;
  return m;
}

// ---------- monta-cargas ----------
export function callLift(S, stop) {
  const g = S.game, L = S.level, q = S.q, at = { x: 13, y: (stop === 'base' ? 0 : stop === 'maq' ? MY : AY) + 1, z: 72.4 };
  if (!L.liftPower) {
    g.audio.play('locked', at);
    if (stop === 'base') {
      q.set('c8_triedLift');
      g.hud.toast('O botão afunda sem resposta: a cabine está lá no alto, parada na casa de máquinas — sem força. Lá em cima, alguém está cantando.', 5);
      S.hint('c8_ladder', 'Sem força no monta-cargas. Uma <b>escada de marinheiro</b> sobe pela parede <b>oeste</b> da base até um alçapão.', 8);
    } else g.hud.toast('Sem força. A faca do monta-cargas, no banco de baterias, está aberta.', 3.5);
    return false;
  }
  if (L.liftLocked) { g.audio.play('locked', at); g.hud.toast('A porta pantográfica não cede — o mecanismo está travado.', 3); return false; }
  if (L.lift.moving) { g.hud.toast('A cabine já está a caminho.', 2); return false; }
  if (L.lift.stop === stop) { g.hud.toast('A cabine está aqui.', 1.5); return false; }
  L.lift.go(stop);
  g.audio.play('switch', at);
  g.perception.noise(at, 6, 'metal');
  g.hud.toast('O guincho ronca lá em cima. Os cabos tremem.', 2.5);
  return true;
}
export function cabLever(S, dir) {
  const g = S.game, L = S.level, at = { x: 13, y: L.lift.y + 1, z: 74 };
  if (!g.inventory.has('manete_monta_cargas')) { g.audio.play('locked', at); g.hud.toast('O eixo das alavancas está vazio — falta a manete.', 3); return false; }
  if (!L.liftPower) { g.audio.play('locked', at); g.hud.toast('A manete encaixa, mas nada acontece: sem força. A faca no banco de baterias.', 3.5); return false; }
  if (L.liftLocked) { g.audio.play('locked', at); g.hud.toast('A cabine não responde — travada.', 2.5); return false; }
  const to = L.lift.next(dir);
  if (!to || !L.lift.go(to)) return false;
  g.audio.play('switch', at);
  g.perception.noise(at, 8, 'metal');
  return true;
}
function onArrive(S, stop) {
  const g = S.game, L = S.level, q = S.q, T = S.tw;
  if (T.trip === 'down' && stop === 'maq') {
    T.trip = 'board'; T.tripT = 1.4;
    const h = L.helena; h.mode = 'stand'; h.limp = false;
    placeNpc(h, 12.4, MY, 74.1, 0); h.ride = true;
    return;
  }
  if (T.trip === 'up' && stop === 'topo') {
    T.trip = 'out'; L.liftLocked = false;
    const h = L.helena;
    npcWalkTo(h, [{ x: 12.6, z: 77.4 }, { x: HELENA_ARENA.x, z: HELENA_ARENA.z, yaw: HELENA_ARENA.yaw }], 0.9, () => {
      h.ride = false; h.mode = 'stand'; h.pos.y = AY; T.trip = null;
      q.set('c8_helenaUp');
      truthScene(S);
    });
    return;
  }
  if (stop === 'topo' && !q.has('c8_atTop') && inCabin(g.player.pos, L.lift.y, 0.6)) {
    q.set('c8_atTop');
    g.saveGame('c8_top');
    g.hud.toast('Topo da torre · progresso salvo. Um zumbido grosso atravessa a grade: a Sala dos Transmissores.', 5);
  }
}

// ---------- casa de máquinas ----------
function meetHelena(S) {
  const g = S.game, L = S.level, q = S.q, h = L.helena;
  const at = (x, y, z) => ({ x, y: MY + y, z });
  const shots = [
    { dur: 3.4, from: at(11.4, 1.65, 72.9), to: at(11.0, 1.5, 73.3), look: at(h.pos.x, 0.8, h.pos.z),
      caption: 'Encostada nos caixotes, uma mulher de jaleco aperta o flanco ensanguentado. Uma maleta de chumbo no colo.' },
    { dur: 3.8, from: at(10.6, 1.0, 74.0), look: at(h.pos.x, 0.95, h.pos.z), speaker: 'HELENA',
      caption: '— Elias. Você subiu… Ele disse que você subiria. Vernet quer que você veja.' },
    { dur: 4.4, from: at(10.4, 1.1, 75.0), look: at(h.pos.x, 0.9, h.pos.z), speaker: 'HELENA',
      caption: '— Inês está lá em cima, na Sala dos Transmissores. À meia-noite a voz dela vai pelos fios para todas as casas de Véspera — e a cinza vai junto.' },
    { dur: 4.4, from: at(10.6, 1.2, 73.7), look: at(h.pos.x, 0.85, h.pos.z), speaker: 'HELENA',
      caption: '— A cabine só anda com a manete. Eu a arranquei do painel antes de ele me largar aqui. Tome. A força está na faca, junto das baterias.',
      onStart: () => g.audio.play('clang', at(h.pos.x, 0.8, h.pos.z)) },
    { dur: 3.2, from: at(11.6, 1.7, 73.4), look: at(h.pos.x, 0.9, h.pos.z),
      caption: 'Quando você pergunta como ela sabe tanto, Helena desvia os olhos para a maleta.' },
  ];
  g.playCutscene(new Cutscene(g, { id: 'c8_helena', shots, onEnd: () => {
    q.set('c8_metHelena'); q.set('c8_hasCrank');
    if (!g.inventory.has('manete_monta_cargas')) g.inventory.add('manete_monta_cargas');
    for (const k in L.tower.levers) L.tower.levers[k].visible = true;
    g.hud.toast('Manete do monta-cargas — em mãos', 3);
    S.hint('c8_crank', 'Feche a <b>faca de força</b> (banco de baterias, parede sul) e use as <b>alavancas da cabine</b> — ou chame a cabine pela <b>botoeira</b> ao lado da porta.', 9);
  } }));
}
function helenaTalk(S) {
  const g = S.game, L = S.level, q = S.q;
  const line = !L.liftPower ? '— A faca, Elias. No banco de baterias. Depressa.'
    : !q.has('c8_atTop') ? '— Vá. Eu não consigo subir com isto aberto. Eu… vou logo atrás.'
      : '— Se ele cair, não comemore. A cinza não morre com quem a carrega.';
  g.hud.toast('Helena: ' + line, 4);
}
function closeKnife(S) {
  const g = S.game, L = S.level, q = S.q, at = { x: KNIFE.x, y: MY + 1.2, z: KNIFE.z };
  q.set('c8_liftPower');
  setKnife(L, true);
  g.audio.play('switch', at); g.audio.play('clang', at);
  g.perception.noise(at, C8_KNIFE_NOISE, 'metal');
  g.cameraCtl?.addShake?.(0.12);
  g.hud.toast('A faca fecha com um estalo azul. As baterias zumbem; a lâmpada da cabine acende — e o estalo ecoa pela torre.', 4.5);
}

// ---------- ações de segurar (registro, disjuntor, Inês, a chama) ----------
export function startHold(S, id, dur, label, onDone, { drain = false } = {}) {
  const g = S.game, pl = g.player;
  if (S.tw.hold) return false;
  S.tw.hold = { id, t: 0, dur, onDone, drain, from: { x: pl.pos.x, z: pl.pos.z }, hp: pl.hp, drainT: 0 };
  g.hud.toast(label, Math.min(4, dur + 0.6));
  return true;
}
export function cancelHold(S, why) {
  const g = S.game; const h = S.tw.hold; if (!h) return;
  S.tw.hold = null;
  g.hud.toast(why === 'hit' ? 'O golpe arranca a sua mão do mecanismo.' : 'Você soltou.', 2);
}
function updateHold(S, dt) {
  const h = S.tw.hold; if (!h) return;
  const g = S.game, pl = g.player, p = pl.pos, L = S.level;
  if (pl.hp < h.hp - 0.01 || pl.state === 'hit' || !pl.alive) return cancelHold(S, 'hit');
  if (Math.hypot(p.x - h.from.x, p.z - h.from.z) > C8_HOLD_RANGE) return cancelHold(S, 'moved');
  h.t += dt;
  if (h.id.startsWith('steam_')) { const v = L.tower.valves[h.id.slice(6)]; if (v?.wheel) v.wheel.rotation.z += dt * 5; }
  if (h.id.startsWith('coil_')) { const c = L.tower.coils[h.id.slice(5)]; if (c) c.lever.rotation.z = Math.PI * 0.8 * Math.min(1, h.t / h.dur); }
  if (h.drain) {
    h.drainT += dt;
    while (h.drainT >= C8_FLAME_DRAIN.every) {
      h.drainT -= C8_FLAME_DRAIN.every;
      if (pl.hp > C8_FLAME_DRAIN.min) { pl.hp = Math.max(C8_FLAME_DRAIN.min, pl.hp - C8_FLAME_DRAIN.dmg); g.hud.flashDamage(); }
      h.hp = pl.hp;
    }
    const B = L.tower.bulb; B.flame.scale.setScalar(0.7 + 0.6 * Math.min(1, h.t / h.dur));
  }
  if (h.t < h.dur) return;
  S.tw.hold = null;
  h.onDone();
}

// ---------- acumuladores de vapor ----------
export function fireSteam(S, id) {
  const g = S.game, L = S.level, v = L.tower.valves[id], V = v.V;
  if (v.charge < 1 || v.delayT > 0 || v.plumeT > 0) return false;
  v.charge = 0; v.delayT = STEAM.delay; S.tw.plumeHit[id] = false;
  S.q.set('c8_usedSteam');
  g.audio.play('steam', { x: V.tank.x, y: AY + 1.5, z: V.tank.z }, { dur: 1.2 });
  g.perception.noise({ x: V.plume.x, y: AY, z: V.plume.z }, 12, 'steam');
  g.cameraCtl?.addShake?.(0.15);
  return true;
}
function updateSteam(S, dt) {
  const g = S.game, L = S.level, pl = g.player, T = S.tw;
  let inside = false;
  for (const V of ARENA_STEAM) {
    const v = L.tower.valves[V.id];
    if (!(v.plumeT > 0)) continue;
    const b = g.boss;
    if (b && b.alive && b.state !== 'dormant' && !T.plumeHit[V.id] && inSteamPlume(V, b.pos)) {
      if (b.steamHit()) T.plumeHit[V.id] = true;
    }
    if (pl.alive && inSteamPlume(V, pl.pos)) inside = true;
    for (const e of g.enemies) {
      if (!e.alive || !inSteamPlume(V, e.pos)) continue;
      T.enemyBurn[e.id] = (T.enemyBurn[e.id] || 0) - dt;
      if (T.enemyBurn[e.id] <= 0) { T.enemyBurn[e.id] = 0.4; e.takeHit({ dmg: 20, poise: 18, heavy: false, from: V.plume, point: e.pos }); }
    }
  }
  if (inside) {
    T.burnT -= dt;
    if (T.burnT <= 0) { T.burnT = STEAM.every; pl.envDamage(STEAM.dmg); }
  } else T.burnT = 0;
}
function cutCoil(S, id) {
  const g = S.game, L = S.level, C = ARENA_COILS.find((c) => c.id === id);
  setCoil(L, id, false);
  g.audio.play('switch', { x: C.breaker.x, y: AY + 1.3, z: C.breaker.z });
  g.audio.play('clang', { x: C.x, y: AY + 2, z: C.z });
  g.cameraCtl?.addShake?.(0.2);
  if (g.boss?.cutCoil) g.boss.cutCoil(id);
  const left = Object.values(L.tower.coils).filter((c) => c.live).length;
  g.hud.toast(left ? `A bobina apaga com um estalo. Restam ${left}.` : 'A última bobina apaga. A forma de cinza não tem mais de onde se refazer.', 3.5);
}

// ---------- chefe: Vernet → Manifestação ----------
function vernetIntro(S) {
  const g = S.game, b = g.boss, L = S.level;
  const at = (x, y, z) => ({ x, y: AY + y, z });
  const shots = [
    { dur: 3.8, from: at(13, 1.75, 77.4), to: at(13, 1.9, 78.4), look: at(13, 1.4, 86), caption: 'A Sala dos Transmissores. Três bobinas zumbem em volta de uma lâmpada enorme — e, dentro dela, uma brasa que respira.' },
    { dur: 3.8, from: at(12.2, 1.45, 82.8), look: at(INES_CHAIR.x, 1.15, INES_CHAIR.z), caption: 'Inês, presa à cadeira de ferro, um capacete de fios sobre a cabeça. Os lábios se mexem sem som.' },
    { dur: 4.6, from: at(13.4, 1.75, 80.9), to: at(13.2, 1.7, 81.4), look: at(VERNET_START.x, 1.75, VERNET_START.z), speaker: 'VERNET',
      caption: '— Peça trinta e dois. Eu pedi que deixassem você subir. Queria que visse a sua irmã cantar para a cidade inteira.' },
    { dur: 4.8, from: at(14.2, 1.5, 81.6), look: at(VERNET_START.x, 1.7, VERNET_START.z), speaker: 'VERNET',
      caption: '— Ela é a última chama. A voz dela abre a porta, e a Primeira Cinza entra em cada casa. Vocês dois vão ser eternos.' },
    { dur: 2.8, from: at(13, 1.6, 79.6), look: at(VERNET_START.x, 1.4, VERNET_START.z), caption: 'Ele gira a bengala. Da ponta, uma lâmina de bisturi.',
      onStart: () => g.audio.play('clang', at(VERNET_START.x, 1.3, VERNET_START.z)) },
  ];
  if (b?.rig) { b.yaw = Math.atan2(g.player.pos.x - b.pos.x, g.player.pos.z - b.pos.z); b.rig.root.rotation.y = b.yaw; }
  void L;
  g.playCutscene(new Cutscene(g, { id: 'c8_vernet', shots, onEnd: () => { S.q.set('c8_vernetIntro'); startVernet(S); } }));
}
export function startVernet(S) {
  const g = S.game, L = S.level, b = g.boss;
  if (!b || b.id !== 'vernet' || S.bossActive) return;
  S.bossActive = true; L.liftLocked = true;
  b.activate();
  g.hud.showBoss(true, VERNET_NAME);
  g.audio.setIntensity(2);
  g.hud.toast('A porta pantográfica bate atrás de você e trava.', 3);
  S.hint('c8_vernet', 'Os <b>acumuladores de vapor</b> (cantos sul) têm registros: gire (segure) e, um instante depois, o jato desce sobre o bocal — <b>escalda e atordoa</b> quem estiver embaixo. Atraia Vernet para lá. A <b>ampola de cinza</b> nas costas dele é o ponto fraco.', 12);
}
function vernetDown(S) {
  const g = S.game, b = g.boss, q = S.q, L = S.level;
  q.set('c8_vernetDown');
  S.bossActive = false;
  g.hud.showBoss(false);
  S.tw.hold = null;
  const vp = { x: b.pos.x, z: b.pos.z };
  const at = (x, y, z) => ({ x, y: AY + y, z });
  const cam = at(vp.x + 2.6, 1.6, vp.z - 2.8);
  const shots = [
    { dur: 3.4, from: cam, look: at(vp.x, 0.8, vp.z), caption: 'Vernet cai de joelhos. A ampola das costas se parte — e a cinza não cai: sobe.',
      onStart: () => g.audio.play('glass', at(vp.x, 1.2, vp.z), { vol: 0.8 }) },
    { dur: 3.6, from: at(13, 2.2, 77.6), look: at(13, 2.2, 83), caption: 'As bobinas cospem arcos azuis na direção do corpo. A brasa da lâmpada pulsa; a cinza do teto desce em espiral.',
      onStart: () => g.audio.play('roar', at(13, 2, 83), { pitch: 0.6 }) },
    { dur: 3.0, from: at(vp.x + 1.4, 1.1, vp.z - 1.5), look: at(vp.x, 0.7, vp.z), speaker: 'VERNET', caption: '— Ela… me escolheu… primeiro…' },
    { dur: 4.0, from: at(13, 1.7, 76.9), to: at(13, 1.5, 77.6), look: at(MANIF_CENTER.x, 2.4, MANIF_CENTER.z),
      caption: 'Do corpo dele se ergue uma forma de cinza de três metros, um núcleo em brasa no peito. A PRIMEIRA CINZA.',
      onStart: () => { if (b.rig) b.rig.root.visible = false; } },
  ];
  g.playCutscene(new Cutscene(g, { id: 'c8_transform', shots, onEnd: () => {
    if (b.rig) b.rig.root.visible = false;
    if (b.vialLight) b.vialLight.visible = false;
    const pl = g.player; pl.hp = Math.max(pl.hp, Math.round(pl.maxHp * 0.6));
    spawnManif(S);
    L.liftLocked = true;
    g.saveGame('c8_arena');
    startManif(S);
  } }));
}
export function startManif(S) {
  const g = S.game, b = g.boss;
  if (!b || b.state !== 'dormant') return;
  S.bossActive = true;
  b.activate();
  g.hud.showBoss(true, MANIF_NAME);
  g.audio.setIntensity(2);
  g.hud.toast('Progresso salvo. A cinza toma forma diante da lâmpada.', 3);
  S.hint('c8_manif', 'As <b>bobinas</b> alimentam a Manifestação: enquanto houver arco, ela se refaz. <b>Corte os disjuntores</b> nas paredes (segure) — cada corte a <b>atordoa</b> e abre o <b>núcleo</b> no peito. O <b>vapor</b> ainda a atordoa.', 12);
}
function cinzaDead(S) {
  const g = S.game, L = S.level, q = S.q;
  q.set('c8_cinzaDead');
  S.bossActive = false; S.tw.hold = null;
  g.hud.showBoss(false);
  g.audio.setIntensity(0);
  for (const id in L.tower.coils) setCoil(L, id, false);
  L.liftLocked = false;
  g.saveGame('c8_free');
  g.hud.toast('A forma desaba numa chuva de cinza fria. Progresso salvo. A brasa da lâmpada continua acesa.', 5);
  S.hint('c8_ines', 'Solte <b>Inês</b> da cadeira.', 6);
}

// ---------- Inês, Helena e a verdade ----------
function releaseInes(S) {
  const g = S.game, L = S.level, q = S.q, n = L.ines;
  const at = (x, y, z) => ({ x, y: AY + y, z });
  const shots = [
    { dur: 3.2, from: at(11.6, 1.5, 83.6), look: at(INES_CHAIR.x, 1.1, INES_CHAIR.z), caption: 'As correias cedem. O capacete de fios sobe, preso ao teto por um cabo.',
      onStart: () => { freeInes(L); g.audio.play('clang', at(INES_CHAIR.x, 1.5, INES_CHAIR.z)); } },
    { dur: 4.4, from: at(11.4, 1.45, 83.3), look: at(INES_USE.x - 0.6, 1.45, INES_USE.z - 0.2), speaker: 'INÊS',
      caption: '— Elias? … Eu ouvi você o tempo todo. Pelo fio. Eles me faziam cantar o seu número.',
      onStart: () => { placeNpc(n, INES_USE.x - 0.6, AY, INES_USE.z - 0.2, Math.PI * 0.9); n.mode = 'stand'; } },
    { dur: 3.8, from: at(11.2, 1.5, 82.9), look: at(INES_USE.x - 0.6, 1.4, INES_USE.z - 0.2), speaker: 'INÊS',
      caption: '— A Helena… ela está viva? Ela prometeu que você viria.' },
  ];
  g.playCutscene(new Cutscene(g, { id: 'c8_ines', shots, onEnd: () => {
    freeInes(L);
    if (n.mode !== 'stand') { placeNpc(n, INES_USE.x - 0.6, AY, INES_USE.z - 0.2, Math.PI * 0.9); n.mode = 'stand'; }
    q.set('c8_inesFree');
    S.tw.trip = 'wait';
  } }));
}
function updateTrip(S, dt) {
  const T = S.tw, g = S.game, L = S.level;
  if (!T.trip) return;
  if (T.trip === 'wait') {
    if (inCabin(g.player.pos, L.lift.y, 1.2) || L.lift.moving) return;
    L.liftLocked = true;
    if (L.lift.stop === 'maq') { onArrive(S, 'maq'); return; }
    T.trip = 'down'; L.lift.go('maq');
    g.hud.toast('O guincho ronca sozinho: alguém chamou a cabine lá de baixo.', 4);
    return;
  }
  if (T.trip === 'board') {
    T.tripT -= dt;
    if (T.tripT <= 0) { T.trip = 'up'; L.lift.go('topo'); }
  }
}
function truthScene(S) {
  const g = S.game, L = S.level, q = S.q, h = L.helena;
  const at = (x, y, z) => ({ x, y: AY + y, z });
  const hp = at(h.pos.x, 1.6, h.pos.z);
  const shots = [
    { dur: 3.4, from: at(h.pos.x - 1.6, 1.6, h.pos.z - 1.8), look: hp, speaker: 'HELENA', caption: '— Acabou? … Não. A brasa ainda está ali.' },
    { dur: 5.0, from: at(h.pos.x - 1.2, 1.55, h.pos.z - 1.4), look: hp, speaker: 'HELENA',
      caption: '— Você precisa saber antes de escolher. O protocolo RN… fui eu que o escrevi, com Vernet. Fui eu que escolhi você, Elias. O número zero.' },
    { dur: 4.2, from: at(h.pos.x - 1.4, 1.5, h.pos.z - 1.2), look: hp, speaker: 'HELENA',
      caption: '— O seu corpo segura a cinza sem queimar. É por isso que você voltou de todas as mortes deste lugar.' },
    { dur: 3.6, from: at(11.4, 1.5, 82.6), look: at(INES_USE.x - 0.6, 1.4, INES_USE.z - 0.2), speaker: 'INÊS', caption: '— Você mentiu pra ele. Pra mim.' },
    { dur: 6.0, from: at(13, 1.7, 82.4), look: at(BULB.x, 1.45, BULB.z), speaker: 'HELENA',
      caption: '— Menti. Agora escolha. Quebre a lâmpada e a cinza vira vento, fraca, sem dono, sobre Véspera. Segure-a e ela fica em você para sempre. Ou me deixe levá-la, na maleta de chumbo, para onde ninguém escute.' },
    { dur: 2.8, from: at(13, 1.9, 83.2), look: at(BULB.x, 1.45, BULB.z), caption: 'Três caminhos. A brasa pulsa, esperando.' },
  ];
  g.playCutscene(new Cutscene(g, { id: 'c8_truth', shots, onEnd: () => {
    q.set('c8_choice');
    g.saveGame('c8_free');
    S.hint('c8_choice', 'A decisão é sua (sem pressa): <b>segurar a chama</b> (na lâmpada, segure — custa vida), <b>entregá-la a Helena</b> (fale com ela) ou <b>quebrar a lâmpada</b> (golpe ou tiro).', 14);
  } }));
}

// ---------- finais ----------
export function chooseEnding(S, id) {
  const g = S.game, L = S.level, q = S.q;
  if (q.has('c8_ending')) return false;
  q.set('c8_ending', id);
  S.tw.hold = null;
  const B = L.tower.bulb, h = L.helena, at = (x, y, z) => ({ x, y: AY + y, z });
  const bulbCam = at(BULB.x - 1.6, 1.8, BULB.z - 2.2), bulbLook = at(BULB.x, 1.45, BULB.z);
  const hLook = at(h.pos.x, 1.6, h.pos.z), iLook = at(L.ines.pos.x, 1.4, L.ines.pos.z);
  let shots;
  if (id === 'guardiao') shots = [
    { dur: 3.6, from: bulbCam, look: bulbLook, caption: 'A brasa atravessa o vidro como se o vidro não existisse — e sobe pelo seu braço.',
      onStart: () => { B.flame.visible = false; B.gone = true; g.audio.play('roar', bulbLook, { pitch: 0.5 }); } },
    { dur: 3.6, from: at(BULB.x + 1.2, 1.5, BULB.z - 2.4), look: at(g.player.pos.x, 1.3, g.player.pos.z), caption: 'Ela assenta no seu peito, morna, onde devia estar o coração. As bobinas morrem de vez.' },
    { dur: 4.0, from: at(h.pos.x - 1.4, 1.6, h.pos.z - 1.6), look: hLook, speaker: 'HELENA', caption: '— Então é você o guardião agora. Ninguém mais vai cantar para ela.' },
    { dur: 3.4, from: at(L.ines.pos.x + 1.2, 1.5, L.ines.pos.z - 1.4), look: iLook, speaker: 'INÊS', caption: '— Vamos pra casa, Elias.' },
  ];
  else if (id === 'herdeira') shots = [
    { dur: 3.8, from: bulbCam, look: bulbLook, caption: 'Você desenrosca a lâmpada. Helena abre a maleta de chumbo.',
      onStart: () => { B.flame.visible = false; B.bulb.visible = false; B.gone = true; h.hold = true; if (h.rig.case) h.rig.case.visible = true; } },
    { dur: 4.2, from: at(h.pos.x - 1.4, 1.6, h.pos.z - 1.6), look: hLook, speaker: 'HELENA', caption: '— Obrigada. Ninguém mais vai ouvir a Primeira Cinza. Eu prometo.',
      onStart: () => g.audio.play('clang', hLook) },
    { dur: 3.8, from: at(h.pos.x - 0.9, 1.4, h.pos.z - 1.0), look: at(h.pos.x, 1.0, h.pos.z), caption: 'Ela fecha a tampa. Por um segundo você jura que ela sorri para a maleta — não para você.' },
    { dur: 3.6, from: at(L.ines.pos.x + 1.2, 1.5, L.ines.pos.z - 1.4), look: iLook, speaker: 'INÊS', caption: '— Ela vai voltar a escrever, Elias. Eu conheço essa cara.' },
  ];
  else shots = [
    { dur: 3.6, from: bulbCam, look: bulbLook, caption: 'O vidro estoura. A brasa fica no ar por um instante — e se desfaz em cinza fina.',
      onStart: () => breakBulb(L) },
    { dur: 3.8, from: at(13, 2.4, 79), look: at(13, 4.5, 88), caption: 'A cinza sai pelos janelões, sobre os telhados de Véspera. Fraca. Sem dono.' },
    { dur: 4.0, from: at(L.ines.pos.x + 1.2, 1.5, L.ines.pos.z - 1.4), look: iLook, caption: 'Inês abre a boca para chamar o seu nome. Não sai som. A voz foi junto com a chama.' },
    { dur: 4.0, from: at(h.pos.x - 1.4, 1.6, h.pos.z - 1.6), look: hLook, speaker: 'HELENA', caption: '— É o preço. A porta precisava da voz dela… agora não existe mais porta.' },
  ];
  g.audio.setIntensity(0);
  g.playCutscene(new Cutscene(g, { id: 'c8_end_' + id, shots, onEnd: () => finishChapter(S) }));
  return true;
}
export function finishChapter(S) {
  const g = S.game, q = S.q;
  if (q.has('c8_chapterDone')) return;
  q.set('c8_chapterDone'); q.set('ch8Done');
  g.saveGame('c8_end');
  g.endChapter();
}

// ---------- quadro a quadro ----------
export function updateTowerFlow(S, dt) {
  const g = S.game, L = S.level, q = S.q, pl = g.player, p = pl.pos, T = S.tw;
  if (!T) return;
  T.cabPos.y = T.cabPos2.y = L.lift.y;
  const docs = g.inventory.documents;
  if (!q.has('c8_readDiario') && docs.includes('diario_helena')) q.set('c8_readDiario');
  if (!q.has('c8_readRelatorio') && docs.includes('relatorio_transmissao')) q.set('c8_readRelatorio');
  if (q.has('c8_hasCrank') && !g.inventory.has('manete_monta_cargas')) g.inventory.add('manete_monta_cargas');
  updateHold(S, dt);
  updateSteam(S, dt);
  updateTrip(S, dt);
  // casa de máquinas
  if (!q.has('c8_inMachine') && p.y > MY - 0.3 && p.y < AY - 1 && p.x > TB.minX && p.x < TB.maxX && p.z > TB.minZ && p.z < TB.maxZ && pl.state !== 'climb') {
    q.set('c8_inMachine');
    g.saveGame('c8_machine');
    g.hud.toast('Casa de máquinas do monta-cargas · progresso salvo. O tambor do guincho, baterias — e alguém respirando atrás dos caixotes.', 5.5);
  }
  // Sala dos Transmissores: Vernet espera
  const b = g.boss;
  if (q.has('c8_atTop') && !q.has('c8_vernetDown') && !S.bossActive && b?.id === 'vernet' && b.state === 'dormant'
    && p.y > AY - 0.3 && p.z > ARENA_EXIT_Z && p.x > ARENA.minX && p.x < ARENA.maxX && !inCabin(p, L.lift.y, 0.6)) {
    if (q.has('c8_vernetIntro')) startVernet(S); else vernetIntro(S);
    return;
  }
  if (b?.id === 'vernet' && b.state === 'dead' && !q.has('c8_vernetDown')) { vernetDown(S); return; }
  if (T.manifT > 0) { T.manifT -= dt; if (T.manifT <= 0) startManif(S); }
  if (b && b.id !== 'vernet' && b.state === 'dead' && q.has('c8_vernetDown') && !q.has('c8_cinzaDead')) { cinzaDead(S); return; }
  if (S.bossActive && !pl.alive) T.hold = null;
  void CAB;
}
