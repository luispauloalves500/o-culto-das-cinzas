// Roteiro do Capítulo 2 — Fumaça: Bairro Operário → Rua do Carvão → Carvoaria → fábrica de fumaça →
// casa das fornalhas (chefe: Brás, o Guardião da Garganta) → saída para a Rua da Fundição (fim do capítulo).
// Reaproveita os helpers do roteiro do hospital (coletas, documentos, livros de registro, dicas, portas),
// mas tem inimigos, gatilhos, autosaves e quebra-cabeça próprios.
import * as THREE from 'three';
import { HospitalScript } from '../hospital/HospitalScript.js';
import { Enemy } from '../../ai/EnemyController.js';
import { ammoMesh } from '../hospital/HospitalPedsScript.js';
import { STREET } from './BairroLevel.js';
import { roomAt } from '../../data/map.js';
import { FurnaceBoss } from '../../ai/FurnaceBoss.js';

const Y = STREET;
export const BAIRRO_SPAWNS = [
  // caçador da rua: patrulha a calçada entre o beco e a barricada; ouve corrida, portas e golpes de longe
  { id: 'cac_rua', type: 'cacador', x: 26, y: Y, z: 4, yaw: -Math.PI / 2, patrol: [{ x: 14, y: Y, z: 3.6 }, { x: 31, y: Y, z: 4.4 }] },
  // caçador do depósito: encolhido entre os fardos; desperta quando a manivela é arrancada do suporte
  { id: 'cac_dep', type: 'cacador', x: 29.6, y: Y, z: 19, yaw: Math.PI / 2, dormant: true },
  // Rua do Carvão: um carvoeiro (lento, pá pesada) junto aos trilhos e um caçador no lado leste
  { id: 'carv_rua', type: 'carvoeiro', x: 41, y: Y, z: 36, yaw: 0, patrol: [{ x: 41, y: Y, z: 33.5 }, { x: 41, y: Y, z: 47 }] },
  { id: 'cac_coal', type: 'cacador', x: 46.5, y: Y, z: 56, yaw: Math.PI, patrol: [{ x: 46.5, y: Y, z: 56 }, { x: 45.5, y: Y, z: 44 }] },
  // Quintino, o encarregado da carvoaria: dorme sobre o carvão até alguém mexer no gancho da balança
  { id: 'carv_quintino', type: 'carvoeiro', x: 33.4, y: Y, z: 42.2, yaw: Math.PI / 2, dormant: true },
  // salão da fábrica: caçador rondando os fornos e um carvoeiro que acorda com o silvo das válvulas
  { id: 'cac_fab', type: 'cacador', x: 38, y: Y, z: 70, yaw: 0, patrol: [{ x: 38, y: Y, z: 62.6 }, { x: 38, y: Y, z: 76 }] },
  { id: 'carv_fab', type: 'carvoeiro', x: 53.4, y: Y, z: 68.4, yaw: Math.PI, dormant: true },
];
const C2_DOORS = ['c2_depot', 'c2_office', 'c2_shutter', 'c2_yardgate', 'c2_carv', 'c2_factory', 'c2_arena'];
export const C2_BOSS_POS = { x: 45, y: Y, z: 90.2, yaw: 0 };

export class BairroScript extends HospitalScript {
  constructor(game, level) {
    super(game, level);
    this.props = [];
    this.boss = null;
    this.arenaDoorId = 'c2_arena';
  }

