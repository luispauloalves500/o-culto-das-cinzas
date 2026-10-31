// Roteiro do Capítulo 5 — Águas Negras (primeira fatia): passagem do Relógio → Canal 3 (Afogados deitados no fundo,
// margens estreitas, passarela de tábuas; escombros fecham a margem sul) → galeria de serviço → casa de bombas
// (portão sem energia) → casa do comporteiro (fusível de cerâmica) → painel: fusível, disjuntores na ordem do
// relatório (BOMBA 2 → BOMBA 1 → COMPORTA) e chave geral → salão das bombas (escada retrátil) → mezanino →
// passarela do reservatório (válvula da comporta) → antecâmara das turbinas: a Afogada guarda as comportas.
// Fim da fatia: o chefe chega na próxima atualização. Reaproveita os helpers do roteiro do hospital.
import * as THREE from 'three';
import { HospitalScript } from '../hospital/HospitalScript.js';
import { Enemy } from '../../ai/EnemyController.js';
import { ammoMesh } from '../hospital/HospitalPedsScript.js';
import { GROUND, UPPER, PANEL_POS, VALVE, BREAKERS, BREAKER_ORDER, ANTE, TURBINES } from './AguasLevel.js';
import { roomAt } from '../../data/map.js';

const Y = GROUND, U = UPPER;
export const AGUAS_SPAWNS = [
  // canal: dois afogados deitados no fundo — emergem quando Elias passa perto da beira
  { id: 'afo_canal1', type: 'afogado', x: 12, y: -1.4, z: 16, yaw: Math.PI, dormant: true, submerged: true },
  { id: 'afo_canal2', type: 'afogado', x: 27, y: -1.4, z: 15.6, yaw: Math.PI, dormant: true, submerged: true },
  // margem norte: um afogado já em pé, arrastando os pés entre a escada de limpeza e a passarela
  { id: 'afo_margem', type: 'afogado', x: 12, y: Y, z: 20.6, yaw: Math.PI / 2, patrol: [{ x: 9.5, y: Y, z: 20.6 }, { x: 18, y: Y, z: 20.6 }] },
  // galeria de serviço: um cinzento da turma da noite
  { id: 'cin_galeria', type: 'cinzento', x: 26, y: Y, z: 20.8, yaw: Math.PI / 2, patrol: [{ x: 24, y: Y, z: 20.8 }, { x: 39, y: Y, z: 20.8 }] },
  // salão das bombas: encolhido junto ao arco do reservatório — o ronco das bombas o acorda
  { id: 'afo_poco', type: 'afogado', x: 34.5, y: Y, z: 44.6, yaw: Math.PI, dormant: true },
  // reservatório: no fundo, sob a passarela — a válvula o acorda
  { id: 'afo_res', type: 'afogado', x: 33, y: -1.2, z: 55, yaw: Math.PI, dormant: true, submerged: true },
  // antecâmara das turbinas: um acólito montando guarda diante das comportas
  { id: 'aco_turb', type: 'acolito', x: 35.5, y: U, z: 64.5, yaw: 0, patrol: [{ x: 31, y: U, z: 64.5 }, { x: 37.5, y: U, z: 63.5 }] },
];
const C5_DOORS = ['c5_hut', 'c5_ante', 'c5_panel', 'c5_gate', 'c5_catwalk', 'c5_turbine'];
// afogados submersos: acordam quando Elias chega a esta distância (xz) com a cabeça acima da linha da margem
export const C5_WAKE_RADIUS = 5.5;
export const C5_WATER_DPS = { dmg: 4, every: 1.2 };

export class AguasScript extends HospitalScript {
  constructor(game, level) {
    super(game, level);
    this.props = [];
    this.arenaDoorId = 'c5_arena';
    this.panelSeq = [];
    this.valveN = 0;
    this.waterT = 0;
  }

