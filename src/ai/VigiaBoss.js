// Chefe do Capítulo 4 (primeiro confronto): O Vigia, guardião da Praça do Relógio. Alto, de sobretudo comprido
// e chapéu de aba larga, com um gancho de sineiro (talho longo) e o lampião de luz fria amarrado às costas —
// o ponto fraco, na mesma altura do frasco do Cirurgião. Herda a máquina de estados do Cirurgião (talho,
// agarrão, investida que atordoa nos obstáculos de pedra da praça) e acrescenta:
//   • "descida": ao toque do sino, ele salta da varanda da Torre para a praça;
//   • "lanterna": ergue o lampião e varre a praça — os cinzentos acordam e se viram para Elias — e emenda
//     uma investida (telegrafada pela luz);
//   • território: o Vigia não sai da praça (para no arco e na barricada);
//   • retirada: abaixo de 45% da vida ele não morre — escala a fachada de volta para a varanda e some na Torre,
//     deixando cair o molho de chaves;
//   • segundo confronto (beginSecond): reacendido na casa das máquinas da Torre, ele desce do alçapão do
//     campanário e luta até o fim — sem retirada, fase 3 abaixo de 35% e o pêndulo do Relógio que o atordoa.
import * as THREE from 'three';
import { SurgeonBoss } from './SurgeonBoss.js';
import { createHumanoid, resetPose, poseWalk } from '../gameplay/ProceduralRig.js';

export const VIGIA_RETREAT = 0.45;
export const VIGIA_BOUNDS = { minX: 0.9, maxX: 29.1, minZ: 51.0, maxZ: 75.4 };
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

export class VigiaBoss extends SurgeonBoss {
  constructor(game, o) {
    super(game, o);
    this.id = 'vigia';
    this.name = 'O Vigia';
    this.maxHp = 560; this.hp = this.maxHp;
    this.radius = 0.6;
    this.def = { height: 2.8, sight: 30, fov: 180, hearing: 2 };
    this.txt = { stunObst: 'O Vigia se chocou na pedra! O lampião nas costas está exposto!', stunWall: 'O Vigia bateu no muro!' };
    this.balcony = o.balcony || { x: o.x, y: o.y + 9, z: o.z + 0.8 };
    this.bounds = o.bounds || VIGIA_BOUNDS;
    this.lanternCd = 7; this.beamN = 0; this.retreated = false;
    // de pé na varanda, olhando a praça, até o sino tocar
    this.pos.set(this.balcony.x, this.balcony.y, this.balcony.z); this.yaw = Math.PI;
    this.vialLight.intensity = 0.6;
    this._pose(0);
  }
  get alive() { return this.state !== 'dead' && this.state !== 'gone'; }

