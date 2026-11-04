// Truques de desempenho que NÃO mexem nas texturas (pt48u). Tudo aqui reduz trabalho de CPU/GPU/RAM mantendo
// os mesmos mapas, a mesma resolução de textura e a mesma filtragem:
//   1. Agrupamento estático — paredes, pisos, tetos e escadas do LevelBuilder (que nunca se mexem) são fundidos em
//      malhas por material e por célula de 16 m: centenas de draw calls viram dezenas, e o frustum culling continua
//      valendo por célula. Mesmos vértices, mesmas UVs, mesmo material — imagem idêntica.
//   2. Orçamento de luzes (light LOD / virtualização) — o shader do three.js calcula TODAS as luzes pontuais em todo
//      pixel. As luzes do cenário passam a ser "fontes" (camada que o renderer ignora) e um conjunto FIXO de N luzes
//      "proxy" copia, a cada quadro, as fontes que importam: as que tocam o campo de visão (esfera de alcance ×
//      frustum, sem perda — uma luz cujo alcance não toca a tela não ilumina nada visível) e, dessas, as mais
//      próximas. Número fixo de luzes = nenhum shader recompilado; troca por orçamento com fade de 0,25 s.
//   3. Distância de desenho pela névoa — com FogExp2 a ~2,8/densidade a névoa cobre 99,95 %: o plano distante da
//      câmera acompanha a névoa (35–90 m), e o que estaria invisível não é desenhado.
//   4. Sombras em 30 Hz (Baixa/Altas) — o mapa de sombra das luzes é refeito a no máx. 30×/s; Ultra: todo quadro.
//   5. LOD de animação — inimigos longe (> 28 m) E fora da tela animam o esqueleto a 1/4 da taxa; corpos já caídos e
//      inimigos dormentes (pose parada) congelam as matrizes do esqueleto (nada recalculado por quadro).
//   6. Economia em menus/pausa (renderiza a 10 Hz quando nada se mexe) e limite opcional de FPS.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const LIGHT_LAYER = 7; // camada das luzes-fonte: a câmera (camada 0) não as coleta
export const LIGHT_BUDGETS = [4, 6, 8, 12, 16];
export const DRAW_DIST = ['auto', 'max'];
export const FPS_CAPS = [0, 30, 60];
const FOG_K = 2.8; // exp(-(2.8)^2) ≈ 0,0004 → névoa cobre 99,96 %
export const BATCH_CELL = 16;

/** plano distante da câmera para a névoa atual (null = sem névoa exponencial → máximo) */
export function fogFar(fog, mode = 'auto', max = 90, min = 35) {
  if (mode === 'max' || !fog || !(fog.density > 0)) return max;
  return Math.max(min, Math.min(max, FOG_K / fog.density));
}

/** intervalo mínimo entre atualizações do mapa de sombra (s) por nível de sombra */
export function shadowInterval(level) { return level === 'ultra' ? 0 : 1 / 30; }

/**
 * Escolhe as fontes de luz que merecem um proxy neste quadro.
 * cands: [{ id, x, y, z, r (alcance, Infinity = sem limite), i (intensidade efetiva), shadow, cur (já tem proxy) }]
 * inView(c): a esfera de alcance toca o frustum? (injetado para ser testável sem WebGL)
 * Devolve { pick: [ids], culledView, culledBudget }.
 */
export function selectLights(cands, budget, cam, inView) {
  const rel = [];
  let culledView = 0;
  for (const c of cands) {
    if (!(c.i > 0.001)) continue;
    if (!c.shadow && !inView(c)) { culledView++; continue; }
    const d = Math.hypot(c.x - cam.x, c.y - cam.y, c.z - cam.z);
    const r = Number.isFinite(c.r) ? c.r : 30;
    // luzes de sombra primeiro (não trocam o nº de sombras → sem recompilar); depois a mais próxima relativa ao alcance;
    // histerese: quem já tem proxy ganha 1,5 m (não fica piscando entre duas luzes equidistantes)
    c.rel = true;
    c._s = (c.shadow ? -1e6 : 0) + d - r * 0.5 - (c.cur ? 1.5 : 0);
    rel.push(c);
  }
  rel.sort((a, b) => a._s - b._s);
  return { pick: rel.slice(0, budget).map((c) => c.id), culledView, culledBudget: Math.max(0, rel.length - budget) };
}

/** chave de agrupamento: material + sombra + célula 16 m (frustum culling continua por célula) */
export function batchKey(matId, cast, recv, cx, cy, cz, cell = BATCH_CELL) {
  return `${matId}|${cast ? 1 : 0}${recv ? 1 : 0}|${Math.floor(cx / cell)},${Math.floor(cy / 10)},${Math.floor(cz / cell)}`;
}

const _box = new THREE.Box3(), _v = new THREE.Vector3(), _sph = new THREE.Sphere(), _m = new THREE.Matrix4();

