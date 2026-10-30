// Chefe do Capítulo 2: Brás, o Guardião da Garganta (mestre-fornalheiro da fábrica de fumaça).
// Herda a máquina de estados do Cirurgião (talho, agarrão, investida que atordoa em pilares, ponto fraco
// nas costas) e acrescenta três fases:
//   fase 1 — pá de coque (combo) e investida;
//   fase 2 (< 60%) — a fumaça engrossa e ele arremessa brasas em arco (projéteis reais, bloqueáveis);
//   fase 3 (< 25%) — mais rápido e solta a "respiração da fornalha": anel de fogo telegrafado ao redor dele.
// Ponto fraco: o fole de couro amarrado nas costas (alimenta a fornalha que ele respira).
import * as THREE from 'three';
import { SurgeonBoss } from './SurgeonBoss.js';
import { createHumanoid, keys } from '../gameplay/ProceduralRig.js';

const tmp = new THREE.Vector3();
const GRAV = 9.8;

export const FURNACE_PHASES = { p2: 0.6, p3: 0.25 };

export class FurnaceBoss extends SurgeonBoss {
  constructor(game, o) {
    super(game, o);
    this.id = 'bras';
    this.name = 'Brás, o Guardião da Garganta';
    this.maxHp = 520; this.hp = this.maxHp;
    this.radius = 0.66;
    this.def = { height: 2.8, sight: 30, fov: 180, hearing: 2 };
    this.txt = { stunObst: 'Ele se chocou no pilar! O fole nas costas está exposto!', stunWall: 'Ele bateu na parede!' };
    this.throwCd = 1.5; this.ventCd = 3; this.thrownN = 0; this.ventN = 0;
    this.projectiles = [];
  }