  setup(save) {
    const g = this.game, L = this.level, M = g.materials;
    for (const s of AGUAS_SPAWNS) {
      const e = new Enemy(g, s.type, s);
      g.enemies.push(e);
      if (save.deadEnemies.includes(s.id)) { e.submerged = false; e.pos.set(s.x, s.y, s.z); e.setDeadInstant(); }
    }

    // ---------- passagem e canal ----------
    this._doc('aviso_comporta', { x: 14.2, y: 1.5, z: 8.6 }, 13.62, 1.5, 8.6, true);
    this._pickup('c5_band_passage', { x: 16.0, y: 0.5, z: 5.5 }, 'Pegar bandagem', () => this._giveItem('bandagem'), () => this._bandMesh(16.0, 0.08, 5.5));
    // caixa de ferramentas atrás dos escombros (só pela água)
    this._pickup('c5_cache', { x: 39.8, y: 0.8, z: 11.1 }, 'Abrir a caixa de ferramentas', () => {
      g.inventory.add('municao_38', 6); g.inventory.add('bandagem', 1); this.q.set('c5_gotRubble');
      g.hud.toast(`Munição .38 ×6 (total ${g.inventory.count('municao_38')}) · Bandagem ×1`, 3);
    }, () => { const gr = new THREE.Group(); gr.add(ammoMesh(M, 39.6, 0.52, 10.6, 6)); gr.add(this._bandMesh(40.1, 0.52, 10.6)); return gr; });

    // ---------- casa do comporteiro ----------
    this._pickup('c5_fuse', { x: 7.3, y: 1.3, z: 24.7 }, 'Pegar fusível de cerâmica da caixa de reserva', () => {
      this._giveItem('fusivel_ceramico'); this.q.set('c5_hasFuse');
      this.hint('c5_fuse', 'Etiqueta: <b>"PAINEL DAS BOMBAS — 60 A"</b>. O painel fica na sala a oeste da antecâmara da casa de bombas.', 7);
    }, () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 8), M.paper); m.rotation.z = Math.PI / 2; m.position.set(7.62, 1.3, 24.7); return m; });
    this._pickup('c5_band_hut', { x: 2.2, y: 0.8, z: 27.1 }, 'Pegar bandagem', () => this._giveItem('bandagem'), () => this._bandMesh(2.2, 0.63, 27.1));

    // ---------- casa de bombas ----------
    this._doc('relatorio_bombeamento', { x: 32.2, y: 0.7, z: 27.2 }, 32.2, 0.47, 27.2);
    this._saveBook('c5_pumps_book', { x: 40.6, y: 0.95, z: 26.9 }, 40.6, 0.89, 26.9, 'c5_pumps');
    this._pickup('c5_ammo_ante', { x: 41.0, y: 1.0, z: 27.4 }, 'Pegar munição .38', () => {
      g.inventory.add('municao_38', 4); g.hud.toast(`Munição .38 ×4 (total ${g.inventory.count('municao_38')})`, 2.5);
    }, () => ammoMesh(M, 41.05, 0.87, 27.45, 4));
    // painel elétrico: soquete, três disjuntores e a chave geral
    const P = PANEL_POS;
    g.interact.add({ id: 'c5_socket', pos: { x: P.x + 0.5, y: P.y + 0.5, z: 24.2 }, radius: 1.3,
      enabled: () => !this.q.has('c5_fuseIn'),
      prompt: () => (g.inventory.has('fusivel_ceramico') ? 'Encaixar o fusível de cerâmica no soquete' : 'Examinar o soquete vazio do painel'),
      onInteract: () => this._useSocket() });
    BREAKERS.forEach((name, i) => g.interact.add({ id: 'c5_breaker' + i, pos: { x: P.x + 0.5, y: P.y, z: 24.8 + i * 0.5 }, radius: 1.1,
      enabled: () => !this.q.has('c5_power'),
      prompt: () => (this.panelSeq.includes(i) ? `Disjuntor ${name} (armado)` : `Armar o disjuntor ${name}`),
      onInteract: () => this._useBreaker(i) }));
    g.interact.add({ id: 'c5_mainLever', pos: { x: P.x + 0.5, y: P.y - 0.3, z: 26.0 }, radius: 1.1,
      enabled: () => !this.q.has('c5_power'), prompt: 'Puxar a chave geral', onInteract: () => this._useMain() });

    // ---------- reservatório: válvula da comporta ----------
    g.interact.add({ id: 'c5_valve', pos: { x: VALVE.x - 0.5, y: VALVE.y, z: VALVE.z }, radius: 1.5,
      enabled: () => !this.q.has('c5_sluiceOpen'),
      prompt: () => (this.q.has('c5_power') ? `Girar a válvula da comporta (${this.valveN}/3)` : 'Girar a válvula da comporta'),
      onInteract: () => this._useValve() });

    // ---------- antecâmara das turbinas ----------
    this._saveBook('c5_slice_book', { x: 38.6, y: U + 1.0, z: 66.8 }, 38.6, U + 0.99, 66.9, 'c5_slice');
    this._doc('diario_comporteiro', { x: 37.2, y: U + 1.0, z: 67.0 }, 37.2, U + 0.96, 67.0);
    this._pickup('c5_band_turb', { x: 27.0, y: U + 0.4, z: 61.2 }, 'Pegar bandagem', () => this._giveItem('bandagem'), () => this._bandMesh(27.0, U + 0.05, 61.2));

    // ---------- portas ----------
    for (const id of C5_DOORS) {
      const d = L.doors[id];
      g.interact.add({
        id: 'door_' + id, radius: id === 'c5_gate' || id === 'c5_turbine' ? 2.0 : 1.7,
        pos: { x: d.x, y: d.y + 1, z: d.z },
        enabled: () => !(id === 'c5_gate' && d.open),
        prompt: () => (id === 'c5_turbine' ? 'Abrir as comportas das turbinas'
          : d.locked ? 'Abrir ' + d.label : d.open ? 'Fechar ' + d.label : 'Abrir ' + d.label),
        onInteract: () => this._useDoor(d),
      });
    }

    this._applyState(save);
  }

  intro() {
    const f = this.q;
    if (f.has('c5_sliceDone')) return;
    this.game.hud.toast('Capítulo 5 — Águas Negras · estação de bombeamento', 4);
    this.hint('c5_intro', 'A passagem do Relógio desce até os <b>canais</b>. A água preta é rasa, mas <b>machuca</b> e a correnteza puxa. Os <b>afogados</b> ficam deitados no fundo: na beira são rápidos e batem forte; <b>no seco, arrastam os pés</b>.', 10);
  }

  // o brilho do livro entra no orçamento de luzes
  _saveBook(id, pos, x, y, z, checkpoint) {
    const sc = this.game.scene, before = new Set(sc.children);
    super._saveBook(id, pos, x, y, z, checkpoint);
    for (const o of sc.children) if (!before.has(o) && o.isPointLight) this.level.lights.all.push({ light: o, fixture: null, base: o.intensity });
  }

  _enemy(id) { return this.game.enemies.find((e) => e.id === id); }
  _wake(id, sound = 'groan') {
    const e = this._enemy(id);
    if (e && e.alive && e.dormant) { e.wake(); this.game.audio.play(sound, e.pos, { pitch: 0.6 }); return true; }
    return false;
  }

  // ---------- painel ----------
  _useSocket() {
    const g = this.game;
    if (!g.inventory.has('fusivel_ceramico')) {
      this.q.set('c5_sawSocket');
      g.audio.play('locked', PANEL_POS);
      g.hud.toast('O soquete do fusível principal está vazio. Sem ele, o painel não recebe nada. A Companhia guardava reservas em algum lugar.', 5);
      return;
    }
    g.inventory.remove('fusivel_ceramico');
    this.q.set('c5_fuseIn');
    this.level.fuseInPanel.visible = true;
    g.audio.play('switch', PANEL_POS);
    g.hud.toast('O fusível de cerâmica entra no soquete com um estalo seco. A lâmpada do painel não acende — falta armar os disjuntores.', 4.5);
  }
  _useBreaker(i) {
    const g = this.game, L = this.level;
    if (this.q.has('c5_power')) return;
    if (!this.q.has('c5_fuseIn')) { g.audio.play('switch', PANEL_POS); g.hud.toast(`O disjuntor ${BREAKERS[i]} desce e volta sozinho. Sem fusível, nada.`, 3.5); return; }
    if (this.panelSeq.includes(i)) { g.hud.toast(`${BREAKERS[i]} já está armado.`, 2); return; }
    const expected = BREAKER_ORDER[this.panelSeq.length];
    if (i !== expected) return this._shortCircuit(i);
    this.panelSeq.push(i); L.setBreaker(i, true);
    g.audio.play('switch', PANEL_POS);
    g.hud.toast(`Disjuntor ${BREAKERS[i]} armado (${this.panelSeq.length}/3).` + (this.panelSeq.length === 3 ? ' Falta a chave geral.' : ''), 3);
  }
  _shortCircuit(i) {
    const g = this.game, L = this.level;
    for (let k = 0; k < 3; k++) L.setBreaker(k, false);
    this.panelSeq = [];
    this.q.set('c5_shorted');
    g.audio.play('spark', PANEL_POS); g.combat.sparks({ x: PANEL_POS.x + 0.3, y: PANEL_POS.y, z: 25 }, 24);
    g.perception.noise(PANEL_POS, 12, 'metal');
    g.cameraCtl.addShake(0.25);
    g.player.envDamage?.(6);
    g.hud.toast(`O disjuntor ${BREAKERS[i]} estoura em faíscas e o painel desarma tudo. Fora de ordem — o relatório do turno devia dizer qual é a partida.`, 5);
  }
  _useMain() {
    const g = this.game;
    if (this.q.has('c5_power')) return;
    if (!this.q.has('c5_fuseIn')) { g.audio.play('locked', PANEL_POS); g.hud.toast('A chave geral desce até a metade e trava. O soquete do fusível está vazio.', 3.5); return; }
    if (this.panelSeq.length < 3) { g.audio.play('locked', PANEL_POS); g.hud.toast('A chave geral não fecha: os três disjuntores precisam estar armados antes.', 3.5); return; }
    this._powerOn();
  }
  _powerOn() {
    const g = this.game, L = this.level;
    this.q.set('c5_power');
    L.setPower(true);
    const gate = L.doors.c5_gate; gate.locked = false; gate.setOpen(true);
    g.audio.play('power', PANEL_POS); g.audio.play('elevator', { x: 44.5, y: 3, z: 36 });
    g.perception.noise({ x: 36, y: 0, z: 36 }, 18, 'metal');
    g.cameraCtl.addShake(0.3);
    this._wake('afo_poco');
    g.saveGame('c5_pumps');
    g.hud.toast('A chave geral fecha. As bombas roncam, as lâmpadas do salão acendem uma a uma e o portão de aço corre no trilho. Lá dentro, a escada retrátil desce. · progresso salvo', 6);
  }

  // ---------- válvula ----------
  _useValve() {
    const g = this.game, L = this.level;
    if (this.q.has('c5_sluiceOpen')) return;
    if (!this.q.has('c5_power')) { g.audio.play('locked', VALVE); g.hud.toast('O volante não gira: a comporta é servo-assistida e está sem energia.', 3.5); return; }
    this.valveN++;
    L.valveWheel.rotation.x += Math.PI * 0.66;
    g.audio.play('clang', VALVE); g.perception.noise(VALVE, 10, 'metal');
    if (this.valveN < 3) { g.hud.toast(`O volante range e cede um pouco (${this.valveN}/3).`, 2.5); return; }
    this.q.set('c5_sluiceOpen');
    L.raiseSluice();
    g.audio.play('splash', VALVE); g.audio.play('elevator', { x: 29.3, y: U + 1, z: 60 });
    g.cameraCtl.addShake(0.35);
    if (this._wake('afo_res', 'roar')) g.hud.toast('A comporta sobe pingando. Embaixo, a água do reservatório ferve — alguma coisa sobe do fundo.', 5);
    else g.hud.toast('A comporta sobe pingando. O caminho para as turbinas está aberto.', 4);
  }

  // ---------- portas ----------
  _useDoor(d) {
    const g = this.game;
    if (d.id === 'c5_turbine') return this._sliceEnd();
    if (d.locked && d.id === 'c5_gate') {
      this.q.set('note_' + d.id); this.q.set('c5_sawGate');
      g.audio.play('locked', d); g.hud.toast(d.lockMsg, 5); return;
    }
    if (d.locked) { this.q.set('note_' + d.id); g.audio.play('locked', d); g.hud.toast(d.lockMsg, 4); return; }
    d.setOpen(!d.open);
    g.perception.noise(d, 5, 'door');
  }
  // fim da primeira fatia: a Afogada guarda as comportas (o confronto vem na próxima atualização)
  _sliceEnd() {
    const g = this.game, d = this.level.doors.c5_turbine;
    g.audio.play('locked', d); g.audio.play('splash', { x: 33, y: U, z: 69 });
    if (!this.q.has('c5_sliceDone')) {
      this.q.set('c5_sliceDone');
      g.cameraCtl.addShake(0.2);
      g.saveGame('c5_slice');
      g.hud.toast('As comportas não cedem. Do outro lado, a água bate em compasso, como um coração — a Afogada guarda as comportas. (O confronto chega na próxima atualização.) · progresso salvo', 8);
    } else g.hud.toast(d.lockMsg + ' (O confronto chega na próxima atualização.)', 5);
  }

  _applyState(save) {
    const g = this.game, L = this.level, f = save.flags, pl = g.player;
    for (const id in save.doors) L.doors[id]?.restore(save.doors[id]);
    for (const k in f) if (k.startsWith('picked_') && L.pickupMeshes[k.slice(7)]) L.pickupMeshes[k.slice(7)].visible = false;
    if (f.c5_fuseIn) L.fuseInPanel.visible = true;
    if (f.c5_power) {
      L.setPower(true, true);
      this.panelSeq = [...BREAKER_ORDER]; for (let i = 0; i < 3; i++) L.setBreaker(i, true);
      L.doors.c5_gate.locked = false; L.doors.c5_gate.setOpen(true, true);
    } else { L.doors.c5_gate.locked = true; L.doors.c5_gate.setOpen(false, true); }
    if (f.c5_sluiceOpen) { L.raiseSluice(true); this.valveN = 3; }
    L.doors.c5_turbine.locked = true; L.doors.c5_turbine.setOpen(false, true);
    // quem já acordou não volta a deitar no fundo
    const up = (id) => { const e = this._enemy(id); if (e && e.alive) { e.dormant = false; e.submerged = false; e.emerging = 0; } };
    if (f.c5_wokeCanal1) up('afo_canal1');
    if (f.c5_wokeCanal2) up('afo_canal2');
    if (f.c5_power) up('afo_poco');
    if (f.c5_sluiceOpen) up('afo_res');
    this._applyMaxHp();
    pl.maxSt = f.hasAmulet ? 125 : 100; pl.st = Math.min(pl.st, pl.maxSt);
    pl.healAmount = f.hasBracelet ? 65 : 45;
    pl.sharpened = !!f.sharpened;
  }

  update(dt) {
    const g = this.game, p = g.player.pos, L = this.level;
    if (!this.tut.shown.move) this.hint('move', '<b>WASD</b>: mover · <b>Mouse</b>: câmera · <b>Shift</b>: correr (faz barulho)', 6);
    { const r = roomAt(p); if (r && !this.q.has('seen_' + r.id)) this.q.set('seen_' + r.id); }
    const docs = g.inventory.documents;
    if (!this.q.has('c5_readAviso') && docs.includes('aviso_comporta')) this.q.set('c5_readAviso');
    if (!this.q.has('c5_readRelatorio') && docs.includes('relatorio_bombeamento')) this.q.set('c5_readRelatorio');
    if (!this.q.has('c5_readDiario') && docs.includes('diario_comporteiro')) this.q.set('c5_readDiario');
    // saiu da passagem
    if (!this.q.has('c5_inCanal') && p.z > 10.3) {
      this.q.set('c5_inCanal');
      g.hud.toast('Canal 3. A água preta corre devagar para leste, e o cheiro de lodo sobe com o vapor.', 4);
    }
    // atravessou para a margem norte (pela passarela ou pela água)
    if (!this.q.has('c5_crossed') && p.z > 19.2 && p.y > -0.3 && p.z < 22.2) this.q.set('c5_crossed');
    // água: lenta, correnteza e dano contínuo
    const w = L.waterAt(p);
    if (w && g.player.alive !== false && g.player.hp > 0) {
      if (!this.q.has('c5_wetOnce')) {
        this.q.set('c5_wetOnce');
        this.hint('c5_water', 'A água preta <b>queima</b> a pele e a correnteza puxa. Saia pelas <b>escadas de limpeza</b> nas margens.', 6);
      }
      this.waterT -= dt;
      if (this.waterT <= 0) { this.waterT = C5_WATER_DPS.every; g.player.envDamage?.(C5_WATER_DPS.dmg); g.audio.play('splash', p, { volume: 0.4 }); }
    } else this.waterT = Math.min(this.waterT, 0.4);
    // afogados do canal emergem quando Elias chega perto da beira
    for (const [id, flag] of [['afo_canal1', 'c5_wokeCanal1'], ['afo_canal2', 'c5_wokeCanal2']]) {
      if (this.q.has(flag)) continue;
      const e = this._enemy(id);
      if (!e || !e.alive) { this.q.set(flag); continue; }
      if (p.y < 1 && Math.hypot(p.x - e.pos.x, p.z - e.pos.z) < C5_WAKE_RADIUS) {
        this.q.set(flag); e.wake(); g.audio.play('groan', e.pos, { pitch: 0.55 });
        if (!this.tut.shown.c5_afogado) this.hint('c5_afogado', 'Um <b>afogado</b> sobe do fundo. Perto da água ele é rápido e bate forte — <b>leve-o para o seco</b> (galeria, casas) antes de lutar.', 8);
      }
    }
    // casa de bombas: autosave na antecâmara
    if (!this.q.has('c5_inPumps') && p.x > ANTE.minX && p.x < ANTE.maxX && p.z > ANTE.minZ + 0.2 && p.z < ANTE.maxZ && p.y < 2) {
      this.q.set('c5_inPumps');
      if (!this.q.has('c5_power')) { g.saveGame('c5_pumps'); g.hud.toast('Casa de bombas · progresso salvo.', 3); }
    }
    // subiu ao mezanino
    if (!this.q.has('c5_upper') && p.y > U - 0.5 && p.z > 40 && p.z < 46.2) {
      this.q.set('c5_upper');
      g.hud.toast('Mezanino das bombas. Pela porta ao fundo, a passarela segue sobre o reservatório.', 4);
    }
    // antecâmara das turbinas
    if (!this.q.has('c5_inTurbines') && p.y > U - 0.5 && p.z > TURBINES.minZ + 0.3) {
      this.q.set('c5_inTurbines');
      g.hud.toast('Antecâmara das turbinas. O chão treme com cada golpe de água do outro lado das comportas.', 4);
    }
  }
}