  _build() {
    const M = this.game.materials;
    const s = 1.5;
    this.scale = s;
    const coat = M.coal, hat = M.woodDark;
    this.rig = createHumanoid({ scale: s, hunch: 0.12, torsoW: 0.46, armLen: 0.37, armW: 0.13,
      mats: { skin: M.ash || M.deadSkin, shirt: coat, arms: coat, pants: coat, legs: M.pantsGray, feet: M.leatherDark, head: M.ash || M.deadSkin } });
    const h = this.rig.head;
    // chapéu de aba larga, gola alta e dois pontos de luz fria no lugar dos olhos
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * s, 0.3 * s, 0.02 * s, 10), hat); brim.position.set(0, 0.28 * s, 0.01 * s); h.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * s, 0.14 * s, 0.16 * s, 8), hat); crown.position.set(0, 0.36 * s, 0.01 * s); h.add(crown);
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.34 * s, 0.16 * s, 0.3 * s), coat); collar.position.set(0, 0.02 * s, -0.01 * s); h.add(collar);
    const cold = new THREE.MeshBasicMaterial({ color: 0xbfe6ff });
    for (const x of [-0.05, 0.05]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.03 * s, 0.018 * s, 0.01), cold); e.position.set(x * s, 0.19 * s, 0.135 * s); h.add(e); }
    // aba do sobretudo até as canelas
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.26 * s, 0.36 * s, 0.7 * s, 8, 1, true), coat);
    skirt.position.set(0, -0.32 * s, 0); this.rig.hips.add(skirt);
    // gancho de sineiro (haste longa + gancho de ferro): arma do talho
    const tool = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 1.2), M.woodDark); pole.position.z = 0.5; tool.add(pole);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 4, 8, Math.PI * 1.3), M.rust); hook.position.set(0, 0.06, 1.14); hook.rotation.y = Math.PI / 2; tool.add(hook);
    tool.position.y = -0.05; this.rig.armR.end.add(tool);
    this.bladeTip = new THREE.Object3D(); this.bladeTip.position.set(0, 0, 1.15); tool.add(this.bladeTip);
    this.bladeMid = new THREE.Object3D(); this.bladeMid.position.set(0, 0, 0.62); tool.add(this.bladeMid);
    // lampião de luz fria amarrado às costas = ponto fraco
    const vialMat = M.vial.clone();
    vialMat.color.set(0x9ab8c8); vialMat.emissive.set(0xbfe6ff); vialMat.opacity = 0.9;
    this.vialMat = vialMat;
    this.vial = new THREE.Mesh(new THREE.BoxGeometry(0.22 * s, 0.3 * s, 0.2 * s), vialMat);
    this.vial.position.set(0, 0.36 * s, -0.3 * s);
    this.rig.torso.add(this.vial);
    for (const [w, hh, y] of [[0.26, 0.03, 0.16], [0.26, 0.03, -0.16]]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(w * s, hh * s, 0.22 * s), M.metal); f.position.y = y * s; this.vial.add(f);
    }
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.12 * s, 0.1 * s, 4), M.metal); cap.position.y = 0.22 * s; cap.rotation.y = Math.PI / 4; this.vial.add(cap);
    this.vialLight = new THREE.PointLight(0xbfe6ff, 0.0, 6, 2);
    this.vial.add(this.vialLight);
    this.hand = new THREE.Object3D(); this.hand.position.set(0, -0.05, 0.1); this.rig.armL.end.add(this.hand);
    this.rig.root.position.copy(this.pos); this.rig.root.rotation.y = this.yaw;
    this.game.scene.add(this.rig.root);
    this._animate(0);
  }

  // ao toque do sino: salta da varanda da Torre
  activate() {
    if (this.state !== 'dormant') return;
    this.pos.set(this.balcony.x, this.balcony.y, this.balcony.z - 0.6);
    this.yaw = Math.PI; this.vy = 0;
    this.rig.root.visible = true;
    this._set('drop');
  }

  // segundo confronto: o mesmo Vigia, reacendido, no salão das engrenagens (morte real)
  beginSecond({ balcony, bounds, hp, floorY }) {
    this.second = true; this.dropY = floorY ?? 0; this.retreated = true;
    this.maxHp = hp || 520; this.hp = this.maxHp;
    this.phase = 1; this.chargeCd = 2.5; this.lanternCd = 6; this.beamN = 0; this.weakHits = 0; this.warnedArmor = true;
    this.balcony = balcony; this.bounds = bounds;
    this.txt = { stunObst: 'O Vigia se chocou na engrenagem! O lampião nas costas está exposto!', stunWall: 'O Vigia bateu na parede da casa das máquinas!' };
    this.solid = true;
    this.pos.set(balcony.x, balcony.y, balcony.z); this.yaw = Math.PI;
    this.vialLight.intensity = 0.8;
    this.state = 'dormant'; this.stateT = 0;
    this.rig.root.visible = true;
    this._pose(0);
    this.activate();
  }

  // o pêndulo do Relógio acerta o Vigia: atordoado, lampião exposto
  pendulumHit() {
    if (!this.alive || !['stalk', 'charge', 'chargeWind', 'slash', 'recover', 'beam'].includes(this.state)) return false;
    const g = this.game;
    this._set('stunned'); this.stunDur = 3.6;
    g.audio.play('thud', this.pos); g.audio.play('clang', this.pos);
    g.cameraCtl.addShake(0.6);
    g.hud.toast('O pêndulo acerta o Vigia em cheio! O lampião está exposto!');
    return true;
  }

  // segundo confronto resolvido (save): o corpo fica no salão
  setDeadAt(x, y, z) {
    this.second = true; this.retreated = true;
    this.pos.set(x, y, z); this.rig.root.visible = true;
    this.vialLight.intensity = 0; this.vialMat.emissiveIntensity = 0.05;
    this.setDeadInstant();
  }

  // primeiro confronto já resolvido (save): some da praça
  setGoneInstant() { this.state = 'gone'; this.solid = false; this.retreated = true; this.rig.root.visible = false; this.vialLight.intensity = 0; }

  takeHit({ dmg, poise, heavy, from, point, volume }) {
    if (!this.alive || ['dormant', 'drop', 'intro', 'retreat', 'climb'].includes(this.state)) return 'immune';
    const g = this.game;
    const weak = volume?.part === 'weak';
    let real = weak ? dmg * 1.1 : dmg * 0.25;
    if (this.state === 'stunned' && !weak) real = dmg * 0.5;
    this.hp = this.second ? Math.max(0, this.hp - real) : Math.max(this.maxHp * 0.2, this.hp - real);
    this.flinch = weak ? 0.35 : 0.1;
    if (weak) {
      this.weakHits = (this.weakHits || 0) + 1;
      g.audio.play('hit', this.pos, { heavy: true });
      g.audio.play('shriek', this.pos, { pitch: 0.55 });
      if (point) { g.combat.emit(point, 18, 0xbfe6ff, 3.5); g.combat.sparks(point, 12); }
      g.hud.toast('O vidro do lampião trinca — a luz fria vacila!');
    } else {
      g.audio.play('clang', this.pos);
      if (point) g.combat.blood(point, 3);
      if (!this.warnedArmor) { this.warnedArmor = true; g.hud.toast('O sobretudo do Vigia é duro de cinza e couro… o lampião nas costas é o ponto fraco.'); }
    }
    g.bus.emit('BossDamaged', this);
    if (this.phase === 1 && this.hp < this.maxHp * 0.7) {
      this.phase = 2;
      if (this.state !== 'stunned') this._set('roar');
      g.audio.play('roar', this.pos, { pitch: 0.75 });
      g.hud.toast('O Vigia arranca o chapéu. O lampião arde mais forte — ele vem mais rápido.', 3.5);
    }
    if (this.second && this.phase === 2 && this.hp < this.maxHp * 0.35) {
      this.phase = 3;
      if (this.state !== 'stunned') this._set('roar');
      g.audio.play('roar', this.pos, { pitch: 0.6 });
      g.hud.toast('O lampião racha de ponta a ponta. O Vigia não recua mais — investe sem parar!', 3.5);
    }
    if (this.second) {
      if (this.hp <= 0) { this.hp = 0; this._die(); this.vialLight.intensity = 0; return 'dead'; }
      if (weak && this.state === 'grabHold') { g.player.releaseGrab(false); this._set('stagger'); }
      return 'hit';
    }
    if (weak && this.state === 'grabHold') { g.player.releaseGrab(false); this._set('stagger'); }
    if (this.hp <= this.maxHp * VIGIA_RETREAT) { this._retreat(); return 'hit'; }
    return 'hit';
  }

  _retreat() {
    const g = this.game;
    if (this.retreated) return;
    this.retreated = true;
    if (this.state === 'grabHold') g.player.releaseGrab(false);
    this._set('retreat');
    this.solid = false;
    g.audio.play('roar', this.pos, { pitch: 0.6 });
    g.cameraCtl.addShake(0.5);
    g.hud.toast('O lampião quase apagado, o Vigia recua para a Torre…', 4);
  }

  update(dt) {
    const g = this.game, p = g.player;
    if (this.state === 'dormant' || this.state === 'gone' || this.state === 'dead') return;
    if (this.state === 'drop') {
      this.stateT += dt; this.animT += dt;
      this.vy = (this.vy || 0) - 22 * dt;
      const floorY = this.dropY ?? 0;
      this.pos.y = Math.max(floorY, this.pos.y + this.vy * dt);
      if (this.pos.y <= floorY) {
        this.pos.y = floorY; this._set('intro');
        g.audio.play('thud', this.pos); g.audio.play('roar', this.pos, { pitch: 0.7 });
        g.cameraCtl.addShake(0.9);
        g.combat.emit({ x: this.pos.x, y: floorY + 0.3, z: this.pos.z }, 30, 0x9a9890, 3);
      }
      this._pose(dt);
      return;
    }
    if (this.state === 'retreat' || this.state === 'climb') {
      this.stateT += dt; this.animT += dt;
      this.flinch = Math.max(0, this.flinch - dt);
      this.vialLight.intensity += (0.25 - this.vialLight.intensity) * Math.min(1, dt * 4);
      if (this.state === 'retreat') {
        const tx = this.balcony.x, tz = this.balcony.z - 0.6;
        const dx = tx - this.pos.x, dz = tz - this.pos.z, d = Math.hypot(dx, dz);
        const want = Math.atan2(dx, dz);
        this.yaw += Math.max(-6 * dt, Math.min(6 * dt, angDiff(this.yaw, want)));
        const sp = 3.6;
        if (d > 0.15) { const k = Math.min(d, sp * dt) / d; this.pos.x += dx * k; this.pos.z += dz * k; this.speed = sp; }
        if (d <= 0.15 || this.stateT > 9) { this.pos.x = tx; this.pos.z = tz; this._set('climb'); this.yaw = 0; g.audio.play('clang', this.pos); }
      } else {
        this.yaw = 0;
        this.pos.y = Math.min(this.balcony.y, this.pos.y + 3.4 * dt);
        if (this.pos.y >= this.balcony.y) this.setGoneInstant();
      }
      this._pose(dt);
      return;
    }
    // lanterna: ergue o lampião, acorda a praça e emenda uma investida
    this.lanternCd -= dt;
    if (this.state === 'stalk' && this.lanternCd <= 0 && p.alive) {
      const dist = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
      if (dist > 5.5) { this._set('beam'); this.beamFired = false; }
    }
    if (this.state === 'beam') {
      this.stateT += dt; this.animT += dt;
      this._face(p.pos, 3, dt);
      this.vialLight.intensity += (5 - this.vialLight.intensity) * Math.min(1, dt * 5);
      this.vialMat.emissiveIntensity = 0.4 + this.vialLight.intensity * 0.5;
      if (this.stateT > 1.0 && !this.beamFired) {
        this.beamFired = true; this.beamN++;
        this.lanternCd = this.phase >= 3 ? 6 : this.phase >= 2 ? 8 : 11;
        g.audio.play('shriek', this.pos, { pitch: 0.4 });
        g.bus.emit('VigiaBeam', this);
      }
      if (this.stateT > 1.4) { this._set('chargeWind'); this.stateT = 0.5; if (this.phase >= 3) this.chargeCd = 0; }
      this._pose(dt);
      return;
    }
    super.update(dt);
    // território: não sai da praça
    const B = this.bounds;
    if (this.alive) {
      this.pos.x = Math.min(B.maxX, Math.max(B.minX, this.pos.x));
      this.pos.z = Math.min(B.maxZ, Math.max(B.minZ, this.pos.z));
      this.rig.root.position.copy(this.pos);
    }
  }

  _pose(dt) {
    this._animate(dt);
    this.rig.root.position.copy(this.pos);
    this.rig.root.rotation.y = this.yaw;
  }

  _animate(dt) {
    const r = this.rig, t = this.stateT;
    switch (this.state) {
      case 'dormant': resetPose(r); r.head.rotation.x = 0.35; r.armR.upper.rotation.x = -0.3; r.torso.rotation.x = 0.08; return;
      case 'drop': resetPose(r); r.armR.upper.rotation.z = -1.1; r.armL.upper.rotation.z = 1.1; r.legL.upper.rotation.x = -0.5; r.legR.upper.rotation.x = 0.3; r.torso.rotation.x = 0.2; return;
      case 'retreat': resetPose(r); this.walkPhase += (this.speed || 3) * dt * 2.4; poseWalk(r, this.walkPhase, 1, 1); r.torso.rotation.x = 0.45; return;
      case 'climb': resetPose(r); { const k = Math.sin(this.animT * 7); r.armR.upper.rotation.x = -2.6 + k * 0.4; r.armL.upper.rotation.x = -2.6 - k * 0.4; r.legL.upper.rotation.x = -0.8 * Math.max(0, k); r.legR.upper.rotation.x = -0.8 * Math.max(0, -k); } return;
      case 'beam': resetPose(r); { const k = Math.min(1, t / 0.5); r.armL.upper.rotation.x = -2.0 * k; r.armL.upper.rotation.z = 0.3 * k; r.torso.rotation.x = -0.15 * k; r.head.rotation.x = -0.2 * k; r.armR.upper.rotation.x = -0.4; } return;
      default: super._animate(dt);
    }
  }
}
