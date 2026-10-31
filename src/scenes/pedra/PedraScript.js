// Roteiro do Capítulo 7 — Sob a Pedra (primeira fatia): pé da escada do alçapão (fechado por cima) → galeria de pedra
// (pé de cabra no carrinho da Companhia) → grade rangente do ossuário → ossuário: os emparedados nos nichos são cegos e
// acordam com barulho (passo correndo, golpe, tiro, porta — e os ossos do chão, que estalam a cada passo); a pedra ecoa
// (acústica por área) → grade do fundo com cadeado de crânio → cripta: a tampa do jazigo do coveiro-mor só sai com o pé
// de cabra (barulho alto: acorda quem dorme no nicho da cripta) → chave + recado de Inês → grade do fundo → túnel →
// plataforma da Estação Sé Velha (save; acólito de ronda; quadro da Linha Velha) → escada de manutenção → trilhos →
// túnel leste (fim da fatia: save c7_slice, sem tela de fim). Atalho: o corredor de serviço da plataforma volta ao poço
// (o ferrolho só abre do lado do corredor).
import * as THREE from 'three';
import { HospitalScript } from '../hospital/HospitalScript.js';
import { Enemy } from '../../ai/EnemyController.js';
import { ammoMesh } from '../hospital/HospitalPedsScript.js';
import { GROUND, TRACK_Y, SHAFT, OSSUARY, CRYPT, PLATFORM, TRACKS, LADDER, TOOL_CART, JAZIGO, NICHES, boneAt } from './PedraLevel.js';
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
];
const C7_DOORS = ['c7_service', 'c7_gate', 'c7_ossGate', 'c7_corridor'];
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
    g.interact.add({ id: 'c7_lineGate', pos: { x: 47.6, y: TRACK_Y + 1, z: 52.6 }, radius: 1.6, prompt: 'Examinar a grade da Linha Velha',
      onInteract: () => { g.audio.play('locked', { x: 48.9, y: 0, z: 52.6 }); g.hud.toast('Corrente nova num cadeado com a chama da Irmandade. Do outro lado, os trilhos descem no escuro — e um vento quente sobe, cheirando a cinza.', 5); } });
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
    this._updateBones(dt);
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
      g.hud.toast('Túnel leste da Linha Velha. Uma grade acorrentada com a chama da Irmandade — e, além dela, os trilhos descem para a Estação Sob a Pedra. Fim da primeira parte do Capítulo 7 · progresso salvo.', 8);
    }
  }
}
