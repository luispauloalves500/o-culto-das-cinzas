// Roteiro do Capítulo 7 — Sob a Pedra: pé da escada do alçapão (fechado por cima) → galeria de pedra
// (pé de cabra no carrinho da Companhia) → grade rangente do ossuário → ossuário: os emparedados nos nichos são cegos e
// acordam com barulho (passo correndo, golpe, tiro, porta — e os ossos do chão, que estalam a cada passo); a pedra ecoa
// (acústica por área) → grade do fundo com cadeado de crânio → cripta: a tampa do jazigo do coveiro-mor só sai com o pé
// de cabra (barulho alto: acorda quem dorme no nicho da cripta) → chave + recado de Inês → grade do fundo → túnel →
// plataforma da Estação Sé Velha (save; acólito de ronda; quadro da Linha Velha) → escada de manutenção → trilhos →
// túnel leste (save c7_slice) → grade acorrentada (pé de cabra) → Linha Velha: cascalho que range sob os pés, dois
// nichos → cabine de sinalização (guia de remoção do Vigia; agulhas I·II·III + SINAL: combinação certa ergue a grade
// levadiça da estação, errada toca a sineta do túnel e acorda os nichos) → Estação Sob a Pedra: a parede de cal do leste
// se rompe e o VIGIA CAIADO (chefe final, cego, caça pelo ouvido) sai; sinetas como isca, pilares de ferro e o vagão
// funerário para as investidas às cegas → chave da escada no corpo → escada de serviço para a Usina (fim do capítulo).
// Atalho: o corredor de serviço da plataforma volta ao poço (o ferrolho só abre do lado do corredor).
import * as THREE from 'three';
import { HospitalScript } from '../hospital/HospitalScript.js';
import { Enemy } from '../../ai/EnemyController.js';
import { ammoMesh } from '../hospital/HospitalPedsScript.js';
import { GROUND, TRACK_Y, SHAFT, OSSUARY, CRYPT, PLATFORM, TRACKS, LADDER, TOOL_CART, JAZIGO, NICHES, boneAt,
  LINE_GATE, LINE, CABIN, LEVERS, SIGNAL_LEVER, SWITCH_CODE, LINE_BELL, PORTCULLIS, SOB, SOB_BELLS, ATRIL, STAIR, VIGIA_NICHE, gravelAt } from './PedraLevel.js';
import { VigiaCaiadoBoss, CAIADO_BOUNDS } from '../../ai/VigiaCaiadoBoss.js';
import { roomAt } from '../../data/map.js';
import { DOCUMENTS } from '../../data/documents.js';

const Y = GROUND;
export const PEDRA_SPAWNS = [
  // ossuário: três irmãos da vigília emparedados nos nichos (dormentes; acordam com barulho)
  { id: 'c7_emp1', type: 'emparedado', x: 11.5, y: Y, z: 20.5, yaw: Math.PI / 2, dormant: true, niche: 'nW1' },
  { id: 'c7_emp2', type: 'emparedado', x: 24.5, y: Y, z: 29.5, yaw: -Math.PI / 2, dormant: true, niche: 'nE2' },
  { id: 'c7_emp3', type: 'emparedado', x: 11.5, y: Y, z: 27, yaw: Math.PI / 2, dormant: true, niche: 'nW2' },
  // cripta: o nicho ao lado do jazigo (a tampa arrastada o acorda)
  { id: 'c7_emp4', type: 'emparedado', x: 3.5, y: Y, z: 33.5, yaw: Math.PI / 2, dormant: true, niche: 'nC' },
  // ossuário: um já solto (o nicho vazio a leste), rondando a nave do fundo, diante da grade e da porta da cripta
  { id: 'c7_emp5', type: 'emparedado', x: 22.2, y: Y, z: 33.6, yaw: -Math.PI / 2,
    patrol: [{ x: 22.2, y: Y, z: 33.6 }, { x: 13.8, y: Y, z: 33.5 }] },
  // plataforma: acólito da Irmandade de vigia na estação
  { id: 'c7_aco1', type: 'acolito', x: 28, y: Y, z: 48.4, yaw: Math.PI / 2,
    patrol: [{ x: 24, y: Y, z: 48.4 }, { x: 36, y: Y, z: 48.4 }, { x: 36, y: Y, z: 45.6 }, { x: 24, y: Y, z: 45.6 }] },
  // Linha Velha: dois nichos nas paredes do túnel (o cascalho do lado deles range)
  { id: 'c7_emp6', type: 'emparedado', x: 59, y: TRACK_Y, z: 55.7, yaw: Math.PI, dormant: true, niche: 'nL1' },
  { id: 'c7_emp7', type: 'emparedado', x: 72, y: TRACK_Y, z: 49.5, yaw: 0, dormant: true, niche: 'nL2' },
  // Estação Sob a Pedra: os "irmãos" de guarda do Vigia — o grito dele (fase 2) os chama
  { id: 'c7_emp8', type: 'emparedado', x: 77.5, y: TRACK_Y, z: 45.6, yaw: Math.PI / 2, dormant: true, niche: 'nS1', arena: true },
  { id: 'c7_emp9', type: 'emparedado', x: 77.5, y: TRACK_Y, z: 59.6, yaw: Math.PI / 2, dormant: true, niche: 'nS2', arena: true },
];
const C7_DOORS = ['c7_service', 'c7_gate', 'c7_ossGate', 'c7_corridor', 'c7_cabin', 'c7_stairs'];
// cascalho do leito dos trilhos: como os ossos (um estalo por passo; correndo, mais alto)
export const C7_GRAVEL_NOISE = { walk: 4, run: 9 };
export const C7_CHAIN_NOISE = 5;     // o elo arrebentado da grade da Linha Velha
export const C7_ALARM_NOISE = 12;    // sineta do túnel (sinal errado na cabine)
export const C7_BELL_NOISE = 14;     // sinetas da estação (isca para o Vigia)
export const C7_BELL_CD = 3;         // a sineta precisa parar de balançar
export const C7_ARENA_X = 80.5;      // passou daqui, a parede de cal se rompe
// ossos: um estalo a cada C7_BONE_STEP metros andados em cima (correndo, mais alto)
export const C7_BONE_STEP = 0.7;
export const C7_BONE_NOISE = { walk: 4.5, run: 9 };
// barulhos de cenário (raio base; a acústica da área multiplica)
export const C7_GATE_NOISE = 8;     // a grade rangente do ossuário
export const C7_PRY_NOISE = 10;     // a tampa de pedra do jazigo arrastada

