// pt59u: fábrica de adereços procedurais (estilo PS2) com geometria compartilhada e cache por tipo.
// As peças estáticas entram no agrupamento do Perf (batchable). Variações baratas por instância (semente).
// Qualidade (0 Baixa / 1 Média / 2 Alta+) definida no Graphics.apply antes de montar o capítulo.
import * as THREE from 'three';

const _cache = new Map();
function geo(key, make) {
  let g = _cache.get(key);
  if (!g) { g = make(); g.userData.shared = true; _cache.set(key, g); }
  return g;
}
const BOX = () => geo('box', () => new THREE.BoxGeometry(1, 1, 1));
const CYL = () => geo('cyl6', () => new THREE.CylinderGeometry(1, 1, 1, 6));
const CYL8 = () => geo('cyl8', () => new THREE.CylinderGeometry(1, 1, 1, 8));

let _detail = 1;
export function setPropDetail(n) { _detail = n; }
export function propDetailFor(cfg) {
  const s = cfg?.renderScale ?? 0.75;
  if (s < 0.6) return 0;
  if (s < 1) return 1;
  return 2;
}
export function propDetail() { return _detail; }

function ctxOf(level) {
  return { group: level.b.group, M: level.M || level.game.materials, col: level.game.col };
}
function tally(level, kind) {
  if (!level.propStats) level.propStats = {};
  level.propStats[kind] = (level.propStats[kind] || 0) + 1;
}

function add(group, geom, mat, x, y, z, sx, sy, sz, opts = {}) {
  const m = new THREE.Mesh(geom, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rz) m.rotation.z = opts.rz;
  m.castShadow = !!opts.cast;
  m.receiveShadow = opts.receive !== false;
  m.userData.batchable = opts.batch !== false;
  m.matrixAutoUpdate = false; m.updateMatrix();
  group.add(m);
  return m;
}
function box(group, mat, w, h, d, x, y, z, opts) { return add(group, BOX(), mat, x, y, z, w, h, d, opts); }
function cyl(group, mat, r, h, x, y, z, opts) { return add(group, opts?.seg8 ? CYL8() : CYL(), mat, x, y, z, r, h, r, opts); }

/** aplica yaw em Y em torno de (ox,oz) */
function around(ox, oz, lx, lz, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return [ox + lx * c - lz * s, oz + lx * s + lz * c];
}

function hit(col, minX, minY, minZ, maxX, maxY, maxZ, tag = 'prop-low', sight = false) {
  return col.addBox(minX, minY, minZ, maxX, maxY, maxZ, { tag, blocksSight: sight });
}

function seedOf(x, z, n = 0) { return Math.abs((Math.sin(x * 12.9898 + z * 78.233 + n * 3.7) * 43758.5453) % 1); }

/**
 * Cama hospitalar: estrutura tubular, cabeceira, colchão, lençol amassado e travesseiro.
 * yaw 0 = comprimento no Z (como o bed() antigo); π/2 = comprimento no X.
 */
