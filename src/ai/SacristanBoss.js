// Chefe do Capítulo 3: O Sacristão, guardião da cripta da Confraria.
// Herda a máquina de estados do Cirurgião (talho, agarrão, investida que atordoa nos pilares, ponto fraco
// nas costas) e acrescenta o que o GDD pede — ataques de área e invocação limitada:
//   • "giro do turíbulo" (todas as fases): o chão em volta dele se acende (raio ~3,2 m) e o turíbulo
//     varre 360° — não bloqueável, recue ou role; na fase 3 são dois giros seguidos;
//   • "incenso" (fase 2+): círculos de incenso telegrafados no chão onde Elias está; viram nuvens que
//     queimam enquanto ele ficar dentro (3 nuvens na fase 3);
//   • "sino" (ao entrar nas fases 2 e 3): toca o sino de mão e chama dois noviços dos ossuários
//     laterais — no máximo 2 vivos ao mesmo tempo e 4 no combate inteiro. Morrem com ele.
// Ponto fraco: o relicário de brasa amarrado às costas (a "chama do Sacristão" do Regimento, art. 8º).
import * as THREE from 'three';
import { SurgeonBoss } from './SurgeonBoss.js';
import { Enemy } from './EnemyController.js';
import { createHumanoid, keys } from '../gameplay/ProceduralRig.js';

export const SACRISTAN_PHASES = { p2: 0.65, p3: 0.3 };
export const SACRISTAN_SUMMON = { perCall: 2, maxAlive: 2, maxTotal: 4 };
export const SWEEP_R = 3.2;

export class SacristanBoss extends SurgeonBoss {
  constructor(game, o) {
    super(game, o);
    this.id = 'sacristao';
    this.name = 'O Sacristão';
    this.maxHp = 640; this.hp = this.maxHp;
    this.radius = 0.6;
    this.def = { height: 2.7, sight: 30, fov: 180, hearing: 2 };
    this.txt = { stunObst: 'Ele se chocou no pilar! O relicário nas costas está exposto!', stunWall: 'Ele bateu na parede!' };
    this.sweepCd = 3; this.incenseCd = 2.5;
    this.sweepN = 0; this.sweepHits = 0; this.cloudN = 0; this.cloudHits = 0; this.summonN = 0; this.summonCalls = 0;
    this.summonQueue = 0;
    this.niches = o.niches || [];
    this.summons = [];
    this.clouds = [];
  }

