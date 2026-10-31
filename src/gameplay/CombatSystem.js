// Combate: testes de hitbox (esfera da arma varrida × cápsulas/esferas de dano), partículas e depuração.
import * as THREE from 'three';
import { dotTexture } from '../render/Graphics.js';

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

/** raio (origem o, direção unitária d) × esfera: distância da entrada ou Infinity */
export function rayVsSphere(o, d, s) {
  const ox = o.x - s.x, oy = o.y - s.y, oz = o.z - s.z;
  const b = ox * d.x + oy * d.y + oz * d.z, c = ox * ox + oy * oy + oz * oz - s.r * s.r;
  const disc = b * b - c;
  if (disc < 0) return Infinity;
  const sq = Math.sqrt(disc), t0 = -b - sq, t1 = -b + sq;
  if (t1 < 0) return Infinity;
  return t0 >= 0 ? t0 : 0;
}
/** raio × cápsula vertical (cilindro y0..y1 + calotas esféricas) */
export function rayVsCapsule(o, d, c) {
  let best = Infinity;
  const ox = o.x - c.x, oz = o.z - c.z;
  const A = d.x * d.x + d.z * d.z, B = ox * d.x + oz * d.z, C = ox * ox + oz * oz - c.r * c.r;
  if (A > 1e-9) {
    const disc = B * B - A * C;
    if (disc >= 0) {
      const sq = Math.sqrt(disc);
      for (const t of [(-B - sq) / A, (-B + sq) / A]) {
        if (t < 0) continue;
        const y = o.y + d.y * t;
        if (y >= c.y0 && y <= c.y1) { best = Math.min(best, t); break; }
      }
    }
    if (C <= 0 && o.y >= c.y0 && o.y <= c.y1) return 0;
  }
  best = Math.min(best, rayVsSphere(o, d, { x: c.x, y: c.y0, z: c.z, r: c.r }), rayVsSphere(o, d, { x: c.x, y: c.y1, z: c.z, r: c.r }));
  return best;
}
export function rayVsVolume(o, d, v) {
  return v.type === 'sphere' ? rayVsSphere(o, d, v) : rayVsCapsule(o, d, v);
}

export class CombatSystem {
  constructor(game) {
    this.game = game;
    this.debug = false;
    this.debugGroup = new THREE.Group();
    game.scene.add(this.debugGroup);
    this._dbgPool = [];
    this._dbgUsed = 0;
    // partículas (sangue / faíscas / cinza) com pool fixo; tamanho do pool e quantidade por emissão seguem a
    // opção gráfica "Partículas" (src/render/Graphics.js → setQuality)
    this.mult = 1; this.pools = true;
    this._buildPool(200);
    const q = game.gfx?.current?.part; if (q) this.setQuality(q);
  }

  _buildPool(n) {
    if (this.points) { this.points.parent?.remove(this.points); this.points.geometry.dispose(); this.points.material.dispose(); }
    this.maxP = n;
    const geo = new THREE.BufferGeometry();
    this.pPos = new Float32Array(this.maxP * 3);
    this.pCol = new Float32Array(this.maxP * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    const map = dotTexture();
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ size: map ? 0.1 : 0.07, map, alphaTest: map ? 0.05 : 0, vertexColors: true, transparent: true, depthWrite: false }));
    this.points.frustumCulled = false; this.points.name = 'combatParticles';
    this.game.scene.add(this.points);
    this.parts = Array.from({ length: this.maxP }, () => ({ life: 0, vx: 0, vy: 0, vz: 0 }));
    this.pi = 0; this._acc = 0;
    for (let i = 0; i < this.maxP; i++) this.pPos[i * 3 + 1] = -999;
  }
  /** qualidade de partículas: { mult, pool, pools } */
  setQuality(q) {
    this.mult = q.mult ?? 1; this.pools = q.pools !== false;
    if (q.pool && q.pool !== this.maxP) this._buildPool(q.pool);
  }
  /** quantas partículas uma emissão de n gera nesta qualidade (fração acumulada: nada se perde em média) */
  scaled(n) {
    if (n <= 0) return 0;
    const v = n * this.mult + this._acc; const k = Math.floor(v); this._acc = v - k;
    return Math.max(1, k);
  }
  /** poça de sangue sob um corpo: disco escuro que cresce e some junto com o corpo (despawn) */
  bloodPool(pos) {
    if (!this.pools || !this.game.scene) return null;
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.6, 20), new THREE.MeshStandardMaterial({ color: 0x2a0303, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.82, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.rotation.x = -Math.PI / 2; m.position.set(pos.x + (Math.random() - 0.5) * 0.3, pos.y + 0.015, pos.z + (Math.random() - 0.5) * 0.3);
    m.userData = { t: 0, r: 0.8 + Math.random() * 0.5, castOrig: false }; m.scale.setScalar(0.25); m.name = 'bloodPool';
    this.game.scene.add(m);
    return m;
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

  /**
   * Tiro de mira manual: primeiro volume que o raio cruza (o ponto fraco ganha se estiver quase na mesma distância).
   * Retorna { target, volume, point, dist } ou null.
   */
  rayHit(o, d, range, targets) {
    let best = null;
    for (const t of targets) {
      if (!t.alive || !t.hurtVolumes) continue;
      for (const v of t.hurtVolumes()) {
        const tt = rayVsVolume(o, d, v);
        if (tt > range) continue;
        const better = !best || tt < best.dist - (v.part === 'weak' ? 0.25 : 0) || (best.target === t && v.part === 'weak' && tt < best.dist + 0.25);
        if (better) best = { target: t, volume: v, dist: tt, point: { x: o.x + d.x * tt, y: o.y + d.y * tt, z: o.z + d.z * tt } };
      }
    }
    return best;
  }

  emit(pos, n, color, speed = 3) {
    n = this.scaled(n);
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
  splash(pos, n = 18) { this.emit({ x: pos.x, y: (pos.y ?? 0) + 0.2, z: pos.z }, n, 0x7a908a, 3.6); }

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
