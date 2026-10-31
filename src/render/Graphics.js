// Opções gráficas reais: predefinições (Baixa/Média/Alta/Ultra) + ajustes individuais, salvos nas Settings e
// aplicados ao vivo no renderizador:
//   resolução interna · sombras dinâmicas (as luzes mais próximas do jogador projetam sombra; em Alta/Ultra o
//   cenário também bloqueia a luz) · partículas (quantidade de sangue/faíscas e poeira/cinza no ar) · bloom
//   (brilho das lâmpadas, brasas e olhos) · pós-processamento (gradação de cor, vinheta e granulação de filme)
//   · antisserrilhado (FXAA) · filtragem anisotrópica das texturas.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

export const GFX_KEYS = ['renderScale', 'shadows', 'particles', 'bloom', 'postfx', 'antialias'];
export const GFX_PRESETS = {
  baixa: { renderScale: 0.5, shadows: 'off', particles: 'baixa', bloom: false, postfx: false, antialias: false },
  media: { renderScale: 0.75, shadows: 'baixa', particles: 'media', bloom: true, postfx: true, antialias: false },
  alta: { renderScale: 1, shadows: 'alta', particles: 'alta', bloom: true, postfx: true, antialias: true },
  ultra: { renderScale: 1.25, shadows: 'ultra', particles: 'alta', bloom: true, postfx: true, antialias: true },
};
export const GFX_LABELS = { baixa: 'Baixa', media: 'Média', alta: 'Alta', ultra: 'Ultra', custom: 'Personalizada' };
// sombras: quantas luzes projetam sombra, tamanho do mapa, filtro e se o cenário (paredes/props) bloqueia a luz
export const SHADOW_LEVELS = {
  off: { lights: 0, size: 0, soft: false, world: false },
  baixa: { lights: 1, size: 256, soft: false, world: false },
  alta: { lights: 2, size: 512, soft: true, world: true },
  ultra: { lights: 3, size: 1024, soft: true, world: true },
};
// partículas: multiplicador de emissão, tamanho do pool, poeira/cinza no ar e poças de sangue sob os corpos
export const PARTICLE_LEVELS = {
  baixa: { mult: 0.5, pool: 120, dust: 0, pools: false },
  media: { mult: 1, pool: 200, dust: 160, pools: true },
  alta: { mult: 1.6, pool: 360, dust: 380, pools: true },
};
// cor da poeira por capítulo: pó de hospital, fuligem, incenso, cinza da cidade, gotas, pó de museu, cal, cinza
const DUST = { 1: 0xb8b2a0, 2: 0x6a5a50, 3: 0xc8a878, 4: 0x9a9a98, 5: 0x8aa0a0, 6: 0xc0b8a0, 7: 0xd8d4c8, 8: 0xff9a5a };

/** predefinição que corresponde exatamente aos valores atuais (ou 'custom') */
export function detectPreset(s) {
  for (const [id, p] of Object.entries(GFX_PRESETS)) if (GFX_KEYS.every((k) => p[k] === s[k])) return id;
  return 'custom';
}
/** valores resolvidos (com fallback seguro para valores inválidos) */
export function resolveGfx(s) {
  const base = GFX_PRESETS.media;
  const o = {};
  for (const k of GFX_KEYS) o[k] = s[k] ?? base[k];
  if (!SHADOW_LEVELS[o.shadows]) o.shadows = base.shadows;
  if (!PARTICLE_LEVELS[o.particles]) o.particles = base.particles;
  o.renderScale = Math.min(1.5, Math.max(0.35, +o.renderScale || base.renderScale));
  o.shadow = SHADOW_LEVELS[o.shadows]; o.part = PARTICLE_LEVELS[o.particles];
  return o;
}

