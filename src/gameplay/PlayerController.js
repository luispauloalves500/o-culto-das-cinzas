// Elias Varga: locomoção relativa à câmera, máquina de estados, machado com hitbox sincronizada à animação.
import * as THREE from 'three';
import { createHumanoid, resetPose, poseWalk, poseIdle, keys } from './ProceduralRig.js';
import { WEAPONS, weaponDamage, wearCost, conditionLabel } from '../data/weapons.js';
import { EliasModel, RETARGET } from './EliasModel.js';

const STATES = ['free', 'attack', 'dodge', 'block', 'aim', 'reload', 'repair', 'hit', 'grabbed', 'heal', 'dead', 'locked'];

// Curvas de animação por golpe (t normalizado). active = janela em que a hitbox causa dano.
const ATTACK_ANIM = {
  light1: {
    torsoY: [[0, 0], [0.28, -1.15], [0.58, 0.95], [1, 0.2]],
    upX: [[0, -0.3], [0.28, -1.65], [0.58, -1.35], [1, -0.4]],
    upZ: [[0, 0], [0.28, -0.55], [0.58, 0.35], [1, 0]],
    loX: [[0, -0.3], [0.28, -1.1], [0.5, -0.15], [1, -0.3]],
  },
  light2: {
    torsoY: [[0, 0.6], [0.25, 1.0], [0.55, -1.0], [1, -0.1]],
    upX: [[0, -0.6], [0.25, -1.6], [0.55, -1.4], [1, -0.3]],
    upZ: [[0, 0.3], [0.25, 0.55], [0.55, -0.6], [1, 0]],
    loX: [[0, -0.6], [0.25, -1.2], [0.5, -0.1], [1, -0.3]],
  },
  heavy: {
    torsoY: [[0, 0], [0.4, -0.25], [0.6, 0.1], [1, 0]],
    torsoX: [[0, 0], [0.4, -0.3], [0.58, 0.55], [1, 0]],
    upX: [[0, -0.2], [0.4, -3.0], [0.58, -0.7], [0.8, -0.5], [1, -0.2]],
    upZ: [[0, 0], [0.4, 0.15], [1, 0]],
    loX: [[0, -0.2], [0.4, -0.9], [0.58, -0.05], [1, -0.2]],
    twoHands: true,
  },
  // lança: estocada reta — recolhe o cotovelo e estende tudo de uma vez (a haste fica quase na horizontal)
  thrust: {
    torsoY: [[0, 0.35], [0.3, 0.5], [0.46, -0.15], [1, 0.15]],
    upX: [[0, -0.45], [0.3, -0.3], [0.46, -0.8], [0.62, -0.8], [1, -0.45]],
    upZ: [[0, 0], [1, 0]],
    loX: [[0, -0.6], [0.3, -0.55], [0.46, -0.05], [0.62, -0.05], [1, -0.5]],
    twoHands: true,
  },
  thrustHeavy: {
    torsoY: [[0, 0.5], [0.4, 0.65], [0.55, -0.2], [1, 0.1]],
    torsoX: [[0, 0], [0.4, -0.15], [0.55, 0.3], [0.75, 0.25], [1, 0]],
    upX: [[0, -0.4], [0.4, -0.25], [0.55, -0.72], [0.72, -0.72], [1, -0.4]],
    upZ: [[0, 0], [1, 0]],
    loX: [[0, -0.6], [0.4, -0.75], [0.55, 0], [0.72, 0], [1, -0.5]],
    twoHands: true,
  },
  // revólver: braço estendido à frente, coice no disparo
  shoot: {
    torsoY: [[0, 0.15], [0.16, 0.2], [1, 0.1]],
    upX: [[0, -0.9], [0.12, -1.5], [0.2, -1.85], [0.4, -1.5], [1, -1.2]],
    upZ: [[0, 0], [1, 0]],
    loX: [[0, -0.4], [0.12, -0.05], [0.2, -0.3], [0.4, -0.05], [1, -0.3]],
  },
};

