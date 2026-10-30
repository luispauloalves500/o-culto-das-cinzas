// Cena curta roteirizada: planos de câmera interpolados + legendas, com pular (E / Esc) depois de 1 s.
// O mundo fica congelado (Game.step só atualiza o cenário); cada plano pode animar objetos via onUpdate(k, dt).
import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const lerp3 = (a, b, k) => new THREE.Vector3(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, a.z + (b.z - a.z) * k);
const smooth = (k) => k * k * (3 - 2 * k);

export class Cutscene {
  /**
   * shots: [{ dur, from:{x,y,z}, to?, look:{x,y,z}, lookTo?, caption, speaker?, onStart?(), onUpdate?(k, dt) }]
   * onEnd(skipped): chamado uma vez ao terminar
   */
  constructor(game, { id, shots, onEnd, skipAfter = 1 }) {
    this.game = game; this.id = id; this.shots = shots; this.onEnd = onEnd; this.skipAfter = skipAfter;
    this.t = 0; this.i = -1; this.done = false; this.skipped = false;
    this.total = shots.reduce((a, s) => a + s.dur, 0);
  }
  start() {
    $('cutscene')?.classList.remove('hidden');
    this._enter(0);
  }
  _enter(i) {
    this.i = i; this.shotT = 0;
    const s = this.shots[i];
    s.onStart?.();
    const cap = $('csCaption');
    if (cap) cap.innerHTML = s.speaker ? `<b>${s.speaker}:</b> ${s.caption}` : (s.caption || '');
    this.caption = (s.speaker ? s.speaker + ': ' : '') + (s.caption || '');
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
    cam.lookAt(lerp3(s.look, s.lookTo || s.look, k));
    s.onUpdate?.(k, dt);
  }
  finish() {
    if (this.done) return;
    this.done = true;
    // os onUpdate finais (estado de saída) rodam mesmo se o jogador pulou
    for (let j = Math.max(0, this.i); j < this.shots.length; j++) { if (j > this.i) this.shots[j].onStart?.(); this.shots[j].onUpdate?.(1, 0); }
    $('cutscene')?.classList.add('hidden');
    const g = this.game;
    g.cutscene = null;
    if (g.state === 'cutscene') { g.state = 'playing'; g.hud.show(true); g.input.clear(); }
    this.onEnd?.(this.skipped);
  }
}
