// Texturas procedurais em canvas (estilo PS2: baixa resolução + filtro nearest). Sem assets externos.
// pt58u: 128 px nas superfícies grandes, variação (sujeira, ferrugem, rejunte irregular, desgaste),
// bump maps baratos e uma detail texture compartilhada para quebrar o tiling no espaço do mundo.
import * as THREE from 'three';

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function make(size, draw, seed = 1, { bump = false } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  draw(g, size, rng(seed));
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestMipmapLinearFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 1;
  t.generateMipmaps = true;
  if (bump) t.bump = bumpFrom(c, seed + 7919);
  return t;
}

/** bump a partir da luminância do albedo + ruído fino (Linear, sem sRGB — só relevo) */
function bumpFrom(src, seed) {
  const s = src.width, c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  const img = g.getImageData(0, 0, s, s), d = img.data, r = rng(seed);
  for (let i = 0; i < d.length; i += 4) {
    const y = (d[i] * 0.35 + d[i + 1] * 0.45 + d[i + 2] * 0.2) + (r() - 0.5) * 18;
    const v = Math.max(0, Math.min(255, y));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 1;
  return t;
}

function grime(g, s, r, n, col, maxR) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = col.replace('A', (0.03 + r() * 0.14).toFixed(3));
    const rad = 1 + r() * maxR;
    g.beginPath(); g.arc(r() * s, r() * s, rad, 0, Math.PI * 2); g.fill();
  }
}
/** ruído de alta frequência (quebra o tiling “de borracha”) */
function film(g, s, r, amt = 0.07) {
  const img = g.getImageData(0, 0, s, s), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amt * 255;
    d[i] = d[i] + n; d[i + 1] = d[i + 1] + n; d[i + 2] = d[i + 2] + n;
  }
  g.putImageData(img, 0, 0);
}
function drips(g, s, r, n, col) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = col.replace('A', (0.08 + r() * 0.18).toFixed(3));
    const x = r() * s, w = 1 + r() * 2.5, h = r() * s * (0.3 + r() * 0.7);
    g.fillRect(x, r() * s * 0.15, w, h);
  }
}

export function createDetailTexture() {
  if (typeof document === 'undefined') return null;
  const s = 128, c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d'), r = rng(4242);
  const img = g.createImageData(s, s), d = img.data;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const i = (y * s + x) * 4;
    const n = (Math.sin(x * 0.37 + y * 0.21) * 0.5 + Math.sin(x * 1.7 - y * 1.1) * 0.25 + (r() - 0.5)) * 0.5 + 0.5;
    const v = Math.max(0, Math.min(255, n * 255));
    d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 1;
  return t;
}