export class PlayerController {
  constructor(game) {
    this.game = game;
    const M = game.materials;
    this.rig = createHumanoid({
      scale: 1.0,
      mats: { skin: M.skin, shirt: M.bandage, arms: M.bandage, pants: M.pantsGray, legs: M.pantsGray, feet: M.leatherDark, head: M.skin },
    });
    // bandagens na cabeça
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.26), M.bandage);
    band.position.y = 0.22; this.rig.head.add(band);
    game.scene.add(this.rig.root);
    // malhas do boneco procedural: escondidas quando o GLB REV6 carregar (o rig segue animando, invisível)
    this._procMeshes = [];
    this.rig.root.traverse((o) => { if (o.isMesh) this._procMeshes.push(o); });

    // um modelo por arma, presos à mão; só o da arma equipada fica visível
    this.models = { machado: this._buildAxe(M), martelo: this._buildHammer(M), facao: this._buildMachete(M), revolver: this._buildRevolver(M), lanca: this._buildSpear(M) };
    for (const k in this.models) { this.rig.armR.end.add(this.models[k].group); this.models[k].group.visible = false; }
    this.axe = this.models.machado;
    this.sharpened = false;
    // Elias REV6 (GLB): carrega em segundo plano; até lá (ou se falhar) fica o visual procedural
    this.model = new EliasModel(this.rig);
    this.model.whenReady(() => this._adoptModel());
    this.model.load();
    // clarão do cano (luz única reaproveitada; intensidade 0 quando apagada)
    this.muzzle = new THREE.PointLight(0xffc070, 0, 7, 1.8);
    game.scene.add(this.muzzle);

    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.vy = 0; this.onGround = true;
    this.yaw = 0;
    this.radius = 0.33; this.height = 1.75;
    this.maxHp = 100; this.hp = 100;
    this.maxSt = 100; this.st = 100; this.stDelay = 0;
    this.state = 'free'; this.stateT = 0;
    this.attack = null; this.queued = null;
    this.weapon = null;
    this.iframes = 0; this.hitstop = 0;
    this.walkPhase = 0; this.stepAcc = 0; this.animT = 0;
    this.grabbedBy = null; this.struggle = 0;
    this.dodgeDir = { x: 0, z: 0 };
    this.knock = { x: 0, z: 0 };
    this.prevTip = new THREE.Vector3(); this.prevMid = new THREE.Vector3();
    this.hitSet = new Set();
    this.stats = { kills: 0, damageTaken: 0 };
  }

  _buildAxe(M) {
    const group = new THREE.Group();
    group.rotation.x = -0.25;
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.78, 0.045), M.woodDark);
    handle.position.y = -0.27; handle.castShadow = true; group.add(handle);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.17, 0.3), M.axeMetal);
    head.position.set(0, -0.58, 0.1); head.castShadow = true; group.add(head);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.04), M.axeEdge);
    edge.position.set(0, -0.58, 0.27); group.add(edge);
    const tip = new THREE.Object3D(); tip.position.set(0, -0.58, 0.2); group.add(tip);
    const mid = new THREE.Object3D(); mid.position.set(0, -0.32, 0.02); group.add(mid);
    return { group, tip, mid };
  }

  _buildHammer(M) {
    const group = new THREE.Group();
    group.rotation.x = -0.25;
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.86, 0.05), M.woodDark);
    handle.position.y = -0.3; handle.castShadow = true; group.add(handle);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.06), M.leatherDark);
    grip.position.y = 0.02; group.add(grip);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.14, 0.3), M.steelDark || M.axeMetal);
    head.position.set(0, -0.66, 0.04); head.castShadow = true; group.add(head);
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.15, 0.03), M.axeEdge);
    face.position.set(0, -0.66, 0.2); group.add(face);
    const tip = new THREE.Object3D(); tip.position.set(0, -0.66, 0.12); group.add(tip);
    const mid = new THREE.Object3D(); mid.position.set(0, -0.36, 0.02); group.add(mid);
    return { group, tip, mid };
  }

  _buildMachete(M) {
    const group = new THREE.Group();
    group.rotation.x = -0.25;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.16, 0.04), M.leatherDark);
    grip.position.y = -0.04; group.add(grip);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.09), M.axeMetal);
    guard.position.y = -0.13; group.add(guard);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.56, 0.07), M.axeMetal);
    blade.position.set(0, -0.42, 0.015); blade.castShadow = true; group.add(blade);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.52, 0.015), M.axeEdge);
    edge.position.set(0, -0.42, 0.055); group.add(edge);
    const tip = new THREE.Object3D(); tip.position.set(0, -0.66, 0.03); group.add(tip);
    const mid = new THREE.Object3D(); mid.position.set(0, -0.36, 0.03); group.add(mid);
    return { group, tip, mid };
  }

  // haste de suporte de soro (metal) + esparadrapo + bisturi de parto na ponta; empunhada pelo terço de trás
  _buildSpear(M) {
    const group = new THREE.Group();
    group.rotation.x = -0.75;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.62, 6), M.metal);
    shaft.position.y = -0.2; shaft.castShadow = true; group.add(shaft);
    const tape = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.14, 6), M.bandage);
    tape.position.y = -0.98; group.add(tape);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.2, 6), M.bandage);
    grip.position.y = 0.02; group.add(grip);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.2, 0.034), M.axeEdge);
    blade.position.y = -1.11; blade.castShadow = true; group.add(blade);
    const point = new THREE.Mesh(new THREE.ConeGeometry(0.017, 0.06, 4), M.axeEdge);
    point.position.y = -1.24; point.rotation.x = Math.PI; group.add(point);
    const tip = new THREE.Object3D(); tip.position.set(0, -1.22, 0); group.add(tip);
    const mid = new THREE.Object3D(); mid.position.set(0, -0.62, 0); group.add(mid);
    return { group, tip, mid };
  }

  _buildRevolver(M) {
    const group = new THREE.Group();
    group.rotation.x = -0.25;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.05), M.woodDark);
    grip.position.set(0, -0.05, -0.01); grip.rotation.x = 0.25; group.add(grip);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.05, 0.1), M.steelDark || M.axeMetal);
    frame.position.set(0, -0.12, 0.04); group.add(frame);
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8), M.axeMetal);
    cyl.rotation.x = Math.PI / 2; cyl.position.set(0, -0.12, 0.05); group.add(cyl);
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.16), M.steelDark || M.axeMetal);
    barrel.position.set(0, -0.135, 0.17); barrel.castShadow = true; group.add(barrel);
    // a coronhada acerta com o cabo/armação
    const tip = new THREE.Object3D(); tip.position.set(0, -0.13, 0.2); group.add(tip);
    const mid = new THREE.Object3D(); mid.position.set(0, -0.1, 0.02); group.add(mid);
    const muzzle = new THREE.Object3D(); muzzle.position.set(0, -0.135, 0.26); group.add(muzzle);
    return { group, tip, mid, muzzle };
  }

  setWeapon(id) {
    this.weapon = id && WEAPONS[id] ? WEAPONS[id] : null;
    for (const k in this.models) this.models[k].group.visible = !!this.weapon && k === this.weapon.id;
    this.axe = this.models[this.weapon?.id] || this.models.machado;
    if (this.model?.ready) this.model.syncWeapon(this.weapon?.id || null, !!this.game.inventory?.weapons?.includes('machado'));
  }

  /** GLB pronto: esconde o boneco procedural, põe as armas procedurais no socket da mão do GLB e usa o machado real */
  _adoptModel() {
    const M = this.model;
    for (const m of this._procMeshes) m.visible = false;
    for (const k in this.models) {
      if (k === 'machado') continue;
      M.adapter.add(this.models[k].group);
    }
    this.models.machado.group.parent?.remove(this.models.machado.group);
    this.models.machado = { group: M.axe, tip: M.axeTip, mid: M.axeMid, real: true };
    this.setWeapon(this.weapon?.id || null);
    this.game.bus?.emit?.('EliasModelReady', M);
  }

  /**
   * coleta REV6 do machado do cenário: distância ≤ 1,5 m até o marcador `Machado_Coletavel`,
   * esconde o machado do cenário e mostra Machado_Equipado (clipes `_Machado`). Sem GLB, mesma regra.
   */
  coletarMachado(objeto, dist = 1.5) {
    if (this.model?.ready) return this.model.sistema.tentarColetar(objeto, dist, this.pos);
    if (!objeto || objeto.userData?.coletado || !objeto.visible) return false;
    const mk = objeto.getObjectByName('Machado_Coletavel') || objeto;
    const p = mk.getWorldPosition(new THREE.Vector3());
    if (p.distanceTo(this.pos) > dist) return false;
    objeto.userData.coletado = true; objeto.visible = false;
    return true;
  }

  /** troca para a próxima arma que o jogador possui (tecla R) */
  cycleWeapon() {
    const g = this.game, owned = g.inventory.weapons || [];
    if (owned.length < 2) { if (owned.length) g.hud.toast('Você só tem uma arma.', 1.5); return false; }
    const i = owned.indexOf(this.weapon?.id);
    this.setWeapon(owned[(i + 1) % owned.length]);
    g.audio.play('pickup', null);
    g.hud.toast(this.weapon.name + ' em mãos', 1.5);
    return true;
  }

  spawn(p, yaw = 0) {
    this.pos.set(p.x, p.y, p.z); this.vel.set(0, 0, 0); this.vy = 0;
    this.yaw = yaw; this.state = 'free'; this.attack = null; this.queued = null; this.grabbedBy = null; this.repairing = null;
    // teleporte / respawn: nada de tela de "agarrado" ou mira sobrando de um estado anterior
    this.game.hud?.setStruggle(false);
    if (this.game.cameraCtl) this.game.cameraCtl.aiming = false;
    this.rig.root.position.copy(this.pos); this.rig.root.rotation.y = yaw;
  }

  get alive() { return this.state !== 'dead'; }
  chest() { return { x: this.pos.x, y: this.pos.y + 1.3, z: this.pos.z }; }
  hurtVolumes() { return [{ type: 'capsule', x: this.pos.x, z: this.pos.z, y0: this.pos.y + 0.3, y1: this.pos.y + 1.5, r: 0.32 }]; }
  facing() { return { x: Math.sin(this.yaw), z: Math.cos(this.yaw) }; }

  _setState(s) { this.state = s; this.stateT = 0; }
  useStamina(v) { this.st = Math.max(0, this.st - v); this.stDelay = 0.7; }

  /** dano recebido; from = posição do atacante */
  takeHit({ dmg, from, blockable = true, knock = 2.5, source = null }) {
    if (this.state === 'dead') return 'ignored';
    if (this.iframes > 0) return 'dodged';
    const dx = from.x - this.pos.x, dz = from.z - this.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    const f = this.facing();
    const front = (dx * f.x + dz * f.z) / d > 0.25;
    const g = this.game;
    if (this.state === 'block' && blockable && front && this.st > 0) {
      this.useStamina(dmg * 1.3 + 8);
      g.audio.play('block', this.pos);
      g.combat.sparks({ x: this.pos.x + f.x * 0.5, y: this.pos.y + 1.3, z: this.pos.z + f.z * 0.5 }, 10);
      this.knock.x = -dx / d * knock * 0.5; this.knock.z = -dz / d * knock * 0.5;
      if (this.st <= 0) { this._setState('hit'); this.stateT = -0.4; g.hud.toast('Guarda quebrada!'); }
      const chip = dmg * 0.12;
      this.hp -= chip;
      this._wear(0.5); // aparar com a arma também a desgasta
      return 'blocked';
    }
    this.hp -= dmg;
    this.stats.damageTaken += dmg;
    g.audio.play('hurt', this.pos);
    g.combat.blood(this.chest(), 10);
    g.hud.flashDamage();
    g.cameraCtl.addShake(0.5);
    this.knock.x = -dx / d * knock; this.knock.z = -dz / d * knock;
    if (this.hp <= 0) { this.hp = 0; this._die(); return 'dead'; }
    if (this.state !== 'grabbed') { this.attack = null; this.queued = null; this._setState('hit'); }
    return 'hit';
  }

  /** dano do ambiente (água podre, choque): sem defesa nem empurrão, sem interromper a ação */
  envDamage(dmg) {
    if (this.state === 'dead') return 'ignored';
    this.hp -= dmg; this.stats.damageTaken += dmg;
    this.game.hud.flashDamage();
    if (this.hp <= 0) { this.hp = 0; this._die(); return 'dead'; }
    return 'hit';
  }

  startGrab(enemy, need = 7) {
    if (this.state === 'dead' || this.iframes > 0 || this.state === 'grabbed') return false;
    this.attack = null; this.queued = null;
    this.grabbedBy = enemy; this.struggle = 0; this.struggleNeed = need;
    this._setState('grabbed');
    this.game.hud.setStruggle(true);
    return true;
  }
  releaseGrab(broke) {
    if (this.state !== 'grabbed') return;
    const e = this.grabbedBy;
    this.grabbedBy = null;
    this.game.hud.setStruggle(false);
    this._setState('free');
    this.iframes = 0.5;
    if (broke && e) { e.onGrabBroken?.(); this.game.hud.toast('Você se soltou!'); }
  }

  _die() {
    this._setState('dead');
    this.game.hud.setStruggle(false);
    this.grabbedBy = null;
    this.game.onPlayerDeath();
  }

  _softTarget(dir) {
    let best = null, bs = Infinity;
    for (const e of this.game.targets()) {
      if (!e.alive || e.isProp) continue;
      const dx = e.pos.x - this.pos.x, dz = e.pos.z - this.pos.z, dy = e.pos.y - this.pos.y;
      if (Math.abs(dy) > 1.5) continue;
      const d = Math.hypot(dx, dz);
      if (d > 3.6) continue;
      const dot = (dx * dir.x + dz * dir.z) / (d || 1);
      if (dot < 0.35) continue;
      const s = d - dot * 1.5;
      if (s < bs) { bs = s; best = e; }
    }
    return best;
  }

  _startAttack(kind) {
    const w = this.weapon;
    const a = w.attacks[kind];
    if (!a) return false;
    if (a.shoot) return this._startShot(a);
    if (this.st < 4) { this.game.hud.toast('Sem fôlego'); return false; }
    this.useStamina(a.stamina);
    this.attack = { kind, def: a, t: 0, anim: ATTACK_ANIM[a.anim], hit: false, recoiled: false };
    this.hitSet.clear();
    // direção: entrada do jogador ou câmera; mira suave no inimigo mais próximo à frente
    const cf = this.game.cameraCtl.forward();
    const mv = this._wishDir();
    const dir = mv.len > 0.2 ? { x: mv.x / mv.len, z: mv.z / mv.len } : cf;
    const tgt = this._softTarget(dir) || this._softTarget(cf);
    this.yaw = tgt ? Math.atan2(tgt.pos.x - this.pos.x, tgt.pos.z - this.pos.z) : Math.atan2(dir.x, dir.z);
    // REV6: o golpe do clipe alcança ~0,7 m à frente do quadril (o boneco procedural esticava ~1,2 m).
    // Com alvo à frente, o avanço do golpe cobre a diferença (até 0,5 m) — a hitbox continua sendo a lâmina visível.
    this.attack.reach = 0;
    if (tgt && this.model?.ready && !a.shoot) {
      const dist = Math.hypot(tgt.pos.x - this.pos.x, tgt.pos.z - this.pos.z);
      const lungeDist = a.lunge * (a.lungeAt[1] - a.lungeAt[0]) * a.dur;
      this.attack.reach = THREE.MathUtils.clamp(dist - (tgt.radius ?? 0.4) - 0.62 - lungeDist, 0, 0.5);
    }
    this._setState('attack');
    this.game.audio.play('swing', this.pos, { heavy: kind === 'heavy' });
    this.game.perception.noise(this.pos, kind === 'heavy' ? 9 : 7, 'attack');
    this._sampleWeapon();
    return true;
  }

  /** alvo da mira automática: o mais alinhado dentro do cone, com linha de tiro livre */
  aimTarget(dir, shot) {
    const g = this.game, eye = { x: this.pos.x, y: this.pos.y + 1.4, z: this.pos.z };
    let best = null, bs = Infinity;
    for (const e of g.targets()) {
      if (!e.alive || !e.hurtVolumes) continue;
      for (const v of e.hurtVolumes()) {
        const c = { x: v.x, y: v.type === 'capsule' ? (v.y0 + v.y1) / 2 : v.y, z: v.z };
        if (v.type === 'capsule') c.y = Math.min(v.y1, Math.max(v.y0, eye.y - 0.1));
        const dx = c.x - eye.x, dz = c.z - eye.z, dy = c.y - eye.y, d = Math.hypot(dx, dz);
        if (d > shot.range || d < 0.2 || Math.abs(dy) > 2.6) continue;
        const ang = Math.acos(Math.max(-1, Math.min(1, (dx * dir.x + dz * dir.z) / d)));
        const tol = shot.cone + Math.atan2(v.r || 0.3, d);
        if (ang > tol) continue;
        if (!g.col.segmentClear(eye, c, (b) => (b.tag === 'wall' || b.tag === 'door' || b.tag === 'obstacle') && b.blocksSight !== false)) continue;
        const sc = ang * 6 + d * 0.04 - (v.part === 'weak' ? 0.2 : 0);
        if (sc < bs) { bs = sc; best = { target: e, volume: v, point: c, dist: d }; }
      }
    }
    return best;
  }

  _startShot(a, manual = false) {
    const g = this.game, w = this.weapon, inv = g.inventory;
    if (inv.rounds(w.id) <= 0) {
      g.audio.play('dryfire', this.pos);
      g.hud.toast(inv.has(w.ammo) ? 'Clique seco. Tambor vazio — [T] recarrega.' : 'Clique seco. Sem munição .38.', 1.8);
      this.dryFires = (this.dryFires || 0) + 1;
      return false;
    }
    inv.loaded[w.id] = inv.rounds(w.id) - 1;
    this.useStamina(a.stamina);
    if (manual) {
      // mira manual: a bala vai para onde a retícula aponta, sem ajuda
      this.yaw = g.cameraCtl.yaw;
      this.attack = { kind: 'heavy', def: a, t: 0, anim: ATTACK_ANIM[a.anim], hit: false, recoiled: false, shot: true, fired: false, aim: null, manual: true };
      this.hitSet.clear();
      this._setState('attack');
      return true;
    }
    const cf = g.cameraCtl.forward();
    const mv = this._wishDir();
    const dir = mv.len > 0.2 ? { x: mv.x / mv.len, z: mv.z / mv.len } : cf;
    const aim = this.aimTarget(dir, w.shot) || (dir !== cf ? this.aimTarget(cf, w.shot) : null);
    this.yaw = aim ? Math.atan2(aim.point.x - this.pos.x, aim.point.z - this.pos.z) : Math.atan2(dir.x, dir.z);
    this.attack = { kind: 'heavy', def: a, t: 0, anim: ATTACK_ANIM[a.anim], hit: false, recoiled: false, shot: true, fired: false, aim };
    this.hitSet.clear();
    this._setState('attack');
    return true;
  }

  _fire() {
    const g = this.game, w = this.weapon, S = w.shot, a = this.attack;
    a.fired = true;
    this.stats.shots = (this.stats.shots || 0) + 1;
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const m = this.axe.muzzle ? new THREE.Vector3() : null;
    if (m) this.axe.muzzle.getWorldPosition(m);
    const from = m || new THREE.Vector3(this.pos.x + fx * 0.6, this.pos.y + 1.4, this.pos.z + fz * 0.6);
    this.muzzle.position.copy(from); this.muzzle.intensity = 6;
    g.audio.play('shot', this.pos);
    g.cameraCtl.addShake(0.3);
    g.perception.noise(this.pos, S.noise, 'gunshot');
    g.combat.sparks(from, 6);
    if (a.manual) { this._fireManual(S, w); return; }
    // o alvo pode ter se movido: reconfirma a mira na direção travada
    const aim = this.aimTarget({ x: fx, z: fz }, { ...S, cone: 0.12 });
    if (aim) {
      a.hit = true; this.lastShot = { hit: aim.target.id || 'alvo', at: aim.point };
      const res = aim.target.takeHit({ dmg: S.dmg, weapon: w.id, poise: S.poise, heavy: true, bullet: true, from: this.pos, point: aim.point, volume: aim.volume });
      if (res !== 'immune') this.hitstop = 0.05;
      return;
    }
    // errou: a bala acerta a parede mais próxima
    const eye = new THREE.Vector3(this.pos.x, this.pos.y + 1.4, this.pos.z), d = new THREE.Vector3(fx, 0, fz);
    const t = g.col.raycast(eye, d, S.range, (b) => b.tag !== 'prop-low');
    this.lastShot = { hit: null };
    if (t < S.range) { const at = eye.addScaledVector(d, t - 0.05); g.combat.sparks(at, 10); g.audio.play('clang', at, { pitch: 1.6 }); }
  }

  /** tiro da mira manual: raio do ombro pela retícula, parede bloqueia, cabeça vale mais */
  _fireManual(S, w) {
    const g = this.game, a = this.attack;
    const { o, d } = g.cameraCtl.aimRay(this.pos);
    const wallT = g.col.raycast(o, d, S.range, (b) => b.tag !== 'prop-low');
    const hit = g.combat.rayHit(o, d, Math.min(S.range, wallT), g.targets().filter((e) => e !== this));
    if (hit) {
      const v = hit.volume;
      const head = v.part === 'head' || (v.type === 'capsule' && hit.point.y >= v.y1 - 0.3 && v.part !== 'weak');
      const dmg = Math.round(S.dmg * (head ? 1.4 : 1));
      a.hit = true; this.lastShot = { hit: hit.target.id || 'alvo', at: hit.point, manual: true, head };
      const res = hit.target.takeHit({ dmg, weapon: w.id, poise: S.poise * (head ? 1.3 : 1), heavy: true, bullet: true, from: this.pos, point: hit.point, volume: v });
      if (res !== 'immune') { this.hitstop = 0.05; if (head) g.hud.toast('Na cabeça.', 0.9); }
      return;
    }
    this.lastShot = { hit: null, manual: true };
    if (wallT < S.range) {
      const at = o.clone().addScaledVector(d, wallT - 0.05);
      g.combat.sparks(at, 10); g.audio.play('clang', at, { pitch: 1.6 });
    }
  }

  /** desgaste da arma em mãos (com avisos quando muda de faixa) */
  _wear(amount) {
    const g = this.game, w = this.weapon;
    if (!w?.durability || !(amount > 0)) return;
    const r = g.inventory.addWear(w.id, amount);
    if (!r) return;
    const crossed = [0.5, 0.25, 0].find((th) => r.before > th && r.after <= th);
    if (crossed === undefined) return;
    if (crossed === 0) { g.hud.toast(`${w.name} quebrou — ainda bate, mas fraco. [G] repara com um kit.`, 3); g.audio.play('clang', this.pos, { pitch: 0.6 }); }
    else g.hud.toast(`${w.name} ${conditionLabel(r.after)} (${Math.round(r.after * 100)}%) — [G] para reparar.`, 2.4);
  }

  /** G: reparar a arma em mãos (kit de reparo = 100%; pedra de afiar = lâminas até 60%) */
  _tryRepair() {
    const g = this.game, w = this.weapon, inv = g.inventory;
    if (!w) return false;
    if (!w.durability) { g.hud.toast(w.ranged ? 'O revólver não precisa de reparo — [T] recarrega.' : 'Nada a reparar.', 1.6); return false; }
    const cond = inv.condition(w.id);
    if (cond >= 0.999) { g.hud.toast(`${w.name} está em bom estado.`, 1.5); return false; }
    if (inv.has('kit_reparo')) {
      this.repairing = { kit: true, to: 1, dur: 1.6 };
    } else if (w.sharpenable && inv.has('pedra_afiar') && cond < 0.6) {
      this.repairing = { kit: false, to: 0.6, dur: 1.2 };
    } else {
      g.hud.toast(w.sharpenable && inv.has('pedra_afiar') ? 'A pedra não faz mais que isso. Precisa de um kit de reparo.' : 'Sem kit de reparo.', 2);
      return false;
    }
    this._setState('repair');
    g.audio.play(this.repairing.kit ? 'switch' : 'swing', this.pos);
    g.perception.noise(this.pos, 3, 'repair');
    return true;
  }

  /** T: recarregar o tambor */
  _tryReload() {
    const g = this.game, w = this.weapon, inv = g.inventory;
    if (!w?.cylinder) return false;
    if (inv.rounds(w.id) >= w.cylinder) { g.hud.toast('Tambor cheio.', 1.2); return false; }
    if (!inv.has(w.ammo)) { g.hud.toast('Sem munição .38 de reserva.', 1.6); return false; }
    this.reloadMoved = 0;
    this._setState('reload');
    g.audio.play('locked', this.pos);
    return true;
  }

  _sampleWeapon() {
    this.rig.root.updateMatrixWorld(true);
    this.axe.tip.getWorldPosition(this.prevTip);
    this.axe.mid.getWorldPosition(this.prevMid);
  }

  _wishDir() {
    const ax = this.game.input.moveAxis();
    const y = this.game.cameraCtl.yaw;
    const fx = Math.sin(y), fz = Math.cos(y), rx = -Math.cos(y), rz = Math.sin(y);
    const x = fx * ax.y + rx * ax.x, z = fz * ax.y + rz * ax.x;
    return { x, z, len: Math.hypot(x, z) };
  }

  update(dt) {
    const g = this.game, input = g.input;
    const adt = this.hitstop > 0 ? dt * 0.08 : dt; // hit stop local (só o jogador)
    this.hitstop = Math.max(0, this.hitstop - dt);
    this.stateT += adt;
    this.iframes = Math.max(0, this.iframes - dt);
    this.animT += dt;
    if (this.muzzle.intensity > 0) this.muzzle.intensity = Math.max(0, this.muzzle.intensity - dt * 60);

    // fôlego
    this.stDelay -= dt;
    if (this.stDelay <= 0 && this.state !== 'block') this.st = Math.min(this.maxSt, this.st + 30 * dt);

    const wish = this._wishDir();
    let speed = 0;
    let moveX = 0, moveZ = 0;

    switch (this.state) {
      case 'free': {
        const running = input.isDown('run') && this.st > 1 && wish.len > 0.5;
        speed = running ? 4.6 : 2.5;
        if (running) { this.st -= 14 * dt; this.stDelay = 0.4; }
        moveX = wish.x * speed; moveZ = wish.z * speed;
        if (wish.len > 0.1) this._turnTo(Math.atan2(wish.x, wish.z), 11 * dt);
        this.running = running;
        if (this.weapon && input.wasPressed('light')) this._startAttack('light1');
        else if (this.weapon && input.wasPressed('heavy')) this._startAttack('heavy');
        else if (input.wasPressed('dodge') && this.st >= 10) this._startDodge(wish);
        else if (this.weapon && input.isDown('block')) this._setState(this.weapon.ranged ? 'aim' : 'block');
        else if (input.wasPressed('heal')) this._tryHeal();
        else if (input.wasPressed('swap')) this.cycleWeapon();
        else if (input.wasPressed('reload')) this._tryReload();
        else if (input.wasPressed('repair')) this._tryRepair();
        else if (input.wasPressed('interact')) g.tryInteract();
        break;
      }
      case 'block': {
        speed = 1.2;
        moveX = wish.x * speed; moveZ = wish.z * speed;
        const cf = g.cameraCtl.forward();
        this._turnTo(Math.atan2(cf.x, cf.z), 12 * dt);
        if (!input.isDown('block')) this._setState('free');
        else if (input.wasPressed('dodge') && this.st >= 10) this._startDodge(wish);
        else if (input.wasPressed('light')) this._startAttack('light1');
        break;
      }
      case 'aim': {
        // mira manual: anda devagar, o corpo acompanha a câmera; botão esq./dir. dispara pela retícula
        speed = 1.1;
        moveX = wish.x * speed; moveZ = wish.z * speed;
        this.yaw = g.cameraCtl.yaw;
        if (!input.isDown('block') || !this.weapon?.ranged) this._setState('free');
        else if (input.wasPressed('dodge') && this.st >= 10) this._startDodge(wish);
        else if (input.wasPressed('light') || input.wasPressed('heavy')) this._startShot(this.weapon.attacks.heavy, true);
        else if (input.wasPressed('reload')) this._tryReload();
        break;
      }
      case 'reload': {
        const w = this.weapon, inv = g.inventory;
        speed = 1.0;
        moveX = wish.x * speed; moveZ = wish.z * speed;
        if (wish.len > 0.1) this._turnTo(Math.atan2(wish.x, wish.z), 8 * dt);
        if (!w?.cylinder) { this._setState('free'); break; }
        if (input.wasPressed('dodge') && this.st >= 10) { this._startDodge(wish); break; }
        // um cartucho por vez: dá para parar no meio (esquiva) e ficar com o que já entrou
        const due = Math.floor(Math.max(0, this.stateT - w.reloadBase) / w.reloadPer + 1e-6);
        while (this.reloadMoved < due && inv.rounds(w.id) < w.cylinder && inv.has(w.ammo)) {
          inv.remove(w.ammo); inv.loaded[w.id] = inv.rounds(w.id) + 1; this.reloadMoved++;
          g.audio.play('switch', this.pos);
          g.perception.noise(this.pos, 2.5, 'reload');
        }
        if (inv.rounds(w.id) >= w.cylinder || !inv.has(w.ammo)) {
          if (this.stateT >= w.reloadBase + this.reloadMoved * w.reloadPer + 0.15) {
            g.hud.toast(`Tambor: ${inv.rounds(w.id)}/${w.cylinder}`, 1.2);
            this._setState(input.isDown('block') ? 'aim' : 'free');
          }
        }
        break;
      }
      case 'repair': {
        const rp = this.repairing;
        if (!rp || !this.weapon) { this._setState('free'); break; }
        if (input.wasPressed('dodge') && this.st >= 10) { this.repairing = null; g.hud.toast('Reparo interrompido.', 1.2); this._startDodge(wish); break; }
        if (this.stateT > rp.dur) {
          const inv = g.inventory, w = this.weapon;
          if (rp.kit) inv.remove('kit_reparo');
          inv.repair(w.id, rp.to);
          this.repairs = (this.repairs || 0) + 1;
          g.audio.play('pickup', this.pos);
          g.hud.toast(rp.kit ? `${w.name} reparado — fita, arame e lixa (100%).` : `Fio refeito na pedra (${Math.round(inv.condition(w.id) * 100)}%).`, 2);
          this.repairing = null;
          this._setState('free');
        }
        break;
      }
      case 'attack': this._updateAttack(adt, dt, input); break;
      case 'dodge': {
        const t = this.stateT;
        const sp = t < 0.32 ? 7.2 * (1 - t / 0.4) : 0;
        moveX = this.dodgeDir.x * sp; moveZ = this.dodgeDir.z * sp;
        this.iframes = t > 0.03 && t < 0.3 ? Math.max(this.iframes, 0.01) : this.iframes;
        if (t > 0.5) this._setState('free');
        break;
      }
      case 'hit': if (this.stateT > 0.42) this._setState('free'); break;
      case 'heal':
        if (this.stateT > 1.1) {
          this.hp = Math.min(this.maxHp, this.hp + (this.healAmount || 45));
          g.audio.play('pickup', this.pos);
          g.hud.toast(`Ferimentos enfaixados (+${this.healAmount || 45})`);
          this._setState('free');
        }
        break;
      case 'grabbed': {
        if (input.wasPressed('light') || input.wasPressed('interact') || input.wasPressed('dodge') || input.wasPressed('heavy')) {
          this.struggle++;
          g.cameraCtl.addShake(0.15);
          if (this.struggle >= this.struggleNeed) this.releaseGrab(true);
        }
        const e = this.grabbedBy;
        if (e) {
          if (!e.alive) this.releaseGrab(false);
          else this.yaw = Math.atan2(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
        }
        break;
      }
      case 'dead': break;
      default: break;
    }

    // água (Cap. 5): o nível informa lentidão e correnteza onde Elias está com água pela cintura
    const env = g.level?.waterAt?.(this.pos) || null;
    if (env) { moveX *= env.slow; moveZ *= env.slow; }
    // velocidade suavizada + empurrões
    const acc = this.state === 'dodge' || this.state === 'attack' ? 30 : 12;
    const k = Math.min(1, acc * dt);
    this.vel.x += (moveX - this.vel.x) * k;
    this.vel.z += (moveZ - this.vel.z) * k;
    if (this.state === 'attack' && this.attack) {
      const lunge = this._lungeSpeed();
      this.vel.x = Math.sin(this.yaw) * lunge; this.vel.z = Math.cos(this.yaw) * lunge;
    }
    if (this.state === 'grabbed' || this.state === 'dead') { this.vel.x = 0; this.vel.z = 0; }
    this.pos.x += (this.vel.x + this.knock.x + (env ? env.cx : 0)) * dt;
    this.pos.z += (this.vel.z + this.knock.z + (env ? env.cz : 0)) * dt;
    this.knock.x *= Math.max(0, 1 - 8 * dt); this.knock.z *= Math.max(0, 1 - 8 * dt);

    // colisões: cenário e inimigos
    g.col.resolveCircle(this.pos, this.radius, this.height);
    for (const e of g.targets()) {
      if (!e.alive || !e.solid) continue;
      const dx = this.pos.x - e.pos.x, dz = this.pos.z - e.pos.z, dy = this.pos.y - e.pos.y;
      if (Math.abs(dy) > 1.5) continue;
      const min = this.radius + e.radius;
      const d = Math.hypot(dx, dz);
      if (d < min && d > 1e-4) { this.pos.x += dx / d * (min - d); this.pos.z += dz / d * (min - d); }
    }
    g.col.resolveCircle(this.pos, this.radius, this.height);

    // gravidade / chão (rampas, elevador)
    const ground = g.col.groundAt(this.pos.x, this.pos.z, this.pos.y);
    if (ground === -Infinity) {
      this.vy -= 20 * dt; this.pos.y += this.vy * dt;
      if (this.pos.y < -30) g.onPlayerFellOut();
    } else if (this.pos.y > ground + 0.05 && !(this.onGround && this.pos.y - ground < 0.65)) {
      this.vy -= 20 * dt; this.pos.y = Math.max(ground, this.pos.y + this.vy * dt); this.onGround = this.pos.y <= ground;
      if (this.onGround) this.vy = 0;
    } else { this.pos.y = ground; this.vy = 0; this.onGround = true; }

    // passos e ruído
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (this.onGround && hs > 0.5 && (this.state === 'free' || this.state === 'block')) {
      this.stepAcc += hs * dt;
      const stride = this.running ? 1.05 : 0.8;
      if (this.stepAcc > stride) {
        this.stepAcc = 0;
        g.audio.play('step', null, { vol: this.running ? 0.35 : 0.2 });
        g.perception.noise(this.pos, this.running ? 7.5 : 2.5, 'step');
      }
    }

    // câmera de mira só enquanto mira (ou no tiro manual com Q ainda segurado)
    if (g.cameraCtl) g.cameraCtl.aiming = this.state === 'aim' || (this.state === 'reload' && input.isDown('block')) || (this.state === 'attack' && !!this.attack?.manual);

    this._animate(dt, adt, hs);
    this.rig.root.position.copy(this.pos);
    this.rig.root.rotation.y = this.yaw;
    if (this.model?.ready) this.model.update(dt);
  }

  _turnTo(target, maxStep) {
    let d = target - this.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.yaw += Math.max(-maxStep, Math.min(maxStep, d));
  }

  _startDodge(wish) {
    this.useStamina(20);
    const cf = this.game.cameraCtl.forward();
    this.dodgeDir = wish.len > 0.2 ? { x: wish.x / wish.len, z: wish.z / wish.len } : { x: -cf.x, z: -cf.z };
    if (wish.len > 0.2) this.yaw = Math.atan2(this.dodgeDir.x, this.dodgeDir.z);
    this.iframes = 0.27;
    this._setState('dodge');
    this.game.audio.play('step', null, { vol: 0.5 });
  }

  _tryHeal() {
    const inv = this.game.inventory;
    if (!inv.has('bandagem')) { this.game.hud.toast('Sem bandagens.'); return; }
    if (this.hp >= this.maxHp) { this.game.hud.toast('Você não está ferido.'); return; }
    inv.remove('bandagem');
    this._setState('heal');
  }

  _lungeSpeed() {
    const a = this.attack, d = a.def;
    const t = a.t / d.dur;
    const extra = a.reach ? a.reach / ((d.lungeAt[1] - d.lungeAt[0]) * d.dur) : 0;
    return t > d.lungeAt[0] && t < d.lungeAt[1] ? d.lunge + extra : 0;
  }

  _updateAttack(adt, dt, input) {
    const a = this.attack, d = a.def;
    a.t += adt;
    const t = a.t / d.dur;
    // buffer de combo
    if (d.next && input.wasPressed('light') && t > 0.3) this.queued = d.next;
    if (input.wasPressed('dodge') && t > d.cancel && this.st >= 10) { this.attack = null; this._startDodge(this._wishDir()); return; }

    // hitbox sincronizada: posição real da cabeça do machado (após aplicar a pose deste quadro)
    this._poseAttack(t);
    this.rig.root.position.copy(this.pos); this.rig.root.rotation.y = this.yaw;
    // GLB: clipe posicionado no tempo casado com a janela active (ou pose procedural copiada) antes de ler a lâmina
    if (this.model?.ready) { this.model.poseAttack(a, t); this.model.apply(); } else this.rig.root.updateMatrixWorld(true);
    const tip = new THREE.Vector3(), mid = new THREE.Vector3();
    this.axe.tip.getWorldPosition(tip); this.axe.mid.getWorldPosition(mid);
    if (a.shot) {
      if (!a.fired && t >= d.active[0]) this._fire();
    } else if (t >= d.active[0] && t <= d.active[1] && !a.recoiled) {
      const g = this.game;
      // primeiro o corpo atingido; só ricocheteia na parede se a lâmina não acertou ninguém antes
      const hits = g.combat.sweep(this.prevTip, tip, this.weapon.tipRadius, g.targets(), this.hitSet);
      const hits2 = g.combat.sweep(this.prevMid, mid, this.weapon.midRadius, g.targets(), this.hitSet).filter((h) => !hits.some((x) => x.target === h.target));
      const all = [...hits, ...hits2];
      const wall = !all.length && g.col.pointInside(tip, (b) => b.tag === 'wall' || b.tag === 'door' || b.tag === 'obstacle');
      if (wall && !a.hit) {
        a.recoiled = true;
        this._wear(wearCost(this.weapon, a.kind, this.sharpened, true));
        g.audio.play('clang', tip);
        g.combat.sparks(tip, 14);
        g.cameraCtl.addShake(0.25);
        g.perception.noise(tip, 10, 'clang');
        a.t = Math.max(a.t, d.dur * 0.75);
      } else {
        for (const h of all) {
          this.hitSet.add(h.target);
          a.hit = true;
          const res = h.target.takeHit({ dmg: weaponDamage(this.weapon, d, this.sharpened, this.game.inventory.condition(this.weapon.id)), weapon: this.weapon.id, poise: d.poise, heavy: a.kind === 'heavy', from: this.pos, point: h.point, volume: h.volume });
          if (res !== 'immune') {
            this.hitstop = a.kind === 'heavy' ? 0.09 : 0.055;
            g.cameraCtl.addShake(a.kind === 'heavy' ? 0.35 : 0.18);
          }
        }
        // um golpe que acerta desgasta uma vez (não importa quantos alvos)
        if (all.length && !a.worn) { a.worn = true; this._wear(wearCost(this.weapon, a.kind, this.sharpened)); }
      }
    } else if (this.game.combat.debug) {
      this.game.combat.debugSphere(tip, this.weapon.tipRadius, 0x666666);
    }
    this.prevTip.copy(tip); this.prevMid.copy(mid);

    if (a.t >= d.dur || (this.queued && t > d.comboAt)) {
      const q = this.queued; this.queued = null;
      const manual = a.manual;
      this.attack = null;
      this._setState(manual && input.isDown('block') && this.weapon?.ranged ? 'aim' : 'free');
      if (q && this.st > 4) this._startAttack(q);
    }
  }

  _poseAttack(t) {
    const r = this.rig, A = this.attack.anim;
    resetPose(r);
    r.torso.rotation.y = keys(A.torsoY, t);
    if (A.torsoX) r.torso.rotation.x = keys(A.torsoX, t);
    r.armR.upper.rotation.x = keys(A.upX, t);
    r.armR.upper.rotation.z = keys(A.upZ, t);
    r.armR.lower.rotation.x = keys(A.loX, t);
    if (A.twoHands) {
      r.armL.upper.rotation.x = keys(A.upX, t) * 0.95;
      r.armL.upper.rotation.z = -0.45;
      r.armL.lower.rotation.x = keys(A.loX, t);
    } else {
      r.armL.upper.rotation.x = 0.3; r.armL.upper.rotation.z = 0.25;
    }
    // pernas em base de luta
    r.legR.upper.rotation.x = 0.25; r.legL.upper.rotation.x = -0.35; r.legL.lower.rotation.x = 0.3;
    r.hips.position.y = r.baseHipY - 0.06;
  }

  _animate(dt, adt, hs) {
    if (this.state === 'attack') return; // pose aplicada em _updateAttack
    this._animateProc(dt, adt, hs);
    const M = this.model;
    if (!M?.ready) return;
    // clipe do GLB por estado; estados sem clipe copiam a pose procedural para os ossos do GLB
    switch (this.state) {
      case 'free': M.locomote(hs, this.running, dt); M.mask = null; break;
      case 'locked': M.locomote(0, false, dt); M.mask = null; break;
      case 'block': M.locomote(hs, false, dt); M.mask = RETARGET.arms; break;
      case 'aim': M.locomote(hs, false, dt); M.mask = RETARGET.aim; break;
      default: M.base(); M.mask = RETARGET.full; break;
    }
  }

  _animateProc(dt, adt, hs) {
    const r = this.rig;
    resetPose(r);
    const t = this.stateT;
    switch (this.state) {
      case 'free': case 'block': {
        const amt = Math.min(1, hs / 2.5);
        this.walkPhase += hs * dt * 2.6;
        if (amt > 0.05) poseWalk(r, this.walkPhase, amt, this.running ? 1 : 0);
        else poseIdle(r, this.animT);
        if (this.weapon && this.state === 'free') { r.armR.lower.rotation.x -= 0.35; }
        if (this.state === 'block') {
          r.armR.upper.rotation.x = -1.25; r.armR.upper.rotation.z = 0.55; r.armR.lower.rotation.x = -0.9;
          r.armL.upper.rotation.x = -1.2; r.armL.upper.rotation.z = -0.5; r.armL.lower.rotation.x = -1.1;
          r.torso.rotation.x = 0.12;
        }
        break;
      }
      case 'dodge': {
        const k = Math.sin(Math.min(1, t / 0.45) * Math.PI);
        r.hips.position.y = r.baseHipY - 0.35 * k;
        r.torso.rotation.x = 0.7 * k;
        r.legR.upper.rotation.x = -1.0 * k; r.legR.lower.rotation.x = 1.6 * k;
        r.legL.upper.rotation.x = -0.6 * k; r.legL.lower.rotation.x = 1.4 * k;
        r.armR.upper.rotation.x = -0.8 * k; r.armL.upper.rotation.x = -0.8 * k;
        break;
      }
      case 'hit': {
        const k = Math.sin(Math.min(1, t / 0.42) * Math.PI);
        r.torso.rotation.x = -0.45 * k; r.head.rotation.x = -0.4 * k;
        r.armR.upper.rotation.z = -0.6 * k; r.armL.upper.rotation.z = 0.6 * k;
        break;
      }
      case 'aim': {
        const amt = Math.min(1, hs / 2.5);
        this.walkPhase += hs * dt * 2.6;
        if (amt > 0.05) poseWalk(r, this.walkPhase, amt * 0.6, 0); else poseIdle(r, this.animT);
        // braço estendido na linha da câmera (a inclinação levanta/abaixa o braço)
        const pitch = this.game.cameraCtl?.pitch || 0;
        r.armR.upper.rotation.x = -1.5 + pitch * 0.9; r.armR.upper.rotation.z = 0.05; r.armR.lower.rotation.x = -0.05;
        r.armL.upper.rotation.x = -1.3 + pitch * 0.9; r.armL.upper.rotation.z = -0.5; r.armL.lower.rotation.x = -0.4;
        r.torso.rotation.y = 0.15;
        break;
      }
      case 'reload': {
        r.torso.rotation.x = 0.2;
        r.armR.upper.rotation.x = -0.7; r.armR.lower.rotation.x = -1.1; r.armR.upper.rotation.z = 0.2;
        r.armL.upper.rotation.x = -0.8; r.armL.lower.rotation.x = -1.2 + Math.sin(t * 18) * 0.15; r.armL.upper.rotation.z = -0.3;
        r.head.rotation.x = 0.35;
        break;
      }
      case 'repair': {
        r.hips.position.y = r.baseHipY - 0.25;
        r.legR.upper.rotation.x = -0.9; r.legR.lower.rotation.x = 1.3; r.legL.upper.rotation.x = -0.4; r.legL.lower.rotation.x = 0.9;
        r.torso.rotation.x = 0.45; r.head.rotation.x = 0.3;
        r.armR.upper.rotation.x = -0.8; r.armR.lower.rotation.x = -1.0 + Math.sin(t * 16) * 0.25;
        r.armL.upper.rotation.x = -0.7; r.armL.lower.rotation.x = -1.2;
        break;
      }
      case 'heal': {
        r.torso.rotation.x = 0.3; r.armR.upper.rotation.x = -0.9; r.armL.upper.rotation.x = -0.9;
        r.armR.lower.rotation.x = -1.2 + Math.sin(t * 14) * 0.2; r.armL.lower.rotation.x = -1.2;
        break;
      }
      case 'grabbed': {
        const s = Math.sin(this.animT * 22);
        r.armR.upper.rotation.x = -1.4 + s * 0.3; r.armL.upper.rotation.x = -1.4 - s * 0.3;
        r.torso.rotation.x = -0.3; r.hips.position.y = r.baseHipY + 0.1;
        break;
      }
      case 'dead': {
        const k = Math.min(1, t / 0.8);
        r.body.rotation.x = -Math.PI / 2 * (k * k);
        r.body.position.y = 0.12 * k;
        r.armR.upper.rotation.z = -1.2 * k; r.armL.upper.rotation.z = 1.2 * k;
        break;
      }
      default: break;
    }
  }
}
export { STATES };
