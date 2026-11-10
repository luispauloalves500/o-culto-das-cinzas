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

/** superfície do colisor para FX de impacto (metal / madeira / pedra) */
export function surfaceOf(box) {
  return box?.ref?.material?.userData?.surface || box?.ref?.userData?.surface || 'stone';
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
    this._col = new THREE.Color();
    this._v = new THREE.Vector3();
    this._q = new THREE.Quaternion();
    this._fwd = new THREE.Vector3();
    this._buildPool(200);
    this._fx = { decals: 16, casings: 8, sprays: 8 };
    this._buildFx();
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
    this._live = false; this.points.visible = false;
    this.parts = Array.from({ length: this.maxP }, () => ({ life: 0, vx: 0, vy: 0, vz: 0 }));
    this.pi = 0; this._acc = 0;
    for (let i = 0; i < this.maxP; i++) this.pPos[i * 3 + 1] = -999;
  }
  /** qualidade de partículas: { mult, pool, pools } */
  setQuality(q) {
    this.mult = q.mult ?? 1; this.pools = q.pools !== false;
    if (q.pool && q.pool !== this.maxP) this._buildPool(q.pool);
    const fx = { decals: q.decals ?? (this.pools ? 16 : 0), casings: q.casings ?? (this.pools ? 8 : 0), sprays: q.sprays ?? (this.pools ? 8 : 0) };
    if (fx.decals !== this._fx.decals || fx.casings !== this._fx.casings || fx.sprays !== this._fx.sprays || !this._decalPool) {
      this._fx = fx; this._buildFx();
    }
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
    // geometria do disco compartilhada por todas as poças (pt48u: 1 buffer na GPU em vez de 1 por corpo);
    // o material continua próprio de cada poça porque cada uma esmaece no seu tempo
    if (!CombatSystem._poolGeo) { CombatSystem._poolGeo = new THREE.CircleGeometry(0.6, 20); CombatSystem._poolGeo.userData.shared = true; }
    const m = new THREE.Mesh(CombatSystem._poolGeo, new THREE.MeshStandardMaterial({ color: 0x2a0303, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.82, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
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
      const c = this._col.set(color);
      this.pCol[k] = c.r; this.pCol[k + 1] = c.g; this.pCol[k + 2] = c.b;
      p.vx = (Math.random() - 0.5) * speed; p.vy = Math.random() * speed * 0.8; p.vz = (Math.random() - 0.5) * speed;
      p.life = 0.5 + Math.random() * 0.5;
      this.pi = (this.pi + 1) % this.maxP;
    }
    if (n > 0) { this._colDirty = true; this._live = true; this.points.visible = true; }
  }
  blood(pos, n = 14, dir = null) {
    this.emit(pos, n, 0x6a0804, 3.2);
    this._bloodSpray(pos, dir, Math.max(1, this.scaled(Math.ceil(n / 4))));
  }
  sparks(pos, n = 12) { this.emit(pos, n, 0xffc060, 5); }
  splash(pos, n = 18) { this.emit({ x: pos.x, y: (pos.y ?? 0) + 0.2, z: pos.z }, n, 0x7a908a, 3.6); }
  /** impacto de bala conforme a superfície: faíscas (metal), lascas (madeira), poeira (pedra) */
  impact(pos, surface = 'stone', n) {
    if (surface === 'metal') this.emit(pos, n ?? 14, 0xffc060, 6.2);
    else if (surface === 'wood') this.emit(pos, n ?? 10, 0x6a4a30, 3.4);
    else this.emit(pos, n ?? 12, 0xb0aa98, 2.6);
  }

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
    // pt48u: sem faísca/sangue no ar → nada a simular nem a reenviar para a GPU (e o Points nem é desenhado)
    if (!this._live) return;
    let alive = 0;
    for (let i = 0; i < this.maxP; i++) {
      const p = this.parts[i];
      if (p.life <= 0) continue;
      p.life -= dt; if (p.life > 0) alive++;
      const k = i * 3;
      p.vy -= 9.8 * dt;
      this.pPos[k] += p.vx * dt; this.pPos[k + 1] += p.vy * dt; this.pPos[k + 2] += p.vz * dt;
      if (p.life <= 0) this.pPos[k + 1] = -999;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    if (this._colDirty) { this.points.geometry.attributes.color.needsUpdate = true; this._colDirty = false; }
    if (!alive) { this._live = false; this.points.visible = false; }
    this._updateFx(dt);
  }

  // ---------- pt61u: decals, cápsulas, respingos e muzzle flash (pools fixos) ----------
  _buildFx() {
    const sc = this.game.scene;
    const drop = (list) => {
      if (!list) return;
      for (const o of list) { o.mesh?.parent?.remove(o.mesh); (o.parent && o.parent.remove?.(o)); }
    };
    drop(this._decalPool); drop(this._casingPool); drop(this._sprayPool);
    if (this._flash) { this._flash.parent?.remove(this._flash); this._flash = null; }
    this._decalPool = []; this._casingPool = []; this._sprayPool = [];
    this._decalI = 0; this._casingI = 0; this._sprayI = 0;
    this._fxLive = false;
    if (!sc?.add || !this.pools) return;
    if (!CombatSystem._decalGeo) { CombatSystem._decalGeo = new THREE.PlaneGeometry(0.12, 0.12); CombatSystem._decalGeo.userData.shared = true; }
    if (!CombatSystem._casingGeo) { CombatSystem._casingGeo = new THREE.CylinderGeometry(0.012, 0.014, 0.045, 6); CombatSystem._casingGeo.userData.shared = true; CombatSystem._casingGeo.rotateZ(Math.PI / 2); }
    if (!CombatSystem._sprayGeo) { CombatSystem._sprayGeo = new THREE.PlaneGeometry(0.28, 0.28); CombatSystem._sprayGeo.userData.shared = true; }
    if (!CombatSystem._flashGeo) { CombatSystem._flashGeo = new THREE.PlaneGeometry(0.22, 0.22); CombatSystem._flashGeo.userData.shared = true; }
    if (!CombatSystem._decalMat) {
      CombatSystem._decalMat = {
        metal: new THREE.MeshBasicMaterial({ color: 0x1a1a18, transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide }),
        wood: new THREE.MeshBasicMaterial({ color: 0x2a1a10, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide }),
        stone: new THREE.MeshBasicMaterial({ color: 0x2a2824, transparent: true, opacity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide }),
      };
      CombatSystem._casingMat = new THREE.MeshLambertMaterial({ color: 0xb08a3a, emissive: 0x1a1004 });
      CombatSystem._sprayMat = new THREE.MeshBasicMaterial({ color: 0x6a0804, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide });
      CombatSystem._flashMat = new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      for (const m of [...Object.values(CombatSystem._decalMat), CombatSystem._casingMat, CombatSystem._sprayMat, CombatSystem._flashMat]) {
        if (m) m.userData.shared = true;
      }
    }
    const bloodMap = this.game.materials?.textures?.blood || this.game.materials?.bloodDecal?.map;
    if (bloodMap && CombatSystem._sprayMat) CombatSystem._sprayMat.map = bloodMap;
    for (let i = 0; i < (this._fx.decals || 0); i++) {
      const m = new THREE.Mesh(CombatSystem._decalGeo, CombatSystem._decalMat.stone);
      m.visible = false; m.name = 'bulletDecal'; m.userData.castOrig = false; sc.add(m);
      this._decalPool.push({ mesh: m, life: 0 });
    }
    for (let i = 0; i < (this._fx.casings || 0); i++) {
      const m = new THREE.Mesh(CombatSystem._casingGeo, CombatSystem._casingMat);
      m.visible = false; m.name = 'casing'; m.userData.castOrig = false; sc.add(m);
      this._casingPool.push({ mesh: m, life: 0, vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, floorY: 0, sleeping: true });
    }
    for (let i = 0; i < (this._fx.sprays || 0); i++) {
      const mat = CombatSystem._sprayMat.clone();
      const m = new THREE.Mesh(CombatSystem._sprayGeo, mat);
      m.visible = false; m.name = 'bloodSpray'; m.userData.castOrig = false; sc.add(m);
      this._sprayPool.push({ mesh: m, life: 0, max: 0.4 });
    }
    const flash = new THREE.Mesh(CombatSystem._flashGeo, CombatSystem._flashMat);
    flash.visible = false; flash.name = 'muzzleFlash'; flash.userData.castOrig = false; flash.frustumCulled = false;
    sc.add(flash); this._flash = flash; this._flashLife = 0;
  }

  bulletHole(pos, hit, surface = 'stone') {
    if (!this._decalPool?.length) return null;
    const s = surfaceOf(hit?.box) || surface;
    const slot = this._decalPool[this._decalI % this._decalPool.length];
    this._decalI++;
    const m = slot.mesh;
    m.material = CombatSystem._decalMat[s] || CombatSystem._decalMat.stone;
    const nx = hit?.nx ?? 0, ny = hit?.ny ?? 1, nz = hit?.nz ?? 0;
    m.position.set(pos.x + nx * 0.012, pos.y + ny * 0.012, pos.z + nz * 0.012);
    m.lookAt(pos.x + nx, pos.y + ny, pos.z + nz);
    m.scale.setScalar(0.85 + Math.random() * 0.5);
    m.rotateZ(Math.random() * Math.PI);
    m.visible = true;
    slot.life = 1;
    this._fxLive = true;
    return m;
  }

  ejectCasing(pos, dir) {
    if (!this._casingPool?.length) return null;
    const c = this._casingPool[this._casingI % this._casingPool.length];
    this._casingI++;
    const fx = dir?.x ?? 0, fz = dir?.z ?? 1;
    // ejeção para a direita da mira, um pouco para cima e para trás
    const rx = fz, rz = -fx;
    c.mesh.position.set(pos.x + rx * 0.08, pos.y, pos.z + rz * 0.08);
    c.vx = rx * (1.6 + Math.random() * 1.2) + (Math.random() - 0.5) * 0.4;
    c.vy = 2.2 + Math.random() * 1.4;
    c.vz = rz * (1.6 + Math.random() * 1.2) + (Math.random() - 0.5) * 0.4;
    c.wx = (Math.random() - 0.5) * 18; c.wy = (Math.random() - 0.5) * 22;
    c.floorY = (this.game.player?.pos?.y ?? pos.y - 1.4);
    c.life = 2.4; c.sleeping = false;
    c.mesh.visible = true; c.mesh.rotation.set(Math.random(), Math.random(), Math.random());
    this._fxLive = true;
    return c.mesh;
  }

  muzzleFlash(pos, dir) {
    const m = this._flash; if (!m || !this.pools) return null;
    m.position.set(pos.x, pos.y, pos.z);
    if (dir) {
      this._fwd.set((pos.x || 0) + (dir.x || 0), pos.y, (pos.z || 0) + (dir.z || 0));
      m.lookAt(this._fwd);
    }
    m.scale.setScalar(0.9 + Math.random() * 0.5);
    m.material.opacity = 0.95;
    m.visible = true;
    this._flashLife = 0.06;
    this._fxLive = true;
    return m;
  }

  _bloodSpray(pos, dir, n) {
    if (!this._sprayPool?.length || n <= 0) return;
    const k = Math.min(n, this._sprayPool.length);
    for (let i = 0; i < k; i++) {
      const s = this._sprayPool[this._sprayI % this._sprayPool.length];
      this._sprayI++;
      const ox = (dir?.x ?? 0) * 0.15 + (Math.random() - 0.5) * 0.25;
      const oy = (Math.random() - 0.2) * 0.2;
      const oz = (dir?.z ?? 0) * 0.15 + (Math.random() - 0.5) * 0.25;
      s.mesh.position.set(pos.x + ox, pos.y + oy, pos.z + oz);
      s.mesh.scale.setScalar(0.6 + Math.random() * 0.7);
      s.mesh.material.opacity = 0.8;
      s.mesh.visible = true;
      s.life = s.max = 0.28 + Math.random() * 0.18;
    }
    this._fxLive = true;
  }

  _updateFx(dt) {
    if (!this._fxLive) return;
    let live = 0;
    if (this._flashLife > 0 && this._flash) {
      this._flashLife -= dt;
      this._flash.material.opacity = Math.max(0, this._flashLife / 0.06);
      this._flash.scale.multiplyScalar(1 + dt * 8);
      if (this._flashLife <= 0) this._flash.visible = false; else live++;
    }
    const cam = this.game.camera;
    for (const s of this._sprayPool) {
      if (!s.mesh.visible) continue;
      s.life -= dt;
      if (s.life <= 0) { s.mesh.visible = false; continue; }
      s.mesh.material.opacity = 0.8 * (s.life / s.max);
      s.mesh.scale.multiplyScalar(1 + dt * 1.8);
      if (cam) s.mesh.lookAt(cam.position);
      live++;
    }
    for (const c of this._casingPool) {
      if (!c.mesh.visible || c.sleeping) { if (c.mesh.visible) live++; continue; }
      c.life -= dt;
      c.vy -= 18 * dt;
      c.mesh.position.x += c.vx * dt; c.mesh.position.y += c.vy * dt; c.mesh.position.z += c.vz * dt;
      c.mesh.rotation.x += c.wx * dt; c.mesh.rotation.y += c.wy * dt;
      if (c.mesh.position.y <= c.floorY) {
        c.mesh.position.y = c.floorY;
        c.vy *= -0.35; c.vx *= 0.55; c.vz *= 0.55;
        if (Math.abs(c.vy) < 0.55) { c.sleeping = true; c.vy = c.vx = c.vz = 0; }
      }
      if (c.life <= 0) { c.mesh.visible = false; c.sleeping = true; continue; }
      live++;
    }
    // decals ficam até serem reaproveitados (não gastam update)
    if (this._decalPool) for (const d of this._decalPool) if (d.mesh.visible) live++;
    this._fxLive = live > 0;
  }

  fxDebug() {
    const vis = (list) => list ? list.filter((o) => o.mesh.visible).length : 0;
    let parts = 0;
    if (this._live) for (let i = 0; i < this.maxP; i++) if (this.parts[i].life > 0) parts++;
    return { parts, decals: vis(this._decalPool), casings: vis(this._casingPool), sprays: vis(this._sprayPool), flash: !!(this._flash?.visible) };
  }
}
