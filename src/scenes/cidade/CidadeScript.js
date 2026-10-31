// Roteiro do Capítulo 4 — Cidade Morta (primeira fatia): bueiro no beco → Rua do Comércio (cinzentos) →
// bonde tombado (edital do toque de recolher) → Farmácia Central (diário do Dr. Lauro, chave da relojoaria na
// gaveta do caixa) → Relojoaria Ponteiro (livro de registros, caderno do relojoeiro) → pátio dos fundos →
// arco da Praça do Relógio → o sino toca e o Vigia desce da Torre (primeiro confronto: ele recua quando o lampião
// trinca e deixa cair a chave da Torre) → Torre do Relógio (escada quadrada, livro de rondas) → casa das máquinas
// (roda de escape na bancada do sineiro → mecanismo e pêndulo andando → o Vigia desce do campanário: segundo
// confronto, morte real) → manivela dos ponteiros na hora do toque (3h07) + martelo → chapa da passagem do Relógio
// desce → fim do Capítulo 4 (gancho do Capítulo 5 — Águas Negras).
// Reaproveita os helpers do roteiro do hospital.
import * as THREE from 'three';
import { HospitalScript } from '../hospital/HospitalScript.js';
import { Enemy } from '../../ai/EnemyController.js';
import { ammoMesh } from '../hospital/HospitalPedsScript.js';
import { VigiaBoss } from '../../ai/VigiaBoss.js';
import { GROUND, VIGIA_BALCONY, GEAR_Y, VIGIA_HATCH, VIGIA_HALL_BOUNDS, PENDULUM, PASSAGE, MECH, C4_HOURS, C4_RIGHT_HOUR } from './CidadeLevel.js';
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
  // casa das máquinas: o ajudante do sineiro, de pé diante da bancada — a roda de escape o acorda
  { id: 'cin_maq', type: 'cinzento', x: 23.9, y: GEAR_Y, z: 93.4, yaw: Math.PI, dormant: true },
];
const C4_DOORS = ['c4_pharm', 'c4_watch', 'c4_back', 'c4_tower'];
// gatilho do Vigia: alguns passos depois do arco (o autosave da praça fica antes dele)
export const C4_BOSS_TRIGGER = { minX: 0.5, maxX: 29.5, minZ: 53.2, maxZ: 75.6 };
// casa das máquinas: entrou no salão (autosave) e onde o Vigia (2º confronto) cai morto em saves
export const C4_HALL_ENTRY = { minX: 4, maxX: 26, minZ: 84.4, maxZ: 100, minY: GEAR_Y - 1 };
export const C4_VIGIA_BODY = { x: 15, y: GEAR_Y, z: 90.6 };
export const C4_VIGIA_HP2 = 600;

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
    if (save.flags.c4_vigiaDead) this.boss.setDeadAt(C4_VIGIA_BODY.x, C4_VIGIA_BODY.y, C4_VIGIA_BODY.z);
    else if (save.flags.c4_vigiaRetreat) this.boss.setGoneInstant();
    this.hourI = 0;

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

    // ---------- Torre: livro de rondas e livro de registros no térreo ----------
    this._doc('livro_rondas', { x: 14.6, y: 1.1, z: 80.6 }, 14.6, 1.02, 81.15);
    this._saveBook('c4_tower_book', { x: 16.0, y: 0.9, z: 80.6 }, 16.0, 0.89, 81.15, 'c4_tower');

    // ---------- casa das máquinas ----------
    const GY = GEAR_Y;
    this._saveBook('c4_gears_book', { x: 5.0, y: GY + 0.85, z: 86.6 }, 5.0, GY + 0.84, 85.8, 'c4_gears');
    this._pickup('c4_ammo_maq', { x: 5.2, y: GY + 1.25, z: 98.8 }, 'Pegar munição .38', () => {
      g.inventory.add('municao_38', 6); g.hud.toast(`Munição .38 ×6 (total ${g.inventory.count('municao_38')})`, 2.5);
    }, () => ammoMesh(M, 5.2, GY + 1.22, 99.3, 6));
    this._pickup('c4_band_maq', { x: 4.6, y: GY + 1.25, z: 98.8 }, 'Pegar bandagem', () => this._giveItem('bandagem'), () => this._bandMesh(4.5, GY + 1.25, 99.3));
    this._pickup('c4_escape', { x: 24.0, y: GY + 1.0, z: 91.0 }, 'Pegar a roda de escape de latão', () => {
      this._giveItem('roda_escape'); this.q.set('c4_hasEscape');
      g.perception.noise({ x: 24, y: GY + 1, z: 91.9 }, 9, 'metal');
      const w = g.enemies.find((e) => e.id === 'cin_maq');
      if (w && w.alive && w.dormant) { w.wake(); g.audio.play('groan', w.pos, { pitch: 0.8 }); }
      g.hud.toast('A roda de escape do Relógio, embrulhada num pano com a letra do Ponteiro. Ao lado da bancada, alguém de avental de couro se vira.', 5);
    }, () => this._gearMesh(24.0, GY + 0.95, 91.9));
    g.interact.add({ id: 'c4_mech', pos: { x: 15, y: GY + 1.2, z: MECH.minZ - 0.6 }, radius: 1.7,
      prompt: () => (g.inventory.has('roda_escape') ? 'Encaixar a roda de escape e soltar a trava do pêndulo' : 'Examinar o mecanismo do Relógio'),
      enabled: () => !this.q.has('c4_mechRunning'),
      onInteract: () => this._useMech() });
    g.interact.add({ id: 'c4_crank', pos: { x: 13.9, y: GY + 1.2, z: MECH.maxZ + 0.6 }, radius: 1.3,
      prompt: () => `Girar a manivela dos ponteiros (agora: ${C4_HOURS[this.hourI]})`,
      enabled: () => this.q.has('c4_vigiaDead') && !this.q.has('c4_passageOpen'),
      onInteract: () => this._turnHands() });
    g.interact.add({ id: 'c4_hammer', pos: { x: 16.3, y: GY + 1.2, z: MECH.maxZ + 0.6 }, radius: 1.3,
      prompt: () => `Acionar o martelo do sino (ponteiros em ${C4_HOURS[this.hourI]})`,
      enabled: () => this.q.has('c4_vigiaDead') && !this.q.has('c4_passageOpen'),
      onInteract: () => this._strikeHammer() });
    this._pickup('c4_note', { x: 15.9, y: GY + 1.6, z: MECH.maxZ + 0.5 }, 'Ler: bilhete preso na engrenagem', () => {
      g.inventory.addDocument('bilhete_ines'); this.q.set('c4_readBilhete'); g.openDocument('bilhete_ines');
    }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.01, 0.1), M.paper); m.position.set(15.9, GY + 2.21, MECH.maxZ - 0.15); return m; }, () => this.q.has('c4_vigiaDead'));

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

  _gearMesh(x, y, z) {
    const M = this.game.materials, gr = new THREE.Group();
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 12), M.brass); gr.add(d);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, t = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.06), M.brass); t.position.set(Math.cos(a) * 0.22, 0, Math.sin(a) * 0.22); t.rotation.y = -a; gr.add(t); }
    gr.position.set(x, y, z); return gr;
  }

  // mecanismo central: sem a roda só dá para examinar; com ela, encaixa e solta a trava (começa o 2º confronto)
  _useMech() {
    const g = this.game, L = this.level;
    if (!g.inventory.has('roda_escape')) {
      this.q.set('c4_sawMech');
      g.audio.play('locked', { x: 15, y: GEAR_Y + 1, z: MECH.minZ });
      g.hud.toast('O mecanismo do Relógio está parado. No encaixe do escape, só um eixo vazio — alguém tirou a roda. A trava do pêndulo não cede sem ela.', 5);
      return;
    }
    g.inventory.remove('roda_escape');
    this.q.set('c4_escapeIn'); this.q.set('c4_mechRunning');
    L.escapeWheel.visible = true; L.lockLever.rotation.x = -0.6; L.mechRunning = true;
    g.audio.play('clang', { x: 15, y: GEAR_Y + 1, z: MECH.minZ }); g.perception.noise({ x: 15, y: GEAR_Y + 1, z: MECH.minZ }, 12, 'metal');
    g.cameraCtl.addShake(0.3);
    g.hud.toast('A roda de escape encaixa com um estalo. A trava cede, o pêndulo começa a balançar — tique… taque… — e, lá em cima, o sino acorda.', 5);
  }
  // 2º confronto: o sino toca três vezes e o Vigia desce pelo alçapão do campanário
  _startSecond() {
    const g = this.game;
    this.bossActive = true;
    this.secondPending = true;
    this.bellT = 0; this.bellN = 0;
    this.level.ringBell?.(3.5);
    g.hud.showBoss(true, 'O VIGIA');
    g.audio.setIntensity(2);
    g.hud.toast('O sino toca três vezes. No teto, o alçapão do campanário se abre — e a luz fria do lampião desce pela escada de corda.', 4.5);
  }
  _turnHands() {
    const g = this.game;
    this.hourI = (this.hourI + 1) % C4_HOURS.length;
    this.level.setHours(this.hourI);
    if (this.level.crank) this.level.crank.rotation.x += Math.PI / 2;
    g.audio.play('switch', { x: 13.9, y: GEAR_Y + 1.2, z: MECH.maxZ });
    g.hud.toast(`Os ponteiros do mostrador de acerto rangem até ${C4_HOURS[this.hourI]}.`, 2.2);
  }
  _strikeHammer() {
    const g = this.game, L = this.level;
    const at = { x: 16.3, y: GEAR_Y + 1.4, z: MECH.maxZ };
    L.hammer.rotation.x = 0.2; this.hammerT = 0.5;
    L.ringBell?.(2);
    g.audio.play('chime', { x: 15, y: 19.8, z: 76.8 }, { pitch: 0.5 });
    if (this.hourI !== C4_RIGHT_HOUR) {
      this.q.set('c4_wrongHour');
      g.perception.noise(at, 14, 'metal');
      g.hud.toast(`O martelo bate às ${C4_HOURS[this.hourI]}. O sino responde, rouco e fora de hora — e nada se abre. "Só na hora do toque."`, 4.5);
      return;
    }
    this.q.set('c4_passageOpen');
    L.openPlate();
    g.audio.play('door', { x: 15, y: GEAR_Y, z: 98 }); g.audio.play('clang', { x: 15, y: GEAR_Y, z: 98 });
    g.cameraCtl.addShake(0.5);
    g.hud.toast('3h07. O sino toca três vezes, certo como um relógio. Atrás do mecanismo, a chapa de ferro do piso afunda e desliza: uma escada desce para o escuro úmido.', 6);
    g.saveGame('c4_end');
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
    if (f.c4_hasEscape) { const w = g.enemies.find((e) => e.id === 'cin_maq'); if (w && w.alive) w.dormant = false; }
    // mecanismo: roda encaixada e pêndulo andando; ponteiros sempre voltam a 12h00 até a passagem abrir
    if (f.c4_mechRunning) { L.mechRunning = true; L.escapeWheel.visible = true; L.lockLever.rotation.x = -0.6; }
    this.hourI = f.c4_passageOpen ? C4_RIGHT_HOUR : 0; L.setHours(this.hourI);
    if (f.c4_passageOpen) L.openPlate(true);
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
      if (this.bellT > 2.4 && this.secondPending) this.bellT = -1; // o 2º confronto começa em _updateGears
      else if (this.bellT > 2.4) {
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
        if (!e.alive || e.pos.z < 50 || (this.boss.second && e.pos.y < GEAR_Y - 1)) continue;
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
    // entrou na Torre
    if (!this.q.has('c4_sliceDone') && this.q.has('c4_towerOpen') && p.z > 77.0 && p.x > 11.4 && p.x < 18.6) {
      this.q.set('c4_sliceDone');
      g.saveGame('c4_tower');
      g.hud.toast('Torre do Relógio · progresso salvo. A escada sobe colada às paredes até a casa das máquinas.', 5);
      this.hint('c4_stairs', 'A escada da Torre sobe em quatro lances, colada às paredes. O mecanismo range lá em cima, na <b>casa das máquinas</b> (porta na galeria, a norte).', 7);
    }
    this._updateGears(dt);
  }

  // ---------- casa das máquinas: entrada, pêndulo, segundo confronto, passagem e fim ----------
  _updateGears(dt) {
    const g = this.game, p = g.player.pos, L = this.level, E = C4_HALL_ENTRY;
    const inHall = p.x > E.minX && p.x < E.maxX && p.z > E.minZ && p.z < E.maxZ && p.y > E.minY;
    if (!this.q.has('c4_readRondas') && g.inventory.documents.includes('livro_rondas')) this.q.set('c4_readRondas');
    if (!this.q.has('c4_inGears') && inHall) {
      this.q.set('c4_inGears');
      if (!this.q.has('c4_mechRunning')) { g.saveGame('c4_gears'); g.hud.toast('Casa das máquinas do Relógio · progresso salvo.'); }
      this.hint('c4_gears', 'O mecanismo do Relógio está parado. Examine o <b>mecanismo central</b> e procure a peça que falta — o caderno do Ponteiro falava de um conserto.', 8);
    }
    // segundo confronto: começa com o mecanismo andando e Elias no salão (também ao recarregar um save)
    if (!this.bossActive && this.q.has('c4_mechRunning') && !this.q.has('c4_vigiaDead') && inHall) this._startSecond();
    if (this.secondPending && this.bellT < 0) {
      this.secondPending = false;
      this.boss.beginSecond({ balcony: { x: VIGIA_HATCH.x, y: VIGIA_HATCH.y, z: VIGIA_HATCH.z + 0.6 }, bounds: VIGIA_HALL_BOUNDS, floorY: GEAR_Y, hp: C4_VIGIA_HP2 });
      this.hint('c4_boss2', 'Ele não foge mais. Use as <b>caixas de engrenagens</b> e o <b>mecanismo central</b> para atordoar a investida — e cuidado com o <b>pêndulo</b>: ele derruba Elias, mas também acerta o Vigia.', 10);
    }
    // pêndulo: machuca quem estiver no caminho do disco
    if (L.mechRunning && L.pendulum) {
      const bob = L.pendulumBob(this._bob || (this._bob = new THREE.Vector3()));
      const vx = bob.x - (this._bobX ?? bob.x); this._bobX = bob.x;
      this.pendCd = Math.max(0, (this.pendCd || 0) - dt); this.pendBossCd = Math.max(0, (this.pendBossCd || 0) - dt);
      const pl = g.player, R = PENDULUM.r;
      if (this.pendCd <= 0 && pl.alive && Math.abs(bob.x - p.x) < R + 0.3 && Math.abs(bob.z - p.z) < 0.5 && bob.y > p.y + 0.2 && bob.y < p.y + 2.0) {
        this.pendCd = 1.4;
        pl.takeHit({ dmg: 18, from: { x: bob.x - Math.sign(vx || 1) * 1.5, y: bob.y, z: bob.z }, blockable: false, knock: 6 });
        g.audio.play('thud', p); g.cameraCtl.addShake(0.5);
        if (!this.q.has('c4_pendHit')) { this.q.set('c4_pendHit'); g.hud.toast('O pêndulo do Relógio! Passe quando o disco estiver no fim do curso.', 3.5); }
      }
      const B = this.boss;
      if (this.pendBossCd <= 0 && B && B.second && B.alive && Math.abs(bob.x - B.pos.x) < R + B.radius && Math.abs(bob.z - B.pos.z) < 0.6 + B.radius * 0.5 && Math.abs(bob.y - (B.pos.y + 1.2)) < 1.4) {
        if (B.pendulumHit()) { this.pendBossCd = 3; this.q.set('c4_pendBoss'); }
      }
    }
    if (this.hammerT > 0) { this.hammerT -= dt; if (this.hammerT <= 0 && L.hammer) L.hammer.rotation.x = -0.9; }
    // aviso: o Vigia não sai da casa das máquinas
    if (this.bossActive && this.boss.second && !this.tut.shown.c4_territory2 && p.z < 83.8 && this.boss.state !== 'dormant') this.hint('c4_territory2', 'O Vigia para na porta da galeria: ele <b>não desce</b> a escada. Recupere o fôlego e volte.', 6);
    // morte real do Vigia
    if (this.bossActive && this.boss.second && this.boss.state === 'dead' && !this.q.has('c4_vigiaDead')) {
      this.q.set('c4_vigiaDead'); this.bossActive = false;
      g.hud.showBoss(false); g.audio.setIntensity(0);
      g.hud.toast('O lampião se parte de vez e a luz fria escorre pelo assoalho. O Vigia cai de joelhos e não se levanta. O pêndulo segue balançando — tique… taque…', 6);
      this.hint('c4_hands', 'Na face <b>norte</b> do mecanismo há um <b>mostrador de acerto</b> com manivela e o <b>martelo do sino</b>. "A passagem só abre na hora do toque."', 9);
      g.saveGame('c4_gears');
    }
    // desceu pela passagem: fim do Capítulo 4
    if (!this._ended && this.q.has('c4_passageOpen') && p.z > PASSAGE.maxZ - 0.4 && p.y < GEAR_Y - 1.5 && p.x > PASSAGE.minX - 0.5 && p.x < PASSAGE.maxX + 0.5) {
      this._ended = true;
      this.q.set('c4_chapterDone'); this.q.set('ch4Done');
      g.saveGame('c4_end');
      g.endChapter();
    }
  }
}
