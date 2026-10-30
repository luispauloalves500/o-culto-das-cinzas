// Combate: testes de hitbox (esfera da arma varrida × cápsulas/esferas de dano), partículas e depuração.
import * as THREE from 'three';

/** distância de um ponto a um segmento vertical (cápsula) */
export function sphereVsCapsule(p, r, c) {
  const y = Math.max(c.y0, Math.min(c.y1, p.y));
  const d = Math.hypot(p.x - c.x, p.y - y, p.z - c.z);
  return d <= r + c.r;
}
export function sphereVsSphere(p, r, s) {
  return Math.hypot(p.x - s.x, p.y - s.y, p.z - s.z) <= r + s.r;
}
export function testVolume(p, r, v) {
  return v.type === 'sphere' ? sphereVsSphere(p, r, v) : sphereVsCapsule(p, r, v);
}

export class CombatSystem {
  constructor(game) {
    this.game = game;
    this.debug = false;
    this.debugGroup = new THREE.Group();
    game.scene.add(this.debugGroup);
    this._dbgPool = [];
    this._dbgUsed = 0;
    // partículas (sangue / faíscas) com pool fixo
    this.maxP = 160;
    const geo = new THREE.BufferGeometry();
    this.pPos = new Float32Array(this.maxP * 3);
    this.pCol = new Float32Array(this.maxP * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, depthWrite: false }));
    this.points.frustumCulled = false;
    game.scene.add(this.points);
    this.parts = Array.from({ length: this.maxP }, () => ({ life: 0, vx: 0, vy: 0, vz: 0 }));
    this.pi = 0;
    for (let i = 0; i < this.maxP; i++) this.pPos[i * 3 + 1] = -999;
  }

  /**
   * Varre a esfera da arma de prev→cur e retorna o primeiro volume atingido de cada alvo.
   * targets: objetos com alive, hurtVolumes(); alreadyHit: Set
   */
  sweep(prev, cur, radius, targets, alreadyHit) {
    const res = [];
    const steps = 4;
    for (const t of targets) {
      if (!t.alive || alreadyHit.has(t)) continue;
      const vols = t.hurtVolumes();
      let found = null;
      // percorre toda a varredura: se a lâmina passar pelo ponto fraco, ele tem prioridade sobre o corpo
      for (let i = 0; i <= steps; i++) {
        const k = i / steps;
        const p = { x: prev.x + (cur.x - prev.x) * k, y: prev.y + (cur.y - prev.y) * k, z: prev.z + (cur.z - prev.z) * k };
        let hitHere = null;
        for (const v of vols) { if (testVolume(p, radius, v)) { hitHere = { target: t, volume: v, point: p }; break; } }
        if (this.debug) this.debugSphere(p, radius, hitHere ? 0xff2020 : 0xffff40);
        if (hitHere && (!found || (hitHere.volume.part === 'weak' && found.volume.part !== 'weak'))) found = hitHere;
      }
      if (found) res.push(found);
    }
    return res;
  }

  emit(pos, n, color, speed = 3) {
    for (let i = 0; i < n; i++) {
      const p = this.parts[this.pi];
      const k = this.pi * 3;
      this.pPos[k] = pos.x; this.pPos[k + 1] = pos.y; this.pPos[k + 2] = pos.z;
      const c = new THREE.Color(color);
      this.pCol[k] = c.r; this.pCol[k + 1] = c.g; this.pCol[k + 2] = c.b;
      p.vx = (Math.random() - 0.5) * speed; p.vy = Math.random() * speed * 0.8; p.vz = (Math.random() - 0.5) * speed;
      p.life = 0.5 + Math.random() * 0.5;
      this.pi = (this.pi + 1) % this.maxP;
    }
  }
  blood(pos, n = 14) { this.emit(pos, n, 0x6a0804, 3.2); }
  sparks(pos, n = 12) { this.emit(pos, n, 0xffc060, 5); }

  debugSphere(p, r, color) {
    let m = this._dbgPool[this._dbgUsed];
    if (!m) {
      m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color, wireframe: true }));
      this._dbgPool.push(m); this.debugGroup.add(m);
    }
    m.material.color.setHex(color);
    m.position.set(p.x, p.y, p.z); m.scale.setScalar(r); m.visible = true;
    this._dbgUsed++;
  }
  debugVolumes(targets) {
    if (!this.debug) return;
    for (const t of targets) {
      if (!t.alive) continue;
      for (const v of t.hurtVolumes()) {
        if (v.type === 'sphere') this.debugSphere(v, v.r, 0x40ff40);
        else for (let y = v.y0; y <= v.y1 + 0.01; y += (v.y1 - v.y0) / 3) this.debugSphere({ x: v.x, y, z: v.z }, v.r, 0x40a0ff);
      }
    }
  }

  update(dt) {
    for (let i = 0; i < this._dbgPool.length; i++) this._dbgPool[i].visible = i < this._dbgUsed && this.debug ? this._dbgPool[i].visible : false;
    this._dbgUsed = 0;
    for (let i = 0; i < this.maxP; i++) {
      const p = this.parts[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      const k = i * 3;
      p.vy -= 9.8 * dt;
      this.pPos[k] += p.vx * dt; this.pPos[k + 1] += p.vy * dt; this.pPos[k + 2] += p.vz * dt;
      if (p.life <= 0) this.pPos[k + 1] = -999;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}
