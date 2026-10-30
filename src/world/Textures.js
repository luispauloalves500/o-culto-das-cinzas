// Texturas procedurais em canvas (estilo PS2: baixa resolução + filtro nearest). Sem assets externos.
import * as THREE from 'three';

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function make(size, draw, seed = 1) {
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
  return t;
}
function grime(g, s, r, n, col, maxR) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = col.replace('A', (0.03 + r() * 0.12).toFixed(3));
    const rad = 1 + r() * maxR;
    g.beginPath(); g.arc(r() * s, r() * s, rad, 0, Math.PI * 2); g.fill();
  }
}

export function createTextures() {
  const T = {};
  // Ladrilho hospitalar verde gasto
  T.tile = make(64, (g, s, r) => {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const v = 0.85 + r() * 0.2;
      const odd = (x + y) % 2;
      g.fillStyle = odd ? `rgb(${88 * v | 0},${104 * v | 0},${86 * v | 0})` : `rgb(${150 * v | 0},${150 * v | 0},${128 * v | 0})`;
      g.fillRect(x * 16, y * 16, 16, 16);
    }
    g.strokeStyle = 'rgba(20,24,18,.8)'; g.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 16 + .5, 0); g.lineTo(i * 16 + .5, s); g.moveTo(0, i * 16 + .5); g.lineTo(s, i * 16 + .5); g.stroke(); }
    grime(g, s, r, 70, 'rgba(30,25,10,A)', 6);
  }, 3);
  // Parede: barra verde embaixo, creme sujo em cima (a textura cobre 2 m de altura)
  T.wall = make(64, (g, s, r) => {
    g.fillStyle = '#a49c7e'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#42563f'; g.fillRect(0, s * 0.55, s, s * 0.45);
    g.fillStyle = '#2b2a20'; g.fillRect(0, s * 0.53, s, 3);
    grime(g, s, r, 90, 'rgba(40,32,15,A)', 5);
    for (let i = 0; i < 6; i++) { // escorridos
      g.fillStyle = 'rgba(60,45,20,.18)'; const x = r() * s; g.fillRect(x, 0, 1 + r() * 2, r() * s);
    }
  }, 7);
  T.wallLower = make(64, (g, s, r) => {
    g.fillStyle = '#7d8a7a'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 8) for (let x = (y / 8) % 2 ? 0 : 8; x < s; x += 16) { g.fillStyle = `rgba(220,230,210,${0.05 + r() * 0.1})`; g.fillRect(x, y, 15, 7); }
    grime(g, s, r, 80, 'rgba(50,20,10,A)', 6);
  }, 11);
  T.ceiling = make(32, (g, s, r) => {
    g.fillStyle = '#5b584b'; g.fillRect(0, 0, s, s);
    grime(g, s, r, 40, 'rgba(10,10,5,A)', 5);
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.strokeRect(.5, .5, s - 1, s - 1);
  }, 13);
  T.metal = make(32, (g, s, r) => {
    g.fillStyle = '#5d5f5a'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 200; i++) { g.fillStyle = `rgba(${120 + r() * 60 | 0},${60 + r() * 30 | 0},20,${r() * 0.25})`; g.fillRect(r() * s, r() * s, 2, 2); }
    g.fillStyle = 'rgba(0,0,0,.4)'; for (let i = 4; i < s; i += 12) { g.fillRect(i, 3, 2, 2); g.fillRect(i, s - 5, 2, 2); }
  }, 17);
  T.rust = make(32, (g, s, r) => {
    g.fillStyle = '#5a3b22'; g.fillRect(0, 0, s, s);
    grime(g, s, r, 120, 'rgba(160,80,30,A)', 3);
  }, 19);
  T.wood = make(32, (g, s, r) => {
    for (let y = 0; y < s; y++) { const v = 0.7 + Math.sin(y * 0.9 + r()) * 0.1 + r() * 0.1; g.fillStyle = `rgb(${92 * v | 0},${62 * v | 0},${38 * v | 0})`; g.fillRect(0, y, s, 1); }
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 15, s, 1);
  }, 23);
  T.sheet = make(32, (g, s, r) => {
    g.fillStyle = '#bdb8a4'; g.fillRect(0, 0, s, s);
    grime(g, s, r, 25, 'rgba(110,20,10,A)', 4);
    grime(g, s, r, 25, 'rgba(90,80,40,A)', 5);
  }, 29);
  T.concrete = make(64, (g, s, r) => {
    g.fillStyle = '#4b4a44'; g.fillRect(0, 0, s, s);
    grime(g, s, r, 160, 'rgba(0,0,0,A)', 3);
    grime(g, s, r, 60, 'rgba(120,120,100,A)', 2);
  }, 31);
  T.blood = make(64, (g, s, r) => {
    g.clearRect(0, 0, s, s);
    for (let i = 0; i < 26; i++) {
      g.fillStyle = `rgba(${70 + r() * 40 | 0},5,3,${0.5 + r() * 0.4})`;
      const rad = 2 + r() * 12; g.beginPath(); g.arc(s / 2 + (r() - .5) * s * .6, s / 2 + (r() - .5) * s * .6, rad, 0, 7); g.fill();
    }
  }, 37);
  T.paper = make(32, (g, s, r) => {
    g.fillStyle = '#d6cba8'; g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(40,30,20,.6)'; for (let y = 5; y < s - 3; y += 3) g.fillRect(4, y, 10 + r() * 16, 1);
  }, 41);
  T.gown = make(32, (g, s, r) => {
    g.fillStyle = '#8d9483'; g.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 6) { g.fillStyle = 'rgba(40,60,50,.35)'; g.fillRect(x, 0, 2, s); }
    grime(g, s, r, 20, 'rgba(90,10,5,A)', 4);
  }, 43);
  T.skin = make(16, (g, s, r) => { g.fillStyle = '#b39a84'; g.fillRect(0, 0, s, s); grime(g, s, r, 12, 'rgba(90,40,40,A)', 2); }, 47);
  T.deadSkin = make(16, (g, s, r) => { g.fillStyle = '#8c8f7c'; g.fillRect(0, 0, s, s); grime(g, s, r, 16, 'rgba(60,10,10,A)', 3); }, 53);
  T.bandage = make(16, (g, s, r) => { g.fillStyle = '#cfc6ad'; g.fillRect(0, 0, s, s); g.fillStyle = 'rgba(0,0,0,.15)'; for (let y = 0; y < s; y += 3) g.fillRect(0, y, s, 1); grime(g, s, r, 6, 'rgba(120,10,5,A)', 2); }, 59);
  T.leather = make(16, (g, s, r) => { g.fillStyle = '#3a2618'; g.fillRect(0, 0, s, s); grime(g, s, r, 30, 'rgba(90,10,5,A)', 3); }, 61);
  T.hazard = make(32, (g, s) => { for (let i = -s; i < s * 2; i += 8) { g.fillStyle = (i / 8) % 2 ? '#b08a1c' : '#1b1a14'; g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 8, 0); g.lineTo(i + 8 - s, s); g.lineTo(i - s, s); g.fill(); } }, 67);
  return T;
}
