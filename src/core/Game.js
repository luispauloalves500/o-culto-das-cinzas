// Orquestrador: renderer, loop de passo fixo, estados de jogo (menu/jogando/pausa/leitura/morte/fim),
// construção do mundo a partir de um save e persistência.
import * as THREE from 'three';
import { EventBus } from './EventBus.js';
import { Settings } from './Settings.js';
import { InputManager } from './InputManager.js';
import { SaveManager, createEmptySave, makeChapter2Save } from './SaveManager.js';
import { AudioManager } from './AudioManager.js';
import { CollisionWorld } from '../world/CollisionWorld.js';
import { Navigation } from '../world/Navigation.js';
import { Interactables } from '../world/Interactables.js';
import { createMaterials } from '../world/Materials.js';
import { CombatSystem } from '../gameplay/CombatSystem.js';
import { CameraController } from '../gameplay/CameraController.js';
import { PlayerController } from '../gameplay/PlayerController.js';
import { Inventory } from '../gameplay/Inventory.js';
import { QuestSystem } from '../gameplay/QuestSystem.js';
import { PerceptionSystem } from '../ai/PerceptionSystem.js';
import { EnemyDirector } from '../ai/EnemyDirector.js';
import { HospitalLevel, CHECKPOINTS } from '../scenes/hospital/HospitalLevel.js';
import { HospitalScript } from '../scenes/hospital/HospitalScript.js';
import { BairroLevel, BAIRRO_CHECKPOINTS, BAIRRO_FOG } from '../scenes/bairro/BairroLevel.js';
import { BairroScript } from '../scenes/bairro/BairroScript.js';
import { setMapChapter } from '../data/map.js';

// mundos por capítulo: geometria, roteiro, checkpoints e névoa padrão
const WORLDS = {
  1: { Level: HospitalLevel, Script: HospitalScript, checkpoints: CHECKPOINTS, start: 'ward_bed', fog: { fog: 0x050806, density: 0.075 } },
  2: { Level: BairroLevel, Script: BairroScript, checkpoints: BAIRRO_CHECKPOINTS, start: 'c2_gate', fog: BAIRRO_FOG },
};
import { HUD } from '../ui/HUD.js';
import { Menus } from '../ui/Menus.js';

