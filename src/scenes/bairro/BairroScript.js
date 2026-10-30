// Roteiro do Capítulo 2 — Fumaça (prévia jogável): Bairro Operário.
// Reaproveita os helpers do roteiro do hospital (coletas, documentos, livros de registro, dicas, portas),
// mas tem inimigos, gatilhos, autosaves e quebra-cabeça próprios.
import * as THREE from 'three';
import { HospitalScript } from '../hospital/HospitalScript.js';
import { Enemy } from '../../ai/EnemyController.js';
import { ammoMesh } from '../hospital/HospitalPedsScript.js';
import { STREET } from './BairroLevel.js';
import { roomAt } from '../../data/map.js';

const Y = STREET;
export const BAIRRO_SPAWNS = [
  // caçador da rua: patrulha a calçada entre o beco e a barricada; ouve corrida, portas e golpes de longe
  { id: 'cac_rua', type: 'cacador', x: 26, y: Y, z: 4, yaw: -Math.PI / 2, patrol: [{ x: 14, y: Y, z: 3.6 }, { x: 31, y: Y, z: 4.4 }] },
  // caçador do depósito: encolhido entre os fardos; desperta quando a manivela é arrancada do suporte
  { id: 'cac_dep', type: 'cacador', x: 29.6, y: Y, z: 19, yaw: Math.PI / 2, dormant: true },
];
const C2_DOORS = ['c2_depot', 'c2_office', 'c2_shutter'];

export class BairroScript extends HospitalScript {
  constructor(game, level) {
    super(game, level);
    this.props = [];
    this.boss = null;
  }

  setup(save) {
    const g = this.game, L = this.level, M = g.materials;
    g.boss = null;
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

    // ---------- portas ----------
    for (const id of C2_DOORS) {
      const d = L.doors[id];
      g.interact.add({
        id: 'door_' + id, radius: 1.7,
        pos: { x: d.x, y: d.y + 1, z: d.z },
        prompt: () => (id === 'c2_shutter' && d.locked && g.inventory.has('manivela_carga') ? 'Encaixar a manivela e erguer a porta de carga' : d.locked ? 'Abrir ' + d.label : d.open ? 'Fechar ' + d.label : 'Abrir ' + d.label),
        onInteract: () => this._useDoor(d),
      });
    }

    // ---------- ponto do bonde (fim da prévia) ----------
    g.interact.add({ id: 'c2_tram', pos: { x: 43, y: 1.2, z: 26.6 }, radius: 1.8,
      prompt: 'Esperar o bonde no ponto', enabled: () => this.q.has('c2_shutterOpen') && !this.q.has('c2_sliceDone'),
      onInteract: () => {
        this.q.set('c2_sliceDone');
        g.saveGame('c2_yard');
        g.audio.play('elevator', { x: 43, y: Y, z: 28 }, { dur: 1.6 });
        g.hud.toast('Ao longe, o sino do bonde. Os trilhos seguem para a Rua do Carvão.', 5);
        this.hint('c2_end', '<b>Fim da prévia jogável do Capítulo 2.</b> Progresso salvo. A Rua do Carvão e a fábrica de fumaça chegam na próxima atualização.', 10);
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

  _useDoor(d) {
    const g = this.game;
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
    // dica da porta de carga vista de perto
    if (!this.tut.shown.c2_shutter && p.x > 37 && p.x < 40 && p.z > 12 && p.z < 16 && !this.q.has('c2_hasCrank')) this.hint('c2_shutter', 'A porta de enrolar está emperrada. O eixo tem um encaixe quadrado — falta a <b>manivela</b>.', 6);
  }
}
