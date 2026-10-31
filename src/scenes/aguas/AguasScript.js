// Roteiro do Capítulo 5 — Águas Negras (primeira fatia): passagem do Relógio → Canal 3 (Afogados deitados no fundo,
// margens estreitas, passarela de tábuas; escombros fecham a margem sul) → galeria de serviço → casa de bombas
// (portão sem energia) → casa do comporteiro (fusível de cerâmica) → painel: fusível, disjuntores na ordem do
// relatório (BOMBA 2 → BOMBA 1 → COMPORTA) e chave geral → salão das bombas (escada retrátil) → mezanino →
// passarela do reservatório (válvula da comporta) → antecâmara das turbinas → comportas → SALÃO DAS TURBINAS:
// chefe A Afogada (poço d'água no meio; turbina, ralo de drenagem e grades de ferro a tiram da água) → galeria de
// descarga → fim do Capítulo 5. Reaproveita os helpers do roteiro do hospital.
import * as THREE from 'three';
import { HospitalScript } from '../hospital/HospitalScript.js';
import { Enemy } from '../../ai/EnemyController.js';
import { ammoMesh } from '../hospital/HospitalPedsScript.js';
import { GROUND, UPPER, PANEL_POS, VALVE, BREAKERS, BREAKER_ORDER, ANTE, TURBINES, ARENA, ARENA_BOUNDS, POOL, INTAKE, TURBINE_LEVER, DRAIN_VALVE, DISCHARGE } from './AguasLevel.js';
import { AfogadaBoss } from '../../ai/AfogadaBoss.js';
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
  // galeria de descarga: encolhido junto à grade do rio — acorda quando Elias entra na galeria
  { id: 'afo_descarga', type: 'afogado', x: 32.6, y: U, z: 98.2, yaw: Math.PI, dormant: true },
];
const C5_DOORS = ['c5_hut', 'c5_ante', 'c5_panel', 'c5_gate', 'c5_catwalk', 'c5_turbine', 'c5_exit'];
// máquinas do salão: recarga da turbina (s) e voltas do volante do ralo
export const C5_TURBINE_CD = 14;
export const C5_DRAIN_TURNS = 2;
export const AFOGADA_BODY = { x: 26.5, y: U, z: 71 };
// afogados submersos: acordam quando Elias chega a esta distância (xz) com a cabeça acima da linha da margem
export const C5_WAKE_RADIUS = 5.5;
export const C5_WATER_DPS = { dmg: 4, every: 1.2 };