export class PedraScript extends HospitalScript {
  constructor(game, level) {
    super(game, level);
    this._boneLast = null;
    this._boneAcc = 0;
    this._gravelLast = null;
    this._gravelAcc = 0;
    this.arenaDoorId = 'c7_arena';
    this.bossActive = false;
    this.bellCd = { n: 0, s: 0 };
  }

  setup(save) {
    const g = this.game, L = this.level, M = g.materials;
    for (const s of PEDRA_SPAWNS) {
      const e = new Enemy(g, s.type, s);
      g.enemies.push(e);
      if (save.deadEnemies.includes(s.id)) { e.pos.set(s.x, s.y, s.z); e.setDeadInstant(); }
    }

    // ---------- poço da escada ----------
    g.interact.add({ id: 'c7_ladder', pos: { x: LADDER.x, y: 1.2, z: 0.9 }, radius: 1.3, prompt: 'Subir a escada do alçapão',
      onInteract: () => { g.audio.play('locked', { x: LADDER.x, y: 3, z: 0.5 }); g.hud.toast('Lá em cima, o alçapão da reserva técnica está fechado — e alguém passou a tranca por cima. Só resta descer.', 4.5); } });
    this._saveBook('c7_ladder_book', { x: 20.6, y: 1.2, z: 3.9 }, 20.6, 0.94, 4.9, 'c7_ladder');
    this._pickup('c7_band_shaft', { x: 14.9, y: 1.0, z: 4.6 }, 'Pegar bandagem', () => this._giveItem('bandagem'), () => this._bandMesh(14.85, 0.75, 5.2));

    // ---------- galeria de pedra: o pé de cabra ----------
    this._pickup('c7_crowbar', { x: TOOL_CART.x - 0.6, y: 1.0, z: TOOL_CART.z }, 'Pegar o pé de cabra do carrinho', () => {
      g.inventory.add('pe_de_cabra'); this.q.set('c7_hasCrowbar');
      g.hud.toast('Pé de cabra obtido — serve de alavanca em tampas e lajes pesadas.', 3.5);
    }, () => this._crowbarMesh(TOOL_CART.x, Y + 0.88, TOOL_CART.z - 0.3));

    // ---------- ossuário ----------
    this._doc('registro_coveiro', { x: 17.25, y: 1.2, z: 18.2 }, 17.25, 1.08, 17.45);
    // ---------- cripta ----------
    this._pickup('c7_ammo_crypt', { x: 6.7, y: 1.0, z: 33.2 }, 'Pegar munição .38', () => {
      g.inventory.add('municao_38', 4); g.hud.toast(`Munição .38 ×4 (total ${g.inventory.count('municao_38')})`, 2.5);
    }, () => ammoMesh(M, 6.7, Y + 0.95, 31.5, 4));
    g.interact.add({ id: 'c7_pry', pos: { x: JAZIGO.use.x, y: 1.0, z: JAZIGO.use.z }, radius: 1.4,
      enabled: () => !this.q.has('c7_cryptOpen'),
      prompt: () => (g.inventory.has('pe_de_cabra') ? 'Forçar a tampa do jazigo com o pé de cabra' : 'Empurrar a tampa do jazigo'),
      onInteract: () => this._pryJazigo() });
    this._pickup('c7_jazigo', { x: JAZIGO.use.x, y: 1.0, z: JAZIGO.use.z }, 'Revistar o coveiro-mor', () => {
      g.inventory.add('chave_coveiro'); this.q.set('c7_hasKey');
      g.inventory.addDocument('recado_ines_pedra'); g.openDocument('recado_ines_pedra');
      g.hud.toast('Chave do coveiro-mor obtida.', 3);
    }, () => this._keyMesh(JAZIGO.maxX - 0.5, Y + 0.95, JAZIGO.z + 0.1), () => this.q.has('c7_cryptOpen'));

    // ---------- estação ----------
    this._saveBook('c7_platform_book', { x: 8.4, y: 1.2, z: 45.6 }, 8.4, 1.04, 44.6, 'c7_platform');
    this._wallDoc('quadro_linha_velha', 13.4, 1.6, PLATFORM.minZ + 0.12);
    this._pickup('c7_band_platform', { x: 22.5, y: 0.8, z: 45.4 }, 'Pegar bandagem', () => this._giveItem('bandagem'), () => this._bandMesh(22.5, 0.5, 44.6));
    g.interact.add({ id: 'c7_lineGate', pos: { x: 47.6, y: TRACK_Y + 1, z: 52.6 }, radius: 1.6,
      enabled: () => !this.q.has('c7_lineOpen'),
      prompt: () => (g.inventory.has('pe_de_cabra') ? 'Arrebentar a corrente da grade com o pé de cabra' : 'Examinar a grade da Linha Velha'),
      onInteract: () => this._breakChain() });

    // ---------- Linha Velha e cabine de sinalização ----------
    this._pickup('c7_ammo_refuge', { x: 66.4, y: TRACK_Y + 1, z: 55.6 }, 'Pegar munição .38', () => {
      g.inventory.add('municao_38', 6); g.hud.toast(`Munição .38 ×6 (total ${g.inventory.count('municao_38')})`, 2.5);
    }, () => ammoMesh(M, 66.4, TRACK_Y + 0.05, 56.0, 6));
    this._pickup('c7_band_refuge', { x: 67.2, y: TRACK_Y + 1, z: 55.6 }, 'Pegar bandagem', () => this._giveItem('bandagem'), () => this._bandMesh(67.2, TRACK_Y + 0.05, 56.0));
    this._saveBook('c7_cabin_book', { x: 64.3, y: TRACK_Y + 1.2, z: 48.8 }, 65.3, TRACK_Y + 0.89, 48.8, 'c7_line');
    this._doc('guia_remocao_vigia', { x: 61.6, y: TRACK_Y + 1.2, z: 48.6 }, 60.6, TRACK_Y + 1.61, 48.6);
    this._plaque('placa_agulhas', 65.97, TRACK_Y + 1.5, 47.1, -Math.PI / 2, { x: 65.5, z: 47.1 });
    for (const Lv of LEVERS) g.interact.add({ id: 'c7_lever_' + Lv.id, pos: { x: Lv.x, y: TRACK_Y + 1, z: 46.4 }, radius: 0.75,
      prompt: () => `Agulha ${Lv.id}: ${this._sw(Lv.id) === 'R' ? 'empurrar a alavanca (N)' : 'puxar a alavanca (R)'}`, onInteract: () => this._throwLever(Lv.id) });
    g.interact.add({ id: 'c7_signal', pos: { x: SIGNAL_LEVER.x, y: TRACK_Y + 1, z: 46.4 }, radius: 0.75,
      enabled: () => !this.q.has('c7_portOpen'),
      prompt: () => `Puxar a alavanca do SINAL (agulhas ${this._code()})`, onInteract: () => this._pullSignal() });

    // ---------- Estação Sob a Pedra ----------
    this._doc('ata_primeira_cinza', { x: ATRIL.x - 0.9, y: TRACK_Y + 1.2, z: ATRIL.z }, ATRIL.x, TRACK_Y + 1.13, ATRIL.z);
    this._pickup('c7_ammo_station', { x: 80.2, y: TRACK_Y + 1, z: 43.4 }, 'Pegar munição .38', () => {
      g.inventory.add('municao_38', 4); g.hud.toast(`Munição .38 ×4 (total ${g.inventory.count('municao_38')})`, 2.5);
    }, () => ammoMesh(M, 80.6, TRACK_Y + 0.05, 42.6, 4));
    for (const B of SOB_BELLS) g.interact.add({ id: 'c7_bell_' + B.id, pos: { x: B.lever.x + 0.6, y: TRACK_Y + 1, z: B.lever.z }, radius: 1.1,
      enabled: () => this.bellCd[B.id] <= 0, prompt: 'Puxar a alavanca da sineta', onInteract: () => this._ringBell(B.id) });
    this.boss = new VigiaCaiadoBoss(g, { x: VIGIA_NICHE.x, y: TRACK_Y, z: VIGIA_NICHE.z, yaw: -Math.PI / 2, out: VIGIA_NICHE.out, bounds: CAIADO_BOUNDS });
    g.boss = this.boss;
    this._bodyPos = { x: 92, y: TRACK_Y + 0.8, z: 56.4 };
    if (save.flags.c7_vigiaDead) {
      const bp = save.flags.c7_bodyAt || { x: 92, z: 56.4 };
      this._bodyPos.x = bp.x; this._bodyPos.z = bp.z;
      this.boss.setDeadAt(bp.x, TRACK_Y, bp.z);
    }
    this._pickup('c7_stairKey', this._bodyPos, 'Revistar o casaco do Vigia', () => {
      g.inventory.add('chave_escada_usina'); this.q.set('c7_hasStairKey');
      g.hud.toast('Chave de ferro da escada de serviço — presa ao gancho do Vigia por um arame, com uma etiqueta: "USINA".', 4);
    }, () => this._keyMesh(this._bodyPos.x, TRACK_Y + 0.05, this._bodyPos.z), () => this.q.has('c7_vigiaDead'));
    // ---------- corredor de serviço ----------
    this._pickup('c7_ammo_service', { x: 37.9, y: 1.0, z: 20 }, 'Pegar munição .38', () => {
      g.inventory.add('municao_38', 6); g.hud.toast(`Munição .38 ×6 (total ${g.inventory.count('municao_38')})`, 2.5);
    }, () => ammoMesh(M, 39, Y + 0.85, 20, 6));

    // ---------- portas ----------
    for (const id of C7_DOORS) {
      const d = L.doors[id];
      g.interact.add({
        id: 'door_' + id, radius: id === 'c7_gate' || id === 'c7_ossGate' ? 2.0 : 1.7,
        pos: { x: d.x, y: d.y + 1, z: d.z },
        prompt: () => (id === 'c7_service' && d.locked ? (g.player.pos.x > SHAFT.maxX ? 'Puxar o ferrolho da porta de serviço' : 'Abrir a porta de serviço')
          : d.locked ? 'Abrir ' + d.label : d.open ? 'Fechar ' + d.label : 'Abrir ' + d.label),
        onInteract: () => this._useDoor(d),
      });
    }

    this._applyState(save);
  }