export function placeBed(level, o) {
  tally(level, 'bed');
  const { group, M, col } = ctxOf(level);
  const x = o.x, y = o.y ?? 0, z = o.z, yaw = o.yaw ?? 0;
  const L = o.length ?? 2.0, W = o.width ?? 0.95;
  const metal = M.metal, sheet = o.sheetMat ? M[o.sheetMat] || o.sheetMat : M.sheet;
  const v = o.variant ?? (seedOf(x, z) > 0.55 ? 1 : seedOf(x, z, 1) > 0.7 ? 2 : 0);
  const p = (lx, ly, lz) => { const [wx, wz] = around(x, z, lx, lz, yaw); return [wx, y + ly, wz]; };
  const B = (w, h, d, lx, ly, lz, mat, opts) => { const q = p(lx, ly, lz); box(group, mat || metal, w, h, d, q[0], q[1], q[2], { ry: yaw, cast: true, ...opts }); };

  // pés / rodas
  for (const [lx, lz] of [[-W / 2 + 0.07, -L / 2 + 0.08], [W / 2 - 0.07, -L / 2 + 0.08], [-W / 2 + 0.07, L / 2 - 0.08], [W / 2 - 0.07, L / 2 - 0.08]]) {
    B(0.045, 0.34, 0.045, lx, 0.17, lz);
    if (_detail >= 1) {
      const q = p(lx, 0.035, lz);
      cyl(group, metal, 0.05, 0.03, q[0], q[1], q[2], { rx: Math.PI / 2, ry: yaw, batch: true });
    }
  }
  // longarinas e travessas
  B(0.04, 0.05, L - 0.1, -W / 2 + 0.06, 0.32, 0);
  B(0.04, 0.05, L - 0.1, W / 2 - 0.06, 0.32, 0);
  B(W - 0.08, 0.04, 0.04, 0, 0.32, -L / 2 + 0.1);
  B(W - 0.08, 0.04, 0.04, 0, 0.32, L / 2 - 0.1);
  // grade lateral (média+)
  if (_detail >= 1) {
    for (const sx of [-1, 1]) {
      B(0.025, 0.22, L * 0.55, sx * (W / 2 - 0.03), 0.52, 0.1);
    }
  }
  // cabeceira tubular
  B(W - 0.05, 0.04, 0.04, 0, 0.95, -L / 2 + 0.03);
  B(0.04, 0.7, 0.04, -W / 2 + 0.06, 0.65, -L / 2 + 0.03);
  B(0.04, 0.7, 0.04, W / 2 - 0.06, 0.65, -L / 2 + 0.03);
  if (_detail >= 1) {
    B(W - 0.16, 0.03, 0.03, 0, 0.72, -L / 2 + 0.03);
    B(W - 0.16, 0.03, 0.03, 0, 0.55, -L / 2 + 0.03);
  }
  // pezeira
  B(W - 0.1, 0.35, 0.035, 0, 0.55, L / 2 - 0.03);
  // colchão + lençol
  B(W - 0.1, 0.12, L - 0.16, 0, 0.40, 0.02, sheet, { tile: 1 });
  B(W - 0.06, 0.025, L - 0.1, 0, 0.47, 0.02, sheet);
  // aba do lençol
  B(W - 0.08, 0.08, 0.04, 0, 0.42, L / 2 - 0.04, sheet);
  if (v >= 1 || _detail >= 1) {
    const folds = v === 2 ? 4 : 2;
    for (let i = 0; i < folds; i++) {
      const fz = -0.35 + i * 0.28 + (seedOf(x, z, i) - 0.5) * 0.12;
      B(W * 0.55, 0.02, 0.1, (seedOf(x, z, i + 3) - 0.5) * 0.2, 0.49, fz, sheet, { rz: (seedOf(x, z, i + 5) - 0.5) * 0.25 });
    }
  }
  if (v === 2) B(W * 0.4, 0.06, 0.35, W * 0.15, 0.50, L * 0.22, sheet); // cobertor puxado
  // travesseiro (um pouco torto em algumas)
  const px = (v ? (seedOf(x, z, 9) - 0.5) * 0.12 : 0);
  B(W * 0.62, 0.1, 0.28, px, 0.55, -L / 2 + 0.32, sheet, { ry: yaw + (v ? (seedOf(x, z, 8) - 0.5) * 0.35 : 0) });
  if (o.maternity && _detail >= 1) {
    // manivela no pé
    B(0.03, 0.03, 0.16, 0, 0.38, L / 2 + 0.08);
    const q = p(0.12, 0.38, L / 2 + 0.16);
    cyl(group, metal, 0.015, 0.14, q[0], q[1], q[2], { rz: Math.PI / 2, ry: yaw, batch: true });
  }
  // AABB igual ao bed() antigo (yaw 0: largura X; π/2: comprimento no X)
  const halfW = Math.abs(Math.cos(yaw)) > 0.5 ? W / 2 : L / 2;
  const halfL = Math.abs(Math.cos(yaw)) > 0.5 ? L / 2 : W / 2;
  hit(col, x - halfW, y, z - halfL, x + halfW, y + 0.62, z + halfL, o.tag || 'prop-low');
  return { x, y, z };
}

