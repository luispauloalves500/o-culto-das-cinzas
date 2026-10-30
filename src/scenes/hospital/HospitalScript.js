// Lógica do Capítulo 1: itens, documentos, tutorial contextual, quebra-cabeça elétrico, elevador,
// atalho, gatilhos (autosave, chefe) e saída do capítulo. Tudo persistido via flags/doors no save.
import * as THREE from 'three';
import { UP, LO } from './HospitalLevel.js';
import { Enemy } from '../../ai/EnemyController.js';
import { SurgeonBoss } from '../../ai/SurgeonBoss.js';
import { DOCUMENTS } from '../../data/documents.js';
import { ITEMS } from '../../data/items.js';
import { UP2, CANDLE_ORDER } from './HospitalAnnex.js';
import { roomAt } from '../../data/map.js';
import { setupWing, applyWing, updateWing, useDoorWing, WING_SPAWNS, WING_DOORS } from './HospitalWingScript.js';
import { setupPeds, applyPeds, updatePedsScript, useDoorPeds, PEDS_SPAWNS, PEDS_DOORS } from './HospitalPedsScript.js';
import { setupMaternity, applyMaternity, updateMaternityScript, useDoorMaternity, MATERNITY_SPAWNS, MATERNITY_DOORS } from './HospitalMaternityScript.js';
import { setupDeadArchive, applyDeadArchive, updateDeadArchiveScript, useDoorDeadArchive, DEAD_ARCHIVE_SPAWNS, DEAD_ARCHIVE_DOORS } from './HospitalDeadArchiveScript.js';

const BREAKER_ORDER = [1, 2, 0]; // II → III → I

export const ENEMY_SPAWNS = [
  { id: 'int_cor', type: 'interno', x: 27, y: UP, z: 12.3, yaw: -Math.PI / 2 },
  { id: 'int_dep', type: 'interno', x: 16.5, y: UP, z: 16, patrol: [{ x: 16.5, y: UP, z: 16 }, { x: 21.5, y: UP, z: 19.5 }, { x: 16.5, y: UP, z: 20 }] },
  { id: 'int_wake', type: 'interno', x: 10, y: UP, z: 13.3, yaw: Math.PI, dormant: true },
  { id: 'enf_lh', type: 'enfermeiro', x: 34, y: LO, z: 12, patrol: [{ x: 33, y: LO, z: 12 }, { x: 17, y: LO, z: 12 }] },
  { id: 'int_arq', type: 'interno', x: 32.5, y: LO, z: 4.6, yaw: 0 },
  // Ala Leste (quarentena)
  { id: 'enf_east', type: 'enfermeiro', x: 21, y: UP, z: 4.5, patrol: [{ x: 20, y: UP, z: 4.5 }, { x: 28, y: UP, z: 4.5 }, { x: 28, y: UP, z: 1.5 }, { x: 20, y: UP, z: 1.5 }] },
  { id: 'int_east', type: 'interno', x: 35.2, y: UP, z: 8.4, yaw: Math.PI, dormant: true },
  // necrotério
  { id: 'int_morgue', type: 'interno', x: 24.7, y: LO, z: 2.4, yaw: Math.PI },
  { id: 'ras_morgue', type: 'rastejador', x: 21, y: LO, z: 5.2, yaw: -Math.PI / 2, dormant: true },
  // lavanderia e incinerador
  { id: 'enf_lav', type: 'enfermeiro', x: 6.5, y: LO, z: 6.8, yaw: Math.PI, dormant: true },
  { id: 'int_forno', type: 'interno', x: 5.5, y: LO, z: 16.5, patrol: [{ x: 5.5, y: LO, z: 16.2 }, { x: 5.8, y: LO, z: 19 }, { x: 8.2, y: LO, z: 17.2 }] },
  // 2º andar (administração)
  { id: 'enf_admin', type: 'enfermeiro', x: 34, y: UP2, z: 24, patrol: [{ x: 35.5, y: UP2, z: 24 }, { x: 15, y: UP2, z: 24 }] },
  { id: 'int_sec', type: 'interno', x: 17, y: UP2, z: 18.8, patrol: [{ x: 17, y: UP2, z: 18.8 }, { x: 22, y: UP2, z: 19.6 }] },
  // capela: fiel ajoelhado entre os bancos
  { id: 'int_chapel', type: 'interno', x: 5.8, y: UP, z: 19.4, yaw: 0, dormant: true },
  // ala cirúrgica superior e telhado
  ...WING_SPAWNS,
  ...PEDS_SPAWNS,
  ...MATERNITY_SPAWNS,
  ...DEAD_ARCHIVE_SPAWNS,
];

