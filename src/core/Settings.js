// Opções persistidas em localStorage (separadas do save de progresso)
const KEY = 'ocdc_settings_v1';
export const DEFAULT_SETTINGS = {
  sensitivity: 1.0,
  invertY: false,
  volume: 0.8,
  musicVolume: 0.6,
  renderScale: 0.7,
  fov: 65,
  shake: true,
  showFps: false,
  // gráficos (src/render/Graphics.js): padrão agora mais leve (menos consumo, texturas preservadas)
  shadows: 'off',
  particles: 'baixa',
  bloom: false,
  postfx: false,
  antialias: false,
  // corpos de inimigos somem depois de N segundos (0 = nunca)
  corpseTime: 20,
  cinematics: true,
};

export class Settings {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.data = { ...DEFAULT_SETTINGS };
    try {
      const raw = storage?.getItem(KEY);
      if (raw) Object.assign(this.data, JSON.parse(raw));
    } catch (e) { console.warn('[Settings] opções inválidas, usando padrão', e); }
  }
  get(k) { return this.data[k]; }
  set(k, v) { this.data[k] = v; this.save(); }
  /** vários valores de uma vez (predefinições gráficas) com um único save */
  setMany(o) { Object.assign(this.data, o); this.save(); }
  save() { try { this.storage?.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* armazenamento indisponível */ } }
}
