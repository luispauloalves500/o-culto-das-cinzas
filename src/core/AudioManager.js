// Áudio procedural via Web Audio API (sem arquivos externos). Inicia apenas após gesto do usuário.
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.listener = { x: 0, y: 0, z: 0, yaw: 0 };
    this.volume = 0.8;
    this.voices = 0;
    this.maxVoices = 24;
  }

  init() {
    if (this.ctx) { this.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = this.volume; this.master.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.connect(this.master);
    this.amb = c.createGain(); this.amb.gain.value = 0.0; this.amb.connect(this.master);
    this.music = c.createGain(); this.music.gain.value = 0.0; this.music.connect(this.master);
    // buffer de ruído branco reutilizável
    const len = c.sampleRate * 2;
    this.noise = c.createBuffer(1, len, c.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this._startAmbience();
    this._startMusic();
  }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; }
  setListener(x, y, z, yaw) { this.listener.x = x; this.listener.y = y; this.listener.z = z; this.listener.yaw = yaw; }

  /** atenuação + pan estéreo simples para eventos no mundo */
  _spatial(pos, maxDist = 25) {
    if (!pos) return { g: 1, pan: 0 };
    const dx = pos.x - this.listener.x, dz = pos.z - this.listener.z, dy = (pos.y || 0) - this.listener.y;
    const d = Math.hypot(dx, dz, dy * 1.5);
    const g = Math.max(0, 1 - d / maxDist) ** 1.6;
    // direita da câmera = (-cos yaw, 0, sin yaw)
    const rx = -Math.cos(this.listener.yaw), rz = Math.sin(this.listener.yaw);
    const pan = d > 0.01 ? Math.max(-1, Math.min(1, (dx * rx + dz * rz) / d)) : 0;
    return { g, pan };
  }
  _out(pos, maxDist, gain = 1) {
    const c = this.ctx;
    const { g, pan } = this._spatial(pos, maxDist);
    if (g * gain < 0.01 || this.voices >= this.maxVoices) return null;
    const out = c.createGain(); out.gain.value = g * gain;
    let node = out;
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; out.connect(p); p.connect(this.sfx); }
    else out.connect(this.sfx);
    this.voices++;
    setTimeout(() => { this.voices--; try { out.disconnect(); } catch (e) {} }, 2500);
    return node;
  }
  _noise(dest, t, dur, { type = 'bandpass', f0 = 800, f1 = f0, q = 1, vol = 1, attack = 0.005 } = {}) {
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  _tone(dest, t, dur, { type = 'sine', f0 = 200, f1 = f0, vol = 0.5, attack = 0.005 } = {}) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(10, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }

  play(name, pos = null, opts = {}) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const o = (md, gain) => this._out(pos, md, gain);
    let d;
    switch (name) {
      case 'step': if ((d = o(14, opts.vol ?? 0.35))) this._noise(d, t, 0.09, { type: 'lowpass', f0: 900, f1: 200, vol: 0.9 }); break;
      case 'swing': if ((d = o(20, 0.5))) this._noise(d, t, opts.heavy ? 0.35 : 0.22, { f0: opts.heavy ? 500 : 900, f1: 3000, q: 2, vol: 0.8, attack: 0.05 }); break;
      case 'hit':
        if ((d = o(25, 0.9))) {
          this._tone(d, t, 0.25, { f0: 140, f1: 45, vol: 0.9 });
          this._noise(d, t, 0.18, { type: 'lowpass', f0: 1800, f1: 300, vol: 0.7 });
        } break;
      case 'clang': if ((d = o(25, 0.6))) { [620, 1170, 1730].forEach((f, i) => this._tone(d, t, 0.5 - i * 0.1, { type: 'triangle', f0: f, f1: f * 0.98, vol: 0.35 })); this._noise(d, t, 0.06, { type: 'highpass', f0: 3000, vol: 0.5 }); } break;
      case 'block': if ((d = o(25, 0.6))) { this._tone(d, t, 0.3, { type: 'square', f0: 300, f1: 180, vol: 0.2 }); this._noise(d, t, 0.1, { f0: 1500, vol: 0.5 }); } break;
      case 'hurt': if ((d = o(10, 0.7))) { this._tone(d, t, 0.3, { type: 'sawtooth', f0: 220, f1: 110, vol: 0.25 }); this._noise(d, t, 0.15, { type: 'lowpass', f0: 1200, f1: 200, vol: 0.6 }); } break;
      case 'door': if ((d = o(22, 0.6))) { this._tone(d, t, 0.7, { type: 'sawtooth', f0: 95 + Math.random() * 20, f1: 160, vol: 0.12, attack: 0.1 }); this._noise(d, t + 0.55, 0.2, { type: 'lowpass', f0: 500, f1: 120, vol: 0.8 }); } break;
      case 'locked': if ((d = o(12, 0.6))) { this._noise(d, t, 0.08, { f0: 2000, q: 4, vol: 0.6 }); this._noise(d, t + 0.12, 0.08, { f0: 1800, q: 4, vol: 0.6 }); } break;
      case 'pickup': if ((d = o(10, 0.5))) { this._tone(d, t, 0.4, { type: 'triangle', f0: 520, vol: 0.3 }); this._tone(d, t + 0.08, 0.5, { type: 'triangle', f0: 780, vol: 0.2 }); } break;
      case 'spark': if ((d = o(30, 0.8))) for (let i = 0; i < 6; i++) this._noise(d, t + i * 0.05 + Math.random() * 0.03, 0.05, { type: 'highpass', f0: 2500, vol: 0.9 }); break;
      case 'switch': if ((d = o(12, 0.6))) this._noise(d, t, 0.05, { type: 'bandpass', f0: 1200, q: 3, vol: 0.9 }); break;
      case 'power': if ((d = o(40, 0.8))) { this._tone(d, t, 2.2, { type: 'sawtooth', f0: 40, f1: 120, vol: 0.3, attack: 0.4 }); this._noise(d, t, 0.6, { f0: 300, f1: 1500, vol: 0.4, attack: 0.2 }); } break;
      case 'elevator': if ((d = o(30, 0.6))) { this._tone(d, t, opts.dur || 5, { type: 'sawtooth', f0: 55, f1: 60, vol: 0.12, attack: 0.5 }); this._noise(d, t, opts.dur || 5, { type: 'lowpass', f0: 300, f1: 250, vol: 0.25, attack: 0.5 }); } break;
      case 'groan': if ((d = o(22, 0.7))) { const f = (opts.pitch || 1) * (70 + Math.random() * 30); this._tone(d, t, 1.1, { type: 'sawtooth', f0: f, f1: f * 0.7, vol: 0.18, attack: 0.15 }); this._noise(d, t, 0.9, { f0: 500, f1: 300, q: 3, vol: 0.25, attack: 0.2 }); } break;
      case 'shriek': if ((d = o(30, 0.7))) { this._tone(d, t, 0.6, { type: 'sawtooth', f0: 600, f1: 1500, vol: 0.12, attack: 0.05 }); this._noise(d, t, 0.6, { f0: 2500, f1: 1200, q: 2, vol: 0.4 }); } break;
      case 'roar': if ((d = o(45, 1.0))) { this._tone(d, t, 1.8, { type: 'sawtooth', f0: 55, f1: 35, vol: 0.35, attack: 0.2 }); this._tone(d, t, 1.6, { type: 'square', f0: 82, f1: 50, vol: 0.12, attack: 0.2 }); this._noise(d, t, 1.6, { type: 'lowpass', f0: 900, f1: 200, vol: 0.6, attack: 0.2 }); } break;
      case 'splash': if ((d = o(26, opts.vol ?? 0.7))) { this._noise(d, t, 0.5, { type: 'lowpass', f0: 2400, f1: 300, vol: 0.9 }); this._noise(d, t + 0.12, 0.7, { type: 'bandpass', f0: 900, f1: 400, q: 1.5, vol: 0.35, attack: 0.1 }); } break;
      case 'drip': if ((d = o(14, 0.4))) this._tone(d, t, 0.18, { type: 'sine', f0: 1400 + Math.random() * 500, f1: 600, vol: 0.18 }); break;
      case 'thud': if ((d = o(30, 1.0))) { this._tone(d, t, 0.5, { f0: 80, f1: 30, vol: 1 }); this._noise(d, t, 0.3, { type: 'lowpass', f0: 600, f1: 80, vol: 0.8 }); } break;
      case 'whisper': if ((d = o(40, 0.4))) this._noise(d, t, 1.5, { f0: 3000, f1: 2000, q: 6, vol: 0.4, attack: 0.5 }); break;
      case 'save': if ((d = o(10, 0.5))) [392, 494, 587].forEach((f, i) => this._tone(d, t + i * 0.15, 0.9, { type: 'sine', f0: f, vol: 0.2 })); break;
      case 'shot': if ((d = o(60, 1.0))) { this._noise(d, t, 0.35, { type: 'lowpass', f0: 4000, f1: 300, vol: 1.0 }); this._tone(d, t, 0.3, { f0: 120, f1: 40, vol: 0.9 }); this._noise(d, t + 0.04, 0.8, { type: 'bandpass', f0: 700, f1: 250, q: 1, vol: 0.25, attack: 0.05 }); } break;
      case 'dryfire': if ((d = o(8, 0.6))) { this._noise(d, t, 0.03, { type: 'highpass', f0: 3000, vol: 0.8 }); this._tone(d, t, 0.05, { type: 'square', f0: 1400, vol: 0.08 }); } break;
      case 'chime': if ((d = o(24, 0.5))) { const f = opts.f || 880; this._tone(d, t, 0.9, { type: 'sine', f0: f, vol: 0.22 }); this._tone(d, t, 0.6, { type: 'triangle', f0: f * 2.01, vol: 0.06 }); } break;
      // vidro de vitrine estilhaçando: estalo agudo + cacos tilintando no chão
      case 'glass': if ((d = o(34, opts.vol ?? 0.9))) { this._noise(d, t, 0.12, { type: 'highpass', f0: 4200, vol: 1.0 }); this._noise(d, t + 0.02, 0.4, { type: 'bandpass', f0: 5200, f1: 2600, q: 2, vol: 0.5 }); for (let i = 0; i < 7; i++) this._tone(d, t + 0.08 + i * 0.06 + Math.random() * 0.05, 0.25, { type: 'triangle', f0: 2400 + Math.random() * 2600, f1: 2000, vol: 0.07 }); } break;
      default: break;
    }
  }

  // Ambiência contínua: drone grave + ventilação + goteiras aleatórias
  _startAmbience() {
    const c = this.ctx;
    [55, 55.6, 82.4].forEach((f, i) => {
      const o = c.createOscillator(); o.type = i === 2 ? 'triangle' : 'sine'; o.frequency.value = f;
      const g = c.createGain(); g.gain.value = i === 2 ? 0.03 : 0.07; o.connect(g); g.connect(this.amb); o.start();
    });
    const n = c.createBufferSource(); n.buffer = this.noise; n.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
    const g = c.createGain(); g.gain.value = 0.12; n.connect(f); f.connect(g); g.connect(this.amb); n.start();
    const drip = () => {
      if (!this.ctx) return;
      if (this.ctx.state === 'running' && this.amb.gain.value > 0.01) {
        const t = this.ctx.currentTime;
        const pitch = 900 + Math.random() * 1400;
        this._tone(this.amb, t, 0.12, { f0: pitch, f1: pitch * 0.5, vol: 0.12 });
      }
      this._dripTimer = setTimeout(drip, 1500 + Math.random() * 4500);
    };
    drip();
  }
  setAmbience(on) { if (this.amb) this.amb.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.6); }

  // Música dinâmica mínima: pulso grave que cresce com a intensidade de combate/chefe
  _startMusic() {
    const c = this.ctx;
    this.musicOsc = c.createOscillator(); this.musicOsc.type = 'sawtooth'; this.musicOsc.frequency.value = 41;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
    this.musicLfo = c.createOscillator(); this.musicLfo.frequency.value = 1.6;
    const lfoGain = c.createGain(); lfoGain.gain.value = 0.5;
    const pulse = c.createGain(); pulse.gain.value = 0.5;
    this.musicLfo.connect(lfoGain); lfoGain.connect(pulse.gain);
    this.musicOsc.connect(f); f.connect(pulse); pulse.connect(this.music);
    this.musicOsc.start(); this.musicLfo.start();
  }
  /** 0 = exploração, 1 = combate, 2 = chefe */
  setIntensity(level) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.music.gain.setTargetAtTime([0, 0.18, 0.3][level] ?? 0, t, 0.8);
    this.musicLfo.frequency.setTargetAtTime([1.2, 2.2, 3.2][level] ?? 1.2, t, 0.5);
    this.musicOsc.frequency.setTargetAtTime(level === 2 ? 36.7 : 41.2, t, 0.5);
  }
}
