// pt58u: fogo procedural compartilhado — sprites com shader de ruído animado, brasas, fumaça
// e heat haze (só Alta/Ultra). Reusa a luz já existente do cenário; não cria luzes extras.
import * as THREE from 'three';

export const FIRE_QUALITY = {
  baixa: { planes: 2, embers: 0, smoke: 0, haze: false },
  media: { planes: 2, embers: 14, smoke: 6, haze: false },
  alta: { planes: 3, embers: 24, smoke: 12, haze: true },
  ultra: { planes: 3, embers: 32, smoke: 16, haze: true },
};

export function fireQualityFor(cfg) {
  const p = cfg?.particles;
  if (p === 'baixa' || (cfg?.renderScale ?? 1) < 0.6) return FIRE_QUALITY.baixa;
  if (p === 'alta' && (cfg?.renderScale ?? 1) >= 1.2) return FIRE_QUALITY.ultra;
  if (p === 'alta' || (cfg?.renderScale ?? 1) >= 1) return FIRE_QUALITY.alta;
  return FIRE_QUALITY.media;
}

let _quality = FIRE_QUALITY.media;
let _fires = [];
let _candles = [];
let _dot = null;
let _hazeMat = null;
const _planeGeo = new THREE.PlaneGeometry(0.7, 1.15);
const _candleGeo = new THREE.PlaneGeometry(0.06, 0.12);
const _hazeGeo = new THREE.PlaneGeometry(0.9, 1.4);

const FlameShader = {
  uniforms: { uTime: { value: 0 }, uSeed: { value: 0 }, uIntensity: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform float uTime, uSeed, uIntensity; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)) + uSeed) * 43758.5453); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      float a = hash(i), b = hash(i+vec2(1.0,0.0)), c = hash(i+vec2(0.0,1.0)), d = hash(i+vec2(1.0,1.0));
      vec2 u = f*f*(3.0-2.0*f);
      return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
    }
    void main(){
      vec2 uv = vUv;
      float n1 = noise(uv * vec2(3.2, 2.2) + vec2(0.0, -uTime * 1.55));
      float n2 = noise(uv * vec2(6.5, 4.4) + vec2(1.3, -uTime * 2.35));
      float n3 = noise(uv * vec2(11.0, 7.0) + vec2(-0.7, -uTime * 3.1));
      float f = n1 * 0.5 + n2 * 0.32 + n3 * 0.18;
      float maskX = smoothstep(0.0, 0.18, uv.x) * smoothstep(1.0, 0.82, uv.x);
      float maskY = pow(max(0.0, 1.0 - uv.y), 0.55) * smoothstep(-0.05, 0.12, uv.y);
      float a = clamp(maskX * maskY * (0.45 + f * 0.85) * 1.55 * uIntensity, 0.0, 1.0);
      vec3 col = mix(vec3(0.65, 0.06, 0.0), vec3(1.0, 0.55, 0.08), clamp(f + uv.y * 0.3, 0.0, 1.0));
      col = mix(col, vec3(1.0, 0.92, 0.55), pow(max(0.0, f - 0.25), 1.4) * (1.0 - uv.y));
      gl_FragColor = vec4(col * a, a);
    }`,
};

const HazeShader = {
  uniforms: { uTime: { value: 0 } },
  vertexShader: `varying vec2 vUv; uniform float uTime;
    void main(){ vUv = uv; vec3 p = position; p.x += sin(uTime * 6.0 + position.y * 8.0) * 0.04;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
  fragmentShader: `uniform float uTime; varying vec2 vUv;
    void main(){
      float n = fract(sin(dot(vUv * 18.0 + uTime * 2.0, vec2(12.9898, 78.233))) * 43758.5453);
      float a = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.4, vUv.y) * 0.11 * (0.6 + n * 0.4);
      a *= smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
      gl_FragColor = vec4(1.0, 0.85, 0.65, a);
    }`,
};

function softDot() {
  if (_dot) return _dot;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const x = c.getContext('2d'); const g = x.createRadialGradient(8, 8, 0, 8, 8, 8);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 16, 16);
  _dot = new THREE.CanvasTexture(c);
  _dot.colorSpace = THREE.NoColorSpace;
  return _dot;
}

function flameMat(seed) {
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(FlameShader.uniforms),
    vertexShader: FlameShader.vertexShader,
    fragmentShader: FlameShader.fragmentShader,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  m.uniforms.uSeed.value = seed;
  return m;
}

function hazeMat() {
  if (!_hazeMat) {
    _hazeMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(HazeShader.uniforms),
      vertexShader: HazeShader.vertexShader,
      fragmentShader: HazeShader.fragmentShader,
      transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide,
    });
  }
  return _hazeMat;
}

function makePoints(n, color, size, opacity, additive) {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) pos[i * 3 + 1] = -99;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color, size, transparent: true, opacity, depthWrite: false,
    map: softDot(), alphaTest: 0.02, sizeAttenuation: true,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.name = additive ? 'fireEmbers' : 'fireSmoke';
  return { pts, pos, life: new Float32Array(n), n };
}

/**
 * @param {object} o { x, y, z, scale=1, light?, parent|group, lit?, dim? }
 */
