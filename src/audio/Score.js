// Trilha adaptativa — PARTITURA (dados puros e funções determinísticas, testáveis em Node, sem Web Audio).
// Cada tema tem tônica, modo, andamento, compasso (16 = 4/4 em semicolcheias, 12 = 3/4), sequência de acordes,
// motivo (em graus da escala, colcheias), linha de baixo e padrões de percussão por intensidade.
// O fio condutor é a CANÇÃO DE NINAR DE INÊS — a mesma melodia da caixinha de música do Cap. 1 (Mi Sol Lá Sol Mi Ré Dó Ré):
// ela volta transposta para o modo de cada capítulo, no menu, distorcida na Manifestação e inteira nos finais e nos créditos.
// O MusicDirector (Web Audio) só toca o que composeStep() devolve para o cue que cueFor() escolheu a partir do jogo.

export const MODES = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  phrygdom: [0, 1, 4, 5, 7, 8, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

/** a canção de ninar da caixinha (Cap. 1): Mi Sol Lá Sol Mi Ré Dó Ré = graus 2 4 5 4 2 1 0 1 em Dó maior */
export const LULLABY_HZ = [659, 784, 880, 784, 659, 587, 523, 587];
export const LULLABY_DEGREES = [2, 4, 5, 4, 2, 1, 0, 1];
const LUL = LULLABY_DEGREES.join(' ');

// motivo: tokens por colcheia — número = grau (pode ser negativo ou ≥ 7), '.' pausa, '-' prolonga a nota anterior
export const THEMES = {
  menu: { id: 'menu', name: 'Véspera, 1934', root: 50, mode: 'aeolian', bpm: 56, meter: 12, lead: 'musicbox', pad: 'glass',
    chords: [0, 5, 3, 4], motif: `${LUL} - . . . 2 4 5 4 2 1 0 -1 - - . .`, bass: '0 . . . . . 0 . . . . .', perc: {} },
  c1: { id: 'c1', name: 'Hospital São Dimas', root: 50, mode: 'aeolian', bpm: 60, meter: 16, lead: 'musicbox', pad: 'glass',
    chords: [0, 5, 3, 4], motif: '. . 4 . 3 . 2 . . . . . . . . . . . 4 . 5 . 4 3 2 - - - . . . .',
    bass: '0 . . . . . . . 0 . . . -3 . . .', perc: { tension: 'H.......H.....h.', boss: 'k...s..kk...s..h' } },
  c2: { id: 'c2', name: 'Fumaça', root: 52, mode: 'phrygian', bpm: 70, meter: 16, lead: 'pluck', pad: 'saw',
    chords: [0, 1, 0, 6], motif: '0 . 1 . 0 . . . 3 . 1 . 0 - . . 4 . 3 . 1 . 0 . -1 - - - . . . .',
    bass: '0 . 0 . . . 0 . 1 . . . 0 . . .', perc: { tension: 'b.......b...h.h.', boss: 'k.b.s.b.k.b.s.bb' } },
  c3: { id: 'c3', name: 'A Confraria', root: 55, mode: 'harmonic', bpm: 54, meter: 16, lead: 'organ', pad: 'organ',
    chords: [0, 5, 3, 4], motif: '4 - 4 . 5 - 4 . 3 - 2 . 1 - - . 2 - 2 . 3 - 2 . 1 - 0 . -1 - - .',
    bass: '0 . . . 0 . . . -3 . . . -4 . . .', perc: { tension: 'k.......H.......', boss: 'k..sk..sk..sk.ss' } },
  c4: { id: 'c4', name: 'Cidade Morta', root: 48, mode: 'locrian', bpm: 58, meter: 16, lead: 'bell', pad: 'saw',
    chords: [0, 1, 5, 4], motif: '0 . . . . . . . 4 . . . 2 . . . 0 . . . . . . . 1 . . . -1 . . .',
    bass: '0 . . . . . . . 0 . . . . . . .', perc: { tension: 'b.......h...h...', boss: 'k.h.s.h.k.k.s.hb' } },
  c5: { id: 'c5', name: 'Águas Negras', root: 47, mode: 'dorian', bpm: 52, meter: 16, lead: 'glass', pad: 'glass',
    chords: [0, 3, 6, 4], motif: '. . 2 - 4 - . . 5 - 4 - 2 - . . . . 1 - 2 - . . 0 - - - . . . .',
    bass: '0 . . . . . . . 3 . . . . . . .', perc: { tension: 'H.......h.......', boss: 'k...s...k.k.s..h' } },
  c6: { id: 'c6', name: 'O Acervo', root: 54, mode: 'harmonic', bpm: 62, meter: 16, lead: 'glass', pad: 'glass',
    chords: [0, 3, 4, 0], motif: `${LUL} . . . . . . . . 2 4 5 6 7 - - . 6 5 4 - - - . .`,
    bass: '0 . . . . . . . 4 . . . . . . .', perc: { tension: 'h...H...h...h...', boss: 'k.hhs.hhk.hhs.hb' } },
  c7: { id: 'c7', name: 'Sob a Pedra', root: 45, mode: 'phrygian', bpm: 50, meter: 16, lead: 'bell', pad: 'saw',
    chords: [0, 1, 0, 6], motif: '0 . . . 1 . . . 0 . . . . . . . 3 . . . 1 . . . 0 - - - . . . .',
    bass: '0 . . . . . . . 0 . . . 1 . . .', perc: { tension: 't.t.t.ttt.t.t.tt', boss: 'k.t.s.t.k.tts.t.' } },
  c8: { id: 'c8', name: 'A Última Chama', root: 50, mode: 'phrygdom', bpm: 76, meter: 16, lead: 'pluck', pad: 'saw',
    chords: [0, 1, 6, 0], motif: '0 1 2 1 0 . . . 4 . 2 . 1 . 0 . 0 1 2 1 0 . . . 5 - 4 - 2 - . .',
    bass: '0 . 0 0 . . 0 . 1 . 1 1 . . 0 .', perc: { tension: 'h.h.h.h.h.h.h.hb', boss: 'k.hbs.h.k.hbs.hh' } },

  // chefes (o andamento sobe com a fase; a fase 2 traz o coro)
  cirurgiao: { id: 'cirurgiao', name: 'O Cirurgião', root: 50, mode: 'aeolian', bpm: 88, meter: 16, lead: 'brass', pad: 'saw',
    chords: [0, 5, 6, 4], motif: '4 . 4 . 5 . 4 3 2 . . . 1 . 2 . 4 . 4 . 7 . 6 5 4 - - - . . . .', bass: '0 0 . 0 0 . 0 . -2 -2 . -2 -3 . -3 .', perc: { boss: 'k..hs.hhk.khs.hh', p3: 'k.kss.hhk.kssshh' } },
  bras: { id: 'bras', name: 'Brás, o Fornalheiro', root: 52, mode: 'phrygian', bpm: 96, meter: 16, lead: 'brass', pad: 'saw',
    chords: [0, 1, 0, 5], motif: '0 . 0 1 0 . . . 3 . 1 . 0 . . . 0 . 0 1 0 . 4 . 3 - 1 - 0 - . .', bass: '0 . 0 . 0 . 1 . 0 . 0 . 0 . -1 .', perc: { boss: 'kbb.s.b.kbb.s.bb', p3: 'kbbbsbbbkbbbsbbb' } },
  sacristao: { id: 'sacristao', name: 'O Sacristão', root: 55, mode: 'harmonic', bpm: 84, meter: 16, lead: 'organ', pad: 'organ',
    chords: [0, 3, 4, 0], motif: '4 - 4 - 5 - 4 - 6 - - - 4 - - - 2 - 3 - 4 - 3 - 2 - 1 - 0 - - -', bass: '0 . . 0 . . 0 . 4 . . 4 . . 4 .', perc: { boss: 'k...s..kk...s..s', p3: 'k.k.s.kkk.k.s.ss' } },
  vigia: { id: 'vigia', name: 'O Vigia', root: 48, mode: 'locrian', bpm: 92, meter: 16, lead: 'bell', pad: 'saw',
    chords: [0, 1, 4, 0], motif: '0 . . . 4 . . . 0 . . . 1 . . . 0 . . . 4 . 2 . 1 - - - . . . .', bass: '0 . 0 . . 0 . 0 0 . 0 . . 0 1 .', perc: { boss: 'k.h.s.hbk.h.s.hb', p3: 'k.hbs.hbk.hbsbhb' } },
  afogada: { id: 'afogada', name: 'A Afogada', root: 47, mode: 'dorian', bpm: 80, meter: 16, lead: 'glass', pad: 'glass',
    chords: [0, 3, 6, 4], motif: '2 - 4 - 5 - - - 4 - 2 - 1 - - - 2 - 4 - 7 - 6 - 5 - 4 - 2 - - -', bass: '0 . . 0 . . 0 . 3 . . 3 . . 3 .', perc: { boss: 'k...s...k.k.s...', p3: 'k..hs..hk.k.s.hh' } },
  colecionador: { id: 'colecionador', name: 'O Colecionador', root: 54, mode: 'harmonic', bpm: 100, meter: 16, lead: 'musicbox', pad: 'glass',
    chords: [0, 4, 3, 4], motif: `${LUL} 2 4 5 6 7 6 5 4`, bass: '0 . 0 . 4 . 4 . 3 . 3 . 4 . 4 .', perc: { boss: 'k.hhs.hhk.hhs.hh', p3: 'kkhhs.hhkkhhsshh' } },
  vigia_caiado: { id: 'vigia_caiado', name: 'O Vigia Caiado', root: 45, mode: 'phrygian', bpm: 86, meter: 16, lead: 'bell', pad: 'saw',
    chords: [0, 1, 0, 6], motif: '0 . . . . . . . 1 . . . . . . . 0 . . . 3 . . . 1 - - - . . . .', bass: '0 . . . 0 . . . 1 . . . 0 . . .', perc: { boss: 'H.......H...b...', p3: 'H...H...H...b.b.' } },
  vernet: { id: 'vernet', name: 'A Valsa do Tesoureiro', root: 50, mode: 'phrygdom', bpm: 132, meter: 12, lead: 'brass', pad: 'saw',
    chords: [0, 1, 6, 0], motif: '4 - 2 1 2 4 5 - 4 2 1 . 0 - 1 2 4 2 1 - - . . .', bass: '0 . . . 4 . . . 4 . . . 1 . . . 4 . . . 4 . . .', perc: { boss: 'k...h...h...', p3: 'k.h.s.h.s.hb' } },
  // a luta final: a canção de Inês em menor, devagar, sob o coro. Fase 3 (cega, caça pelo som): a percussão vira só um
  // batimento cardíaco, sem melodia — a música abre espaço para o jogador ouvir (e ser ouvido).
  manifestacao: { id: 'manifestacao', name: 'A Primeira Cinza', root: 50, mode: 'aeolian', bpm: 70, meter: 16, lead: 'brass', pad: 'choir',
    chords: [0, 5, 3, 4], motif: '2 - 4 - 5 - 4 - 2 - 1 - 0 - 1 - 2 - 4 - 5 - 7 - 6 - - - 5 - - -', bass: '0 . 0 . . . 0 . -2 . -2 . . . -3 .',
    perc: { boss: 'k.......s.....k.', p2: 'k..k..s.k..k..ss', p3: 'H.......H.......' },
    phase3: { lead: 0, bass: 0.25, choir: 0.7, pad: 0.4, gain: 0.7 } },

  // finais e créditos: a canção inteira, cada uma num modo
  end_guardiao: { id: 'end_guardiao', name: 'O Guardião', root: 50, mode: 'ionian', bpm: 52, meter: 16, lead: 'musicbox', pad: 'glass',
    chords: [0, 3, 4, 0], motif: `${LUL} 2 4 5 4 2 1 0 -`, bass: '0 . . . . . . . 0 . . . . . . .', perc: {} },
  end_herdeira: { id: 'end_herdeira', name: 'A Herdeira', root: 50, mode: 'dorian', bpm: 56, meter: 16, lead: 'musicbox', pad: 'glass',
    chords: [0, 3, 6, 3], motif: `${LUL} 2 4 5 4 2 1 3 -`, bass: '0 . . . . . . . 3 . . . . . . .', perc: {} },
  end_cinzas: { id: 'end_cinzas', name: 'Cinzas ao Vento', root: 50, mode: 'aeolian', bpm: 46, meter: 16, lead: 'musicbox', pad: 'glass',
    chords: [0, 5, 3, 5], motif: '2 4 5 4 . . . . . . . . . . . . 2 . . . . . . . . . . . . . . .', bass: '0 . . . . . . . . . . . . . . .', perc: {} },
  credits: { id: 'credits', name: 'Créditos', root: 50, mode: 'ionian', bpm: 64, meter: 16, lead: 'musicbox', pad: 'glass',
    chords: [0, 5, 3, 4], motif: `${LUL} 2 4 5 4 2 1 0 - 4 - 5 - 7 - 6 5 4 - 2 - 1 - 0 -`, bass: '0 . . . 4 . . . 5 . . . 4 . . .', perc: {} },
};
export const CHAPTER_THEME = { 1: 'c1', 2: 'c2', 3: 'c3', 4: 'c4', 5: 'c5', 6: 'c6', 7: 'c7', 8: 'c8' };
export const BOSS_IDS = ['cirurgiao', 'bras', 'sacristao', 'vigia', 'afogada', 'colecionador', 'vigia_caiado', 'vernet', 'manifestacao'];

// mistura de camadas por modo (0..1) e ganho geral do cue
export const MIX = {
  menu: { pad: 0.5, lead: 0.55, bass: 0.15, perc: 0, choir: 0, gain: 0.8, sparse: 0 },
  explore: { pad: 0.5, lead: 0.32, bass: 0, perc: 0, choir: 0, gain: 0.65, sparse: 0.45 },
  tension: { pad: 0.45, lead: 0.42, bass: 0.5, perc: 0.55, choir: 0, gain: 0.85, sparse: 0 },
  boss1: { pad: 0.42, lead: 0.5, bass: 0.6, perc: 0.7, choir: 0, gain: 1, sparse: 0 },
  boss2: { pad: 0.42, lead: 0.5, bass: 0.65, perc: 0.75, choir: 0.35, gain: 1, sparse: 0 },
  boss3: { pad: 0.45, lead: 0.55, bass: 0.7, perc: 0.85, choir: 0.5, gain: 1, sparse: 0 },
  cutscene: { pad: 0.6, lead: 0, bass: 0.15, perc: 0, choir: 0.25, gain: 0.7, sparse: 0 },
  end: { pad: 0.5, lead: 0.6, bass: 0.25, perc: 0, choir: 0, gain: 0.85, sparse: 0 },
  credits: { pad: 0.5, lead: 0.6, bass: 0.4, perc: 0, choir: 0.15, gain: 0.9, sparse: 0 },
  dead: { pad: 0.4, lead: 0, bass: 0, perc: 0, choir: 0.2, gain: 0.5, sparse: 0 },
};
export const PHASE_TEMPO = [1, 1, 1.1, 1.2];
export const DUCK_STATES = ['paused', 'reading', 'inventory', 'map'];

/** semicolcheias → nota MIDI do grau `deg` (pode atravessar oitavas) no modo do tema */
export function degreeToMidi(theme, deg, octave = 0) {
  const sc = MODES[theme.mode] || MODES.aeolian, n = sc.length;
  const o = Math.floor(deg / n), i = ((deg % n) + n) % n;
  return theme.root + 12 * (o + octave) + sc[i];
}
export const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

/** "2 4 - . 1" → [{deg, len}] por colcheia (len em colcheias), null nas pausas */
export function parseMotif(str) {
  const toks = String(str || '').trim().split(/\s+/).filter(Boolean);
  const out = [];
  for (const t of toks) {
    if (t === '-') { let k = out.length - 1; while (k >= 0 && out[k] === undefined) k--; if (k >= 0 && out[k]) out[k].len++; out.push(undefined); }
    else if (t === '.') out.push(null);
    else out.push({ deg: Number(t), len: 1 });
  }
  return out.map((v) => (v === undefined ? null : v));
}
const _cache = new Map();
function parsed(theme, key) {
  const k = theme.id + ':' + key;
  if (!_cache.has(k)) _cache.set(k, key === 'bass' ? String(theme.bass || '').trim().split(/\s+/) : parseMotif(theme.motif));
  return _cache.get(k);
}

/** PRNG determinístico (mulberry32) — o "acaso" das notas esparsas da exploração é reproduzível */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * Escolhe o cue a partir do estado do jogo (puro).
 * g = { state, chapter, intensity (0/1/2), boss: { id, phase, alive } | null, ending, inCutscene }
 */
export function cueFor(g) {
  const st = g.state;
  if (st === 'menu' || st === 'loading' || st === 'clickToPlay' || !st) return mk('menu', THEMES.menu, MIX.menu);
  if (st === 'credits') return mk('credits', THEMES.credits, MIX.credits);
  if (st === 'end') {
    if (g.chapter >= 8 && g.ending && THEMES['end_' + g.ending]) return mk('end:' + g.ending, THEMES['end_' + g.ending], MIX.end);
    const t = THEMES[CHAPTER_THEME[g.chapter] || 'c1'];
    return mk('end:c' + (g.chapter || 1), t, MIX.end);
  }
  const ch = THEMES[CHAPTER_THEME[g.chapter] || 'c1'];
  if (st === 'dead' || st === 'dying') return mk('dead:c' + (g.chapter || 1), ch, MIX.dead, 0.8);
  const duck = DUCK_STATES.includes(st) ? 0.45 : 1;
  if (st === 'cutscene' || g.inCutscene) {
    if (g.chapter >= 8 && g.ending && THEMES['end_' + g.ending]) return mk('end:' + g.ending, THEMES['end_' + g.ending], MIX.end);
    const b = g.boss && g.boss.alive && THEMES[g.boss.id];
    return mk('cutscene:' + (b ? g.boss.id : 'c' + g.chapter), b || ch, MIX.cutscene, 0.9);
  }
  const b = g.boss;
  if (b && b.alive && THEMES[b.id] && (g.intensity >= 2 || b.engaged)) {
    const ph = Math.max(1, Math.min(3, b.phase || 1)), t = THEMES[b.id];
    const mix = { ...MIX['boss' + ph] };
    if (ph === 3 && t.phase3) Object.assign(mix, t.phase3);
    const perc = (ph === 3 && t.perc.p3) || (ph === 2 && t.perc.p2) || t.perc.boss || '';
    return mk(`boss:${b.id}:${ph}`, t, mix, PHASE_TEMPO[ph], perc, duck);
  }
  if (g.intensity >= 1) return mk('tension:c' + g.chapter, ch, MIX.tension, 1.08, ch.perc.tension || '', duck);
  return mk('explore:c' + g.chapter, ch, MIX.explore, 1, '', duck);
}
function mk(key, theme, mix, tempo = 1, perc = '', duck = 1) {
  return { key: duck < 1 ? key + ':duck' : key, base: key, theme, mix: { ...mix, gain: mix.gain * duck }, tempo, perc, duck };
}

/** duração de uma semicolcheia (s) */
export const stepDur = (cue) => 60 / (cue.theme.bpm * (cue.tempo || 1)) / 4;

/**
 * Compõe o passo `step` (semicolcheia) do compasso `bar` para o cue: lista de notas
 * { layer: 'pad'|'bass'|'lead'|'choir'|'perc', midi?, kind?, steps (duração em semicolcheias), vel }.
 */
export function composeStep(cue, bar, step) {
  const t = cue.theme, m = cue.mix, meter = t.meter || 16, out = [];
  const chordDeg = t.chords[bar % t.chords.length];
  if (step === 0) {
    if (m.pad > 0) for (const d of [0, 2, 4]) out.push({ layer: 'pad', midi: degreeToMidi(t, chordDeg + d), steps: meter, vel: m.pad * (d === 0 ? 1 : 0.8) });
    if (m.choir > 0) out.push({ layer: 'choir', midi: degreeToMidi(t, chordDeg + 4), steps: meter, vel: m.choir }, { layer: 'choir', midi: degreeToMidi(t, chordDeg + 2, 1), steps: meter, vel: m.choir * 0.7 });
  }
  if (m.bass > 0) {
    const bl = parsed(t, 'bass'), tok = bl[step % bl.length];
    if (tok && tok !== '.' && tok !== '-') out.push({ layer: 'bass', midi: degreeToMidi(t, chordDeg + Number(tok), -1), steps: 2, vel: m.bass });
  }
  if (m.lead > 0 && step % 2 === 0) {
    const mo = parsed(t, 'motif'), eighthsPerBar = meter / 2;
    const idx = (bar * eighthsPerBar + step / 2) % mo.length, n = mo[idx];
    if (n) {
      const r = rng((bar * 977 + step * 131 + t.id.length * 7919) >>> 0)();
      if (!(m.sparse > 0 && r < m.sparse)) out.push({ layer: 'lead', midi: degreeToMidi(t, n.deg, 1), steps: n.len * 2, vel: m.lead });
    }
  }
  if (cue.perc && m.perc > 0) {
    const ch = cue.perc[step % cue.perc.length];
    if (ch && ch !== '.') out.push({ layer: 'perc', kind: ch, steps: 1, vel: m.perc * (step === 0 ? 1 : 0.85) });
  }
  return out;
}

/** pitch class contido no modo do tema (para testes de coerência harmônica) */
export function inMode(theme, midi) {
  const sc = MODES[theme.mode]; return sc.includes((((midi - theme.root) % 12) + 12) % 12);
}
