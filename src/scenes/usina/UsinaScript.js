// Roteiro do Capítulo 8 — A Última Chama (primeira fatia): pátio do carvão (guarita: livro + boletim; acólito de ronda
// e um carvoeiro) → portão de carga trancado por dentro → ESCALADA da torre de carvão (escada de marinheiro: degraus
// rangem; um golpe derruba) → esteira coberta → galeria leste da Casa das Caldeiras (save) → três caldeiras no vermelho
// com as válvulas de alívio sem volante → corredor de tubos (jatos de vapor periódicos que queimam; o registro de
// alimentação os fecha) → oficina (volante + bilhete de Helena) → ALIVIAR as caldeiras: girar o volante leva tempo
// (interrompido se Elias se afasta ou apanha), faz barulho e, segundos depois, a nuvem de vapor desce sobre o corredor —
// queima quem estiver embaixo (os foguistas de capuz aguentam, os outros não: sabotagem como arma). A III só se alivia
// pela passarela, por cima. Pressão da linha a zero → a porta-pistão da Sala da Turbina destrava. O ronco das máquinas
// abafa os passos; conforme elas param, a usina fica silenciosa (acústica dinâmica). Sala da Turbina (save; foguista e
// acólito) → quadro de transmissão: a chave geral desarmada corta a corrente da torre e solta a fechadura elétrica →
// base da torre → casa de máquinas, monta-cargas, Vernet/Manifestação, Inês, Helena e a decisão final (UsinaTowerScript.js).
import * as THREE from 'three';
import { HospitalScript } from '../hospital/HospitalScript.js';
import { Enemy } from '../../ai/EnemyController.js';
import { ammoMesh } from '../hospital/HospitalPedsScript.js';
import { GROUND, GALLERY_Y, YARD, HUT, BOILER_HOUSE, BOILERS, LADDER_C8, PIPES, LEAKS, LEAK, leakAt, FEED_VALVE, OFICINA, WORKBENCH,
  TURBINE_HALL, BOARD, TOWER_BASE, SLICE_END_Z, CARGO_GATE, inPlume } from './UsinaLevel.js';
import { roomAt } from '../../data/map.js';
import { setupTower, updateTowerFlow } from './UsinaTowerScript.js';
import { MACH_Y } from './UsinaTower.js';
import { DOCUMENTS } from '../../data/documents.js';

const Y = GROUND, G = GALLERY_Y;
export const USINA_SPAWNS = [
  // pátio: um acólito de ronda e um carvoeiro parado junto ao monte de carvão
  { id: 'c8_aco1', type: 'acolito', x: 7, y: Y, z: 13, yaw: Math.PI / 2,
    patrol: [{ x: 7, y: Y, z: 13 }, { x: 18, y: Y, z: 13.5 }, { x: 18.4, y: Y, z: 7 }, { x: 7, y: Y, z: 9.2 }] },
  { id: 'c8_carv1', type: 'carvoeiro', x: 7.2, y: Y, z: 6, yaw: Math.PI / 2 },
  // Casa das Caldeiras: foguista no chão (entre as caldeiras) e um acólito de ronda na galeria
  { id: 'c8_fog1', type: 'foguista', x: 17.5, y: Y, z: 33, yaw: -Math.PI / 2,
    patrol: [{ x: 17.5, y: Y, z: 33 }, { x: 1.5, y: Y, z: 33 }, { x: 1.5, y: Y, z: 41 }, { x: 17.5, y: Y, z: 41 }] },
  { id: 'c8_aco2', type: 'acolito', x: 22.5, y: G, z: 26, yaw: 0,
    patrol: [{ x: 22.5, y: G, z: 26 }, { x: 27.5, y: G, z: 42 }] },
  // Sala da Turbina
  { id: 'c8_fog2', type: 'foguista', x: 4, y: Y, z: 55, yaw: Math.PI / 2,
    patrol: [{ x: 4, y: Y, z: 55 }, { x: 25, y: Y, z: 55 }, { x: 25, y: Y, z: 65 }, { x: 4, y: Y, z: 65 }] },
  { id: 'c8_aco3', type: 'acolito', x: 27, y: Y, z: 60, yaw: -Math.PI / 2 },
  // casa de máquinas do monta-cargas: acólito de ronda entre o guincho e o alçapão (acorda com a faca de força)
  { id: 'c8_aco4', type: 'acolito', x: 10.5, y: MACH_Y, z: 71.3, yaw: Math.PI / 2,
    patrol: [{ x: 10.5, y: MACH_Y, z: 71.3 }, { x: 15.8, y: MACH_Y, z: 71.3 }] },
];
const C8_DOORS = ['c8_hut', 'c8_cargo', 'c8_pipes', 'c8_steamDoor', 'c8_towerDoor'];
export const C8_VENT_TIME = 2.2;        // girar o volante da válvula de alívio
export const C8_VENT_RANGE = 1.2;       // afastou-se mais que isso: soltou o volante
export const C8_VENT_NOISE = 14;        // o jato de alívio (raio base; a acústica da área multiplica)
export const C8_PLUME_DELAY = 1.2;      // o vapor leva um instante para descer pelo bocal
export const C8_PLUME_TIME = 6;
export const C8_PLUME_DMG = { player: 5, every: 0.25, enemy: 20, poise: 18, enemyEvery: 0.4 };
export const C8_LEAK_DMG = { player: 6, every: 0.3, enemy: 6, enemyEvery: 0.4 };
export const C8_SABOTAGE_NOISE = 9;

