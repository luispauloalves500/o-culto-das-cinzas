// Roteiro do Capítulo 6 — O Acervo (primeira fatia): doca de carga do Museu → átrio (guia do visitante; acólito de
// ronda; portas principais acorrentadas) → Salão de Exposição: vitrines quebráveis (dano real, barulho, cacos, o que
// estava exposto fica ao alcance) e dois espécimes de pé em vitrines de corpo inteiro, que acordam com o vidro →
// porta-cofre da Ala de Conservação (três discos: o nº de inventário da peça mais antiga — o Relicário, cuja placa
// interna só se lê quebrando o vidro fosco, e quebrá-lo dispara o "alarme" que acorda o segundo espécime) →
// conservação (diário da conservadora; espécime solto) → depósito (cartão da remessa 31; acólito) → porta trancada
// da Galeria do Colecionador: save c6_slice e aviso de que o chefe vem na próxima atualização. Sem tela de fim.
import * as THREE from 'three';
import { HospitalScript } from '../hospital/HospitalScript.js';
import { Enemy } from '../../ai/EnemyController.js';
import { ammoMesh } from '../hospital/HospitalPedsScript.js';
import { GROUND, VITRINES, VITRINE_HP, VAULT_CODE, DIAL, COLLECTOR_DOOR, COLLECTOR_PLAQUE, HALL, CONSERV, STORAGE, ATRIUM } from './AcervoLevel.js';
import { roomAt } from '../../data/map.js';

const Y = GROUND;
export const ACERVO_SPAWNS = [
  // átrio: acólito de ronda em volta do balcão da recepção
  { id: 'c6_aco1', type: 'acolito', x: 10, y: Y, z: 18.6, yaw: Math.PI / 2,
    patrol: [{ x: 9.5, y: Y, z: 18.6 }, { x: 20.5, y: Y, z: 18.4 }, { x: 21, y: Y, z: 10.6 }, { x: 9, y: Y, z: 10.6 }] },
  // salão: dois espécimes de pé nas vitrines de corpo inteiro (dormentes até o vidro quebrar)
  { id: 'c6_esp1', type: 'especime', x: 2.4, y: Y + 0.12, z: 33, yaw: Math.PI / 2, dormant: true },
  { id: 'c6_esp2', type: 'especime', x: 27.6, y: Y + 0.12, z: 40.6, yaw: -Math.PI / 2, dormant: true },
  // conservação: um espécime já solto, arrastando-se entre a mesa de restauro e os tanques
  { id: 'c6_esp3', type: 'especime', x: 33, y: Y, z: 37.2, yaw: Math.PI / 2,
    patrol: [{ x: 33, y: Y, z: 37.2 }, { x: 40, y: Y, z: 37.2 }, { x: 40, y: Y, z: 32.5 }] },
  // depósito: acólito conferindo as remessas
  { id: 'c6_aco2', type: 'acolito', x: 32, y: Y, z: 43, yaw: Math.PI / 2,
    patrol: [{ x: 32, y: Y, z: 43 }, { x: 41.8, y: Y, z: 43 }, { x: 41.8, y: Y, z: 51 }, { x: 32.2, y: Y, z: 51.6 }] },
];
const C6_DOORS = ['c6_dock', 'c6_main', 'c6_hall', 'c6_vault', 'c6_storage', 'c6_collector'];
// espécimes nas vitrines: acordam com Elias a esta distância, ou com vidro quebrando a até C6_GLASS_WAKE metros
export const C6_SPECIMEN_WAKE = 2.6;
export const C6_GLASS_WAKE = 10;
// o Relicário é o alarme do salão: quebrá-lo acorda o espécime 88, onde quer que Elias esteja
export const C6_ALARM_VITRINE = 'v_relicario';
export const C6_ALARM_WAKES = 'c6_esp2';

/** vitrine como alvo real: o machado e as balas a acertam (hurtVolume), o vidro tem vida e quebra com barulho */
export class Vitrine {
  constructor(S, v) {
    this.S = S; this.v = v; this.id = v.id;
    this.isProp = true; this.alive = true; this.solid = false;
    this.hp = VITRINE_HP[v.kind] || 18;
    this.pos = new THREE.Vector3(v.x, Y + (v.kind === 'tall' ? 1.3 : 1.3), v.z);
  }
  hurtVolumes() {
    const v = this.v;
    return v.kind === 'tall'
      ? [{ type: 'capsule', x: v.x, z: v.z, y0: Y + 0.5, y1: Y + 2.1, r: 0.62 }]
      : [{ type: 'capsule', x: v.x, z: v.z, y0: Y + 1.05, y1: Y + 1.55, r: 0.5 }];
  }
  takeHit(h = {}) {
    if (!this.alive) return 'immune';
    const g = this.S.game, p = h.point || this.pos;
    this.hp -= h.dmg || 10;
    g.combat?.emit?.(p, 6, 0xd8e8f0, 2.2);
    g.audio.play('glass', p, { vol: 0.35 });
    g.perception.noise(this.pos, 6, 'glass');
    // bater no vidro de um espécime o acorda (mesmo que o vidro aguente)
    if (this.v.specimen) this.S._wakeSpecimen(this.v.specimen, false);
    if (this.hp <= 0) { this.S._breakVitrine(this.id); return 'dead'; }
    return 'hit';
  }
}