export class AguasScript extends HospitalScript {
  constructor(game, level) {
    super(game, level);
    this.props = [];
    this.arenaDoorId = 'c5_turbine';
    this.bossActive = false;
    this.turbineCd = 0; this.drainN = 0;
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

    // ---------- salão das turbinas: A Afogada ----------
    this.boss = new AfogadaBoss(g, { x: (POOL.minX + POOL.maxX) / 2, y: POOL.bed, z: (POOL.minZ + POOL.maxZ) / 2, pool: POOL, bounds: ARENA_BOUNDS, intake: { x: INTAKE.x, y: POOL.bed, z: INTAKE.z } });
    g.boss = this.boss;
    if (save.flags.c5_afogadaDead) this.boss.setDeadAt(AFOGADA_BODY.x, AFOGADA_BODY.y, AFOGADA_BODY.z);
    g.interact.add({ id: 'c5_turbineLever', pos: { x: TURBINE_LEVER.x + 0.4, y: TURBINE_LEVER.y, z: TURBINE_LEVER.z }, radius: 1.6,
      enabled: () => this.bossActive && !L.poolDrained,
      prompt: () => (this.turbineCd > 0 ? 'Alavanca da turbina (recarregando…)' : 'Puxar a alavanca da turbina'),
      onInteract: () => this._useTurbine() });
    g.interact.add({ id: 'c5_drainValve', pos: { x: DRAIN_VALVE.x + 0.8, y: DRAIN_VALVE.y, z: DRAIN_VALVE.z }, radius: 1.5,
      enabled: () => this.bossActive && !L.poolDrained,
      prompt: () => `Girar o volante do ralo de drenagem (${this.drainN}/${C5_DRAIN_TURNS})`,
      onInteract: () => this._useDrain() });
    // galeria de descarga: ficha de remessa (gancho do Capítulo 6) e munição
    this._doc('ficha_remessa', { x: 34.0, y: U + 0.9, z: 95.9 }, 34.0, U + 0.72, 95.9);
    this._pickup('c5_ammo_desc', { x: 31.95, y: U + 0.5, z: 94.2 }, 'Pegar munição .38', () => {
      g.inventory.add('municao_38', 6); g.hud.toast(`Munição .38 ×6 (total ${g.inventory.count('municao_38')})`, 2.5);
    }, () => ammoMesh(M, 31.95, U + 0.02, 94.2, 6));

    // ---------- portas ----------
    for (const id of C5_DOORS) {
      const d = L.doors[id];
      g.interact.add({
        id: 'door_' + id, radius: id === 'c5_gate' || id === 'c5_turbine' ? 2.0 : 1.7,
        pos: { x: d.x, y: d.y + 1, z: d.z },
        enabled: () => !(id === 'c5_gate' && d.open),
        prompt: () => (id === 'c5_turbine' && !this.q.has('c5_gatesOpen') ? 'Abrir as comportas das turbinas'
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
    if (d.id === 'c5_turbine') {
      if (this.bossActive) { g.audio.play('locked', d); g.hud.toast('As comportas desceram e travaram. Enquanto a Afogada estiver viva, não sobem.', 3.5); return; }
      if (!this.q.has('c5_gatesOpen')) return this._openGates();
    }
    if (d.locked && d.id === 'c5_gate') {
      this.q.set('note_' + d.id); this.q.set('c5_sawGate');
      g.audio.play('locked', d); g.hud.toast(d.lockMsg, 5); return;
    }
    if (d.locked) { this.q.set('note_' + d.id); g.audio.play('locked', d); g.hud.toast(d.lockMsg, 4); return; }
    d.setOpen(!d.open);
    g.perception.noise(d, 5, 'door');
  }
  // as comportas sobem: o salão das turbinas (a Afogada) fica aberto
  _openGates() {
    const g = this.game, d = this.level.doors.c5_turbine;
    this.q.set('c5_gatesOpen'); this.q.set('c5_sliceDone');
    d.locked = false; d.setOpen(true);
    g.audio.play('elevator', d); g.audio.play('splash', { x: 33, y: U, z: 72 });
    g.cameraCtl.addShake(0.25);
    g.saveGame('c5_slice');
    g.hud.toast('As comportas sobem rangendo. Do outro lado, um salão alagado: no meio, o poço das turbinas, e a água bate em compasso, como um coração. · progresso salvo', 6);
  }

  // ---------- chefe: A Afogada ----------
  _startBoss() {
    const g = this.game, d = this.level.doors.c5_turbine;
    this.bossActive = true;
    d.setOpen(false); d.locked = true;
    g.hud.showBoss(true, 'A AFOGADA');
    g.audio.setIntensity(2);
    this.boss.activate();
    g.hud.toast('A água do poço se abre e uma mulher de cabelos compridos sobe, de vestido em farrapos. Lurdes — a Afogada. As comportas descem atrás de você.', 5);
    this.hint('c5_boss', 'Na água a Afogada é <b>a correnteza</b>: submersa é imune e quase não sente golpes. <b>Afaste-se da beira</b> para atraí-la ao seco, ou puxe a <b>alavanca da turbina</b> (leste) para prendê-la na grade. As <b>guelras</b> no pescoço são o ponto fraco.', 11);
  }
  _useTurbine() {
    const g = this.game, L = this.level;
    if (!this.bossActive || L.poolDrained) return;
    if (this.turbineCd > 0) { g.audio.play('locked', TURBINE_LEVER); g.hud.toast(`O motor da turbina ainda está se recuperando (${Math.ceil(this.turbineCd)} s).`, 2); return; }
    this.turbineCd = C5_TURBINE_CD;
    this.q.set('c5_usedTurbine');
    L.spinTurbine(3.5);
    g.audio.play('power', { x: INTAKE.x, y: U, z: 86 }); g.audio.play('switch', TURBINE_LEVER);
    g.perception.noise({ x: 33, y: U, z: 84 }, 14, 'metal');
    g.cameraCtl.addShake(0.3);
    const caught = this.boss.turbinePull();
    if (!caught) g.hud.toast('A turbina ronca e a água do poço gira em redemoinho — mas a Afogada não está dentro d\'água.', 3.5);
    else this.q.set('c5_pinnedOnce');
    // Elias dentro do poço também é puxado
    const p = g.player.pos;
    if (L.waterAt(p)) { g.player.envDamage?.(8); p.z = Math.min(p.z + 0.8, POOL.maxZ - 0.6); }
  }
  _useDrain() {
    const g = this.game, L = this.level, b = this.boss;
    if (!this.bossActive || L.poolDrained) return;
    if (b.phase < 2) {
      g.audio.play('locked', DRAIN_VALVE);
      g.hud.toast('O volante do ralo não se mexe: o lodo do fundo trava o registro. Quando a água se agitar de verdade, talvez ceda.', 4);
      this.q.set('c5_triedDrain');
      return;
    }
    this.drainN++;
    L.drainWheel.rotation.x += Math.PI * 0.7;
    g.audio.play('clang', DRAIN_VALVE); g.perception.noise(DRAIN_VALVE, 10, 'metal');
    if (this.drainN < C5_DRAIN_TURNS) { g.hud.toast(`O volante range e cede (${this.drainN}/${C5_DRAIN_TURNS}).`, 2.5); return; }
    this.q.set('c5_drained');
    L.drainPool();
    b.drain();
    g.audio.play('splash', { x: 28.5, y: POOL.bed, z: 78 }); g.audio.play('elevator', { x: 28.5, y: POOL.bed, z: 78 }, { dur: 4 });
    g.cameraCtl.addShake(0.35);
    if (b.state !== 'beached') g.hud.toast('O ralo se abre com um ronco e a água do poço escoa. Sem água, a Afogada não tem onde se esconder.', 4.5);
  }
  _bossDefeated() {
    const g = this.game, L = this.level;
    this.q.set('c5_afogadaDead'); this.bossActive = false;
    g.hud.showBoss(false); g.audio.setIntensity(0);
    const d = L.doors.c5_turbine; d.locked = false; d.setOpen(true);
    const ex = L.doors.c5_exit; ex.locked = false; ex.setOpen(true);
    g.audio.play('clang', ex);
    g.saveGame('c5_boss');
    g.hud.toast('A Afogada solta um último borbulhar e desaba. Por um instante, o rosto é só o de uma moça cansada. A corrente da portinhola norte cai na água. · progresso salvo', 7);
    this.hint('c5_exit', 'A <b>portinhola da descarga</b> (norte, atrás da turbina) abriu. A galeria segue para o rio — e para onde levaram Inês.', 8);
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
    // comportas das turbinas: abertas desde a fatia (saves antigos com c5_sliceDone entram destravados)
    const gates = L.doors.c5_turbine;
    if (f.c5_gatesOpen || f.c5_sliceDone) gates.locked = false;
    else { gates.locked = true; gates.setOpen(false, true); }
    const ex = L.doors.c5_exit;
    if (f.c5_afogadaDead) { ex.locked = false; ex.setOpen(true, true); gates.setOpen(true, true); }
    else { ex.locked = true; ex.setOpen(false, true); }
    // quem já acordou não volta a deitar no fundo
    const up = (id) => { const e = this._enemy(id); if (e && e.alive) { e.dormant = false; e.submerged = false; e.emerging = 0; } };
    if (f.c5_wokeCanal1) up('afo_canal1');
    if (f.c5_wokeCanal2) up('afo_canal2');
    if (f.c5_power) up('afo_poco');
    if (f.c5_sluiceOpen) up('afo_res');
    if (f.c5_wokeDescarga) up('afo_descarga');
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
    if (!this.q.has('c5_readFicha') && docs.includes('ficha_remessa')) this.q.set('c5_readFicha');
    this.turbineCd = Math.max(0, this.turbineCd - dt);
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
    // salão das turbinas: a Afogada sobe do poço
    if (!this.bossActive && !this.q.has('c5_afogadaDead') && p.z > ARENA.minZ + 1.2 && p.z < ARENA.maxZ && p.y > U - 1 && p.x > ARENA.minX && p.x < ARENA.maxX) this._startBoss();
    if (this.bossActive && this.boss.phase >= 2 && !this.tut.shown.c5_drain) this.hint('c5_drain', 'O volante do <b>ralo de drenagem</b> (parede oeste) rangeu. <b>Esvazie o poço</b>: sem água, a Afogada encalha e não mergulha mais.', 8);
    if (this.bossActive && this.boss.phase >= 3 && !this.tut.shown.c5_grates) this.hint('c5_grates', 'Ela investe sem parar: fique atrás das <b>grades de ferro</b> ou da <b>carcaça da turbina</b> — o choque a atordoa e abre as guelras.', 8);
    // morte real da Afogada
    if (this.bossActive && this.boss.state === 'dead' && !this.q.has('c5_afogadaDead')) this._bossDefeated();
    // galeria de descarga
    if (!this.q.has('c5_wokeDescarga') && p.z > DISCHARGE.minZ + 1.5 && p.y > U - 1) {
      this.q.set('c5_wokeDescarga');
      if (this._wake('afo_descarga')) g.hud.toast('Galeria de descarga. Junto à grade do rio, um vulto encharcado se levanta.', 4);
    }
    // fim do Capítulo 5: a descarga para o rio
    if (!this._ended && this.q.has('c5_afogadaDead') && p.z > DISCHARGE.endZ && p.y > U - 1 && p.x > DISCHARGE.minX - 0.5 && p.x < DISCHARGE.maxX + 0.5) {
      this._ended = true;
      this.q.set('c5_chapterDone'); this.q.set('ch5Done');
      g.saveGame('c5_end');
      g.endChapter();
    }
  }
}
