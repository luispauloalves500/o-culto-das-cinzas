// Sistema de conquistas — persistido em localStorage, desacoplado do save de progresso.
// Desbloqueios mostram toast via HUD.
const KEY = 'ocdc_achievements_v1';

export const ACHIEVEMENTS = {
  first_kill: {
    id: 'first_kill',
    name: 'Primeiro Sangue',
    desc: 'Abata seu primeiro inimigo.',
    icon: '🩸',
  },
  chapter1: {
    id: 'chapter1',
    name: 'Véspera no Hospital',
    desc: 'Complete o Capítulo 1 — Hospital São Dimas.',
    icon: '🏥',
  },
  chapter2: {
    id: 'chapter2',
    name: 'Fumaça no Bairro',
    desc: 'Complete o Capítulo 2 — Fumaça.',
    icon: '🏭',
  },
  chapter3: {
    id: 'chapter3',
    name: 'A Confraria',
    desc: 'Complete o Capítulo 3 — A Confraria.',
    icon: '🕯️',
  },
  chapter4: {
    id: 'chapter4',
    name: 'Cidade Morta',
    desc: 'Complete o Capítulo 4 — Cidade Morta.',
    icon: '🕐',
  },
  chapter5: {
    id: 'chapter5',
    name: 'Águas Negras',
    desc: 'Complete o Capítulo 5 — Águas Negras.',
    icon: '🌊',
  },
  chapter6: {
    id: 'chapter6',
    name: 'O Acervo',
    desc: 'Complete o Capítulo 6 — O Acervo.',
    icon: '🏛️',
  },
  chapter7: {
    id: 'chapter7',
    name: 'Sob a Pedra',
    desc: 'Complete o Capítulo 7 — Sob a Pedra.',
    icon: '⚰️',
  },
  chapter8: {
    id: 'chapter8',
    name: 'A Última Chama',
    desc: 'Complete o Capítulo 8 — A Última Chama.',
    icon: '🔥',
  },
  docs_1: {
    id: 'docs_1',
    name: 'Primeira Pista',
    desc: 'Colete seu primeiro documento.',
    icon: '📝',
  },
  docs_5: {
    id: 'docs_5',
    name: 'Arquivista',
    desc: 'Colete 5 documentos.',
    icon: '📄',
  },
  docs_10: {
    id: 'docs_10',
    name: 'Investigador',
    desc: 'Colete 10 documentos.',
    icon: '🔍',
  },
  docs_15: {
    id: 'docs_15',
    name: 'Historiador',
    desc: 'Colete 15 documentos.',
    icon: '📚',
  },
  docs_25: {
    id: 'docs_25',
    name: 'Arquivo Completo',
    desc: 'Colete 25 documentos.',
    icon: '🗂️',
  },
  boss_surgeon: {
    id: 'boss_surgeon',
    name: 'O Cirurgião Cai',
    desc: 'Derrote o Cirurgião no Hospital São Dimas.',
    icon: '🔪',
  },
  boss_vigia: {
    id: 'boss_vigia',
    name: 'O Vigia Caiado',
    desc: 'Derrote o Vigia Caiado.',
    icon: '👁️',
  },
  boss_afogada: {
    id: 'boss_afogada',
    name: 'A Afogada',
    desc: 'Derrote a Afogada.',
    icon: '💧',
  },
  boss_collector: {
    id: 'boss_collector',
    name: 'O Colecionador',
    desc: 'Derrote o Colecionador.',
    icon: '🏺',
  },
  boss_cinza: {
    id: 'boss_cinza',
    name: 'A Primeira Cinza',
    desc: 'Derrote a Primeira Cinza.',
    icon: '🌫️',
  },
  secrets_1: {
    id: 'secrets_1',
    name: 'Olho Atento',
    desc: 'Descubra seu primeiro segredo.',
    icon: '🔎',
  },
  secrets_5: {
    id: 'secrets_5',
    name: 'Caçador de Segredos',
    desc: 'Descubra 5 segredos.',
    icon: '🔑',
  },
  secrets_10: {
    id: 'secrets_10',
    name: 'Mestre dos Segredos',
    desc: 'Descubra 10 segredos.',
    icon: '🔐',
  },
  explorer: {
    id: 'explorer',
    name: 'Explorador',
    desc: 'Visite 30 cômodos diferentes.',
    icon: '🗺️',
  },
  survivor: {
    id: 'survivor',
    name: 'Sobrevivente',
    desc: 'Jogue por mais de 30 minutos no total.',
    icon: '⏱️',
  },
  no_heal_chapter: {
    id: 'no_heal_chapter',
    name: 'Sem Bandagem',
    desc: 'Complete um capítulo sem usar bandagens.',
    icon: '🩹',
  },
  all_weapons: {
    id: 'all_weapons',
    name: 'Arsenal Completo',
    desc: 'Colete todas as armas do jogo.',
    icon: '⚔️',
  },
};

