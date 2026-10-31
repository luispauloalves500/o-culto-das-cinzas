// Chefe do Capítulo 8 (fase 1): Dr. Silas Vernet, Tesoureiro da Confraria, na Sala dos Transmissores.
// Herda a máquina de estados do Guardião da Garganta (que herda a do Cirurgião): talho com a bengala-bisturi,
// agarrão, investida que o ATORDOA quando bate num obstáculo (as bobinas e a casa do monta-cargas), e as fases:
//   fase 1 — bengala-bisturi (combo) e investida;
//   fase 2 (< 60%) — arremessa AMPOLAS DE CINZA em arco (projéteis reais, bloqueáveis);
//   fase 3 (< 25%) — "a respiração da Cinza": anel cinzento telegrafado ao redor dele.
// Ponto fraco: a ampola de cinza presa às costas por um tubo até a nuca (×1,6). O casaco absorve o resto (×0,25).
// Mecânica aprendida no capítulo: o VAPOR dos acumuladores da torre o queima e o atordoa (steamHit).
import * as THREE from 'three';
import { FurnaceBoss, FURNACE_PHASES } from './FurnaceBoss.js';
import { createHumanoid, part } from '../gameplay/ProceduralRig.js';

export const VERNET_HP = 440;
export const VERNET_STEAM = { dmg: 26, stun: 3.2 };

export class VernetBoss extends FurnaceBoss {
  constructor(game, o) {
    super(game, o);
    this.id = 'vernet';
    this.name = 'Dr. Silas Vernet';
    this.maxHp = VERNET_HP; this.hp = this.maxHp;
    this.radius = 0.6;
    this.def = { height: 2.6, sight: 30, fov: 180, hearing: 2 };
    this.txt = { stunObst: 'Vernet se chocou! A ampola de cinza nas costas está exposta!', stunWall: 'Vernet bateu na parede!' };
    this.steamHits = 0;
  }