export class UsinaScript extends HospitalScript {
  constructor(game, level) {
    super(game, level);
    this.vent = null;          // { id, t, from: {x,z}, hp }
    this.plumes = {};          // id → tempo restante da nuvem (s), atraso incluso
    this._leakT = 0; this._plumeT = 0; this._enemyT = {};
    this._ended = false;
  }

  setup(save) {
    const g = this.game, L = this.level, M = g.materials;
    for (const s of USINA_SPAWNS) {
      const e = new Enemy(g, s.type, s);
      g.enemies.push(e);
      if (save.deadEnemies.includes(s.id)) { e.pos.set(s.x, s.y, s.z); e.setDeadInstant(); }
    }

    // ---------- pátio e guarita ----------
    g.interact.add({ id: 'c8_serviceStair', pos: { x: 3.2, y: 1, z: 2.2 }, radius: 1.0, prompt: 'Descer a escada de serviço',
      onInteract: () => { g.audio.play('locked', { x: 3.2, y: 1, z: 1.6 }); g.hud.toast('Não. Inês está aqui em cima, em algum lugar — e a Irmandade não vai esperar a meia-noite.', 3.5); } });
    this._saveBook('c8_hut_book', { x: 1.5, y: 1.2, z: 10.2 }, 1.5, 0.89, 11.0, 'c8_yard');
    this._doc('boletim_usina', { x: 2.6, y: 1.2, z: 10.2 }, 2.4, 0.86, 11.3);
    this._pickup('c8_band_hut', { x: 1.5, y: 1.0, z: 9.2 }, 'Pegar bandagem', () => this._giveItem('bandagem'), () => this._bandMesh(1.45, 1.62, 8.45));
    g.interact.add({ id: 'c8_ladder', pos: { x: LADDER_C8.x, y: 1, z: 11.0 }, radius: 1.2, prompt: 'Subir a escada da torre de carvão',
      enabled: () => g.player.state === 'free', onInteract: () => this._climb() });
    g.interact.add({ id: 'c8_ladder_top', pos: { x: LADDER_C8.x, y: G + 1, z: 12.6 }, radius: 1.0, prompt: 'Descer a escada da torre',
      enabled: () => g.player.state === 'free', onInteract: () => this._climb() });

    // ---------- Casa das Caldeiras: válvulas ----------
    for (const B of BOILERS) {
      g.interact.add({ id: 'c8_valve_' + B.id, pos: { x: B.valve.x, y: B.valve.y + 1, z: B.valve.z }, radius: B.top ? 1.0 : 1.1,
        enabled: () => !this.q.has('c8_vent_' + B.id) && !this.vent,
        prompt: () => (g.inventory.has('volante_valvula') ? `Encaixar o volante e aliviar a caldeira ${B.id}` : `Válvula de alívio da caldeira ${B.id}`),
        onInteract: () => this._startVent(B.id) });
      if (B.broken) g.interact.add({ id: 'c8_valveBroken_' + B.id, pos: { x: B.broken.x, y: 1, z: B.broken.z }, radius: 0.8,
        enabled: () => !this.q.has('c8_vent_' + B.id),
        prompt: `Válvula de alívio da caldeira ${B.id}`,
        onInteract: () => { this.q.set('c8_sawBroken'); g.audio.play('locked', { x: B.broken.x, y: 1, z: B.broken.z });
          g.hud.toast('A haste desta válvula está partida — o volante giraria em falso. A válvula da caldeira III também se alcança por cima: pela passarela da galeria.', 5); } });
    }
    this._plaque('placa_caldeiras', BOILER_HOUSE.maxX - 0.12, 1.7, 30, -Math.PI / 2, { x: BOILER_HOUSE.maxX - 0.9, z: 30 });

    // ---------- corredor de tubos e oficina ----------
    g.interact.add({ id: 'c8_feed', pos: { x: FEED_VALVE.x, y: 1, z: FEED_VALVE.z + 0.5 }, radius: 0.9,
      enabled: () => !this.q.has('c8_leaksOff'),
      prompt: () => (g.inventory.has('volante_valvula') ? 'Fechar o registro de alimentação com o volante' : 'Registro de alimentação dos tubos'),
      onInteract: () => this._closeFeed() });
    this._pickup('c8_wheel', { x: -20.1, y: 1.0, z: 36.0 }, 'Pegar o volante de válvula', () => {
      g.inventory.add('volante_valvula'); this.q.set('c8_hasWheel');
      g.hud.toast('Volante de válvula — de ferro, com o eixo quadrado. Serve nas válvulas de alívio das caldeiras.', 4);
      this.hint('c8_wheel', 'Com o <b>volante</b>: encaixe nas <b>válvulas de alívio</b> e segure a posição até a caldeira aliviar. O jato <b>faz barulho</b> e o vapor desce sobre o corredor entre as caldeiras — <b>queima</b> quem estiver embaixo.', 10);
    }, () => this._wheelMesh(-20.1, Y + 0.93, 37.15));
    this._doc('bilhete_helena', { x: -19.0, y: 1.2, z: 36.0 }, -19.1, Y + 0.91, 37.2);
    this._pickup('c8_ammo_oficina', { x: -21.0, y: 1.0, z: 35.9 }, 'Pegar munição .38', () => {
      g.inventory.add('municao_38', 6); g.hud.toast(`Munição .38 ×6 (total ${g.inventory.count('municao_38')})`, 2.5);
    }, () => ammoMesh(M, -21.2, Y + 0.95, 37.1, 6));
    this._pickup('c8_band_oficina', { x: -15.6, y: 1.0, z: 30.4 }, 'Pegar bandagem', () => this._giveItem('bandagem'), () => this._bandMesh(-15.3, Y + 0.85, 29.0));
    this._saveBook('c8_oficina_book', { x: -16.6, y: 1.2, z: 30.4 }, -16.6, Y + 0.85, 29.0, 'c8_oficina');

    // ---------- Sala da Turbina ----------
    g.interact.add({ id: 'c8_board', pos: { x: BOARD.use.x, y: 1, z: BOARD.use.z }, radius: 1.2,
      enabled: () => !this.q.has('c8_sabotage'),
      prompt: 'Desarmar a chave geral da transmissão', onInteract: () => this._sabotage() });
    this._doc('ordem_vernet', { x: 4.2, y: 1.2, z: 63.6 }, 4.4, Y + 0.86, 64.9);
    this._saveBook('c8_turbine_book', { x: 2.9, y: 1.2, z: 63.6 }, 2.9, Y + 0.89, 64.9, 'c8_turbine');
    this._pickup('c8_ammo_turbine', { x: 26.6, y: 1.0, z: 66.6 }, 'Pegar munição .38', () => {
      g.inventory.add('municao_38', 4); g.hud.toast(`Munição .38 ×4 (total ${g.inventory.count('municao_38')})`, 2.5);
    }, () => ammoMesh(M, 26.6, Y + 0.05, 67.2, 4));
    // ---------- base da torre ----------
    setupTower(this, save);

    // ---------- portas ----------
    for (const id of C8_DOORS) {
      const d = L.doors[id];
      g.interact.add({
        id: 'door_' + id, radius: id === 'c8_cargo' || id === 'c8_steamDoor' ? 2.0 : 1.6,
        pos: { x: d.x, y: d.y + 1, z: d.z },
        prompt: () => (id === 'c8_cargo' && d.locked ? (g.player.pos.z > CARGO_GATE.z ? 'Erguer a tranca do portão de carga' : 'Abrir o portão de carga')
          : d.locked ? 'Abrir ' + d.label : d.open ? 'Fechar ' + d.label : 'Abrir ' + d.label),
        onInteract: () => this._useDoor(d),
      });
    }
    this._applyState(save);
  }

