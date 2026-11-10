// pt61u: atmosfera barata — cartões de névoa volumétrica (ruído em world-space), feixes aditivos
// (god-ray falso sob luminárias/janelas) e cinzas caindo ao ar livre. Tudo em pool/InstancedMesh,
// sem alocação por quadro e sem luzes permanentes. A qualidade segue a predefinição
// (Baixa = quase nada, Ultra = completo) e a cor/opacidade acompanham a FogExp2 da cena.
import * as THREE from 'three';

export const ATMO_QUALITY = {
  baixa: { fog: 0, rays: 0, ash: 0 },
  media: { fog: 3, rays: 3, ash: 80 },
  alta: { fog: 5, rays: 6, ash: 180 },
  ultra: { fog: 7, rays: 10, ash: 280 },
};

export function atmoQualityFor(cfg) {
  const p = cfg?.particles;
  if (p === 'baixa' || (cfg?.renderScale ?? 1) < 0.6) return ATMO_QUALITY.baixa;
  if (p === 'alta' && (cfg?.renderScale ?? 1) >= 1.2) return ATMO_QUALITY.ultra;
  if (p === 'alta' || (cfg?.renderScale ?? 1) >= 1) return ATMO_QUALITY.alta;
  return ATMO_QUALITY.media;
}

const FogShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x0a100c) },
    uOpacity: { value: 0.16 },
    uCam: { value: new THREE.Vector3() },
  },
  vertexShader: `varying vec3 vWp; varying vec2 vUv;
    void main(){
      vUv = uv;
      vec4 wp = vec4(position, 1.0);
      #ifdef USE_INSTANCING
      wp = instanceMatrix * wp;
      #endif
      vWp = (modelMatrix * wp).xyz;
      gl_Position = projectionMatrix * viewMatrix * vec4(vWp, 1.0);
    }`,
  fragmentShader: `uniform float uTime, uOpacity; uniform vec3 uColor, uCam; varying vec3 vWp; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      float a = hash(i), b = hash(i+vec2(1.0,0.0)), c = hash(i+vec2(0.0,1.0)), d = hash(i+vec2(1.0,1.0));
      vec2 u = f*f*(3.0-2.0*f);
      return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
    }
    void main(){
      vec2 w = vWp.xz * 0.18 + vec2(uTime * 0.03, uTime * 0.02);
      float n = noise(w) * 0.55 + noise(w * 2.3 + 17.0) * 0.3 + noise(w * 5.1 - 9.0) * 0.15;
      float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x)
                 * smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
      float dist = length(vWp - uCam);
      float fade = 1.0 - smoothstep(8.0, 18.0, dist);
      float a = clamp(n * edge * uOpacity * fade, 0.0, 0.45);
      if (a < 0.004) discard;
      gl_FragColor = vec4(uColor, a);
    }`,
};

const RayShader = {
  uniforms: {
    uTime: { value: 0 },
    uCam: { value: new THREE.Vector3() },
  },
  vertexShader: `varying vec3 vWp; varying vec2 vUv; varying vec3 vCol;
    attribute vec3 instColor;
    void main(){
      vUv = uv;
      vCol = instColor;
      vec4 wp = vec4(position, 1.0);
      #ifdef USE_INSTANCING
      wp = instanceMatrix * wp;
      #endif
      vWp = (modelMatrix * wp).xyz;
      gl_Position = projectionMatrix * viewMatrix * vec4(vWp, 1.0);
    }`,
  fragmentShader: `uniform float uTime; uniform vec3 uCam; varying vec3 vWp; varying vec2 vUv; varying vec3 vCol;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      float n = hash(vec2(vUv.x * 18.0, floor(vUv.y * 12.0 + uTime * 0.15)));
      float shaft = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
      shaft *= (1.0 - vUv.y) * (0.45 + n * 0.55);
      float dist = length(vWp - uCam);
      float fade = 1.0 - smoothstep(10.0, 22.0, dist);
      float a = shaft * 0.22 * fade;
      if (a < 0.004) discard;
      gl_FragColor = vec4(vCol * a, a);
    }`,
};

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

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);
const _look = new THREE.Vector3();
const _cands = [];

