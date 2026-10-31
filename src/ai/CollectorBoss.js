// Chefe do Capítulo 6: O Colecionador — o curador do acervo particular, alto e magro, de sobrecasaca, monóculo de
// vidro e bengala de gancho. No peito, dentro de uma gaiola de latão, um RELICÁRIO com um coração que ainda bate:
// é o ponto fraco, mas a gaiola o protege até ele se chocar com algo. Ele usa o próprio cenário contra Elias:
//   • "fetch"/"lift"/"throw": vai até um pedestal, arranca o busto de mármore e o arremessa (projétil real,
//     bloqueável; acaba quando os bustos acabam);
//   • "cue"  (fase 2+): toca a sineta da coleção e o TRILHO DO TETO varre a faixa onde Elias está (faixa vermelha
//     no chão avisa; o braço mecânico acerta quem estiver na faixa — inclusive ele próprio);
//   • fase 3: a sineta abre as vitrines de corpo inteiro do fundo e acorda os espécimes; as investidas não param;
//   • investida (do Cirurgião) que bate numa VITRINE BLINDADA ou numa peça caída do guincho o atordoa: a gaiola do
//     relicário se abre (dano cheio no coração);
//   • "crushed": a peça do GUINCHO DO TETO (alavancas nas paredes) cai em cima dele — dano real e gaiola aberta.
// Território: só a Galeria (bounds). Morte real: o corpo fica no pedestal (setDeadAt) e o roteiro abre a reserva.
import * as THREE from 'three';
import { SurgeonBoss } from './SurgeonBoss.js';
import { resetPose, poseWalk, keys } from '../gameplay/ProceduralRig.js';
import { createHumanoid } from '../gameplay/ProceduralRig.js';

export const COLLECTOR_HP = 640;
export const COLLECTOR_PHASES = { p2: 0.65, p3: 0.3 };
// multiplicadores: coração (relicário) × corpo, com a gaiola fechada / aberta (atordoado, esmagado)
export const COLLECTOR_DMG = {
  guarded: { weak: 0.35, body: 0.22 },
  exposed: { weak: 1.9, body: 0.5 },
};
export const COLLECTOR_CRUSH_DMG = 70;
export const COLLECTOR_SWEEP_DMG = 40;      // braço do trilho acertando o próprio Colecionador
export const COLLECTOR_THROW = { dmg: 20, knock: 4 };
export const COLLECTOR_RAIL = { warn: 1.1, sweep: 1.2, dmg: 24, knock: 6, halfZ: 0.9 };
const GRAV = 9.8;
const tmp = new THREE.Vector3();
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
const EXPOSED = ['stunned', 'crushed'];
const SPECIAL = ['fetch', 'lift', 'throw', 'cue', 'crushed'];

export class CollectorBoss extends SurgeonBoss {
  constructor(game, o) {
    super(game, o);
    this.id = 'colecionador';
    this.name = 'O Colecionador';
    this.maxHp = o.hp || COLLECTOR_HP; this.hp = this.maxHp;
    this.radius = 0.6;
    this.def = { height: 2.8, sight: 30, fov: 200, hearing: 2 };
    this.bounds = o.bounds;
    this.level = o.level;           // AcervoLevel: bustos, trilho, vitrines blindadas
    this.rows = o.rows || [];       // z de cada faixa do trilho
    this.railX = o.railX || { from: 28.6, to: 45.4 };
    this.onWake = o.onWake || null; // fase 3: acorda os espécimes da Galeria
    this.txt = {
      stunObst: 'O Colecionador se chocou contra a peça blindada! A gaiola do relicário no peito se abriu — golpeie o coração!',
      stunWall: 'O Colecionador bateu na parede da Galeria.',
    };
    this.throwCd = 2.5; this.railCd = 2; this.wakePending = false; this.woke = false;
    this.projectiles = []; this.sweeps = [];
    this.carry = null; this.fetchT = 0; this.target = null;
    this.seen = { fetch: 0, throw: 0, cue: 0, sweep: 0, sweepSelf: 0, charge: 0, stunned: 0, crushed: 0, cracked: 0 };
    this.cageOpen = 0;
    this._pose(0);
  }

