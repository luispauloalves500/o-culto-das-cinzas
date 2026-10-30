// Câmera em terceira pessoa sobre o ombro com prevenção de oclusão (raycasts contra os colisores).
import * as THREE from 'three';

export class CameraController {
  constructor(camera, col, settings) {
    this.camera = camera; this.col = col; this.settings = settings;
    this.yaw = 0; this.pitch = 0.18;
    this.dist = 2.9; this.shoulder = 0.5; this.height = 1.55;
    this.curDist = 2.9;
    this.shake = 0;
    this._look = new THREE.Vector3();
    this.filter = (b) => b.tag !== 'prop-low';
    // mira manual (revólver): câmera mais perto e mais no ombro, zoom suave
    this.aiming = false; this.aimK = 0;
    this.lastShoulder = new THREE.Vector3(); this.lastF = new THREE.Vector3(0, 0, 1);
  }
  /** direção da câmera (com inclinação) */
  dir3() {
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    return new THREE.Vector3(Math.sin(this.yaw) * cp, -sp, Math.cos(this.yaw) * cp);
  }
  /** ponto de ombro para um alvo/jogador (sem teste de parede lateral) */
  shoulderFor(target) {
    const k = this.aimK, right = new THREE.Vector3(-Math.cos(this.yaw), 0, Math.sin(this.yaw));
    const sh = Math.min(this.shoulder + 0.12 * k, this.lastSh ?? Infinity); // respeita a parede lateral do último quadro
    return new THREE.Vector3(target.x, target.y + this.height - 0.05 * k, target.z).addScaledVector(right, sh);
  }
  /** raio da retícula (centro da tela): sai do ombro na direção da câmera */
  aimRay(target) {
    const o = target ? this.shoulderFor(target) : this.lastShoulder.clone();
    return { o, d: this.dir3() };
  }
  /** aponta a retícula para um ponto do mundo (usado pela automação e pelo tutorial) */
  aimAt(p, from) {
    for (let i = 0; i < 6; i++) {
      const o = this.shoulderFor(from);
      const dx = p.x - o.x, dy = p.y - o.y, dz = p.z - o.z;
      this.yaw = Math.atan2(dx, dz);
      this.pitch = Math.atan2(-dy, Math.hypot(dx, dz));
    }
  }
  addShake(v) { if (this.settings.get('shake')) this.shake = Math.min(1, this.shake + v); }
  forward() { return { x: Math.sin(this.yaw), z: Math.cos(this.yaw) }; }

  update(dt, input, target, combat = false) {
    const look = input.consumeLook();
    const sens = 0.0022 * this.settings.get('sensitivity');
    const inv = this.settings.get('invertY') ? -1 : 1;
    this.yaw -= look.dx * sens + look.px * 2.6 * dt;
    this.pitch += (look.dy * sens + look.py * 1.8 * dt) * inv;
    this.aimK += ((this.aiming ? 1 : 0) - this.aimK) * Math.min(1, dt * 10);
    this.pitch = Math.max(this.aiming ? -0.6 : -0.42, Math.min(this.aiming ? 0.7 : 0.95, this.pitch));

    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const f = new THREE.Vector3(Math.sin(this.yaw) * cp, -sp, Math.cos(this.yaw) * cp);
    const right = new THREE.Vector3(-Math.cos(this.yaw), 0, Math.sin(this.yaw));
    const ak = this.aimK;
    const pivot = new THREE.Vector3(target.x, target.y + this.height - 0.05 * ak, target.z);
    // ombro: testa a lateral também (corredores estreitos)
    let sh = this.shoulder + 0.12 * ak;
    const tSide = this.col.raycast(pivot, right, sh + 0.25, this.filter);
    if (tSide < sh + 0.25) sh = Math.max(0, tSide - 0.25);
    const shoulderPt = pivot.clone().addScaledVector(right, sh);
    this.lastSh = sh;
    const wantDist = (combat ? this.dist * 0.85 : this.dist) * (1 - 0.55 * ak);
    const back = f.clone().negate();
    const t = this.col.raycast(shoulderPt, back, wantDist + 0.3, this.filter);
    const allowed = Math.max(0.35, Math.min(wantDist, t - 0.3));
    // aproxima rápido (evitar atravessar) e afasta suave
    this.curDist = allowed < this.curDist ? allowed : this.curDist + (allowed - this.curDist) * Math.min(1, dt * 4);
    const pos = shoulderPt.clone().addScaledVector(back, this.curDist);
    if (this.shake > 0) {
      const a = this.shake * 0.08;
      pos.x += (Math.random() - 0.5) * a; pos.y += (Math.random() - 0.5) * a; pos.z += (Math.random() - 0.5) * a;
      this.shake = Math.max(0, this.shake - dt * 2.5);
    }
    this.lastShoulder.copy(shoulderPt); this.lastF.copy(f);
    const fov = this.settings.get('fov') * (1 - 0.18 * ak);
    if (Math.abs(this.camera.fov - fov) > 0.05) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
    this.camera.position.copy(pos);
    this._look.copy(shoulderPt).addScaledVector(f, 6);
    this.camera.lookAt(this._look);
  }
}