/** Maca com rodas, grades e colchonete. AABB = caixa informada. */
export function placeGurney(level, o) {
  tally(level, 'gurney');
  const { group, M, col } = ctxOf(level);
  const minX = o.minX, minY = o.minY, minZ = o.minZ, maxX = o.maxX, maxY = o.maxY ?? (o.minY + 0.8), maxZ = o.maxZ;
  const x = (minX + maxX) / 2, y = minY, z = (minZ + maxZ) / 2;
  const alongX = (maxX - minX) >= (maxZ - minZ);
  const yaw = o.yaw ?? (alongX ? Math.PI / 2 : 0);
  const L = Math.max(maxX - minX, maxZ - minZ), W = Math.min(maxX - minX, maxZ - minZ);
  const metal = M.metal, sheet = M.sheet;
  const p = (lx, ly, lz) => { const [wx, wz] = around(x, z, lx, lz, yaw); return [wx, y + ly, wz]; };
  const B = (w, h, d, lx, ly, lz, mat, opts) => { const q = p(lx, ly, lz); box(group, mat || metal, w, h, d, q[0], q[1], q[2], { ry: yaw, cast: true, ...opts }); };
  const hTop = (maxY - minY);
  for (const [lx, lz] of [[-W / 2 + 0.08, -L / 2 + 0.1], [W / 2 - 0.08, -L / 2 + 0.1], [-W / 2 + 0.08, L / 2 - 0.1], [W / 2 - 0.08, L / 2 - 0.1]]) {
    B(0.04, hTop - 0.12, 0.04, lx, (hTop - 0.12) / 2, lz);
    if (_detail >= 1) { const q = p(lx, 0.05, lz); cyl(group, metal, 0.07, 0.04, q[0], q[1], q[2], { rx: Math.PI / 2, ry: yaw, batch: true }); }
  }
  B(W - 0.06, 0.05, L - 0.08, 0, hTop - 0.1, 0);
  if (o.sheet !== false) B(W - 0.12, 0.06, L - 0.16, 0, hTop - 0.04, 0, sheet);
  if (_detail >= 1) {
    B(0.03, 0.16, L * 0.7, -W / 2 + 0.04, hTop + 0.04, 0);
    B(0.03, 0.16, L * 0.7, W / 2 - 0.04, hTop + 0.04, 0);
    B(0.04, 0.04, 0.2, 0, hTop - 0.12, L / 2 + 0.08); // puxador
  }
  if (o.strap && _detail >= 1) B(W - 0.2, 0.02, 0.04, 0, hTop + 0.02, 0.1, M.leather || metal);
  hit(col, minX, minY, minZ, maxX, maxY, maxZ, o.tag || 'prop-low');
}

/** Suporte de soro (em pé ou tombado). Sem colisão, como o original. */
export function placeIvStand(level, o) {
  tally(level, 'iv');
  const { group, M } = ctxOf(level);
  const x = o.x, y = o.y ?? 0, z = o.z, fallen = !!o.fallen;
  const metal = M.metal;
  const rx = fallen ? Math.PI / 2 : 0;
  const rootY = fallen ? y + 0.04 : y;
  const rootZ = fallen ? z : z;
  const h = 1.8;
  // base
  if (!fallen) {
    for (const a of [0, 2.1, 4.2]) {
      const lx = Math.cos(a) * 0.18, lz = Math.sin(a) * 0.18;
      box(group, metal, 0.03, 0.03, 0.2, x + lx * 0.5, rootY + 0.03, rootZ + lz * 0.5, { ry: a, cast: true });
      if (_detail >= 1) cyl(group, metal, 0.035, 0.03, x + lx, rootY + 0.03, rootZ + lz, { rx: Math.PI / 2, batch: true });
    }
  }
  const py = fallen ? rootY + 0.04 : rootY + h / 2;
  const pz = fallen ? rootZ + h / 2 : rootZ;
  cyl(group, metal, 0.018, h, x, py, pz, { rx, cast: true, seg8: true });
  const topY = fallen ? rootY + 0.04 : rootY + h - 0.05;
  const topZ = fallen ? rootZ + h - 0.05 : rootZ;
  box(group, metal, 0.28, 0.02, 0.02, x, topY, topZ, { rx, ry: fallen ? 0 : 0 });
  if (!fallen && o.bag !== false && _detail >= 1) {
    box(group, M.vial || M.glass || metal, 0.06, 0.14, 0.04, x + 0.1, topY - 0.12, topZ, { cast: true });
  }
}

/** Criado-mudo / mesinha com gaveta e puxador. */
export function placeNightstand(level, o) {
  tally(level, 'nightstand');
  const { group, M, col } = ctxOf(level);
  const { minX, minY, minZ, maxX, maxY, maxZ } = o;
  const x = (minX + maxX) / 2, y = minY, z = (minZ + maxZ) / 2;
  const w = maxX - minX, h = maxY - minY, d = maxZ - minZ;
  const wood = M[o.mat] || M.wood;
  const alongX = w >= d;
  const yaw = o.yaw ?? 0;
  box(group, wood, w, 0.05, d, x, y + h - 0.025, z, { cast: true });
  box(group, wood, w * 0.92, h - 0.12, d * 0.92, x, y + (h - 0.12) / 2 + 0.02, z, { cast: true });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    box(group, wood, 0.05, h - 0.05, 0.05, x + sx * (w / 2 - 0.05), y + (h - 0.05) / 2, z + sz * (d / 2 - 0.05), { cast: true });
  }
  if (_detail >= 1) {
    const face = o.face === '-x' ? [-w / 2, 0] : o.face === '+x' ? [w / 2, 0] : o.face === '-z' ? [0, -d / 2] : [0, d / 2];
    const fx = x + (face[0] || (alongX ? 0 : 0)), fz = z + (face[1] !== undefined ? face[1] : (d / 2));
    box(group, M.metal, 0.08, 0.02, 0.03, x, y + h * 0.55, z + d / 2 + 0.01, { cast: false });
  }
  hit(col, minX, minY, minZ, maxX, maxY, maxZ, o.tag || 'prop-low', o.sight);
}

