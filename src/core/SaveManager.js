// Saves versionados em localStorage. Nunca guarda referências a objetos Three.js.
export const SAVE_KEY = 'ocdc_save';
export const SAVE_VERSION = 1;

export function createEmptySave() {
  return {
    version: SAVE_VERSION,
    chapter: 1,
    checkpoint: 'ward_bed',
    player: { hp: 100 },
    inventory: { items: {}, weapon: null },
    flags: {},
    doors: {},
    deadEnemies: [],
    documents: [],
    elevatorLevel: 'upper',
    playTime: 0,
    savedAt: null,
  };
}

/** Migra saves antigos para a versão atual; retorna null se inválido. */
export function migrateSave(data) {
  if (!data || typeof data !== 'object') return null;
  if (typeof data.version !== 'number') return null;
  let s = { ...data };
  // v0 (protótipo) → v1: inventário era lista simples
  if (s.version === 0) {
    const items = {};
    for (const it of s.inventory || []) items[it] = (items[it] || 0) + 1;
    s = { ...createEmptySave(), ...s, inventory: { items, weapon: s.weapon || null }, version: 1 };
  }
  if (s.version > SAVE_VERSION) return null; // save de versão futura
  const base = createEmptySave();
  return { ...base, ...s, player: { ...base.player, ...s.player }, inventory: { ...base.inventory, ...s.inventory } };
}

export class SaveManager {
  constructor(storage = globalThis.localStorage) { this.storage = storage; }
  hasSave() { return !!this.load(); }
  load() {
    try {
      const raw = this.storage?.getItem(SAVE_KEY);
      if (!raw) return null;
      return migrateSave(JSON.parse(raw));
    } catch (e) {
      console.warn('[Save] save corrompido ignorado', e);
      return null;
    }
  }
  write(save) {
    const data = { ...save, version: SAVE_VERSION, savedAt: new Date().toISOString() };
    try { this.storage?.setItem(SAVE_KEY, JSON.stringify(data)); return true; } catch (e) { console.error('[Save] falha', e); return false; }
  }
  clear() { try { this.storage?.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }
}
