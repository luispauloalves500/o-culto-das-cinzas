// Chefe do Capítulo 5: A Afogada (Lurdes, a mulher do comporteiro, que caiu na comporta na enchente de 29).
// Anfíbia: dentro do poço das turbinas ela é a correnteza — nada submersa (imune), surge na beira para o bote e
// quase não sente golpes; no seco arrasta o corpo inchado, fica lenta e as GUELRAS (ponto fraco, no pescoço)
// ficam expostas. Herda a máquina de estados do Cirurgião (talho, agarrão, investida que atordoa nas grades e na
// carcaça da turbina) e acrescenta:
//   • "swim"   : submersa, imune, segue Elias pela água até a beira mais próxima;
//   • "lunge"  : surge da água e dá o bote (talho com as garras) — fica alguns instantes à tona;
//   • "leap"   : salta do poço para a margem quando Elias se afasta da água (e volta para a água depois);
//   • "pinned" : a TURBINA ligada a suga contra a grade de tomada d'água — guelras abertas, sem defesa;
//   • drenagem : o RALO esvazia o poço — ela fica encalhada no fundo seco e nunca mais nada (fase 2+);
//   • fase 3   : abaixo de 30% investe sem parar — as GRADES de contenção e a carcaça da turbina a atordoam.
// Morte real: o corpo fica no salão (setDeadAt), o roteiro abre a galeria de descarga.
import * as THREE from 'three';
import { SurgeonBoss } from './SurgeonBoss.js';
import { createHumanoid, resetPose, poseWalk, keys } from '../gameplay/ProceduralRig.js';

export const AFOGADA_HP = 620;
export const AFOGADA_PHASES = { p2: 0.65, p3: 0.3 };
// multiplicadores de dano: guelras × corpo, na água / no seco / presa (turbina, encalhada, atordoada)
export const AFOGADA_DMG = {
  wet: { weak: 0.45, body: 0.08 },
  dry: { weak: 1.35, body: 0.3 },
  exposed: { weak: 1.9, body: 0.55 },
};
const tmp = new THREE.Vector3();
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
const SUBMERGED = ['dormant', 'swim', 'leap'];
const EXPOSED = ['pinned', 'stunned', 'beached'];

export class AfogadaBoss extends SurgeonBoss {
  constructor(game, o) {
    super(game, o);
    this.id = 'afogada';
    this.name = 'A Afogada';
    this.maxHp = o.hp || AFOGADA_HP; this.hp = this.maxHp;
    this.radius = 0.62;
    this.def = { height: 2.7, sight: 30, fov: 200, hearing: 2 };
    this.pool = o.pool;             // { minX, maxX, minZ, maxZ, bed, level, top }
    this.bounds = o.bounds;         // limites do salão (a Afogada não sai dele)
    this.intake = o.intake;         // boca da tomada d'água (onde a turbina a prende)
    this.txt = { stunObst: 'A Afogada se chocou na grade de ferro! As guelras no pescoço estão abertas!', stunWall: 'A Afogada bateu na parede do salão!' };
    this.lungeCd = 1.5; this.landT = 0; this.swimT = 0; this.pitT = 0;
    this.drained = false; this.lastWet = true; this.seen = { leap: 0, lunge: 0, pinned: 0, beached: 0, swim: 0, charge: 0, stunned: 0 };
    this.pos.set(o.x, this.pool ? this.pool.bed : o.y, o.z);
    this.rig.root.visible = false;
    this._pose(0);
  }