/** Mesa com tampo, saia e quatro pés. AABB original. */
export function placeTable(level, o) {
  tally(level, 'table');
  const { group, M, col } = ctxOf(level);
  const { minX, minY, minZ, maxX, maxY, maxZ } = o;
  const x = (minX + maxX) / 2, y = minY, z = (minZ + maxZ) / 2;
  const w = maxX - minX, h = maxY - minY, d = maxZ - minZ;
  const wood = M[o.mat] || M.wood || M.woodDark;
  box(group, wood, w, 0.05, d, x, y + h - 0.025, z, { cast: true });
  if (_detail >= 1) box(group, wood, w - 0.06, 0.06, d - 0.06, x, y + h - 0.08, z);
  const inset = 0.07;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    box(group, wood, 0.06, h - 0.05, 0.06, x + sx * (w / 2 - inset), y + (h - 0.05) / 2, z + sz * (d / 2 - inset), { cast: true });
  }
  hit(col, minX, minY, minZ, maxX, maxY, maxZ, o.tag || 'prop-low', o.sight);
}

/** Banco com assento, pés e encosto opcional. */
export function placeBench(level, o) {
  tally(level, 'bench');
  const { group, M, col } = ctxOf(level);
  const { minX, minY, minZ, maxX, maxY, maxZ } = o;
  const x = (minX + maxX) / 2, y = minY, z = (minZ + maxZ) / 2;
  const w = maxX - minX, h = maxY - minY, d = maxZ - minZ;
  const wood = M[o.mat] || M.woodDark || M.wood;
  const alongX = w >= d;
  box(group, wood, w, 0.07, d, x, y + h - 0.035, z, { cast: true });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    box(group, wood, 0.06, h - 0.05, 0.06, x + sx * (w / 2 - 0.06), y + (h - 0.05) / 2, z + sz * (d / 2 - 0.06), { cast: true });
  }
  if (o.back !== false && _detail >= 0) {
    if (alongX) box(group, wood, w, 0.45, 0.05, x, y + h + 0.2, z - d / 2 + 0.03, { cast: true });
    else box(group, wood, 0.05, 0.45, d, x - w / 2 + 0.03, y + h + 0.2, z, { cast: true });
  }
  hit(col, minX, minY, minZ, maxX, Math.max(maxY, minY + h + (o.back !== false ? 0.4 : 0)), maxZ, o.tag || 'prop-low', o.sight);
}