export class AcervoScript extends HospitalScript {
  constructor(game, level) {
    super(game, level);
    this.props = [];
    this.dial = [0, 0, 0];
  }

  setup(save) {
    const g = this.game, L = this.level, M = g.materials;
    for (const s of ACERVO_SPAWNS) {
      const e = new Enemy(g, s.type, s);
      g.enemies.push(e);
      if (save.deadEnemies.includes(s.id)) { e.pos.set(s.x, s.y, s.z); e.setDeadInstant(); }
    }
    // vitrines: alvos reais
    this.vit = {};
    for (const v of VITRINES) { const p = new Vitrine(this, v); this.vit[v.id] = p; this.props.push(p); }

    // ---------- doca e átrio ----------
    this._pickup('c6_band_dock', { x: 20.7, y: 1.0, z: 2.1 }, 'Pegar bandagem', () => this._giveItem('bandagem'), () => this._bandMesh(20.7, 0.92, 2.1));
    this._doc('guia_visitante', { x: 16.5, y: 1.2, z: 13.6 }, 16.5, 1.17, 14.6);
    this._saveBook('c6_atrium_book', { x: 13.2, y: 1.2, z: 13.6 }, 13.2, 1.2, 14.6, 'c6_atrium');

    // ---------- loot exposto nas vitrines (só ao alcance com o vidro quebrado) ----------
    const broken = (id) => () => this.q.has('c6_broke_' + id);
    for (const v of VITRINES) {
      if (!v.loot) continue;
      const pos = { x: v.x, y: Y + 1.1, z: v.z - 0.7 };
      if (v.loot === 'bandagem') this._pickup('c6_loot_' + v.id, pos, 'Pegar bandagem da vitrine', () => this._giveItem('bandagem'), () => this._bandMesh(v.x + 0.2, Y + 0.95, v.z), broken(v.id));
      else if (v.loot === 'ammo') this._pickup('c6_loot_' + v.id, pos, 'Pegar munição .38 da vitrine', () => {
        g.inventory.add('municao_38', 5); g.hud.toast(`Munição .38 ×5 (total ${g.inventory.count('municao_38')})`, 2.5);
      }, () => ammoMesh(M, v.x + 0.15, Y + 0.92, v.z, 5), broken(v.id));
      else if (v.loot === 'cache') this._pickup('c6_loot_' + v.id, pos, 'Abrir a gaveta de fundo falso do tabuleiro', () => {
        g.inventory.add('municao_38', 8); g.inventory.add('bandagem', 1); this.q.set('c6_gotCache');
        g.hud.toast(`Gaveta de fundo falso: munição .38 ×8 (total ${g.inventory.count('municao_38')}) · Bandagem ×1`, 3.5);
      }, () => { const gr = new THREE.Group(); gr.add(ammoMesh(M, v.x - 0.2, Y + 0.92, v.z - 0.2, 8)); gr.add(this._bandMesh(v.x + 0.2, Y + 0.93, v.z - 0.2)); return gr; }, broken(v.id));
    }
    // placas de latão
    for (const v of VITRINES) {
      if (!v.year) continue;
      const tall = v.kind === 'tall';
      const pos = tall ? { x: v.x + (v.face > 0 ? 1.0 : -1.0), y: 1.0, z: v.z } : { x: v.x, y: 1.0, z: v.z - 0.8 };
      // com o vidro quebrado e o loot ainda exposto, o E pega o loot primeiro (a placa volta depois)
      g.interact.add({ id: 'c6_plaque_' + v.id, pos, radius: 1.15, prompt: 'Ler a placa: ' + v.name, onInteract: () => this._readPlaque(v),
        enabled: () => !(v.loot && this.q.has('c6_broke_' + v.id) && !this.q.has('picked_c6_loot_' + v.id)) });
    }

    // ---------- porta-cofre: três discos e a alavanca ----------
    for (let i = 0; i < 3; i++) g.interact.add({ id: 'c6_dial' + i, pos: { x: DIAL.x - 0.6, y: DIAL.y, z: DIAL.zs[i] }, radius: 1.0,
      enabled: () => !this.q.has('c6_vaultOpen'), prompt: () => `Girar o ${i + 1}º disco (${this.dial[i]})`, onInteract: () => this._turnDial(i) });
    g.interact.add({ id: 'c6_dialHandle', pos: { x: DIAL.x - 0.6, y: DIAL.y - 0.2, z: DIAL.handleZ }, radius: 1.0,
      enabled: () => !this.q.has('c6_vaultOpen'), prompt: () => `Puxar a alavanca do cofre (${this.dial.join('-')})`, onInteract: () => this._pullHandle() });
    // (o salão salva sozinho ao entrar; o livro fica na conservação)

    // ---------- conservação e depósito ----------
    this._doc('diario_conservadora', { x: 36, y: 1.2, z: 28.6 }, 36, 0.92, 29.8);
    this._saveBook('c6_conserv_book', { x: 31.7, y: 1.2, z: 37.4 }, 30.8, 0.94, 38.7, 'c6_conserv');
    this._pickup('c6_band_conserv', { x: 34.2, y: 1.1, z: 38.0 }, 'Pegar bandagem', () => this._giveItem('bandagem'), () => this._bandMesh(34.2, 0.89, 39.1));
    this._doc('cartao_inventario_31', { x: 32.2, y: 1.0, z: 49.7 }, 30.8, 0.88, 49.7);
    this._pickup('c6_ammo_storage', { x: 41.6, y: 1.0, z: 47.8 }, 'Pegar munição .38', () => {
      g.inventory.add('municao_38', 6); g.hud.toast(`Munição .38 ×6 (total ${g.inventory.count('municao_38')})`, 2.5);
    }, () => ammoMesh(M, 40.2, 1.22, 47.8, 6));
    g.interact.add({ id: 'c6_collectorPlaque', pos: { x: COLLECTOR_PLAQUE.x, y: 1.2, z: COLLECTOR_PLAQUE.z - 0.7 }, radius: 1.0,
      prompt: 'Ler a placa de latão da Galeria', onInteract: () => this._endSlice('plaque') });

    // ---------- portas ----------
    for (const id of C6_DOORS) {
      const d = L.doors[id];
      g.interact.add({
        id: 'door_' + id, radius: id === 'c6_hall' || id === 'c6_main' || id === 'c6_collector' ? 2.0 : 1.7,
        pos: { x: d.x, y: d.y + 1, z: d.z },
        enabled: () => !(id === 'c6_vault' && d.open),
        prompt: () => (id === 'c6_collector' ? 'Examinar a porta da Galeria do Colecionador' : d.locked ? 'Abrir ' + d.label : d.open ? 'Fechar ' + d.label : 'Abrir ' + d.label),
        onInteract: () => this._useDoor(d),
      });
    }

    this._applyState(save);
  }

