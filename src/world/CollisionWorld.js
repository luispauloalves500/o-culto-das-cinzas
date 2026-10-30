// Mundo de colisão próprio: caixas AABB (paredes, móveis, portas) + pisos/rampas por altura.
// Jogador e inimigos são cápsulas verticais resolvidas como círculos no plano XZ.
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export class CollisionWorld {
  constructor() {
    this.boxes = [];
    this.floors = [];
  }

  addBox(minX, minY, minZ, maxX, maxY, maxZ, opts = {}) {
    const b = {
      min: { x: Math.min(minX, maxX), y: Math.min(minY, maxY), z: Math.min(minZ, maxZ) },
      max: { x: Math.max(minX, maxX), y: Math.max(minY, maxY), z: Math.max(minZ, maxZ) },
      enabled: true,
      tag: opts.tag || 'wall',
      blocksSight: opts.blocksSight !== false,
      ref: opts.ref || null,
    };
    this.boxes.push(b);
    return b;
  }
  setBox(b, minX, minY, minZ, maxX, maxY, maxZ) {
    b.min.x = Math.min(minX, maxX); b.min.y = Math.min(minY, maxY); b.min.z = Math.min(minZ, maxZ);
    b.max.x = Math.max(minX, maxX); b.max.y = Math.max(minY, maxY); b.max.z = Math.max(minZ, maxZ);
  }
  removeBox(b) { const i = this.boxes.indexOf(b); if (i >= 0) this.boxes.splice(i, 1); }

  /** piso plano {minX,maxX,minZ,maxZ,y} ou rampa {ramp:{axis,a,b,ya,yb}}; y pode ser função (elevador) */
  addFloor(f) { this.floors.push(f); return f; }

  floorHeight(f, x, z) {
    if (f.ramp) {
      const r = f.ramp;
      const v = r.axis === 'x' ? x : z;
      const t = clamp((v - r.a) / (r.b - r.a), 0, 1);
      return r.ya + (r.yb - r.ya) * t;
    }
    return typeof f.y === 'function' ? f.y() : f.y;
  }

  /** maior altura de piso sob (x,z) que não esteja acima de y + step */
  groundAt(x, z, y, step = 0.6) {
    let best = -Infinity;
    for (const f of this.floors) {
      if (f.enabled === false) continue;
      if (x < f.minX || x > f.maxX || z < f.minZ || z > f.maxZ) continue;
      const h = this.floorHeight(f, x, z);
      if (h <= y + step && h > best) best = h;
    }
    return best;
  }

  /** Empurra um círculo (raio r, altura h a partir de p.y) para fora das caixas. Retorna caixas tocadas. */
  resolveCircle(p, r, h = 1.8, filter = null) {
    let hits = null;
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const b of this.boxes) {
        if (!b.enabled) continue;
        if (filter && !filter(b)) continue;
        if (p.y + h <= b.min.y || p.y + 0.3 >= b.max.y) continue;
        const cx = clamp(p.x, b.min.x, b.max.x), cz = clamp(p.z, b.min.z, b.max.z);
        const dx = p.x - cx, dz = p.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        if (d2 > 1e-10) {
          const d = Math.sqrt(d2), push = r - d;
          p.x += (dx / d) * push; p.z += (dz / d) * push;
        } else {
          // centro dentro da caixa: sai pelo eixo de menor penetração
          const pen = [p.x - b.min.x, b.max.x - p.x, p.z - b.min.z, b.max.z - p.z];
          let k = 0; for (let i = 1; i < 4; i++) if (pen[i] < pen[k]) k = i;
          if (k === 0) p.x = b.min.x - r; else if (k === 1) p.x = b.max.x + r;
          else if (k === 2) p.z = b.min.z - r; else p.z = b.max.z + r;
        }
        moved = true;
        (hits ||= []).includes(b) || hits.push(b);
      }
      if (!moved) break;
    }
    return hits;
  }

  /** Raio contra AABBs (slab test). Retorna distância do primeiro impacto ou Infinity. */
  raycast(o, d, maxDist, filter = null) {
    let best = Infinity;
    for (const b of this.boxes) {
      if (!b.enabled) continue;
      if (filter && !filter(b)) continue;
      let tmin = -Infinity, tmax = Infinity;
      for (const ax of ['x', 'y', 'z']) {
        if (Math.abs(d[ax]) < 1e-9) {
          if (o[ax] < b.min[ax] || o[ax] > b.max[ax]) { tmin = Infinity; break; }
        } else {
          let t1 = (b.min[ax] - o[ax]) / d[ax], t2 = (b.max[ax] - o[ax]) / d[ax];
          if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; }
          if (t1 > tmin) tmin = t1;
          if (t2 < tmax) tmax = t2;
          if (tmin > tmax) { tmin = Infinity; break; }
        }
      }
      if (tmin === Infinity || tmax < 0) continue;
      const t = Math.max(0, tmin);
      if (t <= maxDist && t < best) best = t;
    }
    return best;
  }

  segmentClear(a, b, filter = null) {
    const d = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
    const len = Math.hypot(d.x, d.y, d.z);
    if (len < 1e-6) return true;
    d.x /= len; d.y /= len; d.z /= len;
    return this.raycast(a, d, len, filter) >= len;
  }

  /** caixa que contém o ponto (para golpes que batem na parede) */
  pointInside(p, filter = null) {
    for (const b of this.boxes) {
      if (!b.enabled || (filter && !filter(b))) continue;
      if (p.x > b.min.x && p.x < b.max.x && p.y > b.min.y && p.y < b.max.y && p.z > b.min.z && p.z < b.max.z) return b;
    }
    return null;
  }
}
