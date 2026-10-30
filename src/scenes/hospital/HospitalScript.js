// Lógica do Capítulo 1: itens, documentos, tutorial contextual, quebra-cabeça elétrico, elevador,
// atalho, gatilhos (autosave, chefe) e saída do capítulo. Tudo persistido via flags/doors no save.
import * as THREE from 'three';
import { UP, LO } from './HospitalLevel.js';
import { Enemy } from '../../ai/EnemyController.js';
import { SurgeonBoss } from '../../ai/SurgeonBoss.js';
import { DOCUMENTS } from '../../data/documents.js';
import { ITEMS } from '../../data/items.js';

const BREAKER_ORDER = [1, 2, 0]; // II → III → I

export const ENEMY_SPAWNS = [
  { id: 'int_cor', type: 'interno', x: 27, y: UP, z: 12.3, yaw: -Math.PI / 2 },
  { id: 'int_dep', type: 'interno', x: 16.5, y: UP, z: 16, patrol: [{ x: 16.5, y: UP, z: 16 }, { x: 21.5, y: UP, z: 19.5 }, { x: 16.5, y: UP, z: 20 }] },
  { id: 'int_wake', type: 'interno', x: 10, y: UP, z: 13.3, yaw: Math.PI, dormant: true },
  { id: 'enf_lh', type: 'enfermeiro', x: 34, y: LO, z: 12, patrol: [{ x: 33, y: LO, z: 12 }, { x: 17, y: LO, z: 12 }] },
  { id: 'int_arq', type: 'interno', x: 32.5, y: LO, z: 4.6, yaw: 0 },
];

export class HospitalScript {
  constructor(game, level) {
    this.game = game; this.level = level;
    this.breakerSeq = [];
    this.tut = { moved: 0, shown: {} };
    this.bossActive = false;
  }

  get q() { return this.game.quest; }

