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

/**
 * Capítulo 6: saves da primeira fatia (c6_slice, sem Galeria) continuam válidos — a porta segue trancada até o
 * cordão da sineta. Checkpoints da luta/fim implicam o chefe morto; conclusão espelha c6_chapterDone ↔ ch6Done.
 */
export function normalizeChapter6Flags(s) {
  if (s.chapter !== 6 || !s.flags) return s;
  const f = { ...s.flags };
  if (s.checkpoint === 'c6_slice') { f.c6_sliceDone = true; f.c6_vaultOpen = true; }
  if (f.c6_galleryOpen) f.c6_sliceDone = true;
  if (s.checkpoint === 'c6_boss' || s.checkpoint === 'c6_end') f.c6_collectorDead = true;
  if (f.c6_chapterDone || f.ch6Done) { f.c6_chapterDone = true; f.ch6Done = true; f.c6_collectorDead = true; }
  if (f.c6_collectorDead) { f.c6_galleryOpen = true; f.c6_sliceDone = true; f.c6_vaultOpen = true; }
  return { ...s, flags: f };
}

/**
 * Capítulo 7: checkpoints implicam os marcos anteriores (fim do capítulo → Vigia morto → grade levadiça erguida →
 * corrente da Linha Velha arrebentada → fim da fatia → plataforma → grade do ossuário). A chave/pé de cabra seguem no inventário.
 */
export function normalizeChapter7Flags(s) {
  if (s.chapter !== 7 || !s.flags) return s;
  const f = { ...s.flags };
  if (s.checkpoint === 'c7_end') { f.c7_chapterDone = true; f.ch7Done = true; f.c7_stairsOpen = true; }
  if (s.checkpoint === 'c7_end' || s.checkpoint === 'c7_boss') { f.c7_vigiaDead = true; f.c7_vigiaWoke = true; }
  if (f.c7_vigiaDead) { f.c7_portOpen = true; f.c7_inStation = true; f.c7_atStation = true; }
  if (s.checkpoint === 'c7_station') f.c7_portOpen = true;
  if (f.c7_portOpen) { f.c7_lineOpen = true; f.c7_sawPort = true; f.c7_inLine = true; }
  if (s.checkpoint === 'c7_line') { f.c7_lineOpen = true; f.c7_inLine = true; f.c7_inCabin = true; }
  if (f.c7_lineOpen) f.c7_sliceDone = true;
  if (s.checkpoint === 'c7_slice') f.c7_sliceDone = true;
  if (f.c7_sliceDone) f.c7_onPlatform = true;
  if (s.checkpoint === 'c7_platform') f.c7_onPlatform = true;
  if (f.c7_onPlatform) { f.c7_cryptOpen = true; f.c7_ossOpen = true; f.c7_inOssuary = true; f.c7_sawGate = true; f.c7_hasKey = true; }
  if (s.checkpoint === 'c7_ossuary') f.c7_inOssuary = true;
  f.c6_chapterDone = true; f.ch6Done = true; f.c6_collectorDead = true;
  return { ...s, flags: f };
}