export class Perf {
  constructor(game) {
    this.game = game;
    this.frustum = new THREE.Frustum();
    this.proxies = []; this.slots = [];
    this.stats = { batched: 0, batches: 0, lightSources: 0, lightProxies: 0, lightsUsed: 0, culledView: 0, culledBudget: 0,
      far: 90, shadowUpdates: 0, shadowSkips: 0, animSkips: 0, frozenRigs: 0, idleSkips: 0, capSkips: 0 };
    this._shT = 0; this._cfg = null;
  }

  apply(cfg) {
    this._cfg = cfg;
    const r = this.game.renderer;
    // sombras: o three refaz o mapa sozinho só se autoUpdate; aqui controlamos a taxa
    r.shadowMap.autoUpdate = false; r.shadowMap.needsUpdate = true;
    this._shInt = shadowInterval(cfg.shadows);
    if (this.game.scene && this._budget !== this._wantBudget()) this._buildProxies();
  }

  // ---------- 1. agrupamento estático ----------
  batchStatic(scene = this.game.scene) {
    if (!scene || this.game.settings?.get?.('staticBatch') === false) return 0;
    const groups = new Map(), parents = new Set();
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      if (!o.isMesh || !o.userData.batchable || o.userData.batched) return;
      const mat = o.material;
      if (!mat || Array.isArray(mat) || mat.transparent || mat.opacity < 1 || !o.visible) return;
      let p = o.parent, ok = true; while (p) { if (!p.visible) { ok = false; break; } p = p.parent; }
      if (!ok) return;
      o.geometry.computeBoundingBox(); _box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); _box.getCenter(_v);
      const k = batchKey(mat.uuid, o.castShadow, o.receiveShadow, _v.x, _v.y, _v.z);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(o);
    });
    let merged = 0, batches = 0;
    for (const list of groups.values()) {
      if (list.length < 2) continue;
      const geos = list.map((o) => { const g = o.geometry.index ? o.geometry.clone() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld); return g; });
      const geo = mergeGeometries(geos, false);
      for (const g of geos) g.dispose();
      if (!geo) continue;
      geo.computeBoundingSphere(); geo.computeBoundingBox();
      const src = list[0];
      const m = new THREE.Mesh(geo, src.material);
      m.name = 'staticBatch'; m.castShadow = src.castShadow; m.receiveShadow = src.receiveShadow;
      m.userData.staticBatch = list.length; m.userData.batched = true;
      if (src.userData.castOrig !== undefined) m.userData.castOrig = src.userData.castOrig;
      m.matrixAutoUpdate = false; m.updateMatrix();
      scene.add(m);
      for (const o of list) { parents.add(o.parent); o.parent.remove(o); o.geometry.dispose(); o.userData.batched = true; }
      merged += list.length; batches++;
    }
    this.stats.batched += merged; this.stats.batches += batches;
    return merged;
  }

  // ---------- 2. orçamento de luzes ----------
  _wantBudget() { return this._cfg?.lightBudget ?? 8; }
  _isSource(o) {
    return o.isPointLight && !o.userData.lightProxy && o !== this.game.fill && !o.userData.realLight;
  }
  /** chamado ao montar um capítulo: cria o conjunto fixo de proxies */
  onWorld() {
    this.stats.batched = 0; this.stats.batches = 0;
    this.batchStatic();
    this._buildProxies();
  }
  _buildProxies() {
    const sc = this.game.scene; if (!sc) return;
    for (const p of this.proxies) { p.parent?.remove(p); p.shadow?.map?.dispose(); p.dispose?.(); }
    this.proxies = []; this.slots = [];
    let nSrc = 0;
    sc.traverse((o) => { if (this._isSource(o)) nSrc++; });
    const budget = (this._budget = this._wantBudget());
    // nunca mais proxies do que fontes existentes no capítulo (+2 para luzes que nascem depois: frascos dos chefes)
    const n = Math.max(2, Math.min(budget, nSrc + 2));
    for (let i = 0; i < n; i++) {
      const p = new THREE.PointLight(0xffffff, 0, 1, 2);
      p.name = 'lightProxy'; p.userData.lightProxy = true; p.userData.noShadow = true;
      sc.add(p);
      this.proxies.push(p); this.slots.push({ src: null, w: 0, fadeIn: false });
    }
    this.stats.lightProxies = n;
  }
  _effVisible(o) {
    const sc = this.game.scene;
    for (let p = o; p; p = p.parent) { if (!p.visible) return false; if (p === sc) return true; }
    return false; // fora da cena
  }
  updateLights(dt, camera) {
    const sc = this.game.scene; if (!sc || !this.proxies.length) return;
    const srcs = [];
    sc.traverse((o) => { if (this._isSource(o)) srcs.push(o); });
    this.stats.lightSources = srcs.length;
    const fr = this.frustum, slotOf = new Map();
    this.slots.forEach((s, i) => { if (s.src) slotOf.set(s.src, i); });
    const cands = [];
    for (const L of srcs) {
      if (!L.layers.isEnabled(LIGHT_LAYER) || L.layers.isEnabled(0)) { L.layers.set(LIGHT_LAYER); L.updateWorldMatrix(true, false); }
      _v.setFromMatrixPosition(L.matrixWorld);
      const vis = this._effVisible(L);
      cands.push({ id: L, x: _v.x, y: _v.y, z: _v.z, r: L.distance > 0 ? L.distance : Infinity, i: vis ? L.intensity : 0, shadow: vis && L.castShadow, cur: slotOf.has(L) });
    }
    const cp = camera.position;
    const sel = selectLights(cands, this.proxies.length, cp, (c) => {
      if (!Number.isFinite(c.r)) return true;
      _sph.center.set(c.x, c.y, c.z); _sph.radius = c.r + 2; return fr.intersectsSphere(_sph);
    });
    this.stats.culledView = sel.culledView; this.stats.culledBudget = sel.culledBudget;
    const want = new Set(sel.pick);
    // libera / esmaece quem saiu
    const fade = dt / 0.25;
    for (const s of this.slots) {
      if (!s.src) continue;
      if (!want.has(s.src)) { s.w -= fade; if (s.w <= 0 || !this._effVisible(s.src)) { s.src = null; s.w = 0; } }
      else if (s.w < 1) s.w = Math.min(1, s.w + fade);
    }
    // ocupa slots livres: entra na hora quem acabou de aparecer na tela (ou acendeu); esmaece quem estava na tela
    // mas fora do orçamento e ganhou a vaga agora
    for (const L of sel.pick) {
      const k = slotOf.get(L);
      if (k !== undefined && this.slots[k].src === L) continue;
      const s = this.slots.find((x) => !x.src); if (!s) break;
      s.src = L; s.w = L.userData._lbBudgetCut ? 0.0001 : 1;
    }
    for (const c of cands) c.id.userData._lbBudgetCut = !!c.rel && !want.has(c.id);
    // copia o estado das fontes para os proxies
    let used = 0;
    for (let i = 0; i < this.proxies.length; i++) {
      const P = this.proxies[i], s = this.slots[i], L = s.src;
      if (!L || !this._effVisible(L)) { P.intensity = 0; if (P.castShadow) { P.castShadow = false; this._forceShadow = true; } P.userData.src = null; continue; }
      used++;
      P.position.setFromMatrixPosition(L.matrixWorld);
      P.color.copy(L.color); P.intensity = L.intensity * s.w; P.distance = L.distance; P.decay = L.decay;
      if (P.castShadow !== L.castShadow) { P.castShadow = L.castShadow; this._forceShadow = true; }
      if (P.userData.src !== L) { P.userData.src = L; if (L.castShadow) this._forceShadow = true; }
      if (L.castShadow) {
        const a = L.shadow, b = P.shadow;
        if (b.mapSize.x !== a.mapSize.x) { b.mapSize.copy(a.mapSize); b.map?.dispose(); b.map = null; }
        b.bias = a.bias; b.normalBias = a.normalBias; b.radius = a.radius; b.camera.near = a.camera.near;
      }
    }
    this.stats.lightsUsed = used;
  }

  // ---------- quadro ----------
  /** antes de renderizar: frustum, plano distante, luzes e taxa das sombras */
  preRender(dt, camera) {
    const cfg = this._cfg || {};
    const far = fogFar(this.game.scene?.fog, cfg.drawDist);
    if (Math.abs(camera.far - far) > 0.01) { camera.far = far; camera.updateProjectionMatrix(); }
    this.stats.far = +far.toFixed(1);
    camera.updateMatrixWorld();
    _m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(_m);
    this.updateLights(dt, camera);
    const r = this.game.renderer;
    if (r.shadowMap.enabled) {
      this._shT += dt;
      if (this._shT >= (this._shInt ?? 0) - 1e-4 || this._forceShadow) { r.shadowMap.needsUpdate = true; this._shT = 0; this._forceShadow = false; this.stats.shadowUpdates++; }
      else this.stats.shadowSkips++;
    }
  }

  /** inimigo longe E fora da tela? (LOD de animação) */
  farOffscreen(pos, distMin = 28) {
    const c = this.game.camera.position;
    const dx = pos.x - c.x, dz = pos.z - c.z;
    if (dx * dx + dz * dz < distMin * distMin) return false;
    _sph.center.set(pos.x, pos.y + 1, pos.z); _sph.radius = 1.6;
    return !this.frustum.intersectsSphere(_sph);
  }

  debug() { return { ...this.stats, budget: this._budget ?? null, proxies: this.proxies.length, shadowHz: this._shInt ? Math.round(1 / this._shInt) : 'todo quadro' }; }
}

/** congela/descongela as matrizes de um esqueleto parado (corpo caído, dormente) */
// (só os filhos: a raiz segue livre — se ela se mover/afundar, o three recalcula o mundo dos filhos a partir das
// matrizes locais congeladas, que continuam certas porque a pose não muda)
export function freezeRig(root, on) {
  if (!root) return;
  if (on) {
    for (const c of root.children) c.traverse((o) => { o.updateMatrix(); o.matrixAutoUpdate = false; });
    root.updateMatrixWorld(true);
  } else for (const c of root.children) c.traverse((o) => { o.matrixAutoUpdate = true; });
}