const STEP = 1 / 60;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.settings = new Settings();
    this.input = new InputManager(canvas);
    this.audio = new AudioManager();
    this.audio.volume = this.settings.get('volume');
    this.saves = new SaveManager();
    this.materials = createMaterials();
    this.camera = new THREE.PerspectiveCamera(this.settings.get('fov'), 1, 0.05, 90);
    this.hud = new HUD();
    this.menus = new Menus(this);
    // em automação (testes) o pointer lock não está disponível; o jogo roda sem ele
    this.requireLock = !navigator.webdriver;
    this.state = 'menu';
    this.time = 0; this.acc = 0; this.last = performance.now();
    this.fpsAcc = 0; this.fpsN = 0; this.fps = 60;
    this.scene = null;
    window.addEventListener('resize', () => this.resize());
    this.resize();
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && this.state === 'playing' && this.requireLock) this.pause();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (this.state === 'playing') this.pause(); this.audio.suspend(); } else this.audio.resume();
    });
    canvas.addEventListener('click', () => { if (this.state === 'playing' && this.requireLock && !this.input.locked) this.input.requestLock(); });
    this.menus.show('menu');
    requestAnimationFrame((t) => this._frame(t));
  }

  resize() {
    const s = this.settings.get('renderScale');
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(Math.max(1, Math.floor(w * s)), Math.max(1, Math.floor(h * s)), false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  // ---------- mundo ----------
  _disposeWorld() {
    if (!this.scene) return;
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.isMesh && o.material && !Object.values(this.materials).includes(o.material) && o.material.dispose) o.material.dispose();
    });
    this.scene = null;
  }

  _buildWorld(save) {
    this._disposeWorld();
    this.bus = new EventBus();
    this.chapter = save.chapter === 2 ? 2 : 1;
    const W = WORLDS[this.chapter];
    setMapChapter(this.chapter);
    const scene = (this.scene = new THREE.Scene());
    scene.background = new THREE.Color(W.fog.fog).multiplyScalar(0.8);
    scene.fog = new THREE.FogExp2(W.fog.fog, W.fog.density);
    this.col = new CollisionWorld();
    this.nav = new Navigation();
    this.interact = new Interactables();
    this.combat = new CombatSystem(this);
    this.perception = new PerceptionSystem(this.col);
    this.director = new EnemyDirector(2);
    this.inventory = new Inventory(this.bus);
    this.quest = new QuestSystem(this.bus, this.chapter);
    this.enemies = []; this.boss = null; this.cutscene = null;
    this.cameraCtl = new CameraController(this.camera, this.col, this.settings);
    this.player = new PlayerController(this);
    this.level = new W.Level(this).build();
    this.quest.restore(save.flags);
    this.inventory.restore(save.inventory, save.documents);
    this.script = new W.Script(this, this.level);
    this.script.setup(save);
    const cp = W.checkpoints[save.checkpoint] || W.checkpoints[W.start];
    this.player.spawn(cp, cp.yaw);
    this.cameraCtl.yaw = cp.yaw;
    this.player.setWeapon(save.inventory.weapon || null);
    this.player.hp = Math.min(this.player.maxHp, Math.max(30, save.player.hp ?? 100));
    this.player.stats = { kills: save.stats?.kills || 0, damageTaken: save.stats?.damageTaken || 0 };
    this.playTime = save.playTime || 0;
    this.checkpoint = W.checkpoints[save.checkpoint] ? save.checkpoint : W.start;
    // luz de preenchimento discreta em volta do jogador (legibilidade no escuro)
    this.fill = new THREE.PointLight(0xffd2a0, 0.9, 5.5, 1.8);
    scene.add(this.fill);
    this.hud.reset();
    this.combatT = 0;
    this.bus.on('EnemyAlerted', () => { if (!this.script.bossActive) this.audio.setIntensity(1); this.combatT = 8; if (!this.script.tut.shown.noise) this.script.hint('noise', 'Inimigos <b>ouvem</b> passos de corrida, golpes e portas. Ande devagar para não chamar atenção.', 7); });
    this.bus.on('EnemyDied', (e) => { this.combat.blood({ x: e.pos.x, y: e.pos.y + 1, z: e.pos.z }, 20); });
  }

  serialize(checkpoint) {
    const doors = {};
    for (const id in this.level.doors) doors[id] = this.level.doors[id].serialize();
    if (this.script.bossActive) doors[this.script.arenaDoorId || 'arena'] = { open: false, locked: false };
    const E = this.level.elevator;
    return {
      ...createEmptySave(),
      chapter: this.chapter || 1,
      checkpoint,
      player: { hp: Math.round(this.player.hp) },
      inventory: { items: { ...this.inventory.items }, weapon: this.player.weapon ? this.player.weapon.id : null, weapons: [...this.inventory.weapons], wear: { ...this.inventory.wear }, loaded: { ...this.inventory.loaded },
        // estado do sistema REV6 (machado coletado / na mão), derivado da lista de armas e da arma em mãos
        possuiMachado: this.inventory.weapons.includes('machado'), machadoEquipado: this.player.weapon?.id === 'machado' },
      flags: this.quest.serialize(),
      doors,
      deadEnemies: this.enemies.filter((e) => !e.alive).map((e) => e.id),
      documents: [...this.inventory.documents],
      elevatorLevel: E ? (E.moving ? E.targetLevel : E.level) : 'upper',
      playTime: this.playTime,
      stats: { ...this.player.stats },
    };
  }
  saveGame(checkpoint) { this.checkpoint = checkpoint; return this.saves.write(this.serialize(checkpoint)); }

  // ---------- estados ----------
  _enterPlay() {
    this.state = 'playing';
    this.menus.hideAll(); this.hud.show(true);
    this.input.clear();
    this.audio.setAmbience(true);
    if (this.requireLock) this.input.requestLock();
    this.last = performance.now(); this.acc = 0;
  }
  newGame() {
    const s = createEmptySave();
    this._buildWorld(s);
    this.saveGame('ward_bed');
    this._enterPlay();
    this.hud.toast('Hospital São Dimas — Véspera, 1934', 4);
  }
  continueGame() {
    const s = this.saves.load();
    if (!s) return this.newGame();
    // save do Capítulo 1 já concluído (inclusive de versões anteriores, quando o Cap. 2 não existia): segue para o Cap. 2
    if ((s.chapter || 1) === 1 && s.flags.chapterDone) return this.startChapter2(s);
    this._buildWorld(s);
    this._enterPlay();
    if (this.chapter === 2) this.hud.toast('Capítulo 2 — Fumaça · Bairro Operário', 3);
  }
  /** passagem real do Capítulo 1 para o 2: monta o save inicial do Bairro Operário a partir do estado atual */
  startChapter2(prev) {
    const from = prev || (this.scene && this.chapter === 1 ? this.serialize(this.checkpoint || 'yard') : this.saves.load());
    const s = makeChapter2Save(from);
    this.saves.write(s);
    this._buildWorld(s);
    this._enterPlay();
    this.script.intro?.();
  }
  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused'; this.input.clear(); this.input.exitLock();
    this.audio.setAmbience(false);
    this.menus.show('pause');
  }
  resume() {
    if (!this.scene) return;
    this._enterPlay();
  }
  toMenu() {
    this.state = 'menu'; this.input.exitLock(); this.hud.show(false); this.audio.setAmbience(false); this.audio.setIntensity(0);
    this.menus.show('menu');
  }
  openDocument(id, back = 'playing') {
    this.readerBack = back;
    this.state = 'reading'; this.input.clear(); this.input.exitLock();
    this.menus.showDocument(id);
    this.audio.play('pickup', null);
  }
  openInventory() {
    this.state = 'inventory'; this.input.clear(); this.input.exitLock();
    this.menus.showInventory();
  }
  openMap() {
    this.state = 'map'; this.input.clear(); this.input.exitLock();
    this.menus.showMap();
  }
  closeOverlay() {
    if (this.state === 'reading' && this.readerBack === 'inventory') { this.openInventory(); return; }
    this.resume();
  }
  onPlayerDeath() {
    this.dyingT = 2.4;
    this.audio.setIntensity(0);
  }
  onPlayerFellOut() { this.continueGame(); }
  endChapter() {
    this.state = 'end'; this.input.exitLock(); this.hud.show(false); this.audio.setIntensity(0);
    this.menus.showChapterEnd({ chapter: this.chapter || 1, time: this.playTime, kills: this.player.stats.kills, damageTaken: this.player.stats.damageTaken, docs: this.inventory.documents.length, docsList: this.inventory.documents.slice(), pass: this.inventory.has('passe_bonde') || this.quest.has('c2_hasPass'), rn0: this.quest.has('rn0Revealed') });
  }

  // ---------- interação ----------
  targets() {
    const t = this.enemies.filter((e) => e.alive);
    if (this.boss && this.boss.alive && this.boss.state !== 'dormant') t.push(this.boss);
    // objetos atingíveis (parede rachada, cilindros de oxigênio)
    if (this.script?.props) for (const o of this.script.props) if (o.alive) t.push(o);
    return t;
  }
  tryInteract() {
    const it = this.currentInteractable;
    if (it) it.onInteract(this);
  }

  // ---------- loop ----------
  _frame(now) {
    requestAnimationFrame((t) => this._frame(t));
    let dt = (now - this.last) / 1000; this.last = now;
    if (!(dt > 0)) dt = 0; dt = Math.min(dt, 0.1);
    this.fpsAcc += dt; this.fpsN++;
    if (this.fpsAcc > 0.5) { this.fps = this.fpsN / this.fpsAcc; this.fpsAcc = 0; this.fpsN = 0; }
    try {
      this.input.pollGamepad();
      this._handleMenuKeys();
      if (this.state === 'playing' || this.state === 'cutscene') {
        this.acc += dt;
        let n = 0;
        while (this.acc >= STEP && n < 5) { this.step(STEP); this.acc -= STEP; n++; if (n === 1) this.input.endFrame(); }
        if (n === 5) this.acc = 0;
        if (this.state === 'playing') this._updateCamera(dt);
      } else if (this.state === 'dying') {
        this.step(dt * 0.5);
        this._updateCamera(dt);
        this.input.endFrame();
      } else this.input.endFrame();
      if (this.scene) {
        this.hud.update(dt, this);
        this.hud.setFps(this.settings.get('showFps'), this.fps);
        this.renderer.render(this.scene, this.camera);
      }
    } catch (e) {
      this.fatal(e);
    }
  }

  fatal(e) {
    console.error(e);
    if (this._fatalShown) return; this._fatalShown = true;
    document.getElementById('fatalMsg').textContent = String(e?.stack || e);
    document.getElementById('fatal').classList.remove('hidden');
    this.state = 'fatal';
  }

  _handleMenuKeys() {
    const i = this.input;
    if (this.state === 'playing') {
      if (i.wasPressed('pause')) { this.pause(); return; }
      if (i.wasPressed('inventory')) { this.openInventory(); return; }
      if (i.wasPressed('map')) { this.openMap(); return; }
      if (i.wasPressed('debug')) { this.combat.debug = !this.combat.debug; this.hud.toast(this.combat.debug ? 'Depuração de hitboxes: ligada' : 'Depuração de hitboxes: desligada', 1.5); }
    } else if (this.state === 'reading') {
      if (i.wasPressed('interact') || i.wasPressed('pause')) this.closeOverlay();
    } else if (this.state === 'inventory') {
      if (i.wasPressed('inventory') || i.wasPressed('pause')) this.resume();
    } else if (this.state === 'map') {
      if (i.wasPressed('map') || i.wasPressed('inventory') || i.wasPressed('pause')) { this.resume(); return; }
      if (i.wasPressed('left')) this.menus.mapCycle(-1);
      if (i.wasPressed('right')) this.menus.mapCycle(1);
      for (let k = 0; k < 4; k++) if (i.pressed.has('Digit' + (k + 1))) this.menus.mapFloor(k);
    } else if (this.state === 'paused') {
      if (i.wasPressed('pause') && !this.requireLock) this.resume();
    }
  }

  /** inicia uma cena curta (câmera roteirizada, mundo congelado exceto o cenário) */
  playCutscene(cs) {
    this.cutscene = cs; this.state = 'cutscene'; this.input.clear();
    this.currentInteractable = null;
    this.hud.show(false);
    cs.start();
  }

  step(dt) {
    const p = this.player;
    this.time += dt;
    if (this.state === 'cutscene') {
      // durante a cena só o cenário e a própria cena andam (inimigos e jogador congelados)
      this.level.update(dt, this.time);
      this.cutscene?.update(dt);
      return;
    }
    if (this.state === 'playing') this.playTime += dt;
    p.update(dt);
    for (const e of this.enemies) e.update(dt);
    this.boss?.update(dt);
    this.perception.endStep();
    this.combat.update(dt);
    this.script.update(dt);
    this.level.update(dt, this.time);
    if (this.combat.debug) this.combat.debugVolumes([p, ...this.targets()]);
    this.currentInteractable = p.state === 'free' && this.state === 'playing' ? this.interact.findBest(p.pos, p.facing()) : null;
    this.fill.position.set(p.pos.x, p.pos.y + 2.2, p.pos.z);
    // música de combate decai quando ninguém está perseguindo
    if (this.combatT > 0) {
      const chasing = this.enemies.some((e) => e.alive && (e.state === 'chase' || e.state === 'attack' || e.state === 'grabbing'));
      if (chasing) this.combatT = 8; else if ((this.combatT -= dt) <= 0 && !this.script.bossActive) this.audio.setIntensity(0);
    }
    if (this.dyingT !== undefined && this.state === 'playing' && !p.alive) this.state = 'dying';
    if (this.state === 'dying' && (this.dyingT -= dt) <= 0) {
      this.dyingT = undefined; this.state = 'dead'; this.input.exitLock(); this.hud.show(false); this.menus.show('dead');
    }
  }

  _updateCamera(dt) {
    if (this.state === 'cutscene') return;
    const p = this.player;
    const inCombat = this.combatT > 0 || this.script.bossActive;
    this.cameraCtl.update(dt, this.input, p.pos, inCombat);
    this.audio.setListener(p.pos.x, p.pos.y, p.pos.z, this.cameraCtl.yaw);
  }
}