export function createTextures() {
  const T = {};
  // Ladrilho hospitalar: 8×8 com rejunte irregular, lascas e manchas que atravessam o grout
  T.tile = make(128, (g, s, r) => {
    g.fillStyle = '#2a2e28'; g.fillRect(0, 0, s, s);
    const n = 8, cell = s / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = 0.82 + r() * 0.28, odd = (x + y) % 2;
      const jx = (r() - 0.5) * 1.4, jy = (r() - 0.5) * 1.4;
      const inset = 1 + r() * 1.2;
      g.fillStyle = odd
        ? `rgb(${80 * v | 0},${98 * v | 0},${82 * v | 0})`
        : `rgb(${148 * v | 0},${146 * v | 0},${124 * v | 0})`;
      g.fillRect(x * cell + inset + jx, y * cell + inset + jy, cell - inset * 2, cell - inset * 2);
      if (r() < 0.12) { // canto lascado
        g.fillStyle = 'rgba(20,24,18,0.55)';
        g.beginPath(); g.moveTo(x * cell + inset, y * cell + inset);
        g.lineTo(x * cell + inset + 3 + r() * 5, y * cell + inset);
        g.lineTo(x * cell + inset, y * cell + inset + 3 + r() * 5); g.fill();
      }
    }
    grime(g, s, r, 160, 'rgba(30,25,10,A)', 8);
    grime(g, s, r, 40, 'rgba(90,20,10,A)', 5);
    film(g, s, r, 0.05);
  }, 3, { bump: true });

  T.wall = make(128, (g, s, r) => {
    g.fillStyle = '#a49c7e'; g.fillRect(0, 0, s, s);
    // reboco irregular (manchas de tom)
    grime(g, s, r, 80, 'rgba(160,150,120,A)', 18);
    g.fillStyle = '#42563f'; g.fillRect(0, s * 0.55, s, s * 0.45);
    g.fillStyle = '#2b2a20'; g.fillRect(0, s * 0.53 + (r() - 0.5) * 2, s, 3);
    // descascado no dado
    for (let i = 0; i < 8; i++) {
      g.fillStyle = `rgba(${90 + r() * 40 | 0},${80 + r() * 20 | 0},50,${0.25 + r() * 0.3})`;
      g.fillRect(r() * s, s * 0.52 + r() * 8, 6 + r() * 14, 3 + r() * 6);
    }
    grime(g, s, r, 140, 'rgba(40,32,15,A)', 7);
    drips(g, s, r, 18, 'rgba(60,45,20,A)');
    // infiltração no encontro com o teto (faixas úmidas descendo)
    for (let i = 0; i < 5; i++) {
      const x = r() * s, w = 8 + r() * 18;
      const grd = g.createLinearGradient(x, 0, x, s * 0.45);
      grd.addColorStop(0, `rgba(50,42,28,${0.28 + r() * 0.2})`);
      grd.addColorStop(1, 'rgba(50,42,28,0)');
      g.fillStyle = grd; g.fillRect(x, 0, w, s * 0.5);
    }
    film(g, s, r, 0.04);
  }, 7, { bump: true });

  T.wallLower = make(128, (g, s, r) => {
    g.fillStyle = '#7d8a7a'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 16) for (let x = (y / 16) % 2 ? 0 : 16; x < s; x += 32) {
      g.fillStyle = `rgba(220,230,210,${0.05 + r() * 0.12})`;
      g.fillRect(x + (r() - 0.5), y + (r() - 0.5), 15, 7);
    }
    grime(g, s, r, 120, 'rgba(50,20,10,A)', 8);
    drips(g, s, r, 8, 'rgba(40,30,15,A)');
    film(g, s, r, 0.05);
  }, 11, { bump: true });

  T.ceiling = make(128, (g, s, r) => {
    g.fillStyle = '#5b584b'; g.fillRect(0, 0, s, s);
    grime(g, s, r, 140, 'rgba(10,10,5,A)', 10);
    // manchas de infiltração (água parada no contrapiso, descendo em leque)
    for (let i = 0; i < 7; i++) {
      const x = r() * s, y = r() * s * 0.45, rad = 10 + r() * 22;
      const grd = g.createRadialGradient(x, y, 1, x, y, rad);
      grd.addColorStop(0, `rgba(${40 + r() * 30 | 0},${38 + r() * 16 | 0},${24},0.45)`);
      grd.addColorStop(1, 'rgba(40,36,24,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
      g.fillStyle = `rgba(50,42,28,${0.12 + r() * 0.18})`;
      g.fillRect(x - 1.2, y, 2 + r() * 2, s * (0.25 + r() * 0.55));
    }
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.strokeRect(.5, .5, s - 1, s - 1);
    drips(g, s, r, 16, 'rgba(30,26,16,A)');
    film(g, s, r, 0.05);
  }, 13, { bump: true });

  T.metal = make(64, (g, s, r) => {
    g.fillStyle = '#5d5f5a'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y++) { g.fillStyle = `rgba(220,220,210,${r() * 0.08})`; g.fillRect(0, y, s, 1); }
    for (let i = 0; i < 280; i++) { g.fillStyle = `rgba(${120 + r() * 60 | 0},${60 + r() * 30 | 0},20,${r() * 0.3})`; g.fillRect(r() * s, r() * s, 2, 2); }
    // arranhões
    for (let i = 0; i < 10; i++) {
      g.strokeStyle = `rgba(255,255,240,${0.08 + r() * 0.1})`; g.lineWidth = 1;
      g.beginPath(); g.moveTo(r() * s, r() * s); g.lineTo(r() * s, r() * s); g.stroke();
    }
    g.fillStyle = 'rgba(0,0,0,.4)'; for (let i = 4; i < s; i += 12) { g.fillRect(i + (r() - 0.5) * 2, 3, 2, 2); g.fillRect(i, s - 5, 2, 2); }
    film(g, s, r, 0.06);
  }, 17, { bump: true });

  T.rust = make(64, (g, s, r) => {
    g.fillStyle = '#5a3b22'; g.fillRect(0, 0, s, s);
    grime(g, s, r, 180, 'rgba(160,80,30,A)', 5);
    grime(g, s, r, 40, 'rgba(20,10,5,A)', 4);
    drips(g, s, r, 8, 'rgba(120,40,10,A)');
    film(g, s, r, 0.06);
  }, 19, { bump: true });

  T.wood = make(64, (g, s, r) => {
    for (let y = 0; y < s; y++) {
      const v = 0.68 + Math.sin(y * 0.9 + r() * 2) * 0.1 + Math.sin(y * 0.17) * 0.06 + r() * 0.1;
      g.fillStyle = `rgb(${92 * v | 0},${62 * v | 0},${38 * v | 0})`; g.fillRect(0, y, s, 1);
    }
    // nós
    for (let i = 0; i < 3; i++) {
      const x = r() * s, y = r() * s;
      g.fillStyle = 'rgba(40,24,12,0.45)'; g.beginPath(); g.ellipse(x, y, 3 + r() * 4, 2 + r() * 2, r(), 0, 7); g.fill();
    }
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 15, s, 1); g.fillRect(0, 40, s, 1);
    film(g, s, r, 0.05);
  }, 23, { bump: true });

  T.sheet = make(32, (g, s, r) => {
    g.fillStyle = '#bdb8a4'; g.fillRect(0, 0, s, s);
    grime(g, s, r, 35, 'rgba(110,20,10,A)', 4);
    grime(g, s, r, 30, 'rgba(90,80,40,A)', 5);
    film(g, s, r, 0.05);
  }, 29);

  T.concrete = make(128, (g, s, r) => {
    g.fillStyle = '#4b4a44'; g.fillRect(0, 0, s, s);
    grime(g, s, r, 280, 'rgba(0,0,0,A)', 4);
    grime(g, s, r, 100, 'rgba(120,120,100,A)', 3);
    // fissuras
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      g.beginPath(); g.moveTo(r() * s, r() * s);
      g.lineTo(r() * s, r() * s); g.stroke();
    }
    film(g, s, r, 0.06);
  }, 31, { bump: true });

  T.blood = make(128, (g, s, r) => {
    g.clearRect(0, 0, s, s);
    for (let i = 0; i < 36; i++) {
      g.fillStyle = `rgba(${60 + r() * 50 | 0},${4 + r() * 8 | 0},3,${0.45 + r() * 0.45})`;
      const rad = 2 + r() * 16;
      g.beginPath(); g.arc(s / 2 + (r() - .5) * s * .7, s / 2 + (r() - .5) * s * .7, rad, 0, 7); g.fill();
    }
    // respingos
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(${80 + r() * 40 | 0},8,4,${0.35 + r() * 0.4})`;
      g.fillRect(r() * s, r() * s, 1 + r() * 2, 1 + r() * 2);
    }
  }, 37);

  T.paper = make(32, (g, s, r) => {
    g.fillStyle = '#d6cba8'; g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(40,30,20,.6)'; for (let y = 5; y < s - 3; y += 3) g.fillRect(4, y, 10 + r() * 16, 1);
    grime(g, s, r, 8, 'rgba(80,60,30,A)', 3);
  }, 41);

  T.gown = make(32, (g, s, r) => {
    g.fillStyle = '#8d9483'; g.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 6) { g.fillStyle = 'rgba(40,60,50,.35)'; g.fillRect(x, 0, 2, s); }
    grime(g, s, r, 24, 'rgba(90,10,5,A)', 4);
  }, 43);

  T.skin = make(16, (g, s, r) => { g.fillStyle = '#b39a84'; g.fillRect(0, 0, s, s); grime(g, s, r, 12, 'rgba(90,40,40,A)', 2); }, 47);
  T.deadSkin = make(16, (g, s, r) => { g.fillStyle = '#8c8f7c'; g.fillRect(0, 0, s, s); grime(g, s, r, 16, 'rgba(60,10,10,A)', 3); }, 53);
  T.bandage = make(16, (g, s, r) => { g.fillStyle = '#cfc6ad'; g.fillRect(0, 0, s, s); g.fillStyle = 'rgba(0,0,0,.15)'; for (let y = 0; y < s; y += 3) g.fillRect(0, y, s, 1); grime(g, s, r, 6, 'rgba(120,10,5,A)', 2); }, 59);
  T.leather = make(16, (g, s, r) => { g.fillStyle = '#3a2618'; g.fillRect(0, 0, s, s); grime(g, s, r, 30, 'rgba(90,10,5,A)', 3); }, 61);
  T.hazard = make(32, (g, s) => { for (let i = -s; i < s * 2; i += 8) { g.fillStyle = (i / 8) % 2 ? '#b08a1c' : '#1b1a14'; g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 8, 0); g.lineTo(i + 8 - s, s); g.lineTo(i - s, s); g.fill(); } }, 67);

  T.morgueWall = make(128, (g, s, r) => {
    g.fillStyle = '#9fb3a4'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const v = 0.88 + r() * 0.18;
      g.fillStyle = `rgba(${200 * v | 0},${220 * v | 0},${205 * v | 0},.55)`;
      g.fillRect(x * 8 + 1, y * 8 + 1, 6, 6);
    }
    grime(g, s, r, 100, 'rgba(40,60,30,A)', 6);
    drips(g, s, r, 10, 'rgba(70,90,40,A)');
    film(g, s, r, 0.04);
  }, 71, { bump: true });

  T.morgueFloor = make(128, (g, s, r) => {
    g.fillStyle = '#5d6a60'; g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(20,30,22,.75)';
    for (let i = 0; i <= 16; i++) {
      g.beginPath(); g.moveTo(i * 8 + .5 + (r() - 0.5), 0); g.lineTo(i * 8 + .5, s);
      g.moveTo(0, i * 8 + .5); g.lineTo(s, i * 8 + .5); g.stroke();
    }
    grime(g, s, r, 120, 'rgba(60,10,5,A)', 7);
    grime(g, s, r, 80, 'rgba(20,40,20,A)', 5);
    film(g, s, r, 0.05);
  }, 73, { bump: true });

  T.steel = make(64, (g, s, r) => {
    g.fillStyle = '#8b938e'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y++) { g.fillStyle = `rgba(255,255,255,${r() * 0.07})`; g.fillRect(0, y, s, 1); }
    grime(g, s, r, 40, 'rgba(40,30,20,A)', 3);
    g.strokeStyle = 'rgba(20,20,20,.7)'; g.strokeRect(.5, .5, s - 1, s - 1);
    film(g, s, r, 0.05);
  }, 79, { bump: true });

  T.brick = make(128, (g, s, r) => {
    g.fillStyle = '#3a2a22'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < 16; y++) for (let x = -1; x < 8; x++) {
      const v = 0.65 + r() * 0.4, ox = (y % 2) * 8;
      g.fillStyle = `rgb(${120 * v | 0},${62 * v | 0},${44 * v | 0})`;
      const jx = (r() - 0.5) * 1.2, jy = (r() - 0.5) * 0.8;
      g.fillRect(x * 16 + ox + 1 + jx, y * 8 + 1 + jy, 14 - r(), 6 - r() * 0.6);
    }
    grime(g, s, r, 180, 'rgba(0,0,0,A)', 8);
    drips(g, s, r, 8, 'rgba(10,8,6,A)');
    film(g, s, r, 0.05);
  }, 83, { bump: true });

  T.chapelWall = make(128, (g, s, r) => {
    g.fillStyle = '#8f8064'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#5c5446'; g.fillRect(0, s * 0.7, s, s * 0.3);
    for (let x = 0; x < s; x += 16) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + (r() - 0.5), s * 0.7, 1, s * 0.3); }
    g.fillStyle = '#3a342a'; g.fillRect(0, s * 0.68, s, 2);
    grime(g, s, r, 140, 'rgba(40,30,15,A)', 7);
    drips(g, s, r, 8, 'rgba(30,20,10,A)');
    film(g, s, r, 0.04);
  }, 89, { bump: true });

  T.stone = make(128, (g, s, r) => {
    g.fillStyle = '#6a665c'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) {
      const v = 0.78 + r() * 0.32;
      g.fillStyle = `rgba(${150 * v | 0},${144 * v | 0},${128 * v | 0},.6)`;
      g.fillRect(x * 32 + (y % 2) * 16 + 1, y * 16 + 1, 30, 14);
    }
    grime(g, s, r, 140, 'rgba(0,0,0,A)', 5);
    film(g, s, r, 0.05);
  }, 97, { bump: true });

  T.ash = make(64, (g, s, r) => {
    g.fillStyle = '#2e2c29'; g.fillRect(0, 0, s, s);
    grime(g, s, r, 200, 'rgba(150,145,135,A)', 3);
    grime(g, s, r, 30, 'rgba(255,120,40,A)', 2);
    film(g, s, r, 0.06);
  }, 101, { bump: true });

  T.blueprint = make(32, (g, s, r) => {
    g.fillStyle = '#2a4a78'; g.fillRect(0, 0, s, s); g.strokeStyle = 'rgba(220,230,255,.7)';
    for (let i = 0; i < 6; i++) { g.strokeRect(2 + r() * 18, 2 + r() * 18, 4 + r() * 10, 4 + r() * 10); }
  }, 103);

  T.detail = createDetailTexture();
  return T;
}

/** bytes aproximados de VRAM (RGBA × mipmaps ≈ 1,33×) das texturas procedurais */
export function textureBytes(T) {
  let n = 0;
  const add = (t) => { if (!t?.image) return; const w = t.image.width || 0, h = t.image.height || 0; n += w * h * 4 * 1.33; };
  for (const k in T) {
    if (k === 'detail' || !T[k]) continue;
    if (T[k].isTexture) { add(T[k]); add(T[k].bump); }
  }
  add(T.detail);
  return n;
}

/** quantidade de detalhe no mundo e relevo do bump, por predefinição (Baixa continua leve) */
export function detailForGfx(cfg) {
  const s = cfg?.renderScale ?? 0.75;
  if (s < 0.6) return { detail: 0.12, bump: 0.018 };
  if (s < 1) return { detail: 0.5, bump: 0.042 };
  if (s < 1.2) return { detail: 0.75, bump: 0.06 };
  return { detail: 0.9, bump: 0.075 };
}

export function installWorldDetail(materials, detailTex) {
  if (!detailTex) return;
  for (const m of Object.values(materials)) {
    if (!m || !m.isMaterial || !m.map || m.transparent || m.userData?.noDetail || m.userData?.worldDetail) continue;
    if (m.isMeshBasicMaterial) continue;
    m.userData.worldDetail = true;
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (shader, renderer) => {
      prev?.(shader, renderer);
      shader.uniforms.uDetail = { value: detailTex };
      shader.uniforms.uDetailAmt = { value: 0.5 };
      m.userData.detailUniforms = shader.uniforms;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWp;\nvarying vec3 vWn;')
        .replace('#include <project_vertex>', 'vec4 wp = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nwp = instanceMatrix * wp;\n#endif\nvWp = (modelMatrix * wp).xyz;\nvWn = mat3(modelMatrix) * objectNormal;\n#include <project_vertex>');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vWn; uniform sampler2D uDetail; uniform float uDetailAmt;')
        .replace('#include <map_fragment>', `#include <map_fragment>
          if (uDetailAmt > 0.001) {
            vec3 n = abs(normalize(vWn));
            n /= max(n.x + n.y + n.z, 0.0001);
            float d1 = texture2D(uDetail, vWp.zy * 0.35).r * n.x
                     + texture2D(uDetail, vWp.xz * 0.35).r * n.y
                     + texture2D(uDetail, vWp.xy * 0.35).r * n.z;
            float d2 = texture2D(uDetail, vWp.zy * 1.65).g * n.x
                     + texture2D(uDetail, vWp.xz * 1.65 + vWp.y * 0.31).g * n.y
                     + texture2D(uDetail, vWp.xy * 1.65).g * n.z;
            float d = (d1 * 0.62 + d2 * 0.38) * 2.0 - 1.0;
            diffuseColor.rgb *= 1.0 + d * uDetailAmt * 0.18;
          }`);
    };
    m.needsUpdate = true;
  }
}

export function setSurfaceDetail(materials, { detail, bump }) {
  for (const m of Object.values(materials)) {
    if (!m || !m.isMaterial) continue;
    if (m.userData?.detailUniforms) m.userData.detailUniforms.uDetailAmt.value = detail;
    if (m.bumpMap && m.userData?.baseBump != null) m.bumpScale = m.userData.baseBump * (bump / 0.042);
  }
}