  intro() {
    if (this.q.has('c8_climbed')) return;
    this.game.hud.toast('Capítulo 8 — A Última Chama · Usina de Véspera', 4);
    this.hint('c8_intro', 'A escada de serviço saiu no <b>pátio de carvão da Usina</b>. A chaminé ainda cospe cinza. Inês foi levada para a <b>torre de transmissão</b> — entre na <b>Casa das Caldeiras</b>.', 10);
  }

  _saveBook(id, pos, x, y, z, checkpoint) {
    const sc = this.game.scene, before = new Set(sc.children);
    super._saveBook(id, pos, x, y, z, checkpoint);
    for (const o of sc.children) if (!before.has(o) && o.isPointLight) this.level.lights.all.push({ light: o, fixture: null, base: o.intensity });
  }
  _plaque(id, x, y, z, rotY, ipos) {
    const g = this.game;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.03), g.materials.paper); m.position.set(x, y, z); m.rotation.y = rotY; this.level.b.group.add(m);
    g.interact.add({ id: 'doc_' + id, pos: { x: ipos.x, y: y - 0.5, z: ipos.z }, radius: 1.1, prompt: 'Ler: ' + DOCUMENTS[id].title,
      onInteract: () => { g.inventory.addDocument(id); g.openDocument(id); } });
  }
  _wheelMesh(x, y, z) {
    const M = this.game.materials, gr = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 14), M.rust); rim.rotation.x = Math.PI / 2; gr.add(rim);
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.025, 0.025), M.rust); gr.add(sp);
    const sp2 = sp.clone(); sp2.rotation.y = Math.PI / 2; gr.add(sp2);
    gr.position.set(x, y, z); return gr;
  }
  _enemy(id) { return this.game.enemies.find((e) => e.id === id); }

  // ---------- escalada ----------
  _climb() {
    const g = this.game, pl = g.player;
    if (!pl.startClimb(LADDER_C8)) return;
    this.q.set('c8_onLadder');
    this.hint('c8_climb', 'Na escada: <b>W/S</b> sobe e desce · <b>Shift</b> apressa (gasta fôlego e os degraus <b>rangem alto</b>) · <b>Espaço</b> solta. Um golpe derruba você.', 8);
  }

  // ---------- válvulas de alívio ----------
  _startVent(id) {
    const g = this.game, B = BOILERS.find((b) => b.id === id), q = this.q;
    if (q.has('c8_vent_' + id) || this.vent) return;
    q.set('c8_sawValve');
    if (!g.inventory.has('volante_valvula')) {
      g.audio.play('locked', B.valve);
      g.hud.toast(`Caldeira ${id}: o manômetro está no vermelho. A válvula de alívio está ali — mas sem volante; arrancaram todos. Só o eixo quadrado, liso de graxa.`, 5);
      this.hint('c8_noWheel', 'Alguém tirou os <b>volantes</b> das válvulas. Procure um — talvez na <b>oficina</b>, a oeste (porta do <b>corredor de tubos</b>).', 8);
      return;
    }
    const p = g.player.pos;
    this.vent = { id, t: 0, from: { x: p.x, z: p.z }, hp: g.player.hp };
    this.level.showWheel(id, true);
    g.audio.play('switch', B.valve);
    g.hud.toast(`Girando o volante da caldeira ${id}… segure a posição.`, C8_VENT_TIME + 0.5);
  }
  _cancelVent(why) {
    const v = this.vent; if (!v) return;
    this.vent = null;
    this.level.showWheel(v.id, false);
    this.q.set('c8_ventCancelled', (this.q.flags.c8_ventCancelled || 0) + 1);
    this.game.hud.toast(why === 'hit' ? 'O golpe arranca o volante das suas mãos — a válvula voltou a fechar.' : 'Você soltou o volante; a válvula voltou a fechar.', 3);
  }
  _updateVent(dt) {
    const v = this.vent; if (!v) return;
    const g = this.game, pl = g.player, p = pl.pos;
    if (pl.hp < v.hp - 0.01 || pl.state === 'hit' || !pl.alive) return this._cancelVent('hit');
    if (Math.hypot(p.x - v.from.x, p.z - v.from.z) > C8_VENT_RANGE) return this._cancelVent('moved');
    v.t += dt;
    this.level.spinWheel(v.id, dt);
    if (v.t < C8_VENT_TIME) return;
    this.vent = null;
    this._vent(v.id);
  }
  /** a caldeira alivia: barulho real, nuvem de vapor (dano real) e a pressão da linha cai */
  _vent(id, instant = false) {
    const g = this.game, q = this.q, L = this.level, B = BOILERS.find((b) => b.id === id);
    if (q.has('c8_vent_' + id)) return;
    q.set('c8_vent_' + id);
    L.setVented(id, instant);
    L.showWheel(id, true);
    if (instant) return;
    this.plumes[id] = C8_PLUME_DELAY + C8_PLUME_TIME;
    g.audio.play('steam', B.plume, { dur: 2.6 });
    g.cameraCtl?.addShake?.(0.25);
    // o silvo é ouvido no chão e na galeria (a percepção só escuta dentro de ±2,5 m de altura)
    g.perception.noise({ x: B.plume.x, y: Y, z: B.plume.z }, C8_VENT_NOISE, 'steam');
    g.perception.noise({ x: B.valve.x, y: G, z: B.valve.z }, C8_VENT_NOISE * 0.6, 'steam');
    const n = BOILERS.filter((b) => q.has('c8_vent_' + b.id)).length;
    if (n === 3) {
      q.set('c8_ventedAll');
      g.hud.toast('A terceira caldeira cospe o resto do vapor. O manômetro da linha despenca a zero — lá no fundo, os pistões da porta da turbina soltam um suspiro.', 6);
    } else g.hud.toast(`Caldeira ${id} aliviada — o jato desce pelo bocal sobre o corredor. Pressão da linha: ${3 - n}/3.`, 4.5);
    if (n === 1) this.hint('c8_steam', 'O <b>vapor do alívio</b> desce sobre o corredor entre as caldeiras: <b>queima</b> — quem estiver embaixo também. Os foguistas, de capuz, aguentam.', 8);
  }

  // ---------- registro de alimentação dos tubos ----------
  _closeFeed() {
    const g = this.game, q = this.q, pos = { x: FEED_VALVE.x, y: 1, z: FEED_VALVE.z };
    q.set('c8_sawLeaks');
    if (!g.inventory.has('volante_valvula')) {
      g.audio.play('locked', pos);
      g.hud.toast('O registro que alimenta os tubos. Sem volante — só o eixo quadrado.', 3.5);
      return;
    }
    q.set('c8_leaksOff');
    this.level.setLeaksOff(true);
    g.audio.play('switch', pos); g.audio.play('steam', pos, { dur: 0.8 });
    g.perception.noise({ x: FEED_VALVE.x, y: Y, z: FEED_VALVE.z }, 4, 'metal');
    g.hud.toast('O volante range e o chiado dos tubos morre, um jato depois do outro. O corredor está livre.', 4);
  }

  // ---------- sabotagem: chave geral da transmissão ----------
  _sabotage() {
    const g = this.game, q = this.q, L = this.level, pos = { x: BOARD.x, y: 1.5, z: BOARD.z };
    if (q.has('c8_sabotage')) return;
    q.set('c8_sabotage');
    L.setSabotage(true);
    const td = L.doors.c8_towerDoor; td.locked = false;
    g.audio.play('clang', pos); g.audio.play('switch', pos);
    g.perception.noise({ x: BOARD.x, y: Y, z: BOARD.z }, C8_SABOTAGE_NOISE, 'metal');
    g.hud.toast('A chave geral desce com um estalo. O voltímetro despenca, as lâmpadas da sala morrem até um fio — e, no batente da porta da torre, a fechadura elétrica solta.', 6);
    this.hint('c8_tower', 'Sem corrente, a <b>transmissão</b> da Irmandade está muda — por enquanto. A porta da <b>torre</b> (norte) está livre.', 8);
  }

  // ---------- dano do vapor (jatos do corredor e nuvens dos alívios) ----------
  _updateSteam(dt) {
    const g = this.game, pl = g.player, p = pl.pos, L = this.level;
    // nuvens dos alívios
    let inSteam = false;
    for (const id in this.plumes) {
      this.plumes[id] -= dt;
      const left = this.plumes[id], B = BOILERS.find((b) => b.id === id);
      const active = left > 0 && left <= C8_PLUME_TIME;
      L.setPlume(id, active ? Math.min(1, left / 1.5, (C8_PLUME_TIME - left + 0.3) / 0.6) : 0);
      if (left <= 0) { delete this.plumes[id]; continue; }
      if (!active) continue;
      if (pl.alive && inPlume(B, p)) inSteam = true;
      for (const e of g.enemies) {
        if (!e.alive || e.def.heatproof || !inPlume(B, e.pos)) continue;
        this._enemyT[e.id] = (this._enemyT[e.id] || 0) - dt;
        if (this._enemyT[e.id] > 0) continue;
        this._enemyT[e.id] = C8_PLUME_DMG.enemyEvery;
        const r = e.takeHit({ dmg: C8_PLUME_DMG.enemy, poise: C8_PLUME_DMG.poise, heavy: false, from: { x: B.plume.x, y: Y, z: B.plume.z }, point: { x: e.pos.x, y: e.pos.y + 1.2, z: e.pos.z } });
        this.q.set('c8_steamHits', (this.q.flags.c8_steamHits || 0) + 1);
        if (r === 'dead') this.q.set('c8_steamKill');
      }
    }
    if (inSteam) {
      this._plumeT -= dt;
      if (this._plumeT <= 0) { this._plumeT = C8_PLUME_DMG.every; pl.envDamage(C8_PLUME_DMG.player); this.q.set('c8_burned'); }
    } else this._plumeT = 0;
    // jatos periódicos do corredor de tubos
    const li = leakAt(p);
    if (li >= 0 && !this.q.has('c8_sawLeaks')) {
      this.q.set('c8_sawLeaks');
      this.hint('c8_leaks', 'Os tubos <b>vazam vapor</b> em jatos, num ritmo. Espere o jato <b>parar</b> e passe. (O <b>registro de alimentação</b> no fim do corredor fecharia tudo — se houvesse um volante.)', 9);
    }
    if (li >= 0 && L.leakActive(li) && pl.alive) {
      this._leakT -= dt;
      if (this._leakT <= 0) { this._leakT = C8_LEAK_DMG.every; pl.envDamage(C8_LEAK_DMG.player); this.q.set('c8_burned'); }
    } else this._leakT = 0;
    if (!L.leaksOff) for (const e of g.enemies) {
      if (!e.alive || e.def.heatproof) continue;
      const i = leakAt(e.pos); if (i < 0 || !L.leakActive(i)) continue;
      const k = 'leak_' + e.id;
      this._enemyT[k] = (this._enemyT[k] || 0) - dt; if (this._enemyT[k] > 0) continue;
      this._enemyT[k] = C8_LEAK_DMG.enemyEvery;
      e.takeHit({ dmg: C8_LEAK_DMG.enemy, poise: 10, heavy: false, from: { x: LEAKS[i].x, y: Y, z: PIPES.maxZ }, point: { x: e.pos.x, y: e.pos.y + 1.2, z: e.pos.z } });
    }
  }

  // ---------- portas ----------
  _useDoor(d) {
    const g = this.game, q = this.q;
    if (d.id === 'c8_cargo' && d.locked) {
      if (g.player.pos.z > CARGO_GATE.z) {
        d.locked = false; d.setOpen(true); q.set('c8_gateUnbarred');
        if (this.level.gateBar) this.level.gateBar.visible = false;
        g.audio.play('clang', d); g.perception.noise(d, 7, 'door');
        g.hud.toast('A tranca de ferro sai do suporte e o portão de carga se abre para o pátio — atalho aberto.', 4);
        return;
      }
      q.set('c8_sawGate'); g.audio.play('locked', d); g.hud.toast(d.lockMsg, 4.5);
      this.hint('c8_up', 'Por baixo não dá. A <b>esteira de carvão</b> entra na Casa das Caldeiras pelo alto — e a <b>torre de carvão</b> tem uma escada.', 8);
      return;
    }
    if (d.id === 'c8_steamDoor' && d.locked) {
      if (q.has('c8_ventedAll')) {
        d.locked = false; d.setOpen(true); q.set('c8_steamDoorOpen');
        g.audio.play('steam', d, { dur: 1.2 }); g.audio.play('door', d); g.perception.noise(d, 7, 'door');
        g.hud.toast('Sem pressão na linha, a trava pneumática cede. A porta-pistão desliza, chiando, para a Sala da Turbina.', 4.5);
        return;
      }
      const n = BOILERS.filter((b) => !q.has('c8_vent_' + b.id)).length;
      q.set('c8_sawSteamDoor'); g.audio.play('locked', d);
      g.hud.toast(`A porta-pistão não se mexe: a trava pneumática é segurada pela pressão da linha — o manômetro ao lado marca ${n}/3 caldeiras no vermelho.`, 5);
      this.hint('c8_vent', 'Derrube a pressão: alivie as <b>três caldeiras</b> pelas <b>válvulas de alívio</b>.', 7);
      return;
    }
    if (d.id === 'c8_towerDoor' && d.locked) { q.set('note_' + d.id); g.audio.play('locked', d); g.hud.toast(d.lockMsg, 5); this.hint('c8_board', 'A fechadura é <b>elétrica</b>. O <b>quadro de transmissão</b> fica na parede leste da sala.', 7); return; }
    if (d.locked) { q.set('note_' + d.id); g.audio.play('locked', d); g.hud.toast(d.lockMsg, 4); return; }
    d.setOpen(!d.open);
    g.perception.noise(d, 5, 'door');
  }

  _applyState(save) {
    const g = this.game, L = this.level, f = save.flags, pl = g.player;
    for (const id in save.doors) L.doors[id]?.restore(save.doors[id]);
    for (const k in f) if (k.startsWith('picked_') && L.pickupMeshes[k.slice(7)]) L.pickupMeshes[k.slice(7)].visible = false;
    const cg = L.doors.c8_cargo, sd = L.doors.c8_steamDoor, td = L.doors.c8_towerDoor;
    if (f.c8_gateUnbarred) { cg.locked = false; if (L.gateBar) L.gateBar.visible = false; } else { cg.locked = true; cg.setOpen(false, true); }
    for (const B of BOILERS) if (f['c8_vent_' + B.id]) { L.setVented(B.id, true); L.showWheel(B.id, true); }
    if (f.c8_steamDoorOpen) { sd.locked = false; } else { sd.locked = true; sd.setOpen(false, true); }
    if (f.c8_leaksOff) L.setLeaksOff(true);
    if (f.c8_sabotage) { L.setSabotage(true, true); td.locked = false; } else { td.locked = true; td.setOpen(false, true); }
    L.turbineSpeed = L.pressurized() / 3;
    this._applyMaxHp();
    pl.maxSt = f.hasAmulet ? 125 : 100; pl.st = Math.min(pl.st, pl.maxSt);
    pl.healAmount = f.hasBracelet ? 65 : 45;
    pl.sharpened = !!f.sharpened;
  }

  update(dt) {
    const g = this.game, p = g.player.pos, q = this.q;
    if (!this.tut.shown.move) this.hint('move', '<b>WASD</b>: mover · <b>Mouse</b>: câmera · <b>Shift</b>: correr (faz barulho)', 6);
    { const r = roomAt(p); if (r && !q.has('seen_' + r.id)) q.set('seen_' + r.id); }
    const docs = g.inventory.documents;
    if (!q.has('c8_readBoletim') && docs.includes('boletim_usina')) q.set('c8_readBoletim');
    if (!q.has('c8_readHelena') && docs.includes('bilhete_helena')) q.set('c8_readHelena');
    if (!q.has('c8_readOrdem') && docs.includes('ordem_vernet')) q.set('c8_readOrdem');
    if (!q.has('c8_hasWheel') && g.inventory.has('volante_valvula')) q.set('c8_hasWheel');
    this._updateVent(dt);
    this._updateSteam(dt);
    updateTowerFlow(this, dt);
    if (!q.has('c8_climbed') && p.y > G - 0.4 && p.z < BOILER_HOUSE.minZ && g.player.state !== 'climb') {
      q.set('c8_climbed');
      g.hud.toast('Topo da torre de carvão. A esteira coberta segue para a Casa das Caldeiras — dá pra ouvir o ronco delas daqui.', 4);
    }
    if (!q.has('c8_inBoiler') && p.z > BOILER_HOUSE.minZ + 0.4 && p.x > 0 && p.x < BOILER_HOUSE.maxX) {
      q.set('c8_inBoiler');
      g.saveGame('c8_boiler');
      g.hud.toast('Casa das Caldeiras · progresso salvo. Três caldeiras roncam no escuro, as bocas em brasa. O barulho cobre os seus passos — por enquanto.', 6);
      this.hint('c8_noise', 'O <b>ronco das caldeiras</b> abafa os passos: aqui você é ouvido <b>de mais perto</b>. Cada caldeira desligada deixa a sala mais <b>silenciosa</b>.', 9);
    }
    if (!q.has('c8_inOficina') && p.x < OFICINA.maxX - 0.3 && p.z > OFICINA.minZ && p.z < OFICINA.maxZ) {
      q.set('c8_inOficina');
      g.hud.toast('Oficina de manutenção. Bancadas, tornos — e um painel de ferramentas com os ganchos dos volantes vazios. Quase todos.', 4.5);
    }
    if (!q.has('c8_inTurbine') && p.z > TURBINE_HALL.minZ + 0.6 && p.z < TURBINE_HALL.maxZ) {
      q.set('c8_inTurbine');
      g.saveGame('c8_turbine');
      g.hud.toast('Sala da Turbina · progresso salvo. O volante gigante ainda gira por inércia. Na parede leste, o quadro de transmissão zumbe — os cabos sobem pela parede até a torre.', 6);
    }
    if (!q.has('c8_sliceDone') && !this._ended && p.z > SLICE_END_Z && p.x > TOWER_BASE.minX && p.x < TOWER_BASE.maxX) {
      this._ended = true;
      q.set('c8_sliceDone');
      g.saveGame('c8_slice');
      g.hud.toast('Base da torre de transmissão · progresso salvo. O monta-cargas está lá no alto; os cabos tremem. Lá em cima, alguém está cantando.', 6);
      this.hint('c8_base', 'Chame o <b>monta-cargas</b> pela botoeira ao lado da porta pantográfica.', 7);
    }
  }
}