  _build() {
    const M = this.game.materials;
    const s = 1.42;
    this.scale = s;
    const robe = M.robe || M.altarCloth, veil = M.veil || M.coal;
    this.rig = createHumanoid({ scale: s, hunch: 0.2, torsoW: 0.5, armLen: 0.35, armW: 0.15,
      mats: { skin: M.deadSkin, shirt: robe, arms: robe, pants: robe, legs: robe, feet: M.leatherDark, head: M.deadSkin } });
    const h = this.rig.head;
    // capuz alto de sacristão e o rosto cinzento com olhos de brasa
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.3 * s, 0.42 * s, 0.32 * s), veil); hood.position.set(0, 0.2 * s, -0.02 * s); h.add(hood);
    const peak = new THREE.Mesh(new THREE.ConeGeometry(0.15 * s, 0.26 * s, 4), veil); peak.position.set(0, 0.52 * s, -0.04 * s); peak.rotation.y = Math.PI / 4; h.add(peak);
    for (const x of [-0.05, 0.05]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.035 * s, 0.02 * s, 0.01), M.ember); e.position.set(x * s, 0.19 * s, 0.135 * s); h.add(e); }
    // estola dourada sobre o peito e a batina que desce até o chão
    const stole = new THREE.Mesh(new THREE.BoxGeometry(0.14 * s, 0.6 * s, 0.03 * s), M.gold || M.brass); stole.position.set(0, 0.3 * s, 0.14 * s); this.rig.torso.add(stole);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * s, 0.4 * s, 0.78 * s, 8, 1, true), robe);
    skirt.material = robe; skirt.position.set(0, -0.36 * s, 0); this.rig.hips.add(skirt);
    // turíbulo de latão numa corrente, na mão direita (arma: talho e giro)
    const tool = new THREE.Group();
    for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.16), M.metal); c.position.z = 0.08 + k * 0.16; tool.add(c); }
    const censer = new THREE.Group(); censer.position.z = 0.78; tool.add(censer);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.22, 8), M.brass); pot.rotation.x = Math.PI / 2; censer.add(pot);
    const lid = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.14, 8), M.brass); lid.rotation.x = -Math.PI / 2; lid.position.z = -0.17; censer.add(lid);
    const coal = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.04), M.ember); coal.position.z = 0.12; censer.add(coal);
    tool.position.y = -0.05; this.rig.armR.end.add(tool);
    this.censer = censer;
    this.bladeTip = new THREE.Object3D(); this.bladeTip.position.set(0, 0, 0.8); tool.add(this.bladeTip);
    this.bladeMid = new THREE.Object3D(); this.bladeMid.position.set(0, 0, 0.45); tool.add(this.bladeMid);
    // sino de mão (invocação), na mão esquerda
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.11, 0.16, 8), M.brass); bell.position.set(0, -0.12, 0.06); this.rig.armL.end.add(bell);
    this.bell = bell;
    // relicário de brasa nas costas = ponto fraco (mesma altura/saliência do frasco do Cirurgião)
    const vialMat = M.vial.clone();
    vialMat.color.set(0x8a4a10); vialMat.emissive.set(0xffa030); vialMat.opacity = 0.92;
    this.vialMat = vialMat;
    this.vial = new THREE.Mesh(new THREE.BoxGeometry(0.26 * s, 0.34 * s, 0.18 * s), vialMat);
    this.vial.position.set(0, 0.36 * s, -0.3 * s);
    this.rig.torso.add(this.vial);
    for (const [w, hh, y] of [[0.3, 0.03, 0.18], [0.3, 0.03, -0.18], [0.03, 0.36, 0]]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(w * s, hh * s, 0.2 * s), M.brass); f.position.y = y * s; this.vial.add(f);
    }
    this.vialLight = new THREE.PointLight(0xffa040, 0.0, 4, 2);
    this.vial.add(this.vialLight);
    this.hand = new THREE.Object3D(); this.hand.position.set(0, -0.05, 0.1); this.rig.armL.end.add(this.hand);
    // anel telegrafado do giro do turíbulo
    const ringMat = M.fire.clone(); ringMat.color.set(0xffb050); ringMat.side = THREE.DoubleSide;
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.4, SWEEP_R, 24, 1), ringMat);
    this.ring.rotation.x = -Math.PI / 2; this.ring.visible = false;
    this.game.scene.add(this.ring);
    this.rig.root.position.copy(this.pos); this.rig.root.rotation.y = this.yaw;
    this.game.scene.add(this.rig.root);
    this._animate(0);
  }

  _set(s) {
    super._set(s);
    // dá às decisões de área a primeira palavra quando ele volta a rondar
    if (s === 'stalk') this.decideT = Math.max(this.decideT || 0, 0.35);
  }

  takeHit({ dmg, poise, heavy, from, point, volume }) {
    if (!this.alive || this.state === 'dormant' || this.state === 'intro') return 'immune';
    const g = this.game;
    const weak = volume?.part === 'weak';
    let real = weak ? dmg * 1.6 : dmg * 0.25;
    if (this.state === 'stunned' && !weak) real = dmg * 0.5;
    this.hp -= real;
    this.flinch = weak ? 0.35 : 0.1;
    if (weak) {
      this.weakHits = (this.weakHits || 0) + 1;
      g.audio.play('hit', this.pos, { heavy: true });
      g.audio.play('shriek', this.pos, { pitch: 0.5 });
      if (point) { g.combat.emit(point, 18, 0xffa030, 3.5); g.combat.sparks(point, 12); }
      g.hud.toast('O vidro do relicário estala — a brasa lá dentro geme!');
    } else {
      g.audio.play('clang', this.pos);
      if (point) g.combat.blood(point, 4);
      if (!this.warnedArmor) { this.warnedArmor = true; g.hud.toast('A batina pesada de chumbo nas barras absorve o golpe… o relicário nas costas é o ponto fraco.'); }
    }
    g.bus.emit('BossDamaged', this);
    if (this.hp <= 0) { this.hp = 0; this._die(); return 'dead'; }
    if (this.phase === 1 && this.hp < this.maxHp * SACRISTAN_PHASES.p2) this._enterPhase(2);
    else if (this.phase === 2 && this.hp < this.maxHp * SACRISTAN_PHASES.p3) this._enterPhase(3);
    if (weak && this.state === 'grabHold') { g.player.releaseGrab(false); this._set('stagger'); }
    return 'hit';
  }

  _enterPhase(n) {
    const g = this.game;
    this.phase = n;
    if (this.state !== 'stunned') this._set('roar');
    g.audio.play('roar', this.pos, { pitch: n === 3 ? 0.7 : 0.9 });
    g.cameraCtl.addShake(0.45);
    this.summonQueue++;
    this.incenseCd = 1.5; if (n === 3) this.sweepCd = Math.min(this.sweepCd, 1.5);
    g.hud.toast(n === 2 ? 'O Sacristão ergue o sino: "Irmãos, à missa!" — o incenso começa a arder no chão.'
      : 'A brasa do relicário arde mais forte. O Sacristão gira mais rápido — e o sino chama de novo.', 4);
    g.bus.emit('BossPhase', { boss: this, phase: n });
  }

  aliveSummons() { return this.summons.filter((e) => e.alive).length; }

  _summon() {
    const g = this.game, p = g.player;
    const room = Math.min(SACRISTAN_SUMMON.perCall, SACRISTAN_SUMMON.maxAlive - this.aliveSummons(), SACRISTAN_SUMMON.maxTotal - this.summonN);
    for (let k = 0; k < room; k++) {
      const n = this.niches[(this.summonN) % Math.max(1, this.niches.length)] || { x: this.pos.x + 2, y: this.pos.y, z: this.pos.z };
      const e = new Enemy(g, 'acolito', { id: 'sac_inv' + this.summonN, x: n.x, y: n.y, z: n.z, yaw: n.yaw ?? 0 });
      e.hp = 60; e.summoned = true;
      g.enemies.push(e); this.summons.push(e);
      e._alert(p.pos);
      g.combat.emit({ x: n.x, y: n.y + 1.2, z: n.z }, 22, 0xb09060, 2.5);
      this.summonN++;
    }
    this.summonCalls++;
  }

  _dropIncense() {
    const g = this.game, p = g.player, M = g.materials;
    const pts = [{ x: p.pos.x, z: p.pos.z }];
    if (this.phase >= 3) {
      const ax = Math.cos(this.yaw), az = -Math.sin(this.yaw);
      pts.push({ x: p.pos.x + ax * 2.6, z: p.pos.z + az * 2.6 }, { x: p.pos.x - ax * 2.6, z: p.pos.z - az * 2.6 });
    }
    const r = this.phase >= 3 ? 2.1 : 1.9;
    for (const q of pts) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xd0b070, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide });
      const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 18), mat); disc.rotation.x = -Math.PI / 2;
      const cmat = new THREE.MeshBasicMaterial({ color: 0x9a8a70, transparent: true, opacity: 0.0, depthWrite: false });
      const cloud = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r, 1.6, 12, 1, true), cmat);
      const grp = new THREE.Group(); grp.add(disc); grp.add(cloud); cloud.position.y = 0.8;
      grp.position.set(q.x, p.pos.y + 0.03, q.z); g.scene.add(grp);
      this.clouds.push({ x: q.x, y: p.pos.y, z: q.z, r, t: 0, tick: 0, grp, disc, cloud });
      this.cloudN++;
    }
    g.audio.play('swing', this.pos, { heavy: true });
  }

  _updateClouds(dt) {
    const g = this.game, p = g.player;
    const WARN = 0.9, LIFE = 4.5;
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const c = this.clouds[i];
      c.t += dt;
      if (c.t < WARN) { c.disc.material.opacity = 0.12 + 0.3 * (c.t / WARN) * (0.7 + 0.3 * Math.sin(c.t * 28)); }
      else {
        const fade = c.t > LIFE - 0.8 ? Math.max(0, (LIFE - c.t) / 0.8) : 1;
        c.disc.material.opacity = 0.18 * fade; c.cloud.material.opacity = 0.38 * fade;
        c.cloud.rotation.y += dt * 0.6;
        c.tick -= dt;
        if (p.alive && c.tick <= 0 && Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < c.r && Math.abs(p.pos.y - c.y) < 1.5) {
          c.tick = 0.5;
          const r = p.takeHit({ dmg: 6, from: { x: c.x, y: c.y, z: c.z }, blockable: false, knock: 0.5 });
          if (r !== 'dodged' && r !== 'ignored') this.cloudHits++;
          if (Math.random() < 0.5) g.audio.play('hurt', p.pos);
        }
        if (Math.random() < dt * 6) g.combat.emit({ x: c.x + (Math.random() - 0.5) * c.r, y: c.y + 0.4, z: c.z + (Math.random() - 0.5) * c.r }, 2, 0xa89a80, 0.8);
      }
      if (c.t > LIFE) { g.scene.remove(c.grp); c.disc.geometry.dispose(); c.cloud.geometry.dispose(); this.clouds.splice(i, 1); }
    }
  }

  clearArea() {
    for (const c of this.clouds) this.game.scene.remove(c.grp);
    this.clouds.length = 0;
    if (this.ring) this.ring.visible = false;
  }

  _die() {
    super._die();
    this.clearArea();
    // os noviços invocados desabam em cinza com o mestre
    for (const e of this.summons) if (e.alive) { e._die(); this.game.combat.emit({ x: e.pos.x, y: e.pos.y + 1, z: e.pos.z }, 16, 0x8a8478, 2); }
  }

  setDeadInstant() { super.setDeadInstant(); this.clearArea(); }

  update(dt) {
    const g = this.game, p = g.player;
    this.sweepCd -= dt; this.incenseCd -= dt;
    const dist = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    // decisões do Sacristão (as demais vêm do Cirurgião)
    if (this.state === 'stalk' && p.alive && this.stateT > 0.2) {
      if (this.summonQueue > 0 && this.summonN < SACRISTAN_SUMMON.maxTotal && this.aliveSummons() < SACRISTAN_SUMMON.maxAlive) this._set('summon');
      else if (this.sweepCd <= 0 && dist < SWEEP_R - 0.2) { this._set('sweep'); this.swept = 0; }
      else if (this.phase >= 2 && this.incenseCd <= 0 && dist > 3.6) { this._set('incense'); this.dropped = false; }
    }
    if (this.summonQueue > 0 && this.summonN >= SACRISTAN_SUMMON.maxTotal) this.summonQueue = 0;
    super.update(dt);
    const t = this.stateT;
    if (this.state === 'summon') {
      this._face(p.pos, 2, dt);
      if (t > 0.9 && !this.rang) {
        this.rang = true;
        g.audio.play('chime', this.pos, { f: 520 }); g.audio.play('chime', this.pos, { f: 390 });
        g.perception?.noise(this.pos, 20, 'metal');
        this._summon(); this.summonQueue = Math.max(0, this.summonQueue - 1);
        g.hud.toast('O sino dobra. Dos ossuários laterais, dois noviços se levantam.', 3.5);
      }
      if (t > 1.9) { this.rang = false; this._set('stalk'); }
    } else if (this.state === 'sweep') {
      // aviso de 0,9 s (o chão em volta se acende); depois o turíbulo varre 360° — dois giros na fase 3
      const spins = this.phase >= 3 ? 2 : 1, W = 0.9, P = 0.55;
      this.ring.visible = true;
      this.ring.position.set(this.pos.x, this.pos.y + 0.04, this.pos.z);
      if (t < W) { this.ring.material.opacity = 0.15 + 0.4 * (t / W) * (0.7 + 0.3 * Math.sin(t * 30)); this.ring.scale.setScalar(0.6 + 0.4 * t / W); }
      else if (this.swept < spins && t >= W + 0.12 + this.swept * P) {
        this.swept++; this.sweepN++;
        this.ring.material.opacity = 0.9; this.ring.scale.setScalar(1);
        g.audio.play('swing', this.pos, { heavy: true }); g.audio.play('swing', this.pos, { heavy: true, pitch: 0.8 });
        g.cameraCtl.addShake(0.35);
        for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; g.combat.emit({ x: this.pos.x + Math.sin(a) * 2.2, y: this.pos.y + 1.0, z: this.pos.z + Math.cos(a) * 2.2 }, 3, 0xffa040, 2); }
        const dd = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
        if (p.alive && dd < SWEEP_R && Math.abs(p.pos.y - this.pos.y) < 1.5) {
          const r = p.takeHit({ dmg: 20, from: this.pos, blockable: false, knock: 6 });
          this.sweepLast = r;
          if (r !== 'dodged' && r !== 'ignored') this.sweepHits++;
        }
      } else if (t >= W) this.ring.material.opacity = Math.max(0.1, this.ring.material.opacity - dt * 1.2);
      if (t > W + 0.2 + spins * P) { this.ring.visible = false; this._set('recover'); this.sweepCd = this.phase >= 3 ? 3.4 : 5; }
    } else if (this.state === 'incense') {
      if (t < 0.7) this._face(p.pos, 3.5, dt);
      if (t >= 0.7 && !this.dropped) { this.dropped = true; this._dropIncense(); }
      if (t > 1.3) { this._set('stalk'); this.incenseCd = this.phase >= 3 ? 4.5 : 6; }
    } else if (this.ring.visible) this.ring.visible = false;
    this._updateClouds(dt);
  }

  _animate(dt) {
    const r = this.rig, t = this.stateT;
    if (this.state === 'dormant') {
      super._animate(0);
      // ajoelhado diante do altar, mãos postas
      r.hips.position.y = r.baseHipY - 0.55;
      r.legR.upper.rotation.x = -1.4; r.legR.lower.rotation.x = 1.5; r.legL.upper.rotation.x = -1.4; r.legL.lower.rotation.x = 1.5;
      r.torso.rotation.x = 0.35; r.head.rotation.x = 0.4;
      r.armR.upper.rotation.x = -1.0; r.armL.upper.rotation.x = -1.0; r.armR.lower.rotation.x = -0.6; r.armL.lower.rotation.x = -0.6;
      r.armR.upper.rotation.z = 0.25; r.armL.upper.rotation.z = -0.25;
      return;
    }
    if (this.state === 'sweep') {
      super._animate(0);
      const W = 0.9, k = Math.min(1, t / W);
      r.armR.upper.rotation.z = -1.5 * k; r.armR.upper.rotation.x = -0.3; r.armR.lower.rotation.x = -0.1;
      r.hips.position.y = r.baseHipY - 0.12 * k;
      r.torso.rotation.y = t < W ? -0.6 * k : -0.6 + (t - W) * 11.4; // gira com o turíbulo
      return;
    }
    if (this.state === 'summon') {
      super._animate(0);
      const k = Math.min(1, t / 0.6), ring = t > 0.9 ? Math.sin(t * 30) * 0.4 : 0;
      r.armL.upper.rotation.x = -2.6 * k; r.armL.upper.rotation.z = 0.2 + ring; r.armL.lower.rotation.x = -0.2;
      r.head.rotation.x = -0.4 * k; r.torso.rotation.x = 0.05;
      return;
    }
    if (this.state === 'incense') {
      super._animate(0);
      r.armR.upper.rotation.x = keys([[0, -0.4], [0.6, 0.9], [0.75, -2.2], [1.3, -0.4]], t);
      r.armR.lower.rotation.x = keys([[0, -0.4], [0.6, -0.8], [0.75, -0.1], [1.3, -0.4]], t);
      r.torso.rotation.y = keys([[0, 0], [0.6, 0.4], [0.75, -0.3], [1.3, 0]], t);
      return;
    }
    super._animate(dt);
  }
}