export class Atmosphere {
  constructor(game) {
    this.game = game;
    this.q = ATMO_QUALITY.media;
    this.stats = { fog: 0, rays: 0, ash: 0, outside: false, low: false };
    this.t = 0; this._pickT = 0;
    this._fogMat = null; this._rayMat = null;
    this.fog = null; this.rays = null; this.ash = null;
    this._rayColor = null;
    this._ashSeed = null;
  }

  setQuality(q) {
    const next = q || ATMO_QUALITY.media;
    const same = this.q && this.q.fog === next.fog && this.q.rays === next.rays && this.q.ash === next.ash;
    this.q = next;
    if (!same || !this.fog) this._rebuild();
  }

  dispose() {
    const drop = (m) => {
      if (!m) return;
      m.parent?.remove(m);
      m.geometry?.dispose?.();
      // materiais são recriados no rebuild; descartar os atuais
    };
    drop(this.fog); drop(this.rays); drop(this.ash);
    this._fogMat?.dispose?.(); this._rayMat?.dispose?.();
    this.fog = this.rays = this.ash = null;
    this._fogMat = this._rayMat = null;
    this._rayColor = null; this._ashSeed = null;
    this.stats.fog = this.stats.rays = this.stats.ash = 0;
  }

  _rebuild() {
    const sc = this.game.scene;
    this.dispose();
    if (!sc) return;
    const q = this.q;
    if (q.fog > 0) {
      this._fogMat = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(FogShader.uniforms),
        vertexShader: FogShader.vertexShader,
        fragmentShader: FogShader.fragmentShader,
        transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
      });
      const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), this._fogMat, q.fog);
      mesh.frustumCulled = false; mesh.name = 'atmoFog'; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.count = q.fog; mesh.userData.castOrig = false;
      sc.add(mesh); this.fog = mesh;
    }
    if (q.rays > 0) {
      this._rayMat = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(RayShader.uniforms),
        vertexShader: RayShader.vertexShader,
        fragmentShader: RayShader.fragmentShader,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      });
      const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), this._rayMat, q.rays);
      mesh.frustumCulled = false; mesh.name = 'atmoRays'; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.count = q.rays; mesh.userData.castOrig = false;
      const col = new Float32Array(q.rays * 3);
      for (let i = 0; i < q.rays; i++) { col[i * 3] = 1; col[i * 3 + 1] = 0.9; col[i * 3 + 2] = 0.7; }
      mesh.geometry.setAttribute('instColor', new THREE.InstancedBufferAttribute(col, 3));
      this._rayColor = mesh.geometry.getAttribute('instColor');
      sc.add(mesh); this.rays = mesh;
    }
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
    this.stats.fog = q.fog; this.stats.rays = 0; this.stats.ash = q.ash;
  }

  /** sem teto a até 8 m acima = lado de fora */
  isOutside() {
    const g = this.game, p = g.player?.pos; if (!p || !g.col) return false;
    const t = g.col.raycast({ x: p.x, y: p.y + 1.2, z: p.z }, { x: 0, y: 1, z: 0 }, 8, (b) => b.tag === 'ceiling' || b.tag === 'wall');
    return !(t < 8);
  }

  _lowFog(p, fog) {
    if (!p) return false;
    const dens = fog?.density ?? 0;
    if (p.y < 0.4) return true;
    if (dens >= 0.08) return true;
    const z = this.game.level?.zone;
    if (z && /morgue|laundry|furnace|deadArchive|crypt|canal|reserv|agua|água/i.test(String(z))) return true;
    const ch = this.game.chapter || 1;
    if (ch === 5) return true;
    return false;
  }

  _collectLights(cam, max) {
    const sc = this.game.scene; if (!sc) return 0;
    _cands.length = 0;
    for (const o of sc.children) {
      if (!(o.isPointLight || o.isSpotLight) || !o.visible) continue;
      if (o.userData.lightProxy || o.userData.noShadow) continue;
      if (o === this.game.fill) continue;
      if (o.intensity < 0.35 || (o.distance && o.distance < 3)) continue;
      const dx = o.position.x - cam.x, dy = o.position.y - cam.y, dz = o.position.z - cam.z;
      const d2 = dx * dx + dy * dy * 1.4 + dz * dz;
      _cands.push(o);
      o.userData._ad = d2;
    }
    _cands.sort((a, b) => (a.userData._ad ?? 0) - (b.userData._ad ?? 0));
    return Math.min(max, _cands.length);
  }

  update(dt, time) {
    this.t = time ?? (this.t + dt);
    const cam = this.game.camera?.position, fog = this.game.scene?.fog, p = this.game.player?.pos;
    if (!cam) return;
    const outside = this.isOutside();
    const low = this._lowFog(p, fog);
    this.stats.outside = outside; this.stats.low = low;

    if (this._fogMat) {
      const u = this._fogMat.uniforms;
      u.uTime.value = this.t;
      u.uCam.value.copy(cam);
      if (fog?.color) u.uColor.value.copy(fog.color).offsetHSL(0, 0, 0.12);
      const dens = fog?.density ?? 0.06;
      u.uOpacity.value = (low ? 0.22 : 0.08) * Math.min(1.6, dens / 0.06);
    }
    if (this.fog) this._placeFog(cam, p, low);

    if (this._rayMat) {
      this._rayMat.uniforms.uTime.value = this.t;
      this._rayMat.uniforms.uCam.value.copy(cam);
    }
    this._pickT -= dt;
    if (this.rays && this._pickT <= 0) { this._pickT = 0.28; this._placeRays(cam); }
    else if (this.rays) this._billboardRays(cam);

    this._updateAsh(dt, cam, outside);
  }

  _placeFog(cam, p, low) {
    const n = this.q.fog, mesh = this.fog; if (!mesh || n <= 0) return;
    const y0 = (p?.y ?? cam.y - 1.5);
    for (let i = 0; i < n; i++) {
      if (i === 0) {
        // camada baixa no chão (porões, necrotério, águas) — some quando não cabe
        const on = low || n === 1;
        _p.set(cam.x, y0 + 0.32, cam.z);
        _e.set(-Math.PI / 2, 0, 0);
        _q.setFromEuler(_e);
        _s.set(on ? 14 : 0.001, on ? 14 : 0.001, 1);
      } else {
        const ang = this.t * 0.04 + i * (Math.PI * 2 / Math.max(1, n - 1));
        const r = 3.2 + (i % 3) * 1.6;
        _p.set(cam.x + Math.cos(ang) * r, y0 + 0.9 + (i % 2) * 0.7, cam.z + Math.sin(ang) * r);
        _look.set(cam.x, _p.y, cam.z);
        _m.lookAt(_p, _look, _up);
        _q.setFromRotationMatrix(_m);
        _s.set(4.5 + (i % 3), 2.2 + (i % 2) * 0.6, 1);
      }
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere?.();
    this.stats.fog = n;
  }

  _placeRays(cam) {
    const mesh = this.rays, n = this.q.rays; if (!mesh || n <= 0) return;
    const k = this._collectLights(cam, n);
    const attr = this._rayColor;
    for (let i = 0; i < n; i++) {
      const L = i < k ? _cands[i] : null;
      if (!L) { _s.set(0.001, 0.001, 1); _p.copy(cam); _q.identity(); _m.compose(_p, _q, _s); mesh.setMatrixAt(i, _m); continue; }
      const len = Math.min(4.2, Math.max(1.8, (L.distance || 8) * 0.35));
      const w = 0.45 + Math.min(1.2, L.intensity * 0.12);
      _p.set(L.position.x, L.position.y - len * 0.5 - 0.1, L.position.z);
      _look.set(cam.x, _p.y, cam.z);
      _m.lookAt(_p, _look, _up);
      _q.setFromRotationMatrix(_m);
      _s.set(w, len, 1);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
      if (attr) {
        const c = L.color;
        attr.setXYZ(i, c.r * 1.1, c.g * 1.0, c.b * 0.85);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (attr) attr.needsUpdate = true;
    this.stats.rays = k;
  }

  _billboardRays(cam) {
    // entre as escolhas de luz, só reorienta o yaw para a câmera (sem reler a lista)
    const mesh = this.rays, n = this.q.rays; if (!mesh) return;
    for (let i = 0; i < n && i < (_cands.length || 0); i++) {
      mesh.getMatrixAt(i, _m);
      _m.decompose(_p, _q, _s);
      if (_s.x < 0.01) continue;
      _look.set(cam.x, _p.y, cam.z);
      const m2 = _m; // reuse after decompose
      m2.lookAt(_p, _look, _up);
      _q.setFromRotationMatrix(m2);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
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
    return { ...this.stats, q: { ...this.q } };
  }
}
