// Opções persistidas em localStorage (separadas do save de progresso)
const KEY = 'ocdc_settings_v1';
export const DEFAULT_SETTINGS = {
  sensitivity: 1.0,
  invertY: false,
  volume: 0.8,
  musicVolume: 0.6,
  renderScale: 0.75,
  fov: 65,
  shake: true,
  showFps: false,
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
  save() { try { this.storage?.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* armazenamento indisponível */ } }
}
