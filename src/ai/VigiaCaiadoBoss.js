// Chefe final do Capítulo 7 (Sob a Pedra): O VIGIA CAIADO.
// O Vigia morreu de verdade na casa das máquinas da Torre do Relógio (Cap. 4). A Confraria desceu o corpo pela
// Linha Velha ("guia de remoção") e o fechou em cal na parede da Estação Sob a Pedra, pelo mesmo rito dos
// emparedados: "não precisam de olhos, a pedra leva o som até eles". É o retorno do Vigia que o GDD pede, com
// capacidades novas — e coerente com a morte do Cap. 4: o que volta é o corpo, cego, guiado pelo ouvido.
//   • cego: não usa a posição de Elias — só o que OUVE (PerceptionSystem.hear: passos, golpes, tiros, sinetas);
//   • "escuta": parado, girando a cabeça; ao ouvir, caminha até o ponto (rastreio) ou investe se estiver longe;
//   • grito de eco (sonar): depois do grito, por ~1,8 s, qualquer movimento de Elias denuncia a posição exata;
//   • investida às cegas: acerta o que estiver no caminho — pilar de ferro / vagão = atordoado 4,2 s (lampião exposto);
//   • fase 2 (< 65%): o grito acorda os emparedados dos nichos da estação; ouve mais longe;
//   • fase 3 (< 30%): investidas encadeadas e passo mais rápido;
//   • o lampião de luz fria continua nas costas: é o ponto fraco. Golpe enquanto ele persegue uma sineta = bônus.
import * as THREE from 'three';
import { VigiaBoss } from './VigiaBoss.js';
import { resetPose, poseWalk, poseIdle } from '../gameplay/ProceduralRig.js';

export const CAIADO_HP = 600;
export const CAIADO_ECHO = 1.8;      // janela do grito de eco (s)
export const CAIADO_TOUCH = 1.6;     // percebe Elias encostado nele (m)
export const CAIADO_BOUNDS = { minX: 78.8, maxX: 103.4, minZ: 42.8, maxZ: 63.2 };
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

export class VigiaCaiadoBoss extends VigiaBoss {
  constructor(game, o) {
    super(game, { ...o, balcony: { x: o.x, y: o.y, z: o.z } });
    this.id = 'vigia_caiado';
    this.name = 'O Vigia Caiado';
    this.maxHp = o.hp || CAIADO_HP; this.hp = this.maxHp;
    this.second = true; this.retreated = true; this.warnedArmor = false;
    this.def = { height: 2.8, sight: 0, fov: 0, hearing: 1.6 };
    this.bounds = o.bounds || CAIADO_BOUNDS;
    this.out = o.out || { x: o.x - 3, z: o.z };
    this.pos.set(o.x, o.y, o.z); this.home = { x: o.x, y: o.y, z: o.z };
    this.yaw = o.yaw ?? -Math.PI / 2;
    this.target = null; this.targetKind = null; this.lastHeard = null;
    this.shriekCd = 6; this.echoT = 0; this.chain = 0; this.chargeCd = 2;
    this.lanternCd = Infinity;
    this.txt = { stunObst: 'O Vigia se chocou no ferro! O lampião nas costas está exposto!', stunWall: 'O Vigia bateu na pedra!' };
    this.seen = { shriek: 0, echo: 0, charge: 0, stunObst: 0, track: 0, slash: 0, lured: 0, chain: 0 };
    this.vialLight.intensity = 0.15;
    this._pose(0);
  }

