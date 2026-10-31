// Saves versionados em localStorage. Nunca guarda referências a objetos Three.js.
export const SAVE_KEY = 'ocdc_save';
export const SAVE_VERSION = 2;

export function createEmptySave() {
  return {
    version: SAVE_VERSION,
    chapter: 1,
    checkpoint: 'ward_bed',
    player: { hp: 100 },
    inventory: { items: {}, weapon: null, weapons: [], possuiMachado: false, machadoEquipado: false },
    flags: {},
    doors: {},
    deadEnemies: [],
    documents: [],
    elevatorLevel: 'upper',
    playTime: 0,
    savedAt: null,
  };
}

/** Capítulo 5: saves da primeira fatia (comportas travadas) e marcos do chefe/fim coerentes entre si */
export function normalizeChapter5Flags(s) {
  if (s.chapter !== 5 || !s.flags) return s;
  const f = { ...s.flags };
  if (f.c5_sliceDone) f.c5_gatesOpen = true;
  if (s.checkpoint === 'c5_boss' || s.checkpoint === 'c5_end') f.c5_afogadaDead = true;
  if (f.c5_chapterDone || f.ch5Done) { f.c5_chapterDone = true; f.ch5Done = true; f.c5_afogadaDead = true; }
  if (f.c5_afogadaDead) { f.c5_gatesOpen = true; f.c5_sliceDone = true; f.c5_sluiceOpen = true; f.c5_power = true; }
  return { ...s, flags: f };
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
  // v1 → v2: campos do sistema REV6 do machado, derivados de hasAxe / lista de armas / arma em mãos
  if (s.version === 1) {
    const inv = { ...(s.inventory || {}) };
    const weapons = Array.isArray(inv.weapons) ? [...inv.weapons] : [];
    const has = weapons.includes('machado') || inv.weapon === 'machado' || s.flags?.hasAxe === true || s.flags?.picked_axe === true;
    if (has && !weapons.includes('machado')) weapons.push('machado');
    s = { ...s, inventory: { ...inv, weapons, possuiMachado: has, machadoEquipado: inv.weapon === 'machado' }, version: 2 };
  }
  if (s.version > SAVE_VERSION) return null; // save de versão futura
  s = normalizeChapter5Flags(s);
  const base = createEmptySave();
  return { ...base, ...s, player: { ...base.player, ...s.player }, inventory: { ...base.inventory, ...s.inventory } };
}

// itens-chave do Capítulo 1 que não seguem para o Capítulo 2 (consumíveis, armas, desgaste e lembranças seguem)
export const CH1_KEY_ITEMS = ['fusivel', 'chave_necroterio', 'chave_escada', 'planta_hospital', 'chave_seguranca', 'chave_maternidade', 'manivela', 'chave_arquivo_morto'];

/**
 * Save inicial do Capítulo 2 a partir do estado final do Capítulo 1 (ou de um save antigo com chapterDone).
 * Mantém armas, munição, desgaste, documentos, estatísticas e as flags do Cap. 1 (melhorias: vida, fôlego,
 * cura, afiação); zera portas/inimigos mortos (outro mapa) e remove itens-chave do hospital.
 */
export function makeChapter2Save(prev) {
  const base = createEmptySave();
  const p = (prev && migrateSave({ version: SAVE_VERSION, ...prev })) || base;
  const items = { ...(p.inventory.items || {}) };
  for (const k of CH1_KEY_ITEMS) delete items[k];
  return {
    ...base,
    chapter: 2,
    checkpoint: 'c2_gate',
    player: { hp: Math.max(80, Math.min(125, p.player?.hp ?? 100)) },
    inventory: { ...p.inventory, items },
    flags: { ...(p.flags || {}), chapterDone: true, ch1Done: true, c2_started: true },
    doors: {},
    deadEnemies: [],
    documents: [...(p.documents || [])],
    elevatorLevel: 'upper',
    playTime: p.playTime || 0,
    stats: { ...(p.stats || {}) },
  };
}

// itens de chave do Capítulo 2 que ficam no Bairro Operário (o passe da Linha 4 segue com Elias)
export const CH2_KEY_ITEMS = ['manivela_carga', 'chave_fabrica'];

