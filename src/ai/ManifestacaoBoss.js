// Chefe do Capítulo 8 (fase 2): a MANIFESTAÇÃO DA PRIMEIRA CINZA.
// Quando Vernet cai, a cinza dos transmissores desce sobre o corpo e se ergue num gigante de cinza com um
// núcleo em brasa no peito. A luta junta as mecânicas aprendidas no jogo:
//   • BOBINAS (3): enquanto há bobina viva ela é alimentada por arcos — a vida não desce abaixo de
//     22 % × bobinas vivas (o "piso"). Cortar o disjuntor de uma bobina (segurar 1,6 s) a ATORDOA 5 s,
//     tira 60 de vida e expõe o núcleo. Fases: 3 bobinas → fase 1; 1–2 → fase 2 (onda de cinza); 0 → fase 3.
//   • NÚCLEO: só leva dano cheio (×1,3) exposto (atordoada ou fase 3); fechado, a cinza absorve (×0,12).
//   • VAPOR (acumuladores): dispersa a cinza — atordoa 2,4 s e expõe o núcleo.
//   • FASE 3 — tempestade de cinza: a Manifestação fica CEGA (os arcos apagaram) e caça pelo SOM
//     (perception.hear), como o Vigia Caiado; perto demais ela sente pelo tato.
// Ataques telegrafados: pancada (marca no chão), varredura frontal e onda de cinza em anel que se expande (pular/rolar).
import * as THREE from 'three';
import { createHumanoid, resetPose, poseWalk, poseIdle, keys } from '../gameplay/ProceduralRig.js';

export const MANIF_HP = 720;
export const MANIF_FLOOR_PER_COIL = 0.22;
export const MANIF_CUT = { dmg: 60, stun: 5 };
export const MANIF_STEAM = { dmg: 18, stun: 2.4 };
export const MANIF_TOUCH = 2.2;
export const MANIF_WAVE = { speed: 6.5, maxR: 12, dmg: 16, band: 0.55 };
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
const tmp = new THREE.Vector3();

/** piso de vida enquanto houver bobinas vivas (puro, testado em unidade) */
export function manifFloor(maxHp, liveCoils) { return maxHp * MANIF_FLOOR_PER_COIL * Math.max(0, liveCoils); }
/** fase pela quantidade de bobinas vivas */
export function manifPhase(liveCoils, total = 3) { return liveCoils >= total ? 1 : liveCoils > 0 ? 2 : 3; }

export class ManifestacaoBoss {
  /** o = { x, y, z, yaw, coils:[{id,x,z,top}] } */
  constructor(game, o) {
    this.game = game;
    this.id = 'manifestacao';
    this.name = 'A Manifestação da Primeira Cinza';
    this.pos = new THREE.Vector3(o.x, o.y, o.z);
    this.yaw = o.yaw ?? Math.PI;
    this.maxHp = MANIF_HP; this.hp = this.maxHp;
    this.radius = 1.05; this.solid = true;
    this.def = { height: 3.6, sight: 30, fov: 200, hearing: 1.6 };
    this.state = 'dormant'; this.stateT = 0; this.animT = 0;
    this.coils = (o.coils || []).map((c) => ({ ...c, live: c.live !== false }));
    this.phase = manifPhase(this.liveCoils(), this.coils.length || 3);
    this.attackCd = 1.5; this.waveCd = 4; this.stunDur = 0;
    this.wave = null; this.target = null; this.walkPhase = 0; this.flinch = 0;
    this.seen = { cut: 0, steam: 0, wave: 0, slam: 0, sweep: 0, heard: 0, touch: 0, coreHits: 0, floorHeld: 0 };
    this._build();
  }
  get alive() { return this.state !== 'dead'; }
  liveCoils() { return this.coils.filter((c) => c.live).length; }
  get exposed() { return this.state === 'stunned' || this.phase >= 3; }
  get blind() { return this.phase >= 3; }