  // o mesmo corpo do Vigia, coberto de cal: olhos lacrados, chapéu e casaco brancos de pó
  _build() {
    super._build();
    const M = this.game.materials;
    const lime = (M.lime || M.wall).clone(); lime.color.set(0xcfc9b6);
    const limeDark = lime.clone(); limeDark.color.set(0x9d978a);
    this.limeMat = lime;
    this.rig.root.traverse((o) => {
      if (!o.isMesh || o === this.vial || o.parent === this.vial) return;
      if (o.material && o.material.isMeshBasicMaterial) { o.visible = false; return; } // olhos frios: lacrados
      if (o.material === M.rust) return; // o gancho continua de ferro
      o.material = o.material === M.woodDark ? limeDark : lime;
    });
    const s = this.scale, h = this.rig.head;
    // máscara de cal sobre os olhos + rachaduras
    const seal = new THREE.Mesh(new THREE.BoxGeometry(0.24 * s, 0.09 * s, 0.04 * s), limeDark); seal.position.set(0, 0.19 * s, 0.13 * s); h.add(seal);
    const crack = new THREE.MeshBasicMaterial({ color: 0x1a1612 });
    for (const [x, y, r] of [[-0.06, 0.12, 0.6], [0.05, 0.25, -0.4]]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.012 * s, 0.12 * s, 0.01), crack); c.position.set(x * s, y * s, 0.15 * s); c.rotation.z = r; h.add(c);
    }
    // corda do rito ainda presa à cintura
    const rope = new THREE.Mesh(new THREE.TorusGeometry(0.3 * s, 0.025 * s, 4, 10), M.rope || limeDark); rope.rotation.x = Math.PI / 2; rope.position.y = -0.02 * s; this.rig.hips.add(rope);
  }

  get hearMul() { return this.phase >= 3 ? 1.35 : this.phase === 2 ? 1.15 : 1; }
  get fast() { return this.phase >= 3 ? 1.35 : this.phase === 2 ? 1.18 : 1; }

  /** a parede de cal se rompe: ele sai do nicho (imune) e grita */
  activate() {
    if (this.state !== 'dormant') return;
    this.rig.root.visible = true; this.solid = true;
    this._set('emerge');
    this.game.audio.play('roar', this.pos, { pitch: 0.55 });
    this.game.cameraCtl.addShake(0.8);
  }

  /** corpo do Cap. 7 já resolvido (save) */
  setDeadAt(x, y, z) { super.setDeadAt(x, y, z); this.vialMat.emissiveIntensity = 0.02; }

  _hear(dt) {
    const g = this.game, p = g.player;
    let heard = null;
    const d = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    if (p.alive && d < CAIADO_TOUCH && Math.abs(p.pos.y - this.pos.y) < 1.5) heard = { x: p.pos.x, y: p.pos.y, z: p.pos.z, kind: 'touch' };
    else if (this.echoT > 0 && p.alive && Math.hypot(p.vel.x, p.vel.z) > 0.6) {
      heard = { x: p.pos.x, y: p.pos.y, z: p.pos.z, kind: 'echo' };
      if (!this._echoCaught) { this._echoCaught = true; this.seen.echo++; g.bus.emit('VigiaEcho', this); }
    } else heard = g.perception.hear(this, this.hearMul);
    if (heard) {
      this.target = { x: heard.x, y: heard.y, z: heard.z };
      this.targetKind = heard.kind; this.lastHeard = { ...this.target, kind: heard.kind, t: this.animT };
    }
    return heard;
  }

  _decide() {
    const t = this.target; if (!t) return false;
    const d = Math.hypot(t.x - this.pos.x, t.z - this.pos.z);
    if (d < 2.4) { this._set('slash'); this.seen.slash++; return true; }
    if (d > 5.5 && this.chargeCd <= 0) { this._set('chargeWind'); this.chargeTarget = { ...t }; return true; }
    if (this.state !== 'track') { this._set('track'); this.seen.track++; if (this.targetKind === 'bell') this.seen.lured++; }
    return true;
  }

  update(dt) {
    const g = this.game, p = g.player;
    if (this.state === 'dormant' || this.state === 'dead') { if (this.state === 'dead') { this.stateT += dt; this._pose(dt); } return; }
    this.stateT += dt; this.animT += dt;
    this.flinch = Math.max(0, this.flinch - dt);
    this.chargeCd -= dt; this.shriekCd -= dt; this.echoT = Math.max(0, this.echoT - dt);
    const fast = this.fast;
    this.speed = 0;
    const glow = this.state === 'stunned' ? 2.6 : this.state === 'chargeWind' ? 1.4 : this.state === 'shriek' ? 2 : 0.45;
    this.vialLight.intensity += (glow - this.vialLight.intensity) * Math.min(1, dt * 6);
    this.vialMat.emissiveIntensity = 0.3 + this.vialLight.intensity * 0.5;
    const canHear = !['emerge', 'stunned', 'charge', 'dead'].includes(this.state);
    const heard = canHear ? this._hear(dt) : null;

    switch (this.state) {
      case 'emerge': {
        const o = this.out, dx = o.x - this.pos.x, dz = o.z - this.pos.z, d = Math.hypot(dx, dz);
        this.yaw += Math.max(-4 * dt, Math.min(4 * dt, angDiff(this.yaw, Math.atan2(dx, dz))));
        const sp = 1.4;
        if (d > 0.1) { const k = Math.min(d, sp * dt) / d; this.pos.x += dx * k; this.pos.z += dz * k; this.speed = sp; }
        if (d <= 0.1 || this.stateT > 5) { this._set('shriek'); }
        break;
      }
      case 'listen': {
        if (heard || this.target) { if (this._decide()) break; }
        if (this.shriekCd <= 0 && this.stateT > 1.0) this._set('shriek');
        break;
      }
      case 'track': {
        const t = this.target;
        if (!t) { this._set('listen'); break; }
        const d = Math.hypot(t.x - this.pos.x, t.z - this.pos.z);
        this._face(t, 3 * fast, dt);
        const sp = 2.1 * fast; this.speed = sp;
        const bx = this.pos.x, bz = this.pos.z;
        this.pos.x += Math.sin(this.yaw) * sp * dt; this.pos.z += Math.cos(this.yaw) * sp * dt;
        g.col.resolveCircle(this.pos, this.radius, this.def.height);
        // travou num pilar/vagão: para e escuta de novo
        const moved = Math.hypot(this.pos.x - bx, this.pos.z - bz);
        this.stall = moved < sp * dt * 0.25 ? (this.stall || 0) + dt : 0;
        this.decideT -= dt;
        if (d < 1.0 || this.stall > 0.8 || this.stateT > 7) { this.target = null; this.stall = 0; this._set('listen'); this.shriekCd = Math.min(this.shriekCd, 2.5); break; }
        if (this.decideT <= 0) { this.decideT = 0.3; if (d < 2.4 || (d > 5.5 && this.chargeCd <= 0)) this._decide(); }
        break;
      }
      case 'shriek': {
        if (this.stateT > 0.45 && !this.shrieked) {
          this.shrieked = true; this.seen.shriek++;
          this.echoT = CAIADO_ECHO; this._echoCaught = false;
          this.shriekCd = this.phase >= 3 ? 6.5 : this.phase === 2 ? 8 : 10;
          g.audio.play('shriek', this.pos, { pitch: 0.42 }); g.audio.play('roar', this.pos, { pitch: 0.5 });
          g.cameraCtl.addShake(0.4);
          g.bus.emit('VigiaShriek', this);
        }
        if (this.stateT > 1.3) { this.shrieked = false; this._set('listen'); }
        break;
      }
      case 'slash': {
        const n = this.phase >= 2 ? 3 : 2, per = 1.2 / fast;
        const i = Math.floor(this.stateT / per), lt = (this.stateT % per) / per;
        if (i >= n) { this.target = null; this._set('listen'); break; }
        if (i !== this.slashI) { this.slashI = i; this.hitDone = false; this._swingSnd = false; }
        if (lt < 0.42 && this.target) this._face(this.target, 3.5, dt);
        if (lt > 0.45 && !this._swingSnd) { this._swingSnd = true; g.audio.play('swing', this.pos, { heavy: true }); }
        if (lt > 0.42 && lt < 0.6) { this.pos.x += Math.sin(this.yaw) * 2.0 * dt; this.pos.z += Math.cos(this.yaw) * 2.0 * dt; this._bladeHit(24, 4); }
        break;
      }
      case 'chargeWind': {
        const t = this.chargeTarget || this.target;
        if (t && this.stateT < 0.75) this._face(t, 4.5, dt);
        if (this.stateT > 0.1 && !this.windSnd) { this.windSnd = true; g.audio.play('roar', this.pos, { pitch: 1.1 }); }
        if (this.stateT > 1.0 / fast) { this.windSnd = false; this._set('charge'); this.chargeHit = false; this.seen.charge++; this.chargeFrom = { x: this.pos.x, z: this.pos.z }; }
        break;
      }
      case 'charge': {
        const sp = 10 * fast; this.speed = sp;
        this.pos.x += Math.sin(this.yaw) * sp * dt; this.pos.z += Math.cos(this.yaw) * sp * dt;
        if (!this.chargeHit && p.alive) {
          const cap = p.hurtVolumes()[0];
          if (Math.hypot(cap.x - this.pos.x, cap.z - this.pos.z) < this.radius + cap.r + 0.25 && Math.abs(p.pos.y - this.pos.y) < 1.5) {
            this.chargeHit = true; p.takeHit({ dmg: 30, from: this.pos, blockable: false, knock: 9 });
          }
        }
        const hits = g.col.resolveCircle(this.pos, this.radius, this.def.height);
        // passou do ponto ouvido: freia (na fase 3, emenda outra investida)
        const t = this.chargeTarget, past = t ? Math.hypot(t.x - this.chargeFrom.x, t.z - this.chargeFrom.z) + 2.5 : 8;
        const run = Math.hypot(this.pos.x - this.chargeFrom.x, this.pos.z - this.chargeFrom.z);
        if (hits) {
          const obst = hits.some((b) => b.tag === 'obstacle');
          this._set('stunned'); this.stunDur = obst ? 4.2 : 2.0; this.chain = 0;
          if (obst) this.seen.stunObst++;
          g.audio.play('thud', this.pos); g.audio.play('clang', this.pos);
          g.combat.sparks({ x: this.pos.x + Math.sin(this.yaw) * 0.7, y: this.pos.y + 1.2, z: this.pos.z + Math.cos(this.yaw) * 0.7 }, 24);
          g.cameraCtl.addShake(0.8);
          g.hud.toast(obst ? this.txt.stunObst : this.txt.stunWall);
          this.chargeCd = this.phase >= 2 ? 3 : 4.5;
          g.bus.emit('VigiaStunned', this, obst);
        } else if (run > past || this.stateT > 2.4) {
          this.chargeCd = this.phase >= 2 ? 3.2 : 4.5;
          if (this.phase >= 3 && this.chain < 1) { this.chain++; this.seen.chain++; this.chargeCd = 0; this.target = null; this._set('listen'); this.stateT = 0.6; this.shriekCd = 0; }
          else { this.chain = 0; this.target = null; this._set('recover'); }
        }
        break;
      }
      case 'stunned': if (this.stateT > this.stunDur) this._set('recover'); break;
      case 'recover': if (this.stateT > 0.9 / fast) this._set('listen'); break;
      case 'roar': if (this.stateT > 1.6) { this._set('shriek'); } break;
      case 'stagger': if (this.stateT > 1.3) this._set('listen'); break;
      default: this._set('listen'); break;
    }

    if (this.alive && this.state !== 'charge') {
      if (p.alive) {
        const dx = this.pos.x - p.pos.x, dz = this.pos.z - p.pos.z, dd = Math.hypot(dx, dz), m = this.radius + p.radius;
        if (dd < m && dd > 1e-4) { p.pos.x -= dx / dd * (m - dd); p.pos.z -= dz / dd * (m - dd); }
      }
      g.col.resolveCircle(this.pos, this.radius, this.def.height);
    }
    if (this.state !== 'emerge' && this.alive) {
      const B = this.bounds;
      this.pos.x = Math.min(B.maxX, Math.max(B.minX, this.pos.x));
      this.pos.z = Math.min(B.maxZ, Math.max(B.minZ, this.pos.z));
    }
    const gy = g.col.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.5);
    if (gy > -Infinity) this.pos.y = gy;
    this._pose(dt);
  }

  takeHit({ dmg, poise, heavy, from, point, volume }) {
    if (!this.alive || ['dormant', 'emerge'].includes(this.state)) return 'immune';
    const g = this.game, p = g.player;
    const weak = volume?.part === 'weak';
    const lured = weak && (this.state === 'track' || this.state === 'listen') && this.targetKind === 'bell';
    let real = weak ? dmg * (this.state === 'stunned' ? 1.4 : lured ? 1.6 : 1.0) : dmg * (this.state === 'stunned' ? 0.5 : 0.2);
    this.hp = Math.max(0, this.hp - real);
    this.lastHit = { weak, lured, real: +real.toFixed(1), state: this.state };
    this.flinch = weak ? 0.35 : 0.1;
    if (weak) {
      this.weakHits = (this.weakHits || 0) + 1;
      g.audio.play('hit', this.pos, { heavy: true }); g.audio.play('shriek', this.pos, { pitch: 0.5 });
      if (point) { g.combat.emit(point, 18, 0xbfe6ff, 3.5); g.combat.sparks(point, 12); }
      g.hud.toast(lured ? 'Pelas costas, enquanto ele ouvia a sineta — o lampião estoura em faíscas!' : 'O vidro do lampião trinca — a luz fria vacila!');
    } else {
      g.audio.play('clang', this.pos);
      if (point) g.combat.emit(point, 8, 0xd8d2c0, 2);
      if (!this.warnedArmor) { this.warnedArmor = true; g.hud.toast('A cal endureceu o corpo como pedra… o lampião nas costas é o ponto fraco.'); }
    }
    g.bus.emit('BossDamaged', this);
    // o golpe faz barulho no corpo dele: agora sabe onde Elias está
    if (p.alive) { this.target = { x: p.pos.x, y: p.pos.y, z: p.pos.z }; this.targetKind = 'hit'; }
    if (this.hp <= 0) { this.hp = 0; this._die(); this.vialLight.intensity = 0; return 'dead'; }
    if (this.phase === 1 && this.hp < this.maxHp * 0.65) {
      this.phase = 2; this.def.hearing = 1.8;
      if (this.state !== 'stunned') this._set('roar');
      g.audio.play('roar', this.pos, { pitch: 0.6 });
      g.hud.toast('A cal do rosto racha. O grito dele agora ecoa nos nichos da estação…', 3.5);
    } else if (this.phase === 2 && this.hp < this.maxHp * 0.3) {
      this.phase = 3; this.def.hearing = 2.0;
      if (this.state !== 'stunned') this._set('roar');
      g.audio.play('roar', this.pos, { pitch: 0.45 });
      g.hud.toast('O lampião racha de ponta a ponta. Ele investe uma vez atrás da outra!', 3.5);
    } else if (lured) this._set('stagger');
    return 'hit';
  }

  _animate(dt) {
    const r = this.rig, t = this.stateT;
    switch (this.state) {
      case 'dormant': resetPose(r); r.armR.upper.rotation.x = -0.1; r.armL.upper.rotation.x = -0.1; r.head.rotation.x = 0.1; return;
      case 'listen': {
        resetPose(r); poseIdle(r, this.animT);
        r.head.rotation.y = Math.sin(this.animT * 1.6) * 0.7; r.head.rotation.x = -0.12; r.head.rotation.z = Math.sin(this.animT * 0.8) * 0.18;
        r.armR.upper.rotation.x = -0.5; r.armR.lower.rotation.x = -0.6; r.armL.upper.rotation.x = -0.6;
        if (this.flinch > 0) r.torso.rotation.x -= this.flinch; return;
      }
      case 'track': case 'emerge': {
        resetPose(r); this.walkPhase += (this.speed || 1.4) * dt * 2; poseWalk(r, this.walkPhase, 0.8, 0);
        r.armL.upper.rotation.x = -1.2; r.armL.lower.rotation.x = -0.2; r.armR.upper.rotation.x = -0.5; r.head.rotation.x = -0.1; r.head.rotation.z = 0.2;
        if (this.flinch > 0) r.torso.rotation.x -= this.flinch; return;
      }
      case 'shriek': {
        resetPose(r); const k = Math.min(1, t / 0.4);
        r.head.rotation.x = -0.75 * k; r.torso.rotation.x = -0.25 * k; r.armL.upper.rotation.z = 1.2 * k; r.armR.upper.rotation.z = -1.2 * k; return;
      }
      default: super._animate(dt);
    }
  }
}