  _build() {
    const M = this.game.materials;
    const s = 1.5;
    this.scale = s;
    const coat = M.leatherDark || M.robe, skin = M.wax || M.deadSkin;
    this.rig = createHumanoid({ scale: s, hunch: 0.12, torsoW: 0.4, armLen: 0.38, armW: 0.1, legLen: 0.5,
      mats: { skin, shirt: coat, arms: coat, pants: M.pantsGray || coat, legs: M.pantsGray || coat, feet: M.leatherDark, head: skin } });
    const h = this.rig.head;
    // cartola, monóculo de vidro (um olho que brilha), costeletas grisalhas
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * s, 0.2 * s, 0.02 * s, 12), M.coal || coat); brim.position.y = 0.29 * s; h.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.15 * s, 0.24 * s, 12), M.coal || coat); crown.position.y = 0.42 * s; h.add(crown);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.152 * s, 0.152 * s, 0.03 * s, 12), M.velvet || M.lampRed); band.position.y = 0.32 * s; h.add(band);
    const mono = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * s, 0.045 * s, 0.01, 10), M.glassEye || M.eyeGlow); mono.rotation.x = Math.PI / 2; mono.position.set(-0.05 * s, 0.17 * s, 0.135 * s); h.add(mono);
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.03 * s, 0.02 * s, 0.01), M.eyeGlow); eye.position.set(0.05 * s, 0.17 * s, 0.135 * s); h.add(eye);
    const chainM = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.12 * s, 0.006), M.brass || M.gold); chainM.position.set(-0.08 * s, 0.1 * s, 0.135 * s); h.add(chainM);
    for (const x of [-0.11, 0.11]) { const sb = new THREE.Mesh(new THREE.BoxGeometry(0.03 * s, 0.1 * s, 0.08 * s), M.ash || M.paper); sb.position.set(x * s, 0.09 * s, 0.06 * s); h.add(sb); }
    // sobrecasaca: abas compridas até os joelhos, lapelas de veludo
    for (const x of [-0.1, 0.1]) {
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.17 * s, 0.6 * s, 0.03 * s), coat); tail.position.set(x * s, -0.32 * s, -0.12 * s); tail.rotation.x = 0.08; this.rig.hips.add(tail);
      const lap = new THREE.Mesh(new THREE.BoxGeometry(0.06 * s, 0.34 * s, 0.02 * s), M.velvet || coat); lap.position.set(x * 0.9 * s, 0.4 * s, 0.13 * s); lap.rotation.z = x > 0 ? -0.25 : 0.25; this.rig.torso.add(lap);
    }
    // bengala de gancho (talho/arrasto) na mão direita
    const cane = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 1.1), M.woodDark); shaft.position.z = 0.45; cane.add(shaft);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 5, 10, Math.PI * 1.2), M.brass || M.gold); hook.position.set(0, 0.06, 1.0); hook.rotation.y = Math.PI / 2; cane.add(hook);
    cane.position.y = -0.04; this.rig.armR.end.add(cane);
    this.bladeTip = new THREE.Object3D(); this.bladeTip.position.set(0, 0, 1.02); cane.add(this.bladeTip);
    this.bladeMid = new THREE.Object3D(); this.bladeMid.position.set(0, 0, 0.55); cane.add(this.bladeMid);
    // relicário no peito: coração vermelho dentro de uma gaiola de latão (as grades abrem quando ele é atordoado)
    const hm = (M.vial || M.eyeGlow).clone();
    if (hm.color) hm.color.set(0x8a1010);
    if (hm.emissive) hm.emissive.set(0xff2a10);
    hm.transparent = false; hm.opacity = 1;
    this.vialMat = hm;
    this.vial = new THREE.Group(); this.vial.position.set(0, 0.36 * s, 0.15 * s); this.rig.torso.add(this.vial);
    const heart = new THREE.Mesh(new THREE.SphereGeometry(0.075 * s, 10, 8), hm); heart.scale.set(1, 1.15, 0.8); this.vial.add(heart);
    this.heart = heart;
    this.cage = [];
    for (let i = 0; i < 6; i++) {
      const pivot = new THREE.Group(); pivot.position.set((i - 2.5) * 0.032 * s, 0.11 * s, 0.05 * s);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.012 * s, 0.22 * s, 0.012 * s), M.brass || M.gold); bar.position.y = -0.11 * s; pivot.add(bar);
      this.vial.add(pivot); this.cage.push(pivot);
    }
    const ringT = new THREE.Mesh(new THREE.TorusGeometry(0.1 * s, 0.01 * s, 4, 12), M.brass || M.gold); ringT.position.y = 0.11 * s; ringT.rotation.x = Math.PI / 2; this.vial.add(ringT);
    this.vialLight = new THREE.PointLight(0xff3018, 0.0, 3, 2);
    this.vial.add(this.vialLight);
    // mão esquerda: segura o busto (e a sineta)
    this.hand = new THREE.Object3D(); this.hand.position.set(0, -0.05, 0.12); this.rig.armL.end.add(this.hand);
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.07, 8), M.brass || M.gold); bell.position.set(0, -0.06, 0.04); this.rig.armL.end.add(bell);
    this.bell = bell;
    this.rig.root.position.copy(this.pos); this.rig.root.rotation.y = this.yaw;
    this.game.scene.add(this.rig.root);
    this._animate(0);
  }

  get exposed() { return EXPOSED.includes(this.state); }

  hurtVolumes() {
    this.rig.root.updateMatrixWorld(true);
    this.vial.getWorldPosition(tmp);
    const low = this.exposed;
    return [
      { type: 'sphere', part: 'weak', x: tmp.x, y: tmp.y, z: tmp.z, r: low ? 0.5 : 0.26 },
      { type: 'capsule', part: 'body', x: this.pos.x, z: this.pos.z, y0: this.pos.y + 0.3, y1: this.pos.y + (low ? 2.0 : 2.7), r: 0.5 },
    ];
  }

  activate() {
    if (this.state !== 'dormant') return;
    this._set('intro');
    this.game.audio.play('chime', this.pos, { vol: 0.8 });
    this.game.audio.play('roar', this.pos, { pitch: 0.75 });
    this.game.cameraCtl.addShake(0.4);
  }

  setDeadAt(x, y, z) {
    this.pos.set(x, y, z); this.yaw = Math.PI;
    this.vialLight.intensity = 0; this.vialMat.emissiveIntensity = 0.05;
    this.cageOpen = 1;
    this.setDeadInstant();
  }

  dmgMul(weak) { const k = this.exposed ? COLLECTOR_DMG.exposed : COLLECTOR_DMG.guarded; return weak ? k.weak : k.body; }

  takeHit({ dmg, poise, heavy, from, point, volume }) {
    if (!this.alive || this.state === 'dormant' || this.state === 'intro') return 'immune';
    const g = this.game;
    const weak = volume?.part === 'weak';
    const real = dmg * this.dmgMul(weak);
    this.lastHit = { weak, real: +real.toFixed(2), exposed: this.exposed, state: this.state };
    this.flinch = weak ? 0.35 : 0.1;
    if (weak) {
      this.weakHits = (this.weakHits || 0) + 1;
      g.audio.play(this.exposed ? 'hit' : 'clang', this.pos, { heavy: true });
      if (this.exposed) { g.audio.play('shriek', this.pos, { pitch: 0.55 }); if (point) { g.combat.blood(point, 12); g.combat.emit(point, 12, 0xff2a10, 3); } }
      else if (point) g.combat.sparks(point, 8);
      g.hud.toast(this.exposed ? 'O coração no relicário se rasga — o Colecionador perde o fôlego!' : 'A gaiola de latão desvia o golpe. Faça-o se chocar com algo para abri-la.');
    } else {
      g.audio.play('hit', this.pos);
      if (point) g.combat.blood(point, 3);
      if (!this.warnedArmor) { this.warnedArmor = true; g.hud.toast('A carne de cera mal sente o golpe… o relicário no peito é o ponto fraco, mas a gaiola está fechada.'); }
    }
    return this._damage(real, 'hit');
  }

  /** dano real vindo do cenário (guincho, trilho) ou de golpes; trata fases e morte */
  _damage(real, kind) {
    const g = this.game;
    this.hp = Math.max(0, this.hp - real);
    g.bus.emit('BossDamaged', this);
    if (this.hp <= 0) { this._die(); return 'dead'; }
    const busy = () => this.exposed || this.state === 'grabHold' || SPECIAL.includes(this.state);
    if (this.phase === 1 && this.hp < this.maxHp * COLLECTOR_PHASES.p2) {
      this.phase = 2;
      if (!busy()) this._set('roar');
      g.audio.play('roar', this.pos, { pitch: 0.65 });
      g.hud.toast('O Colecionador ergue a sineta: "Faixa vermelha, senhor visitante." No teto, os braços do trilho começam a correr.', 4.5);
      this.railCd = Math.min(this.railCd, 1.5);
      g.bus.emit('CollectorPhase', 2);
    }
    if (this.phase === 2 && this.hp < this.maxHp * COLLECTOR_PHASES.p3) {
      this.phase = 3;
      if (!busy()) this._set('roar');
      g.audio.play('roar', this.pos, { pitch: 0.5 });
      g.hud.toast('"A coleção inteira, então." As vitrines do fundo estalam — e ele avança sem parar.', 4.5);
      this.chargeCd = 0; this.railCd = 0; this.wakePending = true;
      g.bus.emit('CollectorPhase', 3);
    }
    if (kind === 'hit' && this.lastHit?.weak && this.state === 'grabHold') { g.player.releaseGrab(false); this._set('stagger'); }
    return kind === 'hit' ? 'hit' : kind;
  }

  /** a peça do guincho caiu em cima dele */
  crush() {
    if (!this.alive || this.state === 'dormant' || this.state === 'intro') return false;
    const g = this.game;
    if (this.state === 'grabHold') g.player.releaseGrab(false);
    this._dropCarry();
    this.seen.crushed++;
    this._set('crushed'); this.stunDur = 5;
    g.audio.play('thud', this.pos); g.audio.play('roar', this.pos, { pitch: 0.6 });
    g.cameraCtl.addShake(0.8);
    g.hud.toast('A peça do guincho desaba sobre o Colecionador! A gaiola do relicário estourou — golpeie o coração!', 4);
    this._damage(COLLECTOR_CRUSH_DMG, 'crush');
    return true;
  }

  _die() {
    const g = this.game;
    this._dropCarry();
    for (const pr of this.projectiles) g.scene.remove(pr.mesh);
    this.projectiles.length = 0;
    this._resetRails();
    this.cageOpen = 1;
    super._die();
  }
  setDeadInstant() { super.setDeadInstant(); this._resetRails(); }

  _resetRails() {
    this.sweeps = [];
    if (this.level?.setRail) for (let i = 0; i < this.rows.length; i++) this.level.setRail(i, false, 0);
  }

  _dropCarry() {
    if (!this.carry) return;
    this.carry.removeFromParent();
    this.carry = null;
  }

  // ---------- bustos ----------
  _nearestBust() {
    const free = this.level?.freeBusts?.() || [];
    let best = null, bd = Infinity;
    for (const u of free) { const d = Math.hypot(u.x - this.pos.x, u.z - this.pos.z); if (d < bd) { bd = d; best = u; } }
    return best;
  }
  _throwBust() {
    const g = this.game, p = g.player;
    this.rig.root.position.copy(this.pos); this.rig.root.rotation.y = this.yaw; this._animate(0); this.rig.root.updateMatrixWorld(true);
    this.hand.getWorldPosition(tmp);
    const from = tmp.clone();
    const mesh = this.carry || new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), g.materials.stone);
    if (this.carry) { this.carry.removeFromParent(); this.carry = null; }
    mesh.position.copy(from); g.scene.add(mesh);
    const tx = p.pos.x, tz = p.pos.z, ty = p.pos.y + 1.1;
    const dx = tx - from.x, dz = tz - from.z, dist = Math.hypot(dx, dz);
    const T = Math.max(0.5, Math.min(1.1, dist / 11));
    const vel = new THREE.Vector3(dx / T, (ty - from.y + 0.5 * GRAV * T * T) / T, dz / T);
    this.projectiles.push({ mesh, pos: from, vel, t: 0 });
    this.seen.throw++;
    g.audio.play('swing', this.pos, { heavy: true });
  }
  _updateProjectiles(dt) {
    const g = this.game, p = g.player;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.t += dt; pr.vel.y -= GRAV * dt;
      pr.pos.addScaledVector(pr.vel, dt);
      pr.mesh.position.copy(pr.pos); pr.mesh.rotation.x += dt * 6; pr.mesh.rotation.z += dt * 4;
      let done = pr.t > 3;
      if (!done && p.alive) {
        const cap = p.hurtVolumes()[0];
        const y = Math.max(cap.y0, Math.min(cap.y1, pr.pos.y));
        if (Math.hypot(pr.pos.x - cap.x, pr.pos.y - y, pr.pos.z - cap.z) <= 0.3 + cap.r) {
          p.takeHit({ dmg: COLLECTOR_THROW.dmg, from: pr.pos, knock: COLLECTOR_THROW.knock, blockable: true, source: this });
          this.throwHits = (this.throwHits || 0) + 1;
          done = true;
        }
      }
      if (!done && pr.t > 0.12) {
        const gy = g.col.groundAt(pr.pos.x, pr.pos.z, pr.pos.y + 0.5);
        if ((gy > -Infinity && pr.pos.y <= gy + 0.1) || g.col.pointInside(pr.pos, (b) => b.tag === 'wall' || b.tag === 'obstacle' || b.tag === 'prop')) done = true;
      }
      if (done) {
        g.combat.emit({ x: pr.pos.x, y: pr.pos.y + 0.1, z: pr.pos.z }, 16, 0xcfc8bc, 3);
        g.audio.play('thud', pr.pos); g.audio.play('glass', pr.pos, { vol: 0.25 });
        g.perception.noise(pr.pos, 8, 'metal');
        g.scene.remove(pr.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  // ---------- trilho do teto ----------
  _rowNear(z) {
    let bi = 0, bd = Infinity;
    this.rows.forEach((rz, i) => { const d = Math.abs(rz - z); if (d < bd) { bd = d; bi = i; } });
    return bi;
  }
  startSweep(i) {
    if (this.sweeps.some((s) => s.i === i)) return false;
    this.sweeps.push({ i, t: 0, hitP: false, hitB: false });
    this.seen.sweep++;
    this.game.audio.play('switch', { x: this.railX.from, y: 6, z: this.rows[i] });
    this.level?.setRail(i, true, 0);
    return true;
  }
  _updateSweeps(dt) {
    const g = this.game, p = g.player, R = COLLECTOR_RAIL;
    for (let k = this.sweeps.length - 1; k >= 0; k--) {
      const s = this.sweeps[k], z = this.rows[s.i];
      s.t += dt;
      if (s.t < R.warn) { this.level?.setRail(s.i, Math.floor(s.t * 8) % 2 === 0, 0); continue; }
      const u = Math.min(1, (s.t - R.warn) / R.sweep);
      const x = this.railX.from + (this.railX.to - this.railX.from) * u;
      this.level?.setRail(s.i, true, u);
      if (!s.snd) { s.snd = true; g.audio.play('elevator', { x, y: 2, z }, { dur: R.sweep }); }
      if (!s.hitP && p.alive && Math.abs(p.pos.z - z) < R.halfZ && Math.abs(p.pos.x - x) < 0.8 && p.pos.y < 1.8) {
        s.hitP = true;
        p.takeHit({ dmg: R.dmg, from: { x: x - 1, y: p.pos.y, z }, knock: R.knock, blockable: false, source: this });
        g.audio.play('clang', p.pos); g.cameraCtl.addShake(0.5);
      }
      if (!s.hitB && this.alive && Math.abs(this.pos.z - z) < R.halfZ + 0.2 && Math.abs(this.pos.x - x) < 0.9) {
        s.hitB = true; this.seen.sweepSelf++;
        g.audio.play('clang', this.pos); g.audio.play('roar', this.pos, { pitch: 0.9 });
        g.hud.toast('O braço do trilho acerta o próprio Colecionador!', 3);
        if (this.state === 'grabHold') p.releaseGrab(false);
        this._dropCarry();
        if (!this.exposed) this._set('stagger');
        this._damage(COLLECTOR_SWEEP_DMG, 'sweep');
      }
      if (u >= 1) { this.level?.setRail(s.i, false, 0); this.sweeps.splice(k, 1); }
    }
  }

  // ---------- atualização ----------
  update(dt) {
    const g = this.game, p = g.player, pp = p.pos;
    this._updateProjectiles(dt);
    if (this.state === 'dead' || this.state === 'dormant') { super.update(dt); this._clamp(); this._cageAnim(dt); return; }
    this._updateSweeps(dt);
    if (!this.alive) { this._clamp(); return; }
    const fast = this.phase >= 3 ? 1.3 : this.phase === 2 ? 1.15 : 1;
    this.throwCd -= dt; this.railCd -= dt;
    const dist = Math.hypot(pp.x - this.pos.x, pp.z - this.pos.z);
    // decisões próprias (antes do Cirurgião): buscar busto / tocar a sineta
    if (this.state === 'stalk' && p.alive) {
      if (this.wakePending || (this.phase >= 2 && this.railCd <= 0)) { this._set('cue'); this.seen.cue++; }
      else if (this.throwCd <= 0 && dist > 3.5) {
        const b = this._nearestBust();
        if (b) { this.target = b; this._set('fetch'); this.seen.fetch++; }
        else this.throwCd = 99;
      }
    }
    if (SPECIAL.includes(this.state)) {
      this.stateT += dt; this.animT += dt;
      this.flinch = Math.max(0, this.flinch - dt);
      this.chargeCd -= dt;
      this.speed = 0;
      const glow = this.exposed ? 2.4 : 0.4;
      this.vialLight.intensity += (glow - this.vialLight.intensity) * Math.min(1, dt * 6);
      this.vialMat.emissiveIntensity = 0.3 + this.vialLight.intensity * 0.5;
      switch (this.state) {
        case 'fetch': {
          const b = this.target;
          if (!b || this.level.busts[b.id]?.taken) { const n = this._nearestBust(); if (!n) { this._set('stalk'); this.throwCd = 99; break; } this.target = n; }
          const t = this.target;
          const dx = t.x - this.pos.x, dz = t.z - this.pos.z, d = Math.hypot(dx, dz);
          this.yaw += Math.max(-4 * dt, Math.min(4 * dt, angDiff(this.yaw, Math.atan2(dx, dz))));
          const sp = 2.6 * fast;
          if (d > 1.2) { this.pos.x += Math.sin(this.yaw) * sp * dt; this.pos.z += Math.cos(this.yaw) * sp * dt; this.speed = sp; }
          else if (this.level.takeBust(t.id)) {
            const src = this.level.busts[t.id].mesh;
            const c = src.clone(); c.visible = true; c.position.set(0, -0.3, 0.1); c.scale.setScalar(0.8);
            this.hand.add(c); this.carry = c;
            g.audio.play('thud', this.pos, { vol: 0.5 });
            this._set('lift');
          }
          if (this.state === 'fetch' && this.stateT > 4) { this._set('stalk'); this.throwCd = 2; }
          break;
        }
        case 'lift':
          this._face(pp, 3, dt);
          if (this.stateT > 0.6 / fast) this._set('throw');
          break;
        case 'throw':
          this._face(pp, 3, dt);
          if (this.stateT > 0.3 && this.carry) this._throwBust();
          if (this.stateT > 0.9) { this._set('stalk'); this.decideT = 0.5; this.throwCd = this.phase >= 3 ? 3 : this.phase === 2 ? 4.5 : 6; }
          break;
        case 'cue': {
          this._face(pp, 2.5, dt);
          if (this.stateT > 0.3 && !this.cueSnd) { this.cueSnd = true; g.audio.play('chime', this.pos, { vol: 0.9 }); }
          if (this.stateT > 1.0) {
            this.cueSnd = false;
            if (this.wakePending) { this.wakePending = false; this.woke = true; this.onWake?.(); }
            if (this.phase >= 2) {
              const i = this._rowNear(pp.z);
              this.startSweep(i);
              // fase 3: duas faixas de uma vez (a de Elias e a vizinha)
              if (this.phase >= 3) { const j = i + (pp.z > this.rows[i] ? 1 : -1); if (j >= 0 && j < this.rows.length) this.startSweep(j); }
            }
            this.railCd = this.phase >= 3 ? 5 : 7;
            this._set('stalk'); this.decideT = 0.3;
          }
          break;
        }
        case 'crushed':
          if (this.stateT > this.stunDur) { this._set('recover'); }
          break;
      }
      const gy = g.col.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.5);
      if (gy > -Infinity) this.pos.y = gy;
      if (this.state !== 'crushed') g.col.resolveCircle(this.pos, this.radius, this.def.height);
      if (p.alive) {
        const dx = this.pos.x - pp.x, dz = this.pos.z - pp.z, dd = Math.hypot(dx, dz), m = this.radius + p.radius;
        if (dd < m && dd > 1e-4) { pp.x -= dx / dd * (m - dd); pp.z -= dz / dd * (m - dd); }
      }
      this._clamp();
      this._cageAnim(dt);
      this._pose(dt);
      return;
    }
    // ---------- máquina de estados do Cirurgião ----------
    const prev = this.state;
    super.update(dt * (this.phase >= 3 ? 1.05 : 0.95));
    if (this.state === 'charge' && prev !== 'charge') this.seen.charge++;
    if (this.state === 'stunned' && prev !== 'stunned') {
      this.seen.stunned++;
      this._dropCarry();
      const id = this.level?.armoredNear?.(this.pos, 1.0);
      if (id) { this.level.crackArmored(id); this.seen.cracked++; this.stunDur = Math.max(this.stunDur, 4.6); }
    }
    if (this.phase >= 3 && this.chargeCd > 1.2) this.chargeCd = 1.2;
    this._clamp();
    this._cageAnim(dt);
  }

  _cageAnim(dt) {
    const tgt = this.exposed || this.state === 'dead' ? 1 : 0;
    this.cageOpen += (tgt - this.cageOpen) * Math.min(1, dt * 8);
    this.cage.forEach((c, i) => { c.rotation.x = -this.cageOpen * 1.4; c.rotation.z = (i < 3 ? 1 : -1) * this.cageOpen * 0.5; });
  }

  _clamp() {
    const B = this.bounds;
    if (B) {
      this.pos.x = Math.min(B.maxX, Math.max(B.minX, this.pos.x));
      this.pos.z = Math.min(B.maxZ, Math.max(B.minZ, this.pos.z));
    }
    this.rig.root.position.copy(this.pos);
  }

  _pose(dt) {
    this._animate(dt);
    this.rig.root.position.copy(this.pos);
    this.rig.root.rotation.y = this.yaw;
  }

  _animate(dt) {
    const r = this.rig, t = this.stateT;
    switch (this.state) {
      case 'dormant': {
        // posa como peça do acervo: ereto, mãos cruzadas sobre a bengala
        resetPose(r);
        r.armR.upper.rotation.x = -0.5; r.armR.lower.rotation.x = -0.7; r.armR.upper.rotation.z = 0.25;
        r.armL.upper.rotation.x = -0.5; r.armL.lower.rotation.x = -0.8; r.armL.upper.rotation.z = -0.3;
        r.head.rotation.x = 0.12;
        return;
      }
      case 'fetch': {
        resetPose(r);
        this.walkPhase += (this.speed || 1) * dt * 2;
        poseWalk(r, this.walkPhase, this.speed > 0.1 ? 0.8 : 0, 0);
        r.armR.upper.rotation.x = -0.4; r.armL.upper.rotation.x = -0.9;
        return;
      }
      case 'lift': {
        resetPose(r);
        const k = Math.min(1, t / 0.5);
        r.armL.upper.rotation.x = -1.2 - 1.6 * k; r.armL.lower.rotation.x = -0.4;
        r.torso.rotation.x = -0.15 * k; r.armR.upper.rotation.x = -0.4;
        return;
      }
      case 'throw': {
        resetPose(r);
        r.armL.upper.rotation.x = keys([[0, -2.8], [0.3, -0.5], [0.9, -0.3]], t);
        r.torso.rotation.x = keys([[0, -0.15], [0.3, 0.35], [0.9, 0.1]], t);
        r.torso.rotation.y = keys([[0, 0.3], [0.3, -0.3], [0.9, 0]], t);
        return;
      }
      case 'cue': {
        resetPose(r);
        r.armL.upper.rotation.x = -2.5; r.armL.upper.rotation.z = Math.sin(this.animT * 30) * 0.15;
        r.armL.lower.rotation.x = -0.3; r.head.rotation.x = -0.25;
        r.armR.upper.rotation.x = -0.4;
        return;
      }
      case 'crushed': {
        resetPose(r);
        const k = Math.min(1, t / 0.25);
        // a peça do guincho o dobra até o chão: de joelhos, curvado para a frente — o relicário fica na altura do machado
        r.hips.position.y = r.baseHipY - 0.8 * k;
        r.legR.upper.rotation.x = -1.5 * k; r.legR.lower.rotation.x = 1.9 * k;
        r.legL.upper.rotation.x = -1.5 * k; r.legL.lower.rotation.x = 1.9 * k;
        r.torso.rotation.x = 0.15 * k + Math.sin(this.animT * 5) * 0.04;
        r.armR.upper.rotation.z = -1.1 * k; r.armL.upper.rotation.z = 1.1 * k; r.head.rotation.x = 0.3;
        return;
      }
      case 'stunned': {
        super._animate(dt);
        // ajoelhado com o peito à mostra (o relicário fica na frente)
        r.torso.rotation.x = -0.25 + Math.sin(this.animT * 4) * 0.05; r.head.rotation.x = -0.35;
        r.armR.upper.rotation.z = -0.8; r.armL.upper.rotation.z = 0.8;
        return;
      }
      default: super._animate(dt);
    }
  }
}