  setup(save) {
    const g = this.game, L = this.level, M = g.materials;
    // inimigos
    for (const s of ENEMY_SPAWNS) {
      const e = new Enemy(g, s.type, s);
      g.enemies.push(e);
      if (save.deadEnemies.includes(s.id)) { e.pos.set(s.x, s.y, s.z); e.setDeadInstant(); }
    }
    this.boss = new SurgeonBoss(g, { x: 23, y: LO, z: 31.4, yaw: 0 });
    g.boss = this.boss;
    if (save.flags.bossDead) this.boss.setDeadInstant();

    // ---------- itens ----------
    this._pickup('axe', { x: 4.1, y: 1.0, z: 9.3 }, 'Pegar machado de incêndio', () => {
      g.player.setWeapon('machado'); g.inventory.weapon = 'machado';
      this.q.set('hasAxe');
      g.hud.toast('Machado de incêndio');
      this.hint('combat', '<b>Botão esquerdo</b>: golpe rápido (combo) · <b>Botão direito</b>: golpe forte<br><b>Q</b>: defender · <b>Espaço</b>: esquivar. Golpes gastam fôlego.', 9);
    }, () => this._axeMesh(4.1, 1.45, 9.78));
    this._pickup('band_ward', { x: 0.9, y: 1.0, z: 9.0 }, 'Pegar bandagem', () => this._giveItem('bandagem'), () => this._bandMesh(0.5, 1.82, 9.2));
    this._pickup('band_dep', { x: 15.2, y: 1.1, z: 18 }, 'Pegar bandagem', () => this._giveItem('bandagem'), () => this._bandMesh(14.55, 1.25, 18));
    this._pickup('fuse', { x: 19, y: 0.9, z: 21 }, 'Pegar fusível', () => { this._giveItem('fusivel'); this.q.set('hasFuse'); }, () => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.25, 6), M.paper); m.rotation.z = Math.PI / 2; m.position.set(19, 0.92, 21.4); return m;
    });
    this._pickup('band_arq', { x: 31.5, y: LO + 0.9, z: 3.0 }, 'Pegar bandagem', () => this._giveItem('bandagem'), () => this._bandMesh(31.5, LO + 0.86, 2.7));
    this._pickup('band_sc', { x: 23.5, y: LO + 0.9, z: 18.6 }, 'Pegar bandagem', () => this._giveItem('bandagem'), () => this._bandMesh(23.5, LO + 0.9, 18));

    // ---------- documentos ----------
    this._doc('ficha_elias', { x: 2.15, y: 0.7, z: 2.95 }, 2.15, 0.62, 2.95);
    this._doc('aviso_maquinas', { x: 37.4, y: 1.5, z: 17 }, 37.88, 1.5, 17, true);
    this._doc('relatorio_quarentena', { x: 31, y: LO + 0.85, z: 3.0 }, 30.7, LO + 0.82, 2.7);
    this._doc('diario_cirurgiao', { x: 23.5, y: LO + 0.9, z: 17 }, 23.5, LO + 0.88, 17);

    // ---------- livros de registro (save) ----------
    this._saveBook('book_ward', { x: 7.1, y: 0.9, z: -2.2 }, 7.1, 0.86, -2.45, 'ward_bed');
    this._saveBook('book_yard', { x: 38.6, y: LO + 0.95, z: 25.6 }, 38.6, LO + 0.92, 24.8, 'yard');

    // ---------- portas comuns ----------
    for (const id of ['ward', 'shortcut', 'storage', 'machines', 'archive', 'arena']) {
      const d = L.doors[id];
      g.interact.add({
        id: 'door_' + id, radius: 1.7,
        pos: { x: d.x, y: d.y + 1, z: d.z },
        prompt: () => (d.locked ? 'Abrir ' + d.label : d.open ? 'Fechar ' + d.label : 'Abrir ' + d.label),
        onInteract: () => this._useDoor(d),
      });
    }

    // ---------- quebra-cabeça elétrico ----------
    g.interact.add({ id: 'fusepanel', pos: { x: 37.5, y: 1.45, z: 16 }, radius: 1.5,
      enabled: () => !this.q.has('fuseIn'), prompt: () => (g.inventory.has('fusivel') ? 'Instalar fusível' : 'Examinar painel do fusível'),
      onInteract: () => {
        if (!g.inventory.has('fusivel')) { g.hud.toast('Um fusível queimado. Preciso de um reserva.'); g.audio.play('locked', null); return; }
        g.inventory.remove('fusivel'); this.q.set('fuseIn'); this._applyFuse(); g.audio.play('switch', { x: 37.5, y: 1.4, z: 16 });
        g.hud.toast('Fusível instalado.');
      } });
    ['I', 'II', 'III'].forEach((name, i) => {
      g.interact.add({ id: 'breaker' + i, pos: { x: 37.5, y: 1.45, z: 18 + i }, radius: 0.9,
        enabled: () => !this.q.has('breakersOk'), prompt: 'Acionar disjuntor ' + name, onInteract: () => this._breaker(i) });
    });
    g.interact.add({ id: 'lever', pos: { x: 37.5, y: 1.3, z: 22.05 }, radius: 1.3,
      enabled: () => !this.q.has('power'), prompt: 'Puxar alavanca principal', onInteract: () => this._lever() });

    // ---------- elevador ----------
    const E = L.elevator;
    for (const [lvl, y] of [['upper', UP], ['lower', LO]]) {
      g.interact.add({ id: 'call_' + lvl, pos: { x: 39.45, y: y + 1.2, z: 13.3 }, radius: 1.4,
        prompt: 'Chamar elevador', enabled: () => !E.moving && !(E.level === lvl && L.doors[lvl === 'upper' ? 'elevUp' : 'elevLo'].open),
        onInteract: () => this._callElevator(lvl) });
    }
    g.interact.add({ id: 'elev_panel', pos: { x: 43.4, y: UP + 1.2, z: 13.2 }, radius: 2.2,
      prompt: () => (E.level === 'upper' ? 'Descer ao subsolo' : 'Subir ao térreo'),
      enabled: () => !E.moving, onInteract: () => this._rideElevator() });
    this.elevPanel = g.interact.list.find((i) => i.id === 'elev_panel');

    // ---------- portão de serviço e saída ----------
    g.interact.add({ id: 'gate_lever', pos: { x: 35.5, y: LO + 1.2, z: 26.4 }, radius: 1.5,
      enabled: () => !this.q.has('gateOpen'), prompt: 'Puxar trava do portão',
      onInteract: () => {
        if (!this.q.has('bossDead')) { g.hud.toast('A trava não cede enquanto aquela coisa respira.'); g.audio.play('locked', null); return; }
        this.q.set('gateOpen'); L.doors.gate.locked = false; L.doors.gate.setOpen(true); g.audio.play('elevator', L.doors.gate, { dur: 1.2 });
      } });
    { const lv = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), M.axeMetal); lv.position.set(35.85, LO + 1.3, 26.4); lv.rotation.x = 0.5; L.b.group.add(lv); this.gateLeverMesh = lv; }
    g.interact.add({ id: 'exit', pos: { x: 45.6, y: LO + 1.2, z: 28 }, radius: 1.8, prompt: 'Sair do hospital', enabled: () => this.q.has('gateOpen'),
      onInteract: () => { this.q.set('chapterDone'); g.saveGame('yard'); g.endChapter(); } });

    this._applyState(save);
  }

  // ---------- helpers de criação ----------
  _axeMesh(x, y, z) {
    const M = this.game.materials, gr = new THREE.Group();
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.8, 0.045), M.woodDark); gr.add(h);
    const hd = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.17, 0.05), M.axeMetal); hd.position.set(0.1, 0.3, 0); gr.add(hd);
    gr.position.set(x, y, z); gr.rotation.z = 0.15; return gr;
  }
  _bandMesh(x, y, z) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 8), this.game.materials.bandage);
    m.position.set(x, y, z); return m;
  }
  _pickup(id, pos, prompt, give, meshFn) {
    const g = this.game;
    const mesh = meshFn(); this.level.b.group.add(mesh); this.level.pickupMeshes[id] = mesh;
    g.interact.add({ id: 'pick_' + id, pos, radius: 1.4, prompt, enabled: () => !this.q.has('picked_' + id),
      onInteract: () => { this.q.set('picked_' + id); mesh.visible = false; g.audio.play('pickup', null); give(); } });
  }
  _giveItem(id) { this.game.inventory.add(id); this.game.hud.toast((ITEMS[id]?.name || id) + ' obtido'); if (id === 'bandagem') this.hint('heal', '<b>H</b>: usar bandagem (+45 de vida). <b>Tab</b>: inventário e documentos.', 7); }
  _doc(id, pos, x, y, z, wall = false) {
    const g = this.game;
    const m = new THREE.Mesh(new THREE.BoxGeometry(wall ? 0.02 : 0.22, wall ? 0.3 : 0.01, wall ? 0.22 : 0.3), g.materials.paper);
    m.position.set(x, y, z); this.level.b.group.add(m);
    g.interact.add({ id: 'doc_' + id, pos, radius: 1.4, prompt: 'Ler: ' + DOCUMENTS[id].title,
      onInteract: () => { g.inventory.addDocument(id); g.openDocument(id); } });
  }
  _saveBook(id, pos, x, y, z, checkpoint) {
    const g = this.game;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.07, 0.24), g.materials.leather); m.position.set(x, y, z); this.level.b.group.add(m);
    const glow = new THREE.PointLight(0xffa860, 0.8, 2.2, 2); glow.position.set(x, y + 0.4, z); g.scene.add(glow);
    g.interact.add({ id, pos, radius: 1.5, prompt: 'Escrever no Livro de Registros (salvar)',
      onInteract: () => { g.player.hp = Math.max(g.player.hp, 60); g.saveGame(checkpoint); g.audio.play('save', null); g.hud.toast('Progresso registrado.'); } });
  }

  hint(key, html, dur = 6) {
    if (this.tut.shown[key]) return;
    this.tut.shown[key] = true;
    this.game.hud.hint(html, dur);
  }

  // ---------- portas ----------
  _useDoor(d) {
    const g = this.game, p = g.player.pos;
    if (d.locked) {
      if (d.id === 'shortcut' && p.x > 12) {
        d.locked = false; d.setOpen(true); this.q.set('shortcutOpen');
        g.hud.toast('Você puxou o ferrolho. Atalho aberto para a enfermaria.');
        return;
      }
      g.audio.play('locked', d); g.hud.toast(d.lockMsg); return;
    }
    d.setOpen(!d.open);
    g.perception.noise(d, 5, 'door');
  }

  // ---------- quebra-cabeça ----------
  _applyFuse() { this.level.fuseSlot.visible = true; }
  _breaker(i) {
    const g = this.game, L = this.level;
    if (!this.q.has('fuseIn')) { g.hud.toast('Nada acontece. O painel está sem fusível.'); g.audio.play('switch', null); return; }
    if (this.breakerSeq.includes(i)) { g.hud.toast('Este disjuntor já está ligado.'); return; }
    g.audio.play('switch', { x: 37.6, y: 1.4, z: 18 + i });
    const expected = BREAKER_ORDER[this.breakerSeq.length];
    if (i !== expected) {
      // curto-circuito: faíscas, barulho alto (atrai inimigos) e reinício
      this.breakerSeq = [];
      for (const b of L.breakers) { b.g.rotation.z = -0.5; b.led.material = g.materials.breakerOff; }
      g.combat.sparks({ x: 37.5, y: 1.6, z: 18 + i }, 30);
      g.audio.play('spark', { x: 37.5, y: 1.6, z: 18 + i });
      g.perception.noise({ x: 37.5, y: UP, z: 18 + i }, 22, 'spark');
      g.player.takeHit({ dmg: 6, from: { x: 38.5, y: 0, z: 18 + i }, blockable: false, knock: 3 });
      g.hud.toast('Curto-circuito! Ordem errada — os disjuntores desarmaram.');
      return;
    }
    this.breakerSeq.push(i);
    L.breakers[i].g.rotation.z = 0.5; L.breakers[i].led.material = g.materials.breakerOn;
    if (this.breakerSeq.length === 3) { this.q.set('breakersOk'); g.hud.toast('Disjuntores armados.'); }
  }
  _lever() {
    const g = this.game, L = this.level;
    if (!this.q.has('breakersOk')) { g.hud.toast('A alavanca está travada. Os disjuntores precisam estar armados.'); g.audio.play('locked', null); return; }
    this.q.set('power');
    L.lever.rotation.z = 0.7;
    g.audio.play('power', { x: 37, y: 1.5, z: 22 });
    g.perception.noise({ x: 37, y: UP, z: 22 }, 40, 'power');
    this._applyPower();
    g.hud.toast('O gerador ruge. A energia voltou ao hospital.');
    // o ruído desperta o paciente caído no corredor
    const w = g.enemies.find((e) => e.id === 'int_wake');
    if (w && w.alive) { w.wake(); w.lastKnown = { x: 33, y: UP, z: 15 }; w.state = 'investigate'; w.stateT = 0; }
    g.saveGame('machine_room');
  }
  _applyPower() { this.level.setPower(true); }

  // ---------- elevador ----------
  _callElevator(lvl) {
    const g = this.game, E = this.level.elevator;
    if (!this.q.has('power')) { g.hud.toast('O botão está apagado. Sem energia.'); g.audio.play('locked', null); return; }
    if (E.level === lvl) { this._openElevDoor(lvl); return; }
    this._moveElevator(lvl);
  }
  _rideElevator() {
    const g = this.game, E = this.level.elevator;
    if (!this.q.has('power')) { g.hud.toast('Sem energia.'); g.audio.play('locked', null); return; }
    this._moveElevator(E.level === 'upper' ? 'lower' : 'upper');
  }
  _openElevDoor(lvl) {
    const D = this.level.doors;
    D.elevUp.setOpen(lvl === 'upper'); D.elevLo.setOpen(lvl === 'lower');
  }
  _moveElevator(lvl) {
    const E = this.level.elevator, D = this.level.doors, g = this.game;
    D.elevUp.setOpen(false); D.elevLo.setOpen(false);
    E.moving = true; E.target = lvl === 'upper' ? UP : LO; E.targetLevel = lvl; E.delay = 0.7;
    g.audio.play('elevator', { x: 42, y: E.y, z: 12 }, { dur: 5 });
  }

  _applyState(save) {
    const g = this.game, L = this.level, f = save.flags;
    for (const id in save.doors) L.doors[id]?.restore(save.doors[id]);
    if (f.fuseIn) this._applyFuse();
    if (f.breakersOk) { this.breakerSeq = [...BREAKER_ORDER]; for (const b of L.breakers) { b.g.rotation.z = 0.5; b.led.material = g.materials.breakerOn; } }
    if (f.power) { L.lever.rotation.z = 0.7; this._applyPower(); const w = g.enemies.find((e) => e.id === 'int_wake'); if (w && w.alive) w.dormant = false; }
    for (const k in f) if (k.startsWith('picked_') && L.pickupMeshes[k.slice(7)]) L.pickupMeshes[k.slice(7)].visible = false;
    if (f.gateOpen) { L.doors.gate.locked = false; L.doors.gate.setOpen(true, true); }
    // elevador
    const lvl = save.elevatorLevel || 'upper';
    const E = L.elevator; E.level = lvl; E.y = E.target = lvl === 'upper' ? UP : LO; E.car.position.y = E.y;
    if (f.power) this._openElevDoor(lvl);
    // a arena nunca fica trancada ao carregar (o chefe reinicia adormecido)
    if (!f.bossDead) { L.doors.arena.locked = false; }
  }

  // ---------- gatilhos por quadro ----------
  update(dt) {
    const g = this.game, p = g.player.pos, L = this.level, E = L.elevator;
    // tutorial contextual
    if (!this.tut.shown.move) this.hint('move', '<b>WASD</b>: mover · <b>Mouse</b>: câmera (clique na tela para capturar o mouse) · <b>Shift</b>: correr', 8);
    if (!this.tut.shown.interact) {
      const near = g.interact.findBest(p, g.player.facing());
      if (near) this.hint('interact', '<b>E</b>: interagir com objetos, portas e documentos.', 6);
    }
    if (!this.q.has('leftWard') && p.z > 10.4 && p.y > -1) this.q.set('leftWard');
    // atalho visto do patamar
    if (!this.tut.shown.shortcut && p.x > 12.2 && p.x < 16 && p.z < 0.2 && p.y > -0.5 && L.doors.shortcut.locked) this.hint('shortcut', 'Há um ferrolho nesta porta. Abra-a (<b>E</b>) para criar um atalho até a enfermaria.', 7);
    // elevador
    if (E.moving) {
      if (E.delay > 0) E.delay -= dt;
      else {
        const dir = Math.sign(E.target - E.y);
        E.y += dir * 1.25 * dt;
        if ((dir > 0 && E.y >= E.target) || (dir < 0 && E.y <= E.target) || dir === 0) {
          E.y = E.target; E.moving = false; E.level = E.targetLevel;
          this._openElevDoor(E.level);
          g.audio.play('switch', { x: 42, y: E.y, z: 12 });
          if (E.level === 'lower' && !this.q.has('reachedLower') && p.x > 40 && p.y < -3) { this.q.set('reachedLower'); g.saveGame('lower_hall'); }
        }
      }
      E.car.position.y = E.y;
    }
    this.elevPanel.pos.y = E.y + 1.2;
    // corredor cirúrgico: autosave antes do chefe
    if (!this.q.has('enteredSurgery') && p.y < -3 && p.x > 20 && p.x < 24 && p.z > 15 && p.z < 19.5) {
      this.q.set('enteredSurgery'); g.saveGame('pre_boss'); g.hud.toast('Progresso salvo automaticamente.');
    }
    // início da luta
    if (!this.bossActive && !this.q.has('bossDead') && p.y < -3 && p.z > 21.6 && p.x > 10 && p.x < 36) {
      this.bossActive = true;
      const d = L.doors.arena; d.setOpen(false); d.locked = true; d.lockMsg = 'A porta foi travada por fora.';
      this.boss.activate();
      g.hud.showBoss(true);
      g.audio.setIntensity(2);
      this.hint('boss', 'O couro do avental absorve golpes. Faça-o <b>investir</b> contra mesas ou pilares e desça um <b>golpe forte</b> (botão direito) no <b>frasco nas costas</b>.', 9);
    }
    if (this.bossActive && !this.boss.alive && !this.q.has('bossDead')) {
      this.q.set('bossDead'); this.bossActive = false;
      L.doors.arena.locked = false;
      g.hud.showBoss(false); g.audio.setIntensity(0);
      g.hud.toast('O Cirurgião caiu. A trava do portão de serviço cedeu.');
      if (this.gateLeverMesh) this.gateLeverMesh.material = g.materials.axeEdge;
    }
    if (this.q.has('gateOpen') && this.gateLeverMesh) this.gateLeverMesh.rotation.x = -0.5;
  }
}
