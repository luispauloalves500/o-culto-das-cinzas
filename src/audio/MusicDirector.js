// Trilha adaptativa — DIRETOR (Web Audio). Agenda, com antecedência, as notas que a partitura (Score.js) compõe para o
// cue atual e as sintetiza com vozes procedurais (caixinha de música, sino, órgão, vidro, metais, coro, pad, baixo e
// percussão). Troca de cue = crossfade das camadas + recomeço no próximo compasso. Sem arquivos de áudio.
import { cueFor, composeStep, stepDur, midiToHz } from './Score.js';

const LAYERS = ['pad', 'bass', 'lead', 'choir', 'perc'];
const LOOKAHEAD = 0.14, TICK_MS = 25, MAX_VOICES = 40;

export class MusicDirector {
  constructor(audio) {
    this.audio = audio; this.ctx = audio.ctx; this.noise = audio.noise;
    const c = this.ctx;
    this.out = c.createGain(); this.out.gain.value = 1; this.out.connect(audio.music);
    // reverb procedural (resposta ao impulso de ruído com decaimento) + eco
    this.verb = c.createConvolver(); this.verb.buffer = this._impulse(2.8, 2.6);
    this.verbGain = c.createGain(); this.verbGain.gain.value = 0.42; this.verb.connect(this.verbGain); this.verbGain.connect(this.out);
    this.delay = c.createDelay(1.5); this.delay.delayTime.value = 0.42;
    this.fb = c.createGain(); this.fb.gain.value = 0.32; this.delay.connect(this.fb); this.fb.connect(this.delay);
    this.delayOut = c.createGain(); this.delayOut.gain.value = 0.28; this.delay.connect(this.delayOut); this.delayOut.connect(this.out);
    this.analyser = c.createAnalyser(); this.analyser.fftSize = 1024; this.out.connect(this.analyser);
    this._buf = new Float32Array(this.analyser.fftSize);
    this.layer = {};
    for (const l of LAYERS) {
      const gn = c.createGain(); gn.gain.value = 0; gn.connect(this.out);
      const send = c.createGain(); send.gain.value = l === 'perc' ? 0.12 : l === 'bass' ? 0.08 : 0.5; gn.connect(send); send.connect(this.verb);
      if (l === 'lead') { const ds = c.createGain(); ds.gain.value = 0.45; gn.connect(ds); ds.connect(this.delay); }
      this.layer[l] = gn;
    }
    this.cue = null; this.pending = null; this.bar = 0; this.step = 0; this.nextT = 0; this.voices = 0;
    this.stats = { notes: 0, perLayer: Object.fromEntries(LAYERS.map((l) => [l, 0])), percKinds: [], perKind: {}, cueChanges: 0, history: [] };
    this.timer = setInterval(() => this._tick(), TICK_MS);
  }
  _impulse(sec, decay) {
    const c = this.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
    return b;
  }

