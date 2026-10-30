// Roteiro do Capítulo 4 — Cidade Morta (primeira fatia): bueiro no beco → Rua do Comércio (cinzentos) →
// bonde tombado (edital do toque de recolher) → Farmácia Central (diário do Dr. Lauro, chave da relojoaria na
// gaveta do caixa) → Relojoaria Ponteiro (livro de registros, caderno do relojoeiro) → pátio dos fundos →
// arco da Praça do Relógio → o sino toca e o Vigia desce da Torre (primeiro confronto: ele recua quando o lampião
// trinca e deixa cair a chave da Torre) → porta da Torre (fim da fatia; a subida fica para a próxima).
// Reaproveita os helpers do roteiro do hospital.
import * as THREE from 'three';
import { HospitalScript } from '../hospital/HospitalScript.js';
import { Enemy } from '../../ai/EnemyController.js';
import { ammoMesh } from '../hospital/HospitalPedsScript.js';
import { VigiaBoss } from '../../ai/VigiaBoss.js';
import { GROUND, VIGIA_BALCONY } from './CidadeLevel.js';
import { roomAt } from '../../data/map.js';

const Y = GROUND;
export const CIDADE_SPAWNS = [
  // rua: um cinzento anda devagar entre o carro e a farmácia; outro, parado de frente para a vitrine do café
  { id: 'cin_rua1', type: 'cinzento', x: 6.2, y: Y, z: 14, yaw: 0, patrol: [{ x: 6.2, y: Y, z: 13 }, { x: 6.4, y: Y, z: 27 }] },
  { id: 'cin_rua2', type: 'cinzento', x: 5.6, y: Y, z: 38.5, yaw: -Math.PI / 2 },
  // farmácia: o ajudante do Dr. Lauro, encolhido atrás do balcão; a gaveta do caixa o acorda
  { id: 'cin_farm', type: 'cinzento', x: -2.4, y: Y, z: 22.6, yaw: Math.PI / 2, dormant: true },
  // pátio dos fundos: um acólito ficou para trás da escolta de Inês; um rastejador sob o lençol caído do varal
  { id: 'aco_patio', type: 'acolito', x: 12.2, y: Y, z: 44.5, yaw: 0, patrol: [{ x: 12.2, y: Y, z: 44 }, { x: 15.8, y: Y, z: 48.4 }] },
  { id: 'ras_patio', type: 'rastejador', x: 16.6, y: Y, z: 47.4, yaw: Math.PI, dormant: true },
  // praça: dois moradores sentados nos bancos — acordam com a lanterna do Vigia
  { id: 'cin_praca1', type: 'cinzento', x: 3, y: Y, z: 57.9, yaw: 0, dormant: true },
  { id: 'cin_praca2', type: 'cinzento', x: 26, y: Y, z: 70.4, yaw: Math.PI, dormant: true },
];
const C4_DOORS = ['c4_pharm', 'c4_watch', 'c4_back', 'c4_tower'];
// gatilho do Vigia: alguns passos depois do arco (o autosave da praça fica antes dele)
export const C4_BOSS_TRIGGER = { minX: 0.5, maxX: 29.5, minZ: 53.2, maxZ: 75.6 };

export class CidadeScript extends HospitalScript {
  constructor(game, level) {
    super(game, level);
    this.props = [];
    // não há porta de arena: o Vigia é que não sai da praça (o save durante a luta não destrava nada)
    this.arenaDoorId = 'c4_arena';
    this.boss = null;
    this.bellT = -1;
    this.beamSeen = 0;
  }

