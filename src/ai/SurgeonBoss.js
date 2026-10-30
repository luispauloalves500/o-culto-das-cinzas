// Chefe: O Cirurgião. Padrões telegrafados (talho, agarrão, investida), atordoamento ao bater em
// obstáculos, ponto fraco real (frasco nas costas) e fase 2 abaixo de 50% da vida.
import * as THREE from 'three';
import { createHumanoid, resetPose, poseWalk, poseIdle, keys } from '../gameplay/ProceduralRig.js';

const tmp = new THREE.Vector3();
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

export class SurgeonBoss {
  constructor(game, o) {
    this.game = game;
    this.id = 'cirurgiao';
    this.name = 'O Cirurgião';
    this.pos = new THREE.Vector3(o.x, o.y, o.z);
    this.home = { x: o.x, y: o.y, z: o.z };
    this.yaw = o.yaw ?? Math.PI;
    this.maxHp = 380; this.hp = this.maxHp;
    this.radius = 0.62; this.solid = true;
    this.def = { height: 2.6, sight: 30, fov: 180, hearing: 2 };
    this.state = 'dormant'; this.stateT = 0;
    this.phase = 1;
    this.chargeCd = 3; this.decideT = 0;
    this.flinch = 0; this.walkPhase = 0; this.animT = 0;
    this.speed = 0;
    this._build();
  }
  get alive() { return this.state !== 'dead'; }