/** save inicial do Capítulo 3 (Sede da Confraria) a partir do estado no fim do Capítulo 2 */
export function makeChapter3Save(prev) {
  const base = createEmptySave();
  const p = (prev && migrateSave({ version: SAVE_VERSION, ...prev })) || base;
  const items = { ...(p.inventory?.items || {}) };
  for (const k of [...CH1_KEY_ITEMS, ...CH2_KEY_ITEMS]) delete items[k];
  // o passe é a passagem: sem ele o motorneiro não teria trazido Elias até o Largo do Véu
  items.passe_bonde = Math.max(1, items.passe_bonde || 0);
  return {
    ...base,
    chapter: 3,
    checkpoint: 'c3_tram',
    player: { hp: Math.max(80, Math.min(125, p.player?.hp ?? 100)) },
    inventory: { ...(p.inventory || base.inventory), items },
    flags: { ...(p.flags || {}), chapterDone: true, ch1Done: true, c2_started: true, c2_chapterDone: true, c2_hasPass: true, ch2Done: true, c3_started: true },
    doors: {},
    deadEnemies: [],
    documents: [...(p.documents || [])],
    elevatorLevel: 'upper',
    playTime: p.playTime || 0,
    stats: { ...(p.stats || {}) },
  };
}

// itens de chave do Capítulo 3 que ficam na Sede (fita de Inês, dossiê e passe seguem com Elias)
export const CH3_KEY_ITEMS = ['sinete_chama'];

/** save inicial do Capítulo 4 (Cidade Morta) a partir do estado no fim do Capítulo 3: Elias sobe pelo bueiro */
export function makeChapter4Save(prev) {
  const base = createEmptySave();
  const p = (prev && migrateSave({ version: SAVE_VERSION, ...prev })) || base;
  const items = { ...(p.inventory?.items || {}) };
  for (const k of [...CH1_KEY_ITEMS, ...CH2_KEY_ITEMS, ...CH3_KEY_ITEMS]) delete items[k];
  return {
    ...base,
    chapter: 4,
    checkpoint: 'c4_drain',
    player: { hp: Math.max(80, Math.min(125, p.player?.hp ?? 100)) },
    inventory: { ...(p.inventory || base.inventory), items },
    flags: { ...(p.flags || {}), chapterDone: true, ch1Done: true, c2_chapterDone: true, ch2Done: true, c3_chapterDone: true, ch3Done: true, c4_started: true },
    doors: {},
    deadEnemies: [],
    documents: [...(p.documents || [])],
    elevatorLevel: 'upper',
    playTime: p.playTime || 0,
    stats: { ...(p.stats || {}) },
  };
}

// itens de chave do Capítulo 4 que não atravessam a passagem do Relógio
export const CH4_KEY_ITEMS = ['chave_relojoaria', 'chave_torre', 'roda_escape'];
/** save inicial do Capítulo 5 (Águas Negras): mantém armas, desgaste, melhorias, documentos, tempo e a fita de Inês */
export function makeChapter5Save(prev) {
  const base = createEmptySave();
  const p = (prev && migrateSave({ version: SAVE_VERSION, ...prev })) || base;
  const items = { ...(p.inventory?.items || {}) };
  for (const k of [...CH1_KEY_ITEMS, ...CH2_KEY_ITEMS, ...CH3_KEY_ITEMS, ...CH4_KEY_ITEMS]) delete items[k];
  return {
    ...base,
    chapter: 5,
    checkpoint: 'c5_passage',
    player: { hp: Math.max(80, Math.min(125, p.player?.hp ?? 100)) },
    inventory: { ...(p.inventory || base.inventory), items },
    flags: { ...(p.flags || {}), chapterDone: true, ch1Done: true, c2_chapterDone: true, ch2Done: true, c3_chapterDone: true, ch3Done: true, c4_chapterDone: true, ch4Done: true, c5_started: true },
    doors: {},
    deadEnemies: [],
    documents: [...(p.documents || [])],
    elevatorLevel: 'upper',
    playTime: p.playTime || 0,
    stats: { ...(p.stats || {}) },
  };
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