  setup(save) {
    const g = this.game, L = this.level, M = g.materials;
    for (const s of CIDADE_SPAWNS) {
      const e = new Enemy(g, s.type, s);
      g.enemies.push(e);
      if (save.deadEnemies.includes(s.id)) { e.pos.set(s.x, s.y, s.z); e.setDeadInstant(); }
    }
    // ---------- chefe: O Vigia, de pé na varanda da Torre ----------
    this.boss = new VigiaBoss(g, { ...VIGIA_BALCONY, yaw: Math.PI, balcony: VIGIA_BALCONY });
    g.boss = this.boss;
    if (save.flags.c4_vigiaRetreat) this.boss.setGoneInstant();

    // ---------- rua: o edital colado no bonde tombado ----------
    this._doc('edital_toque', { x: 7, y: 1.5, z: 45.2 }, 7, 1.5, 45.94, true);
    { const ch = L.b.group.children; ch[ch.length - 1].rotation.y = Math.PI / 2; }
    this._pickup('c4_band_rua', { x: 9.2, y: 1.05, z: 41.5 }, 'Pegar bandagem', () => this._giveItem('bandagem'), () => this._bandMesh(9.1, 1.05, 41.5));

    // ---------- Farmácia Central: diário, munição, bandagem e a chave na gaveta do caixa ----------
    this._doc('diario_farmaceutico', { x: -0.1, y: 1.07, z: 25.0 }, -0.8, 1.07, 25.2);
    this._pickup('c4_ammo_farm', { x: 3.0, y: 0.9, z: 19.0 }, 'Pegar munição .38', () => {
      g.inventory.add('municao_38', 5); g.hud.toast(`Munição .38 ×5 (total ${g.inventory.count('municao_38')})`, 2.5);
    }, () => ammoMesh(M, 3.0, 0.86, 19.0, 5));
    this._pickup('c4_band_farm', { x: -3.0, y: 1.0, z: 26.6 }, 'Pegar bandagem', () => this._giveItem('bandagem'), () => this._bandMesh(-3.2, 0.95, 26.6));
    this._pickup('c4_watchkey', { x: -0.2, y: 1.1, z: 21.5 }, 'Abrir a gaveta do caixa', () => {
      this._giveItem('chave_relojoaria'); this.q.set('c4_hasWatchKey');
      g.perception.noise({ x: -0.8, y: 1, z: 21.5 }, 9, 'metal');
      const w = g.enemies.find((e) => e.id === 'cin_farm');
      if (w && w.alive && w.dormant) { w.wake(); g.audio.play('groan', w.pos, { pitch: 0.9 }); }
      g.hud.toast('A gaveta do caixa salta com um "plim". Uma chave de latão com etiqueta: "PONTEIRO". Atrás do balcão, alguém coberto de cinza se levanta.', 5);
    }, () => this._keyMesh(-0.8, 1.08, 21.5));

    // ---------- Relojoaria Ponteiro: livro de registros e o caderno do relojoeiro ----------
    this._saveBook('c4_watch_book', { x: 17.3, y: 0.95, z: 33.0 }, 17.3, 0.99, 33.0, 'c4_watch');
    this._doc('caderno_relojoeiro', { x: 16.6, y: 0.97, z: 34.5 }, 17.3, 0.97, 34.5);
    this._pickup('c4_ammo_watch', { x: 11.9, y: 1.02, z: 37.4 }, 'Pegar munição .38', () => {
      g.inventory.add('municao_38', 4); g.hud.toast(`Munição .38 ×4 (total ${g.inventory.count('municao_38')})`, 2.5);
    }, () => ammoMesh(M, 11.9, 1.0, 37.4, 4));

    // ---------- praça: o molho de chaves que o Vigia deixa cair ao pé da Torre ----------
    this._pickup('c4_towerkey', { x: 15.6, y: 0.3, z: 74.0 }, 'Pegar o molho de chaves do Vigia', () => {
      this._giveItem('chave_torre'); this.q.set('c4_hasTowerKey');
      g.hud.toast('Um molho de chaves de ferro, ainda frio da luz do lampião. A maior tem um relógio gravado no anel.', 4.5);
    }, () => this._ringMesh(15.6, Y + 0.03, 74.0), () => this.q.has('c4_vigiaRetreat'));

    // ---------- portas ----------
    for (const id of C4_DOORS) {
      const d = L.doors[id];
      g.interact.add({
        id: 'door_' + id, radius: 1.7,
        pos: { x: d.x, y: d.y + 1, z: d.z },
        prompt: () => (id === 'c4_watch' && d.locked && g.inventory.has('chave_relojoaria') ? 'Abrir a relojoaria com a chave do Dr. Lauro'
          : id === 'c4_tower' && d.locked && g.inventory.has('chave_torre') ? 'Abrir a porta da Torre com a chave do Vigia'
            : d.locked ? 'Abrir ' + d.label : d.open ? 'Fechar ' + d.label : 'Abrir ' + d.label),
        onInteract: () => this._useDoor(d),
      });
    }

    this._applyState(save);
  }

  intro() {
    this.game.hud.toast('Capítulo 4 — Cidade Morta · centro antigo de Véspera', 4);
    this.hint('c4_intro', 'O bueiro sai num beco do centro antigo. Cinza cai sem vento e os relógios estão todos parados. Os <b>cinzentos</b> andam devagar e ouvem pouco — mas, quando veem Elias, <b>correm</b>.', 9);
  }