  /** chamado pelo jogo (barato: só reage quando a chave do cue muda) */
  update(gameState) {
    const cue = cueFor(gameState);
    const cur = this.pending || this.cue;
    if (cur && cur.key === cue.key) return cur;
    if (!this.cue) { this._apply(cue, true); return cue; }
    // mesmo tema (só a mistura/andamento mudou): aplica já, sem recomeçar a frase
    if (this.cue.theme === cue.theme) { this._apply(cue, false); return cue; }
    this.pending = cue; return cue;
  }
  _apply(cue, restart, at = null) {
    const c = this.ctx, t = at ?? c.currentTime;
    this.cue = cue; this.pending = null; this.stats.cueChanges++;
    this.stats.history.push(cue.key); if (this.stats.history.length > 40) this.stats.history.shift();
    for (const l of LAYERS) { if (at == null) this.layer[l].gain.cancelScheduledValues(t); }
    for (const l of LAYERS) this.layer[l].gain.setTargetAtTime((cue.mix[l] || 0) * cue.mix.gain * 0.5, t, restart ? 0.05 : 0.6);
    if (restart) { this.bar = 0; this.step = 0; this.nextT = Math.max(this.nextT, c.currentTime + 0.05); }
  }
  _tick() {
    const c = this.ctx;
    if (!c || c.state !== 'running' || !this.cue) return;
    const now = c.currentTime;
    if (this.nextT < now - 0.25) this.nextT = now + 0.02; // aba em segundo plano / travada: ressincroniza sem rajada
    while (this.nextT < now + LOOKAHEAD) {
      if (this.pending && this.step % ((this.cue.theme.meter || 16) === 12 ? 3 : 4) === 0) {
        // troca de tema no próximo tempo forte: abaixa as camadas e o novo tema entra do começo da frase
        const now2 = c.currentTime;
        for (const l of LAYERS) { const gp = this.layer[l].gain; gp.cancelScheduledValues(now2); gp.setTargetAtTime(0.0001, now2, 0.04); }
        this._apply(this.pending, true, Math.max(now2 + 0.03, this.nextT));
      }
      const cue = this.cue, sd = stepDur(cue);
      for (const n of composeStep(cue, this.bar, this.step)) this._play(n, this.nextT, sd);
      this.nextT += sd;
      this.step++; if (this.step >= (cue.theme.meter || 16)) { this.step = 0; this.bar++; }
    }
  }
  _play(n, t, sd) {
    if (this.voices >= MAX_VOICES && n.layer !== 'perc') return;
    const dest = this.layer[n.layer], dur = n.steps * sd;
    this.stats.notes++; this.stats.perLayer[n.layer]++;
    if (n.layer === 'perc') { this.stats.percKinds.push(n.kind); this.stats.perKind[n.kind] = (this.stats.perKind[n.kind] || 0) + 1; if (this.stats.percKinds.length > 32) this.stats.percKinds.shift(); return this._perc(n.kind, dest, t, n.vel); }
    const f = midiToHz(n.midi), th = this.cue.theme;
    const timbre = n.layer === 'lead' ? th.lead : n.layer === 'pad' ? th.pad : n.layer;
    this._voice(timbre, dest, t, dur, f, n.vel);
  }
  _env(g, t, a, peak, dur, rel) {
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.setTargetAtTime(0.0001, t + Math.max(a, dur), rel);
  }
  _osc(type, f, t, end, dest, detune = 0) {
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune;
    o.connect(dest); o.start(t); o.stop(end); return o;
  }
  _voice(timbre, dest, t, dur, f, vel) {
    const c = this.ctx, g = c.createGain(); g.connect(dest);
    let end, last;
    const track = (o) => { this.voices++; o.onended = () => { this.voices--; try { g.disconnect(); } catch (e) {} }; };
    switch (timbre) {
      case 'musicbox': { // caixinha: senoide + parcial inarmônico, ataque seco, decaimento longo
        end = t + 2.2; this._env(g, t, 0.004, 0.32 * vel, 0.01, 0.45);
        last = this._osc('sine', f, t, end, g); const p = c.createGain(); p.gain.value = 0.18; p.connect(g); this._osc('sine', f * 3.01, t, end, p); break; }
      case 'bell': {
        end = t + 3.2; this._env(g, t, 0.003, 0.28 * vel, 0.01, 0.8);
        last = this._osc('sine', f, t, end, g); for (const [r, a] of [[2.76, 0.3], [5.4, 0.12], [0.5, 0.25]]) { const p = c.createGain(); p.gain.value = a; p.connect(g); this._osc('sine', f * r, t, end, p); } break; }
      case 'glass': {
        end = t + dur + 1.6; this._env(g, t, 0.06, 0.2 * vel, dur, 0.5);
        last = this._osc('sine', f, t, end, g, -4); this._osc('triangle', f * 2, t, end, g, 5); break; }
      case 'organ': {
        end = t + dur + 0.5; this._env(g, t, 0.03, 0.12 * vel, dur, 0.12);
        for (const [r, a] of [[0.5, 0.6], [1, 1], [2, 0.5], [3, 0.25]]) { const p = c.createGain(); p.gain.value = a; p.connect(g); last = this._osc('sine', f * r, t, end, p); } break; }
      case 'pluck': {
        end = t + 1.2; this._env(g, t, 0.003, 0.22 * vel, 0.01, 0.18);
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(f * 8, t); lp.frequency.exponentialRampToValueAtTime(f * 1.2, t + 0.4); lp.connect(g);
        last = this._osc('sawtooth', f, t, end, lp); break; }
      case 'brass': {
        end = t + dur + 0.4; this._env(g, t, 0.05, 0.16 * vel, dur, 0.1);
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3; lp.frequency.setValueAtTime(f * 1.5, t); lp.frequency.linearRampToValueAtTime(f * 5, t + 0.08); lp.connect(g);
        last = this._osc('sawtooth', f, t, end, lp, -6); this._osc('sawtooth', f, t, end, lp, 6); break; }
      case 'choir': { // coro: dente-de-serra por formantes de "a"/"o"
        end = t + dur + 1.2; this._env(g, t, 0.5, 0.1 * vel, dur, 0.5);
        const src = c.createGain(); src.gain.value = 1;
        for (const [ff, q, a] of [[700, 8, 1], [1150, 10, 0.6], [2600, 12, 0.25]]) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = ff; bp.Q.value = q; const a2 = c.createGain(); a2.gain.value = a * 3; src.connect(bp); bp.connect(a2); a2.connect(g); }
        last = this._osc('sawtooth', f, t, end, src, -8); this._osc('sawtooth', f, t, end, src, 7); break; }
      case 'saw': case 'pad': {
        end = t + dur + 1.2; this._env(g, t, 0.8, 0.07 * vel, dur, 0.5);
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(1800, f * 3); lp.connect(g);
        last = this._osc('sawtooth', f, t, end, lp, -9); this._osc('sawtooth', f, t, end, lp, 9); break; }
      case 'bass': default: {
        end = t + dur + 0.3; this._env(g, t, 0.01, 0.3 * vel, dur * 0.8, 0.08);
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320; lp.connect(g);
        last = this._osc('triangle', f, t, end, lp); this._osc('sawtooth', f, t, end, lp); }
    }
    track(last);
  }
  _perc(kind, dest, t, vel) {
    const c = this.ctx, g = c.createGain(); g.connect(dest);
    const noise = (dur, type, f, q, vol) => {
      const s = c.createBufferSource(); s.buffer = this.noise; const bf = c.createBiquadFilter(); bf.type = type; bf.frequency.value = f; bf.Q.value = q;
      const ng = c.createGain(); this._env(ng, t, 0.002, vol, 0.005, dur / 4); s.connect(bf); bf.connect(ng); ng.connect(g); s.start(t, Math.random()); s.stop(t + dur + 0.2); return s;
    };
    const thump = (f0, f1, dur, vol, at = t) => {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(f1, at + dur);
      const og = c.createGain(); this._env(og, at, 0.003, vol, 0.005, dur / 3); o.connect(og); og.connect(g); o.start(at); o.stop(at + dur + 0.3); return o;
    };
    let last;
    switch (kind) {
      case 'k': last = thump(120, 42, 0.35, 0.9 * vel); break;
      case 's': thump(200, 140, 0.1, 0.25 * vel); last = noise(0.2, 'bandpass', 1800, 0.8, 0.45 * vel); break;
      case 'h': last = noise(0.06, 'highpass', 7000, 0.7, 0.18 * vel); break;
      case 'b': { // metal (bigorna / caldeira)
        for (const r of [1, 2.41, 3.9]) { const o = c.createOscillator(); o.type = 'square'; o.frequency.value = 330 * r; const og = c.createGain(); this._env(og, t, 0.001, 0.05 * vel, 0.005, 0.12); o.connect(og); og.connect(g); o.start(t); o.stop(t + 0.8); last = o; } break; }
      case 'H': thump(70, 48, 0.18, 0.8 * vel); last = thump(64, 44, 0.18, 0.55 * vel, t + 0.22); break; // batimento: tum-tum
      case 't': last = noise(0.14, 'lowpass', 600, 1.5, 0.4 * vel); break; // locomotiva / vagão
      default: last = thump(90, 50, 0.2, 0.5 * vel);
    }
    this.voices++; last.onended = () => { this.voices--; try { g.disconnect(); } catch (e) {} };
  }

  rms() {
    this.analyser.getFloatTimeDomainData(this._buf);
    let s = 0; for (const v of this._buf) s += v * v; return Math.sqrt(s / this._buf.length);
  }
  debug() {
    const cue = this.cue;
    return { key: cue?.key ?? null, theme: cue?.theme.id ?? null, pending: this.pending?.key ?? null, bar: this.bar, step: this.step,
      tempo: cue?.tempo ?? null, bpm: cue ? +(cue.theme.bpm * cue.tempo).toFixed(1) : null, mix: cue ? { ...cue.mix } : null, perc: cue?.perc ?? '',
      notes: this.stats.notes, perLayer: { ...this.stats.perLayer }, percKinds: this.stats.percKinds.slice(-16), perKind: { ...this.stats.perKind }, voices: this.voices,
      history: this.stats.history.slice(), ctx: this.ctx.state, rms: +this.rms().toFixed(5) };
  }
  dispose() { clearInterval(this.timer); try { this.out.disconnect(); } catch (e) {} }
}