  _build() {
    const M = this.game.materials;
    const s = 1.42;
    this.scale = s;
    const skin = M.drownedSkin || M.deadSkin, cloth = M.drownedCloth || M.apron;
    this.rig = createHumanoid({ scale: s, hunch: 0.32, torsoW: 0.5, armLen: 0.4, armW: 0.13, legLen: 0.44,
      mats: { skin, shirt: cloth, arms: skin, pants: cloth, legs: skin, feet: skin, head: skin } });
    const h = this.rig.head;
    // cabelo comprido e encharcado: mechas que caem sobre o rosto e as costas
    const hairM = M.weed || M.coal;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, len = (0.35 + (i % 3) * 0.12) * s;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.05 * s, len, 0.03 * s), hairM);
      m.position.set(Math.sin(a) * 0.11 * s, 0.22 * s - len / 2, Math.cos(a) * 0.11 * s - 0.01);
      m.rotation.x = Math.cos(a) * 0.12; m.rotation.z = -Math.sin(a) * 0.12; h.add(m);
    }
    for (const x of [-0.05, 0.05]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.035 * s, 0.025 * s, 0.01), M.drownedEye || M.eyeGlow); e.position.set(x * s, 0.17 * s, 0.135 * s); h.add(e); }
    // boca aberta, queixo caído
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 0.06 * s, 0.02 * s), M.coal); jaw.position.set(0, 0.05 * s, 0.13 * s); h.add(jaw);
    // vestido em farrapos até os joelhos
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * s, 0.4 * s, 0.6 * s, 7, 1, true), cloth);
    skirt.position.set(0, -0.28 * s, 0); this.rig.hips.add(skirt);
    // garras compridas (talho) nas duas mãos
    const claws = (end) => {
      const g = new THREE.Group();
      for (const x of [-0.04, 0, 0.04]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.32), M.bone || M.paper || skin); c.position.set(x, -0.04, 0.2); c.rotation.x = 0.25; g.add(c); }
      g.position.y = -0.04; end.add(g); return g;
    };
    const cr = claws(this.rig.armR.end); claws(this.rig.armL.end);
    this.bladeTip = new THREE.Object3D(); this.bladeTip.position.set(0, -0.12, 0.42); cr.add(this.bladeTip);
    this.bladeMid = new THREE.Object3D(); this.bladeMid.position.set(0, -0.06, 0.12); cr.add(this.bladeMid);
    // guelras: três fendas vermelhas de cada lado do pescoço = ponto fraco
    const gm = (M.vial || M.eyeGlow).clone();
    if (gm.color) gm.color.set(0x8a2020);
    if (gm.emissive) gm.emissive.set(0xff3020);
    gm.transparent = false; gm.opacity = 1;
    this.vialMat = gm;
    this.vial = new THREE.Group(); this.vial.position.set(0, 0.6 * s, 0.02 * s); this.rig.torso.add(this.vial);
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.022 * s, 0.1 * s), gm);
      f.position.set(side * 0.1 * s, -0.02 * s + i * 0.035 * s, 0); f.rotation.x = -0.3; this.vial.add(f);
    }
    this.gills = this.vial;
    this.vialLight = new THREE.PointLight(0xff5030, 0.0, 3, 2);
    this.vial.add(this.vialLight);
    this.hand = new THREE.Object3D(); this.hand.position.set(0, -0.05, 0.12); this.rig.armL.end.add(this.hand);
    this.rig.root.position.copy(this.pos); this.rig.root.rotation.y = this.yaw;
    this.game.scene.add(this.rig.root);
    this._animate(0);
  }

  // ---------- geometria do poço ----------
  inPoolRect(p = this.pos, inset = 0) { const P = this.pool; return !!P && p.x > P.minX + inset && p.x < P.maxX - inset && p.z > P.minZ + inset && p.z < P.maxZ - inset; }
  /** dentro d'água (poço cheio e abaixo da margem) */
  get wet() { return !this.drained && this.inPoolRect() && this.pos.y < this.pool.top - 0.6; }
  _poolPoint(t, inset = 0.8) {
    const P = this.pool;
    return { x: Math.min(P.maxX - inset, Math.max(P.minX + inset, t.x)), z: Math.min(P.maxZ - inset, Math.max(P.minZ + inset, t.z)) };
  }
  _distToPool(p) {
    const P = this.pool;
    const dx = Math.max(P.minX - p.x, 0, p.x - P.maxX), dz = Math.max(P.minZ - p.z, 0, p.z - P.maxZ);
    return Math.hypot(dx, dz);
  }
  // ponto seco a ~1.7 m de Elias, do lado de onde ela vem
  _landSpot(p) {
    const P = this.pool, B = this.bounds;
    const dx = this.pos.x - p.x, dz = this.pos.z - p.z, d = Math.hypot(dx, dz) || 1;
    let x = p.x + dx / d * 1.7, z = p.z + dz / d * 1.7;
    if (this.inPoolRect({ x, z }, -0.7)) {
      // empurra para a margem mais próxima
      const opts = [[P.minX - 1.0, z], [P.maxX + 1.0, z], [x, P.minZ - 1.0], [x, P.maxZ + 1.0]];
      let best = opts[0], bd = Infinity;
      for (const o of opts) { const q = Math.hypot(o[0] - x, o[1] - z); if (q < bd) { bd = q; best = o; } }
      [x, z] = best;
    }
    x = Math.min(B.maxX - 0.5, Math.max(B.minX + 0.5, x)); z = Math.min(B.maxZ - 0.5, Math.max(B.minZ + 0.5, z));
    return { x, z, y: P.top };
  }

  hurtVolumes() {
    if (SUBMERGED.includes(this.state) || this.state === 'emerge') return [];
    this.rig.root.updateMatrixWorld(true);
    this.vial.getWorldPosition(tmp);
    const low = this.state === 'pinned' || this.state === 'beached' || this.state === 'stunned' || this.wet;
    const top = low ? 1.9 : 2.5;
    return [
      { type: 'sphere', part: 'weak', x: tmp.x, y: tmp.y, z: tmp.z, r: EXPOSED.includes(this.state) ? 0.42 : 0.3 },
      { type: 'capsule', part: 'body', x: this.pos.x, z: this.pos.z, y0: this.pos.y + 0.3, y1: this.pos.y + top, r: 0.55 },
    ];
  }

  // a luta começa: ela sobe do meio do poço
  activate() {
    if (this.state !== 'dormant') return;
    const P = this.pool;
    this.pos.set((P.minX + P.maxX) / 2, P.bed, (P.minZ + P.maxZ) / 2 + 1.5);
    this.rig.root.visible = true;
    this._set('emerge');
    this.game.audio.play('splash', this.pos); this.game.audio.play('roar', this.pos, { pitch: 0.5 });
    this.game.cameraCtl.addShake(0.6);
    this.game.combat.splash?.({ x: this.pos.x, y: P.level, z: this.pos.z }, 30);
  }

  // corpo no salão (save com a Afogada morta)
  setDeadAt(x, y, z) {
    this.rig.root.visible = true;
    this.pos.set(x, y, z); this.yaw = Math.PI;
    this.vialLight.intensity = 0; this.vialMat.emissiveIntensity = 0.05;
    this.setDeadInstant();
  }

  dmgMul(weak) {
    const k = EXPOSED.includes(this.state) ? AFOGADA_DMG.exposed : this.wet ? AFOGADA_DMG.wet : AFOGADA_DMG.dry;
    return weak ? k.weak : k.body;
  }

  takeHit({ dmg, poise, heavy, from, point, volume }) {
    if (!this.alive || SUBMERGED.includes(this.state) || this.state === 'emerge') return 'immune';
    const g = this.game;
    const weak = volume?.part === 'weak';
    const real = dmg * this.dmgMul(weak);
    this.hp = Math.max(0, this.hp - real);
    this.flinch = weak ? 0.35 : 0.1;
    this.lastHit = { weak, real: +real.toFixed(2), wet: this.wet, state: this.state };
    if (weak) {
      this.weakHits = (this.weakHits || 0) + 1;
      g.audio.play('hit', this.pos, { heavy: true });
      g.audio.play('shriek', this.pos, { pitch: 0.5 });
      if (point) { g.combat.blood(point, 12); g.combat.emit(point, 10, 0x8a2020, 3); }
      g.hud.toast(this.wet ? 'As guelras se fecham na água — o golpe quase não entra.' : 'As guelras se rasgam — a Afogada guincha!');
    } else {
      g.audio.play('hit', this.pos);
      if (point) g.combat.blood(point, 3);
      if (this.wet && !this.warnedWet) { this.warnedWet = true; g.hud.toast('Na água ela é a correnteza: os golpes escorregam. Tire-a da água.'); }
      else if (!this.warnedArmor) { this.warnedArmor = true; g.hud.toast('A pele inchada amortece o golpe… as guelras no pescoço são o ponto fraco.'); }
    }
    g.bus.emit('BossDamaged', this);
    if (this.hp <= 0) { this.hp = 0; this._die(); return 'dead'; }
    if (this.phase === 1 && this.hp < this.maxHp * AFOGADA_PHASES.p2) {
      this.phase = 2;
      if (!EXPOSED.includes(this.state) && this.state !== 'grabHold') this._set('roar');
      g.audio.play('roar', this.pos, { pitch: 0.55 });
      g.hud.toast('A Afogada guincha e a água do poço ferve. No canto oeste, o volante do ralo de drenagem range.', 4.5);
      g.bus.emit('AfogadaPhase', 2);
    }
    if (this.phase === 2 && this.hp < this.maxHp * AFOGADA_PHASES.p3) {
      this.phase = 3;
      if (!EXPOSED.includes(this.state) && this.state !== 'grabHold') this._set('roar');
      g.audio.play('roar', this.pos, { pitch: 0.45 });
      g.hud.toast('Sangrando pelas guelras, a Afogada se joga contra tudo — leve-a até as grades de ferro!', 4.5);
      this.chargeCd = 0;
      g.bus.emit('AfogadaPhase', 3);
    }
    if (weak && this.state === 'grabHold') { g.player.releaseGrab(false); this._set('stagger'); }
    return 'hit';
  }

  // ---------- máquinas do salão ----------
  /** turbina ligada: se ela estiver na água, é sugada contra a grade da tomada d'água */
  turbinePull() {
    if (!this.alive || !this.wet || this.state === 'dormant' || this.state === 'emerge') return false;
    if (this.state === 'grabHold') this.game.player.releaseGrab(false);
    this._set('pinned'); this.stunDur = 4.6; this.seen.pinned++;
    this.yaw = Math.PI;
    const g = this.game;
    g.audio.play('roar', this.pos, { pitch: 0.7 }); g.audio.play('clang', this.intake || this.pos);
    g.cameraCtl.addShake(0.5);
    g.hud.toast('A sucção da turbina arrasta a Afogada contra a grade! As guelras estão abertas — agora!', 4);
    return true;
  }
  /** ralo aberto: o poço esvazia; se estiver no fundo, ela encalha */
  drain() {
    if (this.drained) return false;
    this.drained = true;
    if (!this.alive || this.state === 'dormant') return false;
    const inPit = this.inPoolRect() && this.pos.y < this.pool.top - 0.6;
    if (inPit && !['grabHold', 'dead'].includes(this.state)) {
      this._set('beached'); this.stunDur = 4.4; this.seen.beached++;
      this.game.audio.play('roar', this.pos, { pitch: 0.6 });
      this.game.hud.toast('A água some pelo ralo e a Afogada se debate no fundo seco, encalhada!', 4);
    }
    return true;
  }

  _die() {
    super._die();
    this.game.audio.play('splash', this.pos);
  }

  update(dt) {
    const g = this.game, p = g.player;
    if (this.state === 'dormant') { this.rig.root.visible = false; return; }
    if (this.state === 'dead') { super.update(dt); this._clamp(); return; }
    const fast = this.phase >= 3 ? 1.35 : this.phase === 2 ? 1.2 : 1;
    const P = this.pool;
    this.lungeCd -= dt;
    const pp = p.pos;
    const special = ['emerge', 'swim', 'lunge', 'leap', 'pinned', 'beached'];
    if (special.includes(this.state)) {
      this.stateT += dt; this.animT += dt;
      this.flinch = Math.max(0, this.flinch - dt);
      this.speed = 0;
      const glow = EXPOSED.includes(this.state) ? 2.4 : 0.4;
      this.vialLight.intensity += (glow - this.vialLight.intensity) * Math.min(1, dt * 6);
      this.vialMat.emissiveIntensity = 0.3 + this.vialLight.intensity * 0.5;
      switch (this.state) {
        case 'emerge':
          this._face(pp, 2, dt);
          if (this.stateT > 2.2) this._set(this.drained ? 'stalk' : 'swim');
          break;
        case 'swim': {
          this.seen.swim++;
          if (this.drained) { this._set('stalk'); break; }
          this.swimT += dt;
          const pIn = this.inPoolRect(pp) && pp.y < P.top - 0.6;
          const tgt = pIn ? { x: pp.x, z: pp.z } : this._poolPoint(pp, 0.7);
          const dx = tgt.x - this.pos.x, dz = tgt.z - this.pos.z, d = Math.hypot(dx, dz);
          if (d > 0.05) this.yaw += Math.max(-5 * dt, Math.min(5 * dt, angDiff(this.yaw, Math.atan2(dx, dz))));
          const sp = (pIn ? 3.2 : 4.4) * fast;
          if (d > 0.3) { const k = Math.min(d, sp * dt) / d; this.pos.x += dx * k; this.pos.z += dz * k; this.speed = sp; }
          const dist = Math.hypot(pp.x - this.pos.x, pp.z - this.pos.z);
          if (p.alive && dist < 2.7 && this.lungeCd <= 0 && Math.abs(pp.y - this.pos.y) < 2.2) { this._set('lunge'); this.seen.lunge++; break; }
          const far = this._distToPool(pp) > (this.phase >= 2 ? 2.5 : 3.5);
          if (p.alive && far && this.swimT > (this.phase >= 2 ? 1.8 : 2.8)) this._startLeap(this._landSpot(pp), false);
          if (Math.random() < dt * 3) g.combat.splash?.({ x: this.pos.x, y: P.level - 0.2, z: this.pos.z }, 3);
          break;
        }
        case 'lunge': {
          const t = this.stateT;
          if (t < 0.55) this._face(pp, 4, dt);
          if (t > 0.05 && !this.lungeSnd) { this.lungeSnd = true; g.audio.play('splash', this.pos); g.combat.splash?.({ x: this.pos.x, y: P.level, z: this.pos.z }, 14); }
          if (t > 0.55 && t < 0.85) {
            this.pos.x += Math.sin(this.yaw) * 3 * dt; this.pos.z += Math.cos(this.yaw) * 3 * dt;
            if (!this.swingSnd) { this.swingSnd = true; g.audio.play('swing', this.pos, { heavy: true }); }
            this._bladeHit(this.phase >= 2 ? 26 : 22, 5);
          }
          if (t > 1.7 / Math.min(fast, 1.2)) { this.lungeSnd = false; this.swingSnd = false; this.lungeCd = this.phase >= 2 ? 1.2 : 1.8; this._set(this.drained ? 'stalk' : 'swim'); }
          break;
        }
        case 'leap': {
          const L = this.leap, t = this.stateT;
          if (t < 0.45) { this._face({ x: L.to.x, z: L.to.z }, 5, dt); break; }
          const k = Math.min(1, (t - 0.45) / 0.8);
          this.pos.x = L.from.x + (L.to.x - L.from.x) * k;
          this.pos.z = L.from.z + (L.to.z - L.from.z) * k;
          this.pos.y = L.from.y + (L.to.y - L.from.y) * k + Math.sin(k * Math.PI) * 2.0;
          if (!this.leapSnd) { this.leapSnd = true; g.audio.play('splash', L.from); g.combat.splash?.({ x: L.from.x, y: P.level, z: L.from.z }, 24); }
          if (k >= 1) {
            this.leapSnd = false;
            this.pos.set(L.to.x, L.to.y, L.to.z);
            if (L.dive) { g.audio.play('splash', this.pos); g.combat.splash?.({ x: this.pos.x, y: P.level, z: this.pos.z }, 24); this.swimT = 0; this._set('swim'); }
            else {
              g.audio.play('thud', this.pos); g.cameraCtl.addShake(0.6);
              g.combat.emit({ x: this.pos.x, y: this.pos.y + 0.3, z: this.pos.z }, 18, 0x5a6e66, 3);
              this.landT = 0; this.decideT = 0.5; this._set('stalk');
              // caiu em cima de Elias
              if (p.alive && Math.hypot(pp.x - this.pos.x, pp.z - this.pos.z) < 1.4 && Math.abs(pp.y - this.pos.y) < 1.2) p.takeHit({ dmg: 18, from: this.pos, blockable: true, knock: 6, source: this });
            }
          }
          break;
        }
        case 'pinned': {
          // presa na grade da tomada d'água
          if (this.intake) {
            const dx = this.intake.x - this.pos.x, dz = this.intake.z - this.pos.z, d = Math.hypot(dx, dz);
            if (d > 0.05) { const k = Math.min(d, 6 * dt) / d; this.pos.x += dx * k; this.pos.z += dz * k; }
          }
          this.yaw = Math.PI;
          if (this.stateT > this.stunDur) { this.swimT = 0; this._set(this.drained ? 'stalk' : 'swim'); this.lungeCd = 1.2; }
          break;
        }
        case 'beached':
          if (this.stateT > this.stunDur) { this._set('stalk'); this.decideT = 0.4; }
          break;
      }
      if (this.state !== 'leap') {
        const gy = g.col.groundAt(this.pos.x, this.pos.z, this.pos.y);
        if (gy > -Infinity) this.pos.y = gy;
        if (this.state !== 'pinned') g.col.resolveCircle(this.pos, this.radius, this.def.height);
      }
      this._clamp();
      this._pose(dt);
      return;
    }
    // ---------- em terra (máquina de estados do Cirurgião, mais lenta no seco) ----------
    const prev = this.state;
    this.landT += dt;
    const k = this.drained ? (this.phase >= 3 ? 1 : 0.85) : (this.phase >= 3 ? 0.95 : 0.78);
    super.update(dt * k);
    if (this.state === 'charge' && prev !== 'charge') this.seen.charge++;
    if (this.state === 'stunned' && prev !== 'stunned') this.seen.stunned++;
    this._clamp();
    if (!this.alive) return;
    if (this.phase >= 3 && this.chargeCd > 1.2) this.chargeCd = 1.2;
    // caiu na água (andando ou investindo): mergulha
    if (this.wet && ['stalk', 'charge', 'recover', 'stagger'].includes(this.state)) { this.swimT = 0; this._set('swim'); this._pose(0); return; }
    if (this.state === 'stalk') {
      // fundo seco do poço: salta para a margem onde Elias está
      const inPit = this.inPoolRect() && this.pos.y < P.top - 0.6;
      if (inPit && pp.y > P.top - 0.6) { this.pitT += dt; if (this.pitT > 1.0) { this.pitT = 0; this._startLeap(this._landSpot(pp), false); } }
      else this.pitT = 0;
      // no seco por tempo demais: volta para a água (enquanto houver água)
      const landDur = this.phase >= 2 ? 9 : 12;
      if (!this.drained && !inPit && this.landT > landDur && this.state === 'stalk') {
        const tgt = this._poolPoint(this.pos, 1.2);
        this._startLeap({ x: tgt.x, y: P.bed, z: tgt.z }, true);
      }
    }
  }

  _startLeap(to, dive) {
    this.leap = { from: { x: this.pos.x, y: this.pos.y, z: this.pos.z }, to, dive };
    this.seen.leap++;
    this._set('leap');
    this.game.audio.play('roar', this.pos, { pitch: 0.8 });
  }

  _clamp() {
    const B = this.bounds; if (!B) return;
    this.pos.x = Math.min(B.maxX, Math.max(B.minX, this.pos.x));
    this.pos.z = Math.min(B.maxZ, Math.max(B.minZ, this.pos.z));
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
      case 'dormant': resetPose(r); r.body.rotation.x = 1.3; return;
      case 'emerge': {
        resetPose(r);
        const k = Math.min(1, t / 1.6);
        r.body.position.y = -1.6 * (1 - k);
        r.head.rotation.x = 0.6 - 1.0 * k; r.torso.rotation.x = 0.5 - 0.5 * k;
        r.armR.upper.rotation.z = -1.2 * k; r.armL.upper.rotation.z = 1.2 * k;
        return;
      }
      case 'swim': {
        resetPose(r);
        // corpo deitado logo abaixo da lâmina: só as costas e o cabelo aparecem
        this.walkPhase += (this.speed || 2) * dt * 1.6;
        const sw = Math.sin(this.walkPhase);
        r.body.rotation.x = 1.35; r.body.position.y = -0.95;
        r.armR.upper.rotation.x = -2.6 + sw * 0.9; r.armL.upper.rotation.x = -2.6 - sw * 0.9;
        r.legR.upper.rotation.x = sw * 0.4; r.legL.upper.rotation.x = -sw * 0.4;
        r.head.rotation.x = -0.9;
        return;
      }
      case 'lunge': {
        resetPose(r);
        const rise = keys([[0, -1.2], [0.4, -0.3], [0.55, 0], [1.3, 0], [1.7, -0.9]], t);
        r.body.position.y = rise;
        r.torso.rotation.x = keys([[0, 0.8], [0.5, 0.2], [0.7, 0.6], [1.7, 0.4]], t);
        r.armR.upper.rotation.x = keys([[0, -0.5], [0.5, -2.8], [0.75, -0.6], [1.7, -0.5]], t);
        r.armL.upper.rotation.x = keys([[0, -0.5], [0.5, -2.5], [0.75, -0.8], [1.7, -0.5]], t);
        r.head.rotation.x = -0.3;
        return;
      }
      case 'leap': {
        resetPose(r);
        if (t < 0.45) { r.body.position.y = this.leap?.from && this.pos.y < (this.pool?.top ?? 0) - 0.6 ? -0.6 : 0; r.hips.position.y = r.baseHipY - 0.3; r.torso.rotation.x = 0.7; }
        else { r.torso.rotation.x = 0.4; r.armR.upper.rotation.x = -2.4; r.armL.upper.rotation.x = -2.4; r.legL.upper.rotation.x = -0.9; r.legR.upper.rotation.x = 0.5; }
        return;
      }
      case 'pinned': {
        resetPose(r);
        // de costas contra a grade, braços abertos, guelras pulsando
        r.body.position.y = -0.55;
        r.armR.upper.rotation.z = -1.4 + Math.sin(this.animT * 9) * 0.1; r.armL.upper.rotation.z = 1.4 - Math.sin(this.animT * 9) * 0.1;
        r.torso.rotation.x = -0.25; r.head.rotation.x = -0.5;
        return;
      }
      case 'beached': {
        resetPose(r);
        const k = Math.min(1, t / 0.4);
        r.body.rotation.x = 1.2 * k; r.body.position.y = -0.4 * k;
        r.armR.upper.rotation.x = -1.5 + Math.sin(this.animT * 10) * 0.5; r.armL.upper.rotation.x = -1.5 - Math.sin(this.animT * 10) * 0.5;
        r.legL.upper.rotation.x = Math.sin(this.animT * 8) * 0.5;
        return;
      }
      case 'stalk': case 'recover': {
        // arrasta-se curvada no seco
        super._animate(dt);
        r.torso.rotation.x += 0.25; r.armR.upper.rotation.x = -0.25; r.armL.upper.rotation.x = -0.25 + Math.sin(this.animT * 2) * 0.1;
        return;
      }
      default: super._animate(dt);
    }
  }
}