  intro() {
    if (this.q.has('c7_inOssuary')) return;
    this.game.hud.toast('Capítulo 7 — Sob a Pedra · catacumbas sob o Museu', 4);
    this.hint('c7_intro', 'A escada do alçapão terminou num <b>poço de pedra</b>. Aqui embaixo <b>o som corre longe</b>: a pedra ecoa, e quem mora nas paredes <b>escuta</b>.', 10);
  }

  // o brilho do livro entra no orçamento de luzes
  _saveBook(id, pos, x, y, z, checkpoint) {
    const sc = this.game.scene, before = new Set(sc.children);
    super._saveBook(id, pos, x, y, z, checkpoint);
    for (const o of sc.children) if (!before.has(o) && o.isPointLight) this.level.lights.all.push({ light: o, fixture: null, base: o.intensity });
  }
  /** documento pregado numa parede ao longo de X (placa voltada para +z) */
  _wallDoc(id, x, y, z) {
    const g = this.game;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.03), g.materials.paper); m.position.set(x, y, z); this.level.b.group.add(m);
    g.interact.add({ id: 'doc_' + id, pos: { x, y: 1.2, z: z + 0.8 }, radius: 1.4, prompt: 'Ler: ' + DOCUMENTS[id].title,
      onInteract: () => { g.inventory.addDocument(id); g.openDocument(id); } });
  }
  _crowbarMesh(x, y, z) {
    const M = this.game.materials, gr = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.75), M.rust); gr.add(bar);
    const claw = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.1, 0.035), M.rust); claw.position.set(0, 0.04, 0.37); claw.rotation.x = 0.5; gr.add(claw);
    gr.position.set(x, y, z); gr.rotation.y = 0.25; return gr;
  }
  _enemy(id) { return this.game.enemies.find((e) => e.id === id); }
  /** placa pregada numa parede qualquer (rotY = para onde a face aponta); ipos = de onde se lê */
  _plaque(id, x, y, z, rotY, ipos) {
    const g = this.game;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.03), g.materials.paper); m.position.set(x, y, z); m.rotation.y = rotY; this.level.b.group.add(m);
    g.interact.add({ id: 'doc_' + id, pos: { x: ipos.x, y: y - 0.3, z: ipos.z }, radius: 1.1, prompt: 'Ler: ' + DOCUMENTS[id].title,
      onInteract: () => { g.inventory.addDocument(id); g.openDocument(id); } });
  }

  // ---------- grade da Linha Velha ----------
  _breakChain() {
    const g = this.game, q = this.q, pos = { x: LINE_GATE.x - 0.2, y: TRACK_Y, z: LINE_GATE.z };
    q.set('c7_sawLineGate');
    if (!g.inventory.has('pe_de_cabra')) {
      g.audio.play('locked', pos);
      g.hud.toast('Corrente nova num cadeado com a chama da Irmandade. Do outro lado, os trilhos descem no escuro — e um vento quente sobe, cheirando a cinza.', 5);
      return;
    }
    if (!this.level.openLineGate()) return;
    q.set('c7_lineOpen');
    g.audio.play('clang', pos); g.audio.play('door', pos);
    g.perception.noise(pos, C7_CHAIN_NOISE, 'metal');
    g.hud.toast('O pé de cabra torce um elo até ele estourar. A corrente cai nos trilhos e a grade se abre, rangendo, para a Linha Velha.', 4.5);
    this.hint('c7_gravel', 'No leito da Linha Velha há <b>cascalho solto</b> (manchas claras): ele <b>range</b> — e há nichos nas paredes. Ande pela <b>faixa limpa</b>, do lado oposto ao nicho.', 9);
  }

  // ---------- cabine de sinalização: agulhas + sinal ----------
  _sw(id) { return this.q.has('c7_sw_' + id) ? 'R' : 'N'; }
  _code() { return LEVERS.map((l) => this._sw(l.id)).join('·'); }
  _throwLever(id) {
    const g = this.game, Lv = LEVERS.find((l) => l.id === id), next = this._sw(id) === 'R' ? 'N' : 'R';
    this.q.set('c7_sw_' + id, next === 'R');
    this.level.setLever(id, next);
    g.audio.play('switch', { x: Lv.x, y: TRACK_Y + 1, z: Lv.z });
    g.perception.noise({ x: Lv.x, y: TRACK_Y, z: Lv.z }, 2.5, 'metal');
    g.hud.toast(`Agulha ${id}: ${next === 'R' ? 'reversa (R)' : 'normal (N)'} · quadro ${this._code()}`, 2.2);
  }
  _pullSignal() {
    const g = this.game, q = this.q, L = this.level;
    if (q.has('c7_portOpen')) return;
    L.setLever('S', 'R'); setTimeout(() => L.setLever('S', 'N'), 700);
    g.audio.play('switch', SIGNAL_LEVER);
    const ok = LEVERS.every((l) => this._sw(l.id) === SWITCH_CODE[l.id]);
    if (ok) {
      q.set('c7_portOpen');
      L.setPortcullis(true);
      const pp = { x: PORTCULLIS.x, y: TRACK_Y + 1, z: 52.6 };
      g.audio.play('elevator', pp); g.perception.noise({ x: PORTCULLIS.x, y: TRACK_Y, z: 52.6 }, 6, 'metal');
      g.hud.toast('A lâmpada do SINAL fica verde. Lá no fim do túnel, correntes rangem: a grade levadiça da quarta estação está subindo.', 5);
      return;
    }
    // combinação errada: a sineta de alarme do túnel toca (barulho real — os nichos ouvem)
    q.set('c7_wrongSignal', (q.flags.c7_wrongSignal || 0) + 1);
    L.ringBell('line');
    g.audio.play('chime', { x: LINE_BELL.x, y: TRACK_Y + 2.6, z: LINE_BELL.z }, { vol: 1 });
    g.perception.noise({ x: LINE_BELL.x, y: TRACK_Y, z: LINE_BELL.z }, C7_ALARM_NOISE, 'bell');
    g.hud.toast(`O sinal não abre (agulhas ${this._code()}). Em vez disso, uma sineta de alarme dispara lá fora, no túnel — e a pedra leva o som.`, 5);
    this.hint('c7_switch', 'Cada agulha vai para uma estação. A <b>guia de remoção</b> diz como estavam I e II; o <b>quadro da Linha Velha</b> (plataforma) guarda a coluna das agulhas. Monte a quarta estação e puxe o SINAL.', 10);
  }

  // ---------- sinetas da estação: isca de barulho ----------
  _ringBell(id) {
    const g = this.game, B = SOB_BELLS.find((b) => b.id === id);
    if (this.bellCd[id] > 0) return;
    this.bellCd[id] = C7_BELL_CD;
    this.level.ringBell(id);
    this.q.set('c7_rangBell');
    g.audio.play('switch', B.lever);
    g.audio.play('chime', { x: B.bell.x, y: TRACK_Y + 5.5, z: B.bell.z }, { vol: 1 });
    // o som é do sino lá no canto leste (no chão da estação, onde o Vigia escuta)
    g.perception.noise({ x: B.bell.x, y: TRACK_Y, z: B.bell.z }, C7_BELL_NOISE, 'bell');
    if (!this.bossActive) g.hud.toast('O cabo corre pelo teto e o sino do canto leste badala. O eco demora a morrer.', 3);
  }

  // ---------- chefe final: o Vigia Caiado ----------
  _startBoss() {
    const g = this.game, L = this.level, q = this.q;
    this.bossActive = true;
    q.set('c7_vigiaWoke');
    L.setPortcullis(false);
    g.audio.play('clang', { x: PORTCULLIS.x, y: TRACK_Y + 1, z: 52.6 });
    L.breakVigiaWall();
    g.audio.play('stone', { x: SOB.maxX, y: TRACK_Y + 1, z: VIGIA_NICHE.z }, { dur: 1.2 });
    g.cameraCtl.addShake(0.6);
    this.boss.activate();
    g.hud.showBoss(true, 'O VIGIA CAIADO');
    g.audio.setIntensity(2);
    g.hud.toast('A grade levadiça despenca atrás de você. Na parede de cal do fundo, a silhueta de chapéu racha — e sai. O lampião frio ainda pende nas costas. Os olhos foram lacrados com cal.', 7);
    this.hint('c7_boss', 'O <b>Vigia</b> voltou <b>cego</b>: caça pelo <b>som</b>. Quando ele <b>gritar</b>, <b>fique parado</b> — o eco denuncia quem se mexe. Puxe as <b>sinetas</b> (parede oeste) para atraí-lo e acerte o <b>lampião nas costas</b>; faça-o <b>investir contra os pilares de ferro</b> ou o vagão.', 14);
  }
  _callArena() {
    const g = this.game;
    this.q.set('c7_vigiaCall');
    for (const s of PEDRA_SPAWNS) {
      if (!s.arena) continue;
      const e = this._enemy(s.id);
      if (e && e.alive && e.dormant) e.wakeTo({ x: g.player.pos.x, y: g.player.pos.y, z: g.player.pos.z });
    }
    g.hud.toast('O grito ecoa nas paredes — e a cal dos nichos do oeste responde, rachando.', 4);
  }
  _bossDefeated() {
    const g = this.game, L = this.level, q = this.q, b = this.boss;
    q.set('c7_vigiaDead'); this.bossActive = false;
    const bx = Math.max(SOB.minX + 1, Math.min(SOB.maxX - 1, b.pos.x)), bz = Math.max(SOB.minZ + 1, Math.min(SOB.maxZ - 1, b.pos.z));
    q.set('c7_bodyAt', { x: +bx.toFixed(2), z: +bz.toFixed(2) });
    this._bodyPos.x = bx; this._bodyPos.z = bz;
    const km = L.pickupMeshes.c7_stairKey; if (km) { km.position.set(bx, TRACK_Y + 0.05, bz); km.visible = true; }
    g.hud.showBoss(false); g.audio.setIntensity(0);
    L.setPortcullis(true);
    g.saveGame('c7_boss');
    g.hud.toast('O Vigia cai de joelhos e a cal do corpo se esfarela. O lampião frio apaga — de vez, agora. A grade levadiça volta a subir. · progresso salvo', 7);
    this.hint('c7_key2', 'A grade da <b>escada de serviço</b> (norte) tem cadeado. Reviste o <b>corpo do Vigia</b> — e leia a <b>ata no atril</b> diante da parede de cal.', 9);
  }

  // ---------- cascalho ----------
  _updateGravel() {
    const g = this.game, pl = g.player, p = pl.pos;
    const on = pl.onGround !== false && pl.alive !== false && p.y < TRACK_Y + 0.5 && gravelAt(p.x, p.z);
    if (!on) { this._gravelLast = null; this._gravelAcc = 0; return; }
    if (this._gravelLast) this._gravelAcc += Math.hypot(p.x - this._gravelLast.x, p.z - this._gravelLast.z);
    this._gravelLast = { x: p.x, z: p.z };
    const step = pl.running ? C7_BONE_STEP * 0.75 : C7_BONE_STEP;
    if (this._gravelAcc >= step) {
      this._gravelAcc = 0;
      g.audio.play('step', p, { vol: 1.4 }); g.audio.play('stone', p, { dur: 0.15 });
      g.perception.noise(p, pl.running ? C7_GRAVEL_NOISE.run : C7_GRAVEL_NOISE.walk, 'gravel');
      if (!this.q.has('c7_crunchedGravel')) {
        this.q.set('c7_crunchedGravel');
        this.hint('c7_gravel2', 'O <b>cascalho range</b> — o nicho ao lado escuta. Saia da mancha clara e siga pela <b>faixa limpa</b>.', 7);
      }
    }
  }

  // ---------- portas ----------
  _useDoor(d) {
    const g = this.game, q = this.q;
    if (d.id === 'c7_service' && d.locked) {
      if (g.player.pos.x > SHAFT.maxX) {
        d.locked = false; d.setOpen(true); q.set('c7_shortcut');
        g.audio.play('door', d); g.perception.noise(d, 5, 'door');
        g.hud.toast('Ferrolho puxado. A porta de serviço dá no poço da escada — atalho aberto.', 3.5);
        return;
      }
      q.set('note_' + d.id); g.audio.play('locked', d); g.hud.toast(d.lockMsg, 4); return;
    }
    if (d.id === 'c7_ossGate' && d.locked) {
      q.set('c7_sawGate');
      if (g.inventory.has('chave_coveiro')) {
        g.inventory.remove('chave_coveiro');
        d.locked = false; d.setOpen(true); q.set('c7_ossOpen');
        g.audio.play('door', d); g.perception.noise(d, 6, 'door');
        g.hud.toast('A chave do coveiro-mor gira na boca do crânio. A grade do fundo do ossuário se abre para um túnel de tijolos.', 4);
        return;
      }
      q.set('note_' + d.id); g.audio.play('locked', d); g.hud.toast(d.lockMsg, 4);
      this.hint('c7_key', 'O livro do coveiro dizia: a chave ficou <b>com ele, no cinto</b>. A <b>cripta</b> fica a oeste do ossuário.', 7);
      return;
    }
    if (d.id === 'c7_stairs' && d.locked) {
      if (g.inventory.has('chave_escada_usina')) {
        g.inventory.remove('chave_escada_usina');
        d.locked = false; d.setOpen(true); q.set('c7_stairsOpen');
        g.audio.play('door', d); g.perception.noise(d, 5, 'door');
        g.hud.toast('A chave do Vigia gira no cadeado. A grade da escada de serviço se abre: degraus de ferro sobem para a Usina.', 4);
        return;
      }
      q.set('note_' + d.id); g.audio.play('locked', d); g.hud.toast(d.lockMsg, 4);
      if (q.has('c7_vigiaDead')) this.hint('c7_key3', 'A chave deve estar com o <b>Vigia</b>. Reviste o corpo.', 6);
      return;
    }
    if (d.locked) { q.set('note_' + d.id); g.audio.play('locked', d); g.hud.toast(d.lockMsg, 4); return; }
    d.setOpen(!d.open);
    // a grade do ossuário range alto — a pedra leva o som até os nichos
    if (d.id === 'c7_gate') {
      g.audio.play('stone', d, { dur: 0.6 });
      g.perception.noise(d, C7_GATE_NOISE, 'gate');
      if (!q.has('c7_gateCreak')) { q.set('c7_gateCreak'); g.hud.toast('A grade range alto. Lá dentro, alguma coisa raspa na pedra — e para.', 3.5); }
    } else g.perception.noise(d, 5, 'door');
  }

  // ---------- jazigo do coveiro-mor ----------
  _pryJazigo() {
    const g = this.game, q = this.q, pos = { x: JAZIGO.x, y: Y + 0.5, z: JAZIGO.z };
    if (!g.inventory.has('pe_de_cabra')) {
      q.set('c7_triedJazigo');
      g.audio.play('locked', pos);
      g.hud.toast('A tampa de pedra não se move com as mãos. Precisa de uma alavanca.', 3.5);
      return;
    }
    if (!this.level.openJazigo()) return;
    q.set('c7_cryptOpen'); q.set('c7_triedJazigo');
    g.audio.play('stone', pos, { dur: 1.1 });
    // barulho real: a pedra arrastada ecoa na cripta (e acorda quem dorme por perto)
    g.perception.noise(pos, C7_PRY_NOISE, 'stone');
    g.hud.toast('O pé de cabra range e a tampa desliza, tomba e bate no chão. O eco corre pelas galerias.', 4);
  }

  // ---------- emparedados: a cal do nicho cai quando o morador sai ----------
  _syncNiches(instant = false) {
    const q = this.q, L = this.level;
    for (const s of PEDRA_SPAWNS) {
      if (!s.niche) continue;
      const e = this._enemy(s.id);
      if (!e || e.dormant) continue;
      if (!q.has('c7_woke_' + s.id)) q.set('c7_woke_' + s.id);
      if (L.breakNiche(s.niche) && !instant) {
        this.game.audio.play('bones', e.pos);
        this.game.audio.play('stone', e.pos, { dur: 0.4 });
        this.hint('c7_woke', 'Um <b>emparedado</b> rompeu a cal do nicho. Ele <b>não enxerga</b>: vai até onde <b>ouviu</b> o barulho. Fique parado ou se afaste andando — correr, golpear e atirar fazem barulho.', 9);
      }
    }
  }

  // ---------- ossos no chão ----------
  _updateBones(dt) {
    const g = this.game, pl = g.player, p = pl.pos;
    const on = pl.onGround !== false && pl.alive !== false && boneAt(p.x, p.z);
    if (!on) { this._boneLast = null; this._boneAcc = 0; return; }
    if (this._boneLast) this._boneAcc += Math.hypot(p.x - this._boneLast.x, p.z - this._boneLast.z);
    this._boneLast = { x: p.x, z: p.z };
    const step = pl.running ? C7_BONE_STEP * 0.75 : C7_BONE_STEP;
    if (this._boneAcc >= step) {
      this._boneAcc = 0;
      g.audio.play('bones', p);
      g.perception.noise(p, pl.running ? C7_BONE_NOISE.run : C7_BONE_NOISE.walk, 'bones');
      if (!this.q.has('c7_crunched')) {
        this.q.set('c7_crunched');
        this.hint('c7_bones', 'Os <b>ossos estalam</b> sob os pés — e o eco corre até os nichos. Contorne as manchas de ossos.', 7);
      }
    }
  }

  _applyState(save) {
    const g = this.game, L = this.level, f = save.flags, pl = g.player;
    for (const id in save.doors) L.doors[id]?.restore(save.doors[id]);
    for (const k in f) if (k.startsWith('picked_') && L.pickupMeshes[k.slice(7)]) L.pickupMeshes[k.slice(7)].visible = false;
    const sv = L.doors.c7_service, og = L.doors.c7_ossGate;
    if (f.c7_shortcut) sv.locked = false; else { sv.locked = true; sv.setOpen(false, true); }
    if (f.c7_ossOpen) og.locked = false; else { og.locked = true; og.setOpen(false, true); }
    if (f.c7_cryptOpen) L.openJazigo(true);
    if (f.c7_lineOpen) L.openLineGate(true);
    for (const Lv of LEVERS) L.setLever(Lv.id, f['c7_sw_' + Lv.id] ? 'R' : 'N', true);
    // o save nunca prende Elias na arena: a grade levadiça volta aberta se o sinal já foi dado
    L.setPortcullis(!!f.c7_portOpen, true);
    if (f.c7_vigiaWoke || f.c7_vigiaDead) L.breakVigiaWall();
    // a chave só aparece no corpo (antes da luta o Vigia ainda está na parede)
    const km = L.pickupMeshes.c7_stairKey;
    if (km) km.visible = !!f.c7_vigiaDead && !f.picked_c7_stairKey;
    const st = L.doors.c7_stairs;
    if (f.c7_stairsOpen) st.locked = false; else { st.locked = true; st.setOpen(false, true); }
    // emparedado que já saiu do nicho não volta para a parede (e morto também deixa o nicho aberto)
    for (const s of PEDRA_SPAWNS) {
      if (!s.niche) continue;
      const e = this._enemy(s.id);
      if (f['c7_woke_' + s.id] || save.deadEnemies.includes(s.id)) { if (e && e.alive) e.dormant = false; L.breakNiche(s.niche); }
    }
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
    if (!q.has('c7_readRegistro') && docs.includes('registro_coveiro')) q.set('c7_readRegistro');
    if (!q.has('c7_readRecado') && docs.includes('recado_ines_pedra')) q.set('c7_readRecado');
    if (!q.has('c7_readQuadro') && docs.includes('quadro_linha_velha')) q.set('c7_readQuadro');
    if (!q.has('c7_hasCrowbar') && g.inventory.has('pe_de_cabra')) q.set('c7_hasCrowbar');
    if (!q.has('c7_readGuia') && docs.includes('guia_remocao_vigia')) q.set('c7_readGuia');
    if (!q.has('c7_readPlaca') && docs.includes('placa_agulhas')) q.set('c7_readPlaca');
    if (!q.has('c7_readAta') && docs.includes('ata_primeira_cinza')) q.set('c7_readAta');
    this._updateBones(dt);
    this._updateGravel();
    for (const k in this.bellCd) this.bellCd[k] = Math.max(0, this.bellCd[k] - dt);
    this._updateLine(p, q);
    this._syncNiches();
    const inOss = p.x > OSSUARY.minX && p.x < OSSUARY.maxX && p.z > OSSUARY.minZ + 0.6 && p.z < OSSUARY.maxZ && p.y > -0.5;
    if (!q.has('c7_inOssuary') && inOss) {
      q.set('c7_inOssuary');
      if (!q.has('c7_ossOpen')) g.saveGame('c7_ossuary');
      g.hud.toast('Ossuário da Irmandade · progresso salvo. Paredes de crânios — e nichos fechados com cal, da altura de um homem.', 5);
      this.hint('c7_listen', 'Os <b>emparedados</b> dos nichos são cegos, mas <b>ouvem</b> — e aqui a pedra ecoa (o som vai mais longe). <b>Ande</b> (sem Shift) pelo meio e evite os <b>ossos no chão</b>.', 10);
    }
    if (!q.has('c7_sawGate') && Math.hypot(p.x - 18, p.z - OSSUARY.maxZ) < 2.4) {
      q.set('c7_sawGate');
      if (!q.has('c7_ossOpen')) g.hud.toast('A grade do fundo tem um cadeado de bronze em forma de crânio. A fechadura fica na boca.', 4);
    }
    if (!q.has('c7_inCrypt') && p.x > CRYPT.minX && p.x < CRYPT.maxX - 0.4 && p.z > CRYPT.minZ && p.z < CRYPT.maxZ) {
      q.set('c7_inCrypt');
      g.hud.toast('Cripta do coveiro-mor. Sarcófagos baixos e um jazigo maior contra a parede do fundo.', 4);
    }
    if (!q.has('c7_onPlatform') && p.z > PLATFORM.minZ + 0.4 && p.y > -0.5 && p.x < PLATFORM.maxX) {
      q.set('c7_onPlatform');
      g.saveGame('c7_platform');
      g.hud.toast('Estação Sé Velha — Linha Velha, fechada desde 1912 · progresso salvo. Os trilhos ainda brilham: alguém usa esta linha.', 5);
    }
    // fim da fatia: os trilhos rumo ao túnel leste da Linha Velha
    if (!q.has('c7_sliceDone') && p.y < TRACK_Y + 0.5 && p.x > TRACKS.endX && p.z > TRACKS.minZ) {
      q.set('c7_sliceDone');
      g.saveGame('c7_slice');
      g.hud.toast('Túnel leste da Linha Velha · progresso salvo. Uma grade acorrentada com a chama da Irmandade — e, além dela, os trilhos seguem para a Estação Sob a Pedra.', 7);
      if (g.inventory.has('pe_de_cabra')) this.hint('c7_chain', 'A <b>corrente</b> da grade é nova, mas os elos são finos: o <b>pé de cabra</b> arrebenta um.', 7);
    }
  }

  /** Linha Velha → cabine → grade levadiça → Estação Sob a Pedra → escada (fim do capítulo) */
  _updateLine(p, q) {
    const g = this.game, L = this.level, low = p.y < TRACK_Y + 1.2;
    if (!q.has('c7_inLine') && low && p.x > LINE.minX + 0.5 && p.x < LINE.maxX && p.z > LINE.minZ && p.z < LINE.maxZ) {
      q.set('c7_inLine');
      g.hud.toast('Linha Velha. O túnel desce em curva, mais baixo; o cascalho do leito brilha de pó. Nas paredes, dois vãos tapados com cal.', 5);
    }
    if (!q.has('c7_inCabin') && low && p.x > CABIN.minX && p.x < CABIN.maxX && p.z > CABIN.minZ && p.z < CABIN.maxZ - 0.3) {
      q.set('c7_inCabin');
      g.hud.toast('Cabine de Sinalização 4. Um quadro de alavancas — três agulhas e o SINAL — e a mesa do sinaleiro, coberta de papéis.', 4.5);
    }
    if (!q.has('c7_sawPort') && low && p.x > PORTCULLIS.x - 4 && p.x < PORTCULLIS.x && p.z > LINE.minZ) {
      q.set('c7_sawPort');
      if (!q.has('c7_portOpen')) g.hud.toast('Uma grade levadiça fecha a boca da estação. Correntes sobem pelo teto — para o lado da cabine de sinalização.', 5);
    }
    // grade erguida: salva na boca da estação (uma vez)
    if (q.has('c7_portOpen') && !q.has('c7_atStation') && low && p.x > PORTCULLIS.x - 3 && p.x < PORTCULLIS.x + 0.5 && p.z > LINE.minZ) {
      q.set('c7_atStation');
      if (!q.has('c7_vigiaDead')) g.saveGame('c7_station');
      g.hud.toast('Boca da Estação Sob a Pedra · progresso salvo. O salão é alto como uma nave; no fundo, uma parede de cal com velas acesas.', 5);
    }
    const inSob = low && p.x > SOB.minX && p.x < SOB.maxX && p.z > SOB.minZ && p.z < SOB.maxZ;
    if (inSob && !q.has('c7_inStation')) q.set('c7_inStation');
    if (!this.bossActive && !q.has('c7_vigiaDead') && q.has('c7_portOpen') && inSob && p.x > C7_ARENA_X && g.player.alive !== false) this._startBoss();
    if (this.bossActive) {
      const b = this.boss;
      if (b.phase >= 2 && b.state === 'shriek' && !q.has('c7_vigiaCall')) this._callArena();
      if (b.seen.shriek >= 1 && !this.tut.shown.c7_echo) this.hint('c7_echo', 'Depois do <b>grito</b>, por um instante, <b>qualquer passo</b> denuncia você. Pare até o eco morrer.', 7);
      if (b.seen.stunObst >= 1 && !this.tut.shown.c7_stun) this.hint('c7_stun', 'Atordoado no ferro! O <b>lampião nas costas</b> está exposto — golpeie agora.', 6);
      if (b.phase >= 3 && !this.tut.shown.c7_p3) this.hint('c7_p3', 'Ele investe <b>duas vezes seguidas</b> e anda mais rápido. Mantenha um <b>pilar</b> entre vocês.', 7);
      if (b.state === 'dead' && !q.has('c7_vigiaDead')) this._bossDefeated();
    }
    // fim do capítulo: a escada de serviço sobe para a Usina
    // (num save c7_end, subir a escada de novo mostra a tela de fim outra vez, sem regravar)
    if (q.has('c7_stairsOpen') && !this._ended && p.x > STAIR.minX && p.x < STAIR.maxX && p.z > STAIR.endZ) {
      this._ended = true;
      if (!q.has('c7_chapterDone')) { q.set('c7_chapterDone'); q.set('ch7Done'); g.saveGame('c7_end'); }
      g.endChapter();
    }
  }
}