  _build() {
    const M = this.game.materials;
    const s = 1.55;
    this.scale = s;
    this.rig = createHumanoid({ scale: s, hunch: 0.32, torsoW: 0.62, armLen: 0.36, armW: 0.16,
      mats: { skin: M.coal, shirt: M.leatherDark, arms: M.coal, pants: M.pantsGray, legs: M.pantsGray, feet: M.leatherDark, head: M.coal } });
    const h = this.rig.head;
    // máscara de solda de ferro com a fresta acesa
    const mask = new THREE.Mesh(new THREE.BoxGeometry(0.28 * s, 0.3 * s, 0.08 * s), M.steelDark); mask.position.set(0, 0.15 * s, 0.13 * s); h.add(mask);
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.2 * s, 0.025 * s, 0.02), M.ember); slit.position.set(0, 0.2 * s, 0.175 * s); h.add(slit);
    const rivet = new THREE.Mesh(new THREE.BoxGeometry(0.3 * s, 0.04 * s, 0.3 * s), M.rust); rivet.position.set(0, 0.31 * s, 0.02 * s); h.add(rivet);
    // avental de couro grosso sobre o peito
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.5 * s, 0.62 * s, 0.04 * s), M.apron); apron.position.set(0, 0.22 * s, 0.14 * s); this.rig.torso.add(apron);
    // pá de coque gigante (lâmina larga de ferro) na mão direita
    const tool = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.0), M.woodDark); shaft.position.z = 0.35; tool.add(shaft);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.5), M.rust); blade.position.set(0, -0.04, 1.05); blade.rotation.x = 0.2; tool.add(blade);
    const coalOn = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.28), M.ember); coalOn.position.set(0, 0.02, 1.05); tool.add(coalOn);
    tool.position.y = -0.05; this.rig.armR.end.add(tool);
    this.bladeTip = new THREE.Object3D(); this.bladeTip.position.set(0, -0.05, 1.2); tool.add(this.bladeTip);
    this.bladeMid = new THREE.Object3D(); this.bladeMid.position.set(0, -0.05, 0.75); tool.add(this.bladeMid);
    // fole de couro nas costas = ponto fraco (mesma altura/saliência do frasco do Cirurgião)
    const vialMat = M.vial.clone();
    vialMat.color.set(0x7a3a14); vialMat.emissive.set(0xff5a10); vialMat.opacity = 0.95;
    this.vialMat = vialMat;
    this.vial = new THREE.Mesh(new THREE.BoxGeometry(0.3 * s, 0.34 * s, 0.2 * s), vialMat);
    this.vial.position.set(0, 0.36 * s, -0.3 * s);
    this.rig.torso.add(this.vial);
    for (const y of [-0.1, 0.1]) { const rib = new THREE.Mesh(new THREE.BoxGeometry(0.32 * s, 0.03 * s, 0.22 * s), M.leatherDark); rib.position.y = y * s; this.vial.add(rib); }
    // chaminé curta saindo do fole por cima do ombro
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.06 * s, 0.5 * s, 6), M.rust); pipe.position.set(0.1 * s, 0.75 * s, -0.3 * s); this.rig.torso.add(pipe);
    this.vialLight = new THREE.PointLight(0xff6a20, 0.0, 4, 2);
    this.vial.add(this.vialLight);
    this.hand = new THREE.Object3D(); this.hand.position.set(0, -0.05, 0.1); this.rig.armL.end.add(this.hand);
    // anel de fogo da "respiração da fornalha" (fase 3), telegrafado no chão
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 3.4, 20, 1), M.fire.clone());
    this.ring.rotation.x = -Math.PI / 2; this.ring.visible = false; this.ring.material.side = THREE.DoubleSide;
    this.game.scene.add(this.ring);
    this.rig.root.position.copy(this.pos); this.rig.root.rotation.y = this.yaw;
    this.game.scene.add(this.rig.root);
    this._animate(0);
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
      g.audio.play('roar', this.pos, { pitch: 1.5 });
      if (point) { g.combat.emit(point, 18, 0xff7a20, 3.5); g.combat.sparks(point, 14); }
      g.hud.toast('O fole racha e cospe brasa!');
    } else {
      g.audio.play('clang', this.pos);
      if (point) g.combat.sparks(point, 6);
      if (!this.warnedArmor) { this.warnedArmor = true; g.hud.toast('O couro curtido de fuligem absorve o golpe… o fole nas costas é o ponto fraco.'); }
    }
    g.bus.emit('BossDamaged', this);
    if (this.hp <= 0) { this.hp = 0; this._die(); return 'dead'; }
    if (this.phase === 1 && this.hp < this.maxHp * FURNACE_PHASES.p2) this._enterPhase(2);
    else if (this.phase === 2 && this.hp < this.maxHp * FURNACE_PHASES.p3) this._enterPhase(3);
    if (weak && this.state === 'grabHold') { g.player.releaseGrab(false); this._set('stagger'); }
    return 'hit';
  }

  _enterPhase(n) {
    const g = this.game;
    this.phase = n;
    if (this.state !== 'stunned') this._set('roar');
    g.audio.play('roar', this.pos, { pitch: n === 3 ? 0.7 : 0.85 });
    g.cameraCtl.addShake(0.5);
    this.throwCd = 1.2; this.ventCd = n === 3 ? 1.5 : this.ventCd;
    g.hud.toast(n === 2 ? 'Brás abre as comportas: a fumaça engrossa e ele começa a atirar brasas!' : 'A Garganta ruge — Brás arde por dentro. Afaste-se quando o chão brilhar!', 4);
    g.bus.emit('BossPhase', { boss: this, phase: n });
  }

  _die() {
    super._die();
    this.ring.visible = false;
    for (const pr of this.projectiles) this.game.scene.remove(pr.mesh);
    this.projectiles.length = 0;
  }

  setDeadInstant() { super.setDeadInstant(); if (this.ring) this.ring.visible = false; }

  _throwCoal(spread) {
    const g = this.game, p = g.player;
    this.rig.root.position.copy(this.pos); this.rig.root.rotation.y = this.yaw; this.rig.root.updateMatrixWorld(true);
    this.hand.getWorldPosition(tmp);
    const from = tmp.clone();
    const tx = p.pos.x + spread * Math.cos(this.yaw), tz = p.pos.z - spread * Math.sin(this.yaw), ty = p.pos.y + 1.0;
    const dx = tx - from.x, dz = tz - from.z, dist = Math.hypot(dx, dz);
    const T = Math.max(0.45, Math.min(1.1, dist / 10));
    const vel = new THREE.Vector3(dx / T, (ty - from.y + 0.5 * GRAV * T * T) / T, dz / T);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.2), g.materials.ember);
    mesh.position.copy(from); g.scene.add(mesh);
    this.projectiles.push({ mesh, pos: from, vel, t: 0 });
    this.thrownN++;
    g.audio.play('swing', this.pos, { heavy: true });
  }

  _updateProjectiles(dt) {
    const g = this.game, p = g.player;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.t += dt; pr.vel.y -= GRAV * dt;
      pr.pos.addScaledVector(pr.vel, dt);
      pr.mesh.position.copy(pr.pos); pr.mesh.rotation.x += dt * 9; pr.mesh.rotation.z += dt * 7;
      let done = pr.t > 3;
      if (!done && p.alive) {
        const cap = p.hurtVolumes()[0];
        const y = Math.max(cap.y0, Math.min(cap.y1, pr.pos.y));
        if (Math.hypot(pr.pos.x - cap.x, pr.pos.y - y, pr.pos.z - cap.z) <= 0.2 + cap.r) {
          p.takeHit({ dmg: 14, from: pr.pos, knock: 3, blockable: true, source: this });
          this.coalHits = (this.coalHits || 0) + 1;
          done = true;
        }
      }
      if (!done) {
        const gy = g.col.groundAt(pr.pos.x, pr.pos.z, pr.pos.y + 0.5);
        if ((gy > -Infinity && pr.pos.y <= gy + 0.05) || g.col.pointInside(pr.pos, (b) => b.tag === 'wall' || b.tag === 'obstacle' || b.tag === 'prop')) done = true;
      }
      if (done) {
        g.combat.sparks({ x: pr.pos.x, y: pr.pos.y + 0.1, z: pr.pos.z }, 10);
        g.audio.play('thud', pr.pos);
        g.scene.remove(pr.mesh); pr.mesh.geometry.dispose();
        this.projectiles.splice(i, 1);
      }
    }
  }

  update(dt) {
    const g = this.game, p = g.player;
    this.throwCd -= dt; this.ventCd -= dt;
    const dist = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    // novas decisões das fases 2 e 3 (as demais vêm do Cirurgião)
    if (this.state === 'stalk' && p.alive && this.phase >= 2 && this.stateT > 0.5) {
      if (this.phase >= 3 && this.ventCd <= 0 && dist < 3.6) { this._set('vent'); this.vented = false; }
      else if (this.throwCd <= 0 && dist > 4) { this._set('throw'); this.thrown = 0; }
    }
    super.update(dt);
    const t = this.stateT;
    if (this.state === 'throw') {
      if (t < 0.7) this._face(p.pos, 3.5, dt);
      const n = this.phase >= 3 ? 3 : 1;
      if (t >= 0.7 && this.thrown < n && t >= 0.7 + this.thrown * 0.18) { this._throwCoal(n === 1 ? 0 : (this.thrown - 1) * 1.4); this.thrown++; }
      if (t > 1.4) { this._set('stalk'); this.throwCd = this.phase >= 3 ? 3.2 : 4.2; this.decideT = 0.4; }
    } else if (this.state === 'vent') {
      // 1,3 s de aviso: o chão em volta brilha e o fole incha; depois o anel de fogo explode
      this.ring.visible = true;
      this.ring.position.set(this.pos.x, this.pos.y + 0.04, this.pos.z);
      if (t < 1.3) { this.ring.material.opacity = 0.15 + 0.35 * (t / 1.3) * (0.7 + 0.3 * Math.sin(t * 30)); this.ring.scale.setScalar(0.6 + 0.4 * t / 1.3); }
      else if (!this.vented) {
        this.vented = true; this.ventN++;
        this.ring.material.opacity = 0.95; this.ring.scale.setScalar(1);
        g.audio.play('roar', this.pos, { pitch: 0.6 }); g.audio.play('thud', this.pos);
        g.cameraCtl.addShake(0.7);
        for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; g.combat.sparks({ x: this.pos.x + Math.sin(a) * 2.4, y: this.pos.y + 0.3, z: this.pos.z + Math.cos(a) * 2.4 }, 6); }
        if (p.alive && dist < 3.4 && Math.abs(p.pos.y - this.pos.y) < 1.5) { const r = p.takeHit({ dmg: 24, from: this.pos, blockable: false, knock: 7 }); this.ventLast = r; if (r !== 'dodged' && r !== 'ignored') this.ventHits = (this.ventHits || 0) + 1; }
      } else this.ring.material.opacity = Math.max(0, this.ring.material.opacity - dt * 1.6);
      if (t > 2.1) { this.ring.visible = false; this._set('recover'); this.ventCd = 6; }
    } else if (this.ring.visible) this.ring.visible = false;
    this._updateProjectiles(dt);
    // a fumaça da casa das fornalhas engrossa a partir da fase 2
    if (g.level) g.level.smokeBoost = this.alive && this.state !== 'dormant' && this.phase >= 2 ? (this.phase >= 3 ? 0.035 : 0.025) : 0;
  }

  _animate(dt) {
    const r = this.rig, t = this.stateT;
    if (this.state === 'throw') {
      super._animate(0); // pose base
      r.armL.upper.rotation.x = keys([[0, -0.3], [0.65, 1.0], [0.8, -2.4], [1.4, -0.4]], t);
      r.armL.lower.rotation.x = keys([[0, -0.3], [0.65, -1.2], [0.8, -0.1], [1.4, -0.3]], t);
      r.torso.rotation.y = keys([[0, 0], [0.65, 0.5], [0.8, -0.4], [1.4, 0]], t);
      r.armR.upper.rotation.x = -0.4; r.armR.lower.rotation.x = -0.6;
      return;
    }
    if (this.state === 'vent') {
      super._animate(0);
      const k = Math.min(1, t / 1.3), b = t > 1.3 ? Math.max(0, 1 - (t - 1.3) * 2) : 0;
      r.torso.rotation.x = 0.3 * k - 0.6 * b; r.head.rotation.x = -0.6 * k;
      r.armR.upper.rotation.z = -1.3 * k; r.armL.upper.rotation.z = 1.3 * k;
      r.hips.position.y = r.baseHipY - 0.2 * k + 0.1 * b;
      if (this.vial) this.vial.scale.setScalar(1 + 0.35 * k * (1 - b));
      return;
    }
    if (this.vial && this.vial.scale.x !== 1) this.vial.scale.setScalar(1);
    super._animate(dt);
  }
}
