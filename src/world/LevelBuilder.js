// Construção modular de cenário: caixas com UV em coordenadas de mundo, paredes com vãos de porta,
// pisos, tetos e escadas. Cada peça sólida gera um colisor AABB correspondente.
import * as THREE from 'three';

/** Escala as UVs de uma BoxGeometry para que a textura repita por metro (tile = metros por repetição). */
export function worldUV(geo, w, h, d, tile = 2) {
  const uv = geo.attributes.uv;
  // ordem das faces: +x, -x, +y, -y, +z, -z (4 vértices cada)
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * dims[f][0] / tile, uv.getY(k) * dims[f][1] / tile);
    }
  }
  uv.needsUpdate = true;
  return geo;
}

export class LevelBuilder {
  constructor(scene, col, materials) {
    this.col = col;
    this.M = materials;
    this.group = new THREE.Group();
    this.group.name = 'level';
    scene.add(this.group);
    this.wallT = 0.2;
  }

  box(minX, minY, minZ, maxX, maxY, maxZ, mat, opts = {}) {
    const w = maxX - minX, h = maxY - minY, d = maxZ - minZ;
    const geo = worldUV(new THREE.BoxGeometry(w, h, d), w, h, d, opts.tile ?? 2);
    const m = new THREE.Mesh(geo, typeof mat === 'string' ? this.M[mat] : mat);
    m.position.set((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
    m.castShadow = !!opts.cast;
    m.receiveShadow = opts.receive !== false;
    m.matrixAutoUpdate = false; m.updateMatrix();
    (opts.parent || this.group).add(m);
    if (opts.collide !== false) {
      m.userData.collider = this.col.addBox(minX, minY, minZ, maxX, maxY, maxZ, { tag: opts.tag || 'wall', blocksSight: opts.sight !== false, ref: m });
    }
    return m;
  }

  /** parede ao longo de X (z fixo) com vãos centrados em gaps[] */
  wallX(z, x1, x2, y0, y1, gaps = [], mat = 'wall', gapW = 1.4, gapH = 2.3) {
    const t = this.wallT / 2;
    let cur = x1;
    for (const g of [...gaps].sort((a, b) => a - b)) {
      const a = g - gapW / 2, b = g + gapW / 2;
      if (a > cur) this.box(cur, y0, z - t, a, y1, z + t, mat);
      if (y0 + gapH < y1) this.box(a, y0 + gapH, z - t, b, y1, z + t, mat);
      cur = b;
    }
    if (x2 > cur) this.box(cur, y0, z - t, x2, y1, z + t, mat);
  }
  /** parede ao longo de Z (x fixo) */
  wallZ(x, z1, z2, y0, y1, gaps = [], mat = 'wall', gapW = 1.4, gapH = 2.3) {
    const t = this.wallT / 2;
    let cur = z1;
    for (const g of [...gaps].sort((a, b) => a - b)) {
      const a = g - gapW / 2, b = g + gapW / 2;
      if (a > cur) this.box(x - t, y0, cur, x + t, y1, a, mat);
      if (y0 + gapH < y1) this.box(x - t, y0 + gapH, a, x + t, y1, b, mat);
      cur = b;
    }
    if (z2 > cur) this.box(x - t, y0, cur, x + t, y1, z2, mat);
  }

  floor(minX, minZ, maxX, maxZ, y, mat = 'tile', name = '') {
    this.box(minX, y - 0.3, minZ, maxX, y, maxZ, mat, { collide: false, tile: 2 });
    return this.col.addFloor({ minX, maxX, minZ, maxZ, y, name });
  }
  ceiling(minX, minZ, maxX, maxZ, y, mat = 'ceiling') {
    // colisor de teto só para a câmera (não intercepta cápsulas, que ficam abaixo dele)
    this.box(minX, y, minZ, maxX, y + 0.25, maxZ, mat, { tag: 'ceiling', receive: false, tile: 2 });
  }

  /** Escada visual (degraus) + rampa de colisão suave ao longo de Z. */
  stairsZ(minX, maxX, zTop, zBottom, yTop, yBottom, steps, mat = 'concrete') {
    const dz = (zBottom - zTop) / steps, dy = (yTop - yBottom) / steps;
    for (let i = 0; i < steps; i++) {
      const z0 = zBottom - dz * (i + 1), z1 = zBottom - dz * i;
      const top = yBottom + dy * (i + 1);
      this.box(minX, yBottom - 0.3, Math.min(z0, z1), maxX, top, Math.max(z0, z1), mat, { collide: false, tile: 1 });
    }
    return this.col.addFloor({ minX, maxX, minZ: Math.min(zTop, zBottom), maxZ: Math.max(zTop, zBottom), ramp: { axis: 'z', a: zTop, b: zBottom, ya: yTop, yb: yBottom } });
  }
}