  _build() {
    const M = this.game.materials;
    const s = 1.32;
    this.scale = s;
    const coat = M.robe || M.leatherDark;
    this.rig = createHumanoid({ scale: s, hunch: 0.12, torsoW: 0.48, armLen: 0.34, armW: 0.12, legLen: 0.5,
      mats: { skin: M.skin, shirt: coat, arms: coat, pants: M.pantsGray, legs: M.pantsGray, feet: M.leatherDark, head: M.deadSkin || M.skin, hands: M.leatherDark } });
    const h = this.rig.head, T = this.rig.torso;
    // cabelo grisalho penteado para trás (com as têmporas), óculos redondos e o colarinho branco
    const grey = M.ash || M.pantsGray;
    const hair = part(0.245 * s, 0.075 * s, 0.265 * s, grey, 0.29 * s, 0, -0.01 * s, 0.45); h.add(hair);
    for (const sx of [-1, 1]) h.add(part(0.03 * s, 0.1 * s, 0.12 * s, grey, 0.2 * s, sx * 0.112 * s, -0.04 * s, 0.4));
    // bigode encerado e sobrancelhas cerradas
    const stache = new THREE.Group(); stache.name = 'bigode';
    for (const sx of [-1, 1]) { const m = part(0.06 * s, 0.016 * s, 0.022 * s, grey, 0, sx * 0.032 * s, 0, 0.45); m.rotation.z = sx * 0.28; stache.add(m); }
    stache.position.set(0, 0.105 * s, 0.125 * s); h.add(stache);
    for (const sx of [-1, 1]) { const b = part(0.06 * s, 0.016 * s, 0.02 * s, grey, 0.205 * s, sx * 0.05 * s, 0.12 * s, 0.4); b.rotation.z = sx * 0.22; h.add(b); }
    // colete escuro, lapelas do sobretudo, botões, gravata e a corrente do relógio de bolso
    const vest = part(0.3 * s, 0.4 * s, 0.03 * s, M.velvet || M.leatherDark, 0.33 * s, 0, 0.12 * s, 0.3); T.add(vest);
    for (const sx of [-1, 1]) { const lap = part(0.09 * s, 0.3 * s, 0.025 * s, coat, 0.43 * s, sx * 0.12 * s, 0.135 * s, 0.35); lap.rotation.z = sx * 0.3; T.add(lap); }
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.012 * s, 6, 4), M.brass || M.metal); b.position.set(0, (0.46 - i * 0.08) * s, 0.14 * s); T.add(b); }
    const tie = part(0.05 * s, 0.12 * s, 0.02 * s, M.velvet || M.leatherDark, 0.5 * s, 0, 0.135 * s, 0.4); T.add(tie);
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.07 * s, 0.005 * s, 4, 16, Math.PI), M.gold || M.brass); chain.position.set(-0.03 * s, 0.26 * s, 0.14 * s); chain.rotation.z = Math.PI; T.add(chain);
    const watch = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * s, 0.025 * s, 0.01 * s, 12), M.gold || M.brass); watch.rotation.x = Math.PI / 2; watch.position.set(-0.1 * s, 0.24 * s, 0.14 * s); T.add(watch);
    this.details = { stache, vest, chain, watch, gloves: !!this.rig.parts.hands.length };
    for (const x of [-0.05, 0.05]) {
      const lens = new THREE.Mesh(new THREE.TorusGeometry(0.03 * s, 0.006 * s, 4, 10), M.brass || M.metal); lens.position.set(x * s, 0.17 * s, 0.125 * s); h.add(lens);
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.025 * s, 0.015 * s, 0.01), M.eyeGlow); eye.position.set(x * s, 0.17 * s, 0.122 * s); h.add(eye);
    }
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.2 * s, 0.06 * s, 0.06 * s), M.linen || M.paper); collar.position.set(0, 0.56 * s, 0.1 * s); this.rig.torso.add(collar);
    // casaco longo (abas até os joelhos)
    // abas abertas na frente e o rabo do casaco atrás; balançam com o passo (_animate de FurnaceBoss mexe nos quadris)
    const tail = part(0.5 * s, 0.55 * s, 0.05 * s, coat, -0.32 * s, 0, -0.12 * s, 0.2); this.rig.hips.add(tail);
    for (const sx of [-1, 1]) { const f = part(0.16 * s, 0.5 * s, 0.04 * s, coat, -0.3 * s, sx * 0.17 * s, 0.11 * s, 0.25); f.rotation.z = sx * 0.06; this.rig.hips.add(f); }
    this.coatTail = tail;
    // bengala-bisturi: haste de ébano com lâmina cirúrgica na ponta
    const cane = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 1.0, 8), M.woodDark); shaft.rotation.x = Math.PI / 2; shaft.position.z = 0.4; cane.add(shaft);
    const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.06, 8), M.brass || M.metal); ferrule.rotation.x = Math.PI / 2; ferrule.position.z = 0.88; cane.add(ferrule);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), M.brass || M.metal); knob.position.z = -0.1; cane.add(knob);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.09, 0.42), M.axeEdge || M.steel); blade.position.set(0, 0, 1.08); cane.add(blade);
    cane.position.y = -0.05; this.rig.armR.end.add(cane);
    this.bladeTip = new THREE.Object3D(); this.bladeTip.position.set(0, 0, 1.25); cane.add(this.bladeTip);
    this.bladeMid = new THREE.Object3D(); this.bladeMid.position.set(0, 0, 0.8); cane.add(this.bladeMid);
    // AMPOLA DE CINZA nas costas = ponto fraco (vidro com cinza em brasa, tubo de borracha até a nuca)
    const vialMat = M.vial.clone();
    vialMat.color.set(0x8a847a); vialMat.emissive.set(0xff8a3a); vialMat.opacity = 0.9;
    this.vialMat = vialMat;
    this.vial = new THREE.Mesh(new THREE.CylinderGeometry(0.11 * s, 0.11 * s, 0.38 * s, 10), vialMat);
    this.vial.position.set(0, 0.34 * s, -0.27 * s);
    this.rig.torso.add(this.vial);
    for (const y of [-0.2, 0.2]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.12 * s, 0.04 * s, 10), M.brass || M.metal); cap.position.y = y * s; this.vial.add(cap); }
    const tube = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.32 * s), M.leatherDark); tube.position.set(0, 0.62 * s, -0.16 * s); tube.rotation.x = 0.7; this.rig.torso.add(tube);
    this.vialLight = new THREE.PointLight(0xff8a3a, 0.0, 4, 2); this.vialLight.userData.noShadow = true;
    this.vial.add(this.vialLight);
    this.hand = new THREE.Object3D(); this.hand.position.set(0, -0.05, 0.1); this.rig.armL.end.add(this.hand);
    // anel de cinza (fase 3), telegrafado no chão
    const ringMat = (M.ash || M.fire).clone(); ringMat.transparent = true; ringMat.opacity = 0; ringMat.side = THREE.DoubleSide;
    if (ringMat.emissive) { ringMat.emissive.set(0x5a3018); ringMat.emissiveIntensity = 0.8; }
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 3.4, 20, 1), ringMat);
    this.ring.rotation.x = -Math.PI / 2; this.ring.visible = false;
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
      g.audio.play('shriek', this.pos, { pitch: 0.8 });
      if (point) { g.combat.emit(point, 18, 0xb0a898, 3.5); g.combat.sparks(point, 10); }
      g.hud.toast('A ampola trinca — a cinza vaza pelas costas dele!');
    } else {
      g.audio.play('clang', this.pos);
      if (point) g.combat.blood(point, 4);
      if (!this.warnedArmor) { this.warnedArmor = true; g.hud.toast('O casaco é forrado de malha… a ampola de cinza nas costas é o ponto fraco.'); }
    }
    g.bus.emit('BossDamaged', this);
    if (this.hp <= 0) { this.hp = 0; this._die(); return 'dead'; }
    this._checkPhase();
    if (weak && this.state === 'grabHold') { g.player.releaseGrab(false); this._set('stagger'); }
    return 'hit';
  }
  _checkPhase() {
    if (this.phase === 1 && this.hp < this.maxHp * FURNACE_PHASES.p2) this._enterPhase(2);
    else if (this.phase === 2 && this.hp < this.maxHp * FURNACE_PHASES.p3) this._enterPhase(3);
  }

  _enterPhase(n) {
    const g = this.game;
    this.phase = n;
    if (this.state !== 'stunned') this._set('roar');
    g.audio.play('roar', this.pos, { pitch: n === 3 ? 0.8 : 1.0 });
    g.cameraCtl.addShake(0.5);
    this.throwCd = 1.2; this.ventCd = n === 3 ? 1.5 : this.ventCd;
    g.hud.toast(n === 2 ? 'Vernet arranca ampolas do cinto — e começa a atirá-las!' : 'Vernet respira a própria cinza. Afaste-se quando o chão escurecer em volta dele!', 4);
    g.bus.emit('BossPhase', { boss: this, phase: n });
  }

  /** o jato de vapor dos acumuladores da torre: queima e atordoa (a malha do casaco não segura vapor) */
  steamHit() {
    if (!this.alive || this.state === 'dormant' || this.state === 'intro') return false;
    const g = this.game;
    if (this.state === 'grabHold') g.player.releaseGrab(false);
    this.hp -= VERNET_STEAM.dmg; this.steamHits++;
    g.audio.play('shriek', this.pos, { pitch: 0.7 });
    g.bus.emit('BossDamaged', this);
    if (this.hp <= 0) { this.hp = 0; this._die(); return true; }
    this._set('stunned'); this.stunDur = VERNET_STEAM.stun;
    this._checkPhase();
    if (this.state !== 'stunned') { this._set('stunned'); this.stunDur = VERNET_STEAM.stun; }
    g.hud.toast('O vapor escalda Vernet — ele cai de joelhos, a ampola exposta!', 3);
    return true;
  }

  _throwCoal(spread) {
    super._throwCoal(spread);
    const pr = this.projectiles.at(-1); if (!pr) return;
    // a "brasa" vira uma ampola de vidro com cinza
    pr.mesh.geometry.dispose();
    pr.mesh.geometry = new THREE.CylinderGeometry(0.07, 0.07, 0.24, 8);
    pr.mesh.material = this.vialMat;
  }
}
