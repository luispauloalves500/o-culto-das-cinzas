// Cena curta roteirizada: planos de câmera interpolados + legendas, com pular (E / Esc) depois de 1 s.
// O mundo fica congelado (Game.step só atualiza o cenário); cada plano pode animar objetos via onUpdate(k, dt).
// Linguagem de cinema: tarjas que deslizam, fade do preto na abertura e entre planos (cut:'fade'), legenda que se revela,
// leve balanço de câmera na mão (sway) e cartela de título opcional (title/sub) por plano.
import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const lerp3 = (a, b, k) => new THREE.Vector3(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, a.z + (b.z - a.z) * k);
const smooth = (k) => k * k * (3 - 2 * k);
export const FADE_IN = 0.45, FADE_OUT = 0.3;
/** opacidade do preto num instante do plano: abre do preto no 1º plano e em planos com cut:'fade'; fecha antes de um corte em fade e no fim */
export function fadeAt(shotT, dur, { first = false, fadeIn = false, fadeOut = false } = {}) {
  let a = 0;
  if (first || fadeIn) a = Math.max(a, 1 - shotT / FADE_IN);
  if (fadeOut) a = Math.max(a, 1 - (dur - shotT) / FADE_OUT);
  return Math.max(0, Math.min(1, a));
}

export class Cutscene {
  /**
   * shots: [{ dur, from:{x,y,z}, to?, look:{x,y,z}, lookTo?, caption, speaker?, onStart?(), onUpdate?(k, dt) }]
   * onEnd(skipped): chamado uma vez ao terminar
   */
  constructor(game, { id, shots, onEnd, skipAfter = 1 }) {
    this.game = game; this.id = id; this.shots = shots; this.onEnd = onEnd; this.skipAfter = skipAfter;
    this.t = 0; this.i = -1; this.done = false; this.skipped = false;
    this.total = shots.reduce((a, s) => a + s.dur, 0);
    this.fade = 1; this.title = null; this.sway = { x: 0, y: 0 };
  }
  start() {
    const el = $('cutscene');
    if (el) { el.classList.remove('hidden'); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); }
    this._enter(0);
  }
  _setFade(a) { this.fade = a; const f = $('csFade'); if (f) f.style.opacity = a.toFixed(3); }
  _enter(i) {
    this.i = i; this.shotT = 0;
    const s = this.shots[i];
    s.onStart?.();
    const cap = $('csCaption');
    if (cap) {
      cap.innerHTML = s.speaker ? `<b>${s.speaker}:</b> ${s.caption}` : (s.caption || '');
      cap.classList.remove('reveal'); void cap.offsetWidth; if (s.caption) cap.classList.add('reveal');
    }
    this.caption = (s.speaker ? s.speaker + ': ' : '') + (s.caption || '');
    // cartela de título (abertura de capítulo): fica só durante o plano que a define
    const tt = $('csTitle');
    this.title = s.title ? { title: s.title, sub: s.sub || '' } : null;
    if (tt) {
      tt.innerHTML = s.title ? `<div class="cs-t1">${s.title}</div>${s.sub ? `<div class="cs-t2">${s.sub}</div>` : ''}` : '';
      tt.classList.toggle('show', !!s.title);
    }
  }
  _fadeFor(i, shotT) {
    const s = this.shots[i], next = this.shots[i + 1];
    return fadeAt(shotT, s.dur, { first: i === 0, fadeIn: s.cut === 'fade', fadeOut: next ? next.cut === 'fade' : !!s.fadeOut });
  }
  update(dt) {
    if (this.done) return;
    const g = this.game, inp = g.input;
    this.t += dt; this.shotT += dt;
    if (this.t > this.skipAfter && (inp.wasPressed('interact') || inp.wasPressed('pause'))) { this.skipped = true; this.finish(); return; }
    let s = this.shots[this.i];
    while (this.shotT >= s.dur) {
      if (this.i + 1 >= this.shots.length) { this.finish(); return; }
      this.shotT -= s.dur; this._enter(this.i + 1); s = this.shots[this.i];
    }
    const k = smooth(Math.min(1, this.shotT / s.dur));
    const cam = g.camera;
    cam.position.copy(lerp3(s.from, s.to || s.from, k));
    // câmera na mão: balanço lento e pequeno (desligado com sway:0)
    const sw = s.sway ?? 0.025;
    this.sway.x = Math.sin(this.t * 0.9) * sw + Math.sin(this.t * 2.3) * sw * 0.3;
    this.sway.y = Math.sin(this.t * 1.3 + 1) * sw * 0.6;
    cam.position.x += this.sway.x; cam.position.y += this.sway.y;
    cam.lookAt(lerp3(s.look, s.lookTo || s.look, k));
    this._setFade(this._fadeFor(this.i, this.shotT));
    s.onUpdate?.(k, dt);
  }
  finish() {
    if (this.done) return;
    this.done = true;
    // os onUpdate finais (estado de saída) rodam mesmo se o jogador pulou
    for (let j = Math.max(0, this.i); j < this.shots.length; j++) { if (j > this.i) this.shots[j].onStart?.(); this.shots[j].onUpdate?.(1, 0); }
    const el = $('cutscene'); if (el) { el.classList.add('hidden'); el.classList.remove('on'); }
    this._setFade(0); $('csTitle')?.classList.remove('show');
    const g = this.game;
    g.cutscene = null;
    if (g.state === 'cutscene') { g.state = 'playing'; g.hud.show(true); g.input.clear(); }
    this.onEnd?.(this.skipped);
  }
}