/** Cadeira simples (assento, encosto, quatro pés). */
export function placeChair(level, o) {
  tally(level, 'chair');
  const { group, M, col } = ctxOf(level);
  const x = o.x, y = o.y ?? 0, z = o.z, yaw = o.yaw ?? 0;
  const wood = M[o.mat] || M.wood;
  const addL = (w, h, d, lx, ly, lz, opts) => { const [wx, wz] = around(x, z, lx, lz, yaw); box(group, wood, w, h, d, wx, y + ly, wz, { ry: yaw, cast: true, ...opts }); };
  addL(0.42, 0.05, 0.42, 0, 0.45, 0);
  for (const [lx, lz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) addL(0.045, 0.45, 0.045, lx, 0.225, lz);
  addL(0.42, 0.5, 0.05, 0, 0.72, -0.19);
  if (_detail >= 1) addL(0.36, 0.04, 0.03, 0, 0.85, -0.19);
  hit(col, x - 0.24, y, z - 0.24, x + 0.24, y + 0.5, z + 0.24, 'prop-low');
}

/** Estante (lados, fundo, prateleiras e livros). */
export function placeBookcase(level, o) {
  tally(level, 'shelf');
  const { group, M, col } = ctxOf(level);
  const { minX, minY, minZ, maxX, maxY, maxZ } = o;
  const x = (minX + maxX) / 2, y = minY, z = (minZ + maxZ) / 2;
  const w = maxX - minX, h = maxY - minY, d = maxZ - minZ;
  const wood = M[o.mat] || M.woodDark;
  const alongX = w >= d;
  // fundo
  if (alongX) box(group, wood, w, h, 0.04, x, y + h / 2, z - d / 2 + 0.02, { cast: true });
  else box(group, wood, 0.04, h, d, x - w / 2 + 0.02, y + h / 2, z, { cast: true });
  // laterais + teto + base
  if (alongX) {
    box(group, wood, 0.05, h, d, x - w / 2 + 0.025, y + h / 2, z, { cast: true });
    box(group, wood, 0.05, h, d, x + w / 2 - 0.025, y + h / 2, z, { cast: true });
    box(group, wood, w, 0.05, d, x, y + 0.025, z, { cast: true });
    box(group, wood, w, 0.05, d, x, y + h - 0.025, z, { cast: true });
  } else {
    box(group, wood, w, h, 0.05, x, y + h / 2, z - d / 2 + 0.025, { cast: true });
    box(group, wood, w, h, 0.05, x, y + h / 2, z + d / 2 - 0.025, { cast: true });
    box(group, wood, w, 0.05, d, x, y + 0.025, z, { cast: true });
    box(group, wood, w, 0.05, d, x, y + h - 0.025, z, { cast: true });
  }
  const n = o.shelves ?? Math.max(2, Math.round(h / 0.5));
  for (let i = 1; i < n; i++) {
    const ly = y + (h * i) / n;
    box(group, wood, alongX ? w - 0.08 : w - 0.04, 0.03, alongX ? d - 0.04 : d - 0.08, x, ly, z);
    if (_detail >= 1 && o.books !== false) {
      const books = 3 + ((i + (x * 10 | 0)) % 3);
      for (let k = 0; k < books; k++) {
        const mat = (k + i) % 3 === 0 ? (M.leather || wood) : (k % 2 ? (M.paper || wood) : wood);
        const bw = 0.06 + seedOf(x, z, i * 10 + k) * 0.05;
        const bh = 0.16 + seedOf(x, z, i * 7 + k) * 0.1;
        if (alongX) box(group, mat, bw, bh, d * 0.55, x - w / 2 + 0.15 + k * 0.12, ly + 0.02 + bh / 2, z + 0.02);
        else box(group, mat, w * 0.55, bh, bw, x + 0.02, ly + 0.02 + bh / 2, z - d / 2 + 0.15 + k * 0.12);
      }
    }
  }
  hit(col, minX, minY, minZ, maxX, maxY, maxZ, o.tag || 'prop', o.sight !== false);
}

// alias
export const placeShelf = placeBookcase;

/** Carrinho (prateleiras de metal + rodas). */
export function placeCart(level, o) {
  tally(level, 'cart');
  const { group, M, col } = ctxOf(level);
  const { minX, minY, minZ, maxX, maxY, maxZ } = o;
  const x = (minX + maxX) / 2, y = minY, z = (minZ + maxZ) / 2;
  const w = maxX - minX, h = maxY - minY, d = maxZ - minZ;
  const metal = M[o.mat] || M.steel || M.metal;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    box(group, metal, 0.04, h, 0.04, x + sx * (w / 2 - 0.04), y + h / 2, z + sz * (d / 2 - 0.04), { cast: true });
    if (_detail >= 1) cyl(group, metal, 0.05, 0.03, x + sx * (w / 2 - 0.05), y + 0.04, z + sz * (d / 2 - 0.05), { rx: Math.PI / 2, batch: true });
  }
  box(group, metal, w - 0.04, 0.03, d - 0.04, x, y + 0.2, z, { cast: true });
  box(group, metal, w - 0.04, 0.03, d - 0.04, x, y + h - 0.04, z, { cast: true });
  if (_detail >= 1) box(group, metal, w - 0.04, 0.03, d - 0.04, x, y + h * 0.55, z);
  hit(col, minX, minY, minZ, maxX, maxY, maxZ, o.tag || 'prop-low', o.sight);
}

/** Pia com cuba e torneira. */
export function placeSink(level, o) {
  tally(level, 'sink');
  const { group, M, col } = ctxOf(level);
  const { minX, minY, minZ, maxX, maxY, maxZ } = o;
  const x = (minX + maxX) / 2, y = minY, z = (minZ + maxZ) / 2;
  const w = maxX - minX, h = maxY - minY, d = maxZ - minZ;
  const metal = M[o.mat] || M.steel || M.metal;
  box(group, metal, w, h - 0.08, d, x, y + (h - 0.08) / 2, z, { cast: true });
  box(group, metal, w + 0.04, 0.06, d + 0.04, x, y + h - 0.02, z, { cast: true });
  box(group, M.steelDark || metal, w * 0.7, 0.04, d * 0.6, x, y + h - 0.05, z);
  if (_detail >= 1) {
    cyl(group, metal, 0.02, 0.16, x, y + h + 0.08, z - d * 0.25, { seg8: true });
    box(group, metal, 0.02, 0.02, 0.1, x, y + h + 0.16, z - d * 0.15);
    cyl(group, metal, 0.015, 0.05, x, y + h + 0.13, z - d * 0.08, { seg8: true });
  }
  hit(col, minX, minY, minZ, maxX, maxY, maxZ, o.tag || 'prop-low', o.sight);
}

