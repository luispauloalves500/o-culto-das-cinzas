// Objetivos e flags persistentes (energia ligada, chefe vencido, etc.)
import { OBJECTIVES, SIDE_OBJECTIVES } from '../data/chapters.js';

export class QuestSystem {
  constructor(bus) { this.flags = {}; this.bus = bus; }
  set(flag, v = true) {
    if (this.flags[flag] === v) return;
    this.flags[flag] = v;
    this.bus?.emit('FlagChanged', { flag, v });
    this.bus?.emit('QuestStepCompleted', flag);
  }
  has(flag) { return !!this.flags[flag]; }
  /** objetivo atual: primeiro da lista cuja condição ainda não foi satisfeita */
  current() {
    for (const o of OBJECTIVES) if (!this.has(o.done)) return o.text;
    return '';
  }
  /** objetivos opcionais ativos (revelados e ainda não concluídos) */
  side() { return SIDE_OBJECTIVES.filter((o) => this.has(o.when) && !this.has(o.done)).map((o) => o.text); }
  serialize() { return { ...this.flags }; }
  restore(f) { this.flags = { ...(f || {}) }; }
}