export function createFire(o) {
  const s = o.scale ?? 1;
  const root = new THREE.Group();
  root.position.set(o.x, o.y, o.z);
  root.name = 'fireFX';
  const planes = [];
  const seed = Math.random() * 50;
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(_planeGeo, flameMat(seed + i * 11));
    m.scale.set(s, s, 1);
    m.position.y = 0.55 * s;
    m.rotation.y = i * Math.PI / 3;
    m.frustumCulled = false;
    m.name = 'fireFlame';
    root.add(m);
    planes.push(m);
  }
  const embers = makePoints(32, 0xffa040, 0.05 * s, 0.9, true);
  const smoke = makePoints(16, 0x3a342c, 0.18 * s, 0.28, false);
  root.add(embers.pts);
  root.add(smoke.pts);
  const haze = new THREE.Mesh(_hazeGeo, hazeMat());
  haze.scale.set(s, s, 1);
  haze.position.y = 0.9 * s;
  haze.frustumCulled = false;
  haze.name = 'fireHaze';
  haze.visible = false;
  root.add(haze);
  (o.parent || o.group).add(root);

  const fx = {
    root, planes, embers, smoke, haze, light: o.light || null, scale: s,
    lit: o.lit !== false, t: Math.random() * 10,
    baseIntensity: o.light?.intensity ?? o.base ?? 2.6,
    dim: o.dim ?? 0.4,
    ph: Math.random() * 10,
  };
  fx.update = (dt, t, cam) => updateFire(fx, dt, t, cam);
  fx.setLit = (on) => {
    fx.lit = !!on;
    fx.root.visible = !!on;
    if (!on && fx.light) fx.light.intensity = fx.dim;
  };
  _fires.push(fx);
  applyQuality(fx, _quality);
  return fx;
}

/** chama pequena (velas): um plano com o mesmo shader, sem partículas/haze */
export function createCandleFlame(o) {
  const m = new THREE.Mesh(_candleGeo, flameMat(Math.random() * 80));
  m.position.set(o.x, o.y, o.z);
  m.frustumCulled = false;
  m.name = 'candleFlame';
  m.userData.ph = Math.random() * 10;
  (o.parent || o.group).add(m);
  _candles.push(m);
  return m;
}

function applyQuality(fx, q) {
  fx.planes.forEach((p, i) => { p.visible = i < q.planes; });
  fx.embers.pts.visible = q.embers > 0 && fx.lit;
  fx.smoke.pts.visible = q.smoke > 0 && fx.lit;
  fx.haze.visible = !!(q.haze && fx.lit);
  fx._q = q;
}

export function setFireQuality(q) {
  _quality = q || FIRE_QUALITY.media;
  for (const f of _fires) if (f.root.parent) applyQuality(f, _quality);
}

export function pruneFires() {
  _fires = _fires.filter((f) => f.root.parent);
  _candles = _candles.filter((m) => m.parent);
}

export function updateAllFires(dt, t, camera) {
  pruneFires();
  if (_hazeMat) _hazeMat.uniforms.uTime.value = t;
  for (const f of _fires) updateFire(f, dt, t, camera);
  for (const m of _candles) {
    if (!m.visible || !m.parent) continue;
    const flick = 0.85 + 0.12 * Math.sin(t * 11 + m.userData.ph) + (Math.random() - 0.5) * 0.08;
    m.material.uniforms.uTime.value = t;
    m.material.uniforms.uIntensity.value = flick;
    m.scale.set(1, 0.85 + flick * 0.25, 1);
  }
}

export function updateFire(fx, dt, t, camera) {
  if (!fx.lit) {
    fx.root.visible = false;
    return;
  }
  // honra flame.visible = false imposto pelo cenário (ex.: lâmpada da Cinza quebrada)
  if (!fx.root.visible) return;
  fx.t += dt;
  const q = fx._q || _quality;
  const flick = 0.82 + 0.12 * Math.sin(t * 9 + fx.ph) + 0.08 * Math.sin(t * 23 + fx.ph * 2) + (Math.random() - 0.5) * 0.06;
  for (const p of fx.planes) {
    if (!p.visible) continue;
    p.material.uniforms.uTime.value = t;
    p.material.uniforms.uIntensity.value = flick;
    p.scale.set(fx.scale, fx.scale * (0.9 + flick * 0.2), 1);
  }
  if (fx.light) fx.light.intensity = fx.baseIntensity * (0.75 + flick * 0.35);
  if (fx.haze.visible) {
    if (camera) {
      fx.haze.lookAt(camera.position);
    } else {
      fx.haze.rotation.y = t * 0.15;
    }
  }
  const s = fx.scale;
  stepPoints(fx.embers, dt, q.embers, s, t, 0.55, 0.12, 0.4, 1.1);
  stepPoints(fx.smoke, dt, q.smoke, s, t, 0.22, 0.06, 0.8, 2.0, true);
}

function stepPoints(pack, dt, count, s, t, rise, sway, lifeMin, lifeMax, isSmoke) {
  if (count <= 0) { pack.pts.visible = false; return; }
  pack.pts.visible = true;
  const { pos, life, n } = pack;
  const use = Math.min(count, n);
  for (let i = 0; i < n; i++) {
    const p = i * 3;
    if (i >= use) { pos[p + 1] = -99; life[i] = 0; continue; }
    if (life[i] <= 0) {
      life[i] = lifeMin + Math.random() * (lifeMax - lifeMin);
      pos[p] = (Math.random() - 0.5) * 0.35 * s;
      pos[p + 1] = Math.random() * 0.2 * s;
      pos[p + 2] = (Math.random() - 0.5) * 0.35 * s;
    } else {
      life[i] -= dt;
      const k = i;
      pos[p + 1] += (rise + (k % 5) * 0.06) * s * dt;
      if (isSmoke) {
        pos[p] += 0.08 * s * dt;
        pos[p + 2] += Math.sin(t + k) * 0.05 * s * dt;
      } else {
        pos[p] += Math.sin(t * 3 + k) * sway * s * dt;
        pos[p + 2] += Math.cos(t * 2.4 + k) * sway * s * dt;
      }
    }
  }
  pack.pts.geometry.attributes.position.needsUpdate = true;
}

export function fireCount() { return _fires.length; }