/** Caixote de madeira com cantoneiras. */
export function placeCrate(level, o) {
  tally(level, 'crate');
  const { group, M, col } = ctxOf(level);
  const { minX, minY, minZ, maxX, maxY, maxZ } = o;
  const x = (minX + maxX) / 2, y = minY, z = (minZ + maxZ) / 2;
  const w = maxX - minX, h = maxY - minY, d = maxZ - minZ;
  const wood = M[o.mat] || M.wood;
  box(group, wood, w, h, d, x, y + h / 2, z, { cast: true });
  if (_detail >= 1) {
    box(group, M.metal, w + 0.01, 0.03, 0.03, x, y + h - 0.04, z + d / 2);
    box(group, M.metal, w + 0.01, 0.03, 0.03, x, y + 0.04, z + d / 2);
  }
  hit(col, minX, minY, minZ, maxX, maxY, maxZ, o.tag || 'prop-low', o.sight);
}

/**
 * Banco de capela: assento, ripas de encosto, laterais e genuflexório.
 * x0..x1 ao longo de X, z = frente, profundidade para +Z (encosto no fundo, como os sbox antigos).
 */
export function placePew(level, o) {
  tally(level, 'pew');
  const { group, M, col } = ctxOf(level);
  const x0 = o.x0, x1 = o.x1, z = o.z, y = o.y ?? 0;
  const depth = o.depth ?? 0.5;
  const pew = M.pew || M.woodDark;
  const cx = (x0 + x1) / 2, w = x1 - x0;
  // pés laterais
  box(group, pew, 0.07, 0.46, depth, x0 + 0.04, y + 0.23, z + depth / 2, { cast: true });
  box(group, pew, 0.07, 0.46, depth, x1 - 0.04, y + 0.23, z + depth / 2, { cast: true });
  // assento
  box(group, pew, w, 0.06, depth - 0.06, cx, y + 0.45, z + depth / 2 - 0.02, { cast: true });
  // encosto: ripas (ou placa única na Baixa)
  const backZ = z + depth - 0.04;
  box(group, pew, 0.07, 1.0, 0.06, x0 + 0.04, y + 0.5, backZ, { cast: true });
  box(group, pew, 0.07, 1.0, 0.06, x1 - 0.04, y + 0.5, backZ, { cast: true });
  box(group, pew, w - 0.04, 0.05, 0.05, cx, y + 0.98, backZ, { cast: true });
  if (_detail === 0) {
    box(group, pew, w - 0.12, 0.48, 0.04, cx, y + 0.72, backZ);
  } else {
    for (let i = 0; i < 4; i++) box(group, pew, w - 0.14, 0.08, 0.035, cx, y + 0.56 + i * 0.12, backZ, { cast: true });
  }
  // genuflexório (à frente, para a fileira de trás usar; + um no próprio banco)
  if (_detail >= 1) {
    box(group, pew, w - 0.1, 0.04, 0.16, cx, y + 0.22, z + depth + 0.08, { cast: true });
    box(group, pew, 0.03, 0.22, 0.03, x0 + 0.12, y + 0.11, z + depth + 0.08);
    box(group, pew, 0.03, 0.22, 0.03, x1 - 0.12, y + 0.11, z + depth + 0.08);
  }
  if (o.book && _detail >= 2) box(group, M.leather || pew, 0.14, 0.03, 0.1, cx + 0.3, y + 0.50, z + depth / 2, { ry: 0.2 });
  hit(col, x0, y, z, x1, y + 0.98, z + depth, 'prop-low');
}