  _build() {
    const M = this.game.materials;
    const s = 1.45;
    this.scale = s;
    this.rig = createHumanoid({ scale: s, hunch: 0.25, torsoW: 0.56, armLen: 0.34, armW: 0.14,
      mats: { skin: M.deadSkin, shirt: M.apron, arms: M.deadSkin, pants: M.apron, legs: M.pantsGray, feet: M.leatherDark, head: M.deadSkin } });
    const h = this.rig.head;
    const mask = new THREE.Mesh(new THREE.BoxGeometry(0.26 * s, 0.14 * s, 0.05 * s), M.mask); mask.position.set(0, 0.08 * s, 0.13 * s); h.add(mask);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.08 * s, 0.06 * s, 0.05 * s), M.eyeGlowGreen); lamp.position.set(0, 0.27 * s, 0.12 * s); h.add(lamp);
    for (const x of [-0.05, 0.05]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.03 * s, 0.02 * s, 0.01), M.eyeGlow); e.position.set(x * s, 0.19 * s, 0.135 * s); h.add(e); }
    // cutelo cirúrgico
    const cleaver = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.3), M.woodDark); handle.position.z = 0.1; cleaver.add(handle);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.75), M.rust); blade.position.set(0, -0.08, 0.6); cleaver.add(blade);
    cleaver.position.y = -0.05; this.rig.armR.end.add(cleaver);
    this.bladeTip = new THREE.Object3D(); this.bladeTip.position.set(0, -0.1, 0.85); cleaver.add(this.bladeTip);
    this.bladeMid = new THREE.Object3D(); this.bladeMid.position.set(0, -0.1, 0.45); cleaver.add(this.bladeMid);
    // frasco nas costas = ponto fraco
    const vialMat = M.vial.clone();
    this.vialMat = vialMat;
    this.vial = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.12 * s, 0.34 * s, 8), vialMat);
    this.vial.position.set(0, 0.36 * s, -0.3 * s); // tanque nas costas, saliente
    this.rig.torso.add(this.vial);
    const tube = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.3), M.metal); tube.position.set(0, 0.6 * s, -0.08 * s); this.rig.torso.add(tube);
    this.vialLight = new THREE.PointLight(0x7dff6a, 0.0, 4, 2);
    this.vial.add(this.vialLight);
    this.hand = new THREE.Object3D(); this.hand.position.set(0, -0.05, 0.1); this.rig.armL.end.add(this.hand);
    this.rig.root.position.copy(this.pos); this.rig.root.rotation.y = this.yaw;
    this.game.scene.add(this.rig.root);
    this._animate(0);
  }

  weakPoint() {
    this.rig.root.updateMatrixWorld(true);
    this.vial.getWorldPosition(tmp);
    return { x: tmp.x, y: tmp.y, z: tmp.z };
  }

  hurtVolumes() {
    const w = this.weakPoint();
    const top = this.state === 'stunned' ? 1.9 : 2.5;
    return [
      { type: 'sphere', part: 'weak', x: w.x, y: w.y, z: w.z, r: 0.32 },
      { type: 'capsule', part: 'body', x: this.pos.x, z: this.pos.z, y0: this.pos.y + 0.4, y1: this.pos.y + top, r: 0.55 },
    ];
  }

  activate() {
    if (this.state !== 'dormant') return;
    this._set('intro');
    this.game.audio.play('roar', this.pos);
    this.game.cameraCtl.addShake(0.6);
  }

  _set(s) { this.state = s; this.stateT = 0; this.hitDone = false; }

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
      g.audio.play('shriek', this.pos, { pitch: 0.6 });
      g.combat.emit(point, 18, 0x7dff6a, 3.5);
      g.combat.blood(point, 10);
      g.hud.toast('O frasco racha!');
    } else {
      g.audio.play('clang', this.pos);
      g.combat.blood(point, 5);
      if (!this.warnedArmor) { this.warnedArmor = true; g.hud.toast('O avental de couro absorve o golpe… procure um ponto fraco.'); }
    }
    g.bus.emit('BossDamaged', this);
    if (this.hp <= 0) { this.hp = 0; this._die(); return 'dead'; }
    if (this.phase === 1 && this.hp < this.maxHp * 0.5) {
      this.phase = 2;
      if (this.state !== 'stunned') { this._set('roar'); }
      g.audio.play('roar', this.pos);
      g.hud.toast('O Cirurgião enlouquece!');
    }
    // agarrão pode ser interrompido por golpe no frasco
    if (weak && this.state === 'grabHold') { g.player.releaseGrab(false); this._set('stagger'); }
    return 'hit';
  }

  onGrabBroken() { this._set('stagger'); }

  _die() {
    const g = this.game;
    if (this.state === 'grabHold') g.player.releaseGrab(false);
    this._set('dead');
    this.solid = false;
    this.vialLight.intensity = 0;
    this.vialMat.emissiveIntensity = 0.1;
    g.audio.play('roar', this.pos, { pitch: 0.6 });
    g.audio.play('thud', this.pos);
    g.cameraCtl.addShake(0.8);
    g.bus.emit('BossDefeated', this);
  }

  setDeadInstant() { this.state = 'dead'; this.stateT = 10; this.solid = false; this.hp = 0; this._animate(0); this.rig.root.position.copy(this.pos); }

  _face(p, rate, dt) {
    const da = angDiff(this.yaw, Math.atan2(p.x - this.pos.x, p.z - this.pos.z));
    this.yaw += Math.max(-rate * dt, Math.min(rate * dt, da));
    return Math.abs(da);
  }

  _bladeHit(dmg, knock, blockable = true) {
    if (this.hitDone) return;
    const p = this.game.player;
    this.rig.root.position.copy(this.pos); this.rig.root.rotation.y = this.yaw;
    this._animate(0); this.rig.root.updateMatrixWorld(true);
    const cap = p.hurtVolumes()[0];
    for (const o of [this.bladeTip, this.bladeMid]) {
      o.getWorldPosition(tmp);
      if (this.game.combat.debug) this.game.combat.debugSphere(tmp, 0.35, 0xff8000);
      const y = Math.max(cap.y0, Math.min(cap.y1, tmp.y));
      if (Math.hypot(tmp.x - cap.x, tmp.y - y, tmp.z - cap.z) <= 0.35 + cap.r) {
        this.hitDone = true;
        p.takeHit({ dmg, from: this.pos, knock, blockable, source: this });
        return;
      }
    }
  }

  update(dt) {
    const g = this.game, p = g.player;
    this.stateT += dt; this.animT += dt;
    this.flinch = Math.max(0, this.flinch - dt);
    this.chargeCd -= dt;
    const fast = this.phase >= 3 ? 1.4 : this.phase === 2 ? 1.25 : 1;
    const dist = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    this.speed = 0;
    const glow = this.state === 'stunned' ? 2.2 : this.state === 'chargeWind' ? 1.5 : 0.5;
    this.vialLight.intensity += (glow - this.vialLight.intensity) * Math.min(1, dt * 6);
    if (this.alive) this.vialMat.emissiveIntensity = 0.4 + this.vialLight.intensity * 0.5;

    switch (this.state) {
      case 'dormant': case 'dead': break;
      case 'intro': this._face(p.pos, 2, dt); if (this.stateT > 2.4) this._set('stalk'); break;
      case 'roar': if (this.stateT > 1.6) this._set('stalk'); break;
      case 'stalk': {
        if (!p.alive) break;
        this._face(p.pos, 3 * fast, dt);
        const sp = (dist > 3 ? 1.8 : 1.2) * fast;
        this.speed = sp;
        this.pos.x += Math.sin(this.yaw) * sp * dt; this.pos.z += Math.cos(this.yaw) * sp * dt;
        this.decideT -= dt;
        if (this.decideT <= 0) {
          this.decideT = 0.3;
          if (dist < 2.8) this._set(Math.random() < (this.phase >= 2 ? 0.4 : 0.3) && dist < 2.0 ? 'grab' : 'slash');
          else if (dist > 4.5 && this.chargeCd <= 0) this._set('chargeWind');
          else if (this.stateT > 6 && this.chargeCd <= 0) this._set('chargeWind');
        }
        break;
      }
      case 'slash': {
        // combo de 2 golpes (3 na fase 2)
        const n = this.phase >= 2 ? 3 : 2;
        const per = 1.25 / fast;
        const i = Math.floor(this.stateT / per), lt = (this.stateT % per) / per;
        if (i >= n) { this._set('stalk'); this.decideT = 0.6; break; }
        if (i !== this.slashI) { this.slashI = i; this.hitDone = false; if (i > 0) this._swingSnd = false; }
        if (lt < 0.45) this._face(p.pos, 3.5, dt);
        if (lt > 0.45 && !this._swingSnd) { this._swingSnd = true; g.audio.play('swing', this.pos, { heavy: true }); }
        if (lt > 0.42 && lt < 0.6) {
          this.pos.x += Math.sin(this.yaw) * 2.2 * dt; this.pos.z += Math.cos(this.yaw) * 2.2 * dt;
          this._bladeHit(22, 4);
        }
        if (lt > 0.95) this._swingSnd = false;
        break;
      }
      case 'grab': {
        if (this.stateT < 0.8) this._face(p.pos, 3, dt);
        else if (this.stateT < 1.1) {
          this.pos.x += Math.sin(this.yaw) * 3 * dt; this.pos.z += Math.cos(this.yaw) * 3 * dt;
          if (!this.hitDone) {
            this.rig.root.position.copy(this.pos); this.rig.root.rotation.y = this.yaw; this._animate(0); this.rig.root.updateMatrixWorld(true);
            this.hand.getWorldPosition(tmp);
            const cap = p.hurtVolumes()[0];
            const y = Math.max(cap.y0, Math.min(cap.y1, tmp.y));
            if (Math.hypot(tmp.x - cap.x, tmp.y - y, tmp.z - cap.z) <= 0.5 + cap.r) {
              this.hitDone = true;
              if (p.startGrab(this, this.phase >= 2 ? 11 : 9)) { this._set('grabHold'); this.grabTick = 0.6; g.audio.play('roar', this.pos, { pitch: 1.3 }); }
            }
          }
        } else if (this.stateT > 2.0) this._set('stalk');
        break;
      }
      case 'grabHold': {
        this.grabTick -= dt;
        if (this.grabTick <= 0) { this.grabTick = 0.7; p.hp -= 6; g.hud.flashDamage(); g.audio.play('hurt', p.pos); if (p.hp <= 0) { p.hp = 0; p._die(); } }
        if (this.stateT > 2.8 && p.state === 'grabbed') {
          p.releaseGrab(false);
          p.takeHit({ dmg: 26, from: this.pos, blockable: false, knock: 7 });
          g.audio.play('thud', p.pos); g.cameraCtl.addShake(0.7);
          this._set('recover');
        } else if (p.state !== 'grabbed' && this.state === 'grabHold') this._set('stagger');
        break;
      }
      case 'chargeWind': {
        if (this.stateT < 0.8) this._face(p.pos, 4, dt);
        if (this.stateT > 0.1 && !this.windSnd) { this.windSnd = true; g.audio.play('roar', this.pos, { pitch: 1.2 }); }
        if (this.stateT > 1.1 / fast) { this.windSnd = false; this._set('charge'); this.chargeHit = false; }
        break;
      }
      case 'charge': {
        const sp = 9.5 * fast;
        this.speed = sp;
        this.pos.x += Math.sin(this.yaw) * sp * dt; this.pos.z += Math.cos(this.yaw) * sp * dt;
        if (!this.chargeHit && p.alive) {
          const cap = p.hurtVolumes()[0];
          if (Math.hypot(cap.x - this.pos.x, cap.z - this.pos.z) < this.radius + cap.r + 0.25 && Math.abs(p.pos.y - this.pos.y) < 1.5) {
            this.chargeHit = true;
            p.takeHit({ dmg: 30, from: this.pos, blockable: false, knock: 9 });
          }
        }
        const hits = g.col.resolveCircle(this.pos, this.radius, this.def.height);
        if (hits) {
          const obst = hits.some((b) => b.tag === 'obstacle');
          this._set('stunned');
          this.stunDur = obst ? 4.2 : 2.2;
          g.audio.play('thud', this.pos); g.audio.play('clang', this.pos);
          g.combat.sparks({ x: this.pos.x + Math.sin(this.yaw) * 0.7, y: this.pos.y + 1.2, z: this.pos.z + Math.cos(this.yaw) * 0.7 }, 24);
          g.cameraCtl.addShake(0.8);
          g.hud.toast(obst ? (this.txt?.stunObst || 'Ele se chocou! O frasco nas costas está exposto!') : (this.txt?.stunWall || 'Ele bateu na parede!'));
          this.chargeCd = this.phase >= 2 ? 3 : 4.5;
        } else if (this.stateT > 2.2) { this._set('recover'); this.chargeCd = 3.5; }
        break;
      }
      case 'stunned': if (this.stateT > this.stunDur) this._set('recover'); break;
      case 'stagger': if (this.stateT > 1.6) this._set('stalk'); break;
      case 'recover': if (this.stateT > 0.9 / fast) this._set('stalk'); break;
      default: break;
    }

    if (this.alive && this.state !== 'charge') {
      if (p.alive && this.state !== 'grabHold') {
        const dx = this.pos.x - p.pos.x, dz = this.pos.z - p.pos.z, dd = Math.hypot(dx, dz), m = this.radius + p.radius;
        if (dd < m && dd > 1e-4) { p.pos.x -= dx / dd * (m - dd); p.pos.z -= dz / dd * (m - dd); }
      }
      g.col.resolveCircle(this.pos, this.radius, this.def.height);
    }
    if (this.state === 'grabHold') {
      // segura Elias à sua frente
      p.pos.x = this.pos.x + Math.sin(this.yaw) * 1.0; p.pos.z = this.pos.z + Math.cos(this.yaw) * 1.0;
    }
    const gy = g.col.groundAt(this.pos.x, this.pos.z, this.pos.y);
    if (gy > -Infinity) this.pos.y = gy;
    this._animate(dt);
    this.rig.root.position.copy(this.pos);
    this.rig.root.rotation.y = this.yaw;
  }

  _animate(dt) {
    const r = this.rig, t = this.stateT;
    resetPose(r);
    switch (this.state) {
      case 'dormant': // debruçado sobre a mesa
        r.torso.rotation.x = 0.9; r.armR.upper.rotation.x = -1.2; r.armL.upper.rotation.x = -1.1; r.head.rotation.x = 0.3; break;
      case 'intro': case 'roar': {
        const k = Math.min(1, t / 0.5);
        r.torso.rotation.x = 0.25 - 0.55 * k; r.head.rotation.x = -0.5 * k;
        r.armR.upper.rotation.z = -1.0 * k; r.armL.upper.rotation.z = 1.0 * k; break;
      }
      case 'stalk': case 'recover': {
        if (this.speed > 0.1) { this.walkPhase += this.speed * dt * 2; poseWalk(r, this.walkPhase, 0.8, 0); } else poseIdle(r, this.animT);
        r.armR.upper.rotation.x = -0.5; r.armR.lower.rotation.x = -0.6; break;
      }
      case 'slash': {
        const per = 1.25 / (this.phase >= 3 ? 1.4 : this.phase === 2 ? 1.25 : 1);
        const lt = (t % per) / per;
        const odd = Math.floor(t / per) % 2 === 1;
        r.armR.upper.rotation.x = keys([[0, -0.5], [0.42, -2.7], [0.6, -0.9], [1, -0.5]], lt);
        r.armR.upper.rotation.z = keys([[0, 0], [0.42, odd ? 0.7 : -0.7], [0.6, odd ? -0.5 : 0.5], [1, 0]], lt);
        r.torso.rotation.y = keys([[0, 0], [0.42, odd ? 0.5 : -0.5], [0.6, odd ? -0.6 : 0.6], [1, 0]], lt);
        r.armR.lower.rotation.x = keys([[0, -0.6], [0.42, -0.9], [0.6, 0], [1, -0.6]], lt);
        break;
      }
      case 'grab': case 'grabHold': {
        const k = this.state === 'grabHold' ? 1 : keys([[0, 0], [0.8, 0.7], [1.0, 1.1], [2, 0.3]], t);
        r.armL.upper.rotation.x = -1.6 * k; r.armL.lower.rotation.x = -0.2;
        r.armR.upper.rotation.x = this.state === 'grabHold' ? -1.2 - Math.sin(this.animT * 6) * 0.3 : -0.5;
        r.torso.rotation.x = 0.25 + 0.2 * k; break;
      }
      case 'chargeWind': {
        const k = Math.min(1, t / 0.7);
        r.hips.position.y = r.baseHipY - 0.25 * k; r.torso.rotation.x = 0.25 + 0.5 * k;
        r.legL.upper.rotation.x = -0.6 * k; r.legL.lower.rotation.x = 0.8 * k; r.legR.upper.rotation.x = 0.5 * k;
        r.armR.upper.rotation.x = 0.4 * k; r.armL.upper.rotation.x = 0.4 * k; break;
      }
      case 'charge': {
        this.walkPhase += dt * 16; poseWalk(r, this.walkPhase, 1, 1);
        r.torso.rotation.x = 0.85; r.armR.upper.rotation.x = 0.3; r.armL.upper.rotation.x = 0.3; break;
      }
      case 'stunned': { // de joelhos, costas expostas
        const k = Math.min(1, t / 0.35);
        r.hips.position.y = r.baseHipY - 0.6 * k;
        r.legR.upper.rotation.x = -1.4 * k; r.legR.lower.rotation.x = 1.5 * k;
        r.legL.upper.rotation.x = -0.2 * k; r.legL.lower.rotation.x = 1.5 * k;
        r.torso.rotation.x = 0.15 + 0.35 * k + Math.sin(this.animT * 4) * 0.05; // ajoelhado, ofegante
        r.armR.upper.rotation.x = -0.2; r.armL.upper.rotation.x = -0.3; r.head.rotation.x = 0.4; break;
      }
      case 'stagger': {
        const k = Math.sin(Math.min(1, t / 1.6) * Math.PI);
        r.torso.rotation.x = 0.25 - 0.6 * k; r.armR.upper.rotation.z = -1 * k; r.armL.upper.rotation.z = 1 * k; break;
      }
      case 'dead': {
        const k = Math.min(1, t / 1.4);
        r.hips.position.y = r.baseHipY - 0.6 * Math.min(1, k * 2);
        r.legR.upper.rotation.x = -1.3 * Math.min(1, k * 2); r.legR.lower.rotation.x = 1.5 * Math.min(1, k * 2);
        r.legL.upper.rotation.x = -1.3 * Math.min(1, k * 2); r.legL.lower.rotation.x = 1.5 * Math.min(1, k * 2);
        r.body.rotation.x = Math.PI / 2 * Math.max(0, k * 2 - 1) * 0.9;
        break;
      }
      default: break;
    }
    if (this.flinch > 0) r.torso.rotation.x -= this.flinch;
  }
}