  setup(save) {
    const g = this.game, L = this.level, M = g.materials;
    // chefe: Brás, debruçado diante da Garganta (de costas para quem entra)
    this.boss = new FurnaceBoss(g, C2_BOSS_POS);
    g.boss = this.boss;
    if (save.flags.c2_bossDead) this.boss.setDeadInstant();
    for (const s of BAIRRO_SPAWNS) {
      const e = new Enemy(g, s.type, s);
      g.enemies.push(e);
      if (save.deadEnemies.includes(s.id)) { e.pos.set(s.x, s.y, s.z); e.setDeadInstant(); }
    }

    // ---------- beco: jornal e bandagem ----------
    this._pickup('c2_band_beco', { x: 10.4, y: 0.9, z: 14.2 }, 'Pegar bandagem', () => this._giveItem('bandagem'), () => this._bandMesh(10.4, 0.9, 15));
    this._doc('jornal_vespera', { x: 11.95, y: 0.95, z: 14.4 }, 11.95, 0.96, 15.25);

    // ---------- escritório do capataz ----------
    this._pickup('c2_crank', { x: 38.7, y: 0.95, z: 20.1 }, 'Pegar manivela da porta de carga', () => {
      this._giveItem('manivela_carga'); this.q.set('c2_hasCrank');
      // o ferro rangendo no suporte acorda o que dormia entre os fardos
      g.perception.noise({ x: 38.7, y: Y, z: 21 }, 9, 'metal');
      const w = g.enemies.find((e) => e.id === 'cac_dep');
      if (w && w.alive && w.dormant) { w.wake(); g.audio.play('groan', w.pos, { pitch: 0.8 }); g.hud.toast('Algo se mexe entre os fardos de algodão…', 3); }
    }, () => this._crankMesh(38.7, 0.88, 21));
    this._saveBook('c2_book', { x: 39.0, y: 0.95, z: 22.4 }, 39.0, 0.94, 23.3, 'c2_office');
    this._doc('bilhete_capataz', { x: 35.5, y: 0.85, z: 22.5 }, 35.5, 0.81, 23.3);
    this._pickup('c2_band_esc', { x: 36.4, y: 0.9, z: 22.5 }, 'Pegar bandagem', () => this._giveItem('bandagem'), () => this._bandMesh(36.4, 0.85, 23.3));

    // ---------- pátio: munição sobre os caixotes ----------
    this._pickup('c2_ammo', { x: 41.3, y: 1.2, z: 10.9 }, 'Pegar munição .38', () => {
      g.inventory.add('municao_38', 4); g.hud.toast(`Munição .38 ×4 (total ${g.inventory.count('municao_38')})`, 2.5);
    }, () => ammoMesh(M, 41.2, 1.2, 9.6, 4));

    // ---------- carvoaria: escala de turno, chave no gancho da balança, livro de registros ----------
    this._doc('escala_turno', { x: 36.0, y: 0.95, z: 46.9 }, 36.0, 0.91, 47.2);
    this._pickup('c2_factory_key', { x: 36.9, y: 1.2, z: 46.8 }, 'Pegar a chave pendurada no gancho da balança', () => {
      this._giveItem('chave_fabrica'); this.q.set('c2_hasFactoryKey');
      g.perception.noise({ x: 36.9, y: Y, z: 47 }, 8, 'metal');
      const w = g.enemies.find((e) => e.id === 'carv_quintino');
      if (w && w.alive && w.dormant) { w.wake(); g.audio.play('groan', w.pos, { pitch: 0.55 }); g.hud.toast('O monte de carvão se ergue. Quintino ainda guarda a balança.', 3.5); }
    }, () => this._keyMesh(36.95, 1.6, 47.45));
    this._saveBook('c2_carv_book', { x: 35.7, y: 0.9, z: 40.6 }, 35.7, 0.74, 39.9, 'c2_carv');
    this._pickup('c2_band_carv', { x: 33.1, y: 1.0, z: 45.2 }, 'Pegar bandagem', () => this._giveItem('bandagem'), () => this._bandMesh(33.1, 1.25, 46.6));

    // ---------- salão da fábrica ----------
    this._doc('diario_fornalheiro', { x: 52.6, y: 0.9, z: 61.8 }, 52.6, 0.86, 60.75);
    this._pickup('c2_ammo_fab', { x: 38.4, y: 1.1, z: 65.2 }, 'Pegar munição .38', () => {
      g.inventory.add('municao_38', 6); g.hud.toast(`Munição .38 ×6 (total ${g.inventory.count('municao_38')})`, 2.5);
    }, () => ammoMesh(M, 38.8, 1.02, 66.6, 6));
    this._pickup('c2_band_fab', { x: 53.4, y: 0.9, z: 61.8 }, 'Pegar bandagem', () => this._giveItem('bandagem'), () => this._bandMesh(53.5, 0.9, 60.75));
    this._saveBook('c2_preboss_book', { x: 47.7, y: 0.95, z: 76.2 }, 47.7, 0.94, 77.3, 'c2_preboss');
    for (const [key, v, pos] of [['c2_valveA', L.valveA, { x: 37.4, y: 1.2, z: 75.6 }], ['c2_valveB', L.valveB, { x: 55.2, y: 1.2, z: 63 }]]) {
      g.interact.add({ id: key, pos, radius: 1.5, prompt: 'Girar a válvula de alívio', enabled: () => !this.q.has(key),
        onInteract: () => this._turnValve(key, v) });
    }

    // ---------- casa das fornalhas: recado de Inês, passe do bonde (após o chefe) e a saída ----------
    this._doc('recado_ines', { x: 55.0, y: 0.95, z: 89.6 }, 55.0, 0.91, 90.6);
    this._pickup('c2_pass', { x: 45, y: 0.6, z: 91.2 }, 'Pegar o passe de latão amarrado na fita vermelha', () => {
      this._giveItem('passe_bonde'); this.q.set('c2_hasPass');
    }, () => this._passMesh(45, 0.5, 92.1), () => this.q.has('c2_bossDead'));
    g.interact.add({ id: 'c2_exit', pos: { x: 55.2, y: 1.2, z: 87 }, radius: 1.8,
      prompt: () => (this.q.has('c2_bossDead') ? 'Sair pela porta de serviço (Rua da Fundição)' : 'A porta de serviço está trancada por dentro da fornalha'),
      onInteract: () => {
        if (!this.q.has('c2_bossDead')) { g.audio.play('locked', null); g.hud.toast('A tranca está presa. Não enquanto aquilo respira.'); return; }
        this.q.set('c2_chapterDone');
        g.saveGame('c2_end');
        g.endChapter();
      } });

    // ---------- portas ----------
    for (const id of C2_DOORS) {
      const d = L.doors[id];
      g.interact.add({
        id: 'door_' + id, radius: id === 'c2_factory' ? 2.0 : 1.7,
        pos: { x: d.x, y: d.y + 1, z: d.z },
        prompt: () => (id === 'c2_shutter' && d.locked && g.inventory.has('manivela_carga') ? 'Encaixar a manivela e erguer a porta de carga'
          : id === 'c2_factory' && d.locked && g.inventory.has('chave_fabrica') ? 'Abrir o cadeado do portão da fábrica'
            : d.locked ? 'Abrir ' + d.label : d.open ? 'Fechar ' + d.label : 'Abrir ' + d.label),
        onInteract: () => this._useDoor(d),
      });
    }

    // ---------- ponto do bonde: o bonde não vem; a trava do portão dos trilhos fica no poste ----------
    g.interact.add({ id: 'c2_tram', pos: { x: 43, y: 1.2, z: 26.6 }, radius: 1.8,
      prompt: 'Esperar o bonde no ponto', enabled: () => this.q.has('c2_shutterOpen') && !this.q.has('c2_sliceDone'),
      onInteract: () => {
        this.q.set('c2_sliceDone');
        const gate = L.doors.c2_yardgate; gate.locked = false; gate.setOpen(true);
        g.saveGame('c2_yard');
        g.audio.play('elevator', { x: 43, y: Y, z: 28 }, { dur: 1.6 });
        g.hud.toast('O sino toca ao longe… e o bonde não vem. Você solta a trava no poste: o portão dos trilhos se abre para a Rua do Carvão.', 6);
      } });

    this._applyState(save);
  }