// gradação de cor + vinheta + granulação + leve aberração cromática nas bordas — roda DEPOIS do OutputPass
// (espaço de tela sRGB), então não escurece a cena: só puxa a cor para o tom sépia/frio do jogo
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, vignette: { value: 0.34 }, grain: { value: 0.03 },
    contrast: { value: 1.06 }, saturation: { value: 0.88 }, tint: { value: new THREE.Vector3(1.02, 1.0, 0.96) }, ca: { value: 0.0016 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, vignette, grain, contrast, saturation, ca; uniform vec3 tint; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + time*61.7) * 43758.5453); }
    void main(){
      vec2 d = vUv - 0.5; float r2 = dot(d,d);
      vec2 off = d * ca * r2 * 4.0;
      vec3 c = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      float l = dot(c, vec3(0.2126,0.7152,0.0722));
      c = mix(vec3(l), c, saturation) * tint;
      c = (c - 0.28) * contrast + 0.28 + 0.012;
      c *= 1.0 - vignette * smoothstep(0.1, 0.7, r2 * 1.7);
      c += (hash(vUv*vec2(1733.0,977.0)) - 0.5) * grain;
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

export class Graphics {
  constructor(game) {
    this.game = game; this.renderer = game.renderer;
    this.stats = { renders: 0, composerRenders: 0, shadowCasters: 0, worldCasters: 0, dust: 0, aniso: 1, reselects: 0 };
    this.dust = null; this.t = 0; this._pickT = 0;
    this.maxAniso = this.renderer.capabilities?.getMaxAnisotropy?.() || 1;
    this.apply();
  }
  get cfg() { return resolveGfx(this.game.settings.data); }

  /** aplica tudo (chamado ao abrir o jogo, ao trocar uma opção e ao montar cada capítulo) */
  apply() {
    const c = (this.current = this.cfg), r = this.renderer;
    // sombras
    const sh = c.shadow;
    const wasEnabled = r.shadowMap.enabled, wasSoft = !!this._soft;
    r.shadowMap.enabled = sh.lights > 0;
    // three r18x: PCFSoftShadowMap foi descontinuado; o PCF filtra com shadow.radius (suavidade por luz)
    r.shadowMap.type = THREE.PCFShadowMap; this._soft = !!(sh.soft && r.shadowMap.enabled);
    if (wasEnabled !== r.shadowMap.enabled || wasSoft !== sh.soft) this._materialsDirty();
    this._applyShadowLights(true);
    this._applyWorldCasters();
    // pós-processamento
    this._buildComposer();
    // partículas
    this.game.combat?.setQuality?.(c.part);
    this._buildDust();
    // texturas
    this._applyAniso();
    this.game.resize?.();
  }

  _materialsDirty() {
    const seen = new Set();
    const mark = (m) => { if (m && !seen.has(m)) { seen.add(m); m.needsUpdate = true; } };
    for (const m of Object.values(this.game.materials || {})) mark(m);
    this.game.scene?.traverse((o) => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(mark); });
  }

  _applyAniso() {
    const a = this.current.renderScale >= 1 ? Math.min(8, this.maxAniso) : this.current.renderScale >= 0.75 ? Math.min(4, this.maxAniso) : 1;
    const seen = new Set();
    const fix = (m) => {
      if (!m) return;
      for (const k of ['map', 'normalMap', 'roughnessMap', 'bumpMap', 'emissiveMap']) {
        const t = m[k]; if (!t || seen.has(t)) continue; seen.add(t);
        if (t.anisotropy !== a) { t.anisotropy = a; t.needsUpdate = true; }
      }
    };
    for (const m of Object.values(this.game.materials || {})) fix(m);
    this.game.scene?.traverse((o) => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(fix); });
    this.stats.aniso = a;
  }

  // ---- sombras dinâmicas: as K luzes visíveis mais próximas do jogador projetam sombra ----
  _shadowCandidates() {
    const sc = this.game.scene; if (!sc) return [];
    const out = [];
    for (const o of sc.children) {
      if (!(o.isPointLight || o.isSpotLight) || !o.visible || o === this.game.fill || o.userData.noShadow) continue;
      if (o.intensity < 0.25 || (o.distance && o.distance < 3)) continue;
      out.push(o);
    }
    return out;
  }
  _applyShadowLights(force = false) {
    const sc = this.game.scene; if (!sc) return;
    const sh = this.current.shadow, p = this.game.player?.pos;
    const cands = this._shadowCandidates();
    if (p) for (const L of cands) L.userData._sd = Math.hypot(L.position.x - p.x, (L.position.y - p.y) * 1.5, L.position.z - p.z) - (L.distance || 10) * 0.25;
    cands.sort((a, b) => (a.userData._sd ?? 0) - (b.userData._sd ?? 0));
    const pick = new Set(cands.slice(0, sh.lights));
    let n = 0, changed = false;
    sc.traverse((o) => {
      if (!o.isLight || o.isAmbientLight || o.isHemisphereLight) return;
      const on = pick.has(o);
      if (o.castShadow !== on) { o.castShadow = on; changed = true; }
      if (on) {
        n++;
        if (o.shadow.mapSize.x !== sh.size) { o.shadow.mapSize.set(sh.size, sh.size); o.shadow.map?.dispose(); o.shadow.map = null; }
        o.shadow.bias = -0.002; o.shadow.normalBias = 0.03; o.shadow.radius = sh.soft ? 3 : 1;
        o.shadow.camera.near = 0.15; o.shadow.camera.far = Math.max(4, o.distance || 12);
      }
    });
    if (changed && !force) this.stats.reselects++;
    this.stats.shadowCasters = n;
  }
  // em Alta/Ultra o cenário (paredes, portas, móveis) também projeta sombra: a luz não atravessa paredes
  _applyWorldCasters() {
    const sc = this.game.scene; if (!sc) return;
    const on = this.current.shadow.world;
    let n = 0;
    sc.traverse((o) => {
      if (!o.isMesh || o.isSkinnedMesh) return;
      if (o.userData.castOrig === undefined) o.userData.castOrig = o.castShadow;
      if (o.userData.castOrig) return; // personagens, armas e portas já projetam
      const transp = o.material && (o.material.transparent || o.material.opacity < 1);
      const want = on && o.receiveShadow && !transp;
      if (o.castShadow !== want) o.castShadow = want;
      if (want) n++;
    });
    this.stats.worldCasters = n;
  }

  // ---- composer ----
  _buildComposer() {
    const c = this.current, r = this.renderer;
    const need = c.bloom || c.postfx || c.antialias;
    if (this.composer) { this.composer.dispose?.(); this.composer = null; }
    this.bloom = this.grade = this.fxaa = null;
    if (!need) return;
    const comp = new EffectComposer(r);
    this.renderPass = new RenderPass(null, null); comp.addPass(this.renderPass);
    if (c.bloom) { this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.38, 0.82); comp.addPass(this.bloom); }
    comp.addPass(new OutputPass());
    if (c.postfx) { this.grade = new ShaderPass(GradeShader); comp.addPass(this.grade); }
    if (c.antialias) { this.fxaa = new ShaderPass(FXAAShader); comp.addPass(this.fxaa); }
    this.composer = comp;
    this.resize();
  }
  resize() {
    if (!this.composer) return;
    const sz = this.renderer.getSize(new THREE.Vector2());
    this.composer.setPixelRatio(1);
    this.composer.setSize(sz.x, sz.y);
    if (this.bloom) this.bloom.resolution.set(Math.max(64, sz.x / 2), Math.max(64, sz.y / 2));
    if (this.fxaa) this.fxaa.material.uniforms.resolution.value.set(1 / Math.max(1, sz.x), 1 / Math.max(1, sz.y));
  }

  // ---- poeira / cinza suspensa no ar em volta da câmera ----
  _buildDust() {
    if (this.dust) { this.dust.parent?.remove(this.dust); this.dust.geometry.dispose(); this.dust.material.dispose(); this.dust = null; }
    const sc = this.game.scene, n = this.current.part.dust;
    this.stats.dust = 0;
    if (!sc || !n) return;
    const pos = new Float32Array(n * 3), cam = this.game.camera.position;
    this._dustSeed = Array.from({ length: n }, (_, i) => ({ ph: i * 2.39996, sp: 0.15 + (i % 7) * 0.04 }));
    for (let i = 0; i < n; i++) { pos[i * 3] = cam.x + (Math.random() - 0.5) * 14; pos[i * 3 + 1] = cam.y + (Math.random() - 0.5) * 6; pos[i * 3 + 2] = cam.z + (Math.random() - 0.5) * 14; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const ch = this.game.chapter || 1;
    const mat = new THREE.PointsMaterial({ color: DUST[ch] || 0xb0a898, size: ch === 8 ? 0.045 : 0.03, transparent: true, opacity: ch === 8 ? 0.75 : 0.45, depthWrite: false, map: dotTexture(), alphaTest: 0.02 });
    if (ch === 8) mat.blending = THREE.AdditiveBlending;
    this.dust = new THREE.Points(geo, mat); this.dust.frustumCulled = false; this.dust.name = 'gfxDust'; this.dust.userData.ch = ch;
    sc.add(this.dust);
    this.stats.dust = n;
  }
  _updateDust(dt) {
    const d = this.dust; if (!d) return;
    const a = d.geometry.attributes.position.array, cam = this.game.camera.position, n = a.length / 3;
    const fall = d.userData.ch === 8 ? -0.12 : d.userData.ch === 5 ? -0.5 : -0.03;
    for (let i = 0; i < n; i++) {
      const s = this._dustSeed[i], k = i * 3;
      a[k] += Math.sin(this.t * 0.3 + s.ph) * s.sp * dt; a[k + 1] += (fall + Math.sin(this.t * 0.5 + s.ph * 1.3) * 0.05) * dt; a[k + 2] += Math.cos(this.t * 0.27 + s.ph) * s.sp * dt;
      // mantém a nuvem num cubo de 14 × 6 × 14 m em volta da câmera (repõe pelo lado oposto)
      if (a[k] - cam.x > 7) a[k] -= 14; else if (a[k] - cam.x < -7) a[k] += 14;
      if (a[k + 1] - cam.y > 3) a[k + 1] -= 6; else if (a[k + 1] - cam.y < -3) a[k + 1] += 6;
      if (a[k + 2] - cam.z > 7) a[k + 2] -= 14; else if (a[k + 2] - cam.z < -7) a[k + 2] += 14;
    }
    d.geometry.attributes.position.needsUpdate = true;
  }

  /** novo capítulo montado: recria poeira, refaz casters do cenário e anisotropia */
  onWorld() {
    this.apply();
  }

  update(dt) {
    this.t += dt;
    this._pickT -= dt;
    if (this._pickT <= 0) { this._pickT = 0.4; if (this.current.shadow.lights) this._applyShadowLights(); }
    this._updateDust(dt);
  }

  render(scene, camera) {
    this.stats.renders++;
    if (this.composer) {
      this.renderPass.scene = scene; this.renderPass.camera = camera;
      if (this.grade) this.grade.uniforms.time.value = this.t % 100;
      this.composer.render();
      this.stats.composerRenders++;
    } else this.renderer.render(scene, camera);
  }

  debug() {
    const c = this.current;
    return { preset: detectPreset(this.game.settings.data), scale: c.renderScale, shadows: c.shadows, shadowMap: this.renderer.shadowMap.enabled, soft: !!this._soft,
      particles: c.particles, pool: this.game.combat?.maxP ?? null, bloom: !!this.bloom, grade: !!this.grade, fxaa: !!this.fxaa, composer: !!this.composer,
      size: this.renderer.getSize(new THREE.Vector2()).toArray(), ...this.stats };
  }
}

let _dot = null;
function dotTexture() {
  if (_dot) return _dot;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const x = c.getContext('2d'); const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  _dot = new THREE.CanvasTexture(c); return _dot;
}
export { dotTexture };