/** Altar de pedra com toalha e moldura; AABB do bloco original. */
export function placeAltar(level, o) {
  tally(level, 'altar');
  const { group, M, col } = ctxOf(level);
  const { minX, minY, minZ, maxX, maxY, maxZ } = o;
  const x = (minX + maxX) / 2, y = minY, z = (minZ + maxZ) / 2;
  const w = maxX - minX, h = maxY - minY, d = maxZ - minZ;
  const stone = M.stone || M.marble, cloth = M.altarCloth || M.sheet;
  box(group, stone, w, h - 0.08, d, x, y + (h - 0.08) / 2, z, { cast: true });
  box(group, stone, w + 0.06, 0.08, d + 0.06, x, y + h - 0.04, z, { cast: true });
  if (_detail >= 1) {
    box(group, stone, w * 0.12, h * 0.6, 0.04, x - w * 0.35, y + h * 0.35, z - d / 2 - 0.01);
    box(group, stone, w * 0.12, h * 0.6, 0.04, x + w * 0.35, y + h * 0.35, z - d / 2 - 0.01);
  }
  // toalha com quedas
  box(group, cloth, w + 0.1, 0.03, d + 0.08, x, y + h + 0.01, z);
  box(group, cloth, w + 0.08, 0.22, 0.03, x, y + h - 0.1, z - d / 2 - 0.02);
  if (_detail >= 1) {
    box(group, cloth, 0.08, 0.18, 0.03, x - w * 0.2, y + h - 0.12, z - d / 2 - 0.025, { rz: 0.15 });
    box(group, cloth, 0.06, 0.14, 0.03, x + w * 0.15, y + h - 0.1, z - d / 2 - 0.025, { rz: -0.1 });
  }
  hit(col, minX, minY, minZ, maxX, maxY, maxZ, o.tag || 'prop', true);
}

/** Castiçal (base, haste, copo e vela). y = base. */
export function placeCandlestick(level, o) {
  tally(level, 'candlestick');
  const { group, M } = ctxOf(level);
  const x = o.x, y = o.y, z = o.z, h = o.h ?? 1.7;
  const brass = M.gold || M.brass || M.metal;
  cyl(group, brass, 0.08, 0.06, x, y + 0.03, z, { seg8: true, cast: true });
  cyl(group, brass, 0.03, h - 0.2, x, y + h / 2, z, { seg8: true, cast: true });
  cyl(group, brass, 0.05, 0.05, x, y + h - 0.16, z, { seg8: true });
  box(group, M.candle || M.sheet, 0.035, 0.2, 0.035, x, y + h - 0.04, z);
  if (o.flameY) { /* chama fica a cargo do cenário */ }
}

/** Cruz latina (dois braços). */
export function placeCross(level, o) {
  tally(level, 'cross');
  const { group, M } = ctxOf(level);
  const x = o.x, y = o.y, z = o.z, s = o.scale ?? 1, yaw = o.yaw ?? 0;
  const mat = M[o.mat] || M.gold || M.woodDark;
  box(group, mat, 0.06 * s, 0.7 * s, 0.05 * s, x, y, z, { ry: yaw, cast: true, batch: o.batch !== false });
  box(group, mat, 0.38 * s, 0.06 * s, 0.05 * s, x, y + 0.16 * s, z, { ry: yaw, cast: true, batch: o.batch !== false });
}

/** Púlpito com degrau, corpo e atril. */
export function placePulpit(level, o) {
  tally(level, 'pulpit');
  const { group, M, col } = ctxOf(level);
  const { minX, minY, minZ, maxX, maxY, maxZ } = o;
  const x = (minX + maxX) / 2, y = minY, z = (minZ + maxZ) / 2;
  const w = maxX - minX, h = maxY - minY, d = maxZ - minZ;
  const wood = M.woodDark;
  box(group, wood, w, h, d, x, y + h / 2, z, { cast: true });
  box(group, wood, w + 0.16, 0.05, d + 0.16, x, y + h + 0.02, z, { cast: true });
  if (_detail >= 1) {
    box(group, wood, w + 0.1, 0.12, 0.04, x, y + h + 0.1, z - d / 2 - 0.04, { rx: -0.4, cast: true });
    box(group, M.leather || wood, 0.16, 0.03, 0.12, x, y + h + 0.12, z - 0.02, { rx: -0.35 });
  }
  hit(col, minX, minY, minZ, maxX, maxY + 0.05, maxZ, o.tag || 'prop-low');
}

/** Berço pediátrico (grades). AABB do colchão+grades. */
export function placeCrib(level, o) {
  tally(level, 'crib');
  const { group, M, col } = ctxOf(level);
  const { minX, minY, minZ, maxX, maxY, maxZ } = o;
  const x = (minX + maxX) / 2, y = minY, z = (minZ + maxZ) / 2;
  const w = maxX - minX, h = maxY - minY, d = maxZ - minZ;
  const metal = M.metal, sheet = M.sheet;
  box(group, sheet, w - 0.08, 0.12, d - 0.08, x, y + 0.28, z, { cast: true });
  for (const [sx, sz, bw, bd] of [
    [-1, 0, 0.03, d], [1, 0, 0.03, d], [0, -1, w, 0.03], [0, 1, w, 0.03],
  ]) {
    const px = x + sx * (w / 2 - 0.015), pz = z + sz * (d / 2 - 0.015);
    box(group, metal, sx !== 0 ? 0.03 : w, h - 0.2, sz !== 0 ? 0.03 : d, px, y + 0.55 + (h - 0.55) / 2, pz, { cast: true });
  }
  if (_detail >= 1) {
    const bars = 5;
    for (let i = 0; i < bars; i++) {
      const t = (i + 0.5) / bars;
      box(group, metal, 0.015, 0.35, 0.015, x - w / 2 + 0.02, y + 0.72, z - d / 2 + t * d);
      box(group, metal, 0.015, 0.35, 0.015, x + w / 2 - 0.02, y + 0.72, z - d / 2 + t * d);
    }
  }
  hit(col, minX, minY, minZ, maxX, maxY, maxZ, o.tag || 'prop-low');
}