const SAINTS = { luzia: 'Santa Luzia', roque: 'São Roque', bras: 'São Brás', dimas: 'São Dimas' };

// gavetas do necrotério que abrem de verdade e o que há nelas
const DRAWER_NOTES = {
  5: 'Um corpo coberto. Etiqueta no pé: "Paciente 9".',
  13: 'Vazia — e funda demais. O fundo range, como se fosse oco.',
  20: 'Um saco de cinzas etiquetado "Paciente 12". Enfiada ao lado, uma bandagem.',
  26: 'Vazia. Cheira a cal.',
};

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
      g.inventory.addWeapon('machado'); g.player.setWeapon('machado'); g.inventory.weapon = 'machado';
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
    // Ala Leste: chave do necrotério (acorda o paciente do isolamento)
    this._pickup('morgue_key', { x: 33.2, y: UP + 1.0, z: -2.4 }, 'Pegar chave do necrotério', () => {
      this._giveItem('chave_necroterio'); this.q.set('hasMorgueKey');
      const w = g.enemies.find((e) => e.id === 'int_east');
      if (w && w.alive && w.dormant) { w.wake(); g.audio.play('groan', w.pos, { pitch: 0.9 }); }
    }, () => this._keyMesh(33.2, UP + 0.92, -2.45));
    // necrotério: bandagem escondida na gaveta 20 (só aparece com a gaveta aberta)
    this._pickup('band_morgue', { x: 22.75, y: LO + 1.0, z: 1.0 }, 'Pegar bandagem', () => this._giveItem('bandagem'), () => this._bandMesh(22.75, LO + 1.0, 0.95),
      () => L.drawers[20].open && L.drawers[20].t > 0.8);
    { const m = L.pickupMeshes.band_morgue, dg = L.drawers[20].g; dg.add(m); m.position.set(0.12, -0.12, -0.3); m.rotation.z = Math.PI / 2; }
    // câmara fria (área secreta): recompensa do Morais
    this._pickup('band_cold', { x: 23.3, y: LO + 0.9, z: -2.5 }, 'Pegar bandagens (×2)', () => { this.game.inventory.add('bandagem', 2); this.game.hud.toast('Bandagem ×2 obtida'); },
      () => { const gr = new THREE.Group(); gr.add(this._bandMesh(23.15, LO + 0.85, -2.55)); gr.add(this._bandMesh(23.4, LO + 0.85, -2.45)); return gr; });
    this._pickup('band_sc', { x: 23.5, y: LO + 0.9, z: 18.6 }, 'Pegar bandagem', () => this._giveItem('bandagem'), () => this._bandMesh(23.5, LO + 0.9, 18));

    // ---------- documentos ----------
    this._doc('ficha_elias', { x: 2.15, y: 0.7, z: 2.95 }, 2.15, 0.62, 2.95);
    this._doc('aviso_maquinas', { x: 37.4, y: 1.5, z: 17 }, 37.88, 1.5, 17, true);
    this._doc('relatorio_quarentena', { x: 31, y: LO + 0.85, z: 3.0 }, 30.7, LO + 0.82, 2.7);
    this._doc('prontuario_leste', { x: 29.2, y: UP + 0.95, z: -2.45 }, 29.2, UP + 0.91, -2.45);
    this._doc('registro_necroterio', { x: 16.8, y: LO + 0.9, z: 2.2 }, 16.8, LO + 0.86, 2.2);
    this._doc('carta_helena', { x: 22.6, y: LO + 0.85, z: -2.55 }, 22.6, LO + 0.81, -2.55);
    this._doc('diario_cirurgiao', { x: 23.5, y: LO + 0.9, z: 17 }, 23.5, LO + 0.88, 17);

    // ---------- livros de registro (save) ----------
    this._saveBook('book_ward', { x: 7.1, y: 0.9, z: -2.2 }, 7.1, 0.86, -2.45, 'ward_bed');
    this._saveBook('book_east', { x: 34.6, y: UP + 0.98, z: -2.45 }, 34.6, UP + 0.94, -2.45, 'east_ward');
    this._saveBook('book_yard', { x: 38.6, y: LO + 0.95, z: 25.6 }, 38.6, LO + 0.92, 24.8, 'yard');

    // ---------- portas comuns ----------
    for (const id of ['ward', 'shortcut', 'storage', 'machines', 'archive', 'arena', 'eastWard', 'eastLanding', 'morgue', 'laundry', 'furnace', 'serviceStair', 'secretaria', 'diretoria', 'chapel', ...WING_DOORS, ...PEDS_DOORS, ...MATERNITY_DOORS, ...DEAD_ARCHIVE_DOORS]) {
      const d = L.doors[id];
      g.interact.add({
        id: 'door_' + id, radius: 1.7,
        pos: { x: d.x, y: d.y + 1, z: d.z },
        prompt: () => (d.locked ? 'Abrir ' + d.label : d.open ? 'Fechar ' + d.label : 'Abrir ' + d.label),
        onInteract: () => this._useDoor(d),
      });
    }

    // ---------- gavetas do necrotério ----------
    for (const n of L.openableDrawers) {
      const dw = L.drawers[n], sl = L.drawerSlots[n];
      g.interact.add({ id: 'drawer_' + n, pos: { x: sl.x, y: sl.y, z: sl.z + 0.35 }, radius: 1.0,
        // com a bandagem ainda na bandeja, o foco vai para ela (não para a gaveta)
        enabled: () => !(n === 20 && dw.open && dw.t > 0.8 && !this.q.has('picked_band_morgue')),
        prompt: () => (this._canPushBack(n) ? 'Empurrar o fundo da gaveta 13' : (dw.open ? 'Fechar' : 'Abrir') + ' gaveta ' + n),
        onInteract: () => this._useDrawer(n) });
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

    this._setupAnnex();
    setupWing(this);
    setupPeds(this);
    setupMaternity(this);
    setupDeadArchive(this);
    this._applyState(save);
    applyWing(this, save);
    applyPeds(this, save);
    applyMaternity(this, save);
    applyDeadArchive(this, save);
  }

  // ---------- anexos: lavanderia, incinerador, administração, capela ----------
  _setupAnnex() {
    const g = this.game, L = this.level, M = g.materials;
    this._pickup('band_lav', { x: 3.0, y: LO + 1.2, z: 6.5 }, 'Pegar bandagem', () => this._giveItem('bandagem'), () => this._bandMesh(2.8, LO + 1.2, 6.5));
    this._doc('ordem_lavanderia', { x: 10.6, y: LO + 0.95, z: 5.6 }, 10.9, LO + 0.89, 5.6);
    this._doc('diario_forneiro', { x: 9.2, y: LO + 0.9, z: 15.0 }, 9.2, LO + 0.83, 15.0);
    // registro de gás: apaga/acende o incinerador (barulho alto; acorda a enfermeira entre os lençóis)
    g.interact.add({ id: 'gas_valve', pos: { x: 2.6, y: LO + 1.3, z: 12.5 }, radius: 1.5,
      prompt: () => (this.q.has('furnaceOff') ? 'Abrir o registro de gás' : 'Fechar o registro de gás do incinerador'),
      onInteract: () => this._toggleValve() });
    g.interact.add({ id: 'furnace_look', pos: { x: 3.4, y: LO + 0.8, z: 17 }, radius: 1.7,
      enabled: () => L.furnace.lit && !this.q.has('picked_stair_key'), prompt: 'Olhar dentro do incinerador',
      onInteract: () => {
        this.q.set('sawFurnaceKey');
        g.hud.toast('Entre as cinzas, um brilho de metal: uma chave de ferro. O fogo não deixa chegar perto — o gás deve vir de algum registro.', 5);
      } });
    this._pickup('stair_key', { x: 3.3, y: LO + 0.6, z: 17 }, 'Pegar chave de ferro nas cinzas', () => {
      this._giveItem('chave_escada'); this.q.set('hasStairKey');
      this.hint('stairKey', 'A etiqueta queimada diz <b>"SERV."</b> — a escada de serviço, no corredor do térreo.', 7);
    }, () => this._keyMesh(2.4, LO + 0.47, 17), () => !L.furnace.lit);
    // 2º andar
    this._pickup('band_sec', { x: 14.4, y: UP2 + 1.3, z: 19.4 }, 'Pegar bandagem', () => this._giveItem('bandagem'), () => this._bandMesh(14.4, UP2 + 1.45, 19.4));
    this._doc('lista_transferencia', { x: 21.3, y: UP2 + 0.85, z: 16.1 }, 21.3, UP2 + 0.77, 16.1);
    this._doc('memorando_diretoria', { x: 31.9, y: UP2 + 0.85, z: 15.8 }, 31.9, UP2 + 0.79, 15.8);
    this._pickup('planta_hospital', { x: 33.2, y: UP2 + 0.85, z: 15.9 }, 'Pegar planta do hospital', () => {
      this._giveItem('planta_hospital'); this.q.set('hasMapPlan');
      g.hud.toast('Planta do hospital obtida — o mapa (M) agora mostra as alas que você ainda não visitou.', 5);
    }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.01, 0.34), M.blueprint); m.position.set(33.2, UP2 + 0.79, 15.9); m.rotation.y = 0.2; return m; });
    this._saveBook('book_admin', { x: 36.6, y: UP2 + 0.95, z: 15.6 }, 36.6, UP2 + 0.9, 15.15, 'diretoria');
    // capela: hinário, velas e relicário
    this._doc('hino_capela', { x: 3.0, y: UP + 1.15, z: 21.2 }, 3.0, UP + 1.11, 21.25);
    this.candleSeq = [];
    for (const id in L.candles) {
      const c = L.candles[id];
      g.interact.add({ id: 'candle_' + id, pos: c.pos, radius: 1.3, enabled: () => !this.q.has('relicOpen') && !c.lit,
        prompt: 'Acender as velas de ' + SAINTS[id], onInteract: () => this._lightCandle(id) });
    }
    this._pickup('relic', { x: 6, y: UP + 1.35, z: 23.0 }, 'Pegar a medalha do relicário', () => {
      this._giveItem('medalha_sao_dimas'); this.q.set('maxHpUp'); this._applyMaxHp(); g.player.hp = g.player.maxHp;
      g.hud.toast('Medalha de São Dimas — vida máxima aumentada.', 4);
    }, () => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.015, 10), M.gold);
      m.rotation.x = Math.PI / 2; m.position.set(6, UP + 1.5, 23.1); m.visible = false; return m;
    }, () => this.q.has('relicOpen'));
  }
  _toggleValve() {
    const g = this.game, off = !this.q.has('furnaceOff');
    this.q.set('furnaceOff', off);
    if (off) this.q.set('furnaceWasOff');
    this._applyFurnace();
    const at = { x: 2.6, y: LO, z: 12.5 };
    g.audio.play('switch', at); g.audio.play(off ? 'thud' : 'power', at);
    g.perception.noise(at, 14, 'valve');
    const w = g.enemies.find((e) => e.id === 'enf_lav');
    if (w && w.alive && w.dormant) { w.wake(); g.audio.play('groan', w.pos, { pitch: 1.1 }); }
    g.hud.toast(off ? 'O registro range. Atrás da parede, o rugido do incinerador morre num chiado.' : 'O gás volta a correr. O incinerador acende com um sopro.');
  }
  _applyFurnace() {
    const L = this.level, off = this.q.has('furnaceOff');
    L.furnace.lit = !off;
    L.valveWheel.rotation.z = off ? Math.PI * 1.5 : 0;
  }
  _lightCandle(id) {
    const g = this.game, L = this.level, c = L.candles[id];
    const expected = CANDLE_ORDER[this.candleSeq.length];
    if (id !== expected) {
      this.candleSeq = [];
      for (const k in L.candles) { L.candles[k].lit = false; for (const f of L.candles[k].flames) f.visible = false; }
      g.audio.play('whisper', c.pos); g.audio.play('groan', { x: 5.8, y: UP, z: 19.4 }, { pitch: 0.8 });
      g.perception.noise({ x: c.pos.x, y: UP, z: c.pos.z }, 12, 'candle');
      this._wakeChapel();
      g.hud.toast('Um sopro frio apaga todas as velas de uma vez. Entre os bancos, alguém se levanta.', 4);
      return;
    }
    c.lit = true; for (const f of c.flames) f.visible = true;
    this.candleSeq.push(id);
    g.audio.play('pickup', c.pos);
    if (this.candleSeq.length === CANDLE_ORDER.length) {
      this.q.set('relicOpen'); L.relic.open = true;
      g.audio.play('clang', { x: 6, y: 1.2, z: 23 });
      g.hud.toast('As quatro chamas se curvam para o altar. O relicário se abre com um estalo.', 4);
    } else g.hud.toast('As velas de ' + SAINTS[id] + ' acendem.', 2);
  }
  _wakeChapel() {
    const g = this.game, w = g.enemies.find((e) => e.id === 'int_chapel');
    if (w && w.alive && w.dormant) { w.wake(); w.lastKnown = { x: g.player.pos.x, y: g.player.pos.y, z: g.player.pos.z }; }
  }
  _applyMaxHp() { const up = this.q.has('maxHpUp'), pl = this.game.player; pl.maxHp = up ? 125 : 100; pl.blessed = up; pl.hp = Math.min(pl.hp, pl.maxHp); }

  // ---------- helpers de criação ----------
  _axeMesh(x, y, z) {
    const M = this.game.materials, gr = new THREE.Group();
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.8, 0.045), M.woodDark); gr.add(h);
    const hd = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.17, 0.05), M.axeMetal); hd.position.set(0.1, 0.3, 0); gr.add(hd);
    gr.position.set(x, y, z); gr.rotation.z = 0.15; return gr;
  }
  _keyMesh(x, y, z) {
    const M = this.game.materials, gr = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.015, 0.07), M.axeMetal); gr.add(ring);
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.16), M.steel); shaft.position.z = 0.1; gr.add(shaft);
    const tag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, 0.05), M.paper); tag.position.set(0.07, 0, -0.03); gr.add(tag);
    gr.position.set(x, y, z); gr.rotation.y = 0.6; return gr;
  }
  _bandMesh(x, y, z) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 8), this.game.materials.bandage);
    m.position.set(x, y, z); return m;
  }
  _pickup(id, pos, prompt, give, meshFn, cond = null) {
    const g = this.game;
    const mesh = meshFn(); this.level.b.group.add(mesh); this.level.pickupMeshes[id] = mesh;
    g.interact.add({ id: 'pick_' + id, pos, radius: 1.4, prompt, enabled: () => !this.q.has('picked_' + id) && (!cond || cond()),
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

  _updateAnnex(dt) {
    const g = this.game, p = g.player.pos, L = this.level, q = this.q;
    // cômodos visitados (alimentam o mapa)
    this.roomT = (this.roomT || 0) - dt;
    if (this.roomT <= 0) {
      this.roomT = 0.2;
      const r = roomAt(p);
      if (r && !q.has('seen_' + r.id)) q.set('seen_' + r.id);
      this.room = r ? r.id : null;
    }
    const room = this.room;
    if (!this.tut.shown.map && q.has('leftWard')) this.hint('map', '<b>M</b>: mapa — cômodos visitados e portas trancadas que você anotou.', 6);
    const autosave = (flag, cp) => { q.set(flag); g.saveGame(cp); g.hud.toast('Progresso salvo automaticamente.'); };
    if (!q.has('enteredLaundry') && room === 'laundry' && p.x < 11.2) autosave('enteredLaundry', 'laundry');
    if (!q.has('enteredFurnace') && room === 'furnace' && p.z > 14.6) {
      q.set('enteredFurnace');
      if (L.furnace.lit) this.hint('heat', 'O <b>incinerador</b> queima quem chega perto da boca — inimigos também. Atraia-os para o calor.', 8);
    }
    if (!q.has('reachedAdmin') && p.y > 3.5 && room === 'adminCorridor') autosave('reachedAdmin', 'admin');
    if (!q.has('enteredChapel') && (room === 'chapel' || room === 'coro')) autosave('enteredChapel', 'chapel');
    if (!q.has('readHymn') && g.inventory.documents.includes('hino_capela')) q.set('readHymn');
    // inimigos adormecidos acordam com a proximidade
    for (const [id, r, fl] of [['enf_lav', 3.0, -3], ['int_chapel', 2.6, -1]]) {
      const w = g.enemies.find((e) => e.id === id);
      if (w && w.alive && w.dormant && Math.abs(p.y - w.pos.y) < 1.5 && Math.hypot(p.x - w.pos.x, p.z - w.pos.z) < r) { w.wake(); g.audio.play('groan', w.pos); }
    }
    // relicário aberto: a medalha aparece
    if (L.relic.open && !q.has('picked_relic')) L.pickupMeshes.relic.visible = true;
    // calor do incinerador: dano periódico a quem estiver diante da boca
    if (L.furnace.lit) {
      this.heatT = (this.heatT || 0) - dt;
      if (this.heatT <= 0) {
        this.heatT = 0.5;
        const hot = (o) => o.y < -3 && o.x < 4.3 && o.z > 15.6 && o.z < 18.4;
        const from = { x: 2.6, y: LO, z: 17 };
        if (hot(p) && g.player.hp > 0) { g.player.takeHit({ dmg: 5, from, blockable: false, knock: 2.2, source: 'fire' }); g.hud.toast('O calor queima!', 1); }
        for (const e of g.enemies) if (e.alive && hot(e.pos)) e.takeHit({ dmg: 6, poise: 3, heavy: false, from, point: { x: e.pos.x, y: e.pos.y + 1.2, z: e.pos.z } });
      }
    } else this.heatT = 0;
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
      if (d.id === 'eastLanding' && p.x > 16) {
        d.locked = false; d.setOpen(true); this.q.set('eastShortcutOpen');
        g.hud.toast('Você puxou o ferrolho. A Ala Leste agora dá para o patamar da escada.');
        return;
      }
      if (d.id === 'morgue' && g.inventory.has('chave_necroterio')) {
        g.inventory.remove('chave_necroterio');
        d.locked = false; d.setOpen(true); this.q.set('morgueUnlocked');
        g.audio.play('switch', d);
        g.hud.toast('A chave gira com esforço. O necrotério está aberto.');
        g.perception.noise(d, 7, 'door');
        return;
      }
      if (d.id === 'serviceStair' && g.inventory.has('chave_escada')) {
        g.inventory.remove('chave_escada');
        d.locked = false; d.setOpen(true); this.q.set('stairUnlocked');
        g.audio.play('switch', d);
        g.hud.toast('A chave de ferro, ainda morna, gira na fechadura. A escada sobe para a administração.');
        g.perception.noise(d, 7, 'door');
        return;
      }
      if (useDoorWing(this, d)) return;
      if (useDoorPeds(this, d)) return;
      if (useDoorMaternity(this, d)) return;
      if (useDoorDeadArchive(this, d)) return;
      if (d.id === 'chapel' && p.z > 14) {
        d.locked = false; d.setOpen(true); this.q.set('chapelShortcut');
        g.hud.toast('Você puxou a tranca. A capela agora dá para o corredor do térreo.');
        return;
      }
      this.q.set('note_' + d.id); // vai para as Anotações do inventário e para o mapa
      g.audio.play('locked', d); g.hud.toast(d.lockMsg); return;
    }
    d.setOpen(!d.open);
    g.perception.noise(d, 5, 'door');
  }

  // ---------- necrotério: gavetas e câmara secreta ----------
  _canPushBack(n) {
    return n === 13 && this.level.drawers[13].open && this.level.doors.coldRoom.locked && this.game.inventory.documents.includes('prontuario_leste');
  }
  _useDrawer(n) {
    const g = this.game, L = this.level, dw = L.drawers[n], sl = L.drawerSlots[n];
    const at = { x: sl.x, y: LO, z: sl.z + 0.5 };
    if (this._canPushBack(n)) {
      const d = L.doors.coldRoom;
      d.locked = false; d.setOpen(true); this.q.set('coldRoomOpen');
      g.audio.play('thud', d);
      g.perception.noise(at, 10, 'door');
      g.hud.toast('O fundo cede com um estalo. Ao lado das gavetas, um painel de azulejos desliza: a câmara fria do Morais.');
      return;
    }
    dw.open = !dw.open;
    this.q.set('drawer_' + n, dw.open);
    g.audio.play('door', at);
    // o rangido do trilho é alto: atrai quem estiver no necrotério e desperta o Rastejador
    g.perception.noise(at, 9, 'drawer');
    if (dw.open) {
      this._wakeCrawler();
      g.hud.toast(DRAWER_NOTES[n] + (n === 13 && g.inventory.documents.includes('prontuario_leste') ? ' (Empurre o fundo.)' : ''));
    }
  }
  _wakeCrawler() {
    const g = this.game, c = g.enemies.find((e) => e.id === 'ras_morgue');
    if (c && c.alive && c.dormant) {
      c.wake(); g.audio.play('groan', c.pos, { pitch: 0.7 });
      this.hint('crawler', 'Um <b>Rastejador</b>: baixo demais para golpes laterais. Use o <b>golpe forte</b> (botão direito), de cima para baixo, e cuidado com as mãos nos tornozelos.', 9);
    }
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
  _applyPower() { this.level.setPower(true); this.level.doors.eastWard.locked = false; }

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
    for (const n of L.openableDrawers) if (f['drawer_' + n]) { const dw = L.drawers[n]; dw.open = true; dw.t = 1; dw.g.position.z = dw.z + 0.62; }
    if (f.hasMorgueKey) { const w = g.enemies.find((e) => e.id === 'int_east'); if (w && w.alive) w.dormant = false; }
    if (f.gateOpen) { L.doors.gate.locked = false; L.doors.gate.setOpen(true, true); }
    // anexos
    this._applyFurnace();
    if (f.relicOpen) { L.relic.open = true; L.relic.t = 1; L.relic.lid.rotation.x = -1.9; for (const k in L.candles) { L.candles[k].lit = true; for (const fl of L.candles[k].flames) fl.visible = true; } }
    if (f.relicOpen && !f.picked_relic) L.pickupMeshes.relic.visible = true;
    this._applyMaxHp();
    for (const id of ['enf_lav']) if (f.furnaceWasOff) { const w = g.enemies.find((e) => e.id === id); if (w && w.alive) w.dormant = false; }
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
    // Ala Leste / necrotério: progressão opcional
    if (!this.q.has('enteredEast') && p.y > -1 && p.x > 16.3 && p.x < 38 && p.z > -3 && p.z < 9.5) this.q.set('enteredEast');
    if (!this.q.has('readEastChart') && g.inventory.documents.includes('prontuario_leste')) this.q.set('readEastChart');
    if (!this.q.has('enteredMorgue') && p.y < -3 && p.x > 16 && p.x < 26 && p.z > 0 && p.z < 9.4) {
      this.q.set('enteredMorgue'); g.saveGame('morgue'); g.hud.toast('Progresso salvo automaticamente.');
    }
    { const c = g.enemies.find((e) => e.id === 'ras_morgue');
      if (c && c.dormant && c.alive && p.y < -3 && Math.hypot(p.x - c.pos.x, p.z - c.pos.z) < 2.4) this._wakeCrawler(); }
    this._updateAnnex(dt);
    updateWing(this, dt);
    updatePedsScript(this, dt);
    updateMaternityScript(this, dt);
    updateDeadArchiveScript(this, dt);
    // descer pela escada (atalho da Ala Leste) também conta como chegar ao subsolo
    if (!this.q.has('reachedLower') && !E.moving && p.y < -4.5 && p.x < 40) { this.q.set('reachedLower'); g.saveGame('lower_hall'); }
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
