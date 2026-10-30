// Inimigo comum: máquina de estados com percepção real, navegação por grafo, ataques com janela ativa,
// postura (poise) para stagger, e morte persistente.
import * as THREE from 'three';
import { ENEMIES } from '../data/enemies.js';
import { createHumanoid, resetPose, poseWalk, poseIdle, keys } from '../gameplay/ProceduralRig.js';

const tmp = new THREE.Vector3();
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

export class Enemy {
  constructor(game, type, o) {
    this.game = game;
    this.id = o.id;
    this.type = type;
    this.def = ENEMIES[type];
    this.pos = new THREE.Vector3(o.x, o.y, o.z);
    this.home = { x: o.x, y: o.y, z: o.z, yaw: o.yaw ?? 0 };
    this.yaw = o.yaw ?? 0;
    this.patrol = o.patrol || null; this.patrolI = 0; this.waitT = 0;
    this.hp = this.def.hp; this.poise = this.def.poise; this.poiseT = 0;
    this.radius = this.def.radius;
    this.solid = true;
    this.state = this.patrol ? 'patrol' : 'idle'; this.stateT = 0;
    this.percT = Math.random() * 0.2;
    this.lastKnown = null; this.lostT = 0; this.alerted = false;
    this.path = null; this.pathI = 0; this.repath = 0; this.pathGoal = null;
    this.attack = null; this.attackHit = false;
    this.flinch = 0; this.walkPhase = Math.random() * 6; this.animT = Math.random() * 10;
    this.speed = 0;
    this.groanT = 3 + Math.random() * 6;
    this.dormant = !!o.dormant; // só desperta por trigger
    this._build();
  }

  get alive() { return this.state !== 'dead'; }

