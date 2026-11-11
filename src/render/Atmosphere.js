// Atmosfera: cinzas caindo ao ar livre (pool de Points, sem alocação por quadro).
// pt64u: os cartões de névoa volumétrica e os feixes aditivos (god-ray falso) foram
// removidos — deixavam um véu claro esverdeado no fundo dos corredores (a cor era
// clareada em relação à FogExp2) e custavam fill-rate: shaders transparentes/aditivos
// em DoubleSide, sem frustum cull, atualizados todo quadro. A névoa da cena volta a
// ser só a FogExp2 original, escura; a poeira no ar (Graphics) permanece.
import * as THREE from 'three';

export const ATMO_QUALITY = {
  baixa: { fog: 0, rays: 0, ash: 0 },
  media: { fog: 0, rays: 0, ash: 80 },
  alta: { fog: 0, rays: 0, ash: 180 },
  ultra: { fog: 0, rays: 0, ash: 280 },
};

export function atmoQualityFor(cfg) {
  const p = cfg?.particles;
  if (p === 'baixa' || (cfg?.renderScale ?? 1) < 0.6) return ATMO_QUALITY.baixa;
  if (p === 'alta' && (cfg?.renderScale ?? 1) >= 1.2) return ATMO_QUALITY.ultra;
  if (p === 'alta' || (cfg?.renderScale ?? 1) >= 1) return ATMO_QUALITY.alta;
  return ATMO_QUALITY.media;
}

function softDot() {
  if (softDot._t) return softDot._t;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const x = c.getContext('2d'); const g = x.createRadialGradient(8, 8, 0, 8, 8, 8);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 16, 16);
  softDot._t = new THREE.CanvasTexture(c); softDot._t.colorSpace = THREE.NoColorSpace;
  return softDot._t;
}

const _p = new THREE.Vector3();

export class Atmosphere {
  constructor(game) {
    this.game = game;
    this.q = ATMO_QUALITY.media;
    this.stats = { fog: 0, rays: 0, ash: 0, outside: false, low: false };
    this.t = 0;
    this.fog = null; this.rays = null; this.ash = null;
    this._ashSeed = null;
  }

  setQuality(q) {
    const next = q || ATMO_QUALITY.media;
    const same = this.q && this.q.ash === next.ash;
    this.q = next;
    if (!same || (next.ash > 0 && !this.ash) || (next.ash === 0 && this.ash)) this._rebuild();
  }

  dispose() {
    const drop = (m) => {
      if (!m) return;
      m.parent?.remove(m);
      m.geometry?.dispose?.();
      m.material?.dispose?.();
    };
    drop(this.ash);
    this.fog = this.rays = this.ash = null;
    this._ashSeed = null;
    this.stats.fog = this.stats.rays = this.stats.ash = 0;
  }

  _rebuild() {
    const sc = this.game.scene;
    this.dispose();
    if (!sc) return;
    const q = this.q;
    // cartões de névoa e feixes nunca são montados (pt64u)
    this.stats.fog = 0; this.stats.rays = 0;
    if (q.ash > 0) {
      const n = q.ash, pos = new Float32Array(n * 3);
      const cam = this.game.camera?.position || _p.set(0, 1, 0);
      this._ashSeed = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) {
        pos[i * 3] = cam.x + (Math.random() - 0.5) * 20;
        pos[i * 3 + 1] = cam.y + Math.random() * 9;
        pos[i * 3 + 2] = cam.z + (Math.random() - 0.5) * 20;
        this._ashSeed[i * 2] = i * 2.39996; this._ashSeed[i * 2 + 1] = 0.7 + (i % 5) * 0.18;
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        color: 0x9a9890, size: 0.055, sizeAttenuation: true, transparent: true, opacity: 0.7,
        depthWrite: false, map: softDot(), alphaTest: softDot() ? 0.02 : 0,
      });
      const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.name = 'atmoAsh'; pts.visible = false;
      sc.add(pts); this.ash = pts;
    }
    this.stats.ash = q.ash;
  }

  /** sem teto a até 8 m acima = lado de fora */
  isOutside() {
    const g = this.game, p = g.player?.pos; if (!p || !g.col) return false;
    const t = g.col.raycast({ x: p.x, y: p.y + 1.2, z: p.z }, { x: 0, y: 1, z: 0 }, 8, (b) => b.tag === 'ceiling' || b.tag === 'wall');
    return !(t < 8);
  }

  update(dt, time) {
    this.t = time ?? (this.t + dt);
    const cam = this.game.camera?.position, p = this.game.player?.pos;
    if (!cam) return;
    const outside = this.isOutside();
    this.stats.outside = outside;
    this.stats.low = false;
    this.stats.fog = 0;
    this.stats.rays = 0;
    this._updateAsh(dt, cam, outside);
  }

  _updateAsh(dt, cam, outside) {
    const d = this.ash; if (!d) return;
    d.visible = !!outside;
    this.stats.ash = outside ? this.q.ash : 0;
    if (!outside) return;
    const a = d.geometry.attributes.position.array, n = a.length / 3, seed = this._ashSeed;
    for (let i = 0; i < n; i++) {
      const k = i * 3, ph = seed[i * 2], sp = seed[i * 2 + 1];
      a[k] += Math.sin(this.t * 0.4 + ph) * 0.25 * dt;
      a[k + 1] -= (0.65 + sp * 0.2) * dt;
      a[k + 2] += Math.cos(this.t * 0.33 + ph) * 0.18 * dt;
      if (a[k] - cam.x > 10) a[k] -= 20; else if (a[k] - cam.x < -10) a[k] += 20;
      if (a[k + 1] < cam.y - 2) a[k + 1] += 9;
      if (a[k + 1] > cam.y + 8) a[k + 1] -= 9;
      if (a[k + 2] - cam.z > 10) a[k + 2] -= 20; else if (a[k + 2] - cam.z < -10) a[k + 2] += 20;
    }
    d.geometry.attributes.position.needsUpdate = true;
  }

  debug() {
    return { ...this.stats, q: { ...this.q }, hasFog: !!this.fog, hasRays: !!this.rays, hasAsh: !!this.ash };
  }
}