/** Cadeira de rodas (assento, rodas grandes, encosto). */
export function placeWheelchair(level, o) {
  tally(level, 'wheelchair');
  const { group, M, col } = ctxOf(level);
  const { minX, minY, minZ, maxX, maxY, maxZ } = o;
  const x = (minX + maxX) / 2, y = minY, z = (minZ + maxZ) / 2;
  const w = maxX - minX, h = maxY - minY, d = maxZ - minZ;
  const metal = M.metal, seat = M.leather || M.leatherDark || M.sheet;
  const alongX = w >= d;
  box(group, seat, alongX ? w * 0.55 : w * 0.9, 0.07, alongX ? d * 0.9 : d * 0.55, x, y + h * 0.45, z, { cast: true });
  box(group, seat, alongX ? 0.05 : w * 0.9, 0.4, alongX ? d * 0.9 : 0.05, alongX ? x - w * 0.2 : x, y + h * 0.7, alongX ? z : z - d * 0.2, { cast: true });
  if (_detail >= 1) {
    const wr = Math.min(w, d) * 0.35;
    if (alongX) {
      cyl(group, metal, wr, 0.04, x, y + wr, z - d / 2 + 0.04, { rx: Math.PI / 2, batch: true, seg8: true });
      cyl(group, metal, wr, 0.04, x, y + wr, z + d / 2 - 0.04, { rx: Math.PI / 2, batch: true, seg8: true });
    } else {
      cyl(group, metal, wr, 0.04, x - w / 2 + 0.04, y + wr, z, { rz: Math.PI / 2, batch: true, seg8: true });
      cyl(group, metal, wr, 0.04, x + w / 2 - 0.04, y + wr, z, { rz: Math.PI / 2, batch: true, seg8: true });
    }
  }
  hit(col, minX, minY, minZ, maxX, maxY, maxZ, o.tag || 'prop-low');
}

/** Moldura de vitral (peitoril já pode existir). */
export function placeWindowFrame(level, o) {
  tally(level, 'frame');
  const { group, M } = ctxOf(level);
  const x = o.x, y = o.y, z = o.z, w = o.w ?? 1.05, h = o.h ?? 2.9, t = o.t ?? 0.08;
  const stone = M.stone || M.chapelWall;
  const yaw = o.yaw ?? 0;
  const p = (lx, ly, lz) => around(x, z, lx, lz, yaw);
  let q = p(0, 0, 0);
  box(group, stone, w + 0.12, 0.1, t, q[0], y - h / 2, q[1], { ry: yaw, cast: true });
  box(group, stone, w + 0.12, 0.1, t, q[0], y + h / 2, q[1], { ry: yaw, cast: true });
  box(group, stone, 0.1, h, t, ...(() => { const r = p(-w / 2, 0, 0); return [r[0], y, r[1]]; })(), { ry: yaw, cast: true });
  box(group, stone, 0.1, h, t, ...(() => { const r = p(w / 2, 0, 0); return [r[0], y, r[1]]; })(), { ry: yaw, cast: true });
  if (_detail >= 1) {
    box(group, stone, 0.04, h, t, ...(() => { const r = p(0, 0, 0); return [r[0], y, r[1]]; })(), { ry: yaw });
    box(group, stone, w, 0.04, t, q[0], y, q[1], { ry: yaw });
  }
}

/** Contagem de malhas/triângulos (testes e smoke). */
export function countGeometry(scene) {
  let meshes = 0, tris = 0, batches = 0, batched = 0, batchable = 0;
  scene?.traverse((o) => {
    if (!o.isMesh) return;
    meshes++;
    const g = o.geometry, idx = g.index;
    tris += ((idx ? idx.count : g.attributes.position?.count || 0) / 3) | 0;
    if (o.name === 'staticBatch') { batches++; batched += o.userData.staticBatch || 0; }
    if (o.userData.batchable) batchable++;
  });
  return { meshes, tris, batches, batched, batchable };
}

export function sharedGeoCount() { return _cache.size; }
export function _resetPropCacheForTests() { _cache.clear(); }
