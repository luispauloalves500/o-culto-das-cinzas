// Metadados de save: títulos de capítulo, locais por checkpoint e formatação da ficha (pt63u).
export const CHAPTER_TITLE = {
  1: { title: 'Capítulo 1', sub: 'Hospital São Dimas' },
  2: { title: 'Capítulo 2', sub: 'Fumaça' },
  3: { title: 'Capítulo 3', sub: 'A Confraria' },
  4: { title: 'Capítulo 4', sub: 'Cidade Morta' },
  5: { title: 'Capítulo 5', sub: 'Águas Negras' },
  6: { title: 'Capítulo 6', sub: 'O Acervo' },
  7: { title: 'Capítulo 7', sub: 'Sob a Pedra' },
  8: { title: 'Capítulo 8', sub: 'A Última Chama' },
};

export const CHECKPOINT_NAME = {
  ward_bed: 'Enfermaria', machine_room: 'Casa de máquinas', lower_hall: 'Hall do subsolo', pre_boss: 'Ante-sala do Cirurgião',
  yard: 'Pátio de serviço', east_ward: 'Ala leste', morgue: 'Necrotério', laundry: 'Lavanderia', admin: 'Administração',
  diretoria: 'Diretoria', chapel: 'Capela', luzia: 'Quarto de Luzia', roque: 'Quarto de Roque', bras: 'Quarto de Brás',
  dimas: 'Quarto de Dimas', wing: 'Ala de recuperação', recovery: 'Recuperação', roof: 'Telhado', peds: 'Pediatria',
  postoPed: 'Posto da pediatria', fireEscape: 'Escada de incêndio', maternity: 'Maternidade', deadArchive: 'Arquivo morto',
  c2_gate: 'Portão do bairro', c2_depot: 'Depósito', c2_office: 'Escritório da fundição', c2_yard: 'Pátio da fundição',
  c2_coal: 'Pátio do carvão', c2_carv: 'Carvoaria', c2_factory: 'Fábrica de fumaça', c2_preboss: 'Ante-sala da Garganta', c2_end: 'Rua da Fundição',
  c3_tram: 'Largo do Véu', c3_lodge: 'Portaria', c3_hall: 'Salão da Sede', c3_archive: 'Arquivos', c3_preboss: 'Antecâmara da cripta', c3_end: 'Cripta',
  c4_drain: 'Bueiro do centro', c4_watch: 'Posto de vigia', c4_plaza: 'Praça do Relógio', c4_tower: 'Torre do Relógio', c4_gears: 'Casa das máquinas', c4_end: 'Passagem do Relógio',
  c5_passage: 'Passagem da estação', c5_pumps: 'Casa de bombas', c5_slice: 'Antecâmara das turbinas', c5_boss: 'Salão das turbinas', c5_end: 'Galeria de descarga',
  c6_dock: 'Doca do museu', c6_atrium: 'Átrio', c6_hall: 'Salão do museu', c6_conserv: 'Ala de conservação', c6_slice: 'Porta da Galeria', c6_boss: 'Galeria do Colecionador', c6_end: 'Reserva técnica',
  c7_ladder: 'Poço de serviço', c7_ossuary: 'Ossuário', c7_platform: 'Estação Sé Velha', c7_slice: 'Trilhos da Linha Velha', c7_line: 'Linha Velha', c7_station: 'Estação Sob a Pedra', c7_boss: 'Sala do Vigia', c7_end: 'Escada de serviço',
  c8_yard: 'Pátio do carvão', c8_boiler: 'Casa das Caldeiras', c8_oficina: 'Oficina', c8_turbine: 'Sala da Turbina', c8_slice: 'Base da torre', c8_machine: 'Casa de máquinas da torre', c8_top: 'Topo da torre', c8_arena: 'Sala dos Transmissores', c8_free: 'Inês libertada', c8_end: 'Fim',
};

export function chapterTitle(n) {
  const c = CHAPTER_TITLE[n] || CHAPTER_TITLE[1];
  return c.title + ' — ' + c.sub;
}

export function locationName(checkpoint) {
  if (!checkpoint) return '—';
  return CHECKPOINT_NAME[checkpoint] || String(checkpoint).replace(/_/g, ' ');
}

export function formatPlayTime(sec) {
  const t = Math.max(0, Math.floor(+sec || 0));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  if (h) return h + 'h ' + String(m).padStart(2, '0') + 'min';
  return m + 'min ' + String(s).padStart(2, '0') + 's';
}

/** data/hora no fuso America/Sao_Paulo */
export function formatSavedAt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function slotLabel(id) {
  return id === 'auto' ? 'Salvamento automático' : 'Espaço ' + id;
}

export function describeSave(save, id = 'auto') {
  if (!save) return { id, empty: true, title: slotLabel(id), chapter: '', location: 'Vazio', playTime: '—', savedAt: '—', icon: 0 };
  const ch = save.chapter || 1;
  const tit = CHAPTER_TITLE[ch] || CHAPTER_TITLE[1];
  return {
    id,
    empty: false,
    title: slotLabel(id),
    chapter: tit.title + ' — ' + tit.sub,
    chapterN: ch,
    location: locationName(save.checkpoint),
    checkpoint: save.checkpoint || null,
    playTime: formatPlayTime(save.playTime),
    playTimeSec: save.playTime || 0,
    savedAt: formatSavedAt(save.savedAt),
    savedAtIso: save.savedAt || null,
    icon: ch,
  };
}

export const LOADING_TIPS = [
  'A cinza ainda cai sobre Véspera.',
  'Ande devagar: inimigos ouvem passos de corrida, golpes e portas.',
  'A Confraria batiza na cinza — e não esquece um nome.',
  'Inês deixou uma fita vermelha no caminho. Confie na fita.',
  'O Relógio de Véspera marca a mesma hora desde a primeira cinza.',
  'A água dos canais é preta e morna. Algo que já foi gente se move nela.',
  'O museu guarda o que a cidade quis esquecer.',
  'Sob a pedra, a Linha Velha ainda leva a algum lugar.',
  'Na Usina, a chaminé ainda cospe cinza. Desta vez Elias não chega tarde.',
  'Documentos e anotações ficam no inventário (Tab) e no mapa (M).',
];

export function loadingTip(seed = 0) {
  return LOADING_TIPS[Math.abs(seed | 0) % LOADING_TIPS.length];
}
