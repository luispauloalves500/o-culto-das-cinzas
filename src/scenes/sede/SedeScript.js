// Roteiro do Capítulo 3 — A Confraria: Largo do Véu → postigo da portaria (o passe da Linha 4) → salão nobre →
// secretaria (Regimento) → portão de segredo de três discos → arquivos subterrâneos → dossiê de Elias →
// sinete da CHAMA (no dedo do arquivista) → sarilho que ergue a grade → cripta → chefe O Sacristão →
// altar (ordem de transferência de Inês, gancho do Cap. 4) → galeria das catacumbas (fim do capítulo).
// Reaproveita os helpers do roteiro do hospital.
import * as THREE from 'three';
import { HospitalScript } from '../hospital/HospitalScript.js';
import { Enemy } from '../../ai/EnemyController.js';
import { ammoMesh } from '../hospital/HospitalPedsScript.js';
import { SacristanBoss } from '../../ai/SacristanBoss.js';
import { GROUND, ARCH, CRYPT, DIAL_SYMBOLS, CRYPT_NICHES, SACRISTAN_POS } from './SedeLevel.js';
import { roomAt } from '../../data/map.js';

const Y = GROUND;
// ordem do Regimento (art. 7º), discos da esquerda para a direita: CINZA, OLHO, VÉU
export const VAULT_CODE = [0, 1, 2];
export const SEDE_SPAWNS = [
  // acólito do largo: ronda o adro diante das portas de bronze, de costas para o bonde
  { id: 'aco_largo', type: 'acolito', x: 19, y: Y, z: 9.6, yaw: -Math.PI / 2, patrol: [{ x: 19, y: Y, z: 9.6 }, { x: 14.5, y: Y, z: 9.6 }] },
  // salão nobre: um acólito no tapete e o porteiro, que volta a rondar o fundo depois de abrir o postigo
  { id: 'aco_hall', type: 'acolito', x: 13.5, y: Y, z: 22, yaw: 0, patrol: [{ x: 13.5, y: Y, z: 16 }, { x: 13.5, y: Y, z: 26.5 }] },
  { id: 'aco_porteiro', type: 'acolito', x: 21.5, y: Y, z: 27.6, yaw: -Math.PI / 2, patrol: [{ x: 21.5, y: Y, z: 27.6 }, { x: 15, y: Y, z: 27.6 }] },
  // secretaria: o escrivão cochila na mesa; acorda quando alguém mexe no Regimento
  { id: 'aco_sec', type: 'acolito', x: 12.6, y: Y, z: 32.4, yaw: Math.PI, dormant: true },
  // arquivos: o arquivista ronda o corredor central; um rastejador dorme sob um lençol entre as estantes do leste
  { id: 'aco_arq', type: 'acolito', x: 24.5, y: ARCH, z: 47, yaw: 0, patrol: [{ x: 24.5, y: ARCH, z: 44.5 }, { x: 24.5, y: ARCH, z: 55 }] },
  { id: 'ras_arq', type: 'rastejador', x: 30, y: ARCH, z: 53.5, yaw: Math.PI, dormant: true },
];
const C3_DOORS = ['c3_main', 'c3_wicket', 'c3_lodge', 'c3_secret', 'c3_vault', 'c3_crypt', 'c3_arena', 'c3_gallery'];
// gatilho do chefe: Elias passa da porta da cripta para dentro da arena
export const C3_BOSS_TRIGGER = { minX: 14.5, maxX: 35.5, minZ: 69.4, maxZ: 89.5 };

export class SedeScript extends HospitalScript {
  constructor(game, level) {
    super(game, level);
    this.props = [];
    this.arenaDoorId = 'c3_arena';
    this.boss = null;
  }