/** Capítulo 8 (A Última Chama): deriva do checkpoint as flags que o roteiro espera (saves antigos / editados). */
export function normalizeChapter8Flags(s) {
  if (s.chapter !== 8 || !s.flags) return s;
  const f = { ...s.flags };
  const cp = s.checkpoint;
  if (cp === 'c8_end') f.c8_chapterDone = true;
  if (f.c8_chapterDone) { f.c8_choice = true; f.c8_inesFree = true; f.c8_helenaUp = true; f.ch8Done = true; if (!f.c8_ending) f.c8_ending = 'cinzas'; }
  if (f.c8_ending || f.c8_choice) f.c8_helenaUp = true;
  if (f.c8_helenaUp) f.c8_inesFree = true;
  if (cp === 'c8_free' || f.c8_inesFree) f.c8_cinzaDead = true;
  if (f.c8_cinzaDead || cp === 'c8_arena') f.c8_vernetDown = true;
  if (f.c8_vernetDown) f.c8_vernetIntro = true;
  if (f.c8_vernetDown || cp === 'c8_top') f.c8_atTop = true;
  if (f.c8_atTop) { f.c8_liftPower = true; f.c8_metHelena = true; }
  if (f.c8_metHelena) f.c8_hasCrank = true;
  if (f.c8_metHelena || f.c8_liftPower || cp === 'c8_machine') f.c8_inMachine = true;
  if (f.c8_inMachine) f.c8_sliceDone = true;
  if (cp === 'c8_slice') { f.c8_sliceDone = true; f.c8_sabotage = true; }
  if (f.c8_sliceDone) f.c8_sabotage = true;
  if (f.c8_sliceDone || f.c8_sabotage) f.c8_inTurbine = true;
  if (s.checkpoint === 'c8_turbine') f.c8_inTurbine = true;
  if (f.c8_inTurbine) { f.c8_steamDoorOpen = true; }
  if (f.c8_steamDoorOpen) { f.c8_vent_I = true; f.c8_vent_II = true; f.c8_vent_III = true; }
  if (f.c8_vent_I && f.c8_vent_II && f.c8_vent_III) f.c8_ventedAll = true;
  if (f.c8_vent_I || f.c8_vent_II || f.c8_vent_III || f.c8_leaksOff) f.c8_hasWheel = true;
  if (f.c8_hasWheel || s.checkpoint === 'c8_boiler') { f.c8_climbed = true; f.c8_inBoiler = true; }
  f.c8_started = true;
  f.c7_chapterDone = true; f.ch7Done = true; f.c7_vigiaDead = true; f.c7_stairsOpen = true;
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
  s = normalizeChapter6Flags(s);
  s = normalizeChapter7Flags(s);
  s = normalizeChapter8Flags(s);
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

// itens-chave do Capítulo 5 que ficam na estação de bombeamento (a fita de Inês e o amuleto seguem)
export const CH5_KEY_ITEMS = ['fusivel_ceramico'];

/**
 * Save inicial do Capítulo 6 — O Acervo a partir do fim do Cap. 5 (ou de um save antigo com c5_chapterDone):
 * a barcaça da galeria de descarga atraca na doca de carga do Museu de Ciências Proibidas.
 * Mantém armas, munição, desgaste, documentos (incl. a ficha da remessa), a fita, estatísticas e melhorias.
 */
export function makeChapter6Save(prev) {
  const base = createEmptySave();
  const p = (prev && migrateSave({ version: SAVE_VERSION, ...prev })) || base;
  const items = { ...(p.inventory?.items || {}) };
  for (const k of [...CH1_KEY_ITEMS, ...CH2_KEY_ITEMS, ...CH3_KEY_ITEMS, ...CH4_KEY_ITEMS, ...CH5_KEY_ITEMS]) delete items[k];
  return {
    ...base,
    chapter: 6,
    checkpoint: 'c6_dock',
    player: { hp: Math.max(80, Math.min(125, p.player?.hp ?? 100)) },
    inventory: { ...(p.inventory || base.inventory), items },
    flags: { ...(p.flags || {}), chapterDone: true, ch1Done: true, c2_chapterDone: true, ch2Done: true, c3_chapterDone: true, ch3Done: true, c4_chapterDone: true, ch4Done: true, c5_chapterDone: true, ch5Done: true, c5_afogadaDead: true, c6_started: true },
    doors: {},
    deadEnemies: [],
    documents: [...(p.documents || [])],
    elevatorLevel: 'upper',
    playTime: p.playTime || 0,
    stats: { ...(p.stats || {}) },
  };
}

// o Cap. 6 não tem itens-chave próprios (a Galeria abre pela sineta; o relicário é documento)
export const CH6_KEY_ITEMS = [];

/**
 * Save inicial do Capítulo 7 — Sob a Pedra a partir do fim do Cap. 6 (c6_end / c6_chapterDone): Elias desce pelo
 * alçapão da reserva técnica até o poço de serviço das catacumbas. Mantém armas, munição, desgaste, documentos (o
 * catálogo e o relicário do Colecionador), a fita, estatísticas e melhorias.
 */
export function makeChapter7Save(prev) {
  const base = createEmptySave();
  const p = (prev && migrateSave({ version: SAVE_VERSION, ...prev })) || base;
  const items = { ...(p.inventory?.items || {}) };
  for (const k of [...CH1_KEY_ITEMS, ...CH2_KEY_ITEMS, ...CH3_KEY_ITEMS, ...CH4_KEY_ITEMS, ...CH5_KEY_ITEMS, ...CH6_KEY_ITEMS]) delete items[k];
  return {
    ...base,
    chapter: 7,
    checkpoint: 'c7_ladder',
    player: { hp: Math.max(80, Math.min(125, p.player?.hp ?? 100)) },
    inventory: { ...(p.inventory || base.inventory), items },
    flags: { ...(p.flags || {}), chapterDone: true, ch1Done: true, c2_chapterDone: true, ch2Done: true, c3_chapterDone: true, ch3Done: true, c4_chapterDone: true, ch4Done: true, c5_chapterDone: true, ch5Done: true, c5_afogadaDead: true,
      c6_chapterDone: true, ch6Done: true, c6_collectorDead: true, c6_galleryOpen: true, c7_started: true },
    doors: {},
    deadEnemies: [],
    documents: [...(p.documents || [])],
    elevatorLevel: 'upper',
    playTime: p.playTime || 0,
    stats: { ...(p.stats || {}) },
  };
}

// Capítulo 8 — A Última Chama: começa no pátio do carvão da Usina, ao pé da escada de serviço que sobe das catacumbas
export const CH7_KEY_ITEMS = ['pe_de_cabra', 'chave_coveiro', 'chave_escada_usina'];
export function makeChapter8Save(prev) {
  const base = createEmptySave();
  const p = (prev && migrateSave({ version: SAVE_VERSION, ...prev })) || base;
  const items = { ...(p.inventory?.items || {}) };
  for (const k of [...CH1_KEY_ITEMS, ...CH2_KEY_ITEMS, ...CH3_KEY_ITEMS, ...CH4_KEY_ITEMS, ...CH5_KEY_ITEMS, ...CH6_KEY_ITEMS, ...CH7_KEY_ITEMS]) delete items[k];
  return {
    ...base,
    chapter: 8,
    checkpoint: 'c8_yard',
    player: { hp: Math.max(80, Math.min(125, p.player?.hp ?? 100)) },
    inventory: { ...(p.inventory || base.inventory), items },
    flags: { ...(p.flags || {}), chapterDone: true, ch1Done: true, c2_chapterDone: true, ch2Done: true, c3_chapterDone: true, ch3Done: true, c4_chapterDone: true, ch4Done: true, c5_chapterDone: true, ch5Done: true, c5_afogadaDead: true,
      c6_chapterDone: true, ch6Done: true, c6_collectorDead: true, c6_galleryOpen: true,
      c7_chapterDone: true, ch7Done: true, c7_vigiaDead: true, c7_stairsOpen: true, c8_started: true },
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