export class Achievements {
  constructor(game) {
    this.game = game;
    this.unlocked = new Set();
    this.stats = { rooms: new Set(), playTime: 0, healsUsed: 0, chapterHeals: 0, secrets: 0 };
    this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      this.unlocked = new Set(data.unlocked || []);
      this.stats.playTime = data.playTime || 0;
      this.stats.healsUsed = data.healsUsed || 0;
      this.stats.secrets = data.secrets || 0;
      if (data.rooms) this.stats.rooms = new Set(data.rooms);
    } catch (e) { console.warn('[Achievements] load failed', e); }
  }

  _save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        unlocked: [...this.unlocked],
        playTime: this.stats.playTime,
        healsUsed: this.stats.healsUsed,
        secrets: this.stats.secrets,
        rooms: [...this.stats.rooms],
      }));
    } catch (e) { /* ignore */ }
  }

  unlock(id) {
    if (this.unlocked.has(id) || !ACHIEVEMENTS[id]) return false;
    this.unlocked.add(id);
    this._save();
    const a = ACHIEVEMENTS[id];
    this.game.hud?.toast?.(`${a.icon} Conquista: ${a.name}`, 4.5);
    this.game.audio?.play?.('pickup', null);
    console.log(`[Achievement] ${a.name}`);
    return true;
  }

  isUnlocked(id) { return this.unlocked.has(id); }

  update(dt) {
    this.stats.playTime += dt;
    if (this.stats.playTime > 1800 && !this.isUnlocked('survivor')) this.unlock('survivor');
  }

  onEnemyDied(enemy) {
    if (!this.isUnlocked('first_kill')) this.unlock('first_kill');

    const id = (enemy?.id || '').toLowerCase();
    const name = (enemy?.name || '').toLowerCase();

    if (id.includes('cirurgiao') || name.includes('cirurgião') || name.includes('cirurgiao')) {
      this.unlock('boss_surgeon');
    }
    if (id.includes('vigia') || name.includes('vigia')) {
      this.unlock('boss_vigia');
    }
    if (id.includes('afogada') || name.includes('afogada')) {
      this.unlock('boss_afogada');
    }
    if (id.includes('colecionador') || name.includes('colecionador') || id.includes('collector')) {
      this.unlock('boss_collector');
    }
    if (id.includes('cinza') || name.includes('cinza') || name.includes('primeira')) {
      this.unlock('boss_cinza');
    }
  }

  onDocumentCollected() {
    const n = this.game.inventory?.documents?.length || 0;
    if (n >= 1) this.unlock('docs_1');
    if (n >= 5) this.unlock('docs_5');
    if (n >= 10) this.unlock('docs_10');
    if (n >= 15) this.unlock('docs_15');
    if (n >= 25) this.unlock('docs_25');
  }

  onSecretFound() {
    this.stats.secrets++;
    this._save();
    if (this.stats.secrets >= 1) this.unlock('secrets_1');
    if (this.stats.secrets >= 5) this.unlock('secrets_5');
    if (this.stats.secrets >= 10) this.unlock('secrets_10');
  }

  onChapterComplete(chapter) {
    const map = { 1: 'chapter1', 2: 'chapter2', 3: 'chapter3', 4: 'chapter4', 5: 'chapter5', 6: 'chapter6', 7: 'chapter7', 8: 'chapter8' };
    if (map[chapter]) this.unlock(map[chapter]);
    if (this.stats.chapterHeals === 0) this.unlock('no_heal_chapter');
    this.stats.chapterHeals = 0;
  }

  onRoomVisited(roomId) {
    if (!roomId) return;
    this.stats.rooms.add(roomId);
    if (this.stats.rooms.size >= 30) this.unlock('explorer');
  }

  onHealUsed() {
    this.stats.healsUsed++;
    this.stats.chapterHeals++;
  }

  onWeaponCollected() {
    const weapons = this.game.inventory?.weapons || [];
    const all = ['machado', 'martelo', 'facao', 'revolver', 'lanca'];
    if (all.every(w => weapons.includes(w))) this.unlock('all_weapons');
  }

  getAll() {
    return Object.values(ACHIEVEMENTS).map(a => ({
      ...a,
      unlocked: this.isUnlocked(a.id),
    }));
  }

  getProgress() {
    const total = Object.keys(ACHIEVEMENTS).length;
    const done = this.unlocked.size;
    return { done, total, percent: Math.round((done / total) * 100) };
  }
}