  intro() {
    if (this.q.has('c6_sliceDone')) return;
    this.game.hud.toast('Capítulo 6 — O Acervo · Museu de Ciências Proibidas', 4);
    this.hint('c6_intro', 'A barcaça atracou na <b>doca de carga</b> do Museu. Lá dentro, as <b>vitrines quebram</b> — golpe ou tiro —, mas o vidro <b>faz barulho</b> e nem tudo que está exposto está morto.', 10);
  }

  // o brilho do livro entra no orçamento de luzes
  _saveBook(id, pos, x, y, z, checkpoint) {
    const sc = this.game.scene, before = new Set(sc.children);
    super._saveBook(id, pos, x, y, z, checkpoint);
    for (const o of sc.children) if (!before.has(o) && o.isPointLight) this.level.lights.all.push({ light: o, fixture: null, base: o.intensity });
  }
  _enemy(id) { return this.game.enemies.find((e) => e.id === id); }

  // ---------- vitrines ----------
  _breakVitrine(id, instant = false) {
    const g = this.game, P = this.vit[id], v = P?.v;
    if (!P || !this.level.breakVitrine(id)) return false;
    P.alive = false; P.hp = 0;
    this.q.set('c6_broke_' + id);
    if (instant) return true;
    g.audio.play('glass', P.pos, { vol: 1 });
    g.combat?.emit?.(P.pos, 22, 0xd8e8f0, 3.4);
    g.perception.noise(P.pos, 12, 'glass');
    g.cameraCtl?.addShake?.(0.12);
    if (!this.q.has('c6_brokeAny')) {
      this.q.set('c6_brokeAny');
      this.hint('c6_glass', 'Vidro no chão: <b>tudo que estava exposto</b> fica ao alcance — e <b>o barulho corre pelo salão</b>.', 6);
    }
    if (v.specimen) this._wakeSpecimen(v.specimen, false);
    // vidro quebrando acorda os espécimes das vitrines próximas
    for (const o of VITRINES) {
      if (!o.specimen || o.id === id) continue;
      if (Math.hypot(o.x - v.x, o.z - v.z) <= C6_GLASS_WAKE) this._wakeSpecimen(o.specimen, true);
    }
    if (id === C6_ALARM_VITRINE) {
      this.q.set('c6_knowCode');
      g.audio.play('chime', P.pos, { vol: 0.8 });
      g.hud.toast('Um sino elétrico dispara em algum lugar do salão — e, do outro lado, vidro estoura.', 4);
      this._wakeSpecimen(C6_ALARM_WAKES, true);
    }
    return true;
  }
  /** o espécime acorda: o vidro da própria vitrine estoura e ele sai andando */
  _wakeSpecimen(eid, breakCase) {
    const g = this.game, e = this._enemy(eid);
    const v = VITRINES.find((o) => o.specimen === eid);
    if (!this.q.has('c6_woke_' + eid)) this.q.set('c6_woke_' + eid);
    if (!e || !e.alive) return false;
    if (v && (breakCase || e.dormant)) this._breakVitrine(v.id);
    if (!e.dormant) return false;
    e.wake(); g.audio.play('groan', e.pos, { pitch: 1.3 });
    if (!this.tut.shown.c6_especime) this.hint('c6_especime', 'Um <b>espécime</b> desce do pedestal: corpo de cera e linho costurado, <b>rápido</b> e com um <b>bote</b> longo. Recue ao ver o tronco se inclinar.', 8);
    return true;
  }
  _readPlaque(v) {
    const g = this.game, broken = this.q.has('c6_broke_' + v.id);
    this.q.set('c6_readPlaque_' + v.id);
    if (v.fogged && !broken) {
      g.hud.toast(`${v.name} — ${v.year}. "Nº de inventário: ver placa interna." O vidro está fosco de cinza por dentro.`, 5.5);
      this.hint('c6_fogged', 'A placa interna está atrás do <b>vidro fosco</b>. Para lê-la, só <b>quebrando</b> a vitrine.', 6);
      return;
    }
    if (v.fogged) this.q.set('c6_knowCode');
    g.hud.toast(`${v.name} — ${v.year}. Nº de inventário ${v.inv}.`, 4.5);
  }

