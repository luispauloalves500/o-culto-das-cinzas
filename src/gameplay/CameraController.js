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
  }
  addShake(v) { if (this.settings.get('shake')) this.shake = Math.min(1, this.shake + v); }
  forward() { return { x: Math.sin(this.yaw), z: Math.cos(this.yaw) }; }

  update(dt, input, target, combat = false) {
    const look = input.consumeLook();
    const sens = 0.0022 * this.settings.get('sensitivity');
    const inv = this.settings.get('invertY') ? -1 : 1;
    this.yaw -= look.dx * sens + look.px * 2.6 * dt;
    this.pitch += (look.dy * sens + look.py * 1.8 * dt) * inv;
    this.pitch = Math.max(-0.42, Math.min(0.95, this.pitch));

    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const f = new THREE.Vector3(Math.sin(this.yaw) * cp, -sp, Math.cos(this.yaw) * cp);
    const right = new THREE.Vector3(-Math.cos(this.yaw), 0, Math.sin(this.yaw));
    const pivot = new THREE.Vector3(target.x, target.y + this.height, target.z);
    // ombro: testa a lateral também (corredores estreitos)
    let sh = this.shoulder;
    const tSide = this.col.raycast(pivot, right, sh + 0.25, this.filter);
    if (tSide < sh + 0.25) sh = Math.max(0, tSide - 0.25);
    const shoulderPt = pivot.clone().addScaledVector(right, sh);
    const wantDist = combat ? this.dist * 0.85 : this.dist;
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
    this.camera.position.copy(pos);
    this._look.copy(shoulderPt).addScaledVector(f, 6);
    this.camera.lookAt(this._look);
  }
}