  _keyMesh(x, y, z) {
    const M = this.game.materials, gr = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.01, 5, 10), M.brass); ring.rotation.x = Math.PI / 2; gr.add(ring);
    const bit = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.02), M.brass); bit.position.x = 0.08; gr.add(bit);
    gr.position.set(x, y, z); return gr;
  }
  _ringMesh(x, y, z) {
    const M = this.game.materials, gr = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 5, 12), M.metal); ring.rotation.x = Math.PI / 2; gr.add(ring);
    for (let i = 0; i < 3; i++) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.2 - i * 0.03, 0.015, 0.025), M.rust); k.position.set(0.12, 0.01, -0.04 + i * 0.04); k.rotation.y = 0.3 - i * 0.3; gr.add(k); }
    gr.position.set(x, y, z); return gr;
  }

  // o brilho do livro entra no orçamento de luzes
  _saveBook(id, pos, x, y, z, checkpoint) {
    const sc = this.game.scene, before = new Set(sc.children);
    super._saveBook(id, pos, x, y, z, checkpoint);
    for (const o of sc.children) if (!before.has(o) && o.isPointLight) this.level.lights.all.push({ light: o, fixture: null, base: o.intensity });
  }

  _useDoor(d) {
    const g = this.game;
    if (d.locked && d.id === 'c4_watch') {
      if (!g.inventory.has('chave_relojoaria')) { this.q.set('note_' + d.id); this.q.set('c4_sawWatchLock'); g.audio.play('locked', d); g.hud.toast(d.lockMsg, 5); return; }
      g.inventory.remove('chave_relojoaria');
      d.locked = false; d.setOpen(true); this.q.set('c4_watchOpen');
      g.audio.play('door', d); g.perception.noise(d, 5, 'door');
      g.hud.toast('A chave gira com esforço. Lá dentro, dezenas de relógios — nenhum faz tique-taque.', 4.5);
      return;
    }
    if (d.locked && d.id === 'c4_tower') {
      if (!g.inventory.has('chave_torre')) { this.q.set('note_' + d.id); g.audio.play('locked', d); g.hud.toast(this.q.has('c4_vigiaRetreat') ? 'Trancada por dentro do mecanismo. A chave grande do molho do Vigia deve servir.' : d.lockMsg, 4.5); return; }
      d.locked = false; d.setOpen(true); this.q.set('c4_towerOpen');
      g.audio.play('door', d); g.audio.play('clang', d);
      g.hud.toast('A porta de ferro cede. Lá dentro, uma escada em caracol sobe para o escuro — e, lá em cima, o mecanismo do Relógio volta a ranger.', 5);
      return;
    }
    if (d.locked) { this.q.set('note_' + d.id); g.audio.play('locked', d); g.hud.toast(d.lockMsg, 4); return; }
    d.setOpen(!d.open);
    g.perception.noise(d, 5, 'door');
  }

  _applyState(save) {
    const g = this.game, L = this.level, f = save.flags, pl = g.player;
    for (const id in save.doors) L.doors[id]?.restore(save.doors[id]);
    for (const k in f) if (k.startsWith('picked_') && L.pickupMeshes[k.slice(7)]) L.pickupMeshes[k.slice(7)].visible = false;
    // portas com chave: o estado vem das flags, não da porta salva
    if (f.c4_watchOpen) { L.doors.c4_watch.locked = false; L.doors.c4_watch.setOpen(true, true); }
    else { L.doors.c4_watch.locked = true; L.doors.c4_watch.setOpen(false, true); }
    if (f.c4_towerOpen) { L.doors.c4_tower.locked = false; L.doors.c4_tower.setOpen(true, true); }
    else { L.doors.c4_tower.locked = true; L.doors.c4_tower.setOpen(false, true); }
    if (f.c4_hasWatchKey) { const w = g.enemies.find((e) => e.id === 'cin_farm'); if (w && w.alive) w.dormant = false; }
    this._applyMaxHp();
    pl.maxSt = f.hasAmulet ? 125 : 100; pl.st = Math.min(pl.st, pl.maxSt);
    pl.healAmount = f.hasBracelet ? 65 : 45;
    pl.sharpened = !!f.sharpened;
  }

  _startBoss() {
    const g = this.game;
    this.bossActive = true;
    this.bellT = 0; this.bellN = 0;
    this.level.ringBell?.(3.5);
    g.hud.showBoss(true, 'O VIGIA');
    g.audio.setIntensity(2);
    g.hud.toast('O sino da Torre toca. Na varanda, uma silhueta de chapéu ergue um lampião de luz fria.', 4);
  }

  update(dt) {
    const g = this.game, p = g.player.pos;
    if (!this.tut.shown.move) this.hint('move', '<b>WASD</b>: mover · <b>Mouse</b>: câmera · <b>Shift</b>: correr (faz barulho)', 6);
    { const r = roomAt(p); if (r && !this.q.has('seen_' + r.id)) this.q.set('seen_' + r.id); }
    const docs = g.inventory.documents;
    if (!this.q.has('c4_readEdital') && docs.includes('edital_toque')) this.q.set('c4_readEdital');
    if (!this.q.has('c4_readDiario') && docs.includes('diario_farmaceutico')) this.q.set('c4_readDiario');
    if (!this.q.has('c4_readCaderno') && docs.includes('caderno_relojoeiro')) this.q.set('c4_readCaderno');
    // saiu do beco
    if (!this.q.has('c4_inStreet') && p.z > 10.5) {
      this.q.set('c4_inStreet');
      this.hint('c4_street', 'Os <b>cinzentos</b> golpeiam com barras de ferro e agarram. Recue do golpe e responda quando a barra passar.', 7);
    }
    // a barricada do bonde tombado
    if (!this.q.has('c4_sawBarricade') && p.z > 41.5 && p.x > 4 && p.x < 10) {
      this.q.set('c4_sawBarricade');
      g.hud.toast('O bonde da Linha 2 tombou de lado e fecha a rua. A Praça do Relógio fica logo atrás — é preciso outro caminho.', 5);
    }
    // relojoaria: chegou lá dentro
    if (!this.q.has('c4_inWatch') && p.x > 10.4 && p.x < 18 && p.z > 30 && p.z < 40) this.q.set('c4_inWatch');
    // o rastejador do pátio acorda quando Elias passa perto do lençol
    if (!this.q.has('c4_rasWoke')) {
      const w = g.enemies.find((e) => e.id === 'ras_patio');
      if (w && w.alive && w.dormant && Math.hypot(p.x - w.pos.x, p.z - w.pos.z) < 3.2) {
        this.q.set('c4_rasWoke'); w.wake(); g.audio.play('groan', w.pos, { pitch: 0.7 });
        g.hud.toast('O lençol caído do varal se mexe…', 3);
      }
    }
    // praça: autosave no arco
    if (!this.q.has('c4_inPlaza') && p.z > 50.4 && p.x > 0 && p.x < 30) {
      this.q.set('c4_inPlaza');
      if (!this.q.has('c4_vigiaRetreat')) { g.saveGame('c4_plaza'); g.hud.toast('Praça do Relógio · progresso salvo.'); }
    }
    // chefe: o sino toca e o Vigia desce da varanda
    const T = C4_BOSS_TRIGGER;
    if (!this.bossActive && !this.q.has('c4_vigiaRetreat') && p.x > T.minX && p.x < T.maxX && p.z > T.minZ && p.z < T.maxZ) this._startBoss();
    if (this.bellT >= 0) {
      this.bellT += dt;
      while (this.bellN < 3 && this.bellT > this.bellN * 0.9) { g.audio.play('chime', { x: 15, y: 19.8, z: 76.8 }, { pitch: 0.5 }); this.bellN++; }
      if (this.bellT > 2.4) {
        this.bellT = -1;
        this.boss.activate();
        this.hint('c4_boss', 'O sobretudo do Vigia absorve golpes. Faça-o <b>investir</b> contra o <b>chafariz</b>, os <b>pedestais</b> ou a <b>banca</b> e desça um <b>golpe forte</b> (botão direito) no <b>lampião nas costas</b>. Quando ele <b>erguer a luz</b>, saia da linha: a investida vem logo depois.', 11);
      }
    }
    // lanterna do Vigia: os cinzentos da praça acordam e se viram para Elias
    if (this.boss && this.boss.beamN > this.beamSeen) {
      this.beamSeen = this.boss.beamN;
      let woke = 0;
      for (const e of g.enemies) {
        if (!e.alive || e.pos.z < 50) continue;
        if (e.dormant) { e.wake(); woke++; } else e._alert?.(g.player.pos);
      }
      if (this.beamSeen === 1) g.hud.toast(woke ? 'A luz fria do lampião varre a praça. Nos bancos, os cinzentos se levantam.' : 'A luz fria do lampião varre a praça — e encontra Elias.', 4);
    }
    // aviso: o Vigia não sai da praça
    if (this.bossActive && !this.tut.shown.c4_territory && p.z < 50 && this.boss.state !== 'dormant') this.hint('c4_territory', 'O Vigia para no arco: ele <b>não sai da praça</b>. Recupere o fôlego e volte quando estiver pronto.', 6);
    // retirada: o Vigia some na Torre e deixa a chave
    if (this.bossActive && this.boss.state === 'gone' && !this.q.has('c4_vigiaRetreat')) {
      this.q.set('c4_vigiaRetreat'); this.bossActive = false;
      g.hud.showBoss(false); g.audio.setIntensity(0);
      g.hud.toast('O Vigia escala a fachada e some pela varanda da Torre. Algo de ferro tilinta nas pedras, ao pé da porta.', 5.5);
      g.saveGame('c4_plaza');
    }
    // entrou na Torre: fim da primeira fatia
    if (!this.q.has('c4_sliceDone') && this.q.has('c4_towerOpen') && p.z > 77.0 && p.x > 11.4 && p.x < 18.6) {
      this.q.set('c4_sliceDone');
      g.saveGame('c4_tower');
      g.hud.toast('Torre do Relógio · progresso salvo. Fim da primeira fatia do Capítulo 4 — a subida continua na próxima atualização.', 7);
    }
  }
}