  // ---------- porta-cofre ----------
  _turnDial(i) {
    const g = this.game;
    this.dial[i] = (this.dial[i] + 1) % 10;
    this.level.setDial(i, this.dial[i]);
    g.audio.play('switch', { x: DIAL.x, y: DIAL.y, z: DIAL.zs[i] }, { vol: 0.5 });
  }
  _pullHandle() {
    const g = this.game, L = this.level;
    if (L.dialHandle) L.dialHandle.userData.pull = 0.5;
    if (this.dial.every((d, i) => d === VAULT_CODE[i])) return this._openVault();
    this.q.set('c6_triedCode');
    g.audio.play('locked', L.doors.c6_vault);
    g.perception.noise({ x: DIAL.x, y: DIAL.y, z: DIAL.handleZ }, 9, 'metal');
    g.hud.toast(`${this.dial.join('-')}: a alavanca volta com um estalo seco. A porta-cofre não se mexe.`, 3.5);
    this.hint('c6_code', 'O guia: a conservação abre com o <b>nº de inventário da peça mais antiga</b> do Salão. Compare os <b>anos nas placas</b> das vitrines.', 8);
  }
  _openVault() {
    const g = this.game, d = this.level.doors.c6_vault;
    this.q.set('c6_vaultOpen');
    d.locked = false; d.setOpen(true);
    g.audio.play('elevator', d);
    g.perception.noise(d, 10, 'door');
    g.saveGame('c6_hall');
    g.hud.toast('4-1-8. Os trincos recolhem um a um e a porta-cofre corre para o lado. Cheiro de formol. · progresso salvo.', 4.5);
  }