  _build() {
    const M = this.game.materials, d = this.def;
    const mats = d.mats === 'interno'
      ? { skin: M.deadSkin, shirt: M.gown, arms: M.deadSkin, pants: M.gown, legs: M.deadSkin, feet: M.deadSkin, head: M.deadSkin }
      : { skin: M.deadSkin, shirt: M.nurseCoat, arms: M.nurseCoat, pants: M.nurseCoat, legs: M.pantsGray, feet: M.leatherDark, head: M.deadSkin };
    this.rig = createHumanoid({ scale: d.scale, mats, hunch: d.hunch, armLen: d.mats === 'interno' ? 0.34 : 0.32, torsoW: d.mats === 'interno' ? 0.4 : 0.42 , legLen: d.crawler ? 0.2 : undefined });
    if (d.crawler) {
      // lençol do necrotério: cobre o corpo enquanto ele finge estar morto
      this.sheet = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 1.75), M.sheet || M.gown);
      this.sheet.position.set(0, 0.16, 0.05); this.rig.root.add(this.sheet);
    }
    const h = this.rig.head, s = d.scale;
    if (d.mats === 'interno') {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.25 * s, 0.07 * s, 0.27 * s), M.bandageDirty);
      band.position.y = 0.17 * s; h.add(band);
    } else {
      const mask = new THREE.Mesh(new THREE.BoxGeometry(0.23 * s, 0.12 * s, 0.05 * s), M.mask);
      mask.position.set(0, 0.08 * s, 0.12 * s); h.add(mask);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.25 * s, 0.08 * s, 0.27 * s), M.nurseCoat);
      cap.position.y = 0.31 * s; h.add(cap);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.42), M.axeEdge);
      blade.position.set(0, -0.03, 0.2); this.rig.armR.end.add(blade);
    }
    // olhos fracos: ajudam a ler o inimigo no escuro
    const eyeMat = M.eyeGlow;
    for (const x of [-0.05, 0.05]) {
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.03 * s, 0.02 * s, 0.01), eyeMat);
      e.position.set(x * s, 0.19 * s, 0.125 * s); h.add(e);
    }
    this.hand = new THREE.Object3D(); this.hand.position.set(0, -0.05, d.mats === 'interno' ? 0.05 : 0.38);
    this.rig.armR.end.add(this.hand);
    this.rig.root.position.copy(this.pos);
    this.rig.root.rotation.y = this.yaw;
    this.game.scene.add(this.rig.root);
  }

  hurtVolumes() {
    const d = this.def;
    if (d.crawler) {
      // corpo deitado: duas esferas baixas ao longo do tronco (golpes laterais passam por cima)
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw), y = this.pos.y + (this.state === 'dead' ? 0.15 : 0.3);
      return [
        { type: 'sphere', part: 'body', x: this.pos.x - fx * 0.15, y, z: this.pos.z - fz * 0.15, r: 0.4 },
        { type: 'sphere', part: 'body', x: this.pos.x + fx * 0.45, y: y + 0.05, z: this.pos.z + fz * 0.45, r: 0.34 },
      ];
    }
    const top = this.state === 'dead' ? 0.4 : d.height - 0.15 - (d.hunch * 0.3);
    return [{ type: 'capsule', part: 'body', x: this.pos.x, z: this.pos.z, y0: this.pos.y + 0.35, y1: this.pos.y + top, r: this.radius }];
  }

  wake() { if (this.dormant) { this.dormant = false; this._alert(this.game.player.pos); } }

  _set(s) {
    if (this.state === 'attack' || this.state === 'grabbing') this.game.director.release(this);
    this.state = s; this.stateT = 0;
  }

  _alert(p) {
    if (!this.alerted) { this.game.audio.play('groan', this.pos, { pitch: this.def.groanPitch * 1.2 }); this.game.bus.emit('EnemyAlerted', this); }
    this.alerted = true;
    this.lastKnown = { x: p.x, y: p.y, z: p.z };
    this.lostT = 0;
    if (this.state !== 'attack' && this.state !== 'stagger' && this.state !== 'grabbing') this._set('chase');
  }

  takeHit({ dmg, poise, heavy, from, point }) {
    if (!this.alive) return 'immune';
    const g = this.game;
    this.hp -= dmg;
    g.audio.play('hit', this.pos, { heavy });
    g.combat.blood(point || { x: this.pos.x, y: this.pos.y + 1.3, z: this.pos.z }, heavy ? 22 : 14);
    this.flinch = 0.25;
    // empurrão
    const dx = this.pos.x - from.x, dz = this.pos.z - from.z, d = Math.hypot(dx, dz) || 1;
    this.knock = { x: dx / d * (heavy ? 3.5 : 1.8), z: dz / d * (heavy ? 3.5 : 1.8) };
    if (this.hp <= 0) { this._die(); return 'dead'; }
    this.poise -= poise; this.poiseT = 2.5;
    if (!this.alerted || this.state === 'idle' || this.state === 'patrol' || this.state === 'investigate') this._alert(from);
    if (this.poise <= 0) {
      this.poise = this.def.poise;
      if (this.state === 'grabbing') g.player.releaseGrab(false);
      this._set('stagger');
      this.staggerDur = heavy ? 1.3 : 0.9;
    }
    return 'hit';
  }

  onGrabBroken() {
    this._set('stagger'); this.staggerDur = 1.4;
  }

  _die() {
    const g = this.game;
    if (this.state === 'grabbing') g.player.releaseGrab(false);
    this._set('dead');
    this.solid = false;
    this.deathYaw = this.yaw;
    g.audio.play('thud', this.pos);
    g.audio.play('groan', this.pos, { pitch: this.def.groanPitch * 0.6 });
    g.player.stats.kills++;
    g.bus.emit('EnemyDied', this);
  }

  /** usado ao carregar save: já morto */
  setDeadInstant() {
    this.state = 'dead'; this.stateT = 10; this.solid = false;
    this._animate(0, 0);
    this.rig.root.position.copy(this.pos);
  }

  // ---- movimento ----
  _clear(a, b) {
    const f = (bx) => bx.tag !== 'prop-low';
    const y1 = this.pos.y + 0.9;
    return this.game.col.segmentClear({ x: a.x, y: y1, z: a.z }, { x: b.x, y: y1, z: b.z }, f);
  }

  /** move em direção a target usando linha direta ou o grafo de navegação */
  _moveTo(target, speed, dt) {
    let goal = target;
    this.repath -= dt;
    if (!this._clear(this.pos, target)) {
      const nav = this.game.nav;
      if (this.repath <= 0 || !this.path) {
        this.repath = 0.7;
        const a = nav.nearest(this.pos, this.game.col), b = nav.nearest(target, this.game.col) || nav.nearest(target);
        this.path = a && b ? nav.findPath(a.id, b.id) : null;
        this.pathI = 0;
      }
      if (!this.path) { this.speed = 0; return false; }
      while (this.pathI < this.path.length) {
        const n = nav.nodes.get(this.path[this.pathI]);
        const near = Math.hypot(n.x - this.pos.x, n.z - this.pos.z) < 0.6;
        const nxt = this.path[this.pathI + 1] ? nav.nodes.get(this.path[this.pathI + 1]) : null;
        if (near || (nxt && this._clear(this.pos, nxt))) this.pathI++;
        else break;
      }
      const n = this.pathI < this.path.length ? nav.nodes.get(this.path[this.pathI]) : target;
      goal = n;
    } else { this.path = null; }
    const dx = goal.x - this.pos.x, dz = goal.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.05) { this.speed = 0; return true; }
    const want = Math.atan2(dx, dz);
    const da = angDiff(this.yaw, want);
    this.yaw += Math.max(-this.def.turn * dt, Math.min(this.def.turn * dt, da));
    const align = Math.max(0, Math.cos(da));
    this.speed = speed * align;
    this.pos.x += Math.sin(this.yaw) * this.speed * dt;
    this.pos.z += Math.cos(this.yaw) * this.speed * dt;
    return d < 0.5;
  }

  _face(p, rate, dt) {
    const want = Math.atan2(p.x - this.pos.x, p.z - this.pos.z);
    const da = angDiff(this.yaw, want);
    this.yaw += Math.max(-rate * dt, Math.min(rate * dt, da));
    return Math.abs(da);
  }

  _pickAttack(dist) {
    const opts = this.def.attacks.filter((a) => dist <= a.range && dist >= (a.minRange || 0));
    if (!opts.length) return null;
    let tot = opts.reduce((s, a) => s + a.weight, 0), r = Math.random() * tot;
    for (const a of opts) { r -= a.weight; if (r <= 0) return a; }
    return opts[0];
  }

  update(dt) {
    const g = this.game, p = g.player;
    this.stateT += dt; this.animT += dt;
    this.flinch = Math.max(0, this.flinch - dt);
    this.poiseT -= dt; if (this.poiseT <= 0) this.poise = this.def.poise;
    if (this.state === 'dead') { this._animate(dt, 0); this.rig.root.position.copy(this.pos); return; }
    if (this.dormant) { this._animate(dt, 0); return; }

    // percepção a cada 0.2 s
    this.percT -= dt;
    let sees = this._seesCache;
    if (this.percT <= 0) {
      this.percT = 0.2;
      sees = this._seesCache = p.alive && g.perception.canSee(this, p);
      if (sees) this._alert(p.pos);
    }
    if (!sees && (this.state === 'idle' || this.state === 'patrol' || this.state === 'search' || this.state === 'return' || this.state === 'investigate')) {
      const n = g.perception.hear(this);
      if (n) {
        this.lastKnown = { x: n.x, y: n.y, z: n.z };
        if (this.state !== 'investigate') g.audio.play('groan', this.pos, { pitch: this.def.groanPitch });
        this._set('investigate');
      }
    }

    const dist = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    const d = this.def;
    switch (this.state) {
      case 'idle':
        this.speed = 0;
        this.yaw += angDiff(this.yaw, this.home.yaw) * Math.min(1, dt * 2);
        break;
      case 'patrol': {
        if (this.waitT > 0) { this.waitT -= dt; this.speed = 0; break; }
        const wp = this.patrol[this.patrolI];
        if (this._moveTo(wp, d.walk, dt)) { this.patrolI = (this.patrolI + 1) % this.patrol.length; this.waitT = 1.5 + Math.random() * 2; }
        break;
      }
      case 'investigate':
        if (this._moveTo(this.lastKnown, d.walk * 1.5, dt) || this.stateT > 10) this._set('search');
        break;
      case 'chase': {
        if (!p.alive) { this._set('return'); break; }
        if (sees) { this.lastKnown = { x: p.pos.x, y: p.pos.y, z: p.pos.z }; this.lostT = 0; }
        else this.lostT += dt;
        if (this.lostT > 6) { this._set('search'); break; }
        const target = sees || this.lostT < 1.2 ? p.pos : this.lastKnown;
        if (sees && dist < 5 && Math.abs(p.pos.y - this.pos.y) < 1) {
          const atk = this._pickAttack(dist);
          const facing = this._face(p.pos, d.turn, dt);
          if (atk && facing < 0.6 && g.director.request(this)) { this._startAttack(atk); break; }
          if (dist < 1.2) { this.speed = 0; break; } // espera sua vez
        }
        const arrived = this._moveTo(target, d.chase, dt);
        if (arrived && !sees && this.lostT > 1.2) this._set('search');
        // grunhidos ocasionais
        this.groanT -= dt;
        if (this.groanT <= 0) { this.groanT = 4 + Math.random() * 5; g.audio.play('groan', this.pos, { pitch: d.groanPitch }); }
        break;
      }
      case 'search': {
        this.speed = 0;
        this.yaw += Math.sin(this.stateT * 1.3) * dt * 1.4;
        if (this.stateT > 5) this._set('return');
        break;
      }
      case 'return': {
        const goal = this.patrol ? this.patrol[this.patrolI] : this.home;
        if (this._moveTo(goal, d.walk, dt)) { this.alerted = false; this._set(this.patrol ? 'patrol' : 'idle'); }
        break;
      }
      case 'attack': this._updateAttack(dt); break;
      case 'grabbing': {
        this.speed = 0;
        this._face(p.pos, 8, dt);
        this.grabTick -= dt;
        if (this.grabTick <= 0) { this.grabTick = 0.7; p.hp -= this.attack.grabDmg; g.audio.play('hurt', p.pos); g.hud.flashDamage(); if (p.hp <= 0) { p.hp = 0; p._die(); } }
        if (this.stateT > 3) { p.releaseGrab(false); p.takeHit({ dmg: 8, from: this.pos, blockable: false, knock: 4 }); this.attack = null; this._set('chase'); }
        break;
      }
      case 'stagger': this.speed = 0; if (this.stateT > this.staggerDur) this._set('chase'); break;
      default: break;
    }

    // empurrão, separação e colisões
    if (this.knock) { this.pos.x += this.knock.x * dt; this.pos.z += this.knock.z * dt; this.knock.x *= 1 - Math.min(1, 7 * dt); this.knock.z *= 1 - Math.min(1, 7 * dt); }
    for (const o of g.enemies) {
      if (o === this || !o.alive || !o.solid) continue;
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z, dd = Math.hypot(dx, dz), m = this.radius + o.radius;
      if (dd < m && dd > 1e-4) { this.pos.x += dx / dd * (m - dd) * 0.5; this.pos.z += dz / dd * (m - dd) * 0.5; }
    }
    if (p.alive && this.state !== 'grabbing') {
      const dx = this.pos.x - p.pos.x, dz = this.pos.z - p.pos.z, dd = Math.hypot(dx, dz), m = this.radius + p.radius;
      if (dd < m && dd > 1e-4 && Math.abs(p.pos.y - this.pos.y) < 1.5) { this.pos.x += dx / dd * (m - dd); this.pos.z += dz / dd * (m - dd); }
    }
    g.col.resolveCircle(this.pos, this.radius, d.height);
    const gy = g.col.groundAt(this.pos.x, this.pos.z, this.pos.y);
    if (gy > -Infinity) this.pos.y = gy;

    this._animate(dt, this.speed);
    this.rig.root.position.copy(this.pos);
    this.rig.root.rotation.y = this.yaw;
  }

  _startAttack(a) {
    this.attack = a; this.attackHit = false; this.comboLeft = (a.combo || 1) - 1;
    this._set('attack');
    this.game.director.request(this);
    this.game.audio.play(a.grab ? 'groan' : 'shriek', this.pos, { pitch: this.def.groanPitch, short: true });
  }

  _updateAttack(dt) {
    const a = this.attack, g = this.game, p = g.player, t = this.stateT;
    const w = a.windup, act = w + a.active, end = act + a.recover;
    if (t < w) { this._face(p.pos, this.def.turn * 0.8, dt); this.speed = 0; }
    else if (t < act) {
      if (a.lunge) { this.pos.x += Math.sin(this.yaw) * a.lunge * dt; this.pos.z += Math.cos(this.yaw) * a.lunge * dt; }
      // hitbox real: mão/lâmina do inimigo contra a cápsula do jogador
      if (!this.attackHit && p.alive) {
        this.rig.root.position.copy(this.pos); this.rig.root.rotation.y = this.yaw;
        this._animate(0, 0);
        this.rig.root.updateMatrixWorld(true);
        this.hand.getWorldPosition(tmp);
        const reach = a.grab ? 0.45 : 0.4;
        if (g.combat.debug) g.combat.debugSphere(tmp, reach, 0xff8000);
        const cap = p.hurtVolumes()[0];
        const y = Math.max(cap.y0, Math.min(cap.y1, tmp.y));
        if (Math.hypot(tmp.x - cap.x, tmp.y - y, tmp.z - cap.z) <= reach + cap.r) {
          this.attackHit = true;
          if (a.grab) {
            if (p.startGrab(this)) { this.grabTick = 0.5; this._set('grabbing'); g.director.request(this); return; }
          } else {
            p.takeHit({ dmg: a.dmg, from: this.pos, knock: a.knock, source: this });
          }
        }
      }
    } else if (t >= end) {
      if (this.comboLeft > 0 && Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < a.range + 0.3) {
        this.comboLeft--; this.attackHit = false; this.stateT = w * 0.5; // golpe seguinte mais rápido
      } else { this.attack = null; this._set('chase'); }
    } else this.speed = 0;
  }

  // ---- animação procedural ----
  _animate(dt, speed) {
    const r = this.rig;
    resetPose(r);
    const t = this.stateT;
    if (this.def.crawler) { this._animateCrawler(dt, speed); return; }
    if (this.state === 'dead') {
      const k = Math.min(1, t / 0.9);
      r.body.rotation.x = -Math.PI / 2 * k * k;
      r.body.position.y = 0.1 * k;
      r.armR.upper.rotation.z = -1.0 * k; r.armL.upper.rotation.z = 1.3 * k; r.legL.upper.rotation.x = -0.4 * k;
      return;
    }
    if (this.dormant) { // sentado/encolhido no chão
      r.hips.position.y = r.baseHipY * 0.35; r.torso.rotation.x = 0.9;
      r.legR.upper.rotation.x = -1.4; r.legL.upper.rotation.x = -1.3; r.legR.lower.rotation.x = 1.6; r.legL.lower.rotation.x = 1.6;
      r.armR.upper.rotation.x = -0.4; r.armL.upper.rotation.x = -0.5;
      return;
    }
    if (speed > 0.05) { this.walkPhase += speed * dt * 2.8; poseWalk(r, this.walkPhase, Math.min(1, speed / 1.6), speed > 2 ? 1 : 0); }
    else poseIdle(r, this.animT);
    // braços estendidos dos internos (andar cambaleante)
    if (this.def.mats === 'interno' && this.state !== 'attack') { r.armR.upper.rotation.x = -0.9 + Math.sin(this.animT * 2) * 0.1; r.armL.upper.rotation.x = -0.7; r.head.rotation.z = 0.3; }
    if (this.state === 'attack' && this.attack) {
      const a = this.attack, w = a.windup, act = w + a.active;
      const ph = t < w ? t / w : t < act ? 1 + (t - w) / a.active : 2 + Math.min(1, (t - act) / a.recover);
      if (a.id === 'swipe') {
        r.armR.upper.rotation.x = keys([[0, -0.6], [1, -2.6], [2, -0.6], [3, -0.4]], ph);
        r.armR.upper.rotation.z = keys([[0, 0], [1, -0.8], [2, 0.5], [3, 0]], ph);
        r.torso.rotation.y = keys([[0, 0], [1, -0.6], [2, 0.6], [3, 0]], ph);
      } else if (a.id === 'grab') {
        const k = keys([[0, 0], [1, 1], [2, 1.2], [3, 0.4]], ph);
        r.armR.upper.rotation.x = -1.5 * k; r.armL.upper.rotation.x = -1.5 * k;
        r.armR.upper.rotation.z = 0.5 * (1 - k); r.armL.upper.rotation.z = -0.5 * (1 - k);
        r.torso.rotation.x = r.hunch + 0.3 * k;
      } else if (a.id === 'lunge') {
        r.armR.upper.rotation.x = keys([[0, 0], [1, -0.4], [1.3, -1.6], [2, -1.5], [3, -0.3]], ph);
        r.armR.lower.rotation.x = keys([[0, 0], [1, -1.8], [1.3, 0], [3, -0.2]], ph);
        r.torso.rotation.x = keys([[0, 0.1], [1, -0.2], [1.5, 0.5], [3, 0.1]], ph);
        r.legL.upper.rotation.x = keys([[0, 0], [1, -0.2], [1.5, -0.8], [3, 0]], ph);
      } else { // stab
        r.armR.upper.rotation.x = keys([[0, -0.5], [1, -0.7], [1.5, -1.6], [3, -0.5]], ph);
        r.armR.lower.rotation.x = keys([[0, -0.5], [1, -1.9], [1.5, 0], [3, -0.4]], ph);
      }
    } else if (this.state === 'grabbing') {
      r.armR.upper.rotation.x = -1.5; r.armL.upper.rotation.x = -1.5; r.torso.rotation.x = r.hunch + 0.3;
      r.head.rotation.x = 0.4 + Math.sin(this.animT * 10) * 0.1;
    } else if (this.state === 'stagger') {
      const k = Math.sin(Math.min(1, t / (this.staggerDur || 1)) * Math.PI);
      r.torso.rotation.x = -0.5 * k; r.head.rotation.x = -0.4 * k;
      r.armR.upper.rotation.z = -0.9 * k; r.armL.upper.rotation.z = 0.9 * k;
      r.hips.position.y = r.baseHipY - 0.1 * k;
    }
    if (this.flinch > 0) { r.torso.rotation.x -= this.flinch * 1.2; r.head.rotation.x -= this.flinch; }
  }

  // Rastejador: corpo deitado de bruços, puxado pelos braços; tocos de perna arrastando
  _animateCrawler(dt, speed) {
    const r = this.rig, t = this.stateT;
    if (this.sheet) this.sheet.visible = this.dormant;
    r.body.rotation.x = 1.42; r.body.position.set(0, 0.16, -0.55);
    r.torso.rotation.x = 0; r.head.rotation.x = -1.05;
    r.legR.upper.rotation.x = 0.25; r.legL.upper.rotation.x = 0.35;
    if (this.state === 'dead') {
      r.body.position.y = 0.1; r.head.rotation.x = -0.2; r.head.rotation.z = 0.6;
      r.armR.upper.rotation.x = -2.9; r.armR.upper.rotation.z = -0.6; r.armL.upper.rotation.x = -0.4; r.armL.upper.rotation.z = 0.5;
      return;
    }
    if (this.dormant) { r.armR.upper.rotation.x = -0.2; r.armL.upper.rotation.x = -0.2; r.head.rotation.x = -0.3; return; }
    let ph = this.walkPhase;
    if (speed > 0.05) { this.walkPhase += speed * dt * 3.4; ph = this.walkPhase; }
    const amt = speed > 0.05 ? 1 : 0.2, sN = Math.sin(ph);
    // braços alternados alcançando à frente e puxando
    r.armR.upper.rotation.x = -2.55 + sN * 0.55 * amt; r.armR.lower.rotation.x = -0.6 - Math.max(0, sN) * 0.6 * amt;
    r.armL.upper.rotation.x = -2.55 - sN * 0.55 * amt; r.armL.lower.rotation.x = -0.6 - Math.max(0, -sN) * 0.6 * amt;
    r.armR.upper.rotation.z = 0.35; r.armL.upper.rotation.z = -0.35;
    r.body.rotation.z = sN * 0.08 * amt; r.body.position.y += Math.abs(sN) * 0.04 * amt;
    r.head.rotation.y = Math.sin(this.animT * 1.7) * 0.25;
    if (this.state === 'attack' && this.attack) {
      const a = this.attack, w = a.windup, act = w + a.active;
      const p = t < w ? t / w : t < act ? 1 + (t - w) / a.active : 2 + Math.min(1, (t - act) / a.recover);
      if (a.id === 'claw') {
        r.armR.upper.rotation.x = keys([[0, -2.5], [1, -3.6], [2, -1.9], [3, -2.5]], p);
        r.armR.upper.rotation.z = keys([[0, 0.35], [1, -0.6], [2, 0.6], [3, 0.35]], p);
        r.body.rotation.x = keys([[0, 1.42], [1, 1.1], [2, 1.5], [3, 1.42]], p);
      } else { // ankle: agarra o tornozelo com as duas mãos
        const k = keys([[0, 0], [1, 1], [2, 1.15], [3, 0.3]], p);
        r.armR.upper.rotation.x = -2.5 - 0.7 * k; r.armL.upper.rotation.x = -2.5 - 0.7 * k;
        r.armR.upper.rotation.z = 0.35 * (1 - k); r.armL.upper.rotation.z = -0.35 * (1 - k);
        r.armR.lower.rotation.x = -0.2; r.armL.lower.rotation.x = -0.2;
        r.head.rotation.x = -1.3 * k - 0.4;
      }
    } else if (this.state === 'grabbing') {
      r.armR.upper.rotation.x = -3.0; r.armL.upper.rotation.x = -3.1; r.armR.lower.rotation.x = -0.9; r.armL.lower.rotation.x = -0.9;
      r.head.rotation.x = -1.2 + Math.sin(this.animT * 12) * 0.15;
    } else if (this.state === 'stagger') {
      const k = Math.sin(Math.min(1, t / (this.staggerDur || 1)) * Math.PI);
      r.body.rotation.x = 1.42 + 0.12 * k; r.body.rotation.z = 0.35 * k; r.head.rotation.x = -0.4 * k;
    }
    if (this.flinch > 0) { r.body.rotation.z += this.flinch * 0.6; r.head.rotation.x += this.flinch; }
  }
}