  intro() {
    this.game.hud.toast('Capítulo 2 — Fumaça · Bairro Operário', 4);
    this.hint('c2_intro', 'O portão do hospital bateu atrás de você. A cidade arde. <b>Caçadores</b> rondam a rua: são cegos na fumaça, mas <b>ouvem</b> tudo — ande devagar.', 9);
  }

  _crankMesh(x, y, z) {
    const M = this.game.materials, gr = new THREE.Group();
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.035), M.rust); gr.add(arm);
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 6), M.steelDark); sock.position.set(-0.17, 0.04, 0); gr.add(sock);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.09, 6), M.woodDark); knob.position.set(0.17, 0.045, 0); gr.add(knob);
    gr.position.set(x, y + 0.02, z); gr.rotation.y = 0.4; return gr;
  }

  // o brilho do livro entra no orçamento de luzes do bairro (o hospital o mantém fora da contagem)
  _saveBook(id, pos, x, y, z, checkpoint) {
    const sc = this.game.scene, before = new Set(sc.children);
    super._saveBook(id, pos, x, y, z, checkpoint);
    for (const o of sc.children) if (!before.has(o) && o.isPointLight) this.level.lights.all.push({ light: o, fixture: null, base: o.intensity });
  }

  _passMesh(x, y, z) {
    const M = this.game.materials, gr = new THREE.Group();
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.012, 10), M.brass || M.axeMetal); gr.add(coin);
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.006, 0.025), new THREE.MeshLambertMaterial({ color: 0x9a1010 })); rib.position.set(0.1, 0.004, 0); gr.add(rib);
    gr.position.set(x, y, z); gr.rotation.y = 0.6; return gr;
  }

  _turnValve(key, v) {
    const g = this.game, L = this.level;
    if (this.q.has(key)) return;
    this.q.set(key);
    if (v) { v.turned = true; v.spin = 6; }
    const at = v ? v.gr.position : g.player.pos;
    g.audio.play('switch', at); g.audio.play('elevator', at, { dur: 1.2 });
    g.combat.emit({ x: at.x, y: at.y + 0.4, z: at.z }, 30, 0xb8b0a8, 2.2);
    g.perception.noise(at, 10, 'metal');
    // o silvo do vapor desperta o carvoeiro dos tanques
    const w = g.enemies.find((e) => e.id === 'carv_fab');
    if (w && w.alive && w.dormant) { w.wake(); g.audio.play('groan', w.pos, { pitch: 0.55 }); }
    if (this.q.has('c2_valveA') && this.q.has('c2_valveB')) {
      this.q.set('c2_valves');
      L.doors.c2_arena.locked = false;
      g.hud.toast('O vapor escapa em um uivo. A trava quente da casa das fornalhas cede.', 4.5);
    } else g.hud.toast('O vapor silva pelos canos. Falta a outra válvula.', 3.5);
  }

  _useDoor(d) {
    const g = this.game;
    if (d.locked && d.id === 'c2_factory' && g.inventory.has('chave_fabrica')) {
      g.inventory.remove('chave_fabrica');
      d.locked = false; d.setOpen(true); this.q.set('c2_factoryOpen');
      g.audio.play('elevator', d, { dur: 1.2 });
      g.hud.toast('O cadeado cai. O portão da fábrica corre nos trilhos com um guincho de ferro.', 4);
      g.perception.noise(d, 8, 'door');
      return;
    }
    if (d.locked && d.id === 'c2_shutter' && g.inventory.has('manivela_carga')) {
      g.inventory.remove('manivela_carga');
      d.locked = false; d.setOpen(true); this.q.set('c2_shutterOpen');
      if (this.level.crankAxle) this.level.crankAxle.material = g.materials.rust;
      g.audio.play('elevator', d, { dur: 1.4 });
      g.hud.toast('A corrente range alto e a porta de carga sobe. Isso deve ter sido ouvido na rua inteira.', 4);
      g.perception.noise(d, 12, 'door');
      return;
    }
    if (d.locked) { this.q.set('note_' + d.id); g.audio.play('locked', d); g.hud.toast(d.lockMsg); return; }
    d.setOpen(!d.open);
    g.perception.noise(d, 5, 'door');
  }

  _applyState(save) {
    const g = this.game, L = this.level, f = save.flags, pl = g.player;
    for (const id in save.doors) L.doors[id]?.restore(save.doors[id]);
    for (const k in f) if (k.startsWith('picked_') && L.pickupMeshes[k.slice(7)]) L.pickupMeshes[k.slice(7)].visible = false;
    if (f.c2_shutterOpen) { L.doors.c2_shutter.locked = false; L.doors.c2_shutter.setOpen(true, true); }
    if (f.c2_hasCrank) { const w = g.enemies.find((e) => e.id === 'cac_dep'); if (w && w.alive) w.dormant = false; }
    // saves antigos (fim da prévia) e novos: o portão dos trilhos abre depois do ponto do bonde
    if (f.c2_sliceDone) { L.doors.c2_yardgate.locked = false; L.doors.c2_yardgate.setOpen(true, true); }
    if (f.c2_hasFactoryKey) { const w = g.enemies.find((e) => e.id === 'carv_quintino'); if (w && w.alive) w.dormant = false; }
    if (f.c2_factoryOpen) { L.doors.c2_factory.locked = false; L.doors.c2_factory.setOpen(true, true); }
    for (const [k, v] of [['c2_valveA', L.valveA], ['c2_valveB', L.valveB]]) if (f[k] && v) { v.turned = true; v.wheel.rotation.z = 6; }
    if (f.c2_valveA || f.c2_valveB) { const w = g.enemies.find((e) => e.id === 'carv_fab'); if (w && w.alive) w.dormant = false; }
    // a casa das fornalhas nunca fica trancada ao carregar (o chefe reinicia adormecido)
    if (f.c2_valves) L.doors.c2_arena.locked = false;
    // melhorias conquistadas no Capítulo 1 continuam valendo
    this._applyMaxHp();
    pl.maxSt = f.hasAmulet ? 125 : 100; pl.st = Math.min(pl.st, pl.maxSt);
    pl.healAmount = f.hasBracelet ? 65 : 45;
    pl.sharpened = !!f.sharpened;
  }

  update(dt) {
    const g = this.game, p = g.player.pos;
    if (!this.tut.shown.move) this.hint('move', '<b>WASD</b>: mover · <b>Mouse</b>: câmera · <b>Shift</b>: correr (faz barulho)', 6);
    // mapa: cômodos percorridos
    { const r = roomAt(p); if (r && !this.q.has('seen_' + r.id)) this.q.set('seen_' + r.id); }
    // beco: jornal lido
    if (!this.q.has('c2_readPaper') && g.inventory.documents.includes('jornal_vespera')) this.q.set('c2_readPaper');
    if (!this.q.has('c2_readNote') && g.inventory.documents.includes('bilhete_capataz')) this.q.set('c2_readNote');
    // atrair um caçador com barulho (depois de ler o bilhete)
    if (this.q.has('c2_readNote') && !this.q.has('c2_lured') && g.enemies.some((e) => e.type === 'cacador' && e.alive && e.state === 'investigate')) {
      this.q.set('c2_lured'); g.hud.toast('O caçador foi atrás do barulho.', 2.5);
    }
    // depósito: autosave ao entrar
    if (!this.q.has('c2_inDepot') && p.x > 18.2 && p.x < 39.8 && p.z > 8.5 && p.z < 23.8) {
      this.q.set('c2_inDepot'); g.saveGame('c2_depot'); g.hud.toast('Progresso salvo automaticamente.');
    }
    // Rua do Carvão: autosave na entrada
    if (!this.q.has('c2_inCoal') && p.z > 30.6 && p.z < 60 && p.x > 38 && p.x < 50) {
      this.q.set('c2_inCoal'); g.saveGame('c2_coal'); g.hud.toast('Rua do Carvão · progresso salvo.');
      this.hint('c2_carvoeiro', 'Os <b>carvoeiros</b> são lentos, mas a pá derruba. Bloqueie ou esquive o golpe e contra-ataque na recuperação.', 8);
    }
    if (!this.q.has('c2_inCarv') && p.x > 30.2 && p.x < 37.8 && p.z > 38.2 && p.z < 47.8) this.q.set('c2_inCarv');
    if (!this.q.has('c2_readRoster') && g.inventory.documents.includes('escala_turno')) this.q.set('c2_readRoster');
    if (!this.q.has('c2_readDiary') && g.inventory.documents.includes('diario_fornalheiro')) this.q.set('c2_readDiary');
    // fábrica: autosave ao entrar no salão
    if (!this.q.has('c2_inFactory') && p.x > 34.5 && p.x < 55.5 && p.z > 60.4 && p.z < 77.6) {
      this.q.set('c2_inFactory'); g.saveGame('c2_factory'); g.hud.toast('Fábrica de fumaça · progresso salvo.');
      this.hint('c2_valves', 'A porta da casa das fornalhas está travada pela pressão: encontre e gire as <b>duas válvulas de alívio</b> do salão.', 8);
    }
    // chefe: Brás desperta quando Elias entra na casa das fornalhas
    if (!this.bossActive && !this.q.has('c2_bossDead') && this.q.has('c2_valves') && p.z > 80 && p.z < 96 && p.x > 34 && p.x < 56) {
      this.bossActive = true;
      const d = this.level.doors.c2_arena; d.setOpen(false); d.locked = true; d.lockMsg = 'A porta bateu e travou com o calor.';
      this.boss.activate();
      g.hud.showBoss(true, 'BRÁS — O GUARDIÃO DA GARGANTA');
      g.audio.setIntensity(2);
      this.hint('c2_boss', 'O couro de Brás absorve golpes. Faça-o <b>investir</b> contra os <b>pilares de ferro</b> e desça um <b>golpe forte</b> (botão direito) no <b>fole nas costas</b>. Quando o chão brilhar em volta dele, afaste-se.', 10);
    }
    if (this.bossActive && !this.boss.alive && !this.q.has('c2_bossDead')) {
      this.q.set('c2_bossDead'); this.bossActive = false;
      this.level.doors.c2_arena.locked = false;
      g.hud.showBoss(false); g.audio.setIntensity(0);
      g.hud.toast('Brás tomba sobre a grelha. Algo brilha entre as brasas — e a porta de serviço destrava.', 5);
    }
    // dica da porta de carga vista de perto
    if (!this.tut.shown.c2_shutter && p.x > 37 && p.x < 40 && p.z > 12 && p.z < 16 && !this.q.has('c2_hasCrank')) this.hint('c2_shutter', 'A porta de enrolar está emperrada. O eixo tem um encaixe quadrado — falta a <b>manivela</b>.', 6);
  }
}