  _useDoor(d) {
    const g = this.game;
    if (d.id === 'c6_collector') return this._endSlice('door');
    if (d.locked) { this.q.set('note_' + d.id); g.audio.play('locked', d); g.hud.toast(d.lockMsg, d.id === 'c6_main' ? 5 : 4); return; }
    d.setOpen(!d.open);
    g.perception.noise(d, 5, 'door');
  }
  /** fim da fatia jogável: a porta da Galeria do Colecionador (trancada) — sem tela de fim */
  _endSlice(from) {
    const g = this.game, d = this.level.doors.c6_collector;
    g.audio.play('locked', d);
    if (this.q.has('c6_sliceDone')) {
      g.hud.toast('Galeria do Colecionador — trancada por dentro. O Colecionador chega na próxima atualização.', 4);
      return;
    }
    this.q.set('c6_sliceDone'); this.q.set('note_c6_collector');
    g.saveGame('c6_slice');
    g.hud.toast((from === 'plaque' ? 'Placa: "GALERIA DO COLECIONADOR — ACERVO PARTICULAR. Peças recebidas em vida." ' : 'A porta de ferro não cede; do outro lado, um pêndulo e alguém contando peças em voz baixa. ')
      + 'Fim da primeira parte do Capítulo 6 · progresso salvo. O Colecionador chega na próxima atualização.', 7);
  }

  _applyState(save) {
    const g = this.game, L = this.level, f = save.flags, pl = g.player;
    for (const id in save.doors) L.doors[id]?.restore(save.doors[id]);
    for (const k in f) if (k.startsWith('picked_') && L.pickupMeshes[k.slice(7)]) L.pickupMeshes[k.slice(7)].visible = false;
    for (const v of VITRINES) if (f['c6_broke_' + v.id]) this._breakVitrine(v.id, true);
    const vault = L.doors.c6_vault;
    if (f.c6_vaultOpen) { vault.locked = false; this.dial = [...VAULT_CODE]; VAULT_CODE.forEach((d, i) => L.setDial(i, d)); }
    else { vault.locked = true; vault.setOpen(false, true); }
    L.doors.c6_main.locked = true; L.doors.c6_main.setOpen(false, true);
    L.doors.c6_collector.locked = true; L.doors.c6_collector.setOpen(false, true);
    // espécime que já acordou não volta ao pedestal
    for (const s of ACERVO_SPAWNS) if (s.dormant && f['c6_woke_' + s.id]) { const e = this._enemy(s.id); if (e && e.alive) e.dormant = false; }
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
    if (!q.has('c6_readGuia') && docs.includes('guia_visitante')) q.set('c6_readGuia');
    if (!q.has('c6_readDiario') && docs.includes('diario_conservadora')) q.set('c6_readDiario');
    if (!q.has('c6_readCartao') && docs.includes('cartao_inventario_31')) q.set('c6_readCartao');
    // entrou no átrio
    if (!q.has('c6_inAtrium') && p.z > ATRIUM.minZ + 0.4 && p.z < ATRIUM.maxZ) {
      q.set('c6_inAtrium');
      g.hud.toast('Átrio do Museu. Bustos de fundadores, um balcão de recepção e o tique-taque de um relógio que ninguém dá corda.', 4.5);
    }
    // salão de exposição: autosave na entrada
    if (!q.has('c6_inHall') && p.z > HALL.minZ + 0.6 && p.x < HALL.maxX) {
      q.set('c6_inHall');
      if (!q.has('c6_vaultOpen')) g.saveGame('c6_hall');
      g.hud.toast('Salão de Exposição Permanente · progresso salvo. Placas de latão em cada vitrine.', 4);
    }
    // espécimes nas vitrines: acordam com Elias encostando no vidro
    for (const v of VITRINES) {
      if (!v.specimen || q.has('c6_woke_' + v.specimen)) continue;
      if (Math.hypot(p.x - v.x, p.z - v.z) < C6_SPECIMEN_WAKE) this._wakeSpecimen(v.specimen, true);
    }
    if (!q.has('c6_inConserv') && p.x > CONSERV.minX + 0.5 && p.z > CONSERV.minZ && p.z < CONSERV.maxZ) {
      q.set('c6_inConserv');
      g.hud.toast('Ala de Conservação. Mesas de restauro, tanques de formol — e uma maca vazia ainda com as correias abertas.', 4.5);
    }
    if (!q.has('c6_inStorage') && p.x > STORAGE.minX && p.z > STORAGE.minZ + 0.5) {
      q.set('c6_inStorage');
      g.hud.toast('Depósito das remessas. Caixotes numerados até o teto. Ao fundo, uma porta de ferro sob um arco de latão.', 4.5);
    }
    // perto da porta do Colecionador: a fatia termina sozinha se Elias encostar
    if (!q.has('c6_sliceDone') && Math.hypot(p.x - COLLECTOR_DOOR.x, p.z - COLLECTOR_DOOR.z) < 1.6) this._endSlice('door');
  }
}