  setup(save) {
    const g = this.game, L = this.level, M = g.materials;
    for (const s of SEDE_SPAWNS) {
      const e = new Enemy(g, s.type, s);
      g.enemies.push(e);
      if (save.deadEnemies.includes(s.id)) { e.pos.set(s.x, s.y, s.z); e.setDeadInstant(); }
    }
    // ---------- chefe: O Sacristão, ajoelhado diante do altar ----------
    this.boss = new SacristanBoss(g, { ...SACRISTAN_POS, niches: CRYPT_NICHES });
    g.boss = this.boss;
    if (save.flags.c3_bossDead) this.boss.setDeadInstant();

    // ---------- portaria: livro da portaria, bandagem e o livro de registros ----------
    this._doc('livro_portaria', { x: 28.2, y: 1.02, z: 5.6 }, 28.2, 1.02, 5.3);
    this._pickup('c3_band_lodge', { x: 29.3, y: 1.02, z: 4.8 }, 'Pegar bandagem', () => this._giveItem('bandagem'), () => this._bandMesh(29.4, 1.05, 4.7));
    this._saveBook('c3_lodge_book', { x: 29.2, y: 0.95, z: 10.6 }, 29.2, 0.99, 10.6, 'c3_lodge');

    // ---------- secretaria: o Regimento emoldurado, munição e bandagem ----------
    this._doc('regimento_arquivo', { x: 10.1, y: 1.75, z: 37.4 }, 10.1, 1.75, 37.84, true);
    { const ch = L.b.group.children; ch[ch.length - 1].rotation.y = Math.PI / 2; } // folha voltada para o sul
    this._pickup('c3_ammo_sec', { x: 7.9, y: 0.85, z: 34.4 }, 'Pegar munição .38', () => {
      g.inventory.add('municao_38', 5); g.hud.toast(`Munição .38 ×5 (total ${g.inventory.count('municao_38')})`, 2.5);
    }, () => ammoMesh(M, 7.9, 0.82, 34.4, 5));
    this._pickup('c3_band_sec', { x: 12.9, y: 0.85, z: 34.6 }, 'Pegar bandagem', () => this._giveItem('bandagem'), () => this._bandMesh(12.9, 0.85, 34.6));

    // ---------- portão do arquivo: três discos de latão e a alavanca ----------
    L.dials.forEach((d, i) => {
      L.setDial(i, d.value);
      g.interact.add({ id: 'c3_dial' + i, pos: { x: d.x, y: 1.5, z: 29.4 }, radius: 1.1,
        prompt: () => `Girar o ${['primeiro', 'segundo', 'terceiro'][i]} disco (${DIAL_SYMBOLS[L.dials[i].value]})`,
        enabled: () => !this.q.has('c3_vaultOpen'),
        onInteract: () => { L.setDial(i, (L.dials[i].value + 1) % DIAL_SYMBOLS.length); g.audio.play('switch', { x: d.x, y: 1.5, z: 29.8 }); } });
    });
    g.interact.add({ id: 'c3_lever', pos: { x: 26.3, y: 1.4, z: 29.4 }, radius: 0.9, prompt: 'Puxar a alavanca do portão',
      enabled: () => !this.q.has('c3_vaultOpen'), onInteract: () => this._pullLever() });

    // ---------- arquivos: livro de registros, ficha de Inês, munição e o dossiê ----------
    this._saveBook('c3_arq_book', { x: 15.6, y: ARCH + 0.85, z: 41.4 }, 15.6, ARCH + 0.84, 41.4, 'c3_archive');
    this._doc('ficha_ines', { x: 26.9, y: ARCH + 0.82, z: 44.6 }, 26.9, ARCH + 0.81, 44.6);
    this._pickup('c3_ammo_arq', { x: 15.4, y: ARCH + 0.4, z: 56.8 }, 'Pegar munição .38', () => {
      g.inventory.add('municao_38', 4); g.hud.toast(`Munição .38 ×4 (total ${g.inventory.count('municao_38')})`, 2.5);
    }, () => ammoMesh(M, 15.0, ARCH + 0.05, 57.2, 4));
    this._pickup('c3_dossier', { x: 34.1, y: ARCH + 1.3, z: 56 }, 'Abrir a gaveta V e pegar o dossiê', () => {
      this._giveItem('dossie_elias'); this.q.set('c3_hasDossier');
      g.inventory.addDocument('dossie_elias');
      // a gaveta range no trilho: o que dormia sob o lençol entre as estantes acorda
      g.perception.noise({ x: 34.6, y: ARCH, z: 56 }, 10, 'metal');
      const w = g.enemies.find((e) => e.id === 'ras_arq');
      if (w && w.alive && w.dormant) { w.wake(); g.audio.play('groan', w.pos, { pitch: 0.7 }); }
      g.hud.toast('A gaveta V range no trilho. Entre as estantes, um lençol se mexe…', 4);
      g.openDocument('dossie_elias');
    }, () => this._folderMesh(35.2, ARCH + 1.62, 56));

    // ---------- sinete da CHAMA: no dedo do arquivista (só se tira do corpo) ----------
    this.signetPos = { x: 24.5, y: ARCH + 0.3, z: 47 };
    this._pickup('c3_signet', this.signetPos, 'Tirar o sinete da CHAMA do dedo do arquivista', () => {
      this._giveItem('sinete_chama'); this.q.set('c3_hasSignet');
      g.hud.toast('Um anel de latão com uma chama gravada, ainda quente. O selo do sarilho tem o mesmo desenho.', 4.5);
    }, () => this._signetMesh(), () => { const a = this._arq(); return !!a && !a.alive; });
    // ---------- sarilho da grade da cripta ----------
    g.interact.add({ id: 'c3_winch', pos: { x: 22.9, y: ARCH + 1.1, z: 57.3 }, radius: 1.3,
      prompt: () => (this._hasSignet() ? 'Encaixar o sinete da CHAMA no selo e girar o sarilho' : 'Girar o sarilho da grade'),
      enabled: () => !this.q.has('c3_cryptOpen'),
      onInteract: () => this._useWinch() });

    // ---------- cripta: livro antes do chefe, altar (após o chefe) e a galeria ----------
    this._saveBook('c3_crypt_book', { x: 25.55, y: CRYPT + 0.85, z: 66.0 }, 25.55, CRYPT + 0.84, 66.0, 'c3_preboss');
    L.b.box(25.3, CRYPT, 65.75, 25.85, CRYPT + 0.8, 66.25, 'woodDark', { tag: 'prop-low', sight: false });
    this._doc('ordem_transferencia', { x: 24.0, y: CRYPT + 1.15, z: 88.0 }, 24.0, CRYPT + 1.15, 88.2);
    this._pickup('c3_ribbon', { x: 26.2, y: CRYPT + 1.15, z: 88.0 }, 'Pegar a fita de cabelo vermelha', () => {
      this._giveItem('fita_ines'); this.q.set('c3_hasRibbon');
      g.hud.toast('A fita de cabelo de Inês, presa num prego do altar. Ela esteve aqui — e foi levada.', 4.5);
    }, () => this._ribbonMesh(26.2, CRYPT + 1.16, 88.3), () => this.q.has('c3_bossDead'));
    g.interact.add({ id: 'c3_exit', pos: { x: 38.6, y: CRYPT + 1.2, z: 86 }, radius: 1.8,
      prompt: 'Seguir pelas catacumbas rumo ao centro antigo de Véspera',
      enabled: () => this.q.has('c3_bossDead'),
      onInteract: () => {
        this.q.set('c3_chapterDone');
        g.saveGame('c3_end');
        g.endChapter();
      } });

    // ---------- portas ----------
    for (const id of C3_DOORS) {
      const d = L.doors[id];
      g.interact.add({
        // a grade da cripta é erguida pelo sarilho: o "E" nela só mostra o aviso enquanto está baixada
        enabled: id === 'c3_crypt' ? () => d.locked : true,
        id: 'door_' + id, radius: id === 'c3_main' || id === 'c3_vault' ? 2.0 : 1.7,
        pos: { x: d.x, y: d.y + 1, z: d.z },
        prompt: () => (id === 'c3_wicket' && d.locked ? (this._hasPass() ? 'Mostrar a fita vermelha pelo postigo' : 'Bater no postigo da portaria')
          : id === 'c3_main' && d.locked && g.player.pos.z > 12 ? 'Erguer a tranca das portas de bronze'
            : d.locked ? 'Abrir ' + d.label : d.open ? 'Fechar ' + d.label : 'Abrir ' + d.label),
        onInteract: () => this._useDoor(d),
      });
    }

    this._applyState(save);
  }