  _build() {
    const g = this.game, M = g.materials;
    const s = 2.15; this.scale = s;
    const ash = M.ash || M.soot, coal = M.coal || M.soot;
    this.rig = createHumanoid({ scale: s, hunch: 0.42, torsoW: 0.62, armLen: 0.42, armW: 0.17,
      mats: { skin: ash, shirt: coal, arms: ash, pants: coal, legs: ash, feet: coal, head: ash } });
    const h = this.rig.head;
    // rosto sem traços: duas fendas de brasa (apagam na fase 3, quando ela fica cega)
    this.eyes = [];
    for (const x of [-0.06, 0.06]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.05 * s, 0.015 * s, 0.01), M.ember); e.position.set(x * s, 0.18 * s, 0.13 * s); h.add(e); this.eyes.push(e); }
    // núcleo da Primeira Cinza no peito (ponto fraco), com "costelas" de cinza que se abrem quando exposto
    this.coreMat = (M.fireCore || M.ember).clone();
    this.core = new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 10, 8), this.coreMat);
    this.core.position.set(0, 0.32 * s, 0.17 * s); this.rig.torso.add(this.core);
    this.ribs = [];
    for (const side of [-1, 1]) for (const y of [-0.08, 0.02, 0.12]) {
      const rb = new THREE.Mesh(new THREE.BoxGeometry(0.16 * s, 0.035 * s, 0.05 * s), coal);
      rb.position.set(side * 0.08 * s, (0.32 + y) * s, 0.21 * s); rb.userData.side = side; this.rig.torso.add(rb); this.ribs.push(rb);
    }
    this.coreLight = new THREE.PointLight(0xff7a2a, 1.2, 7, 2); this.coreLight.userData.noShadow = true; this.core.add(this.coreLight);
    // coroa de espinhos de cinza na cabeça, esporões nos ombros e garras nas mãos
    const T = this.rig.torso;
    this.crown = new THREE.Group(); this.crown.name = 'coroa';
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2, len = (i % 2 ? 0.16 : 0.24) * s;
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.025 * s, len, 5), coal); sp.castShadow = true;
      sp.position.set(Math.sin(a) * 0.1 * s, 0.29 * s + len / 2, Math.cos(a) * 0.1 * s - 0.01 * s); sp.rotation.set(Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35);
      this.crown.add(sp);
    }
    h.add(this.crown);
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.04 * s, (0.2 - i * 0.04) * s, 5), coal); sp.castShadow = true;
      sp.position.set(sx * (0.24 - i * 0.07) * s, (0.62 + (i === 0 ? 0.04 : 0)) * s, (-0.04 - i * 0.02) * s); sp.rotation.set(-0.4, 0, -sx * (0.7 - i * 0.2)); T.add(sp);
    }
    this.claws = [];
    for (const arm of [this.rig.armR, this.rig.armL]) for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.014 * s, 0.11 * s, 4), coal);
      c.position.set((i - 1.5) * 0.028 * s, -0.17 * s, 0.03 * s); c.rotation.x = Math.PI + 0.35; arm.end.add(c); this.claws.push(c);
    }
    // veias de brasa no peito e nos braços: pulsam com o núcleo (mais fortes quando exposto)
    this.veinMat = new THREE.MeshBasicMaterial({ color: 0xff6a20, transparent: true, opacity: 0.85 });
    this.veins = [];
    const vein = (parent, w, hh, x, y, z, rz) => { const v = new THREE.Mesh(new THREE.BoxGeometry(w, hh, 0.012 * s), this.veinMat); v.position.set(x, y, z); v.rotation.z = rz; parent.add(v); this.veins.push(v); };
    for (const [x, y, rz, l] of [[-0.14, 0.42, 0.5, 0.2], [0.14, 0.44, -0.5, 0.2], [-0.2, 0.24, -0.3, 0.16], [0.19, 0.22, 0.35, 0.18], [0, 0.12, 0.1, 0.14], [-0.06, 0.52, 1.2, 0.1], [0.07, 0.5, -1.1, 0.1]]) vein(T, 0.014 * s, l * s, x * s, y * s, 0.128 * s, rz);
    for (const arm of [this.rig.armR, this.rig.armL]) { vein(arm.upper, 0.012 * s, 0.22 * s, 0, -0.2 * s, 0.087 * s, 0.15); vein(arm.lower, 0.012 * s, 0.2 * s, 0.01 * s, -0.2 * s, 0.077 * s, -0.2); }
    this.details = { crown: this.crown.children.length, claws: this.claws.length, veins: this.veins.length };
    this._trailT = 0;
    // flocos de cinza orbitando o corpo
    this.flakes = new THREE.Group();
    const fg = new THREE.BoxGeometry(0.12, 0.12, 0.02);
    for (let i = 0; i < 22; i++) {
      const f = new THREE.Mesh(fg, i % 5 === 0 ? M.ember : ash);
      f.userData = { a: i / 22 * Math.PI * 2, r: 1.1 + (i % 3) * 0.35, y: 0.6 + (i * 0.37) % 3.2, w: 0.6 + (i % 4) * 0.25 };
      this.flakes.add(f);
    }
    this.rig.root.add(this.flakes);
    // arcos elétricos das bobinas vivas até o peito
    this.arcs = this.coils.map((c) => {
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(8 * 3), 3));
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xbfd8ff, transparent: true, opacity: 0.9 }));
      line.frustumCulled = false; g.scene.add(line);
      return { id: c.id, line };
    });
    // marca no chão (pancada) e onda de cinza (anel)
    const markMat = (M.ember || M.fire).clone(); markMat.transparent = true; markMat.opacity = 0; markMat.side = THREE.DoubleSide; markMat.depthWrite = false;
    this.mark = new THREE.Mesh(new THREE.CircleGeometry(1.6, 18), markMat); this.mark.rotation.x = -Math.PI / 2; this.mark.visible = false; g.scene.add(this.mark);
    const waveMat = (M.ash || M.soot).clone(); waveMat.transparent = true; waveMat.opacity = 0.85; waveMat.side = THREE.DoubleSide; waveMat.depthWrite = false;
    if (waveMat.emissive) { waveMat.emissive.set(0x6a3a1a); waveMat.emissiveIntensity = 0.9; }
    this.waveMesh = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.15, 40, 1), waveMat); this.waveMesh.rotation.x = -Math.PI / 2; this.waveMesh.visible = false; g.scene.add(this.waveMesh);
    this.rig.root.visible = false; // aparece quando a cinza desce (activate)
    this.rig.root.position.copy(this.pos); this.rig.root.rotation.y = this.yaw;
    g.scene.add(this.rig.root);
    this._animate(0);
  }

  weakPoint() { this.rig.root.updateMatrixWorld(true); this.core.getWorldPosition(tmp); return { x: tmp.x, y: tmp.y, z: tmp.z }; }
  hurtVolumes() {
    const w = this.weakPoint();
    const top = this.state === 'stunned' ? 2.6 : 3.5;
    return [
      { type: 'sphere', part: 'weak', x: w.x, y: w.y, z: w.z, r: 0.42 },
      { type: 'capsule', part: 'body', x: this.pos.x, z: this.pos.z, y0: this.pos.y + 0.3, y1: this.pos.y + top, r: 0.95 },
    ];
  }

  activate() {
    if (this.state !== 'dormant') return;
    this.rig.root.visible = true;
    this._set('rise');
    this.game.audio.play('roar', this.pos, { pitch: 0.5 });
    this.game.cameraCtl.addShake(0.8);
  }
  _set(s) { this.state = s; this.stateT = 0; this.hitDone = false; }

  _clampFloor() {
    const f = manifFloor(this.maxHp, this.liveCoils());
    if (this.hp < f) { this.hp = f; this.seen.floorHeld++; return true; }
    return false;
  }

  takeHit({ dmg, point, volume }) {
    if (!this.alive || this.state === 'dormant' || this.state === 'rise') return 'immune';
    const g = this.game;
    const core = volume?.part === 'weak' && this.exposed;
    const real = core ? dmg * 1.3 : dmg * 0.12;
    this.hp -= real;
    this.flinch = core ? 0.35 : 0.08;
    const held = this._clampFloor();
    if (core) {
      this.seen.coreHits++;
      g.audio.play('hit', this.pos, { heavy: true }); g.audio.play('shriek', this.pos, { pitch: 0.45 });
      if (point) { g.combat.emit(point, 20, 0xff7a2a, 4); g.combat.sparks(point, 12); }
      if (held && !this._warnFloor) { this._warnFloor = true; g.hud.toast('O núcleo se refaz — os arcos das bobinas o alimentam. Corte as bobinas nos disjuntores!', 4); }
    } else {
      g.audio.play('thud', this.pos);
      if (point) g.combat.emit(point, 10, 0x8a847a, 2.5);
      if (!this._warnBody) { this._warnBody = true; g.hud.toast(this.phase >= 3 ? 'A cinza se desfaz e se refaz ao redor do golpe… mire no núcleo em brasa.' : 'O golpe atravessa cinza. O núcleo no peito só se abre quando ela está atordoada.', 4); }
    }
    g.bus.emit('BossDamaged', this);
    if (this.hp <= 0) { this.hp = 0; this._die(); return 'dead'; }
    return 'hit';
  }

  /** o script corta o disjuntor de uma bobina */
  cutCoil(id) {
    const c = this.coils.find((k) => k.id === id);
    if (!c || !c.live) return false;
    c.live = false;
    const arc = this.arcs.find((a) => a.id === id); if (arc) arc.line.visible = false;
    this.seen.cut++;
    if (!this.alive || this.state === 'dormant') return true;
    const g = this.game;
    this.hp = Math.max(1, this.hp - MANIF_CUT.dmg);
    this._clampFloor();
    const before = this.phase;
    this.phase = manifPhase(this.liveCoils(), this.coils.length);
    this.wave = null; this.waveMesh.visible = false; this.mark.visible = false;
    this._set('stunned'); this.stunDur = MANIF_CUT.stun;
    g.audio.play('shriek', this.pos, { pitch: 0.4 }); g.audio.play('clang', this.pos);
    g.cameraCtl.addShake(0.6);
    g.bus.emit('BossDamaged', this);
    if (this.phase !== before) g.bus.emit('BossPhase', { boss: this, phase: this.phase });
    g.hud.toast(this.phase >= 3
      ? 'A última bobina morre. A Manifestação urra — os olhos apagam. A cinza vira tempestade: agora ela caça pelo SOM.'
      : `O arco se parte! A Manifestação se curva, o núcleo aberto — ${this.liveCoils()} bobina(s) ainda a alimentam.`, 5);
    return true;
  }

  /** jato dos acumuladores de vapor: dispersa a cinza */
  steamHit() {
    if (!this.alive || this.state === 'dormant' || this.state === 'rise' || this.state === 'stunned') return false;
    const g = this.game;
    this.hp -= MANIF_STEAM.dmg; this._clampFloor(); this.seen.steam++;
    this.wave = null; this.waveMesh.visible = false; this.mark.visible = false;
    this._set('stunned'); this.stunDur = MANIF_STEAM.stun;
    g.audio.play('shriek', this.pos, { pitch: 0.55 });
    g.bus.emit('BossDamaged', this);
    if (this.hp <= 0) { this.hp = 0; this._die(); return true; }
    g.hud.toast('O vapor varre a cinza do peito dela — o núcleo fica à mostra!', 3);
    return true;
  }

  _die() {
    const g = this.game;
    this._set('dead'); this.solid = false;
    this.wave = null; this.waveMesh.visible = false; this.mark.visible = false;
    for (const a of this.arcs) a.line.visible = false;
    g.audio.play('roar', this.pos, { pitch: 0.4 }); g.audio.play('thud', this.pos);
    g.cameraCtl.addShake(1.0);
    if (g.level) g.level.ashStorm = 0;
    g.bus.emit('BossDefeated', this);
  }
  setDeadInstant() {
    this.state = 'dead'; this.stateT = 10; this.solid = false; this.hp = 0;
    this.rig.root.visible = false; this.mark.visible = false; this.waveMesh.visible = false;
    for (const a of this.arcs) a.line.visible = false;
  }
  dispose() {
    const g = this.game;
    g.scene.remove(this.rig.root, this.mark, this.waveMesh);
    for (const a of this.arcs) g.scene.remove(a.line);
  }

  _face(p, rate, dt) {
    const da = angDiff(this.yaw, Math.atan2(p.x - this.pos.x, p.z - this.pos.z));
    this.yaw += Math.max(-rate * dt, Math.min(rate * dt, da));
    return Math.abs(da);
  }
  _move(sp, dt) { this.pos.x += Math.sin(this.yaw) * sp * dt; this.pos.z += Math.cos(this.yaw) * sp * dt; this.speed = sp; }

  /** fase 3: escuta (ruído do jogador/cenário) ou sente pelo tato */
  _hear() {
    const g = this.game, p = g.player;
    const d = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    let heard = null;
    if (p.alive && d < MANIF_TOUCH && Math.abs(p.pos.y - this.pos.y) < 1.6) { heard = { x: p.pos.x, y: p.pos.y, z: p.pos.z, kind: 'touch' }; this.seen.touch++; }
    else if (g.perception) heard = g.perception.hear(this, 1);
    if (heard) { this.target = { x: heard.x, y: heard.y, z: heard.z }; this.targetKind = heard.kind; this.seen.heard++; }
    return heard;
  }

  _hitPlayer(dmg, blockable, knock) {
    const p = this.game.player;
    return p.takeHit({ dmg, from: this.pos, blockable, knock, source: this });
  }

  update(dt) {
    const g = this.game, p = g.player;
    this.stateT += dt; this.animT += dt; this.speed = 0;
    this.attackCd -= dt; this.waveCd -= dt;
    this.flinch = Math.max(0, this.flinch - dt);
    const dist = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    const fast = this.phase >= 3 ? 1.35 : this.phase === 2 ? 1.15 : 1;
    // tempestade de cinza na fase 3 (neblina mais densa)
    if (g.level) g.level.ashStorm = this.alive && this.phase >= 3 && this.state !== 'dormant' ? 0.03 : 0;

    switch (this.state) {
      case 'dormant': case 'dead': break;
      case 'rise': this._face(p.pos, 1.5, dt); if (this.stateT > 2.6) this._set(this.blind ? 'listen' : 'stalk'); break;
      case 'stalk': {
        if (!p.alive) break;
        this._face(p.pos, 2.2 * fast, dt);
        if (dist > 2.6) this._move(1.35 * fast, dt);
        if (this.phase >= 2 && this.waveCd <= 0 && dist > 3 && dist < 10) { this._set('waveWind'); break; }
        if (this.attackCd <= 0 && dist < 3.4) this._set(dist < 2.2 && Math.random() < 0.5 ? 'sweep' : 'slam');
        break;
      }
      case 'listen': { // fase 3 (cega): parada, girando a cabeça
        const h = this._hear();
        if (h) {
          if (h.kind === 'touch' && this.attackCd <= 0) { this._set('sweep'); break; }
          this._set('track');
        } else if (this.waveCd <= 0 && this.stateT > 2.5) this._set('waveWind');
        break;
      }
      case 'track': {
        const h = this._hear();
        const t = this.target;
        if (!t) { this._set('listen'); break; }
        this._face(t, 2.6, dt);
        const d = Math.hypot(t.x - this.pos.x, t.z - this.pos.z);
        if (h && h.kind === 'touch' && this.attackCd <= 0) { this._set(Math.random() < 0.5 ? 'sweep' : 'slam'); break; }
        if (d < 1.4 || this.stateT > 6) {
          this.target = null;
          if (this.attackCd <= 0 && dist < 3.4) this._set('slam'); else this._set('listen');
          break;
        }
        this._move(2.1, dt);
        break;
      }
      case 'slam': { // 1,0 s de aviso: marca no chão à frente; pancada não bloqueável
        const wind = 1.0 / Math.min(fast, 1.2);
        if (this.stateT < wind * 0.6 && !this.blind) this._face(p.pos, 2.5, dt);
        const fx = this.pos.x + Math.sin(this.yaw) * 1.9, fz = this.pos.z + Math.cos(this.yaw) * 1.9;
        this.mark.visible = this.stateT < wind + 0.3;
        this.mark.position.set(fx, this.pos.y + 0.05, fz);
        this.mark.material.opacity = Math.min(0.7, this.stateT / wind * 0.7);
        if (!this.hitDone && this.stateT >= wind) {
          this.hitDone = true; this.seen.slam++;
          g.audio.play('thud', { x: fx, y: this.pos.y, z: fz }); g.cameraCtl.addShake(0.6);
          g.combat.emit({ x: fx, y: this.pos.y + 0.3, z: fz }, 18, 0x8a847a, 4);
          g.perception?.noise({ x: fx, y: this.pos.y, z: fz }, 6, 'slam');
          if (p.alive && Math.hypot(p.pos.x - fx, p.pos.z - fz) < 1.7 && Math.abs(p.pos.y - this.pos.y) < 1.2) this._hitPlayer(28, false, 6);
        }
        if (this.stateT > wind + 0.9) { this.mark.visible = false; this.attackCd = this.phase >= 2 ? 1.6 : 2.2; this._set(this.blind ? 'listen' : 'stalk'); }
        break;
      }
      case 'sweep': { // varredura frontal de 180°, bloqueável
        if (this.stateT < 0.5 && !this.blind) this._face(p.pos, 3, dt);
        if (!this.hitDone && this.stateT >= 0.75) {
          this.hitDone = true; this.seen.sweep++;
          g.audio.play('swing', this.pos, { heavy: true });
          const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z;
          const ahead = (dx * Math.sin(this.yaw) + dz * Math.cos(this.yaw)) / (dist || 1);
          if (p.alive && dist < 3.3 && ahead > -0.1 && Math.abs(p.pos.y - this.pos.y) < 1.5) this._hitPlayer(18, true, 5);
        }
        if (this.stateT > 1.4) { this.attackCd = this.phase >= 2 ? 1.4 : 2.0; this._set(this.blind ? 'listen' : 'stalk'); }
        break;
      }
      case 'waveWind': { // agacha, a cinza junta; depois solta a onda em anel
        if (this.stateT > 0.9) {
          this.wave = { r: 1.2, hit: false };
          this.waveMesh.visible = true; this.seen.wave++;
          g.audio.play('roar', this.pos, { pitch: 0.7 }); g.cameraCtl.addShake(0.5);
          this.waveCd = this.phase >= 3 ? 5 : 6.5;
          this._set('recover');
        }
        break;
      }
      case 'stunned': if (this.stateT > this.stunDur) this._set('recover'); break;
      case 'recover': if (this.stateT > 0.8) this._set(this.blind ? 'listen' : 'stalk'); break;
      default: this._set(this.blind ? 'listen' : 'stalk'); break;
    }

    // onda de cinza: anel que cresce; pega quem estiver na faixa (rolar/pular por cima evita)
    if (this.wave) {
      const w = this.wave;
      w.r += MANIF_WAVE.speed * dt;
      this.waveMesh.position.set(w.cx ?? (w.cx = this.pos.x), this.pos.y + 0.08, w.cz ?? (w.cz = this.pos.z));
      this.waveMesh.scale.setScalar(w.r);
      this.waveMesh.material.opacity = 0.85 * (1 - w.r / MANIF_WAVE.maxR);
      const pd = Math.hypot(p.pos.x - w.cx, p.pos.z - w.cz);
      const airborne = p.onGround === false && p.pos.y > this.pos.y + 0.35;
      if (!w.hit && p.alive && Math.abs(pd - w.r) < MANIF_WAVE.band && !airborne && Math.abs(p.pos.y - this.pos.y) < 1.2) {
        const r = this._hitPlayer(MANIF_WAVE.dmg, false, 4);
        if (r !== 'dodged' && r !== 'ignored') w.hit = true;
      }
      if (w.r >= MANIF_WAVE.maxR) { this.wave = null; this.waveMesh.visible = false; }
    }

    if (this.alive && this.state !== 'dormant') {
      if (p.alive) {
        const dx = this.pos.x - p.pos.x, dz = this.pos.z - p.pos.z, dd = Math.hypot(dx, dz), m = this.radius + p.radius;
        if (dd < m && dd > 1e-4 && Math.abs(p.pos.y - this.pos.y) < 1.5) { p.pos.x -= dx / dd * (m - dd); p.pos.z -= dz / dd * (m - dd); }
      }
      g.col.resolveCircle(this.pos, this.radius, this.def.height);
      const gy = g.col.groundAt(this.pos.x, this.pos.z, this.pos.y);
      if (gy > -Infinity) this.pos.y = gy;
    }
    this._updateArcs();
    this._animate(dt);
    this.rig.root.position.copy(this.pos);
    this.rig.root.rotation.y = this.yaw;
  }

  _updateArcs() {
    const show = this.alive && this.state !== 'dormant' && this.state !== 'rise';
    let w = null;
    for (const a of this.arcs) {
      const c = this.coils.find((k) => k.id === a.id);
      a.line.visible = show && c.live;
      if (!a.line.visible) continue;
      w = w || this.weakPoint();
      const arr = a.line.geometry.attributes.position.array, n = arr.length / 3;
      const top = c.top ?? this.pos.y + 3;
      for (let i = 0; i < n; i++) {
        const k = i / (n - 1), j = i === 0 || i === n - 1 ? 0 : 0.35;
        arr[i * 3] = c.x + (w.x - c.x) * k + (Math.random() - 0.5) * j;
        arr[i * 3 + 1] = top + (w.y - top) * k + (Math.random() - 0.5) * j;
        arr[i * 3 + 2] = c.z + (w.z - c.z) * k + (Math.random() - 0.5) * j;
      }
      a.line.geometry.attributes.position.needsUpdate = true;
    }
  }

  _animate(dt) {
    const r = this.rig, t = this.stateT;
    resetPose(r);
    const open = this.exposed ? 1 : 0;
    for (const rb of this.ribs) rb.rotation.y += ((open ? rb.userData.side * 1.2 : 0) - rb.rotation.y) * Math.min(1, dt * 6 || 1);
    const glow = this.state === 'stunned' ? 3.0 : this.phase >= 3 ? 2.0 : 0.9;
    this.coreLight.intensity += (glow - this.coreLight.intensity) * Math.min(1, dt * 5 || 1);
    if (this.coreMat.emissiveIntensity !== undefined) this.coreMat.emissiveIntensity = 0.6 + this.coreLight.intensity * 0.5;
    for (const e of this.eyes) e.visible = !this.blind && this.alive;
    // veias pulsando com o núcleo; rastro de cinza/fumaça enquanto está de pé
    const pulse = 0.55 + Math.sin(this.animT * (this.phase >= 3 ? 7 : 3.2)) * 0.25 + (this.exposed ? 0.25 : 0);
    this.veinMat.opacity = Math.max(0.15, Math.min(1, pulse)) * (this.alive ? 1 : 0.3);
    this.veinMat.color.setHex(this.state === 'stunned' ? 0xffc060 : 0xff6a20);
    if (r.root.visible && this.alive && this.state !== 'dormant' && dt > 0) {
      this._trailT -= dt;
      if (this._trailT <= 0) {
        this._trailT = 0.12;
        const a = Math.random() * Math.PI * 2;
        this.game.combat?.emit?.({ x: this.pos.x + Math.sin(a) * 0.6, y: this.pos.y + 0.3 + Math.random() * 2.6, z: this.pos.z + Math.cos(a) * 0.6 }, 1, Math.random() < 0.3 ? 0xff7a30 : 0x4a4440, 0.5);
      }
    }
    for (const f of this.flakes.children) {
      const u = f.userData; u.a += dt * u.w * (this.phase >= 3 ? 2 : 1);
      f.position.set(Math.sin(u.a) * u.r, u.y + Math.sin(this.animT * 1.3 + u.a) * 0.2, Math.cos(u.a) * u.r);
      f.rotation.set(u.a * 2, u.a, 0);
    }
    switch (this.state) {
      case 'dormant': r.root.scale.setScalar(0.01); return;
      case 'rise': { const k = Math.min(1, t / 2.4); r.root.scale.setScalar(0.2 + 0.8 * k); poseIdle(r, this.animT); r.torso.rotation.x = 0.8 * (1 - k); return; }
      case 'dead': { const k = Math.min(1, t / 2.2); r.root.scale.setScalar(Math.max(0.01, 1 - k)); r.torso.rotation.x = 0.9 * k; this.coreLight.intensity = 2.5 * (1 - k); if (k >= 1) r.root.visible = false; return; }
      default: break;
    }
    r.root.scale.setScalar(1);
    if (this.speed > 0.1) { this.walkPhase += dt * this.speed * 2.2; poseWalk(r, this.walkPhase, 0.8); } else poseIdle(r, this.animT);
    r.torso.rotation.x += 0.15;
    switch (this.state) {
      case 'slam': {
        r.armR.upper.rotation.x = keys([[0, 0], [0.8, -2.8], [1.0, -0.4], [1.9, 0]], t);
        r.armL.upper.rotation.x = keys([[0, 0], [0.8, -2.8], [1.0, -0.4], [1.9, 0]], t);
        r.torso.rotation.x = keys([[0, 0.15], [0.8, -0.25], [1.0, 0.7], [1.9, 0.15]], t);
        break;
      }
      case 'sweep': {
        r.torso.rotation.y = keys([[0, 0], [0.6, 1.0], [0.85, -1.1], [1.4, 0]], t);
        r.armR.upper.rotation.z = -1.4; r.armR.upper.rotation.x = keys([[0, 0], [0.6, -0.6], [0.85, -1.2], [1.4, 0]], t);
        break;
      }
      case 'waveWind': { const k = Math.min(1, t / 0.9); r.hips.position.y = r.baseHipY - 0.35 * k; r.torso.rotation.x = 0.7 * k; r.armR.upper.rotation.z = -1.4 * k; r.armL.upper.rotation.z = 1.4 * k; break; }
      case 'stunned': { r.hips.position.y = r.baseHipY - 0.5; r.torso.rotation.x = 0.55 + Math.sin(this.animT * 7) * 0.04; r.head.rotation.x = -0.4; r.armR.upper.rotation.x = 0.4; r.armL.upper.rotation.x = 0.4; break; }
      case 'listen': r.head.rotation.y = Math.sin(this.animT * 1.4) * 0.7; break;
      default: break;
    }
    if (this.flinch > 0) r.torso.rotation.x -= this.flinch * 0.6;
  }
}