  intro() {
    this.game.hud.toast('Capítulo 3 — A Confraria · Largo do Véu', 4);
    this.hint('c3_intro', 'A Linha 4 termina aqui, diante da Sede da Confraria. Os <b>acólitos</b> enxergam bem nos salões iluminados: use as colunas e as estantes para sair da vista.', 9);
  }

  _arq() { return this.game.enemies.find((e) => e.id === 'aco_arq'); }
  _hasSignet() { return this.game.inventory.has('sinete_chama'); }

  _signetMesh() {
    const M = this.game.materials, gr = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.016, 6, 10), M.brass); ring.rotation.x = Math.PI / 2; gr.add(ring);
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.05), M.ember); st.position.set(0.05, 0.01, 0); gr.add(st);
    gr.position.set(this.signetPos.x, this.signetPos.y - 0.2, this.signetPos.z); return gr;
  }
  _ribbonMesh(x, y, z) {
    const gr = new THREE.Group(), m = new THREE.MeshLambertMaterial({ color: 0xb01818 });
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.01, 0.04), m); a.rotation.y = 0.4; gr.add(a);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.01, 0.04), m); b.rotation.y = -0.6; b.position.set(0.08, 0.005, 0.05); gr.add(b);
    gr.position.set(x, y, z); return gr;
  }

  _useWinch() {
    const g = this.game, L = this.level, at = { x: 22.9, y: ARCH + 1.1, z: 57.6 };
    if (this.q.has('c3_cryptOpen')) return;
    if (!this._hasSignet()) {
      this.q.set('note_c3_winch'); g.audio.play('locked', at);
      g.hud.toast(this.q.has('c3_hasDossier')
        ? 'O sarilho não gira: o eixo está travado por um selo de latão com uma CHAMA em baixo-relevo — o encaixe de um anel. O sinete fica com o arquivista.'
        : 'O sarilho não gira: o eixo está travado por um selo de latão com uma CHAMA em baixo-relevo, do tamanho de um anel.', 6);
      return;
    }
    g.inventory.remove('sinete_chama');
    this.q.set('c3_cryptOpen');
    L.onGrateUp = () => { const d = L.doors.c3_crypt; d.locked = false; d.setOpen(true, true); g.hud.toast('A grade trava lá em cima. Os degraus descem para o escuro — e o cântico para.', 4); };
    L.raiseGrate();
    g.audio.play('elevator', at, { dur: 2.8 }); g.audio.play('clang', at);
    // a corrente faz um barulho que se ouve no arquivo inteiro
    g.perception.noise(at, 14, 'metal');
    g.hud.toast('O sinete encaixa no selo com um estalo. A manivela cede, a corrente geme e a grade começa a subir…', 4);
  }

  _hasPass() { return this.game.inventory.has('passe_bonde') || this.q.has('c2_hasPass'); }

  _folderMesh(x, y, z) {
    const M = this.game.materials, gr = new THREE.Group();
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.24), M.leather); gr.add(f);
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, 0.08), new THREE.MeshLambertMaterial({ color: 0x9a1010 })); st.position.set(0.06, 0.025, 0.04); gr.add(st);
    gr.position.set(x, y, z); gr.rotation.y = 0.3; return gr;
  }

  // o brilho do livro entra no orçamento de luzes da Sede
  _saveBook(id, pos, x, y, z, checkpoint) {
    const sc = this.game.scene, before = new Set(sc.children);
    super._saveBook(id, pos, x, y, z, checkpoint);
    for (const o of sc.children) if (!before.has(o) && o.isPointLight) this.level.lights.all.push({ light: o, fixture: null, base: o.intensity });
  }

  _pullLever() {
    const g = this.game, L = this.level, at = { x: 26.3, y: 1.4, z: 29.6 };
    if (this.q.has('c3_vaultOpen')) return;
    L.pullLever();
    g.audio.play('switch', at);
    const ok = L.dials.every((d, i) => d.value === VAULT_CODE[i]);
    if (ok) {
      this.q.set('c3_readRegimento'); this.q.set('c3_vaultOpen');
      const d = L.doors.c3_vault; d.locked = false; d.setOpen(true);
      g.audio.play('elevator', d, { dur: 1.6 });
      g.perception.noise(d, 6, 'door');
      g.hud.toast('CINZA · OLHO · VÉU. Os discos travam com um estalo seco e o portão do arquivo corre nos trilhos.', 5);
      return;
    }
    // ordem errada: o sino da parede toca e chama os irmãos
    g.audio.play('chime', at); g.audio.play('clang', at);
    g.perception.noise(at, 18, 'metal');
    for (const e of g.enemies) if (e.alive && !e.dormant && e.pos.y > -1 && e.pos.z > 12 && e.pos.z < 30) e._alert?.(g.player.pos);
    L.dials.forEach((d, i) => L.setDial(i, 3));
    this.q.set('c3_bellRung');
    g.hud.toast('Um sino toca dentro da parede. Os discos voltam sozinhos à CHAMA — e passos respondem no salão.', 5);
  }

  _useDoor(d) {
    const g = this.game;
    if (d.locked && d.id === 'c3_wicket') {
      if (!this._hasPass()) { this.q.set('note_' + d.id); g.audio.play('locked', d); g.hud.toast(d.lockMsg); return; }
      d.locked = false; d.setOpen(true); this.q.set('c3_wicketOpen');
      g.audio.play('door', d);
      g.hud.toast('A portinhola de latão se abre. Olhos cansados medem a fita vermelha; o ferrolho corre. "Entre, irmão. O salão espera."', 6);
      return;
    }
    if (d.locked && d.id === 'c3_main' && g.player.pos.z > 12) {
      d.locked = false; d.setOpen(true); this.q.set('c3_mainOpen');
      if (this.level.mainBar) this.level.mainBar.visible = false;
      g.audio.play('thud', d);
      g.perception.noise(d, 9, 'door');
      g.hud.toast('A tranca cai com um baque. As portas de bronze se abrem para o largo — um atalho até o bonde.', 4.5);
      return;
    }
    if (d.locked) { this.q.set('note_' + d.id); g.audio.play('locked', d); g.hud.toast(d.lockMsg, d.id === 'c3_crypt' ? 6 : 4); return; }
    d.setOpen(!d.open);
    g.perception.noise(d, 5, 'door');
  }

  _applyState(save) {
    const g = this.game, L = this.level, f = save.flags, pl = g.player;
    for (const id in save.doors) L.doors[id]?.restore(save.doors[id]);
    for (const k in f) if (k.startsWith('picked_') && L.pickupMeshes[k.slice(7)]) L.pickupMeshes[k.slice(7)].visible = false;
    if (f.c3_wicketOpen) { L.doors.c3_wicket.locked = false; L.doors.c3_wicket.setOpen(true, true); }
    if (f.c3_mainOpen) { L.doors.c3_main.locked = false; L.doors.c3_main.setOpen(true, true); if (L.mainBar) L.mainBar.visible = false; }
    if (f.c3_vaultOpen) { L.doors.c3_vault.locked = false; L.doors.c3_vault.setOpen(true, true); VAULT_CODE.forEach((v, i) => L.setDial(i, v)); }
    // a grade da cripta só sobe pelo sarilho (com o sinete): o estado vem da flag, não da porta salva
    if (f.c3_cryptOpen) { L.doors.c3_crypt.locked = false; L.doors.c3_crypt.setOpen(true, true); L.raiseGrate(true); }
    else { L.doors.c3_crypt.locked = true; L.doors.c3_crypt.setOpen(false, true); }
    // a galeria das catacumbas destrava com a morte do Sacristão
    if (f.c3_bossDead) { L.doors.c3_gallery.locked = false; L.doors.c3_gallery.setOpen(true, true); }
    else { L.doors.c3_gallery.locked = true; L.doors.c3_gallery.setOpen(false, true); L.doors.c3_arena.locked = false; L.doors.c3_arena.setOpen(true, true); }
    if (f.c3_readRegimento) { const w = g.enemies.find((e) => e.id === 'aco_sec'); if (w && w.alive) w.dormant = false; }
    if (f.c3_hasDossier) { const w = g.enemies.find((e) => e.id === 'ras_arq'); if (w && w.alive) w.dormant = false; }
    this._applyMaxHp();
    pl.maxSt = f.hasAmulet ? 125 : 100; pl.st = Math.min(pl.st, pl.maxSt);
    pl.healAmount = f.hasBracelet ? 65 : 45;
    pl.sharpened = !!f.sharpened;
  }

  update(dt) {
    const g = this.game, p = g.player.pos;
    if (!this.tut.shown.move) this.hint('move', '<b>WASD</b>: mover · <b>Mouse</b>: câmera · <b>Shift</b>: correr (faz barulho)', 6);
    { const r = roomAt(p); if (r && !this.q.has('seen_' + r.id)) this.q.set('seen_' + r.id); }
    const docs = g.inventory.documents;
    if (!this.q.has('c3_readPortaria') && docs.includes('livro_portaria')) this.q.set('c3_readPortaria');
    if (!this.q.has('c3_readFicha') && docs.includes('ficha_ines')) this.q.set('c3_readFicha');
    if (!this.q.has('c3_readOrdem') && docs.includes('ordem_transferencia')) this.q.set('c3_readOrdem');
    if (!this.q.has('c3_readRegimento') && docs.includes('regimento_arquivo')) {
      this.q.set('c3_readRegimento');
      const w = g.enemies.find((e) => e.id === 'aco_sec');
      if (w && w.alive && w.dormant) { w.wake(); g.audio.play('groan', w.pos, { pitch: 1.1 }); g.hud.toast('A cadeira da secretaria arrasta no assoalho. O escrivão acordou.', 3.5); }
    }
    // salão nobre: autosave ao entrar
    if (!this.q.has('c3_inHall') && p.y > -1 && p.x > 6.2 && p.x < 29.8 && p.z > 12.4 && p.z < 29.8) {
      this.q.set('c3_inHall'); g.saveGame('c3_hall'); g.hud.toast('Salão nobre · progresso salvo.');
      this.hint('c3_acolito', 'Os <b>acólitos</b> giram o turíbulo num arco largo: recue para fora do alcance e contra-ataque quando a corrente passar. O punhal é rápido, mas curto.', 8);
    }
    // arquivos subterrâneos: autosave na chegada
    if (!this.q.has('c3_inArchive') && p.y < -3.5 && p.z > 40.4 && p.x > 14 && p.x < 36) {
      this.q.set('c3_inArchive'); g.saveGame('c3_archive'); g.hud.toast('Arquivos subterrâneos · progresso salvo.');
    }
    // o sinete acompanha o corpo do arquivista
    if (!this.q.has('picked_c3_signet')) {
      const a = this._arq(), m = this.level.pickupMeshes.c3_signet;
      if (a) { this.signetPos.x = a.pos.x; this.signetPos.z = a.pos.z; this.signetPos.y = a.pos.y + 0.3; }
      if (m) { m.visible = !!a && !a.alive; m.position.set(this.signetPos.x + 0.25, this.signetPos.y - 0.26, this.signetPos.z); }
    }
    // escada da cripta: autosave no patamar (antes do chefe)
    if (!this.q.has('c3_inCrypt') && this.q.has('c3_cryptOpen') && p.y < CRYPT + 0.6 && p.z > 65 && p.z < 68 && p.x > 24 && p.x < 26) {
      this.q.set('c3_inCrypt');
      if (!this.q.has('c3_bossDead')) { g.saveGame('c3_preboss'); g.hud.toast('Cripta do Sacristão · progresso salvo.'); }
    }
    // chefe: o Sacristão se levanta quando Elias entra na cripta
    const T = C3_BOSS_TRIGGER;
    if (!this.bossActive && !this.q.has('c3_bossDead') && this.q.has('c3_cryptOpen') && p.y < CRYPT + 1 && p.x > T.minX && p.x < T.maxX && p.z > T.minZ && p.z < T.maxZ) {
      this.bossActive = true;
      const d = this.level.doors.c3_arena; d.setOpen(false); d.locked = true; d.lockMsg = 'A porta bateu e uma tranca caiu do outro lado. O cântico recomeça.';
      this.boss.activate();
      g.hud.showBoss(true, 'O SACRISTÃO');
      g.audio.setIntensity(2);
      this.hint('c3_boss', 'A batina do Sacristão absorve golpes. Faça-o <b>investir</b> contra os <b>pilares</b> e desça um <b>golpe forte</b> (botão direito) no <b>relicário nas costas</b>. Quando o chão em volta dele <b>acender</b>, saia do círculo; não fique dentro do <b>incenso</b>.', 11);
    }
    if (this.bossActive && !this.boss.alive && !this.q.has('c3_bossDead')) {
      this.q.set('c3_bossDead'); this.bossActive = false;
      const L = this.level;
      L.doors.c3_arena.locked = false;
      L.doors.c3_gallery.locked = false; L.doors.c3_gallery.setOpen(true);
      g.hud.showBoss(false); g.audio.setIntensity(0);
      g.hud.toast('O Sacristão cai de bruços diante do altar. A brasa do relicário se apaga — e a porta de ferro da galeria destrava.', 5.5);
    }
    if (!this.tut.shown.c3_vault && p.y > -1 && p.z > 27.5 && p.x > 19 && p.x < 27.5 && !this.q.has('c3_vaultOpen'))
      this.hint('c3_vault', 'O portão tem <b>três discos</b> (esquerda → direita) e uma <b>alavanca</b>. Errar a ordem faz o sino tocar.', 7);
  }
}
